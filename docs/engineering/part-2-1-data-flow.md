# AI ISP OS — Part 2.1 Engineering Data Flow & Repository Model

**Document Version:** 1.0  
**Specification:** Part 2.1 — Database & Data Model Specification  
**Date:** 2026-08-23  

---

## 1. Multi-Tier Data Access Architecture (Section 13)

To maintain clean architectural boundaries and prevent arbitrary unstructured queries from leaking into controllers, AI ISP OS adopts a strict layered data access pattern:

```
[ HTTP Controller / WebSocket Gateway ]
                   │
                   ▼ (DTO / Validated Input)
      [ Application Service Layer ]
 (Domain Rules, Approvals, Event Publishing)
                   │
                   ▼ (Tenant-Scoped Query Context)
     [ Domain Repository Layer ]
 (Tenant Enforcement, Index Optimization)
                   │
                   ▼ (Mongoose Schema / Driver)
         [ Primary Database Store ]
```

---

## 2. Asynchronous Command & 2-Phase Verification Data Flow (Section 15)

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operator / AI Assistant
    participant API as Command Controller
    participant Svc as DeviceManagementService
    participant Repo as CommandRepository
    participant ACS as CWMP Adapter / Gateway
    participant CPE as Customer ONT (Private IP)
    participant Event as Typed Event Bus

    Op->>API: POST /api/v1/operator/devices/:id/reboot (Idempotency-Key)
    API->>Svc: requestCommand(tenantId, deviceId, operation)
    Svc->>Svc: Check Device Capability & Approval Policy
    Svc->>Repo: Create Command Record (Status: QUEUED)
    Svc-->>API: HTTP 202 Accepted (Command ID)
    
    Note over Svc,ACS: Asynchronous Execution Loop
    Svc->>ACS: Dispatch RPC (Reboot) on Periodic Inform
    ACS->>CPE: Execute Reboot
    CPE-->>ACS: Inform Session (Event: 1 BOOT)
    ACS->>Repo: Update Command (Status: VERIFYING)
    
    Svc->>ACS: 2-Phase Readback (GetParameterValues)
    ACS-->>Svc: Telemetry (Uptime < 120s, Status: Online)
    Svc->>Repo: Mark Command (Status: SUCCESS, Verified: TRUE)
    Svc->>Event: Publish CommandCompleted Event
    Event->>Op: Realtime WebSocket Notification
```

---

## 3. Optical Telemetry Ingestion & Anomaly Data Flow (Section 20)

```
[ OLT / CPE Periodic Inform ]
            │
            ▼ (Raw Optical dBm)
 [ Telemetry Ingestion Service ]
            │
            ├─► [ Device Current State Store ] (Fast Dashboard Cache)
            │
            ├─► [ Historical Telemetry Store ] (Time-Series Samples)
            │
            ▼
[ Anomaly Trajectory Analyzer ]
  ├── Variance <= 1.5 dB  ──> (OPTIMAL)
  ├── Drift > -27.0 dBm   ──> (GRADUAL_DEGRADATION Alert)
  └── Delta > 6.0 dB drop ──> (SUDDEN_DROP Incident Candidate)
            │
            ▼
  [ Event Bus / Incident Correlator ]
```
