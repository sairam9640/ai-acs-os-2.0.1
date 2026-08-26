# AI ISP OS — Part 2.5 Agent Architecture & Stop Conditions

**Document Version:** 1.0  
**Specification:** Part 2.5 — AI + Automation Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Controlled Agent Execution Loop (Section 45 & 46)

```
[ Trigger / User Prompt ]
            │
            ▼
[ Observe & Retrieve Evidence ]
            │
            ▼
[ Reason & Formulate Plan ]
            │
            ▼
[ Risk Evaluation & Policy Gate ]
            │
    ┌───────┴───────┐
    ▼ (Safe)        ▼ (High Risk)
[ Execute Tool ] [ Request Human Approval ]
    │               │
    └───────┬───────┘
            ▼
[ Post-Action Verification ]
            │
            ▼
[ Evaluate Stop Conditions ] ──► (Goal Met? Max Steps? Budget?) ──► [ Complete ]
```

---

## 2. Mandatory Stop Conditions (Section 47)

Agents immediately stop execution when:
1. Goal is achieved and verified through readback.
2. Step count exceeds `max_steps` (default: 5).
3. Execution time exceeds timeout (default: 30s).
4. Budget/token quota is exhausted.
5. High-risk approval request is rejected or expires.
