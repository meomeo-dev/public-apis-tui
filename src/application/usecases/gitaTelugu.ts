import { GitaTeluguClient, type GitaLanguage, type GitaVerse } from '../../infrastructure/openApis/gitaTeluguClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const languages = ['tel', 'odi'] as const
const gitaChapterVerseCounts = new Map<number, number>([
  [1, 47],
  [2, 72],
  [3, 43],
  [4, 42],
  [5, 29],
  [6, 47],
  [7, 30],
  [8, 28],
  [9, 34],
  [10, 42],
  [11, 55],
  [12, 20],
  [13, 35],
  [14, 27],
  [15, 20],
  [16, 24],
  [17, 28],
  [18, 78],
])

export type GitaTeluguVerseInput = {
  language?: string | undefined
  chapter?: number | undefined
  verse?: number | undefined
  serial?: number | undefined
}

export type GitaTeluguApiMeta = {
  provider: 'gita-telugu'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /{language}/verse/{chapter}/{verse}' | 'GET /{language}/verse/{serial}'
  docsUrl: 'https://gita-api.vercel.app/docs'
  openApiUrl: 'https://gita-api.vercel.app/openapi.json'
  sourceUrl: 'https://github.com/naveennamani/gita-telugu-api'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedMaximumResult: 'Single verse lookup only; no pagination maximum applies.'
}

export type GitaTeluguVerseResult = {
  kind: 'gitatelugu.verse'
  api: GitaTeluguApiMeta
  query: {
    language: GitaLanguage
    chapter?: number | undefined
    verse?: number | undefined
    serial?: number | undefined
  }
  verse: {
    chapterNo: number
    verseNo: number | number[]
    language: string
    chapterName: string
    text: string[]
    transliteration: string[]
    synonyms: string[]
    audioLink?: string | undefined
    translation: string
    purport: string[]
  }
  navigation: {
    previous?: { language: GitaLanguage; chapter: number; verse: number; command: string } | undefined
    next?: { language: GitaLanguage; chapter: number; verse: number; command: string } | undefined
    alternateLanguage: { language: GitaLanguage; command: string }
  }
}

export async function getGitaTeluguVerse(input: GitaTeluguVerseInput = {}): Promise<GitaTeluguVerseResult> {
  const query = normalizeVerseInput(input)
  const client = new GitaTeluguClient()
  const verse = await client.getVerse(query)
  return {
    kind: 'gitatelugu.verse',
    api: {
      provider: 'gita-telugu',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: query.serial === undefined ? 'GET /{language}/verse/{chapter}/{verse}' : 'GET /{language}/verse/{serial}',
      docsUrl: 'https://gita-api.vercel.app/docs',
      openApiUrl: 'https://gita-api.vercel.app/openapi.json',
      sourceUrl: 'https://github.com/naveennamani/gita-telugu-api',
      usesBrowserClickstream: false,
      authentication: 'none',
      documentedMaximumResult: 'Single verse lookup only; no pagination maximum applies.',
    },
    query,
    verse: toVerseResult(verse),
    navigation: buildNavigation(query, verse),
  }
}

function normalizeVerseInput(input: GitaTeluguVerseInput): GitaTeluguVerseResult['query'] {
  const language = normalizeLanguage(input.language)
  if (input.serial !== undefined) {
    return {
      language,
      serial: normalizeInteger(input.serial, 'serial', 1, 700),
    }
  }
  return {
    language,
    chapter: normalizeInteger(input.chapter, 'chapter', 1, 18),
    verse: normalizeInteger(input.verse, 'verse', 1, 78),
  }
}

function normalizeLanguage(value: string | undefined): GitaLanguage {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return 'tel'
  }
  if (languages.includes(normalized as GitaLanguage)) {
    return normalized as GitaLanguage
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', 'Gita Telugu --language must be tel or odi.', {
    language: value,
  })
}

function normalizeInteger(value: number | undefined, label: string, min: number, max: number): number {
  const integer = value ?? 1
  if (!Number.isInteger(integer) || integer < min || integer > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Gita Telugu --${label} must be an integer from ${min} to ${max}.`, {
      [label]: value,
    })
  }
  return integer
}

function toVerseResult(verse: GitaVerse): GitaTeluguVerseResult['verse'] {
  return {
    chapterNo: verse.chapterNo,
    verseNo: verse.verseNo,
    language: verse.language,
    chapterName: verse.chapterName,
    text: toStringList(verse.verse),
    transliteration: toStringList(verse.transliteration ?? ''),
    synonyms: toSynonymList(verse.synonyms ?? ''),
    ...(verse.audioLink !== undefined && verse.audioLink.trim() !== '' ? { audioLink: verse.audioLink } : {}),
    translation: verse.translation,
    purport: toStringList(verse.purport),
  }
}

function buildNavigation(
  query: GitaTeluguVerseResult['query'],
  verse: GitaVerse,
): GitaTeluguVerseResult['navigation'] {
  const language = query.language
  const chapter = verse.chapterNo
  const verseNo = normalizeNavigationVerseNo(verse.verseNo)
  const alternateLanguage = language === 'tel' ? 'odi' : 'tel'
  const navigation: GitaTeluguVerseResult['navigation'] = {
    alternateLanguage: {
      language: alternateLanguage,
      command: buildVerseCommand(alternateLanguage, chapter, verseNo),
    },
  }
  const previous = previousVerse(chapter, verseNo)
  if (previous !== undefined) {
    navigation.previous = {
      language,
      chapter: previous.chapter,
      verse: previous.verse,
      command: buildVerseCommand(language, previous.chapter, previous.verse),
    }
  }
  const next = nextVerse(chapter, verseNo)
  if (next !== undefined) {
    navigation.next = {
      language,
      chapter: next.chapter,
      verse: next.verse,
      command: buildVerseCommand(language, next.chapter, next.verse),
    }
  }
  return navigation
}

function previousVerse(chapter: number, verse: number): { chapter: number; verse: number } | undefined {
  if (verse > 1) {
    return { chapter, verse: verse - 1 }
  }
  if (chapter <= 1) {
    return undefined
  }
  const previousChapter = chapter - 1
  return { chapter: previousChapter, verse: gitaChapterVerseCounts.get(previousChapter) ?? 1 }
}

function nextVerse(chapter: number, verse: number): { chapter: number; verse: number } | undefined {
  const chapterVerseCount = gitaChapterVerseCounts.get(chapter)
  if (chapterVerseCount !== undefined && verse < chapterVerseCount) {
    return { chapter, verse: verse + 1 }
  }
  if (chapter >= 18) {
    return undefined
  }
  return { chapter: chapter + 1, verse: 1 }
}

function normalizeNavigationVerseNo(value: number | number[]): number {
  if (typeof value === 'number') {
    return value
  }
  return value.find(entry => Number.isInteger(entry)) ?? 1
}

function buildVerseCommand(language: GitaLanguage, chapter: number, verse: number): string {
  return `public-apis apis run gitatelugu.verse -- --language ${language} --chapter ${chapter} --verse ${verse}`
}

function toStringList(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value].filter(entry => entry.trim() !== '')
}

function toSynonymList(value: string | string[] | Array<[string, string]>): string[] {
  if (typeof value === 'string') {
    return value.trim() === '' ? [] : [value]
  }
  if (value.every(entry => typeof entry === 'string')) {
    return value as string[]
  }
  return (value as Array<[string, string]>).map(([term, definition]) => `${term}: ${definition}`)
}
