import {
  AnimeChanClient,
  type AnimeChanRandomQuoteQuery,
} from '../../infrastructure/openApis/animeChanClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type AnimeChanRandomInput = {
  anime?: string | undefined
  character?: string | undefined
}

export type AnimeChanApiMeta = {
  provider: 'animechan'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /quotes/random'
  docsUrl: 'https://animechan.io/docs'
  usesBrowserClickstream: false
  authentication: 'none'
  freeRateLimit: '5 requests/hour'
}

export type AnimeChanRandomQuoteResult = {
  kind: 'animechan.random'
  api: AnimeChanApiMeta
  query: AnimeChanRandomQuoteQuery
  quote: {
    content: string
    anime: {
      id: number
      name: string
      altName?: string | undefined
    }
    character: {
      id: number
      name: string
    }
  }
}

export async function getAnimeChanRandomQuote(input: AnimeChanRandomInput = {}): Promise<AnimeChanRandomQuoteResult> {
  const query = normalizeRandomInput(input)
  const client = new AnimeChanClient()
  const quote = await client.getRandomQuote(query)
  return {
    kind: 'animechan.random',
    api: {
      provider: 'animechan',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /quotes/random',
      docsUrl: 'https://animechan.io/docs',
      usesBrowserClickstream: false,
      authentication: 'none',
      freeRateLimit: '5 requests/hour',
    },
    query,
    quote,
  }
}

function normalizeRandomInput(input: AnimeChanRandomInput): AnimeChanRandomQuoteQuery {
  const anime = normalizeOptionalText(input.anime)
  const character = normalizeOptionalText(input.character)
  if (anime !== undefined && character !== undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'AnimeChan --anime and --character are mutually exclusive for random quote lookup.', {
      anime,
      character,
    })
  }
  return {
    ...(anime !== undefined ? { anime } : {}),
    ...(character !== undefined ? { character } : {}),
  }
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? undefined : normalized
}
