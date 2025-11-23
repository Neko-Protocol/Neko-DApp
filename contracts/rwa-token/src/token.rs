use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, MuxedAddress, String, Symbol, panic_with_error};

use crate::admin::Admin;
use crate::error::Error;
use crate::interfaces::{TokenInterface, TokenInterfaceImpl};
use crate::oracle::Oracle;

/// RWA Token Contract
#[contract]
pub struct RWATokenContract;

#[contractimpl]
impl RWATokenContract {
    /// Constructor for RWA Token
    ///
    /// # Arguments
    /// * `admin` - Admin address with mint/burn permissions
    /// * `asset_contract` - RWA Oracle contract ID for price feed
    /// * `pegged_asset` - Symbol of the RWA asset in the oracle (e.g., "NVDA", "TSLA")
    /// * `name` - Full name of the token
    /// * `symbol` - Token symbol
    /// * `decimals` - Number of decimal places
    pub fn __constructor(
        env: Env,
        admin: Address,
        asset_contract: Address,
        pegged_asset: Symbol,
        name: String,
        symbol: String,
        decimals: u32,
    ) {
        Admin::initialize(&env, &admin, &asset_contract, &pegged_asset, &name, &symbol, decimals);
    }

    /// Upgrade the contract to new wasm. Admin-only.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        Admin::upgrade(&env, new_wasm_hash);
    }

    /// Get the admin address
    pub fn admin(env: Env) -> Address {
        Admin::get_admin(&env)
    }

    /// Mint tokens to an address. Admin-only.
    pub fn mint(env: Env, to: Address, amount: i128) {
        Admin::mint(&env, &to, amount);
    }

    /// Clawback tokens from an address. Admin-only.
    pub fn clawback(env: Env, from: Address, amount: i128) {
        Admin::clawback(&env, &from, amount);
    }

    /// Set the authorization status for a specific address. Admin-only.
    pub fn set_authorized(env: Env, id: Address, authorize: bool) {
        Admin::set_authorized(&env, &id, authorize);
    }

    /// Check if a specific address is authorized
    pub fn authorized(env: Env, id: Address) -> bool {
        Admin::authorized(&env, &id)
    }

    /// Return the spendable balance of tokens for a specific address
    pub fn spendable_balance(env: Env, id: Address) -> i128 {
        TokenInterfaceImpl::balance(&env, &id)
    }

    /// Increase the allowance that one address can spend on behalf of another address.
    pub fn increase_allowance(env: Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        let current_allowance = TokenInterfaceImpl::allowance(&env, &from, &spender);
        let new_amount = current_allowance
            .checked_add(amount)
            .unwrap_or_else(|| panic_with_error!(&env, Error::ArithmeticError));
        let current_ledger = env.ledger().sequence();
        TokenInterfaceImpl::approve(&env, &from, &spender, new_amount, current_ledger + 1000);
    }

    /// Decrease the allowance that one address can spend on behalf of another address.
    pub fn decrease_allowance(env: Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        let current_allowance = TokenInterfaceImpl::allowance(&env, &from, &spender);
        let new_amount = current_allowance.checked_sub(amount).unwrap_or(0);
        let current_ledger = env.ledger().sequence();
        TokenInterfaceImpl::approve(&env, &from, &spender, new_amount, current_ledger + 1000);
    }

    // Oracle functions
    /// Get the RWA Oracle contract address
    pub fn asset_contract(env: Env) -> Address {
        Oracle::get_asset_contract(&env)
    }

    /// Get the pegged asset symbol (e.g., "NVDA", "TSLA")
    pub fn pegged_asset(env: Env) -> Symbol {
        Oracle::get_pegged_asset(&env)
    }

    /// Get the current price of this RWA token from the RWA Oracle
    /// Returns the price in the oracle's base asset (typically USDC)
    pub fn get_price(env: Env) -> Result<crate::rwa_oracle::PriceData, Error> {
        Oracle::get_price(&env)
    }

    /// Get the price of this RWA token at a specific timestamp
    pub fn get_price_at(env: Env, timestamp: u64) -> Result<crate::rwa_oracle::PriceData, Error> {
        Oracle::get_price_at(&env, timestamp)
    }

    /// Get the number of decimals used by the oracle for price reporting
    pub fn oracle_decimals(env: Env) -> Result<u32, Error> {
        Oracle::get_decimals(&env)
    }

    // SEP-0001: Get RWA metadata from Oracle
    /// Get complete RWA metadata from the RWA Oracle (SEP-0001)
    pub fn get_rwa_metadata(env: Env) -> Result<crate::rwa_oracle::RWAMetadata, Error> {
        Oracle::get_rwa_metadata(&env)
    }

    /// Get the asset type of this RWA token (SEP-0001)
    pub fn get_asset_type(env: Env) -> Result<crate::rwa_oracle::RWAAssetType, Error> {
        Oracle::get_asset_type(&env)
    }

    // SEP-0008: Compliance checking
    /// Check if this RWA token is regulated (SEP-0008)
    pub fn is_regulated(env: Env) -> Result<bool, Error> {
        Oracle::is_regulated(&env)
    }

    /// Get regulatory information for this RWA token (SEP-0008)
    pub fn get_regulatory_info(env: Env) -> Result<crate::rwa_oracle::RegulatoryInfo, Error> {
        Oracle::get_regulatory_info(&env)
    }
}

// Standard Token Interface implementation
#[contractimpl]
impl TokenInterface for RWATokenContract {
    fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        TokenInterfaceImpl::allowance(&env, &from, &spender)
    }

    fn approve(
        env: Env,
        from: Address,
        spender: Address,
        amount: i128,
        live_until_ledger: u32,
    ) {
        TokenInterfaceImpl::approve(&env, &from, &spender, amount, live_until_ledger);
    }

    fn balance(env: Env, id: Address) -> i128 {
        TokenInterfaceImpl::balance(&env, &id)
    }

    fn transfer(env: Env, from: Address, to: MuxedAddress, amount: i128) {
        // Check compliance (SEP-0008)
        Oracle::check_compliance_before_transfer(&env, &from, &to.address(), amount)
            .unwrap_or_else(|e| panic_with_error!(&env, e));

        TokenInterfaceImpl::transfer(&env, &from, &to.address(), amount);
    }

    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        // Check compliance (SEP-0008)
        Oracle::check_compliance_before_transfer(&env, &from, &to, amount)
            .unwrap_or_else(|e| panic_with_error!(&env, e));

        TokenInterfaceImpl::transfer_from(&env, &spender, &from, &to, amount);
    }

    fn burn(env: Env, from: Address, amount: i128) {
        TokenInterfaceImpl::burn(&env, &from, amount);
    }

    fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        TokenInterfaceImpl::burn_from(&env, &spender, &from, amount);
    }

    fn decimals(env: Env) -> u32 {
        TokenInterfaceImpl::decimals(&env)
    }

    fn name(env: Env) -> String {
        TokenInterfaceImpl::name(&env)
    }

    fn symbol(env: Env) -> String {
        TokenInterfaceImpl::symbol(&env)
    }
}