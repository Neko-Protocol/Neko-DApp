import { Controller, Get } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

/**
 * Prometheus metrics endpoint.
 * GET /metrics returns metrics in Prometheus exposition format.
 */
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  /**
   * Prometheus scrape endpoint. Returns 200 with text/plain metrics.
   */
  @Get("metrics")
  async getMetrics(): Promise<string> {
    return this.metrics.getMetrics();
  }
}
