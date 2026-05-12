import { StudioGhibliClient, type StudioGhibliFilm } from '../../infrastructure/openApis/studioGhibliClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type StudioGhibliFilmsInput = {
  limit?: number | undefined
  fields?: string | undefined
  title?: string | undefined
  director?: string | undefined
  minScore?: number | undefined
  releaseYear?: string | undefined
}

export type StudioGhibliApiMeta = {
  provider: 'studio-ghibli'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /films'
  docsUrl: 'https://ghibliapi.vercel.app/'
  swaggerUrl: 'https://ghibliapi.vercel.app/swagger.yaml'
  legacyPublicApisUrl: 'https://ghibliapi.herokuapp.com'
  usesBrowserClickstream: false
  authentication: 'none'
  documentedDefaultLimit: 50
  documentedMaximumLimit: 250
}

export type StudioGhibliFilmResult = {
  id: string
  title: string
  originalTitle: string
  originalTitleRomanised: string
  description: string
  director: string
  producer: string
  releaseDate: string
  runningTimeMinutes: number
  rtScore: number
  image?: string | undefined
  movieBanner?: string | undefined
  peopleCount: number
  speciesCount: number
  locationsCount: number
  vehiclesCount: number
  url: string
}

export type StudioGhibliFilmsResult = {
  kind: 'studioghibli.films'
  api: StudioGhibliApiMeta
  query: {
    limit: number
    fields?: string | undefined
    title?: string | undefined
    director?: string | undefined
    minScore?: number | undefined
    releaseYear?: string | undefined
  }
  count: number
  films: StudioGhibliFilmResult[]
}

export async function listStudioGhibliFilms(input: StudioGhibliFilmsInput = {}): Promise<StudioGhibliFilmsResult> {
  const query = normalizeFilmsInput(input)
  const client = new StudioGhibliClient()
  const films = await client.listFilms({
    limit: query.limit,
    fields: query.fields,
  })
  const filteredFilms = films
    .map(toFilmResult)
    .filter(film => matchesText(film.title, query.title) || matchesText(film.originalTitleRomanised, query.title) || matchesText(film.originalTitle, query.title))
    .filter(film => matchesText(film.director, query.director))
    .filter(film => query.minScore === undefined || film.rtScore >= query.minScore)
    .filter(film => query.releaseYear === undefined || film.releaseDate === query.releaseYear)

  return {
    kind: 'studioghibli.films',
    api: {
      provider: 'studio-ghibli',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /films',
      docsUrl: 'https://ghibliapi.vercel.app/',
      swaggerUrl: 'https://ghibliapi.vercel.app/swagger.yaml',
      legacyPublicApisUrl: 'https://ghibliapi.herokuapp.com',
      usesBrowserClickstream: false,
      authentication: 'none',
      documentedDefaultLimit: 50,
      documentedMaximumLimit: 250,
    },
    query,
    count: filteredFilms.length,
    films: filteredFilms,
  }
}

function normalizeFilmsInput(input: StudioGhibliFilmsInput): StudioGhibliFilmsResult['query'] {
  return {
    limit: normalizeLimit(input.limit),
    ...normalizeOptionalText(input.fields, 'fields'),
    ...normalizeOptionalText(input.title, 'title'),
    ...normalizeOptionalText(input.director, 'director'),
    ...normalizeOptionalScore(input.minScore),
    ...normalizeOptionalYear(input.releaseYear),
  }
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? 250
  if (!Number.isInteger(limit) || limit < 1 || limit > 250) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Studio Ghibli --limit must be an integer from 1 to 250.', {
      limit: value,
      note: 'Swagger documents default 50 and maximum 250; the CLI default uses the documented maximum.',
    })
  }
  return limit
}

function normalizeOptionalText<TName extends 'fields' | 'title' | 'director'>(
  value: string | undefined,
  name: TName,
): { [key in TName]?: string } {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? {} : { [name]: normalized } as { [key in TName]?: string }
}

function normalizeOptionalScore(value: number | undefined): { minScore?: number | undefined } {
  if (value === undefined) {
    return {}
  }
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Studio Ghibli --min-score must be an integer from 0 to 100.', {
      minScore: value,
    })
  }
  return { minScore: value }
}

function normalizeOptionalYear(value: string | undefined): { releaseYear?: string | undefined } {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    return {}
  }
  if (!/^\d{4}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Studio Ghibli --release-year must be a four-digit year.', {
      releaseYear: value,
    })
  }
  return { releaseYear: normalized }
}

function toFilmResult(film: StudioGhibliFilm): StudioGhibliFilmResult {
  return {
    id: film.id,
    title: film.title,
    originalTitle: film.originalTitle,
    originalTitleRomanised: film.originalTitleRomanised,
    description: film.description,
    director: film.director,
    producer: film.producer,
    releaseDate: film.releaseDate,
    runningTimeMinutes: Number(film.runningTime),
    rtScore: Number(film.rtScore),
    ...(film.image !== undefined ? { image: film.image } : {}),
    ...(film.movieBanner !== undefined ? { movieBanner: film.movieBanner } : {}),
    peopleCount: countLinkedResources(film.people),
    speciesCount: countLinkedResources(film.species),
    locationsCount: countLinkedResources(film.locations),
    vehiclesCount: countLinkedResources(film.vehicles),
    url: film.url,
  }
}

function matchesText(value: string, query: string | undefined): boolean {
  return query === undefined || value.toLowerCase().includes(query.toLowerCase())
}

function countLinkedResources(values: string[]): number {
  return values.filter(value => !value.endsWith('/')).length
}
