import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer.js';
import { Device, IDevice } from '../models/Device.js';
import { OLT, PONPort, FiberNode, FiberSegment, IFiberNode, IFiberSegment, IOLT, IPONPort } from '../models/FiberTopology.js';

export interface IRouteTraceSegment {
  step: number;
  nodeType: 'CUSTOMER_PREMISE' | 'ONT_DEVICE' | 'DROP_CABLE' | 'FAT_NAP_BOX' | 'DISTRIBUTION_CABLE' | 'PRIMARY_SPLITTER' | 'SECONDARY_SPLITTER' | 'FEEDER_CABLE' | 'PON_PORT' | 'OLT_CHASSIS';
  nodeCode: string;
  name: string;
  coordinates?: { lat: number; lng: number };
  address?: string;
  photos?: string[];
  totalCapacity?: number;
  usedCapacity?: number;
  darkCores?: number;
  liveCores?: number;
  segmentLengthMeters?: number;
  segmentLossDb?: number;
  cableCode?: string;
  status: string;
  isConfigured: boolean;
  notes?: string;
}

export interface IRouteTraceResult {
  query: string;
  searchType: string;
  matchedTarget: {
    id: string;
    label: string;
    type: string;
  };
  customerId?: string;
  customerName?: string;
  serviceId?: string;
  ontSerial?: string;
  macAddress?: string;
  currentRxPowerDbm?: number;
  currentTxPowerDbm?: number;
  opticalStatus?: string;
  oltName?: string;
  oltCode?: string;
  ponPortIdentifier?: string;
  totalDistanceMeters: number;
  estimatedTotalLossDb: number;
  pathNodes: IRouteTraceSegment[];
  polylineCoordinates: Array<{ lat: number; lng: number }>;
  isFullyLinked: boolean;
  unlinkedReason?: string;
}

export interface IFaultImpactResult {
  faultComponentType: string;
  faultComponentCode: string;
  faultName: string;
  totalImpactedCustomers: number;
  impactedCustomers: Array<{
    customerId: string;
    accountNumber: string;
    name: string;
    phone: string;
    address: string;
    ontSerial?: string;
    ontStatus?: string;
    monthlyFee: number;
  }>;
  affectedPonPort?: string;
  affectedOlt?: string;
  totalMonthlyRevenueAtRisk: number;
}

export class FiberGisService {
  /**
   * Universal Search & Visual Route Tracer:
   * Supports Search by: Customer (Name/Account/Phone), ONT (Serial), MAC Address, Splitter (Code/Name), FAT Box (Code/Name), OLT (Code/Name).
   * Strict Real Data Policy: If any link is unconfigured, reports 'Not Configured' with zero fake data.
   */
  static async traceElement(
    tenantId: string,
    query: string,
    queryType?: 'customer' | 'ont' | 'mac' | 'splitter' | 'fat' | 'olt' | 'auto'
  ): Promise<IRouteTraceResult> {
    const tId = new Types.ObjectId(tenantId);
    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) throw new Error('Search query is required');

    let resolvedCustomer: ICustomer | null = null;
    let resolvedDevice: IDevice | null = null;
    let resolvedNode: IFiberNode | null = null;
    let resolvedOlt: IOLT | null = null;
    let detectedType = queryType || 'auto';

    // 1. Auto-Resolution across models
    if (detectedType === 'customer' || detectedType === 'auto') {
      resolvedCustomer = await Customer.findOne({
        tenantId: tId,
        $or: [
          { accountNumber: new RegExp(`^${cleanQuery}$`, 'i') },
          { serviceId: new RegExp(`^${cleanQuery}$`, 'i') },
          { phone: cleanQuery },
          { fullName: new RegExp(cleanQuery, 'i') },
          ...(Types.ObjectId.isValid(cleanQuery) ? [{ _id: new Types.ObjectId(cleanQuery) }] : []),
        ],
      });
      if (resolvedCustomer) detectedType = 'customer';
    }

    if (!resolvedCustomer && (detectedType === 'ont' || detectedType === 'mac' || detectedType === 'auto')) {
      resolvedDevice = await Device.findOne({
        tenantId: tId,
        $or: [
          { serialNumber: new RegExp(`^${cleanQuery}$`, 'i') },
          { macAddress: new RegExp(`^${cleanQuery}$`, 'i') },
        ],
      });
      if (resolvedDevice) {
        detectedType = resolvedDevice.serialNumber.toLowerCase() === cleanQuery.toLowerCase() ? 'ont' : 'mac';
        // Try finding bound customer
        if (resolvedDevice.customerId) {
          resolvedCustomer = await Customer.findOne({ _id: resolvedDevice.customerId, tenantId: tId });
        } else {
          resolvedCustomer = await Customer.findOne({ assignedDeviceId: resolvedDevice._id, tenantId: tId });
        }
      }
    }

    if (!resolvedCustomer && !resolvedDevice && (detectedType === 'fat' || detectedType === 'splitter' || detectedType === 'auto')) {
      resolvedNode = await FiberNode.findOne({
        tenantId: tId,
        $or: [
          { nodeCode: new RegExp(`^${cleanQuery}$`, 'i') },
          { name: new RegExp(cleanQuery, 'i') },
          ...(Types.ObjectId.isValid(cleanQuery) ? [{ _id: new Types.ObjectId(cleanQuery) }] : []),
        ],
      });
      if (resolvedNode) detectedType = resolvedNode.type.includes('SPLITTER') ? 'splitter' : 'fat';
    }

    if (!resolvedCustomer && !resolvedDevice && !resolvedNode && (detectedType === 'olt' || detectedType === 'auto')) {
      resolvedOlt = await OLT.findOne({
        tenantId: tId,
        $or: [
          { code: new RegExp(`^${cleanQuery}$`, 'i') },
          { name: new RegExp(cleanQuery, 'i') },
          { ipAddress: cleanQuery },
          ...(Types.ObjectId.isValid(cleanQuery) ? [{ _id: new Types.ObjectId(cleanQuery) }] : []),
        ],
      });
      if (resolvedOlt) detectedType = 'olt';
    }

    if (!resolvedCustomer && !resolvedDevice && !resolvedNode && !resolvedOlt) {
      throw new Error(`No fiber asset or subscriber found matching "${cleanQuery}" in your tenant context.`);
    }

    // Step 2: Build Trace Chain based on matched entity
    const pathNodes: IRouteTraceSegment[] = [];
    const polylineCoordinates: Array<{ lat: number; lng: number }> = [];
    let totalDistance = 0;
    let totalLoss = 0;
    let stepCount = 1;
    let isFullyLinked = true;
    let unlinkedReason: string | undefined;

    // A. CUSTOMER / ONT ORIGINATED TRACE
    if (resolvedCustomer || resolvedDevice) {
      const cust = resolvedCustomer;
      const dev = resolvedDevice || (cust?.assignedDeviceId ? await Device.findById(cust.assignedDeviceId) : null);

      // Step 1: Customer Premise
      if (cust) {
        const hasGps = cust.address?.coordinates?.lat && cust.address?.coordinates?.lng;
        pathNodes.push({
          step: stepCount++,
          nodeType: 'CUSTOMER_PREMISE',
          nodeCode: cust.accountNumber || 'Not Configured',
          name: cust.fullName || 'Subscriber',
          coordinates: hasGps ? cust.address.coordinates : undefined,
          address: `${cust.address?.street || ''}, ${cust.address?.area || ''}, ${cust.address?.city || ''}`.trim() || 'Not Configured',
          status: cust.status || 'active',
          isConfigured: Boolean(cust.accountNumber),
        });
        if (hasGps) polylineCoordinates.push(cust.address.coordinates);
      }

      // Step 2: ONT Device
      if (dev) {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'ONT_DEVICE',
          nodeCode: dev.serialNumber,
          name: `${dev.manufacturer || 'ONT'} ${dev.modelName || 'Device'} (${dev.macAddress || 'No MAC'})`,
          status: dev.status,
          isConfigured: true,
          notes: `Rx: ${dev.currentRxPowerDbm ?? 'N/A'} dBm | Status: ${dev.opticalStatus || 'normal'}`,
        });
      } else {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'ONT_DEVICE',
          nodeCode: 'Not Configured',
          name: 'No ONT Assigned to Customer',
          status: 'NOT_CONFIGURED',
          isConfigured: false,
        });
        isFullyLinked = false;
        unlinkedReason = 'Customer has no assigned ONT Device';
      }

      // Step 3: Drop Cable Segment
      const dropInfo = cust?.fiberDropInfo;
      const dropCableLength = dropInfo?.dropCableLengthMeters;
      pathNodes.push({
        step: stepCount++,
        nodeType: 'DROP_CABLE',
        nodeCode: dropInfo?.fatPortNumber ? `DROP-PORT-${dropInfo.fatPortNumber}` : 'Not Configured',
        name: dropCableLength ? `Drop Cable (${dropCableLength}m)` : 'Drop Cable (Length Not Configured)',
        segmentLengthMeters: dropCableLength || 0,
        segmentLossDb: dropCableLength ? parseFloat((dropCableLength * 0.00035).toFixed(2)) : 0,
        status: dropInfo?.fatBoxId ? 'healthy' : 'NOT_CONFIGURED',
        isConfigured: Boolean(dropInfo?.fatBoxId),
      });
      if (dropCableLength) {
        totalDistance += dropCableLength;
        totalLoss += parseFloat((dropCableLength * 0.00035).toFixed(2));
      }

      // Step 4: FAT / NAP Box
      let currentFat: IFiberNode | null = null;
      if (dropInfo?.fatBoxId) {
        currentFat = await FiberNode.findById(dropInfo.fatBoxId);
      }
      if (currentFat) {
        const hasGps = currentFat.location?.lat && currentFat.location?.lng;
        pathNodes.push({
          step: stepCount++,
          nodeType: 'FAT_NAP_BOX',
          nodeCode: currentFat.nodeCode,
          name: `${currentFat.name} (Port ${dropInfo?.fatPortNumber || 1}/${currentFat.totalCapacity})`,
          coordinates: hasGps ? { lat: currentFat.location.lat, lng: currentFat.location.lng } : undefined,
          address: currentFat.location?.address || 'Not Configured',
          photos: currentFat.photos || [],
          totalCapacity: currentFat.totalCapacity,
          usedCapacity: currentFat.usedCapacity,
          darkCores: Math.max(0, currentFat.totalCapacity - currentFat.usedCapacity),
          liveCores: currentFat.usedCapacity,
          status: currentFat.status,
          isConfigured: true,
        });
        if (hasGps) polylineCoordinates.push({ lat: currentFat.location.lat, lng: currentFat.location.lng });
      } else {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'FAT_NAP_BOX',
          nodeCode: 'Not Configured',
          name: 'FAT / NAP Terminal Box Not Linked',
          status: 'NOT_CONFIGURED',
          isConfigured: false,
        });
        isFullyLinked = false;
        if (!unlinkedReason) unlinkedReason = 'Customer drop is not connected to a FAT/NAP Box';
      }

      // Step 5: Distribution Cable Segment
      let distSegment: IFiberSegment | null = null;
      if (currentFat) {
        distSegment = await FiberSegment.findOne({
          tenantId: tId,
          $or: [{ toNodeId: currentFat._id }, { fromNodeId: currentFat._id }],
        });
      }
      if (distSegment) {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'DISTRIBUTION_CABLE',
          nodeCode: distSegment.cableCode,
          name: `${distSegment.name} (${distSegment.totalCores}C: ${distSegment.liveCores} Live, ${distSegment.darkCores} Dark)`,
          totalCapacity: distSegment.totalCores,
          liveCores: distSegment.liveCores,
          darkCores: distSegment.darkCores,
          segmentLengthMeters: distSegment.lengthMeters,
          segmentLossDb: distSegment.measuredLossDb,
          photos: distSegment.photos || [],
          status: distSegment.status,
          isConfigured: true,
        });
        totalDistance += distSegment.lengthMeters;
        totalLoss += distSegment.measuredLossDb;
        if (distSegment.coordinates && distSegment.coordinates.length > 0) {
          for (const pt of distSegment.coordinates) {
            polylineCoordinates.push(pt);
          }
        }
      }

      // Step 6: Splitter (Primary / Secondary)
      let currentSplitter: IFiberNode | null = null;
      if (dropInfo?.splitterId) {
        currentSplitter = await FiberNode.findById(dropInfo.splitterId);
      } else if (currentFat?.upstreamNodeId) {
        currentSplitter = await FiberNode.findById(currentFat.upstreamNodeId);
      }
      if (currentSplitter) {
        const hasGps = currentSplitter.location?.lat && currentSplitter.location?.lng;
        pathNodes.push({
          step: stepCount++,
          nodeType: currentSplitter.type.includes('PRIMARY') ? 'PRIMARY_SPLITTER' : 'SECONDARY_SPLITTER',
          nodeCode: currentSplitter.nodeCode,
          name: currentSplitter.name,
          coordinates: hasGps ? { lat: currentSplitter.location.lat, lng: currentSplitter.location.lng } : undefined,
          address: currentSplitter.location?.address || 'Not Configured',
          photos: currentSplitter.photos || [],
          totalCapacity: currentSplitter.totalCapacity,
          usedCapacity: currentSplitter.usedCapacity,
          status: currentSplitter.status,
          isConfigured: true,
        });
        if (hasGps) polylineCoordinates.push({ lat: currentSplitter.location.lat, lng: currentSplitter.location.lng });
      } else {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'PRIMARY_SPLITTER',
          nodeCode: 'Not Configured',
          name: 'Optical Splitter Not Configured',
          status: 'NOT_CONFIGURED',
          isConfigured: false,
        });
        isFullyLinked = false;
        if (!unlinkedReason) unlinkedReason = 'No upstream Splitter linked to this terminal path';
      }

      // Step 7: Feeder Cable Segment
      let feederSegment: IFiberSegment | null = null;
      if (currentSplitter) {
        feederSegment = await FiberSegment.findOne({
          tenantId: tId,
          category: 'FEEDER',
          $or: [{ toNodeId: currentSplitter._id }, { fromNodeId: currentSplitter._id }],
        });
      }
      if (feederSegment) {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'FEEDER_CABLE',
          nodeCode: feederSegment.cableCode,
          name: `${feederSegment.name} (Feeder ${feederSegment.totalCores}C)`,
          totalCapacity: feederSegment.totalCores,
          liveCores: feederSegment.liveCores,
          darkCores: feederSegment.darkCores,
          segmentLengthMeters: feederSegment.lengthMeters,
          segmentLossDb: feederSegment.measuredLossDb,
          photos: feederSegment.photos || [],
          status: feederSegment.status,
          isConfigured: true,
        });
        totalDistance += feederSegment.lengthMeters;
        totalLoss += feederSegment.measuredLossDb;
        if (feederSegment.coordinates && feederSegment.coordinates.length > 0) {
          for (const pt of feederSegment.coordinates) {
            polylineCoordinates.push(pt);
          }
        }
      }

      // Step 8: PON Port
      let currentPon: IPONPort | null = null;
      if (dropInfo?.ponPortId) {
        currentPon = await PONPort.findById(dropInfo.ponPortId);
      } else if (currentSplitter?.ponPortId) {
        currentPon = await PONPort.findById(currentSplitter.ponPortId);
      } else if (currentFat?.ponPortId) {
        currentPon = await PONPort.findById(currentFat.ponPortId);
      }
      if (currentPon) {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'PON_PORT',
          nodeCode: `PON-${currentPon.portIdentifier}`,
          name: `PON Port ${currentPon.portIdentifier} (Tx: +${currentPon.txPowerDbm} dBm | Ratio: ${currentPon.splitRatio})`,
          totalCapacity: currentPon.maxOnts,
          usedCapacity: currentPon.connectedOntsCount,
          status: currentPon.status,
          isConfigured: true,
        });
      } else {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'PON_PORT',
          nodeCode: 'Not Configured',
          name: 'OLT PON Port Not Linked',
          status: 'NOT_CONFIGURED',
          isConfigured: false,
        });
        isFullyLinked = false;
        if (!unlinkedReason) unlinkedReason = 'No PON Port linked to this optical distribution segment';
      }

      // Step 9: OLT Chassis
      let currentOlt: IOLT | null = null;
      if (dropInfo?.oltId) {
        currentOlt = await OLT.findById(dropInfo.oltId);
      } else if (currentPon?.oltId) {
        currentOlt = await OLT.findById(currentPon.oltId);
      } else if (currentSplitter?.oltId) {
        currentOlt = await OLT.findById(currentSplitter.oltId);
      }
      if (currentOlt) {
        const hasGps = currentOlt.location?.lat && currentOlt.location?.lng;
        pathNodes.push({
          step: stepCount++,
          nodeType: 'OLT_CHASSIS',
          nodeCode: currentOlt.code,
          name: `${currentOlt.vendor} ${currentOlt.modelName} (${currentOlt.name} - ${currentOlt.ipAddress})`,
          coordinates: hasGps ? { lat: currentOlt.location.lat, lng: currentOlt.location.lng } : undefined,
          address: currentOlt.location?.address || 'Not Configured',
          photos: currentOlt.photos || [],
          totalCapacity: currentOlt.totalPonPorts,
          status: currentOlt.status,
          isConfigured: true,
        });
        if (hasGps) polylineCoordinates.push({ lat: currentOlt.location.lat, lng: currentOlt.location.lng });
      } else {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'OLT_CHASSIS',
          nodeCode: 'Not Configured',
          name: 'OLT Chassis Not Linked',
          status: 'NOT_CONFIGURED',
          isConfigured: false,
        });
        isFullyLinked = false;
        if (!unlinkedReason) unlinkedReason = 'Physical path does not terminate at an OLT Chassis';
      }

      return {
        query: cleanQuery,
        searchType: detectedType,
        matchedTarget: {
          id: (cust?._id || dev?._id)!.toString(),
          label: cust?.fullName || dev?.serialNumber || cleanQuery,
          type: detectedType.toUpperCase(),
        },
        customerId: cust?._id?.toString(),
        customerName: cust?.fullName,
        serviceId: cust?.serviceId,
        ontSerial: dev?.serialNumber,
        macAddress: dev?.macAddress,
        currentRxPowerDbm: dev?.currentRxPowerDbm,
        currentTxPowerDbm: dev?.currentTxPowerDbm,
        opticalStatus: dev?.opticalStatus,
        oltName: currentOlt?.name,
        oltCode: currentOlt?.code,
        ponPortIdentifier: currentPon?.portIdentifier,
        totalDistanceMeters: totalDistance,
        estimatedTotalLossDb: parseFloat(totalLoss.toFixed(2)),
        pathNodes,
        polylineCoordinates,
        isFullyLinked,
        unlinkedReason,
      };
    }

    // B. NODE (FAT / SPLITTER) ORIGINATED TRACE
    if (resolvedNode) {
      const node = resolvedNode;
      const hasGps = node.location?.lat && node.location?.lng;

      pathNodes.push({
        step: stepCount++,
        nodeType: node.type.includes('SPLITTER') ? 'PRIMARY_SPLITTER' : 'FAT_NAP_BOX',
        nodeCode: node.nodeCode,
        name: node.name,
        coordinates: hasGps ? { lat: node.location.lat, lng: node.location.lng } : undefined,
        address: node.location?.address || 'Not Configured',
        photos: node.photos || [],
        totalCapacity: node.totalCapacity,
        usedCapacity: node.usedCapacity,
        darkCores: Math.max(0, node.totalCapacity - node.usedCapacity),
        liveCores: node.usedCapacity,
        status: node.status,
        isConfigured: true,
      });
      if (hasGps) polylineCoordinates.push({ lat: node.location.lat, lng: node.location.lng });

      // Traverse upstream to OLT
      let upOlt: IOLT | null = node.oltId ? await OLT.findById(node.oltId) : null;
      let upPon: IPONPort | null = node.ponPortId ? await PONPort.findById(node.ponPortId) : null;
      if (upPon && !upOlt && upPon.oltId) {
        upOlt = await OLT.findById(upPon.oltId);
      }

      if (upPon) {
        pathNodes.push({
          step: stepCount++,
          nodeType: 'PON_PORT',
          nodeCode: `PON-${upPon.portIdentifier}`,
          name: `PON Port ${upPon.portIdentifier}`,
          totalCapacity: upPon.maxOnts,
          usedCapacity: upPon.connectedOntsCount,
          status: upPon.status,
          isConfigured: true,
        });
      }

      if (upOlt) {
        const oltGps = upOlt.location?.lat && upOlt.location?.lng;
        pathNodes.push({
          step: stepCount++,
          nodeType: 'OLT_CHASSIS',
          nodeCode: upOlt.code,
          name: `${upOlt.name} (${upOlt.ipAddress})`,
          coordinates: oltGps ? { lat: upOlt.location.lat, lng: upOlt.location.lng } : undefined,
          address: upOlt.location?.address || 'Not Configured',
          photos: upOlt.photos || [],
          status: upOlt.status,
          isConfigured: true,
        });
        if (oltGps) polylineCoordinates.push({ lat: upOlt.location.lat, lng: upOlt.location.lng });
      }

      return {
        query: cleanQuery,
        searchType: detectedType,
        matchedTarget: {
          id: node._id.toString(),
          label: `${node.nodeCode} — ${node.name}`,
          type: node.type.includes('SPLITTER') ? 'SPLITTER' : (node.type === 'FAT_NAP_BOX' ? 'FAT_NODE' : 'FIBER_NODE'),
        },
        oltName: upOlt?.name,
        oltCode: upOlt?.code,
        ponPortIdentifier: upPon?.portIdentifier,
        totalDistanceMeters: totalDistance,
        estimatedTotalLossDb: 0,
        pathNodes,
        polylineCoordinates,
        isFullyLinked: Boolean(upOlt),
        unlinkedReason: upOlt ? undefined : 'Fiber Node is not linked upstream to an OLT chassis',
      };
    }

    // C. OLT ORIGINATED TRACE
    const olt = resolvedOlt!;
    const oltGps = olt.location?.lat && olt.location?.lng;
    pathNodes.push({
      step: stepCount++,
      nodeType: 'OLT_CHASSIS',
      nodeCode: olt.code,
      name: `${olt.vendor} ${olt.modelName} (${olt.name} - ${olt.ipAddress})`,
      coordinates: oltGps ? { lat: olt.location.lat, lng: olt.location.lng } : undefined,
      address: olt.location?.address || 'Not Configured',
      photos: olt.photos || [],
      totalCapacity: olt.totalPonPorts,
      status: olt.status,
      isConfigured: true,
    });
    if (oltGps) polylineCoordinates.push({ lat: olt.location.lat, lng: olt.location.lng });

    const ponPorts = await PONPort.find({ oltId: olt._id, tenantId: tId });
    for (const pon of ponPorts) {
      pathNodes.push({
        step: stepCount++,
        nodeType: 'PON_PORT',
        nodeCode: `PON-${pon.portIdentifier}`,
        name: `Slot ${pon.slotNumber} Port ${pon.portNumber} (${pon.connectedOntsCount}/${pon.maxOnts} Subscribers)`,
        totalCapacity: pon.maxOnts,
        usedCapacity: pon.connectedOntsCount,
        status: pon.status,
        isConfigured: true,
      });
    }

    return {
      query: cleanQuery,
      searchType: 'olt',
      matchedTarget: {
        id: olt._id.toString(),
        label: `${olt.code} — ${olt.name}`,
        type: 'OLT',
      },
      oltName: olt.name,
      oltCode: olt.code,
      totalDistanceMeters: 0,
      estimatedTotalLossDb: 0,
      pathNodes,
      polylineCoordinates,
      isFullyLinked: true,
    };
  }

  /**
   * Helper to trace route directly from Customer ID
   */
  static async traceCustomerRoute(customerId: string): Promise<IRouteTraceResult> {
    const cust = await Customer.findById(customerId);
    if (!cust) throw new Error(`Customer not found with ID ${customerId}`);
    return this.traceElement(cust.tenantId.toString(), customerId, 'customer');
  }

  /**
   * Reverse Fault Impact: Determines all customers affected by a broken cable or faulty node
   */
  static async calculateFaultImpact(
    tenantId: string,
    componentType: 'FIBER_SEGMENT' | 'FIBER_NODE' | 'PON_PORT' | 'OLT',
    componentId: string
  ): Promise<IFaultImpactResult> {
    const tId = new Types.ObjectId(tenantId);
    let affectedCustomerQuery: any = { tenantId: tId };
    let componentCode = 'UNKNOWN';
    let componentName = 'Unknown Component';

    if (componentType === 'FIBER_NODE') {
      const node = await FiberNode.findOne({ _id: componentId, tenantId: tId });
      if (node) {
        componentCode = node.nodeCode;
        componentName = node.name;
        affectedCustomerQuery.$or = [
          { 'fiberDropInfo.fatBoxId': node._id },
          { 'fiberDropInfo.splitterId': node._id },
        ];
      }
    } else if (componentType === 'FIBER_SEGMENT') {
      const seg = await FiberSegment.findOne({ _id: componentId, tenantId: tId });
      if (seg) {
        componentCode = seg.cableCode;
        componentName = seg.name;
        affectedCustomerQuery.$or = [
          { 'fiberDropInfo.fatBoxId': seg.toNodeId },
          { 'fiberDropInfo.splitterId': seg.fromNodeId },
        ];
      }
    } else if (componentType === 'PON_PORT') {
      const pon = await PONPort.findOne({ _id: componentId, tenantId: tId });
      if (pon) {
        componentCode = `PON-${pon.portIdentifier}`;
        componentName = `PON Port ${pon.portIdentifier}`;
        affectedCustomerQuery['fiberDropInfo.ponPortId'] = pon._id;
      }
    } else if (componentType === 'OLT') {
      const olt = await OLT.findOne({ _id: componentId, tenantId: tId });
      if (olt) {
        componentCode = olt.code;
        componentName = olt.name;
        affectedCustomerQuery['fiberDropInfo.oltId'] = olt._id;
      }
    }

    const customers = await Customer.find(affectedCustomerQuery).populate('assignedDeviceId');

    const impactedList = customers.map((c) => {
      const dev = c.assignedDeviceId as any;
      return {
        customerId: c._id.toString(),
        accountNumber: c.accountNumber,
        name: c.fullName,
        phone: c.phone,
        address: `${c.address?.street || ''}, ${c.address?.area || ''}`.trim() || 'Address Not Configured',
        ontSerial: dev?.serialNumber,
        ontStatus: dev?.status,
        monthlyFee: c.servicePlan?.monthlyFee || 0,
      };
    });

    const totalRevenueAtRisk = impactedList.reduce((sum, item) => sum + item.monthlyFee, 0);

    return {
      faultComponentType: componentType,
      faultComponentCode: componentCode,
      faultName: componentName,
      totalImpactedCustomers: impactedList.length,
      impactedCustomers: impactedList,
      totalMonthlyRevenueAtRisk: totalRevenueAtRisk,
    };
  }

  /**
   * Retrieves all Real GIS spatial layers and Core Inventory Stats for a tenant
   */
  static async getMapLayers(tenantId: string) {
    const tId = new Types.ObjectId(tenantId);
    const [olts, pons, nodes, segments, customers] = await Promise.all([
      OLT.find({ tenantId: tId }),
      PONPort.find({ tenantId: tId }),
      FiberNode.find({ tenantId: tId }),
      FiberSegment.find({ tenantId: tId }).populate('fromNodeId toNodeId'),
      Customer.find({ tenantId: tId }).populate('assignedDeviceId'),
    ]);

    // Fiber Core Capacity Aggregation
    const totalCores = segments.reduce((sum, s) => sum + (s.totalCores || 0), 0);
    const liveCores = segments.reduce((sum, s) => sum + (s.liveCores || 0), 0);
    const darkCores = segments.reduce((sum, s) => sum + (s.darkCores ?? Math.max(0, (s.totalCores || 0) - (s.liveCores || 0))), 0);
    const totalFiberLengthMeters = segments.reduce((sum, s) => sum + (s.lengthMeters || 0), 0);

    return {
      summary: {
        totalOlts: olts.length,
        totalPonPorts: pons.length,
        totalNodes: nodes.length,
        totalSegments: segments.length,
        totalCustomers: customers.length,
        totalFiberLengthMeters,
        coreMetrics: {
          totalCores,
          liveCores,
          darkCores,
          utilizationPercent: totalCores > 0 ? Number(((liveCores / totalCores) * 100).toFixed(1)) : 0,
        },
      },
      olts: olts.map((o) => ({
        id: o._id,
        code: o.code,
        name: o.name,
        ipAddress: o.ipAddress,
        vendor: o.vendor,
        modelName: o.modelName,
        totalSlots: o.totalSlots,
        totalPonPorts: o.totalPonPorts,
        status: o.status,
        lat: o.location?.lat || 0,
        lng: o.location?.lng || 0,
        address: o.location?.address || 'Not Configured',
        elevationMeters: o.location?.elevationMeters || 0,
        photos: o.photos || [],
        hasGps: Boolean(o.location?.lat && o.location?.lng),
      })),
      pons: pons.map((p) => ({
        id: p._id,
        oltId: p.oltId,
        portIdentifier: p.portIdentifier,
        slotNumber: p.slotNumber,
        portNumber: p.portNumber,
        splitRatio: p.splitRatio,
        txPowerDbm: p.txPowerDbm,
        maxOnts: p.maxOnts,
        connectedOntsCount: p.connectedOntsCount,
        onlineOntsCount: p.onlineOntsCount,
        status: p.status,
      })),
      nodes: nodes.map((n) => ({
        id: n._id,
        code: n.nodeCode,
        name: n.name,
        type: n.type,
        status: n.status,
        totalCapacity: n.totalCapacity,
        usedCapacity: n.usedCapacity,
        darkCores: Math.max(0, n.totalCapacity - n.usedCapacity),
        liveCores: n.usedCapacity,
        lat: n.location?.lat || 0,
        lng: n.location?.lng || 0,
        address: n.location?.address || 'Not Configured',
        elevationMeters: n.location?.elevationMeters || 0,
        upstreamNodeId: n.upstreamNodeId,
        ponPortId: n.ponPortId,
        oltId: n.oltId,
        photos: n.photos || [],
        notes: n.notes,
        hasGps: Boolean(n.location?.lat && n.location?.lng),
      })),
      segments: segments.map((s) => ({
        id: s._id,
        code: s.cableCode,
        name: s.name,
        category: s.category,
        fiberStandard: s.fiberStandard,
        totalCores: s.totalCores,
        liveCores: s.liveCores,
        darkCores: s.darkCores,
        lengthMeters: s.lengthMeters,
        attenuationDbPerKm: s.attenuationDbPerKm,
        measuredLossDb: s.measuredLossDb,
        fromNodeId: s.fromNodeId,
        toNodeId: s.toNodeId,
        photos: s.photos || [],
        status: s.status,
        coordinates: s.coordinates || [],
        hasCoordinates: Boolean(s.coordinates && s.coordinates.length > 0),
      })),
      customers: customers.map((c) => {
        const dev = c.assignedDeviceId as any;
        const hasGps = Boolean(c.address?.coordinates?.lat && c.address?.coordinates?.lng);
        return {
          id: c._id,
          accountNumber: c.accountNumber,
          serviceId: c.serviceId,
          name: c.fullName,
          phone: c.phone,
          status: c.status,
          plan: c.servicePlan?.name,
          lat: c.address?.coordinates?.lat || 0,
          lng: c.address?.coordinates?.lng || 0,
          address: `${c.address?.street || ''}, ${c.address?.area || ''}`.trim() || 'Not Configured',
          hasGps,
          ontSerial: dev?.serialNumber,
          ontStatus: dev?.status,
          rxPowerDbm: dev?.currentRxPowerDbm,
          txPowerDbm: dev?.currentTxPowerDbm,
          fatBoxId: c.fiberDropInfo?.fatBoxId,
          fatPortNumber: c.fiberDropInfo?.fatPortNumber,
          splitterId: c.fiberDropInfo?.splitterId,
          ponPortId: c.fiberDropInfo?.ponPortId,
          oltId: c.fiberDropInfo?.oltId,
          dropCableLengthMeters: c.fiberDropInfo?.dropCableLengthMeters,
          isLinked: Boolean(c.fiberDropInfo?.fatBoxId || c.fiberDropInfo?.oltId),
        };
      }),
    };
  }
}

