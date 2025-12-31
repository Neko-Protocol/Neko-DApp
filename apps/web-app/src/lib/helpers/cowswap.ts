import {
  SupportedChainId,
  TradingSdk,
  OrderKind,
  TradeParameters,
  OrderBookApi,
  OrderQuoteSideKindSell,
} from "@cowprotocol/cow-sdk";
import { ViemAdapter } from "@cowprotocol/sdk-viem-adapter";
import { WalletClient, PublicClient } from "viem";
import { EVM_TOKENS } from "../constants/uniswapConfig";
import {
  CHAIN_ID_MAPPING,
  COW_EXPLORER_BASE_URL,
  WETH_ADDRESS,
  DEFAULT_ADDRESS,
  QUOTE_TIMEOUT_MS,
  COW_APP_CODE,
} from "../constants/cowswapConfig";
import type { Token } from "@uniswap/sdk-core";
import type {
  CowSwapQuoteRequest,
  CowSwapQuoteResponse,
  CowSwapSwapRequest,
  CowSwapSwapResponse,
} from "../types/cowswapTypes";

// Re-export types and constants for convenience
export { EVM_TOKENS } from "../constants/uniswapConfig";
export type {
  CowSwapQuoteRequest,
  CowSwapQuoteResponse,
  CowSwapSwapRequest,
  CowSwapSwapResponse,
} from "../types/cowswapTypes";

// ============================================================================
// CACHE INSTANCES
// ============================================================================

// Cache for OrderBookApi instances by chainId - avoids recreating on every quote request
const orderBookApiCache = new Map<SupportedChainId, OrderBookApi>();

// Cache for TradingSdk instances - key is chainId + account address
const tradingSdkCache = new Map<
  string,
  { sdk: TradingSdk; adapter: ViemAdapter }
>();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getOrderBookApi = (chainId: SupportedChainId): OrderBookApi => {
  let api = orderBookApiCache.get(chainId);
  if (!api) {
    api = new OrderBookApi({ chainId });
    orderBookApiCache.set(chainId, api);
  }
  return api;
};

const getEVMToken = (token: Token | string): Token => {
  if (typeof token === "string") {
    const tokenBySymbol = Object.values(EVM_TOKENS).find(
      (t) =>
        t.symbol === token || t.address.toLowerCase() === token.toLowerCase()
    );
    if (tokenBySymbol) return tokenBySymbol;
    throw new Error(`Token not found: ${token}. Please add it to EVM_TOKENS.`);
  }
  return token;
};

const getChainIdMapping = (chainId: number): SupportedChainId => {
  const supportedChainId = CHAIN_ID_MAPPING[chainId];
  if (!supportedChainId) {
    throw new Error(`Chain ID ${chainId} is not supported by CoW Protocol`);
  }
  return supportedChainId;
};

// Normalize token address for CoW Protocol
const normalizeTokenAddress = (address: string): string => {
  if (address.toLowerCase() === "0x0000000000000000000000000000000000000000") {
    return WETH_ADDRESS;
  }
  return address;
};

// Add timeout to a promise to prevent hanging requests
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Quote request timeout")), timeoutMs)
    ),
  ]);
};

// Get or create cached TradingSdk instance
const getTradingSdk = (
  chainId: SupportedChainId,
  publicClient: PublicClient,
  walletClient: WalletClient
): TradingSdk => {
  const accountAddress = walletClient.account?.address || "";
  const cacheKey = `${chainId}-${accountAddress}`;

  let cached = tradingSdkCache.get(cacheKey);

  if (!cached) {
    const adapter = new ViemAdapter({
      provider: publicClient,
      walletClient,
    });

    const sdk = new TradingSdk(
      {
        chainId,
        appCode: COW_APP_CODE,
      },
      {},
      adapter
    );

    cached = { sdk, adapter };
    tradingSdkCache.set(cacheKey, cached);
  }

  return cached.sdk;
};

// ============================================================================
// PUBLIC API
// ============================================================================

export const getCowSwapQuote = async (
  request: CowSwapQuoteRequest,
  chainId: number,
  _publicClient: PublicClient,
  walletClient?: WalletClient
): Promise<CowSwapQuoteResponse> => {
  const tokenIn = getEVMToken(request.tokenIn);
  const tokenOut = getEVMToken(request.tokenOut);
  const supportedChainId = getChainIdMapping(chainId);
  const orderBookApi = getOrderBookApi(supportedChainId);
  const userAddress = walletClient?.account?.address || DEFAULT_ADDRESS;

  const quote = await withTimeout(
    orderBookApi.getQuote({
      sellToken: normalizeTokenAddress(tokenIn.address),
      buyToken: normalizeTokenAddress(tokenOut.address),
      from: userAddress,
      receiver: userAddress,
      sellAmountBeforeFee: request.amountIn,
      kind: OrderQuoteSideKindSell.SELL,
    }),
    QUOTE_TIMEOUT_MS
  );

  const buyAmount = quote.quote?.buyAmount || "0";

  return {
    amountOut: buyAmount,
    amountOutMinimum: buyAmount,
  };
};

export const getCowSwapExplorerUrl = (
  orderId: string,
  _chainId: number
): string => {
  return `${COW_EXPLORER_BASE_URL}/${orderId}`;
};

export const executeCowSwap = async (
  request: CowSwapSwapRequest,
  chainId: number,
  publicClient: PublicClient,
  walletClient: WalletClient
): Promise<CowSwapSwapResponse> => {
  const tokenIn = getEVMToken(request.tokenIn);
  const tokenOut = getEVMToken(request.tokenOut);
  const supportedChainId = getChainIdMapping(chainId);
  const sdk = getTradingSdk(supportedChainId, publicClient, walletClient);

  const parameters: TradeParameters = {
    kind: OrderKind.SELL,
    sellToken: normalizeTokenAddress(tokenIn.address),
    sellTokenDecimals: tokenIn.decimals,
    buyToken: normalizeTokenAddress(tokenOut.address),
    buyTokenDecimals: tokenOut.decimals,
    amount: request.amountIn,
    receiver: request.recipient,
  };

  try {
    const { postSwapOrderFromQuote } = await sdk.getQuote(parameters);
    const orderResult = await postSwapOrderFromQuote();

    return {
      orderId: orderResult.orderId || "",
    };
  } catch (error) {
    if (isUserRejectionError(error)) {
      throw new Error("USER_REJECTED");
    }
    throw error;
  }
};

export const isUserRejectionError = (error: unknown): boolean => {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  const rejectionPatterns = [
    "user denied",
    "user rejected",
    "user cancelled",
    "user canceled",
    "rejected by user",
    "denied by user",
    "action_cancelled",
    "4001",
  ];

  return rejectionPatterns.some((pattern) => errorString.includes(pattern));
};
