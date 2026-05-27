# Unirule

Self-hosted security & policy management dashboard for UniFi networks.

Unirule connects to your UniFi controller and turns raw network data into a persistent, queryable security operations centre — with firewall rule management, packet simulation, a device registry, audit logging, and configurable alert thresholds.

---

## Feature Overview

### Dashboard
- Live counters: active clients, infrastructure devices, open threats, network zones, firewall rules
- WAN health indicator and real-time RX/TX throughput
- Automatic 30-second refresh

### Network Map
- Visual topology of all APs, switches, gateways, and connected clients
- Status badges (online / offline), model names, client counts

### Devices
- Full inventory of infrastructure devices (UDMs, USW, UAP)
- Uptime, firmware version, IP, MAC, client load per device

### Clients
- Active and recently-seen end devices with VLAN, signal strength, RX/TX data rates
- OUI-based manufacturer lookup and automatic device categorisation (IoT, mobile, server, printer, …)

### Network Zones
- VLAN / network segment overview with CIDR, gateway, purpose, member count

### Firewall Rules
- View all rule sets with action, protocol, source/destination addresses and ports
- Toggle rules enabled/disabled directly from the UI (change written back to UniFi + audit-logged)

### Packet Simulation
- Enter source IP, destination IP, port, and protocol
- Trace the packet step-by-step through the active ruleset
- Shows which rule matched (or implicit default-deny) and a full evaluation trace

### Threats
- Derived from the event stream: blocks, drops, brute-force attempts, scans, CVE mentions
- Severity classification (critical / high / medium)

### Policies
- Advisor-generated and manual security policy suggestions
- Status workflow: pending → approved / rejected
- Policy violation tracking

### Event Log
- Full event history backed by SQLite (default 30-day retention)
- Filter by level (info / warning / error / critical), free-text search, date range
- CSV export for SIEM ingestion or offline analysis

### Device Registry
- Persistent all-time MAC address registry — every device that ever appeared on the network
- Per-device metadata: name, notes, trust flag, flagged-as-suspicious, category
- "New device" notifications on first appearance

### Notifications
- In-app alert bell: new devices, threat events, policy approvals
- Mark-all-read action

### Audit Log
- Immutable log of all changes: firewall toggles, configuration updates, settings changes
- Captures before/after values and requesting IP address

### Settings

| Tab | What you can configure |
|-----|------------------------|
| **General** | Dark / light theme, font family, custom favicon |
| **Security** | Zero Trust policy flags: default-deny mode, lateral movement detection, auto-policy suggestions, IoT quarantine |
| **Notifications** | Alert thresholds: critical-immediate alerts, daily digest, new-device alerts, policy approval alerts |
| **Data** | Retention periods (events, metrics, snapshots), manual purge trigger |
| **Audit Log** | Browse and paginate the full change history |

---

## Getting Started

### Docker (recommended)

```bash
docker compose up -d
```

The app listens on **port 3000**. On first visit, create an admin password and then connect your UniFi controller under **Integrations**.

```yaml
# docker-compose.yml (excerpt)
services:
  unirule:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data      # persists config.json + unirule.db
```

> **Security note:** `data/config.json` contains your UniFi credentials and is created with mode `0600`. Never commit the `data/` directory.

### Local Development

```bash
npm install
npm run dev:full          # Vite (port 5173) + Express (port 3000) in parallel
```

Build for production:

```bash
npm run build             # tsc + vite → dist/
node --import tsx server/index.ts   # or use the Docker image
```

---

## Configuration

All runtime settings are stored in SQLite (`/data/unirule.db`) and editable via the Settings UI.

| Setting | Default | Description |
|---------|---------|-------------|
| `events_retention_days` | 30 | How long raw events are kept |
| `metrics_retention_days` | 90 | How long 1-minute metric buckets are kept |
| `snapshots_retention_days` | 14 | How long client/device snapshots are kept |
| `anonymize_after_days` | 90 | Days after which old IPs are anonymised |

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port |
| `CONFIG_PATH` | `/data/config.json` | UniFi credentials file |
| `DB_PATH` | `/data/unirule.db` | SQLite database path |

---

## Architecture

```
┌─────────────────────────────────────────┐
│  React 19 SPA (Vite)                    │
│  React Router · TanStack Query · Zustand│
│  Tailwind CSS v4 · Radix UI · Recharts  │
└────────────────┬────────────────────────┘
                 │ /api/*
┌────────────────▼────────────────────────┐
│  Express 5 (TypeScript / tsx)           │
│  Session auth · rate limiting           │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ UniFi Client │  │ SQLite (WAL)     │ │
│  │ (Axios)      │  │ better-sqlite3   │ │
│  └──────┬───────┘  └────────┬─────────┘ │
│         │                   │           │
│  ┌──────▼───────────────────▼─────────┐ │
│  │  Background ingestion loop (5 min) │ │
│  │  Events · Snapshots · Metrics      │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         │
  UniFi Controller
  (UDM, CloudKey, …)
```

**Database tables:** `events`, `client_snapshots`, `device_snapshots`, `metrics`, `known_devices`, `notifications`, `policies`, `audit_log`, `settings`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19, TypeScript |
| Build tool | Vite 8 |
| Routing | React Router 6 |
| Data fetching | TanStack Query v5 |
| State | Zustand 5 |
| UI components | Radix UI (shadcn/ui) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Backend | Express 5, Node 22 |
| Database | SQLite via better-sqlite3 |
| Auth | Session cookie + bcrypt |
| Container | Docker (multi-stage, alpine) |
