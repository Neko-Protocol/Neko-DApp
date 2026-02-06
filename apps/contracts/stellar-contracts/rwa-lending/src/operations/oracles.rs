use soroban_sdk::{Address, Env, Symbol};

use crate::common::error::Error;
use crate::common::storage::Storage;
use crate::common::types::PriceData;
use crate::rwa_oracle::{self, Asset};

/// Oracle integration for fetching prices
pub struct Oracles;

impl Oracles {
    /// Get RWA token price from RWA Oracle
    /// The RWA Oracle implements SEP-40, so we use Asset::Other(symbol) to query prices
    /// We get the symbol from the RWA token contract's pegged_asset() function
    pub fn get_rwa_price(env: &Env, rwa_token: &Address) -> Result<PriceData, Error> {
        let storage = Storage::get(env);
        let oracle_client = rwa_oracle::Client::new(env, &storage.rwa_oracle);

        // Get the pegged asset symbol from the RWA Oracle
        // The oracle maintains a mapping from token contract address to asset symbol
        let pegged_asset = oracle_client.get_asset_id_from_token(rwa_token);
        
        // Convert symbol to Asset::Other (the oracle stores RWA assets as Other(symbol))
        let asset = Asset::Other(pegged_asset);
        
        // Get last price from oracle (SEP-40 compatible)
        let oracle_price_data = oracle_client
            .lastprice(&asset)
            .ok_or(Error::OraclePriceFetchFailed)?;
        
        // Validate price data
        if oracle_price_data.price <= 0 {
            return Err(Error::InvalidOraclePrice);
        }
        
        // Check if price is too old (more than 24 hours)
        let current_time = env.ledger().timestamp();
        if oracle_price_data.timestamp + 24 * 60 * 60 < current_time {
            return Err(Error::InvalidOraclePrice);
        }
        
        // Convert rwa_oracle::PriceData to types::PriceData
        let price_data = PriceData {
            price: oracle_price_data.price,
            timestamp: oracle_price_data.timestamp,
        };
        
        Ok(price_data)
    }

    /// Get crypto asset price from Reflector Oracle
    /// The Reflector Oracle implements SEP-40, so we use Asset::Other(symbol) to query prices
    pub fn get_crypto_price(env: &Env, asset: &Symbol) -> Result<PriceData, Error> {
        let storage = Storage::get(env);
        
        // Reflector Oracle implements SEP-40 interface (same as RWA Oracle)
        // We reuse rwa_oracle::Client here because both oracles share the same SEP-40 interface.
        // The client is generic - it works with any contract implementing SEP-40 methods.
        // The Reflector Oracle contract address is stored in storage.reflector_oracle
        let oracle_client = rwa_oracle::Client::new(env, &storage.reflector_oracle);
        
        // Convert Symbol to Asset::Other (for crypto assets like XLM, USDC, etc.)
        let asset_enum = Asset::Other(asset.clone());
        
        // Get last price from Reflector Oracle (SEP-40 compatible)
        let oracle_price_data = oracle_client
            .lastprice(&asset_enum)
            .ok_or(Error::OraclePriceFetchFailed)?;
        
        // Validate price data
        if oracle_price_data.price <= 0 {
            return Err(Error::InvalidOraclePrice);
        }
        
        // Check if price is too old (more than 24 hours)
        let current_time = env.ledger().timestamp();
        if oracle_price_data.timestamp + 24 * 60 * 60 < current_time {
            return Err(Error::InvalidOraclePrice);
        }
        
        // Convert rwa_oracle::PriceData to types::PriceData
        let price_data = PriceData {
            price: oracle_price_data.price,
            timestamp: oracle_price_data.timestamp,
        };
        
        Ok(price_data)
    }

    /// Get price with decimals from RWA Oracle
    pub fn get_rwa_price_with_decimals(
        env: &Env,
        rwa_token: &Address,
    ) -> Result<(i128, u32), Error> {
        let price_data = Self::get_rwa_price(env, rwa_token)?;
        
        let storage = Storage::get(env);
        let oracle_client = rwa_oracle::Client::new(env, &storage.rwa_oracle);
        
        // Get decimals from oracle (SEP-40 compatible)
        let decimals = oracle_client.decimals();
        
        Ok((price_data.price, decimals))
    }

    /// Get price with decimals from Reflector Oracle
    pub fn get_crypto_price_with_decimals(
        env: &Env,
        asset: &Symbol,
    ) -> Result<(i128, u32), Error> {
        let price_data = Self::get_crypto_price(env, asset)?;
        
        let storage = Storage::get(env);
        let oracle_client = rwa_oracle::Client::new(env, &storage.reflector_oracle);
        
        // Get decimals from Reflector Oracle (SEP-40 compatible)
        let decimals = oracle_client.decimals();
        
        Ok((price_data.price, decimals))
    }

    /// Calculate USD value of an amount
    /// Formula: value = (amount * price) / 10^(price_decimals)
    /// The price is already in the oracle's scale (price_decimals), so we just multiply and divide
    pub fn calculate_usd_value(
        _env: &Env,
        amount: i128,
        price: i128,
        _asset_decimals: u32,
        price_decimals: u32,
    ) -> Result<i128, Error> {
        // Multiply amount by price, then divide by 10^(price_decimals) to get USD value
        let value = amount
            .checked_mul(price)
            .ok_or(Error::ArithmeticError)?;
        
        Ok(value / 10i128.pow(price_decimals))
    }
}

