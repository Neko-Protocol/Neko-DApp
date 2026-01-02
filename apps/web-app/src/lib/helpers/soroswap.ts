/**
 * Soroswap SDK utility functions
 * Using @soroswap/sdk for all swap operations
 */

// TransactionBuilder will be used when signing transactions in useSwap hook
import {
  SoroswapSDK,
  SupportedNetworks,
  TradeType,
  SupportedProtocols,
} from "@soroswap/sdk";
import { stellarNetwork } from "../constants/network";

// ========================================
// CONSTANTS
// ========================================
const SOROSWAP_API_URL = "https://api.soroswap.finance";
const DEFAULT_TIMEOUT = 50000; // 8 seconds timeout - balance

import {
  Token,
  QuoteRequest,
  QuoteResponse,
  BuildRequest,
  BuildResponse,
  SendRequest,
  SendResponse,
  AddLiquidityRequest,
  AddLiquidityResponse,
  PoolInfo,
  GetPoolRequest,
} from "../types/soroswapTypes";

// Re-export types for backward compatibility
export type {
  Token,
  QuoteRequest,
  QuoteResponse,
  BuildRequest,
  BuildResponse,
  SendRequest,
  SendResponse,
  AddLiquidityRequest,
  AddLiquidityResponse,
  PoolInfo,
  GetPoolRequest,
};

// ========================================
// API KEY MANAGEMENT
// ========================================
/**
 * Get API key from environment or localStorage
 */
export const getApiKey = (): string | null => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const envKey = process.env.NEXT_PUBLIC_SOROSWAP_API_KEY;
  const envKeyStr = typeof envKey === "string" ? envKey : "";
  if (envKeyStr && envKeyStr.trim() !== "") {
    return envKeyStr.trim();
  }
  const localKey = localStorage.getItem("soroswap_api_key");
  if (localKey && localKey.trim() !== "") {
    return localKey.trim();
  }
  return null;
};

/**
 * Set API key in localStorage
 */
export const setApiKey = (apiKey: string): void => {
  localStorage.setItem("soroswap_api_key", apiKey);
};

/**
 * Check if API key is configured
 */
export const hasApiKey = (): boolean => {
  return getApiKey() !== null;
};

// ========================================
// NETWORK MANAGEMENT
// ========================================
/**
 * Get current network name
 */
const getCurrentNetwork = (): string => {
  const network = stellarNetwork?.toLowerCase() || "testnet";

  if (network === "local" || network === "standalone") {
    return "standalone";
  }
  if (network === "public" || network === "mainnet") {
    return "mainnet";
  }
  return "testnet";
};

/**
 * Get SDK network enum from network string
 */
const getSDKNetwork = (): SupportedNetworks => {
  const network = getCurrentNetwork();
  const networkLower = network.toLowerCase();

  if (networkLower === "mainnet" || networkLower === "public") {
    return SupportedNetworks.MAINNET;
  }
  // STANDALONE may not exist, fallback to TESTNET
  if (networkLower === "standalone" || networkLower === "local") {
    return SupportedNetworks.TESTNET; // Fallback for local/standalone
  }
  return SupportedNetworks.TESTNET;
};

// getStellarNetwork removed - not needed as SDK handles network internally

// Singleton SDK instance
let sdkInstance: SoroswapSDK | null = null;

/**
 * Get or create Soroswap SDK instance (singleton pattern)
 */
const getSoroswapSDK = (): SoroswapSDK => {
  // Return existing instance if available
  if (sdkInstance) {
    return sdkInstance;
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      "Soroswap API key is not configured. Please add your API key in the settings or via environment variable PUBLIC_SOROSWAP_API_KEY (or VITE_SOROSWAP_API_KEY). Get your key at https://api.soroswap.finance/login"
    );
  }

  // Create new SDK instance with increased timeout
  sdkInstance = new SoroswapSDK({
    apiKey: apiKey,
    baseUrl: SOROSWAP_API_URL,
    defaultNetwork: getSDKNetwork(),
    timeout: DEFAULT_TIMEOUT, // 8 seconds
  });

  return sdkInstance;
};

// ========================================
// API REQUEST HELPER
// ========================================
/**
 * Make API request to Soroswap REST API
 */
const makeAPIRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      "Soroswap API key is not configured. Please add your API key in the settings or via environment variable PUBLIC_SOROSWAP_API_KEY (or VITE_SOROSWAP_API_KEY). Get your key at https://api.soroswap.finance/login"
    );
  }

  const url = `${SOROSWAP_API_URL}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonData = await response.json();
    return jsonData as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred during API request");
  }
};

// ========================================
// POOL FUNCTIONS (API)
// ========================================
/**
 * Get pool information for two tokens using Soroswap API
 */
export const getPool = async (request: GetPoolRequest): Promise<PoolInfo[]> => {
  // Format tokens as contract address strings
  const tokenA = formatTokenForAPI(request.tokenA);
  const tokenB = formatTokenForAPI(request.tokenB);

  // Validate contract addresses format
  if (!isValidContractAddress(tokenA)) {
    throw new Error(
      `Invalid contract address for tokenA: ${tokenA}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }
  if (!isValidContractAddress(tokenB)) {
    throw new Error(
      `Invalid contract address for tokenB: ${tokenB}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }

  // Get current network
  const network = getCurrentNetwork();
  const apiNetwork =
    network === "standalone" || network === "local" ? "testnet" : network;

  // Build query parameters
  const protocols = request.protocols || ["soroswap"];
  const protocolParam = protocols
    .map((p: string) => `protocol=${encodeURIComponent(p)}`)
    .join("&");
  const queryParams = `?network=${apiNetwork}&${protocolParam}`;

  // Build endpoint URL
  const endpoint = `/pools/${tokenA}/${tokenB}${queryParams}`;

  // Log request details in development
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Soroswap Get Pool Request:", {
      tokenA,
      tokenB,
      network: apiNetwork,
      protocols,
      endpoint,
    });
  }

  try {
    const pools = await makeAPIRequest<PoolInfo[]>(endpoint, {
      method: "GET",
    });

    // Minimal logging for performance
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_VERBOSE_LOGGING === "true"
    ) {
      console.log("💧 Pool information received:", pools);
    }

    return pools;
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message;

      if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
        // Pool doesn't exist - return empty array
        return [];
      }

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("401") ||
        errorMessage.includes("403")
      ) {
        throw new Error(
          "Soroswap API key is invalid or expired. Please check your API key configuration at https://api.soroswap.finance/login"
        );
      }

      throw error;
    }

    throw error;
  }
};

// ========================================
// TOKEN FORMATTING
// ========================================
/**
 * Format token for API request
 * Assets must be contract addresses as strings
 */
const formatTokenForAPI = (token: Token | string): string => {
  if (typeof token === "string") {
    return token;
  }

  if (token.type === "native") {
    return TOKENS.XLM;
  }

  if (token.contract) {
    if (!token.contract.startsWith("C")) {
      throw new Error(
        `Invalid contract address format: ${token.contract}. Contract addresses should start with 'C'.`
      );
    }
    return token.contract;
  }

  if (token.code && token.issuer) {
    throw new Error(
      "Classic assets (code+issuer) not supported. Use contract addresses instead."
    );
  }

  throw new Error(
    "Invalid token format: must be string address or Token with contract"
  );
};

/**
 * Convert amount to smallest unit (stroops for XLM with 7 decimals)
 */
const toSmallestUnit = (amount: string, decimals: number = 7): bigint => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return BigInt(0);

  const multiplier = BigInt(10 ** decimals);
  const amountFloat = numAmount * Number(multiplier);
  return BigInt(Math.floor(amountFloat));
};

/**
 * Verify if a contract address is valid format
 */
export const isValidContractAddress = (address: string): boolean => {
  return address.startsWith("C") && address.length === 56;
};

/**
 * Get explorer URL for a token contract
 */
export const getTokenExplorerUrl = (
  contractAddress: string,
  network: string = "testnet"
): string => {
  const networkParam = network === "mainnet" ? "" : `/${network}`;
  return `https://stellar.expert/explorer${networkParam}/contract/${contractAddress}`;
};

/**
 * Get token address from Token object or string
 */
export const getTokenAddress = (token: Token | string): string => {
  if (typeof token === "string") {
    return token;
  }

  if (token.type === "native") {
    return TOKENS.XLM;
  }

  if (token.contract) {
    return token.contract;
  }

  throw new Error(
    "Invalid token format: must be string address or Token with contract"
  );
};

// ========================================
// SWAP FUNCTIONS (SDK ONLY)
// ========================================
/**
 * Get a quote for a swap using Soroswap SDK
 */
export const getQuote = async (
  request: QuoteRequest
): Promise<QuoteResponse> => {
  // Format tokens as contract address strings
  const assetIn = formatTokenForAPI(request.assetIn);
  const assetOut = formatTokenForAPI(request.assetOut);

  // Validate contract addresses format
  if (!isValidContractAddress(assetIn)) {
    throw new Error(
      `Invalid contract address for assetIn: ${assetIn}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }
  if (!isValidContractAddress(assetOut)) {
    throw new Error(
      `Invalid contract address for assetOut: ${assetOut}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }

  // Convert amount to smallest unit as BigInt
  const amountInSmallestUnit = toSmallestUnit(request.amount, 7);

  // Validate amount is greater than 0
  if (amountInSmallestUnit <= BigInt(0)) {
    throw new Error(
      `Invalid amount: ${request.amount}. Amount must be greater than 0.`
    );
  }

  // Get SDK instance
  const soroswapSDK = getSoroswapSDK();
  const sdkNetwork = getSDKNetwork();

  // Log request details in development for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Soroswap Quote Request Details:", {
      assetIn,
      assetOut,
      amount: request.amount,
      amountInSmallestUnit: amountInSmallestUnit.toString(),
      tradeType: request.tradeType,
      protocols: request.protocols,
      slippageBps: request.slippageBps,
      sdkNetwork,
    });
  }

  // Map tradeType to SDK TradeType enum
  const tradeType =
    request.tradeType === "EXACT_IN" ? TradeType.EXACT_IN : TradeType.EXACT_OUT;

  // Map protocols to SDK SupportedProtocols enum
  // For live quotes, use only SOROSWAP for faster response
  const protocols = request.protocols?.length
    ? (request.protocols as unknown[]).map((proto) => {
        if (typeof proto === "string") {
          const protoLower = proto.toLowerCase();
          if (protoLower === "soroswap") return SupportedProtocols.SOROSWAP;
          if (protoLower === "phoenix") return SupportedProtocols.PHOENIX;
          if (protoLower === "aqua") return SupportedProtocols.AQUA;
          return SupportedProtocols.SOROSWAP;
        }
        return proto as SupportedProtocols;
      })
    : [SupportedProtocols.SOROSWAP]; // Default to SOROSWAP only for speed

  // Debug log in development (minimal logging for performance)
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_VERBOSE_LOGGING === "true"
  ) {
    console.log("Soroswap SDK Quote Request:", {
      assetIn,
      assetOut,
      amount: amountInSmallestUnit.toString(),
      tradeType,
      protocols,
      network: sdkNetwork,
    });
  }

  try {
    // Use SDK quote method
    const quoteResponse = await soroswapSDK.quote(
      {
        assetIn: assetIn,
        assetOut: assetOut,
        amount: amountInSmallestUnit,
        tradeType: tradeType,
        protocols: protocols,
        slippageBps: request.slippageBps || 500, // Default 5% slippage - can reduce for faster quotes
      },
      sdkNetwork
    );

    // Convert SDK response to our QuoteResponse interface
    const response: QuoteResponse = {
      amountOut: quoteResponse.amountOut.toString(),
      amountIn: quoteResponse.amountIn.toString(),
      priceImpact: quoteResponse.priceImpactPct?.toString() || "0",
      protocol: quoteResponse.platform || "soroswap",
      _sdkQuote: quoteResponse, // Store full SDK response for build()
    };

    // Add routes if available
    if ("routes" in quoteResponse && quoteResponse.routes) {
      response.routes = quoteResponse.routes as unknown[];
    }

    // Minimal logging for performance (only in verbose mode)
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_VERBOSE_LOGGING === "true"
    ) {
      console.log("💡 Quote received:");
      console.log(
        `   Input: ${Number(quoteResponse.amountIn) / 10000000} tokens`
      );
      console.log(
        `   Output: ${Number(quoteResponse.amountOut) / 10000000} tokens`
      );
      console.log(`   Price Impact: ${quoteResponse.priceImpactPct}%`);
      console.log(`   Platform: ${quoteResponse.platform}`);
    }

    return response;
  } catch (error) {
    // Enhanced error handling with detailed logging
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Log detailed error information in development
      if (process.env.NODE_ENV === "development") {
        console.error("Soroswap Quote Error:", {
          message: errorMessage,
          assetIn,
          assetOut,
          amount: amountInSmallestUnit.toString(),
          tradeType,
          protocols,
          network: sdkNetwork,
          error: error,
        });

        // Check for axios/HTTP errors
        if ("response" in error) {
          const httpError = error as {
            response?: { status?: number; statusText?: string; data?: unknown };
            config?: { url?: string };
          };
          console.error("HTTP Error Details:", {
            status: httpError.response?.status,
            statusText: httpError.response?.statusText,
            data: httpError.response?.data,
            url: httpError.config?.url,
          });
        }
      }

      if (
        errorMessage.includes("No path found") ||
        errorMessage.includes("No path")
      ) {
        throw new Error(
          "No swap path found for this token pair. This could mean:\n" +
            "• No liquidity pool exists between these tokens\n" +
            "• The token addresses may not be correct for this network\n" +
            "• Try a smaller amount or verify pools exist at https://app.soroswap.finance"
        );
      }

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("401") ||
        errorMessage.includes("403")
      ) {
        throw new Error(
          "Soroswap API key is invalid or expired. Please check your API key configuration at https://api.soroswap.finance/login"
        );
      }

      // Handle 400 Bad Request errors
      if (
        errorMessage.includes("400") ||
        errorMessage.includes("Bad Request")
      ) {
        const errorWithResponse = error as
          | { response?: { data?: unknown } }
          | null
          | undefined;
        const errorDetails =
          "response" in error && errorWithResponse?.response?.data
            ? JSON.stringify(errorWithResponse.response.data)
            : errorMessage;
        throw new Error(
          `Invalid request to Soroswap API (400): ${errorDetails}\n` +
            `Please check:\n` +
            `• Token contract addresses are correct for ${sdkNetwork}\n` +
            `• Amount format is valid\n` +
            `• Network configuration is correct`
        );
      }

      throw error;
    }

    throw error;
  }
};

/**
 * Build a transaction from a quote using Soroswap SDK
 */
export const buildTransaction = async (
  request: BuildRequest
): Promise<BuildResponse> => {
  // Get SDK instance
  const soroswapSDK = getSoroswapSDK();
  const sdkNetwork = getSDKNetwork();

  try {
    // Check if we have the full SDK quote stored
    const sdkQuote = request.quote._sdkQuote;

    if (!sdkQuote) {
      throw new Error("No SDK quote found. Please get a new quote first.");
    }

    // Use SDK build method with stored SDK quote

    const buildResponse = await soroswapSDK.build(
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        quote: sdkQuote as any, // Use stored full SDK quote
        from: request.from,
      },
      sdkNetwork
    );

    // Minimal logging for performance
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_VERBOSE_LOGGING === "true"
    ) {
      console.log("📄 Transaction XDR received from Soroswap SDK");
    }

    return {
      xdr: buildResponse.xdr,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to build transaction: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Send a signed transaction using Soroswap SDK
 */
export const sendTransaction = async (
  request: SendRequest
): Promise<SendResponse> => {
  // Get SDK instance
  const soroswapSDK = getSoroswapSDK();
  const sdkNetwork = getSDKNetwork();

  try {
    // Use SDK send method
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const sendResponse = await soroswapSDK.send(
      request.xdr,
      request.launchtube || false,
      sdkNetwork
    );

    // Extract transaction hash from SDK response
    const sendResponseTyped = sendResponse as
      | { hash?: string; txHash?: string; transactionHash?: string }
      | null
      | undefined;
    const txHash =
      sendResponseTyped?.hash ||
      sendResponseTyped?.txHash ||
      sendResponseTyped?.transactionHash;

    if (!txHash) {
      throw new Error("Transaction hash not found in SDK response");
    }

    // Minimal logging for performance
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_VERBOSE_LOGGING === "true"
    ) {
      console.log(`✅ Transaction sent! Hash: ${txHash}`);
    }

    return {
      txHash: txHash,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Add liquidity to a pool using Soroswap API
 */
export const addLiquidity = async (
  request: AddLiquidityRequest
): Promise<AddLiquidityResponse> => {
  // Format tokens as contract address strings
  const assetA = formatTokenForAPI(request.assetA);
  const assetB = formatTokenForAPI(request.assetB);

  // Validate contract addresses format
  if (!isValidContractAddress(assetA)) {
    throw new Error(
      `Invalid contract address for assetA: ${assetA}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }
  if (!isValidContractAddress(assetB)) {
    throw new Error(
      `Invalid contract address for assetB: ${assetB}. Contract addresses must start with 'C' and be 56 characters long.`
    );
  }

  // Convert amounts to smallest unit as BigInt
  const amountA = toSmallestUnit(request.amountA, 7);
  const amountB = toSmallestUnit(request.amountB, 7);

  // Validate amounts are greater than 0
  if (amountA <= BigInt(0)) {
    throw new Error(
      `Invalid amountA: ${request.amountA}. Amount must be greater than 0.`
    );
  }
  if (amountB <= BigInt(0)) {
    throw new Error(
      `Invalid amountB: ${request.amountB}. Amount must be greater than 0.`
    );
  }

  // Get current network
  const network = getCurrentNetwork();
  const apiNetwork =
    network === "standalone" || network === "local" ? "testnet" : network;

  // Build endpoint URL: /pools/{tokenA}/{tokenB}
  // Add network and protocol as query parameters
  const queryParams = new URLSearchParams({
    network: apiNetwork,
    protocol: "soroswap",
  });
  const endpoint = `/pools/${assetA}/${assetB}?${queryParams.toString()}`;

  // Build request body with amounts and other parameters
  const requestBody = {
    amountA: amountA.toString(),
    amountB: amountB.toString(),
    to: request.to,
    slippageBps: request.slippageBps || 500, // Default 5% slippage
  };

  // Log request details in development for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Soroswap Add Liquidity Request Details:", {
      assetA,
      assetB,
      amountA: request.amountA,
      amountB: request.amountB,
      amountAInSmallestUnit: amountA.toString(),
      amountBInSmallestUnit: amountB.toString(),
      to: request.to,
      slippageBps: request.slippageBps,
      network: apiNetwork,
      endpoint,
      requestBody,
    });
  }

  try {
    // Use API POST method to add liquidity
    // If the pool doesn't exist, adding liquidity will create it automatically
    // Network and protocol are in query params, amounts and other params in body
    const addLiquidityResponse = await makeAPIRequest<{ xdr: string }>(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    // Minimal logging for performance
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_VERBOSE_LOGGING === "true"
    ) {
      console.log("📄 Liquidity transaction XDR received from Soroswap API");
    }

    if (!addLiquidityResponse.xdr) {
      throw new Error("No XDR returned from add liquidity API");
    }

    return {
      xdr: addLiquidityResponse.xdr,
    };
  } catch (error) {
    // Provide better error messages
    if (error instanceof Error) {
      const errorMessage = error.message;

      // If it's already our custom error about pool not existing, re-throw it
      if (errorMessage.includes("No liquidity pool found")) {
        throw error;
      }

      if (
        errorMessage.includes("No path found") ||
        errorMessage.includes("No path") ||
        errorMessage.includes("404")
      ) {
        throw new Error(
          "No liquidity pool found for this token pair. This could mean:\n" +
            "• The pool doesn't exist yet and needs to be created first\n" +
            "• The token addresses may not be correct for this network\n" +
            "• Try creating the pool first or verify pools exist at https://app.soroswap.finance"
        );
      }

      if (
        errorMessage.includes("API key") ||
        errorMessage.includes("401") ||
        errorMessage.includes("403")
      ) {
        throw new Error(
          "Soroswap API key is invalid or expired. Please check your API key configuration at https://api.soroswap.finance/login"
        );
      }

      // Handle 400 Bad Request errors
      if (
        errorMessage.includes("400") ||
        errorMessage.includes("Bad Request")
      ) {
        const errorWithResponse = error as
          | { response?: { data?: unknown } }
          | null
          | undefined;
        const errorDetails =
          "response" in error && errorWithResponse?.response?.data
            ? JSON.stringify(errorWithResponse.response.data)
            : errorMessage;
        throw new Error(
          `Invalid request to Soroswap API (400): ${errorDetails}\n` +
            `Please check:\n` +
            `• Token contract addresses are correct for ${apiNetwork}\n` +
            `• Amount format is valid\n` +
            `• Network configuration is correct`
        );
      }

      throw error;
    }

    throw error;
  }
};

// ========================================
// TOKEN DEFINITIONS
// ========================================
interface TokenInfo {
  name: string;
  contract: string;
  code: string;
  decimals: number;
  icon?: string;
}

const TOKENS_BY_NETWORK: Record<string, Record<string, TokenInfo>> = {
  testnet: {
    XLM: {
      name: "Stellar Lumens",
      contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      code: "XLM",
      decimals: 7,
    },
    USDC: {
      name: "USDCoin",
      contract: "CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK",
      code: "USDC",
      decimals: 7,
    },
    NVDA: {
      name: "NVIDIA Token",
      contract: "CB7IFFWQ2ZB6EHPKWYLLJAWN3LTY3CIHC52ZMYRLB5DAUIBNZMZLOGHG",
      code: "NVDA",
      decimals: 7,
    },
    AAPL: {
      name: "APPLE Token",
      contract: "CCOU5IO7OAHRMQDYARP7FVKYVB5MFHEH36OEAOB4WBR5MJ2HVYDZ5W77",
      code: "AAPL",
      decimals: 7,
    },
    PLTR: {
      name: "PALANTIR Token",
      contract: "CCEJ3BRF5CYF52VV2IKG3AOMXCHJCAZDZX7IHB5OC6A3OI5BHTUXSIBC",
      code: "PLTR",
      decimals: 7,
    },
    TSLA: {
      name: "TESLA Token",
      contract: "CCSFIQ4V7JUZPJT2C3HRTSTQNLPB4F2R4UNPPTUTAD6CMJJ3PILNPAR5",
      code: "TSLA",
      decimals: 7,
    },
    META: {
      name: "META Token",
      contract: "CBAVRJKWQS74PD624TQ4CF2UVX2363CRKC2T6ESZ5KNATATHMJCRVTYV",
      code: "META",
      decimals: 7,
    },
  },
  standalone: {
    XLM: {
      name: "Stellar Lumens",
      contract: "CDMLFMKMMD7MWZP3FKUBZPVHTUEDLSX4BYGYKH4GCESXYHS3IHQ4EIG4",
      code: "XLM",
      decimals: 7,
    },
    USDC: {
      name: "USDCoin",
      contract: "CAXPYMWLMZRSPNM6NE6DGIZRZABQ6TYQASARRJTOKIIJ3ZJCBFRAPW3F",
      code: "USDC",
      decimals: 7,
    },
  },
  mainnet: {
    // Mainnet tokens - add as needed
  },
};

/**
 * Get available tokens for current network
 */
export const getAvailableTokens = (): Record<string, TokenInfo> => {
  const network = getCurrentNetwork();
  return TOKENS_BY_NETWORK[network] || TOKENS_BY_NETWORK.testnet;
};

/**
 * Common token definitions - using correct addresses for current network
 * Assets are contract addresses as strings (not objects)
 */
export const TOKENS: Record<string, string> = (() => {
  const tokens = getAvailableTokens();
  const result: Record<string, string> = {};

  // Create simple mapping: TOKENS.XLM, TOKENS.USDC, etc.
  Object.entries(tokens).forEach(([code, info]) => {
    result[code] = info.contract;
  });

  return result;
})();
