import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from "@nestjs/terminus";
import { firstValueFrom } from "rxjs";

export const INGESTOR_HEALTH_KEY = "ingestor";

@Injectable()
export class IngestorHealthIndicator extends HealthIndicator {
  constructor(
    private readonly httpService: HttpService,
    private readonly ingestorUrl: string | null,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    if (!this.ingestorUrl) {
      throw new HealthCheckError(
        INGESTOR_HEALTH_KEY,
        this.getStatus(INGESTOR_HEALTH_KEY, false, {
          message: "Ingestor URL not configured",
        }),
      );
    }
    try {
      const url = this.ingestorUrl.replace(/\/$/, "") + "/health";
      const res = await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 }),
      );
      const ok = res.status >= 200 && res.status < 300;
      if (!ok) {
        throw new HealthCheckError(
          INGESTOR_HEALTH_KEY,
          this.getStatus(INGESTOR_HEALTH_KEY, false, {
            message: `HTTP ${res.status}`,
          }),
        );
      }
      return this.getStatus(INGESTOR_HEALTH_KEY, true, { status: res.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      throw new HealthCheckError(
        INGESTOR_HEALTH_KEY,
        this.getStatus(INGESTOR_HEALTH_KEY, false, { message }),
      );
    }
  }
}
