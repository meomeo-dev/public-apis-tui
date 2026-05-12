import {
  normalizeQuranApiChapterQuery,
  normalizeQuranApiVerseQuery,
  QuranApiClient,
  QURAN_API_DEFAULT_CHAPTER_LIMIT,
  QURAN_API_DEFAULT_EDITION,
  QURAN_API_MAX_CHAPTER_LIMIT,
  type QuranApiVerse,
} from '../../infrastructure/openApis/quranApiClient.js'

export type QuranApiVerseInput = {
  edition?: string | undefined
  chapter?: number | undefined
  verse?: number | undefined
}

export type QuranApiChapterInput = {
  edition?: string | undefined
  chapter?: number | undefined
  offset?: number | undefined
  limit?: number | undefined
}

export async function getQuranApiVerse(input: QuranApiVerseInput = {}): Promise<Record<string, unknown>> {
  const client = new QuranApiClient()
  const query = normalizeQuranApiVerseQuery(input)
  const verse = await client.getVerse(query)
  return {
    kind: 'quranapi.verse',
    api: createApiMeta('GET /editions/{edition}/{chapter}/{verse}.json'),
    query,
    verse: projectVerse(verse),
  }
}

export async function getQuranApiChapter(input: QuranApiChapterInput = {}): Promise<Record<string, unknown>> {
  const client = new QuranApiClient()
  const query = normalizeQuranApiChapterQuery(input)
  const chapter = await client.getChapter(query)
  return {
    kind: 'quranapi.chapter',
    api: createApiMeta('GET /editions/{edition}/{chapter}.json'),
    query,
    count: chapter.verses.length,
    totalVerses: chapter.totalVerses,
    verses: chapter.verses.map(projectVerse),
  }
}

function createApiMeta(endpoint: string): Record<string, unknown> {
  return {
    provider: 'quranapi',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    defaultEdition: QURAN_API_DEFAULT_EDITION,
    noRateLimitClaim: true,
    defaultChapterLimit: QURAN_API_DEFAULT_CHAPTER_LIMIT,
    cliChapterLimitCap: QURAN_API_MAX_CHAPTER_LIMIT,
    docs: 'https://github.com/fawazahmed0/quran-api#readme',
  }
}

function projectVerse(verse: QuranApiVerse): Record<string, unknown> {
  return {
    chapter: verse.chapter,
    verse: verse.verse,
    text: verse.text,
  }
}
