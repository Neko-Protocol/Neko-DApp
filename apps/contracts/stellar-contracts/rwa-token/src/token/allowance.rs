use soroban_sdk::{Address, Env, panic_with_error};

use crate::common::error::Error;
use crate::common::types::{Allowance, DataKey, Txn};

/// Allowance storage operations
pub struct AllowanceStorage;

impl AllowanceStorage {
    pub fn get(env: &Env, from: &Address, spender: &Address) -> Allowance {
        let key = DataKey::Allowance(Txn(from.clone(), spender.clone()));
        env.storage().persistent().get(&key).unwrap_or(Allowance {
            amount: 0,
            live_until_ledger: 0,
        })
    }

    pub fn set(env: &Env, from: &Address, spender: &Address, amount: i128, live_until_ledger: u32) {
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
        Self::set(
            env,
            from,
            spender,
            allowance.amount,
            allowance.live_until_ledger,
        );
    }

    pub fn is_valid(env: &Env, allowance: &Allowance) -> bool {
        let current_ledger = env.ledger().sequence();
        allowance.live_until_ledger >= current_ledger || allowance.live_until_ledger == 0
    }
}
