import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const WIZARD_WORLD_DEFAULT_BASE_URL = 'https://wizard-world-api.herokuapp.com'

export const WIZARD_WORLD_RESOURCES = [
  'elixirs',
  'houses',
  'ingredients',
  'creatures',
  'spells',
  'wizards',
] as const

export const WIZARD_WORLD_ELIXIR_DIFFICULTIES = [
  'Unknown',
  'Advanced',
  'Moderate',
  'Beginner',
  'OrdinaryWizardingLevel',
  'OneOfAKind',
] as const

export const WIZARD_WORLD_SPELL_TYPES = [
  'None',
  'Charm',
  'Conjuration',
  'Spell',
  'Transfiguration',
  'HealingSpell',
  'DarkCharm',
  'Jinx',
  'Curse',
  'MagicalTransportation',
  'Hex',
  'CounterSpell',
  'DarkArts',
  'CounterJinx',
  'CounterCharm',
  'Untransfiguration',
  'BindingMagicalContract',
  'Vanishment',
] as const

export type WizardWorldResource = (typeof WIZARD_WORLD_RESOURCES)[number]
export type WizardWorldElixirDifficulty =
  (typeof WIZARD_WORLD_ELIXIR_DIFFICULTIES)[number]
export type WizardWorldSpellType = (typeof WIZARD_WORLD_SPELL_TYPES)[number]

export type WizardWorldListQuery = {
  name?: string | undefined
  difficulty?: WizardWorldElixirDifficulty | undefined
  ingredient?: string | undefined
  inventor?: string | undefined
  manufacturer?: string | undefined
  spellType?: WizardWorldSpellType | undefined
  incantation?: string | undefined
  firstName?: string | undefined
  lastName?: string | undefined
}

export type WizardWorldReference = {
  id?: string | undefined
  name?: string | undefined
  firstName?: string | undefined
  lastName?: string | undefined
}

export type WizardWorldCatalogItem = {
  id: string
  resource: WizardWorldResource
  name: string
  description?: string | undefined
  effect?: string | undefined
  difficulty?: string | undefined
  type?: string | undefined
  light?: string | undefined
  incantation?: string | undefined
  canBeVerbal?: boolean | undefined
  creator?: string | undefined
  manufacturer?: string | undefined
  houseColours?: string | undefined
  founder?: string | undefined
  animal?: string | undefined
  element?: string | undefined
  ghost?: string | undefined
  commonRoom?: string | undefined
  classification?: string | undefined
  status?: string | undefined
  dangerousnessLevel?: string | undefined
  nativeTo?: string | undefined
  firstName?: string | undefined
  lastName?: string | undefined
  ingredients?: WizardWorldReference[] | undefined
  inventors?: WizardWorldReference[] | undefined
  elixirs?: WizardWorldReference[] | undefined
  heads?: WizardWorldReference[] | undefined
  traits?: WizardWorldReference[] | undefined
}

export class WizardWorldClient {
  constructor(
    private readonly baseUrl = WIZARD_WORLD_DEFAULT_BASE_URL,
    private readonly fetchImpl: typeof fetch = globalThis.fetch,
  ) {}

  async listResource(
    resource: WizardWorldResource,
    query: WizardWorldListQuery = {},
  ): Promise<WizardWorldCatalogItem[]> {
    const parsed = await this.fetchJson(this.createListUrl(resource, query))
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Wizard World response did not match the documented JSON array shape.',
        { provider: 'wizardworld', resource },
      )
    }

    return parsed
      .map(item => parseItem(resource, item))
      .filter((item): item is WizardWorldCatalogItem => item !== undefined)
  }

  private createListUrl(
    resource: WizardWorldResource,
    query: WizardWorldListQuery,
  ): URL {
    const url = new URL(`${normalizeBaseUrl(this.baseUrl)}${getResourcePath(resource)}`)
    addResourceQuery(url, resource, query)
    return url
  }

  private async fetchJson(url: URL): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'user-agent': 'public-apis-cli no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Wizard World request failed: ${String(error)}`,
        { provider: 'wizardworld', url: url.toString() },
      )
    }

    const text = await response.text()
    if (isChallengeResponse(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Wizard World is currently returning a challenge HTML page instead',
          'of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const details = createResponseDetails(response, url)
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Wizard World response was not JSON.',
        {
          ...details,
          preview: text.slice(0, 120),
        },
      )
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `Wizard World request failed with HTTP ${response.status}.`,
        {
          ...details,
          response: parsed,
        },
      )
    }

    return parsed
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'wizardworld',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isChallengeResponse(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    (response.status === 403 || response.status === 429)
    && contentType.includes('text/html')
    && (
      mitigated === 'challenge'
      || server.includes('cloudflare')
      || /<title>\s*just a moment/i.test(body)
      || /captcha|access denied|attention required/i.test(body)
    )
  )
}

export function normalizeWizardWorldResource(value: unknown): WizardWorldResource {
  const normalized = String(value ?? 'spells')
    .trim()
    .toLowerCase()
    .replace(/magical-?creatures?/u, 'creatures')
    .replace(/magical_?creatures?/u, 'creatures')
    .replace(/-/gu, '_')
  if (isWizardWorldResource(normalized)) return normalized

  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `Wizard World --resource must be one of ${WIZARD_WORLD_RESOURCES.join(', ')}.`,
    { resource: value },
  )
}

export function normalizeWizardWorldDifficulty(
  value: string | undefined,
): WizardWorldElixirDifficulty | undefined {
  return normalizeEnumOption({
    value,
    label: 'difficulty',
    supported: WIZARD_WORLD_ELIXIR_DIFFICULTIES,
  })
}

export function normalizeWizardWorldSpellType(
  value: string | undefined,
): WizardWorldSpellType | undefined {
  return normalizeEnumOption({
    value,
    label: 'spell-type',
    supported: WIZARD_WORLD_SPELL_TYPES,
  })
}

function addResourceQuery(
  url: URL,
  resource: WizardWorldResource,
  query: WizardWorldListQuery,
): void {
  if (resource === 'elixirs') {
    addParam(url, 'Name', query.name)
    addParam(url, 'Difficulty', query.difficulty)
    addParam(url, 'Ingredient', query.ingredient)
    addParam(url, 'InventorFullName', query.inventor)
    addParam(url, 'Manufacturer', query.manufacturer)
    return
  }

  if (resource === 'ingredients') {
    addParam(url, 'Name', query.name)
    return
  }

  if (resource === 'spells') {
    addParam(url, 'Name', query.name)
    addParam(url, 'Type', query.spellType)
    addParam(url, 'Incantation', query.incantation)
    return
  }

  if (resource === 'wizards') {
    addParam(url, 'FirstName', query.firstName)
    addParam(url, 'LastName', query.lastName)
  }
}

function getResourcePath(resource: WizardWorldResource): string {
  if (resource === 'elixirs') return '/Elixirs'
  if (resource === 'houses') return '/Houses'
  if (resource === 'ingredients') return '/Ingredients'
  if (resource === 'creatures') return '/MagicalCreature'
  if (resource === 'spells') return '/Spells'
  return '/Wizards'
}

function parseItem(
  resource: WizardWorldResource,
  value: unknown,
): WizardWorldCatalogItem | undefined {
  if (!isRecord(value)) return undefined
  const id = readString(value.id)
  if (id === undefined) return undefined
  if (resource === 'elixirs') return parseElixir(id, value)
  if (resource === 'houses') return parseHouse(id, value)
  if (resource === 'ingredients') return parseIngredient(id, value)
  if (resource === 'creatures') return parseCreature(id, value)
  if (resource === 'spells') return parseSpell(id, value)
  return parseWizard(id, value)
}

function parseElixir(
  id: string,
  value: Record<string, unknown>,
): WizardWorldCatalogItem | undefined {
  const name = readString(value.name)
  if (name === undefined) return undefined
  return compactItem({
    id,
    resource: 'elixirs',
    name,
    effect: readString(value.effect),
    difficulty: readString(value.difficulty),
    manufacturer: readString(value.manufacturer),
    ingredients: readReferences(value.ingredients),
    inventors: readReferences(value.inventors),
  })
}

function parseHouse(
  id: string,
  value: Record<string, unknown>,
): WizardWorldCatalogItem | undefined {
  const name = readString(value.name)
  if (name === undefined) return undefined
  return compactItem({
    id,
    resource: 'houses',
    name,
    houseColours: readString(value.houseColours),
    founder: readString(value.founder),
    animal: readString(value.animal),
    element: readString(value.element),
    ghost: readString(value.ghost),
    commonRoom: readString(value.commonRoom),
    heads: readReferences(value.heads),
    traits: readReferences(value.traits),
  })
}

function parseIngredient(
  id: string,
  value: Record<string, unknown>,
): WizardWorldCatalogItem | undefined {
  const name = readString(value.name)
  return name === undefined ? undefined : { id, resource: 'ingredients', name }
}

function parseCreature(
  id: string,
  value: Record<string, unknown>,
): WizardWorldCatalogItem | undefined {
  const name = readString(value.name)
  if (name === undefined) return undefined
  return compactItem({
    id,
    resource: 'creatures',
    name,
    description: readString(value.description),
    classification: readString(value.classification),
    status: readString(value.status),
    dangerousnessLevel: readString(value.dangerousnessLevel),
    nativeTo: readString(value.nativeTo),
  })
}

function parseSpell(
  id: string,
  value: Record<string, unknown>,
): WizardWorldCatalogItem | undefined {
  const name = readString(value.name)
  if (name === undefined) return undefined
  return compactItem({
    id,
    resource: 'spells',
    name,
    incantation: readString(value.incantation),
    effect: readString(value.effect),
    canBeVerbal: readBoolean(value.canBeVerbal),
    type: readString(value.type),
    light: readString(value.light),
    creator: readString(value.creator),
  })
}

function parseWizard(
  id: string,
  value: Record<string, unknown>,
): WizardWorldCatalogItem | undefined {
  const firstName = readString(value.firstName)
  const lastName = readString(value.lastName)
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
  if (name === '') return undefined
  return compactItem({
    id,
    resource: 'wizards',
    name,
    firstName,
    lastName,
    elixirs: readReferences(value.elixirs),
  })
}

function readReferences(value: unknown): WizardWorldReference[] | undefined {
  if (!Array.isArray(value)) return undefined
  const refs = value
    .map(item => {
      if (!isRecord(item)) return undefined
      const ref = compactReference({
        id: readString(item.id),
        name: readString(item.name),
        firstName: readString(item.firstName),
        lastName: readString(item.lastName),
      })
      return Object.keys(ref).length > 0 ? ref : undefined
    })
    .filter((item): item is WizardWorldReference => item !== undefined)
  return refs.length > 0 ? refs : undefined
}

function normalizeEnumOption<TValue extends string>(input: {
  value: string | undefined
  label: string
  supported: readonly TValue[]
}): TValue | undefined {
  if (input.value === undefined) return undefined
  const normalized = input.value.trim()
  const match = input.supported.find(value => {
    return value.toLowerCase() === normalized.toLowerCase()
  })
  if (match !== undefined) return match

  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    `Wizard World --${input.label} must be one of ${input.supported.join(', ')}.`,
    { [input.label]: input.value },
  )
}

function addParam(url: URL, name: string, value: string | undefined): void {
  if (value !== undefined && value.trim() !== '') {
    url.searchParams.set(name, value)
  }
}

function compactItem(item: WizardWorldCatalogItem): WizardWorldCatalogItem {
  return Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined),
  ) as WizardWorldCatalogItem
}

function compactReference(ref: WizardWorldReference): WizardWorldReference {
  return Object.fromEntries(
    Object.entries(ref).filter(([, value]) => value !== undefined),
  ) as WizardWorldReference
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function isWizardWorldResource(value: string): value is WizardWorldResource {
  return (WIZARD_WORLD_RESOURCES as readonly string[]).includes(value)
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
