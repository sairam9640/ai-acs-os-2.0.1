# AI ISP OS — Operations Runbook

**Document Version:** 1.0  
**Domain:** System Operations & Production Maintenance  
**Date:** 2026-08-23  

---

## 1. Standard Operational Procedures

### 1.1 Service Startup & Readiness Verification
1. Start database: `mongod --dbpath /data/db`
2. Start API Gateway: `npm start`
3. Verify readiness: `curl -f http://localhost:4000/health/ready`
4. Verify metrics: `curl http://localhost:4000/metrics`

### 1.2 Emergency Network Write Kill Switch
To disable all network mutations across all tenants immediately in case of vendor adapter instability:
1. Access environment configuration.
2. Set `ENABLE_ACS_WRITES=false`, `ENABLE_OLT_WRITES=false`.
3. Restart API workers. All pending write commands transition safely to `CANCELLED`.
