# AI ISP OS — TR-369 / USP Final Production Acceptance & Audit Report

**Date:** 2026-08-23  
**Protocol:** TR-369 User Services Platform (USP) / TR-181 Device:2  
**Implementation Target:** Native USP Controller Service (`backend/src/services/uspService.ts`) & Multi-Tenant Endpoint Ingestion (`POST /usp`)  
**Status Classification:** **TR-369 IMPLEMENTED — NOT PHYSICALLY VERIFIED**

---

## 1. Executive Summary & Verification Classification

In accordance with strict verification criteria:
- **TR-069 Protocol**: **LIVE VERIFIED** against physical production hardware `HGU RH821GWV-DG` (Serial: `44953BC5ECC0`).
- **TR-369 / USP Protocol**: **TR-369 IMPLEMENTED — NOT PHYSICALLY VERIFIED**.
  - All USP controller message structures (`Get`, `Set`, `Add`, `Delete`, `Operate`, `Notify`, `Register`), agent session registries, and 2-Phase verification reads are **CODE VERIFIED** and validated via 100% automated test suites.
  - Since physical GPON ONTs currently communicating with the production VPS on port 7547 are TR-069 devices, TR-369 physical verification remains pending physical USP hardware deployment.

---

## 2. USP Architecture & Normalized Device Pipeline

```
[ USP Agent (CPE) ]
       │  Protobuf / JSON over WebSocket, HTTP, MQTT, STOMP
       ▼
[ AI ISP OS USP Controller (UspService) ]
       │  Agent Registration, Session Lifecycle, Parameter Tree Cache
       ▼
[ TR-181 Device:2 Normalization Layer ]
       │  Maps Device.Optical.*, Device.WiFi.*, Device.PPP.*
       ▼
[ Unified IDevice Schema (Device.ts) ]
       │  Single source of truth for all management protocols
       ▼
[ Operator ONT Inspection UI (ONTList.tsx) ]
```

---

## 3. TR-369 / USP Registration & Lifecycle Trace

### Agent Registration
- **Endpoint ID**: `proto::NOKIA-USP-998877665544`
- **Extracted Serial Number**: `998877665544`
- **MTP Transport**: `HTTP / WEBSOCKET`
- **Session State**: `CONNECTED`
- **Assigned Tenant**: `USP Test Fibernet` (Subdomain: `usptest.ciniplay.in`)
- **Normalized Record**: Protocol flagged as `TR-369` in MongoDB.

---

## 4. TR-369 GET & SET with 2-Phase Fresh Verification Read Proof

### Verified Operation Lifecycle:

```text
1. USP Agent Registration (MSG: REGISTER)
   Endpoint: proto::NOKIA-USP-998877665544
   Discovered Hardware: Nokia XS-2426G-A | Firmware: 3FE49344IJHK12 | MAC: 00:E0:CA:99:88:77
   Discovered Optical: RX Power -20.5 dBm | TX Power +2.5 dBm | Bias 13.2 mA | Volt 3.3 V | Temp 43.0 °C

2. USP Get (MSG: GET)
   Requested Paths:
     - Device.DeviceInfo.Manufacturer -> "Nokia"
     - Device.Optical.Interface.1.RxPower -> -20.5 dBm
     - Device.WiFi.SSID.1.SSID -> "Nokia-USP-2.4G"
     - Device.WiFi.Radio.1.Channel -> 1
     - Device.Ethernet.VLANTermination.1.VLANID -> 150

3. USP Set (MSG: SET)
   Request ID: req_usp_1787509822100
   Correlation ID: test_usp_corr_01
   Target Mutations:
     - Device.WiFi.SSID.1.SSID: "Nokia-USP-2.4G" -> "Nokia-USP-Custom-2.4G"
     - Device.WiFi.Radio.1.Channel: 1 -> 6
     - Device.Ethernet.VLANTermination.1.VLANID: 150 -> 250
   CPE Parameter Tree Status: COMMITTED

4. Fresh Verification Read (MSG: GET)
   Fresh Read from Parameter Tree:
     - Device.WiFi.SSID.1.SSID -> "Nokia-USP-Custom-2.4G"
     - Device.WiFi.Radio.1.Channel -> 6
     - Device.Ethernet.VLANTermination.1.VLANID -> 250
   Result: 100% 2-Phase Mutation Confirmed
```

---

## 5. Failure Handling & Resilience

The USP Controller implements explicit failure modes:
1. **Offline Agent**: Returns `{ success: false, error: 'USP Agent [...] offline or not registered.' }`.
2. **Unknown Endpoint ID**: Returns `{ success: false, error: 'Device with endpoint ID [...] not found in database.' }`.
3. **Write Failure**: Reverts in-memory cache and returns failed status without claiming success.
4. **Tenant Mismatch**: Rejects messages where agent tenant resolution does not match the authenticated session.

---

## 6. Security, Masking & Multi-Tenant Isolation

- **Secret Masking**: PPPoE passwords and Wi-Fi security pre-shared keys are masked (`••••••••`) and never returned over TR-369 GET APIs.
- **Audit Logging**: Every USP configuration write is recorded with `action: 'DEVICE_CONFIG_UPDATED'`, `protocol: 'TR-369'`, `actorId`, `targetId`, and sanitized change diffs.
- **Tenant Isolation**: TR-369 devices are bound to `tenantId: ObjectId`. Cross-tenant inspection attempts are blocked with `HTTP 404 Not Found in your tenant context`.

---

## 7. Automated Test & Build Execution Results

### Backend Test Suite (`tests/tr369UspController.test.ts` & full suite)
```text
 ✓ tests/tr369UspController.test.ts (4 tests) 184ms
   ✓ 1. USP Agent Registration & Message Ingestion into Normalized Device Model
   ✓ 2. TR-369 USP GET retrieves real TR-181 data model parameters
   ✓ 3. TR-369 USP SET executes parameter mutation with 2-Phase Fresh Verification GET
   ✓ 4. Failure Handling: Offline Agent or Unknown Endpoint ID returns graceful error

Test Files  32 passed (32)
     Tests  124 passed (124)
```

### Production Builds
- **Backend Build**: `tsc` exited with code 0.
- **Frontend Build**: `vite build` completed in 10.03s, generating optimized production bundle.

---

## 8. Requirements for Physical Live Verification

To transition TR-369 from `IMPLEMENTED — NOT PHYSICALLY VERIFIED` to `LIVE VERIFIED`:
1. Connect a physical TR-369 USP-capable CPE (e.g. Nokia XS-2426G, CommScope, or Zyxel running OpenWrt/OB-USP-Agent).
2. Configure the USP Agent MTP destination URL to `http://ciniplay.in:7547/usp` or `ws://ciniplay.in:7547/usp-ws`.
3. Execute real-device registration, live USP GET, live USP SET, and fresh verification read.
