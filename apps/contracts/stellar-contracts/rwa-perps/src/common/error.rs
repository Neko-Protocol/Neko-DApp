use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // Position errors
    PositionNotFound = 1,
    PositionAlreadyExists = 2,
    PositionNotLiquidatable = 3,

    // Liquidation errors
    MarginRatioHealthy = 10,
    InsufficientMargin = 11,
    LiquidationPriceTooLow = 12,
    LiquidationPriceTooHigh = 13,

    // Market errors
    MarketNotFound = 20,
    MarketInactive = 21,

    // Oracle errors
    OraclePriceNotFound = 30,
    OraclePriceStale = 31,

    // Arithmetic errors
    ArithmeticError = 40,
    Overflow = 41,
    DivisionByZero = 42,

    // Authorization errors
    Unauthorized = 50,

    // General errors
    InvalidInput = 60,

    // Initialization errors
    NotInitialized = 61,
    AlreadyInitialized = 62,

    // Protocol state errors
    ProtocolPaused = 63,

    // Funding errors
    InvalidFundingRate = 70,
    FundingCalculationError = 71,

    // Margin management errors
    MarginRatioBelowMaintenance = 72,  // Margin removal would violate maintenance requirement
    MarginTokenNotSet = 73,            // Margin token not configured
}
