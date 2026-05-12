import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getDigitalOceanStatusSummary,
  listDigitalOceanStatusIncidents,
  listDigitalOceanStatusMaintenances,
  normalizeDigitalOceanStatusIncidentsInput,
  normalizeDigitalOceanStatusMaintenancesInput,
  normalizeDigitalOceanStatusSummaryInput,
} from '../src/application/usecases/digitalOceanStatus.js'
import { DigitalOceanStatusClient } from '../src/infrastructure/openApis/digitalOceanStatusClient.js'

const page = {
  id: 'w4cz49tckxhp',
  name: 'DigitalOcean',
  url: 'http://status.digitalocean.com',
  time_zone: 'Etc/UTC',
  updated_at: '2026-05-02T14:23:45.298Z',
}

const component = {
  id: 'p1x9rv4137gx',
  name: 'API',
  status: 'operational',
  created_at: '2020-01-01T00:00:00.000Z',
  updated_at: '2026-05-02T14:23:45.298Z',
  position: 1,
  group: false,
  group_id: null,
  only_show_if_degraded: false,
  components: [],
}

const incident = {
  id: 'inc-1',
  name: 'API latency',
  status: 'monitoring',
  impact: 'minor',
  shortlink: 'https://stspg.io/example',
  created_at: '2026-05-02T00:00:00.000Z',
  updated_at: '2026-05-02T01:00:00.000Z',
  started_at: '2026-05-02T00:00:00.000Z',
  monitoring_at: '2026-05-02T01:00:00.000Z',
  resolved_at: null,
  incident_updates: [{ id: 'upd-1', status: 'monitoring', body: 'We are monitoring API latency.', display_at: '2026-05-02T01:00:00.000Z', affected_components: [] }],
  components: [component],
}

const maintenance = {
  ...incident,
  id: 'maint-1',
  name: 'Core Infrastructure Maintenance',
  status: 'scheduled',
  impact: 'maintenance',
  scheduled_for: '2026-05-04T13:00:00.000Z',
  scheduled_until: '2026-05-04T21:00:00.000Z',
}

test('DigitalOcean Status client calls documented Statuspage endpoints', async () => {
  const requested: string[] = []
  const client = new DigitalOceanStatusClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requested.push(url.pathname)
      if (url.pathname.endsWith('/summary.json')) {
        return jsonResponse({ page, status: { indicator: 'none', description: 'All Systems Operational' }, components: [component], incidents: [], scheduled_maintenances: [maintenance] })
      }
      if (url.pathname.endsWith('/incidents/unresolved.json')) {
        return jsonResponse({ page, incidents: [incident] })
      }
      if (url.pathname.endsWith('/scheduled-maintenances/upcoming.json')) {
        return jsonResponse({ page, scheduled_maintenances: [maintenance] })
      }
      return jsonResponse({ error: 'missing' }, 404)
    }) as typeof fetch,
  })

  assert.equal((await client.getSummary()).components[0]?.name, 'API')
  assert.equal((await client.listIncidents('unresolved')).incidents[0]?.name, 'API latency')
  assert.equal((await client.listMaintenances('upcoming')).maintenances[0]?.name, 'Core Infrastructure Maintenance')
  assert.deepEqual(requested, ['/api/v2/summary.json', '/api/v2/incidents/unresolved.json', '/api/v2/scheduled-maintenances/upcoming.json'])
})

test('DigitalOcean Status usecases project no-auth metadata and curated filters', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/summary.json')) {
      return jsonResponse({ page, status: { indicator: 'none', description: 'All Systems Operational' }, components: [component], incidents: [incident], scheduled_maintenances: [maintenance] })
    }
    if (url.pathname.includes('/incidents')) {
      return jsonResponse({ page, incidents: [incident] })
    }
    return jsonResponse({ page, scheduled_maintenances: [maintenance] })
  }) as typeof fetch
  try {
    const summary = await getDigitalOceanStatusSummary({ componentQuery: 'api', componentLimit: 1 })
    assert.equal(summary.kind, 'digitaloceanstatus.summary')
    assert.equal(summary.api.authentication, 'none')
    assert.equal(summary.api.usesBrowserClickstream, false)
    assert.equal(summary.components[0]?.name, 'API')

    const incidents = await listDigitalOceanStatusIncidents({ scope: 'unresolved', includeUpdates: true })
    assert.equal(incidents.kind, 'digitaloceanstatus.incidents')
    assert.equal(incidents.events[0]?.updates?.[0]?.body, 'We are monitoring API latency.')

    const maintenances = await listDigitalOceanStatusMaintenances({ scope: 'upcoming', limit: 1 })
    assert.equal(maintenances.kind, 'digitaloceanstatus.maintenances')
    assert.equal(maintenances.events[0]?.scheduledFor, '2026-05-04T13:00:00.000Z')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('DigitalOcean Status normalizers enforce scopes and caps', () => {
  assert.deepEqual(normalizeDigitalOceanStatusSummaryInput({ componentQuery: ' API ', componentLimit: 2 }), {
    componentQuery: 'API',
    componentLimit: 2,
  })
  assert.equal(normalizeDigitalOceanStatusIncidentsInput({}).scope, 'unresolved')
  assert.equal(normalizeDigitalOceanStatusMaintenancesInput({}).scope, 'upcoming')
  assert.throws(() => normalizeDigitalOceanStatusSummaryInput({ componentLimit: 223 }), /between 1 and 222/)
  assert.throws(() => normalizeDigitalOceanStatusIncidentsInput({ scope: 'active' as never }), /unresolved or recent/)
  assert.throws(() => normalizeDigitalOceanStatusMaintenancesInput({ scope: 'bad' as never }), /upcoming, active, or recent/)
})

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
