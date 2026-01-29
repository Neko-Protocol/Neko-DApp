/**
 * Contract Configuration
 * Centralized contract IDs and network configuration for Stellar/Soroban
 */

export const LENDING_CONTRACT_ID =
  "CD5WNBT4NEYYLALY776KRRR2WP7BEM4VJPG6QYQE5CRO6C5H4YUQA5KS";

// Contract error codes from the lending contract
export const CONTRACT_ERRORS = {
  // Admin errors
  1: {
    code: "NotAuthorized",
    message:
      "Authorization failed. Ensure you have sufficient token balance and have approved the transaction",
  },
  2: {
    code: "NotInitialized",
    message: "The lending protocol has not been initialized yet",
  },
  3: {
    code: "AlreadyInitialized",
    message: "The lending protocol is already initialized",
  },

  // General errors
  4: { code: "NotPositive", message: "The amount must be greater than zero" },
  5: {
    code: "ArithmeticError",
    message: "A calculation error occurred. Please try a different amount",
  },
  6: {
    code: "InvalidLedgerSequence",
    message: "Invalid transaction timing. Please try again",
  },

  // Pool errors
  10: {
    code: "PoolFrozen",
    message: "This pool is currently frozen and not accepting transactions",
  },
  11: {
    code: "PoolOnIce",
    message: "This pool is temporarily paused. Please try again later",
  },
  12: {
    code: "InsufficientPoolBalance",
    message: "Insufficient liquidity in the pool. Try a smaller amount",
  },
  13: {
    code: "InsufficientLiquidity",
    message: "Not enough funds available in the pool",
  },

  // BToken errors
  20: {
    code: "InsufficientBTokenBalance",
    message: "Insufficient bToken balance for this operation",
  },
  21: {
    code: "InsufficientDepositAmount",
    message: "Deposit amount is too small",
  },
  22: {
    code: "InsufficientWithdrawalBalance",
    message: "Insufficient balance for withdrawal",
  },

  // Collateral errors
  30: {
    code: "InsufficientCollateral",
    message: "Not enough collateral to complete this operation",
  },
  31: {
    code: "InsufficientBorrowLimit",
    message: "Borrow amount exceeds your limit. Add more collateral",
  },
  32: {
    code: "DebtAssetAlreadySet",
    message: "Debt asset has already been set",
  },
  33: { code: "DebtAssetNotSet", message: "No debt asset has been set" },
  34: {
    code: "CannotSwitchDebtAsset",
    message: "Cannot switch debt asset while having active debt",
  },
  35: {
    code: "InsufficientDTokenBalance",
    message: "Insufficient debt token balance",
  },
  36: {
    code: "InsufficientDebtToRepay",
    message: "Repayment amount exceeds your debt",
  },

  // Collateral management errors
  40: { code: "CollateralNotFound", message: "Collateral asset not found" },
  41: {
    code: "CollateralAmountTooLarge",
    message: "Collateral amount exceeds available balance",
  },
  42: {
    code: "InvalidCollateralFactor",
    message: "Invalid collateral factor configuration",
  },

  // Interest rate errors
  50: {
    code: "InvalidInterestRateParams",
    message: "Invalid interest rate parameters",
  },
  51: { code: "InvalidUtilizationRatio", message: "Invalid utilization ratio" },
  52: { code: "RateAccrualError", message: "Error accruing interest rates" },
  53: { code: "InvalidUtilRate", message: "Invalid utilization rate" },

  // Liquidation errors
  60: {
    code: "CDPNotInsolvent",
    message: "Position is not eligible for liquidation",
  },
  61: { code: "AuctionNotFound", message: "Liquidation auction not found" },
  62: {
    code: "AuctionNotActive",
    message: "Liquidation auction is not active",
  },
  63: {
    code: "AuctionAlreadyFilled",
    message: "Liquidation auction has already been filled",
  },
  64: {
    code: "InvalidLiquidationAmount",
    message: "Invalid liquidation amount",
  },
  65: {
    code: "HealthFactorTooHigh",
    message: "Health factor is too high for liquidation",
  },
  66: { code: "HealthFactorTooLow", message: "Health factor is too low" },

  // Backstop errors
  70: {
    code: "InsufficientBackstopDeposit",
    message: "Insufficient backstop deposit",
  },
  71: {
    code: "WithdrawalQueueActive",
    message: "Withdrawal queue is currently active",
  },
  72: {
    code: "WithdrawalQueueNotExpired",
    message: "Withdrawal queue has not expired yet",
  },
  73: { code: "BadDebtNotCovered", message: "Bad debt has not been covered" },
  74: {
    code: "BackstopThresholdNotMet",
    message: "Backstop threshold has not been met",
  },

  // Oracle errors
  80: {
    code: "OraclePriceFetchFailed",
    message: "Failed to fetch price from oracle",
  },
  81: {
    code: "OracleDecimalsFetchFailed",
    message: "Failed to fetch decimals from oracle",
  },
  82: {
    code: "InvalidOraclePrice",
    message:
      "The oracle price for this asset is stale or unavailable. Please try again later",
  },
  83: { code: "AssetNotFoundInOracle", message: "Asset not found in oracle" },
  84: {
    code: "TokenContractNotSet",
    message: "Token contract has not been set",
  },
} as const;

export type ContractErrorCode = keyof typeof CONTRACT_ERRORS;
