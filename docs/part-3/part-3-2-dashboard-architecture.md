# AI ISP OS — Part 3.2 Dashboard Architecture & KPI Engine

**Document Version:** 1.0  
**Specification:** Part 3.2 — Advanced Operations & Cross-Module Workflows  
**Date:** 2026-08-23  

---

## 1. Modular Widget Architecture (Section 5 & 8)

The dashboard is structured around composable, tenant-scoped data widgets:
1. `KpiSummaryCard`: Total subscribers, active MRR, online device percentage, open outages.
2. `OpticalHealthGauge`: Live optical power distribution (Optimal: -14 to -24 dBm, Degraded: -24 to -27 dBm, Critical: < -27 dBm).
3. `IncidentTimelineFeed`: Chronological events from detection $\to$ OTDR localization $\to$ technician dispatch $\to$ verified recovery.
4. `SlaRiskTable`: Ranked customer support tickets sorted by remaining minutes to SLA breach.
5. `AiApprovalActionDrawer`: Human review modal displaying target ONT, recommended command, risk tier, and parameter diff.
