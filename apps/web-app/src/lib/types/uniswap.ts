import { Token } from "@uniswap/sdk-core";

export interface UniswapQuoteRequest {
  tokenIn: Token | string;
  tokenOut: Token | string;
  amountIn: string;
  fee?: number;
  tickSpacing?: number;
}

export interface UniswapQuoteResponse {
  amountOut: string;
  amountOutMinimum: string;
  poolKey: {
    currency0: string;
    currency1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
  };
  zeroForOne: boolean;
}

export interface UniswapSwapRequest {
  tokenIn: Token | string;
  tokenOut: Token | string;
  amountIn: string;
  amountOutMinimum: string;
  recipient: string;
  deadline?: number;
  slippageBps?: number;
}

export interface UniswapSwapResponse {
  txHash: string;
}
