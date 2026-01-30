import {
  Controller,
  Get,
  ServiceUnavailableException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from "@nestjs/terminus";
import { RedisHealthIndicator } from "./indicators/redis.health";
import { IngestorHealthIndicator } from "./indicators/ingestor.health";

/**
 * Health controller: /health, /ready, /live, /status.
 * Used by Kubernetes probes and for observability.
 */
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redis: RedisHealthIndicator,
    private readonly ingestor: IngestorHealthIndicator,
  ) {}

  /**
   * Combined health check. Returns 200 if Redis and ingestor are OK, 503 otherwise.
   * Use for high-level "is the aggregator healthy?" checks.
   */
  @Get("health")
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const result = await this.health.check([
      () => this.redis.isHealthy(),
      () => this.ingestor.isHealthy(),
    ]);
    const allOk = result.status === "ok";
    if (!allOk) {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  /**
   * Readiness probe. Returns 200 when the app is ready to accept traffic.
   * Fails if dependencies (Redis, ingestor) are not available.
   */
  @Get("ready")
  @HealthCheck()
  async ready(): Promise<HealthCheckResult> {
    const result = await this.health.check([
      () => this.redis.isHealthy(),
      () => this.ingestor.isHealthy(),
    ]);
    if (result.status !== "ok") {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }

  /**
   * Liveness probe. Returns 200 if the process is alive.
   * Does not check dependencies; use for Kubernetes liveness.
   */
  @Get("live")
  @HttpCode(HttpStatus.OK)
  live(): { status: string } {
    return { status: "ok" };
  }

  /**
   * Detailed status: system info and dependency health.
   * Use for debugging and dashboards.
   */
  @Get("status")
  @HealthCheck()
  async status(): Promise<{
    status: string;
    info: Record<string, unknown>;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    checks: HealthCheckResult;
  }> {
    const checks = await this.health.check([
      () => this.redis.isHealthy(),
      () => this.ingestor.isHealthy(),
    ]);
    return {
      status: checks.status,
      info: checks.info ?? {},
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks,
    };
  }
}
