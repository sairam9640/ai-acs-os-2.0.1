# AI ISP OS — Part 3.4 Field Operations & Evidence Verification

**Document Version:** 1.0  
**Specification:** Part 3.4 — Field Operations & Work Orders  
**Date:** 2026-08-23  

---

## 1. Field Verification Gate (Section 28 & 46)

A work order cannot transition to `COMPLETED` without passing the automated verification gate:
1. **Optical Power Verification:** RX power must fall within safe range ($-14.0\text{ dBm}$ to $-26.0\text{ dBm}$).
2. **Speedtest & Latency Check:** Packet loss must be $< 1\%$, ping latency $< 30\text{ ms}$.
3. **Photographic Evidence:** FAT termination photo and customer premises ONT installation photo attached.
4. **Customer Digital Sign-off:** Stored timestamped confirmation hash.
