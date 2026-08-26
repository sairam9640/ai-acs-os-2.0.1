export interface RunbookStep {
  stepIndex: number;
  title: string;
  actionRequired: string;
  automatedCheckCommand?: string;
  status: 'pending' | 'in_progress' | 'verified' | 'skipped';
}

export interface OperationalRunbook {
  id: string;
  category: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  estimatedRtoMinutes: number;
  steps: RunbookStep[];
}

export class RunbookService {
  private static runbooks: OperationalRunbook[] = [
    {
      id: 'RB-01-API-OUTAGE',
      category: 'INFRASTRUCTURE',
      title: 'API Gateway Outage & Recovery Procedure',
      severity: 'CRITICAL',
      description: 'Resolution workflow for API ingress unavailability and container restart loops.',
      estimatedRtoMinutes: 15,
      steps: [
        { stepIndex: 1, title: 'Verify Cluster Ingress Health', actionRequired: 'Check HTTP /health endpoint status on edge load balancers.', status: 'pending' },
        { stepIndex: 2, title: 'Inspect Container Restart Loops', actionRequired: 'Query docker logs for unhandled exceptions or OOM kills.', status: 'pending' },
        { stepIndex: 3, title: 'Trigger Rolling Restarter', actionRequired: 'Issue container restart command on standby cluster nodes.', status: 'pending' },
        { stepIndex: 4, title: 'Post-Recovery Traffic Verification', actionRequired: 'Execute synthetic authentication and telemetry check.', status: 'pending' },
      ],
    },
    {
      id: 'RB-02-FIBER-CUT',
      category: 'FIBER_GIS',
      title: 'Suspected Feeder/Distribution Fiber Cable Cut',
      severity: 'CRITICAL',
      description: 'OTDR fault localization and field splicing dispatch procedure for fiber cuts.',
      estimatedRtoMinutes: 60,
      steps: [
        { stepIndex: 1, title: 'Correlate Affected Subscriber ONTs', actionRequired: 'Run GIS fault correlation to isolate shared upstream Splitter or Feeder cable.', status: 'pending' },
        { stepIndex: 2, title: 'Trigger OTDR Distance Metering', actionRequired: 'Dispatch optical pulse test from OLT port to measure fault distance in meters.', status: 'pending' },
        { stepIndex: 3, title: 'Auto-Dispatch Field Splicing Technician', actionRequired: 'Create high-priority work order with exact GIS coordinate pins.', status: 'pending' },
        { stepIndex: 4, title: 'Verify Optical Power Restoration', actionRequired: 'Confirm all connected ONTs return to >= -24.0 dBm baseline power.', status: 'pending' },
      ],
    },
    {
      id: 'RB-03-QUEUE-BACKLOG',
      category: 'ASYNC_CORE',
      title: 'Command Queue Backlog & Dead-Letter Redrive',
      severity: 'HIGH',
      description: 'Dead-letter redrive and async worker backlog clearance procedure.',
      estimatedRtoMinutes: 30,
      steps: [
        { stepIndex: 1, title: 'Inspect Dead-Letter Queue Depth', actionRequired: 'Query /api/v1/superadmin/events/dlq for error classification.', status: 'pending' },
        { stepIndex: 2, title: 'Verify Downstream ACS Reachability', actionRequired: 'Test connection-request HTTP response on CPE management gateway.', status: 'pending' },
        { stepIndex: 3, title: 'Execute Automated Batch Redrive', actionRequired: 'Issue batch redrive on queued commands with exponential backoff.', status: 'pending' },
      ],
    },
    {
      id: 'RB-04-SECURITY-INCIDENT',
      category: 'SECURITY',
      title: 'Security Incident & Credential Revocation',
      severity: 'CRITICAL',
      description: 'Emergency account containment, token revocation, and secret rotation playbook.',
      estimatedRtoMinutes: 20,
      steps: [
        { stepIndex: 1, title: 'Identify Compromised User / API Key', actionRequired: 'Filter AuditLog for anomalous IP addresses and unauthorized mutations.', status: 'pending' },
        { stepIndex: 2, title: 'Revoke Active JWT Sessions', actionRequired: 'Deactivate user record and invalidate active session tokens.', status: 'pending' },
        { stepIndex: 3, title: 'Rotate Database & ACS Secrets', actionRequired: 'Deploy updated secret manager credentials to running services.', status: 'pending' },
      ],
    },
  ];

  /**
   * Returns list of all operational runbooks
   */
  static getRunbooks(): OperationalRunbook[] {
    return this.runbooks;
  }

  /**
   * Retrieves specific runbook by ID
   */
  static getRunbookById(id: string): OperationalRunbook | undefined {
    return this.runbooks.find((r) => r.id === id);
  }
}
