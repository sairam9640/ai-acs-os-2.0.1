# AI ISP OS — Part 2.2 API Architecture & Contracts Specification

**Document Version:** 1.0  
**Specification:** Part 2.2 — Backend & API Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Unified API Conventions (Section 6 & 7)

All public and internal endpoints follow standard enterprise conventions:
1. **JSON Envelope & UTC Timestamps:** All timestamps are formatted in UTC ISO-8601 strings.
2. **Correlation Tracking:** Every request extracts or generates `x-request-id` and `x-correlation-id` headers.
3. **Asynchronous Command Pattern:** Mutating network/device operations return `HTTP 202 Accepted` with a `commandId` / `jobId` payload.
4. **Standard Error Format:** Error responses strictly follow the canonical error envelope:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid VLAN configuration",
       "requestId": "req_1724400000",
       "correlationId": "corr_1724400000",
       "retryable": false,
       "details": {}
     }
   }
   ```

---

## 2. Command Engine 8-State Lifecycle (Section 10)

```mermaid
stateDiagram-v2
    [*] --> CREATED: API Request with Idempotency Key
    CREATED --> AUTHORIZED: RBAC & Policy Check Pass
    AUTHORIZED --> QUEUED: Persisted to DB & Enqueued
    QUEUED --> DISPATCHING: Worker Picks Up Job
    DISPATCHING --> SENT: Dispatched to ACS / USP Gateway
    SENT --> ACKNOWLEDGED: Device / Gateway Confirms RPC
    ACKNOWLEDGED --> VERIFYING: 2-Phase Readback Triggered
    VERIFYING --> VERIFIED: Telemetry Matches Expected State
    VERIFYING --> FAILED: State Mismatch / Readback Error
    SENT --> TIMED_OUT: No Device Response within Timeout
    QUEUED --> CANCELLED: Operator Cancels Command
    VERIFIED --> [*]
    FAILED --> [*]
    TIMED_OUT --> [*]
    CANCELLED --> [*]
```
