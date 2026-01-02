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
import { EVM_TOKENS, getTokensForChain } from "../constants/evmConfig";
import {
  CHAIN_ID_MAPPING,
  COW_EXPLORER_BASE_URL,
  NATIVE_TOKEN_ADDRESS,
  NATIVE_TOKEN_SYMBOLS,
  WRAPPED_NATIVE_TOKENS,
  DEFAULT_ADDRESS,
  QUOTE_TIMEOUT_MS,
  COW_APP_CODE,
  ETH_FLOW_CONTRACTS,
  ETH_FLOW_ABI,
} from "../constants/cowswapConfig";
import type { Token } from "@uniswap/sdk-core";
import type {
  CowSwapQuoteRequest,
  CowSwapQuoteResponse,
  CowSwapSwapRequest,
  CowSwapSwapResponse,
} from "../types/cowswapTypes";

export { EVM_TOKENS } from "../constants/evmConfig";
export type {
  CowSwapQuoteRequest,
  CowSwapQuoteResponse,
  CowSwapSwapRequest,
  CowSwapSwapResponse,
} from "../types/cowswapTypes";

// SDK instance caches
const orderBookApiCache = new Map<SupportedChainId, OrderBookApi>();
const tradingSdkCache = new Map<
  string,
  { sdk: TradingSdk; adapter: ViemAdapter }
>();

const getOrderBookApi = (chainId: SupportedChainId): OrderBookApi => {
  let api = orderBookApiCache.get(chainId);
  if (!api) {
    api = new OrderBookApi({ chainId });
    orderBookApiCache.set(chainId, api);
  }
  return api;
};

const getEVMToken = (token: Token | string, chainId: number = 1): Token => {
  if (typeof token === "string") {
    const tokens = getTokensForChain(chainId);
    const tokenBySymbol = Object.values(tokens).find(
      (t) =>
        t.symbol === token || t.address.toLowerCase() === token.toLowerCase()
    );
    if (tokenBySymbol) return tokenBySymbol;
    // Fallback to default tokens
    const defaultToken = Object.values(EVM_TOKENS).find(
      (t) =>
        t.symbol === token || t.address.toLowerCase() === token.toLowerCase()
    );
    if (defaultToken) return defaultToken;
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

// Check if a token is a native token (ETH, BNB) based on symbol
const isNativeTokenSymbol = (symbol: string, chainId: number): boolean => {
  const nativeSymbol = NATIVE_TOKEN_SYMBOLS[chainId];
  return symbol === nativeSymbol || symbol === "ETH" || symbol === "BNB";
};

// Check if address is the native token address
const isNativeTokenAddress = (address: string): boolean => {
  const lowerAddress = address.toLowerCase();
  return (
    lowerAddress === "0x0000000000000000000000000000000000000000" ||
    lowerAddress === NATIVE_TOKEN_ADDRESS.toLowerCase()
  );
};

// Normalize token address for CoW Protocol quotes
// For quotes, we must use WETH/WBNB as the API doesn't support native token address
const normalizeTokenAddressForQuote = (
  address: string,
  chainId: number = 1,
  tokenSymbol?: string
): string => {
  // If it's a native token address or symbol, use wrapped token for quotes
  if (isNativeTokenAddress(address)) {
    return WRAPPED_NATIVE_TOKENS[chainId] || WRAPPED_NATIVE_TOKENS[1];
  }
  if (tokenSymbol && isNativeTokenSymbol(tokenSymbol, chainId)) {
    return WRAPPED_NATIVE_TOKENS[chainId] || WRAPPED_NATIVE_TOKENS[1];
  }
  return address;
};

// Normalize token address for CoW Protocol swap execution
// For execution, we can try native token (ETH Flow) but fallback to wrapped
const normalizeTokenAddressForSwap = (
  address: string,
  chainId: number = 1,
  tokenSymbol?: string
): string => {
  // For now, use wrapped tokens for swap execution as well
  // ETH Flow requires special handling that may not be available in all cases
  if (isNativeTokenAddress(address)) {
    return WRAPPED_NATIVE_TOKENS[chainId] || WRAPPED_NATIVE_TOKENS[1];
  }
  if (tokenSymbol && isNativeTokenSymbol(tokenSymbol, chainId)) {
    return WRAPPED_NATIVE_TOKENS[chainId] || WRAPPED_NATIVE_TOKENS[1];
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

export const getCowSwapQuote = async (
  request: CowSwapQuoteRequest,
  chainId: number,
  _publicClient: PublicClient,
  walletClient?: WalletClient
): Promise<CowSwapQuoteResponse> => {
  const tokenIn = getEVMToken(request.tokenIn, chainId);
  const tokenOut = getEVMToken(request.tokenOut, chainId);
  const supportedChainId = getChainIdMapping(chainId);
  const orderBookApi = getOrderBookApi(supportedChainId);
  const userAddress = walletClient?.account?.address || DEFAULT_ADDRESS;

  const quote = await withTimeout(
    orderBookApi.getQuote({
      sellToken: normalizeTokenAddressForQuote(
        tokenIn.address,
        chainId,
        tokenIn.symbol
      ),
      buyToken: normalizeTokenAddressForQuote(
        tokenOut.address,
        chainId,
        tokenOut.symbol
      ),
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

// Check if we should use EthFlow for this swap
const shouldUseEthFlow = (tokenSymbol: string, chainId: number): boolean => {
  if (!ETH_FLOW_CONTRACTS[chainId]) return false;
  return tokenSymbol === "ETH";
};

// Execute swap using EthFlow contract for native ETH
const executeEthFlowSwap = async (
  request: CowSwapSwapRequest,
  chainId: number,
  walletClient: WalletClient,
  tokenOut: Token
): Promise<CowSwapSwapResponse> => {
  const ethFlowAddress = ETH_FLOW_CONTRACTS[chainId] as `0x${string}`;

  // Calculate validTo (30 minutes from now)
  const validTo = Math.floor(Date.now() / 1000) + 30 * 60;

  // Calculate minimum buy amount with 2% slippage for automatic refund eligibility
  const sellAmountBigInt = BigInt(request.amountIn);
  // We use the quote's buyAmount as the minimum (already includes slippage from quote)
  const buyAmount = request.amountOutMinimum || "0";

  // App data hash (can be customized for tracking)
  const appDataHash =
    "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

  const orderData = {
    buyToken: tokenOut.address as `0x${string}`,
    receiver: request.recipient as `0x${string}`,
    sellAmount: sellAmountBigInt,
    buyAmount: BigInt(buyAmount),
    appData: appDataHash,
    feeAmount: BigInt(0),
    validTo,
    partiallyFillable: false,
    quoteId: BigInt(-1),
  };

  try {
    const hash = await walletClient.writeContract({
      address: ethFlowAddress,
      abi: ETH_FLOW_ABI,
      functionName: "createOrder",
      args: [orderData],
      value: sellAmountBigInt,
      chain: walletClient.chain,
      account: walletClient.account!,
    });

    return {
      orderId: hash,
    };
  } catch (error) {
    if (isUserRejectionError(error)) {
      throw new Error("USER_REJECTED");
    }
    throw error;
  }
};

export const executeCowSwap = async (
  request: CowSwapSwapRequest,
  chainId: number,
  publicClient: PublicClient,
  walletClient: WalletClient
): Promise<CowSwapSwapResponse> => {
  const tokenIn = getEVMToken(request.tokenIn, chainId);
  const tokenOut = getEVMToken(request.tokenOut, chainId);

  // Check if we should use EthFlow for native ETH
  if (shouldUseEthFlow(tokenIn.symbol || "", chainId)) {
    return executeEthFlowSwap(request, chainId, walletClient, tokenOut);
  }

  // Standard CoW Protocol swap for ERC-20 tokens
  const supportedChainId = getChainIdMapping(chainId);
  const sdk = getTradingSdk(supportedChainId, publicClient, walletClient);

  const parameters: TradeParameters = {
    kind: OrderKind.SELL,
    sellToken: normalizeTokenAddressForSwap(
      tokenIn.address,
      chainId,
      tokenIn.symbol
    ),
    sellTokenDecimals: tokenIn.decimals,
    buyToken: normalizeTokenAddressForSwap(
      tokenOut.address,
      chainId,
      tokenOut.symbol
    ),
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
