# AI ISP OS — Part 2.4 Path Tracing & Optical Budget Calculation Engine

**Document Version:** 1.0  
**Specification:** Part 2.4 — Fiber GIS & Network Mapping Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Deterministic Graph Traversal Algorithm (Section 10)

The path tracing engine operates on explicit parent/child adjacency pointers rather than geometric proximity:
1. Lookup Subscriber $\to$ Extract assigned `FAT Box` & `Drop Port`.
2. Traverse upstream via `upstreamNodeId` pointer to locate the connected `Splitter Node`.
3. Traverse upstream through `Joint Closures` and `Feeder Cables` until the `Central Office OLT` is reached.
4. Return an ordered array of physical nodes, edge spans, and cumulative distance in meters.

---

## 2. Optical Budget Attenuation Model (Section 13)

The theoretical path attenuation is calculated via the standard telecommunications formula:

$$\text{Loss}_{\text{theoretical}} = (d_{\text{km}} \times \alpha_{\text{cable}}) + (N_{\text{splices}} \times L_{\text{splice}}) + (N_{\text{connectors}} \times L_{\text{conn}}) + L_{\text{splitter}} + M_{\text{safety}}$$

- $\alpha_{\text{cable}} = 0.35\text{ dB/km}$ (at 1310 nm) / $0.22\text{ dB/km}$ (at 1490/1550 nm)
- $L_{\text{splice}} = 0.05\text{ dB}$ per fusion splice
- $L_{\text{connector}} = 0.25\text{ dB}$ per SC/APC connector
- $L_{\text{splitter}} = 3.5\text{ dB}$ (1:2), $7.2\text{ dB}$ (1:4), $10.5\text{ dB}$ (1:8), $13.8\text{ dB}$ (1:16), $17.0\text{ dB}$ (1:32)
- $M_{\text{safety}} = 1.5\text{ dB}$ engineering margin.
