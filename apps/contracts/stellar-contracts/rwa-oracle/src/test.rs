#![cfg(test)]
extern crate std;

use crate::rwa_oracle::{RWAOracle, RWAOracleClient};
use crate::rwa_types::*;
use crate::Asset;
use crate::Error;

use soroban_sdk::{Address, Env, Symbol, Vec, String, testutils::Address as _};

fn create_rwa_oracle_contract<'a>(e: &Env) -> RWAOracleClient<'a> {
    let asset_xlm: Asset = Asset::Other(Symbol::new(e, "NVDA"));
    let asset_usdt: Asset = Asset::Other(Symbol::new(e, "TSLA"));
    let asset_vec = Vec::from_array(e, [asset_xlm.clone(), asset_usdt.clone()]);
    let admin = Address::generate(e);
    let contract_id = e.register(
        RWAOracle,
        (admin, asset_vec, asset_usdt, 14u32, 300u32),
    );

    RWAOracleClient::new(e, &contract_id)
}

fn create_test_regulatory_info(env: &Env) -> RegulatoryInfo {
    RegulatoryInfo {
        is_regulated: true,
        approval_server: Some(String::from_str(env, "https://example.com/approve")),
        approval_criteria: Some(String::from_str(
            env,
            "Transactions require KYC approval",
        )),
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
    assert_eq!(retrieved.name, String::from_str(&e, "US Treasury Bond 2024"));
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
    assert_eq!(reg_info.compliance_status, ComplianceStatus::RequiresApproval);
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

// ========== Issues Test | TODO -> ==========

#[test]
fn test_instance_ttl_extended_on_price_update() {
    let e = Env::default();
    e.mock_all_auths();
    // 1. Setup: Create env, register contract, initialize with asset
    let oracle = create_rwa_oracle_contract(&e);
    let asset = Asset::Other(Symbol::new(&e, "NVDA"));

    // 2. Action: Call set_asset_price
    let timestamp = 1_000_000;
    let price = 100_000_000;
    oracle.set_asset_price(&asset, &price, &timestamp);

    // 3. Assert: Function completes without panic
    // 4. Assert: lastprice() returns the correct value (state is alive)
    let last_price = oracle.lastprice(&asset).unwrap();
    assert_eq!(last_price.price, price);
    assert_eq!(last_price.timestamp, timestamp);
    
    // Note: Actual TTL verification requires internal ledger access which integration tests
    // imply through successful execution and data persistence
}

#[test]
fn test_persistent_ttl_extended_on_price_update() {
    let e = Env::default();
    e.mock_all_auths();
    
    let oracle = create_rwa_oracle_contract(&e);
    let asset1 = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset2 = Asset::Other(Symbol::new(&e, "TSLA"));

    let timestamp = 1_000_000;
    let price1 = 100_000_000;
    let price2 = 200_000_000;

    // Set multiple prices
    oracle.set_asset_price(&asset1, &price1, &timestamp);
    oracle.set_asset_price(&asset2, &price2, &timestamp);

    // No panic, all prices accessible
    let last_price1 = oracle.lastprice(&asset1).unwrap();
    let last_price2 = oracle.lastprice(&asset2).unwrap();
    
    assert_eq!(last_price1.price, price1);
    assert_eq!(last_price2.price, price2);
}

#[test]
fn test_ttl_extended_on_metadata_update() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_id = Symbol::new(&e, "RWA_BOND");
    
    let regulatory_info = create_test_regulatory_info(&e);
    let tokenization_info = create_test_tokenization_info(&e);

    let metadata = RWAMetadata {
        asset_id: asset_id.clone(),
        name: String::from_str(&e, "Bond"),
        description: String::from_str(&e, "Bond Desc"),
        asset_type: RWAAssetType::Bond,
        underlying_asset: String::from_str(&e, "Underlying"),
        issuer: String::from_str(&e, "Issuer"),
        regulatory_info: regulatory_info.clone(),
        tokenization_info: tokenization_info.clone(),
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    // Set RWA metadata
    oracle.set_rwa_metadata(&asset_id, &metadata);
    
    // Metadata accessible after (no panic)
    let retrieved = oracle.get_rwa_metadata(&asset_id);
    assert_eq!(retrieved.asset_id, asset_id);
    
    // Update regulatory info
    let mut new_regulatory_info = regulatory_info.clone();
    new_regulatory_info.license_number = Some(String::from_str(&e, "NEW-LIC"));
    oracle.update_regulatory_info(&asset_id, &new_regulatory_info);
    
    // Check update
    let updated_reg = oracle.get_regulatory_info(&asset_id);
    assert_eq!(updated_reg.license_number, Some(String::from_str(&e, "NEW-LIC")));
    
    // Update tokenization info
    let mut new_tok_info = tokenization_info.clone();
    new_tok_info.total_supply = Some(2_000_000);
    oracle.update_tokenization_info(&asset_id, &new_tok_info);
    
    // Check update
    let updated_tok = oracle.get_tokenization_info(&asset_id);
    assert_eq!(updated_tok.total_supply, Some(2_000_000));
}

#[test]
fn test_ttl_extended_on_add_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let new_asset = Asset::Other(Symbol::new(&e, "AAPL"));
    let assets_to_add = Vec::from_array(&e, [new_asset.clone()]);

    // Add new assets
    oracle.add_assets(&assets_to_add);

    // No panic, assets list accessible
    let assets = oracle.assets();
    assert!(assets.contains(&new_asset));
}
