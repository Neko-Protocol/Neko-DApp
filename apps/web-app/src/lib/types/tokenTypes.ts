/**
 * Token Service Types
 * Type definitions for token-related operations
 */

export interface TokenBalanceResult {
  balance: string;
  formattedBalance: string;
  rawBalance: bigint;
  symbol: string;
  decimals: number;
  error?: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
  logoURI?: string;
}
