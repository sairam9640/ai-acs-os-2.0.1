# AI ISP OS — Part 2.4 Incident Correlation & OTDR Break Localization

**Document Version:** 1.0  
**Specification:** Part 2.4 — Fiber GIS & Network Mapping Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Automated Fiber Break Localization (Section 15)

When multiple ONTs on a shared branch report loss of signal (LOS) or sudden drop ($> 6.0$ dB attenuation):
1. **Lowest Common Ancestor (LCA) Search:** Find the common parent node shared by all failing ONTs that is NOT shared by healthy ONTs.
2. **Confidence Scoring:**
   - Single ONT down $\to$ Drop wire or CPE power issue (`Confidence: LOW`)
   - All 8 outputs of a 1:8 Splitter down $\to$ Splitter input feeder fault (`Confidence: HIGH`)
   - Multiple splitters on the same distribution cable down $\to$ Feeder cable cut (`Confidence: CRITICAL`).

---

## 2. OTDR Distance Projection & Map Pinning (Section 16)

When an Optical Time-Domain Reflectometer (OTDR) pulse test returns a break distance (e.g. $d = 2,450\text{ meters}$ from Central Office):
- The engine computes distance along the modeled cable vector path.
- Marks a suggested fault location with an uncertainty radius ($R = \pm 25\text{ meters}$).
- Highlights the nearest modeled access points (manholes, poles, joint chambers) to direct field splicing crews.
