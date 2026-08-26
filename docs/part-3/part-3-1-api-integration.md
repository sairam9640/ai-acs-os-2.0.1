# AI ISP OS — Part 3.1 API Integration & Contract Baseline

**Document Version:** 1.0  
**Specification:** Part 3.1 — Production Application Implementation  
**Date:** 2026-08-23  

---

## 1. Unified Production API Gateway Contract (Section 8 & 12)

All API requests pass through the centralized Express BFF at `/api/v1/*` enforcing:
1. `x-request-id` and `x-correlation-id` header propagation.
2. Mandatory `tenantId` context extracted from verified JWT claims.
3. Canonical error envelopes on failures:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid parameter value",
       "requestId": "req_1724400000",
       "correlationId": "corr_1724400000",
       "retryable": false
     }
   }
   ```
4. Health & readiness endpoints: `/health/live`, `/health/ready`, `/health/version`, `/metrics`.
