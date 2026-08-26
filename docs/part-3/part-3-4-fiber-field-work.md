# AI ISP OS — Part 3.4 Fiber Field Work & Splicing Workflows

**Document Version:** 1.0  
**Specification:** Part 3.4 — Field Operations & Work Orders  
**Date:** 2026-08-23  

---

## 1. Physical Splicing & Topology Updates (Section 42 & 43)

Field fiber repairs (e.g. at splice enclosure or FAT box) update the backend topology state:
1. Field technician completes fusion splice $\to$ records splice loss ($\le 0.1\text{ dB}$).
2. Topology service re-runs optical budget trace $\to$ verifies that downstream customer ONTs recover.
3. Incident correlation engine automatically resolves associated network alarm upon recovery.
