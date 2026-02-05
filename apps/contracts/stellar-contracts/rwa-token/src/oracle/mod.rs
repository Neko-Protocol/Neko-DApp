use soroban_sdk::{Address, Env, Symbol};

use crate::common::error::Error;
use crate::common::metadata::MetadataStorage;
use crate::rwa_oracle::{self, Asset, PriceData as OraclePriceData};

/// Oracle integration functions
pub struct Oracle;

impl Oracle {
    /// Get the RWA Oracle contract address
    pub fn get_asset_contract(env: &Env) -> Address {
        MetadataStorage::get_asset_contract(env)
    }

    /// Get the pegged asset symbol (e.g., "NVDA", "TSLA")
    pub fn get_pegged_asset(env: &Env) -> Symbol {
        MetadataStorage::get_pegged_asset(env)
    }

    /// Get the current price of this RWA token from the RWA Oracle
    pub fn get_price(env: &Env) -> Result<OraclePriceData, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let pegged_asset = Self::get_pegged_asset(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);
        let asset = Asset::Other(pegged_asset);

        oracle_client
            .lastprice(&asset)
            .ok_or(Error::OraclePriceFetchFailed)
    }

    /// Get the price of this RWA token at a specific timestamp
    pub fn get_price_at(env: &Env, timestamp: u64) -> Result<OraclePriceData, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let pegged_asset = Self::get_pegged_asset(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);
        let asset = Asset::Other(pegged_asset);

        oracle_client
            .price(&asset, &timestamp)
            .ok_or(Error::OraclePriceFetchFailed)
    }

    /// Get the number of decimals used by the oracle for price reporting
    pub fn get_decimals(env: &Env) -> Result<u32, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);

        Ok(oracle_client.decimals())
    }

    /// Get complete RWA metadata from the oracle
    pub fn get_rwa_metadata(env: &Env) -> Result<rwa_oracle::RWAMetadata, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let pegged_asset = Self::get_pegged_asset(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);

        match oracle_client.try_get_rwa_metadata(&pegged_asset) {
            Ok(Ok(metadata)) => Ok(metadata),
            Ok(Err(_)) => Err(Error::MetadataNotFound),
            Err(_) => Err(Error::MetadataNotFound),
        }
    }

    /// Get the asset type of this RWA token
    pub fn get_asset_type(env: &Env) -> Result<rwa_oracle::RWAAssetType, Error> {
        let metadata = Self::get_rwa_metadata(env)?;
        Ok(metadata.asset_type)
    }
}
