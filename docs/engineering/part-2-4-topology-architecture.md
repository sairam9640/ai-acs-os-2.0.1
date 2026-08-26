# AI ISP OS — Part 2.4 Physical Fiber Topology & Graph Model

**Document Version:** 1.0  
**Specification:** Part 2.4 — Fiber GIS & Network Mapping Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Physical Graph Object Hierarchy (Section 3 & 4)

```
[ Central Office OLT Chassis ]
              │
              ▼ (PON Port 0/1)
   [ Feeder Fiber Cable ] (48/96 Cores)
              │
              ▼
   [ Joint / Splice Closure ] (Tray Splice Mapping)
              │
              ▼
[ Primary Optical Splitter (1:8) ] (Insertion Loss: ~10.5 dB)
              │
              ▼ (Distribution Cable - 12/24 Cores)
 [ FAT / NAP Pole Terminal Box ] (16 Drop Ports)
              │
              ▼ (2-Core Drop Cable: 30-100m)
  [ Customer Premise ONT Endpoint ]
```

---

## 2. Core-Level Mapping & State Machine (Section 5)

Every modeled fiber cable maintains an array of numbered and color-coded cores (`1: Blue`, `2: Orange`, `3: Green`, `4: Brown`, etc.):
- `FREE`: Available for new subscriber drop assignment.
- `RESERVED`: Allocated for planned installation or expansion.
- `ACTIVE`: Transmitting live optical signal mapped to an active subscriber ONT.
- `FAULTY`: High attenuation or physical break detected by OTDR.
- `DARK`: Unlit spare core reserved for carrier backhaul.
- `UNKNOWN`: Unverified field status.
