use soroban_sdk::{contracttype, Address, Map, Symbol};

// Pool state
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PoolState {
    Active,   // All operations enabled
    OnIce,    // Only borrowing disabled
    Frozen,   // Both borrowing and depositing disabled
}

// Interest rate parameters
#[contracttype]
#[derive(Clone, Debug)]
pub struct InterestRateParams {
    pub target_utilization: u32,  // In basis points (e.g., 7500 = 75%)
    pub base_rate: u32,            // In basis points (e.g., 100 = 1%)
    pub slope_1: u32,              // In basis points (e.g., 500 = 5%)
    pub slope_2: u32,              // In basis points (e.g., 2000 = 20%)
    pub slope_3: u32,              // In basis points (e.g., 10000 = 100%)
    pub reactivity_constant: u32,  // In basis points (e.g., 1 = 0.01%)
}

// CDP structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct CDP {
    // Collateral (RWA tokens)
    pub collateral: Map<Address, i128>,  // RWA token address -> amount

    // Debt (single asset only)
    pub debt_asset: Option<Symbol>,      // Only one: USDC, XLM, etc.
    pub d_tokens: i128,                  // dTokens of the borrowed asset

    // Metadata
    pub created_at: u64,
    pub last_update: u64,
}

// Dutch Auction structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct DutchAuction {
    pub id: Address,                     // Unique ID (borrower + rwa_token)
    pub borrower: Address,
    pub rwa_token: Address,
    pub debt_asset: Symbol,
    pub collateral_amount: i128,
    pub debt_amount: i128,
    pub created_at: u64,
    pub started_at: u64,
    pub status: AuctionStatus,
}

// Auction status
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AuctionStatus {
    Active,
    Filled,
    Cancelled,
}

// Backstop deposit
#[contracttype]
#[derive(Clone, Debug)]
pub struct BackstopDeposit {
    pub amount: i128,                    // LP tokens or native tokens
    pub deposited_at: u64,
    pub in_withdrawal_queue: bool,
    pub queued_at: Option<u64>,
}

// Withdrawal request
#[contracttype]
#[derive(Clone, Debug)]
pub struct WithdrawalRequest {
    pub address: Address,
    pub amount: i128,
    pub queued_at: u64,
}

// Price data from oracle (compatible with SEP-40)
#[contracttype]
#[derive(Clone, Debug)]
pub struct PriceData {
    pub price: i128,
    pub timestamp: u64,
}

// Constants
pub const BASIS_POINTS: i128 = 10_000;
pub const SECONDS_PER_YEAR: u64 = 31_536_000;  // 365 days
pub const SCALAR_9: i128 = 1_000_000_000; // 9 decimals (same as our token rates)

/// Helper functions for rounding
pub mod rounding {
    use super::SCALAR_9;
    use crate::common::error::Error;

    /// Convert asset amount to bTokens with rounding down (floor)
    /// Used when depositing: favors the protocol (mints fewer bTokens)
    pub fn to_b_token_down(amount: i128, b_rate: i128) -> Result<i128, Error> {
        // floor: (amount * SCALAR) / b_rate
        amount
            .checked_mul(SCALAR_9)
            .ok_or(Error::ArithmeticError)?
            .checked_div(b_rate)
            .ok_or(Error::ArithmeticError)
    }

    /// Convert asset amount to bTokens with rounding up (ceil)
    /// Used when withdrawing: favors the protocol (burns more bTokens)
    #[allow(dead_code)]
    pub fn to_b_token_up(amount: i128, b_rate: i128) -> Result<i128, Error> {
        // ceil: (amount * SCALAR + b_rate - 1) / b_rate
        let numerator = amount
            .checked_mul(SCALAR_9)
            .ok_or(Error::ArithmeticError)?
            .checked_add(b_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_sub(1)
            .ok_or(Error::ArithmeticError)?;
        numerator
            .checked_div(b_rate)
            .ok_or(Error::ArithmeticError)
    }

    /// Convert asset amount to dTokens with rounding up (ceil)
    /// Used when borrowing: favors the protocol (mints more dTokens)
    pub fn to_d_token_up(amount: i128, d_rate: i128) -> Result<i128, Error> {
        // ceil: (amount * SCALAR + d_rate - 1) / d_rate
        let numerator = amount
            .checked_mul(SCALAR_9)
            .ok_or(Error::ArithmeticError)?
            .checked_add(d_rate)
            .ok_or(Error::ArithmeticError)?
            .checked_sub(1)
            .ok_or(Error::ArithmeticError)?;
        numerator
            .checked_div(d_rate)
            .ok_or(Error::ArithmeticError)
    }

    /// Convert asset amount to dTokens with rounding down (floor)
    /// Used when repaying: favors the protocol (burns fewer dTokens)
    #[allow(dead_code)]
    pub fn to_d_token_down(amount: i128, d_rate: i128) -> Result<i128, Error> {
        // floor: (amount * SCALAR) / d_rate
        amount
            .checked_mul(SCALAR_9)
            .ok_or(Error::ArithmeticError)?
            .checked_div(d_rate)
            .ok_or(Error::ArithmeticError)
    }
}
// Auction duration in blocks (for Dutch auctions)
// Used to calculate lot_modifier and bid_modifier in Dutch auction pricing
pub const AUCTION_DURATION_BLOCKS: u64 = 200;

// Backstop withdrawal queue timing
pub const BACKSTOP_WITHDRAWAL_QUEUE_DAYS: u64 = 17;
pub const BACKSTOP_WITHDRAWAL_QUEUE_SECONDS: u64 = BACKSTOP_WITHDRAWAL_QUEUE_DAYS * 24 * 60 * 60;

// Health factor constants
// MIN_HEALTH_FACTOR: Minimum health factor to maintain after operations
// Used to ensure CDPs maintain a safety margin above the liquidation threshold
// After borrow or remove_collateral, health factor must remain >= MIN_HEALTH_FACTOR
pub const MIN_HEALTH_FACTOR: u32 = 11_000;  // 1.1 = 110% in basis points

// MAX_HEALTH_FACTOR: Maximum health factor after liquidation (1.15 = 115%)
// Used to prevent over-liquidation that would leave the borrower with too much collateral
// Post-liquidation health factor must be <= MAX_HEALTH_FACTOR (like Blend)
pub const MAX_HEALTH_FACTOR: u32 = 11_500;  // 1.15 = 115% in basis points

// Storage keys
pub use soroban_sdk::symbol_short;

pub const STORAGE: Symbol = symbol_short!("STORAGE");
pub const ADMIN_KEY: Symbol = symbol_short!("ADMIN");

