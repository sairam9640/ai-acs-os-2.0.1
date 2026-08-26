import { describe, it, expect } from 'vitest';
import { RunbookService } from '../src/services/runbookService.js';

describe('AI ISP OS Part 1.4 — Operational Incident Runbooks Tests', () => {
  it('Should retrieve full catalog of enterprise operational runbooks', () => {
    const runbooks = RunbookService.getRunbooks();
    expect(runbooks.length).toBeGreaterThanOrEqual(4);

    const fiberCut = runbooks.find((r) => r.id === 'RB-02-FIBER-CUT');
    expect(fiberCut).toBeDefined();
    expect(fiberCut?.severity).toBe('CRITICAL');
    expect(fiberCut?.steps.length).toBe(4);
  });

  it('Should retrieve runbook by ID with exact step instructions', () => {
    const apiOutage = RunbookService.getRunbookById('RB-01-API-OUTAGE');
    expect(apiOutage).toBeDefined();
    expect(apiOutage?.steps[0].title).toBe('Verify Cluster Ingress Health');
  });
});
