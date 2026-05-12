import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const KICKBOX_DEFAULT_BASE_URL = 'https://open.kickbox.com'
export const KICKBOX_DEFAULT_TARGET = 'gmail.com'

export type KickboxDisposableInput = {
  target?: string | undefined
}

export type NormalizedKickboxDisposableInput = {
  target: string
}

export type KickboxDisposableResponse = {
  disposable: boolean
}

export class KickboxClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch } = {}) {}

  async checkDisposable(input: KickboxDisposableInput = {}): Promise<KickboxDisposableResponse> {
    const query = normalizeKickboxDisposableInput(input)
    const url = new URL(`/v1/disposable/${encodeURIComponent(query.target)}`, normalizeBaseUrl(this.options.baseUrl ?? KICKBOX_DEFAULT_BASE_URL))
    const parsed = await this.fetchJson(url)
    if (!isRecord(parsed) || typeof parsed.disposable !== 'boolean') {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Kickbox open API response must include disposable boolean.')
    }
    return { disposable: parsed.disposable }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Kickbox open API request failed: ${String(error)}`, {
        provider: 'kickbox',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Kickbox open API returned a non-JSON response: ${String(error)}`, {
        provider: 'kickbox',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Kickbox open API request failed with HTTP ${response.status}.`, {
        provider: 'kickbox',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeKickboxDisposableInput(input: KickboxDisposableInput = {}): NormalizedKickboxDisposableInput {
  const target = (input.target ?? KICKBOX_DEFAULT_TARGET).trim().toLowerCase()
  if (target.includes('@')) {
    if (target.length < 3 || target.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(target)) {
      throw new RuntimeFailure('INVALID_ARGUMENT', 'Kickbox --target must be a valid email address or domain.', { target: input.target })
    }
    return { target }
  }
  if (target.length < 1 || target.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/u.test(target)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Kickbox --target must be a valid email address or domain.', { target: input.target })
  }
  return { target }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
