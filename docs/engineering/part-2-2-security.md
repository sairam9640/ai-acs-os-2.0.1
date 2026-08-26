# AI ISP OS — Part 2.2 Security Architecture & Risk Controls

**Document Version:** 1.0  
**Specification:** Part 2.2 — Backend & API Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Risk-Tiered Authorization Engine (Section 5)

Operations are classified into 4 strict risk levels with corresponding enforcement mechanisms:

| Risk Tier | Examples | Control & Enforcement Boundary |
|---|---|---|
| **Low** | Read customer profile, view device telemetry, inspect GIS map | Role permission check (`*.read`) with tenant scope |
| **Medium** | Update Wi-Fi SSID/password, toggle port status | Role permission + explicit user confirmation in UI |
| **High** | Reboot ONT, edit WAN PPPoE/VLAN, factory reset | Permission + step-up confirmation + Approval Policy Gate |
| **Critical / Bulk** | Bulk firmware upgrade, WAN profile deletion, OLT reconfiguration | Dual-admin authorization + scope validation + audit logging |

---

## 2. Server-Side Security Hardening (Section 26)

- **IDOR Protection:** Every query asserts object ownership by comparing `entity.tenantId === req.tenantId`.
- **Secret Scrubbing:** Password fields, Wi-Fi keys, and API tokens are omitted from query projections by default and redacted before logging.
- **HMAC Signatures:** Webhooks from WhatsApp and Stripe/Razorpay require valid SHA256 HMAC signatures.
- **CORS & Rate Limiting:** Strict CORS origin policies and IP/Tenant-based rate limiting on sensitive authentication and command endpoints.
