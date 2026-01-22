use soroban_sdk::{contracttype, Address, Symbol};

// Position structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct Position {
    pub trader: Address,
    pub rwa_token: Address,      // Address for the RWA stock token
    pub size: i128,              // Position size (positive = long, negative = short)
    pub entry_price: i128,       // Average entry price
    pub margin: i128,            // Collateral amount
    pub leverage: u32,           // Leverage multiplier (e.g., 5x = 500)
    pub opened_at: u64,
    pub last_funding_payment: u64,
}

// Market configuration
#[contracttype]
#[derive(Clone, Debug)]
pub struct MarketConfig {
    pub rwa_token: Address,
    pub max_leverage: u32,        // Maximum allowed leverage (e.g., 10x = 1000)
    pub maintenance_margin: u32,  // Maintenance margin in basis points (e.g., 500 = 5%)
    pub initial_margin: u32,      // Initial margin in basis points (e.g., 1000 = 10%)
    pub funding_rate: i128,       // Current funding rate in basis points (can be negative)
    pub last_funding_update: u64,
    pub is_active: bool,
}

// Funding payment record
#[contracttype]
#[derive(Clone, Debug)]
pub struct FundingPayment {
    pub position_id: Address,
    pub amount: i128,             // Positive = trader pays, negative = trader receives
    pub timestamp: u64,
}

// Position status
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PositionStatus {
    Open,
    Closed,
    Liquidated,
}

// Main perpetuals storage
#[contracttype]
#[derive(Clone, Debug)]
pub struct PerpsStorage {
    pub admin: Address,
    pub oracle: Address,
    pub protocol_paused: bool,
    pub protocol_fee_rate: u32,
    pub liquidation_fee_rate: u32,
}

// Constants
pub const BASIS_POINTS: i128 = 10_000;
pub const SCALAR_9: i128 = 1_000_000_000; // 9 decimals for precision

// Storage keys
pub use soroban_sdk::symbol_short;

pub const STORAGE: Symbol = symbol_short!("STORAGE");
pub const ADMIN_KEY: Symbol = symbol_short!("ADMIN");