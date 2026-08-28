/**
 * Robust TR-069 / SOAP Universal XML Parser & Telemetry Normalizer
 * Strips SOAP/CWMP namespace prefixes and parses ParameterValueStruct arrays.
 */

export interface ParsedSoapFault {
  isFault: boolean;
  faultCode?: string;
  faultString?: string;
  detail?: string;
}

export interface ExtractedParameterMap {
  parameters: Map<string, string>;
  rawMap: Record<string, string>;
  fault?: ParsedSoapFault;
}

/**
 * Decodes XML / HTML entities and cleans escaped whitespace/newlines
 */
export function decodeXmlEntities(val: string): string {
  if (!val) return '';
  return val
    .replace(/&#xA;/g, '')
    .replace(/&#xD;/g, '')
    .replace(/&#10;/g, '')
    .replace(/&#13;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

export class CwmpXmlParser {
  /**
   * Decodes XML / HTML entities and cleans escaped whitespace/newlines
   */
  static decodeXmlEntities(val: string): string {
    return decodeXmlEntities(val);
  }

  /**
   * Strips all XML namespaces from tag names to allow resilient matching
   */
  static cleanTag(tag: string): string {
    return tag.replace(/^[a-zA-Z0-9_-]+:/, '');
  }

  /**
   * Extracts single tag value regardless of namespace prefix
   */
  static extractTag(xml: string, tag: string): string | undefined {
    if (!xml) return undefined;
    const match = xml.match(
      new RegExp('<(?:[a-zA-Z0-9_-]+:)?' + tag + '(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?' + tag + '>', 'i')
    );
    return match ? decodeXmlEntities(match[1]) : undefined;
  }

  /**
   * Detects and extracts SOAP / CWMP Faults (e.g. Fault 9005 - Invalid Parameter Name)
   */
  static extractFault(xml: string): ParsedSoapFault {
    if (!xml || (!xml.includes('Fault') && !xml.includes('fault'))) {
      return { isFault: false };
    }

    // Prioritize specific CWMP numeric FaultCode (e.g. 9005, 9002, 9003) from detail/cwmp:Fault block
    const cwmpFaultCodeMatch = xml.match(/<(?:[a-zA-Z0-9_-]+:)?FaultCode[^>]*>(\d+)<\/(?:[a-zA-Z0-9_-]+:)?FaultCode>/i);
    const faultCode = cwmpFaultCodeMatch ? cwmpFaultCodeMatch[1] : (
      this.extractTag(xml, 'FaultCode') ||
      this.extractTag(xml, 'faultcode') ||
      this.extractTag(xml, 'Code')
    );

    // Prioritize specific CWMP FaultString from detail/cwmp:Fault over outer SOAP faultstring
    const detailFaultMatch = xml.match(/<detail[\s\S]*?<(?:[a-zA-Z0-9_-]+:)?FaultString[^>]*>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?FaultString>[\s\S]*?<\/detail>/i);
    const cwmpFaultStringMatch = detailFaultMatch || xml.match(/<(?:[a-zA-Z0-9_-]+:)?FaultString[^>]*>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?FaultString>/);
    const faultString = cwmpFaultStringMatch ? decodeXmlEntities(cwmpFaultStringMatch[1]) : (
      this.extractTag(xml, 'FaultString') ||
      this.extractTag(xml, 'faultstring') ||
      this.extractTag(xml, 'String')
    );

    const detail = this.extractTag(xml, 'Detail') || this.extractTag(xml, 'detail');

    if (faultCode || faultString) {
      return {
        isFault: true,
        faultCode: faultCode || 'SOAP_FAULT',
        faultString: faultString || 'Unknown CPE SOAP Fault',
        detail,
      };
    }

    return { isFault: false };
  }

  /**
   * Extracts all ParameterValueStruct (Name/Value) entries into a Key-Value Map
   */
  static extractParameterMap(xml: string): ExtractedParameterMap {
    const params = new Map<string, string>();
    const rawMap: Record<string, string> = {};

    if (!xml) return { parameters: params, rawMap };

    const fault = this.extractFault(xml);
    if (fault.isFault) {
      console.warn(`[CWMP SOAP FAULT] CPE returned Fault Code: ${fault.faultCode} | Message: ${fault.faultString}`);
    }

    // Match all <ParameterValueStruct> ... </ParameterValueStruct> blocks
    const structRegex = /<(?:[a-zA-Z0-9_-]+:)?ParameterValueStruct(?:\s+[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?ParameterValueStruct>/gi;
    let match: RegExpExecArray | null;

    while ((match = structRegex.exec(xml)) !== null) {
      const block = match[1];
      const name = this.extractTag(block, 'Name');
      const val = this.extractTag(block, 'Value');

      if (name && val !== undefined) {
        const cleanName = decodeXmlEntities(name);
        const cleanVal = decodeXmlEntities(val);
        params.set(cleanName, cleanVal);
        rawMap[cleanName] = cleanVal;
      }
    }

    // Fallback regex matching directly for non-standard vendor XML formatting
    if (params.size === 0) {
      const directRegex = /<(?:[a-zA-Z0-9_-]+:)?Name[^>]*>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?Name>[\s\S]*?<(?:[a-zA-Z0-9_-]+:)?Value[^>]*>([^<]*)<\/(?:[a-zA-Z0-9_-]+:)?Value>/gi;
      while ((match = directRegex.exec(xml)) !== null) {
        const name = decodeXmlEntities(match[1]);
        const val = decodeXmlEntities(match[2]);
        if (name) {
          params.set(name, val);
          rawMap[name] = val;
        }
      }
    }

    return { parameters: params, rawMap, fault };
  }

  /**
   * Extracts parameter names from GetParameterNamesResponse
   */
  static extractParameterInfoList(xml: string): string[] {
    return this.extractParameterInfoListDetailed(xml).map((p) => p.name);
  }

  /**
   * Extracts parameter details (name and writable flag) from GetParameterNamesResponse
   */
  static extractParameterInfoListDetailed(xml: string): Array<{ name: string; writable: boolean }> {
    const list: Array<{ name: string; writable: boolean }> = [];
    if (!xml) return list;

    const structRegex = /<(?:[a-zA-Z0-9_-]+:)?ParameterInfoStruct(?:\s+[^>]*)?>([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?ParameterInfoStruct>/gi;
    let match: RegExpExecArray | null;

    while ((match = structRegex.exec(xml)) !== null) {
      const block = match[1];
      const name = this.extractTag(block, 'Name');
      const writableTag = this.extractTag(block, 'Writable');
      if (name) {
        list.push({
          name: name.trim(),
          writable: writableTag === '1' || writableTag === 'true',
        });
      }
    }

    if (list.length === 0) {
      const directRegex = /<(?:[a-zA-Z0-9_-]+:)?Name[^>]*>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?Name>/gi;
      while ((match = directRegex.exec(xml)) !== null) {
        const name = match[1].trim();
        if (name && !list.some((l) => l.name === name)) {
          list.push({ name, writable: false });
        }
      }
    }

    return list;
  }

  /**
   * Normalizes Optical RX power to standard float dBm (e.g. -21.45 dBm)
   * Supports: 0.1 µW raw power, 0.01 dBm scaled integer, and direct float string.
   */
  static normalizeOpticalRxPower(raw: string | number | undefined): number | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const cleanStr = String(raw).replace(/dBm|dbm|\s+/g, '').trim();
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return undefined;

    // Disconnected optical signal (LOS)
    if (num === 0) return -40.0;

    // Case A: Realtek/Broadcom raw power in 0.1 µW (num > 100) -> convert to dBm
    // Formula: dBm = 10 * log10((num / 10) / 1000)
    if (num > 100) {
      const uW = num / 10;
      const dbm = 10 * Math.log10(uW / 1000);
      return Number(dbm.toFixed(2));
    }

    // Case B: Scaled Integer (e.g. -2145 means -21.45 dBm)
    if (num < -100) {
      return Number((num / 100).toFixed(2));
    }

    // Case C: Standard direct float string (e.g. "-21.45")
    return Number(num.toFixed(2));
  }

  /**
   * Normalizes Optical TX power to standard float dBm (typically +1.0 to +4.0 dBm)
   */
  static normalizeOpticalTxPower(raw: string | number | undefined): number | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const cleanStr = String(raw).replace(/dBm|dbm|\s+/g, '').trim();
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return undefined;

    // Case A: Raw power in 0.1 µW (num > 1000) -> convert to dBm
    if (num > 1000) {
      const uW = num / 10;
      const dbm = 10 * Math.log10(uW / 1000);
      return Number(dbm.toFixed(2));
    }

    // Case B: Scaled integer in 0.01 dBm (e.g. 240 => +2.40 dBm)
    if (num >= 100 && num <= 1000) {
      return Number((num / 100).toFixed(2));
    }

    // Case C: Direct float string (e.g. 2.45)
    return Number(num.toFixed(2));
  }

  /**
   * Normalizes Bias Current (uA to mA)
   */
  static normalizeBiasCurrent(raw: string | number | undefined): number | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const num = parseFloat(String(raw).replace(/mA|uA|\s+/g, ''));
    if (isNaN(num)) return undefined;
    if (num > 1000) return Number((num / 1000).toFixed(2)); // uA -> mA
    return Number(num.toFixed(2));
  }

  /**
   * Normalizes Optical Voltage (mV to V)
   */
  static normalizeVoltage(raw: string | number | undefined): number | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const num = parseFloat(String(raw).replace(/mV|V|\s+/g, ''));
    if (isNaN(num)) return undefined;
    if (num > 100) return Number((num / 1000).toFixed(2)); // mV -> V
    return Number(num.toFixed(2));
  }

  /**
   * Normalizes Board Temperature (mC to C)
   */
  static normalizeTemperature(raw: string | number | undefined): number | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const num = parseFloat(String(raw).replace(/C|\s+/g, ''));
    if (isNaN(num)) return undefined;
    if (num > 200) return Number((num / 1000).toFixed(1)); // millidegrees -> C
    return Number(num.toFixed(1));
  }

  /**
   * Extracts cookie value from Cookie header
   */
  static extractCookie(cookieHeader: string | undefined, cookieName: string): string | undefined {
    if (!cookieHeader) return undefined;
    const match = cookieHeader.match(new RegExp('(?:^|;\\s*)' + cookieName + '=([^;]+)'));
    return match ? decodeURIComponent(match[1].trim()) : undefined;
  }

  /**
   * Generates all vendor serial number aliases (ASCII / Hex-Prefix / Case variants)
   * Prevents MongoDB query mismatches on live ONT Inform/Response exchanges.
   */
  static getSerialNumberAliases(rawSerial?: string): string[] {
    if (!rawSerial) return [];
    const clean = rawSerial.trim();
    const aliases = new Set<string>([clean, clean.toUpperCase(), clean.toLowerCase()]);

    // Check if starts with 8-character hex vendor ID (e.g. 48575443 -> HWTC)
    if (/^[0-9a-fA-F]{8}/.test(clean)) {
      try {
        const hexPrefix = clean.slice(0, 8);
        const rest = clean.slice(8);
        let ascii = '';
        for (let i = 0; i < 8; i += 2) {
          ascii += String.fromCharCode(parseInt(hexPrefix.substr(i, 2), 16));
        }
        if (/^[a-zA-Z0-9_-]+$/.test(ascii)) {
          const decoded = ascii + rest;
          aliases.add(decoded);
          aliases.add(decoded.toUpperCase());
          aliases.add(decoded.toLowerCase());
        }
      } catch (_) {}
    }

    // Check if starts with 4-letter ASCII vendor ID (e.g. HWTC -> 48575443)
    if (/^[a-zA-Z]{4}/.test(clean)) {
      try {
        const asciiPrefix = clean.slice(0, 4);
        const rest = clean.slice(4);
        let hex = '';
        for (let i = 0; i < 4; i++) {
          hex += asciiPrefix.charCodeAt(i).toString(16).padStart(2, '0');
        }
        const encoded = hex + rest;
        aliases.add(encoded);
        aliases.add(encoded.toUpperCase());
        aliases.add(encoded.toLowerCase());
      } catch (_) {}
    }

    return Array.from(aliases);
  }

  /**
   * Masks sensitive credentials (passwords, encryption keys, tokens) in raw XML
   */
  static maskSensitiveData(xml: string): string {
    if (!xml || typeof xml !== 'string') return '';
    return xml
      .replace(/(<(?:\w+:)?(?:KeyPassphrase|Password|PreSharedKey|WPAKey|Secret|Token|AuthPassword)[^>]*>)([\s\S]*?)(<\/(?:\w+:)?(?:KeyPassphrase|Password|PreSharedKey|WPAKey|Secret|Token|AuthPassword)>)/gi, '$1********$3')
      .replace(/(<Name>[^<]*(?:KeyPassphrase|Password|PreSharedKey|Secret)[^<]*<\/Name>\s*<Value[^>]*>)([\s\S]*?)(<\/Value>)/gi, '$1********$3');
  }
}
