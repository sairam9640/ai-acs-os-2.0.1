# AI ISP OS — Part 2.4 GIS Spatial Architecture & Layering

**Document Version:** 1.0  
**Specification:** Part 2.4 — Fiber GIS & Network Mapping Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Spatial Vector Layers (Section 7)

The spatial canvas organizes infrastructure into isolated vector layers rendered over a base map:
1. `sites`: Central Offices, POP Data Centers, Towers.
2. `feeder_cables`: High-capacity backbone fiber spans (48–288 cores).
3. `distribution_cables`: Secondary distribution loops (12–48 cores).
4. `drop_cables`: Subscriber last-mile drop wires (2–4 cores).
5. `joint_closures`: Manholes, chambers, underground splice enclosures.
6. `fat_boxes`: Pole/wall-mounted Fiber Access Terminals.
7. `splitters`: Optical splitters (1:4, 1:8, 1:16, 1:32).
8. `subscribers`: Customer premise geo-pins with active service status.
9. `incidents`: Active fiber cuts and suspect outage polygons.
10. `technicians`: Live GPS positions of field technicians.
