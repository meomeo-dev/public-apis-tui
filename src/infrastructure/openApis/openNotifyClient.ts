import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

type FetchImpl = typeof fetch

export type OpenNotifyAstronaut = {
  name: string
  craft: string
}

export type OpenNotifyIssPosition = {
  latitude: number
  longitude: number
}

export class OpenNotifyClient {
  constructor(
    private readonly options: { fetchImpl?: FetchImpl | undefined } = {},
  ) {}

  async listAstronauts(): Promise<{ number: number; people: OpenNotifyAstronaut[] }> {
    const response = await this.fetchJson(
      new URL('http://api.open-notify.org/astros.json'),
    )
    if (
      !isRecord(response) ||
      response.message !== 'success' ||
      !Array.isArray(response.people)
    ) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Open Notify astronauts response had an unexpected schema.',
      )
    }
    const people = response.people
      .map(parseAstronaut)
      .filter((person): person is OpenNotifyAstronaut => person !== undefined)
    return {
      number: parseNumber(response.number) ?? people.length,
      people,
    }
  }

  async getIssNow(): Promise<{ timestamp: number; position: OpenNotifyIssPosition }> {
    const response = await this.fetchJson(
      new URL('http://api.open-notify.org/iss-now.json'),
    )
    const position = isRecord(response) && isRecord(response.iss_position)
      ? response.iss_position
      : undefined
    const latitude = parseCoordinate(position?.latitude)
    const longitude = parseCoordinate(position?.longitude)
    const timestamp = isRecord(response) ? parseNumber(response.timestamp) : undefined
    if (
      !isRecord(response) ||
      response.message !== 'success' ||
      latitude === undefined ||
      longitude === undefined ||
      timestamp === undefined
    ) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Open Notify ISS position response had an unexpected schema.',
      )
    }
    return {
      timestamp,
      position: { latitude, longitude },
    }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    let response: Response | undefined
    let lastError: unknown
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        response = await fetchImpl(url, { headers: { accept: 'application/json' } })
        break
      } catch (error) {
        lastError = error
        if (attempt < 3) {
          await delay(150 * (attempt + 1))
        }
      }
    }
    if (response === undefined) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'Open Notify request failed before receiving a response.',
        {
          provider: 'opennotify',
          endpoint: url.href,
          cause: lastError instanceof Error ? lastError.message : String(lastError),
        },
      )
    }
    const text = await response.text()
    const contentType = response.headers.get('content-type') ?? undefined
    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'Open Notify is currently returning a Cloudflare challenge HTML page',
          'instead of the documented JSON API response; retry later or use',
          'cached/offline data.',
        ].join(' '),
        {
          provider: 'opennotify',
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
        'Open Notify returned non-JSON content.',
        {
          provider: 'opennotify',
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
        `Open Notify request failed with HTTP ${response.status}.`,
        {
          provider: 'opennotify',
          endpoint: url.href,
          status: response.status,
          response: parsed,
        },
      )
    }
    return parsed
  }
}

function parseAstronaut(value: unknown): OpenNotifyAstronaut | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const name = readString(value.name)
  const craft = readString(value.craft)
  return name === undefined || craft === undefined ? undefined : { name, craft }
}

function parseCoordinate(value: unknown): number | undefined {
  const number = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number.parseFloat(value)
      : Number.NaN
  return Number.isFinite(number) ? number : undefined
}

function parseNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
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
