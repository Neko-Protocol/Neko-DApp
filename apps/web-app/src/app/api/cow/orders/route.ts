/**
 * CoW Protocol Orders API Route
 * Handles order-related operations with CoW Protocol APIs
 */

import { NextRequest, NextResponse } from "next/server";
import {
  COW_API_BASE_URLS,
  COW_API_ENDPOINTS,
} from "@/lib/constants/cowswapConfig";
import type { CowOrder, CowTrade } from "@/lib/types/cowswapTypes";

// Additional response types for API routes
interface CowOrdersResponse {
  orders: CowOrder[];
  meta?: {
    total: number;
    hasMore: boolean;
  };
}

interface CowTradesResponse {
  trades: CowTrade[];
  meta?: {
    total: number;
    hasMore: boolean;
  };
}

// Processed response type
interface ProcessedOrdersResponse {
  orders: any[];
  meta?: {
    total: number;
    hasMore: boolean;
  };
}

/**
 * Calculate traffic light status based on order parameters
 */
function calculateTrafficLightStatus(
  order: CowOrder,
  limitPrice: number
): "far" | "close" | "executable" | "executing" {
  try {
    // Get current execution percentage
    const executedSell = BigInt(order.executedSellAmount || "0");
    const totalSell = BigInt(order.sellAmount);

    if (totalSell === 0n) return "far";

    const executionRatio = Number(executedSell) / Number(totalSell);

    // If order is partially executed, it's executing
    if (executionRatio > 0) {
      return "executing";
    }

    // Check time remaining vs total duration
    const now = Date.now() / 1000;
    const timeRemaining = order.validTo - now;
    const totalDuration =
      order.validTo - new Date(order.creationDate).getTime() / 1000;

    if (totalDuration <= 0) return "far";

    const timeRatio = timeRemaining / totalDuration;

    // Logic for determining status:
    // - far: order is young or has low chance of execution
    // - close: getting closer to execution conditions
    // - executable: ready for execution
    // - executing: already partially filled

    if (timeRatio < 0.2) {
      // Less than 20% time remaining - getting urgent
      return "executable";
    } else if (timeRatio < 0.5) {
      // Less than 50% time remaining
      return "close";
    } else {
      // Plenty of time remaining
      return "far";
    }
  } catch (error) {
    console.error("Error calculating traffic light status:", error);
    return "far";
  }
}

/**
 * Process raw orders into our internal format with business logic
 */
function processOrders(rawOrders: CowOrder[], chainId: number) {
  const processedOrders = [];

  for (const order of rawOrders) {
    if (order.status === "open") {
      // Calculate limit price for display
      const sellAmount = BigInt(order.sellAmount);
      const buyAmount = BigInt(order.buyAmount);
      const limitPrice =
        sellAmount > 0n ? Number(buyAmount) / Number(sellAmount) : 0;

      // Calculate progress status based on order parameters
      const progressStatus = calculateTrafficLightStatus(order, limitPrice);

      const explorerUrl = `https://explorer.cow.fi/orders/${order.uid}`;

      processedOrders.push({
        orderId: order.uid,
        owner: order.owner,
        sellToken: order.sellToken,
        buyToken: order.buyToken,
        sellAmount: order.sellAmount,
        buyAmount: order.buyAmount,
        executedSellAmount: order.executedSellAmount || "0",
        executedBuyAmount: order.executedBuyAmount || "0",
        executedFeeAmount: order.executedFeeAmount || "0",
        status: order.status,
        creationDate: order.creationDate,
        validTo: order.validTo,
        receiver: order.receiver,
        appData: order.appData,
        kind: order.kind,
        partiallyFillable: order.partiallyFillable,
        explorerUrl,
        limitPrice: limitPrice.toString(),
        executionPrice: limitPrice.toString(), // Simplified
        progressStatus,
      });
    }
  }

  return processedOrders;
}

/**
 * GET /api/cow/orders - Get processed orders for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const chainId = parseInt(searchParams.get("chainId") || "1");
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!owner) {
      return NextResponse.json(
        { error: "Owner address is required" },
        { status: 400 }
      );
    }

    // Fetch raw orders from CoW Protocol
    const baseUrl = COW_API_BASE_URLS[chainId] || COW_API_BASE_URLS[1];
    const url = new URL(`${baseUrl}${COW_API_ENDPOINTS.ORDERS}`);
    url.searchParams.set("owner", owner);
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("limit", limit.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`CoW API Error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `CoW API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data: CowOrdersResponse = await response.json();

    // Process orders with business logic
    const processedOrders = processOrders(data.orders || [], chainId);

    const result: ProcessedOrdersResponse = {
      orders: processedOrders,
      meta: data.meta,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/cow/orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cow/orders - Cancel orders
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderUids, signature, signingScheme, chainId = 1 } = body;

    if (!orderUids || !signature) {
      return NextResponse.json(
        { error: "orderUids and signature are required" },
        { status: 400 }
      );
    }

    const baseUrl = COW_API_BASE_URLS[chainId] || COW_API_BASE_URLS[1];
    const url = `${baseUrl}${COW_API_ENDPOINTS.ORDERS}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderUids,
        signature,
        signingScheme: signingScheme || "eip712",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`CoW API Error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `CoW API Error: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/cow/orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
