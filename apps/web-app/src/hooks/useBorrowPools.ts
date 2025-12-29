import { useQuery } from "@tanstack/react-query";
import { Client as RwaLendingClient, networks } from "@neko/rwa-lending";
import { rpcUrl, networkPassphrase } from "@/lib/constants/network";
import { fromSmallestUnit } from "@/lib/helpers/swapUtils";
import { getAvailableTokens } from "@/lib/helpers/soroswap";

interface BorrowPool {
  asset: string;
  assetCode: string;
  collateralToken: string; // RWA token contract used as collateral
  collateralTokenCode: string; // RWA token code (e.g., "NVDA")
  collateralFactor: number; // Collateral factor as percentage (e.g., 75 for 75%)
  interestRate: number; // Borrow interest rate as APY percentage
  poolBalance: string; // Available to borrow
  poolBalanceUSD: string; // USD value
  isActive: boolean;
}

/**
 * Hook to get all active borrow pools from the RWA lending contract
 * Only shows pools where:
 * - There's an RWA token configured as collateral
 * - There's a debt asset configured
 * - Pool has balance available to borrow
 */
export const useBorrowPools = () => {
  // Get available tokens
  const availableTokens = getAvailableTokens();

  // Only NVDA is configured as collateral in this contract
  const rwaTokens = ["NVDA"].filter((code) => {
    const token = availableTokens[code];
    return token && token.contract;
  });

  // Known debt assets that can be borrowed
  const debtAssets = ["USDC", "XLM"].filter((code) => {
    const token = availableTokens[code];
    return token && token.contract;
  });

  return useQuery<BorrowPool[]>({
    queryKey: ["borrowPools"],
    queryFn: async () => {
      // Create RWA lending client with new contract ID
      const contractId = networks.testnet.contractId;
      console.log("Borrow pools - Using contract ID:", contractId);

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
        console.log("Borrow pools - Pool state:", poolState);
      } catch (error) {
        console.error("Borrow pools - Error getting pool state:", error);
        return [];
      }

      const isPoolActive = poolState?.tag === "Active";

      if (!isPoolActive) {
        console.log("Borrow pools - Pool is not active, state:", poolState);
        return []; // Return empty if pool is not active
      }

      const pools: BorrowPool[] = [];

      // For each combination of RWA collateral token and debt asset
      for (const rwaCode of rwaTokens) {
        const rwaToken = availableTokens[rwaCode];
        if (!rwaToken?.contract) continue;

        // Get collateral factor for this RWA token
        let collateralFactor = 0;
        try {
          const collateralFactorTx = await client.get_collateral_factor(
            { rwa_token: rwaToken.contract },
            { simulate: true }
          );
          const factorValue = collateralFactorTx.result;
          if (factorValue) {
            // Collateral factor is stored as basis points (e.g., 7500 = 75%)
            collateralFactor = Number(factorValue) / 100;
          }
        } catch {
          // If collateral factor fetch fails, skip this RWA token
          continue;
        }

        // Skip if collateral factor is 0 (not configured)
        if (collateralFactor === 0) continue;

        // For each debt asset, create a borrow pool
        for (const debtCode of debtAssets) {
          const debtToken = availableTokens[debtCode];
          if (!debtToken?.contract) continue;

          try {
            // Get pool balance for this debt asset
            const balanceTx = await client.get_pool_balance(
              { asset: debtCode },
              { simulate: true }
            );
            const balanceValue = balanceTx.result;
            if (!balanceValue) continue;

            // Convert balance to human-readable format
            const decimals = debtToken.decimals || 7;
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
              `Borrow pool - Converted balance for ${debtCode}: ${poolBalance} (from ${balanceStr})`
            );

            // Skip if balance is 0 (pool has no assets to borrow)
            if (parseFloat(poolBalance) === 0) {
              console.log(
                `Pool balance is 0 for ${debtCode} with ${rwaCode} collateral, skipping`
              );
              continue;
            }

            console.log(
              `Found borrow pool for ${debtCode} with ${rwaCode} collateral, balance:`,
              poolBalance
            );

            // Get interest rate for borrowing
            // Interest rate is calculated dynamically based on utilization
            // Returns value in basis points (BASIS_POINTS = 10,000, so 100 = 1%)
            let interestRate = 0;
            try {
              const interestRateTx = await client.get_interest_rate(
                { asset: debtCode },
                { simulate: true }
              );
              const interestRateResult = interestRateTx.result as
                | { ok?: bigint; err?: { message?: string } }
                | null
                | undefined;
              // Result<i128> has structure { ok: i128 } or { err: Error }
              // Interest rate is in basis points (e.g., 100 = 1%, 500 = 5%)
              if (
                interestRateResult &&
                "ok" in interestRateResult &&
                interestRateResult.ok
              ) {
                const rateValue = Number(interestRateResult.ok);
                // Convert from basis points to percentage: 100 basis points = 1%
                interestRate = rateValue / 100;
                console.log(
                  `Interest rate for ${debtCode}: ${rateValue} basis points = ${interestRate}%`
                );
              } else if (interestRateResult && "err" in interestRateResult) {
                console.warn(
                  `Error getting interest rate for ${debtCode}:`,
                  interestRateResult.err
                );
              }
            } catch (error) {
              // If interest rate fetch fails, log and use 0
              console.warn(
                `Failed to fetch interest rate for ${debtCode}:`,
                error
              );
            }

            pools.push({
              asset: debtToken.contract,
              assetCode: debtCode,
              collateralToken: rwaToken.contract,
              collateralTokenCode: rwaCode,
              collateralFactor,
              interestRate,
              poolBalance,
              poolBalanceUSD: "Calculating...", // Will be calculated in component
              isActive: true,
            });
          } catch (error) {
            // Skip assets that fail to fetch (not configured or error)
            console.debug(
              `Failed to fetch borrow pool data for ${debtCode} with ${rwaCode} collateral:`,
              error
            );
            continue;
          }
        }
      }

      console.log(`Total borrow pools found: ${pools.length}`, pools);
      return pools;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
    retry: 2,
    throwOnError: false,
  });
};
