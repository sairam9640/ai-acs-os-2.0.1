# AI ISP OS — Part 1.6 Requirements Mapping & Integration Contracts

**Specification:** Document 06 — API + Integration Specification  
**Date:** 2026-08-23  

---

## Requirements Mapping Matrix

### REQ-INT-01: Canonical API Error Envelope & Status Handling (Section 2 & 22)
- **Module:** API Gateway / Middleware
- **Route:** All platform routes (`/api/v1/*`)
- **API:** `errorEnvelope.ts`, `ApiErrorEnvelope` format with `VALIDATION_ERROR`, `NOT_SUPPORTED`, `UNAUTHORIZED`, `FORBIDDEN`, `DEVICE_OFFLINE`, `TIMEOUT`, `PROVIDER_ERROR`, `VERIFICATION_FAILED`
- **Database:** None
- **Permission:** Universal
- **Integration:** All client applications (Web, Mobile, External)
- **Realtime:** Realtime error broadcast format
- **Audit:** Records error correlation IDs
- **Test:** [`backend/tests/apiStandards.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/apiStandards.test.ts)
- **Acceptance Criteria:** Every error response strictly adheres to the standard error envelope with `requestId` and `correlationId`.

---

### REQ-INT-02: Formal Vendor Adapter Interface Contract (Section 10)
- **Module:** Device Engine & Protocols
- **API:** `vendorAdapterInterface.ts`, `IVendorAdapter` declaring `identify()`, `capabilities()`, `read()`, `write()`, `execute()`, `diagnose()`, `verify()`, `health()`
- **Database:** `DeviceCapability`, `DeviceCommand`
- **Permission:** Internal service
- **Integration:** Huawei, ZTE, Nokia, Netlink, TR-069 ACS, TR-369 USP
- **Test:** [`backend/tests/vendorAdapterContract.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/vendorAdapterContract.test.ts)
- **Acceptance Criteria:** Driver adapters implement all interface methods and return structured errors.

---

### REQ-INT-03: Cryptographic Webhook Receiver & Idempotency Pipeline (Section 15, 18, 20)
- **Module:** Integration Gateway
- **Route:** `POST /api/v1/webhooks/whatsapp`, `POST /api/v1/webhooks/billing`
- **API:** `webhookService.ts`, `WebhookService.validateSignature()`, `WebhookService.processWebhook()`
- **Database:** `ProcessedWebhook` (deduplication store)
- **Permission:** Public with HMAC SHA-256 signature verification
- **Integration:** WhatsApp Cloud API, Stripe, Razorpay
- **Audit:** Records webhook event ID, provider, and processing status
- **Test:** [`backend/tests/webhooks.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/webhooks.test.ts)
- **Acceptance Criteria:** Verifies HMAC-SHA256 signature and skips duplicate event IDs (`x-event-id`) idempotently.

---

### REQ-INT-04: Three-Way Data Reconciliation Engine (Section 25)
- **Module:** Data Integrity & Sync
- **Route:** `GET /api/v1/operator/reconciliation/audit`
- **API:** `reconciliationEngineService.ts`, `ReconciliationEngineService.runFullAudit()`
- **Database:** `Device`, `Customer`, `Incident`
- **Permission:** `operator_admin`, `super_admin`
- **Integration:** ACS device inventory, billing ledger, GIS topology
- **Audit:** Records mismatch count and generates operator repair tasks
- **Test:** [`backend/tests/reconciliationEngine.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/reconciliationEngine.test.ts)
- **Acceptance Criteria:** Detects and flags orphaned devices, unassigned ONTs with active optical signal, and billing mismatches.
