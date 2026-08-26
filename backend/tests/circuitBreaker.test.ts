import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from '../src/services/circuitBreaker.js';

describe('AI ISP OS Part 1.3 — Integration Circuit Breaker Tests', () => {
  it('Should start in CLOSED state and execute actions normally', async () => {
    const cb = new CircuitBreaker('TestService', { failureThreshold: 3, cooldownMs: 50 });
    const result = await cb.execute(async () => 'OK');
    expect(result).toBe('OK');
    expect(cb.state).toBe('CLOSED');
  });

  it('Should trip to OPEN state after reaching consecutive failure threshold', async () => {
    const cb = new CircuitBreaker('TestService', { failureThreshold: 3, cooldownMs: 50 });

    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('Upstream timeout');
        });
      } catch (err) {}
    }

    expect(cb.state).toBe('OPEN');

    // Subsequent call should fast-fail without executing action
    let actionExecuted = false;
    try {
      await cb.execute(async () => {
        actionExecuted = true;
        return 'SHOULD_NOT_RUN';
      });
    } catch (err: any) {
      expect(err.message).toContain('CircuitBreaker [TestService] is OPEN');
    }

    expect(actionExecuted).toBe(false);
  });

  it('Should transition to HALF_OPEN after cooldown and recover to CLOSED on success', async () => {
    const cb = new CircuitBreaker('TestService', { failureThreshold: 2, cooldownMs: 30, successThreshold: 1 });

    for (let i = 0; i < 2; i++) {
      try {
        await cb.execute(async () => {
          throw new Error('Fail');
        });
      } catch (err) {}
    }
    expect(cb.state).toBe('OPEN');

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 40));

    const result = await cb.execute(async () => 'RECOVERED');
    expect(result).toBe('RECOVERED');
    expect(cb.state).toBe('CLOSED');
  });
});
