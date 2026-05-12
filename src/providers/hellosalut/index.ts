import { z } from 'zod'
import { HELLO_SALUT_DEFAULT_LANGUAGE, translateHelloSalut, type HelloSalutInput } from '../../application/usecases/helloSalut.js'
import { normalizeHelloSalutInput } from '../../infrastructure/openApis/helloSalutClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const translateParamsSchema = z.object({
  language: z.string().optional(),
}) satisfies z.ZodType<HelloSalutInput>

const translateOperation: PublicApiOperationDefinition<HelloSalutInput> = {
  id: 'hellosalut.translate',
  providerId: 'hellosalut',
  name: 'Hello translation',
  commandPath: ['hellosalut', 'translate'],
  rpcMethod: 'hellosalut.translate',
  description: 'Translate “hello” for a requested language code using the no-auth HelloSalut JSON API.',
  category: 'geocoding',
  options: [
    {
      name: 'language',
      flag: '--language <code>',
      description: `Language code, default ${HELLO_SALUT_DEFAULT_LANGUAGE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The upstream API accepts a language code and returns a small JSON translation payload.',
      defaultValue: HELLO_SALUT_DEFAULT_LANGUAGE,
    },
  ],
  paramsSchema: translateParamsSchema,
  execute: params => translateHelloSalut(params),
  normalizeParams: params => translateParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHelloSalutInput(params),
  resultKind: 'hellosalut.translate',
  defaultFormat: 'text',
}

export const helloSalutProvider: PublicApiProviderModule = {
  manifest: {
    id: 'hellosalut',
    name: 'HelloSalut',
    description: 'No-auth HTTPS JSON API that returns a localized “hello” greeting for a language code.',
    publicApisCategory: 'Geocoding',
    homepageUrl: 'https://stefanbohacek.com/project/hellosalut-api/',
    docsUrl: 'https://stefanbohacek.com/project/hellosalut-api/',
    auth: {
      mode: 'none',
      notes: ['Implemented endpoint returns JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['geocoding', 'language', 'translation', 'hello', 'json', 'no-auth'],
    freePlanNotes: [
      'The original fourtonfish.com URL redirects to stefanbohacek.com and then to hellosalut.stefanbohacek.com for the JSON endpoint.',
      'Unsupported language codes return code "none" and English "Hello"; the CLI surfaces this as a fallback rather than an error.',
      'No rate-limit number is documented; use --persist and --offline for repeated lookups.',
      'The documented ip, cc, and auto-detection modes are intentionally not exposed to avoid implicit current-client geolocation.',
    ],
  },
  operations: [translateOperation],
  endpoints: [
    {
      id: 'hellosalut-translate',
      method: 'GET',
      urlPattern: 'https://hellosalut.stefanbohacek.com/?lang={language}',
      category: 'public-apis:geocoding',
      evidenceStatus: 'confirmed',
      description: 'HelloSalut JSON endpoint returning a localized greeting for a language code.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: [
        'https://fourtonfish.com/project/hellosalut-api/',
        'https://stefanbohacek.com/project/hellosalut-api/',
        'https://hellosalut.stefanbohacek.com/?lang=fr',
        'https://hellosalut.stefanbohacek.com/?lang=en',
      ],
      consumedBy: ['public-apis apis run hellosalut.translate'],
      notes: ['No authentication required.', 'CORS header observed as access-control-allow-origin: *.', 'Invalid language probes return JSON fallback instead of HTTP errors.'],
    },
  ],
}

export type { HelloSalutInput } from '../../application/usecases/helloSalut.js'
