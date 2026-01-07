import { useQuery } from "@tanstack/react-query";
import { getAvailableTokens, getTokenAddress } from "@/lib/helpers/soroswap";
import type { Token } from "@/lib/helpers/soroswap";
import {
  Client as RWAOracleClient,
  networks as oracleNetworks,
} from "@neko/rwa-oracle";
import { rpcUrl, networkPassphrase } from "@/lib/constants/network";

/**
 * RWA token codes that should use the oracle
 */
const RWA_TOKENS = ["NVDA", "AAPL", "PLTR", "TSLA", "META"];

/**
 * Map token codes to CoinGecko IDs (for non-RWA tokens)
 */
const TOKEN_PRICE_MAP: Record<string, string> = {
  XLM: "stellar",
  USDC: "usd-coin",
};

/**
 * Get token price from RWA Oracle
 */
const fetchRWAOraclePrice = async (tokenContract: string): Promise<number> => {
  try {
    const oracleContractId = oracleNetworks.testnet.contractId;

    // Create oracle client
    const oracleClient = new RWAOracleClient({
      contractId: oracleContractId,
      networkPassphrase: networkPassphrase,
      rpcUrl: rpcUrl,
    });

    // Call lastprice with the token contract as an asset
    // Asset type in Rust: Asset::Stellar(Address) | Asset::Other(Symbol)
    // In TypeScript: {tag: "Stellar", values: readonly [string]} | {tag: "Other", values: readonly [string]}
    // For Soroban contract addresses, we use "Stellar" tag
    // The contract expects Asset::Stellar(Address) for Soroban contracts
    // According to the contract: "Can be a Stellar Classic or Soroban asset"
    const asset: { tag: "Stellar"; values: readonly [string] } = {
      tag: "Stellar",
      values: [tokenContract] as readonly [string],
    };
    const result = await oracleClient.lastprice({ asset }, { simulate: true });

    // Extract price from result
    // result.result is Option<PriceData>, which is {tag: "Some", values: PriceData} or {tag: "None", values: void}
    const optionResult = result.result as
      | {
          tag: "Some" | "None";
          values?: {
            price: bigint | string | number;
            timestamp: bigint | string | number;
          };
        }
      | null
      | undefined;
    if (optionResult && optionResult.tag === "Some" && optionResult.values) {
      const priceData = optionResult.values;
      // Price is in i128, need to convert to number
      // The oracle stores price with decimals, typically 7 decimals
      const priceValue = BigInt(priceData.price.toString());
      const decimals = 7; // Oracle decimals
      const price = Number(priceValue) / Math.pow(10, decimals);
      return price;
    }

    return 0;
  } catch (error) {
    console.error(
      `Failed to fetch RWA oracle price for ${tokenContract}:`,
      error
    );
    return 0;
  }
};

/**
 * Get token price in USD from CoinGecko API (for non-RWA tokens)
 */
const fetchTokenPrice = async (tokenCode: string): Promise<number> => {
  const coinGeckoId = TOKEN_PRICE_MAP[tokenCode];

  if (!coinGeckoId) {
    // If token not in map, return 0 or a default price
    // For USDC, return 1.0
    if (tokenCode === "USDC") return 1.0;
    // For other tokens, try to fetch or return 0
    return 0;
  }

  try {
    // Use Next.js API route to avoid CORS issues
    const response = await fetch(
      `/api/coingecko/price?ids=${coinGeckoId}&vs_currencies=usd`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch price");
    }

    const data = (await response.json()) as {
      [key: string]: { usd?: number } | undefined;
    };
    return data[coinGeckoId]?.usd || 0;
  } catch (error) {
    console.error(`Failed to fetch price for ${tokenCode}:`, error);
    // Return default prices for known tokens
    if (tokenCode === "USDC") return 1.0;
    if (tokenCode === "XLM") return 0.1; // Fallback price
    return 0;
  }
};

/**
 * Hook to get token price in USD
 */
export const useTokenPrice = (token: Token | string | undefined) => {
  // Get token code from token address
  const getTokenCode = (): string | null => {
    if (!token) return null;

    const tokenAddress = getTokenAddress(token);
    const availableTokens = getAvailableTokens();

    for (const [code, info] of Object.entries(availableTokens)) {
      if (info.contract === tokenAddress) {
        return code;
      }
    }

    return null;
  };

  const tokenCode = getTokenCode();

  const {
    data: price = 0,
    isLoading,
    error,
  } = useQuery<number, Error>({
    queryKey: ["tokenPrice", tokenCode, token],
    queryFn: async () => {
      if (!tokenCode) return 0;

      // Check if token is RWA
      const isRWA = RWA_TOKENS.includes(tokenCode);

      if (isRWA) {
        // Get price from RWA Oracle
        const tokenAddress = getTokenAddress(token!);
        return await fetchRWAOraclePrice(tokenAddress);
      } else {
        // Get price from CoinGecko for USDC and XLM
        return await fetchTokenPrice(tokenCode);
      }
    },
    enabled: Boolean(tokenCode && token),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider stale after 30 seconds
    retry: 2,
    throwOnError: false,
  });

  return {
    price,
    isLoading,
    error: error ? error.message : null,
  };
};
