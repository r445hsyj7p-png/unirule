/**
 * UniFi Controller API Client
 * Handles authentication, session management and data retrieval.
 * Bypasses self-signed TLS certificates (common on UniFi devices).
 */

import https from 'node:https'
import axios, { type AxiosInstance } from 'axios'

export interface UnifiConfig {
  url: string        // e.g. https://192.168.1.1
  username: string
  password: string
  site: string       // e.g. 'default'
  verifySsl: boolean
}

export interface UnifiDevice {
  _id: string
  mac: string
  ip: string
  name?: string
  model?: string
  type: string
  version?: string
  uptime?: number
  state: number        // 1 = connected
  last_seen: number
  num_sta?: number
  vlan?: number
}

export interface UnifiClient {
  _id: string
  mac: string
  ip: string
  hostname?: string
  oui?: string
  network?: string
  vlan?: number
  last_seen: number
  uptime: number
  rx_bytes: number
  tx_bytes: number
  signal?: number
}

export interface UnifiEvent {
  _id: string
  datetime: string
  key: string
  msg: string
  subsystem: string
  site_id?: string
  is_admin?: boolean
  time?: number
  ap?: string
  ssid?: string
  user?: string
  ip?: string
  dst_ip?: string
  dst_port?: number
  proto?: string
}

export interface UnifiFirewallRule {
  _id: string
  name: string
  enabled: boolean
  action: string
  protocol: string
  dst_address?: string
  src_address?: string
  dst_port?: string
  src_port?: string
  ruleset: string
}

export interface UnifiNetwork {
  _id: string
  name: string
  purpose: string
  vlan?: number
  ip_subnet?: string
  dhcpd_gateway?: string
  enabled: boolean
  num_sta?: number
}

export interface UnifiHealth {
  subsystem: string
  status: string
  num_user?: number
  num_guest?: number
  num_iot?: number
  tx_bytes_r?: number
  rx_bytes_r?: number
  'wan-ip'?: string
}

// ── Client ────────────────────────────────────────────────────────────────────

export class UnifiClient {
  private http: AxiosInstance
  private config: UnifiConfig
  private loggedIn = false

  constructor(config: UnifiConfig) {
    this.config = config
    this.http = axios.create({
      baseURL: config.url,
      httpsAgent: new https.Agent({ rejectUnauthorized: config.verifySsl }),
      withCredentials: true,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  private get site() { return this.config.site || 'default' }

  async login(): Promise<void> {
    // Try new UniFi OS API first (UDM / Cloud Key Gen2)
    try {
      await this.http.post('/api/auth/login', {
        username: this.config.username,
        password: this.config.password,
      })
      this.loggedIn = true
      return
    } catch {
      // fall through to classic API
    }
    // Classic UniFi Controller (v5/v6)
    const res = await this.http.post('/api/login', {
      username: this.config.username,
      password: this.config.password,
    })
    if (res.data?.meta?.rc !== 'ok') {
      throw new Error(`Login failed: ${res.data?.meta?.msg ?? 'Unknown error'}`)
    }
    this.loggedIn = true
  }

  async logout(): Promise<void> {
    try {
      await this.http.post('/api/logout')
    } catch { /* ignore */ }
    this.loggedIn = false
  }

  private async ensureLoggedIn() {
    if (!this.loggedIn) await this.login()
  }

  private async get<T>(path: string): Promise<T[]> {
    await this.ensureLoggedIn()
    const res = await this.http.get(`/api/s/${this.site}/${path}`)
    return res.data?.data ?? res.data ?? []
  }

  /** All UniFi devices (APs, Switches, Gateways) */
  async getDevices(): Promise<UnifiDevice[]> {
    return this.get('stat/device')
  }

  /** All connected clients (wired + wireless) */
  async getClients(): Promise<UnifiClient[]> {
    return this.get('stat/sta')
  }

  /** Known clients (all-time) */
  async getAllClients(): Promise<UnifiClient[]> {
    return this.get('stat/alluser')
  }

  /** Events / Log entries */
  async getEvents(limit = 3000): Promise<UnifiEvent[]> {
    return this.get(`stat/event?_limit=${limit}&_sort=-time`)
  }

  /** Firewall rules */
  async getFirewallRules(): Promise<UnifiFirewallRule[]> {
    return this.get('rest/firewallrule')
  }

  /** Network configurations (VLANs, subnets) */
  async getNetworks(): Promise<UnifiNetwork[]> {
    return this.get('rest/networkconf')
  }

  /** Site health overview */
  async getHealth(): Promise<UnifiHealth[]> {
    return this.get('stat/health')
  }

  /** Port forwarding rules */
  async getPortForwards() {
    return this.get('rest/portforward')
  }

  /** DPI (deep packet inspection) stats */
  async getDpiStats() {
    return this.get('stat/sitedpi')
  }

  /** Alarms */
  async getAlarms() {
    return this.get('cnt/alarm')
  }

  /** Test connectivity — returns site info */
  async testConnection(): Promise<{ ok: boolean; siteName?: string; version?: string }> {
    try {
      await this.login()
      const res = await this.http.get('/api/self')
      const info = res.data?.data?.[0] ?? {}
      return { ok: true, siteName: this.site, version: info.ui_version }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, siteName: undefined, version: msg }
    }
  }
}

// ── Singleton manager ─────────────────────────────────────────────────────────

let _client: UnifiClient | null = null
let _config: UnifiConfig | null = null

export function setUnifiConfig(cfg: UnifiConfig) {
  _config = cfg
  _client = new UnifiClient(cfg)
}

export function getUnifiClient(): UnifiClient {
  if (!_client || !_config) {
    throw new Error('NOT_CONFIGURED')
  }
  return _client
}

export function getUnifiConfig(): UnifiConfig | null {
  return _config
}
