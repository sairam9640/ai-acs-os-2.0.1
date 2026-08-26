# AI ISP OS — Part 3.5 Customer Security, Privacy & IDOR Defenses

**Document Version:** 1.0  
**Specification:** Part 3.5 — Customer Self-Service & Omnichannel Support  
**Date:** 2026-08-23  

---

## 1. Zero-Trust Customer Isolation (Section 6 & 50)

- **IDOR Protection:** Accessing `/api/v1/customer/*` enforces matching `req.customerId` against the target resource record. Attempting to pass another subscriber's `customerId` is immediately rejected with `403 FORBIDDEN`.
- **Credential Masking:** Payment card numbers, Wi-Fi WPA2 pre-shared keys (unless explicitly requested with MFA confirmation), and internal OLT credentials are never returned in public API payloads.
