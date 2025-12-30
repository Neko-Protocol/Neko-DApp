import { Token, ChainId } from "@uniswap/sdk-core";
import { Address } from "viem";

// ========================================
// CONSTANTS - Uniswap V4 Contract Addresses
// ========================================
// These addresses are from https://docs.uniswap.org/contracts/v4/deployments
export const UNISWAP_V4_CONTRACTS: Record<
  number,
  {
    quoter: Address;
    universalRouter: Address;
    permit2: Address;
    poolManager: Address;
  }
> = {
  // Mainnet
  1: {
    quoter: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203",
    universalRouter: "0x66a9893cc07d91d95644aedd05d03f95e1dba8af",
    permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    poolManager: "0x000000000004444c5dc75cB358380D2e3dE08A90",
  },
  // Sepolia (testnet)
  11155111: {
    quoter: "0x61b3f2011a92d183c7dbadbda940a7555ccf9227",
    universalRouter: "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b",
    permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  },
};

// ========================================
// ABIs - Complete ABIs from Uniswap V4 contracts
// ========================================
// Quoter ABI - for getting swap quotes
export const QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: "Currency", name: "currency0", type: "address" },
              { internalType: "Currency", name: "currency1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickSpacing", type: "int24" },
              {
                internalType: "contract IHooks",
                name: "hooks",
                type: "address",
              },
            ],
            internalType: "struct PoolKey",
            name: "poolKey",
            type: "tuple",
          },
          { internalType: "bool", name: "zeroForOne", type: "bool" },
          { internalType: "uint128", name: "exactAmount", type: "uint128" },
          { internalType: "bytes", name: "hookData", type: "bytes" },
        ],
        internalType: "struct IV4Quoter.QuoteExactSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Universal Router ABI - for executing swaps
export const UNIVERSAL_ROUTER_ABI = [
  {
    inputs: [
      { internalType: "bytes", name: "commands", type: "bytes" },
      { internalType: "bytes[]", name: "inputs", type: "bytes[]" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// Permit2 ABI - for token approvals (simplified, only functions we need)
export const PERMIT2_ABI = [
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint160", name: "amount", type: "uint160" },
      { internalType: "uint48", name: "expiration", type: "uint48" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [
      { internalType: "uint160", name: "amount", type: "uint160" },
      { internalType: "uint48", name: "expiration", type: "uint48" },
      { internalType: "uint48", name: "nonce", type: "uint48" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ERC20 ABI - for token approvals and balance checks
// This is needed because we need to approve Permit2 as a spender on the ERC20 token
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ========================================
// TOKEN CONSTANTS
// ========================================
export const EVM_TOKENS: Record<string, Token> = {
  ETH: new Token(
    ChainId.MAINNET,
    "0x0000000000000000000000000000000000000000",
    18,
    "ETH",
    "Ether"
  ),
  USDC: new Token(
    ChainId.MAINNET,
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    6,
    "USDC",
    "USD Coin"
  ),
  USDT: new Token(
    ChainId.MAINNET,
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    6,
    "USDT",
    "Tether USD"
  ),
  // Ondo Tokenized Stocks
  NVDA: new Token(
    ChainId.MAINNET,
    "0x2d1f7226bd1f780af6b9a49dcc0ae00e8df4bdee",
    18,
    "NVDA",
    "NVIDIA (Ondo Tokenized Stock)"
  ),
  TSLA: new Token(
    ChainId.MAINNET,
    "0x2494b603319d4d9f9715c9f4496d9e0364b59d93",
    18,
    "TSLA",
    "Tesla (Ondo Tokenized Stock)"
  ),
  AAPL: new Token(
    ChainId.MAINNET,
    "0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c",
    18,
    "AAPL",
    "Apple (Ondo Tokenized Stock)"
  ),
  MSFT: new Token(
    ChainId.MAINNET,
    "0xb812837b81a3a6b81d7cd74cfb19a7f2784555e5",
    18,
    "MSFT",
    "Microsoft (Ondo Tokenized Stock)"
  ),
  AMZN: new Token(
    ChainId.MAINNET,
    "0xbb8774fb97436d23d74c1b882e8e9a69322cfd31",
    18,
    "AMZN",
    "Amazon (Ondo Tokenized Stock)"
  ),
  META: new Token(
    ChainId.MAINNET,
    "0x59644165402b611b350645555b50afb581c71eb2",
    18,
    "META",
    "Meta Platforms (Ondo Tokenized Stock)"
  ),
  SPOT: new Token(
    ChainId.MAINNET,
    "0x590f21186489ca1612f49a4b1ff5c66acd6796a9",
    18,
    "SPOT",
    "Spotify (Ondo Tokenized Stock)"
  ),
  SHOP: new Token(
    ChainId.MAINNET,
    "0x908266c1192628371cff7ad2f5eba4de061a0ac5",
    18,
    "SHOP",
    "Shopify (Ondo Tokenized Stock)"
  ),
  MA: new Token(
    ChainId.MAINNET,
    "0xa29dc2102dfc2a0a4a5dcb84af984315567c9858",
    18,
    "MA",
    "Mastercard (Ondo Tokenized Stock)"
  ),
  NFLX: new Token(
    ChainId.MAINNET,
    "0x032dec3372f25c41ea8054b4987a7c4832cdb338",
    18,
    "NFLX",
    "Netflix (Ondo Tokenized Stock)"
  ),
};
