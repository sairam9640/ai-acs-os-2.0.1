# TR-069 Parameter and OID Mapping Reference

This document defines the authoritative TR-069 (TR-098 and TR-181) parameter resolution paths used by the AI ISP OS CWMP engine for auto-discovery and normalization across GPON/EPON ONT vendors.

---

## 1. Multi-Vendor Normalization Table

| Normalized Field | Protocol | Actual Parameter Paths | Vendor / Model | Access | Unit / Conversion | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **rxOpticalPower** | TR-069 | `InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalRxPower`<br>`InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.RxPower`<br>`InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.RXPower`<br>`InternetGatewayDevice.WANDevice.1.X_NOKIA_OpticalInfo.RxPower`<br>`InternetGatewayDevice.X_CMCC_ONU_SFP.RxPower`<br>`InternetGatewayDevice.WANDevice.1.X_TPLINK_OptInfo.RxPower`<br>`InternetGatewayDevice.WANDevice.1.X_ALU_COM_OntOpticalInfo.ReceivePower`<br>`InternetGatewayDevice.WANDevice.1.X_ECONET_COM_GponIf.RxPower`<br>`InternetGatewayDevice.WANDevice.1.X_REALTEK_OptInfo.RxPower`<br>`Device.Optical.Interface.1.RxPower` | HGU, Huawei, ZTE, Nokia, TP-Link, Genexis, Syrotech, Realtek | Read-Only | dBm (converted from 0.01 dBm or 0.1 uW if integer > 100) | Authoritative optical signal reading |
| **txOpticalPower** | TR-069 | `InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalTxPower`<br>`InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.TxPower`<br>`InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXPower`<br>`InternetGatewayDevice.WANDevice.1.X_NOKIA_OpticalInfo.TxPower`<br>`InternetGatewayDevice.X_CMCC_ONU_SFP.TxPower`<br>`InternetGatewayDevice.WANDevice.1.X_TPLINK_OptInfo.TxPower`<br>`InternetGatewayDevice.WANDevice.1.X_ALU_COM_OntOpticalInfo.TransmitPower`<br>`InternetGatewayDevice.WANDevice.1.X_ECONET_COM_GponIf.TxPower`<br>`InternetGatewayDevice.WANDevice.1.X_REALTEK_OptInfo.TxPower`<br>`Device.Optical.Interface.1.TxPower` | Multi-Vendor | Read-Only | dBm | SFP transmit optical power |
| **biasCurrent** | TR-069 | `InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalBiasCurrent`<br>`InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.BiasCurrent`<br>`InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TXBiasCurrent`<br>`InternetGatewayDevice.X_CMCC_ONU_SFP.BiasCurrent`<br>`InternetGatewayDevice.WANDevice.1.X_TPLINK_OptInfo.BiasCurrent`<br>`Device.Optical.Interface.1.TxBiasCurrent` | Multi-Vendor | Read-Only | mA (converted if > 1000 uA) | Optical laser bias current |
| **opticalVoltage** | TR-069 | `InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.OpticalVoltage`<br>`InternetGatewayDevice.DeviceInfo.X_HW_GPON.OpticalModuleInformation.Voltage`<br>`InternetGatewayDevice.X_CMCC_ONU_SFP.Voltage`<br>`InternetGatewayDevice.WANDevice.1.X_TPLINK_OptInfo.Voltage`<br>`Device.Optical.Interface.1.Voltage` | Multi-Vendor | Read-Only | V (converted if in mV) | SFP / BOSA supply voltage |
| **temperature** | TR-069 | `Device.DeviceInfo.TemperatureStatus.TemperatureSensor.1.Value`<br>`InternetGatewayDevice.DeviceInfo.X_HW_BoardTemp`<br>`InternetGatewayDevice.DeviceInfo.X_ZTE-COM_BoardTemperature`<br>`InternetGatewayDevice.DeviceInfo.X_TPLINK_BoardTemperature`<br>`InternetGatewayDevice.WANDevice.1.X_HW_DEBUG.SMP.ONT.Temperature`<br>`Device.Optical.Interface.1.Temperature` | Multi-Vendor | Read-Only | °C (converted if > 200 m°C) | Transceiver & board temperature |
| **wanIp** | TR-069 | `Device.IP.Interface.1.IPv4Address.1.IPAddress`<br>`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress`<br>`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress`<br>`Device.PPP.Interface.1.IPCPLocalIPAddress` | Standard TR-098/TR-181 | Read-Only | IPv4 string | WAN / PPPoE IP address |
| **pppoeUsername** | TR-069 | `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username`<br>`Device.PPP.Interface.1.Username` | Standard TR-098/TR-181 | Read / Write | String | Subscriber PPPoE identity |
| **vlanId** | TR-069 | `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_HW_VLAN`<br>`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_ZTE-COM_VLAN`<br>`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.X_TPLINK_VlanID`<br>`Device.Ethernet.VLANTermination.1.VLANID` | Multi-Vendor | Read / Write | Integer (1–4094) | WAN 802.1Q VLAN Tag |
| **wifi24Ssid** | TR-069 | `InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID`<br>`Device.WiFi.SSID.1.SSID` | Standard | Read / Write | String (1–32 chars) | 2.4 GHz Primary SSID |
| **wifi5gSsid** | TR-069 | `InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID`<br>`InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID`<br>`Device.WiFi.SSID.2.SSID` | Standard | Read / Write | String (1–32 chars) | 5.0 GHz Primary SSID |
| **lanHostCount** | TR-069 | `InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries`<br>`Device.Hosts.HostNumberOfEntries` | Standard | Read-Only | Integer | Active DHCP/LAN clients |

---

## 2. Inbound Subdomain Tenant Matching

1. **Host Header Inspection**: `*.ciniplay.in:7547` -> extracts tenant slug (e.g. `vgigafiber.ciniplay.in` -> `vgigafiber`).
2. **Explicit Path Parameter**: `/cwmp/:tenantSlug`, `/inform/:tenantSlug`, `/tr069/:tenantSlug`.
3. **Query Parameter**: `?tenant=:slug` or `?slug=:slug`.
4. **Fallback**: Root domain `ciniplay.in:7547` -> primary ISP tenant (`RUDR4 FIBERNET` / `rudra` / `g`).
