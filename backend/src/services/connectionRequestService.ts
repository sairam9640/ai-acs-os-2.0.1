import http from 'http';
import https from 'https';
import { Device } from '../models/Device.js';

/**
 * Trigger on-demand TR-069 Connection Request via internal GenieACS NBI (port 7557)
 * or via direct ConnectionRequestURL to force the ONT to check in immediately.
 */
export async function triggerGenieAcsConnectionRequest(serialNumber: string): Promise<boolean> {
  if (!serialNumber) return false;

  // 1. Try GenieACS NBI (port 7557) first
  const genieSuccess = await new Promise<boolean>((resolve) => {
    const queryPath = `/devices/?query={"_id":{"$regex":"${encodeURIComponent(serialNumber)}","$options":"i"}}&projection=_id`;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 7557,
      path: queryPath,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      timeout: 1500
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const devs = JSON.parse(data);
          if (Array.isArray(devs) && devs.length > 0) {
            const genieId = devs[0]._id;
            const taskReq = http.request({
              hostname: '127.0.0.1',
              port: 7557,
              path: `/devices/${encodeURIComponent(genieId)}/tasks?connection_request`,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              timeout: 2000
            }, (taskRes) => {
              resolve(taskRes.statusCode === 200 || taskRes.statusCode === 202);
            });
            taskReq.on('error', () => resolve(false));
            taskReq.write(JSON.stringify({ name: 'refreshObject', objectName: '' }));
            taskReq.end();
          } else {
            resolve(false);
          }
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.end();
  });

  if (genieSuccess) return true;

  // 2. Fallback: Direct ConnectionRequestURL to physical ONT
  try {
    const dev = await Device.findOne({
      $or: [
        { serialNumber },
        { serialNumber: serialNumber.toLowerCase() },
        { serialNumber: serialNumber.toUpperCase() }
      ]
    });
    const crUrl = (dev as any)?.connectionRequestUrl ||
      dev?.rawParameters?.['InternetGatewayDevice.ManagementServer.ConnectionRequestURL'] ||
      dev?.rawParameters?.['Device.ManagementServer.ConnectionRequestURL'];

    if (crUrl && typeof crUrl === 'string' && crUrl.startsWith('http')) {
      const urlObj = new URL(crUrl);
      const transport = urlObj.protocol === 'https:' ? https : http;
      return await new Promise<boolean>((resolve) => {
        const directReq = transport.request({
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          timeout: 2000
        }, (directRes) => {
          resolve(directRes.statusCode === 200 || directRes.statusCode === 204 || directRes.statusCode === 401);
        });
        directReq.on('error', () => resolve(false));
        directReq.end();
      });
    }
  } catch {
    // Graceful fallback
  }

  return false;
}
