use soroban_sdk::{assert_with_error, Address, Env, Symbol, token::TokenClient};

use crate::admin::Admin;
use crate::common::error::Error;
use crate::common::events::Events;
use crate::common::storage::Storage;
use crate::common::types::{self, MIN_HEALTH_FACTOR, PoolState, SCALAR_7, SCALAR_12};
use crate::operations::collateral::Collateral;
use crate::operations::interest::Interest;
use crate::operations::oracles::Oracles;

/// Borrowing functions for dTokens (single asset per borrower)
/// Token rates use 12 decimals (SCALAR_12)
pub struct Borrowing;

impl Borrowing {
    /// Borrow crypto asset from the pool (single asset per borrower)
    pub fn borrow(
        env: &Env,
        borrower: &Address,
        asset: &Symbol,
        amount: i128,
    ) -> Result<i128, Error> {
        borrower.require_auth();

        assert_with_error!(env, amount > 0, Error::NotPositive);

        // Check pool state
        let pool_state = Admin::get_pool_state(env);
        if matches!(pool_state, PoolState::OnIce | PoolState::Frozen) {
            return Err(Error::PoolOnIce);
        }

        // Accrue interest before borrow
        Interest::accrue_interest(env, asset)?;

        // Get or create CDP
        let mut cdp = Storage::get_cdp(env, borrower).unwrap_or_else(|| {
            crate::common::types::CDP {
                collateral: soroban_sdk::Map::new(env),
                debt_asset: None,
                d_tokens: 0,
                created_at: env.ledger().timestamp(),
                last_update: env.ledger().timestamp(),
            }
        });

        // Check if borrower already has debt in a different asset
        if let Some(debt_asset) = &cdp.debt_asset
            && debt_asset != asset {
                return Err(Error::DebtAssetAlreadySet);
            }

        // Calculate borrow limit
        let borrow_limit = Self::calculate_borrow_limit(env, borrower)?;

        // Get asset decimals from token contract
        let token_address = Storage::get_token_contract(env, asset)
            .ok_or(Error::TokenContractNotSet)?;
        let token_client = TokenClient::new(env, &token_address);
        let asset_decimals = token_client.decimals();

        // Get current debt value
        let current_debt_value = if cdp.d_tokens > 0 {
            let d_token_rate = Storage::get_d_token_rate(env, asset);
            let debt_amount = cdp.d_tokens
                .checked_mul(d_token_rate)
                .ok_or(Error::ArithmeticError)?
                .checked_div(SCALAR_12)
                .ok_or(Error::ArithmeticError)?;

            // Get price of debt asset (includes price decimals from oracle)
            let (debt_price, debt_price_decimals) = Oracles::get_crypto_price_with_decimals(env, asset)?;

            // Calculate debt value in USD
            Oracles::calculate_usd_value(
                env,
                debt_amount,
                debt_price,
                asset_decimals,
                debt_price_decimals,
            )?
        } else {
            0
        };

        // Calculate new debt value
        let (asset_price, price_decimals) = Oracles::get_crypto_price_with_decimals(env, asset)?;
        let new_debt_value = Oracles::calculate_usd_value(
            env,
            amount,
            asset_price,
            asset_decimals,
            price_decimals,
        )?;

        let total_debt_value = current_debt_value
            .checked_add(new_debt_value)
            .ok_or(Error::ArithmeticError)?;

        if total_debt_value > borrow_limit {
            return Err(Error::InsufficientBorrowLimit);
        }

        // Check pool has enough balance
        let pool_balance = Storage::get_pool_balance(env, asset);
        if pool_balance < amount {
            return Err(Error::InsufficientPoolBalance);
        }

        // Get current dTokenRate (12 decimals)
        let d_token_rate = Storage::get_d_token_rate(env, asset);

        // Calculate dTokens with rounding up
        // This favors the protocol by minting more dTokens
        let d_tokens = types::rounding::to_d_token_up(amount, d_token_rate)?;

        // Update CDP
        cdp.debt_asset = Some(asset.clone());
        cdp.d_tokens += d_tokens;
        cdp.last_update = env.ledger().timestamp();
        Storage::set_cdp(env, borrower, &cdp);

        // Update dToken balance
        let current_balance = Storage::get_d_token_balance(env, borrower, asset);
        Storage::set_d_token_balance(env, borrower, asset, current_balance + d_tokens);

        // Update dToken supply
        let current_supply = Storage::get_d_token_supply(env, asset);
        Storage::set_d_token_supply(env, asset, current_supply + d_tokens);

        // Update pool balance
        Storage::set_pool_balance(env, asset, pool_balance - amount);

        // Verify utilization is below 100% after borrow
        // This ensures the pool maintains enough liquidity
        let utilization = Interest::calculate_utilization(env, asset)?;
        if utilization >= SCALAR_7 {
            return Err(Error::InvalidUtilRate);
        }

        // Verify health factor remains above minimum threshold (7 decimals)
        // This ensures the borrower maintains a safety margin above liquidation threshold
        let health_factor = crate::operations::liquidations::Liquidations::calculate_health_factor(env, borrower)?;
        if (health_factor as i128) < MIN_HEALTH_FACTOR {
            return Err(Error::HealthFactorTooLow);
        }

        // Transfer asset from pool to borrower
        let token_address = Storage::get_token_contract(env, asset)
            .ok_or(Error::TokenContractNotSet)?;
        let token_client = TokenClient::new(env, &token_address);
        token_client.transfer(&env.current_contract_address(), borrower, &amount);

        // Emit event
        Events::borrow(env, borrower, asset, amount, d_tokens);

        Ok(d_tokens)
    }

    /// Repay debt by burning dTokens
    pub fn repay(
        env: &Env,
        borrower: &Address,
        asset: &Symbol,
        d_tokens: i128,
    ) -> Result<i128, Error> {
        borrower.require_auth();

        assert_with_error!(env, d_tokens > 0, Error::NotPositive);

        // Accrue interest before repay
        Interest::accrue_interest(env, asset)?;

        // Get CDP
        let mut cdp = Storage::get_cdp(env, borrower)
            .ok_or(Error::DebtAssetNotSet)?;

        // Check debt asset matches
        if cdp.debt_asset.as_ref() != Some(asset) {
            return Err(Error::DebtAssetNotSet);
        }

        // Check borrower has enough dTokens
        let borrower_balance = Storage::get_d_token_balance(env, borrower, asset);
        if borrower_balance < d_tokens {
            return Err(Error::InsufficientDTokenBalance);
        }

        // Check that we're not trying to burn more dTokens than the user has in CDP
        let cur_d_tokens = cdp.d_tokens;
        let d_tokens_to_burn = if d_tokens > cur_d_tokens {
            // If trying to burn more than debt, only burn what's owed
            cur_d_tokens
        } else {
            d_tokens
        };

        // Get current dTokenRate (12 decimals)
        let d_token_rate = Storage::get_d_token_rate(env, asset);

        // Calculate amount to repay: dTokens × dTokenRate / SCALAR_12
        let amount = d_tokens_to_burn
            .checked_mul(d_token_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        // Update CDP
        cdp.d_tokens -= d_tokens_to_burn;
        if cdp.d_tokens == 0 {
            cdp.debt_asset = None;
        }
        cdp.last_update = env.ledger().timestamp();
        Storage::set_cdp(env, borrower, &cdp);

        // Update dToken balance
        Storage::set_d_token_balance(env, borrower, asset, borrower_balance - d_tokens_to_burn);

        // Update dToken supply
        let current_supply = Storage::get_d_token_supply(env, asset);
        Storage::set_d_token_supply(env, asset, current_supply - d_tokens_to_burn);

        // Update pool balance
        let pool_balance = Storage::get_pool_balance(env, asset);
        Storage::set_pool_balance(env, asset, pool_balance + amount);

        // Transfer asset from borrower to pool
        let token_address = Storage::get_token_contract(env, asset)
            .ok_or(Error::TokenContractNotSet)?;
        let token_client = TokenClient::new(env, &token_address);
        token_client.transfer(borrower, env.current_contract_address(), &amount);

        // Emit event
        Events::repay(env, borrower, asset, amount, d_tokens_to_burn);

        Ok(amount)
    }

    /// Calculate borrow limit for a borrower
    pub fn calculate_borrow_limit(env: &Env, borrower: &Address) -> Result<i128, Error> {
        // Get all collateral
        let all_collateral = Collateral::get_all_collateral(env, borrower);

        let mut total_collateral_value = 0i128;

        // Iterate through all collateral
        let keys = all_collateral.keys();
        for rwa_token in keys {
            let collateral_amount = all_collateral.get(rwa_token.clone()).unwrap_or(0);
            if collateral_amount == 0 {
                continue;
            }

            // Get RWA token price (includes price decimals from oracle)
            let (rwa_price, price_decimals) = Oracles::get_rwa_price_with_decimals(env, &rwa_token)?;
            // Get token decimals from RWA token contract
            let rwa_token_client = TokenClient::new(env, &rwa_token);
            let rwa_decimals = rwa_token_client.decimals();

            // Calculate collateral value in USD
            let collateral_value = Oracles::calculate_usd_value(
                env,
                collateral_amount,
                rwa_price,
                rwa_decimals,
                price_decimals,
            )?;

            // Get collateral factor (7 decimals)
            let collateral_factor = Admin::get_collateral_factor(env, &rwa_token);

            // Add to total: CollateralValue × CollateralFactor / SCALAR_7
            let factored_value = collateral_value
                .checked_mul(collateral_factor as i128)
                .ok_or(Error::ArithmeticError)?
                .checked_div(SCALAR_7)
                .ok_or(Error::ArithmeticError)?;

            total_collateral_value = total_collateral_value
                .checked_add(factored_value)
                .ok_or(Error::ArithmeticError)?;
        }

        // Get current debt
        let cdp = Storage::get_cdp(env, borrower);
        let current_debt_value = if let Some(cdp) = cdp {
            if let Some(debt_asset) = &cdp.debt_asset {
                if cdp.d_tokens > 0 {
                    let d_token_rate = Storage::get_d_token_rate(env, debt_asset);
                    let debt_amount = cdp.d_tokens
                        .checked_mul(d_token_rate)
                        .ok_or(Error::ArithmeticError)?
                        .checked_div(SCALAR_12)
                        .ok_or(Error::ArithmeticError)?;

                    // Get price of debt asset (includes price decimals from oracle)
                    let (debt_price, price_decimals) = Oracles::get_crypto_price_with_decimals(env, debt_asset)?;
                    // Get asset decimals from token contract
                    let token_address = Storage::get_token_contract(env, debt_asset)
                        .ok_or(Error::TokenContractNotSet)?;
                    let token_client = TokenClient::new(env, &token_address);
                    let asset_decimals = token_client.decimals();

                    // Calculate debt value in USD
                    Oracles::calculate_usd_value(
                        env,
                        debt_amount,
                        debt_price,
                        asset_decimals,
                        price_decimals,
                    )?
                } else {
                    0
                }
            } else {
                0
            }
        } else {
            0
        };

        // Borrow Limit = TotalCollateralValue - CurrentDebtValue
        let borrow_limit = total_collateral_value
            .checked_sub(current_debt_value)
            .ok_or(Error::ArithmeticError)?;

        Ok(borrow_limit.max(0))
    }

    /// Get dToken balance for a borrower
    pub fn get_d_token_balance(env: &Env, borrower: &Address, asset: &Symbol) -> i128 {
        Storage::get_d_token_balance(env, borrower, asset)
    }

    /// Get dTokenRate for an asset (12 decimals)
    pub fn get_d_token_rate(env: &Env, asset: &Symbol) -> i128 {
        Storage::get_d_token_rate(env, asset)
    }
}
