import React from "react";
import Link from "next/link";
import type { Asset } from "@neko/oracle";
import { useOracle } from "@/features/stocks/hooks/useOracle";
import { useOracleAssetPrice } from "@/features/stocks/hooks/useOracleAssetPrice";
import { formatAsset, formatPrice } from "@/features/stocks/utils/oracleUtils";
import { STOCK_INFO } from "@/features/stocks/utils/stockInfo";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Clock,
  Layers,
} from "lucide-react";

const OracleVisualizer: React.FC = () => {
  const {
    assets,
    baseAsset,
    decimals,
    resolution,
    isLoading,
    isLoadingBase,
    isLoadingDecimals,
    isLoadingResolution,
    isLoadingAssets,
    assetsError,
  } = useOracle();

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-[#081F5C] tracking-tight mb-3">
            Oracle Dashboard
          </h1>
          <p className="text-[#7096D1] text-lg leading-relaxed">
            Real-time price data and RWA metadata from the RWACLE
          </p>
        </div>

        {/* Oracle Configuration Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          <StatCard
            icon={<Database className="h-5 w-5" />}
            label="Base Asset"
            value={
              isLoadingBase ? (
                <LoadingDots />
              ) : baseAsset ? (
                formatAsset(baseAsset)
              ) : (
                "N/A"
              )
            }
            isLoading={isLoadingBase}
          />

          <StatCard
            icon={<Layers className="h-5 w-5" />}
            label="Decimals"
            value={
              isLoadingDecimals ? (
                <LoadingDots />
              ) : decimals !== undefined ? (
                decimals
              ) : (
                "N/A"
              )
            }
            isLoading={isLoadingDecimals}
          />

          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Resolution"
            value={
              isLoadingResolution ? (
                <LoadingDots />
              ) : resolution !== undefined ? (
                `${resolution}s`
              ) : (
                "N/A"
              )
            }
            isLoading={isLoadingResolution}
          />

          <StatCard
            icon={<Activity className="h-5 w-5" />}
            label="Total Assets"
            value={
              isLoadingAssets ? <LoadingDots /> : assets ? assets.length : "0"
            }
            isLoading={isLoadingAssets}
          />
        </div>

        {/* Assets and Prices Section */}
        {assetsError && (
          <div className="rounded-2xl bg-red-50 p-6 shadow-md border border-red-200 mb-8">
            <p className="text-red-600 font-semibold">
              Error loading assets:{" "}
              {assetsError instanceof Error
                ? assetsError.message
                : "Unknown error"}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl bg-gradient-to-br from-[#4169B8] to-[#334EAC] p-12 shadow-xl">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce"></div>
              </div>
              <span className="text-white text-lg font-medium">
                Loading oracle data...
              </span>
            </div>
          </div>
        ) : assets && assets.length > 0 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-[#081F5C] mb-2">
                Assets & Prices
              </h2>
              <p className="text-[#7096D1] text-base">
                Live price feeds from the oracle
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets
                .filter((asset: Asset) => {
                  const assetStr = formatAsset(asset);
                  return assetStr !== "0";
                })
                .slice(0, 6)
                .map((asset: Asset, index: number) => (
                  <AssetPriceCard
                    key={index}
                    asset={asset}
                    decimals={decimals}
                    baseAsset={baseAsset}
                  />
                ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-[#4169B8] to-[#334EAC] p-12 shadow-xl text-center">
            <p className="text-white text-lg font-medium">
              No assets found in the oracle
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  isLoading?: boolean;
}> = ({ icon, label, value, isLoading }) => {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#4169B8] to-[#334EAC] p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:from-[#4A73C4] hover:to-[#3D5AC0]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/10 text-white/70 rounded-lg backdrop-blur-sm">
          {icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          {label}
        </p>
      </div>
      <h3 className="text-3xl font-bold text-white">
        {isLoading ? <LoadingDots /> : value}
      </h3>
    </div>
  );
};

// Loading Dots Component
export const LoadingDots = () => (
  <span className="inline-flex gap-1">
    <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse"></span>
    <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse [animation-delay:0.2s]"></span>
    <span className="w-2 h-2 bg-white/50 rounded-full animate-pulse [animation-delay:0.4s]"></span>
  </span>
);

// Component for displaying asset price information
const AssetPriceCard: React.FC<{
  asset: Asset;
  decimals?: number;
  baseAsset?: Asset;
}> = ({ asset }) => {
  const { lastPrice, priceHistory, isLoadingPrice, assetStr } =
    useOracleAssetPrice(asset);

  const stockInfo = STOCK_INFO[assetStr.toUpperCase()];

  // Calculate price change if we have history
  const priceChange = React.useMemo(() => {
    if (!lastPrice || !priceHistory || priceHistory.length < 2) return null;

    const currentPrice = Number(lastPrice.price);
    const previousPrice = Number(priceHistory[1].price);

    if (previousPrice === 0) return null;

    const change = ((currentPrice - previousPrice) / previousPrice) * 100;
    return change;
  }, [lastPrice, priceHistory]);

  return (
    <Link href={`/dashboard/stocks/${assetStr}`} className="block h-full group">
      <div className="rounded-2xl bg-white p-6 shadow-md border border-gray-200 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-[#334EAC]/30 overflow-hidden cursor-pointer h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            {stockInfo && (
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={stockInfo.logo || "/placeholder.svg"}
                  alt={stockInfo.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-black mb-1">
                {stockInfo ? stockInfo.name : assetStr}
              </h3>
              {stockInfo ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#39bfb7]/10 text-[#39bfb7]">
                  {assetStr}
                </span>
              ) : asset.tag === "Stellar" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#39bfb7]/10 text-[#39bfb7]">
                  Stellar
                </span>
              ) : null}
            </div>
          </div>
          {priceChange !== null && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold ${
                priceChange >= 0
                  ? "bg-green-500/10 text-green-600"
                  : "bg-red-500/10 text-red-600"
              }`}
            >
              {priceChange >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {Math.abs(priceChange).toFixed(2)}%
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          {/* Price Display */}
          {isLoadingPrice ? (
            <div className="flex items-center gap-2">
              <LoadingDots />
              <span className="text-gray-500 text-sm">Loading price...</span>
            </div>
          ) : lastPrice ? (
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                Last Price
              </p>
              <p className="text-3xl font-bold text-black mb-2">
                {formatPrice(lastPrice.price)}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(Number(lastPrice.timestamp) * 1000).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No price data available</p>
          )}

          {/* Price History */}
          {priceHistory && priceHistory.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
                Recent Prices ({priceHistory.length})
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {priceHistory
                  .slice(0, 5)
                  .map(
                    (
                      price: { price: bigint; timestamp: bigint },
                      idx: number
                    ) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm items-center"
                      >
                        <span className="font-medium text-black">
                          {formatPrice(price.price)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(
                            Number(price.timestamp) * 1000
                          ).toLocaleTimeString()}
                        </span>
                      </div>
                    )
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default OracleVisualizer;
