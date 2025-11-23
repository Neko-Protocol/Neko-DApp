use soroban_sdk::{panic_with_error, Address, Env, String};

use crate::error::Error;
use crate::types::{Allowance, DataKey, Txn, TokenStorage, STORAGE, ADMIN_KEY};

/// Metadata storage operations
pub struct MetadataStorage;

impl MetadataStorage {
    pub fn get_admin(env: &Env) -> Option<Address> {
        env.storage().instance().get(&ADMIN_KEY)
    }

    pub fn set_admin(env: &Env, admin: &Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("admin already set");
        }
        env.storage().instance().set(&ADMIN_KEY, admin);
    }

    pub fn get_token(env: &Env) -> TokenStorage {
        env.storage()
            .instance()
            .get(&STORAGE)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }

    pub fn set_token(env: &Env, storage: &TokenStorage) {
        env.storage().instance().set(&STORAGE, storage);
    }

    pub fn is_initialized(env: &Env) -> bool {
        env.storage().instance().has(&STORAGE)
    }

    // Convenience getters
    pub fn get_name(env: &Env) -> String {
        Self::get_token(env).name
    }

    pub fn get_symbol(env: &Env) -> String {
        Self::get_token(env).symbol
    }

    pub fn get_decimals(env: &Env) -> u32 {
        Self::get_token(env).decimals
    }

    pub fn get_asset_contract(env: &Env) -> Address {
        Self::get_token(env).asset_contract
    }

    pub fn get_pegged_asset(env: &Env) -> soroban_sdk::Symbol {
        Self::get_token(env).pegged_asset
    }
}

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

/// Allowance storage operations
pub struct AllowanceStorage;

impl AllowanceStorage {
    pub fn get(env: &Env, from: &Address, spender: &Address) -> Allowance {
        let key = DataKey::Allowance(Txn(from.clone(), spender.clone()));
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(Allowance {
                amount: 0,
                live_until_ledger: 0,
            })
    }

    pub fn set(
        env: &Env,
        from: &Address,
        spender: &Address,
        amount: i128,
        live_until_ledger: u32,
    ) {
        let key = DataKey::Allowance(Txn(from.clone(), spender.clone()));
        let allowance = Allowance {
            amount,
            live_until_ledger,
        };
        env.storage().persistent().set(&key, &allowance);
        let ttl = env.storage().max_ttl();
        env.storage().persistent().extend_ttl(&key, ttl, ttl);
    }

    pub fn subtract(env: &Env, from: &Address, spender: &Address, amount: i128) {
        let mut allowance = Self::get(env, from, spender);
        if allowance.amount < amount {
            panic_with_error!(env, Error::InsufficientAllowance);
        }
        allowance.amount = allowance
            .amount
            .checked_sub(amount)
            .unwrap_or_else(|| panic_with_error!(env, Error::ArithmeticError));
        Self::set(env, from, spender, allowance.amount, allowance.live_until_ledger);
    }

    pub fn is_valid(env: &Env, allowance: &Allowance) -> bool {
        let current_ledger = env.ledger().sequence();
        allowance.live_until_ledger >= current_ledger || allowance.live_until_ledger == 0
    }
}

/// Authorization storage operations
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
}
