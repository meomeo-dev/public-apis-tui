import {
  DigitalOceanStatusClient,
  type DigitalOceanStatusComponent,
  type DigitalOceanStatusIncident,
  type DigitalOceanStatusPage,
  type DigitalOceanStatus,
} from '../../infrastructure/openApis/digitalOceanStatusClient.js'

export const DIGITALOCEAN_STATUS_COMPONENT_DEFAULT_LIMIT = 50
export const DIGITALOCEAN_STATUS_COMPONENT_LIMIT_CAP = 222
export const DIGITALOCEAN_STATUS_EVENT_DEFAULT_LIMIT = 50
export const DIGITALOCEAN_STATUS_EVENT_LIMIT_CAP = 100

export type DigitalOceanStatusSummaryInput = {
  componentQuery?: string | undefined
  componentStatus?: string | undefined
  componentLimit?: number | undefined
}

export type DigitalOceanStatusIncidentsInput = {
  scope?: 'unresolved' | 'recent' | undefined
  limit?: number | undefined
  includeUpdates?: boolean | undefined
}

export type DigitalOceanStatusMaintenancesInput = {
  scope?: 'upcoming' | 'active' | 'recent' | undefined
  limit?: number | undefined
  includeUpdates?: boolean | undefined
}

export type DigitalOceanStatusSummaryResult = {
  kind: 'digitaloceanstatus.summary'
  api: DigitalOceanStatusApiMetadata & {
    endpoint: 'GET /summary.json'
    componentLimitCap: number
    observedComponentCount: number
  }
  query: {
    componentQuery?: string | undefined
    componentStatus?: string | undefined
    componentLimit: number
  }
  page: DigitalOceanStatusPage
  status: DigitalOceanStatus
  count: number
  totals: {
    components: number
    incidents: number
    scheduledMaintenances: number
  }
  components: DigitalOceanStatusComponentProjection[]
  activeIncidents: DigitalOceanStatusEventProjection[]
  scheduledMaintenances: DigitalOceanStatusEventProjection[]
}

export type DigitalOceanStatusEventsResult = {
  kind: 'digitaloceanstatus.incidents' | 'digitaloceanstatus.maintenances'
  api: DigitalOceanStatusApiMetadata & {
    endpoint: 'GET /incidents/unresolved.json' | 'GET /incidents.json' | 'GET /scheduled-maintenances/upcoming.json' | 'GET /scheduled-maintenances/active.json' | 'GET /scheduled-maintenances.json'
    limitCap: number
  }
  query: {
    scope: string
    limit: number
    includeUpdates: boolean
  }
  page: DigitalOceanStatusPage
  count: number
  events: DigitalOceanStatusEventProjection[]
}

type DigitalOceanStatusApiMetadata = {
  provider: 'digitalocean-status'
  authentication: 'none'
  usesBrowserClickstream: false
  docs: 'https://status.digitalocean.com/api'
  homepage: 'https://status.digitalocean.com/'
  rateLimit: 'not documented'
  transport: 'HTTPS JSON'
  cacheControl: 'Statuspage responses expose short cache-control TTLs.'
}

type DigitalOceanStatusComponentProjection = {
  id: string
  name: string
  status: string
  group?: boolean | undefined
  groupId?: string | null | undefined
  groupName?: string | undefined
  updatedAt?: string | undefined
  componentCount: number
}

type DigitalOceanStatusEventProjection = {
  id: string
  name: string
  status: string
  impact: string
  shortlink?: string | undefined
  createdAt?: string | undefined
  updatedAt?: string | undefined
  startedAt?: string | undefined
  monitoringAt?: string | null | undefined
  resolvedAt?: string | null | undefined
  scheduledFor?: string | null | undefined
  scheduledUntil?: string | null | undefined
  componentNames: string[]
  latestUpdate?: {
    status: string
    body: string
    displayAt?: string | undefined
  } | undefined
  updates?: {
    status: string
    body: string
    displayAt?: string | undefined
  }[] | undefined
}

export async function getDigitalOceanStatusSummary(input: DigitalOceanStatusSummaryInput = {}): Promise<DigitalOceanStatusSummaryResult> {
  const query = normalizeDigitalOceanStatusSummaryInput(input)
  const client = new DigitalOceanStatusClient()
  const summary = await client.getSummary()
  const componentGroupNames = new Map(
    summary.components
      .filter(component => component.group === true)
      .map(component => [component.id, component.name]),
  )
  const components = summary.components
    .filter(component => matchesComponent(component, query))
    .slice(0, query.componentLimit)
    .map(component => projectComponent(component, componentGroupNames))

  return {
    kind: 'digitaloceanstatus.summary',
    api: {
      ...createMetadata(),
      endpoint: 'GET /summary.json',
      componentLimitCap: DIGITALOCEAN_STATUS_COMPONENT_LIMIT_CAP,
      observedComponentCount: DIGITALOCEAN_STATUS_COMPONENT_LIMIT_CAP,
    },
    query,
    page: summary.page,
    status: summary.status,
    count: components.length,
    totals: {
      components: summary.components.length,
      incidents: summary.incidents.length,
      scheduledMaintenances: summary.scheduledMaintenances.length,
    },
    components,
    activeIncidents: summary.incidents.map(incident => projectEvent(incident, false)),
    scheduledMaintenances: summary.scheduledMaintenances.map(maintenance => projectEvent(maintenance, false)),
  }
}

export async function listDigitalOceanStatusIncidents(input: DigitalOceanStatusIncidentsInput = {}): Promise<DigitalOceanStatusEventsResult> {
  const query = normalizeDigitalOceanStatusIncidentsInput(input)
  const client = new DigitalOceanStatusClient()
  const response = await client.listIncidents(query.scope)
  return {
    kind: 'digitaloceanstatus.incidents',
    api: {
      ...createMetadata(),
      endpoint: query.scope === 'unresolved' ? 'GET /incidents/unresolved.json' : 'GET /incidents.json',
      limitCap: DIGITALOCEAN_STATUS_EVENT_LIMIT_CAP,
    },
    query,
    page: response.page,
    count: Math.min(response.incidents.length, query.limit),
    events: response.incidents.slice(0, query.limit).map(incident => projectEvent(incident, query.includeUpdates)),
  }
}

export async function listDigitalOceanStatusMaintenances(input: DigitalOceanStatusMaintenancesInput = {}): Promise<DigitalOceanStatusEventsResult> {
  const query = normalizeDigitalOceanStatusMaintenancesInput(input)
  const client = new DigitalOceanStatusClient()
  const response = await client.listMaintenances(query.scope)
  return {
    kind: 'digitaloceanstatus.maintenances',
    api: {
      ...createMetadata(),
      endpoint: query.scope === 'upcoming'
        ? 'GET /scheduled-maintenances/upcoming.json'
        : query.scope === 'active'
          ? 'GET /scheduled-maintenances/active.json'
          : 'GET /scheduled-maintenances.json',
      limitCap: DIGITALOCEAN_STATUS_EVENT_LIMIT_CAP,
    },
    query,
    page: response.page,
    count: Math.min(response.maintenances.length, query.limit),
    events: response.maintenances.slice(0, query.limit).map(maintenance => projectEvent(maintenance, query.includeUpdates)),
  }
}

export function normalizeDigitalOceanStatusSummaryInput(input: DigitalOceanStatusSummaryInput): DigitalOceanStatusSummaryResult['query'] {
  return {
    ...(normalizeOptionalText(input.componentQuery) !== undefined ? { componentQuery: normalizeOptionalText(input.componentQuery) } : {}),
    ...(normalizeOptionalText(input.componentStatus) !== undefined ? { componentStatus: normalizeOptionalText(input.componentStatus) } : {}),
    componentLimit: normalizeCount(input.componentLimit, DIGITALOCEAN_STATUS_COMPONENT_DEFAULT_LIMIT, DIGITALOCEAN_STATUS_COMPONENT_LIMIT_CAP, 'componentLimit'),
  }
}

export function normalizeDigitalOceanStatusIncidentsInput(input: DigitalOceanStatusIncidentsInput): DigitalOceanStatusEventsResult['query'] & { scope: 'unresolved' | 'recent' } {
  const scope = input.scope ?? 'unresolved'
  if (scope !== 'unresolved' && scope !== 'recent') {
    throw new Error('DigitalOcean Status incident scope must be unresolved or recent.')
  }

  return {
    scope,
    limit: normalizeCount(input.limit, DIGITALOCEAN_STATUS_EVENT_DEFAULT_LIMIT, DIGITALOCEAN_STATUS_EVENT_LIMIT_CAP, 'limit'),
    includeUpdates: input.includeUpdates === true,
  }
}

export function normalizeDigitalOceanStatusMaintenancesInput(input: DigitalOceanStatusMaintenancesInput): DigitalOceanStatusEventsResult['query'] & { scope: 'upcoming' | 'active' | 'recent' } {
  const scope = input.scope ?? 'upcoming'
  if (scope !== 'upcoming' && scope !== 'active' && scope !== 'recent') {
    throw new Error('DigitalOcean Status maintenance scope must be upcoming, active, or recent.')
  }

  return {
    scope,
    limit: normalizeCount(input.limit, DIGITALOCEAN_STATUS_EVENT_DEFAULT_LIMIT, DIGITALOCEAN_STATUS_EVENT_LIMIT_CAP, 'limit'),
    includeUpdates: input.includeUpdates === true,
  }
}

function matchesComponent(component: DigitalOceanStatusComponent, query: DigitalOceanStatusSummaryResult['query']): boolean {
  if (query.componentStatus !== undefined && component.status.toLowerCase() !== query.componentStatus.toLowerCase()) {
    return false
  }
  if (query.componentQuery === undefined) {
    return true
  }
  return component.name.toLowerCase().includes(query.componentQuery.toLowerCase())
}

function projectComponent(
  component: DigitalOceanStatusComponent,
  componentGroupNames: ReadonlyMap<string, string> = new Map(),
): DigitalOceanStatusComponentProjection {
  return {
    id: component.id,
    name: component.name,
    status: component.status,
    ...(component.group !== undefined ? { group: component.group } : {}),
    ...(component.groupId !== undefined ? { groupId: component.groupId } : {}),
    ...(typeof component.groupId === 'string' && componentGroupNames.get(component.groupId) !== undefined ? { groupName: componentGroupNames.get(component.groupId) } : {}),
    ...(component.updatedAt !== undefined ? { updatedAt: component.updatedAt } : {}),
    componentCount: component.components.length,
  }
}

function projectEvent(event: DigitalOceanStatusIncident, includeUpdates: boolean): DigitalOceanStatusEventProjection {
  const updates = event.incidentUpdates.map(update => ({
    status: update.status,
    body: update.body,
    ...(update.displayAt !== undefined ? { displayAt: update.displayAt } : {}),
  }))
  return {
    id: event.id,
    name: event.name,
    status: event.status,
    impact: event.impact,
    ...(event.shortlink !== undefined ? { shortlink: event.shortlink } : {}),
    ...(event.createdAt !== undefined ? { createdAt: event.createdAt } : {}),
    ...(event.updatedAt !== undefined ? { updatedAt: event.updatedAt } : {}),
    ...(event.startedAt !== undefined ? { startedAt: event.startedAt } : {}),
    ...(event.monitoringAt !== undefined ? { monitoringAt: event.monitoringAt } : {}),
    ...(event.resolvedAt !== undefined ? { resolvedAt: event.resolvedAt } : {}),
    ...(event.scheduledFor !== undefined ? { scheduledFor: event.scheduledFor } : {}),
    ...(event.scheduledUntil !== undefined ? { scheduledUntil: event.scheduledUntil } : {}),
    componentNames: event.components.map(component => component.name),
    ...(updates[0] !== undefined ? { latestUpdate: updates[0] } : {}),
    ...(includeUpdates ? { updates } : {}),
  }
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

function normalizeCount(value: number | undefined, fallback: number, cap: number, name: string): number {
  if (value === undefined) {
    return fallback
  }
  if (!Number.isInteger(value) || value < 1 || value > cap) {
    throw new Error(`DigitalOcean Status ${name} must be an integer between 1 and ${cap}.`)
  }

  return value
}

function createMetadata(): DigitalOceanStatusApiMetadata {
  return {
    provider: 'digitalocean-status',
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://status.digitalocean.com/api',
    homepage: 'https://status.digitalocean.com/',
    rateLimit: 'not documented',
    transport: 'HTTPS JSON',
    cacheControl: 'Statuspage responses expose short cache-control TTLs.',
  }
}
