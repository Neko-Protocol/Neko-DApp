use soroban_sdk::{Address, String, Symbol, Vec, contracttype};

/// RWA asset type classification
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RWAAssetType {
    /// Commercial or residential real estate
    RealEstate,
    /// Stocks, shares, or equity instruments
    Equity,
    /// Government or corporate bonds
    Bond,
    /// Physical commodities (gold, oil, grain)
    Commodity,
    /// Trade receivables and invoice factoring
    Invoice,
    /// ETFs, mutual funds, or pooled investments
    Fund,
    /// Private credit and loan instruments
    PrivateDebt,
    /// Infrastructure projects and utilities
    Infrastructure,
    /// Any other RWA not covered above
    Other,
}

/// Valuation methodology for the underlying asset
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ValuationMethod {
    /// Professional third-party appraisal
    Appraisal,
    /// Market-based pricing (comparable sales/trades)
    Market,
    /// Index-linked pricing
    Index,
    /// On-chain oracle price feed
    Oracle,
    /// Net Asset Value calculation (funds)
    Nav,
    /// Other valuation methodology
    Other,
}

/// Tokenization details for an RWA
#[contracttype]
#[derive(Clone, Debug)]
pub struct TokenizationInfo {
    /// Token contract address (if tokenized)
    pub token_contract: Option<Address>,
    /// Total supply of tokens
    pub total_supply: Option<i128>,
    /// Identifier of the underlying off-chain asset
    pub underlying_asset_id: Option<String>,
    /// Tokenization date (unix timestamp)
    pub tokenization_date: Option<u64>,
}

/// Complete on-chain RWA metadata
#[contracttype]
#[derive(Clone, Debug)]
pub struct RWAMetadata {
    /// Asset identifier (code/symbol in the oracle)
    pub asset_id: Symbol,
    /// Human-readable name
    pub name: String,
    /// Description of the asset
    pub description: String,
    /// RWA asset type classification
    pub asset_type: RWAAssetType,
    /// Underlying asset identifier or description
    pub underlying_asset: String,
    /// Issuer address
    pub issuer: Address,
    /// Jurisdiction code (ISO 3166-1 alpha-2)
    pub jurisdiction: Symbol,
    /// Tokenization information
    pub tokenization_info: TokenizationInfo,
    /// External identifiers as key-value pairs (ISIN, LEI, CUSIP, etc.)
    pub external_ids: Vec<(Symbol, String)>,
    /// URI pointing to legal documentation
    pub legal_docs_uri: Option<String>,
    /// Valuation methodology
    pub valuation_method: ValuationMethod,
    /// Extensible key-value metadata
    pub metadata: Vec<(Symbol, String)>,
    /// Creation timestamp
    pub created_at: u64,
    /// Last update timestamp
    pub updated_at: u64,
}
