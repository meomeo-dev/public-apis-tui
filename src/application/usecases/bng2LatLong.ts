import {
  Bng2LatLongClient,
  BNG2LATLONG_MAX_EASTING,
  BNG2LATLONG_MAX_NORTHING,
  normalizeBng2LatLongInput,
  type Bng2LatLongConversion,
  type Bng2LatLongInput,
} from '../../infrastructure/openApis/bng2LatLongClient.js'

export type Bng2LatLongConvertResult = {
  kind: 'bng2latlong.convert'
  api: {
    providerId: 'bng2latlong'
    providerName: 'bng2latlong'
    endpoint: 'GET /bng2latlong/{easting}/{northing}/json'
    documentation: 'https://www.getthedata.com/bng2latlong'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS JSON REST'
    note: 'Homepage may return Cloudflare challenge to CLI clients; implementation consumes the documented api.getthedata.com JSON endpoint directly.'
  }
  query: ReturnType<typeof normalizeBng2LatLongInput>
  bounds: {
    coordinateSystem: 'British National Grid OSGB36 eastings/northings to WGS84 latitude/longitude'
    minCoordinate: 1
    maxEasting: typeof BNG2LATLONG_MAX_EASTING
    maxNorthing: typeof BNG2LATLONG_MAX_NORTHING
  }
  conversion: Bng2LatLongConversion
}

export async function convertBng2LatLong(input: Bng2LatLongInput = {}): Promise<Bng2LatLongConvertResult> {
  const query = normalizeBng2LatLongInput(input)
  const conversion = await new Bng2LatLongClient().convert(query)
  return {
    kind: 'bng2latlong.convert',
    api: {
      providerId: 'bng2latlong',
      providerName: 'bng2latlong',
      endpoint: 'GET /bng2latlong/{easting}/{northing}/json',
      documentation: 'https://www.getthedata.com/bng2latlong',
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'HTTPS JSON REST',
      note: 'Homepage may return Cloudflare challenge to CLI clients; implementation consumes the documented api.getthedata.com JSON endpoint directly.',
    },
    query,
    bounds: {
      coordinateSystem: 'British National Grid OSGB36 eastings/northings to WGS84 latitude/longitude',
      minCoordinate: 1,
      maxEasting: BNG2LATLONG_MAX_EASTING,
      maxNorthing: BNG2LATLONG_MAX_NORTHING,
    },
    conversion,
  }
}

export type { Bng2LatLongInput }
