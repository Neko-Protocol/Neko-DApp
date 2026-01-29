use soroban_sdk::{
    Address, BytesN, Env, Map, Symbol, Vec, contract, contractimpl, contracttype, panic_with_error,
    symbol_short,
};

use crate::error::Error;
use crate::rwa_types::*;
use crate::sep40::{IsSep40, IsSep40Admin};
use crate::{Asset, PriceData};

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const STORAGE: Symbol = symbol_short!("STORAGE");
const MAX_PRICE_HISTORY: u32 = 1000;

#[contracttype]
#[derive(Clone, Debug)]
pub struct RWAOracleStorage {
    // Price data stream (SEP-40 compatible)
    assets: Vec<Asset>,
    base: Asset,
    decimals: u32,
    resolution: u32,
    last_timestamp: u64,
    // RWA metadata
    rwa_metadata: Map<Symbol, RWAMetadata>,
    // Asset type mapping
    asset_types: Map<Asset, RWAAssetType>,
}

impl RWAOracleStorage {
    pub fn get_state(env: &Env) -> RWAOracleStorage {
        env.storage().instance().get(&STORAGE).unwrap()
    }

    pub fn set_state(env: &Env, storage: &RWAOracleStorage) {
        env.storage().instance().set(&STORAGE, &storage);
    }
}

#[contracttype]
enum DataKey {
    Prices(Asset),
    TokenToAsset(Address), // Map token contract address to asset Symbol
}

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
        env.storage().instance().set(&ADMIN_KEY, &admin);
        let oracle = RWAOracleStorage {
            assets: assets.clone(),
            base,
            decimals,
            resolution,
            last_timestamp: 0,
            rwa_metadata: Map::new(env),
            asset_types: Map::new(env),
        };
        RWAOracleStorage::set_state(env, &oracle);
        let new_map: Map<u64, i128> = Map::new(env);
        for asset in assets.into_iter() {
            env.storage()
                .persistent()
                .set(&DataKey::Prices(asset), &new_map);
        }
        Ok(())
    }

    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Admin must be set");
        admin.require_auth();
    }

    /// Upgrade the contract to new wasm
    pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
        Self::require_admin(env);
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    // SEP-40 price feed functions (delegated)
    fn get_asset_price(env: &Env, asset_id: Asset) -> Option<Map<u64, i128>> {
        env.storage().persistent().get(&DataKey::Prices(asset_id))
    }

    fn set_asset_price_internal(env: &Env, asset_id: Asset, price: i128, timestamp: u64) {
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
            .set(&DataKey::Prices(asset_id), &asset);

        // Update last timestamp
        let mut state = RWAOracleStorage::get_state(env);
        state.last_timestamp = timestamp;
        RWAOracleStorage::set_state(env, &state);
    }

    // RWA-specific admin functions

    /// Register or update RWA metadata
    pub fn set_rwa_metadata(
        env: &Env,
        asset_id: Symbol,
        metadata: RWAMetadata,
    ) -> Result<(), Error> {
        Self::require_admin(env);
        let mut state = RWAOracleStorage::get_state(env);

        // Validate asset type
        if !Self::is_valid_rwa_type(env, &metadata.asset_type) {
            return Err(Error::InvalidRWAType);
        }

        // Set metadata
        state.rwa_metadata.set(asset_id.clone(), metadata.clone());

        // Update asset type mapping if asset exists
        if let Some(asset) = state.assets.iter().find(|a| match a {
            Asset::Other(sym) => sym == &asset_id,
            _ => false,
        }) {
            state.asset_types.set(asset.clone(), metadata.asset_type);
        }

        RWAOracleStorage::set_state(env, &state);
        Ok(())
    }

    /// Update regulatory/compliance information
    pub fn update_regulatory_info(
        env: &Env,
        asset_id: Symbol,
        regulatory_info: RegulatoryInfo,
    ) -> Result<(), Error> {
        Self::require_admin(env);
        let mut state = RWAOracleStorage::get_state(env);

        let mut metadata = state
            .rwa_metadata
            .get(asset_id.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::AssetNotFound));

        metadata.regulatory_info = regulatory_info;
        metadata.updated_at = env.ledger().timestamp();
        state.rwa_metadata.set(asset_id, metadata);
        RWAOracleStorage::set_state(env, &state);
        Ok(())
    }

    /// Update tokenization information
    pub fn update_tokenization_info(
        env: &Env,
        asset_id: Symbol,
        tokenization_info: TokenizationInfo,
    ) -> Result<(), Error> {
        Self::require_admin(env);
        let mut state = RWAOracleStorage::get_state(env);

        let mut metadata = state
            .rwa_metadata
            .get(asset_id.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::AssetNotFound));

        metadata.tokenization_info = tokenization_info;
        metadata.updated_at = env.ledger().timestamp();
        state.rwa_metadata.set(asset_id, metadata);
        RWAOracleStorage::set_state(env, &state);
        Ok(())
    }

    // RWA query functions

    /// Get complete RWA metadata for an asset
    pub fn get_rwa_metadata(env: &Env, asset_id: Symbol) -> Result<RWAMetadata, Error> {
        let state = RWAOracleStorage::get_state(env);
        state.rwa_metadata.get(asset_id).ok_or(Error::AssetNotFound)
    }

    /// Get RWA asset type for an asset
    pub fn get_rwa_asset_type(env: &Env, asset: Asset) -> Option<RWAAssetType> {
        let state = RWAOracleStorage::get_state(env);
        state.asset_types.get(asset)
    }

    /// Get regulatory information for an RWA
    pub fn get_regulatory_info(env: &Env, asset_id: Symbol) -> Result<RegulatoryInfo, Error> {
        let state = RWAOracleStorage::get_state(env);
        let metadata = state
            .rwa_metadata
            .get(asset_id)
            .ok_or(Error::AssetNotFound)?;
        Ok(metadata.regulatory_info)
    }

    /// Get tokenization information for an RWA
    pub fn get_tokenization_info(env: &Env, asset_id: Symbol) -> Result<TokenizationInfo, Error> {
        let state = RWAOracleStorage::get_state(env);
        let metadata = state
            .rwa_metadata
            .get(asset_id)
            .ok_or(Error::AssetNotFound)?;
        Ok(metadata.tokenization_info)
    }

    /// Check if an asset is regulated (SEP-0008)
    pub fn is_regulated(env: &Env, asset_id: Symbol) -> Result<bool, Error> {
        let regulatory_info = Self::get_regulatory_info(env, asset_id)?;
        Ok(regulatory_info.is_regulated)
    }

    /// Get all registered RWA asset IDs
    pub fn get_all_rwa_assets(env: &Env) -> Vec<Symbol> {
        let state = RWAOracleStorage::get_state(env);
        let mut assets = Vec::new(env);
        for (asset_id, _) in state.rwa_metadata.iter() {
            assets.push_back(asset_id);
        }
        assets
    }

    /// Get asset Symbol from token contract address
    /// This allows other contracts to query the oracle without needing to call the token contract
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
        let state = RWAOracleStorage::get_state(env);
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

    // Helper functions

    fn is_valid_rwa_type(_env: &Env, rwa_type: &RWAAssetType) -> bool {
        matches!(
            rwa_type,
            RWAAssetType::Fiat
                | RWAAssetType::Crypto
                | RWAAssetType::Stock
                | RWAAssetType::Bond
                | RWAAssetType::Commodity
                | RWAAssetType::RealEstate
                | RWAAssetType::Nft
                | RWAAssetType::Other
        )
    }
}

// SEP-40 Implementation (price feed interface)
#[contractimpl]
impl IsSep40Admin for RWAOracle {
    fn add_assets(env: &Env, assets: Vec<Asset>) {
        Self::require_admin(env);
        let current_storage = RWAOracleStorage::get_state(env);
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

        RWAOracleStorage::set_state(
            env,
            &RWAOracleStorage {
                assets: assets_vec,
                ..current_storage
            },
        );
    }

    fn set_asset_price(env: &Env, asset_id: Asset, price: i128, timestamp: u64) {
        Self::require_admin(env);
        Self::set_asset_price_internal(env, asset_id, price, timestamp);
    }
}

#[contractimpl]
impl IsSep40 for RWAOracle {
    fn assets(env: &Env) -> Vec<Asset> {
        RWAOracleStorage::get_state(env).assets.clone()
    }

    fn base(env: &Env) -> Asset {
        RWAOracleStorage::get_state(env).base.clone()
    }

    fn decimals(env: &Env) -> u32 {
        RWAOracleStorage::get_state(env).decimals
    }

    fn lastprice(env: &Env, asset: Asset) -> Option<PriceData> {
        let Some(asset_prices) = Self::get_asset_price(env, asset.clone()) else {
            return None;
        };
        let timestamp = asset_prices.keys().last()?;
        let price = asset_prices.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn price(env: &Env, asset: Asset, timestamp: u64) -> Option<PriceData> {
        let Some(asset_prices) = Self::get_asset_price(env, asset.clone()) else {
            return None;
        };
        let price = asset_prices.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn prices(env: &Env, asset: Asset, records: u32) -> Option<Vec<PriceData>> {
        let Some(asset_prices) = Self::get_asset_price(env, asset.clone()) else {
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
        RWAOracleStorage::get_state(env).resolution
    }
}
