import {
  MinorPlanetCenterClient,
  type MinorPlanetCenterAsteroid,
} from '../../infrastructure/openApis/minorPlanetCenterClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const MINOR_PLANET_CENTER_DEFAULT_QUERY = 'Ceres'
export const MINOR_PLANET_CENTER_DEFAULT_LIMIT = 10
export const MINOR_PLANET_CENTER_MAX_LIMIT = 50

export type MinorPlanetCenterSearchInput = {
  query?: string | undefined
  maxEccentricity?: number | string | undefined
  maxInclination?: number | string | undefined
  maxSemiMajorAxis?: number | string | undefined
  minObservations?: number | string | undefined
  limit?: number | undefined
}

export type MinorPlanetCenterSearchQuery = {
  query: string
  maxEccentricity?: number | undefined
  maxInclination?: number | undefined
  maxSemiMajorAxis?: number | undefined
  minObservations?: number | undefined
  limit: number
}

export type MinorPlanetCenterSearchResult = {
  kind: 'minorplanetcenter.search'
  api: {
    provider: 'minorplanetcenter'
    endpoint: 'GET /api/mpc'
    docsUrl: 'https://www.asterank.com/mpc'
    apiUrl: 'https://www.asterank.com/api/mpc'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS JSON REST'
    sourceDataset: string
    queryLanguage: string
    updatePolicy: string
    boundary: string
    limitPolicy: string
  }
  query: MinorPlanetCenterSearchQuery
  upstreamQuery: Record<string, unknown>
  pagination: {
    returned: number
    limit: number
    hasMoreUnknown: true
  }
  asteroids: MinorPlanetCenterAsteroid[]
}

export async function searchMinorPlanetCenter(
  input: MinorPlanetCenterSearchInput = {},
): Promise<MinorPlanetCenterSearchResult> {
  const query = normalizeMinorPlanetCenterSearchInput(input)
  const upstreamQuery = buildUpstreamQuery(query)
  const asteroids = await new MinorPlanetCenterClient().search({
    queryJson: upstreamQuery,
    limit: query.limit,
  })
  return {
    kind: 'minorplanetcenter.search',
    api: createApiMeta(),
    query,
    upstreamQuery,
    pagination: {
      returned: asteroids.length,
      limit: query.limit,
      hasMoreUnknown: true,
    },
    asteroids,
  }
}

export function normalizeMinorPlanetCenterSearchInput(
  input: MinorPlanetCenterSearchInput = {},
): MinorPlanetCenterSearchQuery {
  const query = normalizeQuery(input.query)
  const limit = normalizeInteger({
    name: 'limit',
    value: input.limit,
    defaultValue: MINOR_PLANET_CENTER_DEFAULT_LIMIT,
    min: 1,
    max: MINOR_PLANET_CENTER_MAX_LIMIT,
  })
  const maxEccentricity = normalizeOptionalNumber({
    name: 'maxEccentricity',
    value: input.maxEccentricity,
    min: 0,
    max: 2,
  })
  const maxInclination = normalizeOptionalNumber({
    name: 'maxInclination',
    value: input.maxInclination,
    min: 0,
    max: 180,
  })
  const maxSemiMajorAxis = normalizeOptionalNumber({
    name: 'maxSemiMajorAxis',
    value: input.maxSemiMajorAxis,
    min: 0,
    max: 200,
  })
  const minObservations = normalizeOptionalInteger({
    name: 'minObservations',
    value: input.minObservations,
    min: 0,
    max: 1_000_000,
  })
  return {
    query,
    ...(maxEccentricity !== undefined ? { maxEccentricity } : {}),
    ...(maxInclination !== undefined ? { maxInclination } : {}),
    ...(maxSemiMajorAxis !== undefined ? { maxSemiMajorAxis } : {}),
    ...(minObservations !== undefined ? { minObservations } : {}),
    limit,
  }
}

function buildUpstreamQuery(
  query: MinorPlanetCenterSearchQuery,
): Record<string, unknown> {
  const upstream: Record<string, unknown> = {}
  if (query.query.trim() !== '') {
    upstream.readable_des = { $regex: escapeRegex(query.query), $options: 'i' }
  }
  if (query.maxEccentricity !== undefined) {
    upstream.e = { $lt: query.maxEccentricity }
  }
  if (query.maxInclination !== undefined) {
    upstream.i = { $lt: query.maxInclination }
  }
  if (query.maxSemiMajorAxis !== undefined) {
    upstream.a = { $lt: query.maxSemiMajorAxis }
  }
  if (query.minObservations !== undefined) {
    upstream.num_obs = { $gte: query.minObservations }
  }
  return upstream
}

function createApiMeta(): MinorPlanetCenterSearchResult['api'] {
  return {
    provider: 'minorplanetcenter',
    endpoint: 'GET /api/mpc',
    docsUrl: 'https://www.asterank.com/mpc',
    apiUrl: 'https://www.asterank.com/api/mpc',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    sourceDataset: 'Minor Planet Center MPCORB.DAT via Asterank',
    queryLanguage: [
      'The upstream endpoint accepts MongoDB-style query JSON; the CLI only',
      'generates bounded designation and numeric orbit filters.',
    ].join(' '),
    updatePolicy: 'Official Asterank docs state MPC data is updated nightly.',
    boundary: [
      'Read-only MPCORB asteroid records only; no arbitrary MongoDB query',
      'passthrough, browser scraping, HTML parsing, bulk MPCORB download,',
      'image/binary payloads, mutating behavior, account setup, or API keys.',
    ].join(' '),
    limitPolicy: [
      `CLI default limit ${MINOR_PLANET_CENTER_DEFAULT_LIMIT}, maximum`,
      `${MINOR_PLANET_CENTER_MAX_LIMIT}; invalid limits are rejected locally.`,
    ].join(' '),
  }
}

function normalizeQuery(value: string | undefined): string {
  const query = (value ?? MINOR_PLANET_CENTER_DEFAULT_QUERY).trim()
  if (query.length > 80) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'Minor Planet Center --query must be 80 characters or fewer.',
      { query: value },
    )
  }
  return query
}

function normalizeInteger(input: {
  name: string
  value: number | undefined
  defaultValue: number
  min: number
  max: number
}): number {
  const value = input.value ?? input.defaultValue
  if (!Number.isInteger(value)) {
    throw invalidNumber(input.name, value, 'must be an integer')
  }
  if (value < input.min || value > input.max) {
    throw invalidNumber(
      input.name,
      value,
      `must be between ${input.min} and ${input.max}`,
    )
  }
  return value
}

function normalizeOptionalInteger(input: {
  name: string
  value: number | string | undefined
  min: number
  max: number
}): number | undefined {
  if (input.value === undefined) return undefined
  const value = typeof input.value === 'string'
    ? Number(input.value.trim())
    : input.value
  if (!Number.isInteger(value)) {
    throw invalidNumber(input.name, input.value, 'must be an integer')
  }
  if (value < input.min || value > input.max) {
    throw invalidNumber(
      input.name,
      input.value,
      `must be between ${input.min} and ${input.max}`,
    )
  }
  return value
}

function normalizeOptionalNumber(input: {
  name: string
  value: number | string | undefined
  min: number
  max: number
}): number | undefined {
  if (input.value === undefined) return undefined
  const value = typeof input.value === 'string'
    ? Number(input.value.trim())
    : input.value
  if (!Number.isFinite(value)) {
    throw invalidNumber(input.name, input.value, 'must be a finite number')
  }
  if (value < input.min || value > input.max) {
    throw invalidNumber(
      input.name,
      input.value,
      `must be between ${input.min} and ${input.max}`,
    )
  }
  return value
}

function invalidNumber(
  name: string,
  value: number | string | undefined,
  reason: string,
): RuntimeFailure {
  return new RuntimeFailure(
    'INVALID_ARGUMENT',
    `Minor Planet Center --${toKebabCase(name)} ${reason}.`,
    { [name]: value },
  )
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)
}
