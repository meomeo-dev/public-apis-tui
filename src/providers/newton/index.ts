import { z } from 'zod'
import {
  NEWTON_DEFAULT_EXPRESSION,
  NEWTON_DEFAULT_OPERATION,
  NEWTON_MAX_EXPRESSION_LENGTH,
  NEWTON_OPERATIONS,
  computeNewton,
  normalizeNewtonComputeInput,
  type NewtonComputeInput,
} from '../../application/usecases/newton.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const computeParamsSchema = z.object({
  operation: z.string().optional(),
  expression: z.string().optional(),
}) satisfies z.ZodType<NewtonComputeInput>

const computeOperation: PublicApiOperationDefinition<NewtonComputeInput> = {
  id: 'newton.compute',
  providerId: 'newton',
  name: 'Newton math calculation',
  commandPath: ['newton', 'compute'],
  rpcMethod: 'newton.compute',
  description: 'Run a whitelisted Newton symbolic or arithmetic operation.',
  category: 'science',
  options: [
    {
      name: 'operation',
      flag: '--operation <name>',
      description: [
        `Operation, default ${NEWTON_DEFAULT_OPERATION}; one of`,
        NEWTON_OPERATIONS.join(', '),
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: 'Curates the documented Newton operation names into a whitelist.',
      valueType: 'string',
      defaultValue: NEWTON_DEFAULT_OPERATION,
    },
    {
      name: 'expression',
      flag: '--expression <math>',
      description: [
        `Math expression, max ${NEWTON_MAX_EXPRESSION_LENGTH} characters,`,
        `default ${NEWTON_DEFAULT_EXPRESSION}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to the documented expression path segment with local bounds.',
      valueType: 'string',
      defaultValue: NEWTON_DEFAULT_EXPRESSION,
    },
  ],
  paramsSchema: computeParamsSchema,
  execute: params => computeNewton(params),
  normalizeParams: params => computeParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNewtonComputeInput(params),
  resultKind: 'newton.compute',
  defaultFormat: 'text',
}

export const newtonProvider: PublicApiProviderModule = {
  manifest: {
    id: 'newton',
    name: 'Newton',
    description: [
      'No-auth HTTPS JSON symbolic and arithmetic calculator backed by the',
      'documented Newton API and a fixed operation whitelist.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://newton.vercel.app',
    docsUrl: 'https://github.com/aunyks/newton-api',
    auth: {
      mode: 'none',
      notes: [
        [
          'Live probes returned JSON calculations without API key, OAuth,',
          'account setup, cookies, or browser session requirements.',
        ].join(' '),
      ],
    },
    tags: ['science', 'math', 'calculator', 'symbolic', 'no-auth', 'json'],
    freePlanNotes: [
      'No public quota is documented; CLI output is a single bounded result.',
      [
        'The CLI exposes documented operation names only and rejects arbitrary',
        'routes or non-math expression characters before making a request.',
      ].join(' '),
    ],
  },
  operations: [computeOperation],
  endpoints: [
    {
      id: 'newton-compute',
      method: 'GET',
      urlPattern: 'regex:^https://newton\\.vercel\\.app/api/v2/[^/]+/.+$',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'Newton v2 JSON math calculation endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/aunyks/newton-api',
        'https://newton.vercel.app/api/v2/simplify/2%5E2%2B2(2)',
      ],
      consumedBy: ['public-apis apis run newton.compute'],
      notes: [
        'No authentication required in live probes.',
        [
          'CLI exposes a fixed operation whitelist and bounded expression',
          'input; arbitrary operation names, HTML pages, binary rendering,',
          'base64 payloads, and browser scraping are excluded.',
        ].join(' '),
      ],
    },
  ],
}

export type {
  NewtonComputeInput,
} from '../../application/usecases/newton.js'
