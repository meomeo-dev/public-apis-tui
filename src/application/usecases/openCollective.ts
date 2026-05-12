import {
  OpenCollectiveClient,
  normalizeOpenCollectiveAccountInput,
  type OpenCollectiveAccount,
  type OpenCollectiveAccountInput,
} from '../../infrastructure/openApis/openCollectiveClient.js'

export type OpenCollectiveAccountResult = {
  kind: 'opencollective.account'
  api: {
    provider: 'opencollective'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none for public GraphQL reads'
    rateLimitPolicy: string
  }
  query: ReturnType<typeof normalizeOpenCollectiveAccountInput>
  account: OpenCollectiveAccount
}

export async function getOpenCollectiveAccount(input: OpenCollectiveAccountInput = {}): Promise<OpenCollectiveAccountResult> {
  const query = normalizeOpenCollectiveAccountInput(input)
  const account = await new OpenCollectiveClient().account(query)
  return {
    kind: 'opencollective.account',
    api: {
      provider: 'opencollective',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'POST https://api.opencollective.com/graphql/v2',
      docsUrl: 'https://docs.opencollective.com/help/contributing/development/api',
      usesBrowserClickstream: false,
      authentication: 'none for public GraphQL reads',
      rateLimitPolicy: 'No public no-auth quota was found in docs; live probes can return rate-limit errors and suggest Personal Tokens for higher limits.',
    },
    query,
    account,
  }
}
