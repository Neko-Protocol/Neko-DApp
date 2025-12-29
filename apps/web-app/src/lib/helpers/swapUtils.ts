/**
 * Utility functions for swap operations
 */

import { getAvailableTokens } from "./soroswap";

/**
 * Format amount based on token decimals
 */
export const formatSwapAmount = (
  amount: string | number,
  decimals: number = 7
): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "0";

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: decimals,
  });

  return formatter.format(numAmount);
};

/**
 * Convert amount to smallest unit (stroops for XLM, smallest unit for tokens)
 */
export const toSmallestUnit = (
  amount: string | number,
  decimals: number = 7
): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "0";

  const multiplier = Math.pow(10, decimals);
  const result = Math.floor(numAmount * multiplier).toString();
  return result;
};

/**
 * Convert from smallest unit to human-readable format
 */
export const fromSmallestUnit = (
  amount: string,
  decimals: number = 7
): string => {
  const numAmount = BigInt(amount);
  const divisor = BigInt(Math.pow(10, decimals));
  const whole = numAmount / divisor;
  const fractional = numAmount % divisor;

  if (fractional === BigInt(0)) {
    return whole.toString();
  }

  const fractionalStr = fractional.toString().padStart(decimals, "0");
  const trimmedFractional = fractionalStr.replace(/0+$/, "");
  return `${whole}.${trimmedFractional}`;
};

/**
 * Get token display name
 */
export const getTokenDisplayName = (
  token:
    | { type: "native" | "contract"; code?: string; contract?: string }
    | string
): string => {
  if (typeof token === "string") {
    // Token is a contract address string
    // Compare with known addresses from Soroswap
    if (token === "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC") {
      return "XLM";
    }
    if (token === "CBBHRKEP5M3NUDRISGLJKGHDHX3DA2CN2AZBQY6WLVUJ7VNLGSKBDUCM") {
      return "USDC";
    }
    return "Token";
  }

  if (token.type === "native") {
    return "XLM";
  }
  return token.code || "Token";
};

/**
 * Get explorer URL for a transaction
 */
export const getExplorerUrl = (txHash: string, network?: string): string => {
  const networkParam = network === "PUBLIC" ? "" : `/${network?.toLowerCase()}`;
  return `https://stellar.expert/explorer${networkParam}/tx/${txHash}`;
};

/**
 * Get token icon/image path based on token code
 */
export const getTokenIcon = (
  token:
    | { type: "native" | "contract"; code?: string; contract?: string }
    | string
): string | null => {
  let tokenCode: string | null = null;

  if (typeof token === "string") {
    // Token is a contract address string - try to identify by contract address
    try {
      const availableTokens = getAvailableTokens();

      // Find token code by contract address
      for (const [code, info] of Object.entries(availableTokens)) {
        if (info.contract === token) {
          tokenCode = code;
          break;
        }
      }
    } catch {
      // Fallback to hardcoded addresses if getAvailableTokens fails
      const hardcodedMap: Record<string, string> = {
        CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC: "XLM", // testnet XLM
        CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK: "USDC", // testnet USDC
        CDMLFMKMMD7MWZP3FKUBZPVHTUEDLSX4BYGYKH4GCESXYHS3IHQ4EIG4: "XLM", // standalone XLM
        CAXPYMWLMZRSPNM6NE6DGIZRZABQ6TYQASARRJTOKIIJ3ZJCBFRAPW3F: "USDC", // standalone USDC
        CB7IFFWQ2ZB6EHPKWYLLJAWN3LTY3CIHC52ZMYRLB5DAUIBNZMZLOGHG: "NVDA", // testnet NVDA
        CCOU5IO7OAHRMQDYARP7FVKYVB5MFHEH36OEAOB4WBR5MJ2HVYDZ5W77: "AAPL", // testnet AAPL
        CCEJ3BRF5CYF52VV2IKG3AOMXCHJCAZDZX7IHB5OC6A3OI5BHTUXSIBC: "PLTR", // testnet PLTR
        CCSFIQ4V7JUZPJT2C3HRTSTQNLPB4F2R4UNPPTUTAD6CMJJ3PILNPAR5: "TSLA", // testnet TSLA
        CBAVRJKWQS74PD624TQ4CF2UVX2363CRKC2T6ESZ5KNATATHMJCRVTYV: "META", // testnet META
      };
      tokenCode = hardcodedMap[token] || null;
    }
  } else {
    if (token.type === "native") {
      tokenCode = "XLM";
    } else {
      tokenCode = token.code || null;
    }
  }

  if (!tokenCode) {
    return null;
  }

  // Map token codes to icon paths
  const iconMap: Record<string, string> = {
    XLM: "/stellar-xlm-logo.svg",
    USDC: "/usd-coin-usdc-logo.svg",
    NVDA: "/nvda.png",
    AAPL: "/aapl.png",
    PLTR: "/pltr.png",
    TSLA: "/tsla.png",
    META: "/meta.png",
  };

  return iconMap[tokenCode] || null;
};
