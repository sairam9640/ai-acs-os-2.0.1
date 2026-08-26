import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './tenantIsolation.js';
import { UserRole } from '../models/User.js';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Super Admin can access all operator roles
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        success: false,
        error: `Permission Denied: Your role (${req.user.role}) does not have access to this resource. Required: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    const hasPerm = req.user.permissions && req.user.permissions.includes(permission);
    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        error: `Permission Denied: Missing required capability '${permission}'.`,
      });
    }

    next();
  };
};
