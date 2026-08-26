# AI ISP OS — Part 2.4 Reverse Impact & Customer Outage Calculation Engine

**Document Version:** 1.0  
**Specification:** Part 2.4 — Fiber GIS & Network Mapping Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Downstream Impact Tree Traversal (Section 11 & 14)

When a physical fiber element experiences an outage (e.g. backhoe cable cut, damaged joint enclosure, failed optical splitter):
1. **Target Identification:** Receive suspect node or cable segment ID.
2. **Recursive Traversal:** Query all child nodes where `upstreamNodeId` matches the suspect node or downstream descendants.
3. **Subscriber & Service Resolution:** Find all `Customer` records whose `fiberDropInfo.fatBoxNodeId` is included in the affected node set.
4. **Output Metrics:**
   - Total affected subscriber count
   - Total affected active services
   - Total affected CPE ONTs
   - VIP / Enterprise customer impact flags.
