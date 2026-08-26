# AI ISP OS — Part 2.3 Optical Telemetry & Alert Deduplication

**Document Version:** 1.0  
**Specification:** Part 2.3 — Network Management Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Optical Power Normalization & Rolling Baselines (Section 16 & 27)

Optical RX power received from diverse OLT/ONT vendors is normalized into standard **dBm** ($P_{dBm} = 10 \cdot \log_{10}(P_{mW})$).

### Rolling Baseline Anomaly Engine:
- **Baseline Average:** Calculated over a 14-day moving window ($\mu_{baseline}$).
- **Normal Variance ($\le 1.5$ dB):** Typical fiber dispersion/temperature fluctuation $\to$ Status `OPTIMAL` (No alert).
- **Gradual Degradation ($> -27.0$ dBm):** Micro-bending or dirty splice connector $\to$ Warning Alert generated.
- **Sudden Drop ($> 6.0$ dB delta in $< 5$ min):** Macro-bend, fiber pinch, or cable tension $\to$ Critical Incident candidate.
- **Alert Debouncing:** Flapping signals are debounced with a 15-minute hysteresis cooldown window.
