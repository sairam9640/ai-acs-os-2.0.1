# AI ISP OS — Part 3.4 Serialized Hardware Asset Management

**Document Version:** 1.0  
**Specification:** Part 3.4 — Field Operations & Work Orders  
**Date:** 2026-08-23  

---

## 1. Serialized Hardware Lifecycle (Section 33 & 34)

- **Asset Lifecycle:** `RECEIVED` $\to$ `IN_STOCK` $\to$ `RESERVED` $\to$ `ISSUED` $\to$ `INSTALLED` $\to$ `ACTIVE` $\to$ `REPAIR` $\to$ `RETIRED`.
- **Unique Serial Binding:** Prevents duplicate assignment of the same physical MAC/Serial number to multiple customers simultaneously.
