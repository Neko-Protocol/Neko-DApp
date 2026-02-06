//! Bad Debt Auction Module
//!
//! This module handles bad debt auctions.
//! A bad debt auction occurs when:
//! 1. A user's position has been fully liquidated (no more collateral)
//! 2. There is still outstanding debt that needs to be covered
//! 3. The backstop module covers this debt using its reserves
//!
//! The auction allows bidders to purchase backstop tokens at a discount
//! in exchange for covering the bad debt.

use soroban_sdk::{Address, Env, Symbol};

use crate::common::error::Error;
use crate::common::storage::Storage;
use crate::common::types::{AuctionData, AuctionType, SCALAR_12};

/// Bad Debt Auction management
pub struct BadDebt;

impl BadDebt {
    /// Create a bad debt auction for uncovered debt
    ///
    /// # Arguments
    /// * `env` - The environment
    /// * `borrower` - The borrower with bad debt
    /// * `debt_asset` - The asset symbol of the debt
    ///
    /// # Returns
    /// * `Ok(u32)` - The auction ID
    /// * `Err(Error)` - If creation fails
    pub fn create_bad_debt_auction(
        env: &Env,
        borrower: &Address,
        debt_asset: &Symbol,
    ) -> Result<u32, Error> {
        // Get CDP
        let cdp = Storage::get_cdp(env, borrower)
            .ok_or(Error::CDPNotInsolvent)?;

        // Verify this is bad debt (has debt but no collateral)
        if cdp.d_tokens == 0 {
            return Err(Error::AuctionNotActive);
        }

        // Check that collateral is zero or negligible
        let all_collateral = crate::operations::collateral::Collateral::get_all_collateral(env, borrower);
        let mut total_collateral = 0i128;
        for key in all_collateral.keys() {
            total_collateral += all_collateral.get(key).unwrap_or(0);
        }

        if total_collateral > 0 {
            // Still has collateral, should use regular liquidation
            return Err(Error::CDPNotInsolvent);
        }

        // Calculate debt amount (using SCALAR_12 for dToken rate)
        let d_token_rate = Storage::get_d_token_rate(env, debt_asset);
        let debt_amount = cdp.d_tokens
            .checked_mul(d_token_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        // Generate auction ID
        let auction_id = Self::generate_auction_id(env);

        // Create auction data
        let auction_data = AuctionData {
            auction_type: AuctionType::BadDebt,
            user: borrower.clone(),
            bid: soroban_sdk::Map::new(env),    // What bidder pays (backstop tokens)
            lot: soroban_sdk::Map::new(env),     // What bidder receives (nothing for bad debt)
            block: env.ledger().sequence(),
        };

        // Store auction
        let mut storage = Storage::get(env);
        storage.auction_data.set(auction_id, auction_data);
        Storage::set(env, &storage);

        // The backstop will cover this debt
        // In a full implementation, we would:
        // 1. Check if backstop has enough reserves
        // 2. Transfer debt coverage from backstop
        // 3. Update backstop reserves

        // Emit event
        crate::common::events::Events::bad_debt_auction_created(
            env,
            auction_id,
            borrower,
            debt_asset,
            debt_amount,
        );

        Ok(auction_id)
    }

    /// Fill a bad debt auction
    ///
    /// The bidder provides debt asset to cover the bad debt
    /// and receives backstop tokens at a discount
    ///
    /// # Arguments
    /// * `env` - The environment
    /// * `auction_id` - The auction to fill
    /// * `bidder` - The address filling the auction
    /// * `amount` - Amount of debt to cover
    pub fn fill_bad_debt_auction(
        env: &Env,
        auction_id: u32,
        bidder: &Address,
        amount: i128,
    ) -> Result<i128, Error> {
        bidder.require_auth();

        let mut storage = Storage::get(env);
        let auction = storage
            .auction_data
            .get(auction_id)
            .ok_or(Error::AuctionNotFound)?;

        // Verify auction type
        if auction.auction_type != AuctionType::BadDebt {
            return Err(Error::AuctionNotActive);
        }

        // Calculate how many blocks have passed
        let blocks_elapsed = env.ledger().sequence() - auction.block;

        // Calculate lot and bid modifiers (following Blend pattern)
        let (lot_modifier, bid_modifier) = Self::calculate_modifiers(blocks_elapsed);

        // Calculate backstop tokens to give (lot)
        // Starts at 0% and increases to 100% over auction duration
        let backstop_tokens = amount
            .checked_mul(lot_modifier)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        // Calculate debt to actually cover (bid)
        // Starts at 100% and decreases over auction duration
        let debt_to_cover = amount
            .checked_mul(bid_modifier)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        // Get CDP and update debt
        let mut cdp = Storage::get_cdp(env, &auction.user)
            .ok_or(Error::CDPNotInsolvent)?;

        // Clone debt_asset to avoid borrow conflict
        let debt_asset = cdp.debt_asset.clone();

        if let Some(asset) = debt_asset {
            // Calculate dTokens to burn
            let d_token_rate = Storage::get_d_token_rate(env, &asset);
            let d_tokens_to_burn = debt_to_cover
                .checked_mul(SCALAR_12)
                .ok_or(Error::ArithmeticError)?
                .checked_div(d_token_rate)
                .ok_or(Error::ArithmeticError)?;

            // Update CDP
            cdp.d_tokens = cdp.d_tokens.saturating_sub(d_tokens_to_burn);
            if cdp.d_tokens == 0 {
                cdp.debt_asset = None;
            }
            cdp.last_update = env.ledger().timestamp();
            Storage::set_cdp(env, &auction.user, &cdp);

            // Transfer backstop tokens to bidder (if any)
            if backstop_tokens > 0 {
                // In a full implementation, transfer from backstop to bidder
                let backstop_total = storage.backstop_total;
                storage.backstop_total = backstop_total.saturating_sub(backstop_tokens);
            }

            // Update pool balance with repaid debt
            let pool_balance = Storage::get_pool_balance(env, &asset);
            Storage::set_pool_balance(env, &asset, pool_balance + debt_to_cover);
        }

        // Remove auction if debt is fully covered
        if cdp.d_tokens == 0 {
            storage.auction_data.remove(auction_id);
        }

        Storage::set(env, &storage);

        // Emit event
        crate::common::events::Events::bad_debt_auction_filled(
            env,
            auction_id,
            bidder,
            debt_to_cover,
            backstop_tokens,
        );

        Ok(backstop_tokens)
    }

    /// Calculate auction modifiers based on blocks elapsed
    /// Following the Blend Dutch auction pattern:
    /// - Lot modifier: 0 → SCALAR_12 (0% to 100%)
    /// - Bid modifier: SCALAR_12 → 0 (100% to 0%)
    fn calculate_modifiers(blocks_elapsed: u32) -> (i128, i128) {
        // Auction duration: 400 blocks (same as liquidation auctions)
        const AUCTION_DURATION: u32 = 400;

        if blocks_elapsed >= AUCTION_DURATION {
            // Auction complete: 100% lot, 0% bid
            return (SCALAR_12, 0);
        }

        // Linear interpolation
        let progress = (blocks_elapsed as i128 * SCALAR_12) / AUCTION_DURATION as i128;

        // Lot modifier increases from 0 to SCALAR_12
        let lot_modifier = progress;

        // Bid modifier decreases from SCALAR_12 to 0
        let bid_modifier = SCALAR_12 - progress;

        (lot_modifier, bid_modifier)
    }

    /// Generate unique auction ID
    fn generate_auction_id(env: &Env) -> u32 {
        let sequence = env.ledger().sequence();
        let timestamp = env.ledger().timestamp() as u32;
        sequence.wrapping_add(timestamp)
    }

    /// Check if a position has bad debt (debt but no collateral)
    pub fn has_bad_debt(env: &Env, borrower: &Address) -> bool {
        let cdp = match Storage::get_cdp(env, borrower) {
            Some(cdp) => cdp,
            None => return false,
        };

        if cdp.d_tokens == 0 {
            return false;
        }

        // Check total collateral value
        let all_collateral = crate::operations::collateral::Collateral::get_all_collateral(env, borrower);
        for key in all_collateral.keys() {
            if all_collateral.get(key).unwrap_or(0) > 0 {
                return false;
            }
        }

        true
    }
}

#[allow(dead_code)]
/// Constants for bad debt auctions
mod constants {
    /// Duration of bad debt auction in blocks
    pub const BAD_DEBT_AUCTION_DURATION: u32 = 400;

    /// Minimum percentage of debt that must be covered (7 decimals)
    pub const MIN_FILL_PERCENT: i128 = 1_000_000; // 10%
}
