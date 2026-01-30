import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TerminusModule } from "@nestjs/terminus";
import Redis from "ioredis";
import { HealthController } from "./health.controller";
import { RedisHealthIndicator } from "./indicators/redis.health";
import { IngestorHealthIndicator } from "./indicators/ingestor.health";

const redisUrl = process.env["REDIS_URL"] ?? null;
const ingestorUrl = process.env["INGESTOR_URL"] ?? null;

@Module({
  imports: [
    TerminusModule,
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: (): Redis | null =>
        redisUrl ? new Redis(redisUrl, { maxRetriesPerRequest: 1 }) : null,
    },
    {
      provide: "INGESTOR_URL",
      useValue: ingestorUrl,
    },
    {
      provide: RedisHealthIndicator,
      useFactory: (redis: Redis | null) => new RedisHealthIndicator(redis),
      inject: ["REDIS_CLIENT"],
    },
    {
      provide: IngestorHealthIndicator,
      useFactory: (url: string | null, http: HttpService) =>
        new IngestorHealthIndicator(http, url),
      inject: ["INGESTOR_URL", HttpService],
    },
  ],
  exports: [RedisHealthIndicator, IngestorHealthIndicator],
})
export class HealthModule {}
