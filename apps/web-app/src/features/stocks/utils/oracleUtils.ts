import type { Asset, RWAMetadata } from "oracle";

// Helper function to format asset
export const formatAsset = (asset: Asset): string => {
  if (asset.tag === "Stellar") {
    return asset.values[0];
  }
  return asset.values[0];
};

// Helper function to format price with decimals
// Note: RWA Oracle uses 14 decimal places for price precision
export const formatPrice = (price: bigint, decimals: number = 14): string => {
  if (price === BigInt(0)) {
    return "$0.00";
  }

  // Use the decimals from the oracle (default 14)
  const divisor = BigInt(10 ** decimals);
  const whole = price / divisor;
  const fractional = price % divisor;

  // Convert fractional part to string and pad with zeros
  let fractionalStr = fractional.toString().padStart(decimals, "0");

  // Keep only 2 decimal places for display
  fractionalStr = fractionalStr.substring(0, 2);

  // Format whole number with locale string for better readability
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `$${wholeStr}.${fractionalStr}`;
};

// Helper function to format asset type
export const formatAssetType = (type: RWAMetadata["asset_type"]): string => {
  if (!type) return "Unknown";
  return type.tag ?? "Unknown";
};

// Helper function to format compliance status
export const formatComplianceStatus = (
  status: RWAMetadata["regulatory_info"]["compliance_status"],
): string => {
  if (!status) return "Unknown";
  return status.tag ?? "Unknown";
};
