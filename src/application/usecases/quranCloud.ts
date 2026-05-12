import {
  normalizeQuranCloudAyahQuery,
  normalizeQuranCloudSurahQuery,
  QuranCloudClient,
  QURAN_CLOUD_DEFAULT_EDITION,
  QURAN_CLOUD_DEFAULT_SURAH_LIMIT,
  QURAN_CLOUD_MAX_SURAH_LIMIT,
  type QuranCloudAyah,
  type QuranCloudSurah,
} from '../../infrastructure/openApis/quranCloudClient.js'

export type QuranCloudAyahInput = {
  reference?: string | undefined
  edition?: string | undefined
}

export type QuranCloudSurahInput = {
  surah?: number | undefined
  edition?: string | undefined
  offset?: number | undefined
  limit?: number | undefined
}

export async function getQuranCloudAyah(input: QuranCloudAyahInput = {}): Promise<Record<string, unknown>> {
  const client = new QuranCloudClient()
  const query = normalizeQuranCloudAyahQuery(input)
  const ayah = await client.getAyah(query)
  return {
    kind: 'qurancloud.ayah',
    api: createApiMeta('GET /v1/ayah/{reference}/{edition}'),
    query,
    ayah: projectAyah(ayah),
  }
}

export async function getQuranCloudSurah(input: QuranCloudSurahInput = {}): Promise<Record<string, unknown>> {
  const client = new QuranCloudClient()
  const query = normalizeQuranCloudSurahQuery(input)
  const surah = await client.getSurah(query)
  return {
    kind: 'qurancloud.surah',
    api: createApiMeta('GET /v1/surah/{surah}/{edition}?offset=&limit='),
    query,
    surah: projectSurah(surah),
    count: surah.ayahs.length,
    ayahs: surah.ayahs.map(projectAyah),
  }
}

function createApiMeta(endpoint: string): Record<string, unknown> {
  return {
    provider: 'qurancloud',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    defaultEdition: QURAN_CLOUD_DEFAULT_EDITION,
    documentedDefaultEdition: 'quran-uthmani when omitted; CLI defaults to en.asad for readable terminal translations',
    defaultSurahLimit: QURAN_CLOUD_DEFAULT_SURAH_LIMIT,
    cliSurahLimitCap: QURAN_CLOUD_MAX_SURAH_LIMIT,
    docs: 'https://alquran.cloud/api',
  }
}

function projectSurah(surah: QuranCloudSurah): Record<string, unknown> {
  return {
    number: surah.number,
    name: surah.name,
    englishName: surah.englishName,
    ...(surah.englishNameTranslation !== undefined ? { englishNameTranslation: surah.englishNameTranslation } : {}),
    ...(surah.numberOfAyahs !== undefined ? { numberOfAyahs: surah.numberOfAyahs } : {}),
    ...(surah.revelationType !== undefined ? { revelationType: surah.revelationType } : {}),
    ...(surah.edition !== undefined ? { edition: surah.edition } : {}),
  }
}

function projectAyah(ayah: QuranCloudAyah): Record<string, unknown> {
  return {
    number: ayah.number,
    numberInSurah: ayah.numberInSurah,
    text: ayah.text,
    ...(ayah.juz !== undefined ? { juz: ayah.juz } : {}),
    ...(ayah.page !== undefined ? { page: ayah.page } : {}),
    ...(ayah.surah !== undefined ? { surah: projectSurah({ ...ayah.surah, ayahs: [] }) } : {}),
    ...(ayah.edition !== undefined ? { edition: ayah.edition } : {}),
  }
}
