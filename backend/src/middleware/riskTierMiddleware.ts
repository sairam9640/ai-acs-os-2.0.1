import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './tenantIsolation.js';
import { ErrorEnvelopeService } from '../services/errorEnvelope.js';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskPolicy {
  riskLevel: RiskLevel;
  requiredPermission?: string;
  requireConfirmation?: boolean;
  requireApproval?: boolean;
}

export function enforceRiskTier(policy: RiskPolicy) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return ErrorEnvelopeService.formatError(res, 'UNAUTHORIZED', 'Authentication required for operation', 401);
    }

    // 1. Permission check
    if (policy.requiredPermission && !user.permissions?.includes('ALL') && !user.permissions?.includes(policy.requiredPermission)) {
      return ErrorEnvelopeService.formatError(res, 'FORBIDDEN', `Missing required permission: ${policy.requiredPermission}`, 403);
    }

    // 2. High / Critical risk approval validation
    if (policy.riskLevel === 'HIGH' || policy.riskLevel === 'CRITICAL') {
      const isConfirmed = req.headers['x-confirm-action'] === 'true' || req.body?.confirmed === true;
      if (policy.requireConfirmation && !isConfirmed) {
        return ErrorEnvelopeService.formatError(
          res,
          'VALIDATION_ERROR',
          `High-risk operation [${policy.riskLevel}] requires explicit user confirmation header (X-Confirm-Action: true)`,
          400
        );
      }
    }

    next();
  };
}
