import {
  normalizeWizardWorldDifficulty,
  normalizeWizardWorldResource,
  normalizeWizardWorldSpellType,
  WizardWorldClient,
  WIZARD_WORLD_RESOURCES,
  type WizardWorldCatalogItem,
  type WizardWorldElixirDifficulty,
  type WizardWorldListQuery,
  type WizardWorldResource,
  type WizardWorldSpellType,
} from '../../infrastructure/openApis/wizardWorldClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const WIZARD_WORLD_DEFAULT_RESOURCE: WizardWorldResource = 'spells'
export const WIZARD_WORLD_DEFAULT_LIMIT = 10
export const WIZARD_WORLD_MAX_LIMIT = 50
export const WIZARD_WORLD_MAX_OFFSET = 1000

export type WizardWorldCatalogInput = {
  resource?: string | undefined
  name?: string | undefined
  search?: string | undefined
  difficulty?: string | undefined
  ingredient?: string | undefined
  inventor?: string | undefined
  manufacturer?: string | undefined
  spellType?: string | undefined
  incantation?: string | undefined
  firstName?: string | undefined
  lastName?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export type WizardWorldCatalogQuery = {
  resource: WizardWorldResource
  name?: string | undefined
  search?: string | undefined
  difficulty?: WizardWorldElixirDifficulty | undefined
  ingredient?: string | undefined
  inventor?: string | undefined
  manufacturer?: string | undefined
  spellType?: WizardWorldSpellType | undefined
  incantation?: string | undefined
  firstName?: string | undefined
  lastName?: string | undefined
  limit: number
  offset: number
}

export type WizardWorldCatalogResult = {
  kind: 'wizardworld.catalog'
  api: {
    provider: 'wizardworld'
    endpoint: 'GET /{resource}'
    docsUrl: 'https://wizard-world-api.herokuapp.com/swagger/index.html'
    openApiUrl: 'https://wizard-world-api.herokuapp.com/swagger/v1/swagger.json'
    apiUrl: 'https://wizard-world-api.herokuapp.com/'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS JSON REST'
    availableResources: WizardWorldResource[]
    excludedResources: string[]
    boundary: string
    limitPolicy: string
  }
  query: WizardWorldCatalogQuery
  pagination: {
    total: number
    matched: number
    returned: number
    offset: number
    limit: number
    hasMore: boolean
  }
  items: WizardWorldCatalogItem[]
}

export async function listWizardWorldCatalog(
  input: WizardWorldCatalogInput = {},
): Promise<WizardWorldCatalogResult> {
  const query = normalizeWizardWorldCatalogInput(input)
  const apiQuery = createApiQuery(query)
  const items = await new WizardWorldClient().listResource(query.resource, apiQuery)
  const filtered = filterItems(items, query.search)
  const page = filtered.slice(query.offset, query.offset + query.limit)

  return {
    kind: 'wizardworld.catalog',
    api: createApiMeta(),
    query,
    pagination: {
      total: items.length,
      matched: filtered.length,
      returned: page.length,
      offset: query.offset,
      limit: query.limit,
      hasMore: query.offset + page.length < filtered.length,
    },
    items: page,
  }
}

export function normalizeWizardWorldCatalogInput(
  input: WizardWorldCatalogInput = {},
): WizardWorldCatalogQuery {
  const resource = normalizeWizardWorldResource(
    input.resource ?? WIZARD_WORLD_DEFAULT_RESOURCE,
  )
  const query: WizardWorldCatalogQuery = {
    resource,
    limit: normalizeInteger({
      name: 'limit',
      value: input.limit,
      defaultValue: WIZARD_WORLD_DEFAULT_LIMIT,
      min: 1,
      max: WIZARD_WORLD_MAX_LIMIT,
    }),
    offset: normalizeInteger({
      name: 'offset',
      value: input.offset,
      defaultValue: 0,
      min: 0,
      max: WIZARD_WORLD_MAX_OFFSET,
    }),
  }

  addText(query, 'name', input.name)
  addText(query, 'search', input.search)
  addText(query, 'ingredient', input.ingredient)
  addText(query, 'inventor', input.inventor)
  addText(query, 'manufacturer', input.manufacturer)
  addText(query, 'incantation', input.incantation)
  addText(query, 'firstName', input.firstName)
  addText(query, 'lastName', input.lastName)

  const difficulty = normalizeWizardWorldDifficulty(input.difficulty)
  if (difficulty !== undefined) query.difficulty = difficulty
  const spellType = normalizeWizardWorldSpellType(input.spellType)
  if (spellType !== undefined) query.spellType = spellType

  assertFiltersMatchResource(query)
  return query
}

function createApiMeta(): WizardWorldCatalogResult['api'] {
  return {
    provider: 'wizardworld',
    endpoint: 'GET /{resource}',
    docsUrl: 'https://wizard-world-api.herokuapp.com/swagger/index.html',
    openApiUrl: 'https://wizard-world-api.herokuapp.com/swagger/v1/swagger.json',
    apiUrl: 'https://wizard-world-api.herokuapp.com/',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    availableResources: [...WIZARD_WORLD_RESOURCES],
    excludedResources: [
      'POST /Feedback',
      'GET /{resource}/{id}',
      'browser Swagger UI scraping',
    ],
    boundary: [
      'Read-only Wizard World JSON resources only; no API key, OAuth,',
      'account setup, cookies, browser clickstream, scraping, mutating',
      'feedback submission, arbitrary route proxying, binary payload, or',
      'base64 payload exposure.',
    ].join(' '),
    limitPolicy: [
      'The upstream API returns arrays without documented pagination. The',
      `CLI applies local search, offset, and a ${WIZARD_WORLD_MAX_LIMIT}`,
      'row limit cap for readable terminal and cache output.',
    ].join(' '),
  }
}

function createApiQuery(query: WizardWorldCatalogQuery): WizardWorldListQuery {
  return {
    name: query.name,
    difficulty: query.difficulty,
    ingredient: query.ingredient,
    inventor: query.inventor,
    manufacturer: query.manufacturer,
    spellType: query.spellType,
    incantation: query.incantation,
    firstName: query.firstName,
    lastName: query.lastName,
  }
}

function filterItems<TItem extends WizardWorldCatalogItem>(
  items: TItem[],
  search: string | undefined,
): TItem[] {
  if (search === undefined) return items
  const needle = search.toLowerCase()
  return items.filter(item => {
    return Object.values(item).some(value => stringifyValue(value).includes(needle))
  })
}

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(item => stringifyValue(item)).join(' ').toLowerCase()
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).map(item => stringifyValue(item)).join(' ')
  }
  return String(value ?? '').toLowerCase()
}

function assertFiltersMatchResource(query: WizardWorldCatalogQuery): void {
  const allowed = getAllowedFilterNames(query.resource)
  const unsupported = Object.entries(query)
    .filter(([key, value]) => {
      return value !== undefined && isFilterName(key) && !allowed.includes(key)
    })
    .map(([key]) => key)
  if (unsupported.length === 0) return

  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    [
      `Wizard World ${query.resource} does not support`,
      `${unsupported.map(toKebabCase).join(', ')}.`,
    ].join(' '),
    { resource: query.resource, unsupported },
  )
}

function getAllowedFilterNames(resource: WizardWorldResource): string[] {
  if (resource === 'elixirs') {
    return ['name', 'search', 'difficulty', 'ingredient', 'inventor', 'manufacturer']
  }
  if (resource === 'ingredients') return ['name', 'search']
  if (resource === 'spells') return ['name', 'search', 'spellType', 'incantation']
  if (resource === 'wizards') return ['search', 'firstName', 'lastName']
  return ['search']
}

function isFilterName(value: string): boolean {
  return [
    'name',
    'search',
    'difficulty',
    'ingredient',
    'inventor',
    'manufacturer',
    'spellType',
    'incantation',
    'firstName',
    'lastName',
  ].includes(value)
}

function addText<TTarget extends Record<string, unknown>>(
  target: TTarget,
  name: keyof TTarget,
  value: string | undefined,
): void {
  const normalized = normalizeText(name as string, value)
  if (normalized !== undefined) {
    target[name] = normalized as TTarget[keyof TTarget]
  }
}

function normalizeText(label: string, value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (normalized === '') return undefined
  if (normalized.length > 120) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Wizard World --${toKebabCase(label)} must be 120 characters or fewer.`,
      { [label]: value },
    )
  }
  if (/[/?#\\]/u.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Wizard World --${toKebabCase(label)} must not contain URL separators.`,
      { [label]: value },
    )
  }
  return normalized
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
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Wizard World --${input.name} must be an integer.`,
      { [input.name]: input.value },
    )
  }
  if (value < input.min || value > input.max) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `Wizard World --${input.name} must be between ${input.min} and ${input.max}.`,
      { [input.name]: input.value },
    )
  }
  return value
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)
}

export type {
  WizardWorldCatalogItem,
  WizardWorldResource,
} from '../../infrastructure/openApis/wizardWorldClient.js'
