use soroban_sdk::{panic_with_error, Env};

use crate::common::error::Error;
use crate::common::types::TOTAL_SUPPLY_KEY;

/// Total supply storage operations
pub struct TotalSupplyStorage;

impl TotalSupplyStorage {
    pub fn get(env: &Env) -> i128 {
        env.storage().instance().get(&TOTAL_SUPPLY_KEY).unwrap_or(0)
    }

    pub fn add(env: &Env, amount: i128) {
        let supply = Self::get(env);
        let new_supply = supply
            .checked_add(amount)
            .unwrap_or_else(|| panic_with_error!(env, Error::ArithmeticError));
        env.storage().instance().set(&TOTAL_SUPPLY_KEY, &new_supply);
    }

    pub fn subtract(env: &Env, amount: i128) {
        let supply = Self::get(env);
        let new_supply = supply
            .checked_sub(amount)
            .unwrap_or_else(|| panic_with_error!(env, Error::ArithmeticError));
        env.storage().instance().set(&TOTAL_SUPPLY_KEY, &new_supply);
    }
}
