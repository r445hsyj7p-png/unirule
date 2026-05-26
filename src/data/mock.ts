// Mock data for Unirule Security Platform

export const mockWorkspaces = [
  { id: 'ws-1', name: 'Hauptnetzwerk GmbH', icon: '🏢', active: true },
  { id: 'ws-2', name: 'DMZ Infrastruktur', icon: '🔒', active: false },
  { id: 'ws-3', name: 'IoT Segment', icon: '📡', active: false },
]

export const mockUser = {
  name: 'Alex Wagner',
  email: 'a.wagner@corp.de',
  avatar: '',
  role: 'Security Admin',
}

export const mockNotifications = [
  { id: '1', title: 'Kritische Schwachstelle erkannt', body: 'CVE-2024-1234 auf fw-core-01 gefunden', severity: 'critical', read: false, time: new Date(Date.now() - 5 * 60000), href: '/threats' },
  { id: '2', title: 'Ungewöhnlicher Traffic', body: 'IoT-Zone → Corp LAN: 847 Verbindungen/min', severity: 'high', read: false, time: new Date(Date.now() - 22 * 60000), href: '/threats' },
  { id: '3', title: 'Policy-Verletzung', body: 'Gerät 192.168.30.45 überschreitet erlaubte Ports', severity: 'medium', read: false, time: new Date(Date.now() - 67 * 60000), href: '/policies' },
  { id: '4', title: 'UniFi Poller Sync', body: 'Letzte Synchronisierung erfolgreich (247 Geräte)', severity: 'info', read: true, time: new Date(Date.now() - 120 * 60000), href: '/integrations' },
  { id: '5', title: 'Neues Gerät erkannt', body: 'MAC: 00:1A:2B:3C:4D:5E in VLAN 20', severity: 'low', read: true, time: new Date(Date.now() - 240 * 60000), href: '/devices' },
]

// Dashboard metrics
export const mockMetrics = {
  totalDevices: 247,
  activeThreats: 12,
  policyViolations: 34,
  zeroTrustScore: 68,
  openAlerts: 7,
  networkZones: 8,
  firewallRules: 156,
  blockedConnections: 8432,
}

// Traffic over time (Mbps)
export const mockTrafficData = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  inbound: Math.floor(Math.random() * 800 + 200),
  outbound: Math.floor(Math.random() * 600 + 100),
  blocked: Math.floor(Math.random() * 150 + 20),
}))

// Threat timeline
export const mockThreatTimeline = Array.from({ length: 14 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (13 - i))
  return {
    date: d.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }),
    critical: Math.floor(Math.random() * 5),
    high: Math.floor(Math.random() * 12),
    medium: Math.floor(Math.random() * 20),
    low: Math.floor(Math.random() * 30),
  }
})

// Zone traffic distribution — alle 8 Zonen
export const mockZoneDistribution = [
  { name: 'Corp LAN',    value: 38, color: '#3b82f6' },
  { name: 'DMZ',         value: 16, color: '#f59e0b' },
  { name: 'IoT',         value: 14, color: '#10b981' },
  { name: 'Guest',       value: 11, color: '#8b5cf6' },
  { name: 'Management',  value:  7, color: '#ef4444' },
  { name: 'OT/SCADA',    value:  5, color: '#ec4899' },
  { name: 'Server Farm', value:  6, color: '#06b6d4' },
  { name: 'VoIP',        value:  3, color: '#84cc16' },
]

// Network zones — alle 8 inkl. VoIP
export const mockZones = [
  { id: 'z1', name: 'Corp LAN',    vlan: 10, cidr: '10.0.10.0/24',    devices: 98, riskScore: 35, color: '#3b82f6', gateway: '10.0.10.1',    description: 'Hauptnetzwerk für Arbeitsplätze' },
  { id: 'z2', name: 'DMZ',         vlan: 20, cidr: '10.0.20.0/24',    devices: 12, riskScore: 62, color: '#f59e0b', gateway: '10.0.20.1',    description: 'Demilitarisierte Zone für öffentliche Dienste' },
  { id: 'z3', name: 'IoT Segment', vlan: 30, cidr: '192.168.30.0/24', devices: 67, riskScore: 78, color: '#10b981', gateway: '192.168.30.1', description: 'Isoliertes IoT-Netzwerk' },
  { id: 'z4', name: 'Guest WLAN',  vlan: 40, cidr: '172.16.40.0/24',  devices: 24, riskScore: 45, color: '#8b5cf6', gateway: '172.16.40.1', description: 'Gastnetzwerk ohne LAN-Zugang' },
  { id: 'z5', name: 'Management',  vlan: 50, cidr: '10.0.50.0/28',    devices:  8, riskScore: 20, color: '#ef4444', gateway: '10.0.50.1',   description: 'Out-of-Band Management' },
  { id: 'z6', name: 'OT/SCADA',   vlan: 60, cidr: '192.168.60.0/24', devices: 31, riskScore: 85, color: '#ec4899', gateway: '192.168.60.1', description: 'Operational Technology Netzwerk' },
  { id: 'z7', name: 'Server Farm', vlan: 70, cidr: '10.0.70.0/24',    devices: 22, riskScore: 40, color: '#06b6d4', gateway: '10.0.70.1',   description: 'Interne Server und Dienste' },
  { id: 'z8', name: 'VoIP',        vlan: 80, cidr: '10.0.80.0/24',    devices: 45, riskScore: 28, color: '#84cc16', gateway: '10.0.80.1',   description: 'Telefonie und Kommunikation' },
]

// Network devices
export const mockDevices = [
  { id: 'd1',  name: 'USG-PRO-4',      type: 'firewall',    ip: '10.0.1.1',        mac: '00:1A:2B:3C:4D:01', zone: 'Management',  status: 'online',     os: 'UniFi OS 3.2.7',        lastSeen: new Date(Date.now() - 2000),    vulnerabilities: 0,  model: 'UniFi Security Gateway Pro' },
  { id: 'd2',  name: 'USW-Pro-48',     type: 'switch',      ip: '10.0.50.2',       mac: '00:1A:2B:3C:4D:02', zone: 'Management',  status: 'online',     os: 'UniFi OS 6.6.55',       lastSeen: new Date(Date.now() - 5000),    vulnerabilities: 0,  model: 'UniFi Switch Pro 48' },
  { id: 'd3',  name: 'UAP-AC-PRO-01',  type: 'ap',          ip: '10.0.50.10',      mac: '00:1A:2B:3C:4D:03', zone: 'Management',  status: 'online',     os: 'UniFi 6.5.28',          lastSeen: new Date(Date.now() - 8000),    vulnerabilities: 1,  model: 'UniFi AP AC Pro' },
  { id: 'd4',  name: 'workstation-01', type: 'workstation', ip: '10.0.10.45',      mac: 'DC:A6:32:4E:5F:11', zone: 'Corp LAN',    status: 'online',     os: 'Windows 11 22H2',       lastSeen: new Date(Date.now() - 60000),   vulnerabilities: 3,  model: 'Dell OptiPlex 7090' },
  { id: 'd5',  name: 'srv-web-01',     type: 'server',      ip: '10.0.20.10',      mac: '00:50:56:AB:CD:01', zone: 'DMZ',         status: 'online',     os: 'Ubuntu 22.04 LTS',      lastSeen: new Date(Date.now() - 30000),   vulnerabilities: 2,  model: 'VMware VM' },
  { id: 'd6',  name: 'camera-lobby',   type: 'iot',         ip: '192.168.30.20',   mac: 'B8:27:EB:AA:BB:CC', zone: 'IoT Segment', status: 'online',     os: 'Embedded Linux',        lastSeen: new Date(Date.now() - 45000),   vulnerabilities: 7,  model: 'Hikvision DS-2CD2T47G2' },
  { id: 'd7',  name: 'printer-floor2', type: 'printer',     ip: '192.168.30.45',   mac: '00:80:77:11:22:33', zone: 'IoT Segment', status: 'online',     os: 'HP FutureSmart',        lastSeen: new Date(Date.now() - 300000),  vulnerabilities: 4,  model: 'HP LaserJet Pro' },
  { id: 'd8',  name: 'scada-hmi-01',   type: 'ot',          ip: '192.168.60.10',   mac: '00:08:74:AD:BE:EF', zone: 'OT/SCADA',   status: 'online',     os: 'Windows 7 (EoL)',       lastSeen: new Date(Date.now() - 120000),  vulnerabilities: 12, model: 'Siemens S7-1500 HMI' },
  { id: 'd9',  name: 'laptop-ceo',     type: 'laptop',      ip: '10.0.10.201',     mac: 'A4:C3:F0:BE:EF:01', zone: 'Corp LAN',    status: 'online',     os: 'macOS 14.3',            lastSeen: new Date(Date.now() - 900000),  vulnerabilities: 0,  model: 'MacBook Pro M3' },
  { id: 'd10', name: 'unknown-device', type: 'unknown',     ip: '172.16.40.87',    mac: '00:11:22:33:44:55', zone: 'Guest WLAN', status: 'suspicious', os: 'Unknown',               lastSeen: new Date(Date.now() - 600000),  vulnerabilities: 0,  model: 'Unbekannt' },
  { id: 'd11', name: 'voip-phone-01',  type: 'voip',        ip: '10.0.80.10',      mac: '00:15:65:AB:CD:EF', zone: 'VoIP',        status: 'online',     os: 'Cisco IP Phone 7.3',    lastSeen: new Date(Date.now() - 15000),   vulnerabilities: 1,  model: 'Cisco CP-8841' },
  { id: 'd12', name: 'srv-backup-01',  type: 'server',      ip: '10.0.70.5',       mac: '00:50:56:CC:DD:01', zone: 'Server Farm', status: 'online',     os: 'Debian 12',             lastSeen: new Date(Date.now() - 90000),   vulnerabilities: 0,  model: 'HPE ProLiant DL360' },
]

// Threats / Alerts
export const mockThreats = [
  { id: 't1', title: 'Kritische RCE-Schwachstelle',  description: 'CVE-2024-21762 (CVSS 9.8) auf FortiGate-kompatiblem Gerät. Remote Code Execution ohne Auth möglich.',                  severity: 'critical', status: 'open',          device: 'USG-PRO-4',      zone: 'Management',  timestamp: new Date(Date.now() - 3 * 60000),     category: 'Vulnerability',     cve: 'CVE-2024-21762' },
  { id: 't2', title: 'Lateral Movement erkannt',     description: 'Gerät 192.168.30.20 kommuniziert mit 34 internen Hosts. Muster entspricht Wurm-Verhalten.',                             severity: 'critical', status: 'investigating', device: 'camera-lobby',   zone: 'IoT Segment', timestamp: new Date(Date.now() - 18 * 60000),    category: 'Intrusion',         cve: null },
  { id: 't3', title: 'Veraltetes Betriebssystem',    description: 'SCADA-HMI läuft unter Windows 7 (EOL seit 2020). Keine Sicherheitsupdates verfügbar.',                                  severity: 'high',     status: 'open',          device: 'scada-hmi-01',   zone: 'OT/SCADA',   timestamp: new Date(Date.now() - 2 * 3600000),   category: 'Compliance',        cve: null },
  { id: 't4', title: 'Brute-Force SSH-Angriff',      description: '4.200 fehlgeschlagene Login-Versuche von 185.220.101.0/24 auf srv-web-01 innerhalb von 10 Minuten.',                     severity: 'high',     status: 'blocked',       device: 'srv-web-01',     zone: 'DMZ',         timestamp: new Date(Date.now() - 45 * 60000),    category: 'Attack',            cve: null },
  { id: 't5', title: 'Unverschlüsselte Übertragung', description: 'IoT-Gerät sendet Kameradaten über HTTP (Port 80) ohne TLS-Verschlüsselung.',                                             severity: 'medium',   status: 'open',          device: 'camera-lobby',   zone: 'IoT Segment', timestamp: new Date(Date.now() - 5 * 3600000),   category: 'Configuration',     cve: null },
  { id: 't6', title: 'DNS Tunneling Verdacht',       description: 'Ungewöhnlich hohe DNS-Anfragen von workstation-01 an externe Resolver (> 500/min).',                                     severity: 'medium',   status: 'investigating', device: 'workstation-01', zone: 'Corp LAN',    timestamp: new Date(Date.now() - 8 * 3600000),   category: 'Data Exfiltration', cve: null },
  { id: 't7', title: 'IoT-Gerät ohne Isolation',     description: 'HP-Drucker kommuniziert direkt mit Corp-LAN-Hosts. Verstößt gegen Segmentierungsrichtlinie.',                            severity: 'medium',   status: 'open',          device: 'printer-floor2', zone: 'IoT Segment', timestamp: new Date(Date.now() - 12 * 3600000),  category: 'Policy Violation',  cve: null },
  { id: 't8', title: 'Unbekanntes Gerät im Gastnetz',description: 'MAC-Adresse 00:11:22:33:44:55 entspricht keinem registrierten Hersteller. Mögliches MAC-Spoofing.',                     severity: 'low',      status: 'open',          device: 'unknown-device', zone: 'Guest WLAN', timestamp: new Date(Date.now() - 1 * 3600000),   category: 'Anomaly',           cve: null },
  { id: 't9', title: 'VoIP-Protokoll-Anomalie',      description: 'SIP INVITE Flood erkannt: 2.300 Anfragen/min von 10.0.80.10. Möglicher DoS-Angriff auf Telefonsystem.',                 severity: 'high',     status: 'open',          device: 'voip-phone-01',  zone: 'VoIP',        timestamp: new Date(Date.now() - 30 * 60000),    category: 'Attack',            cve: null },
]

// Policy Violations (separates Dataset)
export const mockPolicyViolations = [
  { id: 'pv1', rule: 'DENY_IOT_TO_CORP',       device: 'camera-lobby',   srcIp: '192.168.30.20', dstIp: '10.0.10.45', port: 445,  proto: 'TCP', zone: 'IoT Segment', timestamp: new Date(Date.now() - 2 * 60000),  count: 847 },
  { id: 'pv2', rule: 'NO_CLEAR_TEXT_HTTP',      device: 'printer-floor2', srcIp: '192.168.30.45', dstIp: '10.0.10.1',  port: 80,   proto: 'TCP', zone: 'IoT Segment', timestamp: new Date(Date.now() - 15 * 60000), count: 234 },
  { id: 'pv3', rule: 'DNS_INTERNAL_ONLY',       device: 'workstation-01', srcIp: '10.0.10.45',    dstIp: '8.8.8.8',    port: 53,   proto: 'UDP', zone: 'Corp LAN',    timestamp: new Date(Date.now() - 8 * 60000),  count: 523 },
  { id: 'pv4', rule: 'OT_ISOLATION',            device: 'scada-hmi-01',   srcIp: '192.168.60.10', dstIp: '10.0.10.50', port: 3389, proto: 'TCP', zone: 'OT/SCADA',   timestamp: new Date(Date.now() - 45 * 60000), count: 12 },
  { id: 'pv5', rule: 'NO_MGMT_FROM_GUEST',      device: 'unknown-device', srcIp: '172.16.40.87',  dstIp: '10.0.50.2',  port: 22,   proto: 'TCP', zone: 'Guest WLAN', timestamp: new Date(Date.now() - 3 * 60000),  count: 5 },
]

// Zero Trust Score Breakdown
export const mockZeroTrustBreakdown = [
  { category: 'Segmentierung',      score: 55, maxScore: 100, issues: 3 },
  { category: 'Authentifizierung',  score: 70, maxScore: 100, issues: 2 },
  { category: 'Verschlüsselung',    score: 60, maxScore: 100, issues: 4 },
  { category: 'Monitoring',         score: 80, maxScore: 100, issues: 1 },
  { category: 'Least Privilege',    score: 65, maxScore: 100, issues: 3 },
  { category: 'Device Trust',       score: 72, maxScore: 100, issues: 2 },
]

// Zero Trust Policies
export const mockPolicySuggestions = [
  { id: 'p1', title: 'IoT → Corp LAN vollständig blockieren',       description: 'Das IoT-Segment hat aktuell Zugriff auf Corp-LAN-Ressourcen. Nach Zero-Trust-Prinzip muss dieser Pfad vollständig gesperrt werden.',   impact: 'critical', effort: 'low',    status: 'pending',   category: 'Segmentierung',       affectedZones: ['IoT Segment', 'Corp LAN'],   suggestedRule: 'DENY all from 192.168.30.0/24 to 10.0.10.0/24',                                                     reasoning: 'Lateral-Movement-Angriff erkannt. IoT-Geräte benötigen keinen Zugang zum Corp-Netzwerk.', source: 'batfish-analyse' },
  { id: 'p2', title: 'MFA für Management-Zugriff erzwingen',        description: 'Zugriff auf das Management-VLAN (50) erfolgt aktuell ohne Multi-Faktor-Authentifizierung.',                                               impact: 'high',     effort: 'medium', status: 'pending',   category: 'Authentifizierung',   affectedZones: ['Management'],                suggestedRule: 'REQUIRE mfa for VLAN 50 access from Corp LAN',                                                      reasoning: 'Management-Zugang ohne MFA verletzt Zero-Trust-Grundsätze.',                              source: 'policy-engine' },
  { id: 'p3', title: 'OT/SCADA Air-Gap simulieren',                 description: 'Das SCADA-Netz ist erreichbar aus dem Corp LAN. Nur dedizierte Jump-Hosts sollten Zugriff haben.',                                        impact: 'critical', effort: 'high',   status: 'in_review', category: 'Segmentierung',       affectedZones: ['OT/SCADA', 'Corp LAN'],      suggestedRule: 'ALLOW from 10.0.50.5 (jumphost) to 192.168.60.0/24; DENY all others',                              reasoning: 'Windows 7 EOL + direkter LAN-Zugang = kritisches Risiko für OT-Infrastruktur.',           source: 'batfish-analyse' },
  { id: 'p4', title: 'TLS 1.2 Minimum erzwingen',                   description: 'Mehrere Geräte verwenden TLS 1.0/1.1 oder kein TLS. Minimum TLS 1.2 ist Pflicht.',                                                        impact: 'high',     effort: 'medium', status: 'pending',   category: 'Verschlüsselung',     affectedZones: ['IoT Segment', 'DMZ'],        suggestedRule: 'DENY TLS < 1.2 on all zones; BLOCK HTTP on IoT VLAN 30',                                            reasoning: 'Kameradaten werden unverschlüsselt übertragen. TLS 1.0/1.1 als kompromittiert bekannt.',  source: 'ntopng-scan' },
  { id: 'p5', title: 'DNS-Resolver auf interne Server beschränken', description: 'Workstations können externe DNS-Resolver direkt anfragen. Nur interne Resolver erlauben.',                                                  impact: 'medium',   effort: 'low',    status: 'approved',  category: 'DNS-Sicherheit',      affectedZones: ['Corp LAN'],                  suggestedRule: 'ALLOW UDP/TCP 53 only to 10.0.10.1; DENY all other DNS',                                            reasoning: 'DNS-Tunneling-Verdacht erkannt. Zentrale Resolver ermöglichen Logging und Filterung.',     source: 'ntopng-scan' },
  { id: 'p6', title: 'Mikrosegmentierung Server Farm',              description: 'Server kommunizieren untereinander ohne Einschränkung. Least-Privilege-Kommunikation einführen.',                                           impact: 'medium',   effort: 'high',   status: 'pending',   category: 'Mikrosegmentierung',  affectedZones: ['Server Farm'],               suggestedRule: 'DENY intra-zone traffic; ALLOW only documented service ports',                                       reasoning: 'East-West-Traffic ohne Filterung ermöglicht Ausbreitung bei Kompromittierung.',           source: 'batfish-analyse' },
  { id: 'p7', title: 'VoIP-Zone isolieren',                         description: 'VoIP-Zone (VLAN 80) hat Zugriff auf Corp LAN. Nur SIP-Trunk zum PBX-Server erlauben.',                                                    impact: 'medium',   effort: 'low',    status: 'pending',   category: 'Segmentierung',       affectedZones: ['VoIP', 'Corp LAN'],          suggestedRule: 'ALLOW UDP 5060 from 10.0.80.0/24 to 10.0.70.20 (pbx); DENY all other Corp access',                 reasoning: 'SIP INVITE Flood erkannt. Isolation reduziert Angriffsfläche erheblich.',                 source: 'ntopng-scan' },
]

// Firewall rules
export const mockFirewallRules = [
  { id: 'r1', name: 'ALLOW_CORP_TO_INTERNET', action: 'allow', src: '10.0.10.0/24',       dst: 'any',                                             port: 'any', protocol: 'any', zone: 'Corp LAN',    enabled: true,  hits: 45821 },
  { id: 'r2', name: 'DENY_IOT_TO_CORP',       action: 'deny',  src: '192.168.30.0/24',    dst: '10.0.10.0/24',                                    port: 'any', protocol: 'any', zone: 'IoT Segment', enabled: false, hits: 0 },
  { id: 'r3', name: 'ALLOW_DMZ_HTTPS',        action: 'allow', src: 'any',                dst: '10.0.20.10',                                      port: '443', protocol: 'tcp', zone: 'DMZ',         enabled: true,  hits: 28934 },
  { id: 'r4', name: 'BLOCK_TELNET',           action: 'deny',  src: 'any',                dst: 'any',                                             port: '23',  protocol: 'tcp', zone: 'all',         enabled: true,  hits: 234 },
  { id: 'r5', name: 'ALLOW_MGMT_SSH',         action: 'allow', src: '10.0.50.0/28',       dst: 'any',                                             port: '22',  protocol: 'tcp', zone: 'Management',  enabled: true,  hits: 1204 },
  { id: 'r6', name: 'DENY_GUEST_RFC1918',     action: 'deny',  src: '172.16.40.0/24',     dst: '10.0.0.0/8,192.168.0.0/16,172.16.0.0/12',       port: 'any', protocol: 'any', zone: 'Guest WLAN',  enabled: true,  hits: 8421 },
  { id: 'r7', name: 'DENY_OT_FROM_CORP',      action: 'deny',  src: '10.0.10.0/24',       dst: '192.168.60.0/24',                                 port: 'any', protocol: 'any', zone: 'OT/SCADA',   enabled: false, hits: 0 },
  { id: 'r8', name: 'ALLOW_VOIP_SIP',         action: 'allow', src: '10.0.80.0/24',       dst: '10.0.70.20',                                      port: '5060',protocol: 'udp', zone: 'VoIP',        enabled: true,  hits: 9823 },
]

// Integration tools status
export const mockIntegrations = [
  { id: 'i1', name: 'UniFi Poller', description: 'Metriken und Gerätedaten von UniFi-Controller',    status: 'connected', lastSync: new Date(Date.now() - 120000),    version: 'v2.0.7',      icon: '📡', datapoints: 14782,  category: 'Collection'     },
  { id: 'i2', name: 'go-unifi',     description: 'Go-basierter UniFi API Client für Echtzeit-Kontrolle', status: 'connected', lastSync: new Date(Date.now() - 30000),  version: 'v0.0.29',     icon: '🔗', datapoints: 0,      category: 'Control'        },
  { id: 'i3', name: 'Batfish',      description: 'Netzwerk-Konfigurationsanalyse und Policy-Prüfung',  status: 'connected', lastSync: new Date(Date.now() - 3600000),  version: '2024.01.03',  icon: '🐟', datapoints: 156,    category: 'Analysis'       },
  { id: 'i4', name: 'ntopng',       description: 'Traffic-Analyse und Anomalie-Erkennung',             status: 'connected', lastSync: new Date(Date.now() - 60000),    version: 'v6.2',        icon: '📊', datapoints: 892341, category: 'Monitoring'     },
  { id: 'i5', name: 'Graphviz',     description: 'Netzwerk-Topologie-Visualisierung',                  status: 'idle',      lastSync: new Date(Date.now() - 7200000),  version: '2.50.0',      icon: '🕸️', datapoints: 0,      category: 'Visualization'  },
  { id: 'i6', name: 'pyunifi',      description: 'Python-Client für UniFi Controller API',             status: 'error',     lastSync: new Date(Date.now() - 86400000), version: 'v2.22.3',     icon: '🐍', datapoints: 0,      category: 'Control'        },
]

// Log entries
export const mockLogs = [
  { id: 'l1',  timestamp: new Date(Date.now() - 30000),  level: 'critical', source: 'fw-core',       message: 'DENY TCP 192.168.30.20:54832 -> 10.0.10.45:445 (SMB)',                         zone: 'IoT Segment', device: 'USG-PRO-4' },
  { id: 'l2',  timestamp: new Date(Date.now() - 45000),  level: 'warning',  source: 'ids',           message: 'ET MALWARE CobaltStrike Beacon activity detected',                              zone: 'Corp LAN',    device: 'workstation-01' },
  { id: 'l3',  timestamp: new Date(Date.now() - 62000),  level: 'info',     source: 'dhcp',          message: 'DHCPACK 10.0.10.201 laptop-ceo.corp.local via eth0',                           zone: 'Corp LAN',    device: 'srv-dhcp-01' },
  { id: 'l4',  timestamp: new Date(Date.now() - 90000),  level: 'error',    source: 'vpn',           message: 'SSL handshake failed: TLS 1.0 not supported (client 203.0.113.45)',             zone: 'DMZ',         device: 'srv-web-01' },
  { id: 'l5',  timestamp: new Date(Date.now() - 120000), level: 'warning',  source: 'fw-core',       message: 'Rate limit exceeded: SSH 185.220.101.47 -> 10.0.20.10 (4200 conn/10min)',       zone: 'DMZ',         device: 'USG-PRO-4' },
  { id: 'l6',  timestamp: new Date(Date.now() - 180000), level: 'info',     source: 'unifi-poller',  message: 'Sync complete: 247 devices, 8 APs, 3 switches',                                zone: 'Management',  device: 'unifi-controller' },
  { id: 'l7',  timestamp: new Date(Date.now() - 240000), level: 'warning',  source: 'ntopng',        message: 'DNS anomaly: workstation-01 queries 523 unique domains/min',                    zone: 'Corp LAN',    device: 'workstation-01' },
  { id: 'l8',  timestamp: new Date(Date.now() - 300000), level: 'info',     source: 'dhcp',          message: 'New device: 00:11:22:33:44:55 assigned 172.16.40.87',                         zone: 'Guest WLAN',  device: 'USG-PRO-4' },
  { id: 'l9',  timestamp: new Date(Date.now() - 360000), level: 'critical', source: 'batfish',       message: 'Policy violation: OT/SCADA reachable from Corp LAN (no ACL)',                  zone: 'OT/SCADA',   device: 'USW-Pro-48' },
  { id: 'l10', timestamp: new Date(Date.now() - 420000), level: 'info',     source: 'fw-core',       message: 'ALLOW HTTPS 10.0.10.45:49231 -> 8.8.8.8:443',                                 zone: 'Corp LAN',    device: 'USG-PRO-4' },
  { id: 'l11', timestamp: new Date(Date.now() - 480000), level: 'warning',  source: 'sip-monitor',   message: 'SIP INVITE flood from 10.0.80.10: 2300 req/min (threshold: 100)',               zone: 'VoIP',        device: 'voip-phone-01' },
  { id: 'l12', timestamp: new Date(Date.now() - 540000), level: 'info',     source: 'backup-agent',  message: 'Backup job completed: /data → s3://corp-backup/2026-05-26 (14.7 GB)',           zone: 'Server Farm', device: 'srv-backup-01' },
]

// Bandwidth over 7 days (GB/day)
export const mockBandwidth = Array.from({ length: 7 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (6 - i))
  return {
    day: d.toLocaleDateString('de-DE', { weekday: 'short' }),
    rx: Math.floor(Math.random() * 50 + 20),
    tx: Math.floor(Math.random() * 30 + 10),
  }
})

// Network topology nodes for SVG map
export const mockTopologyNodes = [
  { id: 'internet',  label: 'Internet',                  type: 'cloud',    x: 400, y: 40  },
  { id: 'fw',        label: 'USG-PRO-4',                 type: 'firewall', x: 400, y: 130 },
  { id: 'core-sw',   label: 'Core Switch',               type: 'switch',   x: 400, y: 230 },
  { id: 'corp-sw',   label: 'Corp SW',                   type: 'switch',   x: 130, y: 330 },
  { id: 'dmz-sw',    label: 'DMZ SW',                    type: 'switch',   x: 270, y: 330 },
  { id: 'iot-sw',    label: 'IoT SW',                    type: 'switch',   x: 400, y: 330 },
  { id: 'mgmt-sw',   label: 'Mgmt SW',                   type: 'switch',   x: 530, y: 330 },
  { id: 'voip-sw',   label: 'VoIP SW',                   type: 'switch',   x: 660, y: 330 },
  { id: 'corp-ap',   label: 'Corp APs',                  type: 'ap',       x: 80,  y: 430 },
  { id: 'corp-ws',   label: 'Workstations\n(98 Geräte)', type: 'devices',  x: 185, y: 430 },
  { id: 'dmz-srv',   label: 'Web Server\n(12 Geräte)',   type: 'server',   x: 270, y: 430 },
  { id: 'iot-cam',   label: 'Kameras/IoT\n(67 Geräte)', type: 'iot',      x: 400, y: 430 },
  { id: 'mgmt-ctrl', label: 'UniFi\nController',         type: 'server',   x: 530, y: 430 },
  { id: 'voip-dev',  label: 'VoIP\n(45 Geräte)',         type: 'voip',     x: 660, y: 430 },
]

export const mockTopologyEdges = [
  { from: 'internet',  to: 'fw',        label: 'WAN'    },
  { from: 'fw',        to: 'core-sw',   label: 'trunk'  },
  { from: 'core-sw',   to: 'corp-sw',   label: 'VLAN 10' },
  { from: 'core-sw',   to: 'dmz-sw',    label: 'VLAN 20' },
  { from: 'core-sw',   to: 'iot-sw',    label: 'VLAN 30' },
  { from: 'core-sw',   to: 'mgmt-sw',   label: 'VLAN 50' },
  { from: 'core-sw',   to: 'voip-sw',   label: 'VLAN 80' },
  { from: 'corp-sw',   to: 'corp-ap',   label: '' },
  { from: 'corp-sw',   to: 'corp-ws',   label: '' },
  { from: 'dmz-sw',    to: 'dmz-srv',   label: '' },
  { from: 'iot-sw',    to: 'iot-cam',   label: '' },
  { from: 'mgmt-sw',   to: 'mgmt-ctrl', label: '' },
  { from: 'voip-sw',   to: 'voip-dev',  label: '' },
]
