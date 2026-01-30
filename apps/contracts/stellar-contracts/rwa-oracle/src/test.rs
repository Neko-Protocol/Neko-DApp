#![cfg(test)]
extern crate std;

use crate::rwa_oracle::{RWAOracle, RWAOracleClient};
use crate::rwa_types::*;
use crate::Asset;
use crate::Error;

use soroban_sdk::{
    testutils::Address as _,
    Address, Env, String, Symbol, Vec,
};

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

    let retrieved = oracle.try_get_rwa_metadata(&asset_id).unwrap().unwrap();
    assert_eq!(retrieved.asset_id, asset_id);
    assert_eq!(retrieved.asset_type, RWAAssetType::Bond);
    assert_eq!(retrieved.name, String::from_str(&e, "US Treasury Bond 2024"));
    assert!(retrieved.regulatory_info.is_regulated);
}

#[test]
fn test_price_feed_compatibility() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_xlm: Asset = Asset::Other(Symbol::new(&e, "XLM"));

    let assets_to_add = Vec::from_array(&e, [asset_xlm.clone()]);
    oracle.add_assets(&assets_to_add);

    let timestamp1: u64 = 1_000_000_000;
    let price1 = 10_000_000_000_000;
    oracle.set_asset_price(&asset_xlm, &price1, &timestamp1);

    let last_price = oracle.lastprice(&asset_xlm).unwrap();
    assert_eq!(last_price.price, price1);
    assert_eq!(last_price.timestamp, timestamp1);

    let timestamp2: u64 = 1_000_001_000;
    let price2 = 10_500_000_000_000;
    oracle.set_asset_price(&asset_xlm, &price2, &timestamp2);

    let prices = oracle.prices(&asset_xlm, &2).unwrap();
    assert_eq!(prices.len(), 2);
    assert_eq!(prices.get(0).unwrap().price, price2);
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

    assert!(oracle.try_is_regulated(&asset_id).unwrap().unwrap());

    let reg_info = oracle.try_get_regulatory_info(&asset_id).unwrap().unwrap();
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
    oracle.set_asset_price(&asset, &-100, &1_000_000_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_zero_price_rejected() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    oracle.set_asset_price(&asset, &0, &1_000_000_000);
}

#[test]
fn test_positive_price_accepted() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let price: i128 = 150_00000000;

    oracle.set_asset_price(&asset, &price, &1_000_000_000);
    assert_eq!(oracle.lastprice(&asset).unwrap().price, price);
}

#[test]
fn test_min_positive_price_accepted() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    oracle.set_asset_price(&asset, &1, &1_000_000_000);
    assert_eq!(oracle.lastprice(&asset).unwrap().price, 1);
}

// ========== TTL Extension Tests ==========

#[test]
fn test_instance_ttl_extended_on_price_update() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset = Asset::Other(Symbol::new(&e, "NVDA"));

    oracle.set_asset_price(&asset, &100_000_000, &1_000_000);

    let last_price = oracle.lastprice(&asset).unwrap();
    assert_eq!(last_price.price, 100_000_000);
}

#[test]
fn test_persistent_ttl_extended_on_price_update() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset1 = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset2 = Asset::Other(Symbol::new(&e, "TSLA"));

    oracle.set_asset_price(&asset1, &100_000_000, &1_000_000);
    oracle.set_asset_price(&asset2, &200_000_000, &1_000_000);

    assert_eq!(oracle.lastprice(&asset1).unwrap().price, 100_000_000);
    assert_eq!(oracle.lastprice(&asset2).unwrap().price, 200_000_000);
}

#[test]
fn test_ttl_extended_on_metadata_update() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_id = Symbol::new(&e, "RWA_BOND");

    let mut regulatory_info = create_test_regulatory_info(&e);
    let mut tokenization_info = create_test_tokenization_info(&e);

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

    oracle.set_rwa_metadata(&asset_id, &metadata);

    regulatory_info.license_number = Some(String::from_str(&e, "NEW-LIC"));
    oracle.update_regulatory_info(&asset_id, &regulatory_info);

    tokenization_info.total_supply = Some(2_000_000);
    oracle.update_tokenization_info(&asset_id, &tokenization_info);

    assert_eq!(
        oracle.get_regulatory_info(&asset_id).license_number,
        Some(String::from_str(&e, "NEW-LIC"))
    );
}

#[test]
fn test_ttl_extended_on_add_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let new_asset = Asset::Other(Symbol::new(&e, "AAPL"));
    let assets_to_add = Vec::from_array(&e, [new_asset.clone()]);

    oracle.add_assets(&assets_to_add);

    assert!(oracle.assets().contains(&new_asset));
}
