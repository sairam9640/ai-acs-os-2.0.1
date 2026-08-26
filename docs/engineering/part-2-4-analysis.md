# AI ISP OS — Part 2.4 Fiber GIS & Topology Engineering Analysis

**Document Version:** 1.0  
**Specification:** Part 2.4 — Fiber GIS & Network Mapping Implementation Specification (Physical Fiber Topology, Optical Monitoring, Fault Localization and Impact Analysis)  
**Parent Baseline:** Part 1 (Documents 01–06), Part 2.1 (Data), Part 2.2 (Backend), Part 2.3 (Network)  
**Date:** 2026-08-23  

---

## 1. Executive Summary & Fiber Topology Engineering Scope

Part 2.4 specifies the **deterministic graph topology engine, core-level fiber mapping, optical budget attenuation modeling, automated fiber break localization with OTDR distance projection, downstream reverse impact analysis, and topology validation with data quality scoring** for AI ISP OS.

### Key Engineering Capabilities:
1. **Core-Level Physical Object Hierarchy (Section 3 & 5):** Models every cable span down to color-coded optical cores (`FREE`, `RESERVED`, `ACTIVE`, `FAULTY`, `DARK`), tray splices, termination ports, directional splitters (1:8/1:16), and pole FAT/NAP boxes.
2. **Deterministic Ordered Path Tracing (Section 10):** Traverses explicit graph edges from Customer Endpoint $\to$ FAT Box $\to$ Splitter $\to$ Joint Closures $\to$ OLT with cumulative distance calculation.
3. **Reverse Impact & Customer Outage Calculation (Section 11 & 14):** Traverses all downstream branches from a suspect cable, splitter, or PON port to compute affected ONTs, services, and subscriber accounts.
4. **Optical Budget Attenuation Modeling (Section 13):** Computes estimated theoretical path loss ($\text{Loss} = d \cdot \alpha + \text{Splices} + \text{Splitters}$) and compares against observed ONT telemetry.
5. **Fiber Break Localization & OTDR Distance Projection (Section 15 & 16):** Correlates simultaneous downstream ONT signal loss to isolate the smallest common upstream segment, project OTDR distance along the physical cable path, and mark fault candidates with uncertainty radii.
6. **Topology Validation & Data Quality Scoring (Section 24 & 25):** Detects orphan nodes, dangling ports, cycles, and invalid splitter directions, calculating a transparent 0–100 Data Quality Score.
