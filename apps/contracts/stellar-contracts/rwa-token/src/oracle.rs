use soroban_sdk::{Address, Env, Symbol};

use crate::error::Error;
use crate::rwa_oracle::{self, Asset, PriceData as OraclePriceData};
use crate::storage::MetadataStorage;

/// Oracle integration functions
pub struct Oracle;

impl Oracle {
    /// Get the RWA Oracle contract address
    pub fn get_asset_contract(env: &Env) -> Address {
        MetadataStorage::get_asset_contract(env)
    }

    /// Get the pegged asset symbol (e.g., "NVDA", "TSLA")
    pub fn get_pegged_asset(env: &Env) -> Symbol {
        MetadataStorage::get_pegged_asset(env)
    }

    /// Get the current price of this RWA token from the RWA Oracle
    /// Returns the price in the oracle's base asset (typically USDC)
    pub fn get_price(env: &Env) -> Result<OraclePriceData, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let pegged_asset = Self::get_pegged_asset(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);
        let asset = Asset::Other(pegged_asset);

        oracle_client
            .lastprice(&asset)
            .ok_or(Error::OraclePriceFetchFailed)
    }

    /// Get the price of this RWA token at a specific timestamp
    pub fn get_price_at(env: &Env, timestamp: u64) -> Result<OraclePriceData, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let pegged_asset = Self::get_pegged_asset(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);
        let asset = Asset::Other(pegged_asset);

        oracle_client
            .price(&asset, &timestamp)
            .ok_or(Error::OraclePriceFetchFailed)
    }

    /// Get the number of decimals used by the oracle for price reporting
    pub fn get_decimals(env: &Env) -> Result<u32, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);

        Ok(oracle_client.decimals())
    }

    // SEP-0001: Get RWA metadata from Oracle
    /// Get complete RWA metadata from the RWA Oracle (SEP-0001)
    /// Returns metadata or Error::MetadataNotFound if asset not found
    pub fn get_rwa_metadata(env: &Env) -> Result<rwa_oracle::RWAMetadata, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let pegged_asset = Self::get_pegged_asset(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);

        match oracle_client.try_get_rwa_metadata(&pegged_asset) {
            Ok(Ok(metadata)) => Ok(metadata),
            Ok(Err(_)) => Err(Error::MetadataNotFound),
            Err(_) => Err(Error::MetadataNotFound),
        }
    }

    /// Get the asset type of this RWA token (SEP-0001)
    pub fn get_asset_type(env: &Env) -> Result<rwa_oracle::RWAAssetType, Error> {
        let metadata = Self::get_rwa_metadata(env)?;
        Ok(metadata.asset_type)
    }

    // SEP-0008: Compliance checking
    /// Check if this RWA token is regulated (SEP-0008)
    pub fn is_regulated(env: &Env) -> Result<bool, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let pegged_asset = Self::get_pegged_asset(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);

        match oracle_client.try_is_regulated(&pegged_asset) {
            Ok(Ok(is_regulated)) => Ok(is_regulated),
            Ok(Err(_)) => Err(Error::MetadataNotFound),
            Err(_) => Err(Error::MetadataNotFound),
        }
    }

    /// Get regulatory information for this RWA token (SEP-0008)
    pub fn get_regulatory_info(env: &Env) -> Result<rwa_oracle::RegulatoryInfo, Error> {
        let asset_contract = Self::get_asset_contract(env);
        let pegged_asset = Self::get_pegged_asset(env);
        let oracle_client = rwa_oracle::Client::new(env, &asset_contract);

        match oracle_client.try_get_regulatory_info(&pegged_asset) {
            Ok(Ok(regulatory_info)) => Ok(regulatory_info),
            Ok(Err(_)) => Err(Error::MetadataNotFound),
            Err(_) => Err(Error::MetadataNotFound),
        }
    }

    /// Check compliance before transfer (SEP-0008)
    /// Returns Ok(()) if transfer is allowed, Err if blocked
    ///
    /// Note: This function checks compliance status from the RWA Oracle.
    /// For full SEP-0008 compliance, approval server verification should be done
    /// off-chain before submitting the transaction.
    pub fn check_compliance_before_transfer(
        env: &Env,
        _from: &Address,
        _to: &Address,
        _amount: i128,
    ) -> Result<(), Error> {
        // Get regulatory info from oracle (may fail if metadata not set)
        let regulatory_info = match Self::get_regulatory_info(env) {
            Ok(info) => info,
            Err(_) => {
                // If metadata not found, allow transfer (backwards compatibility)
                return Ok(());
            }
        };

        // If not regulated, allow transfer
        if !regulatory_info.is_regulated {
            return Ok(());
        }

        // If regulated, check compliance status
        match regulatory_info.compliance_status {
            rwa_oracle::ComplianceStatus::NotRegulated => Ok(()),
            rwa_oracle::ComplianceStatus::Approved => Ok(()),
            rwa_oracle::ComplianceStatus::RequiresApproval => {
                // Note: Full approval server integration requires off-chain middleware
                // For now, we only check if the asset requires approval
                // The actual approval check should happen before the transaction is submitted
                Err(Error::RequiresApproval)
            }
            rwa_oracle::ComplianceStatus::Pending => Err(Error::ApprovalPending),
            rwa_oracle::ComplianceStatus::Rejected => Err(Error::ApprovalRejected),
        }
    }
}

