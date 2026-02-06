use soroban_sdk::{Env, Symbol};

use crate::common::error::Error;
use crate::common::events::Events;
use crate::common::storage::{PoolStorage, Storage};
use crate::common::types::{InterestRateParams, ReserveData, SCALAR_7, SCALAR_12, SECONDS_PER_YEAR};

/// Interest rate calculations and accrual
///
/// Interest Rate Model:
/// - 3-segment piecewise linear based on utilization
/// - Dynamic rate modifier (ir_mod) adjusts based on deviation from target
/// - All rate parameters use 7 decimals (SCALAR_7)
/// - Token rates (b_rate, d_rate) use 12 decimals (SCALAR_12)
pub struct Interest;

impl Interest {
    /// Accrue interest for an asset
    /// Updates b_rate, d_rate, ir_mod, and backstop_credit
    pub fn accrue_interest(env: &Env, asset: &Symbol) -> Result<(), Error> {
        let current_time = env.ledger().timestamp();
        let mut storage = Storage::get(env);

        // Get or create reserve data
        let mut reserve = storage
            .reserve_data
            .get(asset.clone())
            .unwrap_or_else(|| ReserveData::new(current_time));

        // No time has passed, no accrual needed
        if current_time <= reserve.last_time {
            return Ok(());
        }

        // No supply, no accrual needed
        if reserve.b_supply == 0 {
            reserve.last_time = current_time;
            storage.reserve_data.set(asset.clone(), reserve);
            Storage::set(env, &storage);
            return Ok(());
        }

        // Get interest rate parameters
        let params = storage
            .interest_rate_params
            .get(asset.clone())
            .unwrap_or_else(Self::default_params);

        // Calculate utilization (7 decimals)
        let utilization = Self::calculate_utilization_internal(&reserve)?;

        // No borrowing, no accrual needed
        if utilization == 0 {
            reserve.last_time = current_time;
            storage.reserve_data.set(asset.clone(), reserve);
            Storage::set(env, &storage);
            return Ok(());
        }

        // Calculate accrual and update reserve
        let (accrual, new_ir_mod) = Self::calc_accrual(
            &params,
            utilization,
            reserve.ir_mod,
            reserve.last_time,
            current_time,
        )?;

        // Update reserve data
        Self::apply_accrual(
            env,
            &mut reserve,
            &storage,
            asset,
            accrual,
            new_ir_mod,
            current_time,
        )?;

        // Save updated reserve
        storage.reserve_data.set(asset.clone(), reserve.clone());
        Storage::set(env, &storage);

        // Emit event
        Events::interest_accrued(
            env,
            asset,
            reserve.b_rate,
            reserve.d_rate,
            reserve.ir_mod,
        );

        Ok(())
    }

    /// Calculate accrual ratio and new interest rate modifier
    /// Returns (accrual_12d, new_ir_mod_7d)
    fn calc_accrual(
        params: &InterestRateParams,
        cur_util: i128,  // 7 decimals
        ir_mod: i128,    // 7 decimals
        last_time: u64,
        current_time: u64,
    ) -> Result<(i128, i128), Error> {
        let delta_time = current_time.saturating_sub(last_time);
        if delta_time == 0 {
            return Ok((SCALAR_12, ir_mod));
        }

        let target_util = params.target_util as i128;
        let max_util = params.max_util as i128;
        let r_base = params.r_base as i128;
        let r_one = params.r_one as i128;
        let r_two = params.r_two as i128;
        let r_three = params.r_three as i128;
        let reactivity = params.reactivity as i128;

        // Calculate interest rate based on utilization segment
        let interest_rate = if cur_util <= target_util {
            // Segment 1: 0 <= util <= target
            // rate = (util / target) * R1 + R0
            // rate = rate * ir_mod / SCALAR_7
            let rate = if target_util > 0 {
                cur_util
                    .checked_mul(r_one)
                    .ok_or(Error::ArithmeticError)?
                    .checked_div(target_util)
                    .ok_or(Error::ArithmeticError)?
                    .checked_add(r_base)
                    .ok_or(Error::ArithmeticError)?
            } else {
                r_base
            };
            rate.checked_mul(ir_mod)
                .ok_or(Error::ArithmeticError)?
                .checked_div(SCALAR_7)
                .ok_or(Error::ArithmeticError)?
        } else if cur_util <= max_util {
            // Segment 2: target < util <= max (95%)
            // rate = ((util - target) / (max - target)) * R2 + R1 + R0
            // rate = rate * ir_mod / SCALAR_7
            let util_diff = cur_util.checked_sub(target_util).ok_or(Error::ArithmeticError)?;
            let range = max_util.checked_sub(target_util).ok_or(Error::ArithmeticError)?;
            let rate = if range > 0 {
                util_diff
                    .checked_mul(r_two)
                    .ok_or(Error::ArithmeticError)?
                    .checked_div(range)
                    .ok_or(Error::ArithmeticError)?
                    .checked_add(r_one)
                    .ok_or(Error::ArithmeticError)?
                    .checked_add(r_base)
                    .ok_or(Error::ArithmeticError)?
            } else {
                r_one.checked_add(r_base).ok_or(Error::ArithmeticError)?
            };
            rate.checked_mul(ir_mod)
                .ok_or(Error::ArithmeticError)?
                .checked_div(SCALAR_7)
                .ok_or(Error::ArithmeticError)?
        } else {
            // Segment 3: util > max (95%)
            // rate = ((util - max) / (1 - max)) * R3 + R2 + R1 + R0
            // Note: No ir_mod multiplication in segment 3 (like Blend)
            let util_diff = cur_util.checked_sub(max_util).ok_or(Error::ArithmeticError)?;
            let range = SCALAR_7.checked_sub(max_util).ok_or(Error::ArithmeticError)?;
            if range > 0 {
                util_diff
                    .checked_mul(r_three)
                    .ok_or(Error::ArithmeticError)?
                    .checked_div(range)
                    .ok_or(Error::ArithmeticError)?
                    .checked_add(r_two)
                    .ok_or(Error::ArithmeticError)?
                    .checked_add(r_one)
                    .ok_or(Error::ArithmeticError)?
                    .checked_add(r_base)
                    .ok_or(Error::ArithmeticError)?
            } else {
                r_three
                    .checked_add(r_two)
                    .ok_or(Error::ArithmeticError)?
                    .checked_add(r_one)
                    .ok_or(Error::ArithmeticError)?
                    .checked_add(r_base)
                    .ok_or(Error::ArithmeticError)?
            }
        };

        // Calculate accrual ratio (12 decimals)
        // accrual = SCALAR_12 + (interest_rate * delta_time * SCALAR_12) / (SECONDS_PER_YEAR * SCALAR_7)
        let time_weight_numerator = (delta_time as i128)
            .checked_mul(interest_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_mul(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        let time_weight_denominator = (SECONDS_PER_YEAR as i128)
            .checked_mul(SCALAR_7)
            .ok_or(Error::ArithmeticError)?;

        let accrual_increase = time_weight_numerator
            .checked_div(time_weight_denominator)
            .ok_or(Error::ArithmeticError)?;

        let accrual = SCALAR_12
            .checked_add(accrual_increase)
            .ok_or(Error::ArithmeticError)?;

        // Calculate new rate modifier
        // util_dif = cur_util - target_util
        // ir_mod_change = delta_time * util_dif * reactivity / SCALAR_7
        let util_dif = cur_util.checked_sub(target_util).ok_or(Error::ArithmeticError)?;

        let ir_mod_change = (delta_time as i128)
            .checked_mul(util_dif)
            .ok_or(Error::ArithmeticError)?
            .checked_mul(reactivity)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_7)
            .ok_or(Error::ArithmeticError)?;

        let new_ir_mod_raw = ir_mod
            .checked_add(ir_mod_change)
            .ok_or(Error::ArithmeticError)?;

        // Bound ir_mod: min = 0.1 (SCALAR_7 / 10), max = 10 (SCALAR_7 * 10)
        let min_ir_mod = SCALAR_7 / 10;  // 0.1
        let max_ir_mod = SCALAR_7 * 10;  // 10.0
        let new_ir_mod = new_ir_mod_raw.clamp(min_ir_mod, max_ir_mod);

        Ok((accrual, new_ir_mod))
    }

    /// Apply accrual to reserve data
    fn apply_accrual(
        _env: &Env,
        reserve: &mut ReserveData,
        storage: &PoolStorage,
        _asset: &Symbol,
        accrual: i128,  // 12 decimals
        new_ir_mod: i128,  // 7 decimals
        current_time: u64,
    ) -> Result<(), Error> {
        // Save old d_rate before updating
        let old_d_rate = reserve.d_rate;

        // Update d_rate: new_d_rate = old_d_rate * accrual / SCALAR_12
        reserve.d_rate = old_d_rate
            .checked_mul(accrual)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        // Calculate backstop take from interest earned
        let backstop_take_rate = storage.backstop_take_rate as i128;
        if backstop_take_rate > 0 && reserve.d_supply > 0 {
            // Interest earned = d_supply * (new_d_rate - old_d_rate) / SCALAR_12
            let rate_increase = reserve.d_rate
                .checked_sub(old_d_rate)
                .ok_or(Error::ArithmeticError)?;

            let interest_earned = reserve.d_supply
                .checked_mul(rate_increase)
                .ok_or(Error::ArithmeticError)?
                .checked_div(SCALAR_12)
                .ok_or(Error::ArithmeticError)?;

            // Backstop credit = interest_earned * backstop_take_rate / SCALAR_7
            let backstop_credit = interest_earned
                .checked_mul(backstop_take_rate)
                .ok_or(Error::ArithmeticError)?
                .checked_div(SCALAR_7)
                .ok_or(Error::ArithmeticError)?;

            reserve.backstop_credit += backstop_credit;
        }

        // Update b_rate based on new total supply value minus backstop
        // b_rate increases as interest accrues to lenders
        if reserve.b_supply > 0 {
            // Total supply value = b_supply * b_rate / SCALAR_12
            // After accrual, supply increases by (interest_earned - backstop_take)
            // new_b_rate = (total_supply * accrual - backstop_credit_increase) * SCALAR_12 / b_supply

            // Simplified: b_rate grows proportionally to accrual minus backstop take
            let lender_accrual = if backstop_take_rate > 0 {
                // lender_portion = accrual * (SCALAR_7 - backstop_take_rate) / SCALAR_7
                let lender_portion = SCALAR_7
                    .checked_sub(backstop_take_rate)
                    .ok_or(Error::ArithmeticError)?;

                // Calculate the accrual increase portion
                let accrual_increase = accrual
                    .checked_sub(SCALAR_12)
                    .ok_or(Error::ArithmeticError)?;

                let lender_increase = accrual_increase
                    .checked_mul(lender_portion)
                    .ok_or(Error::ArithmeticError)?
                    .checked_div(SCALAR_7)
                    .ok_or(Error::ArithmeticError)?;

                SCALAR_12
                    .checked_add(lender_increase)
                    .ok_or(Error::ArithmeticError)?
            } else {
                accrual
            };

            reserve.b_rate = reserve
                .b_rate
                .checked_mul(lender_accrual)
                .ok_or(Error::ArithmeticError)?
                .checked_div(SCALAR_12)
                .ok_or(Error::ArithmeticError)?;
        }

        // Update ir_mod and last_time
        reserve.ir_mod = new_ir_mod;
        reserve.last_time = current_time;

        Ok(())
    }

    /// Calculate utilization ratio (7 decimals)
    /// U = TotalLiabilities / TotalSupply
    pub fn calculate_utilization(env: &Env, asset: &Symbol) -> Result<i128, Error> {
        let storage = Storage::get(env);
        let reserve = storage
            .reserve_data
            .get(asset.clone())
            .unwrap_or_else(|| ReserveData::new(env.ledger().timestamp()));

        Self::calculate_utilization_internal(&reserve)
    }

    /// Internal utilization calculation from reserve data
    fn calculate_utilization_internal(reserve: &ReserveData) -> Result<i128, Error> {
        if reserve.b_supply == 0 {
            return Ok(0);
        }

        // Total supply = b_supply * b_rate / SCALAR_12
        let total_supply = reserve
            .b_supply
            .checked_mul(reserve.b_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        if total_supply == 0 {
            return Ok(0);
        }

        // Total liabilities = d_supply * d_rate / SCALAR_12
        let total_liabilities = reserve
            .d_supply
            .checked_mul(reserve.d_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        // Utilization = (liabilities * SCALAR_7) / supply
        // Cap at SCALAR_7 (100%)
        if total_liabilities >= total_supply {
            return Ok(SCALAR_7);
        }

        let utilization = total_liabilities
            .checked_mul(SCALAR_7)
            .ok_or(Error::ArithmeticError)?
            .checked_div(total_supply)
            .ok_or(Error::ArithmeticError)?;

        Ok(utilization.min(SCALAR_7))
    }

    /// Get current interest rate for an asset (7 decimals)
    pub fn get_interest_rate(env: &Env, asset: &Symbol) -> Result<i128, Error> {
        let storage = Storage::get(env);
        let reserve = storage
            .reserve_data
            .get(asset.clone())
            .unwrap_or_else(|| ReserveData::new(env.ledger().timestamp()));

        let params = storage
            .interest_rate_params
            .get(asset.clone())
            .unwrap_or_else(Self::default_params);

        let utilization = Self::calculate_utilization_internal(&reserve)?;

        // Calculate rate without accruing
        let (accrual, _) = Self::calc_accrual(
            &params,
            utilization,
            reserve.ir_mod,
            reserve.last_time,
            reserve.last_time + 1,  // Simulate 1 second
        )?;

        // Convert accrual to annual rate (7 decimals)
        // rate = (accrual - SCALAR_12) * SECONDS_PER_YEAR / SCALAR_12 * SCALAR_7
        let accrual_increase = accrual
            .checked_sub(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        let annual_rate = accrual_increase
            .checked_mul(SECONDS_PER_YEAR as i128)
            .ok_or(Error::ArithmeticError)?
            .checked_mul(SCALAR_7)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        Ok(annual_rate)
    }

    /// Default interest rate parameters (Blend-style)
    pub fn default_params() -> InterestRateParams {
        InterestRateParams {
            target_util: 7_500_000,    // 75%
            max_util: 9_500_000,       // 95%
            r_base: 100_000,           // 1%
            r_one: 500_000,            // 5%
            r_two: 5_000_000,          // 50%
            r_three: 15_000_000,       // 150%
            reactivity: 200,           // 0.00002
        }
    }
}
