use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Insufficient balance
    InsufficientBalance = 1,

    /// live_until_ledger must be greater than or equal to the current ledger number
    InvalidLedgerSequence = 2,

    /// Failed to fetch price data from the Oracle
    OraclePriceFetchFailed = 3,

    /// Failed to fetch decimals from the Oracle
    OracleDecimalsFetchFailed = 4,

    /// Value must be greater than or equal to 0
    ValueNotPositive = 5,

    /// Insufficient allowance; spender must call `approve` first
    InsufficientAllowance = 6,

    /// Arithmetic overflow or underflow occurred
    ArithmeticError = 7,

    /// Cannot transfer to self
    CannotTransferToSelf = 8,

    /// Address is frozen (not authorized for transfers)
    AddressFrozen = 9,

    /// Compliance check failed (SEP-57 compliance contract rejected transfer)
    ComplianceCheckFailed = 10,

    /// Metadata not found in RWA Oracle
    MetadataNotFound = 11,

    /// Contract is not initialized
    NotInitialized = 12,

    /// Contract is already initialized
    AlreadyInitialized = 13,
}
