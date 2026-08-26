# AI ISP OS — Part 3.1 Production Application Architecture

**Document Version:** 1.0  
**Specification:** Part 3.1 — Production Application Implementation  
**Date:** 2026-08-23  

---

## 1. Integrated Application Architecture (Section 2 & 4)

```
[ Application Clients (Web Admin / Technician Mobile / Customer Portal) ]
                               │
                               ▼
        [ API Gateway / Express BFF (services/api) ]
   (Auth, Tenant Resolution, Rate Limiting, Request Correlation)
                               │
                               ▼
            [ Domain Application Services Layer ]
  (CustomerService / DeviceManagement / FiberGIS / AI / Billing)
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
     [ Repositories ]   [ Worker Queues ]  [ AI Gateway ]
     (Customer / Device   (7 Typed Queues)  (Routing / Safety)
      / Fiber Topology)        │                 │
             │                 ▼                 ▼
             ▼           [ Network Adapters ] [ AI Providers ]
    [ MongoDB / SQL ]     (TR-069 / USP)      (Fast / Reasoning)
```

---

## 2. Global Health & Dependency Probes (Section 9)

- `GET /health/live`: Lightweight liveness check returning process status.
- `GET /health/ready`: Deep readiness probe checking MongoDB connection state and Redis/Queue availability.
- `GET /health/version`: Emits build SHA, semantic version (`v1.0.0-prod`), environment (`production`), and uptime.
- `GET /metrics`: Prometheus formatted telemetry metrics.
