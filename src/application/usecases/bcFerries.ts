import {
  BC_FERRIES_MAX_LIMIT,
  BcFerriesClient,
  normalizeBcFerriesRoutesInput,
  type BcFerriesRoute,
  type BcFerriesRoutesInput,
} from '../../infrastructure/openApis/bcFerriesClient.js'

export type BcFerriesRoutesResult = {
  kind: 'bcferries.routes'
  api: {
    provider: 'bcferries'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeBcFerriesRoutesInput>
  count: number
  routes: BcFerriesRoute[]
}

export async function listBcFerriesRoutes(input: BcFerriesRoutesInput = {}): Promise<BcFerriesRoutesResult> {
  const query = normalizeBcFerriesRoutesInput(input)
  const routes = await new BcFerriesClient().routes(query)
  return {
    kind: 'bcferries.routes',
    api: {
      provider: 'bcferries',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: `GET https://bcferriesapi.ca/v2/${query.type}/`,
      docsUrl: 'https://www.bcferriesapi.ca',
      usesBrowserClickstream: false,
      authentication: 'none',
      limitPolicy: `Endpoint returns all routes for the selected type; CLI caps --limit at ${BC_FERRIES_MAX_LIMIT} for readable terminal output.`,
    },
    query,
    count: routes.length,
    routes,
  }
}
