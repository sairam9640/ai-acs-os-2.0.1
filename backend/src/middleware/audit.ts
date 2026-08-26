import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'pppoePassword',
  'pppoePasswordEncrypted',
  'otpCode',
  'otpSecret',
  'secret',
  'token',
  'apiKey',
  'cwmpPassword',
]);

export const sanitizePayload = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key) || key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
      sanitized[key] = '********';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const recordAuditLog = async ({
  tenantId,
  actorId,
  actorEmail,
  actorRole,
  action,
  targetResource,
  targetId,
  targetIdentifier,
  beforeState,
  afterState,
  correlationId,
  ipAddress = '127.0.0.1',
  userAgent = '',
  result = 'SUCCESS',
  failureReason,
}: {
  tenantId?: Types.ObjectId | string;
  actorId: Types.ObjectId | string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetResource: string;
  targetId: string;
  targetIdentifier?: string;
  beforeState?: any;
  afterState?: any;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
  result?: 'SUCCESS' | 'FAILURE' | 'BLOCKED_BY_POLICY';
  failureReason?: string;
}) => {
  try {
    await AuditLog.create({
      tenantId: tenantId && Types.ObjectId.isValid(tenantId) ? new Types.ObjectId(tenantId) : undefined,
      actorId: Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : new Types.ObjectId(),
      actorEmail,
      actorRole,
      action,
      targetResource,
      targetId,
      targetIdentifier,
      beforeStateSanitized: sanitizePayload(beforeState),
      afterStateSanitized: sanitizePayload(afterState),
      correlationId: correlationId || `corr_${Date.now()}`,
      ipAddress,
      userAgent,
      result,
      failureReason,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
