use soroban_sdk::{Env, Symbol};

use crate::common::error::Error;
use crate::common::events::Events;
use crate::common::storage::Storage;
use crate::common::types::{BASIS_POINTS, InterestRateParams, SECONDS_PER_YEAR};

/// Interest rate calculations and accrual
pub struct Interest;

impl Interest {
    /// Accrue interest for both lenders and borrowers
    pub fn accrue_interest(env: &Env, asset: &Symbol) -> Result<(), Error> {
        let current_time = env.ledger().timestamp();
        let mut storage = Storage::get(env);

        // Get last accrual time
        let last_accrual = storage
            .last_accrual_time
            .get(asset.clone())
            .unwrap_or(current_time);

        if current_time <= last_accrual {
            // No time has passed, no accrual needed
            return Ok(());
        }

        let elapsed = current_time - last_accrual;

        // Get bToken supply - if zero, no accrual needed
        let b_token_supply = storage.b_token_supply.get(asset.clone()).unwrap_or(0);
        if b_token_supply == 0 {
            // Update last accrual time and return
            storage.last_accrual_time.set(asset.clone(), current_time);
            Storage::set(env, &storage);
            return Ok(());
        }

        // Get interest rate parameters
        let params = storage
            .interest_rate_params
            .get(asset.clone())
            .unwrap_or_else(|| {
                // Default parameters
                InterestRateParams {
                    target_utilization: 7500,      // 75%
                    base_rate: 100,                // 1%
                    slope_1: 500,                  // 5%
                    slope_2: 2000,                  // 20%
                    slope_3: 10000,                 // 100%
                    reactivity_constant: 1,         // 0.01%
                }
            });

        // Calculate utilization ratio
        let utilization = Self::calculate_utilization(env, asset)?;

        // If utilization is 0 (no borrowing), no accrual needed
        if utilization == 0 {
            // Update last accrual time and return
            storage.last_accrual_time.set(asset.clone(), current_time);
            Storage::set(env, &storage);
            return Ok(());
        }

        // Calculate interest rate based on utilization
        let interest_rate = Self::calculate_interest_rate(
            env,
            asset,
            &params,
            utilization,
        )?;

        // Update rate modifier
        Self::update_rate_modifier(env, asset, &params, utilization, elapsed)?;

        // Accrue interest to lenders (update bTokenRate)
        Self::accrue_interest_to_lenders(env, asset, interest_rate, elapsed)?;

        // Accrue interest to borrowers (update dTokenRate)
        Self::accrue_interest_to_borrowers(env, asset, interest_rate, elapsed)?;

        // Update last accrual time
        storage.last_accrual_time.set(asset.clone(), current_time);
        Storage::set(env, &storage);

        // Emit event
        let rate_modifier = storage.rate_modifiers.get(asset.clone()).unwrap_or(1_000_000_000);
        let b_token_rate = Storage::get_b_token_rate(env, asset);
        let d_token_rate = Storage::get_d_token_rate(env, asset);
        Events::interest_accrued(env, asset, b_token_rate, d_token_rate, rate_modifier);

        Ok(())
    }

    /// Calculate utilization ratio
    /// U = TotalLiabilities / TotalSupply
    /// Returns utilization in basis points (0-10000 = 0%-100%)
    pub fn calculate_utilization(env: &Env, asset: &Symbol) -> Result<i128, Error> {
        let storage = Storage::get(env);

        // Get total supply: bTokenSupply × bTokenRate (in underlying tokens)
        let b_token_supply = storage.b_token_supply.get(asset.clone()).unwrap_or(0);
        let b_token_rate = Storage::get_b_token_rate(env, asset);
        let total_supply = b_token_supply
            .checked_mul(b_token_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_div(1_000_000_000) // Scale back from 9 decimals
            .ok_or(Error::ArithmeticError)?;

        if total_supply == 0 {
            return Ok(0);
        }

        // Get total liabilities: dTokenSupply × dTokenRate (in underlying tokens)
        let d_token_supply = Storage::get_d_token_supply(env, asset);
        let d_token_rate = Storage::get_d_token_rate(env, asset);
        let total_liabilities = d_token_supply
            .checked_mul(d_token_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_div(1_000_000_000) // Scale back from 9 decimals
            .ok_or(Error::ArithmeticError)?;

        // Calculate utilization: U = TotalLiabilities / TotalSupply
        if total_liabilities >= total_supply {
            return Ok(BASIS_POINTS);
        }

        // In basis points: U = (TotalLiabilities * 10000) / TotalSupply
        let utilization = total_liabilities
            .checked_mul(BASIS_POINTS)
            .ok_or(Error::ArithmeticError)?
            .checked_div(total_supply)
            .ok_or(Error::ArithmeticError)?;

        // Cap at 100% (10000 basis points) - though this should never be reached after the check above
        Ok(utilization.min(BASIS_POINTS))
    }

    /// Calculate interest rate based on utilization
    fn calculate_interest_rate(
        env: &Env,
        asset: &Symbol,
        params: &InterestRateParams,
        utilization: i128,
    ) -> Result<i128, Error> {
        let storage = Storage::get(env);
        let rate_modifier = storage
            .rate_modifiers
            .get(asset.clone())
            .unwrap_or(1_000_000_000); // Default: 1.0 with 9 decimals

        let target_util = params.target_utilization as i128;
        let base_rate = params.base_rate as i128;
        let slope_1 = params.slope_1 as i128;
        let slope_2 = params.slope_2 as i128;
        let slope_3 = params.slope_3 as i128;

        let interest_rate = if utilization <= target_util {
            // Segment 1: U ≤ U_T
            let rate = base_rate
                + (utilization
                    .checked_mul(slope_1)
                    .ok_or(Error::ArithmeticError)?
                    .checked_div(target_util)
                    .ok_or(Error::ArithmeticError)?);
            rate_modifier
                .checked_mul(rate)
                .ok_or(Error::ArithmeticError)?
                .checked_div(1_000_000_000)
                .ok_or(Error::ArithmeticError)?
        } else if utilization <= 9500 {
            // Segment 2: U_T < U ≤ 0.95
            let rate = base_rate
                + slope_1
                + ((utilization - target_util)
                    .checked_mul(slope_2)
                    .ok_or(Error::ArithmeticError)?
                    .checked_div(9500 - target_util)
                    .ok_or(Error::ArithmeticError)?);
            rate_modifier
                .checked_mul(rate)
                .ok_or(Error::ArithmeticError)?
                .checked_div(1_000_000_000)
                .ok_or(Error::ArithmeticError)?
        } else {
            // Segment 3: U > 0.95
            let rate = base_rate
                + slope_1
                + slope_2
                + ((utilization - 9500)
                    .checked_mul(slope_3)
                    .ok_or(Error::ArithmeticError)?
                    .checked_div(500)
                    .ok_or(Error::ArithmeticError)?);
            rate_modifier
                .checked_mul(rate)
                .ok_or(Error::ArithmeticError)?
                .checked_div(1_000_000_000)
                .ok_or(Error::ArithmeticError)?
        };

        Ok(interest_rate)
    }

    /// Update rate modifier based on utilization error
    /// Same formula as Blend: util_dif = cur_util - target_util
    /// If util_dif >= 0: rate increases (use floor for rounding)
    /// If util_dif < 0: rate decreases (use ceil for rounding)
    fn update_rate_modifier(
        env: &Env,
        asset: &Symbol,
        params: &InterestRateParams,
        utilization: i128,
        elapsed: u64,
    ) -> Result<(), Error> {
        let mut storage = Storage::get(env);
        let target_util = params.target_utilization as i128;
        let reactivity = params.reactivity_constant as i128;

        // Calculate utilization difference
        // util_dif = cur_util - target_util (in basis points)
        let util_dif = utilization
            .checked_sub(target_util)
            .ok_or(Error::ArithmeticError)?;

        // Calculate utilization error: util_error = delta_time * util_dif
        let util_error = (elapsed as i128)
            .checked_mul(util_dif)
            .ok_or(Error::ArithmeticError)?;

        // Get current rate modifier (in 9 decimals, default 1.0)
        let current_rm = storage
            .rate_modifiers
            .get(asset.clone())
            .unwrap_or(1_000_000_000);

        // Calculate rate difference based on utilization error
        // We use 9 decimals, so: rate_dif = (util_error * reactivity) / BASIS_POINTS
        // But we need to handle rounding: floor when increasing, ceil when decreasing
        let new_rm: i128;
        if util_dif >= 0 {
            // Rate modifier increasing (utilization above target)
            // Use floor rounding (round down) - favors the protocol
            // util_error is positive, rate_dif will be positive
            let rate_dif = util_error
                .checked_mul(reactivity)
                .ok_or(Error::ArithmeticError)?
                .checked_div(BASIS_POINTS)
                .ok_or(Error::ArithmeticError)?;
            
            let next_rm = current_rm
                .checked_add(rate_dif)
                .ok_or(Error::ArithmeticError)?;
            
            // Bound: max = 10.0 (in 9 decimals: 10_000_000_000)
            let max_rm = 10_000_000_000;
            new_rm = next_rm.min(max_rm);
        } else {
            // Rate modifier decreasing (utilization below target)
            // Use ceil rounding - for negative numbers, ceil means round towards zero
            // util_error is negative, rate_dif will be negative
            let numerator = util_error
                .checked_mul(reactivity)
                .ok_or(Error::ArithmeticError)?;
            
            // For negative ceil: normal division rounds towards zero (which is correct)
            let rate_dif = numerator
                .checked_div(BASIS_POINTS)
                .ok_or(Error::ArithmeticError)?;
            
            let next_rm = current_rm
                .checked_add(rate_dif)
                .ok_or(Error::ArithmeticError)?;
            
            // Bound: min = 0.1 (in 9 decimals: 100_000_000)
            let min_rm = 100_000_000;
            new_rm = next_rm.max(min_rm);
        }

        storage.rate_modifiers.set(asset.clone(), new_rm);
        Storage::set(env, &storage);

        Ok(())
    }

    /// Accrue interest to lenders (update bTokenRate)
    /// Interest is earned on the total borrowed amount (not pool balance)
    /// bTokenRate increases based on interest earned minus backstop take
    fn accrue_interest_to_lenders(
        env: &Env,
        asset: &Symbol,
        interest_rate: i128,
        elapsed: u64,
    ) -> Result<(), Error> {
        let mut storage = Storage::get(env);
        let b_token_supply = storage.b_token_supply.get(asset.clone()).unwrap_or(0);

        if b_token_supply == 0 {
            return Ok(());
        }

        // Calculate total borrowed amount (total liabilities)
        // Total liabilities = dTokenSupply × dTokenRate
        let d_token_supply = Storage::get_d_token_supply(env, asset);
        let d_token_rate = Storage::get_d_token_rate(env, asset);
        let total_liabilities = d_token_supply
            .checked_mul(d_token_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_div(1_000_000_000)
            .ok_or(Error::ArithmeticError)?;

        if total_liabilities <= 0 {
            // No borrowing, no interest to accrue
            return Ok(());
        }

        // Interest earned by lenders = (total_liabilities × interest_rate × elapsed) / (SECONDS_PER_YEAR × BASIS_POINTS)
        // This is the accrued interest on the borrowed amount
        let accrued_interest = total_liabilities
            .checked_mul(interest_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_mul(elapsed as i128)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SECONDS_PER_YEAR as i128)
            .ok_or(Error::ArithmeticError)?
            .checked_div(BASIS_POINTS)
            .ok_or(Error::ArithmeticError)?;

        // Calculate backstop take (portion of interest that goes to backstop)
        let new_backstop_credit = if storage.backstop_take_rate > 0 {
            accrued_interest
                .checked_mul(storage.backstop_take_rate as i128)
                .ok_or(Error::ArithmeticError)?
                .checked_div(BASIS_POINTS)
                .ok_or(Error::ArithmeticError)?
        } else {
            0
        };

        // Update backstop credit for this asset (accumulate)
        let current_credit = storage.backstop_credit.get(asset.clone()).unwrap_or(0);
        storage.backstop_credit.set(asset.clone(), current_credit + new_backstop_credit);
        Storage::set(env, &storage); // Save storage after updating backstop_credit
        
        let backstop_take = new_backstop_credit;

        // Update bTokenRate:
        // b_rate = (pre_update_supply + accrued - new_backstop_credit) / b_supply
        // Where pre_update_supply = b_supply * b_rate / SCALAR
            let current_rate = Storage::get_b_token_rate(env, asset);
        let pre_update_supply = b_token_supply
            .checked_mul(current_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_div(1_000_000_000)
            .ok_or(Error::ArithmeticError)?;

        // New supply = pre_update_supply + accrued_interest - backstop_take
        let new_supply = pre_update_supply
            .checked_add(accrued_interest)
            .ok_or(Error::ArithmeticError)?
            .checked_sub(backstop_take)
            .ok_or(Error::ArithmeticError)?;

        // New rate = new_supply * SCALAR / b_supply
        let new_rate = new_supply
                .checked_mul(1_000_000_000)
                .ok_or(Error::ArithmeticError)?
                .checked_div(b_token_supply)
                .ok_or(Error::ArithmeticError)?;
        
        Storage::set_b_token_rate(env, asset, new_rate);

        Ok(())
    }

    /// Accrue interest to borrowers (update dTokenRate)
    /// dTokenRate is updated by multiplying by the accrual factor
    /// accrual_factor = 1 + (interest_rate × elapsed) / (SECONDS_PER_YEAR × BASIS_POINTS)
    fn accrue_interest_to_borrowers(
        env: &Env,
        asset: &Symbol,
        interest_rate: i128,
        elapsed: u64,
    ) -> Result<(), Error> {
        // Calculate accrual factor: 1 + (interest_rate × elapsed) / (SECONDS_PER_YEAR × BASIS_POINTS)
        // This represents the multiplier for the dTokenRate
        let accrual_numerator = interest_rate
            .checked_mul(elapsed as i128)
            .ok_or(Error::ArithmeticError)?;
        
        let accrual_denominator = (SECONDS_PER_YEAR as i128)
            .checked_mul(BASIS_POINTS)
            .ok_or(Error::ArithmeticError)?;
        
        // accrual_factor = 1 + (accrual_numerator / accrual_denominator)
        // In 9 decimals: 1_000_000_000 + (accrual_numerator * 1_000_000_000 / accrual_denominator)
        let accrual_increase = accrual_numerator
            .checked_mul(1_000_000_000)
            .ok_or(Error::ArithmeticError)?
            .checked_div(accrual_denominator)
            .ok_or(Error::ArithmeticError)?;

        let accrual_factor = 1_000_000_000_i128
            .checked_add(accrual_increase)
            .ok_or(Error::ArithmeticError)?;

        // Update dTokenRate: new_rate = current_rate × accrual_factor / 1_000_000_000
        let current_rate = Storage::get_d_token_rate(env, asset);
        let new_rate = current_rate
            .checked_mul(accrual_factor)
            .ok_or(Error::ArithmeticError)?
            .checked_div(1_000_000_000)
            .ok_or(Error::ArithmeticError)?;
        
        Storage::set_d_token_rate(env, asset, new_rate);

        Ok(())
    }

    /// Get current interest rate for an asset
    pub fn get_interest_rate(env: &Env, asset: &Symbol) -> Result<i128, Error> {
        let utilization = Self::calculate_utilization(env, asset)?;
        let storage = Storage::get(env);
        let params = storage
            .interest_rate_params
            .get(asset.clone())
            .unwrap_or_else(|| {
                InterestRateParams {
                    target_utilization: 7500,
                    base_rate: 100,
                    slope_1: 500,
                    slope_2: 2000,
                    slope_3: 10000,
                    reactivity_constant: 1,
                }
            });
        Self::calculate_interest_rate(env, asset, &params, utilization)
    }
}

