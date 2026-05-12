import {
  ArtInstituteChicagoClient,
  type ArtInstituteChicagoArtwork,
  type ArtInstituteChicagoArtworksResponse,
} from '../../infrastructure/openApis/artInstituteChicagoClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

const defaultFields = 'id,title,artist_display,date_display,image_id,is_public_domain'
const defaultLimit = 100
const maximumInteractiveLimit = 100

export type ArtInstituteChicagoArtworksInput = {
  query?: string | undefined
  limit?: number | undefined
  page?: number | undefined
  fields?: string | undefined
}

export type ArtInstituteChicagoApiMeta = {
  provider: 'art-institute-chicago'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /artworks' | 'GET /artworks/search'
  docsUrl: 'https://api.artic.edu/docs/'
  openApiUrl: 'https://api.artic.edu/api/v1/openapi.json'
  usesBrowserClickstream: false
  authentication: 'none'
  rateLimit: 'No explicit rate limit found in official docs'
  documentedMaximumLimit: 'No finite maximum found; CLI caps interactive requests at 100'
  requiredHeaders: 'AIC-User-Agent'
}

export type ArtInstituteChicagoArtworkResult = {
  id: number
  title: string
  artistDisplay?: string | undefined
  dateDisplay?: string | undefined
  imageId?: string | undefined
  imageUrl?: string | undefined
  artworkUrl: string
  apiUrl: string
  isPublicDomain?: boolean | undefined
  score?: number | undefined
}

export type ArtInstituteChicagoArtworksResult = {
  kind: 'artic.artworks'
  api: ArtInstituteChicagoApiMeta
  query: {
    query?: string | undefined
    limit: number
    page: number
    fields: string
  }
  pagination: {
    total: number
    limit: number
    offset: number
    totalPages: number
    currentPage: number
    nextUrl?: string | undefined
  }
  count: number
  license: {
    text: string
    links: string[]
    version: string
  }
  artworks: ArtInstituteChicagoArtworkResult[]
}

export async function listArtInstituteChicagoArtworks(input: ArtInstituteChicagoArtworksInput = {}): Promise<ArtInstituteChicagoArtworksResult> {
  const query = normalizeArtworksInput(input)
  const client = new ArtInstituteChicagoClient()
  const response = await client.listArtworks(query)
  return toResult(query, response)
}

function normalizeArtworksInput(input: ArtInstituteChicagoArtworksInput): ArtInstituteChicagoArtworksResult['query'] {
  return {
    ...normalizeOptionalText(input.query, 'query'),
    limit: normalizeLimit(input.limit),
    page: normalizePage(input.page),
    fields: normalizeFields(input.fields),
  }
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? defaultLimit
  if (!Number.isInteger(limit) || limit < 1 || limit > maximumInteractiveLimit) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Art Institute of Chicago --limit must be an integer from 1 to 100.', {
      limit: value,
      note: 'Official docs did not expose a finite max; CLI caps interactive requests at 100.',
    })
  }
  return limit
}

function normalizePage(value: number | undefined): number {
  const page = value ?? 1
  if (!Number.isInteger(page) || page < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Art Institute of Chicago --page must be a positive integer.', {
      page: value,
    })
  }
  return page
}

function normalizeFields(value: string | undefined): string {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    return defaultFields
  }
  if (!/^[A-Za-z0-9_,]+$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Art Institute of Chicago --fields must be a comma-separated list of field names.', {
      fields: value,
    })
  }
  return normalized
}

function normalizeOptionalText<TName extends 'query'>(
  value: string | undefined,
  name: TName,
): { [key in TName]?: string } {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? {} : { [name]: normalized } as { [key in TName]?: string }
}

function toResult(
  query: ArtInstituteChicagoArtworksResult['query'],
  response: ArtInstituteChicagoArtworksResponse,
): ArtInstituteChicagoArtworksResult {
  return {
    kind: 'artic.artworks',
    api: {
      provider: 'art-institute-chicago',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: query.query === undefined ? 'GET /artworks' : 'GET /artworks/search',
      docsUrl: 'https://api.artic.edu/docs/',
      openApiUrl: 'https://api.artic.edu/api/v1/openapi.json',
      usesBrowserClickstream: false,
      authentication: 'none',
      rateLimit: 'No explicit rate limit found in official docs',
      documentedMaximumLimit: 'No finite maximum found; CLI caps interactive requests at 100',
      requiredHeaders: 'AIC-User-Agent',
    },
    query,
    pagination: {
      total: response.pagination.total,
      limit: response.pagination.limit,
      offset: response.pagination.offset,
      totalPages: response.pagination.totalPages,
      currentPage: response.pagination.currentPage,
      ...(response.pagination.nextUrl !== undefined ? { nextUrl: response.pagination.nextUrl } : {}),
    },
    count: response.data.length,
    license: {
      text: response.info.licenseText,
      links: response.info.licenseLinks,
      version: response.info.version,
    },
    artworks: response.data.map(artwork => toArtworkResult(artwork, response.config.iiifUrl, response.config.websiteUrl)),
  }
}

function toArtworkResult(
  artwork: ArtInstituteChicagoArtwork,
  iiifUrl: string,
  websiteUrl: string,
): ArtInstituteChicagoArtworkResult {
  const normalizedWebsiteUrl = websiteUrl.replace(/^http:/u, 'https:').replace(/\/+$/u, '')
  return {
    id: artwork.id,
    title: artwork.title,
    ...(artwork.artistDisplay !== undefined ? { artistDisplay: artwork.artistDisplay } : {}),
    ...(artwork.dateDisplay !== undefined ? { dateDisplay: artwork.dateDisplay } : {}),
    ...(artwork.imageId !== undefined ? { imageId: artwork.imageId } : {}),
    ...(artwork.imageId !== undefined ? { imageUrl: `${iiifUrl.replace(/\/+$/u, '')}/${artwork.imageId}/full/843,/0/default.jpg` } : {}),
    artworkUrl: `${normalizedWebsiteUrl}/artworks/${artwork.id}`,
    apiUrl: `https://api.artic.edu/api/v1/artworks/${artwork.id}`,
    ...(artwork.isPublicDomain !== undefined ? { isPublicDomain: artwork.isPublicDomain } : {}),
    ...(artwork.score !== undefined ? { score: artwork.score } : {}),
  }
}
