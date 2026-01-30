import { Test, TestingModule } from "@nestjs/testing";
import { TerminusModule } from "@nestjs/terminus";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { RedisHealthIndicator } from "./indicators/redis.health";
import { IngestorHealthIndicator } from "./indicators/ingestor.health";

describe("HealthController", () => {
  let controller: HealthController;
  let redisIndicator: RedisHealthIndicator;
  let ingestorIndicator: IngestorHealthIndicator;

  const mockRedisIndicator = {
    isHealthy: jest.fn().mockResolvedValue({ redis: { status: "up" } }),
  };

  const mockIngestorIndicator = {
    isHealthy: jest.fn().mockResolvedValue({ ingestor: { status: "up" } }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedisIndicator.isHealthy.mockResolvedValue({ redis: { status: "up" } });
    mockIngestorIndicator.isHealthy.mockResolvedValue({ ingestor: { status: "up" } });

    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        { provide: RedisHealthIndicator, useValue: mockRedisIndicator },
        { provide: IngestorHealthIndicator, useValue: mockIngestorIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    redisIndicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
    ingestorIndicator = module.get<IngestorHealthIndicator>(IngestorHealthIndicator);
  });

  describe("check", () => {
    it("returns health result when all checks pass", async () => {
      const result = await controller.check();
      expect(result.status).toBe("ok");
      expect(redisIndicator.isHealthy).toHaveBeenCalled();
      expect(ingestorIndicator.isHealthy).toHaveBeenCalled();
    });

    it("throws ServiceUnavailableException when checks fail", async () => {
      mockIngestorIndicator.isHealthy.mockRejectedValue(new Error("ingestor down"));
      await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe("ready", () => {
    it("returns 200 when dependencies are healthy", async () => {
      const result = await controller.ready();
      expect(result.status).toBe("ok");
    });

    it("throws when dependencies are unhealthy", async () => {
      mockRedisIndicator.isHealthy.mockRejectedValue(new Error("redis down"));
      await expect(controller.ready()).rejects.toThrow();
    });
  });

  describe("live", () => {
    it("returns status ok", () => {
      expect(controller.live()).toEqual({ status: "ok" });
    });
  });

  describe("status", () => {
    it("returns detailed status with uptime and memory", async () => {
      const result = await controller.status();
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("uptime");
      expect(result).toHaveProperty("memory");
      expect(result).toHaveProperty("checks");
    });
  });
});
