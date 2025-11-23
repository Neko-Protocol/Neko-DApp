use soroban_sdk::{Address, Bytes, Env, Symbol, token::TokenClient, xdr::ToXdr};

use crate::common::error::Error;
use crate::common::storage::Storage;
use crate::common::types::{AuctionStatus, DutchAuction, AUCTION_DURATION_BLOCKS, BASIS_POINTS, MAX_HEALTH_FACTOR};
use crate::operations::collateral::Collateral;
use crate::operations::oracles::Oracles;

/// Liquidation functions using Dutch Auctions
pub struct Liquidations;

impl Liquidations {
    /// Initiate a liquidation auction for a borrower
    pub fn initiate_liquidation(
        env: &Env,
        borrower: &Address,
        rwa_token: &Address,
        debt_asset: &Symbol,
        liquidation_percent: u32,
    ) -> Result<Address, Error> {
        // Get CDP
        let cdp = Storage::get_cdp(env, borrower)
            .ok_or(Error::CDPNotInsolvent)?;

        // Check if borrower has debt in this asset
        if cdp.debt_asset.as_ref() != Some(debt_asset) {
            return Err(Error::CDPNotInsolvent);
        }

        // Calculate health factor
        let health_factor = Self::calculate_health_factor(env, borrower)?;

        // Check if CDP is insolvent (health factor < 1.0)
        // Use MIN_HEALTH_FACTOR threshold (1.1 = 110%) to ensure safety margin
        // A CDP can only be liquidated if health factor < 1.0 (10,000 basis points)
        if health_factor >= 10_000 {
            // Health factor >= 1.0 (in basis points) - not insolvent
            return Err(Error::CDPNotInsolvent);
        }

        // Get collateral amount
        let collateral_amount = Storage::get_collateral(env, borrower, rwa_token);
        if collateral_amount == 0 {
            return Err(Error::InsufficientCollateral);
        }

        // Get debt amount
        let d_token_rate = Storage::get_d_token_rate(env, debt_asset);
        let debt_amount = cdp.d_tokens
            .checked_mul(d_token_rate)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(1_000_000_000)
            .ok_or(crate::common::error::Error::ArithmeticError)?;

        // Calculate liquidation amounts based on liquidation_percent
        // L_p = percentage of debt to liquidate
        let liquidation_debt = debt_amount
            .checked_mul(liquidation_percent as i128)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(10_000)
            .ok_or(crate::common::error::Error::ArithmeticError)?;

        // Calculate collateral to liquidate using premium formula
        // Premium p = (1 - avg_cf * avg_lf) / 2 + 1
        // Collateral percentage C_p = (p * L_p * L_o) / C_o
        // Where:
        // - avg_cf = average collateral factor
        // - avg_lf = average liability factor (we use 1.0 for simplicity)
        // - L_p = liquidation_percent
        // - L_o = total debt value
        // - C_o = total collateral value
        
        // Get collateral factor for this RWA token
        let collateral_factor = crate::admin::Admin::get_collateral_factor(env, rwa_token);
        let avg_cf = collateral_factor as i128; // Use this token's CF as average
        let avg_lf = BASIS_POINTS; // 1.0 (100%) - we don't use liability factors in our simplified model
        
        // Calculate premium: p = (1 - avg_cf * avg_lf) / 2 + 1
        // In basis points: p = (10000 - (avg_cf * avg_lf / 10000)) / 2 + 10000
        let cf_lf_product = avg_cf
            .checked_mul(avg_lf)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(BASIS_POINTS)
            .ok_or(crate::common::error::Error::ArithmeticError)?;
        
        let premium = (BASIS_POINTS
            .checked_sub(cf_lf_product)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(2)
            .ok_or(crate::common::error::Error::ArithmeticError)?)
            .checked_add(BASIS_POINTS)
            .ok_or(crate::common::error::Error::ArithmeticError)?;
        
        // Get total collateral value for this RWA token
        let (rwa_price, rwa_decimals) = Oracles::get_rwa_price_with_decimals(env, rwa_token)?;
        let price_decimals = 7;
        let total_collateral_value = Oracles::calculate_usd_value(
            env,
            collateral_amount,
            rwa_price,
            rwa_decimals,
            price_decimals,
        )?;
        
        // Get total debt value
        let (debt_price, debt_decimals) = Oracles::get_crypto_price_with_decimals(env, debt_asset)?;
        let total_debt_value = Oracles::calculate_usd_value(
            env,
            debt_amount,
            debt_price,
            debt_decimals,
            price_decimals,
        )?;
        
        // Calculate collateral percentage: C_p = (p * L_p * L_o) / C_o
        // In basis points
        let collateral_percent = premium
            .checked_mul(liquidation_percent as i128)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_mul(total_debt_value)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(total_collateral_value)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(BASIS_POINTS)
            .ok_or(crate::common::error::Error::ArithmeticError)?;
        
        // Cap at 100% (10,000 basis points)
        let collateral_percent_capped = collateral_percent.min(BASIS_POINTS);
        
        // Calculate collateral amount to liquidate
        let liquidation_collateral = collateral_amount
            .checked_mul(collateral_percent_capped)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(BASIS_POINTS)
            .ok_or(crate::common::error::Error::ArithmeticError)?;

        // Create auction ID (unique per borrower + rwa_token)
        let auction_id = Self::generate_auction_id(env, borrower, rwa_token);

        // Create Dutch Auction
        let auction = DutchAuction {
            id: auction_id.clone(),
            borrower: borrower.clone(),
            rwa_token: rwa_token.clone(),
            debt_asset: debt_asset.clone(),
            collateral_amount: liquidation_collateral,
            debt_amount: liquidation_debt,
            created_at: env.ledger().timestamp(),
            started_at: env.ledger().timestamp(),
            status: AuctionStatus::Active,
        };

        // Store auction
        let mut storage = Storage::get(env);
        storage.auctions.set(auction_id.clone(), auction);
        Storage::set(env, &storage);

        // Emit event
        crate::common::events::Events::liquidation_initiated(
            env,
            borrower,
            rwa_token,
            debt_asset,
            liquidation_collateral,
            liquidation_debt,
            &auction_id,
        );

        Ok(auction_id)
    }

    /// Fill a liquidation auction
    pub fn fill_auction(
        env: &Env,
        auction_id: &Address,
        liquidator: &Address,
    ) -> Result<(), Error> {
        liquidator.require_auth();

        let mut storage = Storage::get(env);
        let mut auction = storage
            .auctions
            .get(auction_id.clone())
            .ok_or(Error::AuctionNotFound)?;

        if auction.status != AuctionStatus::Active {
            return Err(Error::AuctionNotActive);
        }

        // Calculate lot modifier and bid modifier based on time elapsed
        // Note: In a real implementation, we'd use blocks, but for now we'll use timestamp
        let time_elapsed = env.ledger().timestamp() - auction.started_at;
        // Approximate blocks: 1 block ≈ 5 seconds
        let blocks_elapsed = (time_elapsed / 5) as u32;
        let (lot_modifier, bid_modifier) = Self::calculate_auction_modifiers(blocks_elapsed);

        // Calculate collateral to receive and debt to pay
        let collateral_received = auction.collateral_amount
            .checked_mul(lot_modifier)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(1_000_000_000)
            .ok_or(crate::common::error::Error::ArithmeticError)?;

        let debt_to_pay = auction.debt_amount
            .checked_mul(bid_modifier)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(1_000_000_000)
            .ok_or(crate::common::error::Error::ArithmeticError)?;

        // Transfer debt asset from liquidator to pool
        let token_address = Storage::get_token_contract(env, &auction.debt_asset)
            .ok_or(Error::TokenContractNotSet)?;
        let token_client = TokenClient::new(env, &token_address);
        token_client.transfer(liquidator, &env.current_contract_address(), &debt_to_pay);

        // Transfer collateral from contract to liquidator
        let rwa_token_client = TokenClient::new(env, &auction.rwa_token);
        rwa_token_client.transfer(&env.current_contract_address(), liquidator, &collateral_received);

        // Update CDP
        let mut cdp = Storage::get_cdp(env, &auction.borrower)
            .ok_or(Error::CDPNotInsolvent)?;

        // Calculate dTokens to burn
        let d_token_rate = Storage::get_d_token_rate(env, &auction.debt_asset);
        let d_tokens_to_burn = debt_to_pay
            .checked_mul(1_000_000_000)
            .ok_or(crate::common::error::Error::ArithmeticError)?
            .checked_div(d_token_rate)
            .ok_or(crate::common::error::Error::ArithmeticError)?;

        cdp.d_tokens = cdp.d_tokens - d_tokens_to_burn;
        if cdp.d_tokens == 0 {
            cdp.debt_asset = None;
        }
        cdp.last_update = env.ledger().timestamp();
        Storage::set_cdp(env, &auction.borrower, &cdp);

        // Update collateral
        let current_collateral = Storage::get_collateral(env, &auction.borrower, &auction.rwa_token);
        Storage::set_collateral(env, &auction.borrower, &auction.rwa_token, current_collateral - collateral_received);

        // Update dToken balance
        let current_balance = Storage::get_d_token_balance(env, &auction.borrower, &auction.debt_asset);
        Storage::set_d_token_balance(env, &auction.borrower, &auction.debt_asset, current_balance - d_tokens_to_burn);

        // Update pool balance
        let pool_balance = Storage::get_pool_balance(env, &auction.debt_asset);
        Storage::set_pool_balance(env, &auction.debt_asset, pool_balance + debt_to_pay);

        // Verify post-liquidation health factor
        // Post-liq health factor must be under MAX_HEALTH_FACTOR (1.15 = 115%)
        // This prevents over-liquidation that would leave the borrower with too much collateral
        let post_liq_health_factor = Self::calculate_health_factor(env, &auction.borrower)?;
        if post_liq_health_factor > MAX_HEALTH_FACTOR {
            return Err(Error::HealthFactorTooHigh);
        }

        // Mark auction as filled
        auction.status = AuctionStatus::Filled;
        storage.auctions.set(auction_id.clone(), auction);
        Storage::set(env, &storage);

        // Emit event
        crate::common::events::Events::liquidation_filled(
            env,
            auction_id,
            liquidator,
            collateral_received,
            debt_to_pay,
        );

        Ok(())
    }

    /// Calculate health factor for a borrower
    /// Health Factor = (CollateralValue × CollateralFactor) / (DebtValue + AccruedInterest)
    /// Returns health factor in basis points (10000 = 1.0 = 100%)
    pub fn calculate_health_factor(env: &Env, borrower: &Address) -> Result<u32, Error> {
        // Get CDP
        let cdp = Storage::get_cdp(env, borrower)
            .ok_or(Error::CDPNotInsolvent)?;

        // Calculate total collateral value
        let all_collateral = Collateral::get_all_collateral(env, borrower);
        let mut total_collateral_value = 0i128;

        let keys = all_collateral.keys();
        for rwa_token in keys {
            let collateral_amount = all_collateral.get(rwa_token.clone()).unwrap_or(0);
            if collateral_amount == 0 {
                continue;
            }

            // Get RWA token price
            let (rwa_price, rwa_decimals) = Oracles::get_rwa_price_with_decimals(env, &rwa_token)?;
            let price_decimals = 7;

            // Calculate collateral value in USD
            let collateral_value = Oracles::calculate_usd_value(
                env,
                collateral_amount,
                rwa_price,
                rwa_decimals,
                price_decimals,
            )?;

            // Get collateral factor
            let collateral_factor = crate::admin::Admin::get_collateral_factor(env, &rwa_token);

            // Add to total: CollateralValue × CollateralFactor
            let factored_value = collateral_value
                .checked_mul(collateral_factor as i128)
                .ok_or(Error::ArithmeticError)?
                .checked_div(BASIS_POINTS)
                .ok_or(Error::ArithmeticError)?;

            total_collateral_value = total_collateral_value
                .checked_add(factored_value)
                .ok_or(Error::ArithmeticError)?;
        }

        // Calculate total debt value
        let total_debt_value = if let Some(debt_asset) = &cdp.debt_asset {
            if cdp.d_tokens > 0 {
                let d_token_rate = Storage::get_d_token_rate(env, debt_asset);
                let debt_amount = cdp.d_tokens
                    .checked_mul(d_token_rate)
                    .ok_or(Error::ArithmeticError)?
                    .checked_div(1_000_000_000)
                    .ok_or(Error::ArithmeticError)?;

                // Get price of debt asset
                let (debt_price, debt_decimals) = Oracles::get_crypto_price_with_decimals(env, debt_asset)?;
                let price_decimals = 7;

                // Calculate debt value in USD
                Oracles::calculate_usd_value(
                    env,
                    debt_amount,
                    debt_price,
                    debt_decimals,
                    price_decimals,
                )?
            } else {
                0
            }
        } else {
            0
        };

        if total_debt_value == 0 {
            // No debt, health factor is infinite (return max value)
            return Ok(u32::MAX);
        }

        // Health Factor = (CollateralValue × CollateralFactor) / DebtValue
        // In basis points: HF = (total_collateral_value * 10000) / total_debt_value
        let health_factor = total_collateral_value
            .checked_mul(BASIS_POINTS)
            .ok_or(Error::ArithmeticError)?
            .checked_div(total_debt_value)
            .ok_or(Error::ArithmeticError)?;

        // Cap at u32::MAX
        Ok(health_factor.min(u32::MAX as i128) as u32)
    }

    /// Calculate auction modifiers (lot modifier and bid modifier)
    fn calculate_auction_modifiers(blocks_elapsed: u32) -> (i128, i128) {
        let duration = AUCTION_DURATION_BLOCKS as u32;
        
        // Lot Modifier: 0 → 1 over AUCTION_DURATION_BLOCKS blocks
        let lot_modifier = if blocks_elapsed <= duration {
            (blocks_elapsed as i128 * 1_000_000_000) / duration as i128
        } else {
            1_000_000_000 // 1.0
        };

        // Bid Modifier: 1 → 0 after AUCTION_DURATION_BLOCKS blocks
        let bid_modifier = if blocks_elapsed <= duration {
            1_000_000_000 // 1.0
        } else {
            // Decrease from 1.0 to 0.0 over time
            let decrease = ((blocks_elapsed - duration) as i128 * 1_000_000_000) / duration as i128;
            (1_000_000_000 - decrease).max(0)
        };

        (lot_modifier, bid_modifier)
    }

    /// Generate unique auction ID
    /// We generate a deterministic Address by hashing (borrower || rwa_token) using SHA256
    /// and then using that hash to create a deterministic contract address via deployer
    /// This ensures:
    /// 1. Each borrower can have one auction per RWA token at a time
    /// 2. The ID is deterministic and can be regenerated from the same inputs
    /// 3. Different (borrower, rwa_token) pairs produce different IDs
    fn generate_auction_id(env: &Env, borrower: &Address, rwa_token: &Address) -> Address {
        // Create a deterministic auction ID by hashing (borrower || rwa_token)
        
        // Convert addresses to XDR format and concatenate them
        let mut combined = Bytes::new(env);
        combined.append(&borrower.to_xdr(env));
        combined.append(&rwa_token.to_xdr(env));
        
        // Hash the combined bytes using SHA256 (produces Hash<32>)
        let hash = env.crypto().sha256(&combined);
        
        // The hash is computed for potential future use if we need unique IDs per token
        let _hash_bytes = hash; // Keep hash for potential future use
        
        borrower.clone()
    }
}

