use soroban_sdk::{
    contract, contractimpl, panic_with_error, Address, BytesN, Env, Map, Symbol, Vec,
};

use crate::admin::Admin;
use crate::common::error::Error;
use crate::common::storage::RWAOracleStorage;
use crate::common::types::{
    DataKey, MAX_PRICE_HISTORY, MAX_TIMESTAMP_DRIFT_SECONDS, PERSISTENT_BUMP_AMOUNT,
    PERSISTENT_LIFETIME_THRESHOLD,
};
use crate::rwa::types::{RWAAssetType, RWAMetadata, TokenizationInfo};
use crate::sep40::{IsSep40, IsSep40Admin};
use crate::{Asset, PriceData};

fn new_asset_prices_map(env: &Env) -> Map<u64, i128> {
    Map::new(env)
}

#[contract]
pub struct RWAOracle;

#[contractimpl]
impl RWAOracle {
    #[allow(clippy::too_many_arguments)]
    pub fn __constructor(
        env: &Env,
        admin: Address,
        assets: Vec<Asset>,
        base: Asset,
        decimals: u32,
        resolution: u32,
    ) -> Result<(), Error> {
        Admin::set_admin(env, &admin);
        let oracle = RWAOracleStorage::new(env, assets.clone(), base, decimals, resolution);
        RWAOracleStorage::set(env, &oracle);

        let new_map: Map<u64, i128> = Map::new(env);
        for asset in assets.into_iter() {
            env.storage()
                .persistent()
                .set(&DataKey::Prices(asset), &new_map);
        }
        Ok(())
    }

    /// Upgrade the contract to new wasm
    pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
        Admin::upgrade(env, new_wasm_hash);
    }

    // ==================== RWA Admin Functions ====================

    /// Register or update RWA metadata for an asset
    pub fn set_rwa_metadata(
        env: &Env,
        asset_id: Symbol,
        metadata: RWAMetadata,
    ) -> Result<(), Error> {
        Admin::require_admin(env);

        // Validate asset_id consistency
        if metadata.asset_id != asset_id {
            return Err(Error::InvalidMetadata);
        }

        let mut state = RWAOracleStorage::get(env);

        // Set metadata
        state.rwa_metadata.set(asset_id.clone(), metadata.clone());

        // Update asset type mapping if asset exists in price feed
        if let Some(asset) = state.assets.iter().find(|a| match a {
            Asset::Other(sym) => sym == &asset_id,
            _ => false,
        }) {
            state.asset_types.set(asset.clone(), metadata.asset_type);
        }

        RWAOracleStorage::set(env, &state);
        Admin::extend_instance_ttl(env);
        Ok(())
    }

    /// Update tokenization information for a previously registered asset
    pub fn update_tokenization_info(
        env: &Env,
        asset_id: Symbol,
        tokenization_info: TokenizationInfo,
    ) -> Result<(), Error> {
        Admin::require_admin(env);
        let mut state = RWAOracleStorage::get(env);

        let mut metadata = state
            .rwa_metadata
            .get(asset_id.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::AssetNotFound));

        metadata.tokenization_info = tokenization_info;
        metadata.updated_at = env.ledger().timestamp();
        state.rwa_metadata.set(asset_id, metadata);
        RWAOracleStorage::set(env, &state);
        Admin::extend_instance_ttl(env);
        Ok(())
    }

    /// Set the maximum acceptable age (in seconds) for price data
    pub fn set_max_staleness(env: &Env, max_seconds: u64) {
        Admin::set_max_staleness(env, max_seconds);
    }

    // ==================== RWA Query Functions ====================

    /// Get complete RWA metadata for an asset
    pub fn get_rwa_metadata(env: &Env, asset_id: Symbol) -> Result<RWAMetadata, Error> {
        let state = RWAOracleStorage::get(env);
        state.rwa_metadata.get(asset_id).ok_or(Error::AssetNotFound)
    }

    /// Get RWA asset type for an asset
    pub fn get_rwa_asset_type(env: &Env, asset: Asset) -> Option<RWAAssetType> {
        let state = RWAOracleStorage::get(env);
        state.asset_types.get(asset)
    }

    /// Get tokenization information for an RWA
    pub fn get_tokenization_info(env: &Env, asset_id: Symbol) -> Result<TokenizationInfo, Error> {
        let state = RWAOracleStorage::get(env);
        let metadata = state
            .rwa_metadata
            .get(asset_id)
            .ok_or(Error::AssetNotFound)?;
        Ok(metadata.tokenization_info)
    }

    /// Get all registered RWA asset IDs
    pub fn get_all_rwa_assets(env: &Env) -> Vec<Symbol> {
        let state = RWAOracleStorage::get(env);
        let mut assets = Vec::new(env);
        for (asset_id, _) in state.rwa_metadata.iter() {
            assets.push_back(asset_id);
        }
        assets
    }

    /// Resolve a token contract address to its oracle asset identifier
    pub fn get_asset_id_from_token(env: &Env, token_address: &Address) -> Result<Symbol, Error> {
        // First check if we have a direct mapping
        if let Some(asset_id) = env
            .storage()
            .persistent()
            .get(&DataKey::TokenToAsset(token_address.clone()))
        {
            return Ok(asset_id);
        }

        // Fallback: iterate through metadata to find matching token_contract
        let state = RWAOracleStorage::get(env);
        for (asset_id, metadata) in state.rwa_metadata.iter() {
            if let Some(token_contract) = &metadata.tokenization_info.token_contract {
                if token_contract == token_address {
                    // Cache the mapping for future lookups
                    env.storage()
                        .persistent()
                        .set(&DataKey::TokenToAsset(token_address.clone()), &asset_id);
                    return Ok(asset_id);
                }
            }
        }

        Err(Error::AssetNotFound)
    }

    /// Get the configured maximum staleness in seconds
    pub fn max_staleness(env: &Env) -> u64 {
        let state = RWAOracleStorage::get(env);
        state.max_staleness
    }

    // ==================== Internal Helpers ====================

    fn get_asset_price(env: &Env, asset_id: Asset) -> Option<Map<u64, i128>> {
        env.storage().persistent().get(&DataKey::Prices(asset_id))
    }

    fn set_asset_price_internal(env: &Env, asset_id: Asset, price: i128, timestamp: u64) {
        if price <= 0 {
            panic_with_error!(env, Error::InvalidPrice);
        }

        let current_time = env.ledger().timestamp();
        if timestamp > current_time + MAX_TIMESTAMP_DRIFT_SECONDS {
            panic_with_error!(env, Error::TimestampInFuture);
        }

        if let Some(last_price) = <Self as IsSep40>::lastprice(env, asset_id.clone()) {
            if timestamp <= last_price.timestamp {
                panic_with_error!(env, Error::TimestampTooOld);
            }
        }

        let mut asset = Self::get_asset_price(env, asset_id.clone()).unwrap_or_else(|| {
            panic_with_error!(env, Error::AssetNotFound);
        });

        while asset.len() >= MAX_PRICE_HISTORY {
            if let Some(oldest_key) = asset.keys().iter().next() {
                asset.remove(oldest_key);
            } else {
                break;
            }
        }
        asset.set(timestamp, price);
        env.storage()
            .persistent()
            .set(&DataKey::Prices(asset_id.clone()), &asset);

        // Update last timestamp
        let mut state = RWAOracleStorage::get(env);
        state.last_timestamp = timestamp;
        RWAOracleStorage::set(env, &state);

        Admin::extend_instance_ttl(env);
        Self::extend_persistent_ttl(env, &DataKey::Prices(asset_id));
    }

    fn extend_persistent_ttl(env: &Env, key: &DataKey) {
        env.storage()
            .persistent()
            .extend_ttl(key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
    }
}

// ==================== SEP-40 Implementation ====================

#[contractimpl]
impl IsSep40Admin for RWAOracle {
    fn add_assets(env: &Env, assets: Vec<Asset>) {
        Admin::require_admin(env);
        let current_storage = RWAOracleStorage::get(env);
        let mut assets_vec = current_storage.assets;

        for asset in assets.iter() {
            let asset_clone = asset.clone();
            if assets_vec.contains(&asset_clone) {
                panic_with_error!(env, Error::AssetAlreadyExists);
            }
            assets_vec.push_back(asset_clone.clone());
            env.storage()
                .persistent()
                .set(&DataKey::Prices(asset_clone), &new_asset_prices_map(env));
        }

        RWAOracleStorage::set(
            env,
            &RWAOracleStorage {
                assets: assets_vec,
                ..current_storage
            },
        );
        Admin::extend_instance_ttl(env);
    }

    fn set_asset_price(env: &Env, asset_id: Asset, price: i128, timestamp: u64) {
        Admin::require_admin(env);
        RWAOracle::set_asset_price_internal(env, asset_id, price, timestamp);
    }
}

#[contractimpl]
impl IsSep40 for RWAOracle {
    fn assets(env: &Env) -> Vec<Asset> {
        RWAOracleStorage::get(env).assets.clone()
    }

    fn base(env: &Env) -> Asset {
        RWAOracleStorage::get(env).base.clone()
    }

    fn decimals(env: &Env) -> u32 {
        RWAOracleStorage::get(env).decimals
    }

    fn lastprice(env: &Env, asset: Asset) -> Option<PriceData> {
        let Some(asset_prices) = RWAOracle::get_asset_price(env, asset.clone()) else {
            return None;
        };
        let timestamp = asset_prices.keys().last()?;
        let price = asset_prices.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn price(env: &Env, asset: Asset, timestamp: u64) -> Option<PriceData> {
        let Some(asset_prices) = RWAOracle::get_asset_price(env, asset.clone()) else {
            return None;
        };
        let price = asset_prices.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn prices(env: &Env, asset: Asset, records: u32) -> Option<Vec<PriceData>> {
        let Some(asset_prices) = RWAOracle::get_asset_price(env, asset.clone()) else {
            return None;
        };
        let mut prices = Vec::new(env);
        asset_prices
            .keys()
            .iter()
            .rev()
            .take(records as usize)
            .for_each(|timestamp| {
                prices.push_back(PriceData {
                    price: asset_prices.get_unchecked(timestamp),
                    timestamp,
                })
            });
        Some(prices)
    }

    fn resolution(env: &Env) -> u32 {
        RWAOracleStorage::get(env).resolution
    }
}
