import { CircuitBreakerRegistry } from './circuitBreaker.js';
import { EventBusService } from './eventBusService.js';

export class MetricsService {
  private static httpRequestsTotal = 0;
  private static httpErrorsTotal = 0;
  private static telemetryIngestedTotal = 0;
  private static commandsQueuedTotal = 0;
  private static commandsExecutedTotal = 0;
  private static aiInquiriesTotal = 0;
  private static notificationDispatchesTotal = 0;

  static recordHttpRequest(status: number) {
    this.httpRequestsTotal += 1;
    if (status >= 400) this.httpErrorsTotal += 1;
  }

  static recordTelemetryIngest(count = 1) {
    this.telemetryIngestedTotal += count;
  }

  static recordCommandQueued() {
    this.commandsQueuedTotal += 1;
  }

  static recordCommandExecuted() {
    this.commandsExecutedTotal += 1;
  }

  static recordAiInquiry() {
    this.aiInquiriesTotal += 1;
  }

  static recordNotification() {
    this.notificationDispatchesTotal += 1;
  }

  /**
   * Generates a snapshot of system health and metrics
   */
  static getMetricsSnapshot() {
    const circuitBreakers = Object.values(CircuitBreakerRegistry).map((cb) => cb.getStatus());
    const dlqCount = EventBusService.getDeadLetterQueue().length;

    return {
      status: 'UP',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      metrics: {
        httpRequestsTotal: this.httpRequestsTotal,
        httpErrorsTotal: this.httpErrorsTotal,
        telemetryIngestedTotal: this.telemetryIngestedTotal,
        commandsQueuedTotal: this.commandsQueuedTotal,
        commandsExecutedTotal: this.commandsExecutedTotal,
        aiInquiriesTotal: this.aiInquiriesTotal,
        notificationDispatchesTotal: this.notificationDispatchesTotal,
        deadLetterQueueCount: dlqCount,
      },
      circuitBreakers,
    };
  }

  /**
   * Generates standard Prometheus text output
   */
  static getPrometheusText(): string {
    return [
      '# HELP http_requests_total Total number of HTTP requests received',
      '# TYPE http_requests_total counter',
      `http_requests_total ${this.httpRequestsTotal}`,
      '# HELP http_errors_total Total number of HTTP 4xx/5xx errors',
      '# TYPE http_errors_total counter',
      `http_errors_total ${this.httpErrorsTotal}`,
      '# HELP telemetry_samples_ingested_total Optical and device telemetry metrics ingested',
      '# TYPE telemetry_samples_ingested_total counter',
      `telemetry_samples_ingested_total ${this.telemetryIngestedTotal}`,
      '# HELP commands_queued_total Total device RPC commands enqueued',
      '# TYPE commands_queued_total counter',
      `commands_queued_total ${this.commandsQueuedTotal}`,
      '# HELP dead_letter_queue_depth Count of unprocessable messages in DLQ',
      '# TYPE dead_letter_queue_depth gauge',
      `dead_letter_queue_depth ${EventBusService.getDeadLetterQueue().length}`,
    ].join('\n');
  }
}
