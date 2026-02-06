use soroban_sdk::{Address, Env, Map, Symbol, Vec, panic_with_error};

use crate::common::error::Error;
use crate::common::types::{
    ADMIN_KEY, AuctionData, BackstopDeposit, CDP, INSTANCE_BUMP, INSTANCE_TTL, InterestRateParams,
    PoolState, ReserveData, STORAGE, USER_BUMP, USER_TTL, WithdrawalRequest,
};

/// Main pool storage structure
#[derive(Clone)]
#[soroban_sdk::contracttype]
pub struct PoolStorage {
    // Pool state
    pub pool_state: PoolState,
    pub pool_balances: Map<Symbol, i128>, // USDC, XLM, etc.

    // Reserve data - Contains b_rate, d_rate, ir_mod, supplies
    pub reserve_data: Map<Symbol, ReserveData>,

    // Lending (bTokens) - User balances
    pub b_token_balances: Map<Address, Map<Symbol, i128>>, // bTokens per lender

    // Borrowing (dTokens) - User balances (single asset per borrower)
    pub d_token_balances: Map<Address, Map<Symbol, i128>>, // dTokens per borrower

    // Collateral
    pub collateral: Map<Address, Map<Address, i128>>, // RWA tokens per borrower

    // Interest Rate Parameters
    pub interest_rate_params: Map<Symbol, InterestRateParams>,

    // Auctions (unified structure for all auction types)
    pub auction_data: Map<u32, AuctionData>,

    // Backstop
    pub backstop_deposits: Map<Address, BackstopDeposit>,
    pub backstop_total: i128,
    pub backstop_threshold: i128,
    pub backstop_take_rate: u32, // In 7 decimals (SCALAR_7), e.g., 500_000 = 5%
    pub withdrawal_queue: Vec<WithdrawalRequest>,
    pub backstop_token: Option<Address>, // Token contract for backstop deposits

    // Oracles
    pub rwa_oracle: Address,
    pub reflector_oracle: Address,

    // Admin
    pub admin: Address,
    pub collateral_factors: Map<Address, u32>, // Collateral factor per RWA token (7 decimals)

    // Token contracts mapping: Symbol -> Address
    pub token_contracts: Map<Symbol, Address>,
}

/// Storage operations for the lending pool
pub struct Storage;

impl Storage {
    // ========== TTL Management ==========

    /// Extend instance storage TTL if needed
    pub fn extend_instance_ttl(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_TTL, INSTANCE_BUMP);
    }

    // ========== Instance Storage Operations ==========

    /// Get the pool storage
    pub fn get(env: &Env) -> PoolStorage {
        Self::extend_instance_ttl(env);
        env.storage()
            .instance()
            .get(&STORAGE)
            .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
    }

    /// Set the pool storage
    pub fn set(env: &Env, storage: &PoolStorage) {
        env.storage().instance().set(&STORAGE, storage);
        Self::extend_instance_ttl(env);
    }

    /// Check if pool is initialized
    pub fn is_initialized(env: &Env) -> bool {
        env.storage().instance().has(&STORAGE)
    }

    /// Get admin address
    pub fn get_admin(env: &Env) -> Address {
        Self::extend_instance_ttl(env);
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
        Self::extend_instance_ttl(env);
    }

    // ========== Reserve Data Operations ==========

    /// Get reserve data for an asset
    pub fn get_reserve_data(env: &Env, asset: &Symbol) -> ReserveData {
        let storage = Self::get(env);
        storage
            .reserve_data
            .get(asset.clone())
            .unwrap_or_else(|| ReserveData::new(env.ledger().timestamp()))
    }

    /// Set reserve data for an asset
    pub fn set_reserve_data(env: &Env, asset: &Symbol, data: &ReserveData) {
        let mut storage = Self::get(env);
        storage.reserve_data.set(asset.clone(), data.clone());
        Self::set(env, &storage);
    }

    // ========== CDP Operations (Persistent Storage with TTL) ==========

    /// Get CDP for a borrower
    pub fn get_cdp(env: &Env, borrower: &Address) -> Option<CDP> {
        let cdp: Option<CDP> = env.storage().persistent().get(borrower).unwrap_or(None);

        // Extend TTL if CDP exists
        if cdp.is_some() {
            env.storage()
                .persistent()
                .extend_ttl(borrower, USER_TTL, USER_BUMP);
        }

        cdp
    }

    /// Set CDP for a borrower
    pub fn set_cdp(env: &Env, borrower: &Address, cdp: &CDP) {
        env.storage().persistent().set(borrower, cdp);
        env.storage()
            .persistent()
            .extend_ttl(borrower, USER_TTL, USER_BUMP);
    }

    // ========== bToken Operations ==========

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
        storage
            .b_token_balances
            .set(lender.clone(), lender_balances);
        Self::set(env, &storage);
    }

    /// Get bTokenRate for an asset (12 decimals)
    pub fn get_b_token_rate(env: &Env, asset: &Symbol) -> i128 {
        let reserve = Self::get_reserve_data(env, asset);
        reserve.b_rate
    }

    /// Get bToken supply for an asset
    pub fn get_b_token_supply(env: &Env, asset: &Symbol) -> i128 {
        let reserve = Self::get_reserve_data(env, asset);
        reserve.b_supply
    }

    /// Set bToken supply for an asset
    pub fn set_b_token_supply(env: &Env, asset: &Symbol, supply: i128) {
        let mut reserve = Self::get_reserve_data(env, asset);
        reserve.b_supply = supply;
        Self::set_reserve_data(env, asset, &reserve);
    }

    // ========== dToken Operations ==========

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
        storage
            .d_token_balances
            .set(borrower.clone(), borrower_balances);
        Self::set(env, &storage);
    }

    /// Get dTokenRate for an asset (12 decimals)
    pub fn get_d_token_rate(env: &Env, asset: &Symbol) -> i128 {
        let reserve = Self::get_reserve_data(env, asset);
        reserve.d_rate
    }

    /// Get total dToken supply for an asset
    pub fn get_d_token_supply(env: &Env, asset: &Symbol) -> i128 {
        let reserve = Self::get_reserve_data(env, asset);
        reserve.d_supply
    }

    /// Set total dToken supply for an asset
    pub fn set_d_token_supply(env: &Env, asset: &Symbol, supply: i128) {
        let mut reserve = Self::get_reserve_data(env, asset);
        reserve.d_supply = supply;
        Self::set_reserve_data(env, asset, &reserve);
    }

    // ========== Collateral Operations ==========

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
        storage
            .collateral
            .set(borrower.clone(), borrower_collateral);
        Self::set(env, &storage);
    }

    // ========== Pool Balance Operations ==========

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

    // ========== Token Contract Operations ==========

    /// Get token contract address for an asset symbol
    pub fn get_token_contract(env: &Env, asset: &Symbol) -> Option<Address> {
        let storage = Self::get(env);
        storage.token_contracts.get(asset.clone())
    }

    /// Set token contract address for an asset symbol
    pub fn set_token_contract(env: &Env, asset: &Symbol, token_address: &Address) {
        let mut storage = Self::get(env);
        storage
            .token_contracts
            .set(asset.clone(), token_address.clone());
        Self::set(env, &storage);
    }
}
