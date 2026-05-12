import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const FILTER_LISTS_DEFAULT_QUERY = 'privacy'
export const FILTER_LISTS_DEFAULT_LIMIT = 25
export const FILTER_LISTS_MAX_LIMIT = 100
const FILTER_LISTS_RESTRICTED_TAG_NAMES = new Set([
  'nsfw',
  'proxy',
  'gambling',
  'piracy',
  'paywall',
])

type FetchImpl = typeof fetch

export type FilterListsInput = {
  query?: string | undefined
  limit?: number | undefined
  tagId?: number | undefined
  syntaxId?: number | undefined
  languageId?: number | undefined
  licenseId?: number | undefined
}

export type NormalizedFilterListsInput = {
  query: string
  limit: number
  tagId?: number | undefined
  syntaxId?: number | undefined
  languageId?: number | undefined
  licenseId?: number | undefined
}

export type FilterListsList = {
  id: number
  name: string
  description?: string | undefined
  licenseId?: number | undefined
  license?: string | undefined
  syntaxIds: number[]
  syntaxes: string[]
  languageIds: number[]
  languages: string[]
  tagIds: number[]
  tags: string[]
  maintainerIds: number[]
  maintainers: string[]
}

export type FilterListsSummary = {
  totalLists: number
  totalSafeLists: number
  restrictedExcluded: number
  totalMatched: number
  returned: number
}

type FilterListsCatalog = {
  lists: RawList[]
  licenses: Map<number, string>
  syntaxes: Map<number, string>
  languages: Map<number, string>
  tags: Map<number, string>
  maintainers: Map<number, string>
}

type RawList = {
  id: number
  name: string
  description?: string | undefined
  licenseId?: number | undefined
  syntaxIds: number[]
  languageIds: number[]
  tagIds: number[]
  maintainerIds: number[]
}

export class FilterListsClient {
  constructor(
    private readonly options: { fetchImpl?: FetchImpl | undefined } = {},
  ) {}

  async listLists(
    input: NormalizedFilterListsInput,
  ): Promise<{ summary: FilterListsSummary; lists: FilterListsList[] }> {
    const catalog = await this.fetchCatalog()
    if (input.tagId !== undefined && isRestrictedListTagId(input.tagId, catalog)) {
      throw new RuntimeFailure(
        'INVALID_ARGUMENT',
        [
          '--tag-id selects a restricted FilterLists metadata category',
          'that is not exposed by this CLI.',
        ].join(' '),
      )
    }
    const safeLists = catalog.lists.filter(list => !hasRestrictedTags(list, catalog))
    const matched = safeLists.filter(list => matchesInput(list, input, catalog))
    const lists = matched.slice(0, input.limit).map(list => enrichList(list, catalog))
    return {
      summary: {
        totalLists: catalog.lists.length,
        totalSafeLists: safeLists.length,
        restrictedExcluded: catalog.lists.length - safeLists.length,
        totalMatched: matched.length,
        returned: lists.length,
      },
      lists,
    }
  }

  private async fetchCatalog(): Promise<FilterListsCatalog> {
    const [
      lists,
      licenses,
      syntaxes,
      languages,
      tags,
      maintainers,
    ] = await Promise.all([
      this.fetchJsonArray(
        '/lists',
        parseList,
        'FilterLists /lists response had an unexpected schema.',
      ),
      this.fetchJsonMap(
        '/licenses',
        'FilterLists /licenses response had an unexpected schema.',
      ),
      this.fetchJsonMap(
        '/syntaxes',
        'FilterLists /syntaxes response had an unexpected schema.',
      ),
      this.fetchJsonMap(
        '/languages',
        'FilterLists /languages response had an unexpected schema.',
      ),
      this.fetchJsonMap(
        '/tags',
        'FilterLists /tags response had an unexpected schema.',
      ),
      this.fetchJsonMap(
        '/maintainers',
        'FilterLists /maintainers response had an unexpected schema.',
      ),
    ])
    return { lists, licenses, syntaxes, languages, tags, maintainers }
  }

  private async fetchJsonArray<T>(
    path: string,
    parse: (value: unknown) => T | undefined,
    schemaMessage: string,
  ): Promise<T[]> {
    const parsed = await this.fetchJson(path)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', schemaMessage)
    }
    return parsed.map(parse).filter((entry): entry is T => entry !== undefined)
  }

  private async fetchJsonMap(
    path: string,
    schemaMessage: string,
  ): Promise<Map<number, string>> {
    const entries = await this.fetchJsonArray(path, parseLookupEntry, schemaMessage)
    return new Map(entries.map(entry => [entry.id, entry.name]))
  }

  private async fetchJson(path: string): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const url = new URL(path, 'https://api.filterlists.com')
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `FilterLists API request failed: ${String(error)}`,
        {
          provider: 'filterlists',
          endpoint: url.href,
        },
      )
    }
    const text = await response.text()
    const contentType = response.headers.get('content-type') ?? undefined
    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'FilterLists is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        {
          provider: 'filterlists',
          endpoint: url.href,
          status: response.status,
          contentType,
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'FilterLists API returned non-JSON content.',
        {
          provider: 'filterlists',
          endpoint: url.href,
          status: response.status,
          contentType,
          preview: text.slice(0, 120),
        },
      )
    }
    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `FilterLists API request failed with HTTP ${response.status}.`,
        {
          provider: 'filterlists',
          endpoint: url.href,
          status: response.status,
          response: parsed,
        },
      )
    }
    return parsed
  }
}

export function normalizeFilterListsInput(
  input: FilterListsInput = {},
): NormalizedFilterListsInput {
  const query = input.query?.trim() || FILTER_LISTS_DEFAULT_QUERY
  if (query.length > 80) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--query must be 80 characters or fewer.',
    )
  }
  return {
    query,
    limit: normalizeInteger(
      input.limit,
      '--limit',
      FILTER_LISTS_DEFAULT_LIMIT,
      1,
      FILTER_LISTS_MAX_LIMIT,
    ),
    tagId: normalizeOptionalInteger(input.tagId, '--tag-id', 1),
    syntaxId: normalizeOptionalInteger(input.syntaxId, '--syntax-id', 1),
    languageId: normalizeOptionalInteger(input.languageId, '--language-id', 1),
    licenseId: normalizeOptionalInteger(input.licenseId, '--license-id', 1),
  }
}

function matchesInput(
  list: RawList,
  input: NormalizedFilterListsInput,
  catalog: FilterListsCatalog,
): boolean {
  if (input.tagId !== undefined && !list.tagIds.includes(input.tagId)) {
    return false
  }
  if (input.syntaxId !== undefined && !list.syntaxIds.includes(input.syntaxId)) {
    return false
  }
  if (input.languageId !== undefined && !list.languageIds.includes(input.languageId)) {
    return false
  }
  if (input.licenseId !== undefined && list.licenseId !== input.licenseId) {
    return false
  }
  const query = input.query.toLocaleLowerCase()
  if (query === '*') {
    return true
  }
  const searchText = [
    list.name,
    list.description,
    list.licenseId === undefined ? undefined : catalog.licenses.get(list.licenseId),
    ...list.syntaxIds.map(id => catalog.syntaxes.get(id)),
    ...list.languageIds.map(id => catalog.languages.get(id)),
    ...list.tagIds.map(id => catalog.tags.get(id)),
    ...list.maintainerIds.map(id => catalog.maintainers.get(id)),
  ]
    .filter((entry): entry is string => entry !== undefined)
    .join(' ')
    .toLocaleLowerCase()
  return searchText.includes(query)
}

function hasRestrictedTags(list: RawList, catalog: FilterListsCatalog): boolean {
  return list.tagIds.some(tagId => isRestrictedListTagId(tagId, catalog))
}

function isRestrictedListTagId(tagId: number, catalog: FilterListsCatalog): boolean {
  const tagName = catalog.tags.get(tagId)
  return (
    tagName !== undefined &&
    FILTER_LISTS_RESTRICTED_TAG_NAMES.has(tagName.toLocaleLowerCase())
  )
}

function enrichList(list: RawList, catalog: FilterListsCatalog): FilterListsList {
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    licenseId: list.licenseId,
    license: list.licenseId === undefined
      ? undefined
      : catalog.licenses.get(list.licenseId),
    syntaxIds: list.syntaxIds,
    syntaxes: resolveNames(list.syntaxIds, catalog.syntaxes),
    languageIds: list.languageIds,
    languages: resolveNames(list.languageIds, catalog.languages),
    tagIds: list.tagIds,
    tags: resolveNames(list.tagIds, catalog.tags),
    maintainerIds: list.maintainerIds,
    maintainers: resolveNames(list.maintainerIds, catalog.maintainers),
  }
}

function parseList(value: unknown): RawList | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const id = readInteger(value.id)
  const name = readString(value.name)
  if (id === undefined || name === undefined) {
    return undefined
  }
  return {
    id,
    name,
    description: readString(value.description),
    licenseId: readInteger(value.licenseId),
    syntaxIds: readIntegerArray(value.syntaxIds),
    languageIds: readIntegerArray(value.languageIds),
    tagIds: readIntegerArray(value.tagIds),
    maintainerIds: readIntegerArray(value.maintainerIds),
  }
}

function parseLookupEntry(value: unknown): { id: number; name: string } | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const id = readInteger(value.id)
  const name = readString(value.name)
  return id === undefined || name === undefined ? undefined : { id, name }
}

function resolveNames(ids: number[], lookup: Map<number, string>): string[] {
  return ids
    .map(id => lookup.get(id))
    .filter((entry): entry is string => entry !== undefined)
}

function normalizeInteger(
  value: number | undefined,
  name: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const normalized = value ?? defaultValue
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${name} must be an integer between ${min} and ${max}.`,
    )
  }
  return normalized
}

function normalizeOptionalInteger(
  value: number | undefined,
  name: string,
  min: number,
): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Number.isInteger(value) || value < min) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `${name} must be an integer greater than or equal to ${min}.`,
    )
  }
  return value
}

function readInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined
}

function readIntegerArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => Number.isInteger(entry))
    : []
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    response.status === 403 &&
    contentType.includes('text/html') &&
    (
      mitigated === 'challenge' ||
      server.includes('cloudflare') ||
      body.includes('Just a moment...')
    )
  )
}
