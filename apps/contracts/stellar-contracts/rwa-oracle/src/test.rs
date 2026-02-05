#![cfg(test)]
extern crate std;

use crate::Asset;
use crate::Error;
use crate::rwa_oracle::{RWAOracle, RWAOracleClient};
use crate::rwa_types::*;

use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, String, Symbol, Vec};

fn create_rwa_oracle_contract<'a>(e: &Env) -> RWAOracleClient<'a> {
    set_ledger_timestamp(e, 2_000_000_000);
    let asset_xlm: Asset = Asset::Other(Symbol::new(e, "NVDA"));
    let asset_usdt: Asset = Asset::Other(Symbol::new(e, "TSLA"));
    let asset_vec = Vec::from_array(e, [asset_xlm.clone(), asset_usdt.clone()]);
    let admin = Address::generate(e);
    let contract_id = e.register(RWAOracle, (admin, asset_vec, asset_usdt, 14u32, 300u32));

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
fn test_set_rwa_metadata() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_id = Symbol::new(&e, "RWA_BOND_2024");

    let metadata = create_test_metadata(&e, asset_id.clone());
    oracle.set_rwa_metadata(&asset_id, &metadata);

    let retrieved = oracle.try_get_rwa_metadata(&asset_id).unwrap().unwrap();
    assert_eq!(retrieved.asset_id, asset_id);
    assert_eq!(retrieved.asset_type, RWAAssetType::Bond);
    assert_eq!(
        retrieved.name,
        String::from_str(&e, "US Treasury Bond 2024")
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
        let mut metadata = create_test_metadata(&e, asset_id.clone());
        metadata.valuation_method = method.clone();
        oracle.set_rwa_metadata(&asset_id, &metadata);

        let retrieved = oracle.try_get_rwa_metadata(&asset_id).unwrap().unwrap();
        assert_eq!(retrieved.valuation_method, method);
    }
}

// ==================== Tokenization Info Tests ====================

#[test]
fn test_update_tokenization_info() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_id = Symbol::new(&e, "RWA_BOND");

    let metadata = create_test_metadata(&e, asset_id.clone());
    oracle.set_rwa_metadata(&asset_id, &metadata);

    let new_info = TokenizationInfo {
        token_contract: Some(Address::generate(&e)),
        total_supply: Some(2_000_000),
        underlying_asset_id: Some(String::from_str(&e, "Updated Bond")),
        tokenization_date: Some(1_800_000_000),
    };
    oracle.update_tokenization_info(&asset_id, &new_info);

    let retrieved = oracle.try_get_tokenization_info(&asset_id).unwrap().unwrap();
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
fn test_get_all_rwa_assets() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);

    let asset_id1 = Symbol::new(&e, "RWA_1");
    let asset_id2 = Symbol::new(&e, "RWA_2");

    let metadata1 = create_test_metadata(&e, asset_id1.clone());
    let mut metadata2 = create_test_metadata(&e, asset_id2.clone());
    metadata2.asset_type = RWAAssetType::Commodity;
    metadata2.name = String::from_str(&e, "Gold Token");

    oracle.set_rwa_metadata(&asset_id1, &metadata1);
    oracle.set_rwa_metadata(&asset_id2, &metadata2);

    let all_assets = oracle.get_all_rwa_assets();
    assert_eq!(all_assets.len(), 2);
}

// ==================== SEP-40 Price Feed Tests ====================

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
    set_ledger_timestamp(&e, timestamp1);
    oracle.set_asset_price(&asset_xlm, &price1, &timestamp1);

    let last_price = oracle.lastprice(&asset_xlm).unwrap();
    assert_eq!(last_price.price, price1);
    assert_eq!(last_price.timestamp, timestamp1);

    let timestamp2: u64 = 1_000_001_000;
    let price2 = 10_500_000_000_000;
    set_ledger_timestamp(&e, timestamp2);
    oracle.set_asset_price(&asset_xlm, &price2, &timestamp2);

    let prices = oracle.prices(&asset_xlm, &2).unwrap();
    assert_eq!(prices.len(), 2);
    assert_eq!(prices.get(0).unwrap().price, price2);
}

// ==================== Error Handling Tests ====================

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

// ==================== Price History Pruning Tests ====================

#[test]
fn test_price_history_pruning() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset = Asset::Other(Symbol::new(&e, "NVDA"));

    for i in 0..1000 {
        oracle.set_asset_price(&asset, &(100_000 + i as i128), &(1000 + i as u64));
    }

    let oldest_price = oracle.price(&asset, &1000);
    assert!(oldest_price.is_some());
    assert_eq!(oldest_price.unwrap().price, 100_000);

    oracle.set_asset_price(&asset, &200_000, &2000);

    let removed_price = oracle.price(&asset, &1000);
    assert!(removed_price.is_none());

    let second_oldest = oracle.price(&asset, &1001);
    assert!(second_oldest.is_some());
    assert_eq!(second_oldest.unwrap().price, 100_001);

    let newest = oracle.price(&asset, &2000);
    assert!(newest.is_some());
    assert_eq!(newest.unwrap().price, 200_000);

    let last = oracle.lastprice(&asset).unwrap();
    assert_eq!(last.timestamp, 2000);
    assert_eq!(last.price, 200_000);
}

#[test]
fn test_history_under_limit_not_pruned() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset = Asset::Other(Symbol::new(&e, "TSLA"));

    for i in 0..500 {
        oracle.set_asset_price(&asset, &(50_000 + i as i128), &(5000 + i as u64));
    }

    let first_price = oracle.price(&asset, &5000);
    assert!(first_price.is_some());
    assert_eq!(first_price.unwrap().price, 50_000);

    let last_price = oracle.price(&asset, &5499);
    assert!(last_price.is_some());
    assert_eq!(last_price.unwrap().price, 50_499);

    for i in 500..999 {
        oracle.set_asset_price(&asset, &(50_000 + i as i128), &(5000 + i as u64));
    }

    let first_still_exists = oracle.price(&asset, &5000);
    assert!(first_still_exists.is_some());
    assert_eq!(first_still_exists.unwrap().price, 50_000);

    let all_prices = oracle.prices(&asset, &999);
    assert!(all_prices.is_some());
    assert_eq!(all_prices.unwrap().len(), 999);
}

#[test]
fn test_pruning_per_asset_independent() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_nvda = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset_tsla = Asset::Other(Symbol::new(&e, "TSLA"));

    for i in 0..1000 {
        oracle.set_asset_price(&asset_nvda, &(100_000 + i as i128), &(1000 + i as u64));
    }

    for i in 0..100 {
        oracle.set_asset_price(&asset_tsla, &(200_000 + i as i128), &(2000 + i as u64));
    }

    let nvda_prices = oracle.prices(&asset_nvda, &1000);
    assert!(nvda_prices.is_some());
    assert_eq!(nvda_prices.unwrap().len(), 1000);

    let tsla_prices = oracle.prices(&asset_tsla, &200);
    assert!(tsla_prices.is_some());
    assert_eq!(tsla_prices.unwrap().len(), 100);

    oracle.set_asset_price(&asset_nvda, &300_000, &3000);

    let nvda_oldest = oracle.price(&asset_nvda, &1000);
    assert!(nvda_oldest.is_none());

    let nvda_second = oracle.price(&asset_nvda, &1001);
    assert!(nvda_second.is_some());

    let tsla_first = oracle.price(&asset_tsla, &2000);
    assert!(tsla_first.is_some());
    assert_eq!(tsla_first.unwrap().price, 200_000);

    let tsla_last = oracle.price(&asset_tsla, &2099);
    assert!(tsla_last.is_some());
    assert_eq!(tsla_last.unwrap().price, 200_099);

    let tsla_all = oracle.prices(&asset_tsla, &100);
    assert!(tsla_all.is_some());
    assert_eq!(tsla_all.unwrap().len(), 100);

    let nvda_after_pruning = oracle.prices(&asset_nvda, &1000);
    assert!(nvda_after_pruning.is_some());
    assert_eq!(nvda_after_pruning.unwrap().len(), 1000);
}

// ==================== Price Validation Tests ====================

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

// ==================== Timestamp Validation Tests ====================

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_future_timestamp_rejected() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    set_ledger_timestamp(&e, 1000);
    let price: i128 = 1;
    let timestamp: u64 = 4600;
    oracle.set_asset_price(&asset, &price, &timestamp);
}

#[test]
fn test_timestamp_within_drift_accepted() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    set_ledger_timestamp(&e, 1000);
    let price: i128 = 123;
    let timestamp: u64 = 1200;
    oracle.set_asset_price(&asset, &price, &timestamp);

    let last_price = oracle.lastprice(&asset).unwrap();
    assert_eq!(last_price.price, price);
    assert_eq!(last_price.timestamp, timestamp);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_old_timestamp_rejected() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

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
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    set_ledger_timestamp(&e, 1000);
    oracle.set_asset_price(&asset, &10, &1000);

    oracle.set_asset_price(&asset, &11, &1000);
}

#[test]
fn test_newer_timestamp_accepted() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset: Asset = Asset::Other(Symbol::new(&e, "NVDA"));

    set_ledger_timestamp(&e, 1000);
    oracle.set_asset_price(&asset, &10, &1000);

    set_ledger_timestamp(&e, 2000);
    oracle.set_asset_price(&asset, &20, &2000);

    let last_price = oracle.lastprice(&asset).unwrap();
    assert_eq!(last_price.price, 20);
    assert_eq!(last_price.timestamp, 2000);
}

#[test]
fn test_different_assets_independent_timestamps() {
    let e = Env::default();
    e.mock_all_auths();

    let oracle = create_rwa_oracle_contract(&e);
    let asset_aapl: Asset = Asset::Other(Symbol::new(&e, "NVDA"));
    let asset_tsla: Asset = Asset::Other(Symbol::new(&e, "TSLA"));

    set_ledger_timestamp(&e, 1000);
    oracle.set_asset_price(&asset_aapl, &10, &1000);

    oracle.set_asset_price(&asset_tsla, &20, &500);

    let last_price_tsla = oracle.lastprice(&asset_tsla).unwrap();
    assert_eq!(last_price_tsla.price, 20);
    assert_eq!(last_price_tsla.timestamp, 500);
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
