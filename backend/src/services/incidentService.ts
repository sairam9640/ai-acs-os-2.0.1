import { Types } from 'mongoose';
import { Incident, Alert, IIncident, IncidentSeverity, IncidentStatus } from '../models/Incident.js';
import { TechnicianJob } from '../models/TechnicianJob.js';
import { Customer } from '../models/Customer.js';

export class IncidentService {
  /**
   * Ingests an alert, deduplicates repeated alarms, and creates or escalates an incident
   */
  static async ingestAlert({
    tenantId,
    severity,
    sourceType,
    sourceId,
    sourceName,
    message,
    valueRecorded,
    thresholdDbm,
  }: {
    tenantId: string;
    severity: IncidentSeverity;
    sourceType: 'ONT_OPTICAL' | 'PON_LOS' | 'OLT_OFFLINE' | 'FIBER_CUT' | 'SLA_BREACH';
    sourceId: string;
    sourceName: string;
    message: string;
    valueRecorded?: number;
    thresholdDbm?: number;
  }) {
    const tId = new Types.ObjectId(tenantId);

    // 1. Deduplicate check: Alert from same source within last 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    let alert = await Alert.findOne({
      tenantId: tId,
      sourceType,
      sourceId,
      acknowledged: false,
      lastSeenAt: { $gte: thirtyMinsAgo },
    });

    if (alert) {
      alert.occurrencesCount += 1;
      alert.lastSeenAt = new Date();
      alert.valueRecorded = valueRecorded;
      await alert.save();
      return { alert, isNew: false };
    }

    // 2. Create new Alert
    alert = await Alert.create({
      tenantId: tId,
      severity,
      sourceType,
      sourceId,
      sourceName,
      message,
      valueRecorded,
      thresholdDbm,
      occurrencesCount: 1,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });

    // 3. For Major or Critical alerts, auto-correlate into an Incident
    if (severity === 'major' || severity === 'critical') {
      const slaMinutes = severity === 'critical' ? 120 : 240; // 2h or 4h SLA
      const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000);

      const incidentNumber = `INC-${Date.now().toString().slice(-6)}`;
      const incident = await Incident.create({
        tenantId: tId,
        incidentNumber,
        title: `${severity.toUpperCase()}: ${message}`,
        description: `Automated incident created from alert on ${sourceName} (${sourceType})`,
        severity,
        status: 'active',
        category: sourceType === 'FIBER_CUT' ? 'FIBER_CUT' : 'OPTICAL_DEGRADATION',
        slaDeadline,
        affectedCustomersCount: severity === 'critical' ? 32 : 1,
      });

      alert.incidentId = incident._id;
      await alert.save();
    }

    return { alert, isNew: true };
  }

  /**
   * Dispatches a field technician job directly from an Incident with GIS and customer context
   */
  static async dispatchTechnicianJob({
    tenantId,
    incidentId,
    technicianUserId,
    title,
    priority,
    scheduledDate,
  }: {
    tenantId: string;
    incidentId: string;
    technicianUserId: string;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    scheduledDate?: Date;
  }) {
    const incident = await Incident.findById(incidentId);
    if (!incident) throw new Error('Incident not found');

    const customer = incident.affectedCustomerIds?.[0]
      ? await Customer.findById(incident.affectedCustomerIds[0])
      : await Customer.findOne({ tenantId: new Types.ObjectId(tenantId) });

    if (!customer) throw new Error('Customer reference required for job dispatch');

    const jobNumber = `JOB-${Date.now().toString().slice(-6)}`;
    const job = await TechnicianJob.create({
      tenantId: new Types.ObjectId(tenantId),
      jobNumber,
      technicianUserId: new Types.ObjectId(technicianUserId),
      customerId: customer._id,
      incidentId: incident._id,
      title: title || incident.title,
      type: incident.category === 'FIBER_CUT' ? 'FIBER_FAULT_REPAIR' : 'ONT_REPLACEMENT',
      priority,
      status: 'assigned',
      scheduledDate: scheduledDate || new Date(),
      slaDeadline: incident.slaDeadline,
      location: {
        lat: customer.address?.coordinates?.lat || 12.9352,
        lng: customer.address?.coordinates?.lng || 77.6245,
        address: `${customer.address?.street}, ${customer.address?.area}`,
        area: customer.address?.area || 'Kormangala',
      },
      guidedChecklist: [
        { id: 'step1', label: 'Inspect FAT/NAP drop cable continuity', required: true, completed: false },
        { id: 'step2', label: 'Clean SC-APC optical fiber connector with isopropyl wipe', required: true, completed: false },
        { id: 'step3', label: 'Measure incoming RX optical power using optical power meter', required: true, completed: false },
        { id: 'step4', label: 'Verify CPE ONT PON lock LED and internet WAN state', required: true, completed: false },
        { id: 'step5', label: 'Capture photo evidence of FAT Box and ONT rear panel', required: true, completed: false },
        { id: 'step6', label: 'Obtain customer digital signature or SMS OTP acknowledgement', required: true, completed: false },
      ],
      evidence: {
        photoUrls: [],
        technicianNotes: '',
      },
    });

    incident.assignedTechnicianId = new Types.ObjectId(technicianUserId);
    incident.status = 'in_progress';
    await incident.save();

    return job;
  }
}
