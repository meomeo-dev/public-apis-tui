import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const UK_CARBON_INTENSITY_DEFAULT_BASE_URL = 'https://api.carbonintensity.org.uk'

export type UkCarbonIntensityCurrentInput = Record<string, never>
export type UkCarbonIntensityGenerationInput = Record<string, never>

export type UkCarbonIntensityWindow = {
  from: string
  to: string
}

export type UkCarbonIntensityReading = UkCarbonIntensityWindow & {
  forecast?: number | undefined
  actual?: number | undefined
  index?: string | undefined
}

export type UkCarbonGenerationMixEntry = {
  fuel: string
  percentage: number
}

export type UkCarbonGenerationMix = UkCarbonIntensityWindow & {
  mix: UkCarbonGenerationMixEntry[]
}

export class UkCarbonIntensityClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch } = {}) {}

  async getCurrentIntensity(): Promise<UkCarbonIntensityReading> {
    const url = new URL('/intensity', normalizeBaseUrl(this.options.baseUrl ?? UK_CARBON_INTENSITY_DEFAULT_BASE_URL))
    const parsed = await this.fetchJson(url)
    if (!isRecord(parsed) || !Array.isArray(parsed.data)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'UK Carbon Intensity response did not include a data array.')
    }
    const first = parsed.data.find(isRecord)
    if (first === undefined) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'UK Carbon Intensity response did not include a current reading.')
    }
    return parseIntensityReading(first)
  }

  async getCurrentGenerationMix(): Promise<UkCarbonGenerationMix> {
    const url = new URL('/generation', normalizeBaseUrl(this.options.baseUrl ?? UK_CARBON_INTENSITY_DEFAULT_BASE_URL))
    const parsed = await this.fetchJson(url)
    if (!isRecord(parsed) || !isRecord(parsed.data)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'UK Carbon Intensity generation response did not include a data object.')
    }
    return parseGenerationMix(parsed.data)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `UK Carbon Intensity request failed: ${String(error)}`, {
        provider: 'ukcarbonintensity',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `UK Carbon Intensity returned a non-JSON response: ${String(error)}`, {
        provider: 'ukcarbonintensity',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readApiError(parsed) ?? `UK Carbon Intensity request failed with HTTP ${response.status}.`, {
        provider: 'ukcarbonintensity',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeUkCarbonCurrentInput(_input: UkCarbonIntensityCurrentInput = {}): UkCarbonIntensityCurrentInput {
  return {}
}

export function normalizeUkCarbonGenerationInput(_input: UkCarbonIntensityGenerationInput = {}): UkCarbonIntensityGenerationInput {
  return {}
}

function parseIntensityReading(value: Record<string, unknown>): UkCarbonIntensityReading {
  const intensity = isRecord(value.intensity) ? value.intensity : undefined
  if (typeof value.from !== 'string' || typeof value.to !== 'string' || intensity === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'UK Carbon Intensity current reading had an unexpected schema.')
  }
  return {
    from: value.from,
    to: value.to,
    ...(typeof intensity.forecast === 'number' ? { forecast: intensity.forecast } : {}),
    ...(typeof intensity.actual === 'number' ? { actual: intensity.actual } : {}),
    ...(typeof intensity.index === 'string' ? { index: intensity.index } : {}),
  }
}

function parseGenerationMix(value: Record<string, unknown>): UkCarbonGenerationMix {
  if (typeof value.from !== 'string' || typeof value.to !== 'string' || !Array.isArray(value.generationmix)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'UK Carbon Intensity generation mix had an unexpected schema.')
  }
  return {
    from: value.from,
    to: value.to,
    mix: value.generationmix.filter(isRecord).map(entry => {
      if (typeof entry.fuel !== 'string' || typeof entry.perc !== 'number') {
        throw new RuntimeFailure('OPEN_API_FAILED', 'UK Carbon Intensity generation mix entry had an unexpected schema.')
      }
      return { fuel: entry.fuel, percentage: entry.perc }
    }),
  }
}

function readApiError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.error === 'string') {
    return value.error
  }
  if (typeof value.message === 'string') {
    return value.message
  }
  return undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
