# AI ISP OS — Part 2.5 Authorized Context Retrieval Engine

**Document Version:** 1.0  
**Specification:** Part 2.5 — AI + Automation Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Multi-Domain Context Assembly (Section 4 & 8)

The context retrieval engine gathers authorized evidence dynamically without loading raw database dumps:

| Domain | Retrieved Evidence Fields | Permission Guard |
|---|---|---|
| **Customer** | Account number, name, service plan, address, open tickets | `customer.read` |
| **Device** | Serial number, model, firmware, online status, uptime, capabilities | `device.read` |
| **Telemetry** | Optical RX/TX power, rolling baseline delta, temperature | `telemetry.read` |
| **Fiber GIS** | Upstream FAT box, primary splitter, OLT chassis, route distance | `fiber.read` |
| **Incidents** | Active outages on shared PON/feeder cables, incident severity | `incident.read` |

---

## 2. Strict Tenant Scoping & PII Masking (Section 5 & 34)

Every retrieval query enforces `{ tenantId: req.tenantId }`. Subscriber passwords, Wi-Fi keys, and payment tokens are scrubbed from the prompt context prior to model inference.
