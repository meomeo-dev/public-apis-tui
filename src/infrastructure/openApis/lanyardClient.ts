import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const LANYARD_DEFAULT_BASE_URL = 'https://api.lanyard.rest/v1'
export const LANYARD_DEFAULT_USER_ID = '94490510688792576'

export type LanyardPresenceInput = {
  userId?: string | undefined
}

export type NormalizedLanyardPresenceInput = {
  userId: string
}

export type LanyardDiscordUser = {
  id: string
  username: string
  displayName?: string | undefined
  globalName?: string | undefined
  avatar?: string | undefined
  bot?: boolean | undefined
}

export type LanyardActivity = {
  id?: string | undefined
  name: string
  type?: number | undefined
  state?: string | undefined
  details?: string | undefined
  createdAt?: number | undefined
}

export type LanyardPresence = {
  discordUser: LanyardDiscordUser
  discordStatus: string
  activeOn: {
    web: boolean
    desktop: boolean
    mobile: boolean
    embedded: boolean
    vr: boolean
  }
  activities: LanyardActivity[]
  listeningToSpotify: boolean
  spotify?: Record<string, unknown> | undefined
  kv?: Record<string, string> | undefined
}

export class LanyardClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {
    this.baseUrl = (options.baseUrl ?? LANYARD_DEFAULT_BASE_URL).replace(/\/$/u, '')
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async presence(input: NormalizedLanyardPresenceInput): Promise<LanyardPresence> {
    const endpoint = `${this.baseUrl}/users/${input.userId}`
    let response: Response
    try {
      response = await this.fetchImpl(endpoint, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui no-auth CLI' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Lanyard request failed: ${String(error)}`, { provider: 'lanyard', endpoint })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Lanyard returned a non-JSON response: ${String(error)}`, { provider: 'lanyard', endpoint, status: response.status })
    }

    if (!response.ok || !isRecord(parsed) || parsed.success !== true) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Lanyard request failed with HTTP ${response.status}.`, {
        provider: 'lanyard',
        endpoint,
        status: response.status,
      })
    }

    return parsePresence(parsed.data)
  }
}

export function normalizeLanyardPresenceInput(input: LanyardPresenceInput = {}): NormalizedLanyardPresenceInput {
  return { userId: normalizeUserId(input.userId ?? LANYARD_DEFAULT_USER_ID) }
}

function parsePresence(value: unknown): LanyardPresence {
  if (!isRecord(value) || !isRecord(value.discord_user)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Lanyard response was missing discord_user.')
  }
  return {
    discordUser: parseDiscordUser(value.discord_user),
    discordStatus: optionalString(value.discord_status) ?? 'unknown',
    activeOn: {
      web: value.active_on_discord_web === true,
      desktop: value.active_on_discord_desktop === true,
      mobile: value.active_on_discord_mobile === true,
      embedded: value.active_on_discord_embedded === true,
      vr: value.active_on_discord_vr === true,
    },
    activities: Array.isArray(value.activities) ? value.activities.filter(isRecord).map(parseActivity) : [],
    listeningToSpotify: value.listening_to_spotify === true,
    spotify: isRecord(value.spotify) ? value.spotify : undefined,
    kv: parseKv(value.kv),
  }
}

function parseDiscordUser(value: Record<string, unknown>): LanyardDiscordUser {
  const id = optionalString(value.id)
  const username = optionalString(value.username)
  if (id === undefined || username === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Lanyard discord_user was missing id or username.')
  }
  return {
    id,
    username,
    displayName: optionalString(value.display_name),
    globalName: optionalString(value.global_name),
    avatar: optionalString(value.avatar),
    bot: typeof value.bot === 'boolean' ? value.bot : undefined,
  }
}

function parseActivity(value: Record<string, unknown>): LanyardActivity {
  return {
    name: optionalString(value.name) ?? 'unknown activity',
    id: optionalString(value.id),
    type: typeof value.type === 'number' ? value.type : undefined,
    state: optionalString(value.state),
    details: optionalString(value.details),
    createdAt: typeof value.created_at === 'number' ? value.created_at : undefined,
  }
}

function parseKv(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function normalizeUserId(value: string): string {
  const normalized = value.trim()
  if (!/^[0-9]{15,25}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--user-id must be a Discord snowflake id.')
  }
  return normalized
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const error = value.error ?? value.message
  return typeof error === 'string' && error.trim() !== '' ? error : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
