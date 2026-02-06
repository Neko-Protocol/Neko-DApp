use soroban_sdk::{assert_with_error, Address, Env, token::TokenClient};

use crate::admin::Admin;
use crate::common::error::Error;
use crate::common::events::Events;
use crate::common::storage::Storage;
use crate::common::types::{MIN_HEALTH_FACTOR, SCALAR_12};
use crate::operations::borrowing::Borrowing;
use crate::operations::oracles::Oracles;

/// Collateral management for RWA tokens
pub struct Collateral;

impl Collateral {
    /// Add RWA token collateral to a borrower's CDP
    pub fn add_collateral(
        env: &Env,
        borrower: &Address,
        rwa_token: &Address,
        amount: i128,
    ) -> Result<(), Error> {
        borrower.require_auth();

        assert_with_error!(env, amount > 0, Error::NotPositive);

        // Verify collateral factor is set for this RWA token
        let collateral_factor = Admin::get_collateral_factor(env, rwa_token);
        if collateral_factor == 0 {
            return Err(Error::CollateralNotFound);
        }

        // Transfer RWA tokens from borrower to contract
        // Since borrower is already authenticated (via require_auth), we can use transfer directly
        let token_client = TokenClient::new(env, rwa_token);
        let contract_address = env.current_contract_address();
        token_client.transfer(borrower, &contract_address, &amount);

        // Update collateral balance
        let current_collateral = Storage::get_collateral(env, borrower, rwa_token);
        Storage::set_collateral(env, borrower, rwa_token, current_collateral + amount);

        // Update CDP
        let mut cdp = Storage::get_cdp(env, borrower).unwrap_or_else(|| {
            crate::common::types::CDP {
                collateral: soroban_sdk::Map::new(env),
                debt_asset: None,
                d_tokens: 0,
                created_at: env.ledger().timestamp(),
                last_update: env.ledger().timestamp(),
            }
        });

        // Update collateral in CDP
        cdp.collateral.set(rwa_token.clone(), current_collateral + amount);
        cdp.last_update = env.ledger().timestamp();
        Storage::set_cdp(env, borrower, &cdp);

        // Emit event
        Events::add_collateral(env, borrower, rwa_token, amount);

        Ok(())
    }

    /// Remove RWA token collateral from a borrower's CDP
    pub fn remove_collateral(
        env: &Env,
        borrower: &Address,
        rwa_token: &Address,
        amount: i128,
    ) -> Result<(), Error> {
        borrower.require_auth();

        assert_with_error!(env, amount > 0, Error::NotPositive);

        // Get current collateral
        let current_collateral = Storage::get_collateral(env, borrower, rwa_token);
        if current_collateral < amount {
            return Err(Error::InsufficientCollateral);
        }

        // Check borrow limit after removal
        // If borrower has debt, verify they remain properly collateralized
        let cdp = Storage::get_cdp(env, borrower);
        if let Some(cdp) = &cdp
            && cdp.d_tokens > 0 {
                // Calculate borrow limit with reduced collateral
                let new_collateral = current_collateral - amount;
                Storage::set_collateral(env, borrower, rwa_token, new_collateral);
                
                // Temporarily update CDP to calculate new borrow limit
                let mut temp_cdp = cdp.clone();
                temp_cdp.collateral.set(rwa_token.clone(), new_collateral);
                Storage::set_cdp(env, borrower, &temp_cdp);
                
                // Calculate borrow limit with new collateral
                let borrow_limit = Borrowing::calculate_borrow_limit(env, borrower)?;
                
                // Get current debt value
                if let Some(debt_asset) = &cdp.debt_asset {
                    let d_token_rate = Storage::get_d_token_rate(env, debt_asset);
                    let debt_amount = cdp.d_tokens
                        .checked_mul(d_token_rate)
                        .ok_or(Error::ArithmeticError)?
                        .checked_div(SCALAR_12)
                        .ok_or(Error::ArithmeticError)?;
                    
                    // Get price of debt asset
                    let (debt_price, debt_decimals) = Oracles::get_crypto_price_with_decimals(env, debt_asset)?;
                    let price_decimals = 7;
                    let current_debt_value = Oracles::calculate_usd_value(
                        env,
                        debt_amount,
                        debt_price,
                        debt_decimals,
                        price_decimals,
                    )?;
                    
                    // Restore original CDP
                    Storage::set_cdp(env, borrower, cdp);
                    Storage::set_collateral(env, borrower, rwa_token, current_collateral);
                    
                    // Check if removal would make borrower undercollateralized
                    if current_debt_value > borrow_limit {
                        return Err(Error::InsufficientBorrowLimit);
                    }

                    // Verify health factor remains above minimum threshold after removal (7 decimals)
                    // This ensures the borrower maintains a safety margin above liquidation threshold
                    let health_factor = crate::operations::liquidations::Liquidations::calculate_health_factor(env, borrower)?;
                    if (health_factor as i128) < MIN_HEALTH_FACTOR {
                        return Err(Error::HealthFactorTooLow);
                    }
                } else {
                    // Restore original CDP
                    Storage::set_cdp(env, borrower, cdp);
                    Storage::set_collateral(env, borrower, rwa_token, current_collateral);
                }
            }

        // Update collateral balance
        Storage::set_collateral(env, borrower, rwa_token, current_collateral - amount);

        // Update CDP
        if let Some(mut cdp) = Storage::get_cdp(env, borrower) {
            cdp.collateral.set(rwa_token.clone(), current_collateral - amount);
            cdp.last_update = env.ledger().timestamp();
            Storage::set_cdp(env, borrower, &cdp);
        }

        // Transfer RWA tokens from contract to borrower
        let token_client = TokenClient::new(env, rwa_token);
        token_client.transfer(&env.current_contract_address(), borrower, &amount);

        // Emit event
        Events::remove_collateral(env, borrower, rwa_token, amount);

        Ok(())
    }

    /// Get collateral amount for a borrower and RWA token
    pub fn get_collateral(env: &Env, borrower: &Address, rwa_token: &Address) -> i128 {
        Storage::get_collateral(env, borrower, rwa_token)
    }

    /// Get all collateral for a borrower
    pub fn get_all_collateral(env: &Env, borrower: &Address) -> soroban_sdk::Map<Address, i128> {
        let storage = Storage::get(env);
        storage
            .collateral
            .get(borrower.clone())
            .unwrap_or(soroban_sdk::Map::new(env))
    }
}

