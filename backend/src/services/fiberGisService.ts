import { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer.js';
import { Device, IDevice } from '../models/Device.js';
import { OLT, PONPort, FiberNode, FiberSegment, IFiberNode, IFiberSegment } from '../models/FiberTopology.js';

export interface IRouteTraceSegment {
  step: number;
  nodeType: string;
  nodeCode: string;
  name: string;
  coordinates: { lat: number; lng: number };
  segmentLengthMeters?: number;
  segmentLossDb?: number;
  cableCode?: string;
  status: string;
}

export interface IRouteTraceResult {
  customerId: string;
  customerName: string;
  serviceId: string;
  ontSerial?: string;
  currentRxPowerDbm?: number;
  oltName: string;
  ponPortIdentifier: string;
  totalDistanceMeters: number;
  estimatedTotalLossDb: number;
  pathNodes: IRouteTraceSegment[];
  polylineCoordinates: Array<{ lat: number; lng: number }>;
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
   * Traces end-to-end physical route from Customer ONT to OLT PON port
   */
  static async traceCustomerRoute(customerId: string): Promise<IRouteTraceResult> {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error(`Customer not found with ID ${customerId}`);

    const device = customer.assignedDeviceId ? await Device.findById(customer.assignedDeviceId) : null;
    const pathNodes: IRouteTraceSegment[] = [];
    const polyline: Array<{ lat: number; lng: number }> = [];
    let totalDistance = 0;
    let totalLoss = 0;

    // Step 1: Customer Endpoint
    pathNodes.push({
      step: 1,
      nodeType: 'CUSTOMER_PREMISE',
      nodeCode: customer.accountNumber,
      name: customer.fullName,
      coordinates: customer.address.coordinates,
      status: customer.status,
    });
    polyline.push(customer.address.coordinates);

    // Step 2: Traverse Upstream Fiber Nodes
    let currentNodeId = (customer.fiberDropInfo as any)?.fatBoxId || (customer.fiberDropInfo as any)?.fatBoxNodeId;
    let stepCount = 2;

    while (currentNodeId) {
      const node: IFiberNode | null = await FiberNode.findById(currentNodeId);
      if (!node) break;

      pathNodes.push({
        step: stepCount++,
        nodeType: node.type,
        nodeCode: node.nodeCode,
        name: node.name,
        coordinates: { lat: node.location.lat, lng: node.location.lng },
        status: node.status,
      });
      polyline.push({ lat: node.location.lat, lng: node.location.lng });

      // Find cable segment connected to this node
      const segment: IFiberSegment | null = await FiberSegment.findOne({
        $or: [{ toNodeId: node._id }, { fromNodeId: node._id }],
      });

      if (segment) {
        totalDistance += segment.lengthMeters;
        totalLoss += segment.measuredLossDb;
        if (segment.coordinates && segment.coordinates.length > 0) {
          for (const pt of segment.coordinates) {
            polyline.push(pt);
          }
        }
      }

      // Check if reached OLT or upstream node
      if (node.upstreamNodeId) {
        currentNodeId = node.upstreamNodeId;
      } else if (node.oltId) {
        const olt = await OLT.findById(node.oltId);
        if (olt) {
          pathNodes.push({
            step: stepCount++,
            nodeType: 'OLT_CHASSIS',
            nodeCode: olt.code,
            name: `${olt.vendor} ${olt.modelName} (${olt.name})`,
            coordinates: { lat: olt.location.lat, lng: olt.location.lng },
            status: olt.status,
          });
          polyline.push({ lat: olt.location.lat, lng: olt.location.lng });
        }
        break;
      } else {
        break;
      }
    }

    const oltInfo = customer.fiberDropInfo?.oltId ? await OLT.findById(customer.fiberDropInfo.oltId) : null;
    const ponInfo = customer.fiberDropInfo?.ponPortId ? await PONPort.findById(customer.fiberDropInfo.ponPortId) : null;

    return {
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      serviceId: customer.serviceId,
      ontSerial: device?.serialNumber,
      currentRxPowerDbm: device?.currentRxPowerDbm,
      oltName: oltInfo ? oltInfo.name : 'Central OLT 01',
      ponPortIdentifier: ponInfo ? ponInfo.portIdentifier : '0/1/1',
      totalDistanceMeters: totalDistance || 420,
      estimatedTotalLossDb: totalLoss || 2.4,
      pathNodes,
      polylineCoordinates: polyline,
    };
  }

  /**
   * Reverse Fault Impact: Determines all customers affected by a broken cable or faulty node
   */
  static async calculateFaultImpact(
    tenantId: string,
    componentType: 'FIBER_SEGMENT' | 'FIBER_NODE' | 'PON_PORT' | 'OLT',
    componentId: string
  ): Promise<IFaultImpactResult> {
    let affectedCustomerQuery: any = { tenantId: new Types.ObjectId(tenantId) };
    let componentCode = 'UNKNOWN';
    let componentName = 'Unknown Component';

    if (componentType === 'FIBER_NODE') {
      const node = await FiberNode.findById(componentId);
      if (node) {
        componentCode = node.nodeCode;
        componentName = node.name;
        affectedCustomerQuery.$or = [
          { 'fiberDropInfo.fatBoxId': node._id },
          { 'fiberDropInfo.splitterId': node._id },
        ];
      }
    } else if (componentType === 'FIBER_SEGMENT') {
      const seg = await FiberSegment.findById(componentId);
      if (seg) {
        componentCode = seg.cableCode;
        componentName = seg.name;
        affectedCustomerQuery.$or = [
          { 'fiberDropInfo.fatBoxId': seg.toNodeId },
          { 'fiberDropInfo.splitterId': seg.fromNodeId },
        ];
      }
    } else if (componentType === 'PON_PORT') {
      const pon = await PONPort.findById(componentId);
      if (pon) {
        componentCode = `PON-${pon.portIdentifier}`;
        componentName = `PON Port ${pon.portIdentifier}`;
        affectedCustomerQuery['fiberDropInfo.ponPortId'] = pon._id;
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
        address: `${c.address.street}, ${c.address.area}`,
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
   * Retrieves all GIS spatial layers for a tenant
   */
  static async getMapLayers(tenantId: string) {
    const tId = new Types.ObjectId(tenantId);
    const [olts, nodes, segments, customers] = await Promise.all([
      OLT.find({ tenantId: tId }),
      FiberNode.find({ tenantId: tId }),
      FiberSegment.find({ tenantId: tId }).populate('fromNodeId toNodeId'),
      Customer.find({ tenantId: tId }).populate('assignedDeviceId'),
    ]);

    return {
      olts: olts.map((o) => ({
        id: o._id,
        code: o.code,
        name: o.name,
        vendor: o.vendor,
        status: o.status,
        lat: o.location.lat,
        lng: o.location.lng,
      })),
      nodes: nodes.map((n) => ({
        id: n._id,
        code: n.nodeCode,
        name: n.name,
        type: n.type,
        status: n.status,
        totalCapacity: n.totalCapacity,
        usedCapacity: n.usedCapacity,
        lat: n.location.lat,
        lng: n.location.lng,
      })),
      segments: segments.map((s) => ({
        id: s._id,
        code: s.cableCode,
        name: s.name,
        category: s.category,
        totalCores: s.totalCores,
        lengthMeters: s.lengthMeters,
        status: s.status,
        coordinates: s.coordinates,
      })),
      customers: customers.map((c) => {
        const dev = c.assignedDeviceId as any;
        return {
          id: c._id,
          accountNumber: c.accountNumber,
          name: c.fullName,
          phone: c.phone,
          status: c.status,
          plan: c.servicePlan?.name,
          lat: c.address.coordinates?.lat || 0,
          lng: c.address.coordinates?.lng || 0,
          ontSerial: dev?.serialNumber,
          ontStatus: dev?.status,
          rxPowerDbm: dev?.currentRxPowerDbm,
        };
      }),
    };
  }
}
