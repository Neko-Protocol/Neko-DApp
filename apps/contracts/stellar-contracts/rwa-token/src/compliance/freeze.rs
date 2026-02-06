use soroban_sdk::{Address, Env, panic_with_error};

use crate::common::error::Error;
use crate::common::types::DataKey;

/// Authorization storage operations (freeze/unfreeze)
pub struct AuthorizationStorage;

impl AuthorizationStorage {
    pub fn get(env: &Env, id: &Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Authorized(id.clone()))
            .unwrap_or_default()
    }

    pub fn set(env: &Env, id: &Address, authorize: bool) {
        let key = DataKey::Authorized(id.clone());
        env.storage().persistent().set(&key, &authorize);
        let ttl = env.storage().max_ttl();
        env.storage().persistent().extend_ttl(&key, ttl, ttl);
    }

    /// Panic if the address is not authorized (frozen)
    pub fn require_authorized(env: &Env, addr: &Address) {
        if !Self::get(env, addr) {
            panic_with_error!(env, Error::AddressFrozen);
        }
    }
}
