import {
  CENSUS_GOV_MAX_DATASET_LIMIT,
  CENSUS_GOV_STATE_ROW_COUNT,
  CensusGovClient,
  normalizeCensusGovAcsProfileStatesInput,
  normalizeCensusGovDatasetsInput,
  type CensusGovAcsProfileState,
  type CensusGovAcsProfileStatesInput,
  type CensusGovDataset,
  type CensusGovDatasetsInput,
} from '../../infrastructure/openApis/censusGovClient.js'

type CensusGovApiMeta = {
  provider: 'censusgov'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  defaultLimit: number
  maxLimit: number
}

export type CensusGovDatasetsResult = {
  kind: 'censusgov.datasets'
  api: CensusGovApiMeta
  query: ReturnType<typeof normalizeCensusGovDatasetsInput>
  count: number
  pagination: {
    returned: number
    totalMatched: number
    limit: number
    maxLimit: number
  }
  datasets: CensusGovDataset[]
}

export type CensusGovAcsProfileStatesResult = {
  kind: 'censusgov.acsProfileStates'
  api: CensusGovApiMeta
  query: ReturnType<typeof normalizeCensusGovAcsProfileStatesInput>
  variables: {
    population: string
    medianHouseholdIncome: string
  }
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  states: CensusGovAcsProfileState[]
}

const commonApiMeta = {
  provider: 'censusgov',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://www.census.gov/data/developers/data-sets.html',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
} satisfies Omit<CensusGovApiMeta, 'endpoint' | 'defaultLimit' | 'maxLimit'>

export async function listCensusGovDatasets(input: CensusGovDatasetsInput = {}): Promise<CensusGovDatasetsResult> {
  const query = normalizeCensusGovDatasetsInput(input)
  const client = new CensusGovClient()
  const response = await client.listDatasets(query)
  return {
    kind: 'censusgov.datasets',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /data.json',
      defaultLimit: CENSUS_GOV_MAX_DATASET_LIMIT,
      maxLimit: CENSUS_GOV_MAX_DATASET_LIMIT,
    },
    query,
    count: response.datasets.length,
    pagination: {
      returned: response.datasets.length,
      totalMatched: response.total,
      limit: query.limit,
      maxLimit: CENSUS_GOV_MAX_DATASET_LIMIT,
    },
    datasets: response.datasets,
  }
}

export async function getCensusGovAcsProfileStates(input: CensusGovAcsProfileStatesInput = {}): Promise<CensusGovAcsProfileStatesResult> {
  const query = normalizeCensusGovAcsProfileStatesInput(input)
  const client = new CensusGovClient()
  const states = await client.getAcsProfileStates(query)
  return {
    kind: 'censusgov.acsProfileStates',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /data/{year}/acs/acs5/profile',
      defaultLimit: CENSUS_GOV_STATE_ROW_COUNT,
      maxLimit: CENSUS_GOV_STATE_ROW_COUNT,
    },
    query,
    variables: {
      population: 'DP05_0001E',
      medianHouseholdIncome: 'DP03_0062E',
    },
    count: states.length,
    pagination: {
      returned: states.length,
      limit: query.limit,
      maxLimit: CENSUS_GOV_STATE_ROW_COUNT,
    },
    states,
  }
}
