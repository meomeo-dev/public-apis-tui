import type { HTTPRequest, HTTPResponse, Page } from 'puppeteer-core'
import { matchEndpointRecord, type EndpointCatalog, type EndpointCatalogRecord } from './endpointCatalog.js'

export type NetworkObservation = {
  requestId: string
  method: string
  url: string
  resourceType: string
  matchedEndpointId?: string | undefined
  status?: number | undefined
  statusText?: string | undefined
  failureText?: string | undefined
  startedAt: string
  completedAt?: string | undefined
}

export type NetworkObservationSummary = {
  observedCount: number
  matchedCount: number
  failedCount: number
  endpointIds: string[]
}

export type NetworkObserverOptions = {
  catalog?: EndpointCatalog | undefined
  urlAllowlist?: string[] | undefined
  includeStaticAssets?: boolean | undefined
}

export type NetworkObservationSession = {
  observations: NetworkObservation[]
  summary: () => NetworkObservationSummary
  stop: () => void
}

let nextRequestSequence = 1

const staticResourceTypes = new Set(['image', 'media', 'font', 'stylesheet'])

export function startNetworkObservation(
  page: Page,
  options: NetworkObserverOptions = {},
): NetworkObservationSession {
  const observations: NetworkObservation[] = []
  const requestIds = new WeakMap<HTTPRequest, string>()
  const catalog = options.catalog ?? { records: [] }

  const onRequest = (request: HTTPRequest): void => {
    if (!shouldObserveRequest(request, options)) {
      return
    }

    const requestId = `req-${nextRequestSequence}`
    nextRequestSequence += 1
    requestIds.set(request, requestId)
    const requestUrl = redactUrl(request.url())
    const matched = matchEndpointRecord(catalog, { url: requestUrl, method: request.method() })
    observations.push({
      requestId,
      method: request.method(),
      url: requestUrl,
      resourceType: request.resourceType(),
      matchedEndpointId: matched?.id,
      startedAt: new Date().toISOString(),
    })
  }

  const onResponse = (response: HTTPResponse): void => {
    const observation = findObservation(observations, requestIds, response.request())
    if (observation === undefined) {
      return
    }

    observation.status = response.status()
    observation.statusText = response.statusText()
    observation.completedAt = new Date().toISOString()
  }

  const onRequestFailed = (request: HTTPRequest): void => {
    const observation = findObservation(observations, requestIds, request)
    if (observation === undefined) {
      return
    }

    observation.failureText = request.failure()?.errorText ?? 'request failed'
    observation.completedAt = new Date().toISOString()
  }

  page.on('request', onRequest)
  page.on('response', onResponse)
  page.on('requestfailed', onRequestFailed)

  return {
    observations,
    summary: () => summarizeNetworkObservations(observations, catalog),
    stop: () => {
      page.off('request', onRequest)
      page.off('response', onResponse)
      page.off('requestfailed', onRequestFailed)
    },
  }
}

export function summarizeNetworkObservations(
  observations: NetworkObservation[],
  catalog: EndpointCatalog = { records: [] },
): NetworkObservationSummary {
  const endpointIds = new Set<string>()
  for (const observation of observations) {
    if (observation.matchedEndpointId !== undefined) {
      endpointIds.add(observation.matchedEndpointId)
    }
  }

  for (const record of catalog.records) {
    if (observations.some(observation => observation.matchedEndpointId === record.id)) {
      endpointIds.add(record.id)
    }
  }

  return {
    observedCount: observations.length,
    matchedCount: observations.filter(observation => observation.matchedEndpointId !== undefined).length,
    failedCount: observations.filter(observation => observation.failureText !== undefined).length,
    endpointIds: [...endpointIds].sort(),
  }
}

function shouldObserveRequest(request: HTTPRequest, options: NetworkObserverOptions): boolean {
  if (options.includeStaticAssets !== true && staticResourceTypes.has(request.resourceType())) {
    return false
  }

  if (options.urlAllowlist === undefined || options.urlAllowlist.length === 0) {
    return true
  }

  return options.urlAllowlist.some(pattern => urlMatchesPattern(request.url(), pattern))
}

function findObservation(
  observations: NetworkObservation[],
  requestIds: WeakMap<HTTPRequest, string>,
  request: HTTPRequest,
): NetworkObservation | undefined {
  const requestId = requestIds.get(request)
  if (requestId === undefined) {
    return undefined
  }

  return observations.find(observation => observation.requestId === requestId)
}

function urlMatchesPattern(url: string, pattern: string): boolean {
  if (pattern.includes('*')) {
    const escaped = pattern.split('*').map(escapeRegExp).join('.*')
    return new RegExp(`^${escaped}$`).test(url)
  }

  return url.includes(pattern)
}

function redactUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    parsedUrl.search = ''
    parsedUrl.hash = ''
    return parsedUrl.toString()
  } catch {
    return url.split(/[?#]/u)[0] ?? url
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$+?.()|[\]{}]/g, '\\$&')
}

export type { EndpointCatalogRecord }
