import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_COLLECTIVE_DEFAULT_ENDPOINT = 'https://api.opencollective.com/graphql/v2'
export const OPEN_COLLECTIVE_DEFAULT_SLUG = 'webpack'

export type OpenCollectiveAccountInput = {
  slug?: string | undefined
}

export type NormalizedOpenCollectiveAccountInput = {
  slug: string
}

export type OpenCollectiveMoney = {
  valueInCents: number
  currency: string
}

export type OpenCollectiveAccount = {
  id: string
  slug: string
  type?: string | undefined
  name: string
  description?: string | undefined
  website?: string | undefined
  imageUrl?: string | undefined
  currency?: string | undefined
  isVerified?: boolean | undefined
  isActive?: boolean | undefined
  isArchived?: boolean | undefined
  tags: string[]
  stats: {
    balance?: OpenCollectiveMoney | undefined
    yearlyBudget?: OpenCollectiveMoney | undefined
    totalAmountReceived?: OpenCollectiveMoney | undefined
  }
}

const accountQuery = `
query PublicAccount($slug: String!) {
  account(slug: $slug) {
    id
    slug
    type
    name
    description
    website
    imageUrl
    currency
    isVerified
    isActive
    isArchived
    tags
    stats {
      balance { valueInCents currency }
      yearlyBudget { valueInCents currency }
      totalAmountReceived { valueInCents currency }
    }
  }
}
`

export class OpenCollectiveClient {
  private readonly endpoint: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { endpoint?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.endpoint = options.endpoint ?? OPEN_COLLECTIVE_DEFAULT_ENDPOINT
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async account(input: NormalizedOpenCollectiveAccountInput): Promise<OpenCollectiveAccount> {
    let response: Response
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'public-apis-tui no-auth CLI' },
        body: JSON.stringify({ query: accountQuery, variables: input }),
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Collective request failed: ${String(error)}`, { provider: 'opencollective', endpoint: this.endpoint })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Collective returned a non-JSON response: ${String(error)}`, {
        provider: 'opencollective',
        endpoint: this.endpoint,
        status: response.status,
      })
    }

    if (!response.ok || hasGraphqlErrors(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', readGraphqlError(parsed) ?? `Open Collective request failed with HTTP ${response.status}.`, {
        provider: 'opencollective',
        endpoint: this.endpoint,
        status: response.status,
      })
    }

    return parseAccount(parsed)
  }
}

export function normalizeOpenCollectiveAccountInput(input: OpenCollectiveAccountInput = {}): NormalizedOpenCollectiveAccountInput {
  return { slug: normalizeSlug(input.slug ?? OPEN_COLLECTIVE_DEFAULT_SLUG) }
}

function parseAccount(value: unknown): OpenCollectiveAccount {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Collective response had an unexpected GraphQL envelope.')
  }
  const account = value.data.account
  if (account === null) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Collective account was not found for this slug.')
  }
  if (!isRecord(account)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Collective response was missing account data.')
  }
  const id = optionalString(account.id)
  const slug = optionalString(account.slug)
  const name = optionalString(account.name)
  if (id === undefined || slug === undefined || name === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Collective account was missing id, slug, or name.')
  }
  const stats = isRecord(account.stats) ? account.stats : {}
  return {
    id,
    slug,
    name,
    type: optionalString(account.type),
    description: optionalString(account.description),
    website: optionalString(account.website),
    imageUrl: optionalString(account.imageUrl),
    currency: optionalString(account.currency),
    isVerified: optionalBoolean(account.isVerified),
    isActive: optionalBoolean(account.isActive),
    isArchived: optionalBoolean(account.isArchived),
    tags: Array.isArray(account.tags) ? account.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '') : [],
    stats: {
      balance: parseMoney(stats.balance),
      yearlyBudget: parseMoney(stats.yearlyBudget),
      totalAmountReceived: parseMoney(stats.totalAmountReceived),
    },
  }
}

function parseMoney(value: unknown): OpenCollectiveMoney | undefined {
  if (!isRecord(value) || typeof value.valueInCents !== 'number' || typeof value.currency !== 'string') {
    return undefined
  }
  return { valueInCents: value.valueInCents, currency: value.currency }
}

function normalizeSlug(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--slug must be an Open Collective slug such as webpack.')
  }
  return normalized
}

function hasGraphqlErrors(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.errors) && value.errors.length > 0
}

function readGraphqlError(value: unknown): string | undefined {
  if (!isRecord(value) || !Array.isArray(value.errors) || !isRecord(value.errors[0])) return undefined
  return optionalString(value.errors[0].message)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
