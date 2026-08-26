import { Request, Response, NextFunction } from 'express';
import { Tenant, ITenant } from '../models/Tenant.js';

export interface AuthenticatedRequest extends Request {
  tenant?: ITenant;
  tenantId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
    permissions: string[];
  };
  correlationId?: string;
}

export const resolveTenantContext = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Generate or extract Correlation ID
    req.correlationId = (req.headers['x-correlation-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    res.setHeader('x-correlation-id', req.correlationId);

    // 1. Check x-tenant-slug header
    let slug = req.headers['x-tenant-slug'] as string;

    // 2. If not in header, check hostname (e.g. "rudra.ai-ispos.com" -> slug "rudra")
    if (!slug && req.hostname) {
      const parts = req.hostname.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'admin') {
        slug = parts[0];
      }
    }

    // 3. If present in query param
    if (!slug && req.query.tenantSlug) {
      slug = req.query.tenantSlug as string;
    }

    if (slug) {
      const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
      if (tenant) {
        if (tenant.status === 'suspended') {
          return res.status(403).json({
            success: false,
            error: 'Tenant account is currently suspended. Please contact administrator.',
          });
        }
        req.tenant = tenant;
        req.tenantId = tenant._id.toString();
      }
    }

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    next();
  }
};

/**
 * Enforces that the request MUST have an active tenant context and that the authenticated user
 * belongs to that tenant (or is a Super Admin).
 */
export const requireTenant = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // If user has a tenantId, align req.tenantId with user's tenantId if not super_admin
  if (req.user && req.user.role !== 'super_admin' && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  }

  if (!req.tenant && !req.tenantId) {
    if (req.user?.role === 'super_admin') {
      return next();
    }
    return res.status(400).json({
      success: false,
      error: 'Tenant context is required for this operation. Please specify x-tenant-slug.',
    });
  }

  next();
};
