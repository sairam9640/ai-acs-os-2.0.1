# AI ISP OS — Part 2.5 AI Architecture & Gateway Specification

**Document Version:** 1.0  
**Specification:** Part 2.5 — AI + Automation Implementation Specification  
**Date:** 2026-08-23  

---

## 1. AI Layer Architecture (Section 2 & 4)

```
[ Operator Copilot / WhatsApp Support Bot / Tech Assistant ]
                           │
                           ▼
                 [ AI Gateway Layer ]
          (Model Routing, Cost Budgets, Circuit Breakers)
                           │
                           ▼
          [ Context & Evidence Retrieval Engine ]
  (Customer 360, Device Telemetry, Fiber GIS, Incidents)
                           │
                           ▼
             [ AI Reasoning Orchestrator ]
           (Structured Diagnosis Generation)
                           │
                           ▼
                 [ AI Tool Registry ]
         (Low, Medium, High, Critical Risk Gates)
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
   [ Read Tool (Safe) ]      [ Write Tool (Mutating) ]
   (Return Data to Model)     (Approval Gate -> Command Engine)
```

---

## 2. Model Routing & Cost Control Strategy (Section 6 & 23)

- **Fast / Lightweight Tier:** Used for intent parsing, ticket categorization, and WhatsApp greeting responses.
- **Reasoning Tier:** Used for complex optical degradation diagnostics, reverse fiber break localization, and multi-factor network troubleshooting.
- **Circuit Breakers & Quotas:** Tracks token usage per tenant with hard spending limits to prevent runaway operational costs.
