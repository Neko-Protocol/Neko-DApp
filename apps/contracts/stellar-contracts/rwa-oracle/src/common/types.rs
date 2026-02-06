use soroban_sdk::{Address, Symbol, contracttype};

use crate::Asset;

// Storage keys
pub const ADMIN_KEY: Symbol = soroban_sdk::symbol_short!("ADMIN");
pub const STORAGE: Symbol = soroban_sdk::symbol_short!("STORAGE");

// Limits
pub const MAX_PRICE_HISTORY: u32 = 1000;

// TTL constants (~1 day threshold, ~30 days bump at ~5 sec/ledger)
pub const INSTANCE_LIFETIME_THRESHOLD: u32 = 17_280;
pub const INSTANCE_BUMP_AMOUNT: u32 = 518_400;
pub const PERSISTENT_LIFETIME_THRESHOLD: u32 = 17_280;
pub const PERSISTENT_BUMP_AMOUNT: u32 = 518_400;

// Timestamp drift tolerance
pub const MAX_TIMESTAMP_DRIFT_SECONDS: u64 = 300;

// Default max staleness: 24 hours
pub const DEFAULT_MAX_STALENESS: u64 = 86_400;

#[contracttype]
pub enum DataKey {
    Prices(Asset),
    TokenToAsset(Address), // Map token contract address to asset Symbol
}
