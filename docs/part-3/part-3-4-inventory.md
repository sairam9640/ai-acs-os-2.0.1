# AI ISP OS — Part 3.4 Inventory Tracking & Material Reservations

**Document Version:** 1.0  
**Specification:** Part 3.4 — Field Operations & Work Orders  
**Date:** 2026-08-23  

---

## 1. Material Reservation & Consumption Flow (Section 31 & 36)

```mermaid
sequenceDiagram
    autonumber
    participant WO as Work Order
    participant Inv as Warehouse Inventory
    participant Tech as Technician Van Stock
    participant Job as Field Execution Site

    WO->>Inv: 1. Reserve 1x ONT, 50m Drop Cable, 2x Fast Connectors
    Inv-->>WO: Status: RESERVED (Reserved Stock +1)
    Tech->>Inv: 2. Van Stock Pick-up
    Inv->>Tech: Transfer from Warehouse to Technician
    Tech->>Job: 3. Perform Field Installation
    Tech->>WO: 4. Record Consumed: 1x ONT, 42m Cable (8m Returned)
    WO->>Tech: Deduct from Van Stock & Release Unused
```
