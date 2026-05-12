import {
  QUEIMADAS_INPE_10MIN_CSV_INDEX_URL,
  QUEIMADAS_INPE_DOCS_URL,
  QUEIMADAS_INPE_MAX_LIMIT,
  QueimadasInpeClient,
  normalizeQueimadasInpeLatestInput,
  type QueimadasInpeFocus,
  type QueimadasInpeLatestInput,
} from '../../infrastructure/openApis/queimadasInpeClient.js'

export type QueimadasInpeLatestResult = {
  kind: 'queimadas-inpe.latest10min'
  api: {
    providerId: 'queimadas-inpe'
    providerName: 'Queimadas INPE'
    endpoint: 'GET focos/csv/10min/{latest-file}.csv'
    documentation: typeof QUEIMADAS_INPE_DOCS_URL
    indexUrl: typeof QUEIMADAS_INPE_10MIN_CSV_INDEX_URL
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS directory index + text/csv'
    publicSafety: 'Probable wildfire/heat-focus observations are environmental monitoring data, not emergency dispatch or public-safety command data.'
    reliability: 'Near-real-time satellite detections can be delayed, duplicated, false-positive, or incomplete; verify with official emergency/environmental authorities before operational decisions.'
  }
  query: ReturnType<typeof normalizeQueimadasInpeLatestInput>
  file: { name: string; url: string }
  focuses: QueimadasInpeFocus[]
  count: { returned: number; totalRows: number; maxLimit: typeof QUEIMADAS_INPE_MAX_LIMIT }
}

export async function getQueimadasInpeLatest10Min(input: QueimadasInpeLatestInput = {}): Promise<QueimadasInpeLatestResult> {
  const query = normalizeQueimadasInpeLatestInput(input)
  const latest = await new QueimadasInpeClient().latest10Min(query)
  return {
    kind: 'queimadas-inpe.latest10min',
    api: {
      providerId: 'queimadas-inpe',
      providerName: 'Queimadas INPE',
      endpoint: 'GET focos/csv/10min/{latest-file}.csv',
      documentation: QUEIMADAS_INPE_DOCS_URL,
      indexUrl: QUEIMADAS_INPE_10MIN_CSV_INDEX_URL,
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'HTTPS directory index + text/csv',
      publicSafety: 'Probable wildfire/heat-focus observations are environmental monitoring data, not emergency dispatch or public-safety command data.',
      reliability: 'Near-real-time satellite detections can be delayed, duplicated, false-positive, or incomplete; verify with official emergency/environmental authorities before operational decisions.',
    },
    query,
    file: { name: latest.fileName, url: latest.fileUrl },
    focuses: latest.focuses,
    count: { returned: latest.focuses.length, totalRows: latest.totalRows, maxLimit: QUEIMADAS_INPE_MAX_LIMIT },
  }
}

export type { QueimadasInpeLatestInput }
