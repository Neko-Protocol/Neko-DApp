use soroban_sdk::{Address, String, Symbol, Vec, contracttype};

/// RWA Asset Type based on SEP-0001 anchor_asset_type
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RWAAssetType {
    /// Fiat currency (USD, EUR, etc.)
    Fiat,
    /// Cryptocurrency (BTC, ETH, etc.)
    Crypto,
    /// Stock/Shares
    Stock,
    /// Bond
    Bond,
    /// Commodity (gold, oil, etc.)
    Commodity,
    /// Real estate
    RealEstate,
    /// NFT
    Nft,
    /// Other type
    Other,
}

/// Compliance status for regulated assets (SEP-0008)
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ComplianceStatus {
    /// Asset is not regulated
    NotRegulated,
    /// Asset requires approval (SEP-0008)
    RequiresApproval,
    /// Asset is approved for specific transaction
    Approved,
    /// Asset approval is pending
    Pending,
    /// Asset approval was rejected
    Rejected,
}

/// Regulatory information for RWA assets
#[contracttype]
#[derive(Clone, Debug)]
pub struct RegulatoryInfo {
    /// Whether this asset is regulated (SEP-0008)
    pub is_regulated: bool,
    /// Approval server URL if regulated (SEP-0008)
    pub approval_server: Option<String>,
    /// Approval criteria for transactions
    pub approval_criteria: Option<String>,
    /// Current compliance status
    pub compliance_status: ComplianceStatus,
    /// Licensing authority if applicable
    pub licensing_authority: Option<String>,
    /// License type if applicable
    pub license_type: Option<String>,
    /// License number if applicable
    pub license_number: Option<String>,
}

/// Tokenization details for RWA
#[contracttype]
#[derive(Clone, Debug)]
pub struct TokenizationInfo {
    /// Whether the asset is tokenized
    pub is_tokenized: bool,
    /// Token contract address if tokenized
    pub token_contract: Option<Address>,
    /// Total supply of tokens
    pub total_supply: Option<i128>,
    /// Underlying asset identifier
    pub underlying_asset: Option<String>,
    /// Tokenization date timestamp
    pub tokenization_date: Option<u64>,
}

/// Complete RWA metadata
#[contracttype]
#[derive(Clone, Debug)]
pub struct RWAMetadata {
    /// Asset identifier (code/symbol)
    pub asset_id: Symbol,
    /// Asset name
    pub name: String,
    /// Asset description
    pub description: String,
    /// RWA asset type
    pub asset_type: RWAAssetType,
    /// Underlying asset code/symbol ("USD", "TREASURY_2024", etc.)
    pub underlying_asset: String,
    /// Issuer address or identifier
    pub issuer: String,
    /// Regulatory information
    pub regulatory_info: RegulatoryInfo,
    /// Tokenization information
    pub tokenization_info: TokenizationInfo,
    /// Additional metadata as key-value pairs
    pub metadata: Vec<(Symbol, String)>,
    /// Creation timestamp
    pub created_at: u64,
    /// Last update timestamp
    pub updated_at: u64,
}

