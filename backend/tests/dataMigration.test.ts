import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Tenant } from '../src/models/Tenant.js';
import { Customer } from '../src/models/Customer.js';
import { DataMigrationService } from '../src/services/dataMigrationService.js';

describe('AI ISP OS Part 1.4 — Data Migration & Reconciliation Tests', () => {
  let tenant: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db');
    }

    tenant = await Tenant.create({
      name: 'Migration Test ISP',
      slug: 'migtest',
      subdomain: 'migtest.ai-ispos.com',
      operatorKey: 'opk_mig_test',
      owner: { name: 'Migrator', email: 'mig@test.com', phone: '123' },
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('Should bulk import subscriber records and populate database', async () => {
    const records = [
      {
        fullName: 'Imported User 1',
        phone: '+919900112233',
        accountNumber: 'ACC-MIG-001',
        address: { street: '1st Cross', area: 'Indiranagar', city: 'Bengaluru', pincode: '560038' },
        planName: 'Fiber 200M',
        downloadSpeedMbps: 200,
        monthlyFee: 999,
        ontSerial: 'HWTC-MIG-01',
      },
      {
        fullName: 'Imported User 2',
        phone: '+919900112244',
        accountNumber: 'ACC-MIG-002',
        address: { street: '2nd Cross', area: 'Indiranagar', city: 'Bengaluru', pincode: '560038' },
        planName: 'Fiber 100M',
        downloadSpeedMbps: 100,
        monthlyFee: 699,
        ontSerial: 'HWTC-MIG-02',
      },
    ];

    const result = await DataMigrationService.importSubscribers({
      tenantId: tenant._id,
      actorId: 'usr_admin',
      actorEmail: 'admin@mig.com',
      actorRole: 'operator_admin',
      records,
    });

    expect(result.totalRecordsProcessed).toBe(2);
    expect(result.successfullyImported).toBe(2);
    expect(result.skippedDuplicates).toBe(0);
    expect(result.reconciliationChecksum).toBeDefined();

    const inDb = await Customer.countDocuments({ tenantId: tenant._id });
    expect(inDb).toBe(2);
  });

  it('Should skip duplicate records with identical phone or account numbers', async () => {
    const duplicateRecords = [
      {
        fullName: 'Duplicate User 1',
        phone: '+919900112233', // Duplicate phone
        accountNumber: 'ACC-MIG-001', // Duplicate account
        address: { street: '1st Cross', area: 'Indiranagar', city: 'Bengaluru', pincode: '560038' },
        planName: 'Fiber 200M',
        downloadSpeedMbps: 200,
        monthlyFee: 999,
      },
    ];

    const result = await DataMigrationService.importSubscribers({
      tenantId: tenant._id,
      actorId: 'usr_admin',
      actorEmail: 'admin@mig.com',
      actorRole: 'operator_admin',
      records: duplicateRecords,
    });

    expect(result.successfullyImported).toBe(0);
    expect(result.skippedDuplicates).toBe(1);
  });

  it('Should generate accurate reconciliation report', async () => {
    const report = await DataMigrationService.generateReconciliationReport(tenant._id);
    expect(report.tenantId).toBe(tenant._id.toString());
    expect(report.reconciliation.totalSubscribersInDb).toBe(2);
    expect(report.reconciliation.dataIntegrityScore).toBe(100.0);
  });
});
