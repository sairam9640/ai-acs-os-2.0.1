import { Types } from 'mongoose';

export type SystemEventType =
  | 'CPEInformed'
  | 'CommandCompleted'
  | 'OpticalThresholdCrossed'
  | 'FiberIncidentCandidate'
  | 'TicketCreated'
  | 'JobAssigned'
  | 'AIRecommendationCreated';

export interface SystemEvent<T = any> {
  eventId: string;
  eventType: SystemEventType;
  tenantId: string;
  actorId?: string;
  correlationId: string;
  timestamp: Date;
  payload: T;
}

export interface DeadLetterItem {
  id: string;
  event: SystemEvent;
  errorMessage: string;
  stack?: string;
  failedAt: Date;
  retryCount: number;
}

export type EventHandler<T = any> = (event: SystemEvent<T>) => Promise<void>;

export class EventBusService {
  private static subscribers: Map<SystemEventType, Array<EventHandler>> = new Map();
  private static deadLetterQueue: Array<DeadLetterItem> = [];
  private static maxDlqSize = 500;

  /**
   * Subscribes a handler to a specific event type
   */
  static subscribe<T = any>(eventType: SystemEventType, handler: EventHandler<T>) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler as EventHandler);
  }

  /**
   * Publishes an event to all registered subscribers with error capture to DLQ
   */
  static async publish<T = any>(eventData: {
    eventType: SystemEventType;
    tenantId: string;
    actorId?: string;
    correlationId?: string;
    payload: T;
  }): Promise<SystemEvent<T>> {
    const event: SystemEvent<T> = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType: eventData.eventType,
      tenantId: eventData.tenantId,
      actorId: eventData.actorId,
      correlationId: eventData.correlationId || `corr_${Date.now()}`,
      timestamp: new Date(),
      payload: eventData.payload,
    };

    const handlers = this.subscribers.get(eventData.eventType) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err: any) {
        // Capture poison message to Dead Letter Queue without terminating the event bus
        this.captureDeadLetter(event, err);
      }
    }

    return event;
  }

  /**
   * Stores failed event in Dead Letter Queue (DLQ)
   */
  private static captureDeadLetter(event: SystemEvent, error: Error) {
    const dlqItem: DeadLetterItem = {
      id: `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      event,
      errorMessage: error.message,
      stack: error.stack,
      failedAt: new Date(),
      retryCount: 0,
    };

    this.deadLetterQueue.unshift(dlqItem);
    if (this.deadLetterQueue.length > this.maxDlqSize) {
      this.deadLetterQueue.pop();
    }
  }

  /**
   * Retrieves items from Dead Letter Queue
   */
  static getDeadLetterQueue(): Array<DeadLetterItem> {
    return this.deadLetterQueue;
  }

  /**
   * Redrives/retries an event from the Dead Letter Queue
   */
  static async redriveDeadLetter(dlqId: string): Promise<boolean> {
    const index = this.deadLetterQueue.findIndex((item) => item.id === dlqId);
    if (index === -1) return false;

    const dlqItem = this.deadLetterQueue[index];
    const handlers = this.subscribers.get(dlqItem.event.eventType) || [];

    try {
      for (const handler of handlers) {
        await handler(dlqItem.event);
      }
      this.deadLetterQueue.splice(index, 1);
      return true;
    } catch (err: any) {
      dlqItem.retryCount += 1;
      dlqItem.errorMessage = `Retry ${dlqItem.retryCount} failed: ${err.message}`;
      return false;
    }
  }
}
