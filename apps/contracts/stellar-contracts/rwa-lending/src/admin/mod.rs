use soroban_sdk::{panic_with_error, Address, Env, Map, Symbol, Vec};

use crate::common::error::Error;
use crate::common::storage::Storage;
use crate::common::types::{InterestRateParams, PoolState, BASIS_POINTS};

/// Administrative functions for the lending pool
pub struct Admin;

impl Admin {
    /// Initialize the lending pool
    pub fn initialize(
        env: &Env,
        admin: &Address,
        rwa_oracle: &Address,
        reflector_oracle: &Address,
        backstop_threshold: i128,
        backstop_take_rate: u32,
    ) {
        if Storage::is_initialized(env) {
            panic_with_error!(env, Error::AlreadyInitialized);
        }

        Storage::set_admin(env, admin);

        // Initialize pool storage with default values
        let storage = crate::common::storage::PoolStorage {
            pool_state: PoolState::OnIce, // Pools start on ice
            pool_balances: Map::new(env),
            b_token_rates: Map::new(env),
            b_token_supply: Map::new(env),
            b_token_balances: Map::new(env),
            d_token_rates: Map::new(env),
            d_token_supply: Map::new(env),
            d_token_balances: Map::new(env),
            collateral: Map::new(env),
            interest_rate_params: Map::new(env),
            rate_modifiers: Map::new(env),
            last_accrual_time: Map::new(env),
            backstop_credit: Map::new(env),
            auctions: Map::new(env),
            backstop_deposits: Map::new(env),
            backstop_total: 0,
            backstop_threshold,
            backstop_take_rate,
            withdrawal_queue: Vec::new(env),
            backstop_token: None,
            rwa_oracle: rwa_oracle.clone(),
            reflector_oracle: reflector_oracle.clone(),
            admin: admin.clone(),
            collateral_factors: Map::new(env),
            token_contracts: Map::new(env),
        };

        Storage::set(env, &storage);
    }

    /// Get the admin address
    pub fn get_admin(env: &Env) -> Address {
        Storage::get_admin(env)
    }

    /// Require admin authorization
    pub fn require_admin(env: &Env) {
        let admin = Self::get_admin(env);
        admin.require_auth();
    }

    /// Set collateral factor for an RWA token
    pub fn set_collateral_factor(env: &Env, rwa_token: &Address, factor: u32) {
        Self::require_admin(env);

        // Validate factor is within [0, 10000] (0% to 100%)
        if factor > BASIS_POINTS as u32 {
            panic_with_error!(env, Error::InvalidCollateralFactor);
        }

        let mut storage = Storage::get(env);
        storage.collateral_factors.set(rwa_token.clone(), factor);
        Storage::set(env, &storage);
    }

    /// Get collateral factor for an RWA token
    pub fn get_collateral_factor(env: &Env, rwa_token: &Address) -> u32 {
        let storage = Storage::get(env);
        storage
            .collateral_factors
            .get(rwa_token.clone())
            .unwrap_or(7500) // Default: 75%
    }

    /// Set interest rate parameters for an asset
    pub fn set_interest_rate_params(
        env: &Env,
        asset: &Symbol,
        params: &InterestRateParams,
    ) {
        Self::require_admin(env);

        // Validate parameters
        if params.target_utilization > 9500 {
            // Max 95%
            panic_with_error!(env, Error::InvalidInterestRateParams);
        }

        let mut storage = Storage::get(env);
        storage.interest_rate_params.set(asset.clone(), params.clone());
        Storage::set(env, &storage);
    }

    /// Set pool state
    pub fn set_pool_state(env: &Env, state: PoolState) {
        Self::require_admin(env);

        let mut storage = Storage::get(env);
        storage.pool_state = state;
        Storage::set(env, &storage);
    }

    /// Get pool state
    pub fn get_pool_state(env: &Env) -> PoolState {
        let storage = Storage::get(env);
        storage.pool_state
    }

    /// Set backstop threshold
    pub fn set_backstop_threshold(env: &Env, threshold: i128) {
        Self::require_admin(env);

        let mut storage = Storage::get(env);
        storage.backstop_threshold = threshold;
        Storage::set(env, &storage);
    }

    /// Set backstop take rate
    pub fn set_backstop_take_rate(env: &Env, take_rate: u32) {
        Self::require_admin(env);

        if take_rate > BASIS_POINTS as u32 {
            panic_with_error!(env, Error::InvalidInterestRateParams);
        }

        let mut storage = Storage::get(env);
        storage.backstop_take_rate = take_rate;
        Storage::set(env, &storage);
    }

    /// Set token contract address for an asset symbol
    pub fn set_token_contract(env: &Env, asset: &Symbol, token_address: &Address) {
        Self::require_admin(env);
        Storage::set_token_contract(env, asset, token_address);
    }

    /// Set backstop token contract address
    pub fn set_backstop_token(env: &Env, token_address: &Address) {
        Self::require_admin(env);
        let mut storage = Storage::get(env);
        storage.backstop_token = Some(token_address.clone());
        Storage::set(env, &storage);
    }

    /// Upgrade the contract to a new WASM hash
    /// Only the admin can call this function
    pub fn upgrade(env: &Env, new_wasm_hash: &soroban_sdk::BytesN<32>) {
        Self::require_admin(env);
        env.deployer().update_current_contract_wasm(new_wasm_hash.clone());
    }
}

