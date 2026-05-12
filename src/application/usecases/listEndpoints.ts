import type { EndpointCatalog, EndpointCatalogRecord } from '../../infrastructure/network/endpointCatalog.js'
import { listEndpointCatalog } from '../../infrastructure/network/endpointCatalog.js'

export type ListEndpointsResult = {
  endpoints: EndpointCatalogRecord[]
}

export function listEndpoints(catalog: EndpointCatalog): ListEndpointsResult {
  return { endpoints: listEndpointCatalog(catalog) }
}
