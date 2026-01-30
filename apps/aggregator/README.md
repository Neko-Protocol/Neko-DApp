# Aggregator

NestJS aggregator service with health checks, Prometheus metrics, and debug APIs for observability.

## Endpoints

### Health & probes

| Endpoint   | Method | Purpose |
|-----------|--------|---------|
| `/health` | GET    | **Combined health check.** Returns `200` if Redis and ingestor are OK, `503` otherwise. Use for high-level "is the aggregator healthy?" checks. |
| `/ready`  | GET    | **Readiness probe.** Returns `200` when the app is ready to accept traffic. Fails if dependencies (Redis, ingestor) are unavailable. Use for Kubernetes readiness probe. |
| `/live`   | GET    | **Liveness probe.** Returns `200` if the process is alive. Does not check dependencies. Use for Kubernetes liveness probe. |
| `/status` | GET    | **Detailed status.** Returns system info (uptime, memory), dependency health, and full check results. Use for debugging and dashboards. |

### Metrics

| Endpoint  | Method | Purpose |
|----------|--------|---------|
| `/metrics` | GET  | **Prometheus scrape endpoint.** Returns metrics in Prometheus exposition format (latency, throughput, errors). |

Registered metrics:

- `aggregator_aggregations_total` – total aggregation operations (label: `status`)
- `aggregator_aggregation_duration_seconds` – aggregation latency histogram
- `aggregator_errors_total` – total errors (label: `type`)
- Default Node.js metrics with `aggregator_` prefix

### Debug

| Endpoint        | Method | Purpose |
|----------------|--------|---------|
| `/debug/prices` | GET   | **Last prices.** Returns the last known prices per asset (in-memory). Use for debugging the price pipeline and verifying ingestion. |

## Configuration

- `REDIS_URL` – Redis connection URL. If unset, Redis health check reports unhealthy.
- `INGESTOR_URL` – Ingestor base URL. Health check calls `{INGESTOR_URL}/health`. If unset, ingestor health check reports unhealthy.
- `PORT` – HTTP port (default: `3001`).

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
npm run test:cov
```
