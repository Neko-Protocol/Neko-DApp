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
    contractId: "CCF2U62KGK7ZSS6G6SJLR43JZXCDUC4VWW3SAIVWN5OVJL3AU7ILOYZ2",
  },
} as const;

export interface RWAOracleStorage {
  asset_types: Map<Asset, RWAAssetType>;
  assets: Array<Asset>;
  base: Asset;
  decimals: u32;
  last_timestamp: u64;
  resolution: u32;
  rwa_metadata: Map<string, RWAMetadata>;
}

/**
 * RWA Asset Type based on SEP-0001 anchor_asset_type
 */
export type RWAAssetType =
  | { tag: "Fiat"; values: void }
  | { tag: "Crypto"; values: void }
  | { tag: "Stock"; values: void }
  | { tag: "Bond"; values: void }
  | { tag: "Commodity"; values: void }
  | { tag: "RealEstate"; values: void }
  | { tag: "Nft"; values: void }
  | { tag: "Other"; values: void };

/**
 * Compliance status for regulated assets (SEP-0008)
 */
export type ComplianceStatus =
  | { tag: "NotRegulated"; values: void }
  | { tag: "RequiresApproval"; values: void }
  | { tag: "Approved"; values: void }
  | { tag: "Pending"; values: void }
  | { tag: "Rejected"; values: void };

/**
 * Regulatory information for RWA assets
 */
export interface RegulatoryInfo {
  /**
   * Approval criteria for transactions
   */
  approval_criteria: Option<string>;
  /**
   * Approval server URL if regulated (SEP-0008)
   */
  approval_server: Option<string>;
  /**
   * Current compliance status
   */
  compliance_status: ComplianceStatus;
  /**
   * Whether this asset is regulated (SEP-0008)
   */
  is_regulated: boolean;
  /**
   * License number if applicable
   */
  license_number: Option<string>;
  /**
   * License type if applicable
   */
  license_type: Option<string>;
  /**
   * Licensing authority if applicable
   */
  licensing_authority: Option<string>;
}

/**
 * Tokenization details for RWA
 */
export interface TokenizationInfo {
  /**
   * Whether the asset is tokenized
   */
  is_tokenized: boolean;
  /**
   * Token contract address if tokenized
   */
  token_contract: Option<string>;
  /**
   * Tokenization date timestamp
   */
  tokenization_date: Option<u64>;
  /**
   * Total supply of tokens
   */
  total_supply: Option<i128>;
  /**
   * Underlying asset identifier
   */
  underlying_asset: Option<string>;
}

/**
 * Complete RWA metadata
 */
export interface RWAMetadata {
  /**
   * Asset identifier (code/symbol)
   */
  asset_id: string;
  /**
   * RWA asset type
   */
  asset_type: RWAAssetType;
  /**
   * Creation timestamp
   */
  created_at: u64;
  /**
   * Asset description
   */
  description: string;
  /**
   * Issuer address or identifier
   */
  issuer: string;
  /**
   * Additional metadata as key-value pairs
   */
  metadata: Array<readonly [string, string]>;
  /**
   * Asset name
   */
  name: string;
  /**
   * Regulatory information
   */
  regulatory_info: RegulatoryInfo;
  /**
   * Tokenization information
   */
  tokenization_info: TokenizationInfo;
  /**
   * Underlying asset code/symbol ("USD", "TREASURY_2024", etc.)
   */
  underlying_asset: string;
  /**
   * Last update timestamp
   */
  updated_at: u64;
}

export const Errors = {
  /**
   * Asset not found
   */
  1: { message: "AssetNotFound" },
  /**
   * Asset already exists
   */
  2: { message: "AssetAlreadyExists" },
  /**
   * Invalid RWA type
   */
  3: { message: "InvalidRWAType" },
  /**
   * Invalid metadata
   */
  4: { message: "InvalidMetadata" },
  /**
   * Unauthorized access
   */
  6: { message: "Unauthorized" },
  /**
   * Invalid compliance data
   */
  7: { message: "InvalidComplianceData" },
};

/**
 * Quoted asset definition (SEP-40 compatible)
 */
export type Asset =
  | { tag: "Stellar"; values: readonly [string] }
  | { tag: "Other"; values: readonly [string] };

/**
 * Price record definition (SEP-40 compatible)
 */
export interface PriceData {
  price: i128;
  timestamp: u64;
}

export interface Client {
  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Upgrade the contract to new wasm
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
   * Construct and simulate a set_rwa_metadata transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Register or update RWA metadata
   */
  set_rwa_metadata: (
    { asset_id, metadata }: { asset_id: string; metadata: RWAMetadata },
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
   * Construct and simulate a update_regulatory_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update regulatory/compliance information
   */
  update_regulatory_info: (
    {
      asset_id,
      regulatory_info,
    }: { asset_id: string; regulatory_info: RegulatoryInfo },
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
   * Construct and simulate a update_tokenization_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update tokenization information
   */
  update_tokenization_info: (
    {
      asset_id,
      tokenization_info,
    }: { asset_id: string; tokenization_info: TokenizationInfo },
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
   * Construct and simulate a get_rwa_metadata transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get complete RWA metadata for an asset
   */
  get_rwa_metadata: (
    { asset_id }: { asset_id: string },
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
  ) => Promise<AssembledTransaction<Result<RWAMetadata>>>;

  /**
   * Construct and simulate a get_rwa_asset_type transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get RWA asset type for an asset
   */
  get_rwa_asset_type: (
    { asset }: { asset: Asset },
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
  ) => Promise<AssembledTransaction<Option<RWAAssetType>>>;

  /**
   * Construct and simulate a get_regulatory_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get regulatory information for an RWA
   */
  get_regulatory_info: (
    { asset_id }: { asset_id: string },
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
  ) => Promise<AssembledTransaction<Result<RegulatoryInfo>>>;

  /**
   * Construct and simulate a get_tokenization_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get tokenization information for an RWA
   */
  get_tokenization_info: (
    { asset_id }: { asset_id: string },
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
  ) => Promise<AssembledTransaction<Result<TokenizationInfo>>>;

  /**
   * Construct and simulate a is_regulated transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if an asset is regulated (SEP-0008)
   */
  is_regulated: (
    { asset_id }: { asset_id: string },
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
  ) => Promise<AssembledTransaction<Result<boolean>>>;

  /**
   * Construct and simulate a get_all_rwa_assets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get all registered RWA asset IDs
   */
  get_all_rwa_assets: (options?: {
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
  }) => Promise<AssembledTransaction<Array<string>>>;

  /**
   * Construct and simulate a add_assets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_assets: (
    { assets }: { assets: Array<Asset> },
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
   * Construct and simulate a set_asset_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_asset_price: (
    {
      asset_id,
      price,
      timestamp,
    }: { asset_id: Asset; price: i128; timestamp: u64 },
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
   * Construct and simulate a assets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  assets: (options?: {
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
  }) => Promise<AssembledTransaction<Array<Asset>>>;

  /**
   * Construct and simulate a base transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  base: (options?: {
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
  }) => Promise<AssembledTransaction<Asset>>;

  /**
   * Construct and simulate a decimals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  decimals: (options?: {
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
  }) => Promise<AssembledTransaction<u32>>;

  /**
   * Construct and simulate a lastprice transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  lastprice: (
    { asset }: { asset: Asset },
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
  ) => Promise<AssembledTransaction<Option<PriceData>>>;

  /**
   * Construct and simulate a price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  price: (
    { asset, timestamp }: { asset: Asset; timestamp: u64 },
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
  ) => Promise<AssembledTransaction<Option<PriceData>>>;

  /**
   * Construct and simulate a prices transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  prices: (
    { asset, records }: { asset: Asset; records: u32 },
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
  ) => Promise<AssembledTransaction<Option<Array<PriceData>>>>;

  /**
   * Construct and simulate a resolution transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  resolution: (options?: {
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
  }) => Promise<AssembledTransaction<u32>>;
}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    {
      admin,
      assets,
      base,
      decimals,
      resolution,
    }: {
      admin: string;
      assets: Array<Asset>;
      base: Asset;
      decimals: u32;
      resolution: u32;
    },
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
    return ContractClient.deploy(
      { admin, assets, base, decimals, resolution },
      options
    );
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        "AAAAAQAAAAAAAAAAAAAAEFJXQU9yYWNsZVN0b3JhZ2UAAAAHAAAAAAAAAAthc3NldF90eXBlcwAAAAPsAAAH0AAAAAVBc3NldAAAAAAAB9AAAAAMUldBQXNzZXRUeXBlAAAAAAAAAAZhc3NldHMAAAAAA+oAAAfQAAAABUFzc2V0AAAAAAAAAAAAAARiYXNlAAAH0AAAAAVBc3NldAAAAAAAAAAAAAAIZGVjaW1hbHMAAAAEAAAAAAAAAA5sYXN0X3RpbWVzdGFtcAAAAAAABgAAAAAAAAAKcmVzb2x1dGlvbgAAAAAABAAAAAAAAAAMcndhX21ldGFkYXRhAAAD7AAAABEAAAfQAAAAC1JXQU1ldGFkYXRhAA==",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAUAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAGYXNzZXRzAAAAAAPqAAAH0AAAAAVBc3NldAAAAAAAAAAAAAAEYmFzZQAAB9AAAAAFQXNzZXQAAAAAAAAAAAAACGRlY2ltYWxzAAAABAAAAAAAAAAKcmVzb2x1dGlvbgAAAAAABAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAACBVcGdyYWRlIHRoZSBjb250cmFjdCB0byBuZXcgd2FzbQAAAAd1cGdyYWRlAAAAAAEAAAAAAAAADW5ld193YXNtX2hhc2gAAAAAAAPuAAAAIAAAAAA=",
        "AAAAAAAAAB9SZWdpc3RlciBvciB1cGRhdGUgUldBIG1ldGFkYXRhAAAAABBzZXRfcndhX21ldGFkYXRhAAAAAgAAAAAAAAAIYXNzZXRfaWQAAAARAAAAAAAAAAhtZXRhZGF0YQAAB9AAAAALUldBTWV0YWRhdGEAAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAAChVcGRhdGUgcmVndWxhdG9yeS9jb21wbGlhbmNlIGluZm9ybWF0aW9uAAAAFnVwZGF0ZV9yZWd1bGF0b3J5X2luZm8AAAAAAAIAAAAAAAAACGFzc2V0X2lkAAAAEQAAAAAAAAAPcmVndWxhdG9yeV9pbmZvAAAAB9AAAAAOUmVndWxhdG9yeUluZm8AAAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAAB9VcGRhdGUgdG9rZW5pemF0aW9uIGluZm9ybWF0aW9uAAAAABh1cGRhdGVfdG9rZW5pemF0aW9uX2luZm8AAAACAAAAAAAAAAhhc3NldF9pZAAAABEAAAAAAAAAEXRva2VuaXphdGlvbl9pbmZvAAAAAAAH0AAAABBUb2tlbml6YXRpb25JbmZvAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAAAAACZHZXQgY29tcGxldGUgUldBIG1ldGFkYXRhIGZvciBhbiBhc3NldAAAAAAAEGdldF9yd2FfbWV0YWRhdGEAAAABAAAAAAAAAAhhc3NldF9pZAAAABEAAAABAAAD6QAAB9AAAAALUldBTWV0YWRhdGEAAAAAAw==",
        "AAAAAAAAAB9HZXQgUldBIGFzc2V0IHR5cGUgZm9yIGFuIGFzc2V0AAAAABJnZXRfcndhX2Fzc2V0X3R5cGUAAAAAAAEAAAAAAAAABWFzc2V0AAAAAAAH0AAAAAVBc3NldAAAAAAAAAEAAAPoAAAH0AAAAAxSV0FBc3NldFR5cGU=",
        "AAAAAAAAACVHZXQgcmVndWxhdG9yeSBpbmZvcm1hdGlvbiBmb3IgYW4gUldBAAAAAAAAE2dldF9yZWd1bGF0b3J5X2luZm8AAAAAAQAAAAAAAAAIYXNzZXRfaWQAAAARAAAAAQAAA+kAAAfQAAAADlJlZ3VsYXRvcnlJbmZvAAAAAAAD",
        "AAAAAAAAACdHZXQgdG9rZW5pemF0aW9uIGluZm9ybWF0aW9uIGZvciBhbiBSV0EAAAAAFWdldF90b2tlbml6YXRpb25faW5mbwAAAAAAAAEAAAAAAAAACGFzc2V0X2lkAAAAEQAAAAEAAAPpAAAH0AAAABBUb2tlbml6YXRpb25JbmZvAAAAAw==",
        "AAAAAAAAAClDaGVjayBpZiBhbiBhc3NldCBpcyByZWd1bGF0ZWQgKFNFUC0wMDA4KQAAAAAAAAxpc19yZWd1bGF0ZWQAAAABAAAAAAAAAAhhc3NldF9pZAAAABEAAAABAAAD6QAAAAEAAAAD",
        "AAAAAAAAACBHZXQgYWxsIHJlZ2lzdGVyZWQgUldBIGFzc2V0IElEcwAAABJnZXRfYWxsX3J3YV9hc3NldHMAAAAAAAAAAAABAAAD6gAAABE=",
        "AAAAAAAAAAAAAAAKYWRkX2Fzc2V0cwAAAAAAAQAAAAAAAAAGYXNzZXRzAAAAAAPqAAAH0AAAAAVBc3NldAAAAAAAAAA=",
        "AAAAAAAAAAAAAAAPc2V0X2Fzc2V0X3ByaWNlAAAAAAMAAAAAAAAACGFzc2V0X2lkAAAH0AAAAAVBc3NldAAAAAAAAAAAAAAFcHJpY2UAAAAAAAALAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAGYXNzZXRzAAAAAAAAAAAAAQAAA+oAAAfQAAAABUFzc2V0AAAA",
        "AAAAAAAAAAAAAAAEYmFzZQAAAAAAAAABAAAH0AAAAAVBc3NldAAAAA==",
        "AAAAAAAAAAAAAAAIZGVjaW1hbHMAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAJbGFzdHByaWNlAAAAAAAAAQAAAAAAAAAFYXNzZXQAAAAAAAfQAAAABUFzc2V0AAAAAAAAAQAAA+gAAAfQAAAACVByaWNlRGF0YQAAAA==",
        "AAAAAAAAAAAAAAAFcHJpY2UAAAAAAAACAAAAAAAAAAVhc3NldAAAAAAAB9AAAAAFQXNzZXQAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAABAAAD6AAAB9AAAAAJUHJpY2VEYXRhAAAA",
        "AAAAAAAAAAAAAAAGcHJpY2VzAAAAAAACAAAAAAAAAAVhc3NldAAAAAAAB9AAAAAFQXNzZXQAAAAAAAAAAAAAB3JlY29yZHMAAAAABAAAAAEAAAPoAAAD6gAAB9AAAAAJUHJpY2VEYXRhAAAA",
        "AAAAAAAAAAAAAAAKcmVzb2x1dGlvbgAAAAAAAAAAAAEAAAAE",
        "AAAAAgAAADJSV0EgQXNzZXQgVHlwZSBiYXNlZCBvbiBTRVAtMDAwMSBhbmNob3JfYXNzZXRfdHlwZQAAAAAAAAAAAAxSV0FBc3NldFR5cGUAAAAIAAAAAAAAAB5GaWF0IGN1cnJlbmN5IChVU0QsIEVVUiwgZXRjLikAAAAAAARGaWF0AAAAAAAAAB9DcnlwdG9jdXJyZW5jeSAoQlRDLCBFVEgsIGV0Yy4pAAAAAAZDcnlwdG8AAAAAAAAAAAAMU3RvY2svU2hhcmVzAAAABVN0b2NrAAAAAAAAAAAAAARCb25kAAAABEJvbmQAAAAAAAAAG0NvbW1vZGl0eSAoZ29sZCwgb2lsLCBldGMuKQAAAAAJQ29tbW9kaXR5AAAAAAAAAAAAAAtSZWFsIGVzdGF0ZQAAAAAKUmVhbEVzdGF0ZQAAAAAAAAAAAANORlQAAAAAA05mdAAAAAAAAAAACk90aGVyIHR5cGUAAAAAAAVPdGhlcgAAAA==",
        "AAAAAgAAADFDb21wbGlhbmNlIHN0YXR1cyBmb3IgcmVndWxhdGVkIGFzc2V0cyAoU0VQLTAwMDgpAAAAAAAAAAAAABBDb21wbGlhbmNlU3RhdHVzAAAABQAAAAAAAAAWQXNzZXQgaXMgbm90IHJlZ3VsYXRlZAAAAAAADE5vdFJlZ3VsYXRlZAAAAAAAAAAiQXNzZXQgcmVxdWlyZXMgYXBwcm92YWwgKFNFUC0wMDA4KQAAAAAAEFJlcXVpcmVzQXBwcm92YWwAAAAAAAAAKkFzc2V0IGlzIGFwcHJvdmVkIGZvciBzcGVjaWZpYyB0cmFuc2FjdGlvbgAAAAAACEFwcHJvdmVkAAAAAAAAABlBc3NldCBhcHByb3ZhbCBpcyBwZW5kaW5nAAAAAAAAB1BlbmRpbmcAAAAAAAAAABtBc3NldCBhcHByb3ZhbCB3YXMgcmVqZWN0ZWQAAAAACFJlamVjdGVk",
        "AAAAAQAAACVSZWd1bGF0b3J5IGluZm9ybWF0aW9uIGZvciBSV0EgYXNzZXRzAAAAAAAAAAAAAA5SZWd1bGF0b3J5SW5mbwAAAAAABwAAACJBcHByb3ZhbCBjcml0ZXJpYSBmb3IgdHJhbnNhY3Rpb25zAAAAAAARYXBwcm92YWxfY3JpdGVyaWEAAAAAAAPoAAAAEAAAACtBcHByb3ZhbCBzZXJ2ZXIgVVJMIGlmIHJlZ3VsYXRlZCAoU0VQLTAwMDgpAAAAAA9hcHByb3ZhbF9zZXJ2ZXIAAAAD6AAAABAAAAAZQ3VycmVudCBjb21wbGlhbmNlIHN0YXR1cwAAAAAAABFjb21wbGlhbmNlX3N0YXR1cwAAAAAAB9AAAAAQQ29tcGxpYW5jZVN0YXR1cwAAACpXaGV0aGVyIHRoaXMgYXNzZXQgaXMgcmVndWxhdGVkIChTRVAtMDAwOCkAAAAAAAxpc19yZWd1bGF0ZWQAAAABAAAAHExpY2Vuc2UgbnVtYmVyIGlmIGFwcGxpY2FibGUAAAAObGljZW5zZV9udW1iZXIAAAAAA+gAAAAQAAAAGkxpY2Vuc2UgdHlwZSBpZiBhcHBsaWNhYmxlAAAAAAAMbGljZW5zZV90eXBlAAAD6AAAABAAAAAhTGljZW5zaW5nIGF1dGhvcml0eSBpZiBhcHBsaWNhYmxlAAAAAAAAE2xpY2Vuc2luZ19hdXRob3JpdHkAAAAD6AAAABA=",
        "AAAAAQAAABxUb2tlbml6YXRpb24gZGV0YWlscyBmb3IgUldBAAAAAAAAABBUb2tlbml6YXRpb25JbmZvAAAABQAAAB5XaGV0aGVyIHRoZSBhc3NldCBpcyB0b2tlbml6ZWQAAAAAAAxpc190b2tlbml6ZWQAAAABAAAAI1Rva2VuIGNvbnRyYWN0IGFkZHJlc3MgaWYgdG9rZW5pemVkAAAAAA50b2tlbl9jb250cmFjdAAAAAAD6AAAABMAAAAbVG9rZW5pemF0aW9uIGRhdGUgdGltZXN0YW1wAAAAABF0b2tlbml6YXRpb25fZGF0ZQAAAAAAA+gAAAAGAAAAFlRvdGFsIHN1cHBseSBvZiB0b2tlbnMAAAAAAAx0b3RhbF9zdXBwbHkAAAPoAAAACwAAABtVbmRlcmx5aW5nIGFzc2V0IGlkZW50aWZpZXIAAAAAEHVuZGVybHlpbmdfYXNzZXQAAAPoAAAAEA==",
        "AAAAAQAAABVDb21wbGV0ZSBSV0EgbWV0YWRhdGEAAAAAAAAAAAAAC1JXQU1ldGFkYXRhAAAAAAsAAAAeQXNzZXQgaWRlbnRpZmllciAoY29kZS9zeW1ib2wpAAAAAAAIYXNzZXRfaWQAAAARAAAADlJXQSBhc3NldCB0eXBlAAAAAAAKYXNzZXRfdHlwZQAAAAAH0AAAAAxSV0FBc3NldFR5cGUAAAASQ3JlYXRpb24gdGltZXN0YW1wAAAAAAAKY3JlYXRlZF9hdAAAAAAABgAAABFBc3NldCBkZXNjcmlwdGlvbgAAAAAAAAtkZXNjcmlwdGlvbgAAAAAQAAAAHElzc3VlciBhZGRyZXNzIG9yIGlkZW50aWZpZXIAAAAGaXNzdWVyAAAAAAAQAAAAJkFkZGl0aW9uYWwgbWV0YWRhdGEgYXMga2V5LXZhbHVlIHBhaXJzAAAAAAAIbWV0YWRhdGEAAAPqAAAD7QAAAAIAAAARAAAAEAAAAApBc3NldCBuYW1lAAAAAAAEbmFtZQAAABAAAAAWUmVndWxhdG9yeSBpbmZvcm1hdGlvbgAAAAAAD3JlZ3VsYXRvcnlfaW5mbwAAAAfQAAAADlJlZ3VsYXRvcnlJbmZvAAAAAAAYVG9rZW5pemF0aW9uIGluZm9ybWF0aW9uAAAAEXRva2VuaXphdGlvbl9pbmZvAAAAAAAH0AAAABBUb2tlbml6YXRpb25JbmZvAAAAO1VuZGVybHlpbmcgYXNzZXQgY29kZS9zeW1ib2wgKCJVU0QiLCAiVFJFQVNVUllfMjAyNCIsIGV0Yy4pAAAAABB1bmRlcmx5aW5nX2Fzc2V0AAAAEAAAABVMYXN0IHVwZGF0ZSB0aW1lc3RhbXAAAAAAAAAKdXBkYXRlZF9hdAAAAAAABg==",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABgAAAA9Bc3NldCBub3QgZm91bmQAAAAADUFzc2V0Tm90Rm91bmQAAAAAAAABAAAAFEFzc2V0IGFscmVhZHkgZXhpc3RzAAAAEkFzc2V0QWxyZWFkeUV4aXN0cwAAAAAAAgAAABBJbnZhbGlkIFJXQSB0eXBlAAAADkludmFsaWRSV0FUeXBlAAAAAAADAAAAEEludmFsaWQgbWV0YWRhdGEAAAAPSW52YWxpZE1ldGFkYXRhAAAAAAQAAAATVW5hdXRob3JpemVkIGFjY2VzcwAAAAAMVW5hdXRob3JpemVkAAAABgAAABdJbnZhbGlkIGNvbXBsaWFuY2UgZGF0YQAAAAAVSW52YWxpZENvbXBsaWFuY2VEYXRhAAAAAAAABw==",
        "AAAAAgAAACtRdW90ZWQgYXNzZXQgZGVmaW5pdGlvbiAoU0VQLTQwIGNvbXBhdGlibGUpAAAAAAAAAAAFQXNzZXQAAAAAAAACAAAAAQAAAClDYW4gYmUgYSBTdGVsbGFyIENsYXNzaWMgb3IgU29yb2JhbiBhc3NldAAAAAAAAAdTdGVsbGFyAAAAAAEAAAATAAAAAQAAACZGb3IgYW55IGV4dGVybmFsIHRva2Vucy9hc3NldHMvc3ltYm9scwAAAAAABU90aGVyAAAAAAAAAQAAABE=",
        "AAAAAQAAACtQcmljZSByZWNvcmQgZGVmaW5pdGlvbiAoU0VQLTQwIGNvbXBhdGlibGUpAAAAAAAAAAAJUHJpY2VEYXRhAAAAAAAAAgAAAAAAAAAFcHJpY2UAAAAAAAALAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAG",
      ]),
      options
    );
  }
  public readonly fromJSON = {
    upgrade: this.txFromJSON<null>,
    set_rwa_metadata: this.txFromJSON<Result<void>>,
    update_regulatory_info: this.txFromJSON<Result<void>>,
    update_tokenization_info: this.txFromJSON<Result<void>>,
    get_rwa_metadata: this.txFromJSON<Result<RWAMetadata>>,
    get_rwa_asset_type: this.txFromJSON<Option<RWAAssetType>>,
    get_regulatory_info: this.txFromJSON<Result<RegulatoryInfo>>,
    get_tokenization_info: this.txFromJSON<Result<TokenizationInfo>>,
    is_regulated: this.txFromJSON<Result<boolean>>,
    get_all_rwa_assets: this.txFromJSON<Array<string>>,
    add_assets: this.txFromJSON<null>,
    set_asset_price: this.txFromJSON<null>,
    assets: this.txFromJSON<Array<Asset>>,
    base: this.txFromJSON<Asset>,
    decimals: this.txFromJSON<u32>,
    lastprice: this.txFromJSON<Option<PriceData>>,
    price: this.txFromJSON<Option<PriceData>>,
    prices: this.txFromJSON<Option<Array<PriceData>>>,
    resolution: this.txFromJSON<u32>,
  };
}
