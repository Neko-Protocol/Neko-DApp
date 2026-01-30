import { Injectable } from "@nestjs/common";
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from "@nestjs/terminus";
import Redis from "ioredis";

export const REDIS_HEALTH_KEY = "redis";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: Redis | null) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    if (!this.redis) {
      throw new HealthCheckError(
        REDIS_HEALTH_KEY,
        this.getStatus(REDIS_HEALTH_KEY, false, { message: "Redis not configured" }),
      );
    }
    try {
      const pong = await this.redis.ping();
      const ok = pong === "PONG";
      if (!ok) {
        throw new HealthCheckError(
          REDIS_HEALTH_KEY,
          this.getStatus(REDIS_HEALTH_KEY, false, { message: "Ping failed" }),
        );
      }
      return this.getStatus(REDIS_HEALTH_KEY, true, { latency: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      throw new HealthCheckError(
        REDIS_HEALTH_KEY,
        this.getStatus(REDIS_HEALTH_KEY, false, { message }),
      );
    }
  }
}
