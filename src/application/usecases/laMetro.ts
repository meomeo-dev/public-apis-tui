import {
  LA_METRO_MAX_LIMIT,
  LaMetroClient,
  normalizeLaMetroRoutesInput,
  normalizeLaMetroStopsInput,
  type LaMetroRouteOverview,
  type LaMetroRouteStop,
  type LaMetroRoutesInput,
  type LaMetroStopsInput,
} from '../../infrastructure/openApis/laMetroClient.js'

const commonApiMeta = {
  provider: 'lametro' as const,
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://api.metro.net/',
  usesBrowserClickstream: false as const,
  authentication: 'none' as const,
  rateLimitPolicy: 'No public quota found in OpenAPI page; use --persist then --offline for repeat queries.',
}

export type LaMetroRoutesResult = {
  kind: 'lametro.routes'
  api: typeof commonApiMeta & { endpoint: string; limitPolicy: string }
  query: ReturnType<typeof normalizeLaMetroRoutesInput>
  count: number
  routes: LaMetroRouteOverview[]
}

export type LaMetroStopsResult = {
  kind: 'lametro.stops'
  api: typeof commonApiMeta & { endpoint: string; limitPolicy: string }
  query: ReturnType<typeof normalizeLaMetroStopsInput>
  count: number
  stops: LaMetroRouteStop[]
}

export async function listLaMetroRoutes(input: LaMetroRoutesInput = {}): Promise<LaMetroRoutesResult> {
  const query = normalizeLaMetroRoutesInput(input)
  const routes = await new LaMetroClient().routeOverview(query)
  return {
    kind: 'lametro.routes',
    api: {
      ...commonApiMeta,
      endpoint: `GET https://api.metro.net/${query.agency}/route_overview`,
      limitPolicy: `Endpoint returns all route overview rows; CLI caps --limit at ${LA_METRO_MAX_LIMIT} for readable terminal output.`,
    },
    query,
    count: routes.length,
    routes,
  }
}

export async function listLaMetroStops(input: LaMetroStopsInput = {}): Promise<LaMetroStopsResult> {
  const query = normalizeLaMetroStopsInput(input)
  const stops = await new LaMetroClient().routeStops(query)
  return {
    kind: 'lametro.stops',
    api: {
      ...commonApiMeta,
      endpoint: `GET https://api.metro.net/${query.agency}/route_stops/${query.routeCode}`,
      limitPolicy: `Endpoint returns scheduled stops for the selected route/day type; CLI caps --limit at ${LA_METRO_MAX_LIMIT} for readable terminal output.`,
    },
    query,
    count: stops.length,
    stops,
  }
}
