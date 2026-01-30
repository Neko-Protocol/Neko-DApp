import { Injectable } from "@nestjs/common";
import * as prom from "prom-client";

/**
 * Registers and updates Prometheus metrics for the aggregator:
 * aggregation count, latency, and errors.
 */
@Injectable()
export class MetricsService {
  private readonly register: prom.Registry;
  private readonly aggregationTotal: prom.Counter;
  private readonly aggregationLatency: prom.Histogram;
  private readonly aggregationErrors: prom.Counter;

  constructor() {
    this.register = new prom.Registry();
    prom.collectDefaultMetrics({ register: this.register, prefix: "aggregator_" });

    this.aggregationTotal = new prom.Counter({
      name: "aggregator_aggregations_total",
      help: "Total number of aggregation operations",
      labelNames: ["status"],
      registers: [this.register],
    });

    this.aggregationLatency = new prom.Histogram({
      name: "aggregator_aggregation_duration_seconds",
      help: "Aggregation operation duration in seconds",
      labelNames: ["status"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.register],
    });

    this.aggregationErrors = new prom.Counter({
      name: "aggregator_errors_total",
      help: "Total number of aggregation errors",
      labelNames: ["type"],
      registers: [this.register],
    });
  }

  getContentType(): string {
    return this.register.contentType;
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  recordAggregation(durationSeconds: number, success: boolean): void {
    const status = success ? "success" : "error";
    this.aggregationTotal.inc({ status });
    this.aggregationLatency.observe({ status }, durationSeconds);
    if (!success) {
      this.aggregationErrors.inc({ type: "aggregation" });
    }
  }

  recordError(type: string): void {
    this.aggregationErrors.inc({ type });
  }
}
