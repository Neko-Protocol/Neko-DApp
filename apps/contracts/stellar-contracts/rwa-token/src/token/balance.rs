use soroban_sdk::{panic_with_error, Address, Env};

use crate::common::error::Error;
use crate::common::types::DataKey;

/// Balance storage operations
pub struct BalanceStorage;

impl BalanceStorage {
    pub fn get(env: &Env, id: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(id.clone()))
            .unwrap_or(0)
    }

    pub fn set(env: &Env, id: &Address, amount: i128) {
        let key = DataKey::Balance(id.clone());
        env.storage().persistent().set(&key, &amount);
        let ttl = env.storage().max_ttl();
        env.storage().persistent().extend_ttl(&key, ttl, ttl);
    }

    pub fn add(env: &Env, id: &Address, amount: i128) {
        let balance = Self::get(env, id);
        let new_balance = balance
            .checked_add(amount)
            .unwrap_or_else(|| panic_with_error!(env, Error::ArithmeticError));
        Self::set(env, id, new_balance);
    }

    pub fn subtract(env: &Env, id: &Address, amount: i128) {
        let balance = Self::get(env, id);
        if balance < amount {
            panic_with_error!(env, Error::InsufficientBalance);
        }
        let new_balance = balance
            .checked_sub(amount)
            .unwrap_or_else(|| panic_with_error!(env, Error::ArithmeticError));
        Self::set(env, id, new_balance);
    }
}
