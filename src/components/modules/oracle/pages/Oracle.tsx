import React from "react";
import { Link } from "react-router-dom";
import type { Asset, ComplianceStatus } from "oracle";
import { useOracle } from "../hooks/useOracle";
import { useOracleAssetPrice } from "../hooks/useOracleAssetPrice";
import { useOracleRWAMetadata } from "../hooks/useOracleRWAMetadata";
import {
  formatAsset,
  formatPrice,
  formatAssetType,
  formatComplianceStatus,
} from "../utils/oracleUtils";
import { STOCK_INFO } from "../utils/stockInfo";
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
    rwaAssets,
    isLoading,
    isLoadingBase,
    isLoadingDecimals,
    isLoadingResolution,
    isLoadingAssets,
    assetsError,
  } = useOracle();

  return (
    <div className="w-full px-4 py-2">
      <div className="w-full px-6 py-8">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold text-black tracking-tight">
              Oracle Dashboard
            </h1>
          </div>
          <p className="text-[#7096D1] text-lg leading-relaxed">
            Real-time price data and RWA metadata from the RWACLE
          </p>
        </div>

        {/* Oracle Configuration Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
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
          <div className="rounded-3xl bg-[#294cab] p-6 shadow-lg border border-red-500/50 mb-8">
            <p className="text-red-400 font-semibold">
              Error loading assets:{" "}
              {assetsError instanceof Error
                ? assetsError.message
                : "Unknown error"}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="rounded-3xl bg-[#294cab] p-12 shadow-lg border border-[#334EAC]/90">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-[#39bfb7] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 bg-[#39bfb7] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 bg-[#39bfb7] rounded-full animate-bounce"></div>
              </div>
              <span className="text-[#7096D1] text-lg">
                Loading oracle data...
              </span>
            </div>
          </div>
        ) : assets && assets.length > 0 ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-black mb-2">
                Assets & Prices
              </h2>
              <p className="text-[#7096D1]">Live price feeds from the oracle</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets
                .filter((asset) => {
                  const assetStr = formatAsset(asset);
                  return assetStr !== "0";
                })
                .slice(0, 6)
                .map((asset, index) => (
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
          <div className="rounded-3xl bg-[#294cab] p-12 shadow-lg border border-[#334EAC]/90 text-center">
            <p className="text-[#7096D1] text-lg">
              No assets found in the oracle
            </p>
          </div>
        )}

        {/* RWA Assets Section */}
        {rwaAssets && rwaAssets.length > 0 && (
          <div className="mt-12 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-[#FFF9F0] mb-2">
                RWA Assets
              </h2>
              <p className="text-[#7096D1]">
                Real World Asset tokenization details
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {rwaAssets.map((assetId) => (
                <RWAAssetCard key={assetId} assetId={assetId} />
              ))}
            </div>
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
    <div className="rounded-3xl bg-[#294cab] p-6 shadow-lg border border-[#334EAC]/90 transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-[#39bfb7]/10 text-[#39bfb7] rounded-lg">
          {icon}
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-[#7096D1]">
          {label}
        </p>
      </div>
      <h3 className="text-2xl font-bold text-[#FFF9F0]">
        {isLoading ? <LoadingDots /> : value}
      </h3>
    </div>
  );
};

// Loading Dots Component
export const LoadingDots = () => (
  <span className="inline-flex gap-1">
    <span className="w-2 h-2 bg-[#7096D1] rounded-full animate-pulse"></span>
    <span className="w-2 h-2 bg-[#7096D1] rounded-full animate-pulse [animation-delay:0.2s]"></span>
    <span className="w-2 h-2 bg-[#7096D1] rounded-full animate-pulse [animation-delay:0.4s]"></span>
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
    <Link to={`/asset/${assetStr}`} className="block h-full">
      <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-200 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden cursor-pointer h-full flex flex-col">
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
                {priceHistory.slice(0, 5).map((price, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm items-center"
                  >
                    <span className="font-medium text-black">
                      {formatPrice(price.price)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(
                        Number(price.timestamp) * 1000,
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

// Component for displaying RWA asset metadata
const RWAAssetCard: React.FC<{ assetId: string }> = ({ assetId }) => {
  const { metadata, isLoading, error } = useOracleRWAMetadata(assetId);

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-[#294cab] p-6 shadow-lg border border-[#334EAC]/90">
        <div className="flex items-center gap-3">
          <LoadingDots />
          <span className="text-[#7096D1]">
            Loading metadata for {assetId}...
          </span>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="rounded-3xl bg-[#294cab] p-6 shadow-lg border border-red-500/50">
        <p className="text-red-400 font-medium">
          Error loading metadata for {assetId}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-[#294cab] p-8 shadow-lg border border-[#334EAC]/90 relative overflow-hidden transition-all hover:shadow-xl">
      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-bold text-[#FFF9F0] mb-2">
              {metadata.name}
            </h3>
            <p className="text-sm text-[#7096D1] font-mono">
              {metadata.asset_id}
            </p>
          </div>
          <span className="inline-flex items-center px-4 py-2 bg-[#39bfb7]/10 text-[#39bfb7] rounded-lg text-sm font-semibold w-fit">
            {formatAssetType(metadata.asset_type)}
          </span>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <DetailItem
            label="Description"
            value={metadata.description}
            fullWidth
          />

          <DetailItem
            label="Underlying Asset"
            value={metadata.underlying_asset}
          />

          <DetailItem label="Issuer" value={metadata.issuer} mono />

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#7096D1] mb-2">
              Compliance Status
            </p>
            <ComplianceStatusBadge
              status={metadata.regulatory_info?.compliance_status}
            />
          </div>
        </div>

        {/* Regulatory Information */}
        {metadata.regulatory_info?.is_regulated && (
          <div className="mb-6 p-6 bg-[#334EAC]/20 rounded-2xl border border-[#334EAC]/30">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#FFF9F0] mb-4">
              Regulatory Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.regulatory_info.approval_server && (
                <DetailItem
                  label="Approval Server"
                  value={metadata.regulatory_info.approval_server}
                  small
                />
              )}
              {metadata.regulatory_info.license_number && (
                <DetailItem
                  label="License Number"
                  value={metadata.regulatory_info.license_number}
                  small
                />
              )}
              {metadata.regulatory_info.license_type && (
                <DetailItem
                  label="License Type"
                  value={metadata.regulatory_info.license_type}
                  small
                />
              )}
              {metadata.regulatory_info.licensing_authority && (
                <DetailItem
                  label="Licensing Authority"
                  value={metadata.regulatory_info.licensing_authority}
                  small
                />
              )}
            </div>
          </div>
        )}

        {/* Tokenization Information */}
        {metadata.tokenization_info?.is_tokenized && (
          <div className="mb-6 p-6 bg-[#334EAC]/20 rounded-2xl border border-[#334EAC]/30">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#FFF9F0] mb-4">
              Tokenization Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.tokenization_info.token_contract && (
                <DetailItem
                  label="Token Contract"
                  value={metadata.tokenization_info.token_contract}
                  mono
                  small
                />
              )}
              {metadata.tokenization_info.total_supply && (
                <DetailItem
                  label="Total Supply"
                  value={String(metadata.tokenization_info.total_supply)}
                  small
                />
              )}
              {metadata.tokenization_info.underlying_asset && (
                <DetailItem
                  label="Underlying Asset"
                  value={metadata.tokenization_info.underlying_asset}
                  small
                />
              )}
            </div>
          </div>
        )}

        {/* Additional Metadata */}
        {Array.isArray(metadata.metadata) && metadata.metadata.length > 0 && (
          <div className="p-6 bg-[#334EAC]/20 rounded-2xl border border-[#334EAC]/30">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#FFF9F0] mb-4">
              Additional Metadata
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {metadata.metadata.map(
                ([key, value]: readonly [string, string], idx: number) => (
                  <div key={`${key}-${idx}`} className="text-sm">
                    <span className="text-[#7096D1]">{key}: </span>
                    <span className="text-[#BAD6EB] font-medium">{value}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Decorative element */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-[#334EAC]/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </div>
  );
};

// Detail Item Component
const DetailItem: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
  fullWidth?: boolean;
}> = ({ label, value, mono, small, fullWidth }) => (
  <div className={fullWidth ? "md:col-span-2" : ""}>
    <p className="text-xs font-medium uppercase tracking-wider text-[#7096D1] mb-2">
      {label}
    </p>
    <p
      className={`text-[#FFF9F0] ${small ? "text-sm" : ""} ${
        mono ? "font-mono break-all" : "font-medium"
      }`}
    >
      {value}
    </p>
  </div>
);

// Compliance Status Badge Component
const ComplianceStatusBadge: React.FC<{
  status: ComplianceStatus | undefined;
}> = ({ status }) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border bg-[#334EAC]/30 text-[#7096D1] border-[#334EAC]/30">
        Unknown
      </span>
    );
  }

  const statusTag = status.tag;

  const getStatusStyles = () => {
    switch (statusTag) {
      case "Approved":
        return "bg-green-500/20 text-green-400 border-green-500/20";
      case "Pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/20";
      case "Rejected":
        return "bg-red-500/20 text-red-400 border-red-500/20";
      default:
        return "bg-[#334EAC]/30 text-[#7096D1] border-[#334EAC]/30";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusStyles()}`}
    >
      {formatComplianceStatus(status)}
    </span>
  );
};

export default OracleVisualizer;
