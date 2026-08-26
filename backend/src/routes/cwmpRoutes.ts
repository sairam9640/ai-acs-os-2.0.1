import { Router, Request, Response } from 'express';
import { CwmpService } from '../services/cwmpService.js';
import { UspService } from '../services/uspService.js';

export const cwmpRouter = Router();

/**
 * 100% Native TR-069 CWMP Inbound Inform & RPC Handler
 * Handles SOAP HTTP POST requests from CPEs (routers/ONTs) directly
 */
async function handleCwmpPost(req: Request, res: Response) {
  try {
    let rawBody = '';
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf-8');
    } else if (req.body && typeof req.body === 'object') {
      if (Object.keys(req.body).length === 0) {
        rawBody = '';
      } else {
        try {
          rawBody = JSON.stringify(req.body);
        } catch {
          rawBody = '';
        }
      }
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const hostHeader = (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string);
    const pathOrQuerySlug = req.params?.tenantSlug || (req.query?.tenant as string) || (req.query?.slug as string);

    // Unique connection key combining IP and remote port to prevent cross-device CGNAT collisions
    const remotePort = req.socket.remotePort || 0;
    const connectionKey = `${clientIp}:${remotePort}`;

    // Extract TR-069 Session ID from HTTP Cookie (cwmpSession or sessionID)
    const cookieHeader = req.headers.cookie;
    const incomingSessionId =
      CwmpService.extractSessionCookie(cookieHeader) ||
      (req.headers['x-cwmp-session'] as string) ||
      undefined;

    const isEmptyPost =
      !rawBody ||
      rawBody.trim().length === 0 ||
      rawBody === '{}' ||
      rawBody === '[]' ||
      rawBody === '[object Object]' ||
      rawBody.includes('<soapenv:Body/>') ||
      rawBody.includes('<soapenv:Body></soapenv:Body>') ||
      rawBody.includes('<Body/>') ||
      rawBody.includes('<Body></Body>');

    // 1. If GetParameterNamesResponse from CPE
    if (rawBody.includes('GetParameterNamesResponse')) {
      const gpnNextRpc = await CwmpService.handleParameterNamesResponse(rawBody, clientIp, incomingSessionId, hostHeader, pathOrQuerySlug, connectionKey);
      if (gpnNextRpc) {
        console.log(`[Native CWMP OUT] GPN Next RPC to ${connectionKey} | Status: 200 | Length: ${gpnNextRpc.length}`);
        res.setHeader('Content-Type', 'text/xml; charset=utf-8');
        return res.status(200).send(gpnNextRpc);
      }
      return res.status(204).end();
    }

    // 2. If GetParameterValuesResponse / SetParameterValuesResponse / Fault from CPE
    if (
      rawBody.includes('GetParameterValuesResponse') ||
      rawBody.includes('SetParameterValuesResponse') ||
      (rawBody.includes('Fault') && !rawBody.includes('<cwmp:Inform>'))
    ) {
      await CwmpService.handleParameterValuesResponse(rawBody, clientIp, incomingSessionId, hostHeader, pathOrQuerySlug, connectionKey);
      return res.status(204).end();
    }

    // 3. If genuine Inform XML from CPE
    if (rawBody.includes('<cwmp:Inform>') || rawBody.includes('<Inform>') || rawBody.includes('cwmp:Inform')) {
      const informResult = await CwmpService.handleInform(rawBody, clientIp, hostHeader, pathOrQuerySlug, connectionKey);
      res.setHeader('Set-Cookie', `cwmpSession=${informResult.sessionId}; Path=/; HttpOnly`);
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      console.log(`[Native CWMP OUT] InformResponse to ${connectionKey} | Session: ${informResult.sessionId} | Status: 200`);
      return res.status(200).send(informResult.responseXml);
    }

    // 4. If empty POST (CPE asks if ACS has pending RPCs)
    if (isEmptyPost) {
      const pendingRpcXml = await CwmpService.checkPendingRpcOrPoll(clientIp, incomingSessionId, hostHeader, pathOrQuerySlug, connectionKey);
      if (pendingRpcXml) {
        console.log(`[Native CWMP OUT] Outbound RPC to ${connectionKey} on empty POST | Status: 200 | Length: ${pendingRpcXml.length}`);
        res.setHeader('Content-Type', 'text/xml; charset=utf-8');
        return res.status(200).send(pendingRpcXml);
      }
      return res.status(204).end();
    }

    // Default 200 OK fallback
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    return res.status(200).send(CwmpService.buildInformResponse());
  } catch (error: any) {
    console.error('[Native CWMP Error]:', error);
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    return res.status(500).send(CwmpService.buildInformResponse());
  }
}

// Inbound Native CWMP standard routes
cwmpRouter.post('/', handleCwmpPost);
cwmpRouter.post('/cwmp', handleCwmpPost);
cwmpRouter.post('/inform', handleCwmpPost);
cwmpRouter.post('/tr069', handleCwmpPost);
cwmpRouter.post('/tr69', handleCwmpPost);
cwmpRouter.post('/acs', handleCwmpPost);
cwmpRouter.post('/service/tr069', handleCwmpPost);
cwmpRouter.post('/service/tr69', handleCwmpPost);
cwmpRouter.post('/openacs/service/tr069', handleCwmpPost);
cwmpRouter.post('/genieacs', handleCwmpPost);

// Inbound Native CWMP tenant-specific routes
cwmpRouter.post('/cwmp/:tenantSlug', handleCwmpPost);
cwmpRouter.post('/inform/:tenantSlug', handleCwmpPost);
cwmpRouter.post('/tr069/:tenantSlug', handleCwmpPost);
cwmpRouter.post('/tr69/:tenantSlug', handleCwmpPost);
cwmpRouter.post('/acs/:tenantSlug', handleCwmpPost);
cwmpRouter.post('/service/tr069/:tenantSlug', handleCwmpPost);
cwmpRouter.post('/service/tr69/:tenantSlug', handleCwmpPost);

cwmpRouter.get('/', (req, res) => res.send('Native Enterprise TR-069 CWMP ACS Engine Active & Online'));
cwmpRouter.get('/cwmp', (req, res) => res.send('Native Enterprise TR-069 CWMP ACS Engine Active & Online'));
cwmpRouter.get('/tr069', (req, res) => res.send('Native Enterprise TR-069 CWMP ACS Engine Active & Online'));
cwmpRouter.get('/tr69', (req, res) => res.send('Native Enterprise TR-069 CWMP ACS Engine Active & Online'));
cwmpRouter.get('/acs', (req, res) => res.send('Native Enterprise TR-069 CWMP ACS Engine Active & Online'));
cwmpRouter.get('/service/tr069', (req, res) => res.send('Native Enterprise TR-069 CWMP ACS Engine Active & Online'));
cwmpRouter.get('/service/tr69', (req, res) => res.send('Native Enterprise TR-069 CWMP ACS Engine Active & Online'));

/**
 * TR-369 / USP Inbound Endpoint
 */
cwmpRouter.post('/usp', async (req: Request, res: Response) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const hostHeader = req.headers['host'];
    const body = req.body;
    if (body && body.endpointId) {
      const result = await UspService.handleUspMessage(body, clientIp, hostHeader);
      return res.json(result);
    }
    return res.status(400).json({ success: false, error: 'Invalid USP payload' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Operator / Superadmin API to get CWMP ACS Status & Recent Router Hits
 */
cwmpRouter.get('/api/v1/operator/cwmp/status', async (req: Request, res: Response) => {
  try {
    const tenantSlug = (req.headers['x-tenant-slug'] as string) || (req as any).user?.tenantSlug || 'rudra';
    const stats = CwmpService.getStats(tenantSlug);
    return res.json(stats);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
