use soroban_sdk::{Address, Env};

use crate::admin::Admin;
use crate::common::error::Error;
use crate::common::storage::Storage;
use crate::common::types::{BASIS_POINTS, FundingPayment, MarketConfig, Position};

/// Funding operations for RWA Perpetuals
pub struct Funding;

impl Funding {
    /// Update funding rate for a market (admin only)
    ///
    /// Updates the funding rate for a specific RWA token market and records
    /// the timestamp when the rate was changed.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `rwa_token` - Address of the RWA token market
    /// * `new_rate` - New funding rate in basis points (e.g., 100 = 1%)
    ///
    /// # Returns
    /// * `Ok(())` - Rate updated successfully
    /// * `Err(Error)` - Market not found, unauthorized, or invalid rate
    pub fn update_funding_rate(
        env: &Env,
        rwa_token: &Address,
        new_rate: i128,
    ) -> Result<(), Error> {
        // Require admin authorization
        Admin::require_admin(env);

        // Get market configuration
        let mut market_config =
            Storage::get_market_config(env, rwa_token).ok_or(Error::MarketNotFound)?;

        // Update funding rate and timestamp
        market_config.funding_rate = new_rate;
        market_config.last_funding_update = env.ledger().timestamp();

        // Save updated market config
        Storage::set_market_config(env, rwa_token, &market_config);

        Ok(())
    }

    /// Accrue funding for a position
    ///
    /// Calculates the funding payment for a position based on time elapsed
    /// since last payment and updates the position's margin accordingly.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `trader` - Address of the position owner
    /// * `rwa_token` - Address of the RWA token market
    ///
    /// # Returns
    /// * `Ok(funding_payment)` - The funding payment amount (positive = trader pays)
    /// * `Err(Error)` - Position or market not found, calculation error
    pub fn accrue_funding(env: &Env, trader: &Address, rwa_token: &Address) -> Result<i128, Error> {
        // Get position and market config
        let mut position =
            Storage::get_position(env, trader, rwa_token).ok_or(Error::PositionNotFound)?;

        let market_config =
            Storage::get_market_config(env, rwa_token).ok_or(Error::MarketNotFound)?;

        // Calculate funding payment
        let current_time = env.ledger().timestamp();
        let funding_payment =
            Self::calculate_funding_payment(&position, &market_config, current_time);

        // Update position margin (subtract if positive payment, add if negative)
        position.margin = position
            .margin
            .checked_sub(funding_payment)
            .ok_or(Error::FundingCalculationError)?;

        // Update last funding payment timestamp
        position.last_funding_payment = current_time;

        // Save updated position
        Storage::set_position(env, trader, rwa_token, &position);

        // Optionally store funding payment history
        Self::store_funding_payment_history(env, trader, rwa_token, funding_payment, current_time);

        Ok(funding_payment)
    }

    /// Get current funding rate for a market
    ///
    /// Retrieves the current funding rate stored in the market configuration.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `rwa_token` - Address of the RWA token market
    ///
    /// # Returns
    /// * `Ok(funding_rate)` - Current funding rate in basis points
    /// * `Err(Error)` - Market not found
    pub fn get_funding_rate(env: &Env, rwa_token: &Address) -> Result<i128, Error> {
        let market_config =
            Storage::get_market_config(env, rwa_token).ok_or(Error::MarketNotFound)?;

        Ok(market_config.funding_rate)
    }

    /// Calculate funding payment for a position (pure helper function)
    ///
    /// Calculates the funding payment using the formula:
    /// funding_payment = position_size * funding_rate * time_elapsed / BASIS_POINTS
    ///
    /// # Arguments
    /// * `position` - Position data
    /// * `market_config` - Market configuration with funding rate
    /// * `current_time` - Current timestamp
    ///
    /// # Returns
    /// * `i128` - Funding payment amount (positive = trader pays, negative = trader receives)
    pub fn calculate_funding_payment(
        position: &Position,
        market_config: &MarketConfig,
        current_time: u64,
    ) -> i128 {
        // Calculate time elapsed since last funding payment
        let last_payment_time = if position.last_funding_payment == 0 {
            position.opened_at
        } else {
            position.last_funding_payment
        };

        let time_elapsed = current_time.saturating_sub(last_payment_time);

        // If no time elapsed, no funding payment
        if time_elapsed == 0 {
            return 0;
        }

        // Calculate funding payment: position_size * funding_rate * time_elapsed / BASIS_POINTS
        // Note: We use time_elapsed directly (in seconds) for simplicity
        let payment = position
            .size
            .saturating_mul(market_config.funding_rate)
            .saturating_mul(time_elapsed as i128)
            .saturating_div(BASIS_POINTS);

        payment
    }

    /// Store funding payment in history (optional feature)
    ///
    /// Stores a record of the funding payment for historical tracking.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `trader` - Address of the position owner
    /// * `rwa_token` - Address of the RWA token market
    /// * `amount` - Funding payment amount
    /// * `timestamp` - Payment timestamp
    fn store_funding_payment_history(
        env: &Env,
        trader: &Address,
        rwa_token: &Address,
        amount: i128,
        timestamp: u64,
    ) {
        let funding_record = FundingPayment {
            position_id: trader.clone(),
            amount,
            timestamp,
        };

        // Store with composite key: (trader, rwa_token, timestamp)
        let key = (trader.clone(), rwa_token.clone(), timestamp);
        env.storage().persistent().set(&key, &funding_record);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::common::types::{MarketConfig, Position, SCALAR_9};
    use soroban_sdk::{Address, Env, testutils::Address as _};

    #[test]
    fn test_calculate_funding_payment_positive_rate_long() {
        let env = Env::default();

        let position = Position {
            trader: Address::generate(&env),
            rwa_token: Address::generate(&env),
            size: 1000 * SCALAR_9, // Long position
            entry_price: 100 * SCALAR_9,
            margin: 10000 * SCALAR_9,
            leverage: 1000, // 10x
            opened_at: 1000,
            last_funding_payment: 1000,
        };

        let market_config = MarketConfig {
            rwa_token: position.rwa_token.clone(),
            max_leverage: 1000,
            maintenance_margin: 500,
            initial_margin: 1000,
            funding_rate: 100, // 1% (positive)
            last_funding_update: 1000,
            is_active: true,
        };

        let current_time = 4600; // 1 hour later (3600 seconds)
        let payment = Funding::calculate_funding_payment(&position, &market_config, current_time);

        // Expected: 1000 * SCALAR_9 * 100 * 3600 / BASIS_POINTS
        // = 1000 * 1_000_000_000 * 100 * 3600 / 10_000
        // = 36_000_000_000_000
        let expected = 36_000_000_000_000i128;
        assert_eq!(
            payment, expected,
            "Long position should pay positive funding"
        );
    }

    #[test]
    fn test_calculate_funding_payment_positive_rate_short() {
        let env = Env::default();

        let position = Position {
            trader: Address::generate(&env),
            rwa_token: Address::generate(&env),
            size: -1000 * SCALAR_9, // Short position
            entry_price: 100 * SCALAR_9,
            margin: 10000 * SCALAR_9,
            leverage: 1000,
            opened_at: 1000,
            last_funding_payment: 1000,
        };

        let market_config = MarketConfig {
            rwa_token: position.rwa_token.clone(),
            max_leverage: 1000,
            maintenance_margin: 500,
            initial_margin: 1000,
            funding_rate: 100, // 1% (positive)
            last_funding_update: 1000,
            is_active: true,
        };

        let current_time = 4600; // 1 hour later
        let payment = Funding::calculate_funding_payment(&position, &market_config, current_time);

        // Expected: -1000 * SCALAR_9 * 100 * 3600 / BASIS_POINTS = negative (short receives)
        let expected = -36_000_000_000_000i128;
        assert_eq!(
            payment, expected,
            "Short position should receive funding (negative payment)"
        );
    }

    #[test]
    fn test_calculate_funding_payment_negative_rate_long() {
        let env = Env::default();

        let position = Position {
            trader: Address::generate(&env),
            rwa_token: Address::generate(&env),
            size: 1000 * SCALAR_9, // Long position
            entry_price: 100 * SCALAR_9,
            margin: 10000 * SCALAR_9,
            leverage: 1000,
            opened_at: 1000,
            last_funding_payment: 1000,
        };

        let market_config = MarketConfig {
            rwa_token: position.rwa_token.clone(),
            max_leverage: 1000,
            maintenance_margin: 500,
            initial_margin: 1000,
            funding_rate: -100, // -1% (negative)
            last_funding_update: 1000,
            is_active: true,
        };

        let current_time = 4600; // 1 hour later
        let payment = Funding::calculate_funding_payment(&position, &market_config, current_time);

        // Expected: 1000 * SCALAR_9 * (-100) * 3600 / BASIS_POINTS = negative (long receives)
        let expected = -36_000_000_000_000i128;
        assert_eq!(
            payment, expected,
            "Long position should receive funding with negative rate"
        );
    }

    #[test]
    fn test_calculate_funding_payment_zero_time() {
        let env = Env::default();

        let position = Position {
            trader: Address::generate(&env),
            rwa_token: Address::generate(&env),
            size: 1000 * SCALAR_9,
            entry_price: 100 * SCALAR_9,
            margin: 10000 * SCALAR_9,
            leverage: 1000,
            opened_at: 1000,
            last_funding_payment: 1000,
        };

        let market_config = MarketConfig {
            rwa_token: position.rwa_token.clone(),
            max_leverage: 1000,
            maintenance_margin: 500,
            initial_margin: 1000,
            funding_rate: 100,
            last_funding_update: 1000,
            is_active: true,
        };

        let current_time = 1000; // Same time as last payment
        let payment = Funding::calculate_funding_payment(&position, &market_config, current_time);

        assert_eq!(
            payment, 0,
            "Zero time elapsed should result in zero payment"
        );
    }

    #[test]
    fn test_calculate_funding_payment_new_position() {
        let env = Env::default();

        let position = Position {
            trader: Address::generate(&env),
            rwa_token: Address::generate(&env),
            size: 1000 * SCALAR_9,
            entry_price: 100 * SCALAR_9,
            margin: 10000 * SCALAR_9,
            leverage: 1000,
            opened_at: 1000,
            last_funding_payment: 0, // New position
        };

        let market_config = MarketConfig {
            rwa_token: position.rwa_token.clone(),
            max_leverage: 1000,
            maintenance_margin: 500,
            initial_margin: 1000,
            funding_rate: 100,
            last_funding_update: 1000,
            is_active: true,
        };

        let current_time = 4600; // 1 hour after opening
        let payment = Funding::calculate_funding_payment(&position, &market_config, current_time);

        // Should use opened_at time since last_funding_payment is 0
        let expected = 36_000_000_000_000i128;
        assert_eq!(payment, expected, "New position should use opened_at time");
    }
}
