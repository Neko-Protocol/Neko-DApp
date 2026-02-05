#![no_std]

use soroban_sdk::{Address, Symbol, contracttype};

pub mod common;
pub mod rwa;
pub mod sep40;
pub mod admin;
pub mod contract;

// Re-exports
pub use common::error::Error;
pub use rwa::types::{RWAAssetType, RWAMetadata, TokenizationInfo, ValuationMethod};
pub use contract::{RWAOracle, RWAOracleClient};

/// Quoted asset definition (SEP-40 compatible)
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Asset {
    /// Can be a Stellar Classic or Soroban asset
    Stellar(Address),
    /// For any external tokens/assets/symbols
    Other(Symbol),
}

/// Price record definition (SEP-40 compatible)
#[contracttype]
#[derive(Debug, Clone)]
pub struct PriceData {
    pub price: i128,    // asset price at given point in time
    pub timestamp: u64, // recording timestamp
}

#[cfg(test)]
mod test;
