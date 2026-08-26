# AI ISP OS — Part 2.4 GIS Security & Topology Privacy Specification

**Document Version:** 1.0  
**Specification:** Part 2.4 — Fiber GIS & Network Mapping Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Spatial Multi-Tenancy & PII Protection (Section 6 & 29)

- **Mandatory Tenant Scoping:** Every spatial query, route trace, and reverse impact calculation enforces `{ tenantId: req.tenantId }`.
- **Customer PII Redaction:** General map tiles and fiber path renderings omit sensitive customer PII (phone numbers, billing data) unless accessed by an authorized operator through the secure Customer 360 controller.
- **Topology Export Restrictions:** Full GIS exports (KML/GeoJSON) require elevated permissions (`topology.export`), are strictly audited, and emit expiring download signatures.
