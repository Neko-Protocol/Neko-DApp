import { WalletClient, PublicClient } from "viem";
import { cowSwapService } from "../services";
import type {
  CowSwapQuoteRequest,
  CowSwapQuoteResponse,
  CowSwapSwapRequest,
  CowSwapSwapResponse,
} from "../types/cowswapTypes";

export { EVM_TOKENS } from "../constants/evmConfig";
export type {
  CowSwapQuoteRequest,
  CowSwapQuoteResponse,
  CowSwapSwapRequest,
  CowSwapSwapResponse,
} from "../types/cowswapTypes";

/**
 * Get CoW Swap quote using the service
 */
export const getCowSwapQuote = async (
  request: CowSwapQuoteRequest,
  chainId: number,
  publicClient: PublicClient,
  walletClient?: WalletClient
): Promise<CowSwapQuoteResponse> => {
  return cowSwapService.getQuote(request, chainId, publicClient, walletClient);
};

/**
 * Get CoW Swap explorer URL using the service
 */
export const getCowSwapExplorerUrl = (
  orderId: string,
  chainId: number
): string => {
  return cowSwapService.getExplorerUrl(orderId, chainId);
};

/**
 * Execute CoW Swap using the service
 */
export const executeCowSwap = async (
  request: CowSwapSwapRequest,
  chainId: number,
  publicClient: PublicClient,
  walletClient: WalletClient
): Promise<CowSwapSwapResponse> => {
  return cowSwapService.executeSwap(
    request,
    chainId,
    publicClient,
    walletClient
  );
};

/**
 * Check if error is user rejection using the service
 */
export const isUserRejectionError = (error: unknown): boolean => {
  return cowSwapService.isUserRejected(error);
};
