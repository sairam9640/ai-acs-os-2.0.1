import { Response } from 'express';

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_SUPPORTED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DEVICE_OFFLINE'
  | 'TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'VERIFICATION_FAILED';

export interface ApiErrorDetails {
  code: ApiErrorCode;
  message: string;
  requestId: string;
  correlationId?: string;
  retryable: boolean;
  details?: Record<string, any>;
}

export class ApiError extends Error {
  public code: ApiErrorCode;
  public statusCode: number;
  public retryable: boolean;
  public details?: Record<string, any>;

  constructor(code: ApiErrorCode, message: string, statusCode = 400, retryable = false, details?: Record<string, any>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}

export class ErrorEnvelopeService {
  /**
   * Formats a standardized JSON error response
   */
  static formatError(
    res: Response,
    code: ApiErrorCode,
    message: string,
    statusCode = 400,
    options: {
      requestId?: string;
      correlationId?: string;
      retryable?: boolean;
      details?: Record<string, any>;
    } = {}
  ) {
    const errorPayload: ApiErrorDetails = {
      code,
      message,
      requestId: options.requestId || `req_${Date.now()}`,
      correlationId: options.correlationId || `corr_${Date.now()}`,
      retryable: options.retryable ?? (statusCode >= 500 || code === 'TIMEOUT'),
      details: options.details,
    };

    return res.status(statusCode).json({
      success: false,
      error: errorPayload,
    });
  }
}
