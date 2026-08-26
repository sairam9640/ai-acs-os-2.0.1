import { Types } from 'mongoose';
import { Device } from '../models/Device.js';
import { FiberGisService } from './fiberGisService.js';
import { ApprovalPolicyService } from './approvalPolicyService.js';
import { HighRiskActionType } from '../models/ApprovalPolicy.js';

export interface ToolDefinition {
  name: string;
  description: string;
  isPrivileged: boolean;
  parameters: Record<string, string>;
}

export class AIToolRegistry {
  private static registeredTools: Record<string, ToolDefinition> = {
    getDeviceTelemetry: {
      name: 'getDeviceTelemetry',
      description: 'Fetches live optical RX/TX power, Wi-Fi configuration, and uptime for a subscriber ONT.',
      isPrivileged: false,
      parameters: { deviceId: 'string (MongoDB ID)' },
    },
    traceFiberRoute: {
      name: 'traceFiberRoute',
      description: 'Traces the complete physical fiber path from customer endpoint up to Central Office OLT.',
      isPrivileged: false,
      parameters: { customerId: 'string (MongoDB ID)' },
    },
    checkPonAlarms: {
      name: 'checkPonAlarms',
      description: 'Inspects alarms and optical health across all ONTs attached to a PON port.',
      isPrivileged: false,
      parameters: { ponPortId: 'string (MongoDB ID)' },
    },
    proposeRemediation: {
      name: 'proposeRemediation',
      description: 'Proposes an operational action (e.g. Reboot, Wi-Fi Reset) for human administrator review.',
      isPrivileged: true,
      parameters: {
        actionType: 'REBOOT_DEVICE | DELETE_WAN_PROFILE | FIRMWARE_UPGRADE',
        targetId: 'string',
        targetResource: 'string',
        reason: 'string',
      },
    },
  };

  /**
   * Returns metadata for all available safe tools
   */
  static getAvailableTools(): ToolDefinition[] {
    return Object.values(this.registeredTools);
  }

  /**
   * Executes a tool with strict tenant isolation and safety guards
   */
  static async executeTool({
    tenantId,
    toolName,
    args,
    user,
  }: {
    tenantId: string;
    toolName: string;
    args: Record<string, any>;
    user: { id: string; role: string; email: string };
  }): Promise<{ success: boolean; data?: any; error?: string; requiresHumanApproval?: boolean }> {
    // Verify tool exists
    const tool = this.registeredTools[toolName];
    if (!tool) {
      return { success: false, error: `Unauthorized or unknown tool: ${toolName}` };
    }

    try {
      switch (toolName) {
        case 'getDeviceTelemetry': {
          if (!args.deviceId) return { success: false, error: 'deviceId is required' };
          const dev = await Device.findOne({
            _id: new Types.ObjectId(args.deviceId),
            tenantId: new Types.ObjectId(tenantId),
          }).select('serialNumber manufacturer modelName currentRxPowerDbm currentTxPowerDbm status uptimeSeconds wifi24 wifi5g');

          if (!dev) return { success: false, error: 'Device not found in tenant context' };
          return { success: true, data: dev };
        }

        case 'traceFiberRoute': {
          if (!args.customerId) return { success: false, error: 'customerId is required' };
          const trace = await FiberGisService.traceCustomerRoute(args.customerId);
          return { success: true, data: trace };
        }

        case 'checkPonAlarms': {
          if (!args.ponPortId) return { success: false, error: 'ponPortId is required' };
          const devices = await Device.find({
            tenantId: new Types.ObjectId(tenantId),
            ponPortId: new Types.ObjectId(args.ponPortId),
          }).select('serialNumber currentRxPowerDbm status opticalStatus');

          return { success: true, data: { ponPortId: args.ponPortId, connectedDevices: devices } };
        }

        case 'proposeRemediation': {
          const { actionType, targetId, targetResource, targetIdentifier, reason } = args;
          const approvalReq = await ApprovalPolicyService.createApprovalRequest({
            tenantId,
            actionType: actionType as HighRiskActionType,
            targetResource: targetResource || 'Device',
            targetId,
            targetIdentifier: targetIdentifier || targetId,
            requestedBy: {
              userId: user.id,
              fullName: `AI Assistant (${user.email})`,
              email: user.email,
              role: user.role,
            },
            reason: reason || 'AI diagnostic remediation recommendation',
            parameters: args.parameters || {},
          });

          return {
            success: true,
            requiresHumanApproval: true,
            data: {
              approvalRequestId: approvalReq._id.toString(),
              requestNumber: approvalReq.requestNumber,
              status: approvalReq.status,
              message: 'Action submitted to Approvals Gate. Human administrator authorization is required before execution.',
            },
          };
        }

        default:
          return { success: false, error: `Handler for ${toolName} not implemented` };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
