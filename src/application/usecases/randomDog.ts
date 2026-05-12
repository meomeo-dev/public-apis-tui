import { RandomDogClient } from '../../infrastructure/openApis/randomDogClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type RandomDogFilesInput = {
  limit?: number | undefined
  mediaType?: string | undefined
}

export type RandomDogApiMeta = {
  provider: 'random-dog'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /woof.json' | 'GET /doggos'
  docsUrl: 'https://random.dog/'
  usesBrowserClickstream: false
  authentication: 'none'
}

export type RandomDogWoofResult = {
  kind: 'randomdog.woof'
  api: RandomDogApiMeta
  query: Record<string, never>
  file: {
    url: string
    fileSizeBytes: number
    extension: string
    mediaType: string
  }
}

export type RandomDogFilesResult = {
  kind: 'randomdog.files'
  api: RandomDogApiMeta
  query: {
    limit: number
    mediaType?: string | undefined
  }
  totalKnownFiles: number
  count: number
  files: Array<{
    name: string
    url: string
    extension: string
    mediaType: string
  }>
}

export async function getRandomDogWoof(): Promise<RandomDogWoofResult> {
  const client = new RandomDogClient()
  const woof = await client.getRandomWoof()
  return {
    kind: 'randomdog.woof',
    api: createApiMeta('GET /woof.json'),
    query: {},
    file: {
      url: woof.url,
      fileSizeBytes: woof.fileSizeBytes,
      extension: readExtension(woof.url),
      mediaType: inferMediaType(woof.url),
    },
  }
}

export async function listRandomDogFiles(input: RandomDogFilesInput = {}): Promise<RandomDogFilesResult> {
  const query = normalizeFilesInput(input)
  const client = new RandomDogClient()
  const names = await client.listFiles()
  const files = names
    .map(name => ({
      name,
      url: `https://random.dog/${name}`,
      extension: readExtension(name),
      mediaType: inferMediaType(name),
    }))
    .filter(file => query.mediaType === undefined || file.mediaType === query.mediaType)
    .slice(0, query.limit)

  return {
    kind: 'randomdog.files',
    api: createApiMeta('GET /doggos'),
    query,
    totalKnownFiles: names.length,
    count: files.length,
    files,
  }
}

function createApiMeta(endpoint: RandomDogApiMeta['endpoint']): RandomDogApiMeta {
  return {
    provider: 'random-dog',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://random.dog/',
    usesBrowserClickstream: false,
    authentication: 'none',
  }
}

function normalizeFilesInput(input: RandomDogFilesInput): RandomDogFilesResult['query'] {
  return {
    limit: normalizeLimit(input.limit),
    mediaType: normalizeMediaType(input.mediaType),
  }
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? 20
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'RandomDog --limit must be an integer from 1 to 200.', { limit: value })
  }
  return limit
}

function normalizeMediaType(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase()
  if (normalized === undefined || normalized === '') {
    return undefined
  }
  if (!['image', 'video'].includes(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'RandomDog --media-type must be image or video.', {
      mediaType: value,
      supported: ['image', 'video'],
    })
  }
  return normalized
}

function readExtension(value: string): string {
  const pathname = value.includes('://') ? new URL(value).pathname : value
  const dotIndex = pathname.lastIndexOf('.')
  return dotIndex === -1 ? '' : pathname.slice(dotIndex + 1).toLowerCase()
}

function inferMediaType(value: string): string {
  const extension = readExtension(value)
  if (['mp4', 'webm', 'mov'].includes(extension)) {
    return 'video'
  }
  return 'image'
}
