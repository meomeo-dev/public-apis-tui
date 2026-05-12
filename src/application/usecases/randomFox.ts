import { RandomFoxClient } from '../../infrastructure/openApis/randomFoxClient.js'

export type RandomFoxApiMeta = {
  provider: 'random-fox'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /floof/'
  docsUrl: 'https://randomfox.ca/'
  usesBrowserClickstream: false
  authentication: 'none'
}

export type RandomFoxFloofResult = {
  kind: 'randomfox.floof'
  api: RandomFoxApiMeta
  query: Record<string, never>
  fox: {
    image: string
    link: string
  }
}

export async function getRandomFoxFloof(): Promise<RandomFoxFloofResult> {
  const client = new RandomFoxClient()
  const floof = await client.getFloof()
  return {
    kind: 'randomfox.floof',
    api: {
      provider: 'random-fox',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /floof/',
      docsUrl: 'https://randomfox.ca/',
      usesBrowserClickstream: false,
      authentication: 'none',
    },
    query: {},
    fox: {
      image: floof.image,
      link: floof.link,
    },
  }
}
