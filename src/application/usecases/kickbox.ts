import {
  KICKBOX_DEFAULT_TARGET,
  KickboxClient,
  normalizeKickboxDisposableInput,
  type KickboxDisposableInput,
} from '../../infrastructure/openApis/kickboxClient.js'

export type KickboxDisposableResult = {
  kind: 'kickbox.disposable'
  api: {
    provider: 'kickbox-open'
    endpoint: 'GET /v1/disposable/{emailOrDomain}'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://open.kickbox.com/'
    homepage: 'https://open.kickbox.com/'
    transport: 'HTTPS JSON'
    defaultTarget: string
    scope: 'Disposable email/domain detection only; Kickbox full email verification is a separate account/API-key product.'
    publicApisProject: 'https://github.com/public-apis/public-apis'
  }
  query: {
    target: string
  }
  result: {
    target: string
    disposable: boolean
  }
}

export async function checkKickboxDisposable(input: KickboxDisposableInput = {}): Promise<KickboxDisposableResult> {
  const query = normalizeKickboxDisposableInput(input)
  const client = new KickboxClient()
  const result = await client.checkDisposable(query)
  return {
    kind: 'kickbox.disposable',
    api: {
      provider: 'kickbox-open',
      endpoint: 'GET /v1/disposable/{emailOrDomain}',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://open.kickbox.com/',
      homepage: 'https://open.kickbox.com/',
      transport: 'HTTPS JSON',
      defaultTarget: KICKBOX_DEFAULT_TARGET,
      scope: 'Disposable email/domain detection only; Kickbox full email verification is a separate account/API-key product.',
      publicApisProject: 'https://github.com/public-apis/public-apis',
    },
    query,
    result: {
      target: query.target,
      disposable: result.disposable,
    },
  }
}
