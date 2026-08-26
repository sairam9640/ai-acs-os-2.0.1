# TR-369 / USP Data Model Mapping & Technical Reference

This document provides the authoritative TR-369 User Services Platform (USP) / TR-181 Device:2 data model paths supported by AI ISP OS.

---

## 1. Terminology Standard

- **TR-069**: CWMP Parameter Path (e.g. `InternetGatewayDevice.WANDevice.1...`)
- **TR-369**: USP / TR-181 Data Model Path (e.g. `Device.Optical.Interface.1...`)
- **SNMP**: Object Identifier / OID (e.g. `1.3.6.1.4.1...`)

---

## 2. TR-181 Device:2 Normalization Matrix

| Normalized Field | TR-369 / TR-181 Data Model Path | Vendor / Model Tested | Read/Write | Unit | Raw Example | Normalized Value | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **manufacturer** | `Device.DeviceInfo.Manufacturer` | Nokia, Generic | Read-Only | string | `"Nokia"` | `"Nokia"` | **CODE VERIFIED** |
| **modelName** | `Device.DeviceInfo.ModelName` | Nokia, Generic | Read-Only | string | `"XS-2426G-A"` | `"XS-2426G-A"` | **CODE VERIFIED** |
| **serialNumber** | `Device.DeviceInfo.SerialNumber` | Nokia, Generic | Read-Only | string | `"998877665544"` | `"998877665544"` | **CODE VERIFIED** |
| **hardwareVersion**| `Device.DeviceInfo.HardwareVersion`| Nokia, Generic | Read-Only | string | `"3FE49344AAAA"` | `"3FE49344AAAA"` | **CODE VERIFIED** |
| **softwareVersion**| `Device.DeviceInfo.SoftwareVersion`| Nokia, Generic | Read-Only | string | `"3FE49344IJHK12"` | `"3FE49344IJHK12"` | **CODE VERIFIED** |
| **macAddress** | `Device.Ethernet.Interface.1.MACAddress`| Nokia, Generic | Read-Only | MAC | `"00:E0:CA:99:88:77"` | `"00:E0:CA:99:88:77"` | **CODE VERIFIED** |
| **rxOpticalPower** | `Device.Optical.Interface.1.RxPower` | Nokia, Generic | Read-Only | dBm | `"-20.5"` | **`-20.5 dBm`** | **CODE VERIFIED** |
| **txOpticalPower** | `Device.Optical.Interface.1.TxPower` | Nokia, Generic | Read-Only | dBm | `"2.5"` | **`+2.5 dBm`** | **CODE VERIFIED** |
| **biasCurrent** | `Device.Optical.Interface.1.TxBiasCurrent`| Nokia, Generic | Read-Only | mA | `"13.2"` | **`13.2 mA`** | **CODE VERIFIED** |
| **opticalVoltage** | `Device.Optical.Interface.1.Voltage` | Nokia, Generic | Read-Only | V | `"3.3"` | **`3.3 V`** | **CODE VERIFIED** |
| **temperature** | `Device.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Value` | Nokia, Generic | Read-Only | °C | `"43"` | **`43.0 °C`** | **CODE VERIFIED** |
| **cpuUsagePercent**| `Device.DeviceInfo.ProcessStatus.CPUUsage` | Nokia, Generic | Read-Only | % | `"15"` | **`15%`** | **CODE VERIFIED** |
| **wifi24Ssid** | `Device.WiFi.SSID.1.SSID` | Nokia, Generic | **Read / Write** | string | `"Nokia-USP-2.4G"` | `"Nokia-USP-2.4G"` | **CODE VERIFIED** |
| **wifi24Channel** | `Device.WiFi.Radio.1.Channel` | Nokia, Generic | **Read / Write** | integer | `1` | `1` | **CODE VERIFIED** |
| **wifi5gSsid** | `Device.WiFi.SSID.2.SSID` | Nokia, Generic | **Read / Write** | string | `"Nokia-USP-5G"` | `"Nokia-USP-5G"` | **CODE VERIFIED** |
| **wifi5gChannel** | `Device.WiFi.Radio.2.Channel` | Nokia, Generic | **Read / Write** | integer | `36` | `36` | **CODE VERIFIED** |
| **wanIp** | `Device.IP.Interface.1.IPv4Address.1.IPAddress` | Nokia, Generic | Read-Only | IPv4 | `"100.64.40.10"` | `"100.64.40.10"` | **CODE VERIFIED** |
| **pppoeUsername** | `Device.PPP.Interface.1.Username` | Nokia, Generic | **Read / Write** | string | `"nokia_user@usptest"` | `"nokia_user@usptest"` | **CODE VERIFIED** |
| **vlanId** | `Device.Ethernet.VLANTermination.1.VLANID` | Nokia, Generic | **Read / Write** | integer | `150` | `150` | **CODE VERIFIED** |
| **lanHostCount** | `Device.Hosts.HostNumberOfEntries` | Nokia, Generic | Read-Only | count | `4` | `4` | **CODE VERIFIED** |

---

## 3. Physical Reality Classification

- **TR-069 Physical Fleet**: `LIVE VERIFIED` (HGU RH821GWV-DG `44953BC5ECC0` & Genexis ONTs actively sending periodic Informs on Port 7547).
- **TR-369 / USP Controller**: `TR-369 IMPLEMENTED — NOT PHYSICALLY VERIFIED` (Full Controller, Agent Session, MTP message processing, and 2-Phase Set/Get verification implemented in `UspService.ts` and passing 100% automated test suite).
