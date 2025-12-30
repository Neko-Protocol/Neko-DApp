import { useQuery } from "@tanstack/react-query";
import { Token } from "@uniswap/sdk-core";
import { EVM_TOKENS } from "@/lib/constants/uniswap";

const EVM_TOKEN_PRICE_MAP: Record<string, string> = {
  ETH: "ethereum",
  USDC: "usd-coin",
  USDT: "tether",
  NVDA: "nvidia-ondo-tokenized-stock",
  TSLA: "tesla-ondo-tokenized-stock",
  AAPL: "apple-ondo-tokenized-stock",
  MSFT: "microsoft-ondo-tokenized-stock",
  AMZN: "amazon-ondo-tokenized-stock",
  META: "meta-platforms-ondo-tokenized-stock",
  SPOT: "spotify-ondo-tokenized-stock",
  MA: "mastercard-ondo-tokenized-stock",
  NFLX: "netflix-ondo-tokenized-stock",
};

const fetchEVMTokenPrice = async (tokenSymbol: string): Promise<number> => {
  const coinGeckoId = EVM_TOKEN_PRICE_MAP[tokenSymbol];

  if (!coinGeckoId) {
    if (tokenSymbol === "USDC" || tokenSymbol === "USDT") return 1.0;
    return 0;
  }

  try {
    const url = `/api/coingecko/price?ids=${coinGeckoId}&vs_currencies=usd`;

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      if (response.status === 429) {
        return 0;
      }

      throw new Error(
        `Failed to fetch price: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as {
      [key: string]: { usd?: number } | undefined;
    };

    const price = data[coinGeckoId]?.usd || 0;

    return price;
  } catch (error) {
    if (tokenSymbol === "USDC" || tokenSymbol === "USDT") return 1.0;
    if (tokenSymbol === "ETH") return 3000;
    return 0;
  }
};

export const useEVMTokenPrice = (
  token: Token | string | undefined
): { price: number; isLoading: boolean; error: string | null } => {
  const getTokenSymbol = (): string | null => {
    if (!token) return null;

    if (typeof token === "string") {
      return (
        Object.keys(EVM_TOKENS).find(
          (key) => key === token || EVM_TOKENS[key].symbol === token
        ) || null
      );
    }

    if (token instanceof Token) {
      return token.symbol || null;
    }

    return null;
  };

  const tokenSymbol = getTokenSymbol();

  const {
    data: price = 0,
    isLoading,
    error,
  } = useQuery<number, Error>({
    queryKey: ["evmTokenPrice", tokenSymbol, token],
    queryFn: async () => {
      if (!tokenSymbol) {
        return 0;
      }
      return await fetchEVMTokenPrice(tokenSymbol);
    },
    enabled: Boolean(tokenSymbol && token),
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 2,
    throwOnError: false,
  });

  return {
    price,
    isLoading,
    error: error ? error.message : null,
  };
};
