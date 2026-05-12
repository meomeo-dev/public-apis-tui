import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const PRAGUE_OPEN_DATA_DEFAULT_CATALOG_URL = 'https://api.lkod.cz/lod/03bdf7d6-a255-4e22-83f9-4b17b6822602/catalog'
export const PRAGUE_OPEN_DATA_DEFAULT_QUERY = 'doprava'
export const PRAGUE_OPEN_DATA_DATASETS_DEFAULT_LIMIT = 20
export const PRAGUE_OPEN_DATA_DATASETS_MAX_LIMIT = 389
export const PRAGUE_OPEN_DATA_DEFAULT_DATASET_IRI =
  'https://api.lkod.cz/lod/03bdf7d6-a255-4e22-83f9-4b17b6822602/catalog/1ee7ff0b-3aec-42f6-bd22-b04b3115f0fd'

export type PragueOpenDataDatasetsInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NormalizedPragueOpenDataDatasetsInput = {
  query: string
  limit: number
}

export type PragueOpenDataDatasetInput = {
  datasetIri?: string | undefined
}

export type NormalizedPragueOpenDataDatasetInput = {
  datasetIri: string
}

export type PragueOpenDataCatalog = {
  iri: string
  title?: string | undefined
  description?: string | undefined
  homepageUrl?: string | undefined
  datasetIris: string[]
}

export type PragueOpenDataDistribution = {
  iri?: string | undefined
  title?: string | undefined
  format?: string | undefined
  mediaType?: string | undefined
  accessUrl?: string | undefined
  downloadUrl?: string | undefined
  containsPersonalData?: string | undefined
  author?: string | undefined
}

export type PragueOpenDataDataset = {
  iri: string
  id: string
  title?: string | undefined
  description?: string | undefined
  provider?: string | undefined
  themes: string[]
  keywords: string[]
  distributions: PragueOpenDataDistribution[]
  spatialCoverage: string[]
  temporalCoverage?: {
    start?: string | undefined
    end?: string | undefined
  } | undefined
}

export type PragueOpenDataDatasetSearch = {
  total: number
  matched: number
  results: PragueOpenDataDataset[]
}

export class PragueOpenDataClient {
  constructor(private readonly options: { catalogUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listDatasets(input: NormalizedPragueOpenDataDatasetsInput): Promise<PragueOpenDataDatasetSearch> {
    const catalog = await this.fetchCatalog()
    const selected = catalog.datasetIris.slice(0, input.limit)
    const results: PragueOpenDataDataset[] = []
    for (const datasetIri of selected) {
      const dataset = await this.fetchDataset({ datasetIri })
      if (!datasetMatches(dataset, input.query)) {
        continue
      }
      results.push(dataset)
    }
    return {
      total: catalog.datasetIris.length,
      matched: results.length,
      results,
    }
  }

  async showDataset(input: NormalizedPragueOpenDataDatasetInput): Promise<PragueOpenDataDataset> {
    return this.fetchDataset(input)
  }

  async fetchCatalog(): Promise<PragueOpenDataCatalog> {
    const parsed = await this.fetchJson(new URL(this.options.catalogUrl ?? PRAGUE_OPEN_DATA_DEFAULT_CATALOG_URL))
    return parseCatalog(parsed)
  }

  private async fetchDataset(input: NormalizedPragueOpenDataDatasetInput): Promise<PragueOpenDataDataset> {
    const parsed = await this.fetchJson(new URL(input.datasetIri))
    return parseDataset(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/ld+json, application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Prague Open Data request failed: ${String(error)}`, {
        provider: 'pragueopendata',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Prague Open Data response body could not be read: ${String(error)}`, {
        provider: 'pragueopendata',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Prague Open Data is currently returning a Cloudflare challenge HTML page instead of the documented LKOD JSON-LD API response; retry later or use cached/offline data.',
        {
          provider: 'pragueopendata',
          status: response.status,
          endpoint: url.href,
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Prague Open Data returned a non-JSON response: ${String(error)}`, {
        provider: 'pragueopendata',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Prague Open Data request failed with HTTP ${response.status}.`, {
        provider: 'pragueopendata',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizePragueOpenDataDatasetsInput(input: PragueOpenDataDatasetsInput = {}): NormalizedPragueOpenDataDatasetsInput {
  const query = (input.query ?? PRAGUE_OPEN_DATA_DEFAULT_QUERY).trim()
  if (query.length < 2 || query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be between 2 and 120 characters.')
  }
  return { query, limit: normalizeLimit(input.limit, PRAGUE_OPEN_DATA_DATASETS_DEFAULT_LIMIT, PRAGUE_OPEN_DATA_DATASETS_MAX_LIMIT) }
}

export function normalizePragueOpenDataDatasetInput(input: PragueOpenDataDatasetInput = {}): NormalizedPragueOpenDataDatasetInput {
  const datasetIri = (input.datasetIri ?? PRAGUE_OPEN_DATA_DEFAULT_DATASET_IRI).trim()
  if (!isSafeDatasetIri(datasetIri)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--dataset-iri must be a Prague LKOD public dataset IRI under https://api.lkod.cz/lod/.')
  }
  return { datasetIri }
}

function parseCatalog(value: unknown): PragueOpenDataCatalog {
  if (!isRecord(value) || typeof value.iri !== 'string' || !Array.isArray(value['datová_sada'])) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Prague Open Data catalog did not include iri and datová_sada[].')
  }
  return {
    iri: value.iri,
    title: readLocalizedString(value['název']),
    description: readLocalizedString(value.popis),
    homepageUrl: readOptionalString(value['domovská_stránka']),
    datasetIris: value['datová_sada'].filter((entry): entry is string => typeof entry === 'string' && isSafeDatasetIri(entry)),
  }
}

function parseDataset(value: unknown): PragueOpenDataDataset {
  if (!isRecord(value) || typeof value.iri !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Prague Open Data dataset response did not include an iri.')
  }
  return {
    iri: value.iri,
    id: readDatasetId(value.iri),
    title: readLocalizedString(value['název']),
    description: readLocalizedString(value.popis),
    provider: readOptionalString(value.poskytovatel),
    themes: readStringList(value['téma']),
    keywords: readLocalizedStringList(value['klíčové_slovo']),
    distributions: Array.isArray(value.distribuce)
      ? value.distribuce.map(parseDistribution).filter((entry): entry is PragueOpenDataDistribution => entry !== undefined)
      : [],
    spatialCoverage: [...readStringList(value['geografické_území']), ...readStringList(value['prostorové_pokrytí'])],
    temporalCoverage: parseTemporalCoverage(value['časové_pokrytí']),
  }
}

function parseDistribution(value: unknown): PragueOpenDataDistribution | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return {
    iri: readOptionalString(value.iri),
    title: readLocalizedString(value['název']),
    format: readFormat(value),
    mediaType: readOptionalString(value['typ_média']),
    accessUrl: readOptionalString(value['přístupové_url']),
    downloadUrl: readOptionalString(value['soubor_ke_stažení']),
    containsPersonalData: readOptionalString(isRecord(value['podmínky_užití']) ? value['podmínky_užití']['osobní_údaje'] : undefined),
    author: readLocalizedString(isRecord(value['podmínky_užití']) ? value['podmínky_užití'].autor : undefined),
  }
}

function parseTemporalCoverage(value: unknown): PragueOpenDataDataset['temporalCoverage'] {
  if (!isRecord(value)) {
    return undefined
  }
  const start = readOptionalString(value['začátek'])
  const end = readOptionalString(value.konec)
  return start === undefined && end === undefined ? undefined : { start, end }
}

function readDatasetId(iri: string): string {
  return iri.split('/').filter(Boolean).at(-1) ?? iri
}

function datasetMatches(dataset: PragueOpenDataDataset, query: string): boolean {
  const needle = normalizeText(query)
  return [dataset.iri, dataset.title, dataset.description, dataset.provider, ...dataset.keywords, ...dataset.themes]
    .filter((entry): entry is string => typeof entry === 'string')
    .some(entry => normalizeText(entry).includes(needle))
}

function readFormat(value: Record<string, unknown>): string | undefined {
  return readOptionalString(value.extension) ?? readOptionalString(value['formát'])?.split('/').filter(Boolean).at(-1)
}

function readLocalizedStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return readStringList(value)
  }
  if (!isRecord(value)) {
    return []
  }
  const entries = [value.cs, value.en].flatMap(readStringList)
  return [...new Set(entries)]
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return typeof value === 'string' && value.trim().length > 0 ? [value.trim()] : []
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).map(entry => entry.trim())
}

function readLocalizedString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  if (!isRecord(value)) {
    return undefined
  }
  return readOptionalString(value.en) ?? readOptionalString(value.cs)
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function normalizeLimit(value: number | undefined, defaultValue: number, maxValue: number): number {
  const limit = value ?? defaultValue
  if (!Number.isInteger(limit) || limit < 1 || limit > maxValue) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${maxValue}.`)
  }
  return limit
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function isSafeDatasetIri(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'api.lkod.cz' && url.pathname.startsWith('/lod/') && url.pathname.includes('/catalog/')
  } catch {
    return false
  }
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return readOptionalString(value.error_message) ?? readOptionalString(value.message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const cfMitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const bodyLower = body.toLowerCase()
  return (
    cfMitigated === 'challenge' ||
    (server.includes('cloudflare') &&
      contentType.includes('text/html') &&
      (response.status === 403 || response.status === 429) &&
      (bodyLower.includes('<title>just a moment...</title>') || bodyLower.includes('cloudflare')))
  )
}
