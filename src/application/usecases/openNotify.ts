import { OpenNotifyClient, type OpenNotifyAstronaut, type OpenNotifyIssPosition } from '../../infrastructure/openApis/openNotifyClient.js'

type OpenNotifyApiMeta = {
  provider: 'opennotify'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTP JSON REST'
  security: 'http-only'
  boundary: string
}

export type OpenNotifyAstronautsResult = {
  kind: 'opennotify.astros'
  api: OpenNotifyApiMeta
  count: number
  people: OpenNotifyAstronaut[]
}

export type OpenNotifyIssNowResult = {
  kind: 'opennotify.issNow'
  api: OpenNotifyApiMeta
  timestamp: number
  observedAt: string
  position: OpenNotifyIssPosition
}

export async function listOpenNotifyAstronauts(): Promise<OpenNotifyAstronautsResult> {
  const client = new OpenNotifyClient()
  const response = await client.listAstronauts()
  return {
    kind: 'opennotify.astros',
    api: createOpenNotifyMeta('GET /astros.json'),
    count: response.number,
    people: response.people,
  }
}

export async function getOpenNotifyIssNow(): Promise<OpenNotifyIssNowResult> {
  const client = new OpenNotifyClient()
  const response = await client.getIssNow()
  return {
    kind: 'opennotify.issNow',
    api: createOpenNotifyMeta('GET /iss-now.json'),
    timestamp: response.timestamp,
    observedAt: new Date(response.timestamp * 1000).toISOString(),
    position: response.position,
  }
}

function createOpenNotifyMeta(endpoint: string): OpenNotifyApiMeta {
  return {
    provider: 'opennotify',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'http://open-notify.org/Open-Notify-API/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTP JSON REST',
    security: 'http-only',
    boundary: 'Legacy Open Notify exposes astros and iss-now as no-auth HTTP JSON endpoints; HTTPS and iss-pass are not usable in current probes.',
  }
}
