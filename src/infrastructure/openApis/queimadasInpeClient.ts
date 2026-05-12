import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const QUEIMADAS_INPE_DOCS_URL = 'https://data.inpe.br/queimadas/dados-abertos/'
export const QUEIMADAS_INPE_10MIN_CSV_INDEX_URL = 'https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/'
export const QUEIMADAS_INPE_DEFAULT_LIMIT = 10
export const QUEIMADAS_INPE_MAX_LIMIT = 50

export type QueimadasInpeLatestInput = {
  limit?: number | undefined
}

export type NormalizedQueimadasInpeLatestInput = {
  limit: number
}

export type QueimadasInpeFocus = {
  latitude: number
  longitude: number
  satellite: string
  observedAt: string
}

export type QueimadasInpeLatestCsv = {
  fileName: string
  fileUrl: string
  focuses: QueimadasInpeFocus[]
  totalRows: number
}

type QueimadasInpeClientOptions = {
  indexUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export class QueimadasInpeClient {
  constructor(private readonly options: QueimadasInpeClientOptions = {}) {}

  async latest10Min(input: NormalizedQueimadasInpeLatestInput): Promise<QueimadasInpeLatestCsv> {
    const indexUrl = new URL(this.options.indexUrl ?? QUEIMADAS_INPE_10MIN_CSV_INDEX_URL)
    const indexHtml = await this.fetchText(indexUrl, 'text/html')
    const fileName = findLatestCsvFile(indexHtml)
    const fileUrl = new URL(fileName, indexUrl)
    const csv = await this.fetchText(fileUrl, 'text/csv')
    const focuses = parseCsv(csv)
    return {
      fileName,
      fileUrl: fileUrl.href,
      focuses: focuses.slice(0, input.limit),
      totalRows: focuses.length,
    }
  }

  private async fetchText(url: URL, accept: string): Promise<string> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Queimadas INPE request failed: ${String(error)}`, {
        provider: 'queimadas-inpe',
        endpoint: url.href,
      })
    }
    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Queimadas INPE response could not be read: ${String(error)}`, {
        provider: 'queimadas-inpe',
        endpoint: url.href,
        status: response.status,
      })
    }
    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Queimadas INPE is currently returning a Cloudflare challenge HTML page instead of the documented open-data index/CSV response; retry later or use cached/offline data.', {
        provider: 'queimadas-inpe',
        endpoint: url.href,
        status: response.status,
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Queimadas INPE request failed with HTTP ${response.status}.`, {
        provider: 'queimadas-inpe',
        endpoint: url.href,
        status: response.status,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }
    return body
  }
}

export function normalizeQueimadasInpeLatestInput(input: QueimadasInpeLatestInput = {}): NormalizedQueimadasInpeLatestInput {
  return { limit: normalizeInteger(input.limit, QUEIMADAS_INPE_DEFAULT_LIMIT, 1, QUEIMADAS_INPE_MAX_LIMIT, '--limit') }
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number, label: string): number {
  const parsed = value ?? fallback
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${String(min)} and ${String(max)}.`)
  }
  return parsed
}

function findLatestCsvFile(indexHtml: string): string {
  const files = Array.from(indexHtml.matchAll(/href="([^"]*focos_10min_[0-9]{8}_[0-9]{4}\.csv)"/gu), match => match[1] ?? '')
    .map(file => file.split('/').pop() ?? file)
    .filter(file => /^focos_10min_[0-9]{8}_[0-9]{4}\.csv$/u.test(file))
    .sort()
  const latest = files.at(-1)
  if (latest === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Queimadas INPE 10-minute CSV index did not include any focos_10min CSV files.', { provider: 'queimadas-inpe' })
  }
  return latest
}

function parseCsv(csv: string): QueimadasInpeFocus[] {
  const lines = csv.split(/\r?\n/u).filter(line => line.trim() !== '')
  const header = lines.shift()?.trim()
  if (header !== 'lat,lon,satelite,data') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Queimadas INPE CSV header was not the expected lat,lon,satelite,data schema.', { provider: 'queimadas-inpe', header })
  }
  return lines.map(parseCsvLine)
}

function parseCsvLine(line: string): QueimadasInpeFocus {
  const columns = line.split(',')
  if (columns.length !== 4) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Queimadas INPE CSV row had an unexpected number of columns.', { provider: 'queimadas-inpe', row: line })
  }
  const latitude = Number(columns[0]?.trim())
  const longitude = Number(columns[1]?.trim())
  const satellite = columns[2]?.trim() ?? ''
  const observedAt = columns[3]?.trim() ?? ''
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || satellite === '' || observedAt === '') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Queimadas INPE CSV row had invalid coordinate, satellite, or timestamp values.', { provider: 'queimadas-inpe', row: line })
  }
  return { latitude, longitude, satellite, observedAt }
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  const contentType = response.headers.get('content-type')?.toLowerCase()
  return (
    mitigated === 'challenge' ||
    body.includes('Just a moment...') ||
    ((response.status === 403 || response.status === 429) && server === 'cloudflare' && contentType?.includes('text/html') === true)
  )
}
