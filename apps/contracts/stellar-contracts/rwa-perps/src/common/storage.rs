use soroban_sdk::{Address, Env, Map, Symbol, symbol_short};
use crate::common::types::{Position, MarketConfig};

const PRICE_KEY: Symbol = symbol_short!("price");

pub struct Storage;

impl Storage {
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
}
