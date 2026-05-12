import {
  HELLO_SALUT_DEFAULT_LANGUAGE,
  HelloSalutClient,
  normalizeHelloSalutInput,
  type HelloSalutInput,
  type HelloSalutTranslation,
} from '../../infrastructure/openApis/helloSalutClient.js'

type HelloSalutApiMeta = {
  providerId: 'hellosalut'
  providerName: 'HelloSalut'
  endpoint: 'GET /?lang={language}'
  documentation: 'https://stefanbohacek.com/project/hellosalut-api/'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  rateLimitPolicy: 'No official numeric limit found; use persistence for repeated language lookups.'
  fallbackBehavior: 'Unknown or unsupported language codes return code "none" and English "Hello".'
}

const api = {
  providerId: 'hellosalut',
  providerName: 'HelloSalut',
  endpoint: 'GET /?lang={language}',
  documentation: 'https://stefanbohacek.com/project/hellosalut-api/',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  rateLimitPolicy: 'No official numeric limit found; use persistence for repeated language lookups.',
  fallbackBehavior: 'Unknown or unsupported language codes return code "none" and English "Hello".',
} satisfies HelloSalutApiMeta

export type HelloSalutResult = {
  kind: 'hellosalut.translate'
  api: HelloSalutApiMeta
  query: ReturnType<typeof normalizeHelloSalutInput>
  translation: HelloSalutTranslation
}

export async function translateHelloSalut(input: HelloSalutInput = {}): Promise<HelloSalutResult> {
  const query = normalizeHelloSalutInput(input)
  const translation = await new HelloSalutClient().translate(query)
  return {
    kind: 'hellosalut.translate',
    api,
    query,
    translation,
  }
}

export { HELLO_SALUT_DEFAULT_LANGUAGE }
export type { HelloSalutInput }
