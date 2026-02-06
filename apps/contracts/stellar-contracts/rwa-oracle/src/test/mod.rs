#![cfg(test)]
extern crate std;

use crate::{Asset, Error, RWAOracle, RWAOracleClient};
use crate::{RWAAssetType, RWAMetadata, TokenizationInfo, ValuationMethod};

use soroban_sdk::{Address, Env, String, Symbol, Vec, testutils::Address as _, testutils::Ledger};

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
        legal_docs_uri: Some(String::from_str(
            env,
            "https://issuer.example/docs/terms.pdf",
        )),
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
    let asset_id = Symbol::new(&e, "NVDA");

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
    assert_eq!(retrieved.jurisdiction, Symbol::new(&e, "US"));
    assert_eq!(retrieved.valuation_method, ValuationMethod::Market);
    assert!(retrieved.legal_docs_uri.is_some());
    assert_eq!(retrieved.external_ids.len(), 1);
}

#[test]
fn test_metadata_asset_types() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    // Test each asset type
    let types = [
        ("RE_1", RWAAssetType::RealEstate),
        ("EQ_1", RWAAssetType::Equity),
        ("BD_1", RWAAssetType::Bond),
        ("CM_1", RWAAssetType::Commodity),
        ("IN_1", RWAAssetType::Invoice),
        ("FN_1", RWAAssetType::Fund),
        ("PD_1", RWAAssetType::PrivateDebt),
        ("IF_1", RWAAssetType::Infrastructure),
        ("OT_1", RWAAssetType::Other),
    ];

    for (id, asset_type) in types {
        let asset_id = Symbol::new(&e, id);
        oracle.add_assets(&Vec::from_array(&e, [Asset::Other(asset_id.clone())]));
        let mut metadata = create_test_metadata(&e, asset_id.clone());
        metadata.asset_type = asset_type.clone();
        oracle.set_rwa_metadata(&asset_id, &metadata);

        let retrieved = oracle.try_get_rwa_metadata(&asset_id).unwrap().unwrap();
        assert_eq!(retrieved.asset_type, asset_type);
    }
}

#[test]
fn test_metadata_valuation_methods() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let methods = [
        ("VM_1", ValuationMethod::Appraisal),
        ("VM_2", ValuationMethod::Market),
        ("VM_3", ValuationMethod::Index),
        ("VM_4", ValuationMethod::Oracle),
        ("VM_5", ValuationMethod::Nav),
        ("VM_6", ValuationMethod::Other),
    ];

    for (id, method) in methods {
        let asset_id = Symbol::new(&e, id);
        oracle.add_assets(&Vec::from_array(&e, [Asset::Other(asset_id.clone())]));
        let mut metadata = create_test_metadata(&e, asset_id.clone());
        metadata.valuation_method = method.clone();
        oracle.set_rwa_metadata(&asset_id, &metadata);

        let retrieved = oracle.try_get_rwa_metadata(&asset_id).unwrap().unwrap();
        assert_eq!(retrieved.valuation_method, method);
    }
}

// ==================== Tokenization Info Tests ====================

#[test]
fn test_metadata_accepted_for_registered_asset() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_id = Symbol::new(&e, "NVDA");

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

    let retrieved = oracle
        .try_get_tokenization_info(&asset_id)
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.total_supply, Some(2_000_000));
}

// ==================== Max Staleness Tests ====================

#[test]
fn test_max_staleness_default() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    assert_eq!(oracle.max_staleness(), 86_400);
}

#[test]
fn test_set_max_staleness() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    // Set to 5 minutes for active market assets
    oracle.set_max_staleness(&300);
    assert_eq!(oracle.max_staleness(), 300);

    // Set to 7 days for real estate
    oracle.set_max_staleness(&604_800);
    assert_eq!(oracle.max_staleness(), 604_800);
}

// ==================== Asset Listing Tests ====================

#[test]
fn test_metadata_accepted_after_add_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset_id = Symbol::new(&e, "NEW_RETAIL_ASSET");
    let asset = Asset::Other(asset_id.clone());

    oracle.add_assets(&Vec::from_array(
        &e,
        [
            Asset::Other(asset_id1.clone()),
            Asset::Other(asset_id2.clone()),
        ],
    ));

    let metadata1 = create_test_metadata(&e, asset_id1.clone());
    let mut metadata2 = create_test_metadata(&e, asset_id2.clone());
    metadata2.asset_type = RWAAssetType::Commodity;
    metadata2.name = String::from_str(&e, "Gold Token");

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
    let asset_id = Symbol::new(&e, "NVDA");

    let metadata = create_test_metadata(&e, asset_id.clone());
    oracle.set_rwa_metadata(&asset_id, &metadata);

    let new_info = TokenizationInfo {
        token_contract: Some(Address::generate(&e)),
        total_supply: Some(2_000_000),
        underlying_asset_id: Some(String::from_str(&e, "Updated")),
        tokenization_date: Some(1_800_000_000),
    };
    oracle.update_tokenization_info(&asset_id, &new_info);

    let retrieved = oracle
        .try_get_tokenization_info(&asset_id)
        .unwrap()
        .unwrap();
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

// ==================== Asset Registration Validation Tests ====================

#[test]
fn test_metadata_rejected_for_unregistered_asset() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let unregistered_id = Symbol::new(&e, "NOT_REGISTERED");

    // Create metadata for an asset that doesn't exist in the assets vector
    let metadata = create_test_metadata(&e, unregistered_id.clone());

    let result = oracle.try_set_rwa_metadata(&unregistered_id, &metadata);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::AssetNotRegistered.into()
    );
}

#[test]
fn test_metadata_accepted_for_registered_asset() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    // NVDA is registered via constructor in create_rwa_oracle_contract
    let registered_id = Symbol::new(&e, "NVDA");

    let metadata = create_test_metadata(&e, registered_id.clone());
    oracle.set_rwa_metadata(&registered_id, &metadata);

    // Verify get_rwa_metadata returns correct data
    let retrieved = oracle
        .try_get_rwa_metadata(&registered_id)
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.asset_id, registered_id);
    assert_eq!(retrieved.asset_type, RWAAssetType::Bond);

    // Verify get_rwa_asset_type also returns correct data
    let asset = Asset::Other(registered_id);
    let asset_type = oracle.get_rwa_asset_type(&asset);
    assert!(asset_type.is_some());
    assert_eq!(asset_type.unwrap(), RWAAssetType::Bond);
}

#[test]
fn test_asset_type_always_synced_with_metadata() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    // TSLA is registered via constructor
    let registered_id = Symbol::new(&e, "TSLA");

    let mut metadata = create_test_metadata(&e, registered_id.clone());
    metadata.asset_type = RWAAssetType::Equity;
    oracle.set_rwa_metadata(&registered_id, &metadata);

    // Verify get_rwa_asset_type returns the same type as metadata
    let asset = Asset::Other(registered_id.clone());
    let asset_type = oracle.get_rwa_asset_type(&asset);
    assert!(asset_type.is_some());
    assert_eq!(asset_type.unwrap(), RWAAssetType::Equity);

    // Update metadata with different type
    metadata.asset_type = RWAAssetType::Commodity;
    oracle.set_rwa_metadata(&registered_id, &metadata);

    // Verify asset_type is updated
    let asset_type = oracle.get_rwa_asset_type(&asset);
    assert_eq!(asset_type.unwrap(), RWAAssetType::Commodity);
}

#[test]
fn test_metadata_accepted_after_add_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let new_asset_id = Symbol::new(&e, "AAPL");
    let new_asset = Asset::Other(new_asset_id.clone());

    // Initially, setting metadata should fail
    let metadata = create_test_metadata(&e, new_asset_id.clone());
    let result = oracle.try_set_rwa_metadata(&new_asset_id, &metadata);
    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::AssetNotRegistered.into()
    );

    // Add the asset via add_assets
    let assets_to_add = Vec::from_array(&e, [new_asset.clone()]);
    oracle.add_assets(&assets_to_add);

    // Now setting metadata should succeed
    oracle.set_rwa_metadata(&new_asset_id, &metadata);

    // Verify metadata is stored
    let retrieved = oracle.try_get_rwa_metadata(&new_asset_id).unwrap().unwrap();
    assert_eq!(retrieved.asset_id, new_asset_id);

    // Verify asset_types is updated
    let asset_type = oracle.get_rwa_asset_type(&new_asset);
    assert!(asset_type.is_some());
    assert_eq!(asset_type.unwrap(), RWAAssetType::Bond);
}
