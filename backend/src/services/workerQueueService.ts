import { EventBusService } from './eventBusService.js';

export type QueueName =
  | 'device-commands'
  | 'device-verification'
  | 'telemetry'
  | 'notifications'
  | 'reports'
  | 'ai-jobs'
  | 'reconciliation';

export interface QueueJob<T = any> {
  id: string;
  queue: QueueName;
  tenantId: string;
  correlationId: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  lastError?: string;
}

export type JobHandler<T = any> = (job: QueueJob<T>) => Promise<void>;

export class WorkerQueueService {
  private static queues: Map<QueueName, QueueJob[]> = new Map();
  private static handlers: Map<QueueName, JobHandler> = new Map();
  private static isProcessing = false;

  /**
   * Registers a worker handler for a specific queue
   */
  static registerWorker<T = any>(queue: QueueName, handler: JobHandler<T>) {
    this.handlers.set(queue, handler as JobHandler);
    if (!this.queues.has(queue)) {
      this.queues.set(queue, []);
    }
  }

  /**
   * Enqueues a job into a background worker queue
   */
  static async enqueue<T = any>({
    queue,
    tenantId,
    correlationId,
    data,
    maxAttempts = 3,
  }: {
    queue: QueueName;
    tenantId: string;
    correlationId?: string;
    data: T;
    maxAttempts?: number;
  }): Promise<QueueJob<T>> {
    const job: QueueJob<T> = {
      id: `job_${queue}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      queue,
      tenantId,
      correlationId: correlationId || `corr_${Date.now()}`,
      data,
      attempts: 0,
      maxAttempts,
      status: 'QUEUED',
      createdAt: new Date(),
    };

    if (!this.queues.has(queue)) {
      this.queues.set(queue, []);
    }
    this.queues.get(queue)!.push(job);

    // Process immediately in background
    setTimeout(() => this.processNextJobs(), 10);
    return job;
  }

  /**
   * Processes queued jobs asynchronously
   */
  private static async processNextJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      for (const [queueName, jobs] of this.queues.entries()) {
        const handler = this.handlers.get(queueName);
        if (!handler) continue;

        while (jobs.length > 0) {
          const job = jobs.shift();
          if (!job) break;

          job.status = 'PROCESSING';
          job.attempts += 1;

          try {
            await handler(job);
            job.status = 'COMPLETED';
          } catch (err: any) {
            job.lastError = err.message;
            if (job.attempts < job.maxAttempts) {
              job.status = 'QUEUED';
              jobs.push(job); // Requeue for retry with backoff
            } else {
              job.status = 'FAILED';
              // Route to Dead Letter Queue
              await EventBusService.publish({
                eventType: 'CommandCompleted',
                tenantId: job.tenantId,
                correlationId: job.correlationId,
                payload: {
                  jobId: job.id,
                  queue: job.queue,
                  status: 'exhausted_dead_letter',
                  error: err.message,
                },
              });
            }
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Returns current queue backlog depths
   */
  static getQueueDepths(): Record<QueueName, number> {
    const depths: any = {};
    for (const [queueName, jobs] of this.queues.entries()) {
      depths[queueName] = jobs.length;
    }
    return depths;
  }
}
