import { Types } from 'mongoose';
import { OLT, PONPort, FiberNode, FiberSegment, IOLT, IPONPort, IFiberNode, IFiberSegment } from '../models/FiberTopology.js';

export class FiberTopologyRepository {
  /**
   * Finds a fiber node by ID with tenant scoping
   */
  static async findNodeById(tenantId: Types.ObjectId | string, nodeId: Types.ObjectId | string): Promise<IFiberNode | null> {
    return FiberNode.findOne({
      _id: new Types.ObjectId(nodeId),
      tenantId: new Types.ObjectId(tenantId),
    }).populate('upstreamNodeId', 'nodeCode name nodeType coordinates');
  }

  /**
   * Finds node by code within tenant
   */
  static async findNodeByCode(tenantId: Types.ObjectId | string, nodeCode: string): Promise<IFiberNode | null> {
    return FiberNode.findOne({
      tenantId: new Types.ObjectId(tenantId),
      nodeCode,
    });
  }

  /**
   * Lists all OLT chassis within tenant
   */
  static async listOlts(tenantId: Types.ObjectId | string): Promise<IOLT[]> {
    return OLT.find({ tenantId: new Types.ObjectId(tenantId) }).sort({ name: 1 });
  }

  /**
   * Lists PON ports for an OLT
   */
  static async listPonPortsByOlt(tenantId: Types.ObjectId | string, oltId: Types.ObjectId | string): Promise<IPONPort[]> {
    return PONPort.find({
      tenantId: new Types.ObjectId(tenantId),
      oltId: new Types.ObjectId(oltId),
    }).sort({ slotNumber: 1, portNumber: 1 });
  }

  /**
   * Finds immediate downstream nodes attached to a parent node
   */
  static async listDownstreamNodes(tenantId: Types.ObjectId | string, parentNodeId: Types.ObjectId | string): Promise<IFiberNode[]> {
    return FiberNode.find({
      tenantId: new Types.ObjectId(tenantId),
      upstreamNodeId: new Types.ObjectId(parentNodeId),
    });
  }

  /**
   * Creates a fiber topology node
   */
  static async createNode(nodeData: Partial<IFiberNode> & { tenantId: Types.ObjectId | string }): Promise<IFiberNode> {
    return FiberNode.create({
      ...nodeData,
      tenantId: new Types.ObjectId(nodeData.tenantId),
    });
  }

  /**
   * Creates a fiber cable segment
   */
  static async createSegment(segmentData: Partial<IFiberSegment> & { tenantId: Types.ObjectId | string }): Promise<IFiberSegment> {
    return FiberSegment.create({
      ...segmentData,
      tenantId: new Types.ObjectId(segmentData.tenantId),
    });
  }
}
