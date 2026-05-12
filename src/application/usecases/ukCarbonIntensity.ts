import {
  UkCarbonIntensityClient,
  normalizeUkCarbonCurrentInput,
  normalizeUkCarbonGenerationInput,
  type UkCarbonIntensityCurrentInput,
  type UkCarbonIntensityGenerationInput,
} from '../../infrastructure/openApis/ukCarbonIntensityClient.js'

export type UkCarbonIntensityResult = {
  kind: 'ukcarbonintensity.intensity'
  api: {
    provider: 'ukcarbonintensity'
    endpoint: 'GET /intensity'
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
  }
  query: Record<string, never>
  reading: {
    from: string
    to: string
    forecast?: number | undefined
    actual?: number | undefined
    index?: string | undefined
  }
  pagination: {
    returned: number
  }
}

export type UkCarbonGenerationResult = {
  kind: 'ukcarbonintensity.generation'
  api: {
    provider: 'ukcarbonintensity'
    endpoint: 'GET /generation'
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
  }
  query: Record<string, never>
  window: {
    from: string
    to: string
  }
  generationMix: Array<{
    fuel: string
    percentage: number
  }>
  pagination: {
    returned: number
  }
}

const docsUrl = 'https://carbon-intensity.github.io/api-definitions/'

export async function getUkCarbonIntensity(input: UkCarbonIntensityCurrentInput = {}): Promise<UkCarbonIntensityResult> {
  const query = normalizeUkCarbonCurrentInput(input)
  const client = new UkCarbonIntensityClient()
  const reading = await client.getCurrentIntensity()
  return {
    kind: 'ukcarbonintensity.intensity',
    api: {
      provider: 'ukcarbonintensity',
      endpoint: 'GET /intensity',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
    },
    query,
    reading,
    pagination: { returned: 1 },
  }
}

export async function getUkCarbonGeneration(input: UkCarbonIntensityGenerationInput = {}): Promise<UkCarbonGenerationResult> {
  const query = normalizeUkCarbonGenerationInput(input)
  const client = new UkCarbonIntensityClient()
  const generation = await client.getCurrentGenerationMix()
  return {
    kind: 'ukcarbonintensity.generation',
    api: {
      provider: 'ukcarbonintensity',
      endpoint: 'GET /generation',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
    },
    query,
    window: {
      from: generation.from,
      to: generation.to,
    },
    generationMix: generation.mix,
    pagination: { returned: generation.mix.length },
  }
}
