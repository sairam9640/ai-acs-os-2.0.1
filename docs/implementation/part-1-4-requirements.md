# AI ISP OS — Part 1.4 Requirements Mapping & Traceability

**Specification:** Document 04 — Implementation + Deployment Guide  
**Date:** 2026-08-23  

---

## Requirements Mapping Matrix

### REQ-DEP-01: Data Migration Engine & Reconciliation
- **Module:** Migration & Onboarding
- **Screen:** Operator Settings (`/operator/settings`), Super Admin (`/superadmin/tenants`)
- **Route:** `POST /api/v1/operator/migration/import`, `GET /api/v1/operator/migration/reconcile`
- **API:** `dataMigrationService.ts`, `DataMigrationService.importSubscribers()`, `DataMigrationService.generateReconciliationReport()`
- **Database:** `MigrationJob`, `Customer`, `Device`, `FiberTopology`
- **Permission:** `operator_admin`, `super_admin`
- **Tenant Scope:** Explicitly tenant-scoped; validates tenant boundary before committing records
- **Integration:** CSV/JSON bulk parser
- **Realtime:** Emits migration progress percentage via WebSocket
- **Audit:** Records migration batch ID, record count, actor, and checksum
- **Test:** [`backend/tests/dataMigration.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/dataMigration.test.ts)
- **Acceptance Criteria:** Imports customers, devices, and OLT associations with deduplication and checksum reconciliation.

---

### REQ-DEP-02: Virtual Device Lab & Certification Harness
- **Module:** Device Management & QA
- **Screen:** System Health (`/superadmin/health`), ONT Fleet (`/operator/devices`)
- **Route:** `POST /api/v1/operator/device-lab/simulate-inform`, `POST /api/v1/operator/device-lab/certify`
- **API:** `deviceLabService.ts`, `DeviceLabService.simulateCpeSession()`
- **Database:** `Device`, `DeviceCommand`
- **Permission:** `operator_admin`, `noc_operator`
- **Tenant Scope:** Tenant-scoped CPE lab instance
- **Integration:** TR-069 CWMP / TR-369 USP simulator
- **Realtime:** Realtime session log streaming
- **Audit:** Records certification test results per vendor/model profile
- **Test:** [`backend/tests/deviceLab.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/deviceLab.test.ts)
- **Acceptance Criteria:** Simulates TR-069 session lifecycle (Inform $\to$ GetParameterValues $\to$ SetParameterValues $\to$ Reboot $\to$ 2-phase verify).

---

### REQ-DEP-03: Operational Runbooks Engine
- **Module:** NOC Operations & Incident Response
- **Screen:** NOC Dashboard (`/operator/dashboard`), Incidents (`/operator/incidents`)
- **Route:** `GET /api/v1/operator/runbooks`, `POST /api/v1/operator/runbooks/:id/execute-step`
- **API:** `runbookService.ts`, `RunbookService.getRunbooks()`, `RunbookService.executeStep()`
- **Database:** `RunbookExecution`
- **Permission:** `operator_admin`, `noc_operator`
- **Tenant Scope:** Tenant-scoped runbook instances
- **Integration:** Automated diagnostic scripts & OTDR triggers
- **Realtime:** Step completion events
- **Audit:** Records runbook execution timeline, actor, and recovery results
- **Test:** [`backend/tests/runbooks.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/runbooks.test.ts)
- **Acceptance Criteria:** Provides step-by-step guidance for 11 critical production incident categories.

---

### REQ-DEP-04: Containerized Production Topology
- **Module:** DevOps & Deployment
- **Files:** `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`
- **Services:** `backend`, `frontend`, `mongodb`, `redis`, `prometheus`
- **Acceptance Criteria:** Multi-container cluster orchestration with environment configuration and health checks.
