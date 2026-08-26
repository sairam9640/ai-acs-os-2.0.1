# AI ISP OS — Part 2.1 Database & Data Model Engineering Analysis

**Document Version:** 1.0  
**Source Document:** Part 2.1 — Database & Data Model Specification (Engineering Build Specification)  
**Parent Baseline:** Documents 01–06 (Part 1 Product Baseline)  
**Date:** 2026-08-23  

---

## 1. Executive Engineering Summary

Part 2.1 establishes the **canonical entity hierarchy, database schemas, compound indexing strategy, repository boundaries, optimistic concurrency control, and data retention architecture** for the AI ISP OS platform.

### Core Entity Logical Chain (Section 3 & 18):
```
Tenant (Root Boundary)
   ├── Users / RBAC Roles / Permissions / Sessions
   ├── Customers
   │     └── Services (Contracts / Bandwidth Plans)
   │           └── Devices / ONTs (CWMP / USP Parameters)
   │                 ├── Commands & 2-Phase Verification History
   │                 ├── Telemetry Samples & Anomaly Trajectories
   │                 └── Connected Devices (MAC / Hostname / IP)
   ├── Fiber GIS Topology Network Graph
   │     ├── Central Office OLTs ──> PON Ports
   │     ├── Feeder & Distribution Fiber Cables ──> Fiber Cores
   │     ├── Primary & Secondary Optical Splitters (1:8, 1:16)
   │     └── FAT / NAP Pole Boxes ──> Drop Cables ──> Subscriber ONT
   ├── Operations Domain
   │     ├── Network Alarms & Incidents (Topology Fault Correlation)
   │     ├── Support Tickets & SLA Tracking
   │     └── Field Technician Jobs (Measurements & Optical Evidence)
   └── AI & Platform Domain
         ├── AI Sessions & Safe Tool Registry Logs
         ├── Multi-Channel Messaging Logs (WhatsApp / SMS)
         ├── Billing Accounts & Revenue Entries
         └── Tamper-Evident Secret-Masked Audit Trail
```

---

## 2. Existing Data Model Assessment & Gap Analysis

Our existing Mongoose/MongoDB data model created during Part 1 implements all primary entities:
1. `Tenant` & `TenantPlan`
2. `User` & `Session`
3. `Customer` & `Customer360`
4. `Device`, `DeviceCapability`, `DeviceCommand`
5. `FiberTopology` (`OLT`, `PONPort`, `FiberNode`, `FiberSegment`)
6. `Incident` & `Alert`
7. `Ticket` & `TechnicianJob`
8. `ApprovalPolicy` & `ApprovalRequest`
9. `AutomationRule` & `AutomationLog`
10. `InventoryItem` & `NotificationLog`
11. `AuditLog`

### Engineering Refinements in Part 2.1:
- **Explicit Compound Indexes:** Formalize compound indexes for multi-tenant query acceleration (`[tenantId, serviceNumber]`, `[tenantId, phone]`, `[tenantId, serialNumber]`, `[deviceId, observedAt]`).
- **Data Access Repositories:** Introduce typed repository layer wrapping data access models to enforce tenant boundaries and prevent direct uncontrolled queries.
- **Optimistic Concurrency Control:** Support version tracking (`version` / `__v`) for concurrent device configuration mutations and fiber topology edits.
- **Telemetry Tiering:** Separate operational current device state (`device_current_state`) from historical telemetry time-series samples (`telemetry_samples`).
