import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const DIGITALOCEAN_STATUS_BASE_URL = 'https://status.digitalocean.com/api/v2'

export type DigitalOceanStatusPage = {
  id: string
  name: string
  url: string
  timeZone: string
  updatedAt: string
}

export type DigitalOceanStatus = {
  indicator: string
  description: string
}

export type DigitalOceanStatusComponent = {
  id: string
  name: string
  status: string
  createdAt?: string | undefined
  updatedAt?: string | undefined
  position?: number | undefined
  groupId?: string | null | undefined
  pageId?: string | undefined
  group?: boolean | undefined
  onlyShowIfDegraded?: boolean | undefined
  description?: string | null | undefined
  components: string[]
}

export type DigitalOceanStatusIncident = {
  id: string
  name: string
  status: string
  impact: string
  shortlink?: string | undefined
  createdAt?: string | undefined
  updatedAt?: string | undefined
  monitoringAt?: string | null | undefined
  resolvedAt?: string | null | undefined
  startedAt?: string | undefined
  scheduledFor?: string | null | undefined
  scheduledUntil?: string | null | undefined
  incidentUpdates: DigitalOceanStatusIncidentUpdate[]
  components: DigitalOceanStatusComponent[]
}

export type DigitalOceanStatusIncidentUpdate = {
  id: string
  status: string
  body: string
  createdAt?: string | undefined
  updatedAt?: string | undefined
  displayAt?: string | undefined
  affectedComponents: {
    code?: string | undefined
    name?: string | undefined
    oldStatus?: string | undefined
    newStatus?: string | undefined
  }[]
}

export type DigitalOceanStatusSummary = {
  page: DigitalOceanStatusPage
  status: DigitalOceanStatus
  components: DigitalOceanStatusComponent[]
  incidents: DigitalOceanStatusIncident[]
  scheduledMaintenances: DigitalOceanStatusIncident[]
}

export type DigitalOceanStatusClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class DigitalOceanStatusClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: DigitalOceanStatusClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DIGITALOCEAN_STATUS_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getSummary(): Promise<DigitalOceanStatusSummary> {
    const parsed = await this.getJson('/summary.json')
    if (!isRecord(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'DigitalOcean Status summary response must be an object.')
    }

    return {
      page: parsePage(parsed.page),
      status: parseStatus(parsed.status),
      components: Array.isArray(parsed.components) ? parsed.components.map(parseComponent) : [],
      incidents: Array.isArray(parsed.incidents) ? parsed.incidents.map(parseIncident) : [],
      scheduledMaintenances: Array.isArray(parsed.scheduled_maintenances) ? parsed.scheduled_maintenances.map(parseIncident) : [],
    }
  }

  async listIncidents(scope: 'unresolved' | 'recent'): Promise<{ page: DigitalOceanStatusPage; incidents: DigitalOceanStatusIncident[] }> {
    const parsed = await this.getJson(scope === 'unresolved' ? '/incidents/unresolved.json' : '/incidents.json')
    if (!isRecord(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'DigitalOcean Status incidents response must be an object.')
    }

    return {
      page: parsePage(parsed.page),
      incidents: Array.isArray(parsed.incidents) ? parsed.incidents.map(parseIncident) : [],
    }
  }

  async listMaintenances(scope: 'upcoming' | 'active' | 'recent'): Promise<{ page: DigitalOceanStatusPage; maintenances: DigitalOceanStatusIncident[] }> {
    const path = scope === 'upcoming'
      ? '/scheduled-maintenances/upcoming.json'
      : scope === 'active'
        ? '/scheduled-maintenances/active.json'
        : '/scheduled-maintenances.json'
    const parsed = await this.getJson(path)
    if (!isRecord(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'DigitalOcean Status scheduled maintenances response must be an object.')
    }

    return {
      page: parsePage(parsed.page),
      maintenances: Array.isArray(parsed.scheduled_maintenances) ? parsed.scheduled_maintenances.map(parseIncident) : [],
    }
  }

  private async getJson(path: string): Promise<unknown> {
    const response = await this.fetchImpl(new URL(`${this.baseUrl}${path}`), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'DigitalOcean Status returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'DigitalOcean Status request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function parsePage(value: unknown): DigitalOceanStatusPage {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'DigitalOcean Status page must be an object.')
  }

  return {
    id: readString(value, 'id'),
    name: readString(value, 'name'),
    url: readString(value, 'url'),
    timeZone: readString(value, 'time_zone'),
    updatedAt: readString(value, 'updated_at'),
  }
}

function parseStatus(value: unknown): DigitalOceanStatus {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'DigitalOcean Status status must be an object.')
  }

  return {
    indicator: readString(value, 'indicator'),
    description: readString(value, 'description'),
  }
}

function parseComponent(value: unknown): DigitalOceanStatusComponent {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'DigitalOcean Status component must be an object.')
  }

  return {
    id: readString(value, 'id'),
    name: readString(value, 'name'),
    status: readString(value, 'status'),
    ...(readOptionalString(value, 'created_at') !== undefined ? { createdAt: readOptionalString(value, 'created_at') } : {}),
    ...(readOptionalString(value, 'updated_at') !== undefined ? { updatedAt: readOptionalString(value, 'updated_at') } : {}),
    ...(typeof value.position === 'number' ? { position: value.position } : {}),
    ...(typeof value.group_id === 'string' || value.group_id === null ? { groupId: value.group_id } : {}),
    ...(readOptionalString(value, 'page_id') !== undefined ? { pageId: readOptionalString(value, 'page_id') } : {}),
    ...(typeof value.group === 'boolean' ? { group: value.group } : {}),
    ...(typeof value.only_show_if_degraded === 'boolean' ? { onlyShowIfDegraded: value.only_show_if_degraded } : {}),
    ...(typeof value.description === 'string' || value.description === null ? { description: value.description } : {}),
    components: Array.isArray(value.components) ? value.components.filter((entry): entry is string => typeof entry === 'string') : [],
  }
}

function parseIncident(value: unknown): DigitalOceanStatusIncident {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'DigitalOcean Status incident must be an object.')
  }

  return {
    id: readString(value, 'id'),
    name: readString(value, 'name'),
    status: readString(value, 'status'),
    impact: readString(value, 'impact'),
    ...(readOptionalString(value, 'shortlink') !== undefined ? { shortlink: readOptionalString(value, 'shortlink') } : {}),
    ...(readOptionalString(value, 'created_at') !== undefined ? { createdAt: readOptionalString(value, 'created_at') } : {}),
    ...(readOptionalString(value, 'updated_at') !== undefined ? { updatedAt: readOptionalString(value, 'updated_at') } : {}),
    ...(typeof value.monitoring_at === 'string' || value.monitoring_at === null ? { monitoringAt: value.monitoring_at } : {}),
    ...(typeof value.resolved_at === 'string' || value.resolved_at === null ? { resolvedAt: value.resolved_at } : {}),
    ...(readOptionalString(value, 'started_at') !== undefined ? { startedAt: readOptionalString(value, 'started_at') } : {}),
    ...(typeof value.scheduled_for === 'string' || value.scheduled_for === null ? { scheduledFor: value.scheduled_for } : {}),
    ...(typeof value.scheduled_until === 'string' || value.scheduled_until === null ? { scheduledUntil: value.scheduled_until } : {}),
    incidentUpdates: Array.isArray(value.incident_updates) ? value.incident_updates.map(parseIncidentUpdate) : [],
    components: Array.isArray(value.components) ? value.components.map(parseComponent) : [],
  }
}

function parseIncidentUpdate(value: unknown): DigitalOceanStatusIncidentUpdate {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'DigitalOcean Status incident update must be an object.')
  }

  return {
    id: readString(value, 'id'),
    status: readString(value, 'status'),
    body: readString(value, 'body'),
    ...(readOptionalString(value, 'created_at') !== undefined ? { createdAt: readOptionalString(value, 'created_at') } : {}),
    ...(readOptionalString(value, 'updated_at') !== undefined ? { updatedAt: readOptionalString(value, 'updated_at') } : {}),
    ...(readOptionalString(value, 'display_at') !== undefined ? { displayAt: readOptionalString(value, 'display_at') } : {}),
    affectedComponents: Array.isArray(value.affected_components) ? value.affected_components.filter(isRecord).map(component => ({
      ...(readOptionalString(component, 'code') !== undefined ? { code: readOptionalString(component, 'code') } : {}),
      ...(readOptionalString(component, 'name') !== undefined ? { name: readOptionalString(component, 'name') } : {}),
      ...(readOptionalString(component, 'old_status') !== undefined ? { oldStatus: readOptionalString(component, 'old_status') } : {}),
      ...(readOptionalString(component, 'new_status') !== undefined ? { newStatus: readOptionalString(component, 'new_status') } : {}),
    })) : [],
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = readOptionalString(record, key)
  if (value === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', `DigitalOcean Status response field ${key} must be a string.`)
  }

  return value
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const message = value.message ?? value.error
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
