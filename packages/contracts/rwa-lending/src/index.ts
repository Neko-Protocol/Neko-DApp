import { Buffer } from "buffer";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type { u32, u64, i128, Option } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}

export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDKIUSI7FGZF2MJRB43AS62WRFZSZPZTPG36L4LTFFWXNAQ4OHNZPD4T",
  },
} as const;

export const Errors = {
  1: { message: "NotAuthorized" },
  2: { message: "NotInitialized" },
  3: { message: "AlreadyInitialized" },
  4: { message: "NotPositive" },
  5: { message: "ArithmeticError" },
  6: { message: "InvalidLedgerSequence" },
  10: { message: "PoolFrozen" },
  11: { message: "PoolOnIce" },
  12: { message: "InsufficientPoolBalance" },
  13: { message: "InsufficientLiquidity" },
  20: { message: "InsufficientBTokenBalance" },
  21: { message: "InsufficientDepositAmount" },
  22: { message: "InsufficientWithdrawalBalance" },
  30: { message: "InsufficientCollateral" },
  31: { message: "InsufficientBorrowLimit" },
  32: { message: "DebtAssetAlreadySet" },
  33: { message: "DebtAssetNotSet" },
  34: { message: "CannotSwitchDebtAsset" },
  35: { message: "InsufficientDTokenBalance" },
  36: { message: "InsufficientDebtToRepay" },
  40: { message: "CollateralNotFound" },
  41: { message: "CollateralAmountTooLarge" },
  42: { message: "InvalidCollateralFactor" },
  50: { message: "InvalidInterestRateParams" },
  51: { message: "InvalidUtilizationRatio" },
  52: { message: "RateAccrualError" },
  53: { message: "InvalidUtilRate" },
  60: { message: "CDPNotInsolvent" },
  61: { message: "AuctionNotFound" },
  62: { message: "AuctionNotActive" },
  63: { message: "AuctionAlreadyFilled" },
  64: { message: "InvalidLiquidationAmount" },
  65: { message: "HealthFactorTooHigh" },
  66: { message: "HealthFactorTooLow" },
  70: { message: "InsufficientBackstopDeposit" },
  71: { message: "WithdrawalQueueActive" },
  72: { message: "WithdrawalQueueNotExpired" },
  73: { message: "BadDebtNotCovered" },
  74: { message: "BackstopThresholdNotMet" },
  80: { message: "OraclePriceFetchFailed" },
  81: { message: "OracleDecimalsFetchFailed" },
  82: { message: "InvalidOraclePrice" },
  83: { message: "AssetNotFoundInOracle" },
  84: { message: "TokenContractNotSet" },
};

/**
 * Main pool storage structure
 */
export interface PoolStorage {
  admin: string;
  auctions: Map<string, DutchAuction>;
  b_token_balances: Map<string, Map<string, i128>>;
  b_token_rates: Map<string, i128>;
  b_token_supply: Map<string, i128>;
  backstop_credit: Map<string, i128>;
  backstop_deposits: Map<string, BackstopDeposit>;
  backstop_take_rate: u32;
  backstop_threshold: i128;
  backstop_token: Option<string>;
  backstop_total: i128;
  collateral: Map<string, Map<string, i128>>;
  collateral_factors: Map<string, u32>;
  d_token_balances: Map<string, Map<string, i128>>;
  d_token_rates: Map<string, i128>;
  d_token_supply: Map<string, i128>;
  interest_rate_params: Map<string, InterestRateParams>;
  last_accrual_time: Map<string, u64>;
  pool_balances: Map<string, i128>;
  pool_state: PoolState;
  rate_modifiers: Map<string, i128>;
  reflector_oracle: string;
  rwa_oracle: string;
  token_contracts: Map<string, string>;
  withdrawal_queue: Array<WithdrawalRequest>;
}

export type PoolState =
  | { tag: "Active"; values: void }
  | { tag: "OnIce"; values: void }
  | { tag: "Frozen"; values: void };

export interface InterestRateParams {
  base_rate: u32;
  reactivity_constant: u32;
  slope_1: u32;
  slope_2: u32;
  slope_3: u32;
  target_utilization: u32;
}

export interface CDP {
  collateral: Map<string, i128>;
  created_at: u64;
  d_tokens: i128;
  debt_asset: Option<string>;
  last_update: u64;
}

export interface DutchAuction {
  borrower: string;
  collateral_amount: i128;
  created_at: u64;
  debt_amount: i128;
  debt_asset: string;
  id: string;
  rwa_token: string;
  started_at: u64;
  status: AuctionStatus;
}

export type AuctionStatus =
  | { tag: "Active"; values: void }
  | { tag: "Filled"; values: void }
  | { tag: "Cancelled"; values: void };

export interface BackstopDeposit {
  amount: i128;
  deposited_at: u64;
  in_withdrawal_queue: boolean;
  queued_at: Option<u64>;
}

export interface WithdrawalRequest {
  address: string;
  amount: i128;
  queued_at: u64;
}

export interface PriceData {
  price: i128;
  timestamp: u64;
}

export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the lending pool
   */
  initialize: (
    {
      admin,
      rwa_oracle,
      reflector_oracle,
      backstop_threshold,
      backstop_take_rate,
    }: {
      admin: string;
      rwa_oracle: string;
      reflector_oracle: string;
      backstop_threshold: i128;
      backstop_take_rate: u32;
    },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<null>>;

  /**
   * Construct and simulate a set_collateral_factor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set collateral factor for an RWA token
   */
  set_collateral_factor: (
    { rwa_token, factor }: { rwa_token: string; factor: u32 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<null>>;

  /**
   * Construct and simulate a set_interest_rate_params transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set interest rate parameters for an asset
   */
  set_interest_rate_params: (
    { asset, params }: { asset: string; params: InterestRateParams },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<null>>;

  /**
   * Construct and simulate a set_pool_state transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set pool state
   */
  set_pool_state: (
    { state }: { state: PoolState },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<null>>;

  /**
   * Construct and simulate a set_backstop_threshold transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set backstop threshold
   */
  set_backstop_threshold: (
    { threshold }: { threshold: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<null>>;

  /**
   * Construct and simulate a set_backstop_take_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set backstop take rate
   */
  set_backstop_take_rate: (
    { take_rate }: { take_rate: u32 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<null>>;

  /**
   * Construct and simulate a set_token_contract transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set token contract address for an asset symbol
   */
  set_token_contract: (
    { asset, token_address }: { asset: string; token_address: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<null>>;

  /**
   * Construct and simulate a set_backstop_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set backstop token contract address
   */
  set_backstop_token: (
    { token_address }: { token_address: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<null>>;

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Upgrade the contract to a new WASM hash
   * Only the admin can call this function
   */
  upgrade: (
    { new_wasm_hash }: { new_wasm_hash: Buffer },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<null>>;

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposit crypto asset to the pool
   */
  deposit: (
    { lender, asset, amount }: { lender: string; asset: string; amount: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw crypto asset from the pool
   */
  withdraw: (
    {
      lender,
      asset,
      b_tokens,
    }: { lender: string; asset: string; b_tokens: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a get_b_token_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get bToken balance for a lender
   */
  get_b_token_balance: (
    { lender, asset }: { lender: string; asset: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a get_b_token_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get bTokenRate for an asset
   */
  get_b_token_rate: (
    { asset }: { asset: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a get_b_token_supply transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total bToken supply for an asset
   */
  get_b_token_supply: (
    { asset }: { asset: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a borrow transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Borrow crypto asset from the pool
   */
  borrow: (
    {
      borrower,
      asset,
      amount,
    }: { borrower: string; asset: string; amount: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a repay transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Repay debt
   */
  repay: (
    {
      borrower,
      asset,
      d_tokens,
    }: { borrower: string; asset: string; d_tokens: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a get_d_token_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get dToken balance for a borrower
   */
  get_d_token_balance: (
    { borrower, asset }: { borrower: string; asset: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a get_d_token_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get dTokenRate for an asset
   */
  get_d_token_rate: (
    { asset }: { asset: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a calculate_borrow_limit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Calculate borrow limit for a borrower
   */
  calculate_borrow_limit: (
    { borrower }: { borrower: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a add_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Add RWA token collateral
   */
  add_collateral: (
    {
      borrower,
      rwa_token,
      amount,
    }: { borrower: string; rwa_token: string; amount: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a remove_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Remove RWA token collateral
   */
  remove_collateral: (
    {
      borrower,
      rwa_token,
      amount,
    }: { borrower: string; rwa_token: string; amount: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a get_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get collateral amount for a borrower and RWA token
   */
  get_collateral: (
    { borrower, rwa_token }: { borrower: string; rwa_token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a get_interest_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get current interest rate for an asset
   */
  get_interest_rate: (
    { asset }: { asset: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<i128>>>;

  /**
   * Construct and simulate a accrue_interest transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Accrue interest for an asset
   */
  accrue_interest: (
    { asset }: { asset: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a initiate_liquidation transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initiate liquidation for a borrower
   */
  initiate_liquidation: (
    {
      borrower,
      rwa_token,
      debt_asset,
      liquidation_percent,
    }: {
      borrower: string;
      rwa_token: string;
      debt_asset: string;
      liquidation_percent: u32;
    },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<string>>>;

  /**
   * Construct and simulate a fill_auction transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Fill a liquidation auction
   */
  fill_auction: (
    { auction_id, liquidator }: { auction_id: string; liquidator: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a deposit_to_backstop transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposit to backstop
   */
  deposit_to_backstop: (
    { depositor, amount }: { depositor: string; amount: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a withdraw_from_backstop transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw from backstop
   */
  withdraw_from_backstop: (
    { depositor, amount }: { depositor: string; amount: i128 },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<Result<void>>>;

  /**
   * Construct and simulate a get_pool_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get pool balance for an asset
   */
  get_pool_balance: (
    { asset }: { asset: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<i128>>;

  /**
   * Construct and simulate a get_pool_state transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get pool state
   */
  get_pool_state: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<PoolState>>;

  /**
   * Construct and simulate a get_collateral_factor transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get collateral factor for an RWA token
   */
  get_collateral_factor: (
    { rwa_token }: { rwa_token: string },
    options?: {
      /**
       * The fee to pay for the transaction. Default: BASE_FEE
       */
      fee?: number;

      /**
       * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
       */
      timeoutInSeconds?: number;

      /**
       * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
       */
      simulate?: boolean;
    }
  ) => Promise<AssembledTransaction<u32>>;
}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options);
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAALAAAAAAAAAANTm90QXV0aG9yaXplZAAAAAAAAAEAAAAAAAAADk5vdEluaXRpYWxpemVkAAAAAAACAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAAMAAAAAAAAAC05vdFBvc2l0aXZlAAAAAAQAAAAAAAAAD0FyaXRobWV0aWNFcnJvcgAAAAAFAAAAAAAAABVJbnZhbGlkTGVkZ2VyU2VxdWVuY2UAAAAAAAAGAAAAAAAAAApQb29sRnJvemVuAAAAAAAKAAAAAAAAAAlQb29sT25JY2UAAAAAAAALAAAAAAAAABdJbnN1ZmZpY2llbnRQb29sQmFsYW5jZQAAAAAMAAAAAAAAABVJbnN1ZmZpY2llbnRMaXF1aWRpdHkAAAAAAAANAAAAAAAAABlJbnN1ZmZpY2llbnRCVG9rZW5CYWxhbmNlAAAAAAAAFAAAAAAAAAAZSW5zdWZmaWNpZW50RGVwb3NpdEFtb3VudAAAAAAAABUAAAAAAAAAHUluc3VmZmljaWVudFdpdGhkcmF3YWxCYWxhbmNlAAAAAAAAFgAAAAAAAAAWSW5zdWZmaWNpZW50Q29sbGF0ZXJhbAAAAAAAHgAAAAAAAAAXSW5zdWZmaWNpZW50Qm9ycm93TGltaXQAAAAAHwAAAAAAAAATRGVidEFzc2V0QWxyZWFkeVNldAAAAAAgAAAAAAAAAA9EZWJ0QXNzZXROb3RTZXQAAAAAIQAAAAAAAAAVQ2Fubm90U3dpdGNoRGVidEFzc2V0AAAAAAAAIgAAAAAAAAAZSW5zdWZmaWNpZW50RFRva2VuQmFsYW5jZQAAAAAAACMAAAAAAAAAF0luc3VmZmljaWVudERlYnRUb1JlcGF5AAAAACQAAAAAAAAAEkNvbGxhdGVyYWxOb3RGb3VuZAAAAAAAKAAAAAAAAAAYQ29sbGF0ZXJhbEFtb3VudFRvb0xhcmdlAAAAKQAAAAAAAAAXSW52YWxpZENvbGxhdGVyYWxGYWN0b3IAAAAAKgAAAAAAAAAZSW52YWxpZEludGVyZXN0UmF0ZVBhcmFtcwAAAAAAADIAAAAAAAAAF0ludmFsaWRVdGlsaXphdGlvblJhdGlvAAAAADMAAAAAAAAAEFJhdGVBY2NydWFsRXJyb3IAAAA0AAAAAAAAAA9JbnZhbGlkVXRpbFJhdGUAAAAANQAAAAAAAAAPQ0RQTm90SW5zb2x2ZW50AAAAADwAAAAAAAAAD0F1Y3Rpb25Ob3RGb3VuZAAAAAA9AAAAAAAAABBBdWN0aW9uTm90QWN0aXZlAAAAPgAAAAAAAAAUQXVjdGlvbkFscmVhZHlGaWxsZWQAAAA/AAAAAAAAABhJbnZhbGlkTGlxdWlkYXRpb25BbW91bnQAAABAAAAAAAAAABNIZWFsdGhGYWN0b3JUb29IaWdoAAAAAEEAAAAAAAAAEkhlYWx0aEZhY3RvclRvb0xvdwAAAAAAQgAAAAAAAAAbSW5zdWZmaWNpZW50QmFja3N0b3BEZXBvc2l0AAAAAEYAAAAAAAAAFVdpdGhkcmF3YWxRdWV1ZUFjdGl2ZQAAAAAAAEcAAAAAAAAAGVdpdGhkcmF3YWxRdWV1ZU5vdEV4cGlyZWQAAAAAAABIAAAAAAAAABFCYWREZWJ0Tm90Q292ZXJlZAAAAAAAAEkAAAAAAAAAF0JhY2tzdG9wVGhyZXNob2xkTm90TWV0AAAAAEoAAAAAAAAAFk9yYWNsZVByaWNlRmV0Y2hGYWlsZWQAAAAAAFAAAAAAAAAAGU9yYWNsZURlY2ltYWxzRmV0Y2hGYWlsZWQAAAAAAABRAAAAAAAAABJJbnZhbGlkT3JhY2xlUHJpY2UAAAAAAFIAAAAAAAAAFUFzc2V0Tm90Rm91bmRJbk9yYWNsZQAAAAAAAFMAAAAAAAAAE1Rva2VuQ29udHJhY3ROb3RTZXQAAAAAVA==",
        "AAAABQAAACtFdmVudHMgZW1pdHRlZCBieSB0aGUgbGVuZGluZyBwb29sIGNvbnRyYWN0AAAAAAAAAAAMRGVwb3NpdEV2ZW50AAAAAQAAAA1kZXBvc2l0X2V2ZW50AAAAAAAABAAAAAAAAAAGbGVuZGVyAAAAAAATAAAAAAAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAAAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAAAAAAIYl90b2tlbnMAAAALAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAADVdpdGhkcmF3RXZlbnQAAAAAAAABAAAADndpdGhkcmF3X2V2ZW50AAAAAAAEAAAAAAAAAAZsZW5kZXIAAAAAABMAAAAAAAAAAAAAAAVhc3NldAAAAAAAABEAAAAAAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAAAAAAAhiX3Rva2VucwAAAAsAAAAAAAAAAg==",
        "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AAAAAAAAAApyd2Ffb3JhY2xlAAAAAAATAAAAAAAAAA90b2tlbl9jb250cmFjdHMAAAAD7AAAABEAAAATAAAAAAAAABB3aXRoZHJhd2FsX3F1ZXVlAAAD6gAAB9AAAAARV2l0aGRyYXdhbFJlcXVlc3QAAAA=",
        "AAAAAgAAAAAAAAAAAAAACVBvb2xTdGF0ZQAAAAAAAAMAAAAAAAAAAAAAAAZBY3RpdmUAAAAAAAAAAAAAAAAABU9uSWNlAAAAAAAAAAAAAAAAAAAGRnJvemVuAAA=",
        "AAAAAQAAAAAAAAAAAAAAEkludGVyZXN0UmF0ZVBhcmFtcwAAAAAABgAAAAAAAAAJYmFzZV9yYXRlAAAAAAAABAAAAAAAAAATcmVhY3Rpdml0eV9jb25zdGFudAAAAAAEAAAAAAAAAAdzbG9wZV8xAAAAAAQAAAAAAAAAB3Nsb3BlXzIAAAAABAAAAAAAAAAHc2xvcGVfMwAAAAAEAAAAAAAAABJ0YXJnZXRfdXRpbGl6YXRpb24AAAAAAAQ=",
        "AAAAAQAAAAAAAAAAAAAAA0NEUAAAAAAFAAAAAAAAAApjb2xsYXRlcmFsAAAAAAPsAAAAEwAAAAsAAAAAAAAACmNyZWF0ZWRfYXQAAAAAAAYAAAAAAAAACGRfdG9rZW5zAAAACwAAAAAAAAAKZGVidF9hc3NldAAAAAAD6AAAABEAAAAAAAAAC2xhc3RfdXBkYXRlAAAAAAY=",
        "AAAAAQAAAAAAAAAAAAAADER1dGNoQXVjdGlvbgAAAAkAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAARY29sbGF0ZXJhbF9hbW91bnQAAAAAAAALAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAAAAAAAtkZWJ0X2Ftb3VudAAAAAALAAAAAAAAAApkZWJ0X2Fzc2V0AAAAAAARAAAAAAAAAAJpZAAAAAAAEwAAAAAAAAAJcndhX3Rva2VuAAAAAAAAEwAAAAAAAAAKc3RhcnRlZF9hdAAAAAAABgAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADUF1Y3Rpb25TdGF0dXMAAAA=",
        "AAAAAgAAAAAAAAAAAAAADUF1Y3Rpb25TdGF0dXMAAAAAAAADAAAAAAAAAAAAAAAGQWN0aXZlAAAAAAAAAAAAAAAAAAZGaWxsZWQAAAAAAAAAAAAAAAAACUNhbmNlbGxlZAAAAA==",
        "AAAAAQAAAAAAAAAAAAAAD0JhY2tzdG9wRGVwb3NpdAAAAAAEAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAADGRlcG9zaXRlZF9hdAAAAAYAAAAAAAAAE2luX3dpdGhkcmF3YWxfcXVldWUAAAAAAQAAAAAAAAAJcXVldWVkX2F0AAAAAAAD6AAAAAY=",
        "AAAAAQAAAAAAAAAAAAAAEVdpdGhkcmF3YWxSZXF1ZXN0AAAAAAAAAwAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAACXF1ZXVlZF9hdAAAAAAAAAY=",
        "AAAAAQAAAAAAAAAAAAAACVByaWNlRGF0YQAAAAAAAAIAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAJdGltZXN0YW1wAAAAAAAABg==",
        "AAAAAAAAABtJbml0aWFsaXplIHRoZSBsZW5kaW5nIHBvb2wAAAAACmluaXRpYWxpemUAAAAAAAUAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAKcndhX29yYWNsZQAAAAAAEwAAAAAAAAAQcmVmbGVjdG9yX29yYWNsZQAAABMAAAAAAAAAEmJhY2tzdG9wX3RocmVzaG9sZAAAAAAACwAAAAAAAAASYmFja3N0b3BfdGFrZV9yYXRlAAAAAAAEAAAAAA==",
        "AAAAAAAAACZTZXQgY29sbGF0ZXJhbCBmYWN0b3IgZm9yIGFuIFJXQSB0b2tlbgAAAAAAFXNldF9jb2xsYXRlcmFsX2ZhY3RvcgAAAAAAAAIAAAAAAAAACXJ3YV90b2tlbgAAAAAAABMAAAAAAAAABmZhY3RvcgAAAAAABAAAAAA=",
        "AAAAAAAAAClTZXQgaW50ZXJlc3QgcmF0ZSBwYXJhbWV0ZXJzIGZvciBhbiBhc3NldAAAAAAAABhzZXRfaW50ZXJlc3RfcmF0ZV9wYXJhbXMAAAACAAAAAAAAAAVhc3NldAAAAAAAABEAAAAAAAAABnBhcmFtcwAAAAAH0AAAABJJbnRlcmVzdFJhdGVQYXJhbXMAAAAAAAA=",
        "AAAAAAAAAA5TZXQgcG9vbCBzdGF0ZQAAAAAADnNldF9wb29sX3N0YXRlAAAAAAABAAAAAAAAAAVzdGF0ZQAAAAAAB9AAAAAJUG9vbFN0YXRlAAAAAAAAAA==",
        "AAAAAAAAABZTZXQgYmFja3N0b3AgdGhyZXNob2xkAAAAAAAWc2V0X2JhY2tzdG9wX3RocmVzaG9sZAAAAAAAAQAAAAAAAAAJdGhyZXNob2xkAAAAAAAACwAAAAA=",
        "AAAAAAAAABZTZXQgYmFja3N0b3AgdGFrZSByYXRlAAAAAAAWc2V0X2JhY2tzdG9wX3Rha2VfcmF0ZQAAAAAAAQAAAAAAAAAJdGFrZV9yYXRlAAAAAAAABAAAAAA=",
        "AAAAAAAAAC5TZXQgdG9rZW4gY29udHJhY3QgYWRkcmVzcyBmb3IgYW4gYXNzZXQgc3ltYm9sAAAAAAASc2V0X3Rva2VuX2NvbnRyYWN0AAAAAAACAAAAAAAAAAVhc3NldAAAAAAAABEAAAAAAAAADXRva2VuX2FkZHJlc3MAAAAAAAATAAAAAA==",
        "AAAAAAAAACNTZXQgYmFja3N0b3AgdG9rZW4gY29udHJhY3QgYWRkcmVzcwAAAAASc2V0X2JhY2tzdG9wX3Rva2VuAAAAAAABAAAAAAAAAA10b2tlbl9hZGRyZXNzAAAAAAAAEwAAAAA=",
        "AAAAAAAAAE1VcGdyYWRlIHRoZSBjb250cmFjdCB0byBhIG5ldyBXQVNNIGhhc2gKT25seSB0aGUgYWRtaW4gY2FuIGNhbGwgdGhpcyBmdW5jdGlvbgAAAAAAAAd1cGdyYWRlAAAAAAEAAAAAAAAADW5ld193YXNtX2hhc2gAAAAAAAPuAAAAIAAAAAA=",
        "AAAAAAAAACBEZXBvc2l0IGNyeXB0byBhc3NldCB0byB0aGUgcG9vbAAAAAdkZXBvc2l0AAAAAAMAAAAAAAAABmxlbmRlcgAAAAAAEwAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAAAsAAAAD",
        "AAAAAAAAACNXaXRoZHJhdyBjcnlwdG8gYXNzZXQgZnJvbSB0aGUgcG9vbAAAAAAId2l0aGRyYXcAAAADAAAAAAAAAAZsZW5kZXIAAAAAABMAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAAIYl90b2tlbnMAAAALAAAAAQAAA+kAAAALAAAAAw==",
        "AAAAAAAAAB9HZXQgYlRva2VuIGJhbGFuY2UgZm9yIGEgbGVuZGVyAAAAABNnZXRfYl90b2tlbl9iYWxhbmNlAAAAAAIAAAAAAAAABmxlbmRlcgAAAAAAEwAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAQAAAAs=",
        "AAAAAAAAABtHZXQgYlRva2VuUmF0ZSBmb3IgYW4gYXNzZXQAAAAAEGdldF9iX3Rva2VuX3JhdGUAAAABAAAAAAAAAAVhc3NldAAAAAAAABEAAAABAAAACw==",
        "AAAAAAAAACRHZXQgdG90YWwgYlRva2VuIHN1cHBseSBmb3IgYW4gYXNzZXQAAAASZ2V0X2JfdG9rZW5fc3VwcGx5AAAAAAABAAAAAAAAAAVhc3NldAAAAAAAABEAAAABAAAACw==",
        "AAAAAAAAACFCb3Jyb3cgY3J5cHRvIGFzc2V0IGZyb20gdGhlIHBvb2wAAAAAAAAGYm9ycm93AAAAAAADAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAALAAAAAw==",
        "AAAAAAAAAApSZXBheSBkZWJ0AAAAAAAFcmVwYXkAAAAAAAADAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAAAAAAIZF90b2tlbnMAAAALAAAAAQAAA+kAAAALAAAAAw==",
        "AAAAAAAAACFHZXQgZFRva2VuIGJhbGFuY2UgZm9yIGEgYm9ycm93ZXIAAAAAAAATZ2V0X2RfdG9rZW5fYmFsYW5jZQAAAAACAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAABWFzc2V0AAAAAAAAEQAAAAEAAAAL",
        "AAAAAAAAABtHZXQgZFRva2VuUmF0ZSBmb3IgYW4gYXNzZXQAAAAAEGdldF9kX3Rva2VuX3JhdGUAAAABAAAAAAAAAAVhc3NldAAAAAAAABEAAAABAAAACw==",
        "AAAAAAAAACVDYWxjdWxhdGUgYm9ycm93IGxpbWl0IGZvciBhIGJvcnJvd2VyAAAAAAAAFmNhbGN1bGF0ZV9ib3Jyb3dfbGltaXQAAAAAAAEAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAEAAAPpAAAACwAAAAM=",
        "AAAAAAAAABhBZGQgUldBIHRva2VuIGNvbGxhdGVyYWwAAAAOYWRkX2NvbGxhdGVyYWwAAAAAAAMAAAAAAAAACGJvcnJvd2VyAAAAEwAAAAAAAAAJcndhX3Rva2VuAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAABtSZW1vdmUgUldBIHRva2VuIGNvbGxhdGVyYWwAAAAAEXJlbW92ZV9jb2xsYXRlcmFsAAAAAAAAAwAAAAAAAAAIYm9ycm93ZXIAAAATAAAAAAAAAAlyd2FfdG9rZW4AAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAADJHZXQgY29sbGF0ZXJhbCBhbW91bnQgZm9yIGEgYm9ycm93ZXIgYW5kIFJXQSB0b2tlbgAAAAAADmdldF9jb2xsYXRlcmFsAAAAAAACAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAACXJ3YV90b2tlbgAAAAAAABMAAAABAAAACw==",
        "AAAAAAAAACZHZXQgY3VycmVudCBpbnRlcmVzdCByYXRlIGZvciBhbiBhc3NldAAAAAAAEWdldF9pbnRlcmVzdF9yYXRlAAAAAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAQAAA+kAAAALAAAAAw==",
        "AAAAAAAAABxBY2NydWUgaW50ZXJlc3QgZm9yIGFuIGFzc2V0AAAAD2FjY3J1ZV9pbnRlcmVzdAAAAAABAAAAAAAAAAVhc3NldAAAAAAAABEAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAACNJbml0aWF0ZSBsaXF1aWRhdGlvbiBmb3IgYSBib3Jyb3dlcgAAAAAUaW5pdGlhdGVfbGlxdWlkYXRpb24AAAAEAAAAAAAAAAhib3Jyb3dlcgAAABMAAAAAAAAACXJ3YV90b2tlbgAAAAAAABMAAAAAAAAACmRlYnRfYXNzZXQAAAAAABEAAAAAAAAAE2xpcXVpZGF0aW9uX3BlcmNlbnQAAAAABAAAAAEAAAPpAAAAEwAAAAM=",
        "AAAAAAAAABpGaWxsIGEgbGlxdWlkYXRpb24gYXVjdGlvbgAAAAAADGZpbGxfYXVjdGlvbgAAAAIAAAAAAAAACmF1Y3Rpb25faWQAAAAAABMAAAAAAAAACmxpcXVpZGF0b3IAAAAAABMAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAAAAABNEZXBvc2l0IHRvIGJhY2tzdG9wAAAAABNkZXBvc2l0X3RvX2JhY2tzdG9wAAAAAAIAAAAAAAAACWRlcG9zaXRvcgAAAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAABZXaXRoZHJhdyBmcm9tIGJhY2tzdG9wAAAAAAAWd2l0aGRyYXdfZnJvbV9iYWNrc3RvcAAAAAAAAgAAAAAAAAAJZGVwb3NpdG9yAAAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAB1HZXQgcG9vbCBiYWxhbmNlIGZvciBhbiBhc3NldAAAAAAAABBnZXRfcG9vbF9iYWxhbmNlAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAARAAAAAQAAAAs=",
        "AAAAAAAAAA5HZXQgcG9vbCBzdGF0ZQAAAAAADmdldF9wb29sX3N0YXRlAAAAAAAAAAAAAQAAB9AAAAAJUG9vbFN0YXRlAAAA",
        "AAAAAAAAACZHZXQgY29sbGF0ZXJhbCBmYWN0b3IgZm9yIGFuIFJXQSB0b2tlbgAAAAAAFWdldF9jb2xsYXRlcmFsX2ZhY3RvcgAAAAAAAAEAAAAAAAAACXJ3YV90b2tlbgAAAAAAABMAAAABAAAABA==",
      ]),
      options
    );
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
    set_collateral_factor: this.txFromJSON<null>,
    set_interest_rate_params: this.txFromJSON<null>,
    set_pool_state: this.txFromJSON<null>,
    set_backstop_threshold: this.txFromJSON<null>,
    set_backstop_take_rate: this.txFromJSON<null>,
    set_token_contract: this.txFromJSON<null>,
    set_backstop_token: this.txFromJSON<null>,
    upgrade: this.txFromJSON<null>,
    deposit: this.txFromJSON<Result<i128>>,
    withdraw: this.txFromJSON<Result<i128>>,
    get_b_token_balance: this.txFromJSON<i128>,
    get_b_token_rate: this.txFromJSON<i128>,
    get_b_token_supply: this.txFromJSON<i128>,
    borrow: this.txFromJSON<Result<i128>>,
    repay: this.txFromJSON<Result<i128>>,
    get_d_token_balance: this.txFromJSON<i128>,
    get_d_token_rate: this.txFromJSON<i128>,
    calculate_borrow_limit: this.txFromJSON<Result<i128>>,
    add_collateral: this.txFromJSON<Result<void>>,
    remove_collateral: this.txFromJSON<Result<void>>,
    get_collateral: this.txFromJSON<i128>,
    get_interest_rate: this.txFromJSON<Result<i128>>,
    accrue_interest: this.txFromJSON<Result<void>>,
    initiate_liquidation: this.txFromJSON<Result<string>>,
    fill_auction: this.txFromJSON<Result<void>>,
    deposit_to_backstop: this.txFromJSON<Result<void>>,
    withdraw_from_backstop: this.txFromJSON<Result<void>>,
    get_pool_balance: this.txFromJSON<i128>,
    get_pool_state: this.txFromJSON<PoolState>,
    get_collateral_factor: this.txFromJSON<u32>,
  };
}
