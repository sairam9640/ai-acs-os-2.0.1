# AI ISP OS — Part 2.3 Diagnostics Framework Specification

**Document Version:** 1.0  
**Specification:** Part 2.3 — Network Management Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Structured Diagnostics Architecture (Section 13 & 31)

Diagnostics are executed as asynchronous jobs through the `DiagnosticsService` and produce normalized JSON responses:

| Diagnostic Type | Parameters | Normalized Result Payload |
|---|---|---|
| **Ping** | `host`, `count`, `timeoutMs` | `{ success: boolean, packetsSent, packetsReceived, packetLossPercent, minRttMs, avgRttMs, maxRttMs }` |
| **Traceroute** | `host`, `maxHops` | `{ hops: Array<{ hopNumber, ip, rttMs, hostname }> }` |
| **DNS Lookup** | `domain`, `dnsServer` | `{ resolvedIps: string[], responseTimeMs: number }` |
| **Speedtest** | `serverUrl`, `durationSeconds` | `{ downloadMbps, uploadMbps, latencyMs, jitterMs }` |
| **Optical Read** | None | `{ rxPowerDbm, txPowerDbm, temperatureC, supplyVoltageV, biasCurrentMa }` |
| **Wi-Fi Survey** | `band` (`2.4G` / `5G`) | `{ channel, channelUtilizationPercent, noiseDbm, neighboringSsidsCount }` |
