import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const QURAN_CLOUD_DEFAULT_BASE_URL = 'https://api.alquran.cloud/v1'
export const QURAN_CLOUD_DEFAULT_EDITION = 'en.asad'
export const QURAN_CLOUD_DEFAULT_SURAH = 1
export const QURAN_CLOUD_DEFAULT_SURAH_LIMIT = 286
export const QURAN_CLOUD_MAX_SURAH_LIMIT = 286

export type QuranCloudClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

export type QuranCloudAyahQuery = {
  reference?: string | undefined
  edition?: string | undefined
}

export type QuranCloudSurahQuery = {
  surah?: number | undefined
  edition?: string | undefined
  offset?: number | undefined
  limit?: number | undefined
}

export type QuranCloudEdition = {
  identifier: string
  language?: string | undefined
  name?: string | undefined
  englishName?: string | undefined
  format?: string | undefined
  type?: string | undefined
}

export type QuranCloudSurahMeta = {
  number: number
  name: string
  englishName: string
  englishNameTranslation?: string | undefined
  numberOfAyahs?: number | undefined
  revelationType?: string | undefined
}

export type QuranCloudAyah = {
  number: number
  text: string
  numberInSurah: number
  juz?: number | undefined
  manzil?: number | undefined
  page?: number | undefined
  ruku?: number | undefined
  hizbQuarter?: number | undefined
  sajda?: boolean | undefined
  surah?: QuranCloudSurahMeta | undefined
  edition?: QuranCloudEdition | undefined
}

export type QuranCloudSurah = QuranCloudSurahMeta & {
  edition?: QuranCloudEdition | undefined
  ayahs: QuranCloudAyah[]
}

type NormalizedQuranCloudAyahQuery = {
  reference: string
  edition: string
}

type NormalizedQuranCloudSurahQuery = {
  surah: number
  edition: string
  offset?: number | undefined
  limit: number
}

export class QuranCloudClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: QuranCloudClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? QURAN_CLOUD_DEFAULT_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getAyah(query: QuranCloudAyahQuery = {}): Promise<QuranCloudAyah> {
    const normalized = normalizeAyahQuery(query)
    const parsed = await this.fetchEnvelope(new URL(`/v1/ayah/${encodeURIComponent(normalized.reference)}/${encodeURIComponent(normalized.edition)}`, this.baseOrigin))
    return parseAyah(parsed)
  }

  async getSurah(query: QuranCloudSurahQuery = {}): Promise<QuranCloudSurah> {
    const normalized = normalizeSurahQuery(query)
    const url = new URL(`/v1/surah/${String(normalized.surah)}/${encodeURIComponent(normalized.edition)}`, this.baseOrigin)
    if (normalized.offset !== undefined) {
      url.searchParams.set('offset', String(normalized.offset))
    }
    url.searchParams.set('limit', String(normalized.limit))
    const parsed = await this.fetchEnvelope(url)
    return parseSurah(parsed)
  }

  private get baseOrigin(): string {
    const parsed = new URL(this.baseUrl)
    return parsed.origin
  }

  private async fetchEnvelope(url: URL): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'public-apis-tui no-auth CLI',
      },
    })

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Quran Cloud returned a non-JSON response.', {
        status: response.status,
        statusText: response.statusText,
      })
    }

    if (!response.ok || !isRecord(parsed) || parsed.status !== 'OK') {
      throw new RuntimeFailure('OPEN_API_FAILED', readEnvelopeError(parsed) ?? response.statusText ?? 'Quran Cloud request failed.', {
        status: response.status,
        response: parsed,
      })
    }

    return parsed.data
  }
}

export function normalizeQuranCloudAyahQuery(query: QuranCloudAyahQuery = {}): NormalizedQuranCloudAyahQuery {
  return normalizeAyahQuery(query)
}

export function normalizeQuranCloudSurahQuery(query: QuranCloudSurahQuery = {}): NormalizedQuranCloudSurahQuery {
  return normalizeSurahQuery(query)
}

function normalizeAyahQuery(query: QuranCloudAyahQuery = {}): NormalizedQuranCloudAyahQuery {
  return {
    reference: query.reference?.trim() || '2:255',
    edition: query.edition?.trim() || QURAN_CLOUD_DEFAULT_EDITION,
  }
}

function normalizeSurahQuery(query: QuranCloudSurahQuery = {}): NormalizedQuranCloudSurahQuery {
  return {
    surah: clampSurah(query.surah),
    edition: query.edition?.trim() || QURAN_CLOUD_DEFAULT_EDITION,
    ...(typeof query.offset === 'number' ? { offset: Math.max(0, Math.trunc(query.offset)) } : {}),
    limit: clampSurahLimit(query.limit),
  }
}

function clampSurah(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value < 1) {
    return QURAN_CLOUD_DEFAULT_SURAH
  }
  return Math.min(Math.trunc(value), 114)
}

function clampSurahLimit(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined || value < 1) {
    return QURAN_CLOUD_DEFAULT_SURAH_LIMIT
  }
  return Math.min(Math.trunc(value), QURAN_CLOUD_MAX_SURAH_LIMIT)
}

function parseAyah(value: unknown): QuranCloudAyah {
  if (!isRecord(value) || typeof value.number !== 'number' || typeof value.text !== 'string' || typeof value.numberInSurah !== 'number') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Quran Cloud ayah response is missing required fields.')
  }
  return {
    number: value.number,
    text: value.text,
    numberInSurah: value.numberInSurah,
    ...(typeof value.juz === 'number' ? { juz: value.juz } : {}),
    ...(typeof value.manzil === 'number' ? { manzil: value.manzil } : {}),
    ...(typeof value.page === 'number' ? { page: value.page } : {}),
    ...(typeof value.ruku === 'number' ? { ruku: value.ruku } : {}),
    ...(typeof value.hizbQuarter === 'number' ? { hizbQuarter: value.hizbQuarter } : {}),
    ...(typeof value.sajda === 'boolean' ? { sajda: value.sajda } : {}),
    ...(isRecord(value.surah) ? { surah: parseSurahMeta(value.surah) } : {}),
    ...(isRecord(value.edition) ? { edition: parseEdition(value.edition) } : {}),
  }
}

function parseSurah(value: unknown): QuranCloudSurah {
  if (!isRecord(value) || !Array.isArray(value.ayahs)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Quran Cloud surah response is missing ayahs.')
  }
  return {
    ...parseSurahMeta(value),
    ...(isRecord(value.edition) ? { edition: parseEdition(value.edition) } : {}),
    ayahs: value.ayahs.map(parseAyah),
  }
}

function parseSurahMeta(value: Record<string, unknown>): QuranCloudSurahMeta {
  if (typeof value.number !== 'number' || typeof value.name !== 'string' || typeof value.englishName !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Quran Cloud surah metadata is missing required fields.')
  }
  return {
    number: value.number,
    name: value.name,
    englishName: value.englishName,
    ...(typeof value.englishNameTranslation === 'string' ? { englishNameTranslation: value.englishNameTranslation } : {}),
    ...(typeof value.numberOfAyahs === 'number' ? { numberOfAyahs: value.numberOfAyahs } : {}),
    ...(typeof value.revelationType === 'string' ? { revelationType: value.revelationType } : {}),
  }
}

function parseEdition(value: Record<string, unknown>): QuranCloudEdition {
  if (typeof value.identifier !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Quran Cloud edition metadata is missing identifier.')
  }
  return {
    identifier: value.identifier,
    ...(typeof value.language === 'string' ? { language: value.language } : {}),
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
    ...(typeof value.englishName === 'string' ? { englishName: value.englishName } : {}),
    ...(typeof value.format === 'string' ? { format: value.format } : {}),
    ...(typeof value.type === 'string' ? { type: value.type } : {}),
  }
}

function readEnvelopeError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (typeof value.data === 'string') {
    return value.data
  }
  return typeof value.status === 'string' ? value.status : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
