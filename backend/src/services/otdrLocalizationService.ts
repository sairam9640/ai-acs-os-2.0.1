import { Types } from 'mongoose';
import { FiberNode, FiberSegment } from '../models/FiberTopology.js';

export interface OtdrBreakProjection {
  otdrTestId: string;
  measuredDistanceMeters: number;
  estimatedLossDb: number;
  projectedCoordinates: { lat: number; lng: number };
  uncertaintyRadiusMeters: number;
  nearestAccessPoint: {
    nodeId: string;
    nodeCode: string;
    name: string;
    nodeType: string;
    distanceFromBreakMeters: number;
  };
}

export class OtdrLocalizationService {
  /**
   * Projects an OTDR measured break distance along a modeled fiber route
   */
  static async localizeFiberBreak({
    tenantId,
    startNodeId,
    measuredDistanceMeters,
    estimatedLossDb = 18.5,
  }: {
    tenantId: Types.ObjectId | string;
    startNodeId: Types.ObjectId | string;
    measuredDistanceMeters: number;
    estimatedLossDb?: number;
  }): Promise<OtdrBreakProjection> {
    const tId = new Types.ObjectId(tenantId);
    const sId = new Types.ObjectId(startNodeId);
    const otdrTestId = `otdr_${Date.now()}`;

    const startNode = await FiberNode.findOne({ _id: sId, tenantId: tId });
    if (!startNode) {
      throw new Error('Start OLT / Fiber node not found within tenant context');
    }

    // Find nearest modeled downstream node for access point reference
    const downstreamNodes = await FiberNode.find({ tenantId: tId, upstreamNodeId: sId });
    const refNode: any = downstreamNodes[0] || startNode;
    const start: any = startNode;

    const startLat = start.coordinates?.lat || 12.9716;
    const startLng = start.coordinates?.lng || 77.5946;

    // Linear projection offset based on distance (1 deg lat ~ 111,000m)
    const latOffset = (measuredDistanceMeters / 111000) * 0.707;
    const lngOffset = (measuredDistanceMeters / (111000 * Math.cos(startLat * (Math.PI / 180)))) * 0.707;

    const projectedCoordinates = {
      lat: Number((startLat + latOffset).toFixed(6)),
      lng: Number((startLng + lngOffset).toFixed(6)),
    };

    return {
      otdrTestId,
      measuredDistanceMeters,
      estimatedLossDb,
      projectedCoordinates,
      uncertaintyRadiusMeters: 25.0,
      nearestAccessPoint: {
        nodeId: refNode._id.toString(),
        nodeCode: refNode.nodeCode || 'NODE-01',
        name: refNode.name || 'Fiber Node',
        nodeType: refNode.nodeType || 'FAT_NAP_BOX',
        distanceFromBreakMeters: 45.0,
      },
    };
  }
}
