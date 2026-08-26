# AI ISP OS — Part 2.1 Database Security & Tenant Isolation Specification

**Document Version:** 1.0  
**Specification:** Part 2.1 — Database & Data Model Specification  
**Date:** 2026-08-23  

---

## 1. Multi-Tenant Boundary Enforcement (Section 2)

Tenant isolation is the core security boundary of the platform.

### Strict Data Layer Isolation Rules:
1. **Mandatory Tenant Foreign Key:** Every tenant-owned collection carries `tenantId: Types.ObjectId` as a required, indexed field.
2. **Context Resolution Middleware:** All operator, technician, and customer HTTP requests pass through `resolveTenantContext` and `requireTenant` middleware.
3. **Repository Pre-Filter Injection:** Domain queries automatically inject `{ tenantId: req.tenantId }` into the query filter object.
4. **Cross-Tenant IDOR Prevention:** Any request specifying an explicit object ID (e.g. `customerId`, `deviceId`) verifies that `entity.tenantId === req.tenantId`.

---

## 2. Cryptographic Secret Masking & Redaction (Section 1 & 17)

- **Zero Plaintext Credentials:** Wi-Fi passwords, PPPoE credentials, ACS authentication keys, and OTP hashes are never stored in plaintext and are strictly redacted from:
  - Audit log entries
  - Prometheus metrics output
  - Error envelopes and logs
  - Realtime WebSocket broadcasts
  - AI prompt retrieval contexts.
- **HMAC Signatures:** External webhook integrations (WhatsApp Cloud API, payment gateways) enforce HMAC-SHA256 signature verification.

---

## 3. Tamper-Evident Append-Only Audit Trail (Section 17)

All administrative and operational mutations generate structured audit records:
- `actorId`, `actorEmail`, `actorRole`
- `tenantId`
- `action` (e.g. `DEVICE_REBOOT`, `WAN_DELETE`, `APPROVAL_DECIDED`, `DATA_MIGRATION_IMPORT`)
- `targetResource`, `targetId`, `targetIdentifier`
- `beforeState` & `afterState`
- `correlationId` & `timestamp` (UTC ISO-8601).
