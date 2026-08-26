# AI ISP OS — Part 2.1 Database Architecture & Schema Specification

**Document Version:** 1.0  
**Specification:** Part 2.1 — Database & Data Model Specification  
**Date:** 2026-08-23  

---

## 1. Domain Entity Breakdown (Sections 4–17)

### 1.1 Tenant & Identity Domain
- `tenants`: Primary root entity (`id`, `name`, `slug`, `status`, `plan`, `branding`, `timestamps`).
- `tenant_domains`: Multi-tenant subdomain & custom domain mappings.
- `users`: Operator, Admin, Technician, and Customer users (`id`, `tenantId`, `email`, `phone`, `role`, `permissions`, `status`).
- `sessions`: Token sessions with expiration and revocation metadata.
- `approvals`: High-risk operational approval requests.

### 1.2 Customer & Service Domain
- `customers`: Subscriber profile (`id`, `tenantId`, `accountNumber`, `fullName`, `phone`, `email`, `address`, `status`).
- `services`: Active/historical connectivity contracts (`id`, `tenantId`, `customerId`, `planId`, `serviceNo`, `status`).
- `service_plans`: Bandwidth speed definitions, monthly pricing, upload/download limits.

### 1.3 Device / CPE / Network Domain
- `devices`: ONT hardware records (`id`, `tenantId`, `serialNumber`, `macAddress`, `manufacturer`, `modelName`, `currentRxPowerDbm`, `status`).
- `device_capabilities`: Vendor-specific operation permissions.
- `commands`: Asynchronous command requests (`id`, `tenantId`, `deviceId`, `operation`, `status`, `idempotencyKey`, `verification`).
- `olts` & `pons`: Optical Line Terminals and GPON/EPON port allocations.

### 1.4 Fiber GIS Topology Domain
- `fiber_objects` (`FiberNode`): OLT, Splitter (1:8/1:16), FAT/NAP boxes, Customer Premises endpoints.
- `fiber_edges` (`FiberSegment`): Cable spans connecting nodes with core capacity and attenuation properties.

### 1.5 Telemetry & Incident Domain
- `telemetry_samples`: Time-series optical power, temperature, and uptime metrics.
- `incidents`: Correlated network outage events linking affected customers and fiber nodes.
- `tickets`: Support issues and technician work orders.

### 1.6 Audit & AI Domain
- `audit_events`: Tamper-evident, secret-masked audit trail with request and correlation IDs.
- `ai_sessions`: Diagnostic queries, tool calls, and human approval proposals.

---

## 2. Compound Indexing Architecture (Section 19)

To ensure high-throughput query performance under heavy ISP workloads, the following compound indexes are enforced:
1. `Customer`: `[tenantId: 1, accountNumber: 1]`, `[tenantId: 1, phone: 1]`, `[tenantId: 1, status: 1]`
2. `Device`: `[tenantId: 1, serialNumber: 1]`, `[tenantId: 1, macAddress: 1]`, `[tenantId: 1, ponPortId: 1]`, `[tenantId: 1, status: 1]`
3. `DeviceCommand`: `[tenantId: 1, deviceId: 1, status: 1]`, `[idempotencyKey: 1]`
4. `FiberNode`: `[tenantId: 1, nodeCode: 1]`, `[tenantId: 1, upstreamNodeId: 1]`
5. `AuditLog`: `[tenantId: 1, timestamp: -1]`, `[tenantId: 1, targetId: 1]`
6. `NotificationLog`: `[tenantId: 1, sentAt: -1]`
