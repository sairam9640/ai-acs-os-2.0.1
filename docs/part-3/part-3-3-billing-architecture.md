# AI ISP OS — Part 3.3 Deterministic Billing Engine & Invoices

**Document Version:** 1.0  
**Specification:** Part 3.3 — Customer Lifecycle & Business Operations  
**Date:** 2026-08-23  

---

## 1. Deterministic Invoice Generation (Section 13 & 15)

Invoices are generated idempotently per customer billing period:

$$\text{Subtotal} = \sum (\text{LineItem.quantity} \times \text{LineItem.unitPrice}) - \text{Discount}$$
$$\text{Tax Amount} = \text{Subtotal} \times \text{TaxRate}$$
$$\text{Total Payable} = \text{Subtotal} + \text{Tax Amount} - \text{Credits Applied}$$

- **Invoice States:** `DRAFT` $\to$ `ISSUED` $\to$ `DUE` $\to$ `PAID` (or `OVERDUE`, `VOID`, `CANCELLED`).
- **Immutable Snapshots:** Line items preserve plan name, speed, bandwidth limits, discounts, and applied tax percentages.
