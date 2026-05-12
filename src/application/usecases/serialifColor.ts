import {
  SerialifColorClient,
  type ProjectedSerialifColorModel,
  type SerialifColorInput,
  normalizeSerialifColorInput,
  projectSerialifColorModel,
} from '../../infrastructure/openApis/serialifColorClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type SerialifColorLookupResult = {
  kind: 'serialifcolor.lookup'
  api: {
    providerId: 'serialifcolor'
    providerName: 'Serialif Color'
    endpoint: 'GET /{color}'
    documentation: 'https://color.serialif.com/'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'https-json'
    rateLimit: 'No public rate limit documented; responses are cacheable and should be persisted for repeated probes.'
    parameterPolicy: 'CLI accepts CSS color keywords and hex colors with 3, 4, 6, or 8 digits.'
  }
  query: ReturnType<typeof normalizeSerialifColorInput>
  storage: {
    mode: 'online'
    persisted: false
  }
  colors: {
    base: ProjectedSerialifColorModel
    baseWithoutAlpha?: ProjectedSerialifColorModel | undefined
    contrastedText?: ProjectedSerialifColorModel | undefined
    complementary?: ProjectedSerialifColorModel | undefined
    complementaryContrastedText?: ProjectedSerialifColorModel | undefined
    grayscale?: ProjectedSerialifColorModel | undefined
    grayscaleContrastedText?: ProjectedSerialifColorModel | undefined
  }
}

export async function lookupSerialifColor(input: SerialifColorInput = {}): Promise<SerialifColorLookupResult> {
  const query = normalizeSerialifColorInput(input)
  const response = await new SerialifColorClient().lookup(query)
  const base = projectSerialifColorModel(response.base)
  if (base === undefined) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Serialif Color response did not include a usable base color.', {
      provider: 'serialifcolor',
      endpoint: response.requestUrl,
    })
  }

  return {
    kind: 'serialifcolor.lookup',
    api: {
      providerId: 'serialifcolor',
      providerName: 'Serialif Color',
      endpoint: 'GET /{color}',
      documentation: 'https://color.serialif.com/',
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'https-json',
      rateLimit: 'No public rate limit documented; responses are cacheable and should be persisted for repeated probes.',
      parameterPolicy: 'CLI accepts CSS color keywords and hex colors with 3, 4, 6, or 8 digits.',
    },
    query,
    storage: { mode: 'online', persisted: false },
    colors: {
      base,
      ...(projectSerialifColorModel(response.base_without_alpha) !== undefined ? { baseWithoutAlpha: projectSerialifColorModel(response.base_without_alpha) } : {}),
      ...(projectSerialifColorModel(response.base_without_alpha_contrasted_text) !== undefined ? { contrastedText: projectSerialifColorModel(response.base_without_alpha_contrasted_text) } : {}),
      ...(projectSerialifColorModel(response.complementary) !== undefined ? { complementary: projectSerialifColorModel(response.complementary) } : {}),
      ...(projectSerialifColorModel(response.complementary_without_alpha_contrasted_text) !== undefined ? { complementaryContrastedText: projectSerialifColorModel(response.complementary_without_alpha_contrasted_text) } : {}),
      ...(projectSerialifColorModel(response.grayscale) !== undefined ? { grayscale: projectSerialifColorModel(response.grayscale) } : {}),
      ...(projectSerialifColorModel(response.grayscale_without_alpha_contrasted_text) !== undefined ? { grayscaleContrastedText: projectSerialifColorModel(response.grayscale_without_alpha_contrasted_text) } : {}),
    },
  }
}

export type { SerialifColorInput }
