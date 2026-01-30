import { Controller, Get } from "@nestjs/common";

/**
 * In-memory store of last aggregated prices for debugging.
 * In production this would be backed by Redis or the same store the aggregator uses.
 */
const lastPrices: Record<string, { price: number; timestamp: number }> = {};

export function setLastPrice(assetId: string, price: number, timestamp: number): void {
  lastPrices[assetId] = { price, timestamp };
}

/**
 * Debug endpoints for inspecting aggregator state.
 * GET /debug/prices returns the last known prices (for debugging).
 */
@Controller("debug")
export class DebugController {
  /**
   * Returns last prices seen by the aggregator.
   * Use for debugging price pipeline and verifying ingestion.
   */
  @Get("prices")
  getPrices(): Record<string, { price: number; timestamp: number }> {
    return { ...lastPrices };
  }
}
