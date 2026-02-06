use soroban_sdk::{Address, BytesN, Env};

use crate::common::storage::RWAOracleStorage;
use crate::common::types::{ADMIN_KEY, INSTANCE_BUMP_AMOUNT, INSTANCE_LIFETIME_THRESHOLD};

/// Administrative functions for the oracle contract
pub struct Admin;

impl Admin {
    /// Get the admin address
    pub fn get_admin(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Admin must be set")
    }

    /// Set the admin address (used in constructor)
    pub fn set_admin(env: &Env, admin: &Address) {
        env.storage().instance().set(&ADMIN_KEY, admin);
    }

    /// Require admin authorization
    pub fn require_admin(env: &Env) {
        let admin = Self::get_admin(env);
        admin.require_auth();
    }

    /// Upgrade the contract to new wasm
    pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
        Self::require_admin(env);
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    /// Set the maximum acceptable age (in seconds) for price data
    pub fn set_max_staleness(env: &Env, max_seconds: u64) {
        Self::require_admin(env);
        let mut state = RWAOracleStorage::get(env);
        state.max_staleness = max_seconds;
        RWAOracleStorage::set(env, &state);
        Self::extend_instance_ttl(env);
    }

    /// Extend instance TTL
    pub fn extend_instance_ttl(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }
}
