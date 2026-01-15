import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useOracle } from "@/features/stocks/hooks/useOracle";
import { useOracleAssetPrice } from "@/features/stocks/hooks/useOracleAssetPrice";
import { formatAsset } from "@/features/stocks/utils/oracleUtils";
import { STOCK_INFO } from "@/features/stocks/utils/stockInfo";
import type { Asset } from "@neko/oracle";

interface AssetDetailProps {
  symbol: string;
}

const AssetDetail: React.FC<AssetDetailProps> = ({ symbol }) => {
  const router = useRouter();

  // Get all assets to find the matching one
  const { assets } = useOracle();

  const symbolUpper = symbol?.toUpperCase() || "";

  // Find the asset that matches the symbol
  const asset = React.useMemo(() => {
    if (!assets || !symbolUpper) return null;
    return assets.find((a: Asset) => {
      const assetStr = formatAsset(a);
      return assetStr.toUpperCase() === symbolUpper;
    });
  }, [assets, symbolUpper]);

  const defaultAsset: Asset = {
    tag: "Stellar",
    values: [symbolUpper],
  };

  const { lastPrice, priceHistory, isLoadingPrice } = useOracleAssetPrice(
    asset || defaultAsset
  );

  // Calculate price change and prepare chart data
  const chartData = React.useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];
    // Sort by timestamp (oldest first) to ensure chronological order
    const sortedHistory = [...priceHistory].sort(
      (a, b) => Number(a.timestamp) - Number(b.timestamp)
    );
    return sortedHistory.map((p) => {
      // Convert BigInt price to number (7 decimals)
      const priceNum = Number(p.price) / 1e7;
      const date = new Date(Number(p.timestamp) * 1000);
      // Format as date and time for better readability
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const timeStr = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        timestamp: `${dateStr} ${timeStr}`,
        price: priceNum,
        fullTimestamp: Number(p.timestamp) * 1000,
        date: date,
      };
    });
  }, [priceHistory]);

  const priceChange = React.useMemo(() => {
    if (!priceHistory || priceHistory.length < 2) return 0;
    const latest = priceHistory[priceHistory.length - 1];
    const oldest = priceHistory[0];
    const currentPrice = Number(latest.price) / 1e7;
    const previousPrice = Number(oldest.price) / 1e7;
    if (previousPrice === 0) return 0;
    return ((currentPrice - previousPrice) / previousPrice) * 100;
  }, [priceHistory]);

  const currentPrice = React.useMemo(() => {
    if (lastPrice) {
      return Number(lastPrice.price) / 1e7; // Convert from BigInt with 7 decimals
    }
    if (priceHistory && priceHistory.length > 0) {
      const latest = priceHistory[priceHistory.length - 1];
      return Number(latest.price) / 1e7;
    }
    return null;
  }, [lastPrice, priceHistory]);

  const isPositive = priceChange >= 0;

  React.useEffect(() => {
    if (!symbol) {
      router.push("/dashboard/stocks");
    }
  }, [symbol, router]);

  if (!symbol) {
    return null;
  }

  const stockInfo = STOCK_INFO[symbolUpper];

  if (!stockInfo) {
    return (
      <div className="w-full px-4 py-2">
        <div className="w-full px-6 py-8">
          <Link
            href="/dashboard/stocks"
            className="inline-flex items-center gap-2 text-sm text-[#7096D1] hover:text-black transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="rounded-3xl bg-white p-12 shadow-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-lg">Asset not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-2">
      <div className="w-full px-6 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard/stocks"
          className="inline-flex items-center gap-2 text-sm text-[#7096D1] hover:text-black transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Asset Header with Price */}
        <div className="rounded-3xl bg-white p-8 shadow-lg border border-gray-200 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left side: Logo and Company Info */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center p-3 overflow-hidden shrink-0">
                <img
                  src={stockInfo.logo || "/placeholder.svg"}
                  alt={stockInfo.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-black truncate">
                    {stockInfo.name}
                  </h1>
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-[#39bfb7]/10 text-[#39bfb7] shrink-0">
                    {symbolUpper}
                  </span>
                </div>
                <p className="text-[#7096D1] text-sm leading-relaxed line-clamp-2">
                  {stockInfo.description}
                </p>
              </div>
            </div>

            {/* Right side: Price Info */}
            <div className="flex items-center gap-4 shrink-0">
              {isLoadingPrice ? (
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-[#39bfb7] border-r-transparent"></div>
              ) : currentPrice !== null ? (
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-black">
                    ${currentPrice.toFixed(2)}
                  </div>
                  {priceHistory && priceHistory.length >= 2 && (
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        isPositive
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="text-base font-semibold">
                        {isPositive ? "+" : ""}
                        {priceChange.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No price data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Price History */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-black">Price History</h2>
          </div>
          {isLoadingPrice ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#39bfb7] border-r-transparent"></div>
            </div>
          ) : chartData.length > 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      color: "#000000",
                    }}
                    formatter={(value: number) => [
                      `$${value.toFixed(2)}`,
                      "Price",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#39bfb7"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#39bfb7" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-200 shadow-lg">
              <p className="text-gray-500 text-lg">
                No historical data available yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetail;
