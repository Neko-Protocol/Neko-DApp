import { Token } from "@uniswap/sdk-core";
import { SwapExactInSingle, Actions, V4Planner } from "@uniswap/v4-sdk";
import { CommandType, RoutePlanner } from "@uniswap/universal-router-sdk";
import {
  Address,
  WalletClient,
  PublicClient,
  encodeFunctionData,
  decodeFunctionResult,
  parseUnits as viemParseUnits,
  formatUnits as viemFormatUnits,
  maxUint256,
  maxUint160,
} from "viem";
import { readContract, writeContract, simulateContract } from "@wagmi/core";
import { wagmiConfig } from "@/lib/config/wagmi.config";
import {
  UNISWAP_V4_CONTRACTS,
  QUOTER_ABI,
  UNIVERSAL_ROUTER_ABI,
  PERMIT2_ABI,
  ERC20_ABI,
  EVM_TOKENS,
} from "../constants/uniswap";
import type {
  UniswapQuoteRequest,
  UniswapQuoteResponse,
  UniswapSwapRequest,
  UniswapSwapResponse,
} from "../types/uniswap";

export {
  UNISWAP_V4_CONTRACTS,
  QUOTER_ABI,
  UNIVERSAL_ROUTER_ABI,
  PERMIT2_ABI,
  ERC20_ABI,
  EVM_TOKENS,
} from "../constants/uniswap";
export type {
  UniswapQuoteRequest,
  UniswapQuoteResponse,
  UniswapSwapRequest,
  UniswapSwapResponse,
} from "../types/uniswap";

export const isUserRejectionError = (error: unknown): boolean => {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  const rejectionPatterns = [
    "user denied",
    "user rejected",
    "user cancelled",
    "user canceled",
    "rejected by user",
    "denied by user",
    "action_cancelled",
    "4001",
  ];

  return rejectionPatterns.some((pattern) => errorString.includes(pattern));
};

export const getUniswapContracts = (chainId: number) => {
  const contracts = UNISWAP_V4_CONTRACTS[chainId];
  if (!contracts) {
    throw new Error(`Uniswap V4 contracts not deployed on chainId ${chainId}`);
  }
  return contracts;
};

export const getEVMToken = (token: Token | string): Token => {
  if (typeof token === "string") {
    const tokenBySymbol = Object.values(EVM_TOKENS).find(
      (t) =>
        t.symbol === token || t.address.toLowerCase() === token.toLowerCase()
    );
    if (tokenBySymbol) return tokenBySymbol;
    throw new Error(`Token not found: ${token}. Please add it to EVM_TOKENS.`);
  }
  return token;
};

export const getSwapDirection = (token0: Token, token1: Token): boolean => {
  return token0.address.toLowerCase() < token1.address.toLowerCase();
};

export const getPoolKey = (
  tokenIn: Token,
  tokenOut: Token,
  fee: number = 500,
  tickSpacing: number = 10,
  hooks: string = "0x0000000000000000000000000000000000000000"
) => {
  const zeroForOne = getSwapDirection(tokenIn, tokenOut);
  const currency0 = zeroForOne ? tokenIn.address : tokenOut.address;
  const currency1 = zeroForOne ? tokenOut.address : tokenIn.address;

  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
    zeroForOne,
  };
};

export const getUniswapQuote = async (
  request: UniswapQuoteRequest,
  chainId: number,
  publicClient: PublicClient
): Promise<UniswapQuoteResponse> => {
  const tokenIn = getEVMToken(request.tokenIn);
  const tokenOut = getEVMToken(request.tokenOut);

  const poolKey = getPoolKey(
    tokenIn,
    tokenOut,
    request.fee,
    request.tickSpacing
  );

  const amountIn = viemParseUnits(request.amountIn, tokenIn.decimals);
  const contracts = getUniswapContracts(chainId);

  const data = encodeFunctionData({
    abi: QUOTER_ABI,
    functionName: "quoteExactInputSingle",
    args: [
      {
        poolKey: {
          currency0: poolKey.currency0 as Address,
          currency1: poolKey.currency1 as Address,
          fee: poolKey.fee,
          tickSpacing: poolKey.tickSpacing,
          hooks: poolKey.hooks as Address,
        },
        zeroForOne: poolKey.zeroForOne,
        exactAmount: BigInt(amountIn.toString()),
        hookData: "0x00" as `0x${string}`,
      },
    ],
  });

  try {
    const result = await publicClient.call({
      to: contracts.quoter,
      data,
      account: "0x0000000000000000000000000000000000000000",
    });

    if (!result.data) {
      throw new Error(
        `Quote call failed - no data returned. Pool may not exist for ${tokenIn.symbol}/${tokenOut.symbol}`
      );
    }

    const decoded = decodeFunctionResult({
      abi: QUOTER_ABI,
      functionName: "quoteExactInputSingle",
      data: result.data,
    });

    const [amountOut] = decoded as [bigint, bigint];
    const amountOutFormatted = viemFormatUnits(amountOut, tokenOut.decimals);

    const slippageBps = 50;
    const amountOutMinimum =
      (amountOut * BigInt(10000 - slippageBps)) / BigInt(10000);
    const amountOutMinimumFormatted = viemFormatUnits(
      amountOutMinimum,
      tokenOut.decimals
    );

    return {
      amountOut: amountOutFormatted,
      amountOutMinimum: amountOutMinimumFormatted,
      poolKey: {
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks,
      },
      zeroForOne: poolKey.zeroForOne,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("revert") ||
      errorMessage.includes("Pool not found") ||
      errorMessage.includes("No pool") ||
      errorMessage.includes("execution reverted")
    ) {
      throw new Error(
        `No liquidity pool found for ${tokenIn.symbol}/${tokenOut.symbol}. ` +
          `This pair may not have sufficient liquidity on Uniswap V4. ` +
          `Try swapping through USDC (e.g., ${tokenIn.symbol} -> USDC -> ${tokenOut.symbol}).`
      );
    }

    throw error;
  }
};

export const executeUniswapSwap = async (
  request: UniswapSwapRequest,
  chainId: number,
  walletClient: WalletClient
): Promise<UniswapSwapResponse> => {
  const tokenIn = getEVMToken(request.tokenIn);
  const tokenOut = getEVMToken(request.tokenOut);

  const poolKey = getPoolKey(tokenIn, tokenOut);
  const amountIn = viemParseUnits(request.amountIn, tokenIn.decimals);
  const amountOutMinimum = viemParseUnits(
    request.amountOutMinimum,
    tokenOut.decimals
  );

  const deadline = request.deadline || Math.floor(Date.now() / 1000) + 3600;

  const swapConfig: SwapExactInSingle = {
    poolKey: {
      currency0: poolKey.currency0 as Address,
      currency1: poolKey.currency1 as Address,
      fee: poolKey.fee,
      tickSpacing: poolKey.tickSpacing,
      hooks: poolKey.hooks as Address,
    },
    zeroForOne: poolKey.zeroForOne,
    amountIn: amountIn.toString(),
    amountOutMinimum: amountOutMinimum.toString(),
    hookData: "0x00" as `0x${string}`,
  };

  const v4Planner = new V4Planner();
  const routePlanner = new RoutePlanner();

  v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [swapConfig]);
  v4Planner.addAction(Actions.SETTLE_ALL, [
    swapConfig.poolKey.currency0,
    swapConfig.amountIn,
  ]);
  v4Planner.addAction(Actions.TAKE_ALL, [
    swapConfig.poolKey.currency1,
    swapConfig.amountOutMinimum,
  ]);

  const encodedActions = v4Planner.finalize();
  routePlanner.addCommand(CommandType.V4_SWAP, [
    v4Planner.actions,
    v4Planner.params,
  ]);

  const contracts = getUniswapContracts(chainId);

  const value =
    tokenIn.address.toLowerCase() ===
    "0x0000000000000000000000000000000000000000"
      ? BigInt(amountIn.toString())
      : 0n;

  const data = encodeFunctionData({
    abi: UNIVERSAL_ROUTER_ABI,
    functionName: "execute",
    args: [
      routePlanner.commands as `0x${string}`,
      [encodedActions] as readonly `0x${string}`[],
      BigInt(deadline),
    ],
  });

  if (!walletClient.account) {
    throw new Error("Wallet client account not available");
  }

  try {
    const hash = await walletClient.sendTransaction({
      account: walletClient.account,
      chain: walletClient.chain || undefined,
      to: contracts.universalRouter,
      data,
      value,
    });

    return {
      txHash: hash,
    };
  } catch (error) {
    if (isUserRejectionError(error)) {
      throw new Error("USER_REJECTED");
    }
    throw error;
  }
};

export const ensureTokenApproval = async (
  tokenAddress: Address,
  amount: string,
  tokenDecimals: number,
  chainId: number,
  walletClient: WalletClient,
  publicClient: PublicClient
): Promise<void> => {
  const contracts = getUniswapContracts(chainId);

  if (!walletClient.account) {
    throw new Error("Wallet client account not available for approval");
  }

  const signerAddress = walletClient.account.address;
  const amountBN = viemParseUnits(amount, tokenDecimals);

  const erc20Allowance = await readContract(wagmiConfig, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [signerAddress, contracts.permit2],
    chainId: chainId as 1 | 11155111 | 10 | 137 | 42161 | 8453,
  });

  if (erc20Allowance < amountBN) {
    try {
      const { request: approveRequest } = await simulateContract(wagmiConfig, {
        account: walletClient.account,
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [contracts.permit2, maxUint256],
        chainId: chainId as 1 | 11155111 | 10 | 137 | 42161 | 8453,
      });

      await writeContract(wagmiConfig, approveRequest);
    } catch (error) {
      if (isUserRejectionError(error)) {
        throw new Error("USER_REJECTED");
      }
      throw error;
    }
  }

  const permit2Allowance = await readContract(wagmiConfig, {
    address: contracts.permit2,
    abi: PERMIT2_ABI,
    functionName: "allowance",
    args: [signerAddress, tokenAddress, contracts.universalRouter],
    chainId: chainId as 1 | 11155111 | 10 | 137 | 42161 | 8453,
  });

  const maxUint160Value = maxUint160;
  const expiration = Math.floor(Date.now() / 1000) + 3600;

  if (
    permit2Allowance[0] < maxUint160Value ||
    Number(permit2Allowance[1]) < expiration
  ) {
    try {
      const { request: permit2ApproveRequest } = await simulateContract(
        wagmiConfig,
        {
          account: walletClient.account,
          address: contracts.permit2,
          abi: PERMIT2_ABI,
          functionName: "approve",
          args: [
            tokenAddress,
            contracts.universalRouter,
            maxUint160Value,
            expiration,
          ],
          chainId: chainId as 1 | 11155111 | 10 | 137 | 42161 | 8453,
        }
      );

      await writeContract(wagmiConfig, permit2ApproveRequest);
    } catch (error) {
      if (isUserRejectionError(error)) {
        throw new Error("USER_REJECTED");
      }
    }
  }
};
