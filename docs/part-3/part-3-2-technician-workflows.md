# AI ISP OS — Part 3.2 Technician Workflows & Evidence Capture

**Document Version:** 1.0  
**Specification:** Part 3.2 — Advanced Operations & Cross-Module Workflows  
**Date:** 2026-08-23  

---

## 1. Field Technician State Machine (Section 26 & 27)

```mermaid
stateDiagram-v2
    [*] --> UNASSIGNED: Job Created from Incident/Ticket
    UNASSIGNED --> ASSIGNED: Operator Dispatches to Tech
    ASSIGNED --> ACCEPTED: Technician Acknowledges on Mobile
    ACCEPTED --> EN_ROUTE: GPS Travel Tracking
    EN_ROUTE --> ON_SITE: Arrived at Fiber Access Terminal
    ON_SITE --> WORKING: Splicing / Port Assignment
    WORKING --> EVIDENCE_SUBMITTED: Optical Power Read & Photos
    EVIDENCE_SUBMITTED --> VERIFIED: Telemetry Readback Passes
    VERIFIED --> COMPLETED: Operator / System Signs Off
    COMPLETED --> [*]
```
