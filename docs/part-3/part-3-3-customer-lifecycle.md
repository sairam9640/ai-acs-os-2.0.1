# AI ISP OS — Part 3.3 Customer Master Lifecycle & State Machine

**Document Version:** 1.0  
**Specification:** Part 3.3 — Customer Lifecycle & Business Operations  
**Date:** 2026-08-23  

---

## 1. Canonical Customer Lifecycle (Section 5)

```mermaid
stateDiagram-v2
    [*] --> PROSPECT: Online Enquiry / Lead
    PROSPECT --> ONBOARDING: KYC & Address Geocoding
    ONBOARDING --> ACTIVE: Plan Subscribed & ONT Provisioned
    ACTIVE --> SUSPENDED: Non-Payment / Policy Violation
    SUSPENDED --> ACTIVE: Invoice Settled (Auto Reactivation)
    ACTIVE --> DISCONNECTED: Customer Cancellation Request
    SUSPENDED --> DISCONNECTED: Prolonged Non-Payment (> 60 Days)
    DISCONNECTED --> CLOSED: Final Invoice Cleared & ONT Recovered
    CLOSED --> [*]
```

---

## 2. Customer Master Record (Section 4)

A single authoritative `Customer` document models subscriber identity, address geocodes, assigned ONT hardware, physical fiber drop FAT ports, active subscription plan, and billing profile. No duplicate customer records exist across billing, network, support, or AI domains.
