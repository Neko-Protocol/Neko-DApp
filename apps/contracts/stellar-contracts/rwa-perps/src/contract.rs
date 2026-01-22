use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};

use crate::admin::Admin;
use crate::common::error::Error;
use crate::common::types::MarketConfig;
use crate::operations::liquidation::Liquidations;

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

    // Future operations (positions, margin, funding) will be added here
}
