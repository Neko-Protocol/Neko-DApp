use soroban_sdk::{Address, Env, Symbol, symbol_short};

pub struct Events;

impl Events {
    /// Event emitted when a position is checked for liquidation
    pub fn liquidation_check(
        env: &Env,
        position_id: &Address,
        trader: &Address,
        is_liquidatable: bool,
        margin_ratio: i128,
    ) {
        let topics = (
            symbol_short!("liq_check"),
            position_id,
            trader,
        );
        env.events().publish(topics, (is_liquidatable, margin_ratio));
    }

    /// Event emitted when a position is liquidated
    pub fn position_liquidated(
        env: &Env,
        position_id: &Address,
        trader: &Address,
        liquidator: &Address,
        position_size: i128,
        liquidation_price: i128,
        liquidation_penalty: i128,
        liquidator_reward: i128,
    ) {
        let topics = (
            symbol_short!("liquidate"),
            position_id,
            trader,
            liquidator,
        );
        env.events().publish(
            topics,
            (position_size, liquidation_price, liquidation_penalty, liquidator_reward),
        );
    }

    /// Event emitted when liquidation price is calculated
    pub fn liquidation_price_calculated(
        env: &Env,
        position_id: &Address,
        trader: &Address,
        liquidation_price: i128,
    ) {
        let topics = (
            symbol_short!("liq_price"),
            position_id,
            trader,
        );
        env.events().publish(topics, liquidation_price);
    }

    /// Event emitted when contract is initialized
    pub fn contract_initialized(
        env: &Env,
        admin: &Address,
        oracle: &Address,
    ) {
        let topics = (symbol_short!("init"), admin);
        env.events().publish(topics, oracle);
    }

    /// Event emitted when oracle address is updated
    pub fn oracle_updated(
        env: &Env,
        old_oracle: &Address,
        new_oracle: &Address,
    ) {
        let topics = (symbol_short!("oracle"), old_oracle);
        env.events().publish(topics, new_oracle);
    }

    /// Event emitted when protocol pause state changes
    pub fn protocol_paused_updated(
        env: &Env,
        paused: bool,
    ) {
        let topics = (symbol_short!("paused"),);
        env.events().publish(topics, paused);
    }

    /// Event emitted when market config is updated
    pub fn market_config_updated(
        env: &Env,
        rwa_token: &Address,
        max_leverage: u32,
        maintenance_margin: u32,
    ) {
        let topics = (symbol_short!("mkt_cfg"), rwa_token);
        env.events().publish(topics, (max_leverage, maintenance_margin));
    }
}
