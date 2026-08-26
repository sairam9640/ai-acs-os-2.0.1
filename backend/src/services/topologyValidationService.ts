import { Types } from 'mongoose';
import { FiberNode, FiberSegment } from '../models/FiberTopology.js';
import { Customer } from '../models/Customer.js';

export interface TopologyValidationError {
  category: 'ORPHAN_NODE' | 'DANGLING_ENDPOINT' | 'MISSING_COORDINATES' | 'CAPACITY_EXHAUSTION';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  resourceId: string;
  resourceCode: string;
  description: string;
}

export interface TopologyQualityReport {
  tenantId: string;
  evaluatedAt: Date;
  totalNodes: number;
  totalSegments: number;
  dataQualityScore: number;
  grade: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'POOR';
  validationErrors: TopologyValidationError[];
}

export class TopologyValidationService {
  /**
   * Scans tenant topology for orphan nodes, dangling drops, and calculates a Data Quality Score
   */
  static async evaluateTopologyQuality(tenantId: Types.ObjectId | string): Promise<TopologyQualityReport> {
    const tId = new Types.ObjectId(tenantId);
    const validationErrors: TopologyValidationError[] = [];

    const [nodes, segments, customers] = await Promise.all([
      FiberNode.find({ tenantId: tId }),
      FiberSegment.find({ tenantId: tId }),
      Customer.find({ tenantId: tId }),
    ]);

    // 1. Audit Nodes for Orphan Status or Missing Parent Linkages
    for (const nodeDoc of nodes) {
      const node: any = nodeDoc;
      const nodeType = node.type || node.nodeType;
      const isCentralOffice =
        nodeType === 'CENTRAL_OFFICE' ||
        node.type === 'CENTRAL_OFFICE' ||
        node.nodeType === 'CENTRAL_OFFICE' ||
        Boolean(node.oltId) ||
        (node.nodeCode && String(node.nodeCode).startsWith('CO-'));

      if (!isCentralOffice && !node.upstreamNodeId) {
        validationErrors.push({
          category: 'ORPHAN_NODE',
          severity: 'CRITICAL',
          resourceId: node._id.toString(),
          resourceCode: node.nodeCode,
          description: `Node [${node.name}] has no upstream feeder/splitter parent connection.`,
        });
      }

      const hasCoordinates = (node.location?.lat && node.location?.lng) || (node.coordinates?.lat && node.coordinates?.lng);
      if (!hasCoordinates) {
        validationErrors.push({
          category: 'MISSING_COORDINATES',
          severity: 'WARNING',
          resourceId: node._id.toString(),
          resourceCode: node.nodeCode,
          description: `Node [${node.name}] has missing or invalid GPS coordinates.`,
        });
      }
    }

    // 2. Audit Customers for Unlinked FAT Box Endpoints
    for (const cust of customers) {
      const drop: any = cust.fiberDropInfo;
      if (!drop?.fatBoxId && !drop?.fatBoxNodeId) {
        validationErrors.push({
          category: 'DANGLING_ENDPOINT',
          severity: 'WARNING',
          resourceId: cust._id.toString(),
          resourceCode: cust.accountNumber,
          description: `Subscriber [${cust.fullName}] has no physical FAT/NAP box drop assignment.`,
        });
      }
    }

    // Compute Data Quality Score (0–100)
    let score = 100;
    for (const err of validationErrors) {
      if (err.severity === 'CRITICAL') score -= 15;
      else if (err.severity === 'WARNING') score -= 5;
      else score -= 1;
    }
    score = Math.max(0, score);

    let grade: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'POOR' = 'EXCELLENT';
    if (score >= 90) grade = 'EXCELLENT';
    else if (score >= 75) grade = 'GOOD';
    else if (score >= 50) grade = 'NEEDS_ATTENTION';
    else grade = 'POOR';

    return {
      tenantId: tId.toString(),
      evaluatedAt: new Date(),
      totalNodes: nodes.length,
      totalSegments: segments.length,
      dataQualityScore: score,
      grade,
      validationErrors,
    };
  }
}
