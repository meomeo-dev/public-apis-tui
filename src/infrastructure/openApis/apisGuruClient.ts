import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const APIS_GURU_DEFAULT_BASE_URL = 'https://api.apis.guru/v2'

export type ApisGuruApiVersion = {
  version: string
  title: string
  description?: string | undefined
  categories: string[]
  providerName?: string | undefined
  serviceName?: string | undefined
  openapiVersion?: string | undefined
  swaggerUrl?: string | undefined
  swaggerYamlUrl?: string | undefined
  link?: string | undefined
  added?: string | undefined
  updated?: string | undefined
  preferred: boolean
  unofficial: boolean
}

export type ApisGuruApiEntry = {
  id: string
  added?: string | undefined
  preferred?: string | undefined
  versions: ApisGuruApiVersion[]
}

export type ApisGuruMetrics = {
  numSpecs: number
  numAPIs: number
  numEndpoints: number
  unreachable?: number | undefined
  invalid?: number | undefined
  unofficial?: number | undefined
  fixes?: number | undefined
  fixedPct?: number | undefined
  stars?: number | undefined
  issues?: number | undefined
  thisWeek?: {
    added?: number | undefined
    updated?: number | undefined
  } | undefined
  numDrivers?: number | undefined
  numProviders?: number | undefined
  datasets: {
    title: string
    data: Record<string, number>
  }[]
}

export type ApisGuruClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class ApisGuruClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: ApisGuruClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? APIS_GURU_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async listProviders(): Promise<string[]> {
    const parsed = await this.getJson('/providers.json')
    if (!isRecord(parsed) || !Array.isArray(parsed.data)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'APIs.guru providers response must be an object with a data array.')
    }

    return parsed.data.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
  }

  async listApis(): Promise<ApisGuruApiEntry[]> {
    const parsed = await this.getJson('/list.json')
    if (!isRecord(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'APIs.guru list response must be an API-id keyed object.')
    }

    return Object.entries(parsed).map(([id, value]) => parseApiEntry(id, value))
  }

  async getMetrics(): Promise<ApisGuruMetrics> {
    return parseMetrics(await this.getJson('/metrics.json'))
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
      throw new RuntimeFailure('OPEN_API_FAILED', 'APIs.guru returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? response.statusText ?? 'APIs.guru request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

function parseApiEntry(id: string, value: unknown): ApisGuruApiEntry {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `APIs.guru entry ${id} must be an object.`)
  }
  const versionsRecord = isRecord(value.versions) ? value.versions : {}
  const preferred = typeof value.preferred === 'string' ? value.preferred : undefined
  const versions = Object.entries(versionsRecord).map(([version, versionValue]) => parseApiVersion(version, versionValue, preferred))
  return {
    id,
    ...(typeof value.added === 'string' ? { added: value.added } : {}),
    ...(preferred !== undefined ? { preferred } : {}),
    versions,
  }
}

function parseApiVersion(version: string, value: unknown, preferred: string | undefined): ApisGuruApiVersion {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `APIs.guru version ${version} must be an object.`)
  }
  const info = isRecord(value.info) ? value.info : {}
  return {
    version,
    title: typeof info.title === 'string' && info.title.trim() !== '' ? info.title : version,
    ...(typeof info.description === 'string' ? { description: info.description } : {}),
    categories: Array.isArray(info['x-apisguru-categories'])
      ? info['x-apisguru-categories'].filter((entry): entry is string => typeof entry === 'string')
      : [],
    ...(typeof info['x-providerName'] === 'string' ? { providerName: info['x-providerName'] } : {}),
    ...(typeof info['x-serviceName'] === 'string' ? { serviceName: info['x-serviceName'] } : {}),
    ...(typeof value.openapiVer === 'string' ? { openapiVersion: value.openapiVer } : {}),
    ...(typeof value.swaggerUrl === 'string' ? { swaggerUrl: value.swaggerUrl } : {}),
    ...(typeof value.swaggerYamlUrl === 'string' ? { swaggerYamlUrl: value.swaggerYamlUrl } : {}),
    ...(typeof value.link === 'string' ? { link: value.link } : {}),
    ...(typeof value.added === 'string' ? { added: value.added } : {}),
    ...(typeof value.updated === 'string' ? { updated: value.updated } : {}),
    preferred: version === preferred,
    unofficial: info['x-unofficialSpec'] === true || info['x-unofficialSpec'] === 'true',
  }
}

function parseMetrics(value: unknown): ApisGuruMetrics {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'APIs.guru metrics response must be an object.')
  }

  return {
    numSpecs: readNumber(value, 'numSpecs'),
    numAPIs: readNumber(value, 'numAPIs'),
    numEndpoints: readNumber(value, 'numEndpoints'),
    ...(typeof value.unreachable === 'number' ? { unreachable: value.unreachable } : {}),
    ...(typeof value.invalid === 'number' ? { invalid: value.invalid } : {}),
    ...(typeof value.unofficial === 'number' ? { unofficial: value.unofficial } : {}),
    ...(typeof value.fixes === 'number' ? { fixes: value.fixes } : {}),
    ...(typeof value.fixedPct === 'number' ? { fixedPct: value.fixedPct } : {}),
    ...(typeof value.stars === 'number' ? { stars: value.stars } : {}),
    ...(typeof value.issues === 'number' ? { issues: value.issues } : {}),
    ...(isRecord(value.thisWeek) ? { thisWeek: parseThisWeek(value.thisWeek) } : {}),
    ...(typeof value.numDrivers === 'number' ? { numDrivers: value.numDrivers } : {}),
    ...(typeof value.numProviders === 'number' ? { numProviders: value.numProviders } : {}),
    datasets: Array.isArray(value.datasets) ? value.datasets.map(parseDataset) : [],
  }
}

function parseThisWeek(value: Record<string, unknown>): NonNullable<ApisGuruMetrics['thisWeek']> {
  return {
    ...(typeof value.added === 'number' ? { added: value.added } : {}),
    ...(typeof value.updated === 'number' ? { updated: value.updated } : {}),
  }
}

function parseDataset(value: unknown): ApisGuruMetrics['datasets'][number] {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'APIs.guru metrics dataset must be an object.')
  }
  return {
    title: typeof value.title === 'string' ? value.title : 'dataset',
    data: isRecord(value.data) ? readNumberRecord(value.data) : {},
  }
}

function readNumberRecord(value: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'))
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', `APIs.guru response field ${key} must be a number.`)
  }

  return value
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
