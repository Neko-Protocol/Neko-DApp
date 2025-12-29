import React from "react";
import GraphicHoldingCard from "./GraphicHoldingCard";
import PerformanceChart from "@/components/charts/PerformanceChart";
import { useWallet } from "@/hooks/useWallet";

const GraphicStats: React.FC = () => {
  const { balances, address, isFetchingBalances } = useWallet();

  // Convert balances object to array and filter out zero balances
  const balanceEntries = Object.entries(balances).filter(([, balance]) => {
    const balanceNum = parseFloat(balance.balance?.replace(/,/g, "") ?? "0");
    return balanceNum > 0;
  });

  // Format balance value for display (shows token amount, not USD)
  const formatBalanceValue = (balance: string): string => {
    // Balance already comes formatted with commas from fetchBalances
    // Just ensure it displays nicely
    return balance;
  };

  // Get asset name from balance
  const getAssetName = (balance: (typeof balances)[string]): string => {
    if (balance.asset_type === "native") {
      return "XLM";
    }
    if (balance.asset_type === "liquidity_pool_shares") {
      return "LP Shares";
    }
    return balance.asset_code ?? "Unknown";
  };

  // Get platform/issuer info
  const getPlatform = (balance: (typeof balances)[string]): string => {
    if (balance.asset_type === "native") {
      return "Stellar";
    }
    if (balance.asset_type === "liquidity_pool_shares") {
      return "Liquidity Pool";
    }
    if (balance.asset_issuer) {
      // Shorten issuer address for display
      const issuer = balance.asset_issuer;
      return `Stellar • ${issuer.substring(0, 6)}...${issuer.substring(issuer.length - 4)}`;
    }
    return "Stellar";
  };

  return (
    <div className="flex w-full gap-6 px-6 py-8">
      <PerformanceChart />

      <div className="flex-1 rounded-3xl bg-[#081F5C] p-8 border border-[#334EAC]/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-[#FFF9F0]">
            Wallet Holdings
          </h3>
          {isFetchingBalances && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#39bfb7] rounded-full animate-pulse"></div>
              <span className="text-[#7096D1] text-xs">Updating...</span>
            </div>
          )}
        </div>

        {!address ? (
          <div className="py-8 text-center">
            <p className="text-[#7096D1] text-sm">
              Connect your wallet to view holdings
            </p>
          </div>
        ) : balanceEntries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[#7096D1] text-sm mb-2">No holdings found</p>
            <p className="text-[#7096D1] text-xs">
              Fund your account to see balances here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {balanceEntries.map(([key, balance]) => {
              const assetName = getAssetName(balance);
              const platform = getPlatform(balance);
              const balanceValue = balance.balance ?? "0";
              const formattedValue = formatBalanceValue(balanceValue);

              return (
                <GraphicHoldingCard
                  key={key}
                  name={assetName}
                  platform={platform}
                  value={formattedValue}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphicStats;
