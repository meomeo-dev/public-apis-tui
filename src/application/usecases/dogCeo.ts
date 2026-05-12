import {
  DogCeoClient,
  type DogCeoBreedMap,
  type DogCeoRandomImagesQuery,
} from '../../infrastructure/openApis/dogCeoClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type DogCeoBreedInput = {
  breed: string
  subBreed?: string | undefined
}

export type DogCeoImagesInput = {
  breed?: string | undefined
  subBreed?: string | undefined
  count?: number | undefined
}

export type DogCeoApiMeta = {
  provider: 'dog-ceo'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: string
  docsUrl: 'https://dog.ceo/dog-api/documentation'
  usesBrowserClickstream: false
  authentication: 'none'
}

export type DogCeoBreedsResult = {
  kind: 'dogceo.breeds'
  api: DogCeoApiMeta
  query: Record<string, never>
  totalBreeds: number
  totalSubBreeds: number
  breeds: Array<{ breed: string; subBreeds: string[] }>
}

export type DogCeoImageResult = {
  kind: 'dogceo.images'
  api: DogCeoApiMeta
  query: DogCeoRandomImagesQuery
  count: number
  imageUrls: string[]
}

export type DogCeoSubBreedsResult = {
  kind: 'dogceo.subbreeds'
  api: DogCeoApiMeta
  query: { breed: string }
  count: number
  subBreeds: string[]
}

export async function listDogCeoBreeds(): Promise<DogCeoBreedsResult> {
  const client = new DogCeoClient()
  const breedMap = await client.listBreeds()
  const breeds = toBreedRows(breedMap)
  return {
    kind: 'dogceo.breeds',
    api: createApiMeta('GET /breeds/list/all'),
    query: {},
    totalBreeds: breeds.length,
    totalSubBreeds: breeds.reduce((sum, entry) => sum + entry.subBreeds.length, 0),
    breeds,
  }
}

export async function getDogCeoRandomImage(): Promise<DogCeoImageResult> {
  return getDogCeoRandomImages({})
}

export async function getDogCeoRandomBreedImage(input: DogCeoBreedInput): Promise<DogCeoImageResult> {
  return getDogCeoRandomImages(input)
}

export async function getDogCeoRandomImages(input: DogCeoImagesInput = {}): Promise<DogCeoImageResult> {
  const query = normalizeImagesInput(input)
  const client = new DogCeoClient()
  const imageUrls = await client.getRandomImages(query)
  return {
    kind: 'dogceo.images',
    api: createApiMeta(createImagesEndpoint(query)),
    query,
    count: imageUrls.length,
    imageUrls,
  }
}

export async function listDogCeoSubBreeds(input: Pick<DogCeoBreedInput, 'breed'>): Promise<DogCeoSubBreedsResult> {
  const breed = normalizeRequiredText(input.breed, 'breed')
  const client = new DogCeoClient()
  const subBreeds = await client.listSubBreeds(breed)
  return {
    kind: 'dogceo.subbreeds',
    api: createApiMeta('GET /breed/:breed/list'),
    query: { breed },
    count: subBreeds.length,
    subBreeds,
  }
}

function createApiMeta(endpoint: string): DogCeoApiMeta {
  return {
    provider: 'dog-ceo',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://dog.ceo/dog-api/documentation',
    usesBrowserClickstream: false,
    authentication: 'none',
  }
}

function normalizeImagesInput(input: DogCeoImagesInput): DogCeoRandomImagesQuery {
  const breed = normalizeOptionalText(input.breed)
  const subBreed = normalizeOptionalText(input.subBreed)
  if (subBreed !== undefined && breed === undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Dog CEO --sub-breed requires --breed.', { subBreed })
  }

  return {
    breed,
    subBreed,
    count: normalizeCount(input.count),
  }
}

function normalizeRequiredText(value: string | undefined, label: string): string {
  const normalized = value?.trim()
  if (normalized === undefined || normalized === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Dog CEO --${label} is required.`, { [label]: value })
  }
  return normalized.toLowerCase()
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? undefined : normalized.toLowerCase()
}

function normalizeCount(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Dog CEO --count must be an integer from 1 to 50.', { count: value })
  }
  return value
}

function createImagesEndpoint(query: DogCeoRandomImagesQuery): string {
  const countSuffix = query.count === undefined ? '' : '/:count'
  if (query.breed === undefined) {
    return `GET /breeds/image/random${countSuffix}`
  }
  if (query.subBreed === undefined) {
    return `GET /breed/:breed/images/random${countSuffix}`
  }
  return `GET /breed/:breed/:subBreed/images/random${countSuffix}`
}

function toBreedRows(breedMap: DogCeoBreedMap): DogCeoBreedsResult['breeds'] {
  return Object.entries(breedMap)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([breed, subBreeds]) => ({ breed, subBreeds: [...subBreeds].sort() }))
}
