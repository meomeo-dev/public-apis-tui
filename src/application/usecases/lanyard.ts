import {
  LanyardClient,
  normalizeLanyardPresenceInput,
  type LanyardPresence,
  type LanyardPresenceInput,
} from '../../infrastructure/openApis/lanyardClient.js'

export type LanyardPresenceResult = {
  kind: 'lanyard.presence'
  api: {
    provider: 'lanyard'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    websocketNote: string
  }
  query: ReturnType<typeof normalizeLanyardPresenceInput>
  presence: LanyardPresence
}

export async function getLanyardPresence(input: LanyardPresenceInput = {}): Promise<LanyardPresenceResult> {
  const query = normalizeLanyardPresenceInput(input)
  const presence = await new LanyardClient().presence(query)
  return {
    kind: 'lanyard.presence',
    api: {
      provider: 'lanyard',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: `GET https://api.lanyard.rest/v1/users/${query.userId}`,
      docsUrl: 'https://github.com/Phineas/lanyard',
      usesBrowserClickstream: false,
      authentication: 'none',
      websocketNote: 'This operation uses the documented REST endpoint only; WebSocket subscriptions are intentionally excluded from this CLI loop.',
    },
    query,
    presence,
  }
}
