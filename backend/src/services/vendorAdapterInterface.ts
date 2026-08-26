export interface AdapterIdentity {
  vendor: string;
  model: string;
  hardwareVersion?: string;
  firmwareVersion?: string;
  protocol: 'TR-069' | 'TR-369' | 'SNMP' | 'REST' | 'CLI';
}

export interface IVendorAdapter {
  identify(): Promise<AdapterIdentity>;
  capabilities(): Promise<string[]>;
  read(parameter: string): Promise<any>;
  write(parameter: string, value: any): Promise<boolean>;
  execute(operation: string, parameters?: Record<string, any>): Promise<any>;
  diagnose(diagnosticType: 'ping' | 'traceroute' | 'speedtest' | 'optical'): Promise<any>;
  verify(parameter: string, expectedValue: any): Promise<boolean>;
  health(): Promise<{ online: boolean; latencyMs: number; lastInform: Date }>;
}

export abstract class BaseVendorAdapter implements IVendorAdapter {
  protected vendor: string;
  protected model: string;
  protected protocol: 'TR-069' | 'TR-369' | 'SNMP' | 'REST' | 'CLI';

  constructor(vendor: string, model: string, protocol: 'TR-069' | 'TR-369' | 'SNMP' | 'REST' | 'CLI' = 'TR-069') {
    this.vendor = vendor;
    this.model = model;
    this.protocol = protocol;
  }

  async identify(): Promise<AdapterIdentity> {
    return {
      vendor: this.vendor,
      model: this.model,
      protocol: this.protocol,
    };
  }

  abstract capabilities(): Promise<string[]>;
  abstract read(parameter: string): Promise<any>;
  abstract write(parameter: string, value: any): Promise<boolean>;
  abstract execute(operation: string, parameters?: Record<string, any>): Promise<any>;
  abstract diagnose(diagnosticType: 'ping' | 'traceroute' | 'speedtest' | 'optical'): Promise<any>;
  abstract verify(parameter: string, expectedValue: any): Promise<boolean>;
  abstract health(): Promise<{ online: boolean; latencyMs: number; lastInform: Date }>;
}
