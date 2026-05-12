import {
  OPENSKY_MAX_LIMIT,
  OpenSkyClient,
  normalizeOpenSkyStatesInput,
  type OpenSkyStateVector,
  type OpenSkyStatesInput,
} from '../../infrastructure/openApis/openSkyClient.js'

export type OpenSkyStatesResult = {
  kind: 'opensky.states'
  api: {
    provider: 'opensky'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    anonymousCreditPolicy: string
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeOpenSkyStatesInput>
  snapshotTime: number
  count: number
  aircraft: OpenSkyStateVector[]
  rateLimit: {
    remaining?: string | undefined
  }
}

export async function listOpenSkyStates(input: OpenSkyStatesInput = {}): Promise<OpenSkyStatesResult> {
  const query = normalizeOpenSkyStatesInput(input)
  const response = await new OpenSkyClient().states(query)
  return {
    kind: 'opensky.states',
    api: {
      provider: 'opensky',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET https://opensky-network.org/api/states/all',
      docsUrl: 'https://openskynetwork.github.io/opensky-api/rest.html',
      usesBrowserClickstream: false,
      authentication: 'none',
      anonymousCreditPolicy: 'Official docs describe anonymous requests with 400 daily credits; default bbox keeps requests low-cost.',
      limitPolicy: `Endpoint returns all state vectors for the bbox; CLI caps --limit at ${OPENSKY_MAX_LIMIT} for readable terminal output.`,
    },
    query,
    snapshotTime: response.time,
    count: response.states.length,
    aircraft: response.states,
    rateLimit: response.rateLimit,
  }
}
