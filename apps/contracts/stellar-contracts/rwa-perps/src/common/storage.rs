use soroban_sdk::{panic_with_error, Address, Env, Map, Symbol, symbol_short};
use crate::common::types::{Position, MarketConfig, PerpsStorage, STORAGE, ADMIN_KEY};
use crate::common::error::Error;

const PRICE_KEY: Symbol = symbol_short!("price");

pub struct Storage;

impl Storage {
    /// Check if contract is initialized
    pub fn is_initialized(env: &Env) -> bool {
        env.storage().instance().has(&STORAGE)
    }

    /// Get main perpetuals storage
    pub fn get(env: &Env) -> PerpsStorage {
        env.storage()
            .instance()
            .get(&STORAGE)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }

    /// Set main perpetuals storage
    pub fn set(env: &Env, storage: &PerpsStorage) {
        env.storage().instance().set(&STORAGE, storage);
    }

    /// Get admin address
    pub fn get_admin(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }

    /// Set admin address (only during initialization)
    pub fn set_admin(env: &Env, admin: &Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic_with_error!(env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN_KEY, admin);
    }

    /// Get oracle address
    pub fn get_oracle(env: &Env) -> Address {
        let storage = Self::get(env);
        storage.oracle
    }

    /// Set oracle address
    pub fn set_oracle(env: &Env, oracle: &Address) {
        let mut storage = Self::get(env);
        storage.oracle = oracle.clone();
        Self::set(env, &storage);
    }

    /// Get a position by trader address and RWA token
    pub fn get_position(env: &Env, trader: &Address, rwa_token: &Address) -> Option<Position> {
        let key = (trader.clone(), rwa_token.clone());
        env.storage().persistent().get(&key)
    }

    /// Set a position
    pub fn set_position(env: &Env, trader: &Address, rwa_token: &Address, position: &Position) {
        let key = (trader.clone(), rwa_token.clone());
        env.storage().persistent().set(&key, position);
    }

    /// Remove a position
    pub fn remove_position(env: &Env, trader: &Address, rwa_token: &Address) {
        let key = (trader.clone(), rwa_token.clone());
        env.storage().persistent().remove(&key);
    }

    /// Get market configuration for an RWA token
    pub fn get_market_config(env: &Env, rwa_token: &Address) -> Option<MarketConfig> {
        env.storage().persistent().get(rwa_token)
    }

    /// Set market configuration
    pub fn set_market_config(env: &Env, rwa_token: &Address, config: &MarketConfig) {
        env.storage().persistent().set(rwa_token, config);
    }

    /// Get current price for an RWA token from oracle
    /// This is a placeholder - in production, this would call the oracle contract
    pub fn get_current_price(env: &Env, rwa_token: &Address) -> Option<i128> {
        let key = (PRICE_KEY, rwa_token.clone());
        env.storage().persistent().get(&key)
    }

    /// Set current price (for testing purposes)
    pub fn set_current_price(env: &Env, rwa_token: &Address, price: i128) {
        let key = (PRICE_KEY, rwa_token.clone());
        env.storage().persistent().set(&key, &price);
    }

    /// Get margin token address
    pub fn get_margin_token(env: &Env) -> Option<Address> {
        let key = symbol_short!("mrg_token");
        env.storage().instance().get(&key)
    }

    /// Set margin token address (admin only)
    pub fn set_margin_token(env: &Env, token: &Address) {
        let key = symbol_short!("mrg_token");
        env.storage().instance().set(&key, token);
    }
}
