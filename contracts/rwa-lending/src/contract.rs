use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

use crate::admin::Admin;
use crate::common::error::Error;
use crate::common::storage::Storage;
use crate::common::types::{InterestRateParams, PoolState};
use crate::operations::backstop::Backstop;
use crate::operations::borrowing::Borrowing;
use crate::operations::collateral::Collateral;
use crate::operations::interest::Interest;
use crate::operations::lending::Lending;
use crate::operations::liquidations::Liquidations;

/// Main lending contract implementation
#[contract]
pub struct LendingContract;

#[contractimpl]
impl LendingContract {
    /// Initialize the lending pool
    pub fn initialize(
        env: Env,
        admin: Address,
        rwa_oracle: Address,
        reflector_oracle: Address,
        backstop_threshold: i128,
        backstop_take_rate: u32,
    ) {
        Admin::initialize(
            &env,
            &admin,
            &rwa_oracle,
            &reflector_oracle,
            backstop_threshold,
            backstop_take_rate,
        );
    }

    // ========== Admin Functions ==========

    /// Set collateral factor for an RWA token
    pub fn set_collateral_factor(env: Env, rwa_token: Address, factor: u32) {
        Admin::set_collateral_factor(&env, &rwa_token, factor);
    }

    /// Set interest rate parameters for an asset
    pub fn set_interest_rate_params(
        env: Env,
        asset: Symbol,
        params: InterestRateParams,
    ) {
        Admin::set_interest_rate_params(&env, &asset, &params);
    }

    /// Set pool state
    pub fn set_pool_state(env: Env, state: PoolState) {
        Admin::set_pool_state(&env, state);
    }

    /// Set backstop threshold
    pub fn set_backstop_threshold(env: Env, threshold: i128) {
        Admin::set_backstop_threshold(&env, threshold);
    }

    /// Set backstop take rate
    pub fn set_backstop_take_rate(env: Env, take_rate: u32) {
        Admin::set_backstop_take_rate(&env, take_rate);
    }

    /// Set token contract address for an asset symbol
    pub fn set_token_contract(env: Env, asset: Symbol, token_address: Address) {
        Admin::set_token_contract(&env, &asset, &token_address);
    }

    /// Set backstop token contract address
    pub fn set_backstop_token(env: Env, token_address: Address) {
        Admin::set_backstop_token(&env, &token_address);
    }

    /// Upgrade the contract to a new WASM hash
    /// Only the admin can call this function
    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        Admin::upgrade(&env, &new_wasm_hash);
    }

    // ========== Lending Functions (bTokens) ==========

    /// Deposit crypto asset to the pool
    pub fn deposit(env: Env, lender: Address, asset: Symbol, amount: i128) -> Result<i128, Error> {
        Lending::deposit(&env, &lender, &asset, amount)
    }

    /// Withdraw crypto asset from the pool
    pub fn withdraw(env: Env, lender: Address, asset: Symbol, b_tokens: i128) -> Result<i128, Error> {
        Lending::withdraw(&env, &lender, &asset, b_tokens)
    }

    /// Get bToken balance for a lender
    pub fn get_b_token_balance(env: Env, lender: Address, asset: Symbol) -> i128 {
        Lending::get_b_token_balance(&env, &lender, &asset)
    }

    /// Get bTokenRate for an asset
    pub fn get_b_token_rate(env: Env, asset: Symbol) -> i128 {
        Lending::get_b_token_rate(&env, &asset)
    }

    /// Get total bToken supply for an asset
    pub fn get_b_token_supply(env: Env, asset: Symbol) -> i128 {
        Lending::get_b_token_supply(&env, &asset)
    }

    // ========== Borrowing Functions (dTokens) ==========

    /// Borrow crypto asset from the pool
    pub fn borrow(env: Env, borrower: Address, asset: Symbol, amount: i128) -> Result<i128, Error> {
        Borrowing::borrow(&env, &borrower, &asset, amount)
    }

    /// Repay debt
    pub fn repay(env: Env, borrower: Address, asset: Symbol, d_tokens: i128) -> Result<i128, Error> {
        Borrowing::repay(&env, &borrower, &asset, d_tokens)
    }

    /// Get dToken balance for a borrower
    pub fn get_d_token_balance(env: Env, borrower: Address, asset: Symbol) -> i128 {
        Borrowing::get_d_token_balance(&env, &borrower, &asset)
    }

    /// Get dTokenRate for an asset
    pub fn get_d_token_rate(env: Env, asset: Symbol) -> i128 {
        Borrowing::get_d_token_rate(&env, &asset)
    }

    /// Calculate borrow limit for a borrower
    pub fn calculate_borrow_limit(env: Env, borrower: Address) -> Result<i128, Error> {
        Borrowing::calculate_borrow_limit(&env, &borrower)
    }

    // ========== Collateral Functions ==========

    /// Add RWA token collateral
    pub fn add_collateral(
        env: Env,
        borrower: Address,
        rwa_token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        Collateral::add_collateral(&env, &borrower, &rwa_token, amount)
    }

    /// Remove RWA token collateral
    pub fn remove_collateral(
        env: Env,
        borrower: Address,
        rwa_token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        Collateral::remove_collateral(&env, &borrower, &rwa_token, amount)
    }

    /// Get collateral amount for a borrower and RWA token
    pub fn get_collateral(env: Env, borrower: Address, rwa_token: Address) -> i128 {
        Collateral::get_collateral(&env, &borrower, &rwa_token)
    }

    // ========== Interest Functions ==========

    /// Get current interest rate for an asset
    pub fn get_interest_rate(env: Env, asset: Symbol) -> Result<i128, Error> {
        Interest::get_interest_rate(&env, &asset)
    }

    /// Accrue interest for an asset
    pub fn accrue_interest(env: Env, asset: Symbol) -> Result<(), Error> {
        Interest::accrue_interest(&env, &asset)
    }

    // ========== Liquidation Functions ==========

    /// Initiate liquidation for a borrower
    pub fn initiate_liquidation(
        env: Env,
        borrower: Address,
        rwa_token: Address,
        debt_asset: Symbol,
        liquidation_percent: u32,
    ) -> Result<Address, Error> {
        Liquidations::initiate_liquidation(&env, &borrower, &rwa_token, &debt_asset, liquidation_percent)
    }

    /// Fill a liquidation auction
    pub fn fill_auction(
        env: Env,
        auction_id: Address,
        liquidator: Address,
    ) -> Result<(), Error> {
        Liquidations::fill_auction(&env, &auction_id, &liquidator)
    }

    // ========== Backstop Functions ==========

    /// Deposit to backstop
    pub fn deposit_to_backstop(env: Env, depositor: Address, amount: i128) -> Result<(), Error> {
        Backstop::deposit(&env, &depositor, amount)
    }

    /// Withdraw from backstop
    pub fn withdraw_from_backstop(env: Env, depositor: Address, amount: i128) -> Result<(), Error> {
        Backstop::withdraw(&env, &depositor, amount)
    }

    // ========== View Functions ==========

    /// Get pool balance for an asset
    pub fn get_pool_balance(env: Env, asset: Symbol) -> i128 {
        Storage::get_pool_balance(&env, &asset)
    }

    /// Get pool state
    pub fn get_pool_state(env: Env) -> PoolState {
        Admin::get_pool_state(&env)
    }

    /// Get collateral factor for an RWA token
    pub fn get_collateral_factor(env: Env, rwa_token: Address) -> u32 {
        Admin::get_collateral_factor(&env, &rwa_token)
    }
}

