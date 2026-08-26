# AI ISP OS — Part 3.3 Subscription Architecture & Catalog Versioning

**Document Version:** 1.0  
**Specification:** Part 3.3 — Customer Lifecycle & Business Operations  
**Date:** 2026-08-23  

---

## 1. Service Catalog & Plan Immutability (Section 7 & 8)

- **Service Plan Catalog:** Defines download/upload bandwidth profiles (e.g. `200 Mbps Fiber`), billing intervals (`MONTHLY`, `QUARTERLY`, `ANNUAL`), base recurring fees, setup charges, and tax codes.
- **Price Versioning:** When an ISP operator updates catalog pricing, existing subscriptions retain their bound `pricingSnapshot` to guarantee historical invoice reproducibility.

---

## 2. Subscription Lifecycle (Section 9)

A `Subscription` links a `Customer` to a `ServicePlan`, tracking:
- `billingCycle`: `MONTHLY` | `QUARTERLY` | `ANNUAL`
- `currentPeriodStart` & `currentPeriodEnd`
- `monthlyFee`: Fixed base rate
- `status`: `ACTIVE` | `SUSPENDED` | `CANCELLED`
- `nextBillingDate`: UTC ISO-8601 target for recurring invoice generation.
