#!/usr/bin/env node
/**
 * Stellar Contract Error Type Generator
 *
 * This script parses Rust error enums from Stellar smart contracts
 * and generates TypeScript definitions for the frontend.
 *
 * Usage: node scripts/generate-error-types.js
 */

const fs = require("fs");
const path = require("path");

// Contract error source files
const ERROR_SOURCES = [
  {
    contract: "rwa-lending",
    path: "apps/contracts/stellar-contracts/rwa-lending/src/common/error.rs",
  },
  {
    contract: "rwa-oracle",
    path: "apps/contracts/stellar-contracts/rwa-oracle/src/error.rs",
  },
  {
    contract: "rwa-token",
    path: "apps/contracts/stellar-contracts/rwa-token/src/error.rs",
  },
  {
    contract: "rwa-perps",
    path: "apps/contracts/stellar-contracts/rwa-perps/src/common/error.rs",
  },
];

// Output file path
const OUTPUT_PATH =
  "apps/web-app/src/lib/constants/generated/contract-errors.ts";

// Human-readable messages for error codes
// These provide user-friendly descriptions for each error
const ERROR_MESSAGES = {
  // rwa-lending errors
  NotAuthorized:
    "Authorization failed. Ensure you have sufficient token balance and have approved the transaction",
  NotInitialized: "The lending protocol has not been initialized yet",
  AlreadyInitialized: "The lending protocol is already initialized",
  NotPositive: "The amount must be greater than zero",
  ArithmeticError:
    "A calculation error occurred. Please try a different amount",
  InvalidLedgerSequence: "Invalid transaction timing. Please try again",
  PoolFrozen: "This pool is currently frozen and not accepting transactions",
  PoolOnIce: "This pool is temporarily paused. Please try again later",
  InsufficientPoolBalance:
    "Insufficient liquidity in the pool. Try a smaller amount",
  InsufficientLiquidity: "Not enough funds available in the pool",
  InsufficientBTokenBalance: "Insufficient bToken balance for this operation",
  InsufficientDepositAmount: "Deposit amount is too small",
  InsufficientWithdrawalBalance: "Insufficient balance for withdrawal",
  InsufficientCollateral: "Not enough collateral to complete this operation",
  InsufficientBorrowLimit:
    "Borrow amount exceeds your limit. Add more collateral",
  DebtAssetAlreadySet: "Debt asset has already been set",
  DebtAssetNotSet: "No debt asset has been set",
  CannotSwitchDebtAsset: "Cannot switch debt asset while having active debt",
  InsufficientDTokenBalance: "Insufficient debt token balance",
  InsufficientDebtToRepay: "Repayment amount exceeds your debt",
  CollateralNotFound: "Collateral asset not found",
  CollateralAmountTooLarge: "Collateral amount exceeds available balance",
  InvalidCollateralFactor: "Invalid collateral factor configuration",
  InvalidInterestRateParams: "Invalid interest rate parameters",
  InvalidUtilizationRatio: "Invalid utilization ratio",
  RateAccrualError: "Error accruing interest rates",
  InvalidUtilRate: "Invalid utilization rate",
  CDPNotInsolvent: "Position is not eligible for liquidation",
  AuctionNotFound: "Liquidation auction not found",
  AuctionNotActive: "Liquidation auction is not active",
  AuctionAlreadyFilled: "Liquidation auction has already been filled",
  InvalidLiquidationAmount: "Invalid liquidation amount",
  HealthFactorTooHigh: "Health factor is too high for liquidation",
  HealthFactorTooLow: "Health factor is too low",
  InsufficientBackstopDeposit: "Insufficient backstop deposit",
  WithdrawalQueueActive: "Withdrawal queue is currently active",
  WithdrawalQueueNotExpired: "Withdrawal queue has not expired yet",
  BadDebtNotCovered: "Bad debt has not been covered",
  BackstopThresholdNotMet: "Backstop threshold has not been met",
  OraclePriceFetchFailed: "Failed to fetch price from oracle",
  OracleDecimalsFetchFailed: "Failed to fetch decimals from oracle",
  InvalidOraclePrice:
    "The oracle price for this asset is stale or unavailable. Please try again later",
  AssetNotFoundInOracle: "Asset not found in oracle",
  TokenContractNotSet: "Token contract has not been set",

  // rwa-oracle errors
  AssetNotFound: "Asset not found in the oracle",
  AssetAlreadyExists: "Asset already exists in the oracle",
  InvalidRWAType: "Invalid RWA type specified",
  InvalidMetadata: "Invalid metadata provided",
  InvalidPrice: "Invalid price (zero or negative)",
  Unauthorized: "Unauthorized access",
  InvalidComplianceData: "Invalid compliance data provided",

  // rwa-token errors
  InsufficientBalance: "Insufficient token balance",
  ValueNotPositive: "Value must be greater than or equal to 0",
  InsufficientAllowance:
    "Insufficient allowance; spender must call approve first",
  CannotTransferToSelf: "Cannot transfer to self",
  RequiresApproval: "Asset requires approval before transfer",
  ApprovalPending: "Asset approval is pending",
  ApprovalRejected: "Asset approval was rejected",
  MetadataNotFound: "Metadata not found in RWA Oracle",

  // rwa-perps errors
  PositionNotFound: "Position not found",
  PositionAlreadyExists: "Position already exists",
  PositionNotLiquidatable: "Position is not liquidatable",
  MarginRatioHealthy: "Margin ratio is healthy",
  InsufficientMargin: "Insufficient margin",
  LiquidationPriceTooLow: "Liquidation price is too low",
  LiquidationPriceTooHigh: "Liquidation price is too high",
  MarketNotFound: "Market not found",
  MarketInactive: "Market is inactive",
  OraclePriceNotFound: "Oracle price not found",
  OraclePriceStale: "Oracle price is stale",
  Overflow: "Arithmetic overflow occurred",
  DivisionByZero: "Division by zero",
  InvalidInput: "Invalid input provided",
  ProtocolPaused: "Protocol is paused",
  InvalidFundingRate: "Invalid funding rate",
  FundingCalculationError: "Funding calculation error",
  MarginRatioBelowMaintenance:
    "Margin removal would violate maintenance requirement",
  MarginTokenNotSet: "Margin token not configured",
  ExceedsMaxLeverage: "Leverage exceeds market maximum",
  InsufficientInitialMargin: "Margin below initial requirement",
};

/**
 * Parse a Rust error file and extract error variants
 */
function parseRustErrorFile(filePath, contractName) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`Warning: File not found: ${fullPath}`);
    return [];
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const errors = [];

  // Match error variants: VariantName = number
  // Also capture doc comments (/// comment)
  const lines = content.split("\n");
  let currentDocComment = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Capture doc comments
    if (trimmed.startsWith("///")) {
      currentDocComment = trimmed.replace(/^\/\/\/\s*/, "").trim();
      continue;
    }

    // Capture comment lines (// comment)
    if (trimmed.startsWith("//") && !trimmed.startsWith("///")) {
      // Category comment, skip but reset doc comment
      currentDocComment = "";
      continue;
    }

    // Match error variant: VariantName = number,
    const match = trimmed.match(/^(\w+)\s*=\s*(\d+),?\s*(?:\/\/.*)?$/);
    if (match) {
      const [, name, code] = match;
      errors.push({
        name,
        code: parseInt(code, 10),
        contract: contractName,
        docComment: currentDocComment,
      });
      currentDocComment = "";
    }
  }

  return errors;
}

/**
 * Generate TypeScript file content
 */
function generateTypeScript(allErrors) {
  // Group errors by contract for documentation
  const errorsByContract = {};
  for (const error of allErrors) {
    if (!errorsByContract[error.contract]) {
      errorsByContract[error.contract] = [];
    }
    errorsByContract[error.contract].push(error);
  }

  // Build the errors object entries
  const entries = allErrors
    .sort((a, b) => {
      // Sort by contract first, then by code
      if (a.contract !== b.contract) {
        return a.contract.localeCompare(b.contract);
      }
      return a.code - b.code;
    })
    .map((error) => {
      const message =
        ERROR_MESSAGES[error.name] ||
        error.docComment ||
        `${error.name} error occurred`;
      return `  ${error.code}: {
    code: "${error.name}",
    message: "${message.replace(/"/g, '\\"')}",
    contract: "${error.contract}",
  }`;
    })
    .join(",\n");

  const timestamp = new Date().toISOString();

  return `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * This file is automatically generated from Stellar smart contract error definitions.
 * To regenerate, run: npm run generate:errors
 *
 * Generated at: ${timestamp}
 *
 * Source files:
${ERROR_SOURCES.map((s) => ` *   - ${s.path}`).join("\n")}
 */

export interface ContractErrorInfo {
  /** The error code name from the contract */
  code: string;
  /** Human-readable error message */
  message: string;
  /** The contract that defines this error */
  contract: string;
}

/**
 * Contract error definitions mapped by error code number.
 * These are parsed from the Rust #[contracterror] enums in the smart contracts.
 */
export const CONTRACT_ERRORS: Record<number, ContractErrorInfo> = {
${entries},
} as const;

/** Valid contract error code numbers */
export type ContractErrorCode = keyof typeof CONTRACT_ERRORS;

/** Error code names */
export type ContractErrorName = (typeof CONTRACT_ERRORS)[ContractErrorCode]["code"];

/** Contract names that have error definitions */
export type ContractName = (typeof CONTRACT_ERRORS)[ContractErrorCode]["contract"];

/**
 * Get all error codes for a specific contract
 */
export function getErrorsForContract(contractName: string): ContractErrorInfo[] {
  return Object.values(CONTRACT_ERRORS).filter(
    (error) => error.contract === contractName
  );
}

/**
 * Check if an error code exists
 */
export function isValidErrorCode(code: number): code is ContractErrorCode {
  return code in CONTRACT_ERRORS;
}
`;
}

/**
 * Main function
 */
function main() {
  console.log("Generating contract error types...\n");

  // Parse all error files
  const allErrors = [];
  for (const source of ERROR_SOURCES) {
    console.log(`Parsing ${source.contract}...`);
    const errors = parseRustErrorFile(source.path, source.contract);
    console.log(`  Found ${errors.length} error variants`);
    allErrors.push(...errors);
  }

  console.log(`\nTotal errors found: ${allErrors.length}`);

  // Check for duplicate error codes within the same contract
  const codesByContract = {};
  for (const error of allErrors) {
    const key = `${error.contract}:${error.code}`;
    if (codesByContract[key]) {
      console.warn(
        `Warning: Duplicate error code ${error.code} in ${error.contract}: ${codesByContract[key]} and ${error.name}`
      );
    }
    codesByContract[key] = error.name;
  }

  // Generate TypeScript
  const typescript = generateTypeScript(allErrors);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  const fullOutputDir = path.join(process.cwd(), outputDir);
  if (!fs.existsSync(fullOutputDir)) {
    fs.mkdirSync(fullOutputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }

  // Write output file
  const fullOutputPath = path.join(process.cwd(), OUTPUT_PATH);
  fs.writeFileSync(fullOutputPath, typescript);
  console.log(`\nGenerated: ${OUTPUT_PATH}`);

  // Summary
  console.log("\nError summary by contract:");
  const summary = {};
  for (const error of allErrors) {
    summary[error.contract] = (summary[error.contract] || 0) + 1;
  }
  for (const [contract, count] of Object.entries(summary)) {
    console.log(`  ${contract}: ${count} errors`);
  }

  console.log("\nDone!");
}

main();
