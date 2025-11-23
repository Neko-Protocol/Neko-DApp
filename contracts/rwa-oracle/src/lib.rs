#![no_std]

use soroban_sdk::{self, Address, Symbol, contracttype};

pub mod rwa_oracle;
pub mod rwa_types;
mod error;
mod sep40;

pub use error::Error;
pub use rwa_types::*;
pub use rwa_oracle::{RWAOracle, RWAOracleClient};

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

mod test;

