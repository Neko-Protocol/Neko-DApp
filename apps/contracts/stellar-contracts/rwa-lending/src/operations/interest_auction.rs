//! Interest Auction Module
//!
//! This module handles interest auctions.
//! An interest auction occurs when:
//! 1. The protocol has accumulated interest from borrowers
//! 2. A portion of this interest (backstop_credit) is auctioned off
//! 3. Bidders pay backstop tokens to receive the interest
//!
//! This mechanism allows the protocol to distribute accrued interest
//! to backstop token holders while maintaining liquidity.

use soroban_sdk::{Address, Env, Symbol, token::TokenClient};

use crate::common::error::Error;
use crate::common::storage::Storage;
use crate::common::types::{AuctionData, AuctionType, SCALAR_7, SCALAR_12};

/// Interest Auction management
pub struct InterestAuction;

impl InterestAuction {
    /// Create an interest auction for accumulated protocol interest
    ///
    /// # Arguments
    /// * `env` - The environment
    /// * `asset` - The asset symbol to auction interest for
    ///
    /// # Returns
    /// * `Ok(u32)` - The auction ID
    /// * `Err(Error)` - If creation fails
    pub fn create_interest_auction(env: &Env, asset: &Symbol) -> Result<u32, Error> {
        // Get reserve data
        let reserve_data = Storage::get_reserve_data(env, asset);

        // Check if there's enough backstop_credit to auction
        // Minimum 100 units (with asset decimals)
        let min_auction_amount = 100_0000000i128; // 100 with 7 decimals
        if reserve_data.backstop_credit < min_auction_amount {
            return Err(Error::AuctionNotActive);
        }

        // Get token address for the asset
        let token_address =
            Storage::get_token_contract(env, asset).ok_or(Error::TokenContractNotSet)?;

        // Generate auction ID
        let auction_id = Self::generate_auction_id(env);

        // Create auction data
        // The "lot" is the interest (backstop_credit) - keyed by token address
        // The "bid" is backstop tokens
        let mut lot = soroban_sdk::Map::new(env);
        lot.set(token_address, reserve_data.backstop_credit);

        let auction_data = AuctionData {
            auction_type: AuctionType::Interest,
            user: env.current_contract_address(), // Protocol is the "user"
            bid: soroban_sdk::Map::new(env),      // Will be filled by bidders
            lot,
            block: env.ledger().sequence(),
        };

        // Store auction
        let mut storage = Storage::get(env);
        storage.auction_data.set(auction_id, auction_data);
        Storage::set(env, &storage);

        // Emit event
        crate::common::events::Events::interest_auction_created(
            env,
            auction_id,
            asset,
            reserve_data.backstop_credit,
        );

        Ok(auction_id)
    }

    /// Fill an interest auction
    ///
    /// The bidder provides backstop tokens and receives protocol interest
    ///
    /// # Arguments
    /// * `env` - The environment
    /// * `auction_id` - The auction to fill
    /// * `bidder` - The address filling the auction
    /// * `asset` - The asset symbol being auctioned
    /// * `fill_percent` - Percentage of auction to fill (7 decimals, max SCALAR_7)
    pub fn fill_interest_auction(
        env: &Env,
        auction_id: u32,
        bidder: &Address,
        asset: &Symbol,
        fill_percent: i128,
    ) -> Result<(i128, i128), Error> {
        bidder.require_auth();

        // Validate fill percentage
        if fill_percent <= 0 || fill_percent > SCALAR_7 {
            return Err(Error::InvalidFillPercent);
        }

        let mut storage = Storage::get(env);
        let auction = storage
            .auction_data
            .get(auction_id)
            .ok_or(Error::AuctionNotFound)?;

        // Verify auction type
        if auction.auction_type != AuctionType::Interest {
            return Err(Error::AuctionNotActive);
        }

        // Calculate how many blocks have passed
        let blocks_elapsed = env.ledger().sequence() - auction.block;

        // Calculate lot and bid modifiers (following Blend pattern)
        let (lot_modifier, bid_modifier) = Self::calculate_modifiers(blocks_elapsed);

        // Get token address for the asset
        let token_address =
            Storage::get_token_contract(env, asset).ok_or(Error::TokenContractNotSet)?;

        // Get total interest from lot map (keyed by token address)
        let total_interest = auction.lot.get(token_address.clone()).unwrap_or(0);
        if total_interest == 0 {
            return Err(Error::AuctionNotActive);
        }

        // Calculate interest to receive based on fill percent
        let interest_to_receive = total_interest
            .checked_mul(fill_percent)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_7)
            .ok_or(Error::ArithmeticError)?
            .checked_mul(lot_modifier)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        // Calculate backstop tokens to pay
        // At start: pay 100% of interest value in backstop tokens
        // As time passes: pay less backstop tokens for same interest
        let backstop_to_pay = interest_to_receive
            .checked_mul(bid_modifier)
            .ok_or(Error::ArithmeticError)?
            .checked_div(SCALAR_12)
            .ok_or(Error::ArithmeticError)?;

        // Transfer backstop tokens from bidder to protocol
        if backstop_to_pay > 0 {
            if let Some(backstop_token) = &storage.backstop_token {
                let backstop_client = TokenClient::new(env, backstop_token);
                backstop_client.transfer(bidder, env.current_contract_address(), &backstop_to_pay);
            }
            storage.backstop_total += backstop_to_pay;
        }

        // Transfer interest to bidder
        if interest_to_receive > 0 {
            let token_client = TokenClient::new(env, &token_address);
            token_client.transfer(
                &env.current_contract_address(),
                bidder,
                &interest_to_receive,
            );

            // Update reserve data to reduce backstop_credit
            let mut reserve_data = Storage::get_reserve_data(env, asset);
            reserve_data.backstop_credit = reserve_data
                .backstop_credit
                .saturating_sub(interest_to_receive);
            Storage::set_reserve_data(env, asset, &reserve_data);
        }

        // Update auction lot
        let remaining_interest = total_interest - interest_to_receive;
        if remaining_interest <= 0 {
            // Auction complete
            storage.auction_data.remove(auction_id);
        } else {
            // Update remaining lot
            let mut updated_auction = auction.clone();
            updated_auction.lot.set(token_address, remaining_interest);
            storage.auction_data.set(auction_id, updated_auction);
        }

        Storage::set(env, &storage);

        // Emit event
        crate::common::events::Events::interest_auction_filled(
            env,
            auction_id,
            bidder,
            asset,
            interest_to_receive,
            backstop_to_pay,
        );

        Ok((interest_to_receive, backstop_to_pay))
    }

    /// Calculate auction modifiers based on blocks elapsed
    /// Following the Blend Dutch auction pattern:
    /// - Lot modifier: SCALAR_12 → SCALAR_12 (stays at 100%)
    /// - Bid modifier: SCALAR_12 → 0 (100% to 0%)
    ///
    /// For interest auctions, the lot stays constant but the bid decreases
    fn calculate_modifiers(blocks_elapsed: u32) -> (i128, i128) {
        // Auction duration: 200 blocks (shorter than liquidation)
        const AUCTION_DURATION: u32 = 200;

        if blocks_elapsed >= AUCTION_DURATION {
            // Auction complete: 100% lot, 0% bid
            return (SCALAR_12, 0);
        }

        // Linear interpolation for bid
        let progress = (blocks_elapsed as i128 * SCALAR_12) / AUCTION_DURATION as i128;

        // Lot modifier stays at 100%
        let lot_modifier = SCALAR_12;

        // Bid modifier decreases from SCALAR_12 to 0
        let bid_modifier = SCALAR_12 - progress;

        (lot_modifier, bid_modifier)
    }

    /// Generate unique auction ID
    fn generate_auction_id(env: &Env) -> u32 {
        let sequence = env.ledger().sequence();
        let timestamp = env.ledger().timestamp() as u32;
        // Add offset to avoid collision with bad debt auctions
        sequence.wrapping_add(timestamp).wrapping_add(1000)
    }

    /// Get accumulated interest (backstop_credit) for an asset
    pub fn get_accumulated_interest(env: &Env, asset: &Symbol) -> i128 {
        let reserve_data = Storage::get_reserve_data(env, asset);
        reserve_data.backstop_credit
    }

    /// Check if an interest auction can be created for an asset
    pub fn can_create_auction(env: &Env, asset: &Symbol) -> bool {
        let reserve_data = Storage::get_reserve_data(env, asset);
        let min_auction_amount = 100_0000000i128;
        reserve_data.backstop_credit >= min_auction_amount
    }
}

#[allow(dead_code)]
/// Constants for interest auctions
mod constants {
    /// Duration of interest auction in blocks
    pub const INTEREST_AUCTION_DURATION: u32 = 200;

    /// Minimum interest amount to start an auction (7 decimals)
    pub const MIN_INTEREST_AMOUNT: i128 = 100_0000000;

    /// Minimum fill percentage (7 decimals)
    pub const MIN_FILL_PERCENT: i128 = 500_000; // 5%
}
