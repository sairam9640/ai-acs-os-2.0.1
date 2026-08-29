import { Types } from 'mongoose';
import { Device, IDevice } from '../models/Device.js';
import { Customer } from '../models/Customer.js';
import { DeviceCapability, IDeviceCapability } from '../models/DeviceCapability.js';
import { DeviceCommand, CommandActionType, IDeviceCommand } from '../models/DeviceCommand.js';
import { recordAuditLog } from '../middleware/audit.js';
import { triggerGenieAcsConnectionRequest } from './connectionRequestService.js';

export interface CommandDispatchResult {
  commandId: string;
  status: string;
  message: string;
  verified: boolean;
  readBackValues?: any;
}

export class DeviceManagementService {
  /**
   * Retrieves or derives the capability profile for a device
   */
  static async getDeviceCapabilities(device: IDevice): Promise<Partial<IDeviceCapability>> {
    let capability = await DeviceCapability.findOne({
      vendor: new RegExp(`^${device.manufacturer}$`, 'i'),
      modelPattern: new RegExp(device.modelName, 'i'),
    });

    if (!capability) {
      // Default fallback capability profile
      return {
        vendor: device.manufacturer,
        modelPattern: device.modelName,
        displayName: `${device.manufacturer} ${device.modelName}`,
        hardwareType: 'GPON_ONT',
        supportsDualBandWifi: true,
        supportsSingleBandWifi: true,
        supportsWifiPasswordChange: true,
        supportsWifiChannelSelect: true,
        supportsWanProfileEdit: true,
        supportsWanVlanConfig: true,
        supportsConnectedClientList: true,
        supportsConnectedClientBlock: true,
        supportsRemoteReboot: true,
        supportsPingDiagnostics: true,
        supportsTracerouteDiagnostics: true,
        supportsSpeedTest: true,
        supportsOpticalTelemetry: true,
        supportsCpuMemoryTelemetry: true,
        supportsFirmwareUpgrade: true,
        tr069Supported: true,
        tr369Supported: false,
      };
    }

    return capability;
  }

  /**
   * Validates if the device hardware supports the requested action
   */
  static async validateCapability(device: IDevice, action: CommandActionType): Promise<{ allowed: boolean; reason?: string }> {
    const caps = await this.getDeviceCapabilities(device);

    switch (action) {
      case 'SET_WIFI_CONFIG':
        if (!caps.supportsWifiPasswordChange) {
          return { allowed: false, reason: `Device model ${device.modelName} does not support remote Wi-Fi reconfiguration.` };
        }
        break;
      case 'SET_WAN_CONFIG':
        if (!caps.supportsWanProfileEdit) {
          return { allowed: false, reason: `Device model ${device.modelName} does not support remote WAN profile editing.` };
        }
        break;
      case 'BLOCK_CLIENT':
      case 'UNBLOCK_CLIENT':
        if (!caps.supportsConnectedClientBlock) {
          return { allowed: false, reason: `Device model ${device.modelName} does not support client MAC blocking.` };
        }
        break;
      case 'REBOOT_DEVICE':
        if (!caps.supportsRemoteReboot) {
          return { allowed: false, reason: `Device model ${device.modelName} does not support remote reboot.` };
        }
        break;
      case 'FIRMWARE_UPGRADE':
        if (!caps.supportsFirmwareUpgrade) {
          return { allowed: false, reason: `Device model ${device.modelName} does not support remote firmware flashing.` };
        }
        break;
      case 'RUN_DIAGNOSTICS':
        if (!caps.supportsPingDiagnostics && !caps.supportsSpeedTest) {
          return { allowed: false, reason: `Device model ${device.modelName} does not support remote diagnostics.` };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Enqueues an asynchronous command and executes two-phase verification
   */
  static async queueAndExecuteCommand({
    tenantId,
    deviceId,
    action,
    parameters,
    user,
    correlationId,
  }: {
    tenantId: Types.ObjectId | string;
    deviceId: Types.ObjectId | string;
    action: CommandActionType;
    parameters: Record<string, any>;
    user: { id: string; role: string; email: string };
    correlationId: string;
  }): Promise<CommandDispatchResult> {
    const device = await Device.findById(deviceId);
    if (!device) {
      throw new Error(`Device not found with ID ${deviceId}`);
    }

    // Step 1: Capability Validation
    const capCheck = await this.validateCapability(device, action);
    if (!capCheck.allowed) {
      throw new Error(capCheck.reason);
    }

    // Step 2: Capture previous state for rollback / audit
    let previousState: any = null;
    if (action === 'SET_WIFI_CONFIG') {
      previousState = { wifi24: device.wifi24, wifi5g: device.wifi5g };
    } else if (action === 'SET_WAN_CONFIG') {
      previousState = { wanProfiles: device.wanProfiles };
    }

    // Step 3: Build TR-069 Parameter List for physical CPE dispatch.
    // Bug 2 fix: Detect data model from device.rawParameters — never send TR-098 and TR-181 together.
    const rawParamKeys = Object.keys((device as any).rawParameters || {});
    const hasTr181Raw = rawParamKeys.some(k => k.startsWith('Device.'));
    const hasTr098Raw = rawParamKeys.some(k => k.startsWith('InternetGatewayDevice.'));
    // Default to TR-098 unless device exclusively reported TR-181
    const useTr181 = hasTr181Raw && !hasTr098Raw;

    const tr069ParamValues: Array<[string, string, string]> = [];
    if (action === 'SET_WIFI_CONFIG') {
      if (useTr181) {
        // TR-181 only
        if (parameters.wifi24?.ssid) tr069ParamValues.push(['Device.WiFi.SSID.1.SSID', String(parameters.wifi24.ssid), 'xsd:string']);
        if (parameters.wifi24?.password) tr069ParamValues.push(['Device.WiFi.AccessPoint.1.Security.KeyPassphrase', String(parameters.wifi24.password), 'xsd:string']);
        if (parameters.wifi24?.channel) tr069ParamValues.push(['Device.WiFi.Radio.1.Channel', String(parameters.wifi24.channel), 'xsd:unsignedInt']);
        if (parameters.wifi5g?.ssid) tr069ParamValues.push(['Device.WiFi.SSID.2.SSID', String(parameters.wifi5g.ssid), 'xsd:string']);
        if (parameters.wifi5g?.password) tr069ParamValues.push(['Device.WiFi.AccessPoint.2.Security.KeyPassphrase', String(parameters.wifi5g.password), 'xsd:string']);
        if (parameters.wifi5g?.channel) tr069ParamValues.push(['Device.WiFi.Radio.2.Channel', String(parameters.wifi5g.channel), 'xsd:unsignedInt']);
      } else {
        // TR-098 — detect actual 5GHz WLANConfiguration instance from rawParameters (never hardcode .5 AND .2 together)
        const wlan5gInstance = rawParamKeys
          .map(k => { const m = k.match(/WLANConfiguration\.(\d+)\.SSID$/i); return m ? parseInt(m[1], 10) : null; })
          .filter((v): v is number => v !== null && v >= 2)
          .sort((a, b) => a - b)[0] || 5; // default .5 if CPE hasn't reported yet

        if (parameters.wifi24?.ssid) {
          tr069ParamValues.push(['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', String(parameters.wifi24.ssid), 'xsd:string']);
        }
        if (parameters.wifi24?.password) {
          tr069ParamValues.push(['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase', String(parameters.wifi24.password), 'xsd:string']);
        }
        if (parameters.wifi24?.channel) {
          tr069ParamValues.push(['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel', String(parameters.wifi24.channel), 'xsd:unsignedInt']);
        }
        if (parameters.wifi5g?.ssid) {
          tr069ParamValues.push([`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${wlan5gInstance}.SSID`, String(parameters.wifi5g.ssid), 'xsd:string']);
        }
        if (parameters.wifi5g?.password) {
          tr069ParamValues.push([`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${wlan5gInstance}.PreSharedKey.1.KeyPassphrase`, String(parameters.wifi5g.password), 'xsd:string']);
        }
        if (parameters.wifi5g?.channel) {
          tr069ParamValues.push([`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${wlan5gInstance}.Channel`, String(parameters.wifi5g.channel), 'xsd:unsignedInt']);
        }
      }
    } else if (action === 'SET_WAN_CONFIG') {
      // Bug 3 fix: Dynamically resolve the confirmed PPPoE path from device.rawParameters.
      // The CPE may use WANConnectionDevice.2.WANPPPConnection.1 (or any other slot).
      const confirmedPppKey = rawParamKeys.find(k =>
        /WANConnectionDevice\.\d+\.WANPPPConnection\.\d+\.Username$/i.test(k)
      );
      let confirmedPppPrefix = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1';
      if (confirmedPppKey) {
        const m = confirmedPppKey.match(/(InternetGatewayDevice\.WANDevice\.\d+\.WANConnectionDevice\.\d+\.WANPPPConnection\.\d+)/i);
        if (m) confirmedPppPrefix = m[1];
      }
      console.log(`[DevMgmt] Resolved PPPoE dispatch path: ${confirmedPppPrefix} (source: ${confirmedPppKey ? 'rawParameters' : 'default fallback'})`);

      tr069ParamValues.push([`${confirmedPppPrefix}.Enable`, 'true', 'xsd:boolean']);
      if (parameters.pppoeUsername) {
        tr069ParamValues.push([`${confirmedPppPrefix}.Username`, String(parameters.pppoeUsername), 'xsd:string']);
      }
      if (parameters.pppoePassword) {
        tr069ParamValues.push([`${confirmedPppPrefix}.Password`, String(parameters.pppoePassword), 'xsd:string']);
      }
      tr069ParamValues.push([`${confirmedPppPrefix}.NATEnabled`, String(parameters.natEnabled !== false), 'xsd:boolean']);
      // Note: ConnectionType is read-only on WANPPPConnection — never set it or CPE returns Fault 9003.
      if (parameters.vlanId) {
        tr069ParamValues.push([`${confirmedPppPrefix}.VLANID`, String(parameters.vlanId), 'xsd:unsignedInt']);
      }
    }

    const mergedParams = {
      ...parameters,
      tr069ParamValues,
    };

    // Step 3: Create Queued Command Record for Native CWMP Engine
    const command = await DeviceCommand.create({
      tenantId: new Types.ObjectId(tenantId),
      deviceId: device._id,
      customerId: device.customerId,
      action,
      parameters: mergedParams,
      previousState,
      status: 'pending',
      requestedBy: {
        userId: Types.ObjectId.isValid(user.id) ? new Types.ObjectId(user.id) : new Types.ObjectId(),
        role: user.role,
        email: user.email,
      },
      queuedAt: new Date(),
      correlationId: correlationId || `cmd_${Date.now()}`,
      rollbackOnFailure: true,
    });


    // Bug 1 fix: Do NOT pre-mark the command 'success' here. Only do an optimistic DB pre-apply
    // for immediate UI feedback. The real lifecycle is:
    //   cwmpService.checkPendingRpcOrPoll → SetParameterValues → Verification GPV → 'verified'/'verification_failed'
    try {
      if (action === 'SET_WIFI_CONFIG') {
        if (parameters.wifi24) device.wifi24 = { ...device.wifi24, ...parameters.wifi24 } as any;
        if (parameters.wifi5g) device.wifi5g = { ...device.wifi5g, ...parameters.wifi5g } as any;
        await device.save();
      } else if (action === 'SET_WAN_CONFIG') {
        if (!device.wanProfiles || device.wanProfiles.length === 0) {
          (device.wanProfiles as any) = [{
            name: 'Internet_PPPoE',
            connectionType: 'PPPoE',
            serviceType: 'INTERNET',
            status: 'Connecting',
            vlanId: Number(parameters.vlanId) || 100,
            pppoeUsername: parameters.pppoeUsername || '',
          }];
        } else {
          if (parameters.vlanId !== undefined) device.wanProfiles[0].vlanId = Number(parameters.vlanId);
          if (parameters.pppoeUsername !== undefined) (device.wanProfiles[0] as any).pppoeUsername = parameters.pppoeUsername;
          if (parameters.pppoePassword) (device.wanProfiles[0] as any).pppoePasswordEncrypted = parameters.pppoePassword;
        }
        device.markModified('wanProfiles');
        await device.save();
        if (device.customerId) {
          await Customer.updateOne(
            { _id: device.customerId },
            { $set: {
              'wanConfig.pppoeUsername': (device.wanProfiles[0] as any).pppoeUsername,
              'wanConfig.vlanId': device.wanProfiles[0].vlanId,
            }}
          ).catch(() => {});
        }
      }
    } catch (preApplyErr: any) {
      console.warn(`[DevMgmt] Optimistic DB pre-apply failed (non-fatal, CWMP will still proceed): ${preApplyErr.message}`);
    }

    // Command stays in 'queued' status — cwmpService picks it up on the next CWMP empty POST.
    // Trigger immediate Connection Request so the ONT calls back as soon as possible.
    triggerGenieAcsConnectionRequest(device.serialNumber).catch(() => {});

    await recordAuditLog({
      tenantId,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: `DEVICE_COMMAND_${action}`,
      targetResource: 'Device',
      targetId: device._id.toString(),
      targetIdentifier: device.serialNumber,
      beforeState: previousState,
      afterState: parameters,
      correlationId,
      result: 'SUCCESS',
    });

    console.log(`[DevMgmt] Command ${command._id} (${action}) queued for CWMP delivery to ${device.serialNumber}.`);
    return {
      commandId: command._id.toString(),
      status: 'queued',
      message: `Command ${action} queued for ${device.serialNumber}. Changes will be applied and verified at next CWMP session.`,
      verified: false,
    };
  }

  /**
   * Simulates the ACS driver RPC application and post-command verification readback
   */
  private static async applyAndVerifyDeviceState(
    device: IDevice,
    action: CommandActionType,
    parameters: Record<string, any>
  ): Promise<{ success: boolean; readBackValues?: any; errorMessage?: string }> {
    try {
      if (action === 'SET_WIFI_CONFIG') {
        if (parameters.wifi24) {
          device.wifi24 = { ...device.wifi24, ...parameters.wifi24 };
        }
        if (parameters.wifi5g) {
          device.wifi5g = { ...device.wifi5g, ...parameters.wifi5g };
        }
        await device.save();
        return {
          success: true,
          readBackValues: {
            wifi24Ssid: device.wifi24?.ssid,
            wifi5gSsid: device.wifi5g?.ssid,
            verified: true,
          },
        };
      }

      if (action === 'SET_WAN_CONFIG') {
        if (!device.wanProfiles || device.wanProfiles.length === 0) {
          device.wanProfiles = [{
            name: 'Internet_PPPoE',
            connectionType: 'PPPoE',
            serviceType: 'INTERNET',
            status: 'Connected',
            vlanId: Number(parameters.vlanId) || 100,
            pppoeUsername: parameters.pppoeUsername || '',
            pppoePasswordEncrypted: parameters.pppoePassword || '',
          } as any];
        } else {
          if (parameters.vlanId !== undefined) {
            device.wanProfiles[0].vlanId = Number(parameters.vlanId);
          }
          if (parameters.pppoeUsername !== undefined) {
            device.wanProfiles[0].pppoeUsername = parameters.pppoeUsername;
          }
          if (parameters.pppoePassword) {
            device.wanProfiles[0].pppoePasswordEncrypted = parameters.pppoePassword;
          }
        }
        await device.save();

        if (device.customerId) {
          await Customer.updateOne(
            { _id: device.customerId },
            {
              $set: {
                'wanConfig.pppoeUsername': device.wanProfiles[0].pppoeUsername,
                'wanConfig.vlanId': device.wanProfiles[0].vlanId,
                'wanConfig.pppoePasswordEncrypted': device.wanProfiles[0].pppoePasswordEncrypted,
              },
            }
          ).catch(() => {});
        }

        return {
          success: true,
          readBackValues: {
            vlanId: device.wanProfiles[0].vlanId,
            pppoeUsername: device.wanProfiles[0].pppoeUsername,
            status: 'Connected',
          },
        };
      }

      if (action === 'BLOCK_CLIENT' || action === 'UNBLOCK_CLIENT') {
        const clientMac = parameters.mac;
        const targetClient = device.connectedClients.find((c) => c.mac.toLowerCase() === clientMac.toLowerCase());
        if (targetClient) {
          targetClient.isBlocked = action === 'BLOCK_CLIENT';
          await device.save();
          return {
            success: true,
            readBackValues: { mac: clientMac, isBlocked: targetClient.isBlocked },
          };
        } else {
          // If not in current list, add it as blocked
          device.connectedClients.push({
            mac: clientMac,
            hostname: parameters.hostname || 'Unknown',
            ip: parameters.ip || '',
            interfaceType: '5GHz',
            connected: false,
            isBlocked: action === 'BLOCK_CLIENT',
            lastSeen: new Date(),
          });
          await device.save();
          return {
            success: true,
            readBackValues: { mac: clientMac, isBlocked: action === 'BLOCK_CLIENT' },
          };
        }
      }

      if (action === 'REBOOT_DEVICE') {
        device.uptimeSeconds = 0;
        device.lastInform = new Date();
        await device.save();
        return {
          success: true,
          readBackValues: { uptimeSeconds: 0, status: 'online' },
        };
      }

      if (action === 'RUN_DIAGNOSTICS') {
        const diagResult = {
          type: parameters.type || 'ping',
          targetHost: parameters.targetHost || '8.8.8.8',
          success: true,
          rawOutput: `Ping statistics for ${parameters.targetHost || '8.8.8.8'}: Packets: Sent = 4, Received = 4, Lost = 0 (0% loss), Average = 11ms`,
          latencyAvgMs: 11.2,
          executedAt: new Date(),
        };
        device.diagnosticHistory.unshift(diagResult as any);
        if (device.diagnosticHistory.length > 20) device.diagnosticHistory.pop();
        await device.save();
        return {
          success: true,
          readBackValues: diagResult,
        };
      }

      return { success: true, readBackValues: { executed: true } };
    } catch (err: any) {
      return { success: false, errorMessage: err.message };
    }
  }
}
