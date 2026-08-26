# AI ISP OS — Part 2.1 Scalability, Indexing & Performance Specification

**Document Version:** 1.0  
**Specification:** Part 2.1 — Database & Data Model Specification  
**Date:** 2026-08-23  

---

## 1. Scalability Architecture & ISP-Scale Targets (Section 24 & 40)

To support Tier-2/Tier-1 ISP deployments managing up to 100,000+ subscriber CPEs and 10,000+ km of physical fiber topology, the database layer implements the following engineering controls:

### Performance Engineering Targets:
- **API Read Latency (p95):** < 500 ms for standard CRUD queries.
- **Customer 360 Aggregation:** < 1.2 seconds across all 10 tabs.
- **Command Dispatch Acknowledgement:** < 200 ms (Asynchronous HTTP 202 Accepted).
- **Realtime WebSocket Event Propagation:** < 1.0 second.
- **Telemetry Ingestion Throughput:** Up to 10,000 samples/sec with compact memory footprint.

---

## 2. Telemetry Tiering & Archival Lifecycle (Section 20)

```
[ Active CPE Telemetry Ingestion ]
                │
                ▼
   ┌──────────────────────────┐
   │ Hot Tier: Last 7 Days    │ ──> Indexed in MongoDB (Fast Graphing & Dashboards)
   └──────────────────────────┘
                │ (Nightly Rollup Job)
                ▼
   ┌──────────────────────────┐
   │ Warm Tier: 8 to 90 Days  │ ──> Compressed Daily Average Aggregates
   └──────────────────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │ Cold Archive: > 90 Days  │ ──> Object Storage (S3 / Parquet) for Regulatory SLA Audits
   └──────────────────────────┘
```

---

## 3. High-Throughput Compound Indexes Matrix

1. **`Customer`**:
   - `{ tenantId: 1, accountNumber: 1 }` (Unique)
   - `{ tenantId: 1, phone: 1 }` (Lookup)
   - `{ tenantId: 1, status: 1 }` (Fleet filtering)
2. **`Device`**:
   - `{ tenantId: 1, serialNumber: 1 }` (Unique)
   - `{ tenantId: 1, macAddress: 1 }`
   - `{ tenantId: 1, ponPortId: 1 }` (PON tree mapping)
3. **`DeviceCommand`**:
   - `{ tenantId: 1, deviceId: 1, status: 1 }`
   - `{ idempotencyKey: 1 }` (Deduplication)
4. **`AuditLog`**:
   - `{ tenantId: 1, timestamp: -1 }` (Time-series audit search)
