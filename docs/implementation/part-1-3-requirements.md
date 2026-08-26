# AI ISP OS — Part 1.3 Requirements Mapping & Traceability

**Specification:** Document 03 — Technical Architecture PRD  
**Date:** 2026-08-23  

---

## Requirements Mapping Matrix

### REQ-ARC-01: Typed Event Bus with Dead-Letter Queue (DLQ)
- **Module:** Async Core / Event Bus
- **Screen:** System Health & Microservices (`/superadmin/health`), NOC Dashboard (`/operator/dashboard`)
- **Route:** Internal Service Event Bus & `GET /api/v1/superadmin/events/dlq`
- **API:** `eventBusService.ts`, `EventBusService.publish()`, `EventBusService.subscribe()`
- **Database:** `DeadLetterEvent` (Mongo/Postgres store)
- **Permission:** `super_admin` (DLQ inspect & redrive), internal service
- **Integration:** Microservices, Telemetry Ingestion, Notifications
- **Realtime:** Dispatches WebSocket broadcasts on `CommandCompleted` and `OpticalThresholdCrossed`
- **Audit:** Records failed event ingestion to audit log
- **Test:** [`backend/tests/eventBus.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/eventBus.test.ts)
- **Acceptance Criteria:** Events must carry `correlation_id`, `tenant_id`, `actor_id`, and `timestamp`. Poison messages must be routed to DLQ without crashing the process.

---

### REQ-ARC-02: AI Tool Registry & Safety Policy Gate
- **Module:** AI Command Center & Gateway
- **Screen:** AI Command Center (`/operator/ai`)
- **Route:** `POST /api/v1/operator/ai/command`, `POST /api/v1/operator/ai/execute-tool`
- **API:** `aiToolRegistry.ts`, `AIToolRegistry.executeTool()`
- **Database:** `AIInteraction`, `ApprovalRequest`
- **Permission:** `operator_admin`, `noc_operator`
- **Integration:** LLM Provider / AI Gateway
- **Realtime:** Notifies UI when tool execution requires human authorization
- **Audit:** Records all tool calls, inputs, and post-action verified states
- **Test:** [`backend/tests/aiToolSafety.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/aiToolSafety.test.ts)
- **Acceptance Criteria:** Model cannot execute direct database writes; privileged actions require explicit approval before dispatch.

---

### REQ-ARC-03: Integration Circuit Breakers
- **Module:** Integrations & Reliability
- **Screen:** System Health (`/superadmin/health`)
- **Route:** `GET /api/v1/superadmin/circuit-breakers`
- **API:** `circuitBreaker.ts`, `CircuitBreaker.execute()`
- **Database:** Memory & Metric store
- **Permission:** Internal & `super_admin`
- **Integration:** WhatsApp Cloud API, External SMS Gateways, Remote ACS RPC endpoints
- **Realtime:** Realtime trip event sent when error threshold exceeded
- **Audit:** Records circuit breaker state transitions (`CLOSED` $\to$ `OPEN` $\to$ `HALF_OPEN`)
- **Test:** [`backend/tests/circuitBreaker.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/circuitBreaker.test.ts)
- **Acceptance Criteria:** Fast-fails external requests after consecutive error threshold (5 failures) and self-heals after cooldown timeout (30s).

---

### REQ-ARC-04: Observability & Prometheus Metrics Ingestion
- **Module:** Observability & Monitoring
- **Screen:** System Health (`/superadmin/health`), Operator Dashboard (`/operator/dashboard`)
- **Route:** `GET /api/v1/metrics`, `GET /api/v1/health`
- **API:** `metricsService.ts`, `MetricsService.getMetricsSnapshot()`
- **Database:** In-memory counter store & Time-series
- **Permission:** Public health check, `super_admin` metrics
- **Integration:** Prometheus, Grafana, OpenTelemetry
- **Realtime:** Emits latency and queue stats
- **Audit:** Masked logging (zero credential exposure)
- **Test:** [`backend/tests/observabilityMetrics.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/observabilityMetrics.test.ts)
- **Acceptance Criteria:** Emits structured latency, queue depth, command success rates, and active tenant device metrics.

---

### REQ-ARC-05: Command Idempotency & Durability
- **Module:** Device Management Engine
- **Screen:** Customer 360 (`/operator/customers/:id`), ONT Detail (`/operator/devices/:id`)
- **Route:** `POST /api/v1/operator/devices/:id/command`
- **API:** `deviceManagementService.ts` with `Idempotency-Key` header support
- **Database:** `DeviceCommand` with persistent state machine
- **Permission:** `operator_admin`, `noc_operator`
- **Integration:** TR-069 ACS Gateway & TR-369 USP Controller
- **Realtime:** WebSocket status stream (`queued` $\to$ `sent` $\to$ `verifying` $\to$ `success`)
- **Audit:** Records before/after state diffs with correlation IDs
- **Test:** [`backend/tests/commandDurability.test.ts`](file:///C:/Users/meese/.gemini/antigravity/scratch/ai-isp-os/backend/tests/commandDurability.test.ts)
- **Acceptance Criteria:** Duplicate requests with same `idempotencyKey` return identical command status without re-enqueuing duplicate hardware RPCs.
