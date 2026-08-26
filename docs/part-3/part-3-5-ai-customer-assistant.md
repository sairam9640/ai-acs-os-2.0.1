# AI ISP OS — Part 3.5 Customer AI Assistant & Conversational Support

**Document Version:** 1.0  
**Specification:** Part 3.5 — Customer Self-Service & Omnichannel Support  
**Date:** 2026-08-23  

---

## 1. Grounded Conversational Support (Section 32 & 34)

The Customer AI Assistant operates with tight context grounding:
- **Tenant & Customer Scoping:** Restricts queries exclusively to the authenticated subscriber's own broadband plan, ONT status, and billing ledger.
- **Deterministic Diagnostics:** Dispatches safe Ping checks and retrieves live RX optical dBm to give factual, non-hallucinated explanations.
- **Financial Safety:** Never hallucinates balances or issues refunds independently; always fetches real invoice totals from `BillingEngineService`.
