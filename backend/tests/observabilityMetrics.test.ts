import { describe, it, expect } from 'vitest';
import { MetricsService } from '../src/services/metricsService.js';

describe('AI ISP OS Part 1.3 — Observability & Prometheus Metrics Tests', () => {
  it('Should record HTTP metrics and generate valid Prometheus text format', () => {
    MetricsService.recordHttpRequest(200);
    MetricsService.recordHttpRequest(500);
    MetricsService.recordTelemetryIngest(10);
    MetricsService.recordCommandQueued();

    const snapshot = MetricsService.getMetricsSnapshot();
    expect(snapshot.status).toBe('UP');
    expect(snapshot.metrics.httpRequestsTotal).toBeGreaterThan(0);
    expect(snapshot.metrics.httpErrorsTotal).toBeGreaterThan(0);
    expect(snapshot.metrics.telemetryIngestedTotal).toBeGreaterThanOrEqual(10);

    const promText = MetricsService.getPrometheusText();
    expect(promText).toContain('http_requests_total');
    expect(promText).toContain('telemetry_samples_ingested_total');
    expect(promText).toContain('dead_letter_queue_depth');
  });
});
