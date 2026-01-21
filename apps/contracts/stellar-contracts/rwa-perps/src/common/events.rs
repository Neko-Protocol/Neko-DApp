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
}
