/**
 * OUI (Organizationally Unique Identifier) database module.
 * OUI = first 3 bytes of a MAC address (6 hex chars, uppercase, no separators).
 * Example: "001A2B"
 */

export type OuiCategory =
  | 'gateway'
  | 'switch'
  | 'ap'
  | 'user'
  | 'mobile'
  | 'iot'
  | 'camera'
  | 'printer'
  | 'server'
  | 'voip'
  | 'unknown'

export interface OuiEntry {
  manufacturer: string
  category: OuiCategory
}

// ── OUI database ──────────────────────────────────────────────────────────────
// Keys: 6 uppercase hex chars (no separators), e.g. "001A2B"

export const OUI_DB: Record<string, OuiEntry> = {
  // ── Ubiquiti Networks ──────────────────────────────────────────────────────
  '0418D6': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  '24A43C': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  '44D9E7': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  '687251': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  '7483C2': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  '788A20': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  '802AA8': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  'AC8BA9': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  'B4FBE4': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  'DC9FDB': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  'E063DA': { manufacturer: 'Ubiquiti Networks', category: 'ap' },
  'F09FC2': { manufacturer: 'Ubiquiti Networks', category: 'ap' },

  // ── Cisco Systems ──────────────────────────────────────────────────────────
  '000196': { manufacturer: 'Cisco Systems', category: 'switch' },
  '000C85': { manufacturer: 'Cisco Systems', category: 'switch' },
  '000E38': { manufacturer: 'Cisco Systems', category: 'switch' },
  '00170E': { manufacturer: 'Cisco Systems', category: 'switch' },
  '001A2F': { manufacturer: 'Cisco Systems', category: 'switch' },

  // ── AVM FRITZ!Box ──────────────────────────────────────────────────────────
  '00040E': { manufacturer: 'AVM GmbH (FRITZ!Box)', category: 'gateway' },
  '546751': { manufacturer: 'AVM GmbH (FRITZ!Box)', category: 'gateway' },
  'AC162D': { manufacturer: 'AVM GmbH (FRITZ!Box)', category: 'gateway' },
  'BC0543': { manufacturer: 'AVM GmbH (FRITZ!Box)', category: 'gateway' },
  '3CA10D': { manufacturer: 'AVM GmbH (FRITZ!Box)', category: 'gateway' },
  'C02506': { manufacturer: 'AVM GmbH (FRITZ!Box)', category: 'gateway' },

  // ── TP-Link ────────────────────────────────────────────────────────────────
  '14CC20': { manufacturer: 'TP-Link Technologies', category: 'ap' },
  '18A6F7': { manufacturer: 'TP-Link Technologies', category: 'ap' },
  '503EAA': { manufacturer: 'TP-Link Technologies', category: 'ap' },
  '54AF97': { manufacturer: 'TP-Link Technologies', category: 'ap' },
  '704F57': { manufacturer: 'TP-Link Technologies', category: 'ap' },
  '8416F9': { manufacturer: 'TP-Link Technologies', category: 'ap' },

  // ── Netgear ────────────────────────────────────────────────────────────────
  '00095B': { manufacturer: 'Netgear', category: 'ap' },
  '00146C': { manufacturer: 'Netgear', category: 'ap' },
  '28C68E': { manufacturer: 'Netgear', category: 'ap' },
  '6CB0CE': { manufacturer: 'Netgear', category: 'ap' },

  // ── MikroTik ───────────────────────────────────────────────────────────────
  '4C5E0C': { manufacturer: 'MikroTik', category: 'switch' },
  '64D154': { manufacturer: 'MikroTik', category: 'switch' },
  'B869F4': { manufacturer: 'MikroTik', category: 'switch' },
  'E48D8C': { manufacturer: 'MikroTik', category: 'switch' },

  // ── Zyxel ─────────────────────────────────────────────────────────────────
  '001349': { manufacturer: 'Zyxel Communications', category: 'gateway' },
  '0090A2': { manufacturer: 'Zyxel Communications', category: 'gateway' },
  '28285D': { manufacturer: 'Zyxel Communications', category: 'gateway' },

  // ── Apple ─────────────────────────────────────────────────────────────────
  '001EC2': { manufacturer: 'Apple', category: 'user' },
  '00254B': { manufacturer: 'Apple', category: 'user' },
  '283737': { manufacturer: 'Apple', category: 'user' },
  '3C22FB': { manufacturer: 'Apple', category: 'user' },
  '48437C': { manufacturer: 'Apple', category: 'mobile' },
  '703EAC': { manufacturer: 'Apple', category: 'mobile' },
  '84A134': { manufacturer: 'Apple', category: 'user' },
  '8C7B9D': { manufacturer: 'Apple', category: 'user' },
  'A0D795': { manufacturer: 'Apple', category: 'mobile' },
  'AC87A3': { manufacturer: 'Apple', category: 'mobile' },
  'B8FF61': { manufacturer: 'Apple', category: 'user' },
  'C4B301': { manufacturer: 'Apple', category: 'user' },
  'D0034B': { manufacturer: 'Apple', category: 'user' },
  'F0989D': { manufacturer: 'Apple', category: 'user' },
  'FCE998': { manufacturer: 'Apple', category: 'user' },

  // ── Samsung ────────────────────────────────────────────────────────────────
  '0012FB': { manufacturer: 'Samsung Electronics', category: 'mobile' },
  '0808C2': { manufacturer: 'Samsung Electronics', category: 'mobile' },
  '2CAE2B': { manufacturer: 'Samsung Electronics', category: 'mobile' },
  '3C5A37': { manufacturer: 'Samsung Electronics', category: 'mobile' },
  '5001BB': { manufacturer: 'Samsung Electronics', category: 'mobile' },
  '60A10A': { manufacturer: 'Samsung Electronics', category: 'mobile' },
  '70F927': { manufacturer: 'Samsung Electronics', category: 'mobile' },
  '94D771': { manufacturer: 'Samsung Electronics', category: 'mobile' },
  'D48890': { manufacturer: 'Samsung Electronics', category: 'mobile' },

  // ── Google ─────────────────────────────────────────────────────────────────
  '089E08': { manufacturer: 'Google', category: 'iot' },
  '3C5AB4': { manufacturer: 'Google', category: 'iot' },
  '546009': { manufacturer: 'Google', category: 'iot' },
  'F4F5D8': { manufacturer: 'Google', category: 'iot' },
  '48D6D5': { manufacturer: 'Google', category: 'iot' },

  // ── Microsoft ─────────────────────────────────────────────────────────────
  '00155D': { manufacturer: 'Microsoft', category: 'user' },
  '281878': { manufacturer: 'Microsoft', category: 'user' },
  '48210B': { manufacturer: 'Microsoft', category: 'user' },
  '7C1E52': { manufacturer: 'Microsoft', category: 'user' },
  'BC8385': { manufacturer: 'Microsoft', category: 'user' },

  // ── Lenovo ─────────────────────────────────────────────────────────────────
  '28D244': { manufacturer: 'Lenovo', category: 'user' },
  '401C83': { manufacturer: 'Lenovo', category: 'user' },
  '4C1D96': { manufacturer: 'Lenovo', category: 'user' },
  '80FA5B': { manufacturer: 'Lenovo', category: 'user' },
  'C85B76': { manufacturer: 'Lenovo', category: 'user' },

  // ── Dell ──────────────────────────────────────────────────────────────────
  '001422': { manufacturer: 'Dell', category: 'user' },
  '001D09': { manufacturer: 'Dell', category: 'user' },
  'F01FAF': { manufacturer: 'Dell', category: 'user' },
  'F8DB88': { manufacturer: 'Dell', category: 'user' },
  '141877': { manufacturer: 'Dell', category: 'user' },

  // ── HP / Hewlett-Packard (workstations) ──────────────────────────────────
  '000BCD': { manufacturer: 'HP (Hewlett-Packard)', category: 'user' },
  '00110A': { manufacturer: 'HP (Hewlett-Packard)', category: 'user' },
  '3CD92B': { manufacturer: 'HP (Hewlett-Packard)', category: 'user' },
  '643150': { manufacturer: 'HP (Hewlett-Packard)', category: 'user' },
  '9C8E99': { manufacturer: 'HP (Hewlett-Packard)', category: 'user' },
  '98E7F4': { manufacturer: 'HP (Hewlett-Packard)', category: 'user' },

  // ── Hikvision (cameras) ───────────────────────────────────────────────────
  'BCAD28': { manufacturer: 'Hikvision', category: 'camera' },
  'C80210': { manufacturer: 'Hikvision', category: 'camera' },
  'D4E26D': { manufacturer: 'Hikvision', category: 'camera' },
  '2857BE': { manufacturer: 'Hikvision', category: 'camera' },
  '4419B6': { manufacturer: 'Hikvision', category: 'camera' },
  '54C415': { manufacturer: 'Hikvision', category: 'camera' },

  // ── Dahua Technology (cameras) ────────────────────────────────────────────
  '08EDED': { manufacturer: 'Dahua Technology', category: 'camera' },
  '34CE00': { manufacturer: 'Dahua Technology', category: 'camera' },
  '9CC172': { manufacturer: 'Dahua Technology', category: 'camera' },
  'E0508B': { manufacturer: 'Dahua Technology', category: 'camera' },

  // ── Axis Communications (cameras) ─────────────────────────────────────────
  '00408C': { manufacturer: 'Axis Communications', category: 'camera' },
  'ACCC8E': { manufacturer: 'Axis Communications', category: 'camera' },
  'B8A44F': { manufacturer: 'Axis Communications', category: 'camera' },

  // ── Reolink (cameras) ─────────────────────────────────────────────────────
  'EC71DB': { manufacturer: 'Reolink Digital Technology', category: 'camera' },

  // ── Sonos ─────────────────────────────────────────────────────────────────
  '000E58': { manufacturer: 'Sonos', category: 'iot' },
  'B8E937': { manufacturer: 'Sonos', category: 'iot' },
  '7828CA': { manufacturer: 'Sonos', category: 'iot' },

  // ── Philips Hue / Signify ─────────────────────────────────────────────────
  '001788': { manufacturer: 'Philips Hue (Signify)', category: 'iot' },
  'ECB5FA': { manufacturer: 'Philips Hue (Signify)', category: 'iot' },

  // ── HP (printers) ─────────────────────────────────────────────────────────
  '000085': { manufacturer: 'HP (Printer)', category: 'printer' },
  '000D9D': { manufacturer: 'HP (Printer)', category: 'printer' },
  'FC15B4': { manufacturer: 'HP (Printer)', category: 'printer' },
  'A0B3CC': { manufacturer: 'HP (Printer)', category: 'printer' },

  // ── Canon ─────────────────────────────────────────────────────────────────
  '001E8F': { manufacturer: 'Canon', category: 'printer' },
  '080037': { manufacturer: 'Canon', category: 'printer' },

  // ── Epson ─────────────────────────────────────────────────────────────────
  '0026AB': { manufacturer: 'Seiko Epson', category: 'printer' },
  '44D244': { manufacturer: 'Seiko Epson', category: 'printer' },

  // ── Brother Industries ────────────────────────────────────────────────────
  '008077': { manufacturer: 'Brother Industries', category: 'printer' },
  '001BA9': { manufacturer: 'Brother Industries', category: 'printer' },

  // ── Raspberry Pi Foundation ───────────────────────────────────────────────
  'B827EB': { manufacturer: 'Raspberry Pi Foundation', category: 'iot' },
  'DCA632': { manufacturer: 'Raspberry Pi Foundation', category: 'iot' },
  'E45F01': { manufacturer: 'Raspberry Pi Foundation', category: 'iot' },
  'D83ADD': { manufacturer: 'Raspberry Pi Foundation', category: 'iot' },
  '2CCF67': { manufacturer: 'Raspberry Pi Foundation', category: 'iot' },

  // ── Snom Technology (VoIP) ────────────────────────────────────────────────
  '000413': { manufacturer: 'Snom Technology', category: 'voip' },

  // ── Yealink (VoIP) ────────────────────────────────────────────────────────
  '805EC0': { manufacturer: 'Yealink Network Technology', category: 'voip' },
  '001565': { manufacturer: 'Yealink Network Technology', category: 'voip' },

  // ── Grandstream Networks (VoIP) ───────────────────────────────────────────
  '000B82': { manufacturer: 'Grandstream Networks', category: 'voip' },
  '000E51': { manufacturer: 'Grandstream Networks', category: 'voip' },
}

// ── Lookup ────────────────────────────────────────────────────────────────────

/**
 * Look up an OUI entry for a given MAC address string.
 *
 * The MAC is normalised (colons/hyphens/dots removed, uppercased) and the
 * first 6 characters are used as the OUI key.
 *
 * Falls back to inferCategory() on the raw OUI string that UniFi may supply,
 * and finally returns { manufacturer: 'Unknown', category: 'unknown' }.
 */
export function lookupOui(mac: string): OuiEntry {
  if (!mac) return { manufacturer: 'Unknown', category: 'unknown' }

  // Normalise: remove separators, uppercase
  const normalised = mac.replace(/[:\-\.]/g, '').toUpperCase()
  const oui = normalised.slice(0, 6)

  if (oui.length === 6 && OUI_DB[oui]) {
    return OUI_DB[oui]
  }

  // Heuristic fallback on the raw string (e.g. UniFi provides oui field like
  // "Apple, Inc." or "Hikvision Digital Technology Co., Ltd.")
  const category = inferCategory(mac)
  if (category !== 'unknown') {
    return { manufacturer: mac, category }
  }

  return { manufacturer: 'Unknown', category: 'unknown' }
}

/**
 * Infer a device category from a manufacturer name string using keyword
 * heuristics.
 */
export function inferCategory(manufacturer: string): OuiCategory {
  const m = manufacturer.toLowerCase()

  // Camera / surveillance
  if (/camera|hikvision|dahua|axis|reolink|foscam|amcrest|lorex|vivotek/.test(m)) {
    return 'camera'
  }

  // VoIP
  if (/snom|yealink|grandstream|polycom|cisco spa|aastra|fanvil|obihai|voip/.test(m)) {
    return 'voip'
  }

  // Printer
  if (/\bcanon\b|epson|brother|lexmark|xerox|ricoh|konica|kyocera|sharp.*print|\bhp\b.*print|print.*\bhp\b/.test(m)) {
    return 'printer'
  }

  // IoT / smart home
  if (/sonos|philips hue|signify|nest|ring\b|arlo|shelly|tasmota|tuya|espressif|esp8266|esp32|raspberry/.test(m)) {
    return 'iot'
  }

  // Gateway
  if (/fritz|avm/.test(m)) {
    return 'gateway'
  }

  // Switch
  if (/cisco|mikrotik/.test(m)) {
    return 'switch'
  }

  // AP / networking
  if (/ubiquiti|zyxel|netgear|tp-link|tplink|linksys|draytek|engenius/.test(m)) {
    return 'ap'
  }

  // Mobile
  if (/mobile|android|iphone|ipad|oneplus|oppo|xiaomi|huawei|motorola|nokia|lg\b/.test(m)) {
    return 'mobile'
  }

  // HP generic — after printer check so we don't over-match
  if (/\bhp\b|hewlett.packard/.test(m)) {
    return 'user'
  }

  // User workstations / general computing
  if (/apple|samsung|google|microsoft|lenovo|dell|\basus\b|acer/.test(m)) {
    return 'user'
  }

  // Server
  if (/supermicro|ibm\b|intel.*server|server.*intel|quanta|wiwynn|inspur/.test(m)) {
    return 'server'
  }

  return 'unknown'
}
