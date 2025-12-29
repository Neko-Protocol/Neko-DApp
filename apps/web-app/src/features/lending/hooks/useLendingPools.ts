import { useQuery } from "@tanstack/react-query";
import { Client as RwaLendingClient, networks } from "@neko/rwa-lending";
import { rpcUrl, networkPassphrase } from "@/lib/constants/network";
import { fromSmallestUnit } from "@/lib/helpers/swapUtils";
import { getAvailableTokens } from "@/lib/helpers/soroswap";

interface LendingPool {
  asset: string;
  assetCode: string;
  poolBalance: string; // Human-readable balance
  poolBalanceUSD: string; // USD value
  interestRate: number; // APY percentage
  bTokenRate: string; // Current bToken rate (for calculating returns)
  isActive: boolean;
}

/**
 * Hook to get all active lending pools from the RWA lending contract
 */
export const useLendingPools = () => {
  // Get available debt assets (USDC, XLM, etc.)
  const availableTokens = getAvailableTokens();

  // Known debt assets that can be deposited
  const debtAssets = ["USDC", "XLM"].filter((code) => {
    const token = availableTokens[code];
    return token && token.contract;
  });

  return useQuery<LendingPool[]>({
    queryKey: ["lendingPools"],
    queryFn: async () => {
      // Create RWA lending client with new contract ID
      const contractId = networks.testnet.contractId;
      console.log("Using contract ID:", contractId);

      const client = new RwaLendingClient({
        contractId: contractId,
        rpcUrl: rpcUrl,
        networkPassphrase: networkPassphrase,
      });

      // Get pool state
      let poolState;
      try {
        const poolStateTx = await client.get_pool_state({ simulate: true });
        poolState = poolStateTx.result;
        console.log("Pool state:", poolState);
      } catch (error) {
        // Handle expected errors (contract not deployed or no data)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isMissingValue =
          errorMessage.includes("MissingValue") ||
          errorMessage.includes("Storage") ||
          errorMessage.includes("non-existing value");

        if (isMissingValue) {
          // Contract not deployed or no pool state - this is expected
          console.debug(
            "Lending pools - Contract not initialized or no pool state available"
          );
        } else {
          // Unexpected error
          console.error("Lending pools - Error getting pool state:", error);
        }
        return [];
      }

      const isPoolActive = poolState?.tag === "Active";

      if (!isPoolActive) {
        console.log("Pool is not active, state:", poolState);
        return []; // Return empty if pool is not active
      }

      // Fetch data for each debt asset
      const pools: LendingPool[] = [];

      console.log("Available debt assets to check:", debtAssets);
      console.log("Available tokens:", availableTokens);

      for (const assetCode of debtAssets) {
        try {
          const token = availableTokens[assetCode];
          if (!token?.contract) {
            console.log(`Token ${assetCode} not found in availableTokens`);
            continue;
          }

          console.log(
            `Checking pool for ${assetCode} (contract: ${token.contract})`
          );

          // Get pool balance - the contract expects the asset Symbol (e.g., "USDC", "XLM")
          const balanceTx = await client.get_pool_balance(
            { asset: assetCode },
            { simulate: true }
          );
          const balanceValue = balanceTx.result;
          console.log(
            `Balance result for ${assetCode}:`,
            balanceValue,
            typeof balanceValue
          );

          // balanceValue could be bigint, string, or null
          if (balanceValue === null || balanceValue === undefined) {
            console.log(`No balance value for ${assetCode} (null/undefined)`);
            continue;
          }

          // Convert balance to human-readable format
          const decimals = token.decimals || 7;
          // Handle different types: bigint, string, or number
          const balanceStr =
            typeof balanceValue === "bigint"
              ? balanceValue.toString()
              : typeof balanceValue === "string"
                ? balanceValue
                : String(balanceValue);
          const balanceBigInt = BigInt(balanceStr);
          const poolBalance = fromSmallestUnit(
            balanceBigInt.toString(),
            decimals
          );
          console.log(
            `Converted balance for ${assetCode}: ${poolBalance} (from ${balanceStr})`
          );

          // Skip if balance is 0 (pool has no assets)
          if (parseFloat(poolBalance) === 0) {
            console.log(`Pool balance is 0 for ${assetCode}, skipping`);
            continue;
          }

          console.log(`Found pool for ${assetCode} with balance:`, poolBalance);

          // Get interest rate
          let interestRate = 0;
          try {
            const interestRateTx = await client.get_interest_rate(
              { asset: assetCode },
              { simulate: true }
            );
            const interestRateResult = interestRateTx.result as
              | { ok?: bigint; err?: { message?: string } }
              | null
              | undefined;
            // Result<i128> has structure { ok: i128 } or { err: Error }
            if (
              interestRateResult &&
              "ok" in interestRateResult &&
              interestRateResult.ok
            ) {
              // Interest rate is stored as i128, typically in basis points or as a decimal
              // Assuming it's stored as basis points (e.g., 500 = 5%)
              const rateValue = Number(interestRateResult.ok);
              interestRate = rateValue / 100; // Convert to percentage
            }
          } catch {
            // If interest rate fetch fails, use 0
          }

          // Get bToken rate (for calculating returns)
          let bTokenRate = "1.0";
          try {
            const bTokenRateTx = await client.get_b_token_rate(
              { asset: assetCode },
              { simulate: true }
            );
            const bTokenRateValue = bTokenRateTx.result;
            if (bTokenRateValue) {
              const rateBigInt = BigInt(bTokenRateValue.toString());
              // bToken rate is stored with SCALAR_9 (9 decimals) in the contract
              bTokenRate = fromSmallestUnit(rateBigInt.toString(), 9);
            }
          } catch {
            // If bToken rate fetch fails, use 1.0
          }

          pools.push({
            asset: token.contract,
            assetCode,
            poolBalance,
            poolBalanceUSD: "0", // Will be calculated below
            interestRate,
            bTokenRate,
            isActive: true,
          });
        } catch (error) {
          // Skip assets that fail to fetch (not configured or error)
          console.error(`Failed to fetch pool data for ${assetCode}:`, error);
          continue;
        }
      }

      // Calculate USD values for each pool (will be calculated in component using useTokenPrice)
      // For now, just set placeholder
      for (const pool of pools) {
        pool.poolBalanceUSD = "Calculating...";
      }

      console.log(`Total pools found: ${pools.length}`, pools);
      return pools;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
    retry: 2,
    throwOnError: false,
  });
};
