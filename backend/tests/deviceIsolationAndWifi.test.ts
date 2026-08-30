import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { Device } from '../src/models/Device.js';
import { Tenant } from '../src/models/Tenant.js';
import { CwmpService } from '../src/services/cwmpService.js';
import { CwmpVendorProfiles } from '../src/services/cwmpVendorProfiles.js';

describe('AI ISP OS — Section 29 Production Data Isolation & Wi-Fi Hardening Tests', () => {
  let tenantA: any;
  let tenantB: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_isp_os_test_db';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    await Tenant.deleteMany({ slug: { $in: ['alpha_test', 'beta_test'] } });
    await Device.deleteMany({ serialNumber: { $in: ['SERIAL-ALPHA-001', 'SERIAL-BETA-002', 'SERIAL-GAMMA-003', 'HWTC-DUALBAND-01'] } });

    tenantA = await Tenant.create({
      name: 'Tenant Alpha Test',
      displayName: 'Alpha',
      slug: 'alpha_test',
      subdomain: 'alpha.test.in',
      operatorKey: 'op_alpha_test',
      status: 'active',
      owner: { name: 'Alpha Admin', email: 'alpha@test.com', phone: '+919999999901' },
      plan: { name: 'Standard', maxCustomers: 1000, maxDevices: 1000, maxTechnicians: 10, monthlyFee: 5000, currency: 'INR', billingCycle: 'monthly', features: [] },
      branding: { logoUrl: '', primaryColor: '#2563eb', secondaryColor: '#0f172a', companyName: 'Alpha', supportPhone: '', supportEmail: '', portalTitle: 'Alpha Portal' },
      featureEntitlements: { tr069Acs: true, tr369Usp: true, fiberGis: true, aiCommandCenter: true, technicianDispatch: true, customerApp: true, whatsappAlerts: true, opticalDiagnostics: true },
      opticalThresholds: { warningDbm: -24.5, criticalDbm: -27.0 },
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
    });

    tenantB = await Tenant.create({
      name: 'Tenant Beta Test',
      displayName: 'Beta',
      slug: 'beta_test',
      subdomain: 'beta.test.in',
      operatorKey: 'op_beta_test',
      status: 'active',
      owner: { name: 'Beta Admin', email: 'beta@test.com', phone: '+919999999902' },
      plan: { name: 'Standard', maxCustomers: 1000, maxDevices: 1000, maxTechnicians: 10, monthlyFee: 5000, currency: 'INR', billingCycle: 'monthly', features: [] },
      branding: { logoUrl: '', primaryColor: '#2563eb', secondaryColor: '#0f172a', companyName: 'Beta', supportPhone: '', supportEmail: '', portalTitle: 'Beta Portal' },
      featureEntitlements: { tr069Acs: true, tr369Usp: true, fiberGis: true, aiCommandCenter: true, technicianDispatch: true, customerApp: true, whatsappAlerts: true, opticalDiagnostics: true },
      opticalThresholds: { warningDbm: -24.5, criticalDbm: -27.0 },
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
    });
  });

  afterAll(async () => {
    await Tenant.deleteMany({ slug: { $in: ['alpha_test', 'beta_test'] } });
    await Device.deleteMany({ serialNumber: { $in: ['SERIAL-ALPHA-001', 'SERIAL-BETA-002', 'SERIAL-GAMMA-003', 'HWTC-DUALBAND-01'] } });
  });

  it('1. Should isolate 3 concurrent CPE devices completely with distinct Wi-Fi credentials and WAN profiles', async () => {
    const xmlA = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>GENEXIS</Manufacturer>
        <OUI>00259E</OUI>
        <ProductClass>Titanium-2122A</ProductClass>
        <SerialNumber>SERIAL-ALPHA-001</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[1]">
        <EventStruct><EventCode>2 PERIODIC</EventCode></EventStruct>
      </Event>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[5]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name>
          <Value xsi:type="xsd:string">SSID_ALPHA_24G</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase</Name>
          <Value xsi:type="xsd:string">PASSWORD_ALPHA</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username</Name>
          <Value xsi:type="xsd:string">user_alpha@isp.com</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress</Name>
          <Value xsi:type="xsd:string">10.0.0.101</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries</Name>
          <Value xsi:type="xsd:unsignedInt">3</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    const xmlB = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>HUAWEI</Manufacturer>
        <OUI>00E0FC</OUI>
        <ProductClass>EG8145V5</ProductClass>
        <SerialNumber>SERIAL-BETA-002</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[1]">
        <EventStruct><EventCode>2 PERIODIC</EventCode></EventStruct>
      </Event>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[5]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name>
          <Value xsi:type="xsd:string">SSID_BETA_24G</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase</Name>
          <Value xsi:type="xsd:string">PASSWORD_BETA</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username</Name>
          <Value xsi:type="xsd:string">user_beta@isp.com</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress</Name>
          <Value xsi:type="xsd:string">10.0.0.102</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries</Name>
          <Value xsi:type="xsd:unsignedInt">8</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    const xmlC = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>ZTE</Manufacturer>
        <OUI>00D0D0</OUI>
        <ProductClass>F670L</ProductClass>
        <SerialNumber>SERIAL-GAMMA-003</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[1]">
        <EventStruct><EventCode>2 PERIODIC</EventCode></EventStruct>
      </Event>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[5]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name>
          <Value xsi:type="xsd:string">SSID_GAMMA_24G</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase</Name>
          <Value xsi:type="xsd:string">PASSWORD_GAMMA</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username</Name>
          <Value xsi:type="xsd:string">user_gamma@isp.com</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress</Name>
          <Value xsi:type="xsd:string">10.0.0.103</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries</Name>
          <Value xsi:type="xsd:unsignedInt">12</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    await CwmpService.handleInform(xmlA, '192.168.1.50', undefined, 'alpha_test');
    await CwmpService.handleInform(xmlB, '192.168.1.50', undefined, 'alpha_test');
    await CwmpService.handleInform(xmlC, '192.168.1.60', undefined, 'beta_test');

    const devA = await Device.findOne({ serialNumber: 'SERIAL-ALPHA-001' });
    const devB = await Device.findOne({ serialNumber: 'SERIAL-BETA-002' });
    const devC = await Device.findOne({ serialNumber: 'SERIAL-GAMMA-003' });

    expect(devA).not.toBeNull();
    expect(devB).not.toBeNull();
    expect(devC).not.toBeNull();

    expect(devA?.wifi24?.ssid).toBe('SSID_ALPHA_24G');
    expect(devA?.wifi24?.password).toBe('PASSWORD_ALPHA');
    expect(devA?.wanProfiles?.[0]?.pppoeUsername).toBe('user_alpha@isp.com');
    expect(devA?.lanHostCount).toBe(3);

    expect(devB?.wifi24?.ssid).toBe('SSID_BETA_24G');
    expect(devB?.wifi24?.password).toBe('PASSWORD_BETA');
    expect(devB?.wanProfiles?.[0]?.pppoeUsername).toBe('user_beta@isp.com');
    expect(devB?.lanHostCount).toBe(8);

    expect(devC?.wifi24?.ssid).toBe('SSID_GAMMA_24G');
    expect(devC?.wifi24?.password).toBe('PASSWORD_GAMMA');
    expect(devC?.wanProfiles?.[0]?.pppoeUsername).toBe('user_gamma@isp.com');
    expect(devC?.lanHostCount).toBe(12);

    expect(devA?.tenantId?.toString()).toBe(tenantA._id.toString());
    expect(devB?.tenantId?.toString()).toBe(tenantA._id.toString());
    expect(devC?.tenantId?.toString()).toBe(tenantB._id.toString());
  });

  it('2. Should extract dual-band 5 GHz SSID and password without mixing with 2.4 GHz', async () => {
    const gpvXmlDualBand = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Body>
    <cwmp:GetParameterValuesResponse>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[8]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name>
          <Value xsi:type="xsd:string">MY_HOME_24G</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase</Name>
          <Value xsi:type="xsd:string">PASS24_SECRET</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel</Name>
          <Value xsi:type="xsd:unsignedInt">6</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID</Name>
          <Value xsi:type="xsd:string">MY_HOME_5G</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase</Name>
          <Value xsi:type="xsd:string">PASS5G_SECRET</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel</Name>
          <Value xsi:type="xsd:unsignedInt">44</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username</Name>
          <Value xsi:type="xsd:string">dualband_user@isp.net</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries</Name>
          <Value xsi:type="xsd:unsignedInt">7</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:GetParameterValuesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    const informXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>HUAWEI</Manufacturer>
        <OUI>00E0FC</OUI>
        <ProductClass>EG8145V5</ProductClass>
        <SerialNumber>HWTC-DUALBAND-01</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[1]">
        <EventStruct><EventCode>0 BOOTSTRAP</EventCode></EventStruct>
      </Event>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[0]">
      </ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    const res = await CwmpService.handleInform(informXml, '192.168.1.99', undefined, 'alpha_test');
    await CwmpService.handleParameterValuesResponse(gpvXmlDualBand, '192.168.1.99', res.sessionId, undefined, 'alpha_test');

    const dev = await Device.findOne({ serialNumber: 'HWTC-DUALBAND-01' });
    expect(dev).not.toBeNull();
    expect(dev?.wifi24?.ssid).toBe('MY_HOME_24G');
    expect(dev?.wifi24?.password).toBe('PASS24_SECRET');
    expect(dev?.wifi24?.channel).toBe(6);

    expect(dev?.wifi5g?.ssid).toBe('MY_HOME_5G');
    expect(dev?.wifi5g?.password).toBe('PASS5G_SECRET');
    expect(dev?.wifi5g?.channel).toBe(44);

    expect(dev?.wanProfiles?.[0]?.pppoeUsername).toBe('dualband_user@isp.net');
    expect(dev?.lanHostCount).toBe(7);
  });

  it('3. TEST A: WLANConfiguration.1 = 2.4GHz and WLANConfiguration.5 without frequency evidence is classified as UNKNOWN', () => {
    const rawParams = {
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': 'PRIMARY_WIFI',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel': '6',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID': 'GUEST_WIFI',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel': '0',
    };

    const band1 = CwmpVendorProfiles.determineWifiBand(rawParams, 1, 'PRIMARY_WIFI');
    const band5 = CwmpVendorProfiles.determineWifiBand(rawParams, 5, 'GUEST_WIFI');

    expect(band1).toBe('2.4GHz');
    expect(band5).toBe('UNKNOWN'); // Never assume .5 is 5 GHz without explicit evidence!
  });

  it('4. TEST B: Explicit radio mapping confirms 2.4 GHz vs 5 GHz correctly', () => {
    // 2.4 GHz explicit evidence via Channel 11 & standard b/g/n
    const rawParams24 = {
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID': 'HOME_24G',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel': '11',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Standard': 'b,g,n',
    };
    const band24 = CwmpVendorProfiles.determineWifiBand(rawParams24, 1, 'HOME_24G');
    expect(band24).toBe('2.4GHz');

    // 5 GHz explicit evidence via Channel 44 & standard 11ac
    const rawParams5g = {
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID': 'HOME_5G',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Channel': '44',
      'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.Standard': '11a,11n,11ac',
    };
    const band5g = CwmpVendorProfiles.determineWifiBand(rawParams5g, 2, 'HOME_5G');
    expect(band5g).toBe('5GHz');
  });

  it('5. TEST C: Two devices with different Wi-Fi trees never cross boundaries', async () => {
    const devA = await Device.findOne({ serialNumber: 'SERIAL-ALPHA-001' });
    const devB = await Device.findOne({ serialNumber: 'SERIAL-BETA-002' });

    expect(devA).not.toBeNull();
    expect(devB).not.toBeNull();

    // Verify Dev A credentials never appear in Dev B
    expect(devA?.wifi24?.ssid).not.toBe(devB?.wifi24?.ssid);
    expect(devA?.wifi24?.password).not.toBe(devB?.wifi24?.password);
    expect(devA?.wanProfiles?.[0]?.pppoeUsername).not.toBe(devB?.wanProfiles?.[0]?.pppoeUsername);
  });

  it('6. TEST D: Genexis Titanium-2122A dual-band capability and password discovery', async () => {
    const isDual = CwmpVendorProfiles.isDualBandModel('GENEXIS', 'Titanium-2122A', 'C40-210');
    expect(isDual).toBe(true);

    // Baseline parameters guaranteed for all TR-098 Wi-Fi CPEs
    const baseline = CwmpVendorProfiles.getSafeBaselineParameters('GENEXIS');
    expect(baseline).toContain('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID');
    expect(baseline).toContain('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase');

    // Simulate Genexis Titanium-2122A returning 2.4G and 5G Wi-Fi with passwords
    const genexisGpvXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Body>
    <cwmp:GetParameterValuesResponse>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[8]">
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID</Name>
          <Value xsi:type="xsd:string">GENEXIS_HOME_2.4G</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase</Name>
          <Value xsi:type="xsd:string">GNXS_SECRET_24</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Channel</Name>
          <Value xsi:type="xsd:unsignedInt">1</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID</Name>
          <Value xsi:type="xsd:string">GENEXIS_HOME_5G</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase</Name>
          <Value xsi:type="xsd:string">GNXS_SECRET_5G</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Channel</Name>
          <Value xsi:type="xsd:unsignedInt">48</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username</Name>
          <Value xsi:type="xsd:string">gnxs_user@ftth.in</Value>
        </ParameterValueStruct>
        <ParameterValueStruct>
          <Name>InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries</Name>
          <Value xsi:type="xsd:unsignedInt">5</Value>
        </ParameterValueStruct>
      </ParameterList>
    </cwmp:GetParameterValuesResponse>
  </soapenv:Body>
</soapenv:Envelope>`;

    const genexisInformXml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
  <soapenv:Body>
    <cwmp:Inform>
      <DeviceId>
        <Manufacturer>GENEXIS</Manufacturer>
        <OUI>00259E</OUI>
        <ProductClass>Titanium-2122A</ProductClass>
        <SerialNumber>GNXS-TEST-0099</SerialNumber>
      </DeviceId>
      <Event soapenv:arrayType="cwmp:EventStruct[1]">
        <EventStruct><EventCode>0 BOOTSTRAP</EventCode></EventStruct>
      </Event>
      <ParameterList soapenv:arrayType="cwmp:ParameterValueStruct[0]">
      </ParameterList>
    </cwmp:Inform>
  </soapenv:Body>
</soapenv:Envelope>`;

    const informRes = await CwmpService.handleInform(genexisInformXml, '192.168.1.188', undefined, 'alpha_test');
    await CwmpService.handleParameterValuesResponse(genexisGpvXml, '192.168.1.188', informRes.sessionId, undefined, 'alpha_test');

    const gnxsDev = await Device.findOne({ serialNumber: 'GNXS-TEST-0099' });
    expect(gnxsDev).not.toBeNull();
    expect(gnxsDev?.wifi24?.ssid).toBe('GENEXIS_HOME_2.4G');
    expect(gnxsDev?.wifi24?.password).toBe('GNXS_SECRET_24');
    expect(gnxsDev?.wifi24?.channel).toBe(1);

    expect(gnxsDev?.wifi5g?.ssid).toBe('GENEXIS_HOME_5G');
    expect(gnxsDev?.wifi5g?.password).toBe('GNXS_SECRET_5G');
    expect(gnxsDev?.wifi5g?.channel).toBe(48);

    expect(gnxsDev?.wanProfiles?.[0]?.pppoeUsername).toBe('gnxs_user@ftth.in');
    expect(gnxsDev?.lanHostCount).toBe(5);
  });

  it('7. TEST E: Realtek and Syrotech vendor detection and OUI mapping', () => {
    // Syrotech SY-GPON series
    const vSyro = CwmpVendorProfiles.detectVendor('Realtek', 'SY-GPON-1110-WDONT', '00E04C', 'SY-GPON-1110-WDONT');
    expect(vSyro).toBe('SYROTECH');

    // Realtek OEM XPON series
    const vRealtek = CwmpVendorProfiles.detectVendor('Realtek', 'XPON+1GE+1FE+1POTS+WIFI', '00E04C', 'XPON+1GE');
    expect(vRealtek).toBe('REALTEK');

    // Genexis Earth-2022 single-band check
    const isDualEarth = CwmpVendorProfiles.isDualBandModel('GENEXIS', 'EARTH-2022', 'EARTH-2022');
    expect(isDualEarth).toBe(false);

    const earthBaseline = CwmpVendorProfiles.getSafeBaselineParameters('GENEXIS', 'EARTH-2022');
    expect(earthBaseline).not.toContain('InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID');
    expect(earthBaseline).toContain('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID');
  });
});
