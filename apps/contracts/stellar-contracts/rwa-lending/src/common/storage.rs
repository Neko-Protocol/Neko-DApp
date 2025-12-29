use soroban_sdk::{panic_with_error, Address, Env, Map, Symbol, Vec};

use crate::common::error::Error;
use crate::common::types::{
    BackstopDeposit, CDP, DutchAuction, InterestRateParams, PoolState, WithdrawalRequest,
    ADMIN_KEY, STORAGE,
};

/// Main pool storage structure
#[derive(Clone)]
#[soroban_sdk::contracttype]
pub struct PoolStorage {
    // Pool state
    pub pool_state: PoolState,
    pub pool_balances: Map<Symbol, i128>, // USDC, XLM, etc.

    // Lending (bTokens)
    pub b_token_rates: Map<Symbol, i128>,           // bTokenRate for each asset
    pub b_token_supply: Map<Symbol, i128>,          // Total bTokens minted per asset
    pub b_token_balances: Map<Address, Map<Symbol, i128>>, // bTokens per lender

    // Borrowing (dTokens) - Single asset per borrower
    pub d_token_rates: Map<Symbol, i128>,           // dTokenRate for each asset
    pub d_token_supply: Map<Symbol, i128>,          // Total dTokens minted per asset
    pub d_token_balances: Map<Address, Map<Symbol, i128>>, // dTokens per borrower (only one active)

    // Collateral
    pub collateral: Map<Address, Map<Address, i128>>, // RWA tokens per borrower

    // Interest Rates
    pub interest_rate_params: Map<Symbol, InterestRateParams>,
    pub rate_modifiers: Map<Symbol, i128>, // Rate Modifier (RM) for each asset
    pub last_accrual_time: Map<Symbol, u64>,
    pub backstop_credit: Map<Symbol, i128>, // Backstop credit per asset (amount owed to backstop)

    // Liquidations
    pub auctions: Map<Address, DutchAuction>, // Active auctions

    // Backstop
    pub backstop_deposits: Map<Address, BackstopDeposit>,
    pub backstop_total: i128,
    pub backstop_threshold: i128,
    pub backstop_take_rate: u32, // In basis points
    pub withdrawal_queue: Vec<WithdrawalRequest>,
    pub backstop_token: Option<Address>, // Token contract for backstop deposits (LP token etc.)

    // Oracles
    pub rwa_oracle: Address,
    pub reflector_oracle: Address,

    // Admin
    pub admin: Address,
    pub collateral_factors: Map<Address, u32>, // Collateral factor per RWA token (in basis points)
    
    // Token contracts mapping: Symbol -> Address (for crypto assets like USDC, XLM, etc.)
    pub token_contracts: Map<Symbol, Address>, // Token contract address for each asset symbol
}

/// Storage operations for the lending pool
pub struct Storage;

impl Storage {
    /// Get the pool storage
    pub fn get(env: &Env) -> PoolStorage {
        env.storage()
            .instance()
            .get(&STORAGE)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }

    /// Set the pool storage
    pub fn set(env: &Env, storage: &PoolStorage) {
        env.storage().instance().set(&STORAGE, storage);
    }

    /// Check if pool is initialized
    pub fn is_initialized(env: &Env) -> bool {
        env.storage().instance().has(&STORAGE)
    }

    /// Get admin address
    pub fn get_admin(env: &Env) -> Address {
        env.storage()
            .instance()
            .get(&ADMIN_KEY)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }

    /// Set admin address
    pub fn set_admin(env: &Env, admin: &Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic_with_error!(env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN_KEY, admin);
    }

    /// Get CDP for a borrower
    pub fn get_cdp(env: &Env, borrower: &Address) -> Option<CDP> {
        // CDPs are stored in a Map<Address, CDP> in persistent storage
        // Use the borrower address directly as the key
        env.storage()
            .persistent()
            .get(borrower)
            .unwrap_or(None)
    }

    /// Set CDP for a borrower
    pub fn set_cdp(env: &Env, borrower: &Address, cdp: &CDP) {
        env.storage().persistent().set(borrower, cdp);
    }

    /// Get bToken balance for a lender
    pub fn get_b_token_balance(env: &Env, lender: &Address, asset: &Symbol) -> i128 {
        let storage = Self::get(env);
        storage
            .b_token_balances
            .get(lender.clone())
            .unwrap_or(Map::new(env))
            .get(asset.clone())
            .unwrap_or(0)
    }

    /// Set bToken balance for a lender
    pub fn set_b_token_balance(env: &Env, lender: &Address, asset: &Symbol, amount: i128) {
        let mut storage = Self::get(env);
        let mut lender_balances = storage
            .b_token_balances
            .get(lender.clone())
            .unwrap_or(Map::new(env));
        lender_balances.set(asset.clone(), amount);
        storage.b_token_balances.set(lender.clone(), lender_balances);
        Self::set(env, &storage);
    }

    /// Get dToken balance for a borrower
    pub fn get_d_token_balance(env: &Env, borrower: &Address, asset: &Symbol) -> i128 {
        let storage = Self::get(env);
        storage
            .d_token_balances
            .get(borrower.clone())
            .unwrap_or(Map::new(env))
            .get(asset.clone())
            .unwrap_or(0)
    }

    /// Set dToken balance for a borrower
    pub fn set_d_token_balance(env: &Env, borrower: &Address, asset: &Symbol, amount: i128) {
        let mut storage = Self::get(env);
        let mut borrower_balances = storage
            .d_token_balances
            .get(borrower.clone())
            .unwrap_or(Map::new(env));
        borrower_balances.set(asset.clone(), amount);
        storage.d_token_balances.set(borrower.clone(), borrower_balances);
        Self::set(env, &storage);
    }

    /// Get total dToken supply for an asset
    pub fn get_d_token_supply(env: &Env, asset: &Symbol) -> i128 {
        let storage = Self::get(env);
        storage.d_token_supply.get(asset.clone()).unwrap_or(0)
    }

    /// Set total dToken supply for an asset
    pub fn set_d_token_supply(env: &Env, asset: &Symbol, supply: i128) {
        let mut storage = Self::get(env);
        storage.d_token_supply.set(asset.clone(), supply);
        Self::set(env, &storage);
    }

    /// Get collateral amount for a borrower and RWA token
    pub fn get_collateral(env: &Env, borrower: &Address, rwa_token: &Address) -> i128 {
        let storage = Self::get(env);
        storage
            .collateral
            .get(borrower.clone())
            .unwrap_or(Map::new(env))
            .get(rwa_token.clone())
            .unwrap_or(0)
    }

    /// Set collateral amount for a borrower and RWA token
    pub fn set_collateral(env: &Env, borrower: &Address, rwa_token: &Address, amount: i128) {
        let mut storage = Self::get(env);
        let mut borrower_collateral = storage
            .collateral
            .get(borrower.clone())
            .unwrap_or(Map::new(env));
        borrower_collateral.set(rwa_token.clone(), amount);
        storage.collateral.set(borrower.clone(), borrower_collateral);
        Self::set(env, &storage);
    }

    /// Get pool balance for an asset
    pub fn get_pool_balance(env: &Env, asset: &Symbol) -> i128 {
        let storage = Self::get(env);
        storage.pool_balances.get(asset.clone()).unwrap_or(0)
    }

    /// Set pool balance for an asset
    pub fn set_pool_balance(env: &Env, asset: &Symbol, amount: i128) {
        let mut storage = Self::get(env);
        storage.pool_balances.set(asset.clone(), amount);
        Self::set(env, &storage);
    }

    /// Get bTokenRate for an asset
    pub fn get_b_token_rate(env: &Env, asset: &Symbol) -> i128 {
        let storage = Self::get(env);
        storage.b_token_rates.get(asset.clone()).unwrap_or(1_000_000_000) // Default: 1.0 with 9 decimals
    }

    /// Set bTokenRate for an asset
    pub fn set_b_token_rate(env: &Env, asset: &Symbol, rate: i128) {
        let mut storage = Self::get(env);
        storage.b_token_rates.set(asset.clone(), rate);
        Self::set(env, &storage);
    }

    /// Get dTokenRate for an asset
    pub fn get_d_token_rate(env: &Env, asset: &Symbol) -> i128 {
        let storage = Self::get(env);
        storage.d_token_rates.get(asset.clone()).unwrap_or(1_000_000_000) // Default: 1.0 with 9 decimals
    }

    /// Set dTokenRate for an asset
    pub fn set_d_token_rate(env: &Env, asset: &Symbol, rate: i128) {
        let mut storage = Self::get(env);
        storage.d_token_rates.set(asset.clone(), rate);
        Self::set(env, &storage);
    }

    /// Get bToken supply for an asset
    pub fn get_b_token_supply(env: &Env, asset: &Symbol) -> i128 {
        let storage = Self::get(env);
        storage.b_token_supply.get(asset.clone()).unwrap_or(0)
    }

    /// Set bToken supply for an asset
    pub fn set_b_token_supply(env: &Env, asset: &Symbol, supply: i128) {
        let mut storage = Self::get(env);
        storage.b_token_supply.set(asset.clone(), supply);
        Self::set(env, &storage);
    }

    /// Get token contract address for an asset symbol
    pub fn get_token_contract(env: &Env, asset: &Symbol) -> Option<Address> {
        let storage = Self::get(env);
        storage.token_contracts.get(asset.clone())
    }

    /// Set token contract address for an asset symbol
    pub fn set_token_contract(env: &Env, asset: &Symbol, token_address: &Address) {
        let mut storage = Self::get(env);
        storage.token_contracts.set(asset.clone(), token_address.clone());
        Self::set(env, &storage);
    }
}

