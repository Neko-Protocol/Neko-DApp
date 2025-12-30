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
 * Map EVM token contract addresses to token symbols (for Ondo stocks and crypto tokens)
 */
const EVM_TOKEN_ADDRESS_TO_SYMBOL: Record<string, string> = {
  // Crypto tokens
  "0x0000000000000000000000000000000000000000": "ETH", // ETH native
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC", // USDC
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": "USDT", // USDT
  // Ondo Tokenized Stocks
  "0x2d1f7226bd1f780af6b9a49dcc0ae00e8df4bdee": "NVDA", // NVIDIA
  "0x2494b603319d4d9f9715c9f4496d9e0364b59d93": "TSLA", // Tesla
  "0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c": "AAPL", // Apple
  "0xb812837b81a3a6b81d7cd74cfb19a7f2784555e5": "MSFT", // Microsoft
  "0xbb8774fb97436d23d74c1b882e8e9a69322cfd31": "AMZN", // Amazon
  "0x59644165402b611b350645555b50afb581c71eb2": "META", // Meta Platforms
  "0x590f21186489ca1612f49a4b1ff5c66acd6796a9": "SPOT", // Spotify
  "0x908266c1192628371cff7ad2f5eba4de061a0ac5": "SHOP", // Shopify
  "0xa29dc2102dfc2a0a4a5dcb84af984315567c9858": "MA", // Mastercard
  "0x032dec3372f25c41ea8054b4987a7c4832cdb338": "NFLX", // Netflix
};

/**
 * Get token icon/image path based on token code or address
 */
export const getTokenIcon = (
  token:
    | { type: "native" | "contract"; code?: string; contract?: string }
    | string
    | { symbol?: string; address?: string } // For Uniswap Token objects
): string | null => {
  let tokenCode: string | null = null;
  let isEVM = false;

  // Handle Uniswap Token objects (EVM tokens)
  if (
    typeof token === "object" &&
    "symbol" in token &&
    "address" in token &&
    !("type" in token)
  ) {
    tokenCode = token.symbol || null;
    isEVM = true;
  } else if (typeof token === "string") {
    const addressLower = token.toLowerCase();
    if (EVM_TOKEN_ADDRESS_TO_SYMBOL[addressLower]) {
      tokenCode = EVM_TOKEN_ADDRESS_TO_SYMBOL[addressLower];
      isEVM = true;
    } else {
      // Check if it's a Stellar contract address
      try {
        const availableTokens = getAvailableTokens();
        // Find token code by contract address
        for (const [code, info] of Object.entries(availableTokens)) {
          if (info.contract === token) {
            tokenCode = code;
            isEVM = false;
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
        isEVM = false;
      }
      // If still no code found, assume it's a symbol
      if (!tokenCode) {
        tokenCode = token.toUpperCase();
        const evmSymbols = Object.values(EVM_TOKEN_ADDRESS_TO_SYMBOL);
        isEVM = evmSymbols.includes(tokenCode);
      }
    }
  } else if (typeof token === "object" && "type" in token) {
    // Stellar token object
    if (token.type === "native") {
      tokenCode = "XLM";
    } else {
      tokenCode = token.code || null;
    }
    isEVM = false;
  }

  if (!tokenCode) {
    return null;
  }

  if (isEVM) {
    // EVM tokens icon map
    const evmIconMap: Record<string, string> = {
      // Crypto tokens (EVM)
      ETH: "/crypto/svg/ethereum-eth-logo.svg",
      USDC: "/crypto/png/usd-coin-usdc-logo.png",
      USDT: "/crypto/svg/USDT.svg",
      // Ondo Tokenized Stocks (EVM)
      NVDA: "/stocks/svg/NVDAON.svg",
      TSLA: "/stocks/svg/TSLAON.svg",
      AAPL: "/stocks/svg/AAPLON.svg",
      MSFT: "/stocks/svg/MSFTON.svg",
      AMZN: "/stocks/svg/AMZNON.svg",
      META: "/stocks/svg/METAON.svg",
      SPOT: "/stocks/svg/SPOTON.svg",
      SHOP: "/stocks/svg/SHOPON.svg",
      MA: "/stocks/svg/MAON.svg",
      NFLX: "/stocks/svg/NFLXON.svg",
    };
    return evmIconMap[tokenCode] || null;
  } else {
    // Stellar tokens icon map
    const stellarIconMap: Record<string, string> = {
      XLM: "/crypto/svg/stellar-xlm-logo.svg",
      USDC: "/crypto/png/usd-coin-usdc-logo.png",
      NVDA: "/stocks/nvda.png",
      AAPL: "/stocks/aapl.png",
      PLTR: "/stocks/pltr.png",
      TSLA: "/stocks/tsla.png",
      META: "/stocks/meta.png",
      MSFT: "/stocks/msft.png",
    };
    return stellarIconMap[tokenCode] || null;
  }
};
