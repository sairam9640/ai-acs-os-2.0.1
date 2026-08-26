# AI ISP OS — Part 2.2 Domain Data Architecture & Entity Ownership

**Document Version:** 1.0  
**Specification:** Part 2.2 — Backend & API Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Domain Ownership Matrix (Section 2 & 4)

To prevent circular dependencies and state duplication, every data entity is owned by exactly one domain module:

| Domain Module | Primary Models | State Ownership | Primary Responsibilities |
|---|---|---|---|
| **Identity & Tenancy** | `Tenant`, `TenantPlan`, `User` | Active Tenants, Users, RBAC permissions | Tenant scoping, authentication, token issuance |
| **Customer & CRM** | `Customer` | Subscriber profiles, addresses, bandwidth plans | Customer 360 flagship aggregation, account search |
| **Device & Commands** | `Device`, `DeviceCapability`, `DeviceCommand` | CPE inventory, live status, command states | Capability resolution, 2-phase command verify |
| **Fiber GIS & Network** | `OLT`, `PONPort`, `FiberNode`, `FiberSegment` | Physical OLT/PONs, splitters, cable spans | Spatial route tracing, reverse fault cut impact |
| **Telemetry & Health** | Device Telemetry, Baseline stores | Optical dBm, temperature, CPU/memory | Trajectory analysis, optical degradation alerts |
| **Incidents & Tickets** | `Incident`, `Alert`, `Ticket`, `TechnicianJob` | Outage events, support tickets, work orders | Topology correlation, field tech dispatch |
| **AI Gateway** | `AIInteraction`, AI Tool logs | Diagnostic inferences, safe tool runs | Context scoping, human approval interception |
| **Platform Ops** | `ApprovalPolicy`, `ApprovalRequest`, `AutomationRule`, `InventoryItem`, `NotificationLog`, `AuditLog` | Approvals, rules, stock, messaging, audit | Event automation, WhatsApp dispatch, audit trails |
