# AI ISP OS — Part 2.5 AI Observability & Cost Tracking

**Document Version:** 1.0  
**Specification:** Part 2.5 — AI + Automation Implementation Specification  
**Date:** 2026-08-23  

---

## 1. AI Observability & Cost Metrics (Section 31 & 37)

The AI Gateway emits structured operational metrics:
- `ai_requests_total`: Count of inferences partitioned by model provider and intent.
- `ai_token_usage_total`: Total prompt and completion tokens consumed per tenant.
- `ai_estimated_cost_usd`: Running financial expenditure calculated from token usage.
- `ai_tool_executions_total`: Count of tool invocations partitioned by tool name and risk tier.
- `ai_approval_requests_total`: Total approval requests generated and human review outcome.
