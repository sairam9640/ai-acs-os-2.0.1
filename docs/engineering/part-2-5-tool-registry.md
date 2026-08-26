# AI ISP OS — Part 2.5 AI Tool Registry & Risk-Tiered Policy

**Document Version:** 1.0  
**Specification:** Part 2.5 — AI + Automation Implementation Specification  
**Date:** 2026-08-23  

---

## 1. Tool Registry & Schema Declarations (Section 8 & 11)

Every tool callable by AI models is registered with strict typing, permissions, and risk tiers:

| Tool Name | Type | Risk Tier | Required Permission | Requires Approval |
|---|---|---|---|---|
| `get_customer_360` | READ | LOW | `customer.read` | No |
| `get_device_telemetry` | READ | LOW | `device.read` | No |
| `run_ping_diagnostic` | READ/ACTION | LOW | `device.diagnostics` | No |
| `trace_fiber_route` | READ | LOW | `fiber.read` | No |
| `update_wifi_config` | WRITE | MEDIUM | `device.wifi.write` | No (UI confirmation) |
| `reboot_device` | WRITE | HIGH | `device.reboot` | Yes (if policy enabled) |
| `block_connected_device`| WRITE | HIGH | `device.client.block` | Yes |
| `modify_wan_config` | WRITE | HIGH | `device.wan.write` | Yes |
| `firmware_upgrade` | WRITE | CRITICAL | `device.firmware` | Yes (Dual admin) |
| `bulk_network_action` | WRITE | CRITICAL | `network.bulk` | Yes (Dual admin) |
