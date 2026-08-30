import crypto from 'crypto';
import { SupportedParameterCache } from '../models/SupportedParameterCache';

export interface IWanConnectionInstance {
  instance: number;
  basePath: string;
  type: 'PPP' | 'IP';
  name?: string;
  enable?: boolean;
  connectionType?: string;
  writable: boolean;
  parameters: Map<string, { writable: boolean; value?: any }>;
}

export interface IWanConnectionDeviceSlot {
  slot: number;
  basePath: string;
  writable: boolean;
  isManagementSlot: boolean;
  pppConnections: IWanConnectionInstance[];
  ipConnections: IWanConnectionInstance[];
  vlanConfigPath?: string;
  vlanConfigWritable?: boolean;
}

export interface ITr098WanTopology {
  slots: Map<number, IWanConnectionDeviceSlot>;
  managementSlot?: number;
  availableCustomerPppSlots: number[];
  availableCustomerIpSlots: number[];
}

/**
 * Normalizes input raw parameters or parameter cache into a unified Map<string, { writable: boolean; value?: any }>
 */
export function normalizeParameterMap(
  input: Record<string, any> | Map<string, any> | Array<{ path: string; writable?: boolean; value?: any }>
): Map<string, { writable: boolean; value?: any }> {
  const result = new Map<string, { writable: boolean; value?: any }>();

  if (!input) return result;

  if (input instanceof Map) {
    for (const [k, v] of input.entries()) {
      if (typeof v === 'object' && v !== null && ('writable' in v || 'value' in v)) {
        result.set(k, { writable: v.writable !== false, value: v.value });
      } else {
        result.set(k, { writable: true, value: v });
      }
    }
    return result;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      if (item && item.path) {
        result.set(item.path, { writable: item.writable !== false, value: item.value });
      }
    }
    return result;
  }

  if (typeof input === 'object') {
    for (const [k, v] of Object.entries(input)) {
      if (typeof v === 'object' && v !== null && ('writable' in v || 'value' in v)) {
        result.set(k, { writable: (v as any).writable !== false, value: (v as any).value });
      } else {
        result.set(k, { writable: true, value: v });
      }
    }
  }

  return result;
}

/**
 * Discovers live TR-098 WAN topology from CPE parameter map.
 * Inspects all WANConnectionDevice instances and child connection objects.
 * Identifies and preserves the management/CWMP slot.
 */
export function discoverLiveTr098WanTree(
  rawOrDiscovered: Record<string, any> | Map<string, any> | Array<any>
): ITr098WanTopology {
  const paramMap = normalizeParameterMap(rawOrDiscovered);
  const slots = new Map<number, IWanConnectionDeviceSlot>();

  // Regex patterns for TR-098 WAN hierarchy
  const slotRegex = /InternetGatewayDevice\.WANDevice\.\d+\.WANConnectionDevice\.(\d+)\./;
  const pppRegex = /InternetGatewayDevice\.WANDevice\.\d+\.WANConnectionDevice\.(\d+)\.WANPPPConnection\.(\d+)\.(.*)/;
  const ipRegex = /InternetGatewayDevice\.WANDevice\.\d+\.WANConnectionDevice\.(\d+)\.WANIPConnection\.(\d+)\.(.*)/;
  const vlanRegex = /InternetGatewayDevice\.WANDevice\.\d+\.WANConnectionDevice\.(\d+)\.X_CT-COM_WANEponLinkConfig\.(.*)/;

  // First pass: identify all WANConnectionDevice slots
  for (const [path, info] of paramMap.entries()) {
    const slotMatch = path.match(slotRegex);
    if (slotMatch) {
      const slotNum = parseInt(slotMatch[1], 10);
      if (!slots.has(slotNum)) {
        const slotBasePath = `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${slotNum}.`;
        slots.set(slotNum, {
          slot: slotNum,
          basePath: slotBasePath,
          writable: info.writable !== false,
          isManagementSlot: false,
          pppConnections: [],
          ipConnections: [],
        });
      }
    }
  }

  // Second pass: populate child connection objects
  for (const [path, info] of paramMap.entries()) {
    // Check WANPPPConnection
    const pppMatch = path.match(pppRegex);
    if (pppMatch) {
      const slotNum = parseInt(pppMatch[1], 10);
      const instNum = parseInt(pppMatch[2], 10);
      const prop = pppMatch[3];

      let slotObj = slots.get(slotNum);
      if (!slotObj) {
        slotObj = {
          slot: slotNum,
          basePath: `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${slotNum}.`,
          writable: true,
          isManagementSlot: false,
          pppConnections: [],
          ipConnections: [],
        };
        slots.set(slotNum, slotObj);
      }

      let pppConn = slotObj.pppConnections.find((c) => c.instance === instNum);
      if (!pppConn) {
        pppConn = {
          instance: instNum,
          basePath: `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${slotNum}.WANPPPConnection.${instNum}`,
          type: 'PPP',
          writable: info.writable !== false,
          parameters: new Map(),
        };
        slotObj.pppConnections.push(pppConn);
      }

      if (prop) {
        pppConn.parameters.set(prop, { writable: info.writable !== false, value: info.value });
        if (prop === 'Name') pppConn.name = String(info.value || '');
        if (prop === 'Enable') pppConn.enable = Boolean(info.value);
        if (prop === 'ConnectionType') pppConn.connectionType = String(info.value || '');
      }
    }

    // Check WANIPConnection
    const ipMatch = path.match(ipRegex);
    if (ipMatch) {
      const slotNum = parseInt(ipMatch[1], 10);
      const instNum = parseInt(ipMatch[2], 10);
      const prop = ipMatch[3];

      let slotObj = slots.get(slotNum);
      if (!slotObj) {
        slotObj = {
          slot: slotNum,
          basePath: `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${slotNum}.`,
          writable: true,
          isManagementSlot: false,
          pppConnections: [],
          ipConnections: [],
        };
        slots.set(slotNum, slotObj);
      }

      let ipConn = slotObj.ipConnections.find((c) => c.instance === instNum);
      if (!ipConn) {
        ipConn = {
          instance: instNum,
          basePath: `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${slotNum}.WANIPConnection.${instNum}`,
          type: 'IP',
          writable: info.writable !== false,
          parameters: new Map(),
        };
        slotObj.ipConnections.push(ipConn);
      }

      if (prop) {
        ipConn.parameters.set(prop, { writable: info.writable !== false, value: info.value });
        if (prop === 'Name') ipConn.name = String(info.value || '');
        if (prop === 'Enable') ipConn.enable = Boolean(info.value);
        if (prop === 'ConnectionType') ipConn.connectionType = String(info.value || '');
      }
    }

    // Check VLAN Link Config
    const vlanMatch = path.match(vlanRegex);
    if (vlanMatch) {
      const slotNum = parseInt(vlanMatch[1], 10);
      const slotObj = slots.get(slotNum);
      if (slotObj) {
        slotObj.vlanConfigPath = `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${slotNum}.X_CT-COM_WANEponLinkConfig.`;
        if (vlanMatch[2] === 'VLANIDMark') {
          slotObj.vlanConfigWritable = info.writable !== false;
        }
      }
    }
  }

  // Third pass: Identify Management Slot
  // Slot 1 is typically dedicated to TR-069 management on telecom ONTs if it contains WANIPConnection
  // Also inspect ServiceList, Name, or ConnectionRequestURL bindings
  let mgmtSlot: number | undefined;
  for (const [slotNum, slotObj] of slots.entries()) {
    const isMgmt = slotObj.ipConnections.some((ip) => {
      const sList = String(ip.parameters.get('X_CT-COM_ServiceList')?.value || '').toUpperCase();
      const name = String(ip.name || '').toUpperCase();
      return sList.includes('TR069') || sList.includes('MANAGEMENT') || name.includes('TR069') || name.includes('MGMT');
    });

    if (isMgmt) {
      slotObj.isManagementSlot = true;
      mgmtSlot = slotNum;
      break;
    }
  }

  // Fallback: If no explicit management tag, check if slot 1 contains ONLY WANIPConnection AND multiple slots exist
  if (mgmtSlot === undefined && slots.has(1) && slots.size > 1) {
    const slot1 = slots.get(1)!;
    if (slot1.ipConnections.length > 0 && slot1.pppConnections.length === 0) {
      slot1.isManagementSlot = true;
      mgmtSlot = 1;
    }
  }

  const availableCustomerPppSlots: number[] = [];
  const availableCustomerIpSlots: number[] = [];

  for (const [slotNum, slotObj] of slots.entries()) {
    if (!slotObj.isManagementSlot) {
      if (slotObj.pppConnections.length > 0) {
        availableCustomerPppSlots.push(slotNum);
      }
      if (slotObj.ipConnections.length > 0) {
        availableCustomerIpSlots.push(slotNum);
      }
    }
  }

  return {
    slots,
    managementSlot: mgmtSlot,
    availableCustomerPppSlots,
    availableCustomerIpSlots,
  };
}

/**
 * Selects the actual existing customer WAN object based on live TR-098 topology.
 * Strictly preserves the management slot.
 */
export function selectCustomerWanSlot(
  topology: ITr098WanTopology,
  isPppoe: boolean,
  targetSlotHint?: number
): { slot: number; basePath: string; pppConnection?: IWanConnectionInstance; ipConnection?: IWanConnectionInstance } | null {
  // If a hint is provided and it exists and is NOT management:
  if (targetSlotHint && targetSlotHint !== topology.managementSlot && topology.slots.has(targetSlotHint)) {
    const slotObj = topology.slots.get(targetSlotHint)!;
    if (isPppoe && slotObj.pppConnections.length > 0) {
      return {
        slot: targetSlotHint,
        basePath: slotObj.pppConnections[0].basePath,
        pppConnection: slotObj.pppConnections[0],
      };
    } else if (!isPppoe && slotObj.ipConnections.length > 0) {
      return {
        slot: targetSlotHint,
        basePath: slotObj.ipConnections[0].basePath,
        ipConnection: slotObj.ipConnections[0],
      };
    }
  }

  // Search existing customer PPP slots (excluding management slot)
  if (isPppoe) {
    for (const slotNum of topology.availableCustomerPppSlots) {
      const slotObj = topology.slots.get(slotNum);
      if (slotObj && slotObj.pppConnections.length > 0) {
        return {
          slot: slotNum,
          basePath: slotObj.pppConnections[0].basePath,
          pppConnection: slotObj.pppConnections[0],
        };
      }
    }
  } else {
    for (const slotNum of topology.availableCustomerIpSlots) {
      const slotObj = topology.slots.get(slotNum);
      if (slotObj && slotObj.ipConnections.length > 0) {
        return {
          slot: slotNum,
          basePath: slotObj.ipConnections[0].basePath,
          ipConnection: slotObj.ipConnections[0],
        };
      }
    }
  }

  // If no dedicated customer connection exists yet, check non-management writable slots
  for (const [slotNum, slotObj] of topology.slots.entries()) {
    if (!slotObj.isManagementSlot && slotObj.writable) {
      const connName = isPppoe ? 'WANPPPConnection.1' : 'WANIPConnection.1';
      return {
        slot: slotNum,
        basePath: `${slotObj.basePath}${connName}`,
      };
    }
  }

  return null;
}

/**
 * Validates requested parameters against discovered parameter tree.
 * Omit optional unsupported parameters; return errors for missing/non-writable required parameters.
 */
export function validateWanParameters(
  requestedParams: Array<[string, any, string]>,
  discoveredTree: Record<string, any> | Map<string, any> | Array<any>
): {
  validParams: Array<[string, any, string]>;
  errors: string[];
  omittedOptional: string[];
} {
  const paramMap = normalizeParameterMap(discoveredTree);
  const validParams: Array<[string, any, string]> = [];
  const errors: string[] = [];
  const omittedOptional: string[] = [];

  // Optional parameter patterns (never fail command if absent/unsupported)
  const optionalRegex = /NATEnabled$|MulticastVlan$|DNSServers$|ExternalIPAddress$|SubnetMask$|DefaultGateway$/i;

  // Required parameter patterns for PPPoE/WAN
  const requiredRegex = /Username$|Password$|Enable$|ConnectionType$/i;

  for (const [path, val, type] of requestedParams) {
    const isOptional = optionalRegex.test(path);
    const isRequired = requiredRegex.test(path);

    // If discovered tree does not contain any WAN connection parameters yet (initial bootstrap or only DeviceInfo cached),
    // allow candidate parameters through to avoid false-positive rejections.
    const hasDiscoveredWanTree = Array.from(paramMap.keys()).some((k) => k.includes('WANConnectionDevice.') || k.includes('Device.PPP.'));
    if (!hasDiscoveredWanTree) {
      validParams.push([path, val, type]);
      continue;
    }

    const discovered = paramMap.get(path);

    if (!discovered) {
      // Check if parent connection instance exists in paramMap (e.g. WANPPPConnection.1)
      const instancePrefixMatch = path.match(/^(InternetGatewayDevice\.WANDevice\.\d+\.WANConnectionDevice\.\d+\.(?:WANPPPConnection|WANIPConnection)\.\d+)\./);
      const parentInstance = instancePrefixMatch ? instancePrefixMatch[1] : '';
      const parentExists = Boolean(parentInstance && Array.from(paramMap.keys()).some((k) => k.startsWith(parentInstance)));

      const isStandardWanCore = /\.(?:Username|Password|Enable|ConnectionType)$/i.test(path);

      if (parentExists && isStandardWanCore) {
        validParams.push([path, val, type]);
        continue;
      }

      // If parent instance doesn't exist on device (e.g. requested WANPPPConnection.2 on a device that only has WANPPPConnection.1)
      if (!parentExists && isStandardWanCore) {
        const confirmedPppInstanceKey = Array.from(paramMap.keys()).find(k => /WANConnectionDevice\.\d+\.WANPPPConnection\.\d+\./i.test(k));
        if (confirmedPppInstanceKey) {
          const m = confirmedPppInstanceKey.match(/(InternetGatewayDevice\.WANDevice\.\d+\.WANConnectionDevice\.\d+\.WANPPPConnection\.\d+)/i);
          if (m) {
            const redirectedPath = path.replace(parentInstance, m[1]);
            validParams.push([redirectedPath, val, type]);
            continue;
          }
        }
      }

      if (isOptional) {
        omittedOptional.push(path);
        continue;
      } else if (isRequired && !hasDiscoveredWanTree) {
        validParams.push([path, val, type]);
        continue;
      } else {
        omittedOptional.push(path);
        continue;
      }
    }

    if (discovered.writable === false) {
      if (isOptional) {
        omittedOptional.push(`${path} (read-only)`);
        continue;
      } else {
        errors.push(`Parameter '${path}' exists but is declared read-only by the CPE.`);
        continue;
      }
    }

    validParams.push([path, val, type]);
  }

  return { validParams, errors, omittedOptional };
}

/**
 * Computes deterministic SHA-256 hash of parameter payload for duplicate/retry validation.
 * Passwords are normalized to a consistent hash token to ensure deterministic hash.
 */
export function computePayloadHash(params: Array<[string, any, string]> | any): string {
  if (!Array.isArray(params)) {
    return crypto.createHash('sha256').update(JSON.stringify(params || {})).digest('hex');
  }

  const normalized = params.map(([path, val, type]) => {
    const isPassword = typeof path === 'string' && /password/i.test(path);
    return [path, isPassword ? '__AUTH_SECRET__' : String(val), type || 'xsd:string'];
  });

  normalized.sort((a, b) => a[0].localeCompare(b[0]));
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Master dynamic TR-098 WAN parameter builder.
 * Discovers live tree, selects customer slot, generates paths, and validates before dispatch.
 */
export async function buildDynamicTr098WanParams(
  profile: any,
  device: any,
  discoveredTree?: Record<string, any> | Map<string, any> | Array<any>
): Promise<{
  params: Array<[string, any, string]>;
  errors: string[];
  omittedOptional: string[];
  payloadHash: string;
  basePath: string;
  isPppoe: boolean;
}> {
  const isPppoe = profile.connectionType === 'PPPoE' || profile.mode === 'Route' || profile.linkMode === 'PPP';
  const rawParams = discoveredTree || device?.rawParameters || {};
  const topology = discoverLiveTr098WanTree(rawParams);

  // If profile already has an assigned cpeObjectPath (e.g. editing existing profile), prioritize it
  let basePath: string = profile.cpeObjectPath ? profile.cpeObjectPath.replace(/\.$/, '') : '';

  if (!basePath) {
    const rawKeys = typeof rawParams === 'object' && !Array.isArray(rawParams) && !(rawParams instanceof Map)
      ? Object.keys(rawParams)
      : Array.from(normalizeParameterMap(rawParams).keys());

    const otherProfiles = (device?.wanProfiles || []).filter((p: any) => p._id && String(p._id) !== String(profile._id));
    
    // Find all slots already occupied by other WAN profiles
    const usedSlots = new Set<number>();
    for (const p of otherProfiles) {
      if (p.cpeObjectPath) {
        const m = p.cpeObjectPath.match(/WANConnectionDevice\.(\d+)\./i);
        if (m) usedSlots.add(parseInt(m[1], 10));
      }
    }
    
    // If device has an existing TR-069 management profile on slot 1, reserve slot 1
    if (otherProfiles.some((p: any) => p.serviceType === 'TR069' || p.isProtected || /TR069/i.test(p.name))) {
      usedSlots.add(1);
    }

    // Allocate next sequential slot (Slot 2 for WAN 2, Slot 3 for WAN 3, Slot 4 for WAN 4)
    let targetSlot = 2;
    while (usedSlots.has(targetSlot)) {
      targetSlot++;
      if (targetSlot > 8) break;
    }

    const connName = isPppoe ? 'WANPPPConnection.1' : 'WANIPConnection.1';
    basePath = `InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${targetSlot}.${connName}`;
  }

  // Bind the allocated physical CPE path to the profile
  if (!profile.cpeObjectPath && basePath) {
    profile.cpeObjectPath = `${basePath}.`;
  }

  const rawCandidateParams: Array<[string, any, string]> = [];

  // Enable
  if (profile.enableWan !== undefined) {
    rawCandidateParams.push([`${basePath}.Enable`, Boolean(profile.enableWan), 'xsd:boolean']);
  } else {
    rawCandidateParams.push([`${basePath}.Enable`, true, 'xsd:boolean']);
  }

  // Service List (e.g. INTERNET, VOICE, TR069, IPTV)
  const resolvedServiceList = (profile.serviceType === 'VOIP' || profile.serviceUsage?.voip) ? 'VOICE' :
    (profile.serviceType === 'TR069' || profile.serviceUsage?.tr069) ? 'TR069' :
    (profile.serviceType === 'IPTV' || profile.serviceUsage?.iptvDhcp) ? 'IPTV' : 'INTERNET';
  rawCandidateParams.push([`${basePath}.X_CT-COM_ServiceList`, resolvedServiceList, 'xsd:string']);

  if (isPppoe) {
    const pUsername = profile.pppoeUsername || profile.username;
    if (pUsername) {
      rawCandidateParams.push([`${basePath}.Username`, String(pUsername), 'xsd:string']);
    }
    const pPassword = profile.pppoePasswordEncrypted || profile.pppoePassword || profile.password;
    if (pPassword) {
      rawCandidateParams.push([`${basePath}.Password`, String(pPassword), 'xsd:string']);
    }
    // ConnectionType is read-only on most TR-098 ONTs (e.g. Genexis) and defaults to IP_Routed on WANPPPConnection. Omit to prevent Fault 9003.
  } else {
    if (profile.natEnabled !== undefined && profile.bearerService !== 'TR069') {
      rawCandidateParams.push([`${basePath}.NATEnabled`, Boolean(profile.natEnabled), 'xsd:boolean']);
    }
    if (profile.connectionType === 'Static' || profile.ipAssignment === 'Static') {
      if (profile.ipAddress) rawCandidateParams.push([`${basePath}.ExternalIPAddress`, String(profile.ipAddress), 'xsd:string']);
      if (profile.subnetMask) rawCandidateParams.push([`${basePath}.SubnetMask`, String(profile.subnetMask), 'xsd:string']);
      if (profile.gateway) rawCandidateParams.push([`${basePath}.DefaultGateway`, String(profile.gateway), 'xsd:string']);
    }
    if (profile.primaryDns) {
      const dnsStr = `${profile.primaryDns}${profile.secondaryDns ? `,${profile.secondaryDns}` : ''}`;
      rawCandidateParams.push([`${basePath}.DNSServers`, dnsStr, 'xsd:string']);
    }
  }

  // Dynamic VLAN Path Generation targeting the exact allocated slot
  const hasVlan = (profile.vlanEnabled !== false && profile.vlanId && Number(profile.vlanId) > 0) || profile.vlanMode === 'TAG';
  if (hasVlan && profile.vlanId) {
    const slotMatch = basePath.match(/WANConnectionDevice\.(\d+)\./i);
    const slotNum = slotMatch ? slotMatch[1] : '1';

    // Target the specific slot's EPON link config for VLAN Mode and VLAN ID
    rawCandidateParams.push([`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${slotNum}.X_CT-COM_WANEponLinkConfig.Mode`, 2, 'xsd:int']);
    rawCandidateParams.push([`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${slotNum}.X_CT-COM_WANEponLinkConfig.VLANIDMark`, Number(profile.vlanId), 'xsd:int']);
  }

  // NOTE: Requirement 5: MulticastVlan is explicitly removed from Internet WAN task!

  // Validate existence & writability
  const validation = validateWanParameters(rawCandidateParams, rawParams);

  const payloadHash = computePayloadHash(validation.validParams);

  return {
    params: validation.validParams,
    errors: validation.errors,
    omittedOptional: validation.omittedOptional,
    payloadHash,
    basePath,
    isPppoe,
  };
}
