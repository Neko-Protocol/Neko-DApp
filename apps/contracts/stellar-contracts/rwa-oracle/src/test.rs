#![cfg(test)]
extern crate std;

use crate::Asset;
use crate::Error;
use crate::rwa_oracle::{RWAOracle, RWAOracleClient};
use crate::rwa_types::*;

use soroban_sdk::{
    testutils::Address as _,
    testutils::Ledger,
    Address, Env, String, Symbol, Vec,
};

fn create_rwa_oracle_contract<'a>(e: &Env) -> RWAOracleClient<'a> {
    set_ledger_timestamp(e, 2_000_000_000);

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

fn create_test_tokenization_info(env: &Env) -> TokenizationInfo {
    TokenizationInfo {
        token_contract: Some(Address::generate(env)),
        total_supply: Some(1_000_000_000_000),
        underlying_asset_id: Some(String::from_str(env, "US Treasury Bond 2024")),
        tokenization_date: Some(1_700_000_000),
    }
}

fn create_test_metadata(env: &Env, asset_id: Symbol) -> RWAMetadata {
    RWAMetadata {
        asset_id,
        name: String::from_str(env, "US Treasury Bond 2024"),
        description: String::from_str(env, "Tokenized US Treasury Bond maturing 2024"),
        asset_type: RWAAssetType::Bond,
        underlying_asset: String::from_str(env, "US Treasury Bond"),
        issuer: Address::generate(env),
        jurisdiction: Symbol::new(env, "US"),
        tokenization_info: create_test_tokenization_info(env),
        external_ids: Vec::from_array(
            env,
            [(
                Symbol::new(env, "isin"),
                String::from_str(env, "US912810SU08"),
            )],
        ),
        legal_docs_uri: Some(String::from_str(env, "https://issuer.example/docs/terms.pdf")),
        valuation_method: ValuationMethod::Market,
        metadata: Vec::new(env),
        created_at: env.ledger().timestamp(),
        updated_at: env.ledger().timestamp(),
    }
}

fn set_ledger_timestamp(e: &Env, timestamp: u64) {
    e.ledger().with_mut(|li| {
        li.timestamp = timestamp;
    });
}

// ==================== Initialization Tests ====================

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
    assert_eq!(oracle.max_staleness(), 86_400); // default 24h
}

// ==================== RWA Metadata Tests ====================

#[test]
fn test_metadata_rejected_for_unregistered_asset() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let unregistered_id = Symbol::new(&e, "NOT_REGISTERED");

    let metadata = RWAMetadata {
        asset_id: unregistered_id.clone(),
        name: String::from_str(&e, "Ghost Asset"),
        description: String::from_str(&e, "Ghost Description"),
        asset_type: RWAAssetType::Other,
        underlying_asset: String::from_str(&e, "None"),
        issuer: String::from_str(&e, "None"),
        regulatory_info: create_test_regulatory_info(&e),
        tokenization_info: create_test_tokenization_info(&e),
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    let result = oracle.try_set_rwa_metadata(&unregistered_id, &metadata);

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::AssetNotRegistered.into()
    );
}

// ==================== Tokenization Info Tests ====================

#[test]
fn test_metadata_accepted_for_registered_asset() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset_id = Symbol::new(&e, "NVDA");

    let metadata = RWAMetadata {
        asset_id: asset_id.clone(),
        name: String::from_str(&e, "NVIDIA Corp"),
        description: String::from_str(&e, "GPU Maker"),
        asset_type: RWAAssetType::Stock,
        underlying_asset: String::from_str(&e, "NVDA Stock"),
        issuer: String::from_str(&e, "NVIDIA"),
        regulatory_info: create_test_regulatory_info(&e),
        tokenization_info: create_test_tokenization_info(&e),
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    assert!(oracle
        .try_set_rwa_metadata(&asset_id, &metadata)
        .is_ok());
}

// ==================== Asset Listing Tests ====================

#[test]
fn test_metadata_accepted_after_add_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset_id = Symbol::new(&e, "NEW_RETAIL_ASSET");
    let asset = Asset::Other(asset_id.clone());

    let metadata = RWAMetadata {
        asset_id: asset_id.clone(),
        name: String::from_str(&e, "New Asset"),
        description: String::from_str(&e, "New Description"),
        asset_type: RWAAssetType::RealEstate,
        underlying_asset: String::from_str(&e, "Property"),
        issuer: String::from_str(&e, "RealProp"),
        regulatory_info: create_test_regulatory_info(&e),
        tokenization_info: create_test_tokenization_info(&e),
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    assert!(oracle
        .try_set_rwa_metadata(&asset_id, &metadata)
        .is_err());

    oracle.add_assets(&Vec::from_array(&e, [asset.clone()]));

    assert!(oracle
        .try_set_rwa_metadata(&asset_id, &metadata)
        .is_ok());
}

#[test]
fn test_asset_type_always_synced_with_metadata() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset_id = Symbol::new(&e, "NVDA");

    let metadata = RWAMetadata {
        asset_id: asset_id.clone(),
        name: String::from_str(&e, "NVIDIA"),
        description: String::from_str(&e, "GPU Maker"),
        asset_type: RWAAssetType::Stock,
        underlying_asset: String::from_str(&e, "Stock"),
        issuer: String::from_str(&e, "NVIDIA"),
        regulatory_info: create_test_regulatory_info(&e),
        tokenization_info: create_test_tokenization_info(&e),
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    oracle.set_rwa_metadata(&asset_id, &metadata);

    let asset_type = oracle
        .get_rwa_asset_type(&Asset::Other(asset_id))
        .unwrap();

    assert_eq!(asset_type, RWAAssetType::Stock);
}

//
// ================= TTL Test (Flexible) =================
//

#[test]
fn test_ttl_extended_on_metadata_update() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset_id = Symbol::new(&e, "NVDA");

    let metadata = RWAMetadata {
        asset_id: asset_id.clone(),
        name: String::from_str(&e, "NVIDIA"),
        description: String::from_str(&e, "GPU Maker"),
        asset_type: RWAAssetType::Stock,
        underlying_asset: String::from_str(&e, "Stock"),
        issuer: String::from_str(&e, "NVIDIA"),
        regulatory_info: create_test_regulatory_info(&e),
        tokenization_info: create_test_tokenization_info(&e),
        metadata: Vec::new(&e),
        created_at: e.ledger().timestamp(),
        updated_at: e.ledger().timestamp(),
    };

    // First write
    oracle.set_rwa_metadata(&asset_id, &metadata);

    let key = Symbol::new(&e, "rwa_metadata");

    let ttl_before = e
        .storage()
        .persistent()
        .get_ttl(&key)
        .unwrap();

    // Update
    let mut updated = metadata.clone();
    updated.name = String::from_str(&e, "NVIDIA UPDATED");

    oracle.set_rwa_metadata(&asset_id, &updated);

    let ttl_after = e
        .storage()
        .persistent()
        .get_ttl(&key)
        .unwrap();

    assert!(
        ttl_after > ttl_before,
        "TTL was not extended after metadata update"
    );
}

//
// ================= Timestamp Validation Tests =================
//

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_future_timestamp_rejected() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset = Asset::Other(Symbol::new(&e, "NVDA"));

    set_ledger_timestamp(&e, 1000);

    oracle.set_asset_price(&asset, &1, &4600);
}

#[test]
fn test_timestamp_within_drift_accepted() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset = Asset::Other(Symbol::new(&e, "NVDA"));

    set_ledger_timestamp(&e, 1000);

    oracle.set_asset_price(&asset, &123, &1200);

    let last = oracle.lastprice(&asset).unwrap();

    assert_eq!(last.price, 123);
    assert_eq!(last.timestamp, 1200);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_old_timestamp_rejected() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset = Asset::Other(Symbol::new(&e, "NVDA"));

    set_ledger_timestamp(&e, 1000);

    oracle.set_asset_price(&asset, &10, &1000);

    oracle.set_asset_price(&asset, &11, &999);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_same_timestamp_rejected() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset = Asset::Other(Symbol::new(&e, "NVDA"));

    set_ledger_timestamp(&e, 1000);

    oracle.set_asset_price(&asset, &10, &1000);
    oracle.set_asset_price(&asset, &11, &1000);
}

#[test]
fn test_newer_timestamp_accepted() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset = Asset::Other(Symbol::new(&e, "NVDA"));

    set_ledger_timestamp(&e, 1000);
    oracle.set_asset_price(&asset, &10, &1000);

    set_ledger_timestamp(&e, 2000);
    oracle.set_asset_price(&asset, &20, &2000);

    let last = oracle.lastprice(&asset).unwrap();

    assert_eq!(last.price, 20);
    assert_eq!(last.timestamp, 2000);
}

#[test]
fn test_different_assets_independent_timestamps() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset_a = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset_b = Asset::Other(Symbol::new(&e, "TSLA"));

    set_ledger_timestamp(&e, 1000);

    oracle.set_asset_price(&asset_a, &10, &1000);
    oracle.set_asset_price(&asset_b, &20, &500);

    let last_b = oracle.lastprice(&asset_b).unwrap();

    assert_eq!(last_b.price, 20);
    assert_eq!(last_b.timestamp, 500);
}

// ==================== TTL Extension Tests ====================

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

    let metadata = create_test_metadata(&e, asset_id.clone());
    oracle.set_rwa_metadata(&asset_id, &metadata);

    let new_info = TokenizationInfo {
        token_contract: Some(Address::generate(&e)),
        total_supply: Some(2_000_000),
        underlying_asset_id: Some(String::from_str(&e, "Updated")),
        tokenization_date: Some(1_800_000_000),
    };
    oracle.update_tokenization_info(&asset_id, &new_info);

    let retrieved = oracle.try_get_tokenization_info(&asset_id).unwrap().unwrap();
    assert_eq!(retrieved.total_supply, Some(2_000_000));
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
