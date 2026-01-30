import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./metrics/metrics.module";
import { DebugModule } from "./debug/debug.module";

@Module({
  imports: [
    TerminusModule,
    HealthModule,
    MetricsModule,
    DebugModule,
  ],
})
export class AppModule {}
