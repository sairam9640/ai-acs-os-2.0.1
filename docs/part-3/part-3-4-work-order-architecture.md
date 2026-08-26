# AI ISP OS — Part 3.4 Work Order Architecture & Lifecycle

**Document Version:** 1.0  
**Specification:** Part 3.4 — Field Operations & Work Orders  
**Date:** 2026-08-23  

---

## 1. Canonical Work Order State Machine (Section 5 & 6)

```mermaid
stateDiagram-v2
    [*] --> READY: Ticket / Incident / Install Request
    READY --> ASSIGNED: Dispatcher / Auto-Assignment
    ASSIGNED --> ACCEPTED: Technician Acknowledges
    ACCEPTED --> SCHEDULED: Appointment Slot Confirmed
    SCHEDULED --> EN_ROUTE: GPS Travel En Route
    EN_ROUTE --> ON_SITE: Arrived at Customer / FAT Node
    ON_SITE --> IN_PROGRESS: Splicing / Device Configuration
    IN_PROGRESS --> EVIDENCE_SUBMITTED: Optical dBm & Site Photos
    EVIDENCE_SUBMITTED --> VERIFICATION: Readback Telemetry Passes
    VERIFICATION --> COMPLETED: Operator / Customer Sign-off
    COMPLETED --> [*]
```
