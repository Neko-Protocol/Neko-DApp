use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // Admin errors
    NotAuthorized = 1,
    NotInitialized = 2,
    AlreadyInitialized = 3,

    // General errors
    NotPositive = 4,
    ArithmeticError = 5,
    InvalidLedgerSequence = 6,

    // Pool errors
    PoolFrozen = 10,
    PoolOnIce = 11,
    InsufficientPoolBalance = 12,
    InsufficientLiquidity = 13,

    // Lending errors
    InsufficientBTokenBalance = 20,
    InsufficientDepositAmount = 21,
    InsufficientWithdrawalBalance = 22,

    // Borrowing errors
    InsufficientCollateral = 30,
    InsufficientBorrowLimit = 31,
    DebtAssetAlreadySet = 32,
    DebtAssetNotSet = 33,
    CannotSwitchDebtAsset = 34,
    InsufficientDTokenBalance = 35,
    InsufficientDebtToRepay = 36,

    // Collateral errors
    CollateralNotFound = 40,
    CollateralAmountTooLarge = 41,
    InvalidCollateralFactor = 42,

    // Interest rate errors
    InvalidInterestRateParams = 50,
    InvalidUtilizationRatio = 51,
    RateAccrualError = 52,
    InvalidUtilRate = 53,

    // Liquidation errors
    CDPNotInsolvent = 60,
    AuctionNotFound = 61,
    AuctionNotActive = 62,
    AuctionAlreadyFilled = 63,
    InvalidLiquidationAmount = 64,
    HealthFactorTooHigh = 65,
    HealthFactorTooLow = 66,

    // Backstop errors
    InsufficientBackstopDeposit = 70,
    WithdrawalQueueActive = 71,
    WithdrawalQueueNotExpired = 72,
    BadDebtNotCovered = 73,
    BackstopThresholdNotMet = 74,

    // Oracle errors
    OraclePriceFetchFailed = 80,
    OracleDecimalsFetchFailed = 81,
    InvalidOraclePrice = 82,
    AssetNotFoundInOracle = 83,

    // Token contract errors
    TokenContractNotSet = 84,
}

