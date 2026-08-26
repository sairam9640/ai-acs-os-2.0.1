# AI ISP OS — Part 3.1 End-to-End User Flows & Journeys

**Document Version:** 1.0  
**Specification:** Part 3.1 — Production Application Implementation  
**Date:** 2026-08-23  

---

## 1. First Production Vertical Slice Journey (Section 27)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Super Admin
    actor Operator as NOC Operator
    actor Customer as Subscriber
    participant API as AI ISP OS API Gateway
    participant Repo as Data Repositories
    participant GW as Device / ACS Gateway
    participant Bus as Event Bus & DLQ
    participant AI as AI Troubleshooting

    Admin->>API: 1. Provision New ISP Tenant ("Apex Fiber")
    API->>Repo: Persist Tenant & Admin Credentials
    Operator->>API: 2. Authenticate & Obtain Scoped Token
    Operator->>API: 3. Create Customer & Provision Service Plan
    API->>Repo: Insert Customer & Assign FAT Box Drop Port
    Operator->>API: 4. Bind Hardware ONT Device
    API->>GW: Read Initial Telemetry & Status
    GW-->>API: Status: ONLINE, RX: -20.8 dBm
    Operator->>API: 5. Execute Safe Diagnostic (PING)
    API->>GW: Dispatch RPC & Capture Readback
    GW-->>API: Latency: 14.2ms, Packet Loss: 0%
    API->>Bus: Emit DiagnosticCompleted Event
    API->>Repo: Log Immutable Audit Entry
    Customer->>API: 6. Customer Checks Self-Service Portal
    API-->>Customer: Returns Broadband Status: ACTIVE & OPTIMAL
```
