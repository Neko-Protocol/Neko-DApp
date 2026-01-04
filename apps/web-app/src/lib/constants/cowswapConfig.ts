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

// Native token address used by CoW Protocol (ETH Flow)
// This special address represents native ETH/BNB in CoW Protocol
export const NATIVE_TOKEN_ADDRESS =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Wrapped native token addresses by chain (for fallback/compatibility)
export const WRAPPED_NATIVE_TOKENS: Record<number, string> = {
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on Ethereum
  56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB on BNB Chain
};

// Native token symbols by chain
export const NATIVE_TOKEN_SYMBOLS: Record<number, string> = {
  1: "ETH",
  56: "BNB",
};

// Default WETH address (Ethereum Mainnet - for backwards compatibility)
export const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Default address for quotes when wallet is not connected
export const DEFAULT_ADDRESS = "0x0000000000000000000000000000000000000000";

// Timeout for quote requests in milliseconds
export const QUOTE_TIMEOUT_MS = 5000;

// App code for CoW Protocol
export const COW_APP_CODE = "NEKO_DAPP";

// EthFlow contract addresses by chain
// These contracts allow selling native ETH without wrapping to WETH first
export const ETH_FLOW_CONTRACTS: Record<number, string> = {
  1: "0x40A50cf069e992AA4536211B23F286eF88752187", // Ethereum Mainnet
};

// EthFlow contract ABI (only the functions we need)
export const ETH_FLOW_ABI = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "contract IERC20",
            name: "buyToken",
            type: "address",
          },
          { internalType: "address", name: "receiver", type: "address" },
          { internalType: "uint256", name: "sellAmount", type: "uint256" },
          { internalType: "uint256", name: "buyAmount", type: "uint256" },
          { internalType: "bytes32", name: "appData", type: "bytes32" },
          { internalType: "uint256", name: "feeAmount", type: "uint256" },
          { internalType: "uint32", name: "validTo", type: "uint32" },
          { internalType: "bool", name: "partiallyFillable", type: "bool" },
          { internalType: "int64", name: "quoteId", type: "int64" },
        ],
        internalType: "struct EthFlowOrder.Data",
        name: "order",
        type: "tuple",
      },
    ],
    name: "createOrder",
    outputs: [{ internalType: "bytes32", name: "orderHash", type: "bytes32" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// CoW Protocol API URLs by chain ID
export const COW_API_BASE_URLS: Record<number, string> = {
  1: "https://api.cow.fi/mainnet", // Ethereum
  100: "https://api.cow.fi/xdai", // Gnosis Chain
  42161: "https://api.cow.fi/arbitrum_one", // Arbitrum One
  8453: "https://api.cow.fi/base", // Base
  43114: "https://api.cow.fi/avalanche", // Avalanche
  137: "https://api.cow.fi/polygon", // Polygon
  232: "https://api.cow.fi/lens", // Lens
  56: "https://api.cow.fi/bnb", // BNB Chain
  11155111: "https://api.cow.fi/sepolia", // Sepolia (testnet)
};

// CoW Protocol API endpoints
export const COW_API_ENDPOINTS = {
  ORDERS: "/api/v1/orders",
  ORDER_BY_UID: (uid: string) => `/api/v1/orders/${uid}`,
  ORDER_STATUS: (uid: string) => `/api/v1/orders/${uid}/status`,
  TRADES: "/api/v1/trades",
  TRANSACTIONS: (txHash: string) => `/api/v1/transactions/${txHash}/orders`,
} as const;
