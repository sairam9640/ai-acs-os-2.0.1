import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from './tenantIsolation.js';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-isp-os-master-enterprise-secret-key-2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  permissions: string[];
  sessionId?: string;
}

export const generateToken = (payload: TokenPayload, expiresIn: any = '8h'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as any);
};

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required. Please sign in.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Verify user exists in database and is active
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Session expired or user account is deactivated.',
      });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      tenantId: user.tenantId?.toString(),
      permissions: user.permissions || [],
    };

    // If request did not have explicit tenantId but user belongs to a tenant, set it
    if (!req.tenantId && user.tenantId) {
      req.tenantId = user.tenantId.toString();
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.',
    });
  }
};
