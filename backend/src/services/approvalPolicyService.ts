import { Types } from 'mongoose';
import { ApprovalPolicy, ApprovalRequest, HighRiskActionType, IApprovalRequest } from '../models/ApprovalPolicy.js';
import { DeviceManagementService } from './deviceManagementService.js';
import { recordAuditLog } from '../middleware/audit.js';

export class ApprovalPolicyService {
  /**
   * Checks if an action requires approval under the tenant's policy
   */
  static async requiresApproval(
    tenantId: Types.ObjectId | string,
    action: HighRiskActionType,
    userRole: string
  ): Promise<boolean> {
    // Super admin bypasses approval
    if (userRole === 'super_admin') return false;

    const policy = await ApprovalPolicy.findOne({ tenantId: new Types.ObjectId(tenantId) });
    if (!policy) return false;

    switch (action) {
      case 'REBOOT_DEVICE':
        return policy.requireApprovalForReboot;
      case 'DELETE_WAN_PROFILE':
        return policy.requireApprovalForWanDelete;
      case 'FIRMWARE_UPGRADE':
        return policy.requireApprovalForFirmware;
      case 'FACTORY_RESET':
        return policy.requireApprovalForReset;
      case 'BULK_CONFIGURATION':
        return policy.requireApprovalForBulk;
      default:
        return false;
    }
  }

  /**
   * Creates an approval request holding the action in pending state
   */
  static async createApprovalRequest({
    tenantId,
    actionType,
    targetResource,
    targetId,
    targetIdentifier,
    requestedBy,
    reason,
    parameters,
    previousState,
  }: {
    tenantId: Types.ObjectId | string;
    actionType: HighRiskActionType;
    targetResource: string;
    targetId: Types.ObjectId | string;
    targetIdentifier: string;
    requestedBy: { userId: string; fullName: string; email: string; role: string };
    reason?: string;
    parameters: Record<string, any>;
    previousState?: Record<string, any>;
  }): Promise<IApprovalRequest> {
    const requestNumber = `APR-${Date.now().toString().slice(-6)}`;

    const approvalReq = await ApprovalRequest.create({
      tenantId: new Types.ObjectId(tenantId),
      requestNumber,
      actionType,
      targetResource,
      targetId: Types.ObjectId.isValid(targetId) ? new Types.ObjectId(targetId) : new Types.ObjectId(),
      targetIdentifier,
      requestedBy: {
        userId: Types.ObjectId.isValid(requestedBy.userId) ? new Types.ObjectId(requestedBy.userId) : new Types.ObjectId(),
        fullName: requestedBy.fullName,
        email: requestedBy.email,
        role: requestedBy.role,
      },
      reason: reason || 'Scheduled network maintenance operation',
      parameters,
      previousState,
      status: 'pending',
    });

    return approvalReq;
  }

  /**
   * Approves or rejects a pending request
   */
  static async decideRequest({
    requestId,
    decision,
    approver,
    decisionNotes,
  }: {
    requestId: string;
    decision: 'approved' | 'rejected';
    approver: { userId: string; fullName: string; email: string; role: string };
    decisionNotes?: string;
  }) {
    const request = await ApprovalRequest.findById(requestId);
    if (!request) throw new Error('Approval request not found');
    if (request.status !== 'pending') throw new Error(`Request is already ${request.status}`);

    request.status = decision;
    request.decisionBy = {
      userId: Types.ObjectId.isValid(approver.userId) ? new Types.ObjectId(approver.userId) : new Types.ObjectId(),
      fullName: approver.fullName,
      email: approver.email,
      role: approver.role,
    };
    request.decisionNotes = decisionNotes;
    request.decisionAt = new Date();

    if (decision === 'approved') {
      // Execute the underlying command
      const cmdResult = await DeviceManagementService.queueAndExecuteCommand({
        tenantId: request.tenantId,
        deviceId: request.targetId,
        action: request.actionType as any,
        parameters: request.parameters,
        user: { id: approver.userId, role: approver.role, email: approver.email },
        correlationId: `apr_exec_${request.requestNumber}`,
      });
      if (cmdResult?.commandId && Types.ObjectId.isValid(cmdResult.commandId)) {
        request.executedCommandId = new Types.ObjectId(cmdResult.commandId);
      }
    }

    await request.save();

    await recordAuditLog({
      tenantId: request.tenantId,
      actorId: approver.userId,
      actorEmail: approver.email,
      actorRole: approver.role,
      action: `APPROVAL_${decision.toUpperCase()}`,
      targetResource: request.targetResource,
      targetId: request.targetId.toString(),
      targetIdentifier: request.targetIdentifier,
      afterState: { decision, notes: decisionNotes },
      correlationId: `apr_audit_${request.requestNumber}`,
    });

    return request;
  }
}
