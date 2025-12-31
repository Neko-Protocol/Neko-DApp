import type { Token } from "@uniswap/sdk-core";

export interface CowSwapQuoteRequest {
  tokenIn: Token | string;
  tokenOut: Token | string;
  amountIn: string;
}

export interface CowSwapQuoteResponse {
  amountOut: string;
  amountOutMinimum: string;
  orderId?: string;
}

export interface CowSwapSwapRequest {
  tokenIn: Token | string;
  tokenOut: Token | string;
  amountIn: string;
  amountOutMinimum: string;
  recipient: string;
}

export interface CowSwapSwapResponse {
  orderId: string;
}
