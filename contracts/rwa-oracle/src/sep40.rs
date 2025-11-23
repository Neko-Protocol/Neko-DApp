use crate::{Asset, PriceData};
use soroban_sdk::{Env, Vec};

/// Oracle Consumer Interface from SEP-0040
pub trait IsSep40 {
    /// Return all assets quoted by the price feed
    fn assets(env: &Env) -> Vec<Asset>;

    /// Return the base asset the price is reported in
    fn base(env: &Env) -> Asset;

    /// Return the number of decimals for all assets quoted by the oracle
    fn decimals(env: &Env) -> u32;

    /// Get the most recent price for an asset
    fn lastprice(env: &Env, asset: Asset) -> Option<PriceData>;

    /// Get price in base asset at specific timestamp
    fn price(env: &Env, asset: Asset, timestamp: u64) -> Option<PriceData>;

    /// Get last N price records
    fn prices(env: &Env, asset: Asset, records: u32) -> Option<Vec<PriceData>>;

    /// Return default tick period timeframe (in milliseconds)
    fn resolution(env: &Env) -> u32;
}

/// Admin interface for SEP-40 oracle
pub trait IsSep40Admin {
    /// Adds given assets to the contract quoted assets list. Can be invoked only by the admin account.
    fn add_assets(env: &Env, assets: Vec<Asset>);

    /// Record new price feed history snapshot. Can be invoked only by the admin account.
    fn set_asset_price(env: &Env, asset: Asset, price: i128, timestamp: u64);
}

