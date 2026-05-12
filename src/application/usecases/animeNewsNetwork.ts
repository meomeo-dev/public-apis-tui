import { AnimeNewsNetworkClient } from '../../infrastructure/openApis/animeNewsNetworkClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type AnimeNewsNetworkTitlesInput = {
  skip?: number | undefined
  limit?: number | undefined
  namePrefix?: string | undefined
}

export type AnimeNewsNetworkApiMeta = {
  provider: 'anime-news-network'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /encyclopedia/reports.xml?id=155&type=anime'
  docsUrl: 'https://www.animenewsnetwork.com/encyclopedia/api.php'
  usesBrowserClickstream: false
  authentication: 'none'
  rateLimit: '1 request/second/IP'
  attribution: 'Anime News Network source/link attribution required by provider terms.'
}

export type AnimeNewsNetworkTitlesResult = {
  kind: 'animenewsnetwork.titles'
  api: AnimeNewsNetworkApiMeta
  query: {
    reportId: 155
    type: 'anime'
    skip: number
    limit: number
    namePrefix?: string | undefined
  }
  pagination: {
    skipped: number
    listed: number
    nextSkip: number
  }
  count: number
  titles: Array<{
    id: number
    gid?: number | undefined
    type?: string | undefined
    name: string
    precision?: string | undefined
    vintage?: string | undefined
    url: string
  }>
}

export async function listAnimeNewsNetworkTitles(input: AnimeNewsNetworkTitlesInput = {}): Promise<AnimeNewsNetworkTitlesResult> {
  const query = normalizeTitlesInput(input)
  const client = new AnimeNewsNetworkClient()
  const report = await client.listAnimeTitles({
    skip: query.skip,
    limit: query.limit,
    namePrefix: query.namePrefix,
  })
  return {
    kind: 'animenewsnetwork.titles',
    api: {
      provider: 'anime-news-network',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /encyclopedia/reports.xml?id=155&type=anime',
      docsUrl: 'https://www.animenewsnetwork.com/encyclopedia/api.php',
      usesBrowserClickstream: false,
      authentication: 'none',
      rateLimit: '1 request/second/IP',
      attribution: 'Anime News Network source/link attribution required by provider terms.',
    },
    query,
    pagination: {
      skipped: report.skipped,
      listed: report.listed,
      nextSkip: report.skipped + report.listed,
    },
    count: report.items.length,
    titles: report.items.map(item => ({
      ...item,
      url: `https://www.animenewsnetwork.com/encyclopedia/anime.php?id=${item.id}`,
    })),
  }
}

function normalizeTitlesInput(input: AnimeNewsNetworkTitlesInput): AnimeNewsNetworkTitlesResult['query'] {
  return {
    reportId: 155,
    type: 'anime',
    skip: normalizeSkip(input.skip),
    limit: normalizeLimit(input.limit),
    ...normalizeNamePrefix(input.namePrefix),
  }
}

function normalizeSkip(value: number | undefined): number {
  const skip = value ?? 0
  if (!Number.isInteger(skip) || skip < 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Anime News Network --skip must be a non-negative integer.', { skip: value })
  }
  return skip
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Anime News Network --limit must be an integer from 1 to 200.', {
      limit: value,
      note: 'Provider docs support nlist=all, but the CLI caps interactive output to 200 rows.',
    })
  }
  return limit
}

function normalizeNamePrefix(value: string | undefined): { namePrefix?: string | undefined } {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? {} : { namePrefix: normalized }
}
