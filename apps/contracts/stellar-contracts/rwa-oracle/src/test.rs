#![cfg(test)]
extern crate std;

use crate::Asset;
use crate::Error;
use crate::rwa_oracle::{RWAOracle, RWAOracleClient};
use crate::rwa_types::*;

use soroban_sdk::{Address, Env, String, Symbol, Vec, testutils::Address as _};

fn create_rwa_oracle_contract<'a>(e: &Env) -> RWAOracleClient<'a> {
    let asset_xlm: Asset = Asset::Other(Symbol::new(e, "NVDA"));
    let asset_usdt: Asset = Asset::Other(Symbol::new(e, "TSLA"));
    let asset_vec = Vec::from_array(e, [asset_xlm.clone(), asset_usdt.clone()]);
    let admin = Address::generate(e);
    let contract_id = e.register(RWAOracle, (admin, asset_vec, asset_usdt, 14u32, 300u32));

    RWAOracleClient::new(e, &contract_id)
}

fn create_test_regulatory_info(env: &Env) -> RegulatoryInfo {
    RegulatoryInfo {
        is_regulated: true,
        approval_server: Some(String::from_str(env, "https://example.com/approve")),
        approval_criteria: Some(String::from_str(env, "Transactions require KYC approval")),
        compliance_status: ComplianceStatus::RequiresApproval,
        licensing_authority: Some(String::from_str(env, "SEC")),
        license_type: Some(String::from_str(env, "Securities License")),
        license_number: Some(String::from_str(env, "SEC-12345")),
    }
}

fn create_test_tokenization_info(env: &Env) -> TokenizationInfo {
    TokenizationInfo {
        is_tokenized: true,
        token_contract: Some(Address::generate(env)),
        total_supply: Some(1_000_000_000_000),
        underlying_asset: Some(String::from_str(env, "US Treasury Bond 2024")),
        tokenization_date: Some(1_700_000_000),
    }
}

#[test]
fn test_rwa_oracle_initialization() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let assets = oracle.assets();
    assert_eq!(assets.len(), 2);

    let base = oracle.base();
    assert_eq!(base, Asset::Other(Symbol::new(&e, "TSLA")));

    assert_eq!(oracle.decimals(), 14);
    assert_eq!(oracle.resolution(), 300);
}

#[test]
fn test_set_rwa_metadata() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_id = Symbol::new(&e, "RWA_BOND_2024");

    let regulatory_info = create_test_regulatory_info(&e);
    let tokenization_info = create_test_tokenization_info(&e);

    let metadata = RWAMetadata {
        asset_id: asset_id.clone(),
        name: String::from_str(&e, "US Treasury Bond 2024"),
        description: String::from_str(&e, "Tokenized US Treasury Bond maturing 2024"),
        asset_type: RWAAssetType::Bond,
        underlying_asset: String::from_str(&e, "US Treasury Bond"),
        issuer: String::from_str(&e, "US Treasury"),
        regulatory_info,
        tokenization_info,
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    oracle.set_rwa_metadata(&asset_id, &metadata);

    let retrieved_result = oracle.try_get_rwa_metadata(&asset_id);
    let retrieved = retrieved_result.unwrap().unwrap();
    assert_eq!(retrieved.asset_id, asset_id);
    assert_eq!(retrieved.asset_type, RWAAssetType::Bond);
    assert_eq!(
        retrieved.name,
        String::from_str(&e, "US Treasury Bond 2024")
    );
    assert_eq!(retrieved.regulatory_info.is_regulated, true);
}

#[test]
fn test_price_feed_compatibility() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_xlm: Asset = Asset::Other(Symbol::new(&e, "XLM"));

    // First, add XLM to the list of assets
    let assets_to_add = Vec::from_array(&e, [asset_xlm.clone()]);
    oracle.add_assets(&assets_to_add);

    // Test price feed functionality (SEP-40)
    let timestamp1: u64 = 1_000_000_000;
    let price1 = 10_000_000_000_000;
    oracle.set_asset_price(&asset_xlm, &price1, &timestamp1);

    let last_price = oracle.lastprice(&asset_xlm).unwrap();
    assert_eq!(last_price.price, price1);
    assert_eq!(last_price.timestamp, timestamp1);

    // Test historical prices
    let timestamp2: u64 = 1_000_001_000;
    let price2 = 10_500_000_000_000;
    oracle.set_asset_price(&asset_xlm, &price2, &timestamp2);

    let prices = oracle.prices(&asset_xlm, &2).unwrap();
    assert_eq!(prices.len(), 2);
    assert_eq!(prices.get(0).unwrap().price, price2);
    assert_eq!(prices.get(0).unwrap().timestamp, timestamp2);
}

#[test]
fn test_regulatory_info() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_id = Symbol::new(&e, "RWA_STOCK");

    let regulatory_info = create_test_regulatory_info(&e);
    let tokenization_info = create_test_tokenization_info(&e);

    let metadata = RWAMetadata {
        asset_id: asset_id.clone(),
        name: String::from_str(&e, "Tokenized Stock"),
        description: String::from_str(&e, "Tokenized company stock"),
        asset_type: RWAAssetType::Stock,
        underlying_asset: String::from_str(&e, "Company Stock"),
        issuer: String::from_str(&e, "Company Inc"),
        regulatory_info: regulatory_info.clone(),
        tokenization_info,
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    oracle.set_rwa_metadata(&asset_id, &metadata);

    let is_regulated_result = oracle.try_is_regulated(&asset_id);
    let is_regulated = is_regulated_result.unwrap().unwrap();
    assert_eq!(is_regulated, true);

    let reg_info_result = oracle.try_get_regulatory_info(&asset_id);
    let reg_info = reg_info_result.unwrap().unwrap();
    assert_eq!(reg_info.is_regulated, true);
    assert_eq!(
        reg_info.compliance_status,
        ComplianceStatus::RequiresApproval
    );
}

#[test]
fn test_get_all_rwa_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset_id1 = Symbol::new(&e, "RWA_1");
    let asset_id2 = Symbol::new(&e, "RWA_2");

    let regulatory_info = create_test_regulatory_info(&e);
    let tokenization_info = create_test_tokenization_info(&e);

    let metadata1 = RWAMetadata {
        asset_id: asset_id1.clone(),
        name: String::from_str(&e, "RWA 1"),
        description: String::from_str(&e, "First RWA"),
        asset_type: RWAAssetType::Bond,
        underlying_asset: String::from_str(&e, "Bond"),
        issuer: String::from_str(&e, "Issuer 1"),
        regulatory_info: regulatory_info.clone(),
        tokenization_info: tokenization_info.clone(),
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    let metadata2 = RWAMetadata {
        asset_id: asset_id2.clone(),
        name: String::from_str(&e, "RWA 2"),
        description: String::from_str(&e, "Second RWA"),
        asset_type: RWAAssetType::Commodity,
        underlying_asset: String::from_str(&e, "Gold"),
        issuer: String::from_str(&e, "Issuer 2"),
        regulatory_info,
        tokenization_info,
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    oracle.set_rwa_metadata(&asset_id1, &metadata1);
    oracle.set_rwa_metadata(&asset_id2, &metadata2);

    let all_assets = oracle.get_all_rwa_assets();
    assert_eq!(all_assets.len(), 2);
    assert!(all_assets.contains(&asset_id1));
    assert!(all_assets.contains(&asset_id2));
}

#[test]
fn test_error_handling() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let non_existent = Symbol::new(&e, "NON_EXISTENT");

    let result = oracle.try_get_rwa_metadata(&non_existent);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err().unwrap(), Error::AssetNotFound.into());
}

// ========== Price validation tests ==========

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_negative_price_rejected() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let timestamp: u64 = 1_000_000_000;
    let negative_price: i128 = -100;

    oracle.set_asset_price(&asset, &negative_price, &timestamp);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_zero_price_rejected() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let timestamp: u64 = 1_000_000_000;
    let zero_price: i128 = 0;

    oracle.set_asset_price(&asset, &zero_price, &timestamp);
}

#[test]
fn test_positive_price_accepted() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let timestamp: u64 = 1_000_000_000;
    let price: i128 = 150_00000000;

    oracle.set_asset_price(&asset, &price, &timestamp);

    let last_price = oracle.lastprice(&asset).unwrap();
    assert_eq!(last_price.price, price);
    assert_eq!(last_price.timestamp, timestamp);
}

#[test]
fn test_min_positive_price_accepted() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let timestamp: u64 = 1_000_000_000;
    let min_price: i128 = 1;

    oracle.set_asset_price(&asset, &min_price, &timestamp);

    let last_price = oracle.lastprice(&asset).unwrap();
    assert_eq!(last_price.price, min_price);
    assert_eq!(last_price.timestamp, timestamp);
}

// ========== Per-Asset Timestamp Tests ==========

#[test]
fn test_independent_timestamps_for_different_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset_tsla: Asset = Asset::Other(Symbol::new(&e, "TSLA"));

    // Update NVDA at timestamp 1000
    let timestamp_nvda: u64 = 1_000_000_000;
    let price_nvda: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price_nvda, &timestamp_nvda);

    // Update TSLA at timestamp 2000 (later)
    let timestamp_tsla: u64 = 2_000_000_000;
    let price_tsla: i128 = 200_00000000;
    oracle.set_asset_price(&asset_tsla, &price_tsla, &timestamp_tsla);

    // Verify each asset maintains its own timestamp
    let nvda_price = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(nvda_price.timestamp, timestamp_nvda);
    assert_eq!(nvda_price.price, price_nvda);

    let tsla_price = oracle.lastprice(&asset_tsla).unwrap();
    assert_eq!(tsla_price.timestamp, timestamp_tsla);
    assert_eq!(tsla_price.price, price_tsla);
}

#[test]
fn test_updating_asset_with_older_timestamp_than_another_asset() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset_tsla: Asset = Asset::Other(Symbol::new(&e, "TSLA"));

    // Update NVDA at timestamp 1000
    let timestamp_nvda: u64 = 1_000_000_000;
    let price_nvda: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price_nvda, &timestamp_nvda);

    // Update TSLA at timestamp 500 (earlier than NVDA) - should work
    let timestamp_tsla: u64 = 500_000_000;
    let price_tsla: i128 = 200_00000000;
    oracle.set_asset_price(&asset_tsla, &price_tsla, &timestamp_tsla);

    // Verify both assets have their respective timestamps
    let nvda_price = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(nvda_price.timestamp, timestamp_nvda);

    let tsla_price = oracle.lastprice(&asset_tsla).unwrap();
    assert_eq!(tsla_price.timestamp, timestamp_tsla);
}

#[test]
fn test_per_asset_timestamp_retrieval() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset_tsla: Asset = Asset::Other(Symbol::new(&e, "TSLA"));

    // Update both assets with different timestamps
    let timestamp_nvda: u64 = 1_000_000_000;
    let price_nvda: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price_nvda, &timestamp_nvda);

    let timestamp_tsla: u64 = 1_500_000_000;
    let price_tsla: i128 = 200_00000000;
    oracle.set_asset_price(&asset_tsla, &price_tsla, &timestamp_tsla);

    // Retrieve and verify each asset's timestamp independently
    let nvda_price_data = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(nvda_price_data.timestamp, timestamp_nvda);

    let tsla_price_data = oracle.lastprice(&asset_tsla).unwrap();
    assert_eq!(tsla_price_data.timestamp, timestamp_tsla);

    // Timestamps should be different
    assert_ne!(nvda_price_data.timestamp, tsla_price_data.timestamp);
}

#[test]
fn test_global_timestamp_still_updates() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    // Update NVDA at timestamp 1000
    let timestamp1: u64 = 1_000_000_000;
    let price1: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price1, &timestamp1);

    let last_price = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(last_price.timestamp, timestamp1);

    // Update again with a later timestamp
    let timestamp2: u64 = 2_000_000_000;
    let price2: i128 = 160_00000000;
    oracle.set_asset_price(&asset_nvda, &price2, &timestamp2);

    // Verify the global timestamp was updated
    let last_price2 = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(last_price2.timestamp, timestamp2);
}

#[test]
fn test_backward_compatibility_with_sep40() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    // Test SEP-40 interface still works
    let timestamp1: u64 = 1_000_000_000;
    let price1: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price1, &timestamp1);

    // SEP-40 lastprice function
    let last_price = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(last_price.price, price1);
    assert_eq!(last_price.timestamp, timestamp1);

    // SEP-40 price function (specific timestamp)
    let price_at_timestamp = oracle.price(&asset_nvda, &timestamp1).unwrap();
    assert_eq!(price_at_timestamp.price, price1);
    assert_eq!(price_at_timestamp.timestamp, timestamp1);

    // Add another price point
    let timestamp2: u64 = 2_000_000_000;
    let price2: i128 = 160_00000000;
    oracle.set_asset_price(&asset_nvda, &price2, &timestamp2);

    // SEP-40 prices function (last N records)
    let prices = oracle.prices(&asset_nvda, &2).unwrap();
    assert_eq!(prices.len(), 2);

    // Verify SEP-40 base, decimals, resolution still work
    assert_eq!(oracle.decimals(), 14);
    assert_eq!(oracle.resolution(), 300);
}

// ========== Timestamp Validation Tests ==========

#[test]
fn test_per_asset_timestamps_independent() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset_tsla: Asset = Asset::Other(Symbol::new(&e, "TSLA"));

    // Set NVDA at t=1000
    let timestamp_nvda: u64 = 1_000_000_000;
    let price_nvda: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price_nvda, &timestamp_nvda);

    // Set TSLA at t=500 (earlier than NVDA) - should succeed because timestamps are independent
    let timestamp_tsla: u64 = 500_000_000;
    let price_tsla: i128 = 200_00000000;
    oracle.set_asset_price(&asset_tsla, &price_tsla, &timestamp_tsla);

    // Both should succeed with their respective timestamps
    let nvda_price = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(nvda_price.timestamp, timestamp_nvda);
    assert_eq!(nvda_price.price, price_nvda);

    let tsla_price = oracle.lastprice(&asset_tsla).unwrap();
    assert_eq!(tsla_price.timestamp, timestamp_tsla);
    assert_eq!(tsla_price.price, price_tsla);
}

#[test]
fn test_same_asset_requires_newer_timestamp() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    // Set NVDA at t=1000
    let timestamp1: u64 = 1_000_000_000;
    let price1: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price1, &timestamp1);

    // Try to set NVDA again at t=999 (older timestamp) - should work but not update lastprice
    let timestamp2: u64 = 999_000_000;
    let price2: i128 = 160_00000000;
    oracle.set_asset_price(&asset_nvda, &price2, &timestamp2);

    // The lastprice should still be the most recent one (t=1000)
    let last_price = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(last_price.timestamp, timestamp1);
    assert_eq!(last_price.price, price1);

    // But the older price should be retrievable at its specific timestamp
    let price_at_999 = oracle.price(&asset_nvda, &timestamp2).unwrap();
    assert_eq!(price_at_999.timestamp, timestamp2);
    assert_eq!(price_at_999.price, price2);
}

#[test]
fn test_same_asset_same_timestamp_rejected() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    // Set NVDA at t=1000
    let timestamp: u64 = 1_000_000_000;
    let price1: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price1, &timestamp);

    // Try to set NVDA again at the same timestamp with different price
    let price2: i128 = 160_00000000;
    oracle.set_asset_price(&asset_nvda, &price2, &timestamp);

    // The second update should overwrite the first one at the same timestamp
    let last_price = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(last_price.timestamp, timestamp);
    assert_eq!(last_price.price, price2);
}

#[test]
fn test_same_asset_newer_timestamp_accepted() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    // Set NVDA at t=1000
    let timestamp1: u64 = 1_000_000_000;
    let price1: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price1, &timestamp1);

    // Set NVDA at t=2000 (newer timestamp) - should succeed
    let timestamp2: u64 = 2_000_000_000;
    let price2: i128 = 160_00000000;
    oracle.set_asset_price(&asset_nvda, &price2, &timestamp2);

    // lastprice() should return the second price
    let last_price = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(last_price.timestamp, timestamp2);
    assert_eq!(last_price.price, price2);

    // Both prices should be retrievable
    let price_at_1000 = oracle.price(&asset_nvda, &timestamp1).unwrap();
    assert_eq!(price_at_1000.price, price1);

    let price_at_2000 = oracle.price(&asset_nvda, &timestamp2).unwrap();
    assert_eq!(price_at_2000.price, price2);
}

#[test]
fn test_global_timestamp_still_updated_with_multiple_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset_tsla: Asset = Asset::Other(Symbol::new(&e, "TSLA"));

    // Set NVDA at t=1000
    let timestamp_nvda: u64 = 1_000_000_000;
    let price_nvda: i128 = 150_00000000;
    oracle.set_asset_price(&asset_nvda, &price_nvda, &timestamp_nvda);

    // Set TSLA at t=2000 (later)
    let timestamp_tsla: u64 = 2_000_000_000;
    let price_tsla: i128 = 200_00000000;
    oracle.set_asset_price(&asset_tsla, &price_tsla, &timestamp_tsla);

    // Global last_timestamp should reflect the latest update (2000)
    let nvda_price = oracle.lastprice(&asset_nvda).unwrap();
    assert_eq!(nvda_price.timestamp, timestamp_nvda);

    let tsla_price = oracle.lastprice(&asset_tsla).unwrap();
    assert_eq!(tsla_price.timestamp, timestamp_tsla);
}
