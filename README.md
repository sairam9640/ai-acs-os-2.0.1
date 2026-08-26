# AI ISP OS — Autonomous Broadband & Fiber Operations Platform

**AI ISP OS** is an enterprise-grade, multi-tenant Autonomous ISP Operating System engineered for next-generation telecommunications providers, fiber infrastructure operators, and broadband ISPs.

---

## 1. Platform Architecture & Capabilities

```
[ Super Admin Console | Operator NOC & Customer 360 | Technician Mobile | Customer Self-Service ]
                                       │
                                       ▼
                     [ Centralized Express BFF API Gateway ]
          (Multi-Tenant Isolation, JWT Bearer Auth, Rate Limiting, Request IDs)
                                       │
     ┌───────────────────┬─────────────┴─────┬───────────────────┐
     ▼                   ▼                   ▼                   ▼
[ Domain Services ] [ Data Repositories ] [ Fiber GIS Engine ] [ AI Copilot Gateway ]
- Customer 360      - CustomerRepo        - Optical Link Budget- Diagnosis Contract
- Billing Engine    - DeviceRepo          - OTDR Localization  - Injection Defenses
- Work Orders       - FiberTopologyRepo   - Quality Scoring    - Token/Cost Tracker
- Diagnostics       - Optimistic Locking  - Graph Path Trace   - Human Approval Gating
     │                   │                   │                   │
     └───────────────────┼───────────────────┴───────────────────┘
                         ▼
        [ Infrastructure & External Interfaces ]
  (MongoDB 8.0, TR-069 ACS, TR-369 USP, Redis Event Bus, Prometheus Metrics)
```

---

## 2. Complete Milestone & Specification Matrix

| Lifecycle Baseline | Specifications Covered | Scope & Capabilities | Status |
|---|---|---|---|
| **Part 1: Product Baseline** | Parts 1.1 → 1.6 | 33 UI Screens, 4 Role-Scoped Portals, Customer 360 Flagship, Interactive Fiber GIS Map | **100% CERTIFIED** |
| **Part 2: Engineering Baseline** | Parts 2.1 → 2.6 | Typed Repositories, 8-State Command Engine, TR-069/USP Adapters, OTDR Localization, AI Diagnosis Contract | **100% CERTIFIED** |
| **Part 3: Production Implementation** | Parts 3.1 → 3.6 | Operations Center KPIs, Deterministic Billing, Field Work Orders, Customer Self-Service, Production Runbooks | **100% CERTIFIED** |
| **Production Hardening** | Security & Ops | Secrets in `.env`, Localhost Port Isolation, CORS Lockdown (`https://ciniplay.in`), Protected `/metrics`, Mandatory Webhook HMAC, Authenticated WebSockets | **100% CERTIFIED** |

---

## 3. Technology Stack & Hardened Security Posture

- **Backend / BFF Runtime:** Node.js, Express, TypeScript (Strictly typed, 0 lint/compile errors)
- **Frontend Architecture:** React 18 + Vite 5 + Tailwind CSS SPA with dedicated role logins and authoritative RBAC guards
- **Database & Containment:** MongoDB 8.0 bound strictly to `127.0.0.1:27017` (Zero external port exposure)
- **Secrets Management:** Cryptographic secrets and API keys loaded exclusively via `.env` (No hardcoded credentials)
- **CORS Policy:** Strict origin restriction locked down to `https://ciniplay.in` and `https://www.ciniplay.in`
- **Observability Security:** Prometheus telemetry (`/metrics` & `/api/v1/metrics`) guarded by Bearer Token authorization
- **Inbound Webhook Security:** Mandatory HMAC-SHA256 signature verification (`x-hub-signature-256`, `x-signature`)
- **Real-Time Communication:** WebSockets (`socket.io`) with JWT token verification and tenant room authorization
- **Testing Assurance:** Vitest — **28 Test Suites, 90 Automated Tests, 100% Pass Rate**

---

## 4. Test Verification Matrix (28 Suites, 90 Tests Passed)

```
✓ tests/masterE2E.test.ts (7 tests)
✓ tests/part3MasterHardening.test.ts (5 tests)
✓ tests/verticalSlice.test.ts (8 tests)
✓ tests/fiberGisTrace.test.ts (2 tests)
✓ tests/part3VerticalSlice.test.ts (5 tests)
✓ tests/operationsCenterWorkflows.test.ts (1 test)
✓ tests/fiberGisEngineering.test.ts (3 tests)
✓ tests/tenantIsolation.test.ts (3 tests)
✓ tests/approvalWorkflow.test.ts (3 tests)
✓ tests/commandLifecycleEngine.test.ts (3 tests)
✓ tests/aiTroubleshootingEngine.test.ts (4 tests)
✓ tests/workOrderFieldOperations.test.ts (3 tests)
✓ tests/networkManagementDiagnostics.test.ts (5 tests)
✓ tests/databaseRepositories.test.ts (4 tests)
✓ tests/customerBillingLifecycle.test.ts (3 tests)
✓ tests/reconciliationEngine.test.ts (1 test)
✓ tests/dataMigration.test.ts (3 tests)
✓ tests/aiToolSafety.test.ts (3 tests)
✓ tests/customerSelfServicePortal.test.ts (3 tests)
✓ tests/opticalAnomaly.test.ts (3 tests)
✓ tests/circuitBreaker.test.ts (3 tests)
✓ tests/deviceLab.test.ts (2 tests)
✓ tests/vendorAdapter.test.ts (3 tests)
✓ tests/apiStandards.test.ts (2 tests)
✓ tests/eventBus.test.ts (2 tests)
✓ tests/webhooks.test.ts (3 tests)
✓ tests/observabilityMetrics.test.ts (1 test)
✓ tests/runbooks.test.ts (2 tests)

Test Files:  28 passed (28)
Total Tests: 90 passed (90)
Success Rate: 100%
```

---

## 5. Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (v6.0+)
- npm / yarn / pnpm

### Installation
```bash
# Clone the repository
git clone <repository_url>
cd ai-isp-os

# Copy environment variables
cp .env.example .env

# Install backend dependencies & run tests
cd backend
npm install
npm test

# Build backend and frontend bundles
npm run build
cd ../frontend
npm install
npm run build
```

---

## 6. Master Engineering Documentation

All engineering analyses, architecture blueprints, sequence diagrams, and operational runbooks are located under `docs/`:

- **Phase 1 PRDs:** `docs/prds/`
- **Phase 2 Architecture:** `docs/engineering/`
- **Phase 3 Implementation:** `docs/part-3/`
- **Operations & Runbooks:** `docs/operations/`
- **Security Incident Response:** `docs/security/`
- **Production Checklists:** `docs/production/`

---

## 7. License
Proprietary & Confidential — AI ISP OS Platform.
