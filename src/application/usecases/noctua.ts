import {
  NoctuaClient,
  type NoctuaSkySourceResponse,
  type NoctuaSkySourceTypeCount,
} from '../../infrastructure/openApis/noctuaClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const NOCTUA_DEFAULT_SOURCE_NAME = 'Mars'
export const NOCTUA_MAX_SOURCE_NAME_LENGTH = 80

const NOCTUA_SOURCE_NAME_PATTERN = /^[A-Za-z0-9 ._'()+,-]+$/u

export type NoctuaStatsInput = Record<string, never>

export type NoctuaSourceInput = {
  name?: string | undefined
}

export type NoctuaSourceQuery = {
  name: string
}

export type NoctuaStatsResult = {
  kind: 'noctua.stats'
  api: NoctuaApiMeta & {
    endpoint: 'GET /skysources/stats/'
  }
  stats: {
    total: number
    byTypes: NoctuaSkySourceTypeCount[]
  }
}

export type NoctuaSourceResult = {
  kind: 'noctua.source'
  api: NoctuaApiMeta & {
    endpoint: 'GET /skysources/name/{str}'
  }
  query: NoctuaSourceQuery
  source: {
    shortName: string
    match?: string | undefined
    model?: string | undefined
    names: string[]
    types: string[]
    interest?: number | undefined
    modelData: NoctuaProjectedModelData
  }
}

export type NoctuaApiMeta = {
  provider: 'noctua'
  docsUrl: 'https://api.noctuasky.com/api/v1/swaggerdoc/'
  openApiUrl: 'https://api.noctuasky.com/api/v1/openapi.json'
  apiUrl: 'https://api.noctuasky.com/api/v1'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  boundary: string
  excludedEndpoints: string[]
  queryPolicy: string
}

export type NoctuaProjectedModelData = {
  albedo?: string | number | undefined
  radius?: string | number | undefined
  parent?: string | undefined
  jplHorizonId?: number | undefined
  orbitPreview?: string | undefined
  extraKeys: string[]
}

export async function getNoctuaStats(): Promise<NoctuaStatsResult> {
  const stats = await new NoctuaClient().stats()
  return {
    kind: 'noctua.stats',
    api: createApiMeta('GET /skysources/stats/'),
    stats,
  }
}

export async function getNoctuaSource(
  input: NoctuaSourceInput = {},
): Promise<NoctuaSourceResult> {
  const query = normalizeNoctuaSourceInput(input)
  const source = await new NoctuaClient().sourceByName(query.name)
  return {
    kind: 'noctua.source',
    api: createApiMeta('GET /skysources/name/{str}'),
    query,
    source: projectSkySource(source),
  }
}

export function normalizeNoctuaSourceInput(
  input: NoctuaSourceInput = {},
): NoctuaSourceQuery {
  return { name: normalizeNoctuaSourceName(input.name) }
}

export function normalizeNoctuaSourceName(value: string | undefined): string {
  const name = (value ?? NOCTUA_DEFAULT_SOURCE_NAME).trim()
  if (name.length < 1 || name.length > NOCTUA_MAX_SOURCE_NAME_LENGTH) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Noctua --name must be between 1 and',
        `${NOCTUA_MAX_SOURCE_NAME_LENGTH} characters.`,
      ].join(' '),
      { name: value },
    )
  }
  if (!NOCTUA_SOURCE_NAME_PATTERN.test(name)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      [
        'Noctua --name supports letters, digits, spaces, punctuation used in',
        'astronomical designations, and no slash or URL control characters.',
      ].join(' '),
      { name: value },
    )
  }
  return name
}

function createApiMeta(
  endpoint: NoctuaStatsResult['api']['endpoint'],
): NoctuaStatsResult['api']
function createApiMeta(
  endpoint: NoctuaSourceResult['api']['endpoint'],
): NoctuaSourceResult['api']
function createApiMeta(
  endpoint:
    | NoctuaStatsResult['api']['endpoint']
    | NoctuaSourceResult['api']['endpoint'],
): NoctuaStatsResult['api'] | NoctuaSourceResult['api'] {
  return {
    provider: 'noctua',
    endpoint,
    docsUrl: 'https://api.noctuasky.com/api/v1/swaggerdoc/',
    openApiUrl: 'https://api.noctuasky.com/api/v1/openapi.json',
    apiUrl: 'https://api.noctuasky.com/api/v1',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    boundary: [
      'Read-only skysources endpoints only; authenticated users, locations,',
      'observations, login, account mutation, arbitrary route proxying,',
      'browser scraping, upload, delete, binary, and base64 payloads are',
      'excluded.',
    ].join(' '),
    excludedEndpoints: [
      'GET/POST /locations/',
      'GET/POST /observations/',
      'GET/PUT/DELETE /users/{id}',
      'POST /users/login',
      'POST /users/',
    ],
    queryPolicy: [
      'Exact name lookup defaults to Mars and rejects slash/control',
      'characters; stats has no user supplied query.',
    ].join(' '),
  }
}

function projectSkySource(
  source: NoctuaSkySourceResponse,
): NoctuaSourceResult['source'] {
  return {
    shortName: source.shortName,
    match: source.match,
    model: source.model,
    names: source.names.slice(0, 20),
    types: source.types.slice(0, 20),
    interest: source.interest,
    modelData: projectModelData(source.modelData),
  }
}

function projectModelData(
  modelData: Record<string, unknown>,
): NoctuaProjectedModelData {
  const knownKeys = new Set([
    'albedo',
    'radius',
    'parent',
    'jpl_horizon_id',
    'orbit',
  ])
  const extraKeys = Object.keys(modelData)
    .filter(key => !knownKeys.has(key))
    .sort()
    .slice(0, 20)

  return {
    albedo: readScalar(modelData.albedo),
    radius: readScalar(modelData.radius),
    parent: readString(modelData.parent),
    jplHorizonId: readInteger(modelData.jpl_horizon_id),
    orbitPreview: readPreview(modelData.orbit),
    extraKeys,
  }
}

function readScalar(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return readString(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function readInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const numeric = Number(value)
  return Number.isInteger(numeric) ? numeric : undefined
}

function readPreview(value: unknown): string | undefined {
  const text = readString(value)
  if (text === undefined) return undefined
  return text.length > 160 ? `${text.slice(0, 159)}…` : text
}
