use soroban_sdk::{Address, String, Symbol, contracttype, symbol_short};

/// Persistent storage keys
#[contracttype]
pub enum DataKey {
    /// Mapping of account addresses to their token balances
    Balance(Address),
    /// Mapping of transactions to their associated allowances
    Allowance(Txn),
    /// Mapping of addresses to their authorization status
    Authorized(Address),
}

/// Instance storage key
pub const STORAGE: Symbol = symbol_short!("STOR");
pub const ADMIN_KEY: Symbol = symbol_short!("ADMIN");

/// Token metadata storage (instance storage)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenStorage {
    /// Name of the token
    pub name: String,
    /// Symbol of the token
    pub symbol: String,
    /// Number of decimal places for token amounts
    pub decimals: u32,
    /// Oracle contract ID for RWA asset price feed (the token's price source)
    pub asset_contract: Address,
    /// Oracle asset ID this asset tracks (e.g., "NVDA", "TSLA")
    pub pegged_asset: Symbol,
}

/// Transaction tuple for allowance storage
#[contracttype]
#[derive(Clone)]
pub struct Txn(pub Address, pub Address);

/// Allowance value for token transfers
#[contracttype]
#[derive(Clone)]
pub struct Allowance {
    pub amount: i128,
    pub live_until_ledger: u32,
}

