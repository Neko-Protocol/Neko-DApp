use soroban_sdk::{assert_with_error, panic_with_error, Address, Env, MuxedAddress};

use crate::error::Error;
use crate::events::Events;
use crate::storage::{AllowanceStorage, BalanceStorage, MetadataStorage};

/// TokenInterface trait definition according to SEP-0041
#[allow(clippy::module_name_repetitions)]
pub trait TokenInterface {
    fn allowance(env: Env, from: Address, spender: Address) -> i128;
    fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        live_until_ledger: u32,
    );
    fn balance(env: Env, id: Address) -> i128;
    fn transfer(env: Env, from: Address, to: MuxedAddress, amount: i128);
    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128);
    fn burn(env: Env, from: Address, amount: i128);
    fn burn_from(env: Env, spender: Address, from: Address, amount: i128);
    fn decimals(env: Env) -> u32;
    fn name(env: Env) -> soroban_sdk::String;
    fn symbol(env: Env) -> soroban_sdk::String;
}

/// TokenInterface implementation
pub struct TokenInterfaceImpl;

impl TokenInterfaceImpl {
    pub fn allowance(env: &Env, from: &Address, spender: &Address) -> i128 {
        let allowance = AllowanceStorage::get(env, from, spender);
        if !AllowanceStorage::is_valid(env, &allowance) {
            return 0;
        }
        allowance.amount
    }

    pub fn approve(
        env: &Env,
        from: &Address,
        spender: &Address,
        amount: i128,
        live_until_ledger: u32,
    ) {
        from.require_auth();

        let current_ledger = env.ledger().sequence();
        assert_with_error!(env, amount >= 0, Error::ValueNotPositive);
        assert_with_error!(
            env,
            live_until_ledger >= current_ledger || amount == 0,
            Error::InvalidLedgerSequence
        );

        AllowanceStorage::set(env, from, spender, amount, live_until_ledger);
        Events::approve(env, from, spender, amount, live_until_ledger);
    }

    pub fn balance(env: &Env, id: &Address) -> i128 {
        BalanceStorage::get(env, id)
    }

    pub fn transfer(env: &Env, from: &Address, to: &Address, amount: i128) {
        from.require_auth();
        assert_with_error!(env, amount > 0, Error::ValueNotPositive);
        assert_with_error!(
            env,
            to != from,
            Error::CannotTransferToSelf
        );

        // Check balance
        let balance = BalanceStorage::get(env, from);
        assert_with_error!(env, balance >= amount, Error::InsufficientBalance);

        // Update balances
        BalanceStorage::subtract(env, from, amount);
        BalanceStorage::add(env, to, amount);

        // Emit transfer event
        Events::transfer(env, from, to, amount);
    }

    pub fn transfer_from(
        env: &Env,
        spender: &Address,
        from: &Address,
        to: &Address,
        amount: i128,
    ) {
        spender.require_auth();
        assert_with_error!(env, amount > 0, Error::ValueNotPositive);

        // Check and consume allowance
        let allowance = AllowanceStorage::get(env, from, spender);
        if !AllowanceStorage::is_valid(env, &allowance) {
            panic_with_error!(env, Error::InsufficientAllowance);
        }
        if allowance.amount < amount {
            panic_with_error!(env, Error::InsufficientAllowance);
        }
        AllowanceStorage::subtract(env, from, spender, amount);

        // Check balance
        let balance = BalanceStorage::get(env, from);
        assert_with_error!(env, balance >= amount, Error::InsufficientBalance);

        // Update balances
        BalanceStorage::subtract(env, from, amount);
        BalanceStorage::add(env, to, amount);

        // Emit transfer event
        Events::transfer(env, from, to, amount);
    }

    pub fn burn(env: &Env, from: &Address, amount: i128) {
        from.require_auth();
        assert_with_error!(env, amount > 0, Error::ValueNotPositive);

        BalanceStorage::subtract(env, from, amount);
        Events::burn(env, from, amount);
    }

    pub fn burn_from(env: &Env, spender: &Address, from: &Address, amount: i128) {
        spender.require_auth();
        assert_with_error!(env, amount > 0, Error::ValueNotPositive);

        // Check and consume allowance
        let allowance = AllowanceStorage::get(env, from, spender);
        if !AllowanceStorage::is_valid(env, &allowance) {
            panic_with_error!(env, Error::InsufficientAllowance);
        }
        if allowance.amount < amount {
            panic_with_error!(env, Error::InsufficientAllowance);
        }
        AllowanceStorage::subtract(env, from, spender, amount);

        BalanceStorage::subtract(env, from, amount);
        Events::burn(env, from, amount);
    }

    pub fn decimals(env: &Env) -> u32 {
        MetadataStorage::get_decimals(env)
    }

    pub fn name(env: &Env) -> soroban_sdk::String {
        MetadataStorage::get_name(env)
    }

    pub fn symbol(env: &Env) -> soroban_sdk::String {
        MetadataStorage::get_symbol(env)
    }
}

