use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Vec};

use crate::admin::Admin;
use crate::common::error::Error;
use crate::common::types::{MarketConfig, Position};
use crate::operations::liquidation::Liquidations;
use crate::operations::margin::Margins;
use crate::operations::positions::Positions;

#[contract]
pub struct RWAPerpsContract;

#[contractimpl]
impl RWAPerpsContract {
    // ========== Initialization ==========

    /// Initialize the perpetuals contract
    pub fn initialize(
        env: Env,
        admin: Address,
        oracle: Address,
        protocol_fee_rate: u32,
        liquidation_fee_rate: u32,
    ) {
        Admin::initialize(&env, &admin, &oracle, protocol_fee_rate, liquidation_fee_rate);
    }

    // ========== Admin Functions ==========

    /// Get admin address
    pub fn get_admin(env: Env) -> Address {
        Admin::get_admin(&env)
    }

    /// Get oracle address
    pub fn get_oracle(env: Env) -> Address {
        Admin::get_oracle(&env)
    }

    /// Set oracle address (admin only)
    pub fn set_oracle(env: Env, oracle: Address) {
        Admin::set_oracle(&env, &oracle);
    }

    /// Set protocol paused state (admin only)
    pub fn set_protocol_paused(env: Env, paused: bool) {
        Admin::set_protocol_paused(&env, paused);
    }

    /// Check if protocol is paused
    pub fn is_protocol_paused(env: Env) -> bool {
        Admin::is_protocol_paused(&env)
    }

    /// Set protocol fee rate (admin only)
    pub fn set_protocol_fee_rate(env: Env, fee_rate: u32) {
        Admin::set_protocol_fee_rate(&env, fee_rate);
    }

    /// Set liquidation fee rate (admin only)
    pub fn set_liquidation_fee_rate(env: Env, fee_rate: u32) {
        Admin::set_liquidation_fee_rate(&env, fee_rate);
    }

    /// Set market configuration (admin only)
    pub fn set_market_config(env: Env, rwa_token: Address, config: MarketConfig) {
        Admin::set_market_config(&env, &rwa_token, &config);
    }

    /// Upgrade contract WASM (admin only)
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        Admin::upgrade(&env, &new_wasm_hash);
    }

    /// Set margin token address (admin only)
    pub fn set_margin_token(env: Env, token: Address) {
        Admin::set_margin_token(&env, &token);
    }

    // ========== Liquidation Functions ==========

    /// Check if a position is liquidatable
    pub fn check_liquidation(
        env: Env,
        trader: Address,
        rwa_token: Address,
    ) -> Result<bool, Error> {
        Liquidations::check_liquidation(&env, &trader, &rwa_token)
    }

    /// Liquidate an undercollateralized position
    pub fn liquidate_position(
        env: Env,
        liquidator: Address,
        trader: Address,
        rwa_token: Address,
    ) -> Result<i128, Error> {
        Liquidations::liquidate_position(&env, &liquidator, &trader, &rwa_token)
    }

    /// Get liquidation price for a position
    pub fn get_liquidation_price(
        env: Env,
        trader: Address,
        rwa_token: Address,
    ) -> Result<i128, Error> {
        Liquidations::get_liquidation_price(&env, &trader, &rwa_token)
    }

    // ========== Margin Management Functions ==========

    /// Add collateral to an existing position
    pub fn add_margin(
        env: Env,
        trader: Address,
        rwa_token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        Margins::add_margin(&env, &trader, &rwa_token, amount)
    }

    /// Remove collateral from an existing position
    pub fn remove_margin(
        env: Env,
        trader: Address,
        rwa_token: Address,
        amount: i128,
    ) -> Result<(), Error> {
        Margins::remove_margin(&env, &trader, &rwa_token, amount)
    }

    /// Calculate current margin ratio for a position (in basis points)
    pub fn calculate_margin_ratio(
        env: Env,
        trader: Address,
        rwa_token: Address,
    ) -> Result<i128, Error> {
        Margins::calculate_margin_ratio(&env, &trader, &rwa_token)
    }

    /// Get available margin that can be safely removed from a position
    pub fn get_available_margin(
        env: Env,
        trader: Address,
        rwa_token: Address,
    ) -> Result<i128, Error> {
        Margins::get_available_margin(&env, &trader, &rwa_token)
    }

    // ========== Position Functions ==========

    /// Open a new position (long or short)
    pub fn open_position(
        env: Env,
        trader: Address,
        rwa_token: Address,
        size: i128,
        leverage: u32,
        margin: i128,
    ) -> Result<(), Error> {
        Positions::open_position(&env, &trader, &rwa_token, size, leverage, margin)
    }

    /// Close a position (full or partial)
    pub fn close_position(
        env: Env,
        trader: Address,
        rwa_token: Address,
        size_to_close: i128,
    ) -> Result<(), Error> {
        Positions::close_position(&env, &trader, &rwa_token, size_to_close)
    }

    /// Get a specific position for a trader
    pub fn get_position(
        env: Env,
        trader: Address,
        rwa_token: Address,
    ) -> Result<Position, Error> {
        Positions::get_position(&env, &trader, &rwa_token)
    }

    /// Get all positions for a trader
    pub fn get_user_positions(
        env: Env,
        trader: Address,
    ) -> Vec<Position> {
        Positions::get_user_positions(&env, &trader)
    }
}
