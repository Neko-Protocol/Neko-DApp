# RWA Oracle Contract

Oracle contract for Real-World Asset (RWA) metadata and price feeds on Stellar Soroban. This contract extends the SEP-40 Oracle Consumer Interface to provide comprehensive RWA metadata including asset types, regulatory compliance information, pool data, and tokenization details.

## Features

- **SEP-40 Compatible**: Extends the SEP-40 price feed interface for standard oracle consumption
- **RWA Metadata Management**: Store and query comprehensive metadata for real-world assets
- **Asset Type Support**: Supports various RWA types including stocks, bonds, commodities, real estate, and more (based on SEP-0001)
- **Regulatory Compliance**: Track regulatory information including SEP-0008 regulated assets
- **Tokenization Details**: Track tokenization information for tokenized RWAs

## RWA Asset Types

Based on SEP-0001 `anchor_asset_type`, the following asset types are supported:

- `Fiat`: Fiat currencies (USD, EUR, etc.)
- `Crypto`: Cryptocurrencies (BTC, ETH, etc.)
- `Stock`: Stock/Shares
- `Bond`: Bonds
- `Commodity`: Commodities (gold, oil, etc.)
- `RealEstate`: Real estate assets
- `Nft`: NFTs
- `Other`: Other asset types

## Usage

### Initialization

```rust
let oracle = RWAOracleClient::new(&env, &contract_id);
```

### Register RWA Metadata

```rust
let metadata = RWAMetadata {
    asset_id: Symbol::new(&env, "RWA_BOND_2024"),
    name: String::from_str(&env, "US Treasury Bond 2024"),
    description: String::from_str(&env, "Tokenized US Treasury Bond"),
    asset_type: RWAAssetType::Bond,
    underlying_asset: String::from_str(&env, "US Treasury Bond"),
    issuer: String::from_str(&env, "US Treasury"),
    regulatory_info: regulatory_info,
    pool_address: None,
    tokenization_info: tokenization_info,
    metadata: Vec::new(&env),
    created_at: env.ledger().timestamp(),
    updated_at: env.ledger().timestamp(),
};

oracle.set_rwa_metadata(&asset_id, &metadata);
```

### Query Functions

```rust
// Get complete RWA metadata
let metadata = oracle.get_rwa_metadata(&asset_id)?;

// Get regulatory information
let regulatory_info = oracle.get_regulatory_info(&asset_id)?;

// Check if asset is regulated
let is_regulated = oracle.is_regulated(&asset_id)?;

// Get all registered RWA assets
let all_assets = oracle.get_all_rwa_assets();
```

### Price Feed Functions (SEP-40)

```rust
// Get last price
let price_data = oracle.lastprice(&asset)?;

// Get price at specific timestamp
let price_data = oracle.price(&asset, timestamp)?;

// Get last N price records
let prices = oracle.prices(&asset, records)?;
```

## Regulatory Compliance (SEP-0008)

The contract supports SEP-0008 regulated assets through the `RegulatoryInfo` structure:

```rust
let regulatory_info = RegulatoryInfo {
    is_regulated: true,
    approval_server: Some(String::from_str(env, "https://example.com/approve")),
    approval_criteria: Some(String::from_str(env, "Requires KYC approval")),
    compliance_status: ComplianceStatus::RequiresApproval,
    licensing_authority: Some(String::from_str(env, "SEC")),
    license_type: Some(String::from_str(env, "Securities License")),
    license_number: Some(String::from_str(env, "SEC-12345")),
};
```

## Integration with Neko Protocol

This oracle is designed to work with the Neko Protocol's lending and borrowing pools for RWA tokenization. It provides the necessary metadata and price feeds for:

1. **Asset Verification**: Verify RWA types and metadata
2. **Compliance Checks**: Check regulatory compliance status
3. **Price Feeds**: Provide price data for collateralization calculations

**Note**: This oracle is data-only - it provides RWA metadata and prices. Pool information and contract addresses are managed elsewhere in the system (e.g., orchestrator, indexer, or external services).

## Standards Compliance

- **SEP-0040**: Oracle Consumer Interface (price feeds)
- **SEP-0001**: Stellar Info File (asset type declarations)
- **SEP-0008**: Regulated Assets (compliance tracking)
- **SEP-0056**: Tokenized Vault Standard (pool information)

## Testing

Run tests with:

```bash
cargo test --package rwa-oracle
```

## License

Apache-2.0
