use soroban_sdk::{panic_with_error, Address, Env};

use crate::common::error::Error;
use crate::common::events::Events;
use crate::common::storage::Storage;
use crate::common::types::{BASIS_POINTS, MarketConfig, PerpsStorage};

/// Administrative functions for the perpetuals contract
pub struct Admin;

impl Admin {
    /// Initialize the perpetuals contract
    ///
    /// Sets up the contract with admin address, oracle address, and default parameters.
    /// Can only be called once.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `admin` - Admin address with privileged access
    /// * `oracle` - Oracle contract address for price feeds
    /// * `protocol_fee_rate` - Protocol fee in basis points (e.g., 10 = 0.1%)
    /// * `liquidation_fee_rate` - Liquidation fee in basis points (e.g., 500 = 5%)
    pub fn initialize(
        env: &Env,
        admin: &Address,
        oracle: &Address,
        protocol_fee_rate: u32,
        liquidation_fee_rate: u32,
    ) {
        // Check if already initialized
        if Storage::is_initialized(env) {
            panic_with_error!(env, Error::AlreadyInitialized);
        }

        // Validate fee rates (max 100%)
        if protocol_fee_rate > BASIS_POINTS as u32 || liquidation_fee_rate > BASIS_POINTS as u32 {
            panic_with_error!(env, Error::InvalidInput);
        }

        // Set admin separately for quick access
        Storage::set_admin(env, admin);

        // Initialize main storage
        let storage = PerpsStorage {
            admin: admin.clone(),
            oracle: oracle.clone(),
            protocol_paused: false,
            protocol_fee_rate,
            liquidation_fee_rate,
        };

        Storage::set(env, &storage);

        // Emit initialization event
        Events::contract_initialized(env, admin, oracle);
    }

    /// Get the admin address
    pub fn get_admin(env: &Env) -> Address {
        Storage::get_admin(env)
    }

    /// Require admin authorization
    ///
    /// Panics with Unauthorized error if caller is not admin
    pub fn require_admin(env: &Env) {
        let admin = Self::get_admin(env);
        admin.require_auth();
    }

    /// Get the oracle address
    pub fn get_oracle(env: &Env) -> Address {
        Storage::get_oracle(env)
    }

    /// Set oracle address (admin only)
    ///
    /// Allows updating the oracle contract address if needed
    pub fn set_oracle(env: &Env, oracle: &Address) {
        Self::require_admin(env);

        let old_oracle = Storage::get_oracle(env);
        Storage::set_oracle(env, oracle);

        Events::oracle_updated(env, &old_oracle, oracle);
    }

    /// Set protocol pause state (admin only)
    ///
    /// When paused, no new positions can be opened
    pub fn set_protocol_paused(env: &Env, paused: bool) {
        Self::require_admin(env);

        let mut storage = Storage::get(env);
        storage.protocol_paused = paused;
        Storage::set(env, &storage);

        Events::protocol_paused_updated(env, paused);
    }

    /// Get protocol pause state
    pub fn is_protocol_paused(env: &Env) -> bool {
        let storage = Storage::get(env);
        storage.protocol_paused
    }

    /// Set protocol fee rate (admin only)
    ///
    /// # Arguments
    /// * `fee_rate` - Fee in basis points (max 10000 = 100%)
    pub fn set_protocol_fee_rate(env: &Env, fee_rate: u32) {
        Self::require_admin(env);

        if fee_rate > BASIS_POINTS as u32 {
            panic_with_error!(env, Error::InvalidInput);
        }

        let mut storage = Storage::get(env);
        storage.protocol_fee_rate = fee_rate;
        Storage::set(env, &storage);
    }

    /// Set liquidation fee rate (admin only)
    ///
    /// # Arguments
    /// * `fee_rate` - Fee in basis points (max 10000 = 100%)
    pub fn set_liquidation_fee_rate(env: &Env, fee_rate: u32) {
        Self::require_admin(env);

        if fee_rate > BASIS_POINTS as u32 {
            panic_with_error!(env, Error::InvalidInput);
        }

        let mut storage = Storage::get(env);
        storage.liquidation_fee_rate = fee_rate;
        Storage::set(env, &storage);
    }

    /// Update market configuration (admin only)
    ///
    /// Allows admin to update market parameters for an RWA token
    pub fn set_market_config(env: &Env, rwa_token: &Address, config: &MarketConfig) {
        Self::require_admin(env);

        // Validate config parameters
        if config.max_leverage == 0 || config.max_leverage > 10000 {
            panic_with_error!(env, Error::InvalidInput);
        }
        if config.maintenance_margin > BASIS_POINTS as u32 {
            panic_with_error!(env, Error::InvalidInput);
        }

        Storage::set_market_config(env, rwa_token, config);

        Events::market_config_updated(
            env,
            rwa_token,
            config.max_leverage,
            config.maintenance_margin,
        );
    }

    /// Upgrade the contract to a new WASM hash (admin only)
    ///
    /// # Arguments
    /// * `new_wasm_hash` - Hash of the new WASM bytecode
    pub fn upgrade(env: &Env, new_wasm_hash: &soroban_sdk::BytesN<32>) {
        Self::require_admin(env);
        env.deployer()
            .update_current_contract_wasm(new_wasm_hash.clone());
    }

    /// Set margin token address (admin only)
    ///
    /// Sets the token contract address used for margin deposits/withdrawals.
    /// This token is typically a stablecoin like USDC.
    ///
    /// # Arguments
    /// * `token` - Token contract address to use for margin
    pub fn set_margin_token(env: &Env, token: &Address) {
        Self::require_admin(env);
        Storage::set_margin_token(env, token);
        Events::margin_token_set(env, token);
    }
}
