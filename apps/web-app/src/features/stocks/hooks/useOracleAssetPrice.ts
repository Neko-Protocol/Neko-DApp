import { useQuery } from "@tanstack/react-query";
import oracleClient from "@/contracts/oracle";
import type { Asset } from "@neko/oracle";
import { formatAsset } from "../utils/oracleUtils";

export const useOracleAssetPrice = (asset: Asset) => {
  const assetStr = formatAsset(asset);

  const { data: lastPrice, isLoading: isLoadingPrice } = useQuery({
    queryKey: ["oracle", "lastprice", assetStr],
    queryFn: async () => {
      const result = await oracleClient.lastprice({ asset });
      return result.result;
    },
  });

  const { data: priceHistory } = useQuery({
    queryKey: ["oracle", "prices", assetStr],
    queryFn: async () => {
      const result = await oracleClient.prices({ asset, records: 10 });
      return result.result;
    },
  });

  return {
    lastPrice,
    priceHistory,
    isLoadingPrice,
    assetStr,
  };
};
