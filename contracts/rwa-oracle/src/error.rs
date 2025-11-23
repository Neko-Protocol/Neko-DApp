use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Asset not found
    AssetNotFound = 1,

    /// Asset already exists
    AssetAlreadyExists = 2,

    /// Invalid RWA type
    InvalidRWAType = 3,

    /// Invalid metadata
    InvalidMetadata = 4,

    /// Unauthorized access
    Unauthorized = 6,

    /// Invalid compliance data
    InvalidComplianceData = 7,
}

