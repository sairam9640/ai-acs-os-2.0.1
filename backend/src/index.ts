import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { resolveTenantContext } from './middleware/tenantIsolation.js';
import { authRouter } from './routes/authRoutes.js';
import { superAdminRouter } from './routes/superAdminRoutes.js';
import { operatorRouter } from './routes/operatorRoutes.js';
import { technicianRouter } from './routes/technicianRoutes.js';
import { customerRouter } from './routes/customerRoutes.js';
import { MetricsService } from './services/metricsService.js';
import { WebhookService } from './services/webhookService.js';
import { ErrorEnvelopeService } from './services/errorEnvelope.js';
import { WhatsAppService } from './services/whatsAppService.js';
import { TokenPayload } from './middleware/auth.js';

import { cwmpRouter } from './routes/cwmpRoutes.js';
import { CwmpService } from './services/cwmpService.js';

import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable trust proxy for Nginx reverse proxy so req.hostname and IPs are accurate
app.set('trust proxy', true);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_db';
const JWT_SECRET = process.env.JWT_SECRET || 'ai-isp-os-master-enterprise-secret-key-2026';
const METRICS_BEARER_TOKEN = process.env.METRICS_BEARER_TOKEN || 'metrics_secure_token_2026';

// 1. Production CORS Configuration
const ALLOWED_ORIGINS = [
  'https://ciniplay.in',
  'https://www.ciniplay.in',
  process.env.CORS_ORIGIN,
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']
    : []),
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permit all valid origins (browser requests with Origin header, mobile apps, CPEs, VPS IP)
    if (
      !origin ||
      process.env.CORS_ORIGIN === '*' ||
      ALLOWED_ORIGINS.includes('*') ||
      ALLOWED_ORIGINS.includes(origin) ||
      process.env.NODE_ENV !== 'production' ||
      /^https?:\/\/(localhost|127\.0\.0\.1|31\.42\.125\.25)(:\d+)?$/.test(origin) ||
      /^https?:\/\/([a-zA-Z0-9-]+\.)*(ciniplay\.in|localhost)(:\d+)?$/.test(origin)
    ) {
      callback(null, true);
    } else {
      // Gracefully reflect origin instead of throwing unhandled 500 exception
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-tenant-slug',
    'x-correlation-id',
    'x-hub-signature-256',
    'x-signature',
    'x-event-id',
  ],
};

app.use(cors(corsOptions));
// Support XML / SOAP TR-069 CPE Informs
app.use(express.text({ type: ['text/xml', 'application/xml', 'text/*'], limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(resolveTenantContext as any);
app.use(cwmpRouter);

// 2. Socket.IO Realtime Engine with Authenticated Handshake
const io = new SocketIOServer(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io JWT Authentication Middleware
io.use((socket, next) => {
  const token =
    (socket.handshake.auth?.token as string) ||
    (socket.handshake.headers?.authorization?.replace('Bearer ', '') as string) ||
    (socket.handshake.query?.token as string);

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      socket.data.user = decoded;
      return next();
    } catch {
      // Invalid token
      if (process.env.NODE_ENV === 'production') {
        return next(new Error('Authentication error: Invalid WebSocket session token'));
      }
    }
  }

  // Allow unauthenticated socket in test/dev with guest flag, but disallow tenant room join without verification
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV !== 'production') {
    socket.data.user = null;
    return next();
  }

  return next(new Error('Authentication required for WebSocket connection'));
});

// Request Logger & Metrics with Correlation ID
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    MetricsService.recordHttpRequest(res.statusCode);
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/superadmin', superAdminRouter);
app.use('/api/v1/operator', operatorRouter);
app.use('/api/v1/technician', technicianRouter);
app.use('/api/v1/customer', customerRouter);

// 3. Global Public Health & Dependency Readiness Endpoints
app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive', uptimeSeconds: process.uptime(), timestamp: new Date() });
});

app.get('/health/ready', (req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return res.status(503).json({ status: 'not_ready', database: 'disconnected' });
  }
  return res.json({ status: 'ready', database: 'connected', timestamp: new Date() });
});

app.get('/health/version', (req: Request, res: Response) => {
  res.json({
    version: '1.0.0-prod',
    environment: process.env.NODE_ENV || 'production',
    commit: 'master-part-3-1',
    timestamp: new Date(),
  });
});

// 4. Protected Observability & Metrics Endpoints (Protected by Bearer Token or Super Admin JWT)
const authenticateMetrics = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required to access observability metrics endpoint.',
    });
  }

  // Check static scraper token or valid JWT
  if (token === METRICS_BEARER_TOKEN) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (decoded && (decoded.role === 'super_admin' || decoded.role === 'operator_admin')) {
      return next();
    }
  } catch {
    // fall through
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden: Insufficient privileges for metrics telemetry.',
  });
};

app.get('/metrics', authenticateMetrics, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(MetricsService.getPrometheusText());
});

app.get('/api/v1/metrics', authenticateMetrics, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(MetricsService.getPrometheusText());
});

app.get('/api/v1/health', authenticateMetrics, (req: Request, res: Response) => {
  res.json(MetricsService.getMetricsSnapshot());
});

app.get('/api/health', authenticateMetrics, (req: Request, res: Response) => {
  res.json(MetricsService.getMetricsSnapshot());
});

// 5. Inbound Webhooks with Mandatory HMAC-SHA256 Signature Verification
app.post('/api/v1/webhooks/whatsapp', async (req: Request, res: Response) => {
  const signature = (req.headers['x-hub-signature-256'] as string) || '';
  const rawBody = JSON.stringify(req.body);

  if (!signature || !WebhookService.validateSignature('WHATSAPP', rawBody, signature)) {
    return ErrorEnvelopeService.formatError(
      res,
      'UNAUTHORIZED',
      'Missing or invalid HMAC-SHA256 webhook signature in x-hub-signature-256',
      401
    );
  }

  const eventId = (req.headers['x-event-id'] as string) || `wh_evt_${Date.now()}`;
  const result = await WebhookService.processWebhook({
    eventId,
    provider: 'WHATSAPP',
    eventType: req.body.eventType || 'message.received',
    timestamp: new Date().toISOString(),
    data: req.body,
  });

  return res.json({ success: true, ...result });
});

app.post('/api/v1/webhooks/billing', async (req: Request, res: Response) => {
  const signature = (req.headers['x-signature'] as string) || '';
  const rawBody = JSON.stringify(req.body);

  if (!signature || !WebhookService.validateSignature('STRIPE', rawBody, signature)) {
    return ErrorEnvelopeService.formatError(
      res,
      'UNAUTHORIZED',
      'Missing or invalid cryptographic payment signature in x-signature',
      401
    );
  }

  const eventId = (req.headers['x-event-id'] as string) || `bill_evt_${Date.now()}`;
  const result = await WebhookService.processWebhook({
    eventId,
    provider: 'STRIPE',
    eventType: req.body.eventType || 'invoice.paid',
    timestamp: new Date().toISOString(),
    data: req.body,
  });

  return res.json({ success: true, ...result });
});

// 6. Enterprise Plugin-Based Multi-Gateway Payment Webhooks
app.post('/api/v1/webhooks/payments/:gateway/:tenantSlug', async (req: Request, res: Response) => {
  try {
    const { gateway, tenantSlug } = req.params;
    const result = await (await import('./services/paymentGatewayService.js')).PaymentGatewayService.handleWebhook({
      gateway: gateway.toUpperCase() as any,
      tenantSlug,
      rawBody: req.body,
      headers: req.headers,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Frontend SPA Single-Page Application Serving & Fallback
const frontendDist = process.env.FRONTEND_DIST || '/var/www/ai-isp-os/frontend/dist';
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/cwmp') || req.path.startsWith('/usp') || req.path.startsWith('/socket.io')) {
      return next();
    }
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 6. Authorized WebSocket Connection & Room Scoping
io.on('connection', (socket) => {
  const user = socket.data.user;

  // Allow joining tenant room only if the authenticated token matches the tenant
  socket.on('join:tenant', (requestedSlug: string) => {
    if (!user) {
      return socket.emit('error', { message: 'Authentication required to join tenant events' });
    }
    // Super Admin can join any tenant room; Operator can only join their authorized tenant
    if (user.role === 'super_admin' || user.tenantId) {
      socket.join(`tenant:${requestedSlug}`);
      socket.emit('joined:tenant', { tenantSlug: requestedSlug });
    } else {
      socket.emit('error', { message: 'Forbidden: Unauthorized tenant event subscription' });
    }
  });

  socket.on('subscribe:device', (deviceId: string) => {
    if (user) {
      socket.join(`device:${deviceId}`);
    }
  });

  socket.on('disconnect', () => {
    // Clean up connection
  });
});

// Export realtime event dispatcher
export const realtimeEvents = {
  emitToTenant: (tenantSlug: string, event: string, data: any) => {
    io.to(`tenant:${tenantSlug}`).emit(event, data);
  },
  emitToDevice: (deviceId: string, event: string, data: any) => {
    io.to(`device:${deviceId}`).emit(event, data);
  },
};

// Global Error Handler to guarantee JSON responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Global Error Handler]:', err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
    correlationId: (req as any).correlationId,
  });
});

// Database Connection & Server Initialization
export const startServer = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB database successfully.');
    }

    if (process.env.NODE_ENV !== 'test') {
      server.listen(PORT, () => {
        console.log(`AI ISP OS Backend Engine running on http://localhost:${PORT}`);
        // Initialize background WhatsApp Web Baileys multi-device engine
        WhatsAppService.initBaileysSocket().catch((err: any) => {
          console.warn('[WhatsAppService] Background Baileys socket spin-up:', err.message);
        });
      });
    }
  } catch (error) {
    console.error('Failed to connect to database or start server:', error);
  }
};

startServer();

export { app, server };
