import { useBalance, useReadContract, useAccount, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { getTokensForChain, ERC20_ABI } from "@/lib/constants/evmConfig";
import { useMemo } from "react";

/**
 * Hook to get balance of an EVM token
 * Works with both native tokens (ETH, BNB) and ERC-20 tokens
 */
export const useEVMTokenBalance = (
  tokenSymbol: string | undefined,
  chainId?: number
) => {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const effectiveChainId = chainId || connectedChainId;

  // Get token info from config
  const tokenInfo = useMemo(() => {
    if (!tokenSymbol) return null;
    const tokens = getTokensForChain(effectiveChainId);
    return tokens[tokenSymbol] || null;
  }, [tokenSymbol, effectiveChainId]);

  const tokenAddress = tokenInfo?.address as `0x${string}` | undefined;
  const tokenDecimals = tokenInfo?.decimals || 18;

  // Check if this is a native token (ETH or BNB - wrapped addresses)
  const isNativeToken = useMemo(() => {
    if (!tokenSymbol) return false;
    return tokenSymbol === "ETH" || tokenSymbol === "BNB";
  }, [tokenSymbol]);

  // Get native token balance (ETH, BNB)
  const {
    data: nativeBalance,
    isLoading: isLoadingNative,
    error: nativeError,
    refetch: refetchNative,
  } = useBalance({
    address,
    chainId: effectiveChainId,
    query: {
      enabled: Boolean(address && isNativeToken),
      refetchInterval: 10000,
      staleTime: 5000,
    },
  });

  // Get ERC-20 token balance
  const {
    data: erc20Balance,
    isLoading: isLoadingErc20,
    error: erc20Error,
    refetch: refetchErc20,
  } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: effectiveChainId,
    query: {
      enabled: Boolean(address && tokenAddress && !isNativeToken),
      refetchInterval: 10000,
      staleTime: 5000,
    },
  });

  // Format balance
  const balance = useMemo(() => {
    if (isNativeToken && nativeBalance) {
      return nativeBalance.formatted;
    }
    if (!isNativeToken && erc20Balance !== undefined) {
      return formatUnits(erc20Balance as bigint, tokenDecimals);
    }
    return "0";
  }, [isNativeToken, nativeBalance, erc20Balance, tokenDecimals]);

  const isLoading = isNativeToken ? isLoadingNative : isLoadingErc20;
  const error = isNativeToken ? nativeError : erc20Error;
  const refetch = isNativeToken ? refetchNative : refetchErc20;

  return {
    balance,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
};
