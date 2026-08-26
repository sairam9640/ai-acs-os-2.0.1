import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ErrorEnvelopeService } from '../src/services/errorEnvelope.js';

describe('AI ISP OS Part 1.6 — API Standards & Canonical Error Envelope Tests', () => {
  const app = express();

  app.get('/test/error/validation', (req, res) => {
    return ErrorEnvelopeService.formatError(res, 'VALIDATION_ERROR', 'Invalid VLAN ID specified', 422, {
      requestId: 'req_test_01',
      correlationId: 'corr_test_01',
      details: { field: 'vlanId', allowedRange: '1-4094' },
    });
  });

  app.get('/test/error/offline', (req, res) => {
    return ErrorEnvelopeService.formatError(res, 'DEVICE_OFFLINE', 'CPE is unreachable via TR-069 session', 504, {
      requestId: 'req_test_02',
      correlationId: 'corr_test_02',
      retryable: true,
    });
  });

  it('Should return standard error envelope with typed code, requestId, and details', async () => {
    const res = await request(app).get('/test/error/validation');
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Invalid VLAN ID specified');
    expect(res.body.error.requestId).toBe('req_test_01');
    expect(res.body.error.correlationId).toBe('corr_test_01');
    expect(res.body.error.retryable).toBe(false);
    expect(res.body.error.details.field).toBe('vlanId');
  });

  it('Should set retryable flag to true on transient offline/timeout errors', async () => {
    const res = await request(app).get('/test/error/offline');
    expect(res.status).toBe(504);
    expect(res.body.error.code).toBe('DEVICE_OFFLINE');
    expect(res.body.error.retryable).toBe(true);
  });
});
