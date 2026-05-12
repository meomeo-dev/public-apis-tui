import {
  FREE_DICTIONARY_DEFAULT_DEFINITION_LIMIT,
  FREE_DICTIONARY_MAX_DEFINITION_LIMIT,
  FreeDictionaryClient,
  normalizeFreeDictionaryDefineInput,
  type FreeDictionaryDefineInput,
  type FreeDictionaryEntry,
  type FreeDictionaryRateLimit,
} from '../../infrastructure/openApis/freeDictionaryClient.js'

export type FreeDictionaryDefineResult = {
  kind: 'freedictionary.define'
  api: {
    provider: 'free-dictionary'
    endpoint: 'GET /api/v2/entries/{language}/{word}'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://dictionaryapi.dev/'
    homepage: 'https://dictionaryapi.dev/'
    transport: 'HTTPS JSON'
    rateLimit: 'x-ratelimit headers observed on live responses'
    publicApisProject: 'https://github.com/public-apis/public-apis'
    defaults: {
      language: 'en'
      definitionLimit: number
    }
    definitionLimitCap: number
  }
  query: {
    word: string
    language: string
    definitionLimit: number
  }
  entries: Array<{
    word: string
    phonetic?: string | undefined
    phonetics: FreeDictionaryEntry['phonetics']
    meanings: Array<{
      partOfSpeech: string
      definitions: FreeDictionaryEntry['meanings'][number]['definitions']
      synonyms: string[]
      antonyms: string[]
    }>
    license?: FreeDictionaryEntry['license'] | undefined
    sourceUrls: string[]
  }>
  count: {
    entries: number
    meanings: number
    definitionsShown: number
    definitionsTotal: number
  }
  rateLimit: FreeDictionaryRateLimit
}

export type { FreeDictionaryDefineInput }

export async function defineFreeDictionary(input: FreeDictionaryDefineInput = {}): Promise<FreeDictionaryDefineResult> {
  const query = normalizeFreeDictionaryDefineInput(input)
  const client = new FreeDictionaryClient()
  const response = await client.define(query)
  const projected = projectEntries(response.entries, query.definitionLimit)
  const totalDefinitions = countDefinitions(response.entries)
  return {
    kind: 'freedictionary.define',
    api: {
      provider: 'free-dictionary',
      endpoint: 'GET /api/v2/entries/{language}/{word}',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://dictionaryapi.dev/',
      homepage: 'https://dictionaryapi.dev/',
      transport: 'HTTPS JSON',
      rateLimit: 'x-ratelimit headers observed on live responses',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      defaults: {
        language: 'en',
        definitionLimit: FREE_DICTIONARY_DEFAULT_DEFINITION_LIMIT,
      },
      definitionLimitCap: FREE_DICTIONARY_MAX_DEFINITION_LIMIT,
    },
    query,
    entries: projected,
    count: {
      entries: projected.length,
      meanings: projected.reduce((sum, entry) => sum + entry.meanings.length, 0),
      definitionsShown: countDefinitions(projected),
      definitionsTotal: totalDefinitions,
    },
    rateLimit: response.rateLimit,
  }
}

function projectEntries(entries: FreeDictionaryEntry[], definitionLimit: number): FreeDictionaryDefineResult['entries'] {
  let remainingDefinitions = definitionLimit
  const projected: FreeDictionaryDefineResult['entries'] = []
  for (const entry of entries) {
    if (remainingDefinitions <= 0) {
      break
    }
    const meanings = []
    for (const meaning of entry.meanings) {
      if (remainingDefinitions <= 0) {
        break
      }
      const definitions = meaning.definitions.slice(0, remainingDefinitions)
      if (definitions.length > 0) {
        meanings.push({
          partOfSpeech: meaning.partOfSpeech,
          definitions,
          synonyms: meaning.synonyms,
          antonyms: meaning.antonyms,
        })
        remainingDefinitions -= definitions.length
      }
    }
    projected.push({
      word: entry.word,
      ...(entry.phonetic !== undefined ? { phonetic: entry.phonetic } : {}),
      phonetics: entry.phonetics,
      meanings,
      ...(entry.license !== undefined ? { license: entry.license } : {}),
      sourceUrls: entry.sourceUrls,
    })
  }
  return projected
}

function countDefinitions(entries: Array<{ meanings: Array<{ definitions: unknown[] }> }>): number {
  return entries.reduce((entrySum, entry) => entrySum + entry.meanings.reduce((meaningSum, meaning) => meaningSum + meaning.definitions.length, 0), 0)
}
