import type { Asset } from "@neko/oracle";
import type { RWAMetadata } from "@neko/rwa-oracle";

// Helper function to format asset
export const formatAsset = (asset: Asset): string => {
  if (asset.tag === "Stellar") {
    return asset.values[0];
  }
  return asset.values[0];
};

// Helper function to format price with decimals
// Note: Oracle prices use 7 decimal places (Stellar standard)
export const formatPrice = (price: bigint): string => {
  if (price === BigInt(0)) {
    return "0";
  }

  // Oracle prices always use 7 decimal places (Stellar standard)
  const actualDecimals = 7;
  const divisor = BigInt(10 ** actualDecimals);
  const whole = price / divisor;
  const fractional = price % divisor;

  // Convert fractional part to string and pad with zeros
  let fractionalStr = fractional.toString().padStart(actualDecimals, "0");

  // Remove trailing zeros
  fractionalStr = fractionalStr.replace(/0+$/, "");

  // If there's no fractional part, return just the whole number
  if (fractionalStr === "") {
    const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return wholeStr;
  }

  // Format whole number with locale string for better readability
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${wholeStr}.${fractionalStr}`;
};

// Helper function to format asset type
export const formatAssetType = (type: RWAMetadata["asset_type"]): string => {
  if (!type) return "Unknown";
  return type.tag ?? "Unknown";
};

// Helper function to format compliance status
export const formatComplianceStatus = (
  status: RWAMetadata["regulatory_info"]["compliance_status"]
): string => {
  if (!status) return "Unknown";
  return status.tag ?? "Unknown";
};
