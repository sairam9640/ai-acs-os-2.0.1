import { describe, it, expect } from 'vitest';
import { EventBusService, SystemEvent } from '../src/services/eventBusService.js';

describe('AI ISP OS Part 1.3 — Event-Driven Bus & Dead-Letter Queue (DLQ) Tests', () => {
  it('Should successfully publish an event and trigger registered subscribers', async () => {
    let receivedEvent: SystemEvent | null = null;

    EventBusService.subscribe('TicketCreated', async (event) => {
      receivedEvent = event;
    });

    const published = await EventBusService.publish({
      eventType: 'TicketCreated',
      tenantId: 'tenant_123',
      actorId: 'user_456',
      correlationId: 'corr_test_01',
      payload: { ticketId: 'TCK-001', subject: 'Slow Internet' },
    });

    expect(published.eventType).toBe('TicketCreated');
    expect(receivedEvent).toBeDefined();
    expect(receivedEvent?.payload.subject).toBe('Slow Internet');
    expect(receivedEvent?.correlationId).toBe('corr_test_01');
  });

  it('Should isolate poison message to Dead-Letter Queue without crashing event bus', async () => {
    EventBusService.subscribe('CommandCompleted', async () => {
      throw new Error('Downstream RPC timeout failure');
    });

    const initialDlqCount = EventBusService.getDeadLetterQueue().length;

    await EventBusService.publish({
      eventType: 'CommandCompleted',
      tenantId: 'tenant_123',
      correlationId: 'corr_poison_01',
      payload: { commandId: 'CMD-999', status: 'failed' },
    });

    const dlq = EventBusService.getDeadLetterQueue();
    expect(dlq.length).toBe(initialDlqCount + 1);
    expect(dlq[0].errorMessage).toContain('Downstream RPC timeout failure');
    expect(dlq[0].event.correlationId).toBe('corr_poison_01');
  });
});
