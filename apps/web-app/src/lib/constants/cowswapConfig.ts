import { SupportedChainId } from "@cowprotocol/cow-sdk";

// Chain ID mapping from standard chain IDs to CoW Protocol supported chain IDs
export const CHAIN_ID_MAPPING: Record<number, SupportedChainId> = {
  1: SupportedChainId.MAINNET,
  100: SupportedChainId.GNOSIS_CHAIN,
  137: SupportedChainId.POLYGON,
  42161: SupportedChainId.ARBITRUM_ONE,
  8453: SupportedChainId.BASE,
  43114: SupportedChainId.AVALANCHE,
  56: SupportedChainId.BNB,
  11155111: SupportedChainId.SEPOLIA,
};

// CoW Explorer URLs by chain ID
export const COW_EXPLORER_BASE_URL = "https://explorer.cow.fi/orders";

// WETH address for Ethereum Mainnet (CoW Protocol doesn't support native ETH)
export const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Default address for quotes when wallet is not connected
export const DEFAULT_ADDRESS = "0x0000000000000000000000000000000000000000";

// Timeout for quote requests in milliseconds
export const QUOTE_TIMEOUT_MS = 5000;

// App code for CoW Protocol
export const COW_APP_CODE = "NEKO_DAPP";
