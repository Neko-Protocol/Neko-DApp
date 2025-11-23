
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

    /// Asset requires approval before transfer (SEP-0008)
    RequiresApproval = 9,

    /// Asset approval is pending (SEP-0008)
    ApprovalPending = 10,

    /// Asset approval was rejected (SEP-0008)
    ApprovalRejected = 11,

    /// Metadata not found in RWA Oracle (SEP-0001)
    MetadataNotFound = 12,

    /// Contract is not initialized
    NotInitialized = 13,

    /// Contract is already initialized
    AlreadyInitialized = 14,
}
