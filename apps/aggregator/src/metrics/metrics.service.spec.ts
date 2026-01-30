import { Test, TestingModule } from "@nestjs/testing";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getMetrics", () => {
    it("returns Prometheus-format string", async () => {
      const metrics = await service.getMetrics();
      expect(typeof metrics).toBe("string");
      expect(metrics).toContain("aggregator_");
    });
  });

  describe("recordAggregation", () => {
    it("records success and updates metrics", async () => {
      service.recordAggregation(0.1, true);
      const metrics = await service.getMetrics();
      expect(metrics).toContain("aggregator_aggregations_total");
      expect(metrics).toContain("aggregator_aggregation_duration_seconds");
    });

    it("records error and increments error counter", async () => {
      service.recordAggregation(0.05, false);
      service.recordError("ingestion");
      const metrics = await service.getMetrics();
      expect(metrics).toContain("aggregator_errors_total");
    });
  });
});
