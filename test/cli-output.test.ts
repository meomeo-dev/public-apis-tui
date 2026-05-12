import assert from 'node:assert/strict'
import test from 'node:test'
import { describeSystem } from '../src/application/usecases/describeSystem.js'
import { listEndpoints } from '../src/application/usecases/listEndpoints.js'
import type { PublicApiCacheListResult } from '../src/application/usecases/publicApiCache.js'
import { describePublicApiProvider, listPublicApis } from '../src/application/usecases/publicApis.js'
import { showPublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'
import { defaultEndpointCatalog } from '../src/infrastructure/network/endpointCatalog.js'
import { createSiteRegistry } from '../src/infrastructure/site/siteRegistry.js'
import { printError, printResult } from '../src/interfaces/cli/output.js'
import { defaultPublicApiRegistry } from '../src/providers/providerRegistry.js'

test('text output renders public API discovery without fallback JSON', () => {
  const output = captureStdout(() => printResult(listPublicApis(), 'text'))

  assert.match(output, /Public APIs/)
  assert.match(output, /admindivisions/)
  assert.match(output, /cataas/)
  assert.match(output, /catfact/)
  assert.match(output, /mediastack/)
  assert.match(output, /httpdog/)
  assert.match(output, /meowfacts/)
  assert.match(output, /networkcalc/)
  assert.match(output, /minorplanetcenter/)
  assert.match(output, /nasa/)
  assert.match(output, /serialifcolor/)
  assert.match(output, /slf/)
  assert.match(output, /viacep/)
  assert.match(output, /zippopotam-us/)
  assert.match(output, /ziptastic/)
  assert.match(output, /randomdog/)
  assert.match(output, /randomfox/)
  assert.match(output, /admindivisions country/)
  assert.match(output, /mediastack news/)
  assert.match(output, /networkcalc subnet/)
  assert.match(output, /networkcalc binary/)
  assert.match(output, /minorplanetcenter search/)
  assert.match(output, /nasa search/)
  assert.match(output, /nasa asset/)
  assert.match(output, /serialifcolor lookup/)
  assert.match(output, /slf lookup/)
  assert.match(output, /viacep lookup/)
  assert.match(output, /viacep search/)
  assert.match(output, /zippopotam-us lookup/)
  assert.match(output, /zippopotam-us search/)
  assert.match(output, /ziptastic lookup/)
  assert.doesNotMatch(output, /^\\{/)
})

test('text output renders 4chan boards and catalog without fallback JSON', () => {
  const boardsOutput = captureStdout(() =>
    printResult({
      kind: '4chan.boards',
      api: { provider: '4chan', endpoint: 'GET https://a.4cdn.org/boards.json', authentication: 'none', usesBrowserClickstream: false, contentSafety: 'untrusted user-generated content rendered as plain text' },
      storage: { mode: 'online', persisted: false },
      query: { query: 'technology', limit: 3 },
      count: 1,
      totalBoards: 1,
      boards: [{ board: 'g', title: 'Technology', pages: 10, perPage: 15, metaDescription: 'Technology discussion board.' }],
    }, 'text'),
  )
  assert.match(boardsOutput, /4chan Boards/)
  assert.match(boardsOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(boardsOutput, /untrusted user-generated content/)
  assert.match(boardsOutput, /Technology/)
  assert.match(boardsOutput, /open board public-apis apis run 4chan\.catalog -- --board g --limit 20/)
  assert.match(boardsOutput, /again public-apis apis run 4chan\.boards --online --persist -- --query technology --limit 3/)
  assert.match(boardsOutput, /replay public-apis apis run 4chan\.boards --offline -- --query technology --limit 3/)
  assert.doesNotMatch(boardsOutput, /^\\{/)

  const catalogOutput = captureStdout(() =>
    printResult({
      kind: '4chan.catalog',
      api: { provider: '4chan', endpoint: 'GET https://a.4cdn.org/g/catalog.json', authentication: 'none', usesBrowserClickstream: false, contentSafety: 'untrusted user-generated content rendered as plain text' },
      storage: { mode: 'online', persisted: true },
      query: { board: 'g', limit: 3 },
      pagination: { returned: 1, totalThreads: 1, pageCount: 1, limit: 3, maxLimit: 150 },
      threads: [{ no: 123, subject: 'Daily Programming Thread', comment: 'Hello world', now: '05/04/26(Mon)10:00:00', replies: 42, images: 7, sticky: true, url: 'https://boards.4chan.org/g/thread/123' }],
    }, 'text'),
  )
  assert.match(catalogOutput, /4chan Catalog/)
  assert.match(catalogOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(catalogOutput, /Daily Programming Thread/)
  assert.match(catalogOutput, /https:\/\/boards\.4chan\.org\/g\/thread\/123/)
  assert.match(catalogOutput, /again public-apis apis run 4chan\.catalog --online --persist -- --board g --limit 3/)
  assert.match(catalogOutput, /replay public-apis apis run 4chan\.catalog --offline -- --board g --limit 3/)
  assert.match(catalogOutput, /boards public-apis apis run 4chan\.boards --online --persist -- --limit 20/)
  assert.doesNotMatch(catalogOutput, /^\\{/)
})

test('text output renders Administrative Divisions country without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'admindivisions.country',
      api: {
        providerId: 'admindivisions',
        endpoint: 'GET /api/{country}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        dataSource: 'GitHub-hosted administrative-divisions-db JSON files',
        rateLimit: 'GitHub raw/cache limits may apply.',
      },
      query: { country: 'KE', limit: 3 },
      storage: { mode: 'online', persisted: true },
      country: { code: 'KE' },
      pagination: { returned: 3, total: 47, limit: 3, maxLimit: 500 },
      divisions: ['Nairobi Area', 'Mombasa', 'Kiambu'],
    }, 'text'),
  )
  assert.match(output, /Administrative Divisions/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /KE · 3 shown \/ 47 total/)
  assert.match(output, /Nairobi Area/)
  assert.match(output, /again public-apis apis run admindivisions\.country --online --persist -- --country KE --limit 3/)
  assert.match(output, /replay public-apis apis run admindivisions\.country --offline -- --country KE --limit 3/)
  assert.doesNotMatch(output, /^\\{/)
})

test('text output renders adresse.data.gouv.fr search and reverse without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'adresse.search',
      api: {
        providerId: 'adresse',
        endpoint: 'GET /geocodage/search',
        authentication: 'none',
        usesBrowserClickstream: false,
        privacy: 'Address queries may reveal locations; persistence is opt-in.',
        migration: 'Legacy api-adresse.data.gouv.fr host is deprecated; data.geopf.fr/geocodage is used.',
      },
      query: { query: '8 bd du port', limit: 3 },
      storage: { mode: 'online', persisted: true },
      pagination: { returned: 1, limit: 3, maxLimit: 50 },
      rateLimit: { documented: '1 request/second observed; 50 result maximum' },
      results: [
        {
          label: '8 Boulevard du Port 95000 Cergy',
          type: 'housenumber',
          score: 0.492,
          city: 'Cergy',
          postcode: '95000',
          context: "95, Val-d'Oise, Île-de-France",
          coordinates: { latitude: 49.031624, longitude: 2.062821 },
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /adresse\.data\.gouv\.fr Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.match(searchOutput, /8 Boulevard du Port 95000 Cergy/)
  assert.match(searchOutput, /again public-apis apis run adresse\.search --online --persist -- --query '8 bd du port' --limit 3/)
  assert.match(searchOutput, /replay public-apis apis run adresse\.search --offline -- --query '8 bd du port' --limit 3/)
  assert.match(searchOutput, /reverse public-apis apis run adresse\.reverse --online --persist -- --latitude 49\.031624 --longitude 2\.062821 --limit 5/)
  assert.doesNotMatch(searchOutput, /^\\{/)

  const emptySearchOutput = captureStdout(() =>
    printResult({
      kind: 'adresse.search',
      api: { providerId: 'adresse', endpoint: 'GET /geocodage/search', authentication: 'none', usesBrowserClickstream: false },
      query: { query: 'zzzzzzzzzzzzzzzzzzzz', limit: 3 },
      storage: { mode: 'online', persisted: false },
      pagination: { returned: 0, limit: 3, maxLimit: 50 },
      results: [],
    }, 'text'),
  )
  assert.match(emptySearchOutput, /No French address candidates returned/)
  assert.match(emptySearchOutput, /again public-apis apis run adresse\.search --online --persist -- --query zzzzzzzzzzzzzzzzzzzz --limit 3/)
  assert.match(emptySearchOutput, /replay public-apis apis run adresse\.search --offline -- --query zzzzzzzzzzzzzzzzzzzz --limit 3/)
  assert.match(emptySearchOutput, /broaden public-apis apis run adresse\.search --online --persist -- --query '8 bd du port' --limit 10/)

  const emptyReverseOutput = captureStdout(() =>
    printResult({
      kind: 'adresse.reverse',
      api: { providerId: 'adresse', endpoint: 'GET /geocodage/reverse', authentication: 'none', usesBrowserClickstream: false },
      query: { latitude: 0, longitude: 0, limit: 3 },
      storage: { mode: 'online', persisted: false },
      pagination: { returned: 0, limit: 3, maxLimit: 50 },
      results: [],
    }, 'text'),
  )
  assert.match(emptyReverseOutput, /No French reverse-geocoding candidates returned/)
  assert.match(emptyReverseOutput, /again public-apis apis run adresse\.reverse --online --persist -- --latitude 0 --longitude 0 --limit 3/)
  assert.match(emptyReverseOutput, /replay public-apis apis run adresse\.reverse --offline -- --latitude 0 --longitude 0 --limit 3/)
  assert.match(emptyReverseOutput, /try public-apis apis run adresse\.reverse --online --persist -- --latitude 48\.357 --longitude 2\.37 --limit 10/)
})

test('text output renders Lanyard presence without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'lanyard.presence',
      api: { provider: 'lanyard', endpoint: 'GET https://api.lanyard.rest/v1/users/94490510688792576', authentication: 'none', usesBrowserClickstream: false, websocketNote: 'REST snapshot only' },
      storage: { mode: 'online', persisted: false },
      query: { userId: '94490510688792576' },
      presence: {
        discordUser: { id: '94490510688792576', username: 'phin', displayName: 'Phineas' },
        discordStatus: 'dnd',
        activeOn: { web: false, desktop: true, mobile: false, embedded: false, vr: false },
        activities: [{ name: 'Visual Studio Code', type: 0, details: 'public-apis-tui', state: 'Editing TypeScript' }],
        listeningToSpotify: false,
        kv: { location: 'Tokyo' },
      },
    }, 'text'),
  )
  assert.match(output, /Lanyard Discord Presence/)
  assert.match(output, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(output, /Phineas/)
  assert.match(output, /Visual Studio Code/)
  assert.match(output, /again public-apis apis run lanyard\.presence --online --persist -- --user-id 94490510688792576/)
  assert.match(output, /replay public-apis apis run lanyard\.presence --offline -- --user-id 94490510688792576/)
  assert.doesNotMatch(output, /^\\{/)
})

test('text output renders BC Ferries routes without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'bcferries.routes',
      api: { provider: 'bcferries', endpoint: 'GET https://bcferriesapi.ca/v2/capacity', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { type: 'capacity', routeCode: 'HSBNAN', limit: 1 },
      count: 1,
      routes: [{ routeCode: 'HSBNAN', fromTerminalCode: 'HSB', toTerminalCode: 'NAN', sailingDuration: '1:40', sailings: [{ time: '6:15 am', arrivalTime: '7:55 am', sailingStatus: 'current', fill: 12, carFill: 10, vesselName: 'Queen of Oak Bay' }] }],
    }, 'text'),
  )
  assert.match(output, /BC Ferries Routes/)
  assert.match(output, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(output, /HSBNAN/)
  assert.match(output, /Queen of Oak Bay/)
  assert.match(output, /route public-apis apis run bcferries\.routes -- --type capacity --route-code HSBNAN --limit 1/)
  assert.match(output, /again public-apis apis run bcferries\.routes --online --persist -- --type capacity --route-code HSBNAN --limit 1/)
  assert.match(output, /replay public-apis apis run bcferries\.routes --offline -- --type capacity --route-code HSBNAN --limit 1/)
  assert.doesNotMatch(output, /^\\{/)
})

test('text output renders INSPIRE HEP search and record without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'inspirehep.search',
      api: {
        provider: 'inspirehep',
        endpoint: 'GET /api/literature',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        rateLimitPolicy: '15 requests per 5 seconds per IP.',
        terms: 'Most metadata is CC0; bulk email collection is forbidden.',
        boundary: 'Literature metadata only; bibliography POST excluded.',
      },
      storage: { mode: 'online', persisted: true },
      query: { q: 'higgs', sort: 'mostcited', size: 2, page: 1 },
      pagination: { total: 10, returned: 1, size: 2, page: 1, nextPage: 2 },
      rateLimit: { limit: '15', remaining: '14' },
      papers: [
        {
          recid: 4328,
          title: 'Partial Symmetries of Weak Interactions',
          authors: ['Glashow, S.L.'],
          publication: 'Nucl.Phys. 22 · 579-588 · 1961',
          citationCount: 10459,
          arxivIds: ['hep-ph/0000001'],
          dois: ['10.1016/0029-5582(61)90469-2'],
          inspireCategories: ['Phenomenology-HEP'],
          texkeys: ['Glashow:1961tr'],
          abstract: 'Weak and electromagnetic interactions are examined.',
          links: { record: 'https://inspirehep.net/literature/4328' },
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /INSPIRE HEP Literature Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.match(searchOutput, /Partial Symmetries of Weak Interactions/)
  assert.match(searchOutput, /open first public-apis apis run inspirehep\.record/)
  assert.match(searchOutput, /--recid 4328/)
  assert.match(searchOutput, /more public-apis apis run inspirehep\.search/)
  assert.match(searchOutput, /--query higgs --sort mostcited --limit 2 --page 2/)
  assert.doesNotMatch(searchOutput, /^\\{/)

  const recordOutput = captureStdout(() =>
    printResult({
      kind: 'inspirehep.record',
      api: {
        provider: 'inspirehep',
        endpoint: 'GET /api/literature/{recid}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        rateLimitPolicy: '15 requests per 5 seconds per IP.',
      },
      storage: { mode: 'offline', persisted: true },
      query: { recid: 4328, abstractLength: 500 },
      rateLimit: {},
      paper: {
        recid: 4328,
        title: 'Partial Symmetries of Weak Interactions',
        authors: ['Glashow, S.L.'],
        publication: 'Nucl.Phys. 22 · 579-588 · 1961',
        citationCount: 10459,
        arxivIds: [],
        dois: ['10.1016/0029-5582(61)90469-2'],
        inspireCategories: ['Phenomenology-HEP'],
        texkeys: ['Glashow:1961tr'],
        abstract: 'Weak and electromagnetic interactions are examined.',
        links: {
          record: 'https://inspirehep.net/literature/4328',
          citations: 'https://inspirehep.net/api/literature/?q=refersto:recid:4328',
        },
      },
    }, 'text'),
  )
  assert.match(recordOutput, /INSPIRE HEP Literature Record/)
  assert.match(recordOutput, /offline/)
  assert.match(recordOutput, /Partial Symmetries of Weak Interactions/)
  assert.match(recordOutput, /again public-apis apis run inspirehep\.record/)
  assert.match(recordOutput, /--recid 4328 --abstract-length 500/)
  assert.match(recordOutput, /replay public-apis apis run inspirehep\.record/)
  assert.match(recordOutput, /related search public-apis apis run inspirehep\.search/)
  assert.match(recordOutput, /--query 'Partial Symmetries of Weak Interactions'/)
  assert.doesNotMatch(recordOutput, /^\\{/)
})

test('text output renders isEven check without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'iseven.check',
      api: {
        provider: 'iseven',
        endpoint: 'GET /iseven/{number}/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        freeRange: { min: 0, max: 999999 },
        tierPolicy: 'Public free tier is documented for numbers 0 through 999999.',
        adPolicy: 'Free responses include provider-supplied ad text.',
      },
      storage: { mode: 'online', persisted: true },
      query: { number: 6 },
      result: { number: 6, isEven: true, parity: 'even' },
      upstream: { ad: 'Buy isEvenCoin, the hottest new cryptocurrency!' },
    }, 'text'),
  )

  assert.match(output, /isEven Parity Check/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /free range 0-999999/)
  assert.match(output, /6 is even/)
  assert.match(output, /provider ad Buy isEvenCoin/)
  assert.match(output, /again public-apis apis run iseven\.check/)
  assert.match(output, /--number 6/)
  assert.match(output, /replay public-apis apis run iseven\.check --offline/)
  assert.match(output, /nearby public-apis apis run iseven\.check/)
  assert.doesNotMatch(output, /^\\{/)
})

test('text output renders Newton compute without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'newton.compute',
      api: {
        provider: 'newton',
        endpoint: 'GET /api/v2/{operation}/{expression}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        engine: '@metadelta/core through the documented Newton API',
        supportedOperations: ['simplify', 'factor', 'derive', 'zeroes'],
        expressionPolicy: 'Expressions are bounded math path parameters.',
        boundary: 'Fixed documented math operations only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { operation: 'zeroes', expression: 'x^2+2x' },
      calculation: {
        operation: 'zeroes',
        expression: 'x^2+2x',
        result: [-2, 0],
        resultText: '-2, 0',
      },
    }, 'text'),
  )

  assert.match(output, /Newton Math Calculation/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /Fixed documented math operations/)
  assert.match(output, /x\^2\+2x/)
  assert.match(output, /-2, 0/)
  assert.match(output, /again public-apis apis run newton\.compute/)
  assert.match(output, /--operation zeroes/)
  assert.match(output, /replay public-apis apis run newton\.compute --offline/)
  assert.doesNotMatch(output, /^\\{/)
})

test('text output renders Noctua stats and source without fallback JSON', () => {
  const statsOutput = captureStdout(() =>
    printResult({
      kind: 'noctua.stats',
      api: {
        provider: 'noctua',
        endpoint: 'GET /skysources/stats/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only skysources endpoints only.',
      },
      storage: { mode: 'online', persisted: true },
      stats: {
        total: 5851320,
        byTypes: [
          { type: 'dso', count: 3238401 },
          { type: 'star', count: 2167661 },
        ],
      },
    }, 'text'),
  )
  assert.match(statsOutput, /Noctua Skysource Stats/)
  assert.match(statsOutput, /open REST API only · no auth/)
  assert.match(statsOutput, /no Chrome clickstream/)
  assert.match(statsOutput, /5,851,320 sky source/)
  assert.match(statsOutput, /dso: 3,238,401/)
  assert.match(statsOutput, /source public-apis apis run noctua\.source/)
  assert.doesNotMatch(statsOutput, /^\\{/)

  const sourceOutput = captureStdout(() =>
    printResult({
      kind: 'noctua.source',
      api: {
        provider: 'noctua',
        endpoint: 'GET /skysources/name/{str}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only skysources endpoints only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { name: 'Mars' },
      source: {
        shortName: 'Mars',
        match: 'NAME Mars',
        model: 'jpl_sso',
        names: ['NAME Mars'],
        types: ['Pla', 'SSO'],
        interest: 4.95,
        modelData: {
          parent: 'NAME Sun',
          radius: '3394',
          albedo: '0.15',
          jplHorizonId: 499,
          orbitPreview: 'horizons:2458545.500000000, A.D. 2019-Mar-03',
          extraKeys: [],
        },
      },
    }, 'text'),
  )
  assert.match(sourceOutput, /Noctua Sky Source/)
  assert.match(sourceOutput, /open REST API only · no auth/)
  assert.match(sourceOutput, /Mars/)
  assert.match(sourceOutput, /model jpl_sso/)
  assert.match(sourceOutput, /parent NAME Sun/)
  assert.match(sourceOutput, /again public-apis apis run noctua\.source/)
  assert.match(sourceOutput, /stats public-apis apis run noctua\.stats/)
  assert.doesNotMatch(sourceOutput, /^\\{/)
})

test('text output renders Rig Veda book and search without fallback JSON', () => {
  const bookOutput = captureStdout(() =>
    printResult({
      kind: 'rigveda.book',
      api: {
        provider: 'rigveda',
        endpoint: 'GET /book/{mandal}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only Rig Veda metadata endpoints only.',
        categoryPolicy: 'Documented categories only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { mandal: 4, limit: 2, offset: 0 },
      pagination: { total: 116, returned: 2, limit: 2, offset: 0, nextOffset: 2 },
      facets: { gods: ['Agni'], meters: ['Gayatri'], poets: ['Vamadev Gautam'] },
      verses: [
        {
          mandal: 4,
          sukta: 1,
          meter: 'Gayatri',
          sungby: 'Vamadev Gautam',
          sungbycategory: 'human male',
          sungfor: 'Agni',
          sungforcategory: 'divine male',
        },
      ],
    }, 'text'),
  )

  assert.match(bookOutput, /Rig Veda Book Metadata/)
  assert.match(bookOutput, /open REST API only · no auth/)
  assert.match(bookOutput, /no Chrome clickstream/)
  assert.match(bookOutput, /mandal 4 · sukta 1/)
  assert.match(bookOutput, /search public-apis apis run rigveda\.search/)
  assert.match(bookOutput, /replay public-apis apis run rigveda\.book --offline/)
  assert.doesNotMatch(bookOutput, /^\\{/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'rigveda.search',
      api: {
        provider: 'rigveda',
        endpoint: 'GET /god/{sungfor}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only Rig Veda metadata endpoints only.',
        categoryPolicy: 'Documented categories only.',
      },
      storage: { mode: 'offline', persisted: true },
      query: { field: 'god', value: 'ganga', limit: 10, offset: 0 },
      pagination: { total: 1, returned: 1, limit: 10, offset: 0 },
      facets: {
        gods: ['Ganga'],
        meters: ['Jagati'],
        poets: ['Sindhukshit Praiyamedh'],
      },
      verses: [
        {
          mandal: 10,
          sukta: 75,
          meter: 'Jagati',
          sungby: 'Sindhukshit Praiyamedh',
          sungbycategory: 'human male',
          sungfor: 'Ganga',
          sungforcategory: 'divine female',
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Rig Veda Metadata Search/)
  assert.match(searchOutput, /offline/)
  assert.match(searchOutput, /Ganga/)
  assert.match(searchOutput, /book public-apis apis run rigveda\.book/)
  assert.doesNotMatch(searchOutput, /^\\{/)
})

test('text output renders Vedic Society operations without fallback JSON', () => {
  const wordsOutput = captureStdout(() =>
    printResult({
      kind: 'vedicsociety.words',
      api: {
        provider: 'vedicsociety',
        endpoint: 'GET /words/{word}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only Vedic Society noun metadata endpoints only.',
        categoryPolicy: 'Documented categories only.',
        emptyPolicy: 'Known not-found text is treated as empty.',
      },
      storage: { mode: 'online', persisted: true },
      query: { word: 'agni', limit: 2, offset: 0 },
      pagination: { total: 1, returned: 1, limit: 2, offset: 0 },
      facets: {
        categories: ['building'],
        words: ['agnishala'],
        descriptions: ['the central hall containing the fireplace'],
      },
      entries: [
        {
          word: 'agnishala',
          nagari: 'अग्निशाला',
          description: 'the central hall containing the fireplace',
          category: 'building',
        },
      ],
    }, 'text'),
  )

  assert.match(wordsOutput, /Vedic Society Word Lookup/)
  assert.match(wordsOutput, /open REST API only · no auth/)
  assert.match(wordsOutput, /no Chrome clickstream/)
  assert.match(wordsOutput, /agnishala · अग्निशाला · building/)
  assert.match(wordsOutput, /describe public-apis apis run vedicsociety\.descriptions/)
  assert.match(wordsOutput, /replay public-apis apis run vedicsociety\.words/)
  assert.doesNotMatch(wordsOutput, /^\\{/)

  const categoryOutput = captureStdout(() =>
    printResult({
      kind: 'vedicsociety.category',
      api: {
        provider: 'vedicsociety',
        endpoint: 'GET /categories/{category}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only Vedic Society noun metadata endpoints only.',
        categoryPolicy: 'Documented categories only.',
        emptyPolicy: 'Known not-found text is treated as empty.',
      },
      storage: { mode: 'offline', persisted: true },
      query: { category: 'river', limit: 10, offset: 0 },
      pagination: { total: 1, returned: 1, limit: 10, offset: 0 },
      facets: {
        categories: ['river'],
        words: ['ganga'],
        descriptions: ['the name of a river'],
      },
      entries: [
        {
          word: 'ganga',
          nagari: 'गङ्गा',
          description: 'the name of a river',
          category: 'river',
        },
      ],
    }, 'text'),
  )

  assert.match(categoryOutput, /Vedic Society Category Browser/)
  assert.match(categoryOutput, /offline/)
  assert.match(categoryOutput, /ganga/)
  assert.match(categoryOutput, /word public-apis apis run vedicsociety\.words/)
  assert.doesNotMatch(categoryOutput, /^\\{/)
})

test('text output renders Runyankole Bible operations without fallback JSON', () => {
  const api = {
    provider: 'runyankolebible',
    endpoint: 'GET /api/books',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    translation: 'Baibuli Erikwera 1964',
    attribution: 'The Bible Society of Uganda',
    boundary: 'Documented read-only JSON endpoints only.',
  }
  const verse = {
    bookId: 10,
    bookShort: 'Kut',
    bookName: 'Okutandika',
    chapter: 1,
    verse: 1,
    text: "Omu kutandika Ruhanga akahanga eiguru n'ensi.",
  }
  const booksOutput = captureStdout(() =>
    printResult({
      kind: 'runyankolebible.books',
      api,
      storage: { mode: 'online', persisted: true },
      query: { limit: 2, offset: 0 },
      pagination: { total: 66, returned: 2, limit: 2, offset: 0, nextOffset: 2 },
      books: [
        { id: 10, shortName: 'Kut', longName: 'Okutandika' },
        { id: 20, shortName: 'Kur', longName: 'Okuruga' },
      ],
    }, 'text'),
  )
  assert.match(booksOutput, /Runyankole Bible Books/)
  assert.match(booksOutput, /open REST API only · no auth/)
  assert.match(booksOutput, /The Bible Society of Uganda/)
  assert.match(booksOutput, /verse public-apis apis run runyankolebible\.verse/)
  assert.doesNotMatch(booksOutput, /^\\{/)

  const verseOutput = captureStdout(() =>
    printResult({
      kind: 'runyankolebible.verse',
      api: { ...api, endpoint: 'GET /api/verse' },
      storage: { mode: 'online', persisted: false },
      query: { book: 10, chapter: 1, verse: 1 },
      verse,
    }, 'text'),
  )
  assert.match(verseOutput, /Runyankole Bible Verse/)
  assert.match(verseOutput, /Okutandika 1:1/)
  assert.match(verseOutput, /chapter public-apis apis run runyankolebible\.chapter/)

  const chapterOutput = captureStdout(() =>
    printResult({
      kind: 'runyankolebible.chapter',
      api: { ...api, endpoint: 'GET /api/chapter' },
      storage: { mode: 'offline', persisted: true },
      query: { book: 10, chapter: 1, limit: 1, offset: 0 },
      pagination: { total: 2, returned: 1, limit: 1, offset: 0, nextOffset: 1 },
      book: { id: 10, shortName: 'Kut', name: 'Okutandika' },
      chapter: 1,
      totalVerses: 2,
      verses: [verse],
    }, 'text'),
  )
  assert.match(chapterOutput, /Runyankole Bible Chapter/)
  assert.match(chapterOutput, /offline/)
  assert.match(chapterOutput, /next public-apis apis run runyankolebible\.chapter/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'runyankolebible.search',
      api: { ...api, endpoint: 'GET /api/search' },
      storage: { mode: 'online', persisted: true },
      query: { query: 'Ruhanga', limit: 1, offset: 0 },
      pagination: { total: 3, returned: 1, limit: 1, offset: 0, nextOffset: 1 },
      verses: [verse],
    }, 'text'),
  )
  assert.match(searchOutput, /Runyankole Bible Search/)
  assert.match(searchOutput, /open public-apis apis run runyankolebible\.verse/)
  assert.match(searchOutput, /replay public-apis apis run runyankolebible\.search/)

  const randomOutput = captureStdout(() =>
    printResult({
      kind: 'runyankolebible.random',
      api: { ...api, endpoint: 'GET /api/random' },
      storage: { mode: 'online', persisted: false },
      query: { book: 10 },
      verse,
    }, 'text'),
  )
  assert.match(randomOutput, /Runyankole Bible Random Verse/)
  assert.match(randomOutput, /again public-apis apis run runyankolebible\.random/)
  assert.match(randomOutput, /replay public-apis apis run runyankolebible\.random/)
  assert.doesNotMatch(randomOutput, /^\\{/)
})

test('text output renders icsdb calendars and events without fallback JSON', () => {
  const rawUrl = [
    'https://raw.githubusercontent.com/gadael/icsdb/master/build/',
    'en-US/us-all-nonworkingdays.ics',
  ].join('')
  const calendarsOutput = captureStdout(() =>
    printResult({
      kind: 'icsdb.calendars',
      api: {
        provider: 'icsdb',
        endpoint: 'GET GitHub tree build/{locale}/*.ics',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS GitHub API + raw ICS text',
        limitCap: 100,
        boundary: 'Official GitHub repository and raw build ICS files only.',
        freshness: 'Static generated files.',
      },
      storage: { mode: 'online', persisted: true },
      query: { locale: 'en-US', query: 'us', limit: 2 },
      count: 1,
      totalCalendars: 1,
      calendars: [{
        locale: 'en-US',
        slug: 'us-all',
        title: 'Us All',
        fileName: 'us-all-nonworkingdays.ics',
        sourceUrl: rawUrl,
      }],
    }, 'text'),
  )
  assert.match(calendarsOutput, /icsdb Calendars/)
  assert.match(calendarsOutput, /open API only · no auth/)
  assert.match(calendarsOutput, /no Chrome clickstream/)
  assert.match(calendarsOutput, /us-all/)
  assert.match(calendarsOutput, /events public-apis apis run icsdb\.events/)
  assert.match(calendarsOutput, /--slug us-all/)
  assert.match(calendarsOutput, /replay public-apis apis run icsdb\.calendars/)
  assert.doesNotMatch(calendarsOutput, /^\\{/)

  const eventsOutput = captureStdout(() =>
    printResult({
      kind: 'icsdb.events',
      api: {
        provider: 'icsdb',
        endpoint: 'GET raw build/{locale}/{slug}-nonworkingdays.ics',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS GitHub API + raw ICS text',
        limitCap: 100,
        boundary: 'Official GitHub repository and raw build ICS files only.',
        freshness: 'Static generated files.',
      },
      storage: { mode: 'online', persisted: true },
      query: { locale: 'en-US', slug: 'us-all', query: 'day', limit: 2 },
      calendar: {
        locale: 'en-US',
        slug: 'us-all',
        title: 'US legal holidays',
        method: 'PUBLISH',
        timezone: 'UTC',
        sourceUrl: rawUrl,
      },
      count: 2,
      totalEvents: 2,
      events: [
        {
          summary: "New Year's Day",
          startDate: '1970-01-01',
          endDate: '1970-01-02',
          rrule: 'FREQ=YEARLY',
          rdateCount: 0,
          rdatePreview: [],
          categories: [],
          uid: 'new-year',
        },
        {
          summary: 'State Day',
          startDate: '1970-02-01',
          endDate: '1970-02-02',
          rdateCount: 2,
          rdatePreview: ['1970-02-01', '1971-02-01'],
          categories: ['Georgia', 'Texas'],
          uid: 'state-day',
        },
      ],
    }, 'text'),
  )
  assert.match(eventsOutput, /icsdb Events/)
  assert.match(eventsOutput, /US legal holidays/)
  assert.match(eventsOutput, /New Year's Day/)
  assert.match(eventsOutput, /FREQ=YEARLY/)
  assert.match(eventsOutput, /categories Georgia, Texas/)
  assert.match(eventsOutput, /rdates 1970-02-01, 1971-02-01/)
  assert.match(eventsOutput, /calendars public-apis apis run icsdb\.calendars/)
  assert.match(eventsOutput, /replay public-apis apis run icsdb\.events/)
  assert.doesNotMatch(eventsOutput, /^\\{/)
})

test('text output renders isDayOff day and range without fallback JSON', () => {
  const api = {
    provider: 'isdayoff',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS text/plain status API',
    supportedCountries: ['ru', 'by', 'kz', 'us', 'uz', 'tr', 'lv'],
    defaultCountryCode: 'ru',
    defaultRangeDays: 14,
    rangeDayCap: 366,
    boundary: 'Documented getdata text status API only.',
    freshness: 'Provider database coverage varies by country and year.',
  }
  const dayOutput = captureStdout(() =>
    printResult({
      kind: 'isdayoff.day',
      api: {
        ...api,
        endpoint: 'GET /api/getdata?year={YYYY}&month={MM}&day={DD}',
      },
      storage: { mode: 'online', persisted: true },
      query: {
        date: '2026-05-11',
        countryCode: 'ru',
        includeShortened: true,
        sixDay: false,
        markHoliday: false,
      },
      status: {
        date: '2026-05-11',
        code: '1',
        label: 'non-working day',
        isWorkingDay: false,
        isNonWorkingDay: true,
        isShortenedDay: false,
        isHoliday: false,
      },
    }, 'text'),
  )
  assert.match(dayOutput, /isDayOff Day/)
  assert.match(dayOutput, /open API only · no auth/)
  assert.match(dayOutput, /no Chrome clickstream/)
  assert.match(dayOutput, /2026-05-11 · non-working day · code 1/)
  assert.match(dayOutput, /range public-apis apis run isdayoff\.range/)
  assert.match(dayOutput, /replay public-apis apis run isdayoff\.day/)
  assert.doesNotMatch(dayOutput, /^\\{/)

  const rangeOutput = captureStdout(() =>
    printResult({
      kind: 'isdayoff.range',
      api: {
        ...api,
        endpoint: 'GET /api/getdata?date1={YYYYMMDD}&date2={YYYYMMDD}',
      },
      storage: { mode: 'online', persisted: true },
      query: {
        from: '2026-05-10',
        to: '2026-05-12',
        days: 3,
        countryCode: 'ru',
        includeShortened: true,
        sixDay: false,
        markHoliday: false,
      },
      count: 3,
      totals: {
        workingDays: 2,
        nonWorkingDays: 1,
        shortenedDays: 1,
        holidays: 0,
      },
      days: [
        {
          date: '2026-05-10',
          code: '1',
          label: 'non-working day',
          isWorkingDay: false,
          isShortenedDay: false,
          isHoliday: false,
        },
        {
          date: '2026-05-11',
          code: '0',
          label: 'working day',
          isWorkingDay: true,
          isShortenedDay: false,
          isHoliday: false,
        },
        {
          date: '2026-05-12',
          code: '2',
          label: 'shortened working day',
          isWorkingDay: true,
          isShortenedDay: true,
          isHoliday: false,
        },
      ],
    }, 'text'),
  )
  assert.match(rangeOutput, /isDayOff Range/)
  assert.match(rangeOutput, /working 2 · non-working 1 · shortened 1/)
  assert.match(rangeOutput, /2026-05-12 · shortened working day/)
  assert.match(rangeOutput, /day public-apis apis run isdayoff\.day/)
  assert.match(rangeOutput, /replay public-apis apis run isdayoff\.range/)
  assert.doesNotMatch(rangeOutput, /^\\{/)
})

test('text output renders ISRO catalog without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'isro.catalog',
      api: {
        provider: 'isro',
        endpoint: 'GET /api/{resource}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only JSON catalog resources only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { resource: 'centres', search: 'Bengaluru', limit: 3, offset: 0 },
      pagination: {
        total: 44,
        matched: 13,
        returned: 2,
        offset: 0,
        limit: 3,
        hasMore: true,
      },
      items: [
        {
          id: 14,
          name: 'Space Commission',
          place: 'Bengaluru',
          state: 'Karnataka',
        },
        {
          id: 15,
          name: 'Department of Space and ISRO Headquarters',
          place: 'Bengaluru',
          state: 'Karnataka',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /ISRO Catalog/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /resource centres/)
  assert.match(output, /2\/13 matched · total 44/)
  assert.match(output, /Space Commission · Bengaluru · Karnataka/)
  assert.match(output, /next public-apis apis run isro\.catalog/)
  assert.match(output, /replay public-apis apis run isro\.catalog --offline/)
  assert.doesNotMatch(output, /^\\{/)
})

test('text output renders Wizard World catalog without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'wizardworld.catalog',
      api: {
        provider: 'wizardworld',
        endpoint: 'GET /{resource}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only Wizard World JSON collections only.',
      },
      storage: { mode: 'online', persisted: true },
      query: {
        resource: 'spells',
        name: 'Patronus',
        spellType: 'Charm',
        limit: 3,
        offset: 0,
      },
      pagination: {
        total: 160,
        matched: 1,
        returned: 1,
        offset: 0,
        limit: 3,
        hasMore: false,
      },
      items: [
        {
          id: '90e5b314-fa78-4b02-9bbc-ca37736b7f9f',
          resource: 'spells',
          name: 'Patronus Charm',
          incantation: 'Expecto Patronum',
          effect: 'Conjures a spirit guardian',
          type: 'Charm',
          light: 'Silver',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Wizard World Catalog/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /resource spells/)
  assert.match(output, /1\/1 matched · total 160/)
  assert.match(output, /Patronus Charm · Expecto Patronum · Charm/)
  assert.match(output, /replay public-apis apis run wizardworld\.catalog --offline/)
  assert.doesNotMatch(output, /^\\{/)
})

test('text output renders World Bank countries and indicator without fallback JSON', () => {
  const countriesOutput = captureStdout(() =>
    printResult({
      kind: 'worldbank.countries',
      api: {
        provider: 'worldbank',
        endpoint: 'GET /country',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only World Bank JSON only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { page: 1, perPage: 3 },
      pagination: { page: 1, pages: 99, perPage: 3, total: 296 },
      countries: [
        {
          id: 'US',
          iso2Code: 'US',
          name: 'United States',
          region: { id: 'NAC', value: 'North America' },
          incomeLevel: { id: 'HIC', value: 'High income' },
          lendingType: { id: 'LNX', value: 'Not classified' },
          capitalCity: 'Washington D.C.',
        },
      ],
    }, 'text'),
  )
  assert.match(countriesOutput, /World Bank Countries/)
  assert.match(countriesOutput, /open REST API only · no auth/)
  assert.match(countriesOutput, /no Chrome clickstream/)
  assert.match(countriesOutput, /page 1\/99 · total 296/)
  assert.match(countriesOutput, /United States · US · US · North America/)
  assert.match(countriesOutput, /next public-apis apis run worldbank\.countries/)
  assert.match(countriesOutput, /replay public-apis apis run worldbank\.countries --offline/)
  assert.doesNotMatch(countriesOutput, /^\\{/)

  const indicatorOutput = captureStdout(() =>
    printResult({
      kind: 'worldbank.indicator',
      api: {
        provider: 'worldbank',
        endpoint: 'GET /country/{country}/indicator/{indicator}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only World Bank JSON only.',
      },
      storage: { mode: 'online', persisted: true },
      query: {
        country: 'US',
        indicator: 'SP.POP.TOTL',
        date: '2020:2022',
        page: 1,
        perPage: 3,
      },
      pagination: { page: 1, pages: 1, perPage: 3, total: 3 },
      indicator: { id: 'SP.POP.TOTL', name: 'Population, total' },
      points: [
        {
          indicatorId: 'SP.POP.TOTL',
          indicatorName: 'Population, total',
          countryId: 'US',
          countryName: 'United States',
          countryIso3Code: 'USA',
          date: '2022',
          value: 333287557,
        },
      ],
    }, 'text'),
  )
  assert.match(indicatorOutput, /World Bank Indicator/)
  assert.match(indicatorOutput, /open REST API only · no auth/)
  assert.match(indicatorOutput, /SP\.POP\.TOTL · Population, total/)
  assert.match(indicatorOutput, /2022 · 333,287,557 · United States/)
  assert.match(indicatorOutput, /replay public-apis apis run worldbank\.indicator --offline/)
  assert.doesNotMatch(indicatorOutput, /^\\{/)
})

test('text output renders ITIS search and record without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'itis.search',
      api: {
        provider: 'itis',
        endpoint: 'GET /searchByScientificName?srchKey={query}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        contentType: 'text/json',
      },
      storage: { mode: 'online', persisted: true },
      query: { query: 'Quercus robur', limit: 10, offset: 0 },
      pagination: { matched: 2, returned: 2, offset: 0, limit: 10, hasMore: false },
      names: [
        {
          tsn: '19405',
          combinedName: 'Quercus robur',
          author: 'L.',
          kingdom: 'Plantae',
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /ITIS Scientific Name Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Quercus robur · TSN 19405/)
  assert.match(searchOutput, /record public-apis apis run itis\.record/)
  assert.match(searchOutput, /replay public-apis apis run itis\.search --offline/)
  assert.doesNotMatch(searchOutput, /^\\{/)

  const recordOutput = captureStdout(() =>
    printResult({
      kind: 'itis.record',
      api: {
        provider: 'itis',
        endpoint: 'GET /getFullRecordFromTSN?tsn={tsn}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        contentType: 'text/json',
      },
      storage: { mode: 'offline', persisted: true },
      query: { tsn: '19405', commonLimit: 5, synonymLimit: 10 },
      record: {
        tsn: '19405',
        scientificName: { combinedName: 'Quercus robur', author: 'L.' },
        commonNames: [{ commonName: 'English oak', language: 'English' }],
        synonyms: [{ tsn: '845209', scientificName: 'Quercus robur f. fastigiata' }],
        hierarchy: {
          taxonName: 'Quercus robur',
          rankName: 'Species',
          parentName: 'Quercus',
          parentTsn: '19276',
        },
        rank: 'Species',
        usage: 'accepted',
        kingdom: 'Plantae',
        credibility: 'TWG standards met',
        links: { report: 'https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_value=19405' },
      },
      counts: { commonNames: 1, synonyms: 1, jurisdictionalOrigins: 0 },
    }, 'text'),
  )
  assert.match(recordOutput, /ITIS Taxonomy Record/)
  assert.match(recordOutput, /offline/)
  assert.match(recordOutput, /Quercus robur/)
  assert.match(recordOutput, /English oak/)
  assert.match(recordOutput, /Quercus robur f\. fastigiata/)
  assert.match(recordOutput, /again public-apis apis run itis\.record/)
  assert.match(recordOutput, /search public-apis apis run itis\.search/)
  assert.doesNotMatch(recordOutput, /^\\{/)
})

test('text output renders Launch Library 2 launches and events', () => {
  const launchesOutput = captureStdout(() =>
    printResult({
      kind: 'launchlibrary2.launches',
      api: {
        provider: 'launchlibrary2',
        endpoint: 'GET /2.3.0/launches/upcoming/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        version: '2.3.0',
        rateLimitPolicy: 'Non-authenticated requests are free but rate-limited.',
      },
      storage: { mode: 'online', persisted: true },
      query: {
        kind: 'launches',
        search: 'Falcon',
        limit: 2,
        offset: 0,
        ordering: 'net',
      },
      pagination: {
        total: 20,
        returned: 1,
        offset: 0,
        limit: 2,
        maxLimit: 100,
        hasMore: true,
      },
      launches: [
        {
          id: '24f0b5b1-f573-4cc9-8898-1eb7fd5cc0f2',
          url: [
            'https://ll.thespacedevs.com/2.3.0/launches/',
            '24f0b5b1-f573-4cc9-8898-1eb7fd5cc0f2/',
          ].join(''),
          name: 'Falcon 9 Block 5 | NROL-172',
          status: { name: 'Go for Launch', abbrev: 'Go' },
          net: '2026-05-11T22:28:00Z',
          launchServiceProvider: { name: 'SpaceX', abbrev: 'SpX' },
          rocket: { name: 'Falcon 9 Block 5' },
          mission: { name: 'NROL-172', orbit: 'Unknown' },
          pad: {
            name: 'Space Launch Complex 4E',
            location: { name: 'Vandenberg SFB, CA, USA' },
          },
        },
      ],
    }, 'text'),
  )
  assert.match(launchesOutput, /Launch Library 2 Upcoming Launches/)
  assert.match(launchesOutput, /open REST API only · no auth/)
  assert.match(launchesOutput, /Falcon 9 Block 5/)
  assert.match(launchesOutput, /next public-apis apis run launchlibrary2\.launches/)
  assert.match(launchesOutput, /events public-apis apis run launchlibrary2\.events/)
  assert.doesNotMatch(launchesOutput, /^\\{/)

  const eventsOutput = captureStdout(() =>
    printResult({
      kind: 'launchlibrary2.events',
      api: {
        provider: 'launchlibrary2',
        endpoint: 'GET /2.3.0/events/upcoming/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        version: '2.3.0',
        rateLimitPolicy: 'Non-authenticated requests are free but rate-limited.',
      },
      storage: { mode: 'offline', persisted: true },
      query: {
        kind: 'events',
        search: 'Docking',
        limit: 2,
        offset: 0,
        ordering: 'date',
      },
      pagination: {
        total: 3,
        returned: 1,
        offset: 0,
        limit: 2,
        maxLimit: 100,
        hasMore: true,
      },
      events: [
        {
          id: 1449,
          url: 'https://ll.thespacedevs.com/2.3.0/events/1449/',
          name: 'SpaceX CRS-34 Dragon Docking',
          date: '2026-05-14T13:50:00Z',
          type: 'Docking',
          location: 'International Space Station',
          description: 'CRS-34 Dragon will autonomously dock to the ISS.',
          videoUrls: [
            {
              publisher: 'NASA',
              url: 'https://plus.nasa.gov/scheduled-video/crs-34/',
            },
          ],
        },
      ],
    }, 'text'),
  )
  assert.match(eventsOutput, /Launch Library 2 Upcoming Events/)
  assert.match(eventsOutput, /offline/)
  assert.match(eventsOutput, /SpaceX CRS-34 Dragon Docking/)
  assert.match(eventsOutput, /NASA/)
  assert.match(eventsOutput, /launches public-apis apis run launchlibrary2\.launches/)
  assert.doesNotMatch(eventsOutput, /^\\{/)
})


test('text output renders OpenSky states without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'opensky.states',
      api: { provider: 'opensky', endpoint: 'GET https://opensky-network.org/api/states/all', authentication: 'none', usesBrowserClickstream: false, anonymousCreditPolicy: '400 anonymous credits/day', limitPolicy: 'bounded aircraft output' },
      storage: { mode: 'online', persisted: false },
      query: { lamin: 45.8, lomin: -124, lamax: 49.2, lomax: -116, limit: 1 },
      snapshotTime: 1777907971,
      count: 1,
      rateLimit: { remaining: '399' },
      aircraft: [{ icao24: 'ad5621', callsign: 'ALFT', originCountry: 'United States', lastContact: 1777907970, latitude: 48.0225, longitude: -123.1804, baroAltitude: 792.48, onGround: false, velocity: 65.29, spi: false, positionSource: 0 }],
    }, 'text'),
  )
  assert.match(output, /OpenSky State Vectors/)
  assert.match(output, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(output, /400 anonymous credits\/day/)
  assert.match(output, /ALFT/)
  assert.match(output, /again public-apis apis run opensky\.states --online --persist -- --lamin 45\.8 --lomin -124 --lamax 49\.2 --lomax -116 --limit 1/)
  assert.match(output, /replay public-apis apis run opensky\.states --offline -- --lamin 45\.8 --lomin -124 --lamax 49\.2 --lomax -116 --limit 1/)
  assert.doesNotMatch(output, /^\{/)
})


test('text output renders LA Metro routes and stops without fallback JSON', () => {
  const routesOutput = captureStdout(() =>
    printResult({
      kind: 'lametro.routes',
      api: { provider: 'lametro', endpoint: 'GET https://api.metro.net/LACMTA/route_overview', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { agency: 'LACMTA', query: 'wilshire', routeType: 'bus', limit: 1 },
      count: 1,
      routes: [{ routeCode: '720', routeShortName: '720', routeType: 'bus', routeDesc: 'DTWN LA - SM VIA WILSHIRE', terminal1: 'Downtown LA', terminal2: 'Santa Monica', isActive: true }],
    }, 'text'),
  )
  assert.match(routesOutput, /LA Metro Routes/)
  assert.match(routesOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(routesOutput, /720/)
  assert.match(routesOutput, /stops public-apis apis run lametro\.stops -- --route-code 720 --day-type all --limit 50/)
  assert.match(routesOutput, /again public-apis apis run lametro\.routes --online --persist -- --query wilshire --route-type bus --limit 1/)
  assert.match(routesOutput, /replay public-apis apis run lametro\.routes --offline -- --query wilshire --route-type bus --limit 1/)
  assert.doesNotMatch(routesOutput, /^\{/)

  const stopsOutput = captureStdout(() =>
    printResult({
      kind: 'lametro.stops',
      api: { provider: 'lametro', endpoint: 'GET https://api.metro.net/LACMTA/route_stops/720', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { agency: 'LACMTA', routeCode: '720', dayType: 'all', limit: 1 },
      count: 1,
      stops: [{ routeCode: '720', stopId: 1213, stopSequence: 1, directionId: 1, stopName: 'Central / 6th', latitude: 34.039201, longitude: -118.239787, departureTimes: ['03:43:00', '04:00:00'] }],
    }, 'text'),
  )
  assert.match(stopsOutput, /LA Metro Route Stops/)
  assert.match(stopsOutput, /Central \/ 6th/)
  assert.match(stopsOutput, /routes public-apis apis run lametro\.routes -- --query 720 --limit 20/)
  assert.match(stopsOutput, /again public-apis apis run lametro\.stops --online --persist -- --route-code 720 --day-type all --limit 1/)
  assert.match(stopsOutput, /replay public-apis apis run lametro\.stops --offline -- --route-code 720 --day-type all --limit 1/)
  assert.doesNotMatch(stopsOutput, /^\{/)
})

test('text output renders Entur places and departures without fallback JSON', () => {
  const placesOutput = captureStdout(() =>
    printResult({
      kind: 'entur.places',
      api: { provider: 'entur', endpoint: 'GET https://api.entur.io/geocoder/v1/autocomplete', authentication: 'none', usesBrowserClickstream: false, limitPolicy: 'Geocoder size uses documented max/default 100.' },
      storage: { mode: 'online', persisted: false },
      query: { text: 'Oslo S', lang: 'en', layers: 'venue', size: 2, clientName: 'public-apis-tui-cli' },
      count: 1,
      rateLimit: { available: '99' },
      places: [{ id: 'NSR:StopPlace:59872', name: 'Oslo S', layer: 'venue', locality: 'Oslo', country: 'NOR', latitude: 59.91, longitude: 10.751, modes: ['rail', 'bus'] }],
    }, 'text'),
  )
  assert.match(placesOutput, /Entur Places/)
  assert.match(placesOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(placesOutput, /ET-Client-Name/)
  assert.match(placesOutput, /Oslo S/)
  assert.match(placesOutput, /departures public-apis apis run entur\.departures -- --stop-place-id NSR:StopPlace:59872 --departures 20/)
  assert.match(placesOutput, /again public-apis apis run entur\.places --online --persist -- --text 'Oslo S' --size 2 --lang en --layers venue/)
  assert.match(placesOutput, /replay public-apis apis run entur\.places --offline -- --text 'Oslo S' --size 2 --lang en --layers venue/)
  assert.doesNotMatch(placesOutput, /^\{/)

  const departuresOutput = captureStdout(() =>
    printResult({
      kind: 'entur.departures',
      api: { provider: 'entur', endpoint: 'POST https://api.entur.io/journey-planner/v3/graphql', authentication: 'none', usesBrowserClickstream: false, limitPolicy: 'No public max found for estimatedCalls(numberOfDepartures); CLI caps --departures at 100.' },
      storage: { mode: 'online', persisted: false },
      query: { stopPlaceId: 'NSR:StopPlace:59872', departures: 2, clientName: 'public-apis-tui-cli' },
      stopPlace: { id: 'NSR:StopPlace:59872', name: 'Oslo S' },
      count: 1,
      rateLimit: { available: '98' },
      departures: [{ expectedDepartureTime: '2026-05-05T10:00:00+02:00', actualDepartureTime: '2026-05-05T10:01:00+02:00', destination: 'Lillestrøm', lineCode: 'R12', lineName: 'Kongsberg - Eidsvoll', transportMode: 'rail' }],
    }, 'text'),
  )
  assert.match(departuresOutput, /Entur Departures/)
  assert.match(departuresOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(departuresOutput, /ET-Client-Name/)
  assert.match(departuresOutput, /Lillestrøm/)
  assert.match(departuresOutput, /places public-apis apis run entur\.places -- --text 'Oslo S' --size 20/)
  assert.match(departuresOutput, /again public-apis apis run entur\.departures --online --persist -- --stop-place-id NSR:StopPlace:59872 --departures 2/)
  assert.match(departuresOutput, /replay public-apis apis run entur\.departures --offline -- --stop-place-id NSR:StopPlace:59872 --departures 2/)
  assert.doesNotMatch(departuresOutput, /^\{/)
})

test('text output renders Velib stations without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'velib.stations',
      api: { provider: 'velib', endpoint: 'GET GBFS station_information.json + station_status.json', authentication: 'none', usesBrowserClickstream: false, limitPolicy: 'Feeds are full snapshots; CLI filters locally and caps terminal output at 500.' },
      storage: { mode: 'online', persisted: false },
      query: { query: 'Godard', sort: 'bikes', limit: 1 },
      stations: [{ stationId: '213688169', stationCode: '16107', name: 'Benjamin Godard - Victor Hugo', latitude: 48.865983, longitude: 2.275725, capacity: 35, bikesAvailable: 25, mechanicalBikes: 20, ebikes: 5, docksAvailable: 9, isRenting: true, isReturning: true }],
      count: 1,
      totalStations: 2,
      snapshot: { informationLastUpdated: 1777913998, statusLastUpdated: 1777913999, ttl: 3600 },
    }, 'text'),
  )
  assert.match(output, /Velib Stations/)
  assert.match(output, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(output, /Benjamin Godard/)
  assert.match(output, /25 bikes/)
  assert.match(output, /station public-apis apis run velib\.stations -- --station-code 16107 --limit 20/)
  assert.match(output, /again public-apis apis run velib\.stations --online --persist -- --query Godard --sort bikes --limit 1/)
  assert.match(output, /replay public-apis apis run velib\.stations --offline -- --query Godard --sort bikes --limit 1/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Fipe lists and price without fallback JSON', () => {
  const listOutput = captureStdout(() =>
    printResult({
      kind: 'fipe.models',
      api: { provider: 'fipe', endpoint: 'GET https://parallelum.com.br/fipe/api/v1/carros/marcas/59/modelos', authentication: 'none', usesBrowserClickstream: false, limitPolicy: 'List endpoints are unpaginated; CLI filters locally and caps terminal output at 1000.' },
      storage: { mode: 'online', persisted: false },
      query: { vehicleType: 'carros', brandCode: '59', query: 'amarok', limit: 1 },
      items: [{ code: '5940', name: 'AMAROK High.CD 2.0 16V TDI 4x4 Dies. Aut' }],
      count: 1,
      totalItems: 2,
      rateLimit: { limit: '500', remaining: '499', reset: '86400' },
    }, 'text'),
  )
  assert.match(listOutput, /Fipe Models/)
  assert.match(listOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(listOutput, /AMAROK/)
  assert.match(listOutput, /remaining 499 \/ 500/)
  assert.match(listOutput, /years public-apis apis run fipe\.years -- --vehicle-type carros --brand-code 59 --model-code 5940 --limit 100/)
  assert.match(listOutput, /again public-apis apis run fipe\.models --online --persist -- --vehicle-type carros --brand-code 59 --query amarok --limit 1/)
  assert.match(listOutput, /replay public-apis apis run fipe\.models --offline -- --vehicle-type carros --brand-code 59 --query amarok --limit 1/)
  assert.doesNotMatch(listOutput, /^\{/)

  const priceOutput = captureStdout(() =>
    printResult({
      kind: 'fipe.price',
      api: { provider: 'fipe', endpoint: 'GET https://parallelum.com.br/fipe/api/v1/carros/marcas/59/modelos/5940/anos/2014-3', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { vehicleType: 'carros', brandCode: '59', modelCode: '5940', yearCode: '2014-3' },
      price: { value: 'R$ 86.907,00', brand: 'VW - VolksWagen', model: 'AMAROK High.CD 2.0 16V TDI 4x4 Dies. Aut', modelYear: 2014, fuel: 'Diesel', fipeCode: '005340-6', referenceMonth: 'maio de 2026' },
      rateLimit: { limit: '500', remaining: '498', reset: '86400' },
    }, 'text'),
  )
  assert.match(priceOutput, /Fipe Price/)
  assert.match(priceOutput, /R\$ 86\.907,00/)
  assert.match(priceOutput, /VW - VolksWagen/)
  assert.match(priceOutput, /no Chrome clickstream/)
  assert.match(priceOutput, /years public-apis apis run fipe\.years -- --vehicle-type carros --brand-code 59 --model-code 5940 --limit 100/)
  assert.match(priceOutput, /again public-apis apis run fipe\.price --online --persist -- --vehicle-type carros --brand-code 59 --model-code 5940 --year-code 2014-3/)
  assert.match(priceOutput, /replay public-apis apis run fipe\.price --offline -- --vehicle-type carros --brand-code 59 --model-code 5940 --year-code 2014-3/)
  assert.doesNotMatch(priceOutput, /^\{/)
})

test('text output renders AviationWeather METAR and TAF without fallback JSON', () => {
  const metarOutput = captureStdout(() =>
    printResult({
      kind: 'aviationweather.metar',
      api: { provider: 'aviationweather', endpoint: 'GET https://aviationweather.gov/api/data/metar?ids={ids}&format=json', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { ids: 'KSFO', limit: 1 },
      reports: [{ icaoId: 'KSFO', name: 'San Francisco Intl, CA, US', flightCategory: 'MVFR', temp: 15.6, dewp: 8.3, wdir: 300, wspd: 5, visib: '10+', altim: 1015.3, rawOb: 'METAR KSFO 041656Z 30005KT 10SM FEW009 BKN026 16/08 A2998' }],
      count: 1,
      cachePolicy: { cacheControl: 'max-age=90' },
    }, 'text'),
  )
  assert.match(metarOutput, /AviationWeather METAR/)
  assert.match(metarOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(metarOutput, /KSFO/)
  assert.match(metarOutput, /MVFR/)
  assert.match(metarOutput, /taf public-apis apis run aviationweather\.taf -- --ids KSFO --limit 10/)
  assert.match(metarOutput, /again public-apis apis run aviationweather\.metar --online --persist -- --ids KSFO --limit 1/)
  assert.match(metarOutput, /replay public-apis apis run aviationweather\.metar --offline -- --ids KSFO --limit 1/)
  assert.doesNotMatch(metarOutput, /^\{/)

  const tafOutput = captureStdout(() =>
    printResult({
      kind: 'aviationweather.taf',
      api: { provider: 'aviationweather', endpoint: 'GET https://aviationweather.gov/api/data/taf?ids={ids}&format=json', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { ids: 'KSFO', limit: 1 },
      reports: [{ icaoId: 'KSFO', name: 'San Francisco Intl', issueTime: '2026-05-04T14:59:00.000Z', validTimeFrom: 1777906800, validTimeTo: 1778004000, rawTAF: 'TAF KSFO 041459Z 0415/0518 00000KT P6SM FEW009 SCT022', forecastCount: 1 }],
      count: 1,
      cachePolicy: { cacheControl: 'max-age=60' },
    }, 'text'),
  )
  assert.match(tafOutput, /AviationWeather TAF/)
  assert.match(tafOutput, /TAF KSFO/)
  assert.match(tafOutput, /no Chrome clickstream/)
  assert.match(tafOutput, /metar public-apis apis run aviationweather\.metar -- --ids KSFO --limit 10/)
  assert.match(tafOutput, /again public-apis apis run aviationweather\.taf --online --persist -- --ids KSFO --limit 1/)
  assert.match(tafOutput, /replay public-apis apis run aviationweather\.taf --offline -- --ids KSFO --limit 1/)
  assert.doesNotMatch(tafOutput, /^\{/)
})

test('text output renders public API info with CLI option decisions', () => {
  const output = captureStdout(() => printResult(describePublicApiProvider('mediastack.news'), 'text'))

  assert.match(output, /Mediastack/)
  assert.match(output, /CLI options: 10 exposed \/ 10 documented/)
  assert.match(output, /authentication: --api-key <key> \(advanced\)/)
  assert.match(output, /filters: .*--categories <ids> \(primary\)/)
  assert.match(output, /pagination: --limit <count> \(primary\)/)
  assert.match(output, /public-apis apis run <operation> --help/)
  assert.doesNotMatch(output, /^\\{/)
})

test('text output renders describe and endpoint catalog as readable TUI', () => {
  const registry = createSiteRegistry()
  const describeOutput = captureStdout(() =>
    printResult(describeSystem('public-apis-cli', '0.4.0', registry.config), 'text'),
  )
  const endpointOutput = captureStdout(() => printResult(listEndpoints(defaultEndpointCatalog), 'text'))

  assert.match(describeOutput, /Public APIs CLI/)
  assert.match(describeOutput, /public APIs/)
  assert.doesNotMatch(describeOutput, /^\\{/)
  assert.match(endpointOutput, /Endpoint Catalog/)
  assert.match(endpointOutput, /mediastack-news/)
  assert.doesNotMatch(endpointOutput, /^\\{/)
})

test('text output renders provider persistence config', async () => {
  const result = await showPublicApiProviderConfig('mediastack')
  result.config.secrets = { MEDIASTACK_API_KEY: '<redacted>' }
  const output = captureStdout(() => printResult(result, 'text'))

  assert.match(output, /Public API Config/)
  assert.match(output, /mediastack/)
  assert.match(output, /MEDIASTACK_API_KEY=<redacted>/)
  assert.doesNotMatch(output, /^\{/)
  assert.doesNotMatch(output, /test-secret/)
})

test('text output renders Agify age prediction without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'agify.age',
      api: {
        provider: 'agify',
        endpoint: 'GET /?name={name}',
        authentication: 'none',
        usesBrowserClickstream: false,
        freeRateLimit: '100 requests/day for unauthenticated usage',
      },
      query: { name: 'michael', countryId: 'US' },
      prediction: { name: 'michael', age: 58, count: 108496, countryId: 'US' },
      rateLimit: { limit: '100', remaining: '99', reset: '3600' },
    }, 'text'),
  )

  assert.match(output, /Agify Age Prediction/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /michael estimated age 58/)
  assert.match(output, /remaining 99 \/ 100 · reset 1h 0m/)
  assert.match(output, /confidence large sample count/)
  assert.match(output, /again public-apis apis run agify\.age -- --name michael --country-id US/)
  assert.match(output, /compare public-apis apis run agify\.age -- --name michael/)
  assert.doesNotMatch(output, /compare public-apis apis run agify\.age -- --name michael --country-id US/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Agify unknown estimates with UX remediation', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'agify.age',
      api: {
        provider: 'agify',
        endpoint: 'GET /?name={name}',
        authentication: 'none',
        usesBrowserClickstream: false,
        freeRateLimit: '100 requests/day for unauthenticated usage',
      },
      query: { name: 'xqznotarealname', countryId: 'US' },
      prediction: { name: 'xqznotarealname', age: null, count: 0, countryId: 'US' },
      rateLimit: { limit: '100', remaining: '97', reset: '45' },
    }, 'text'),
  )

  assert.match(output, /xqznotarealname estimated age unknown from 0 sample/)
  assert.match(output, /confidence no estimate available yet/)
  assert.match(output, /reset <1m/)
  assert.match(output, /again public-apis apis run agify\.age -- --name xqznotarealname --country-id US/)
  assert.match(output, /compare public-apis apis run agify\.age -- --name xqznotarealname/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Arbeitnow jobs without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'arbeitnow.jobs',
      api: {
        provider: 'arbeitnow',
        endpoint: 'GET /api/job-board-api',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultPageSize: 100,
        rateLimitPolicy: 'Live response exposes x-ratelimit-limit and x-ratelimit-remaining.',
        parameterPolicy: 'Arbeitnow currently returns 100 rows per page and honors page plus visa_sponsorship.',
      },
      query: { page: 1, visaSponsorship: true },
      pagination: { currentPage: 1, returned: 2, pageSize: 100 },
      rateLimit: { limit: '5', remaining: '4' },
      jobs: [
        {
          title: 'Data Engineer',
          companyName: 'Example GmbH',
          location: 'Berlin, Germany',
          remote: false,
          visaSponsorship: true,
          createdAtIso: '2026-05-04T09:00:00.000Z',
          tags: ['Data', 'Engineering'],
          jobTypes: ['Full-time'],
          descriptionText: 'Build data products',
          url: 'https://www.arbeitnow.com/view/data-engineer-berlin-123',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Arbeitnow Jobs/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /visa sponsorship/)
  assert.match(output, /remaining 4 \/ 5/)
  assert.match(output, /again.*arbeitnow\.jobs --online --persist -- --page 1 --visa-sponsorship true/)
  assert.match(output, /replay.*arbeitnow\.jobs --offline -- --page 1 --visa-sponsorship true/)
  assert.match(output, /next page.*arbeitnow\.jobs --online --persist -- --page 2 --visa-sponsorship true/)
  assert.match(output, /all jobs.*arbeitnow\.jobs --online --persist -- --page 1/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Genderize prediction without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'genderize.predict',
      api: {
        provider: 'genderize',
        endpoint: 'GET /?name={name}',
        authentication: 'none',
        usesBrowserClickstream: false,
        freeRateLimit: '100 requests/day for unauthenticated usage',
      },
      query: { name: 'kim', countryId: 'US' },
      prediction: { name: 'kim', gender: 'female', probability: 0.94, count: 62805, countryId: 'US' },
      rateLimit: { limit: '100', remaining: '99', reset: '3600' },
    }, 'text'),
  )

  assert.match(output, /Genderize Prediction/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /kim likely female at 94%/)
  assert.match(output, /remaining 99 \/ 100/)
  assert.match(output, /compare global public-apis apis run genderize\.predict -- --name kim/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Genderize unknown prediction as an empty-state remediation', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'genderize.predict',
      api: {
        provider: 'genderize',
        endpoint: 'GET /?name={name}',
        authentication: 'none',
        usesBrowserClickstream: false,
        freeRateLimit: '100 requests/day for unauthenticated usage',
      },
      query: { name: 'xqznotaname' },
      prediction: { name: 'xqznotaname', gender: null, probability: 0, count: 0 },
      rateLimit: { limit: '100', remaining: '98', reset: '3600' },
    }, 'text'),
  )

  assert.match(output, /No reliable gender estimate found for xqznotaname/)
  assert.match(output, /sample count 0 · probability 0%/)
  assert.match(output, /try public-apis apis run genderize\.predict -- --name xqznotaname --country-id US/)
  assert.doesNotMatch(output, /likely unknown at 0%/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Indian Pincode search without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'indianpincode.search',
      api: {
        provider: 'indianpincode',
        endpoint: 'GET /api/search?q={query}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        limitPolicy: 'search endpoint returns up to 10 mixed results; CLI caps at 10',
        detailPolicy: 'HTML detail pages are not scraped',
      },
      storage: { mode: 'online', persisted: false },
      query: { query: 'mumbai', limit: 10, type: 'all' },
      pagination: { returned: 2, upstreamCount: 2, limit: 10, maxLimit: 10 },
      results: [
        { type: 'district', districtName: 'Mumbai', stateName: 'Maharashtra', pincodesCount: 111, districtSlug: 'mumbai' },
        { type: 'pincode', code: '400001', postOfficeName: 'Mumbai GPO', districtName: 'Mumbai', stateName: 'Maharashtra', officeType: 'HO' },
      ],
    }, 'text'),
  )

  assert.match(output, /Indian Pincode Search/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /HTML detail pages are not scraped/)
  assert.match(output, /Mumbai GPO/)
  assert.match(output, /again public-apis apis run indianpincode\.search --online --persist -- --query mumbai --type all --limit 10/)
  assert.match(output, /replay public-apis apis run indianpincode\.search --offline -- --query mumbai --type all --limit 10/)
  assert.match(output, /pincode public-apis apis run indianpincode\.search --online --persist -- --query 400001 --type pincode --limit 10/)
  assert.match(output, /district public-apis apis run indianpincode\.search --online --persist -- --query Mumbai --type district --limit 10/)
  assert.doesNotMatch(output, /^\{/)

  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'indianpincode.search',
      api: {
        provider: 'indianpincode',
        endpoint: 'GET /api/search?q={query}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        limitPolicy: 'search endpoint returns up to 10 mixed results; CLI caps at 10',
        detailPolicy: 'HTML detail pages are not scraped',
      },
      storage: { mode: 'online', persisted: false },
      query: { query: 'zzzzzzzzzzzzzzz', limit: 10, type: 'all' },
      pagination: { returned: 0, upstreamCount: 0, limit: 10, maxLimit: 10 },
      results: [],
    }, 'text'),
  )
  assert.match(emptyOutput, /No Indian Pincode search results returned for this query/)
  assert.match(emptyOutput, /again public-apis apis run indianpincode\.search --online --persist -- --query zzzzzzzzzzzzzzz --type all --limit 10/)
  assert.match(emptyOutput, /replay public-apis apis run indianpincode\.search --offline -- --query zzzzzzzzzzzzzzz --type all --limit 10/)
  assert.match(emptyOutput, /broaden public-apis apis run indianpincode\.search --online --persist -- --query mumbai --type all --limit 10/)
  assert.match(emptyOutput, /pincode public-apis apis run indianpincode\.search --online --persist -- --query 110001 --type pincode --limit 10/)
  assert.doesNotMatch(emptyOutput, /^\{/)
})

test('text output renders PostalPinCode lookups without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'postalpincode.pincode',
      api: {
        provider: 'postalpincode',
        endpoint: 'GET /pincode/{pincode}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST via api.postalpincode.in; listed docs page is HTTP/HTML',
        limitPolicy: 'The upstream API does not expose pagination; CLI slices returned post offices locally.',
        detailPolicy: 'Only the documented JSON endpoints are implemented; postalpincode.in HTML search/detail pages are not scraped.',
      },
      storage: { mode: 'online', persisted: false },
      query: { pincode: '110001', limit: 10 },
      upstream: { status: 'Success', message: 'Number of Post office(s) found:2', count: 2 },
      pagination: { returned: 2, upstreamCount: 2, limit: 10, maxLimit: 50 },
      postOffices: [
        { name: 'Connaught Place', pincode: '110001', branchType: 'Sub Post Office', deliveryStatus: 'Non-Delivery', circle: 'Delhi', district: 'Central Delhi', division: 'New Delhi Central', region: 'Delhi', state: 'Delhi' },
        { name: 'New Delhi', pincode: '110001', branchType: 'Head Post Office', deliveryStatus: 'Delivery', circle: 'Delhi', district: 'New Delhi', division: 'New Delhi GPO', region: 'Delhi', state: 'Delhi' },
      ],
    }, 'text'),
  )

  assert.match(output, /PostalPinCode PIN Code Lookup/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /Connaught Place/)
  assert.match(output, /not scraped/)
  assert.match(output, /again public-apis apis run postalpincode\.pincode --online --persist -- --pincode 110001 --limit 10/)
  assert.match(output, /replay public-apis apis run postalpincode\.pincode --offline -- --pincode 110001 --limit 10/)
  assert.match(output, /office public-apis apis run postalpincode\.postOffice --online --persist -- --name 'Connaught Place' --limit 10/)
  assert.doesNotMatch(output, /^\{/)

  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'postalpincode.postOffice',
      api: {
        provider: 'postalpincode',
        endpoint: 'GET /postoffice/{name}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        limitPolicy: 'The upstream API does not expose pagination; CLI slices returned post offices locally.',
        detailPolicy: 'HTML search/detail pages are not scraped.',
      },
      storage: { mode: 'online', persisted: false },
      query: { name: 'zzzzzzzzzzzzzz', limit: 10 },
      upstream: { status: 'Error', message: 'No records found', count: 0 },
      pagination: { returned: 0, upstreamCount: 0, limit: 10, maxLimit: 50 },
      postOffices: [],
    }, 'text'),
  )
  assert.match(emptyOutput, /PostalPinCode Post Office Lookup/)
  assert.match(emptyOutput, /No PostalPinCode post office records returned/)
  assert.match(emptyOutput, /again public-apis apis run postalpincode\.postOffice --online --persist -- --name zzzzzzzzzzzzzz --limit 10/)
  assert.match(emptyOutput, /pincode public-apis apis run postalpincode\.pincode --online --persist -- --pincode 110001 --limit 10/)
  assert.doesNotMatch(emptyOutput, /^\{/)
})

test('text output renders Disify email and domain validation without fallback JSON', () => {
  const emailOutput = captureStdout(() =>
    printResult({
      kind: 'disify.email',
      api: {
        provider: 'disify',
        endpoint: 'GET /api/email/{email}',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { email: 'test@example.com' },
      validation: {
        format: true,
        domain: 'example.com',
        disposable: true,
        dns: true,
        confidence: 100,
        signals: ['blacklist_exact'],
        domainInfo: { tld: 'com', isSubdomain: false, parentDomain: null },
        mxInfo: ['mx.example.com'],
        role: false,
        free: false,
      },
      rateLimit: { limit: '30', remaining: '29' },
    }, 'text'),
  )

  assert.match(emailOutput, /Disify Email/)
  assert.match(emailOutput, /open REST API only · no auth/)
  assert.match(emailOutput, /test@example\.com/)
  assert.match(emailOutput, /disposable yes/)
  assert.match(emailOutput, /signals: blacklist_exact/)
  assert.doesNotMatch(emailOutput, /^\{/)

  const domainOutput = captureStdout(() =>
    printResult({
      kind: 'disify.domain',
      api: {
        provider: 'disify',
        endpoint: 'GET /api/domain/{domain}',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { domain: 'gmail.com' },
      validation: {
        format: true,
        domain: 'gmail.com',
        disposable: false,
        dns: true,
        confidence: 0,
        signals: [],
        domainInfo: { tld: 'com', isSubdomain: false, parentDomain: null },
        mxInfo: ['gmail-smtp-in.l.google.com'],
        role: false,
        free: true,
        whitelist: true,
      },
      rateLimit: { limit: '30', remaining: '28' },
    }, 'text'),
  )

  assert.match(domainOutput, /Disify Domain/)
  assert.match(domainOutput, /open REST API only · no auth/)
  assert.match(domainOutput, /gmail\.com/)
  assert.match(domainOutput, /free yes/)
  assert.match(domainOutput, /whitelist yes/)
  assert.doesNotMatch(domainOutput, /^\{/)
})


test('text output renders Kickbox disposable check without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'kickbox.disposable',
      api: {
        provider: 'kickbox-open',
        endpoint: 'GET /v1/disposable/{emailOrDomain}',
        authentication: 'none',
        usesBrowserClickstream: false,
        scope: 'Disposable email/domain detection only',
      },
      query: { target: 'gmail.com' },
      result: { target: 'gmail.com', disposable: false },
    }, 'text'),
  )

  assert.match(output, /Kickbox Disposable/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /gmail\.com/)
  assert.match(output, /disposable no/)
  assert.match(output, /try disposable public-apis apis run kickbox\.disposable -- --target mailinator\.com/)
  assert.match(output, /deeper check public-apis apis run usercheck\.email -- --email test@gmail\.com/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Kickbox disposable comparison without repeating same target', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'kickbox.disposable',
      api: {
        provider: 'kickbox-open',
        endpoint: 'GET /v1/disposable/{emailOrDomain}',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultTarget: 'gmail.com',
        scope: 'Disposable email/domain detection only',
      },
      query: { target: 'mailinator.com' },
      result: { target: 'mailinator.com', disposable: true },
    }, 'text'),
  )

  assert.match(output, /mailinator\.com disposable yes/)
  assert.match(output, /compare public-apis apis run kickbox\.disposable -- --target gmail\.com/)
  assert.match(output, /deeper check public-apis apis run usercheck\.email -- --email test@mailinator\.com/)
  assert.doesNotMatch(output, /try disposable public-apis apis run kickbox\.disposable -- --target mailinator\.com/)
  assert.doesNotMatch(output, /^\{/)
})


test('text output renders UserCheck email validation without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'usercheck.email',
      api: {
        provider: 'usercheck',
        endpoint: 'GET /email/{email}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rebrand: 'MailCheck.ai is now UserCheck.com',
      },
      query: { email: 'test@example.com' },
      validation: {
        status: 200,
        email: 'test@example.com',
        normalizedEmail: 'test@example.com',
        domain: 'example.com',
        domainAgeInDays: 11220,
        mx: false,
        mxRecords: [],
        mxProviders: [],
        disposable: false,
        publicDomain: false,
        relayDomain: false,
        alias: false,
        roleAccount: true,
        spam: false,
        didYouMean: null,
      },
      rateLimit: { limit: '5', remaining: '4' },
    }, 'text'),
  )

  assert.match(output, /UserCheck Email/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /test@example\.com/)
  assert.match(output, /role yes/)
  assert.match(output, /remaining 4 \/ 5/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /compare public-apis apis run usercheck\.email -- --email test@mailinator\.com/)
  assert.doesNotMatch(output, /next public-apis apis run usercheck\.email -- --email test@example\.com/)
  assert.doesNotMatch(output, /^\{/)
})


test('text output renders Energi Data Service datasets without fallback JSON', () => {
  const rightNowOutput = captureStdout(() =>
    printResult({
      kind: 'energidataservice.rightnow',
      api: {
        provider: 'energidataservice',
        endpoint: 'GET /dataset/PowerSystemRightNow',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultLimit: 100,
        requestGuidance: 'Maximum 1 request per unique IP address per dataset per minute',
      },
      query: { start: 'now-PT15M', limit: 5 },
      pagination: { total: 15, returned: 1, limit: 5 },
      records: [
        {
          Minutes1UTC: '2026-05-03T19:15:00',
          CO2Emission: 114.37,
          ProductionGe100MW: 708.59,
          ProductionLt100MW: 467.9,
          SolarPower: 7.23,
          OffshoreWindPower: 374.96,
          OnshoreWindPower: 154.3,
          Exchange_Sum: 2310.19,
        },
      ],
      rateLimit: { totalCalls: '40', remainingCalls: '39' },
    }, 'text'),
  )

  assert.match(rightNowOutput, /Energi Data Service Right Now/)
  assert.match(rightNowOutput, /open REST API only · no auth/)
  assert.match(rightNowOutput, /CO2 114\.37/)
  assert.match(rightNowOutput, /no Chrome clickstream/)
  assert.doesNotMatch(rightNowOutput, /^\{/)

  const rightNowEmptyOutput = captureStdout(() =>
    printResult({
      kind: 'energidataservice.rightnow',
      api: {
        provider: 'energidataservice',
        endpoint: 'GET /dataset/PowerSystemRightNow',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultLimit: 100,
        requestGuidance: 'Maximum 1 request per unique IP address per dataset per minute',
      },
      query: { start: 'now-PT15M', limit: 5 },
      pagination: { total: 0, returned: 0, limit: 5 },
      records: [],
      rateLimit: { totalCalls: '40', remainingCalls: '39' },
    }, 'text'),
  )

  assert.match(rightNowEmptyOutput, /No Energi Data Service right-now records returned/)
  assert.match(rightNowEmptyOutput, /public-apis apis run energidataservice\.rightnow -- --start now-PT1H --limit 5/)
  assert.match(rightNowEmptyOutput, /public-apis apis run energidataservice\.elspotprices -- --price-area DK1 --limit 24/)
  assert.doesNotMatch(rightNowEmptyOutput, /^\{/)

  const elspotOutput = captureStdout(() =>
    printResult({
      kind: 'energidataservice.elspotprices',
      api: {
        provider: 'energidataservice',
        endpoint: 'GET /dataset/Elspotprices',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultLimit: 100,
        requestGuidance: 'Maximum 1 request per unique IP address per dataset per minute',
      },
      query: { priceArea: 'DK1', sort: 'HourUTC desc', limit: 5 },
      pagination: { total: 230124, returned: 1, limit: 5 },
      records: [
        {
          HourUTC: '2025-09-30T21:00:00',
          PriceArea: 'DK1',
          SpotPriceDKK: 690.700059,
          SpotPriceEUR: 92.54,
        },
      ],
      rateLimit: { totalCalls: '40', remainingCalls: '38' },
    }, 'text'),
  )

  assert.match(elspotOutput, /Energi Data Service Elspot Prices/)
  assert.match(elspotOutput, /open REST API only · no auth/)
  assert.match(elspotOutput, /92\.54 EUR\/MWh/)
  assert.match(elspotOutput, /no Chrome clickstream/)
  assert.doesNotMatch(elspotOutput, /^\{/)

  const elspotEmptyOutput = captureStdout(() =>
    printResult({
      kind: 'energidataservice.elspotprices',
      api: {
        provider: 'energidataservice',
        endpoint: 'GET /dataset/Elspotprices',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultLimit: 100,
        requestGuidance: 'Maximum 1 request per unique IP address per dataset per minute',
      },
      query: { priceArea: 'DK1', sort: 'HourUTC desc', limit: 5, start: 'now-PT24H' },
      pagination: { total: 0, returned: 0, limit: 5 },
      records: [],
      rateLimit: { totalCalls: '40', remainingCalls: '38' },
    }, 'text'),
  )

  assert.match(elspotEmptyOutput, /No Energi Data Service elspot price records returned/)
  assert.match(elspotEmptyOutput, /public-apis apis run energidataservice\.elspotprices -- --price-area DK1 --limit 5/)
  assert.match(elspotEmptyOutput, /public-apis apis run energidataservice\.elspotprices -- --price-area DK1 --start 2025-09-30T00:00 --end 2025-10-01T00:00 --limit 5/)
  assert.doesNotMatch(elspotEmptyOutput, /^\{/)
})

test('text output renders EPA UV forecasts without fallback JSON', () => {
  const hourlyOutput = captureStdout(() =>
    printResult({
      kind: 'epa.uvHourly',
      api: {
        provider: 'epa',
        endpoint: 'GET /dmapservice/getEnvirofactsUVHOURLY/ZIP/{zip}/JSON',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        service: 'EPA DMAP-EF RESTful Data Service',
        limitPolicy: 'complete hourly ZIP forecast',
      },
      storage: { mode: 'online', persisted: false },
      query: { zip: '20050', limit: 21 },
      pagination: { returned: 2, limit: 21, maxLimit: 21 },
      forecasts: [
        { order: 1, zip: '20050', city: 'Washington', state: 'DC', dateTime: 'May/04/2026 08 AM', uvValue: 0 },
        { order: 2, zip: '20050', city: 'Washington', state: 'DC', dateTime: 'May/04/2026 09 AM', uvValue: 2 },
      ],
    }, 'text'),
  )
  assert.match(hourlyOutput, /EPA UV Hourly Forecast/)
  assert.match(hourlyOutput, /open REST API only · no auth/)
  assert.match(hourlyOutput, /no Chrome clickstream/)
  assert.match(hourlyOutput, /UV 2/)
  assert.match(hourlyOutput, /again public-apis apis run epa\.uvHourly --online --persist -- --zip 20050 --limit 21/)
  assert.match(hourlyOutput, /replay public-apis apis run epa\.uvHourly --offline -- --zip 20050 --limit 21/)
  assert.match(hourlyOutput, /daily public-apis apis run epa\.uvDaily --online --persist -- --zip 20050/)
  assert.doesNotMatch(hourlyOutput, /^\{/)

  const dailyOutput = captureStdout(() =>
    printResult({
      kind: 'epa.uvDaily',
      api: {
        provider: 'epa',
        endpoint: 'GET /dmapservice/getEnvirofactsUVDAILY/ZIP/{zip}/JSON',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        service: 'EPA DMAP-EF RESTful Data Service',
        limitPolicy: 'EPA UV daily ZIP responses return one daily forecast list for a single ZIP Code lookup.',
      },
      storage: { mode: 'online', persisted: true },
      query: { zip: '20050' },
      count: 1,
      forecasts: [{ zip: '20050', city: 'Washington', state: 'DC', date: 'May/04/2026', uvIndex: 7, uvAlert: false }],
    }, 'text'),
  )
  assert.match(dailyOutput, /EPA UV Daily Forecast/)
  assert.match(dailyOutput, /Washington, DC/)
  assert.match(dailyOutput, /alert no/)
  assert.match(dailyOutput, /open REST API only · no auth/)
  assert.match(dailyOutput, /again public-apis apis run epa\.uvDaily --online --persist -- --zip 20050/)
  assert.match(dailyOutput, /replay public-apis apis run epa\.uvDaily --offline -- --zip 20050/)
  assert.match(dailyOutput, /hourly public-apis apis run epa\.uvHourly --online --persist -- --zip 20050 --limit 21/)
  assert.doesNotMatch(dailyOutput, /^\{/)

  const emptyHourlyOutput = captureStdout(() =>
    printResult({
      kind: 'epa.uvHourly',
      api: {
        provider: 'epa',
        endpoint: 'GET /dmapservice/getEnvirofactsUVHOURLY/ZIP/{zip}/JSON',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        service: 'EPA DMAP-EF RESTful Data Service',
        limitPolicy: 'complete hourly ZIP forecast',
      },
      storage: { mode: 'online', persisted: false },
      query: { zip: '00000', limit: 21 },
      pagination: { returned: 0, limit: 21, maxLimit: 21 },
      forecasts: [],
    }, 'text'),
  )
  assert.match(emptyHourlyOutput, /No EPA hourly UV forecasts returned for this ZIP Code/)
  assert.match(emptyHourlyOutput, /again public-apis apis run epa\.uvHourly --online --persist -- --zip 00000 --limit 21/)
  assert.match(emptyHourlyOutput, /daily public-apis apis run epa\.uvDaily --online --persist -- --zip 00000/)
  assert.doesNotMatch(emptyHourlyOutput, /^\{/)

  const emptyDailyOutput = captureStdout(() =>
    printResult({
      kind: 'epa.uvDaily',
      api: {
        provider: 'epa',
        endpoint: 'GET /dmapservice/getEnvirofactsUVDAILY/ZIP/{zip}/JSON',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        service: 'EPA DMAP-EF RESTful Data Service',
      },
      storage: { mode: 'online', persisted: false },
      query: { zip: '00000' },
      count: 0,
      forecasts: [],
    }, 'text'),
  )
  assert.match(emptyDailyOutput, /No EPA daily UV forecast returned for this ZIP Code/)
  assert.match(emptyDailyOutput, /again public-apis apis run epa\.uvDaily --online --persist -- --zip 00000/)
  assert.match(emptyDailyOutput, /hourly public-apis apis run epa\.uvHourly --online --persist -- --zip 00000 --limit 21/)
  assert.doesNotMatch(emptyDailyOutput, /^\{/)
})

test('text output renders UK Carbon Intensity current data without fallback JSON', () => {
  const intensityOutput = captureStdout(() =>
    printResult({
      kind: 'ukcarbonintensity.intensity',
      api: {
        provider: 'ukcarbonintensity',
        endpoint: 'GET /intensity',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: {},
      reading: {
        from: '2026-05-03T19:00Z',
        to: '2026-05-03T19:30Z',
        forecast: 212,
        actual: 204,
        index: 'high',
      },
      pagination: { returned: 1 },
    }, 'text'),
  )

  assert.match(intensityOutput, /UK Carbon Intensity/)
  assert.match(intensityOutput, /open REST API only · no auth/)
  assert.match(intensityOutput, /forecast 212 gCO2\/kWh/)
  assert.match(intensityOutput, /no Chrome clickstream/)
  assert.doesNotMatch(intensityOutput, /^\{/)

  const generationOutput = captureStdout(() =>
    printResult({
      kind: 'ukcarbonintensity.generation',
      api: {
        provider: 'ukcarbonintensity',
        endpoint: 'GET /generation',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: {},
      window: {
        from: '2026-05-03T19:00Z',
        to: '2026-05-03T19:30Z',
      },
      generationMix: [
        { fuel: 'gas', percentage: 46.1 },
        { fuel: 'wind', percentage: 8.3 },
      ],
      pagination: { returned: 2 },
    }, 'text'),
  )

  assert.match(generationOutput, /UK Carbon Generation Mix/)
  assert.match(generationOutput, /open REST API only · no auth/)
  assert.match(generationOutput, /gas 46\.1%/)
  assert.match(generationOutput, /no Chrome clickstream/)
  assert.doesNotMatch(generationOutput, /^\{/)

  const emptyIntensityOutput = captureStdout(() =>
    printResult({
      kind: 'ukcarbonintensity.intensity',
      api: { provider: 'ukcarbonintensity', endpoint: 'GET /intensity', authentication: 'none', usesBrowserClickstream: false },
      query: {},
      reading: {},
      pagination: { returned: 0 },
    }, 'text'),
  )
  assert.match(emptyIntensityOutput, /No UK Carbon Intensity current reading returned/)
  assert.match(emptyIntensityOutput, /public-apis apis run ukcarbonintensity\.intensity/)
  assert.match(emptyIntensityOutput, /public-apis apis run ukcarbonintensity\.generation/)
  assert.doesNotMatch(emptyIntensityOutput, /^\{/)

  const emptyGenerationOutput = captureStdout(() =>
    printResult({
      kind: 'ukcarbonintensity.generation',
      api: { provider: 'ukcarbonintensity', endpoint: 'GET /generation', authentication: 'none', usesBrowserClickstream: false },
      query: {},
      window: {},
      generationMix: [],
      pagination: { returned: 0 },
    }, 'text'),
  )
  assert.match(emptyGenerationOutput, /No UK Carbon Intensity generation mix returned/)
  assert.match(emptyGenerationOutput, /public-apis apis run ukcarbonintensity\.generation/)
  assert.match(emptyGenerationOutput, /public-apis apis run ukcarbonintensity\.intensity/)
  assert.doesNotMatch(emptyGenerationOutput, /^\{/)
})


test('text output renders Brazil Central Bank datasets and SGS without fallback JSON', () => {
  const datasetsOutput = captureStdout(() => printResult({
    kind: 'brazilcentralbank.datasets',
    api: { provider: 'brazilcentralbank', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: false },
    query: { query: 'selic', rows: 100, start: 0 },
    pagination: { returned: 1, rows: 100, start: 0, total: 1, maxRows: 100 },
    datasets: [{ name: 'estatisticas-selic-operacoes', title: 'Estatísticas Selic', organization: 'Banco Central do Brasil', resourceCount: 12, metadataModified: '2026-04-30T20:03:02.002192' }],
  }, 'text'))
  assert.match(datasetsOutput, /Brazil Central Bank Datasets/)
  assert.match(datasetsOutput, /open REST API only · no auth/)
  assert.match(datasetsOutput, /again public-apis apis run brazilcentralbank\.datasets --online --persist -- --query selic --rows 100 --start 0/)
  assert.match(datasetsOutput, /replay public-apis apis run brazilcentralbank\.datasets --offline -- --query selic --rows 100 --start 0/)
  assert.match(datasetsOutput, /sgs public-apis apis run brazilcentralbank\.sgsLatest --online --persist -- --series-code 11 --limit 20/)
  assert.match(datasetsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetsOutput, /^\{/)

  const sgsOutput = captureStdout(() => printResult({
    kind: 'brazilcentralbank.sgsLatest',
    api: { provider: 'brazilcentralbank', endpoint: 'GET /dados/serie/bcdata.sgs.{seriesCode}/dados/ultimos/{limit}', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: true },
    query: { seriesCode: 11, limit: 20 },
    series: { code: 11, name: 'SELIC overnight rate' },
    pagination: { returned: 1, limit: 20, maxLimit: 100 },
    observations: [{ date: '30/04/2026', value: 0.0534, rawValue: '0.053400' }],
  }, 'text'))
  assert.match(sgsOutput, /Brazil Central Bank SGS Latest/)
  assert.match(sgsOutput, /SELIC overnight rate/)
  assert.match(sgsOutput, /open REST API only · no auth/)
  assert.match(sgsOutput, /again public-apis apis run brazilcentralbank\.sgsLatest --online --persist -- --series-code 11 --limit 20/)
  assert.match(sgsOutput, /replay public-apis apis run brazilcentralbank\.sgsLatest --offline -- --series-code 11 --limit 20/)
  assert.match(sgsOutput, /datasets public-apis apis run brazilcentralbank\.datasets --online --persist -- --query selic --rows 100/)
  assert.doesNotMatch(sgsOutput, /^\{/)

  const emptyDatasetsOutput = captureStdout(() => printResult({
    kind: 'brazilcentralbank.datasets',
    api: { provider: 'brazilcentralbank', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: false },
    query: { query: 'zzznotrealzz', rows: 5, start: 0 },
    pagination: { returned: 0, rows: 5, start: 0, total: 0, maxRows: 100 },
    datasets: [],
  }, 'text'))
  assert.match(emptyDatasetsOutput, /No Banco Central do Brasil datasets matched/)
  assert.match(emptyDatasetsOutput, /try public-apis apis run brazilcentralbank\.datasets --online --persist -- --query selic --rows 100/)
  assert.match(emptyDatasetsOutput, /sgs public-apis apis run brazilcentralbank\.sgsLatest --online --persist -- --series-code 11 --limit 20/)

  const emptySgsOutput = captureStdout(() => printResult({
    kind: 'brazilcentralbank.sgsLatest',
    api: { provider: 'brazilcentralbank', endpoint: 'GET /dados/serie/bcdata.sgs.{seriesCode}/dados/ultimos/{limit}', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: false },
    query: { seriesCode: 999999, limit: 5 },
    series: { code: 999999, name: 'SGS series 999999' },
    pagination: { returned: 0, limit: 5, maxLimit: 20 },
    observations: [],
  }, 'text'))
  assert.match(emptySgsOutput, /No Banco Central do Brasil SGS observations returned/)
  assert.match(emptySgsOutput, /try public-apis apis run brazilcentralbank\.sgsLatest --online --persist -- --series-code 11 --limit 20/)
  assert.match(emptySgsOutput, /datasets public-apis apis run brazilcentralbank\.datasets --online --persist -- --query selic --rows 100/)
})

test('text output renders Data USA population and geographies without fallback JSON', () => {
  const populationOutput = captureStdout(() =>
    printResult({
      kind: 'datausa.population',
      api: { provider: 'datausa', endpoint: 'GET /tesseract/data.jsonrecords', authentication: 'none', usesBrowserClickstream: false },
      query: { drilldown: 'State', year: 'latest', geographyId: '04000US06', limit: 20, offset: 0 },
      source: { cube: 'acs_yg_total_population_5', datasetName: 'ACS 5-year Estimate', sourceName: 'Census Bureau', tableId: 'B01003' },
      page: { limit: 20, offset: 0, total: 1 },
      count: 1,
      rows: [
        { geographyId: '04000US06', geography: 'California', year: 2024, population: 39287377 },
      ],
    }, 'text'),
  )

  assert.match(populationOutput, /Data USA Population/)
  assert.match(populationOutput, /open REST API only · no auth/)
  assert.match(populationOutput, /California/)
  assert.match(populationOutput, /39,287,377/)
  assert.match(populationOutput, /again public-apis apis run datausa\.population --online --persist -- --drilldown State --geography-id 04000US06 --year latest --limit 20 --offset 0/)
  assert.match(populationOutput, /replay public-apis apis run datausa\.population --offline -- --drilldown State --geography-id 04000US06 --year latest --limit 20 --offset 0/)
  assert.match(populationOutput, /geographies public-apis apis run datausa\.geographies --online --persist -- --level State --limit 100/)
  assert.match(populationOutput, /no Chrome clickstream/)
  assert.doesNotMatch(populationOutput, /^\{/)

  const geographiesOutput = captureStdout(() =>
    printResult({
      kind: 'datausa.geographies',
      api: { provider: 'datausa', endpoint: 'GET /tesseract/members', authentication: 'none', usesBrowserClickstream: false },
      query: { level: 'State', query: 'Cal', limit: 20 },
      geography: { name: 'State', caption: 'State', depth: 1 },
      count: 1,
      members: [
        { key: '04000US06', caption: 'California' },
      ],
      pagination: { returned: 1, limit: 20, maxLimit: 100 },
    }, 'text'),
  )

  assert.match(geographiesOutput, /Data USA Geographies/)
  assert.match(geographiesOutput, /open REST API only · no auth/)
  assert.match(geographiesOutput, /California/)
  assert.match(geographiesOutput, /again public-apis apis run datausa\.geographies --online --persist -- --level State --query Cal --limit 20/)
  assert.match(geographiesOutput, /replay public-apis apis run datausa\.geographies --offline -- --level State --query Cal --limit 20/)
  assert.match(geographiesOutput, /population public-apis apis run datausa\.population --online --persist -- --drilldown State --geography-id 04000US06 --year latest --limit 100/)
  assert.match(geographiesOutput, /no Chrome clickstream/)
  assert.doesNotMatch(geographiesOutput, /^\{/)

  const emptyPopulationOutput = captureStdout(() =>
    printResult({
      kind: 'datausa.population',
      api: { provider: 'datausa', endpoint: 'GET /tesseract/data.jsonrecords', authentication: 'none', usesBrowserClickstream: false },
      query: { drilldown: 'State', year: '1900', geographyId: '04000US06', limit: 20, offset: 0 },
      source: { cube: 'acs_yg_total_population_5', datasetName: 'ACS 5-year Estimate', sourceName: 'Census Bureau', tableId: 'B01003' },
      page: { limit: 20, offset: 0, total: 0 },
      count: 0,
      rows: [],
    }, 'text'),
  )
  assert.match(emptyPopulationOutput, /No Data USA population rows returned/)
  assert.match(emptyPopulationOutput, /try public-apis apis run datausa\.population --online --persist -- --drilldown State --geography-id 04000US06 --year latest --limit 100/)
  assert.match(emptyPopulationOutput, /geographies public-apis apis run datausa\.geographies --online --persist -- --level State --limit 100/)

  const emptyGeographiesOutput = captureStdout(() =>
    printResult({
      kind: 'datausa.geographies',
      api: { provider: 'datausa', endpoint: 'GET /tesseract/members', authentication: 'none', usesBrowserClickstream: false },
      query: { level: 'State', query: 'zzzz', limit: 5 },
      geography: { name: 'State', caption: 'State', depth: 1 },
      count: 0,
      members: [],
      pagination: { returned: 0, limit: 5, maxLimit: 100 },
    }, 'text'),
  )
  assert.match(emptyGeographiesOutput, /No Data USA geography members matched/)
  assert.match(emptyGeographiesOutput, /try public-apis apis run datausa\.geographies --online --persist -- --level State --query California --limit 100/)
  assert.match(emptyGeographiesOutput, /population public-apis apis run datausa\.population --online --persist -- --drilldown State --geography-id 04000US06 --year latest --limit 100/)
})

test('text output renders Fed Treasury debt and rates without fallback JSON', () => {
  const debtOutput = captureStdout(() =>
    printResult({
      kind: 'fedtreasury.debt',
      api: { provider: 'fedtreasury', endpoint: 'GET /services/api/fiscal_service/v2/accounting/od/debt_to_penny', authentication: 'none', usesBrowserClickstream: false },
      query: { pageNumber: 1, pageSize: 1 },
      meta: { returned: 1, totalCount: 8298, totalPages: 8298, pageNumber: 1, pageSize: 1, maxPageSize: 100, labels: {} },
      count: 1,
      rows: [
        { recordDate: '2026-04-30', totalPublicDebtOutstanding: 38967833861543.11, intragovernmentalHoldings: 7695343996107.23, debtHeldByPublic: 31272489865435.88 },
      ],
    }, 'text'),
  )

  assert.match(debtOutput, /Fed Treasury Debt/)
  assert.match(debtOutput, /open REST API only · no auth/)
  assert.match(debtOutput, /\$38,967,833,861,543/)
  assert.match(debtOutput, /no Chrome clickstream/)
  assert.doesNotMatch(debtOutput, /^\{/)

  const ratesOutput = captureStdout(() =>
    printResult({
      kind: 'fedtreasury.rates',
      api: { provider: 'fedtreasury', endpoint: 'GET /services/api/fiscal_service/v2/accounting/od/avg_interest_rates', authentication: 'none', usesBrowserClickstream: false },
      query: { pageNumber: 1, pageSize: 5 },
      meta: { returned: 2, totalCount: 4929, totalPages: 986, pageNumber: 1, pageSize: 5, maxPageSize: 100, labels: {} },
      count: 2,
      rows: [
        { recordDate: '2026-03-31', securityDescription: 'Treasury Bills', averageInterestRate: 3.702, sourceLineNumber: 1 },
        { recordDate: '2026-03-31', securityDescription: 'Treasury Notes', averageInterestRate: 3.212, sourceLineNumber: 2 },
      ],
    }, 'text'),
  )

  assert.match(ratesOutput, /Fed Treasury Average Rates/)
  assert.match(ratesOutput, /open REST API only · no auth/)
  assert.match(ratesOutput, /Treasury Bills/)
  assert.match(ratesOutput, /3\.7%/)
  assert.match(ratesOutput, /no Chrome clickstream/)
  assert.doesNotMatch(ratesOutput, /^\{/)

  const emptyDebtOutput = captureStdout(() =>
    printResult({
      kind: 'fedtreasury.debt',
      api: { provider: 'fedtreasury', endpoint: 'GET /services/api/fiscal_service/v2/accounting/od/debt_to_penny', authentication: 'none', usesBrowserClickstream: false },
      query: { pageNumber: 1, pageSize: 5, recordDate: '1900-01-01' },
      meta: { returned: 0, totalCount: 0, totalPages: 0, pageNumber: 1, pageSize: 5, maxPageSize: 100, labels: {} },
      count: 0,
      rows: [],
    }, 'text'),
  )
  assert.match(emptyDebtOutput, /No Fed Treasury debt rows returned/)
  assert.match(emptyDebtOutput, /public-apis apis run fedtreasury\.debt -- --page-size 5/)
  assert.match(emptyDebtOutput, /public-apis apis run fedtreasury\.rates -- --page-size 100/)
  assert.doesNotMatch(emptyDebtOutput, /^\{/)

  const emptyRatesOutput = captureStdout(() =>
    printResult({
      kind: 'fedtreasury.rates',
      api: { provider: 'fedtreasury', endpoint: 'GET /services/api/fiscal_service/v2/accounting/od/avg_interest_rates', authentication: 'none', usesBrowserClickstream: false },
      query: { pageNumber: 1, pageSize: 5, securityDesc: 'Unknown Security' },
      meta: { returned: 0, totalCount: 0, totalPages: 0, pageNumber: 1, pageSize: 5, maxPageSize: 100, labels: {} },
      count: 0,
      rows: [],
    }, 'text'),
  )
  assert.match(emptyRatesOutput, /No Fed Treasury average interest rate rows returned/)
  assert.match(emptyRatesOutput, /public-apis apis run fedtreasury\.rates -- --page-size 5/)
  assert.match(emptyRatesOutput, /public-apis apis run fedtreasury\.rates -- --security-desc 'Treasury Bills' --page-size 100/)
  assert.match(emptyRatesOutput, /public-apis apis run fedtreasury\.debt -- --page-size 100/)
  assert.doesNotMatch(emptyRatesOutput, /^\{/)
})

test('text output renders Food Standards Agency authorities and establishments without fallback JSON', () => {
  const authoritiesOutput = captureStdout(() =>
    printResult({
      kind: 'foodstandardsagency.authorities',
      api: {
        provider: 'foodstandardsagency',
        endpoint: 'GET /Authorities/basic',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        apiVersion: '2',
        limitPolicy: 'pageSize defaults/caps at 5000 rows per request',
      },
      storage: { mode: 'online', persisted: false },
      query: { limit: 5000 },
      pagination: { returned: 1, limit: 5000, maxLimit: 5000 },
      meta: { returnCode: 'OK' },
      authorities: [
        { id: 197, code: '760', name: 'Aberdeen City', establishmentCount: 2261, schemeType: 2 },
      ],
    }, 'text'),
  )

  assert.match(authoritiesOutput, /Food Standards Agency Authorities/)
  assert.match(authoritiesOutput, /open REST API only · no auth/)
  assert.match(authoritiesOutput, /no Chrome clickstream/)
  assert.match(authoritiesOutput, /Aberdeen City/)
  assert.match(authoritiesOutput, /2,261/)
  assert.match(authoritiesOutput, /again public-apis apis run foodstandardsagency\.authorities --online --persist -- --limit 5000/)
  assert.match(authoritiesOutput, /replay public-apis apis run foodstandardsagency\.authorities --offline -- --limit 5000/)
  assert.match(authoritiesOutput, /establishments public-apis apis run foodstandardsagency\.establishments --online --persist -- --query coffee --page-size 5000 --page-number 1/)
  assert.match(authoritiesOutput, /authority public-apis apis run foodstandardsagency\.establishments --online --persist -- --query coffee --local-authority-id 197 --page-size 5000 --page-number 1/)
  assert.doesNotMatch(authoritiesOutput, /^\{/)

  const establishmentsOutput = captureStdout(() =>
    printResult({
      kind: 'foodstandardsagency.establishments',
      api: {
        provider: 'foodstandardsagency',
        endpoint: 'GET /Establishments',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        apiVersion: '2',
        limitPolicy: 'pageSize defaults/caps at 5000 rows per request',
      },
      storage: { mode: 'online', persisted: true },
      query: { query: 'coffee', pageSize: 5000, pageNumber: 1 },
      pagination: { returned: 1, totalCount: 11613, totalPages: 12, pageSize: 5000, maxPageSize: 5000, pageNumber: 1 },
      meta: { returnCode: 'OK' },
      establishments: [
        {
          id: 1830226,
          businessName: 'Coffey Coffee',
          businessType: 'Mobile caterer',
          ratingValue: '5',
          ratingDate: '2025-05-06T00:00:00',
          localAuthorityName: 'Darlington',
          postCode: 'DL2',
          scores: { hygiene: 0, structural: 0, confidenceInManagement: 0 },
        },
      ],
    }, 'text'),
  )

  assert.match(establishmentsOutput, /Food Standards Agency Establishments/)
  assert.match(establishmentsOutput, /open REST API only · no auth/)
  assert.match(establishmentsOutput, /Coffey Coffee/)
  assert.match(establishmentsOutput, /hygiene 0/)
  assert.match(establishmentsOutput, /again public-apis apis run foodstandardsagency\.establishments --online --persist -- --query coffee --page-size 5000 --page-number 1/)
  assert.match(establishmentsOutput, /replay public-apis apis run foodstandardsagency\.establishments --offline -- --query coffee --page-size 5000 --page-number 1/)
  assert.match(establishmentsOutput, /more public-apis apis run foodstandardsagency\.establishments --online --persist -- --query coffee --page-size 5000 --page-number 2/)
  assert.match(establishmentsOutput, /authorities public-apis apis run foodstandardsagency\.authorities --online --persist -- --limit 5000/)
  assert.match(establishmentsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(establishmentsOutput, /^\{/)

  const emptyEstablishmentsOutput = captureStdout(() =>
    printResult({
      kind: 'foodstandardsagency.establishments',
      api: {
        provider: 'foodstandardsagency',
        endpoint: 'GET /Establishments',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        apiVersion: '2',
        limitPolicy: 'pageSize defaults/caps at 5000 rows per request',
      },
      storage: { mode: 'online', persisted: false },
      query: { query: 'zzzzzzzzzzzzzzzzzzzzzzzzz', pageSize: 5, pageNumber: 1 },
      pagination: { returned: 0, totalCount: 0, totalPages: 0, pageSize: 5, maxPageSize: 5000, pageNumber: 1 },
      meta: { returnCode: 'OK', totalCount: 0, totalPages: 0 },
      establishments: [],
    }, 'text'),
  )
  assert.match(emptyEstablishmentsOutput, /No Food Standards Agency establishments returned for this query/)
  assert.match(emptyEstablishmentsOutput, /again public-apis apis run foodstandardsagency\.establishments --online --persist -- --query zzzzzzzzzzzzzzzzzzzzzzzzz --page-size 5 --page-number 1/)
  assert.match(emptyEstablishmentsOutput, /replay public-apis apis run foodstandardsagency\.establishments --offline -- --query zzzzzzzzzzzzzzzzzzzzzzzzz --page-size 5 --page-number 1/)
  assert.match(emptyEstablishmentsOutput, /broaden public-apis apis run foodstandardsagency\.establishments --online --persist -- --query coffee --page-size 5000 --page-number 1/)
  assert.match(emptyEstablishmentsOutput, /authorities public-apis apis run foodstandardsagency\.authorities --online --persist -- --limit 5000/)
  assert.doesNotMatch(emptyEstablishmentsOutput, /^\{/)
})

test('text output renders MFapi search and latest NAV without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'mfapi.search',
      api: { provider: 'mfapi', endpoint: 'GET /mf/search', authentication: 'none', usesBrowserClickstream: false },
      query: { query: 'SBI', limit: 20 },
      count: 1,
      schemes: [
        { schemeCode: 125497, schemeName: 'SBI Small Cap Fund - Direct Plan - Growth' },
      ],
      pagination: { returned: 1, limit: 20, maxLimit: 100 },
    }, 'text'),
  )

  assert.match(searchOutput, /Indian Mutual Fund Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /SBI Small Cap/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const latestOutput = captureStdout(() =>
    printResult({
      kind: 'mfapi.latest',
      api: { provider: 'mfapi', endpoint: 'GET /mf/{schemeCode}/latest', authentication: 'none', usesBrowserClickstream: false },
      query: { schemeCode: 125497 },
      fund: {
        fundHouse: 'SBI Mutual Fund',
        schemeType: 'Open Ended Schemes',
        schemeCategory: 'Equity Scheme - Small Cap Fund',
        schemeCode: 125497,
        schemeName: 'SBI Small Cap Fund - Direct Plan - Growth',
        isinGrowth: 'INF200K01T51',
      },
      nav: { date: '30-04-2026', nav: 193.4131 },
      status: 'SUCCESS',
      count: 1,
    }, 'text'),
  )

  assert.match(latestOutput, /Indian Mutual Fund Latest NAV/)
  assert.match(latestOutput, /open REST API only · no auth/)
  assert.match(latestOutput, /NAV 193\.41/)
  assert.match(latestOutput, /public-apis apis run mfapi\.search -- --query 'SBI Mutual Fund' --limit 100/)
  assert.match(latestOutput, /no Chrome clickstream/)
  assert.doesNotMatch(latestOutput, /^\{/)

  const emptySearchOutput = captureStdout(() =>
    printResult({
      kind: 'mfapi.search',
      api: { provider: 'mfapi', endpoint: 'GET /mf/search', authentication: 'none', usesBrowserClickstream: false },
      query: { query: 'zzzzzzznomatch', limit: 5 },
      count: 0,
      schemes: [],
      pagination: { returned: 0, limit: 5, maxLimit: 100 },
    }, 'text'),
  )
  assert.match(emptySearchOutput, /No MFapi mutual fund schemes matched this query/)
  assert.match(emptySearchOutput, /public-apis apis run mfapi\.search -- --query zzzzzzznomatch --limit 5/)
  assert.match(emptySearchOutput, /public-apis apis run mfapi\.latest -- --scheme-code 125497/)
  assert.doesNotMatch(emptySearchOutput, /^\{/)

  const emptyLatestOutput = captureStdout(() =>
    printResult({
      kind: 'mfapi.latest',
      api: { provider: 'mfapi', endpoint: 'GET /mf/{schemeCode}/latest', authentication: 'none', usesBrowserClickstream: false },
      query: { schemeCode: 999999999 },
      fund: { schemeCode: 0 },
      status: 'SUCCESS',
      count: 0,
    }, 'text'),
  )
  assert.match(emptyLatestOutput, /No latest NAV returned for this MFapi scheme code/)
  assert.match(emptyLatestOutput, /public-apis apis run mfapi\.latest -- --scheme-code 999999999/)
  assert.match(emptyLatestOutput, /public-apis apis run mfapi\.search -- --query 'SBI Small Cap' --limit 100/)
  assert.doesNotMatch(emptyLatestOutput, /^\{/)
})

test('text output renders MSRC vulnerabilities without fallback JSON', () => {
  const againPattern = [
    /again public-apis apis run msrc\.vulnerabilities/.source,
    / --online --persist -- --release-number 2026-May/.source,
    / --severity important --limit 3/.source,
  ].join('')
  const replayPattern = [
    /replay public-apis apis run msrc\.vulnerabilities/.source,
    / --offline -- --release-number 2026-May/.source,
    / --severity important --limit 3/.source,
  ].join('')
  const output = captureStdout(() =>
    printResult({
      kind: 'msrc.vulnerabilities',
      api: {
        provider: 'msrc',
        endpoint: 'GET /sug/v2.0/en-US/vulnerability',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON OData',
        platform: 'Microsoft Security Update Guide API v2.0',
        safety: [
          'Read-only public vulnerability/update metadata only;',
          'the CLI does not submit reports, authenticate, upload',
          'proof-of-concept material, or call private case workflows.',
        ].join(' '),
      },
      query: { releaseNumber: '2026-May', severity: 'important', limit: 3 },
      count: 1,
      pagination: {
        returned: 1,
        totalMatched: 12,
        limit: 3,
        maxLimit: 50,
        orderBy: 'releaseDate desc',
      },
      vulnerabilities: [
        {
          id: 'sample',
          cveNumber: 'CVE-2026-32214',
          title: 'Universal Plug and Play Information Disclosure Vulnerability',
          releaseNumber: '2026-May',
          releaseDate: '2026-05-07T07:00:11-07:00',
          latestRevisionDate: '2026-05-08T07:00:11-07:00',
          severity: 'Important',
          impact: 'Information Disclosure',
          issuingCna: 'Microsoft',
          customerActionRequired: true,
          mitreUrl: 'https://www.cve.org/CVERecord?id=CVE-2026-32214',
          summary: 'A Microsoft product vulnerability summary.',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /MSRC Security Update Guide Vulnerabilities/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /read-only public metadata/)
  assert.match(output, /CVE-2026-32214/)
  assert.match(
    output,
    new RegExp(againPattern, 'u'),
  )
  assert.match(
    output,
    new RegExp(replayPattern, 'u'),
  )
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders MSRC empty state with query-preserving replay', () => {
  const againPattern = [
    /again public-apis apis run msrc\.vulnerabilities/.source,
    / --online --persist -- --release-number 2026-May/.source,
    / --severity important --limit 3/.source,
  ].join('')
  const replayPattern = [
    /replay public-apis apis run msrc\.vulnerabilities/.source,
    / --offline -- --release-number 2026-May/.source,
    / --severity important --limit 3/.source,
  ].join('')
  const output = captureStdout(() =>
    printResult({
      kind: 'msrc.vulnerabilities',
      api: {
        provider: 'msrc',
        endpoint: 'GET /sug/v2.0/en-US/vulnerability',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON OData',
        platform: 'Microsoft Security Update Guide API v2.0',
        safety: 'Read-only public vulnerability/update metadata only.',
      },
      query: { releaseNumber: '2026-May', severity: 'important', limit: 3 },
      count: 0,
      pagination: {
        returned: 0,
        totalMatched: 0,
        limit: 3,
        maxLimit: 50,
        orderBy: 'releaseDate desc',
      },
      vulnerabilities: [],
    }, 'text'),
  )

  assert.match(output, /No MSRC vulnerability metadata matched this query/)
  assert.match(
    output,
    new RegExp(againPattern, 'u'),
  )
  assert.match(
    output,
    new RegExp(replayPattern, 'u'),
  )
})

test('text output renders Binlist lookup without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'binlist.lookup',
      api: {
        provider: 'binlist',
        endpoint: 'GET /{bin}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'Free anonymous clients are limited to 5 requests per hour with a burst of 5.',
      },
      query: { bin: '45717360' },
      card: {
        scheme: 'visa',
        type: 'debit',
        brand: 'Visa Classic/Dankort',
      },
      country: {
        alpha2: 'DK',
        name: 'Denmark',
        emoji: '🇩🇰',
        currency: 'DKK',
      },
      bank: {
        name: 'Jyske Bank A/S',
      },
      pagination: { returned: 1 },
    }, 'text'),
  )

  assert.match(output, /Binlist BIN\/IIN Lookup/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /Denmark/)
  assert.match(output, /Jyske Bank/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)

  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'binlist.lookup',
      api: {
        provider: 'binlist',
        endpoint: 'GET /{bin}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'Free anonymous clients are limited to 5 requests per hour with a burst of 5.',
      },
      query: { bin: '123456' },
      card: {},
      pagination: { returned: 0 },
    }, 'text'),
  )
  assert.match(emptyOutput, /No Binlist card metadata returned/)
  assert.match(emptyOutput, /public-apis apis run binlist\.lookup --online --persist -- --bin 123456/)
  assert.match(emptyOutput, /public-apis apis run binlist\.lookup --offline -- --bin 45717360/)
  assert.doesNotMatch(emptyOutput, /^\{/)
})

test('text output renders Bank Negara Malaysia data without fallback JSON', () => {
  const oprOutput = captureStdout(() =>
    printResult({
      kind: 'banknegaramalaysia.opr',
      api: { provider: 'banknegaramalaysia', endpoint: 'GET /public/opr', authentication: 'none', usesBrowserClickstream: false, acceptHeader: 'application/vnd.BNM.API.v1+json' },
      query: {},
      meta: { lastUpdated: '2026-03-05 15:02:15' },
      opr: { year: 2026, date: '2026-03-05', changeInOpr: 0, newOprLevel: 2.75 },
    }, 'text'),
  )
  assert.match(oprOutput, /Bank Negara Malaysia OPR/)
  assert.match(oprOutput, /open REST API only · no auth/)
  assert.match(oprOutput, /OPR 2\.75%/)
  assert.match(oprOutput, /again public-apis apis run banknegaramalaysia\.opr --online --persist/)
  assert.match(oprOutput, /replay public-apis apis run banknegaramalaysia\.opr --offline/)
  assert.match(oprOutput, /rates public-apis apis run banknegaramalaysia\.exchangeRates --online --persist -- --currency-code USD --limit 1/)
  assert.match(oprOutput, /no Chrome clickstream/)

  const ratesOutput = captureStdout(() =>
    printResult({
      kind: 'banknegaramalaysia.exchangeRates',
      api: { provider: 'banknegaramalaysia', endpoint: 'GET /public/exchange-rate', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 27 },
      meta: { lastUpdated: '2026-04-30 23:01:23', quote: 'rm', totalResult: 27 },
      pagination: { returned: 2, limit: 27, maxLimit: 27, total: 27 },
      rates: [
        { currencyCode: 'CHF', unit: 1, date: '2026-04-30', buyingRate: 5.0253, sellingRate: 5.0329, middleRate: 5.0291 },
        { currencyCode: 'USD', unit: 1, date: '2026-04-30', buyingRate: 3.945, sellingRate: 3.97, middleRate: null },
      ],
    }, 'text'),
  )
  assert.match(ratesOutput, /Bank Negara Malaysia Exchange Rates/)
  assert.match(ratesOutput, /USD/)
  assert.match(ratesOutput, /again public-apis apis run banknegaramalaysia\.exchangeRates --online --persist -- --limit 27/)
  assert.match(ratesOutput, /replay public-apis apis run banknegaramalaysia\.exchangeRates --offline -- --limit 27/)
  assert.match(ratesOutput, /focus USD public-apis apis run banknegaramalaysia\.exchangeRates --online --persist -- --currency-code USD --limit 1/)
  assert.match(ratesOutput, /gold public-apis apis run banknegaramalaysia\.kijangEmas --online --persist/)
  assert.doesNotMatch(ratesOutput, /^\{/)

  const goldOutput = captureStdout(() =>
    printResult({
      kind: 'banknegaramalaysia.kijangEmas',
      api: { provider: 'banknegaramalaysia', endpoint: 'GET /public/kijang-emas', authentication: 'none', usesBrowserClickstream: false },
      query: {},
      meta: { lastUpdated: '2026-04-30 01:00:04' },
      kijangEmas: { effectiveDate: '2026-04-30', oneOz: { buying: 18396, selling: 19149 }, halfOz: { buying: 9198, selling: 9755 }, quarterOz: { buying: 4599, selling: 4968 } },
    }, 'text'),
  )
  assert.match(goldOutput, /Bank Negara Malaysia Kijang Emas/)
  assert.match(goldOutput, /RM/)
  assert.match(goldOutput, /again public-apis apis run banknegaramalaysia\.kijangEmas --online --persist/)
  assert.match(goldOutput, /replay public-apis apis run banknegaramalaysia\.kijangEmas --offline/)
  assert.match(goldOutput, /opr public-apis apis run banknegaramalaysia\.opr --online --persist/)
  assert.doesNotMatch(goldOutput, /^\{/)

  const emptyRatesOutput = captureStdout(() =>
    printResult({
      kind: 'banknegaramalaysia.exchangeRates',
      api: { provider: 'banknegaramalaysia', endpoint: 'GET /public/exchange-rate', authentication: 'none', usesBrowserClickstream: false },
      query: { currencyCode: 'ZZZ', limit: 1 },
      meta: { totalResult: 0 },
      pagination: { returned: 0, limit: 1, maxLimit: 27, total: 0 },
      rates: [],
    }, 'text'),
  )
  assert.match(emptyRatesOutput, /No Bank Negara Malaysia exchange rates returned/)
  assert.match(emptyRatesOutput, /try public-apis apis run banknegaramalaysia\.exchangeRates --online --persist -- --limit 27/)
  assert.match(emptyRatesOutput, /focus USD public-apis apis run banknegaramalaysia\.exchangeRates --online --persist -- --currency-code USD --limit 1/)
})

test('text output renders Bank of Russia XML exchange rates without fallback JSON', () => {
  const ratesOutput = captureStdout(() =>
    printResult({
      kind: 'bankofrussia.rates',
      api: { provider: 'bankofrussia', endpoint: 'GET /scripts/XML_daily.asp', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS XML REST projected to JSON' },
      query: { date: '', code: '', limit: 54 },
      date: '05.05.2026',
      pagination: { returned: 2, limit: 54, maxLimit: 54 },
      rates: [
        { id: 'R01235', charCode: 'USD', nominal: 1, name: 'US Dollar', value: 75.4388, unitRate: 75.4388 },
        { id: 'R01239', charCode: 'EUR', nominal: 1, name: 'Euro', value: 88.2651, unitRate: 88.2651 },
      ],
    }, 'text'),
  )
  assert.match(ratesOutput, /Bank of Russia Daily Rates/)
  assert.match(ratesOutput, /open XML API only · no auth/)
  assert.match(ratesOutput, /USD/)
  assert.match(ratesOutput, /history.*bankofrussia\.history -- --code USD/)
  assert.match(ratesOutput, /again.*bankofrussia\.rates --online --persist -- --limit 54/)
  assert.match(ratesOutput, /replay.*bankofrussia\.rates --offline -- --limit 54/)
  assert.match(ratesOutput, /no Chrome clickstream/)
  assert.doesNotMatch(ratesOutput, /^\{/)

  const historyOutput = captureStdout(() =>
    printResult({
      kind: 'bankofrussia.history',
      api: { provider: 'bankofrussia', endpoint: 'GET /scripts/XML_dynamic.asp', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS XML REST projected to JSON' },
      query: { code: 'USD', from: '2026-05-01', to: '2026-05-05', limit: 60 },
      code: 'USD',
      from: '01.05.2026',
      to: '05.05.2026',
      pagination: { returned: 2, limit: 60, maxLimit: 60 },
      records: [
        { date: '01.05.2026', nominal: 1, value: 74.8014, unitRate: 74.8014 },
        { date: '05.05.2026', nominal: 1, value: 75.4388, unitRate: 75.4388 },
      ],
    }, 'text'),
  )
  assert.match(historyOutput, /Bank of Russia USD History/)
  assert.match(historyOutput, /01\.05\.2026/)
  assert.match(historyOutput, /open XML API only · no auth/)
  assert.match(historyOutput, /rates.*bankofrussia\.rates -- --code USD/)
  assert.match(historyOutput, /again.*bankofrussia\.history --online --persist -- --code USD --from 2026-05-01 --to 2026-05-05 --limit 60/)
  assert.match(historyOutput, /replay.*bankofrussia\.history --offline -- --code USD --from 2026-05-01 --to 2026-05-05 --limit 60/)
  assert.doesNotMatch(historyOutput, /^\{/)
})

test('text output renders Czech National Bank XML exchange rates without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'czechnationalbank.rates',
      api: { provider: 'czechnationalbank', endpoint: 'GET /cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.xml', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS XML REST projected to JSON' },
      storage: { mode: 'online', persisted: false },
      query: { date: '', code: '', limit: 30 },
      bank: 'CNB',
      date: '05.05.2026',
      order: '85',
      pagination: { returned: 2, limit: 30, maxLimit: 30 },
      rates: [
        { code: 'EUR', currency: 'euro', amount: 1, rate: 24.395, country: 'EMU' },
        { code: 'USD', currency: 'dollar', amount: 1, rate: 21.438, country: 'USA' },
      ],
    }, 'text'),
  )

  assert.match(output, /Czech National Bank Daily Rates/)
  assert.match(output, /open XML API only · no auth/)
  assert.match(output, /EUR/)
  assert.match(output, /focus EUR.*czechnationalbank\.rates --online --persist -- --code EUR/)
  assert.match(output, /again.*czechnationalbank\.rates --online --persist -- --limit 30/)
  assert.match(output, /replay.*czechnationalbank\.rates --offline -- --limit 30/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Website Carbon data estimates without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'websitecarbon.data',
      api: {
        provider: 'websitecarbon',
        endpoint: 'GET /data',
        authentication: 'none',
        usesBrowserClickstream: false,
        publicEndpointNote: 'Official docs state /data is the only endpoint offered for public access; /site public access ended on 2025-07-14.',
      },
      query: { bytes: 1_000_000, green: true },
      result: {
        bytes: 1_000_000,
        green: true,
        gco2e: 0.08510206826031208,
        rating: 'B',
        cleanerThan: 0.8,
      },
      statistics: {
        co2: {
          grid: { grams: 0.1042066141963005 },
          renewable: { grams: 0.08510206826031208 },
        },
      },
      pagination: { returned: 1 },
    }, 'text'),
  )

  assert.match(output, /Website Carbon Data Estimate/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /rating B/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)

  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'websitecarbon.data',
      api: { provider: 'websitecarbon', endpoint: 'GET /data', authentication: 'none', usesBrowserClickstream: false },
      query: { bytes: 1_000_000, green: true },
      result: {},
      statistics: {},
      pagination: { returned: 0 },
    }, 'text'),
  )
  assert.match(emptyOutput, /No Website Carbon estimate returned for this query/)
  assert.match(emptyOutput, /public-apis apis run websitecarbon\.data -- --bytes 1000000 --green true/)
  assert.match(emptyOutput, /public-apis apis run websitecarbon\.data -- --bytes 1000000 --green false/)
  assert.doesNotMatch(emptyOutput, /^\{/)
})

test('text output renders Voidly incidents without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'voidly.incidents',
      api: { provider: 'voidly', endpoint: 'GET /data/incidents', authentication: 'none', usesBrowserClickstream: false, licenseNote: 'CC BY 4.0 public endpoint', riskBoundary: 'read-only incident metadata only; paid, agent, MCP, proxy, and POST endpoints excluded' },
      query: { country: 'IR', limit: 2, offset: 0 },
      count: 1,
      total: 12,
      datasetVersion: '2026.05.09',
      generatedAt: '2026-05-09T01:27:31.444135Z',
      pagination: { returned: 1, limit: 2, offset: 0, maxLimit: 100, maxOffset: 1000 },
      rateLimit: { remaining: '99', reset: '1778290111' },
      incidents: [
        {
          id: 'IR-2026-0195',
          hashId: '8916bd0c6fbb',
          title: 'Internet connectivity disruption in Iran',
          country: 'IR',
          countryName: 'Iran',
          flag: '🇮🇷',
          severity: 'critical',
          status: 'active',
          incidentType: 'disruption',
          confidence: 0.7,
          anomalyRate: 0.54,
          measurementCount: 5,
          startTime: '2026-05-03T20:50:00Z',
          description: 'IODA detected significant connectivity drop in Iran.',
          sources: ['ioda'],
          affectedDomains: [],
          affectedServices: [],
          reportUrl: 'https://api.voidly.ai/data/incidents/8916bd0c6fbb/report?format=markdown',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Voidly Censorship Incidents/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /paid, agent, MCP, proxy, and POST endpoints excluded/)
  assert.match(output, /Internet connectivity disruption in Iran/)
  assert.match(output, /again public-apis apis run voidly\.incidents --online --persist -- --country IR --limit 2 --offset 0/)
  assert.match(output, /replay public-apis apis run voidly\.incidents --offline -- --country IR --limit 2 --offset 0/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})


test('text output renders ReceitaWS lookup without fallback JSON', () => {
  const output = captureStdout(() => printResult({
    kind: 'receitaws.lookup',
    api: { provider: 'receitaws', endpoint: 'GET /v1/cnpj/{cnpj}', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', rateLimit: 'single CNPJ lookup' },
    storage: { mode: 'online', persisted: false },
    query: { cnpj: '27865757000102' },
    company: {
      cnpj: '27865757000102',
      status: 'OK',
      name: 'GLOBO COMUNICACAO E PARTICIPACOES S/A',
      alias: 'GLOBOPLAY',
      situation: 'ATIVA',
      type: 'MATRIZ',
      size: 'DEMAIS',
      legalNature: '205-4 - Sociedade Anônima Fechada',
      city: 'RIO DE JANEIRO',
      state: 'RJ',
      zip: '22.460-901',
      primaryActivities: [{ code: '60.21-7-00', text: 'Atividades de televisão aberta' }],
      secondaryActivities: [{ code: '62.04-0-00', text: 'Consultoria em tecnologia da informação' }],
    },
  }, 'text'))
  assert.match(output, /ReceitaWS CNPJ Lookup/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /Atividades de televisão aberta/)
  assert.match(output, /again public-apis apis run receitaws\.lookup --online --persist -- --cnpj 27865757000102/)
  assert.match(output, /replay public-apis apis run receitaws\.lookup --offline -- --cnpj 27865757000102/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Portfolio Optimizer minimum variance without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'portfoliooptimizer.minimumVariance',
      api: {
        provider: 'portfoliooptimizer',
        endpoint: 'POST /v1/portfolios/optimization/minimum-variance',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'Anonymous requests are allowed but limited.',
      },
      query: {
        assets: 3,
        covarianceMatrix: [[0.01, 0.0018, 0.0011], [0.0018, 0.0225, 0.0026], [0.0011, 0.0026, 0.04]],
        minimumWeights: [0.1, 0.1, 0.1],
        maximumWeights: [0.8, 0.8, 0.8],
      },
      pagination: { returned: 3, maxAssets: 10 },
      portfolio: {
        assetsWeights: [0.6245788660589642, 0.23740499218849087, 0.13801614175254476],
        totalWeight: 1,
        nonZeroAssets: 3,
      },
      rateLimit: { limit: '1', remaining: '0', reset: '1' },
    }, 'text'),
  )

  assert.match(output, /Portfolio Optimizer Minimum Variance/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /asset 1: 62\.5%/)
  assert.match(output, /limit 1 · remaining 0 · reset 1/)
  assert.match(output, /--covariance-matrix '\[\[0\.01,0\.0018,0\.0011\],\[0\.0018,0\.0225,0\.0026\],\[0\.0011,0\.0026,0\.04\]\]'/)
  assert.match(output, /--minimum-weights '\[0\.1,0\.1,0\.1\]'/)
  assert.match(output, /save public-apis apis run portfoliooptimizer\.minimumVariance --online --persist/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders SEC EDGAR submissions and company concept without fallback JSON', () => {
  const submissionsOutput = captureStdout(() =>
    printResult({
      kind: 'secedgar.submissions',
      api: { provider: 'secedgar', endpoint: 'GET /submissions/CIK##########.json', authentication: 'none', usesBrowserClickstream: false, accessPolicy: 'SEC APIs require no key; send descriptive User-Agent.' },
      query: { cik: '0000320193', limit: 200 },
      company: { cik: '0000320193', name: 'Apple Inc.', tickers: ['AAPL'], exchanges: ['Nasdaq'] },
      pagination: { returned: 2, limit: 200, maxLimit: 1000, total: 1000 },
      filings: [
        { accessionNumber: '0000320193-26-000013', filingDate: '2026-05-01', form: '10-Q', primaryDocDescription: '10-Q' },
        { accessionNumber: '0000320193-26-000007', filingDate: '2026-02-06', form: '10-Q', primaryDocDescription: '10-Q' },
      ],
    }, 'text'),
  )
  assert.match(submissionsOutput, /SEC EDGAR Company Submissions/)
  assert.match(submissionsOutput, /open REST API only · no auth/)
  assert.match(submissionsOutput, /Apple Inc\./)
  assert.match(submissionsOutput, /next public-apis apis run secedgar\.companyConcept --online --persist -- --cik 0000320193 --tag AccountsPayableCurrent --limit 100/)
  assert.match(submissionsOutput, /replay public-apis apis run secedgar\.submissions --offline -- --cik 0000320193 --limit 200/)
  assert.match(submissionsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(submissionsOutput, /^\{/)

  const conceptOutput = captureStdout(() =>
    printResult({
      kind: 'secedgar.companyConcept',
      api: { provider: 'secedgar', endpoint: 'GET /api/xbrl/companyconcept/CIK##########/{taxonomy}/{tag}.json', authentication: 'none', usesBrowserClickstream: false, accessPolicy: 'SEC APIs require no key; send descriptive User-Agent.' },
      query: { cik: '0000320193', taxonomy: 'us-gaap', tag: 'AccountsPayableCurrent', unit: 'USD', limit: 200 },
      concept: { cik: '0000320193', entityName: 'Apple Inc.', taxonomy: 'us-gaap', tag: 'AccountsPayableCurrent', label: 'Accounts Payable, Current', unit: 'USD', availableUnits: ['USD'] },
      pagination: { returned: 2, limit: 200, maxLimit: 1000, total: 140 },
      facts: [
        { end: '2025-12-27', val: 62985000000, form: '10-Q', filed: '2026-02-06' },
        { end: '2026-03-28', val: 57349000000, form: '10-Q', filed: '2026-05-01' },
      ],
    }, 'text'),
  )
  assert.match(conceptOutput, /SEC EDGAR Company Concept/)
  assert.match(conceptOutput, /Accounts Payable, Current/)
  assert.match(conceptOutput, /57,349,000,000 USD/)
  assert.match(conceptOutput, /next public-apis apis run secedgar\.submissions --online --persist -- --cik 0000320193 --limit 100/)
  assert.match(conceptOutput, /replay public-apis apis run secedgar\.companyConcept --offline -- --cik 0000320193 --taxonomy us-gaap --tag AccountsPayableCurrent --unit USD --limit 200/)
  assert.match(conceptOutput, /no Chrome clickstream/)
  assert.doesNotMatch(conceptOutput, /^\{/)
})

test('text output renders Hacker News stories and item without fallback JSON', () => {
  const storiesOutput = captureStdout(() =>
    printResult({
      kind: 'hackernews.stories',
      api: {
        provider: 'hackernews',
        endpoint: 'GET /topstories.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        fanoutLimit: 2,
      },
      query: { list: 'top', limit: 2 },
      ids: [1001, 1002],
      stories: [
        { id: 1001, type: 'story', by: 'pg', title: 'Example story', url: 'https://example.com/1001', score: 57, descendants: 15 },
      ],
      pagination: { returned: 1, upstreamTotal: 500, limit: 2 },
    }, 'text'),
  )

  assert.match(storiesOutput, /Hacker News Stories/)
  assert.match(storiesOutput, /open REST API only · no auth/)
  assert.match(storiesOutput, /Example story/)
  assert.match(storiesOutput, /no Chrome clickstream/)
  assert.match(storiesOutput, /again public-apis apis run hackernews\.stories --online --persist -- --list top --limit 2/)
  assert.match(storiesOutput, /replay public-apis apis run hackernews\.stories --offline -- --list top --limit 2/)
  assert.match(storiesOutput, /thread public-apis apis run hackernews\.thread --online --persist -- --id 1001 --page-size 25/)
  assert.doesNotMatch(storiesOutput, /^\{/)

  const itemOutput = captureStdout(() =>
    printResult({
      kind: 'hackernews.item',
      api: {
        provider: 'hackernews',
        endpoint: 'GET /item/{id}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { id: 8863 },
      item: { id: 8863, type: 'story', by: 'pg', title: 'My YC app: Dropbox', score: 111, descendants: 71, url: 'https://www.getdropbox.com/u/2/screencast.html' },
      pagination: { returned: 1 },
    }, 'text'),
  )

  assert.match(itemOutput, /Hacker News Item/)
  assert.match(itemOutput, /open REST API only · no auth/)
  assert.match(itemOutput, /My YC app: Dropbox/)
  assert.match(itemOutput, /hackernews.thread/)
  assert.match(itemOutput, /again public-apis apis run hackernews\.item --online --persist -- --id 8863/)
  assert.match(itemOutput, /replay public-apis apis run hackernews\.item --offline -- --id 8863/)
  assert.match(itemOutput, /no Chrome clickstream/)
  assert.doesNotMatch(itemOutput, /^\{/)

  const threadOutput = captureStdout(() =>
    printResult({
      kind: 'hackernews.thread',
      api: {
        provider: 'hackernews',
        endpoint: 'GET /item/{id}.json recursive kids',
        authentication: 'none',
        usesBrowserClickstream: false,
        traversal: 'Depth-first pre-order traversal preserves Hacker News kids[] order and reply nesting.',
        fetchConcurrency: 8,
      },
      query: { id: 8863, cursor: 0, pageSize: 3, direction: 'down' },
      root: { index: 0, id: 8863, depth: 0, path: [], childCount: 2, type: 'story', by: 'pg', title: 'My YC app: Dropbox', score: 111, descendants: 2 },
      items: [
        { index: 0, id: 8863, depth: 0, path: [], childCount: 2, type: 'story', by: 'pg', title: 'My YC app: Dropbox', score: 111, descendants: 2 },
        { index: 1, id: 2001, parent: 8863, depth: 1, path: [0], childCount: 1, type: 'comment', by: 'alice', text: 'First<p>full &amp; nested reply' },
        { index: 2, id: 3001, parent: 2001, depth: 2, path: [0, 0], childCount: 0, type: 'comment', by: 'carol', text: 'Second line<br>still visible' },
      ],
      visibleItems: [
        { index: 0, id: 8863, depth: 0, path: [], childCount: 2, type: 'story', by: 'pg', title: 'My YC app: Dropbox', score: 111, descendants: 2 },
        { index: 1, id: 2001, parent: 8863, depth: 1, path: [0], childCount: 1, type: 'comment', by: 'alice', text: 'First<p>full &amp; nested reply' },
        { index: 2, id: 3001, parent: 2001, depth: 2, path: [0, 0], childCount: 0, type: 'comment', by: 'carol', text: 'Second line<br>still visible' },
      ],
      scroll: { direction: 'down', cursor: 0, pageSize: 3, start: 0, end: 3, returned: 3, total: 5, atTop: true, atBottom: false, nextCursor: 3 },
    }, 'text'),
  )

  assert.match(threadOutput, /Hacker News Thread/)
  assert.match(threadOutput, /open REST API only · no auth/)
  assert.match(threadOutput, /showing 1-3 \/ 5/)
  assert.match(threadOutput, /First/)
  assert.match(threadOutput, /full & nested reply/)
  assert.match(threadOutput, /already at top/)
  assert.match(threadOutput, /--direction down/)
  assert.match(threadOutput, /replay public-apis apis run hackernews\.thread --offline -- --id 8863 --cursor 0 --direction down --page-size 3/)
  assert.match(threadOutput, /item public-apis apis run hackernews\.item --online --persist -- --id 8863/)
  assert.match(threadOutput, /complete fetched thread tree/)
  assert.doesNotMatch(threadOutput, /^\{/)

  const missingItemOutput = captureStdout(() =>
    printResult({
      kind: 'hackernews.item',
      api: {
        provider: 'hackernews',
        endpoint: 'GET /item/{id}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { id: 999999999 },
      item: {},
      pagination: { returned: 0 },
    }, 'text'),
  )
  assert.match(missingItemOutput, /No Hacker News item returned for this id/)
  assert.match(missingItemOutput, /stories public-apis apis run hackernews\.stories --online --persist -- --list top --limit 10/)
  assert.doesNotMatch(missingItemOutput, /^\{/)
})

test('text output renders JSONPlaceholder posts and post without fallback JSON', () => {
  const postsOutput = captureStdout(() =>
    printResult({
      kind: 'jsonplaceholder.posts',
      api: {
        provider: 'jsonplaceholder',
        endpoint: 'GET /posts',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultLimit: 100,
      },
      query: { limit: 2, userId: 1 },
      posts: [
        { userId: 1, id: 1, title: 'Post 1', body: 'Body for post 1' },
      ],
      pagination: { returned: 1, total: '100', limit: 2 },
      rateLimit: { limit: '1000', remaining: '999', totalCount: '100' },
    }, 'text'),
  )

  assert.match(postsOutput, /JSONPlaceholder Posts/)
  assert.match(postsOutput, /open REST API only · no auth/)
  assert.match(postsOutput, /Post 1/)
  assert.match(postsOutput, /no Chrome clickstream/)
  assert.match(postsOutput, /again public-apis apis run jsonplaceholder\.posts --online --persist -- --limit 2 --user-id 1/)
  assert.match(postsOutput, /replay public-apis apis run jsonplaceholder\.posts --offline -- --limit 2 --user-id 1/)
  assert.match(postsOutput, /post public-apis apis run jsonplaceholder\.post --online --persist -- --id 1/)
  assert.doesNotMatch(postsOutput, /^\{/)

  const postOutput = captureStdout(() =>
    printResult({
      kind: 'jsonplaceholder.post',
      api: {
        provider: 'jsonplaceholder',
        endpoint: 'GET /posts/{id}',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { id: 1 },
      post: { userId: 1, id: 1, title: 'Post 1', body: 'Body for post 1' },
      pagination: { returned: 1 },
      rateLimit: { limit: '1000', remaining: '999' },
    }, 'text'),
  )

  assert.match(postOutput, /JSONPlaceholder Post/)
  assert.match(postOutput, /open REST API only · no auth/)
  assert.match(postOutput, /Body for post 1/)
  assert.match(postOutput, /no Chrome clickstream/)
  assert.match(postOutput, /again public-apis apis run jsonplaceholder\.post --online --persist -- --id 1/)
  assert.match(postOutput, /replay public-apis apis run jsonplaceholder\.post --offline -- --id 1/)
  assert.match(postOutput, /posts public-apis apis run jsonplaceholder\.posts --online --persist -- --limit 100 --user-id 1/)
  assert.doesNotMatch(postOutput, /^\{/)

  const emptyPostsOutput = captureStdout(() =>
    printResult({
      kind: 'jsonplaceholder.posts',
      api: {
        provider: 'jsonplaceholder',
        endpoint: 'GET /posts',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultLimit: 100,
      },
      query: { limit: 5, userId: 999 },
      posts: [],
      pagination: { returned: 0, total: '0', limit: 5 },
      rateLimit: {},
    }, 'text'),
  )

  assert.match(emptyPostsOutput, /No JSONPlaceholder posts returned for this query/)
  assert.match(emptyPostsOutput, /again public-apis apis run jsonplaceholder\.posts --online --persist -- --limit 5 --user-id 999/)
  assert.match(emptyPostsOutput, /reset public-apis apis run jsonplaceholder\.posts --online --persist -- --limit 100/)
  assert.doesNotMatch(emptyPostsOutput, /^\{/)

  const missingPostOutput = captureStdout(() =>
    printResult({
      kind: 'jsonplaceholder.post',
      api: {
        provider: 'jsonplaceholder',
        endpoint: 'GET /posts/{id}',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { id: 999999 },
      post: {},
      pagination: { returned: 0 },
      rateLimit: {},
    }, 'text'),
  )

  assert.match(missingPostOutput, /No JSONPlaceholder post returned for this id/)
  assert.match(missingPostOutput, /retry public-apis apis run jsonplaceholder\.post --online --persist -- --id 999999/)
  assert.match(missingPostOutput, /posts public-apis apis run jsonplaceholder\.posts --online --persist -- --limit 100/)
  assert.doesNotMatch(missingPostOutput, /^\{/)
})

test('text output renders FakerAPI persons and companies without fallback JSON', () => {
  const personsOutput = captureStdout(() =>
    printResult({
      kind: 'fakerapi.persons',
      api: {
        provider: 'fakerapi',
        endpoint: 'GET /api/v2/persons',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { quantity: 1, locale: 'en_US', seed: 12345 },
      persons: [
        {
          id: 1,
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          phone: '+12025550123',
          gender: 'female',
          address: { city: 'London', countryCode: 'GB' },
          website: 'https://example.com/ada',
          image: 'https://example.com/ada.png',
        },
      ],
      pagination: { returned: 1, total: 1, limit: 1 },
      rateLimit: { limit: '60', remaining: '59' },
    }, 'text'),
  )

  assert.match(personsOutput, /FakerAPI Persons/)
  assert.match(personsOutput, /open REST API only · no auth/)
  assert.match(personsOutput, /Ada Lovelace/)
  assert.match(personsOutput, /image https:\/\/example\.com\/ada\.png/)
  assert.match(personsOutput, /again public-apis apis run fakerapi\.persons --online --persist -- --quantity 1 --locale en_US --seed 12345/)
  assert.match(personsOutput, /replay public-apis apis run fakerapi\.persons --offline -- --quantity 1 --locale en_US --seed 12345/)
  assert.match(personsOutput, /companies public-apis apis run fakerapi\.companies --online --persist -- --quantity 1 --locale en_US --seed 12345/)
  assert.match(personsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(personsOutput, /^\{/)

  const companiesOutput = captureStdout(() =>
    printResult({
      kind: 'fakerapi.companies',
      api: {
        provider: 'fakerapi',
        endpoint: 'GET /api/v2/companies',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { quantity: 1, locale: 'en_US', seed: 12345 },
      companies: [
        {
          id: 1,
          name: 'Ada Labs',
          email: 'hello@adalabs.example',
          phone: '+12025550124',
          country: 'United Kingdom',
          addresses: [{ city: 'London', countryCode: 'GB' }],
          contact: { firstName: 'Ada', lastName: 'Lovelace' },
          website: 'https://example.com/adalabs',
          image: 'https://example.com/adalabs.png',
        },
      ],
      pagination: { returned: 1, total: 1, limit: 1 },
      rateLimit: { limit: '60', remaining: '58' },
    }, 'text'),
  )

  assert.match(companiesOutput, /FakerAPI Companies/)
  assert.match(companiesOutput, /open REST API only · no auth/)
  assert.match(companiesOutput, /Ada Labs/)
  assert.match(companiesOutput, /image https:\/\/example\.com\/adalabs\.png/)
  assert.match(companiesOutput, /again public-apis apis run fakerapi\.companies --online --persist -- --quantity 1 --locale en_US --seed 12345/)
  assert.match(companiesOutput, /replay public-apis apis run fakerapi\.companies --offline -- --quantity 1 --locale en_US --seed 12345/)
  assert.match(companiesOutput, /persons public-apis apis run fakerapi\.persons --online --persist -- --quantity 1 --locale en_US --seed 12345/)
  assert.match(companiesOutput, /no Chrome clickstream/)
  assert.doesNotMatch(companiesOutput, /^\{/)
})


test('text output renders NYC Open Data datasets and 311 requests without fallback JSON', () => {
  const datasetsOutput = captureStdout(() => printResult({
    kind: 'nycopendata.datasets',
    api: { provider: 'nycopendata', endpoint: 'GET /api/catalog/v1', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: false },
    query: { query: '311', limit: 100 },
    pagination: { returned: 1, totalMatched: 1, limit: 100, maxLimit: 100 },
    datasets: [{ id: 'erm2-nwe9', name: '311 Service Requests from 2020 to Present', category: 'Social Services', attribution: '311', description: '311 responds to thousands of requests.' }],
  }, 'text'))
  assert.match(datasetsOutput, /NYC Open Data Datasets/)
  assert.match(datasetsOutput, /open REST API only · no auth/)
  assert.match(datasetsOutput, /again public-apis apis run nycopendata\.datasets --online --persist -- --query 311 --limit 100/)
  assert.match(datasetsOutput, /replay public-apis apis run nycopendata\.datasets --offline -- --query 311 --limit 100/)
  assert.match(datasetsOutput, /311 public-apis apis run nycopendata\.311Requests --online --persist -- --borough BROOKLYN --limit 1000/)
  assert.match(datasetsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetsOutput, /^\{/)

  const requestsOutput = captureStdout(() => printResult({
    kind: 'nycopendata.311Requests',
    api: { provider: 'nycopendata', endpoint: 'GET /resource/erm2-nwe9.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', limitPolicy: 'bounded unauthenticated Socrata request' },
    storage: { mode: 'online', persisted: true },
    query: { borough: 'BROOKLYN', limit: 1000 },
    pagination: { returned: 1, limit: 1000, maxLimit: 1000 },
    requests: [{ uniqueKey: '68855202', createdDate: '2026-05-02T02:06:41.000', agency: 'NYPD', complaintType: 'Illegal Parking', borough: 'BROOKLYN', status: 'In Progress' }],
  }, 'text'))
  assert.match(requestsOutput, /NYC Open Data 311 Requests/)
  assert.match(requestsOutput, /Illegal Parking/)
  assert.match(requestsOutput, /open REST API only · no auth/)
  assert.match(requestsOutput, /again public-apis apis run nycopendata\.311Requests --online --persist -- --borough BROOKLYN --limit 1000/)
  assert.match(requestsOutput, /replay public-apis apis run nycopendata\.311Requests --offline -- --borough BROOKLYN --limit 1000/)
  assert.match(requestsOutput, /datasets public-apis apis run nycopendata\.datasets --online --persist -- --query 311 --limit 100/)
  assert.doesNotMatch(requestsOutput, /^\{/)

  const emptyDatasetsOutput = captureStdout(() => printResult({
    kind: 'nycopendata.datasets',
    api: { provider: 'nycopendata', endpoint: 'GET /api/catalog/v1', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: false },
    query: { query: 'zzznotrealnyczz', limit: 5 },
    pagination: { returned: 0, totalMatched: 0, limit: 5, maxLimit: 100 },
    datasets: [],
  }, 'text'))
  assert.match(emptyDatasetsOutput, /No NYC Open Data datasets matched/)
  assert.match(emptyDatasetsOutput, /try public-apis apis run nycopendata\.datasets --online --persist -- --query 311 --limit 100/)
  assert.match(emptyDatasetsOutput, /311 public-apis apis run nycopendata\.311Requests --online --persist -- --borough BROOKLYN --limit 1000/)

  const emptyRequestsOutput = captureStdout(() => printResult({
    kind: 'nycopendata.311Requests',
    api: { provider: 'nycopendata', endpoint: 'GET /resource/erm2-nwe9.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', limitPolicy: 'bounded unauthenticated Socrata request' },
    storage: { mode: 'online', persisted: false },
    query: { borough: 'Unspecified', limit: 5 },
    pagination: { returned: 0, limit: 5, maxLimit: 1000 },
    requests: [],
  }, 'text'))
  assert.match(emptyRequestsOutput, /No NYC 311 requests returned/)
  assert.match(emptyRequestsOutput, /try public-apis apis run nycopendata\.311Requests --online --persist -- --borough BROOKLYN --limit 1000/)
  assert.match(emptyRequestsOutput, /datasets public-apis apis run nycopendata\.datasets --online --persist -- --query 311 --limit 100/)
})

test('text output renders DC Open Data datasets and business licenses without fallback JSON', () => {
  const datasetsOutput = captureStdout(() => printResult({
    kind: 'dcopendata.datasets',
    api: { provider: 'dcopendata', endpoint: 'GET /api/search/v1/collections/dataset/items', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', platform: 'ArcGIS Hub' },
    storage: { mode: 'online', persisted: false },
    query: { query: 'business', limit: 100 },
    pagination: { returned: 1, totalMatched: 1, limit: 100, maxLimit: 100 },
    rateLimit: { limit: '10', remaining: '9', reset: '1' },
    datasets: [{ id: '85bf98d3915f412c8a4de706f2d13513', title: 'Basic Business Licenses', type: 'Feature Service', owner: 'DCGISopendata', categories: ['/Categories/Business Economy/Licensing'], description: 'Business license locations and related metadata.', url: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/0' }],
  }, 'text'))
  assert.match(datasetsOutput, /DC Open Data Datasets/)
  assert.match(datasetsOutput, /open REST API only · no auth/)
  assert.match(datasetsOutput, /no Chrome clickstream/)
  assert.match(datasetsOutput, /Basic Business Licenses/)
  assert.match(datasetsOutput, /https:\/\/maps2\.dcgis\.dc\.gov\/dcgis\/rest\/services\/FEEDS\/DCRA\/FeatureServer\/0/)
  assert.match(datasetsOutput, /again public-apis apis run dcopendata\.datasets --online --persist -- --query business --limit 100/)
  assert.match(datasetsOutput, /replay public-apis apis run dcopendata\.datasets --offline -- --query business --limit 100/)
  assert.match(datasetsOutput, /licenses public-apis apis run dcopendata\.businessLicenses --online --persist -- --status Active --limit 1000/)
  assert.doesNotMatch(datasetsOutput, /^\{/)

  const licensesOutput = captureStdout(() => printResult({
    kind: 'dcopendata.businessLicenses',
    api: { provider: 'dcopendata', endpoint: 'GET /dcgis/rest/services/FEEDS/DCRA/FeatureServer/0/query', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', limitPolicy: 'bounded unauthenticated ArcGIS request' },
    storage: { mode: 'online', persisted: true },
    query: { status: 'Active', limit: 1000 },
    pagination: { returned: 1, limit: 1000, maxLimit: 1000 },
    licenses: [{ objectId: 398486255, entityName: 'SK+I URBAN INC.', licenseStatus: 'Active', licenseCategory: 'General Business', city: 'WASHINGTON', state: 'DC', zip: '20016' }],
  }, 'text'))
  assert.match(licensesOutput, /DC Basic Business Licenses/)
  assert.match(licensesOutput, /SK\+I URBAN INC\./)
  assert.match(licensesOutput, /open REST API only · no auth/)
  assert.match(licensesOutput, /General Business · ward -/)
  assert.match(licensesOutput, /again public-apis apis run dcopendata\.businessLicenses --online --persist -- --status Active --limit 1000/)
  assert.match(licensesOutput, /replay public-apis apis run dcopendata\.businessLicenses --offline -- --status Active --limit 1000/)
  assert.doesNotMatch(licensesOutput, /^\{/)
})

test('text output renders Open Brewery DB breweries and meta without fallback JSON', () => {
  const breweriesOutput = captureStdout(() =>
    printResult({
      kind: 'openbrewerydb.breweries',
      api: {
        provider: 'openbrewerydb',
        endpoint: 'GET /v1/breweries',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { city: 'san_diego', perPage: 2, page: 1 },
      pagination: { returned: 1, perPage: 2, page: 1, maxPerPage: 200 },
      rateLimit: { limit: '120', remaining: '119' },
      breweries: [
        {
          id: 'brewery-1',
          name: 'Example Brewery',
          breweryType: 'micro',
          city: 'San Diego',
          stateProvince: 'California',
          country: 'United States',
          phone: '6195550100',
          websiteUrl: 'https://example.com',
        },
      ],
    }, 'text'),
  )

  assert.match(breweriesOutput, /Open Brewery DB Breweries/)
  assert.match(breweriesOutput, /open REST API only · no auth/)
  assert.match(breweriesOutput, /Example Brewery/)
  assert.match(breweriesOutput, /meta public-apis apis run openbrewerydb\.meta --online --persist -- --city san_diego/)
  assert.match(breweriesOutput, /more public-apis apis run openbrewerydb\.breweries --online --persist -- --city san_diego --per-page 2 --page 2/)
  assert.match(breweriesOutput, /replay public-apis apis run openbrewerydb\.breweries --offline -- --city san_diego --per-page 2 --page 1/)
  assert.match(breweriesOutput, /no Chrome clickstream/)
  assert.doesNotMatch(breweriesOutput, /^\{/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'openbrewerydb.search',
      api: {
        provider: 'openbrewerydb',
        endpoint: 'GET /v1/breweries/search',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { query: 'dogfish', perPage: 2, page: 1 },
      pagination: { returned: 1, perPage: 2, page: 1, maxPerPage: 200 },
      rateLimit: { limit: '120', remaining: '118' },
      breweries: [
        {
          id: 'brewery-2',
          name: 'Dogfish Head Craft Brewery',
          breweryType: 'regional',
          city: 'Milton',
          stateProvince: 'Delaware',
          country: 'United States',
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Open Brewery DB Search/)
  assert.match(searchOutput, /Dogfish Head/)
  assert.match(searchOutput, /meta public-apis apis run openbrewerydb\.meta --online --persist -- --city milton/)
  assert.match(searchOutput, /more public-apis apis run openbrewerydb\.search --online --persist -- --query dogfish --per-page 2 --page 2/)
  assert.match(searchOutput, /replay public-apis apis run openbrewerydb\.search --offline -- --query dogfish --per-page 2 --page 1/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const metaOutput = captureStdout(() =>
    printResult({
      kind: 'openbrewerydb.meta',
      api: {
        provider: 'openbrewerydb',
        endpoint: 'GET /v1/breweries/meta',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { city: 'san_diego' },
      rateLimit: { limit: '120', remaining: '117' },
      meta: { total: 91, page: 1, perPage: 50, byType: { micro: 45, brewpub: 23 }, byState: { California: 91 } },
    }, 'text'),
  )

  assert.match(metaOutput, /Open Brewery DB Meta/)
  assert.match(metaOutput, /open REST API only · no auth/)
  assert.match(metaOutput, /By Type/)
  assert.match(metaOutput, /California/)
  assert.match(metaOutput, /next public-apis apis run openbrewerydb\.breweries --online --persist -- --city san_diego --per-page 200 --page 1/)
  assert.match(metaOutput, /replay public-apis apis run openbrewerydb\.meta --offline -- --city san_diego/)
  assert.match(metaOutput, /no Chrome clickstream/)
  assert.doesNotMatch(metaOutput, /^\{/)
})

test('text output renders Open Food Facts product and search without fallback JSON', () => {
  const productOutput = captureStdout(() =>
    printResult({
      kind: 'openfoodfacts.product',
      api: {
        provider: 'openfoodfacts',
        endpoint: 'GET /api/v2/product/{barcode}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: '100 product reads/min; 10 search reads/min',
      },
      query: { barcode: '737628064502' },
      found: true,
      status: 1,
      product: {
        code: '737628064502',
        name: 'Thai peanut noodle kit',
        brands: 'Simply Asia',
        quantity: '400 g',
        nutriscoreGrade: 'd',
        novaGroup: 4,
        categoriesTags: ['en:noodles'],
        labelsTags: ['en:vegetarian'],
        ingredientsText: 'Rice noodles, peanut seasoning.',
        url: 'https://world.openfoodfacts.org/product/737628064502',
      },
    }, 'text'),
  )

  assert.match(productOutput, /Open Food Facts Product/)
  assert.match(productOutput, /open REST API only · no auth/)
  assert.match(productOutput, /Thai peanut noodle kit/)
  assert.match(productOutput, /custom User-Agent/)
  assert.match(productOutput, /again public-apis apis run openfoodfacts\.product --online --persist -- --barcode 737628064502/)
  assert.match(productOutput, /replay public-apis apis run openfoodfacts\.product --offline -- --barcode 737628064502/)
  assert.doesNotMatch(productOutput, /openfoodfacts\.search/)
  assert.match(productOutput, /no Chrome clickstream/)
  assert.doesNotMatch(productOutput, /^\{/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'openfoodfacts.search',
      api: {
        provider: 'openfoodfacts',
        endpoint: 'GET /cgi/search.pl',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: '100 product reads/min; 10 search reads/min',
      },
      query: { query: 'nutella', pageSize: 2, page: 1 },
      pagination: { total: 1000, returned: 1, page: 1, pageSize: 2, pageCount: 500, maxPageSize: 100 },
      products: [
        {
          code: '3017620422003',
          name: 'Nutella',
          brands: 'Ferrero',
          quantity: '400 g',
          nutriscoreGrade: 'e',
          novaGroup: 4,
          url: 'https://world.openfoodfacts.org/product/3017620422003',
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Open Food Facts Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Nutella/)
  assert.match(searchOutput, /custom User-Agent/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)
})

test('text output renders Open Government Australia search and records without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentau.search',
      api: { provider: 'opengovernmentau', endpoint: 'GET /data/api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Australian open-data licenses', limitPolicy: 'package_search rows defaults/caps at 1000' },
      query: { query: 'business', limit: 1000 },
      count: 1,
      total: 6163,
      pagination: { returned: 1, limit: 1000, maxLimit: 1000 },
      datasets: [
        {
          id: 'bc515135-4bb6-4d50-957a-3713709a76d3',
          name: 'asic-business-names',
          title: 'ASIC - Business Names Dataset',
          organizationTitle: 'Australian Securities and Investments Commission (ASIC)',
          resources: [{ id: '55ad4b1c-5eeb-44ea-8b29-d410da431be3', name: 'Business Names Dataset - Current', format: 'CSV', datastoreActive: true }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Open Government Australia Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /ASIC - Business Names Dataset/)
  assert.match(searchOutput, /resource Business Names Dataset - Current · CSV · 55ad4b1c-5eeb-44ea-8b29-d410da431be3/)
  assert.match(searchOutput, /again public-apis apis run opengovernmentau\.search --online --persist -- --query business --limit 1000/)
  assert.match(searchOutput, /replay public-apis apis run opengovernmentau\.search --offline -- --query business --limit 1000/)
  assert.match(searchOutput, /read records public-apis apis run opengovernmentau\.records --online --persist -- --resource-id 55ad4b1c-5eeb-44ea-8b29-d410da431be3 --limit 5000/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const recordsOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentau.records',
      api: { provider: 'opengovernmentau', endpoint: 'GET /data/api/3/action/datastore_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Australian open-data licenses', limitPolicy: 'datastore_search defaults/caps at 5000' },
      query: { resourceId: '55ad4b1c-5eeb-44ea-8b29-d410da431be3', limit: 5000 },
      resourceId: '55ad4b1c-5eeb-44ea-8b29-d410da431be3',
      total: 3293016,
      fields: ['_id', 'REGISTER_NAME', 'BN_NAME', 'BN_STATUS'],
      count: 1,
      pagination: { returned: 1, limit: 5000, maxLimit: 5000 },
      records: [{ _id: 1, REGISTER_NAME: 'BUSINESS NAMES', BN_NAME: 'HOMSAFE', BN_STATUS: 'Registered' }],
    }, 'text'),
  )

  assert.match(recordsOutput, /Open Government Australia Records/)
  assert.match(recordsOutput, /open REST API only · no auth/)
  assert.match(recordsOutput, /BN_NAME=HOMSAFE/)
  assert.match(recordsOutput, /again public-apis apis run opengovernmentau\.records --online --persist -- --resource-id 55ad4b1c-5eeb-44ea-8b29-d410da431be3 --limit 5000/)
  assert.match(recordsOutput, /replay public-apis apis run opengovernmentau\.records --offline -- --resource-id 55ad4b1c-5eeb-44ea-8b29-d410da431be3 --limit 5000/)
  assert.match(recordsOutput, /search public-apis apis run opengovernmentau\.search --online --persist -- --query business --limit 1000/)
  assert.match(recordsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(recordsOutput, /^\{/)
})

test('text output renders Open Government Canada search and dataset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentcanada.search',
      api: { provider: 'opengovernmentcanada', endpoint: 'GET /data/en/api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Canadian open-data licenses', limitPolicy: 'package_search rows defaults/caps at 1000' },
      query: { query: 'business', limit: 1000 },
      count: 1,
      total: 3790,
      pagination: { returned: 1, limit: 1000, maxLimit: 1000 },
      datasets: [
        {
          id: '2d90548d-50ef-4802-91f8-c59c5cf68251',
          name: '2d90548d-50ef-4802-91f8-c59c5cf68251',
          title: 'Open Government API',
          organizationTitle: 'Treasury Board of Canada Secretariat',
          licenseTitle: 'Open Government Licence - Canada',
          resources: [{ id: '36830ed0-cd83-4fea-b2ae-15890116c68e', name: 'OpenAPI Specification', format: 'JSON', datastoreActive: false }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Open Government Canada Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Open Government API/)
  assert.match(searchOutput, /again public-apis apis run opengovernmentcanada\.search --online --persist -- --query business --limit 1000/)
  assert.match(searchOutput, /replay public-apis apis run opengovernmentcanada\.search --offline -- --query business --limit 1000/)
  assert.match(searchOutput, /detail public-apis apis run opengovernmentcanada\.dataset --online --persist -- --package-id 2d90548d-50ef-4802-91f8-c59c5cf68251/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const datasetOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentcanada.dataset',
      api: { provider: 'opengovernmentcanada', endpoint: 'GET /data/en/api/3/action/package_show', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Canadian open-data licenses', limitPolicy: 'package_show returns one metadata document' },
      query: { packageId: '2d90548d-50ef-4802-91f8-c59c5cf68251' },
      count: 1,
      dataset: {
        id: '2d90548d-50ef-4802-91f8-c59c5cf68251',
        title: 'Open Government API',
        organizationTitle: 'Treasury Board of Canada Secretariat',
        licenseTitle: 'Open Government Licence - Canada',
        resources: [{ id: '36830ed0-cd83-4fea-b2ae-15890116c68e', name: 'OpenAPI Specification', format: 'JSON', url: 'https://open.canada.ca/openapi-en.json', datastoreActive: false }],
      },
    }, 'text'),
  )

  assert.match(datasetOutput, /Open Government Canada Dataset Detail/)
  assert.match(datasetOutput, /open REST API only · no auth/)
  assert.match(datasetOutput, /OpenAPI Specification/)
  assert.match(datasetOutput, /again public-apis apis run opengovernmentcanada\.dataset --online --persist -- --package-id 2d90548d-50ef-4802-91f8-c59c5cf68251/)
  assert.match(datasetOutput, /replay public-apis apis run opengovernmentcanada\.dataset --offline -- --package-id 2d90548d-50ef-4802-91f8-c59c5cf68251/)
  assert.match(datasetOutput, /search public-apis apis run opengovernmentcanada\.search --online --persist -- --query business --limit 1000/)
  assert.match(datasetOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetOutput, /^\{/)
})

test('text output renders Open Government Germany search and dataset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentde.search',
      api: { provider: 'opengovernmentde', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'GovData license metadata', limitPolicy: 'package_search rows defaults/caps at 1000' },
      query: { query: 'verkehr', limit: 1000 },
      count: 1,
      total: 12673,
      pagination: { returned: 1, limit: 1000, maxLimit: 1000 },
      datasets: [
        {
          id: '89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7',
          name: '89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7',
          title: 'GovData Metadatenkatalog',
          organizationTitle: 'Geschäfts- und Koordinierungsstelle GovData',
          licenseTitle: 'Datenlizenz Deutschland – Zero – Version 2.0',
          resources: [{ id: '1103b63a-4500-401a-b4ff-4b6f1854c9af', name: 'JSON-LD Catalog', format: 'JSON', datastoreActive: false }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Open Government Germany Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /GovData Metadatenkatalog/)
  assert.match(searchOutput, /again public-apis apis run opengovernmentde\.search --online --persist -- --query verkehr --limit 1000/)
  assert.match(searchOutput, /replay public-apis apis run opengovernmentde\.search --offline -- --query verkehr --limit 1000/)
  assert.match(searchOutput, /detail public-apis apis run opengovernmentde\.dataset --online --persist -- --package-id 89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const datasetOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentde.dataset',
      api: { provider: 'opengovernmentde', endpoint: 'GET /api/3/action/package_show', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'GovData license metadata', limitPolicy: 'package_show returns one metadata document' },
      query: { packageId: '89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7' },
      count: 1,
      dataset: {
        id: '89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7',
        title: 'GovData Metadatenkatalog',
        organizationTitle: 'Geschäfts- und Koordinierungsstelle GovData',
        licenseTitle: 'Datenlizenz Deutschland – Zero – Version 2.0',
        resources: [{ id: '1103b63a-4500-401a-b4ff-4b6f1854c9af', name: 'JSON-LD Catalog', format: 'JSON', url: 'https://www.govdata.de/ckan/catalog/catalog.jsonld', datastoreActive: false }],
      },
    }, 'text'),
  )

  assert.match(datasetOutput, /Open Government Germany Dataset Detail/)
  assert.match(datasetOutput, /open REST API only · no auth/)
  assert.match(datasetOutput, /JSON-LD Catalog/)
  assert.match(datasetOutput, /again public-apis apis run opengovernmentde\.dataset --online --persist -- --package-id 89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7/)
  assert.match(datasetOutput, /replay public-apis apis run opengovernmentde\.dataset --offline -- --package-id 89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7/)
  assert.match(datasetOutput, /search public-apis apis run opengovernmentde\.search --online --persist -- --query verkehr --limit 1000/)
  assert.match(datasetOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetOutput, /^\{/)
})

test('text output renders Berlin Open Data search and dataset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'berlinopendata.search',
      api: { provider: 'berlinopendata', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Berlin Open Data license metadata', limitPolicy: 'package_search rows defaults to 100 and caps at 1000' },
      query: { query: 'verkehr', limit: 100 },
      count: 1,
      total: 792,
      pagination: { returned: 1, limit: 100, maxLimit: 1000 },
      datasets: [
        {
          id: '727ae619-b46c-4437-9525-4d8b964fd841',
          name: 'daten-berlin-de-metadaten',
          title: 'daten.berlin.de Metadaten',
          organizationTitle: 'BerlinOnline GmbH',
          licenseTitle: 'Creative Commons Attribution',
          resources: [{ id: '32b53cfc-a221-4986-944e-1a81b6984976', name: 'CKAN-API-Endpunkt des Datenportals', format: 'API', datastoreActive: false }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Berlin Open Data Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /daten\.berlin\.de Metadaten/)
  assert.match(searchOutput, /again public-apis apis run berlinopendata\.search --online --persist -- --query verkehr --limit 100/)
  assert.match(searchOutput, /replay public-apis apis run berlinopendata\.search --offline -- --query verkehr --limit 100/)
  assert.match(searchOutput, /detail public-apis apis run berlinopendata\.dataset --online --persist -- --package-id 727ae619-b46c-4437-9525-4d8b964fd841/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const datasetOutput = captureStdout(() =>
    printResult({
      kind: 'berlinopendata.dataset',
      api: { provider: 'berlinopendata', endpoint: 'GET /api/3/action/package_show', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Berlin Open Data license metadata', limitPolicy: 'package_show returns one metadata document' },
      query: { packageId: '727ae619-b46c-4437-9525-4d8b964fd841' },
      count: 1,
      dataset: {
        id: '727ae619-b46c-4437-9525-4d8b964fd841',
        title: 'daten.berlin.de Metadaten',
        notes: 'Die Metadaten aller bei daten.berlin.de veröffentlichten Datensätze lassen sich direkt über die CKAN-API des Datenportals abfragen.',
        organizationTitle: 'BerlinOnline GmbH',
        licenseTitle: 'Creative Commons Attribution',
        resources: [{ id: '32b53cfc-a221-4986-944e-1a81b6984976', name: 'CKAN-API-Endpunkt des Datenportals', format: 'API', url: 'https://datenregister.berlin.de/api/3/action/', datastoreActive: false }],
      },
    }, 'text'),
  )

  assert.match(datasetOutput, /Berlin Open Data Dataset Detail/)
  assert.match(datasetOutput, /open REST API only · no auth/)
  assert.match(datasetOutput, /CKAN-API-Endpunkt des Datenportals/)
  assert.match(datasetOutput, /again public-apis apis run berlinopendata\.dataset --online --persist -- --package-id 727ae619-b46c-4437-9525-4d8b964fd841/)
  assert.match(datasetOutput, /replay public-apis apis run berlinopendata\.dataset --offline -- --package-id 727ae619-b46c-4437-9525-4d8b964fd841/)
  assert.match(datasetOutput, /search public-apis apis run berlinopendata\.search --online --persist -- --query verkehr --limit 100/)
  assert.match(datasetOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetOutput, /^\{/)
})

test('text output renders Gdańsk Open Data search and dataset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'gdanskopendata.search',
      api: { provider: 'gdanskopendata', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Gdańsk Open Data license metadata', limitPolicy: 'package_search rows defaults to 100 and caps at 1000' },
      query: { query: 'transport', limit: 100 },
      count: 1,
      total: 9,
      pagination: { returned: 1, limit: 100, maxLimit: 1000 },
      datasets: [
        {
          id: 'b066863b-d402-45fd-8c04-0b66e53b51b4',
          name: 'baza-noclegowa-w-gdansku',
          title: 'Baza noclegowa w Gdańsku',
          organizationTitle: 'Urząd Miasta Gdańsk',
          licenseTitle: 'Creative Commons Attribution',
          resources: [{ id: 'sample-resource', name: 'Baza noclegowa w Gdańsku', format: 'XLSX', datastoreActive: false }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Gdańsk Open Data Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Baza noclegowa w Gdańsku/)
  assert.match(searchOutput, /again public-apis apis run gdanskopendata\.search --online --persist -- --query transport --limit 100/)
  assert.match(searchOutput, /replay public-apis apis run gdanskopendata\.search --offline -- --query transport --limit 100/)
  assert.match(searchOutput, /detail public-apis apis run gdanskopendata\.dataset --online --persist -- --package-id b066863b-d402-45fd-8c04-0b66e53b51b4/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const datasetOutput = captureStdout(() =>
    printResult({
      kind: 'gdanskopendata.dataset',
      api: { provider: 'gdanskopendata', endpoint: 'GET /api/3/action/package_show', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Gdańsk Open Data license metadata', limitPolicy: 'package_show returns one metadata document' },
      query: { packageId: 'b066863b-d402-45fd-8c04-0b66e53b51b4' },
      count: 1,
      dataset: {
        id: 'b066863b-d402-45fd-8c04-0b66e53b51b4',
        name: 'baza-noclegowa-w-gdansku',
        title: 'Baza noclegowa w Gdańsku',
        notes: 'Dane o bazie noclegowej w Gdańsku.',
        organizationTitle: 'Urząd Miasta Gdańsk',
        licenseTitle: 'Creative Commons Attribution',
        resources: [{ id: 'sample-resource', name: 'Baza noclegowa w Gdańsku', format: 'XLSX', url: 'https://example.com/sample.xlsx', datastoreActive: false }],
      },
    }, 'text'),
  )

  assert.match(datasetOutput, /Gdańsk Open Data Dataset Detail/)
  assert.match(datasetOutput, /open REST API only · no auth/)
  assert.match(datasetOutput, /Baza noclegowa w Gdańsku/)
  assert.match(datasetOutput, /again public-apis apis run gdanskopendata\.dataset --online --persist -- --package-id b066863b-d402-45fd-8c04-0b66e53b51b4/)
  assert.match(datasetOutput, /replay public-apis apis run gdanskopendata\.dataset --offline -- --package-id b066863b-d402-45fd-8c04-0b66e53b51b4/)
  assert.match(datasetOutput, /search public-apis apis run gdanskopendata\.search --online --persist -- --query transport --limit 100/)
  assert.match(datasetOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetOutput, /^\{/)
})

test('text output renders Gdynia Open Data search and dataset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'gdyniaopendata.search',
      api: { provider: 'gdyniaopendata', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Gdynia Open Data license metadata', limitPolicy: 'package_search rows defaults to 100 and caps at 1000' },
      query: { query: 'transport', limit: 100 },
      count: 1,
      total: 59,
      pagination: { returned: 1, limit: 100, maxLimit: 1000 },
      datasets: [
        {
          id: '8b80bddf-6420-4689-8f54-ba33db71dba6',
          name: 'energia-elektryczna-zakupowana-przez-gmine-miasta-gdyni-transport',
          title: 'Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport',
          organizationTitle: 'Wydział Energetyki',
          licenseTitle: 'Creative Commons Attribution',
          resources: [{ id: 'sample-resource', name: 'transport.csv', format: 'CSV', datastoreActive: true }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Gdynia Open Data Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport/)
  assert.match(searchOutput, /again public-apis apis run gdyniaopendata\.search --online --persist -- --query transport --limit 100/)
  assert.match(searchOutput, /replay public-apis apis run gdyniaopendata\.search --offline -- --query transport --limit 100/)
  assert.match(searchOutput, /detail public-apis apis run gdyniaopendata\.dataset --online --persist -- --package-id 8b80bddf-6420-4689-8f54-ba33db71dba6/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const datasetOutput = captureStdout(() =>
    printResult({
      kind: 'gdyniaopendata.dataset',
      api: { provider: 'gdyniaopendata', endpoint: 'GET /api/3/action/package_show', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Gdynia Open Data license metadata', limitPolicy: 'package_show returns one metadata document' },
      query: { packageId: '8b80bddf-6420-4689-8f54-ba33db71dba6' },
      count: 1,
      dataset: {
        id: '8b80bddf-6420-4689-8f54-ba33db71dba6',
        name: 'energia-elektryczna-zakupowana-przez-gmine-miasta-gdyni-transport',
        title: 'Energia elektryczna zakupowana przez Gminę Miasta Gdyni - Transport',
        notes: 'Źródło: na podstawie danych z przetargu',
        organizationTitle: 'Wydział Energetyki',
        licenseTitle: 'Creative Commons Attribution',
        resources: [{ id: 'sample-resource', name: 'transport.csv', format: 'CSV', url: 'https://example.com/transport.csv', datastoreActive: true }],
      },
    }, 'text'),
  )

  assert.match(datasetOutput, /Gdynia Open Data Dataset Detail/)
  assert.match(datasetOutput, /open REST API only · no auth/)
  assert.match(datasetOutput, /transport\.csv/)
  assert.match(datasetOutput, /again public-apis apis run gdyniaopendata\.dataset --online --persist -- --package-id 8b80bddf-6420-4689-8f54-ba33db71dba6/)
  assert.match(datasetOutput, /replay public-apis apis run gdyniaopendata\.dataset --offline -- --package-id 8b80bddf-6420-4689-8f54-ba33db71dba6/)
  assert.match(datasetOutput, /search public-apis apis run gdyniaopendata\.search --online --persist -- --query transport --limit 100/)
  assert.match(datasetOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetOutput, /^\{/)
})

test('text output renders Prague Open Data search and dataset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'pragueopendata.datasets',
      api: { provider: 'pragueopendata', endpoint: 'GET /lod/{catalog-id}/catalog + bounded dataset JSON-LD IRIs', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON-LD LKOD catalog API', licenseNote: 'Prague LKOD license metadata', limitPolicy: 'dataset metadata fan-out defaults to 20 and caps at 389' },
      query: { query: 'doprava', limit: 20 },
      count: 1,
      total: 389,
      matched: 1,
      pagination: { returned: 1, limit: 20, maxLimit: 389 },
      datasets: [
        {
          iri: 'https://api.lkod.cz/lod/catalog/dataset-transport',
          id: 'dataset-transport',
          title: 'Jízdní řády',
          provider: 'https://api.lkod.cz/organization/dpp',
          themes: ['http://publications.europa.eu/resource/authority/data-theme/TRAN'],
          keywords: ['doprava', 'veřejná doprava'],
          distributions: [{ iri: 'distribution-1', title: 'Jízdní řády GTFS', format: 'GTFS' }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Prague Open Data Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Jízdní řády/)
  assert.match(searchOutput, /again public-apis apis run pragueopendata\.datasets --online --persist -- --query doprava --limit 20/)
  assert.match(searchOutput, /replay public-apis apis run pragueopendata\.datasets --offline -- --query doprava --limit 20/)
  assert.match(searchOutput, /detail public-apis apis run pragueopendata\.dataset --online --persist -- --dataset-iri https:\/\/api\.lkod\.cz\/lod\/catalog\/dataset-transport/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const datasetOutput = captureStdout(() =>
    printResult({
      kind: 'pragueopendata.dataset',
      api: { provider: 'pragueopendata', endpoint: 'GET /lod/{catalog-id}/catalog/{dataset-id}', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON-LD LKOD catalog API', licenseNote: 'Prague LKOD license metadata', limitPolicy: 'one metadata document' },
      query: { datasetIri: 'https://api.lkod.cz/lod/catalog/dataset-transport' },
      count: 1,
      dataset: {
        iri: 'https://api.lkod.cz/lod/catalog/dataset-transport',
        id: 'dataset-transport',
        title: 'Jízdní řády',
        description: 'Aktuální jízdní řády sítě linek PID.',
        provider: 'https://api.lkod.cz/organization/dpp',
        themes: ['http://publications.europa.eu/resource/authority/data-theme/TRAN'],
        keywords: ['doprava', 'veřejná doprava'],
        distributions: [
          {
            iri: 'distribution-1',
            title: 'Jízdní řády GTFS',
            format: 'GTFS',
            accessUrl: 'https://opendata.iprpraha.cz/DPP/JR/jrdata.zip',
            containsPersonalData: 'https://data.gov.cz/podmínky-užití/neobsahuje-osobní-údaje/',
          },
        ],
      },
    }, 'text'),
  )

  assert.match(datasetOutput, /Prague Open Data Dataset Detail/)
  assert.match(datasetOutput, /open REST API only · no auth/)
  assert.match(datasetOutput, /Jízdní řády GTFS/)
  assert.match(datasetOutput, /again public-apis apis run pragueopendata\.dataset --online --persist -- --dataset-iri https:\/\/api\.lkod\.cz\/lod\/catalog\/dataset-transport/)
  assert.match(datasetOutput, /replay public-apis apis run pragueopendata\.dataset --offline -- --dataset-iri https:\/\/api\.lkod\.cz\/lod\/catalog\/dataset-transport/)
  assert.match(datasetOutput, /search public-apis apis run pragueopendata\.datasets --online --persist -- --query doprava --limit 20/)
  assert.match(datasetOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetOutput, /^\{/)
})

test('text output renders Toronto Open Data search and dataset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'torontoopendata.search',
      api: { provider: 'torontoopendata', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Toronto Open Data license metadata', limitPolicy: 'package_search rows defaults to 100 and caps at 1000' },
      query: { query: 'transportation', limit: 100 },
      count: 1,
      total: 120,
      pagination: { returned: 1, limit: 100, maxLimit: 1000 },
      datasets: [
        {
          id: '7795b45e-e65a-4465-81fc-c36b9dfff169',
          name: 'ttc-routes-and-schedules',
          title: 'TTC Routes and Schedules',
          organizationTitle: 'City of Toronto',
          licenseTitle: 'Open Government Licence - Toronto',
          datasetCategory: 'Document',
          topics: ['Transit', 'Transportation'],
          resources: [{ id: 'sample-resource', name: 'ttc.zip', format: 'ZIP', datastoreActive: false }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Toronto Open Data Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /TTC Routes and Schedules/)
  assert.match(searchOutput, /again public-apis apis run torontoopendata\.search --online --persist -- --query transportation --limit 100/)
  assert.match(searchOutput, /replay public-apis apis run torontoopendata\.search --offline -- --query transportation --limit 100/)
  assert.match(searchOutput, /detail public-apis apis run torontoopendata\.dataset --online --persist -- --package-id 7795b45e-e65a-4465-81fc-c36b9dfff169/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const datasetOutput = captureStdout(() =>
    printResult({
      kind: 'torontoopendata.dataset',
      api: { provider: 'torontoopendata', endpoint: 'GET /api/3/action/package_show', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'Toronto Open Data license metadata', limitPolicy: 'package_show returns one metadata document' },
      query: { packageId: 'ttc-routes-and-schedules' },
      count: 1,
      dataset: {
        id: '7795b45e-e65a-4465-81fc-c36b9dfff169',
        name: 'ttc-routes-and-schedules',
        title: 'TTC Routes and Schedules',
        notes: 'TTC routes and schedules in GTFS format.',
        organizationTitle: 'City of Toronto',
        licenseTitle: 'Open Government Licence - Toronto',
        datasetCategory: 'Document',
        topics: ['Transit', 'Transportation'],
        civicIssues: ['Mobility'],
        resources: [{ id: 'sample-resource', name: 'ttc.zip', format: 'ZIP', url: 'https://example.com/ttc.zip', datastoreActive: false }],
      },
    }, 'text'),
  )

  assert.match(datasetOutput, /Toronto Open Data Dataset Detail/)
  assert.match(datasetOutput, /open REST API only · no auth/)
  assert.match(datasetOutput, /ttc\.zip/)
  assert.match(datasetOutput, /again public-apis apis run torontoopendata\.dataset --online --persist -- --package-id ttc-routes-and-schedules/)
  assert.match(datasetOutput, /replay public-apis apis run torontoopendata\.dataset --offline -- --package-id ttc-routes-and-schedules/)
  assert.match(datasetOutput, /search public-apis apis run torontoopendata\.search --online --persist -- --query transportation --limit 100/)
  assert.match(datasetOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetOutput, /^\{/)
})

test('text output renders Open Data Minneapolis datasets without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'minneapolisopendata.datasets',
      api: { provider: 'minneapolisopendata', endpoint: 'GET /api/search/v1/collections/dataset/items', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS GeoJSON ArcGIS Hub Search API', platform: 'ArcGIS Hub', limitPolicy: 'ArcGIS Hub search caps at 100 rows' },
      query: { query: 'transportation', limit: 100 },
      count: 1,
      pagination: { returned: 1, totalMatched: 24, limit: 100, maxLimit: 100 },
      rateLimit: { limit: '10', remaining: '8', reset: '1' },
      datasets: [
        {
          id: '8f17ef750a7447fda9c505c8b8d4f7dd',
          title: 'Bikeways',
          type: 'Feature Service',
          owner: 'OpenDataMPLS',
          categories: ['/Categories/Transportation'],
          tags: ['bicycle', 'transportation'],
          modifiedAt: '2026-05-08T00:00:00.000Z',
          description: 'Bike route and trail data for Minneapolis.',
          url: 'https://opendata.minneapolismn.gov/datasets/bikeways',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Open Data Minneapolis Datasets/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /Bikeways/)
  assert.match(output, /again public-apis apis run minneapolisopendata\.datasets --online --persist -- --query transportation --limit 100/)
  assert.match(output, /replay public-apis apis run minneapolisopendata\.datasets --offline -- --query transportation --limit 100/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders FilterLists lists without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'filterlists.lists',
      api: {
        provider: 'filterlists',
        endpoint: 'GET /lists plus metadata joins',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        platform: 'FilterLists Directory API v1',
        safety: 'Catalog metadata only; the CLI does not download raw adblock/firewall filter-list contents or arbitrary view URLs.',
      },
      query: { query: 'privacy', limit: 5, tagId: 9 },
      count: 1,
      pagination: { returned: 1, totalMatched: 12, totalSafeLists: 1900, totalLists: 2000, restrictedExcluded: 100, limit: 5, maxLimit: 100 },
      lists: [
        {
          id: 302,
          name: 'EasyPrivacy',
          description: 'Privacy protection filters.',
          licenseId: 1,
          license: 'GPLv3',
          syntaxIds: [3],
          syntaxes: ['Adblock Plus'],
          languageIds: [37],
          languages: ['English'],
          tagIds: [9],
          tags: ['privacy'],
          maintainerIds: [7],
          maintainers: ['The EasyList Authors'],
        },
      ],
    }, 'text'),
  )

  assert.match(output, /FilterLists Directory Lists/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /metadata only/)
  assert.match(output, /restricted metadata rows 100/)
  assert.match(output, /EasyPrivacy/)
  assert.match(
    output,
    new RegExp([
      /again public-apis apis run filterlists\.lists --online --persist --/.source,
      / --query privacy --limit 5 --tag-id 9/.source,
    ].join(''), 'u'),
  )
  assert.match(
    output,
    new RegExp([
      /replay public-apis apis run filterlists\.lists --offline --/.source,
      / --query privacy --limit 5 --tag-id 9/.source,
    ].join(''), 'u'),
  )
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders FilterLists empty state with query-preserving replay', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'filterlists.lists',
      api: {
        provider: 'filterlists',
        endpoint: 'GET /lists plus metadata joins',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        platform: 'FilterLists Directory API v1',
        safety: 'Catalog metadata only.',
      },
      query: { query: 'no-match', limit: 5, syntaxId: 3 },
      count: 0,
      pagination: {
        returned: 0,
        totalMatched: 0,
        totalSafeLists: 1900,
        totalLists: 2000,
        restrictedExcluded: 100,
        limit: 5,
        maxLimit: 100,
      },
      lists: [],
    }, 'text'),
  )

  assert.match(output, /No FilterLists metadata rows matched this query/)
  const againPattern = [
    /again public-apis apis run filterlists\.lists --online --persist --/.source,
    / --query no-match --limit 5 --syntax-id 3/.source,
  ].join('')
  const replayPattern = [
    /replay public-apis apis run filterlists\.lists --offline --/.source,
    / --query no-match --limit 5 --syntax-id 3/.source,
  ].join('')
  assert.match(
    output,
    new RegExp(againPattern, 'u'),
  )
  assert.match(
    output,
    new RegExp(replayPattern, 'u'),
  )
})

test('text output renders Umeå Open Data datasets without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'umeaopendata.datasets',
      api: { provider: 'umeaopendata', endpoint: 'GET /api/explore/v2.1/catalog/datasets', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON Opendatasoft Explore API', platform: 'Opendatasoft Explore v2.1', limitPolicy: 'catalog pages cap at 100 rows' },
      query: { query: 'transport', limit: 2, offset: 0, language: 'en' },
      count: 1,
      pagination: { returned: 1, totalMatched: 14, limit: 2, offset: 0, maxLimit: 100, maxOffset: 9900 },
      rateLimit: { limit: '5000', remaining: '4999', reset: '2026-05-10 00:00:00+00:00' },
      datasets: [
        {
          id: 'umea-transportation-emissions-google-data',
          uid: 'da_m05800',
          title: 'Umeå city, number of trips and transport emissions',
          publisher: 'Umeå kommun',
          themes: ['Transport', 'Environment'],
          keywords: ['emissions', 'trips'],
          license: 'CC BY 3.0',
          modifiedAt: '2026-01-21T11:45:51.961000+00:00',
          recordsCount: 94,
          features: ['timeserie', 'analyze'],
          fields: [{ name: 'year', label: 'Year', type: 'date' }, { name: 'mode', label: 'Mode', type: 'text' }],
          description: 'Google Environmental Insights Explorer transport emissions.',
          url: 'https://opendata.umea.se/explore/dataset/umea-transportation-emissions-google-data/',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Umeå Open Data Datasets/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /Umeå city, number of trips and transport emissions/)
  assert.match(output, /again public-apis apis run umeaopendata\.datasets --online --persist -- --query transport --limit 2 --offset 0 --language en/)
  assert.match(output, /replay public-apis apis run umeaopendata\.datasets --offline -- --query transport --limit 2 --offset 0 --language en/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Helsinki Region Infoshare search and dataset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'helsinkiopendata.search',
      api: { provider: 'helsinkiopendata', endpoint: 'GET /data/api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'HRI license metadata', limitPolicy: 'package_search rows defaults to 100 and caps at 1000' },
      query: { query: 'transport', limit: 100 },
      count: 1,
      total: 56,
      pagination: { returned: 1, limit: 100, maxLimit: 1000 },
      datasets: [
        {
          id: '0ba02e5d-9f06-496a-8354-bb15beec5629',
          name: 'helsingin-liikennemittausten-tilastorajapinta',
          title: 'Helsingin liikennemittausten tilastorajapinta',
          organizationTitle: 'Helsingin kaupunkiympäristön toimiala',
          licenseTitle: 'Creative Commons Attribution 4.0',
          resources: [{ id: 'sample-resource', name: 'REST-rajapinta (JSON / GeoJSON)', format: 'JSON', datastoreActive: false }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Helsinki Region Infoshare Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Helsingin liikennemittausten tilastorajapinta/)
  assert.match(searchOutput, /again public-apis apis run helsinkiopendata\.search --online --persist -- --query transport --limit 100/)
  assert.match(searchOutput, /replay public-apis apis run helsinkiopendata\.search --offline -- --query transport --limit 100/)
  assert.match(searchOutput, /detail public-apis apis run helsinkiopendata\.dataset --online --persist -- --package-id 0ba02e5d-9f06-496a-8354-bb15beec5629/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const datasetOutput = captureStdout(() =>
    printResult({
      kind: 'helsinkiopendata.dataset',
      api: { provider: 'helsinkiopendata', endpoint: 'GET /data/api/3/action/package_show', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'HRI license metadata', limitPolicy: 'package_show returns one metadata document' },
      query: { packageId: '0ba02e5d-9f06-496a-8354-bb15beec5629' },
      count: 1,
      dataset: {
        id: '0ba02e5d-9f06-496a-8354-bb15beec5629',
        name: 'helsingin-liikennemittausten-tilastorajapinta',
        title: 'Helsingin liikennemittausten tilastorajapinta',
        notes: 'Aineistokokonaisuus sisältää Helsingin liikenteen määrä-, keskinopeus- ja ajoneuvojakaumatietoja.',
        organizationTitle: 'Helsingin kaupunkiympäristön toimiala',
        licenseTitle: 'Creative Commons Attribution 4.0',
        resources: [{ id: 'sample-resource', name: 'REST-rajapinta (JSON / GeoJSON)', format: 'JSON', url: 'https://lidotiku.api.hel.fi/swagger', datastoreActive: false }],
      },
    }, 'text'),
  )

  assert.match(datasetOutput, /Helsinki Region Infoshare Dataset Detail/)
  assert.match(datasetOutput, /open REST API only · no auth/)
  assert.match(datasetOutput, /REST-rajapinta/)
  assert.match(datasetOutput, /again public-apis apis run helsinkiopendata\.dataset --online --persist -- --package-id 0ba02e5d-9f06-496a-8354-bb15beec5629/)
  assert.match(datasetOutput, /replay public-apis apis run helsinkiopendata\.dataset --offline -- --package-id 0ba02e5d-9f06-496a-8354-bb15beec5629/)
  assert.match(datasetOutput, /search public-apis apis run helsinkiopendata\.search --online --persist -- --query transport --limit 100/)
  assert.match(datasetOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetOutput, /^\{/)
})

test('text output renders Open Government UK search and dataset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentuk.search',
      api: { provider: 'opengovernmentuk', endpoint: 'GET /api/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'UK data.gov.uk licence metadata', limitPolicy: 'package_search rows defaults/caps at 1000' },
      query: { query: 'business', limit: 1000 },
      count: 1,
      total: 5731,
      pagination: { returned: 1, limit: 1000, maxLimit: 1000 },
      datasets: [
        {
          id: '6d3d7654-4992-4203-92e8-81bfd6fd258b',
          name: '6d3d7654-4992-4203-92e8-81bfd6fd258b',
          title: 'Business Rates - Small Business Rate Relief',
          organizationTitle: 'Calderdale Metropolitan Borough Council',
          licenseTitle: 'UK Open Government Licence',
          resources: [{ id: '29427c66-7785-4c2e-a361-5694bb02c531', name: 'Small Business rates relief - October 2025', format: 'JSON', datastoreActive: false }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Open Government UK Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Business Rates - Small Business Rate Relief/)
  assert.match(searchOutput, /again public-apis apis run opengovernmentuk\.search --online --persist -- --query business --limit 1000/)
  assert.match(searchOutput, /replay public-apis apis run opengovernmentuk\.search --offline -- --query business --limit 1000/)
  assert.match(searchOutput, /detail public-apis apis run opengovernmentuk\.dataset --online --persist -- --package-id 6d3d7654-4992-4203-92e8-81bfd6fd258b/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const datasetOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentuk.dataset',
      api: { provider: 'opengovernmentuk', endpoint: 'GET /api/action/package_show', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'UK data.gov.uk licence metadata', limitPolicy: 'package_show returns one metadata document' },
      query: { packageId: '6d3d7654-4992-4203-92e8-81bfd6fd258b' },
      count: 1,
      dataset: {
        id: '6d3d7654-4992-4203-92e8-81bfd6fd258b',
        title: 'Business Rates - Small Business Rate Relief',
        organizationTitle: 'Calderdale Metropolitan Borough Council',
        licenseTitle: 'UK Open Government Licence',
        resources: [{ id: '29427c66-7785-4c2e-a361-5694bb02c531', name: 'Small Business rates relief - October 2025', format: 'JSON', url: 'https://data.gov.uk/dataset/business-rates-small-business-rate-relief1', datastoreActive: false }],
      },
    }, 'text'),
  )

  assert.match(datasetOutput, /Open Government UK Dataset Detail/)
  assert.match(datasetOutput, /open REST API only · no auth/)
  assert.match(datasetOutput, /Small Business rates relief - October 2025/)
  assert.match(datasetOutput, /again public-apis apis run opengovernmentuk\.dataset --online --persist -- --package-id 6d3d7654-4992-4203-92e8-81bfd6fd258b/)
  assert.match(datasetOutput, /replay public-apis apis run opengovernmentuk\.dataset --offline -- --package-id 6d3d7654-4992-4203-92e8-81bfd6fd258b/)
  assert.match(datasetOutput, /search public-apis apis run opengovernmentuk\.search --online --persist -- --query business --limit 1000/)
  assert.match(datasetOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetOutput, /^\{/)
})

test('text output renders Open Government USA search, organizations, and keywords without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentusa.search',
      api: { provider: 'opengovernmentusa', endpoint: 'GET /search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON catalog API', licenseNote: 'data.gov catalog metadata', limitPolicy: 'search per_page defaults/caps at 1000' },
      query: { query: 'business', limit: 1000, orgSlug: 'sba' },
      count: 1,
      total: 5731,
      after: 'cursor-2',
      pagination: { returned: 1, limit: 1000, maxLimit: 1000 },
      datasets: [
        {
          identifier: 'SBA-GCBD-2014-08-001',
          slug: 'small-business-size-standards',
          title: 'Small Business Size Standards',
          publisher: 'Small Business Administration',
          accessLevel: 'public',
          organization: { name: 'Small Business Administration', slug: 'sba' },
          keyword: ['SBA', 'small business', 'standards'],
          resources: [{ title: 'Small Business Size Standards', accessUrl: 'https://data.sba.gov/dataset/small-business-size-standards' }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Open Government USA Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Small Business Size Standards/)
  assert.match(searchOutput, /again public-apis apis run opengovernmentusa\.search --online --persist -- --query business --limit 1000 --org-slug sba/)
  assert.match(searchOutput, /replay public-apis apis run opengovernmentusa\.search --offline -- --query business --limit 1000 --org-slug sba/)
  assert.match(searchOutput, /next page public-apis apis run opengovernmentusa\.search --online --persist -- --query business --limit 1000 --org-slug sba --after cursor-2/)
  assert.match(searchOutput, /organizations public-apis apis run opengovernmentusa\.organizations --online --persist -- --limit 120/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const organizationsOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentusa.organizations',
      api: { provider: 'opengovernmentusa', endpoint: 'GET /api/organizations', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON catalog API', licenseNote: 'data.gov organization metadata', limitPolicy: 'organizations returns one public list; CLI caps at 120' },
      query: { limit: 120 },
      count: 1,
      pagination: { returned: 1, limit: 120, maxLimit: 120 },
      organizations: [{ id: 'fb3131aa-ef06-4a00-ad84-67d93a71d7e3', name: 'U.S. Census Bureau, Department of Commerce', slug: 'census', organizationType: 'Federal Government', datasetCount: 284033, sourceCount: 590 }],
    }, 'text'),
  )

  assert.match(organizationsOutput, /Open Government USA Organizations/)
  assert.match(organizationsOutput, /open REST API only · no auth/)
  assert.match(organizationsOutput, /U\.S\. Census Bureau/)
  assert.match(organizationsOutput, /again public-apis apis run opengovernmentusa\.organizations --online --persist -- --limit 120/)
  assert.match(organizationsOutput, /replay public-apis apis run opengovernmentusa\.organizations --offline -- --limit 120/)
  assert.match(organizationsOutput, /org search public-apis apis run opengovernmentusa\.search --online --persist -- --query business --org-slug census --limit 1000/)
  assert.match(organizationsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(organizationsOutput, /^\{/)

  const keywordsOutput = captureStdout(() =>
    printResult({
      kind: 'opengovernmentusa.keywords',
      api: { provider: 'opengovernmentusa', endpoint: 'GET /api/keywords', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON catalog API', licenseNote: 'data.gov keyword metadata', limitPolicy: 'keywords size defaults/caps at 1000' },
      query: { size: 1000, minCount: 1 },
      count: 2,
      total: 2,
      pagination: { returned: 2, limit: 1000, maxLimit: 1000 },
      keywords: [{ keyword: 'county or equivalent entity', count: 257307 }, { keyword: 'state fips code', count: 152182 }],
    }, 'text'),
  )

  assert.match(keywordsOutput, /Open Government USA Keywords/)
  assert.match(keywordsOutput, /open REST API only · no auth/)
  assert.match(keywordsOutput, /county or equivalent entity/)
  assert.match(keywordsOutput, /again public-apis apis run opengovernmentusa\.keywords --online --persist -- --size 1000 --min-count 1/)
  assert.match(keywordsOutput, /replay public-apis apis run opengovernmentusa\.keywords --offline -- --size 1000 --min-count 1/)
  assert.match(keywordsOutput, /keyword search public-apis apis run opengovernmentusa\.search --online --persist -- --query 'county or equivalent entity' --limit 1000/)
  assert.match(keywordsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(keywordsOutput, /^\{/)
})

test('text output renders USAspending awards, over-time, and agencies without fallback JSON', () => {
  const awardsOutput = captureStdout(() =>
    printResult({
      kind: 'usaspending.awards',
      api: { provider: 'usaspending', endpoint: 'POST /api/v2/search/spending_by_award/', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST API', licenseNote: 'public federal spending data', limitPolicy: 'awards default/cap 100' },
      query: { startDate: '2024-10-01', endDate: '2025-09-30', limit: 100, page: 1 },
      count: 1,
      spendingLevel: 'awards',
      page: { returned: 1, page: 1, limit: 100, maxLimit: 100, total: 1 },
      messages: [],
      awards: [{ awardId: 'HT940216C0001', recipientName: 'HUMANA GOVERNMENT BUSINESS INC', awardAmount: 51269205263.03, awardingAgency: 'Department of Defense', startDate: '2016-08-01', endDate: '2025-12-31', description: 'IGF::OT::IGF' }],
    }, 'text'),
  )

  assert.match(awardsOutput, /USAspending Awards/)
  assert.match(awardsOutput, /open REST API only · no auth/)
  assert.match(awardsOutput, /HUMANA GOVERNMENT BUSINESS INC/)
  assert.match(awardsOutput, /again public-apis apis run usaspending\.awards --online --persist -- --start-date 2024-10-01 --end-date 2025-09-30 --award-type-codes A,B,C,D --limit 100 --page 1 --sort 'Award Amount' --order desc/)
  assert.match(awardsOutput, /replay public-apis apis run usaspending\.awards --offline -- --start-date 2024-10-01 --end-date 2025-09-30 --award-type-codes A,B,C,D --limit 100 --page 1 --sort 'Award Amount' --order desc/)
  assert.match(awardsOutput, /summary public-apis apis run usaspending\.overTime --online --persist -- --start-date 2024-10-01 --end-date 2025-09-30 --award-type-codes A,B,C,D --group fiscal_year/)
  assert.match(awardsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(awardsOutput, /^\{/)

  const overTimeOutput = captureStdout(() =>
    printResult({
      kind: 'usaspending.overTime',
      api: { provider: 'usaspending', endpoint: 'POST /api/v2/search/spending_over_time/', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST API', licenseNote: 'public federal spending data', limitPolicy: 'one aggregate series' },
      query: { startDate: '2024-10-01', endDate: '2025-09-30', group: 'fiscal_year' },
      count: 1,
      group: 'fiscal_year',
      spendingLevel: 'awards',
      messages: ['time period note'],
      totals: { aggregatedAmount: 1837329531356.32, totalOutlays: 252223947671.66 },
      periods: [{ label: '2025', aggregatedAmount: 1837329531356.32, totalOutlays: 252223947671.66, contractObligations: 1837329531356.32, grantObligations: 0, loanObligations: 0 }],
    }, 'text'),
  )

  assert.match(overTimeOutput, /USAspending Over Time/)
  assert.match(overTimeOutput, /open REST API only · no auth/)
  assert.match(overTimeOutput, /2025/)
  assert.match(overTimeOutput, /again public-apis apis run usaspending\.overTime --online --persist -- --start-date 2024-10-01 --end-date 2025-09-30 --award-type-codes A,B,C,D --group fiscal_year/)
  assert.match(overTimeOutput, /replay public-apis apis run usaspending\.overTime --offline -- --start-date 2024-10-01 --end-date 2025-09-30 --award-type-codes A,B,C,D --group fiscal_year/)
  assert.match(overTimeOutput, /awards public-apis apis run usaspending\.awards --online --persist -- --start-date 2024-10-01 --end-date 2025-09-30 --award-type-codes A,B,C,D --limit 100 --page 1 --sort 'Award Amount' --order desc/)
  assert.match(overTimeOutput, /no Chrome clickstream/)
  assert.doesNotMatch(overTimeOutput, /^\{/)

  const agenciesOutput = captureStdout(() =>
    printResult({
      kind: 'usaspending.agencies',
      api: { provider: 'usaspending', endpoint: 'GET /api/v2/references/toptier_agencies/', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST API', licenseNote: 'public federal spending data', limitPolicy: 'one public list' },
      query: { limit: 100, sort: 'budget_authority_amount', order: 'desc' },
      count: 1,
      pagination: { returned: 1, limit: 100, maxLimit: 200 },
      agencies: [{ agencyId: 456, abbreviation: 'TREAS', agencyName: 'Department of the Treasury', budgetAuthorityAmount: 5571642140279.95, obligatedAmount: 1037806753785.61, outlayAmount: 1036662242415.49, percentageOfTotalBudgetAuthority: 0.3450647423162162 }],
    }, 'text'),
  )

  assert.match(agenciesOutput, /USAspending Toptier Agencies/)
  assert.match(agenciesOutput, /open REST API only · no auth/)
  assert.match(agenciesOutput, /Department of the Treasury/)
  assert.match(agenciesOutput, /again public-apis apis run usaspending\.agencies --online --persist -- --limit 100 --sort budget_authority_amount --order desc/)
  assert.match(agenciesOutput, /replay public-apis apis run usaspending\.agencies --offline -- --limit 100 --sort budget_authority_amount --order desc/)
  assert.match(agenciesOutput, /agency awards public-apis apis run usaspending\.awards --online --persist -- --awarding-agency 'Department of the Treasury' --limit 100/)
  assert.match(agenciesOutput, /no Chrome clickstream/)
  assert.doesNotMatch(agenciesOutput, /^\{/)
})

test('text output renders WhiskyHunter distilleries without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'whiskyhunter.distilleries',
      api: {
        provider: 'whiskyhunter',
        endpoint: 'GET /api/distilleries_info/',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { country: 'Scotland', limit: 2 },
      pagination: { returned: 2, upstreamTotal: 313, limit: 2, maxLimit: 313 },
      distilleries: [
        { name: '8 Doors Distillery', slug: '8_doors', country: 'Scotland' },
        { name: 'Aberfeldy', slug: 'aberfeldy', country: 'Scotland' },
      ],
    }, 'text'),
  )

  assert.match(output, /WhiskyHunter Distilleries/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /8 Doors Distillery/)
  assert.match(output, /auction\/item routes excluded/)
  assert.match(output, /again public-apis apis run whiskyhunter\.distilleries --online --persist -- --country Scotland --limit 2/)
  assert.match(output, /replay public-apis apis run whiskyhunter\.distilleries --offline -- --country Scotland --limit 2/)
  assert.match(output, /browse all public-apis apis run whiskyhunter\.distilleries --online --persist -- --limit 313/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)

  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'whiskyhunter.distilleries',
      api: {
        provider: 'whiskyhunter',
        endpoint: 'GET /api/distilleries_info/',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { query: 'zzznotrealzz', limit: 5 },
      pagination: { returned: 0, upstreamTotal: 313, limit: 5, maxLimit: 313 },
      distilleries: [],
    }, 'text'),
  )

  assert.match(emptyOutput, /No WhiskyHunter distilleries returned/)
  assert.match(emptyOutput, /try public-apis apis run whiskyhunter\.distilleries --online --persist -- --country Scotland --limit 20/)
  assert.match(emptyOutput, /broaden public-apis apis run whiskyhunter\.distilleries --online --persist -- --limit 313/)
})

test('text output renders NHTSA decode and makes without fallback JSON', () => {
  const decodeOutput = captureStdout(() =>
    printResult({
      kind: 'nhtsa.decodeVin',
      api: {
        provider: 'nhtsa',
        endpoint: 'GET /vehicles/DecodeVinValues/{vin}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateControl: 'NHTSA automated traffic rate control applies',
      },
      query: { vin: '1HGCM82633A004352', modelYear: 2003 },
      count: 1,
      message: 'Results returned successfully',
      decode: {
        make: 'HONDA',
        model: 'Accord',
        modelYear: '2003',
        vehicleType: 'PASSENGER CAR',
        bodyClass: 'Sedan/Saloon',
        fuelTypePrimary: 'Gasoline',
        plantCountry: 'UNITED STATES (USA)',
        manufacturer: 'AMERICAN HONDA MOTOR CO., INC.',
        errorCode: '0',
        errorText: '0 - VIN decoded clean.',
      },
    }, 'text'),
  )

  assert.match(decodeOutput, /NHTSA vPIC VIN Decode/)
  assert.match(decodeOutput, /open REST API only · no auth/)
  assert.match(decodeOutput, /HONDA Accord/)
  assert.match(decodeOutput, /no Chrome clickstream/)
  assert.match(decodeOutput, /again public-apis apis run nhtsa\.decodeVin --online --persist -- --vin 1HGCM82633A004352 --model-year 2003/)
  assert.match(decodeOutput, /replay public-apis apis run nhtsa\.decodeVin --offline -- --vin 1HGCM82633A004352 --model-year 2003/)
  assert.match(decodeOutput, /makes public-apis apis run nhtsa\.makesForType --online --persist -- --vehicle-type car --limit 200/)
  assert.doesNotMatch(decodeOutput, /^\{/)

  const emptyDecodeOutput = captureStdout(() =>
    printResult({
      kind: 'nhtsa.decodeVin',
      api: {
        provider: 'nhtsa',
        endpoint: 'GET /vehicles/DecodeVinValues/{vin}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateControl: 'NHTSA automated traffic rate control applies',
      },
      query: { vin: '11111111111111111', modelYear: 2003 },
      count: 0,
      message: 'Response returned successfully',
    }, 'text'),
  )

  assert.match(emptyDecodeOutput, /No NHTSA VIN decode result returned for this query/)
  assert.match(emptyDecodeOutput, /retry public-apis apis run nhtsa\.decodeVin --online --persist -- --vin 11111111111111111 --model-year 2003/)
  assert.match(emptyDecodeOutput, /example public-apis apis run nhtsa\.decodeVin --online --persist -- --vin 1HGCM82633A004352 --model-year 2003/)
  assert.doesNotMatch(emptyDecodeOutput, /^\{/)

  const makesOutput = captureStdout(() =>
    printResult({
      kind: 'nhtsa.makesForType',
      api: {
        provider: 'nhtsa',
        endpoint: 'GET /vehicles/GetMakesForVehicleType/{vehicleType}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateControl: 'NHTSA automated traffic rate control applies',
      },
      query: { vehicleType: 'car', limit: 2 },
      pagination: { returned: 2, upstreamTotal: 2, limit: 2, maxLimit: 500 },
      makes: [
        { makeId: 440, makeName: 'ASTON MARTIN', vehicleTypeId: 2, vehicleTypeName: 'Passenger Car' },
        { makeId: 441, makeName: 'TESLA', vehicleTypeId: 2, vehicleTypeName: 'Passenger Car' },
      ],
    }, 'text'),
  )

  assert.match(makesOutput, /NHTSA vPIC Makes For Vehicle Type/)
  assert.match(makesOutput, /open REST API only · no auth/)
  assert.match(makesOutput, /ASTON MARTIN/)
  assert.match(makesOutput, /no Chrome clickstream/)
  assert.match(makesOutput, /again public-apis apis run nhtsa\.makesForType --online --persist -- --vehicle-type car --limit 2/)
  assert.match(makesOutput, /replay public-apis apis run nhtsa\.makesForType --offline -- --vehicle-type car --limit 2/)
  assert.match(makesOutput, /decode public-apis apis run nhtsa\.decodeVin --online --persist -- --vin 1HGCM82633A004352 --model-year 2003/)
  assert.doesNotMatch(makesOutput, /^\{/)

  const emptyMakesOutput = captureStdout(() =>
    printResult({
      kind: 'nhtsa.makesForType',
      api: {
        provider: 'nhtsa',
        endpoint: 'GET /vehicles/GetMakesForVehicleType/{vehicleType}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateControl: 'NHTSA automated traffic rate control applies',
      },
      query: { vehicleType: 'xyznotatype', limit: 5 },
      pagination: { returned: 0, upstreamTotal: 0, limit: 5, maxLimit: 500 },
      makes: [],
    }, 'text'),
  )

  assert.match(emptyMakesOutput, /No NHTSA makes returned for this vehicle type/)
  assert.match(emptyMakesOutput, /again public-apis apis run nhtsa\.makesForType --online --persist -- --vehicle-type xyznotatype --limit 5/)
  assert.match(emptyMakesOutput, /reset public-apis apis run nhtsa\.makesForType --online --persist -- --vehicle-type car --limit 200/)
  assert.doesNotMatch(emptyMakesOutput, /^\{/)
})

test('text output renders NVD CVEs without fallback JSON', () => {
  const againPattern = [
    /again public-apis apis run nvd\.cves/.source,
    / --online --persist -- --cve-id CVE-2024-3094/.source,
    / --limit 1/.source,
  ].join('')
  const replayPattern = [
    /replay public-apis apis run nvd\.cves/.source,
    / --offline -- --cve-id CVE-2024-3094/.source,
    / --limit 1/.source,
  ].join('')
  const output = captureStdout(() =>
    printResult({
      kind: 'nvd.cves',
      api: {
        provider: 'nvd',
        endpoint: 'GET /rest/json/cves/2.0',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        platform: 'NVD 2.0 CVE API',
        safety: [
          'Read-only public CVE metadata only; raw exploit databases,',
          'arbitrary references, CPE expansion, and API-key workflows',
          'are not exposed.',
        ].join(' '),
        defaultSearch: 'openssl',
      },
      query: { cveId: 'CVE-2024-3094', limit: 1 },
      count: 1,
      pagination: {
        returned: 1,
        totalMatched: 1,
        resultsPerPage: 1,
        startIndex: 0,
        limit: 1,
        maxLimit: 50,
      },
      cves: [
        {
          id: 'CVE-2024-3094',
          status: 'Modified',
          published: '2024-03-29T17:15:21.150',
          lastModified: '2025-08-19T01:15:57.407',
          description: 'Malicious code was discovered in the upstream tarballs of xz.',
          cvss: {
            version: '3.1',
            baseScore: 10,
            baseSeverity: 'CRITICAL',
            vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
          },
          weaknesses: ['CWE-506'],
          referenceCount: 2,
          safeReferences: [{
            url: 'https://access.redhat.com/security/cve/CVE-2024-3094',
            source: 'Red Hat',
            tags: ['Vendor Advisory'],
          }],
        },
      ],
    }, 'text'),
  )

  assert.match(output, /National Vulnerability Database CVEs/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /read-only CVE metadata/)
  assert.match(output, /CVE-2024-3094/)
  assert.match(output, new RegExp(againPattern, 'u'))
  assert.match(output, new RegExp(replayPattern, 'u'))
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders NVD empty state with query-preserving replay', () => {
  const againPattern = [
    /again public-apis apis run nvd\.cves/.source,
    / --online --persist -- --keyword no-results/.source,
    / --severity critical --limit 2/.source,
  ].join('')
  const replayPattern = [
    /replay public-apis apis run nvd\.cves/.source,
    / --offline -- --keyword no-results/.source,
    / --severity critical --limit 2/.source,
  ].join('')
  const output = captureStdout(() =>
    printResult({
      kind: 'nvd.cves',
      api: {
        provider: 'nvd',
        endpoint: 'GET /rest/json/cves/2.0',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        platform: 'NVD 2.0 CVE API',
        safety: 'Read-only public CVE metadata only.',
        defaultSearch: 'openssl',
      },
      query: { keyword: 'no-results', severity: 'critical', limit: 2 },
      count: 0,
      pagination: {
        returned: 0,
        totalMatched: 0,
        resultsPerPage: 2,
        startIndex: 0,
        limit: 2,
        maxLimit: 50,
      },
      cves: [],
    }, 'text'),
  )

  assert.match(output, /No NVD CVE metadata matched this query/)
  assert.match(output, new RegExp(againPattern, 'u'))
  assert.match(output, new RegExp(replayPattern, 'u'))
})

test('text output renders UK Police street crimes without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'ukpolice.streetCrimes',
      api: {
        provider: 'ukpolice',
        endpoint: 'GET /api/crimes-street/vehicle-crime',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        platform: 'data.police.uk API',
        safety: [
          'Read-only public street-level crime records only; no incident',
          'reporting, police contact workflows, free-form polygons,',
          'stop-and-search, or person lookup surfaces are exposed.',
        ].join(' '),
      },
      query: {
        latitude: 52.629729,
        longitude: -1.131592,
        category: 'vehicle-crime',
        date: '2024-01',
        limit: 2,
      },
      count: 1,
      pagination: {
        returned: 1,
        totalAvailable: 1,
        truncated: false,
        limit: 2,
        maxLimit: 100,
      },
      latestKnownDate: '2024-01',
      crimes: [
        {
          id: 111,
          category: 'vehicle-crime',
          month: '2024-01',
          location: {
            latitude: 52.635488,
            longitude: -1.129413,
            streetName: 'On or near High Street',
          },
          outcomeStatus: {
            category: 'Investigation complete; no suspect identified',
            date: '2024-02',
          },
          persistentIdPresent: true,
        },
      ],
    }, 'text'),
  )

  assert.match(output, /UK Police Street-level Crimes/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /public approximate street-level open data/)
  assert.match(output, /vehicle-crime/)
  const populatedAgain = [
    /again public-apis apis run ukpolice\.streetCrimes --online --persist --/,
    /--latitude 52\.629729 --longitude -1\.131592/,
    /--category vehicle-crime --date 2024-01 --limit 2/,
  ].map(pattern => pattern.source).join(' ')
  const populatedReplay = [
    /replay public-apis apis run ukpolice\.streetCrimes --offline --/,
    /--latitude 52\.629729 --longitude -1\.131592/,
    /--category vehicle-crime --date 2024-01 --limit 2/,
  ].map(pattern => pattern.source).join(' ')
  assert.match(
    output,
    new RegExp(populatedAgain, 'u'),
  )
  assert.match(
    output,
    new RegExp(populatedReplay, 'u'),
  )
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders UK Police empty-state replay command', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'ukpolice.streetCrimes',
      api: {
        provider: 'ukpolice',
        endpoint: 'GET /api/crimes-street/all-crime',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        platform: 'data.police.uk API',
        safety: 'Read-only public street-level crime records only.',
      },
      query: {
        latitude: 0,
        longitude: 0,
        category: 'all-crime',
        date: '2024-01',
        limit: 2,
      },
      count: 0,
      pagination: {
        returned: 0,
        totalAvailable: 0,
        truncated: false,
        limit: 2,
        maxLimit: 100,
      },
      crimes: [],
    }, 'text'),
  )

  assert.match(output, /No UK Police street-crime rows returned for this query/)
  const emptyAgain = [
    /again public-apis apis run ukpolice\.streetCrimes --online --persist --/,
    /--latitude 0 --longitude 0 --category all-crime/,
    /--date 2024-01 --limit 2/,
  ].map(pattern => pattern.source).join(' ')
  const emptyReplay = [
    /replay public-apis apis run ukpolice\.streetCrimes --offline --/,
    /--latitude 0 --longitude 0 --category all-crime/,
    /--date 2024-01 --limit 2/,
  ].map(pattern => pattern.source).join(' ')
  assert.match(
    output,
    new RegExp(emptyAgain, 'u'),
  )
  assert.match(
    output,
    new RegExp(emptyReplay, 'u'),
  )
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Open-Meteo forecast and geocoding without fallback JSON', () => {
  const forecastOutput = captureStdout(() =>
    printResult({
      kind: 'openmeteo.forecast',
      api: { provider: 'openmeteo', endpoint: 'GET /v1/forecast', authentication: 'none', usesBrowserClickstream: false },
      query: { latitude: 52.52, longitude: 13.41, forecastDays: 2, timezone: 'auto' },
      location: { latitude: 52.52, longitude: 13.42, timezone: 'Europe/Berlin' },
      current: { time: '2026-05-03T23:15', temperature_2m: 21.4, wind_speed_10m: 4.4, weather_code: 3 },
      currentUnits: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
      daily: { time: ['2026-05-03'], temperature_2m_max: [28.4], temperature_2m_min: [11.2], precipitation_sum: [0] },
      dailyUnits: {},
      pagination: { forecastDays: 2, maxForecastDays: 16, dailyRows: 1 },
    }, 'text'),
  )

  assert.match(forecastOutput, /Open-Meteo Forecast/)
  assert.match(forecastOutput, /open REST API only · no auth/)
  assert.match(forecastOutput, /Daily/)
  assert.match(forecastOutput, /no Chrome clickstream/)
  assert.match(forecastOutput, /again public-apis apis run openmeteo\.forecast --online --persist -- --latitude 52\.52 --longitude 13\.41 --forecast-days 2 --timezone auto/)
  assert.match(forecastOutput, /replay public-apis apis run openmeteo\.forecast --offline -- --latitude 52\.52 --longitude 13\.41 --forecast-days 2 --timezone auto/)
  assert.match(forecastOutput, /places public-apis apis run openmeteo\.geocoding --online --persist -- --name Berlin --count 100/)
  assert.doesNotMatch(forecastOutput, /^\{/)

  const geocodingOutput = captureStdout(() =>
    printResult({
      kind: 'openmeteo.geocoding',
      api: { provider: 'openmeteo', endpoint: 'GET /v1/search', authentication: 'none', usesBrowserClickstream: false },
      query: { name: 'Berlin', count: 2, language: 'en' },
      pagination: { returned: 1, count: 2, maxCount: 100 },
      locations: [
        { id: 2950159, name: 'Berlin', latitude: 52.52437, longitude: 13.41053, timezone: 'Europe/Berlin', country: 'Germany', countryCode: 'DE', population: 3426354, admin1: 'State of Berlin' },
      ],
    }, 'text'),
  )

  assert.match(geocodingOutput, /Open-Meteo Geocoding/)
  assert.match(geocodingOutput, /open REST API only · no auth/)
  assert.match(geocodingOutput, /Berlin/)
  assert.match(geocodingOutput, /no Chrome clickstream/)
  assert.match(geocodingOutput, /again public-apis apis run openmeteo\.geocoding --online --persist -- --name Berlin --count 2 --language en/)
  assert.match(geocodingOutput, /replay public-apis apis run openmeteo\.geocoding --offline -- --name Berlin --count 2 --language en/)
  assert.match(geocodingOutput, /forecast public-apis apis run openmeteo\.forecast --online --persist -- --latitude 52\.52437 --longitude 13\.41053 --forecast-days 16 --timezone auto/)
  assert.doesNotMatch(geocodingOutput, /^\{/)

  const emptyGeocodingOutput = captureStdout(() =>
    printResult({
      kind: 'openmeteo.geocoding',
      api: { provider: 'openmeteo', endpoint: 'GET /v1/search', authentication: 'none', usesBrowserClickstream: false },
      query: { name: 'qwertyuiopasdfghjkl', count: 3, language: 'en' },
      pagination: { returned: 0, count: 3, maxCount: 100 },
      locations: [],
    }, 'text'),
  )

  assert.match(emptyGeocodingOutput, /No Open-Meteo locations returned for this query/)
  assert.match(emptyGeocodingOutput, /again public-apis apis run openmeteo\.geocoding --online --persist -- --name qwertyuiopasdfghjkl --count 3 --language en/)
  assert.match(emptyGeocodingOutput, /reset public-apis apis run openmeteo\.geocoding --online --persist -- --name Berlin --count 100 --language en/)
  assert.doesNotMatch(emptyGeocodingOutput, /^\{/)

  const emptyForecastOutput = captureStdout(() =>
    printResult({
      kind: 'openmeteo.forecast',
      api: { provider: 'openmeteo', endpoint: 'GET /v1/forecast', authentication: 'none', usesBrowserClickstream: false },
      query: { latitude: 52.52, longitude: 13.41, forecastDays: 2, timezone: 'auto' },
      location: { latitude: 52.52, longitude: 13.42, timezone: 'Europe/Berlin' },
      current: { time: '2026-05-03T23:15', temperature_2m: 21.4, wind_speed_10m: 4.4, weather_code: 3 },
      currentUnits: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
      daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [] },
      dailyUnits: {},
      pagination: { forecastDays: 2, maxForecastDays: 16, dailyRows: 0 },
    }, 'text'),
  )

  assert.match(emptyForecastOutput, /No Open-Meteo daily forecast rows returned for this query/)
  assert.match(emptyForecastOutput, /again public-apis apis run openmeteo\.forecast --online --persist -- --latitude 52\.52 --longitude 13\.41 --forecast-days 2 --timezone auto/)
  assert.match(emptyForecastOutput, /places public-apis apis run openmeteo\.geocoding --online --persist -- --name Berlin --count 100/)
  assert.doesNotMatch(emptyForecastOutput, /^\{/)
})

test('text output renders NetworkCalc subnet and binary without fallback JSON', () => {
  const subnetOutput = captureStdout(() =>
    printResult({
      kind: 'networkcalc.subnet',
      api: { providerId: 'networkcalc', endpoint: 'GET /api/ip/{ip}/{cidr}', authentication: 'none', usesBrowserClickstream: false, rateLimit: 'No public rate limit documented.' },
      query: { ip: '10.5.1.0', cidr: 27, binary: true },
      storage: { mode: 'online', persisted: true },
      meta: { permalink: 'https://networkcalc.com/subnet-calculator/10.5.1.0/27?binary=1' },
      address: {
        cidr_notation: '10.5.1.0/27',
        subnet_mask: '255.255.255.224',
        wildcard_mask: '0.0.0.31',
        network_address: '10.5.1.0',
        broadcast_address: '10.5.1.31',
        assignable_hosts: 30,
        first_assignable_host: '10.5.1.1',
        last_assignable_host: '10.5.1.30',
        binary: {
          address: '00001010 00000101 00000001 00000000',
          network_address: '00001010 00000101 00000001 00000000',
        },
      },
    }, 'text'),
  )
  assert.match(subnetOutput, /NetworkCalc Subnet/)
  assert.match(subnetOutput, /open REST API only · no auth/)
  assert.match(subnetOutput, /no Chrome clickstream/)
  assert.match(subnetOutput, /10\.5\.1\.0\/27/)
  assert.match(subnetOutput, /hosts 30/)
  assert.match(subnetOutput, /again public-apis apis run networkcalc\.subnet --online --persist -- --ip 10\.5\.1\.0 --cidr 27 --binary true/)
  assert.match(subnetOutput, /replay public-apis apis run networkcalc\.subnet --offline -- --ip 10\.5\.1\.0 --cidr 27 --binary true/)
  assert.match(subnetOutput, /next public-apis apis run networkcalc\.subnet --online --persist -- --ip 10\.5\.1\.1 --cidr 27 --binary true/)
  assert.match(subnetOutput, /convert public-apis apis run networkcalc\.binary --online --persist -- --value ff --from 16 --to 2/)
  assert.doesNotMatch(subnetOutput, /^\{/)

  const binaryOutput = captureStdout(() =>
    printResult({
      kind: 'networkcalc.binary',
      api: { providerId: 'networkcalc', endpoint: 'GET /api/binary/{value}', authentication: 'none', usesBrowserClickstream: false, rateLimit: 'No public rate limit documented.' },
      query: { value: 'ff', from: 16, to: 2 },
      storage: { mode: 'online', persisted: false },
      conversion: { original: 'ff', converted: '11111111', from: 16, to: 2 },
    }, 'text'),
  )
  assert.match(binaryOutput, /NetworkCalc Binary/)
  assert.match(binaryOutput, /open REST API only · no auth/)
  assert.match(binaryOutput, /output base 2 · 11111111/)
  assert.match(binaryOutput, /again public-apis apis run networkcalc\.binary --online --persist -- --value ff --from 16 --to 2/)
  assert.match(binaryOutput, /replay public-apis apis run networkcalc\.binary --offline -- --value ff --from 16 --to 2/)
  assert.match(binaryOutput, /subnet public-apis apis run networkcalc\.subnet --online --persist -- --ip 10\.5\.1\.0 --cidr 27/)
  assert.doesNotMatch(binaryOutput, /^\{/)
})

test('text output renders Serialif Color lookup without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'serialifcolor.lookup',
      api: { providerId: 'serialifcolor', endpoint: 'GET /{color}', authentication: 'none', usesBrowserClickstream: false, rateLimit: 'No public rate limit documented.' },
      query: { color: 'aquamarine' },
      storage: { mode: 'online', persisted: true },
      colors: {
        base: { keyword: 'aquamarine', hex: '#7fffd4', rgb: 'rgb(127, 255, 212)', hsl: 'hsl(160, 100%, 75%)' },
        contrastedText: { keyword: 'black', hex: '#000000', rgb: 'rgb(0, 0, 0)', hsl: 'hsl(0, 0%, 0%)' },
        complementary: { hex: '#80002b', rgb: 'rgb(128, 0, 43)', hsl: 'hsl(340, 100%, 25%)' },
        complementaryContrastedText: { keyword: 'white', hex: '#ffffff', rgb: 'rgb(255, 255, 255)', hsl: 'hsl(0, 0%, 100%)' },
        grayscale: { hex: '#bfbfbf', rgb: 'rgb(191, 191, 191)', hsl: 'hsl(160, 0%, 75%)' },
        grayscaleContrastedText: { keyword: 'black', hex: '#000000', rgb: 'rgb(0, 0, 0)', hsl: 'hsl(0, 0%, 0%)' },
      },
    }, 'text'),
  )

  assert.match(output, /Serialif Color Lookup/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /aquamarine · #7fffd4/)
  assert.match(output, /complement #80002b/)
  assert.match(output, /again public-apis apis run serialifcolor\.lookup --online --persist -- --color aquamarine/)
  assert.match(output, /replay public-apis apis run serialifcolor\.lookup --offline -- --color aquamarine/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders openSenseMap stats, boxes, and sensors without fallback JSON', () => {
  const statsOutput = captureStdout(() =>
    printResult({
      kind: 'opensensemap.stats',
      api: { provider: 'opensensemap', endpoint: 'GET /stats', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { human: false },
      stats: { senseBoxes: 16734, measurements: 11416106403, measurementsLastMinute: 6863 },
    }, 'text'),
  )
  assert.match(statsOutput, /openSenseMap Stats/)
  assert.match(statsOutput, /open REST API only · no auth/)
  assert.match(statsOutput, /senseBoxes/)
  assert.match(statsOutput, /no Chrome clickstream/)
  assert.match(statsOutput, /boxes public-apis apis run opensensemap\.boxes -- --name Berlin --limit 5/)
  assert.match(statsOutput, /again public-apis apis run opensensemap\.stats --online --persist -- --human false/)
  assert.match(statsOutput, /replay public-apis apis run opensensemap\.stats --offline -- --human false/)
  assert.doesNotMatch(statsOutput, /^\{/)

  const boxesOutput = captureStdout(() =>
    printResult({
      kind: 'opensensemap.boxes',
      api: { provider: 'opensensemap', endpoint: 'GET /boxes', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { name: 'Berlin', limit: 5 },
      boxes: [{ id: '5391be52a8341554157792e6', name: 'LeKa Berlin', exposure: 'outdoor', model: 'homeWifi', location: { latitude: 52.54, longitude: 13.42 }, sensors: [] }],
      pagination: { returned: 1, limit: 5, maxLimit: 100 },
    }, 'text'),
  )
  assert.match(boxesOutput, /openSenseMap Boxes/)
  assert.match(boxesOutput, /LeKa Berlin/)
  assert.match(boxesOutput, /open REST API only · no auth/)
  assert.match(boxesOutput, /sensors public-apis apis run opensensemap\.sensors -- --box-id 5391be52a8341554157792e6 --count 100/)
  assert.match(boxesOutput, /again public-apis apis run opensensemap\.boxes --online --persist -- --name Berlin --limit 5/)
  assert.match(boxesOutput, /replay public-apis apis run opensensemap\.boxes --offline -- --name Berlin --limit 5/)
  assert.doesNotMatch(boxesOutput, /^\{/)

  const sensorsOutput = captureStdout(() =>
    printResult({
      kind: 'opensensemap.sensors',
      api: { provider: 'opensensemap', endpoint: 'GET /boxes/{boxId}/sensors', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'offline', persisted: true },
      query: { boxId: '5391be52a8341554157792e6', count: 100 },
      box: {
        id: '5391be52a8341554157792e6',
        name: 'LeKa Berlin',
        sensors: [{ id: '5391be52a8341554157792eb', title: 'Temperatur', unit: '°C', sensorType: 'BMP085', lastMeasurement: { value: '22.4', createdAt: '2024-10-16T02:32:18.156Z' } }],
      },
      pagination: { sensors: 1, count: 100, maxCount: 100 },
    }, 'text'),
  )
  assert.match(sensorsOutput, /openSenseMap Sensors/)
  assert.match(sensorsOutput, /Temperatur/)
  assert.match(sensorsOutput, /open REST API only · no auth/)
  assert.match(sensorsOutput, /no Chrome clickstream/)
  assert.match(sensorsOutput, /stats public-apis apis run opensensemap\.stats/)
  assert.match(sensorsOutput, /boxes public-apis apis run opensensemap\.boxes -- --name 'LeKa Berlin' --limit 5/)
  assert.match(sensorsOutput, /again public-apis apis run opensensemap\.sensors --online --persist -- --box-id 5391be52a8341554157792e6 --count 100/)
  assert.match(sensorsOutput, /replay public-apis apis run opensensemap\.sensors --offline -- --box-id 5391be52a8341554157792e6 --count 100/)
  assert.doesNotMatch(sensorsOutput, /^\{/)
})







test('text output renders Econdb catalog operations without fallback JSON', () => {
  const sourcesOutput = captureStdout(() =>
    printResult({
      kind: 'econdb.sources',
      api: { provider: 'econdb', endpoint: 'GET /api/sources/?format=json', authentication: 'none', usesBrowserClickstream: false, authBoundary: 'series data endpoints returned HTTP 401 Token required' },
      query: { page: 1, limit: 20 },
      pagination: { returned: 2, page: 1, limit: 20, maxLimit: 100, total: 146, pages: 2, hasNext: true },
      sources: [
        { source: 'Banco de la República, Colombia', description: 'Banco de la República, Colombia', prefix: 'BRC' },
        { source: 'Eurostat', description: 'Eurostat', prefix: 'EU' },
      ],
    }, 'text'),
  )
  assert.match(sourcesOutput, /Econdb Sources/)
  assert.match(sourcesOutput, /open REST API only · no auth/)
  assert.match(sourcesOutput, /series data endpoints returned HTTP 401/)
  assert.doesNotMatch(sourcesOutput, /^\{/)

  const datasetsOutput = captureStdout(() =>
    printResult({
      kind: 'econdb.datasets',
      api: { provider: 'econdb', endpoint: 'GET /api/datasets/?format=json', authentication: 'none', usesBrowserClickstream: false, authBoundary: 'series data endpoints returned HTTP 401 Token required' },
      query: { page: 1, limit: 20 },
      pagination: { returned: 2, page: 1, limit: 20, maxLimit: 100, total: 13762, pages: 138, hasNext: true },
      datasets: [
        { dataset: 'NAMA_10_A64_E', description: 'National accounts employment data by industry', size: 45844, lastUpdate: '2026-01-07' },
        { dataset: 'ISOC_R_IUSE_I', description: 'Individuals who used the internet', size: 5659, lastUpdate: '2026-02-25' },
      ],
    }, 'text'),
  )
  assert.match(datasetsOutput, /Econdb Datasets/)
  assert.match(datasetsOutput, /NAMA_10_A64_E/)
  assert.match(datasetsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetsOutput, /^\{/)

  const emptySourcesOutput = captureStdout(() =>
    printResult({
      kind: 'econdb.sources',
      api: { provider: 'econdb', endpoint: 'GET /api/sources/?format=json', authentication: 'none', usesBrowserClickstream: false, authBoundary: 'series data endpoints returned HTTP 401 Token required' },
      query: { page: 30, limit: 20 },
      pagination: { returned: 0, page: 30, limit: 20, maxLimit: 100, total: 146, pages: 30, hasNext: false },
      sources: [],
    }, 'text'),
  )
  assert.match(emptySourcesOutput, /No econdb sources returned/)
  assert.match(emptySourcesOutput, /public-apis apis run econdb\.datasets -- --page 1 --limit 100/)
  assert.doesNotMatch(emptySourcesOutput, /^\{/)
})

test('text output renders PM2.5 Open Data feeds without fallback JSON', () => {
  const airboxOutput = captureStdout(() =>
    printResult({
      kind: 'pm25opendata.airbox',
      api: { provider: 'pm25opendata', endpoint: 'GET /data/last-all-airbox.json', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 506 },
      pagination: { returned: 2, limit: 506, maxLimit: 506, sourceRecords: 506 },
      summary: { averagePm25: 11.5, maxPm25: 23, latestTimestamp: '2026-05-03T23:18:42Z' },
      feeds: [
        { siteName: '新北市文林國小(2018)', deviceId: '74DA38F7C63C', pm25: 23, pm10: 29, timestamp: '2026-05-03T23:18:42Z', latitude: 24.998, longitude: 121.425 },
        { siteName: '市立信義國小(2018)', deviceId: '74DA38F7C63D', pm25: 0, pm10: 0, timestamp: '2026-05-03T23:18:23Z', latitude: 25.031, longitude: 121.563 },
      ],
    }, 'text'),
  )
  assert.match(airboxOutput, /PM2\.5 Open Data AirBox/)
  assert.match(airboxOutput, /open REST API only · no auth/)
  assert.match(airboxOutput, /PM2\.5 23/)
  assert.doesNotMatch(airboxOutput, /^\{/)

  const lassOutput = captureStdout(() =>
    printResult({
      kind: 'pm25opendata.lass',
      api: { provider: 'pm25opendata', endpoint: 'GET /data/last-all-lass.json', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 10 },
      pagination: { returned: 1, limit: 10, maxLimit: 10, sourceRecords: 10 },
      summary: { averagePm25: 19, maxPm25: 19, latestTimestamp: '2026-05-03T23:24:21Z' },
      feeds: [{ deviceId: 'WF_8629500', pm25: 19, pm10: 20, timestamp: '2026-05-03T23:24:21Z', latitude: 0, longitude: 0 }],
    }, 'text'),
  )
  assert.match(lassOutput, /PM2\.5 Open Data LASS/)
  assert.match(lassOutput, /WF_8629500/)
  assert.match(lassOutput, /no Chrome clickstream/)
  assert.doesNotMatch(lassOutput, /0\.000,0\.000/)
  assert.doesNotMatch(lassOutput, /^\{/)

  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'pm25opendata.airbox',
      api: { provider: 'pm25opendata', endpoint: 'GET /data/last-all-airbox.json', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 506 },
      pagination: { returned: 0, limit: 506, maxLimit: 506, sourceRecords: 0 },
      summary: {},
      feeds: [],
    }, 'text'),
  )
  assert.match(emptyOutput, /No PM2\.5 Open Data feed rows returned/)
  assert.match(emptyOutput, /public-apis apis run pm25opendata\.lass -- --limit 10/)
  assert.doesNotMatch(emptyOutput, /^\{/)
})

test('text output renders National Grid ESO NESO operations without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'nationalgrideso.search',
      api: { provider: 'nationalgrideso', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, migrationNote: 'migrated to api.neso.energy' },
      query: { query: 'demand', limit: 200 },
      pagination: { returned: 1, limit: 200, maxLimit: 1000 },
      total: 1,
      datasets: [{ id: 'dataset-id', name: 'daily-demand-update', title: 'Demand Data Update', notes: 'Daily demand update dataset.', resources: [{ id: '177f6fa4-ae49-4182-81ea-0c6b35f26ca6', datastoreActive: true }] }],
    }, 'text'),
  )
  assert.match(searchOutput, /National Grid ESO \/ NESO Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Demand Data Update/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const emptySearchOutput = captureStdout(() =>
    printResult({
      kind: 'nationalgrideso.search',
      api: { provider: 'nationalgrideso', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, migrationNote: 'migrated to api.neso.energy' },
      query: { query: 'zzzzzzznomatch', limit: 5 },
      pagination: { returned: 0, limit: 5, maxLimit: 1000 },
      total: 0,
      datasets: [],
    }, 'text'),
  )
  assert.match(emptySearchOutput, /No NESO datasets returned/)
  assert.match(emptySearchOutput, /public-apis apis run nationalgrideso\.search -- --query demand --limit 5/)
  assert.match(emptySearchOutput, /public-apis apis run nationalgrideso\.records -- --resource-id 177f6fa4-ae49-4182-81ea-0c6b35f26ca6 --limit 100/)
  assert.doesNotMatch(emptySearchOutput, /^\{/)

  const recordsOutput = captureStdout(() =>
    printResult({
      kind: 'nationalgrideso.records',
      api: { provider: 'nationalgrideso', endpoint: 'GET /api/3/action/datastore_search', authentication: 'none', usesBrowserClickstream: false },
      query: { resourceId: '177f6fa4-ae49-4182-81ea-0c6b35f26ca6', limit: 20 },
      resourceId: '177f6fa4-ae49-4182-81ea-0c6b35f26ca6',
      total: 1920,
      fields: ['_id', 'SETTLEMENT_DATE', 'SETTLEMENT_PERIOD', 'ND', 'TSD'],
      pagination: { returned: 2, limit: 20, maxLimit: 100 },
      records: [
        { _id: 1, SETTLEMENT_DATE: '2026-04-01', SETTLEMENT_PERIOD: 1, ND: 24019, TSD: 28762, EMBEDDED_WIND_GENERATION: 1112, EMBEDDED_SOLAR_GENERATION: 0 },
        { _id: 2, SETTLEMENT_DATE: '2026-04-01', SETTLEMENT_PERIOD: 2, ND: 24100, TSD: 28800, EMBEDDED_WIND_GENERATION: 1100, EMBEDDED_SOLAR_GENERATION: 0 },
      ],
    }, 'text'),
  )
  assert.match(recordsOutput, /National Grid ESO \/ NESO Datastore Records/)
  assert.match(recordsOutput, /ND 24,019/)
  assert.match(recordsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(recordsOutput, /^\{/)

  const emptyRecordsOutput = captureStdout(() =>
    printResult({
      kind: 'nationalgrideso.records',
      api: { provider: 'nationalgrideso', endpoint: 'GET /api/3/action/datastore_search', authentication: 'none', usesBrowserClickstream: false },
      query: { resourceId: '177f6fa4-ae49-4182-81ea-0c6b35f26ca6', limit: 20 },
      resourceId: '177f6fa4-ae49-4182-81ea-0c6b35f26ca6',
      total: 0,
      fields: ['_id', 'SETTLEMENT_DATE', 'SETTLEMENT_PERIOD'],
      pagination: { returned: 0, limit: 20, maxLimit: 100 },
      records: [],
    }, 'text'),
  )
  assert.match(emptyRecordsOutput, /No NESO datastore records returned/)
  assert.match(emptyRecordsOutput, /public-apis apis run nationalgrideso\.records -- --resource-id 177f6fa4-ae49-4182-81ea-0c6b35f26ca6 --limit 20/)
  assert.match(emptyRecordsOutput, /public-apis apis run nationalgrideso\.search -- --query demand --limit 1000/)
  assert.doesNotMatch(emptyRecordsOutput, /^\{/)
})

test('text output renders Luchtmeetnet operations without fallback JSON', () => {
  const componentsOutput = captureStdout(() =>
    printResult({
      kind: 'luchtmeetnet.components',
      api: { provider: 'luchtmeetnet', endpoint: 'GET /open_api/components', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 13 },
      pagination: { returned: 2, limit: 13, maxLimit: 13 },
      components: [
        { formula: 'NO2', nameEn: 'Nitrogen dioxide (NO2)' },
        { formula: 'PM10', nameEn: 'Particulate matter (PM10)' },
      ],
    }, 'text'),
  )
  assert.match(componentsOutput, /Luchtmeetnet Components/)
  assert.match(componentsOutput, /open REST API only · no auth/)
  assert.match(componentsOutput, /NO2/)
  assert.doesNotMatch(componentsOutput, /^\{/)

  const componentsEmptyOutput = captureStdout(() =>
    printResult({
      kind: 'luchtmeetnet.components',
      api: { provider: 'luchtmeetnet', endpoint: 'GET /open_api/components', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 13 },
      pagination: { returned: 0, limit: 13, maxLimit: 13 },
      components: [],
    }, 'text'),
  )
  assert.match(componentsEmptyOutput, /No Luchtmeetnet components returned/)
  assert.match(componentsEmptyOutput, /public-apis apis run luchtmeetnet\.components -- --limit 13/)
  assert.match(componentsEmptyOutput, /public-apis apis run luchtmeetnet\.measurements -- --station-number NL01485 --formula NO2 --limit 24/)
  assert.doesNotMatch(componentsEmptyOutput, /^\{/)

  const measurementsOutput = captureStdout(() =>
    printResult({
      kind: 'luchtmeetnet.measurements',
      api: { provider: 'luchtmeetnet', endpoint: 'GET /open_api/measurements', authentication: 'none', usesBrowserClickstream: false },
      query: { stationNumber: 'NL01485', formula: 'NO2', limit: 167 },
      pagination: { returned: 2, limit: 167, maxLimit: 167 },
      measurements: [
        { stationNumber: 'NL01485', value: 17.4, timestampMeasured: '2026-05-03T22:00:00+00:00', formula: 'NO2' },
        { stationNumber: 'NL01485', value: 13, timestampMeasured: '2026-05-03T21:00:00+00:00', formula: 'NO2' },
      ],
      summary: { latest: { value: 17.4, timestampMeasured: '2026-05-03T22:00:00+00:00', formula: 'NO2' }, min: 13, average: 15.2, max: 17.4 },
    }, 'text'),
  )
  assert.match(measurementsOutput, /Luchtmeetnet Measurements/)
  assert.match(measurementsOutput, /range min 13 · avg 15\.2 · max 17\.4/)
  assert.match(measurementsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(measurementsOutput, /^\{/)

  const measurementsEmptyOutput = captureStdout(() =>
    printResult({
      kind: 'luchtmeetnet.measurements',
      api: { provider: 'luchtmeetnet', endpoint: 'GET /open_api/measurements', authentication: 'none', usesBrowserClickstream: false },
      query: { stationNumber: 'NL00000', formula: 'NO2', limit: 5 },
      pagination: { returned: 0, limit: 5, maxLimit: 167 },
      measurements: [],
      summary: {},
    }, 'text'),
  )
  assert.match(measurementsEmptyOutput, /No luchtmeetnet measurements rows returned/)
  assert.match(measurementsEmptyOutput, /public-apis apis run luchtmeetnet\.measurements -- --station-number NL01485 --formula NO2 --limit 24/)
  assert.match(measurementsEmptyOutput, /public-apis apis run luchtmeetnet\.components -- --limit 13/)
  assert.doesNotMatch(measurementsEmptyOutput, /^\{/)

  const concentrationsOutput = captureStdout(() =>
    printResult({
      kind: 'luchtmeetnet.concentrations',
      api: { provider: 'luchtmeetnet', endpoint: 'GET /open_api/concentrations', authentication: 'none', usesBrowserClickstream: false },
      query: { formula: 'NO2', latitude: 51.924452, longitude: 4.458807, limit: 19 },
      pagination: { returned: 2, limit: 19, maxLimit: 19 },
      concentrations: [
        { value: 41, timestampMeasured: '2026-05-03T22:00:00+00:00', formula: 'NO2' },
        { value: 32, timestampMeasured: '2026-05-04T00:00:00+00:00', formula: 'NO2' },
      ],
      summary: { latest: { value: 41, timestampMeasured: '2026-05-03T22:00:00+00:00', formula: 'NO2' }, min: 32, average: 36.5, max: 41 },
    }, 'text'),
  )
  assert.match(concentrationsOutput, /Luchtmeetnet Concentrations/)
  assert.match(concentrationsOutput, /avg 36\.5/)
  assert.doesNotMatch(concentrationsOutput, /^\{/)

  const concentrationsEmptyOutput = captureStdout(() =>
    printResult({
      kind: 'luchtmeetnet.concentrations',
      api: { provider: 'luchtmeetnet', endpoint: 'GET /open_api/concentrations', authentication: 'none', usesBrowserClickstream: false },
      query: { formula: 'NO2', latitude: 0, longitude: 0, limit: 5 },
      pagination: { returned: 0, limit: 5, maxLimit: 19 },
      concentrations: [],
      summary: {},
    }, 'text'),
  )
  assert.match(concentrationsEmptyOutput, /No luchtmeetnet concentrations rows returned/)
  assert.match(concentrationsEmptyOutput, /public-apis apis run luchtmeetnet\.concentrations -- --formula NO2 --latitude 51\.924452 --longitude 4\.458807 --limit 19/)
  assert.match(concentrationsEmptyOutput, /public-apis apis run luchtmeetnet\.components -- --limit 13/)
  assert.doesNotMatch(concentrationsEmptyOutput, /^\{/)
})

test('text output renders GrünstromIndex forecast without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'gruenstromindex.forecast',
      api: { provider: 'gruenstromindex', endpoint: 'GET /v2.0/gsi/prediction?zip={zip}', authentication: 'none', usesBrowserClickstream: false, license: 'CC BY-NC-SA 4.0' },
      query: { zip: '69168', limit: 98 },
      pagination: { returned: 2, limit: 98, maxLimit: 98 },
      forecast: [
        { timeStamp: 1777842000000, gsi: 0.95, ewind: 0, esolar: 0, energyprice: -0.0005, co2Standard: 373, co2Oekostrom: 64 },
        { timeStamp: 1777845600000, gsi: 12.35, ewind: 12, esolar: 0, energyprice: -0.0065, co2Standard: 334, co2Oekostrom: 58 },
      ],
      summary: {
        best: { timeStamp: 1777845600000, gsi: 12.35, ewind: 12, esolar: 0, energyprice: -0.0065 },
        worst: { timeStamp: 1777842000000, gsi: 0.95, ewind: 0, esolar: 0, energyprice: -0.0005 },
        averageGsi: 6.65,
        averageCo2Standard: 353.5,
        averageCo2Oekostrom: 61,
      },
      provisioning: {
        license: 'CC BY-NC-SA 4.0',
        warning: 'Deprecation of usage without token!',
        info: 'Anonmous access',
      },
    }, 'text'),
  )

  assert.match(output, /GrünstromIndex Forecast/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /provider warning Deprecation of usage without token!/)
  assert.match(output, /access Anonmous access/)
  assert.match(output, /avg GSI 6\.65/)
  assert.match(output, /CO₂ 373 → 64 g\/kWh/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)

  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'gruenstromindex.forecast',
      api: { provider: 'gruenstromindex', endpoint: 'GET /v2.0/gsi/prediction?zip={zip}', authentication: 'none', usesBrowserClickstream: false, license: 'CC BY-NC-SA 4.0' },
      query: { zip: '99999', limit: 12 },
      pagination: { returned: 0, limit: 12, maxLimit: 98 },
      forecast: [],
      summary: {},
      provisioning: { warning: 'Deprecation of usage without token!' },
    }, 'text'),
  )

  assert.match(emptyOutput, /No GrünstromIndex forecast rows returned/)
  assert.match(emptyOutput, /provider warning Deprecation of usage without token!/)
  assert.match(emptyOutput, /public-apis apis run gruenstromindex\.forecast -- --zip 69168 --limit 12/)
  assert.doesNotMatch(emptyOutput, /^\{/)
})

test('text output renders Razorpay IFSC lookup without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'razorpayifsc.lookup',
      api: { provider: 'razorpayifsc', endpoint: 'GET /{ifsc}', docsUrl: 'https://github.com/razorpay/ifsc/wiki/API', authentication: 'none', usesBrowserClickstream: false },
      query: { ifsc: 'HDFC0CAGSBK' },
      branch: {
        ifsc: 'HDFC0CAGSBK',
        bank: 'HDFC Bank',
        bankCode: 'HDFC',
        branch: 'THE AGS EMPLOYEES COOP BANK LTD',
        address: 'SANGMESH BIRADAR BANGALORE',
        city: 'BANGALORE URBAN',
        district: 'BANGALORE',
        state: 'KARNATAKA',
        iso3166: 'IN-KA',
        micr: '560226263',
        swift: 'HDFCINBB',
        contact: '+918022265658',
      },
      paymentRails: { upi: true, rtgs: true, neft: true, imps: true },
    }, 'text'),
  )

  assert.match(output, /Razorpay IFSC Lookup/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /HDFC Bank/)
  assert.match(output, /HDFC0CAGSBK/)
  assert.match(output, /next public-apis apis run razorpayifsc\.lookup --offline -- --ifsc HDFC0CAGSBK/)
  assert.match(output, /lookup public-apis apis run razorpayifsc\.lookup --online --persist -- --ifsc HDFC0CAGSBK/)
  assert.match(output, /no Chrome clickstream/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders US Weather point and forecast without fallback JSON', () => {
  const pointOutput = captureStdout(() =>
    printResult({
      kind: 'usweather.point',
      api: { provider: 'usweather', endpoint: 'GET /points/{latitude},{longitude}', authentication: 'none', usesBrowserClickstream: false },
      query: { latitude: 38.8894, longitude: -77.0352 },
      point: {
        office: 'LWX',
        gridX: 97,
        gridY: 71,
        forecast: 'https://api.weather.gov/gridpoints/LWX/97,71/forecast',
        timezone: 'America/New_York',
        radarStation: 'KLWX',
        relativeLocation: { city: 'Washington', state: 'DC' },
      },
    }, 'text'),
  )

  assert.match(pointOutput, /US Weather Point/)
  assert.match(pointOutput, /open REST API only · no auth/)
  assert.match(pointOutput, /Washington, DC/)
  assert.match(pointOutput, /again public-apis apis run usweather\.point --online --persist -- --latitude 38\.8894 --longitude -77\.0352/)
  assert.match(pointOutput, /replay public-apis apis run usweather\.point --offline -- --latitude 38\.8894 --longitude -77\.0352/)
  assert.match(pointOutput, /forecast public-apis apis run usweather\.forecast --online --persist -- --office LWX --grid-x 97 --grid-y 71 --limit 14/)
  assert.match(pointOutput, /no Chrome clickstream/)
  assert.doesNotMatch(pointOutput, /^\{/)

  const forecastOutput = captureStdout(() =>
    printResult({
      kind: 'usweather.forecast',
      api: { provider: 'usweather', endpoint: 'GET /gridpoints/{office}/{gridX},{gridY}/forecast', authentication: 'none', usesBrowserClickstream: false },
      query: { office: 'LWX', gridX: 97, gridY: 71, limit: 2 },
      forecast: {
        updated: '2026-05-04T01:00:00+00:00',
        generatedAt: '2026-05-04T01:05:00+00:00',
        units: 'us',
        periods: [
          { number: 1, name: 'Tonight', temperature: 62, temperatureUnit: 'F', windSpeed: '5 mph', windDirection: 'NW', shortForecast: 'Mostly Clear' },
        ],
      },
      pagination: { returned: 1, limit: 2, maxLimit: 14 },
    }, 'text'),
  )

  assert.match(forecastOutput, /US Weather Forecast/)
  assert.match(forecastOutput, /open REST API only · no auth/)
  assert.match(forecastOutput, /Tonight/)
  assert.match(forecastOutput, /again public-apis apis run usweather\.forecast --online --persist -- --office LWX --grid-x 97 --grid-y 71 --limit 2/)
  assert.match(forecastOutput, /replay public-apis apis run usweather\.forecast --offline -- --office LWX --grid-x 97 --grid-y 71 --limit 2/)
  assert.match(forecastOutput, /full public-apis apis run usweather\.forecast --online --persist -- --office LWX --grid-x 97 --grid-y 71 --limit 14/)
  assert.match(forecastOutput, /point public-apis apis run usweather\.point --online --persist -- --latitude 38\.8894 --longitude -77\.0352/)
  assert.match(forecastOutput, /no Chrome clickstream/)
  assert.doesNotMatch(forecastOutput, /^\{/)
})

test('text output renders HKO current and forecast without fallback JSON', () => {
  const currentOutput = captureStdout(() =>
    printResult({
      kind: 'hko.current',
      api: { provider: 'hko', endpoint: 'GET /weatherAPI/opendata/weather.php?dataType=rhrread&lang={lang}', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { lang: 'en', station: 'Observatory', limit: 100 },
      current: {
        updateTime: '2026-05-05T01:02:00+08:00',
        icons: [62],
        temperature: { recordTime: '2026-05-05T01:00:00+08:00', data: [{ place: 'Hong Kong Observatory', value: 23, unit: 'C' }] },
        humidity: { recordTime: '2026-05-05T01:00:00+08:00', data: [{ place: 'Hong Kong Observatory', value: 80, unit: 'percent' }] },
        rainfall: { startTime: '2026-05-05T00:00:00+08:00', endTime: '2026-05-05T01:00:00+08:00', data: [{ place: 'Wan Chai', max: 0, unit: 'mm' }] },
      },
      pagination: { limit: 100, maxLimit: 100, totalTemperatures: 2, returnedTemperatures: 1, totalRainfall: 1, returnedRainfall: 1 },
    }, 'text'),
  )

  assert.match(currentOutput, /Hong Kong Observatory Current/)
  assert.match(currentOutput, /open REST API only · no auth/)
  assert.match(currentOutput, /Hong Kong Observatory: 23C/)
  assert.match(currentOutput, /no Chrome clickstream/)
  assert.match(currentOutput, /forecast public-apis apis run hko\.forecast -- --lang en --limit 9/)
  assert.match(currentOutput, /again public-apis apis run hko\.current --online --persist -- --lang en --station Observatory --limit 100/)
  assert.match(currentOutput, /replay public-apis apis run hko\.current --offline -- --lang en --station Observatory --limit 100/)
  assert.doesNotMatch(currentOutput, /^\{/)

  const forecastOutput = captureStdout(() =>
    printResult({
      kind: 'hko.forecast',
      api: { provider: 'hko', endpoint: 'GET /weatherAPI/opendata/weather.php?dataType=fnd&lang={lang}', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'offline', persisted: true },
      query: { lang: 'en', limit: 9 },
      generalSituation: 'The northeast monsoon will continue to bring slightly cooler weather.',
      updateTime: '2026-05-05T00:00:00+08:00',
      forecasts: [
        {
          forecastDate: '20260505',
          week: 'Tuesday',
          forecastWeather: 'Mainly cloudy with occasional showers.',
          forecastWind: 'East force 4 to 5.',
          forecastMaxTemp: { value: 24, unit: 'C' },
          forecastMinTemp: { value: 21, unit: 'C' },
          forecastMaxRh: { value: 95, unit: 'percent' },
          forecastMinRh: { value: 80, unit: 'percent' },
          psr: 'Medium High',
        },
      ],
      pagination: { returned: 1, total: 9, limit: 9, maxLimit: 9 },
    }, 'text'),
  )

  assert.match(forecastOutput, /Hong Kong Observatory 9-Day Forecast/)
  assert.match(forecastOutput, /open REST API only · no auth/)
  assert.match(forecastOutput, /20260505 Tuesday/)
  assert.match(forecastOutput, /RH 80%–95%/)
  assert.match(forecastOutput, /no Chrome clickstream/)
  assert.match(forecastOutput, /current public-apis apis run hko\.current -- --lang en --station Observatory --limit 100/)
  assert.match(forecastOutput, /again public-apis apis run hko\.forecast --online --persist -- --lang en --limit 9/)
  assert.match(forecastOutput, /replay public-apis apis run hko\.forecast --offline -- --lang en --limit 9/)
  assert.doesNotMatch(forecastOutput, /^\{/)
})

test('text output renders Free Dictionary definitions without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'freedictionary.define',
      api: {
        provider: 'free-dictionary',
        endpoint: 'GET /api/v2/entries/{language}/{word}',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { word: 'hello', language: 'en', definitionLimit: 2 },
      entries: [
        {
          word: 'hello',
          phonetics: [{ text: '/həˈloʊ/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3' }],
          meanings: [
            {
              partOfSpeech: 'interjection',
              definitions: [{ definition: 'A greeting.', example: 'Hello, everyone.', synonyms: ['hi'], antonyms: ['bye'] }],
              synonyms: ['greeting'],
              antonyms: ['goodbye'],
            },
          ],
          sourceUrls: ['https://en.wiktionary.org/wiki/hello'],
        },
      ],
      count: { entries: 1, meanings: 1, definitionsShown: 1, definitionsTotal: 2 },
      rateLimit: { limit: '450', remaining: '449', reset: '1775767656' },
    }, 'text'),
  )

  assert.match(output, /Free Dictionary Define/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /hello/)
  assert.match(output, /A greeting/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Wiktionary search and extracts without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'wiktionary.search',
      api: {
        provider: 'wiktionary',
        endpoint: 'GET /w/api.php?action=query&list=search',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultLimit: 50,
        limitCap: 50,
        rateLimit: 'Wikimedia public Action API etiquette applies',
      },
      query: { query: 'hello', limit: 50, offset: 0 },
      pagination: { returned: 1, totalHits: 10, offset: 0, nextOffset: 50 },
      results: [
        {
          title: 'hello',
          snippet: 'English greeting.',
          wordCount: 120,
          size: 1024,
          timestamp: '2026-05-04T00:00:00Z',
          url: 'https://en.wiktionary.org/wiki/hello',
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Wiktionary Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /query=hello/)
  assert.match(searchOutput, /English greeting/)
  assert.match(searchOutput, /wiktionary\.extract/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const emptySearchOutput = captureStdout(() =>
    printResult({
      kind: 'wiktionary.search',
      api: {
        provider: 'wiktionary',
        endpoint: 'GET /w/api.php?action=query&list=search',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultLimit: 50,
        limitCap: 50,
        rateLimit: 'Wikimedia public Action API etiquette applies',
      },
      query: { query: 'zzznomatch', limit: 3, offset: 0 },
      pagination: { returned: 0, totalHits: 0, offset: 0 },
      results: [],
    }, 'text'),
  )

  assert.match(emptySearchOutput, /No Wiktionary entries returned/)
  assert.match(emptySearchOutput, /public-apis apis run wiktionary\.search -- --query hello --limit 3/)
  assert.match(emptySearchOutput, /public-apis apis run wiktionary\.extract -- --title hello --chars 1000/)
  assert.doesNotMatch(emptySearchOutput, /^\{/)

  const extractOutput = captureStdout(() =>
    printResult({
      kind: 'wiktionary.extract',
      api: {
        provider: 'wiktionary',
        endpoint: 'GET /w/api.php?action=query&prop=extracts',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultChars: 4000,
        charsCap: 12000,
        rateLimit: 'Wikimedia public Action API etiquette applies',
      },
      query: { title: 'hello', chars: 4000, redirects: true },
      page: {
        title: 'hello',
        missing: false,
        extract: 'Hello is a greeting or expression of goodwill.',
        extractChars: 45,
        url: 'https://en.wiktionary.org/wiki/hello',
      },
    }, 'text'),
  )

  assert.match(extractOutput, /Wiktionary Extract/)
  assert.match(extractOutput, /open REST API only · no auth/)
  assert.match(extractOutput, /title=hello/)
  assert.match(extractOutput, /Hello is a greeting/)
  assert.doesNotMatch(extractOutput, /^\{/)
})

test('text output renders Nationalize prediction without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'nationalize.predict',
      api: {
        provider: 'nationalize',
        endpoint: 'GET /?name={name}',
        authentication: 'none',
        usesBrowserClickstream: false,
        freeRateLimit: '2,500 names/month free plan',
      },
      query: { name: 'kim' },
      prediction: {
        name: 'kim',
        count: 383585,
        topCountry: { countryId: 'KR', probability: 0.5227 },
        countries: [{ countryId: 'KR', probability: 0.5227 }],
      },
      rateLimit: { limit: '100', remaining: '99', reset: '3600' },
    }, 'text'),
  )

  assert.match(output, /Nationalize\.io Prediction/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /kim likely KR at 52%/)
  assert.match(output, /remaining 99 \/ 100/)
  assert.match(output, /compare public-apis apis run nationalize\.predict -- --name anna/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Nationalize empty and low-confidence states', () => {
  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'nationalize.predict',
      api: {
        provider: 'nationalize',
        endpoint: 'GET /?name={name}',
        authentication: 'none',
        usesBrowserClickstream: false,
        freeRateLimit: '2,500 names/month free plan',
      },
      query: { name: 'qzxqzxqzx' },
      prediction: {
        name: 'qzxqzxqzx',
        count: 0,
        countries: [],
      },
      rateLimit: { limit: '100', remaining: '98', reset: '3600' },
    }, 'text'),
  )
  const lowConfidenceOutput = captureStdout(() =>
    printResult({
      kind: 'nationalize.predict',
      api: {
        provider: 'nationalize',
        endpoint: 'GET /?name={name}',
        authentication: 'none',
        usesBrowserClickstream: false,
        freeRateLimit: '2,500 names/month free plan',
      },
      query: { name: 'anna' },
      prediction: {
        name: 'anna',
        count: 70013,
        topCountry: { countryId: 'HU', probability: 0.065 },
        countries: [{ countryId: 'HU', probability: 0.065 }],
      },
      rateLimit: { limit: '100', remaining: '97', reset: '3600' },
    }, 'text'),
  )

  assert.match(emptyOutput, /No Nationalize country predictions returned/)
  assert.match(emptyOutput, /reason sample count 0 · no country probabilities/)
  assert.match(emptyOutput, /example public-apis apis run nationalize\.predict -- --name anna/)
  assert.match(lowConfidenceOutput, /anna top match HU at 7%/)
  assert.doesNotMatch(lowConfidenceOutput, /anna likely HU/)
})

test('text output renders APIs.guru providers, search, and metrics without fallback JSON', () => {
  const providersOutput = captureStdout(() =>
    printResult({
      kind: 'apisguru.providers',
      api: {
        provider: 'apisguru',
        endpoint: 'GET /providers.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'not documented',
        limitCap: 100,
      },
      query: { query: 'google', limit: 2 },
      count: 2,
      matchedProviders: 4,
      totalProviders: 677,
      providers: ['googleapis.com', 'google.local'],
    }, 'text'),
  )
  assert.match(providersOutput, /APIs\.guru Providers/)
  assert.match(providersOutput, /open REST API only · no auth/)
  assert.match(providersOutput, /matched 4 · total providers 677/)
  assert.match(providersOutput, /googleapis\.com/)
  assert.match(providersOutput, /search public-apis apis run apisguru\.search -- --provider googleapis\.com --limit 20/)
  assert.match(providersOutput, /more public-apis apis run apisguru\.providers -- --query google --limit 22/)
  assert.match(providersOutput, /metrics public-apis apis run apisguru\.metrics/)
  assert.doesNotMatch(providersOutput, /^\{/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'apisguru.search',
      api: {
        provider: 'apisguru',
        endpoint: 'GET /list.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        upstreamPagination: 'none',
        rateLimit: 'not documented',
        limitCap: 100,
      },
      query: { query: 'openapi', includeUnofficial: false, sort: 'updated', limit: 1 },
      count: 1,
      totalApis: 2529,
      matchedApis: 1,
      apis: [
        {
          id: 'apis.guru',
          title: 'APIs.guru',
          description: 'Wikipedia for Web APIs. Repository of OpenAPI specifications for public APIs.',
          version: '2.2.0',
          preferred: true,
          categories: ['developer_tools'],
          providerName: 'apis.guru',
          openapiVersion: '3.0.0',
          swaggerUrl: 'https://api.apis.guru/v2/specs/apis.guru/2.2.0/swagger.json',
          swaggerYamlUrl: 'https://api.apis.guru/v2/openapi.yaml',
          updated: '2026-05-03T00:00:00.000Z',
          unofficial: false,
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /APIs\.guru Search/)
  assert.match(searchOutput, /upstream pagination none/)
  assert.match(searchOutput, /APIs\.guru/)
  assert.match(searchOutput, /Wikipedia for Web APIs/)
  assert.match(searchOutput, /provider public-apis apis run apisguru\.search -- --provider apis\.guru --limit 20/)
  assert.match(searchOutput, /category public-apis apis run apisguru\.search -- --category developer_tools --limit 20/)
  assert.match(searchOutput, /providers public-apis apis run apisguru\.providers -- --limit 20/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const metricsOutput = captureStdout(() =>
    printResult({
      kind: 'apisguru.metrics',
      api: {
        provider: 'apisguru',
        endpoint: 'GET /metrics.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'not documented',
      },
      query: {},
      metrics: { numSpecs: 3992, numAPIs: 2529, numEndpoints: 108837, numProviders: 677, thisWeek: { added: 9, updated: 437 } },
      datasets: [{ title: 'providerCount', top: [{ key: 'azure.com', value: 1829 }] }],
    }, 'text'),
  )
  assert.match(metricsOutput, /APIs\.guru Metrics/)
  assert.match(metricsOutput, /specs 3992/)
  assert.match(metricsOutput, /azure\.com/)
  assert.match(metricsOutput, /top provider public-apis apis run apisguru\.search -- --provider azure\.com --limit 20/)
  assert.match(metricsOutput, /providers public-apis apis run apisguru\.providers -- --limit 20/)
  assert.doesNotMatch(metricsOutput, /^\{/)
})

test('text output renders CDNJS search, library, and version without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'cdnjs.search',
      api: {
        provider: 'cdnjs',
        endpoint: 'GET /libraries',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'not documented',
        limitCap: 1000,
      },
      query: { query: 'jquery', searchFields: ['name', 'description', 'keywords'], limit: 3 },
      pagination: { total: 1, available: 6169, shown: 1 },
      count: 1,
      libraries: [
        {
          name: 'jquery',
          latest: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
          version: '3.7.1',
          description: 'JavaScript library for DOM &amp; ajax operations',
          keywords: ['jquery'],
          license: 'MIT',
          github: { stars: 59543 },
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /CDNJS Library Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /jquery/)
  assert.match(searchOutput, /returned 1 · catalog available 6169/)
  assert.match(searchOutput, /DOM & ajax operations/)
  assert.match(searchOutput, /library public-apis apis run cdnjs\.library -- --name jquery --version-limit 20/)
  assert.match(searchOutput, /version public-apis apis run cdnjs\.version -- --name jquery --version 3\.7\.1 --file-limit 50/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const libraryOutput = captureStdout(() =>
    printResult({
      kind: 'cdnjs.library',
      api: {
        provider: 'cdnjs',
        endpoint: 'GET /libraries/{library}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'not documented',
        versionLimitCap: 200,
        fileLimitCap: 500,
      },
      query: { name: 'jquery', versionLimit: 1, fileLimit: 2 },
      count: 1,
      library: {
        name: 'jquery',
        latest: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
        version: '3.7.1',
        description: 'JavaScript library for DOM operations',
        keywords: ['jquery'],
        license: 'MIT',
        sri: 'sha512-min',
        github: { stars: 59543 },
        repositoryUrl: 'https://github.com/jquery/jquery.git',
        assets: [{ version: '3.7.1', fileCount: 2, files: [{ name: 'jquery.js', url: 'https://cdn.example/jquery.js', sri: 'sha512-js' }] }],
      },
    }, 'text'),
  )
  assert.match(libraryOutput, /CDNJS Library/)
  assert.match(libraryOutput, /v3\.7\.1/)
  assert.match(libraryOutput, /jquery\.js/)
  assert.match(libraryOutput, /script <script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jquery\/3\.7\.1\/jquery\.min\.js" integrity="sha512-min"/)
  assert.match(libraryOutput, /version public-apis apis run cdnjs\.version -- --name jquery --version 3\.7\.1 --file-limit 2/)
  assert.doesNotMatch(libraryOutput, /^\{/)

  const versionOutput = captureStdout(() =>
    printResult({
      kind: 'cdnjs.version',
      api: {
        provider: 'cdnjs',
        endpoint: 'GET /libraries/{library}/{version}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'not documented',
        fileLimitCap: 500,
      },
      query: { name: 'jquery', version: '3.7.1', fileLimit: 2 },
      count: 1,
      totalFiles: 3,
      files: [{ name: 'jquery.min.js', url: 'https://cdn.example/jquery.min.js', sri: 'sha512-min' }],
    }, 'text'),
  )
  assert.match(versionOutput, /CDNJS Version Files/)
  assert.match(versionOutput, /total files 3/)
  assert.match(versionOutput, /script <script src="https:\/\/cdn\.example\/jquery\.min\.js" integrity="sha512-min"/)
  assert.match(versionOutput, /jquery\.min\.js/)
  assert.match(versionOutput, /SRI available/)
  assert.match(versionOutput, /more public-apis apis run cdnjs\.version -- --name jquery --version 3\.7\.1 --file-limit 3/)
  assert.match(versionOutput, /library public-apis apis run cdnjs\.library -- --name jquery --version-limit 20/)
  assert.doesNotMatch(versionOutput, /^\{/)
})


test('text output renders Census.gov datasets and ACS states without fallback JSON', () => {
  const datasetsOutput = captureStdout(() => printResult({
    kind: 'censusgov.datasets',
    api: { provider: 'censusgov', endpoint: 'GET /data.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: false },
    query: { query: 'acs', limit: 100 },
    pagination: { returned: 1, totalMatched: 1, limit: 100, maxLimit: 100 },
    datasets: [{ title: '2024 ACS 5-Year Data Profiles', vintage: 2024, dataset: ['acs', 'acs5', 'profile'], variablesUrl: 'https://api.census.gov/data/2024/acs/acs5/profile/variables.json', description: 'ACS demographic and economic profile tables.' }],
  }, 'text'))
  assert.match(datasetsOutput, /Census.gov Datasets/)
  assert.match(datasetsOutput, /open REST API only · no auth/)
  assert.match(datasetsOutput, /again public-apis apis run censusgov\.datasets --online --persist -- --query acs --limit 100 --start 0/)
  assert.match(datasetsOutput, /replay public-apis apis run censusgov\.datasets --offline -- --query acs --limit 100 --start 0/)
  assert.match(datasetsOutput, /acs public-apis apis run censusgov\.acsProfileStates --online --persist -- --year 2024 --limit 52/)
  assert.match(datasetsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetsOutput, /^\{/)

  const statesOutput = captureStdout(() => printResult({
    kind: 'censusgov.acsProfileStates',
    api: { provider: 'censusgov', endpoint: 'GET /data/{year}/acs/acs5/profile', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: true },
    query: { year: 2024, limit: 52 },
    variables: { population: 'DP05_0001E', medianHouseholdIncome: 'DP03_0062E' },
    pagination: { returned: 1, limit: 52, maxLimit: 52 },
    states: [{ name: 'California', state: '06', population: 39287377, medianHouseholdIncome: 99122 }],
  }, 'text'))
  assert.match(statesOutput, /Census.gov ACS Profile States/)
  assert.match(statesOutput, /California/)
  assert.match(statesOutput, /again public-apis apis run censusgov\.acsProfileStates --online --persist -- --year 2024 --limit 52/)
  assert.match(statesOutput, /replay public-apis apis run censusgov\.acsProfileStates --offline -- --year 2024 --limit 52/)
  assert.match(statesOutput, /datasets public-apis apis run censusgov\.datasets --online --persist -- --query acs --limit 100/)
  assert.match(statesOutput, /open REST API only · no auth/)
  assert.doesNotMatch(statesOutput, /^\{/)

  const emptyDatasetsOutput = captureStdout(() => printResult({
    kind: 'censusgov.datasets',
    api: { provider: 'censusgov', endpoint: 'GET /data.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: false },
    query: { query: 'zzznotrealzz', limit: 5 },
    pagination: { returned: 0, totalMatched: 0, limit: 5, maxLimit: 100 },
    datasets: [],
  }, 'text'))
  assert.match(emptyDatasetsOutput, /No Census.gov datasets matched/)
  assert.match(emptyDatasetsOutput, /try public-apis apis run censusgov\.datasets --online --persist -- --query acs --limit 100/)
  assert.match(emptyDatasetsOutput, /acs public-apis apis run censusgov\.acsProfileStates --online --persist -- --year 2024 --limit 52/)

  const emptyStatesOutput = captureStdout(() => printResult({
    kind: 'censusgov.acsProfileStates',
    api: { provider: 'censusgov', endpoint: 'GET /data/{year}/acs/acs5/profile', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    query: { year: 2024, limit: 5 },
    variables: { population: 'DP05_0001E', medianHouseholdIncome: 'DP03_0062E' },
    pagination: { returned: 0, limit: 5, maxLimit: 52 },
    states: [],
  }, 'text'))
  assert.match(emptyStatesOutput, /No Census.gov ACS state rows returned/)
  assert.match(emptyStatesOutput, /try public-apis apis run censusgov\.acsProfileStates --online --persist -- --year 2024 --limit 52/)
  assert.match(emptyStatesOutput, /datasets public-apis apis run censusgov\.datasets --online --persist -- --query acs --limit 100/)
})

test('text output renders Cloudflare Trace without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'cloudflaretrace.trace',
      api: {
        provider: 'cloudflare-trace',
        endpoint: 'GET /cdn-cgi/trace',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'not documented',
        transport: 'HTTPS text/plain key-value',
        defaultEndpoint: 'one.one.one.one',
      },
      query: { endpoint: 'cloudflare.com', url: 'https://cloudflare.com/cdn-cgi/trace', includeRaw: false },
      trace: {
        host: 'cloudflare.com',
        ip: '203.0.113.10',
        country: 'US',
        colo: 'PDX',
        http: 'http/2',
        tls: 'TLSv1.3',
        userAgent: 'public-apis-tui test',
      },
      fields: { h: 'cloudflare.com', ip: '203.0.113.10', colo: 'PDX' },
    }, 'text'),
  )
  assert.match(output, /Cloudflare Trace/)
  assert.match(output, /HTTPS text\/plain key-value/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /203\.0\.113\.10/)
  assert.match(output, /compare public-apis apis run cloudflaretrace\.trace -- --endpoint one\.one\.one\.one/)
  assert.doesNotMatch(output, /next public-apis apis run cloudflaretrace\.trace -- --endpoint cloudflare\.com/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Chronicling America search without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'chroniclingamerica.search',
      api: {
        provider: 'chroniclingamerica',
        endpoint: 'GET /collections/chronicling-america/',
        authentication: 'none',
        usesBrowserClickstream: false,
        migrationNote: 'Legacy chroniclingamerica.loc.gov API paths returned 404; loc.gov JSON API is current.',
        rateLimitPolicy: '20 requests/minute and 2,000 requests/hour.',
      },
      query: { query: 'lincoln', count: 5, page: 1 },
      pagination: { current: 1, returned: 1, total: 1249405, perPage: 5, maxCount: 1000 },
      items: [
        {
          title: 'Image 2 of The Cass County Republican',
          date: '1860-11-08',
          digitized: true,
          onlineFormats: ['image', 'pdf', 'online text'],
          locations: ['dowagiac', 'michigan'],
          subjects: ['newspapers'],
          description: 'Abraham Lincoln election newspaper page.',
          url: 'https://www.loc.gov/resource/sn85033611/1860-11-08/ed-1/?sp=2&q=lincoln',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Chronicling America Search/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /Image 2 of The Cass County Republican/)
  assert.match(output, /20 requests\/minute/)
  assert.match(output, /again.*chroniclingamerica\.search --online --persist -- --query lincoln --count 5 --page 1/)
  assert.match(output, /replay.*chroniclingamerica\.search --offline -- --query lincoln --count 5 --page 1/)
  assert.match(output, /next page.*chroniclingamerica\.search --online --persist -- --query lincoln --count 5 --page 2/)
  assert.match(output, /civil war dates.*chroniclingamerica\.search --online --persist -- --query 'civil war' --count 5 --page 1 --dates 1861\/1865/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders DigitalOcean Status summary and events without fallback JSON', () => {
  const summaryOutput = captureStdout(() =>
    printResult({
      kind: 'digitaloceanstatus.summary',
      api: {
        provider: 'digitalocean-status',
        endpoint: 'GET /summary.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'not documented',
        cacheControl: 'Statuspage responses expose short cache-control TTLs.',
      },
      query: { componentQuery: 'API', componentLimit: 5 },
      page: { name: 'DigitalOcean', updatedAt: '2026-05-02T14:23:45.298Z' },
      status: { indicator: 'none', description: 'All Systems Operational' },
      count: 2,
      totals: { components: 222, incidents: 0, scheduledMaintenances: 1 },
      components: [
        { id: 'p1', name: 'API', status: 'operational', componentCount: 0 },
        { id: 'p2', name: 'Global', status: 'operational', groupId: 'grp1', groupName: 'Monitoring', componentCount: 0 },
      ],
      activeIncidents: [],
      scheduledMaintenances: [{ name: 'Core Maintenance', status: 'scheduled', impact: 'maintenance', scheduledFor: '2026-05-04T13:00:00.000Z' }],
    }, 'text'),
  )
  assert.match(summaryOutput, /DigitalOcean Status Summary/)
  assert.match(summaryOutput, /open REST API only · no auth/)
  assert.match(summaryOutput, /All Systems Operational/)
  assert.match(summaryOutput, /API/)
  assert.match(summaryOutput, /Global · operational · group Monitoring/)
  assert.doesNotMatch(summaryOutput, /^\{/)

  const incidentsOutput = captureStdout(() =>
    printResult({
      kind: 'digitaloceanstatus.incidents',
      api: {
        provider: 'digitalocean-status',
        endpoint: 'GET /incidents/unresolved.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'not documented',
        cacheControl: 'Statuspage responses expose short cache-control TTLs.',
        limitCap: 100,
      },
      query: { scope: 'unresolved', limit: 5, includeUpdates: false },
      page: { name: 'DigitalOcean', updatedAt: '2026-05-02T14:23:45.298Z' },
      count: 1,
      events: [{ name: 'API latency', status: 'monitoring', impact: 'minor', componentNames: ['API'], latestUpdate: { status: 'monitoring', body: 'We are monitoring API latency.' } }],
    }, 'text'),
  )
  assert.match(incidentsOutput, /DigitalOcean Incidents/)
  assert.match(incidentsOutput, /API latency/)
  assert.doesNotMatch(incidentsOutput, /^\{/)

  const maintenancesOutput = captureStdout(() =>
    printResult({
      kind: 'digitaloceanstatus.maintenances',
      api: {
        provider: 'digitalocean-status',
        endpoint: 'GET /scheduled-maintenances/upcoming.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'not documented',
        cacheControl: 'Statuspage responses expose short cache-control TTLs.',
        limitCap: 100,
      },
      query: { scope: 'upcoming', limit: 5, includeUpdates: false },
      page: { name: 'DigitalOcean', updatedAt: '2026-05-02T14:23:45.298Z' },
      count: 1,
      events: [{ name: 'Core Maintenance', status: 'scheduled', impact: 'maintenance', componentNames: ['API', 'Global', 'Global'], scheduledFor: '2026-05-04T13:00:00.000Z' }],
    }, 'text'),
  )
  assert.match(maintenancesOutput, /DigitalOcean Scheduled Maintenances/)
  assert.match(maintenancesOutput, /Core Maintenance/)
  assert.match(maintenancesOutput, /components: API, Global ×2/)
  assert.doesNotMatch(maintenancesOutput, /^\{/)
})

test('text output renders public API cache empty state', () => {
  const result: PublicApiCacheListResult = {
    kind: 'publicApis.cache.list',
    providerId: 'mediastack',
    operationId: 'mediastack.news',
    limit: 50,
    entries: [],
  }
  const output = captureStdout(() => printResult(result, 'text'))

  assert.match(output, /Public API Cache/)
  assert.match(output, /No cached results/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Currents keyed news without fallback JSON or secrets', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'currents.news',
      api: {
        provider: 'currents',
        endpoint: 'GET /v1/latest-news',
        authentication: 'apiKey query parameter from CURRENTS_API_KEY, local config, or --api-key',
        usesBrowserClickstream: false,
      },
      storage: { mode: 'online', persisted: false },
      query: { language: 'en', keywords: 'public api', pageSize: 1, page: 1 },
      pagination: { page: 1, pageSize: 1, returned: 1, maxPageSize: 300 },
      rateLimit: { limit: '1000', remaining: '999', burstLimit: '20', burstRemaining: '19' },
      articles: [
        {
          id: 'article-1',
          title: 'Currents RPC headline',
          description: 'A short article description.',
          url: 'https://example.com/news/currents',
          author: 'Reporter',
          language: 'en',
          category: ['technology'],
          published: '2026-05-04T08:00:00+00:00',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Currents News/)
  assert.match(output, /open REST API only · API key via local config\/env · no Chrome clickstream/)
  assert.match(output, /Currents RPC headline/)
  assert.match(output, /remaining 999 \/ 1000/)
  assert.match(output, /again.*currents\.news --online --persist -- --language en --page-size 1 --page 1 --keywords 'public api'/)
  assert.match(output, /replay.*currents\.news --offline -- --language en --page-size 1 --page 1 --keywords 'public api'/)
  assert.match(output, /next page.*currents\.news --online --persist -- --language en --page-size 1 --page 2 --keywords 'public api'/)
  assert.match(output, /latest.*currents\.news --online --persist -- --language en --page-size 1 --page 1/)
  assert.doesNotMatch(output, /apiKey|test-key|secret-key/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders GNews keyed article results without fallback JSON or secrets', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'gnews.search',
      api: {
        provider: 'gnews',
        endpoint: 'GET /api/v4/search',
        authentication: 'apikey query parameter from GNEWS_API_KEY, local config, or --api-key',
        usesBrowserClickstream: false,
      },
      storage: { mode: 'online', persisted: false },
      query: { query: 'public api', language: 'en', max: 1, page: 1 },
      pagination: { page: 1, max: 1, returned: 1, totalArticles: 7, maxResults: 100 },
      information: 'fixture information',
      articles: [
        {
          id: 'article-1',
          title: 'GNews RPC headline',
          description: 'A short article description.',
          url: 'https://example.com/news/gnews',
          publishedAt: '2026-05-04T08:00:00Z',
          lang: 'en',
          source: { name: 'Example News', country: 'us' },
        },
      ],
    }, 'text'),
  )

  assert.match(output, /GNews Search/)
  assert.match(output, /open REST API only · API key via local config\/env · no Chrome clickstream/)
  assert.match(output, /GNews RPC headline/)
  assert.match(output, /total 7/)
  assert.match(output, /again.*gnews\.search --online --persist -- --query 'public api' --language en --max 1 --page 1/)
  assert.match(output, /replay.*gnews\.search --offline -- --query 'public api' --language en --max 1 --page 1/)
  assert.match(output, /next page.*gnews\.search --online --persist -- --query 'public api' --language en --max 1 --page 2/)
  assert.match(output, /headlines.*gnews\.headlines --online --persist -- --category technology --language en --max 1 --page 1/)
  assert.doesNotMatch(output, /apikey|test-key|secret-key/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Guardian keyed content search without fallback JSON or secrets', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'guardian.search',
      api: { provider: 'guardian', endpoint: 'GET /search', authentication: 'api-key query parameter from GUARDIAN_API_KEY, local config, or --api-key', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { query: 'public api', section: 'technology', tag: 'technology/apple', fromDate: '2026-01-01', toDate: '2026-05-08', orderBy: 'newest', pageSize: 1, page: 1, showFields: 'headline,trailText,thumbnail,shortUrl,byline' },
      pagination: { returned: 1, total: 2, pageSize: 1, currentPage: 1, pages: 2, maxPageSize: 50 },
      userTier: 'developer',
      orderBy: 'relevance',
      articles: [{
        id: 'technology/2026/may/04/example',
        title: 'Guardian headline',
        webUrl: 'https://www.theguardian.com/technology/example',
        sectionName: 'Technology',
        publishedAt: '2026-05-04T08:00:00Z',
        pillarName: 'News',
        fields: { headline: 'Guardian headline', trailText: '<p>A short trail text.</p>', byline: 'Reporter' },
      }],
    }, 'text'),
  )
  assert.match(output, /The Guardian Content Search/)
  assert.match(output, /open REST API only · API key via local config\/env · no Chrome clickstream/)
  assert.match(output, /Guardian headline/)
  assert.match(output, /developer/)
  assert.match(output, /next public-apis apis run guardian\.search -- --query 'public api' --section technology --tag technology\/apple --from-date 2026-01-01 --to-date 2026-05-08 --order-by newest --show-fields headline,trailText,thumbnail,shortUrl,byline --page-size 1 --page 2/)
  assert.match(output, /again public-apis apis run guardian\.search -- --query 'public api' --section technology --tag technology\/apple --from-date 2026-01-01 --to-date 2026-05-08 --order-by newest --show-fields headline,trailText,thumbnail,shortUrl,byline --page-size 1 --page 1/)
  assert.match(output, /replay public-apis apis run guardian\.search --offline -- --query 'public api' --section technology --tag technology\/apple --from-date 2026-01-01 --to-date 2026-05-08 --order-by newest --show-fields headline,trailText,thumbnail,shortUrl,byline --page-size 1 --page 1/)
  assert.doesNotMatch(output, /api-key=.*test|secret-key|GUARDIAN_API_KEY=/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Hashnode posts without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'hashnode.posts',
      api: { provider: 'hashnode', endpoint: 'POST https://gql.hashnode.com', authentication: 'none for public publication reads', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { host: 'blog.developerdao.com', first: 1 },
      publication: { id: 'pub-1', title: 'Developer DAO', url: 'https://blog.developerdao.com' },
      pagination: { returned: 1, first: 1, maxFirst: 20, hasNextPage: true, endCursor: 'cursor-1' },
      posts: [{ id: 'post-1', title: 'Hashnode headline', brief: 'Short brief.', url: 'https://blog.developerdao.com/post', publishedAt: '2026-05-04T08:00:00Z', readTimeInMinutes: 3, author: { name: 'Reporter' }, tags: [{ name: 'API' }] }],
    }, 'text'),
  )
  assert.match(output, /Hashnode Publication Posts/)
  assert.match(output, /open GraphQL API only · no auth · no Chrome clickstream/)
  assert.match(output, /Hashnode headline/)
  assert.match(output, /next public-apis apis run hashnode\.posts -- --host blog\.developerdao\.com --first 1 --after cursor-1/)
  assert.match(output, /again public-apis apis run hashnode\.posts -- --host blog\.developerdao\.com --first 1/)
  assert.match(output, /replay public-apis apis run hashnode\.posts --offline -- --host blog\.developerdao\.com --first 1/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Open Collective account summary without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'opencollective.account',
      api: { provider: 'opencollective', endpoint: 'POST https://api.opencollective.com/graphql/v2', authentication: 'none for public GraphQL reads', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { slug: 'webpack' },
      account: {
        id: 'account-1',
        slug: 'webpack',
        type: 'COLLECTIVE',
        name: 'webpack',
        description: 'webpack is a build solution for modern web applications.',
        website: 'https://webpack.js.org/',
        isVerified: true,
        isActive: true,
        tags: ['open-source', 'javascript'],
        stats: {
          balance: { valueInCents: 9711549, currency: 'USD' },
          yearlyBudget: { valueInCents: 15916255, currency: 'USD' },
          totalAmountReceived: { valueInCents: 196101735, currency: 'USD' },
        },
      },
    }, 'text'),
  )
  assert.match(output, /Open Collective Account Summary/)
  assert.match(output, /open GraphQL API only · no auth · no Chrome clickstream/)
  assert.match(output, /webpack/)
  assert.match(output, /Financial Stats/)
  assert.match(output, /\$97,115/)
  assert.match(output, /again public-apis apis run opencollective\.account --online --persist -- --slug webpack/)
  assert.match(output, /replay public-apis apis run opencollective\.account --offline -- --slug webpack/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders MarketAux keyed financial news without fallback JSON or secrets', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'marketaux.news',
      api: {
        provider: 'marketaux',
        endpoint: 'GET /v1/news/all',
        authentication: 'api_token query parameter from MARKETAUX_API_KEY, local config, or --api-key',
        usesBrowserClickstream: false,
      },
      storage: { mode: 'online', persisted: false },
      query: { symbols: 'TSLA', language: 'en', limit: 100, page: 1 },
      pagination: { page: 1, returned: 1, found: 100, limit: 3, requestedLimit: 100, maxLimit: 100 },
      articles: [
        {
          uuid: 'article-1',
          title: 'MarketAux headline',
          description: 'A short article description.',
          url: 'https://example.com/news/marketaux',
          publishedAt: '2026-05-04T08:00:00Z',
          language: 'en',
          source: 'Example News',
          entities: [{ symbol: 'TSLA', sentimentScore: 0.42 }],
        },
      ],
    }, 'text'),
  )

  assert.match(output, /MarketAux News/)
  assert.match(output, /open REST API only · API token via local config\/env · no Chrome clickstream/)
  assert.match(output, /MarketAux headline/)
  assert.match(output, /provider lowered this request to 3 result/)
  assert.match(output, /again.*marketaux\.news --online --persist -- --symbols TSLA --language en --limit 100 --page 1/)
  assert.match(output, /replay.*marketaux\.news --offline -- --symbols TSLA --language en --limit 100 --page 1/)
  assert.match(output, /next page.*marketaux\.news --online --persist -- --symbols TSLA --language en --limit 100 --page 2/)
  assert.match(output, /search.*marketaux\.news --online --persist -- --search TSLA --symbols TSLA --language en --limit 100 --page 1/)
  assert.doesNotMatch(output, /api_token|test-key|secret-key/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders NYTimes keyed article search without fallback JSON or secrets', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'nytimes.search',
      api: { provider: 'nytimes', endpoint: 'GET /svc/search/v2/articlesearch.json', authentication: 'api-key query parameter from NYTIMES_API_KEY, local config, or --api-key', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { query: 'public api', filterQuery: 'section_name:("Technology")', beginDate: '20250101', endDate: '20260507', sort: 'newest', page: 0 },
      pagination: { page: 0, returned: 1, hits: 2, offset: 0, pageSize: 10 },
      articles: [{ id: 'nyt://article/1', title: 'NYTimes headline', abstract: 'A short abstract.', url: 'https://www.nytimes.com/example', byline: 'By Reporter', section: 'Technology', publishedAt: '2026-05-04T08:00:00Z' }],
    }, 'text'),
  )

  assert.match(output, /NYTimes Article Search/)
  assert.match(output, /open REST API only · API key via local config\/env · no Chrome clickstream/)
  assert.match(output, /NYTimes headline/)
  assert.match(output, /again.*nytimes\.search --online --persist -- --query 'public api' --filter-query 'section_name:\("Technology"\)' --begin-date 20250101 --end-date 20260507 --sort newest --page 0/)
  assert.match(output, /replay.*nytimes\.search --offline -- --query 'public api' --filter-query 'section_name:\("Technology"\)' --begin-date 20250101 --end-date 20260507 --sort newest --page 0/)
  assert.match(output, /next page.*nytimes\.search --online --persist -- --query 'public api' --filter-query 'section_name:\("Technology"\)' --begin-date 20250101 --end-date 20260507 --sort newest --page 1/)
  assert.match(output, /top stories.*nytimes\.topStories --online --persist -- --section technology --limit 10/)
  assert.doesNotMatch(output, /api-key=.*test|secret-key/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders NewsAPI keyed articles without fallback JSON or secrets', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'newsapi.everything',
      api: { provider: 'newsapi', endpoint: 'GET /v2/everything', authentication: 'apiKey query parameter from NEWSAPI_API_KEY, local config, or --api-key', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { query: 'public api', pageSize: 1, page: 1 },
      pagination: { page: 1, returned: 1, totalResults: 2, pageSize: 1, maxPageSize: 100 },
      articles: [{ title: 'NewsAPI headline', description: 'A short article description.', url: 'https://example.com/newsapi', author: 'Reporter', publishedAt: '2026-05-04T08:00:00Z', source: { name: 'Example News' } }],
    }, 'text'),
  )
  assert.match(output, /NewsAPI Everything/)
  assert.match(output, /open REST API only · API key via local config\/env · no Chrome clickstream/)
  assert.match(output, /NewsAPI headline/)
  assert.doesNotMatch(output, /apiKey=.*test|secret-key/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders NewsData.io keyed latest news without fallback JSON or secrets', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'newsdata.latest',
      api: { provider: 'newsdata', endpoint: 'GET /api/1/latest', authentication: 'apikey query parameter from NEWSDATAIO_API_KEY, local config, or --api-key', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { query: 'public api', searchIn: 'title', language: 'en', country: 'us', category: 'technology', domain: 'bbc', dedupe: true, size: 1 },
      pagination: { returned: 1, totalResults: 2, size: 1, maxFreeSize: 10, maxPaidSize: 50, nextPage: 'next-token' },
      rateLimit: { freeCreditsPer15Minutes: 30, freeCreditsPerDay: 200, paidCreditsPer15Minutes: 1800 },
      articles: [{
        id: 'article-1',
        title: 'NewsData headline',
        description: 'A short article description.',
        url: 'https://example.com/newsdata',
        publishedAt: '2026-05-04T08:00:00Z',
        language: 'en',
        countries: ['us'],
        categories: ['technology'],
        source: { name: 'Example News' },
      }],
    }, 'text'),
  )
  assert.match(output, /NewsData\.io Latest News/)
  assert.match(output, /open REST API only · API key via local config\/env · no Chrome clickstream/)
  assert.match(output, /NewsData headline/)
  assert.match(output, /free 30 credits \/ 15m/)
  assert.match(output, /next public-apis apis run newsdata\.latest -- --query 'public api' --search-in title --language en --country us --category technology --domain bbc --dedupe --size 1 --page next-token/)
  assert.match(output, /again public-apis apis run newsdata\.latest -- --query 'public api' --search-in title --language en --country us --category technology --domain bbc --dedupe --size 1/)
  assert.match(output, /replay public-apis apis run newsdata\.latest --offline -- --query 'public api' --search-in title --language en --country us --category technology --domain bbc --dedupe --size 1/)
  assert.doesNotMatch(output, /apikey=.*test|secret-key|NEWSDATAIO_API_KEY=/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders TheNewsAPI keyed all-news search without fallback JSON or secrets', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'thenews.all',
      api: { provider: 'thenews', endpoint: 'GET /v1/news/all', authentication: 'api_token query parameter from THENEWSAPI_API_KEY, local config, or --api-key', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { search: 'public api', language: 'en', locale: 'us', categories: 'business', domains: 'reuters.com', publishedAfter: '2026-01-01', publishedBefore: '2026-05-08', sort: 'published_at', limit: 100, page: 1 },
      pagination: { page: 1, returned: 1, found: 2, limit: 3, requestedLimit: 100, maxResultWindow: 20000, cliLimitCap: 100 },
      articles: [{ uuid: 'article-1', title: 'TheNews headline', description: 'A short article description.', url: 'https://example.com/thenews', source: 'example.com', language: 'en', publishedAt: '2026-05-04T08:00:00Z', categories: ['business'], locale: 'us' }],
    }, 'text'),
  )
  assert.match(output, /TheNewsAPI All News/)
  assert.match(output, /open REST API only · API token via local config\/env · no Chrome clickstream/)
  assert.match(output, /TheNews headline/)
  assert.match(output, /provider lowered this request to 3 result/)
  assert.match(output, /next public-apis apis run thenews\.all -- --search 'public api' --language en --locale us --categories business --domains reuters\.com --published-after 2026-01-01 --published-before 2026-05-08 --sort published_at --limit 100 --page 2/)
  assert.match(output, /again public-apis apis run thenews\.all -- --search 'public api' --language en --locale us --categories business --domains reuters\.com --published-after 2026-01-01 --published-before 2026-05-08 --sort published_at --limit 100 --page 1/)
  assert.match(output, /replay public-apis apis run thenews\.all --offline -- --search 'public api' --language en --locale us --categories business --domains reuters\.com --published-after 2026-01-01 --published-before 2026-05-08 --sort published_at --limit 100 --page 1/)
  assert.doesNotMatch(output, /api_token=.*test|secret-key|THENEWSAPI_API_KEY=/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Bible-api passage and random verse without fallback JSON', () => {
  const passageOutput = captureStdout(() =>
    printResult({
      kind: 'bibleapi.passage',
      api: {
        provider: 'bible-api',
        endpoint: 'GET /{reference}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: '15 requests / 30 seconds / IP',
      },
      query: { reference: 'John 3:16', translation: 'web', maxVerses: 30 },
      reference: 'John 3:16',
      translation: { id: 'web', name: 'World English Bible' },
      count: 1,
      totalVerses: 1,
      text: 'For God so loved the world.',
      verses: [
        {
          bookId: 'JHN',
          bookName: 'John',
          chapter: 3,
          verse: 16,
          text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
        },
      ],
    }, 'text'),
  )
  assert.match(passageOutput, /Bible-api Passage/)
  assert.match(passageOutput, /open REST API only · no auth/)
  assert.match(passageOutput, /John 3:16/)
  assert.match(passageOutput, /For God so loved/)
  assert.match(passageOutput, /eternal life\./)
  assert.match(passageOutput, /random same book.*bibleapi\.random.*--translation web --book JHN/u)
  assert.match(passageOutput, /random any.*bibleapi\.random.*--translation web/u)
  assert.doesNotMatch(passageOutput, /For God so loved[^\n]+…/u)
  assert.doesNotMatch(passageOutput, /^\{/)

  const randomOutput = captureStdout(() =>
    printResult({
      kind: 'bibleapi.random',
      api: {
        provider: 'bible-api',
        endpoint: 'GET /data/{translation}/random[/book[/chapter]]',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: '15 requests / 30 seconds / IP',
      },
      query: { translation: 'web', book: 'JHN' },
      translation: { id: 'web', name: 'World English Bible', language: 'English', languageCode: 'eng', license: 'Public Domain' },
      verse: { bookId: 'JHN', bookName: 'John', chapter: 3, verse: 16, text: 'Random verse text.' },
    }, 'text'),
  )
  assert.match(randomOutput, /Bible-api Random Verse/)
  assert.match(randomOutput, /Public Domain/)
  assert.match(randomOutput, /Random verse text/)
  assert.match(randomOutput, /open passage.*bibleapi\.passage.*--reference "John 3:16" --translation web/u)
  assert.match(randomOutput, /again.*bibleapi\.random.*--translation web --book JHN/u)
  assert.doesNotMatch(randomOutput, /^\{/)
})


test('text output renders Colorado Information Marketplace datasets and entities without fallback JSON', () => {
  const datasetsOutput = captureStdout(() => printResult({
    kind: 'coloradodata.datasets',
    api: { provider: 'coloradodata', endpoint: 'GET /api/catalog/v1', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: false },
    query: { query: 'business', limit: 100 },
    pagination: { returned: 1, totalMatched: 1, limit: 100, maxLimit: 100 },
    datasets: [{ id: '4ykn-tg5h', name: 'Business Entities in Colorado', category: 'Business', attribution: 'Department of State', description: 'Business entities registered with the Colorado Department of State.' }],
  }, 'text'))
  assert.match(datasetsOutput, /Colorado Information Marketplace Datasets/)
  assert.match(datasetsOutput, /open REST API only · no auth/)
  assert.match(datasetsOutput, /again public-apis apis run coloradodata\.datasets --online --persist -- --query business --limit 100/)
  assert.match(datasetsOutput, /replay public-apis apis run coloradodata\.datasets --offline -- --query business --limit 100/)
  assert.match(datasetsOutput, /entities public-apis apis run coloradodata\.businessEntities --online --persist -- --status "Good Standing" --limit 1000/)
  assert.match(datasetsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(datasetsOutput, /^\{/)

  const entitiesOutput = captureStdout(() => printResult({
    kind: 'coloradodata.businessEntities',
    api: { provider: 'coloradodata', endpoint: 'GET /resource/4ykn-tg5h.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', limitPolicy: 'bounded unauthenticated Socrata request' },
    storage: { mode: 'online', persisted: true },
    query: { status: 'Good Standing', limit: 1000 },
    pagination: { returned: 1, limit: 1000, maxLimit: 1000 },
    entities: [{ entityId: '20251665680', entityName: 'KYLDERON MIST VALLEY LLC', entityStatus: 'Good Standing', entityType: 'DLLC', city: 'Delta', state: 'CO', zip: '81416' }],
  }, 'text'))
  assert.match(entitiesOutput, /Colorado Business Entities/)
  assert.match(entitiesOutput, /KYLDERON MIST VALLEY LLC/)
  assert.match(entitiesOutput, /open REST API only · no auth/)
  assert.match(entitiesOutput, /again public-apis apis run coloradodata\.businessEntities --online --persist -- --status 'Good Standing' --limit 1000/)
  assert.match(entitiesOutput, /replay public-apis apis run coloradodata\.businessEntities --offline -- --status 'Good Standing' --limit 1000/)
  assert.match(entitiesOutput, /datasets public-apis apis run coloradodata\.datasets --online --persist -- --query business --limit 100/)
  assert.doesNotMatch(entitiesOutput, /^\{/)

  const emptyDatasetsOutput = captureStdout(() => printResult({
    kind: 'coloradodata.datasets',
    api: { provider: 'coloradodata', endpoint: 'GET /api/catalog/v1', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: false },
    query: { query: 'zzznotrealcoloradozz', limit: 5 },
    pagination: { returned: 0, totalMatched: 0, limit: 5, maxLimit: 100 },
    datasets: [],
  }, 'text'))
  assert.match(emptyDatasetsOutput, /No Colorado Information Marketplace datasets matched/)
  assert.match(emptyDatasetsOutput, /try public-apis apis run coloradodata\.datasets --online --persist -- --query business --limit 100/)
  assert.match(emptyDatasetsOutput, /entities public-apis apis run coloradodata\.businessEntities --online --persist -- --status "Good Standing" --limit 1000/)

  const emptyEntitiesOutput = captureStdout(() => printResult({
    kind: 'coloradodata.businessEntities',
    api: { provider: 'coloradodata', endpoint: 'GET /resource/4ykn-tg5h.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', limitPolicy: 'bounded unauthenticated Socrata request' },
    storage: { mode: 'online', persisted: false },
    query: { status: 'Not Good Standing', limit: 3 },
    pagination: { returned: 0, limit: 3, maxLimit: 1000 },
    entities: [],
  }, 'text'))
  assert.match(emptyEntitiesOutput, /No Colorado business entities returned/)
  assert.match(emptyEntitiesOutput, /try public-apis apis run coloradodata\.businessEntities --online --persist -- --status "Good Standing" --limit 1000/)
  assert.match(emptyEntitiesOutput, /datasets public-apis apis run coloradodata\.datasets --online --persist -- --query business --limit 100/)
})

test('text output renders Covid Tracking Project archive without fallback JSON', () => {
  const usOutput = captureStdout(() => printResult({
    kind: 'covidtracking.usDaily',
    api: { provider: 'covidtracking', endpoint: 'GET /v2/us/daily.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON static archive API', archiveNote: 'archived data; not current surveillance', licenseNote: 'CC-BY-4.0', limitPolicy: 'US daily archive cap 420' },
    query: { limit: 420 },
    count: 1,
    meta: { buildTime: '2021-06-01T07:03:25.055Z', license: 'CC-BY-4.0', version: '2.0-beta' },
    pagination: { returned: 1, limit: 420, maxLimit: 420 },
    rows: [{ date: '2021-03-07', states: 56, casesTotal: 28756489, testingTotal: 363825123, hospitalizedCurrently: 40199, deathTotal: 515151, caseChange: 41835, deathChange: 842 }],
  }, 'text'))
  assert.match(usOutput, /Covid Tracking Project US Daily Archive/)
  assert.match(usOutput, /open REST API only · no auth/)
  assert.match(usOutput, /archived data/)
  assert.match(usOutput, /no Chrome clickstream/)
  assert.match(usOutput, /again.*covidtracking\.usDaily --online --persist -- --limit 420/)
  assert.match(usOutput, /replay.*covidtracking\.usDaily --offline -- --limit 420/)
  assert.match(usOutput, /state.*covidtracking\.stateDaily --online --persist -- --state ca --limit 420/)
  assert.match(usOutput, /states.*covidtracking\.states --online --persist -- --limit 56/)
  assert.doesNotMatch(usOutput, /^\{/)

  const statesOutput = captureStdout(() => printResult({
    kind: 'covidtracking.states',
    api: { provider: 'covidtracking', endpoint: 'GET /v2/states.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON static archive API', archiveNote: 'archived data; not current surveillance', licenseNote: 'CC-BY-4.0', limitPolicy: 'states cap 56' },
    query: { limit: 56 },
    count: 1,
    meta: { buildTime: '2021-06-01T07:04:31.869Z', license: 'CC-BY-4.0', version: '2.0-beta' },
    pagination: { returned: 1, limit: 56, maxLimit: 56 },
    states: [{ name: 'California', stateCode: 'CA', population: 39512223, totalTestField: 'totalTestsViral', totalTestUnits: 'Specimens', sourceUrls: ['https://covid19.ca.gov/state-dashboard/'] }],
  }, 'text'))
  assert.match(statesOutput, /Covid Tracking Project States Metadata/)
  assert.match(statesOutput, /California/)
  assert.match(statesOutput, /again.*covidtracking\.states --online --persist -- --limit 56/)
  assert.match(statesOutput, /replay.*covidtracking\.states --offline -- --limit 56/)
  assert.match(statesOutput, /state CA.*covidtracking\.stateDaily --online --persist -- --state ca --limit 420/)
  assert.match(statesOutput, /us.*covidtracking\.usDaily --online --persist -- --limit 420/)
  assert.doesNotMatch(statesOutput, /^\{/)

  const stateOutput = captureStdout(() => printResult({
    kind: 'covidtracking.stateDaily',
    api: { provider: 'covidtracking', endpoint: 'GET /v2/states/ca/daily.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON static archive API', archiveNote: 'archived data; not current surveillance', licenseNote: 'CC-BY-4.0', limitPolicy: 'state daily cap 420' },
    query: { state: 'ca', limit: 420 },
    count: 1,
    meta: { buildTime: '2021-06-01T07:03:56.006Z', license: 'CC-BY-4.0', version: '2.0-beta' },
    pagination: { returned: 1, limit: 420, maxLimit: 420 },
    rows: [{ date: '2021-03-07', state: 'CA', casesTotal: 3501394, testingTotal: 49646014, hospitalizedCurrently: 4291, hospitalizedIcuCurrently: 1159, deathTotal: 54124, dataQualityGrade: 'B', updated: '2021-03-07T07:59:00Z' }],
  }, 'text'))
  assert.match(stateOutput, /Covid Tracking Project CA Daily Archive/)
  assert.match(stateOutput, /grade B/)
  assert.match(stateOutput, /again.*covidtracking\.stateDaily --online --persist -- --state ca --limit 420/)
  assert.match(stateOutput, /replay.*covidtracking\.stateDaily --offline -- --state ca --limit 420/)
  assert.match(stateOutput, /us.*covidtracking\.usDaily --online --persist -- --limit 420/)
  assert.match(stateOutput, /states.*covidtracking\.states --online --persist -- --limit 56/)
  assert.doesNotMatch(stateOutput, /^\{/)
})

test('text output renders Open Disease health data without fallback JSON', () => {
  const globalOutput = captureStdout(() => printResult({
    kind: 'opendisease.global',
    api: { provider: 'opendisease', endpoint: 'GET /v3/covid-19/all', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    storage: { mode: 'online', persisted: true },
    query: { period: 'today', allowNull: false },
    stats: { updated: 1777949229172, cases: 704753890, todayCases: 0, deaths: 7010681, recovered: 675619811, active: 22123398, critical: 34794, tests: 7026505313, population: 7944935131, affectedCountries: 231 },
  }, 'text'))
  assert.match(globalOutput, /Open Disease COVID-19 Global/)
  assert.match(globalOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(globalOutput, /affected countries 231/)
  assert.match(globalOutput, /countries.*opendisease\.countries -- --sort cases --limit 231/)
  assert.match(globalOutput, /again.*opendisease\.global --online --persist -- --period today --allow-null false/)
  assert.match(globalOutput, /replay.*opendisease\.global --offline -- --period today --allow-null false/)
  assert.doesNotMatch(globalOutput, /^\{/)

  const countriesOutput = captureStdout(() => printResult({
    kind: 'opendisease.countries',
    api: { provider: 'opendisease', endpoint: 'GET /v3/covid-19/countries', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    query: { sort: 'cases', search: '', limit: 231, allowNull: false },
    pagination: { returned: 1, total: 231, limit: 231, maxLimit: 231, sort: 'cases' },
    countries: [{ updated: 1777949229172, country: 'United States', countryInfo: { iso3: 'USA' }, cases: 111820082, deaths: 1219487, active: 12345, tests: 1186851502, population: 334805269, continent: 'North America' }],
  }, 'text'))
  assert.match(countriesOutput, /Open Disease COVID-19 Countries/)
  assert.match(countriesOutput, /United States/)
  assert.match(countriesOutput, /total 231/)
  assert.match(countriesOutput, /influenza.*opendisease\.influenza -- --limit 28/)
  assert.match(countriesOutput, /again.*opendisease\.countries --online --persist -- --sort cases --allow-null false --limit 231/)
  assert.match(countriesOutput, /replay.*opendisease\.countries --offline -- --sort cases --allow-null false --limit 231/)
  assert.doesNotMatch(countriesOutput, /^\{/)

  const influenzaOutput = captureStdout(() => printResult({
    kind: 'opendisease.influenza',
    api: { provider: 'opendisease', endpoint: 'GET /v3/influenza/cdc/ILINet', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST' },
    query: { limit: 28 },
    source: 'www.cdc.gov/flu',
    updated: 1777940782285,
    pagination: { returned: 1, limit: 28, maxLimit: 28 },
    rows: [{ week: '2021 - 40/52', age0To4: 13064, age5To24: 13019, age25To49: 7399, age50To64: 3163, age64Plus: 2522, totalILI: 39167, totalPatients: 2004168, percentWeightedILI: 2 }],
  }, 'text'))
  assert.match(influenzaOutput, /Open Disease CDC ILINet Influenza/)
  assert.match(influenzaOutput, /2021 - 40\/52/)
  assert.match(influenzaOutput, /no Chrome clickstream/)
  assert.match(influenzaOutput, /global.*opendisease\.global -- --period yesterday/)
  assert.match(influenzaOutput, /again.*opendisease\.influenza --online --persist -- --limit 28/)
  assert.match(influenzaOutput, /replay.*opendisease\.influenza --offline -- --limit 28/)
  assert.doesNotMatch(influenzaOutput, /^\{/)
})

test('text output renders Crossref works and work without fallback JSON', () => {
  const worksOutput = captureStdout(() =>
    printResult({
      kind: 'crossref.works',
      api: {
        provider: 'crossref',
        endpoint: 'GET /works',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumRows: 1000,
      },
      query: { query: 'metadata', rows: 1, offset: 0, order: 'desc' },
      pagination: { totalResults: 100, itemsPerPage: 1, offset: 0, nextOffset: 1 },
      rateLimit: { limit: '5', interval: '1s', concurrencyLimit: '1', apiPool: 'public' },
      count: 1,
      works: [
        {
          doi: '10.1000/test',
          title: 'Metadata for Everyone',
          authors: ['Ada Lovelace'],
          publisher: 'Example Publisher',
          type: 'book-chapter',
          issued: '2026-05-03',
          referencedByCount: 12,
          url: 'https://doi.org/10.1000/test',
        },
      ],
    }, 'text'),
  )
  assert.match(worksOutput, /Crossref Works/)
  assert.match(worksOutput, /open REST API only · no auth/)
  assert.match(worksOutput, /Metadata for Everyone/)
  assert.match(worksOutput, /max 1000/)
  assert.match(worksOutput, /open first.*crossref\.work.*--doi 10.1000\/test/u)
  assert.match(worksOutput, /more.*crossref\.works.*--query metadata --rows 1 --offset 1 --order desc/u)
  assert.doesNotMatch(worksOutput, /^\{/)

  const workOutput = captureStdout(() =>
    printResult({
      kind: 'crossref.work',
      api: {
        provider: 'crossref',
        endpoint: 'GET /works/{doi}',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumRows: 1000,
      },
      query: { doi: '10.1000/test' },
      rateLimit: { limit: '5', interval: '1s', concurrencyLimit: '1', apiPool: 'public' },
      work: {
        doi: '10.1000/test',
        title: 'Metadata for Everyone',
        authors: ['Ada Lovelace'],
        publisher: 'Example Publisher',
        type: 'book-chapter',
        issued: '2026-05-03',
        containerTitle: 'Example Book',
        url: 'https://doi.org/10.1000/test',
        abstract: 'Short abstract.',
      },
    }, 'text'),
  )
  assert.match(workOutput, /Crossref Work/)
  assert.match(workOutput, /10.1000\/test/)
  assert.match(workOutput, /Ada Lovelace/)
  assert.match(workOutput, /Short abstract/)
  assert.match(workOutput, /related search.*crossref\.works.*--query "Metadata for Everyone" --rows 20/u)
  assert.doesNotMatch(workOutput, /^\{/)
})

test('text output renders arXiv search and paper without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'arxiv.search',
      api: {
        provider: 'arxiv',
        endpoint: 'GET /api/query',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS Atom XML projected to JSON',
        rateLimitPolicy: [
          'Official docs request a 3 second delay between repeated calls.',
        ].join(' '),
      },
      query: {
        searchQuery: 'all:electron',
        start: 0,
        maxResults: 1,
        sortBy: 'relevance',
        sortOrder: 'descending',
        summaryLength: 120,
      },
      pagination: {
        totalResults: 12,
        startIndex: 0,
        itemsPerPage: 1,
        nextStart: 1,
        hasMore: true,
      },
      count: 1,
      papers: [
        {
          arxivId: '2101.00001v1',
          title: 'Bandits in Practice',
          summary: 'Short arXiv abstract.',
          published: '2021-01-04T18:12:28Z',
          updated: '2021-01-04T18:12:28Z',
          authors: ['Ada Lovelace', 'Grace Hopper'],
          categories: ['cs.LG'],
          primaryCategory: 'cs.LG',
          absUrl: 'https://arxiv.org/abs/2101.00001v1',
          pdfUrl: 'https://arxiv.org/pdf/2101.00001v1',
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /arXiv Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /HTTPS Atom XML projected to JSON/)
  assert.match(searchOutput, /Bandits in Practice/)
  assert.match(searchOutput, /open first.*arxiv\.paper.*--id 2101.00001v1/u)
  assert.match(
    searchOutput,
    /more.*arxiv\.search.*--query all:electron --max-results 1 --start 1/u,
  )
  assert.doesNotMatch(searchOutput, /^\{/)

  const paperOutput = captureStdout(() =>
    printResult({
      kind: 'arxiv.paper',
      api: {
        provider: 'arxiv',
        endpoint: 'GET /api/query',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS Atom XML projected to JSON',
      },
      query: { id: '2101.00001', summaryLength: 120 },
      found: true,
      paper: {
        arxivId: '2101.00001v1',
        title: 'Bandits in Practice',
        summary: 'Short arXiv abstract.',
        published: '2021-01-04T18:12:28Z',
        updated: '2021-01-04T18:12:28Z',
        authors: ['Ada Lovelace'],
        categories: ['cs.LG'],
        primaryCategory: 'cs.LG',
        comment: 'Example comment',
        absUrl: 'https://arxiv.org/abs/2101.00001v1',
      },
    }, 'text'),
  )
  assert.match(paperOutput, /arXiv Paper/)
  assert.match(paperOutput, /Bandits in Practice/)
  assert.match(paperOutput, /Ada Lovelace/)
  assert.match(paperOutput, /Short arXiv abstract/)
  assert.match(
    paperOutput,
    /related search.*arxiv\.search.*--query 'Bandits in Practice' --max-results 10/u,
  )
  assert.doesNotMatch(paperOutput, /^\{/)
})

test('text output renders Church Calendar day and month without fallback JSON', () => {
  const dayOutput = captureStdout(() =>
    printResult({
      kind: 'churchcalendar.day',
      api: {
        provider: 'churchcalendar',
        endpoint: 'GET /api/v0/{lang}/calendars/{calendar}/{y}/{m}/{d}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTP JSON',
        limitCap: 31,
      },
      query: { date: '2026-05-10', language: 'en', calendar: 'general-en' },
      day: {
        date: '2026-05-10',
        season: 'easter',
        seasonWeek: 6,
        weekday: 'sunday',
        celebrations: [
          {
            title: 'Sixth Sunday of Easter',
            colour: 'white',
            rank: 'sunday',
            rankNum: 4,
          },
        ],
      },
    }, 'text'),
  )
  assert.match(dayOutput, /Church Calendar Day/)
  assert.match(dayOutput, /HTTP JSON · open API only · no auth/)
  assert.match(dayOutput, /no Chrome clickstream/)
  assert.match(dayOutput, /Sixth Sunday of Easter/)
  assert.match(dayOutput, /month.*churchcalendar\.month.*--year 2026 --month 5/u)
  assert.doesNotMatch(dayOutput, /^\{/)

  const monthOutput = captureStdout(() =>
    printResult({
      kind: 'churchcalendar.month',
      api: {
        provider: 'churchcalendar',
        endpoint: 'GET /api/v0/{lang}/calendars/{calendar}/{year}/{month}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTP JSON',
        limitCap: 31,
      },
      query: {
        year: 2026,
        month: 5,
        language: 'en',
        calendar: 'general-en',
        limit: 1,
      },
      count: 1,
      days: [
        {
          date: '2026-05-10',
          season: 'easter',
          weekday: 'sunday',
          celebrations: [
            {
              title: 'Sixth Sunday of Easter',
              colour: 'white',
              rank: 'sunday',
            },
          ],
        },
      ],
    }, 'text'),
  )
  assert.match(monthOutput, /Church Calendar Month/)
  assert.match(monthOutput, /count 1 day\(s\) · cap 31/)
  assert.match(monthOutput, /open 1st.*churchcalendar\.day.*--date 2026-05-01/u)
  assert.match(monthOutput, /next month.*churchcalendar\.month.*--month 6/u)
  assert.doesNotMatch(monthOutput, /^\{/)
})

test('text output renders LectServe date and Sunday without fallback JSON', () => {
  const dateOutput = captureStdout(() =>
    printResult({
      kind: 'lectserve.date',
      api: {
        provider: 'lectserve',
        endpoint: 'GET /date/{yyyy-mm-dd}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON',
        alphaStatus: 'Official docs describe LectServe as alpha quality.',
        boundary: 'Documented JSON endpoints only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { date: '2026-05-10', lectionary: 'rcl' },
      sections: { hasSunday: true, hasDaily: true, hasRedLetter: true },
      daily: {
        date: '2026-05-10',
        day: 'Sunday',
        week: 'The Sixth Sunday of Easter',
        lectionary: 'acna-sec',
        readings: {
          morning: { first: 'Deuteronomy 11', second: 'Luke 6:39-7:10' },
          evening: { first: 'Job 38', second: '2 Peter 2' },
        },
      },
      sunday: createLectServeSundayFixture('Sixth Sunday of Easter', 'rcl'),
      redLetter: createLectServeSundayFixture('Sixth Sunday of Easter', 'rcl'),
    }, 'text'),
  )
  assert.match(dateOutput, /LectServe Date/)
  assert.match(dateOutput, /HTTPS JSON · open API only · no auth/)
  assert.match(dateOutput, /no Chrome clickstream/)
  assert.match(dateOutput, /Deuteronomy 11; Luke 6:39-7:10/)
  assert.match(dateOutput, /Sixth Sunday of Easter/)
  assert.match(dateOutput, /again public-apis apis run lectserve\.date/)
  assert.match(dateOutput, /upcoming public-apis apis run lectserve\.sunday/)
  assert.doesNotMatch(dateOutput, /^\{/)

  const sundayOutput = captureStdout(() =>
    printResult({
      kind: 'lectserve.sunday',
      api: {
        provider: 'lectserve',
        endpoint: 'GET /sunday',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON',
        alphaStatus: 'Official docs describe LectServe as alpha quality.',
      },
      storage: { mode: 'offline', persisted: true },
      query: { lectionary: 'acna', scope: 'upcoming-server-relative-sunday' },
      sunday: createLectServeSundayFixture('The Sunday after Ascension Day'),
    }, 'text'),
  )
  assert.match(sundayOutput, /LectServe Upcoming Sunday/)
  assert.match(sundayOutput, /server-relative upcoming Sunday/)
  assert.match(sundayOutput, /The Sunday after Ascension Day/)
  assert.match(sundayOutput, /open date public-apis apis run lectserve\.date/)
  assert.doesNotMatch(sundayOutput, /^\{/)
})

function createLectServeSundayFixture(
  name: string,
  lectionary = 'acna',
): Record<string, unknown> {
  return {
    date: '2026-05-17',
    day: 'Sunday',
    year: 'A',
    type: 'Sunday',
    lectionary,
    services: [
      {
        name,
        alt: 'Rogation Sunday',
        readings: [
          'Acts 17:22-34',
          'Psalm 66:8-20',
          '1 Peter 3:13-22',
          'John 14:15-21',
        ],
      },
    ],
  }
}

test('text output renders Currency-api currencies and rates without fallback JSON', () => {
  const currenciesOutput = captureStdout(() => printResult({
    kind: 'currencyapi.currencies',
    api: { provider: 'currencyapi', endpoint: 'GET /v1/currencies.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON via jsDelivr with Cloudflare Pages fallback', rateLimit: 'Official README says No Rate limits.' },
    query: { search: '', limit: 301 },
    pagination: { returned: 3, limit: 301, maxLimit: 301 },
    currencies: [{ code: 'usd', name: 'US Dollar' }, { code: 'eur', name: 'Euro' }, { code: 'btc', name: 'Bitcoin' }],
  }, 'text'))
  assert.match(currenciesOutput, /Currency-api Currencies/)
  assert.match(currenciesOutput, /open REST API only · no auth/)
  assert.match(currenciesOutput, /USD — US Dollar/)
  assert.match(currenciesOutput, /rates.*currencyapi\.rates -- --base usd --symbols eur,jpy,btc/)
  assert.match(currenciesOutput, /again.*currencyapi\.currencies --online --persist -- --limit 301/)
  assert.match(currenciesOutput, /replay.*currencyapi\.currencies --offline -- --limit 301/)
  assert.doesNotMatch(currenciesOutput, /^\{/)

  const ratesOutput = captureStdout(() => printResult({
    kind: 'currencyapi.rates',
    api: { provider: 'currencyapi', endpoint: 'GET /v1/currencies/{base}.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON via jsDelivr with Cloudflare Pages fallback', rateLimit: 'Official README says No Rate limits.' },
    query: { base: 'usd', date: 'latest', symbols: ['eur', 'jpy'], limit: 301 },
    date: '2026-05-04',
    base: 'usd',
    pagination: { returned: 2, limit: 301, maxLimit: 301 },
    rates: [{ code: 'btc', rate: 0.0000109378 }, { code: 'eur', rate: 0.85281009 }, { code: 'jpy', rate: 157.23550777 }],
  }, 'text'))
  assert.match(ratesOutput, /Currency-api USD Rates/)
  assert.match(ratesOutput, /BTC 0\.0000109378/)
  assert.match(ratesOutput, /EUR/)
  assert.match(ratesOutput, /currencies.*currencyapi\.currencies -- --search btc/)
  assert.match(ratesOutput, /again.*currencyapi\.rates --online --persist -- --base usd --date latest --symbols eur,jpy --limit 301/)
  assert.match(ratesOutput, /replay.*currencyapi\.rates --offline -- --base usd --date latest --symbols eur,jpy --limit 301/)
  assert.match(ratesOutput, /no Chrome clickstream/)
  assert.doesNotMatch(ratesOutput, /^\{/)
})

test('text output renders Frankfurter currencies, rates, and conversion without fallback JSON', () => {
  const currenciesOutput = captureStdout(() => printResult({
    kind: 'frankfurter.currencies',
    api: { provider: 'frankfurter', endpoint: 'GET /v2/currencies', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', cachePolicy: 'public max-age=86400' },
    storage: { mode: 'online', persisted: false },
    query: { scope: 'all', search: 'dollar', limit: 2 },
    pagination: { returned: 2, scope: 'all', limit: 2, maxLimit: 200 },
    currencies: [
      { code: 'USD', name: 'United States Dollar', symbol: '$', startDate: '1792-04-02', endDate: '2026-05-05' },
      { code: 'EUR', name: 'Euro', symbol: '€', startDate: '1999-01-04', endDate: '2026-05-05' },
    ],
  }, 'text'))
  assert.match(currenciesOutput, /Frankfurter Currencies/)
  assert.match(currenciesOutput, /open REST API only · no auth/)
  assert.match(currenciesOutput, /USD/)
  assert.match(currenciesOutput, /rates.*frankfurter\.rates -- --base USD --quotes EUR,GBP/)
  assert.match(currenciesOutput, /again.*frankfurter\.currencies --online --persist -- --scope all --search dollar --limit 2/)
  assert.match(currenciesOutput, /replay.*frankfurter\.currencies --offline -- --scope all --search dollar --limit 2/)
  assert.doesNotMatch(currenciesOutput, /^\{/)

  const ratesOutput = captureStdout(() => printResult({
    kind: 'frankfurter.rates',
    api: { provider: 'frankfurter', endpoint: 'GET /v2/rates', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', cachePolicy: 'public max-age=86400' },
    storage: { mode: 'online', persisted: false },
    query: { base: 'USD', quotes: ['EUR', 'GBP'], date: '', limit: 2 },
    pagination: { returned: 2, limit: 2, maxLimit: 200 },
    rates: [
      { date: '2026-05-05', base: 'USD', quote: 'EUR', rate: 0.85387 },
      { date: '2026-05-05', base: 'USD', quote: 'GBP', rate: 0.73812 },
    ],
  }, 'text'))
  assert.match(ratesOutput, /Frankfurter USD Rates/)
  assert.match(ratesOutput, /USD\/EUR/)
  assert.match(ratesOutput, /convert.*frankfurter\.convert -- --base USD --quote EUR --amount 100/)
  assert.match(ratesOutput, /again.*frankfurter\.rates --online --persist -- --base USD --quotes EUR,GBP --limit 2/)
  assert.match(ratesOutput, /replay.*frankfurter\.rates --offline -- --base USD --quotes EUR,GBP --limit 2/)
  assert.doesNotMatch(ratesOutput, /--base USD --quote USD/)
  assert.match(ratesOutput, /no Chrome clickstream/)
  assert.doesNotMatch(ratesOutput, /^\{/)

  const convertOutput = captureStdout(() => printResult({
    kind: 'frankfurter.convert',
    api: { provider: 'frankfurter', endpoint: 'GET /v2/rate/{base}/{quote}', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', cachePolicy: 'public max-age=86400' },
    storage: { mode: 'online', persisted: false },
    query: { base: 'USD', quote: 'EUR', amount: 100, date: '' },
    conversion: { date: '2026-05-05', base: 'USD', quote: 'EUR', rate: 0.85387, amount: 100, converted: 85.387 },
  }, 'text'))
  assert.match(convertOutput, /Frankfurter Convert/)
  assert.match(convertOutput, /100 USD/)
  assert.match(convertOutput, /rates.*frankfurter\.rates -- --base USD --quotes EUR/)
  assert.match(convertOutput, /again.*frankfurter\.convert --online --persist -- --base USD --quote EUR --amount 100/)
  assert.match(convertOutput, /replay.*frankfurter\.convert --offline -- --base USD --quote EUR --amount 100/)
  assert.match(convertOutput, /no Chrome clickstream/)
  assert.doesNotMatch(convertOutput, /^\{/)
})

test('text output renders NBP exchange rates without fallback JSON', () => {
  const tableOutput = captureStdout(() => printResult({
    kind: 'nbp.tables',
    api: { provider: 'nbp', endpoint: 'GET /api/exchangerates/tables/{table}/', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', windowLimit: '93 days' },
    storage: { mode: 'online', persisted: false },
    query: { table: 'A', code: '', limit: 120 },
    table: 'A',
    no: '084/A/NBP/2026',
    effectiveDate: '2026-05-04',
    pagination: { returned: 2, limit: 120, maxLimit: 120 },
    rates: [{ currency: 'dolar amerykański', code: 'USD', mid: 3.6303 }, { currency: 'euro', code: 'EUR', mid: 4.2607 }],
  }, 'text'))
  assert.match(tableOutput, /NBP Table A/)
  assert.match(tableOutput, /open REST API only · no auth/)
  assert.match(tableOutput, /USD/)
  assert.doesNotMatch(tableOutput, /^\{/)

  const historyOutput = captureStdout(() => printResult({
    kind: 'nbp.history',
    api: { provider: 'nbp', endpoint: 'GET /api/exchangerates/rates/{table}/{code}/last/{count}/', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', windowLimit: '93 days' },
    storage: { mode: 'online', persisted: false },
    query: { table: 'A', code: 'USD', count: 93 },
    table: 'A',
    currency: 'dolar amerykański',
    code: 'USD',
    pagination: { returned: 2, count: 93, maxCount: 93 },
    rates: [{ no: '083/A/NBP/2026', effectiveDate: '2026-05-01', mid: 3.6123 }, { no: '084/A/NBP/2026', effectiveDate: '2026-05-04', mid: 3.6303 }],
  }, 'text'))
  assert.match(historyOutput, /NBP USD History/)
  assert.match(historyOutput, /latest first/)
  assert.match(historyOutput, /latest 2026-05-04/)
  assert.match(historyOutput, /2026-05-04/)
  assert.match(historyOutput, /no Chrome clickstream/)
  assert.doesNotMatch(historyOutput, /^\{/)
})

test('text output renders VATComply operations without fallback JSON', () => {
  const ratesOutput = captureStdout(() => printResult({
    kind: 'vatcomply.rates',
    api: { provider: 'vatcomply', endpoint: 'GET /rates', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', rateLimit: 'no quota documented' },
    storage: { mode: 'online', persisted: false },
    query: { base: 'USD', symbols: ['EUR', 'GBP'], date: '', limit: 33 },
    date: '2026-04-16',
    base: 'USD',
    pagination: { returned: 2, limit: 33, maxLimit: 33 },
    rates: [{ code: 'EUR', rate: 0.848752 }, { code: 'GBP', rate: 0.738355 }],
  }, 'text'))
  assert.match(ratesOutput, /VATComply USD Rates/)
  assert.match(ratesOutput, /open REST API only · no auth/)
  assert.match(ratesOutput, /EUR/)
  assert.doesNotMatch(ratesOutput, /^\{/)

  const vatRatesOutput = captureStdout(() => printResult({
    kind: 'vatcomply.vatRates',
    api: { provider: 'vatcomply', endpoint: 'GET /vat_rates', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', rateLimit: 'no quota documented' },
    storage: { mode: 'online', persisted: false },
    query: { countryCode: 'DE', limit: 27 },
    pagination: { returned: 1, limit: 27, maxLimit: 27 },
    rates: [{ countryCode: 'DE', countryName: 'Germany', standardRate: 19, reducedRates: [7], currency: 'EUR', memberState: true, rateCommentCount: 1, rateCategoryCount: 1 }],
  }, 'text'))
  assert.match(vatRatesOutput, /VATComply VAT Rates/)
  assert.match(vatRatesOutput, /Germany/)
  assert.match(vatRatesOutput, /no Chrome clickstream/)
  assert.doesNotMatch(vatRatesOutput, /^\{/)

  const geolocateOutput = captureStdout(() => printResult({
    kind: 'vatcomply.geolocate',
    api: { provider: 'vatcomply', endpoint: 'GET /geolocate', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', rateLimit: 'no quota documented' },
    storage: { mode: 'online', persisted: false },
    query: {},
    location: { countryCode: 'US', iso3: 'USA', name: 'United States', capital: 'Washington', currency: 'USD', region: 'Americas', subregion: 'Northern America', latitude: 38, longitude: -97, phoneCode: '1', tld: '.us', ip: '203.0.113.10' },
  }, 'text'))
  assert.match(geolocateOutput, /VATComply Geolocate/)
  assert.match(geolocateOutput, /request public IP geolocation/)
  assert.match(geolocateOutput, /no auth/)
  assert.doesNotMatch(geolocateOutput, /^\{/)

  const vatOutput = captureStdout(() => printResult({
    kind: 'vatcomply.vat',
    api: { provider: 'vatcomply', endpoint: 'GET /vat', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', rateLimit: 'no quota documented' },
    storage: { mode: 'online', persisted: false },
    query: { vatNumber: 'DE123456789' },
    validation: { valid: false, vatNumber: '123456789', countryCode: 'DE', name: '---', address: '---' },
  }, 'text'))
  assert.match(vatOutput, /VATComply VAT Validation/)
  assert.match(vatOutput, /valid/)
  assert.match(vatOutput, /no Chrome clickstream/)
  assert.doesNotMatch(vatOutput, /^\{/)
})

test('text output renders Economia.Awesome latest and daily quotes without fallback JSON', () => {
  const latestOutput = captureStdout(() => printResult({
    kind: 'economiaawesome.latest',
    api: { provider: 'economiaawesome', endpoint: 'GET /json/last/{pairs}', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', cachePolicy: '5 minute public cache observed' },
    query: { pairs: ['USD-BRL', 'EUR-BRL', 'BTC-BRL'] },
    pagination: { returned: 2, pairCount: 3, maxPairs: 20 },
    quotes: [
      { pair: 'USD-BRL', code: 'USD', codeIn: 'BRL', name: 'Dólar Americano/Real Brasileiro', bid: 4.9842, ask: 4.9872, high: 4.985, low: 4.97808, percentChange: -0.014042, createDate: '2026-05-05 01:10:29' },
      { pair: 'EUR-BRL', code: 'EUR', codeIn: 'BRL', name: 'Euro/Real Brasileiro', bid: 5.82072, ask: 5.83431, high: 5.82411, low: 5.81734, percentChange: 0.000031, createDate: '2026-05-05 01:01:21' },
    ],
  }, 'text'))
  assert.match(latestOutput, /Economia\.Awesome Latest Quotes/)
  assert.match(latestOutput, /open REST API only · no auth/)
  assert.match(latestOutput, /USD-BRL/)
  assert.match(latestOutput, /no Chrome clickstream/)
  assert.match(latestOutput, /daily.*economiaawesome\.daily -- --pair USD-BRL --days 360/)
  assert.match(latestOutput, /again.*economiaawesome\.latest --online --persist -- --pairs USD-BRL,EUR-BRL,BTC-BRL/)
  assert.match(latestOutput, /replay.*economiaawesome\.latest --offline -- --pairs USD-BRL,EUR-BRL,BTC-BRL/)
  assert.doesNotMatch(latestOutput, /^\{/)

  const dailyOutput = captureStdout(() => printResult({
    kind: 'economiaawesome.daily',
    api: { provider: 'economiaawesome', endpoint: 'GET /json/daily/{pair}/{days}', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON REST', cachePolicy: '15 minute public cache observed' },
    query: { pair: 'USD-BRL', days: 360 },
    pair: 'USD-BRL',
    pagination: { returned: 2, days: 360, maxDays: 360 },
    quotes: [
      { pair: 'USD-BRL', code: 'USD', codeIn: 'BRL', name: 'Dólar Americano/Real Brasileiro', bid: 4.9842, ask: 4.9872, high: 4.985, low: 4.97808, percentChange: -0.014042, createDate: '2026-05-05 01:10:29' },
      { pair: '-', code: '', codeIn: '', bid: 4.9001, ask: 4.9102, high: 4.955, low: 4.8901, percentChange: 0.12, timestamp: 1777954229 },
    ],
  }, 'text'))
  assert.match(dailyOutput, /Economia\.Awesome USD-BRL Daily/)
  assert.match(dailyOutput, /days 360 \/ 360/)
  assert.match(dailyOutput, /no Chrome clickstream/)
  assert.doesNotMatch(dailyOutput, /^- - bid/m)
  assert.match(dailyOutput, /USD-BRL bid 4\.9/)
  assert.match(dailyOutput, /2026-05-05T04:10:29\.000Z/)
  assert.match(dailyOutput, /latest.*economiaawesome\.latest -- --pairs USD-BRL,EUR-BRL,BTC-BRL/)
  assert.match(dailyOutput, /again.*economiaawesome\.daily --online --persist -- --pair USD-BRL --days 360/)
  assert.match(dailyOutput, /replay.*economiaawesome\.daily --offline -- --pair USD-BRL --days 360/)
  assert.doesNotMatch(dailyOutput, /^\{/)
})

test('text output renders Gutendex books and book without fallback JSON', () => {
  const booksOutput = captureStdout(() =>
    printResult({
      kind: 'gutendex.books',
      api: {
        provider: 'gutendex',
        endpoint: 'GET /books/',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedPageSize: '0-32 books per page, controlled by Gutendex',
      },
      query: { search: 'great', languages: 'en', page: 1 },
      pagination: { count: 64, page: 1, next: 'https://gutendex.com/books/?page=2&search=great&languages=en', previous: null, pageSize: '0-32' },
      count: 1,
      books: [
        {
          id: 1400,
          title: 'Great Expectations',
          authors: ['Dickens, Charles (1812-1870)'],
          languages: ['en'],
          summaries: ['A coming-of-age novel.'],
          subjects: ['Bildungsroman'],
          bookshelves: [],
          copyright: false,
          mediaType: 'Text',
          downloadCount: 12345,
          formats: { text: 'https://www.gutenberg.org/files/1400/1400-0.txt' },
        },
      ],
    }, 'text'),
  )
  assert.match(booksOutput, /Gutendex Books/)
  assert.match(booksOutput, /open REST API only · no auth/)
  assert.match(booksOutput, /Great Expectations/)
  assert.match(booksOutput, /0-32/)
  assert.match(booksOutput, /open first.*gutendex\.book.*--id 1400/u)
  assert.match(booksOutput, /next page.*gutendex\.books.*--search great --languages en --page 2/u)
  assert.doesNotMatch(booksOutput, /^\{/)

  const bookOutput = captureStdout(() =>
    printResult({
      kind: 'gutendex.book',
      api: {
        provider: 'gutendex',
        endpoint: 'GET /books/{id}/',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedPageSize: '0-32 books per page, controlled by Gutendex',
      },
      query: { id: 1342 },
      book: {
        id: 1342,
        title: 'Pride and Prejudice',
        authors: ['Austen, Jane (1775-1817)'],
        languages: ['en'],
        summaries: ['A novel about manners and first impressions that continues with enough context to verify the detail renderer wraps the complete summary instead of silently truncating it in text mode.'],
        subjects: ['Courtship -- Fiction'],
        bookshelves: [],
        copyright: false,
        mediaType: 'Text',
        downloadCount: 54321,
        formats: { text: 'https://www.gutenberg.org/files/1342/1342-0.txt' },
      },
    }, 'text'),
  )
  assert.match(bookOutput, /Gutendex Book/)
  assert.match(bookOutput, /Pride and Prejudice/)
  assert.match(bookOutput, /Austen, Jane/)
  assert.match(bookOutput, /silently truncating it in text mode\./)
  assert.match(bookOutput, /related search.*gutendex\.books.*--search "Pride and Prejudice" --languages en --page 1/u)
  assert.match(bookOutput, /gutenberg.org/)
  assert.doesNotMatch(bookOutput, /silently truncating it in text mode…/u)
  assert.doesNotMatch(bookOutput, /^\{/)
})

test('text output renders Open Library search and work without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'openlibrary.search',
      api: {
        provider: 'openlibrary',
        endpoint: 'GET /search.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedDefaultLimit: 100,
        cliLimitCap: 100,
      },
      query: { query: 'pride', language: 'eng', limit: 20 },
      pagination: { total: 100, start: 0, limit: 20, nextOffset: 1, numFoundExact: true },
      count: 1,
      works: [
        {
          key: '/works/OL66554W',
          title: 'Pride and Prejudice',
          authors: ['Jane Austen'],
          firstPublishYear: 1813,
          languages: ['eng'],
          editionCount: 4038,
          coverUrl: 'https://covers.openlibrary.org/b/id/14348537-M.jpg',
          ebookAccess: 'public',
          hasFulltext: true,
          url: 'https://openlibrary.org/works/OL66554W',
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /Open Library Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Pride and Prejudice/)
  assert.match(searchOutput, /CLI cap 100/)
  assert.match(searchOutput, /1 text shown \/ 1 returned/)
  assert.match(searchOutput, /open first.*openlibrary\.work.*--work-key \/works\/OL66554W/u)
  assert.match(searchOutput, /next page.*openlibrary\.search.*--query pride --language eng --offset 1 --limit 20/u)
  assert.doesNotMatch(searchOutput, /^\{/)

  const workOutput = captureStdout(() =>
    printResult({
      kind: 'openlibrary.work',
      api: {
        provider: 'openlibrary',
        endpoint: 'GET /works/{id}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { workKey: '/works/OL66554W' },
      work: {
        key: '/works/OL66554W',
        title: 'Pride and Prejudice',
        description: 'A novel about manners and first impressions that continues long enough to prove the Open Library work renderer wraps the complete description instead of silently truncating it for text mode readers.',
        subjects: ['Courtship', 'Sisters'],
        firstPublishDate: '1813',
        authors: ['/authors/OL21594A'],
        revision: 117,
        url: 'https://openlibrary.org/works/OL66554W',
      },
    }, 'text'),
  )
  assert.match(workOutput, /Open Library Work/)
  assert.match(workOutput, /Pride and Prejudice/)
  assert.match(workOutput, /manners and first impressions/)
  assert.match(workOutput, /text mode\s+readers\./u)
  assert.match(workOutput, /Courtship/)
  assert.match(workOutput, /related search.*openlibrary\.search.*--query "Pride and Prejudice" --limit 100/u)
  assert.doesNotMatch(workOutput, /text mode readers…/u)
  assert.doesNotMatch(workOutput, /^\{/)
})

test('text output renders GBIF species and occurrences without fallback JSON', () => {
  const speciesOutput = captureStdout(() =>
    printResult({
      kind: 'gbif.species',
      api: {
        provider: 'gbif',
        endpoint: 'GET /v1/species/search',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        rateLimitPolicy: 'GBIF search APIs may be rate limited.',
        boundary: 'Read-only GET JSON search only; downloads are not exposed.',
        limitCap: 50,
        offsetCap: 10000,
      },
      storage: { mode: 'online', persisted: true },
      query: { query: 'Quercus robur', rank: 'SPECIES', limit: 2, offset: 0 },
      pagination: { total: 140762, returned: 1, limit: 2, offset: 0, nextOffset: 1 },
      count: 1,
      species: [
        {
          key: 2878688,
          scientificName: 'Quercus robur L.',
          canonicalName: 'Quercus robur',
          rank: 'SPECIES',
          taxonomicStatus: 'ACCEPTED',
          kingdom: 'Plantae',
          family: 'Fagaceae',
          genus: 'Quercus',
          species: 'Quercus robur',
          numOccurrences: 140762,
        },
      ],
    }, 'text'),
  )
  assert.match(speciesOutput, /GBIF Species Search/)
  assert.match(speciesOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(speciesOutput, /HTTPS JSON REST/)
  assert.match(speciesOutput, /Quercus robur L\./)
  assert.match(speciesOutput, /lineage.*Plantae.*Fagaceae.*Quercus/u)
  assert.match(speciesOutput, /again.*gbif\.species.*--query 'Quercus robur'/u)
  assert.match(speciesOutput, /replay.*gbif\.species.*--offline/u)
  assert.match(speciesOutput, /more.*--offset 1/u)
  assert.match(speciesOutput, /occurrences.*gbif\.occurrences/u)
  assert.doesNotMatch(speciesOutput, /^\{/)

  const occurrenceOutput = captureStdout(() =>
    printResult({
      kind: 'gbif.occurrences',
      api: {
        provider: 'gbif',
        endpoint: 'GET /v1/occurrence/search',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        rateLimitPolicy: 'GBIF search APIs may be rate limited.',
        boundary: 'Read-only GET JSON search only; downloads are not exposed.',
        limitCap: 50,
        offsetCap: 10000,
      },
      storage: { mode: 'online', persisted: false },
      query: {
        scientificName: 'Quercus robur',
        country: 'GB',
        hasCoordinate: true,
        limit: 2,
        offset: 0,
      },
      pagination: { total: 140762, returned: 1, limit: 2, offset: 0, nextOffset: 1 },
      count: 1,
      occurrences: [
        {
          key: 45123456,
          scientificName: 'Quercus robur L.',
          countryCode: 'GB',
          eventDate: '2026-04-01',
          basisOfRecord: 'HUMAN_OBSERVATION',
          datasetTitle: 'Example occurrence dataset',
          license: 'CC_BY_4_0',
          coordinates: { latitude: 51.5, longitude: -0.12 },
          issues: ['GEODETIC_DATUM_ASSUMED_WGS84'],
          mediaCount: 1,
        },
      ],
    }, 'text'),
  )
  assert.match(occurrenceOutput, /GBIF Occurrence Search/)
  assert.match(
    occurrenceOutput,
    /open REST API only · no auth · no Chrome clickstream/,
  )
  assert.match(occurrenceOutput, /HUMAN_OBSERVATION/)
  assert.match(occurrenceOutput, /Example occurrence dataset/)
  assert.match(occurrenceOutput, /media 1/)
  assert.match(occurrenceOutput, /again.*gbif\.occurrences/u)
  assert.match(occurrenceOutput, /replay.*gbif\.occurrences.*--offline/u)
  assert.match(occurrenceOutput, /species.*gbif\.species/u)
  assert.doesNotMatch(occurrenceOutput, /^\{/)
})

test('text output renders GurbaniNow operations without fallback JSON', () => {
  const api = {
    provider: 'gurbaninow',
    endpoint: 'GET /v2/search/{query}',
    authentication: 'none',
    usesBrowserClickstream: false,
    maintenance: 'Official repository is deprecated and unsupported.',
    boundary: 'Read-only documented JSON endpoints only.',
  }
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'gurbaninow.search',
      api,
      storage: { mode: 'online', persisted: true },
      query: { query: 'DDrgj', source: 1, searchType: 1, results: 2, skip: 0 },
      pagination: { total: 1, returned: 1, results: 2, skip: 0 },
      count: 1,
      shabads: [
        {
          id: 'YLSG',
          shabadid: '02L',
          line: {
            gurmukhi: {
              unicode: 'ਧੰਨੁ ਧੰਨੁ ਰਾਮਦਾਸ ਗੁਰੁ ਜਿਨਿ ਸਿਰਿਆ ਤਿਨੈ ਸਵਾਰਿਆ ॥',
            },
            translation: { english: 'Blessed, blessed is Guru Raam Daas.' },
            transliteration: { english: 'dhan dhan raamadaas gur' },
          },
          source: { english: 'Sri Guru Granth Sahib Ji' },
          writer: { english: 'Satta and Balwand' },
          raag: { english: 'Raag Raamkalee' },
          pageno: 968,
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /GurbaniNow Search/)
  assert.match(searchOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(searchOutput, /deprecated and unsupported/)
  assert.match(searchOutput, /Blessed, blessed is Guru Raam Daas/)
  assert.match(searchOutput, /again.*gurbaninow\.search/u)
  assert.match(searchOutput, /replay.*gurbaninow\.search.*--offline/u)
  assert.doesNotMatch(searchOutput, /^\{/)

  const banisOutput = captureStdout(() =>
    printResult({
      kind: 'gurbaninow.banis',
      api: { ...api, endpoint: 'GET /v2/banis' },
      storage: { mode: 'online', persisted: false },
      query: { limit: 2 },
      count: 2,
      total: 2,
      banis: [
        { id: 1, english: 'Jap Ji Sahib', unicode: 'ਜਪੁ ਜੀ ਸਾਹਿਬ' },
        { id: 2, english: 'Jaap Sahib', unicode: 'ਜਾਪੁ ਸਾਹਿਬ' },
      ],
    }, 'text'),
  )
  assert.match(banisOutput, /GurbaniNow Banis/)
  assert.match(banisOutput, /Jap Ji Sahib/)
  assert.match(banisOutput, /read.*gurbaninow\.bani/u)
  assert.doesNotMatch(banisOutput, /^\{/)

  const baniOutput = captureStdout(() =>
    printResult({
      kind: 'gurbaninow.bani',
      api: { ...api, endpoint: 'GET /v2/banis/{id}' },
      storage: { mode: 'offline' },
      query: { id: 1, offset: 0, limit: 2 },
      bani: {
        id: 1,
        english: 'Jap Ji Sahib',
        source: { english: 'Sri Guru Granth Sahib Ji' },
        writer: { english: 'Guru Nanak Dev Ji' },
        raag: { english: 'Jap' },
      },
      pagination: { total: 2, returned: 2, offset: 0, limit: 2 },
      count: 2,
      lines: [
        {
          id: '0NVY',
          lineno: 1,
          gurmukhi: { unicode: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ॥' },
          translation: { english: 'One Universal Creator God.' },
        },
        {
          id: 'RBP6',
          lineno: 2,
          gurmukhi: { unicode: '॥ ਜਪੁ ॥' },
          translation: { english: 'Chant And Meditate:' },
        },
      ],
    }, 'text'),
  )
  assert.match(baniOutput, /GurbaniNow Bani/)
  assert.match(baniOutput, /Jap Ji Sahib/)
  assert.match(baniOutput, /One Universal Creator God/)
  assert.match(baniOutput, /replay.*gurbaninow\.bani.*--offline/u)
  assert.doesNotMatch(baniOutput, /^\{/)
})

test('text output renders iDigBio records and media without fallback JSON', () => {
  const api = {
    provider: 'idigbio',
    endpoint: 'GET /v2/search/records/',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    queryFormat: 'iDigBio Query Format JSON encoded in GET query parameters.',
    boundary: 'Read-only GET JSON search only; downloads are not exposed.',
    limitCap: 50,
    offsetCap: 10000,
  }
  const recordsOutput = captureStdout(() =>
    printResult({
      kind: 'idigbio.records',
      api,
      storage: { mode: 'online', persisted: true },
      query: {
        scientificName: 'Quercus robur',
        family: 'Fagaceae',
        country: 'United States',
        hasImage: true,
        limit: 2,
        offset: 0,
      },
      pagination: { total: 2659, returned: 1, limit: 2, offset: 0, nextOffset: 1 },
      count: 1,
      lastModified: '2026-04-23T17:36:48.691Z',
      records: [
        {
          uuid: 'record-uuid',
          scientificName: 'Quercus robur L.',
          family: 'Fagaceae',
          country: 'United States',
          stateProvince: 'California',
          eventDate: '2024-04-01',
          basisOfRecord: 'PreservedSpecimen',
          institutionCode: 'ALA',
          collectionCode: 'V',
          catalogNumber: '126679',
          hasImage: true,
          coordinates: { latitude: 34.05, longitude: -118.24 },
        },
      ],
    }, 'text'),
  )
  assert.match(recordsOutput, /iDigBio Records Search/)
  assert.match(recordsOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(recordsOutput, /HTTPS JSON REST/)
  assert.match(recordsOutput, /Quercus robur L\./)
  assert.match(recordsOutput, /ALA/)
  assert.match(recordsOutput, /coords.*34\.05, -118\.24/u)
  assert.match(recordsOutput, /again.*idigbio\.records/u)
  assert.match(recordsOutput, /replay.*idigbio\.records.*--offline/u)
  assert.match(recordsOutput, /more.*--offset 1/u)
  assert.match(recordsOutput, /media.*idigbio\.media/u)
  assert.doesNotMatch(recordsOutput, /^\{/)

  const mediaOutput = captureStdout(() =>
    printResult({
      kind: 'idigbio.media',
      api: { ...api, endpoint: 'GET /v2/search/media/' },
      storage: { mode: 'online', persisted: false },
      query: {
        scientificName: 'Quercus robur',
        mediaType: 'images',
        hasSpecimen: true,
        limit: 2,
        offset: 0,
      },
      pagination: { total: 2602, returned: 1, limit: 2, offset: 0, nextOffset: 1 },
      count: 1,
      media: [
        {
          uuid: 'media-uuid',
          title: 'ALA V126679: Quercus robur',
          mediaType: 'images',
          format: 'image/jpeg',
          rights: 'CC BY',
          hasSpecimen: true,
          accessUri: 'https://example.org/media.jpg',
          attributionUrl: 'https://example.org/record',
        },
      ],
    }, 'text'),
  )
  assert.match(mediaOutput, /iDigBio Media Search/)
  assert.match(mediaOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(mediaOutput, /ALA V126679/)
  assert.match(mediaOutput, /image\/jpeg/)
  assert.match(mediaOutput, /https:\/\/example\.org\/media\.jpg/)
  assert.match(mediaOutput, /again.*idigbio\.media/u)
  assert.match(mediaOutput, /replay.*idigbio\.media.*--offline/u)
  assert.match(mediaOutput, /records.*idigbio\.records/u)
  assert.doesNotMatch(mediaOutput, /^\{/)
})

test('text output renders Open Notify astros and ISS now without fallback JSON', () => {
  const astrosOutput = captureStdout(() =>
    printResult({
      kind: 'opennotify.astros',
      api: { provider: 'opennotify', endpoint: 'GET /astros.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTP JSON REST', security: 'http-only', boundary: 'Legacy Open Notify exposes astros and iss-now as no-auth HTTP JSON endpoints; HTTPS and iss-pass are not usable in current probes.' },
      count: 2,
      people: [
        { craft: 'ISS', name: 'Oleg Kononenko' },
        { craft: 'Tiangong', name: 'Li Guangsu' },
      ],
    }, 'text'),
  )
  assert.match(astrosOutput, /Open Notify People in Space/)
  assert.match(astrosOutput, /HTTP-only/)
  assert.match(astrosOutput, /no Chrome clickstream/)
  assert.match(astrosOutput, /Oleg Kononenko/)
  assert.match(astrosOutput, /again public-apis apis run opennotify\.astros --online --persist/)
  assert.match(astrosOutput, /iss public-apis apis run opennotify\.issNow --online --persist/)
  assert.doesNotMatch(astrosOutput, /^\{/)

  const issOutput = captureStdout(() =>
    printResult({
      kind: 'opennotify.issNow',
      api: { provider: 'opennotify', endpoint: 'GET /iss-now.json', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTP JSON REST', security: 'http-only', boundary: 'Legacy Open Notify exposes astros and iss-now as no-auth HTTP JSON endpoints; HTTPS and iss-pass are not usable in current probes.' },
      timestamp: 1778290612,
      observedAt: '2026-05-09T01:36:52.000Z',
      position: { latitude: 6.7487, longitude: 57.1871 },
    }, 'text'),
  )
  assert.match(issOutput, /Open Notify ISS Current Location/)
  assert.match(issOutput, /HTTP-only/)
  assert.match(issOutput, /latitude 6\.7487/)
  assert.match(issOutput, /again public-apis apis run opennotify\.issNow --online --persist/)
  assert.match(issOutput, /people public-apis apis run opennotify\.astros --online --persist/)
  assert.doesNotMatch(issOutput, /^\{/)
})

test('text output renders PoetryDB search and random without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'poetrydb.search',
      api: {
        provider: 'poetrydb',
        endpoint: 'GET /{field}/{term}/poemcount/{count}/{fields}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        cliCountCap: 20,
        cliLineLimitCap: 80,
      },
      query: { field: 'title', term: 'Ozymandias', count: 20, includeLines: true, lineLimit: 2 },
      count: 1,
      poems: [
        {
          title: 'Ozymandias',
          author: 'Percy Bysshe Shelley',
          linecount: 14,
          lines: ['I met a traveller from an antique land', 'Who said: Two vast and trunkless legs of stone'],
          truncatedLines: 12,
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /PoetryDB Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Ozymandias/)
  assert.match(searchOutput, /Percy Bysshe Shelley/)
  assert.match(searchOutput, /CLI count cap 20/)
  assert.match(searchOutput, /more lines.*poetrydb\.search.*--term Ozymandias.*--include-lines true.*--line-limit 80/u)
  assert.match(searchOutput, /next.*poetrydb\.random.*--include-lines true/u)
  assert.doesNotMatch(searchOutput, /^\{/)

  const randomOutput = captureStdout(() =>
    printResult({
      kind: 'poetrydb.random',
      api: {
        provider: 'poetrydb',
        endpoint: 'GET /random/{count}/{fields}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        cliCountCap: 20,
        cliLineLimitCap: 80,
      },
      query: { count: 1, includeLines: false, lineLimit: 12 },
      count: 1,
      poems: [
        {
          title: 'Song',
          author: 'Christina Rossetti',
          linecount: 8,
          lines: [],
          truncatedLines: 0,
        },
      ],
    }, 'text'),
  )
  assert.match(randomOutput, /PoetryDB Random/)
  assert.match(randomOutput, /Christina Rossetti/)
  assert.match(randomOutput, /read lines.*poetrydb\.search.*--term Song.*--include-lines true.*--line-limit 80/u)
  assert.match(randomOutput, /more random.*poetrydb\.random.*--include-lines false/u)
  assert.doesNotMatch(randomOutput, /^\{/)
})

test('text output renders PoetryDB empty search as next-step UX instead of fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'poetrydb.search',
      api: {
        provider: 'poetrydb',
        endpoint: 'GET /{field}/{term}/poemcount/{count}/{fields}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        cliCountCap: 20,
        cliLineLimitCap: 80,
      },
      query: { field: 'title', term: 'zzzz-not-real-poem-title-zzzz', exact: true, count: 2, includeLines: true, lineLimit: 12 },
      count: 0,
      poems: [],
    }, 'text'),
  )

  assert.match(output, /No PoetryDB poems returned for this search/)
  assert.match(output, /try broader.*--exact false/u)
  assert.match(output, /try default.*poetrydb\.random/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Quran Cloud ayah and surah without fallback JSON', () => {
  const ayahOutput = captureStdout(() =>
    printResult({
      kind: 'qurancloud.ayah',
      api: {
        provider: 'qurancloud',
        endpoint: 'GET /v1/ayah/{reference}/{edition}',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultEdition: 'en.asad',
      },
      query: { reference: '2:255', edition: 'en.asad' },
      ayah: {
        number: 262,
        numberInSurah: 255,
        text: 'God - there is no deity save Him, the Ever-Living, the Self-Subsistent Fount of All Being. Neither slumber overtakes Him, nor sleep.',
        juz: 3,
        page: 42,
        surah: { number: 2, englishName: 'Al-Baqara' },
        edition: { identifier: 'en.asad' },
      },
    }, 'text'),
  )
  assert.match(ayahOutput, /Quran Cloud Ayah/)
  assert.match(ayahOutput, /open REST API only · no auth/)
  assert.match(ayahOutput, /Al-Baqara 255/)
  assert.match(ayahOutput, /God - there is no deity/)
  assert.match(ayahOutput, /Neither\nslumber overtakes Him/)
  assert.match(ayahOutput, /context.*qurancloud\.surah.*--offset 254.*--limit 20/u)
  assert.match(ayahOutput, /full surah.*qurancloud\.surah.*--limit 286/u)
  assert.doesNotMatch(ayahOutput, /^\{/)

  const surahOutput = captureStdout(() =>
    printResult({
      kind: 'qurancloud.surah',
      api: {
        provider: 'qurancloud',
        endpoint: 'GET /v1/surah/{surah}/{edition}?offset=&limit=',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultEdition: 'en.asad',
        cliSurahLimitCap: 286,
      },
      query: { surah: 2, edition: 'en.asad', offset: 20, limit: 25 },
      surah: {
        number: 2,
        name: 'سُورَةُ البَقَرَةِ',
        englishName: 'Al-Baqara',
        numberOfAyahs: 286,
        edition: { identifier: 'en.asad' },
      },
      count: 25,
      ayahs: Array.from({ length: 25 }, (_, ayahIndex) => ({
        number: ayahIndex + 21,
        numberInSurah: ayahIndex + 21,
        text: `Ayah ${String(ayahIndex + 21)} text with enough words to wrap over multiple terminal columns without truncating the final words in text mode.`,
      })),
    }, 'text'),
  )
  assert.match(surahOutput, /Quran Cloud Surah/)
  assert.match(surahOutput, /Al-Baqara/)
  assert.match(surahOutput, /showing 21-40 of 286/)
  assert.match(surahOutput, /limit cap 286/)
  assert.match(surahOutput, /without truncating the final\n\s+words/)
  assert.match(surahOutput, /5 fetched ayah\(s\) not shown/)
  assert.match(surahOutput, /previous page.*--offset 0.*--limit 20/u)
  assert.match(surahOutput, /next page.*--offset 40.*--limit 20/u)
  assert.match(surahOutput, /ayah.*qurancloud\.ayah.*--reference 2:21/u)
  assert.doesNotMatch(surahOutput, /^\{/)
})

test('text output renders Quran-api verse and chapter without fallback JSON', () => {
  const verseOutput = captureStdout(() =>
    printResult({
      kind: 'quranapi.verse',
      api: {
        provider: 'quranapi',
        endpoint: 'GET /editions/{edition}/{chapter}/{verse}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultEdition: 'eng-ummmuhammad',
        cliChapterLimitCap: 286,
      },
      query: { edition: 'eng-ummmuhammad', chapter: 4, verse: 157 },
      verse: {
        chapter: 4,
        verse: 157,
        text: 'And they did not kill him, nor did they crucify him; but another was made to resemble him to them.',
      },
    }, 'text'),
  )
  assert.match(verseOutput, /Quran-api Verse/)
  assert.match(verseOutput, /open REST API only · no auth/)
  assert.match(verseOutput, /Chapter 4:157/)
  assert.match(verseOutput, /did not kill him/)
  assert.match(verseOutput, /made to resemble him to them/)
  assert.match(verseOutput, /context.*quranapi\.chapter.*--offset 156.*--limit 20/u)
  assert.match(verseOutput, /full chapter.*quranapi\.chapter.*--limit 286/u)
  assert.doesNotMatch(verseOutput, /^\{/)

  const chapterOutput = captureStdout(() =>
    printResult({
      kind: 'quranapi.chapter',
      api: {
        provider: 'quranapi',
        endpoint: 'GET /editions/{edition}/{chapter}.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultEdition: 'eng-ummmuhammad',
        cliChapterLimitCap: 286,
      },
      query: { edition: 'eng-ummmuhammad', chapter: 2, offset: 20, limit: 25 },
      count: 25,
      totalVerses: 286,
      verses: Array.from({ length: 25 }, (_, verseIndex) => ({
        chapter: 2,
        verse: verseIndex + 21,
        text: `Verse ${String(verseIndex + 21)} text with enough words to wrap over multiple terminal columns without truncating the final words in text mode.`,
      })),
    }, 'text'),
  )
  assert.match(chapterOutput, /Quran-api Chapter/)
  assert.match(chapterOutput, /README claims no rate limits/)
  assert.match(chapterOutput, /showing 21-40 of 286/)
  assert.match(chapterOutput, /without truncating the final\n\s+words/)
  assert.match(chapterOutput, /5 fetched verse\(s\) not shown/)
  assert.match(chapterOutput, /previous page.*--offset 0.*--limit 20/u)
  assert.match(chapterOutput, /next page.*--offset 40.*--limit 20/u)
  assert.match(chapterOutput, /verse.*quranapi\.verse.*--verse 21/u)
  assert.doesNotMatch(chapterOutput, /^\{/)
})

test('text output renders Wolne Lektury books and book without fallback JSON', () => {
  const booksOutput = captureStdout(() =>
    printResult({
      kind: 'wolnelektury.books',
      api: {
        provider: 'wolnelektury',
        endpoint: 'GET /api/books/',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedPagination: 'not documented for /api/books/',
        cliLimitCap: 100,
      },
      query: { query: 'studnia', limit: 20 },
      count: 1,
      books: [
        {
          title: 'Studnia i wahadło',
          author: 'Edgar Allan Poe',
          genre: 'Opowiadanie',
          kind: 'Epika',
          epoch: 'Romantyzm',
          slug: 'studnia-i-wahadlo',
          url: 'https://wolnelektury.pl/katalog/lektura/studnia-i-wahadlo/',
        },
      ],
    }, 'text'),
  )
  assert.match(booksOutput, /Wolne Lektury Books/)
  assert.match(booksOutput, /open REST API only · no auth/)
  assert.match(booksOutput, /Studnia i wahadło/)
  assert.match(booksOutput, /limit cap 100/)
  assert.match(booksOutput, /detail.*wolnelektury\.book.*--slug studnia-i-wahadlo/u)
  assert.match(booksOutput, /read.*wolnelektury\.read.*--slug studnia-i-wahadlo/u)
  assert.doesNotMatch(booksOutput, /^\{/)

  const bookOutput = captureStdout(() =>
    printResult({
      kind: 'wolnelektury.book',
      api: {
        provider: 'wolnelektury',
        endpoint: 'GET /api/books/{slug}/',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { slug: 'studnia-i-wahadlo' },
      book: {
        title: 'Studnia i wahadło',
        authors: ['Edgar Allan Poe'],
        genres: ['Opowiadanie'],
        kinds: ['Epika'],
        url: 'https://wolnelektury.pl/katalog/lektura/studnia-i-wahadlo/',
        downloads: { txt: 'https://wolnelektury.pl/media/book/txt/studnia-i-wahadlo.txt' },
        cover: 'https://wolnelektury.pl/media/book/cover/studnia-i-wahadlo.jpg',
      },
    }, 'text'),
  )
  assert.match(bookOutput, /Wolne Lektury Book/)
  assert.match(bookOutput, /Edgar Allan Poe/)
  assert.match(bookOutput, /downloads/)
  assert.match(bookOutput, /read.*wolnelektury\.read.*--slug studnia-i-wahadlo/u)
  assert.doesNotMatch(bookOutput, /^\{/)

  const readOutput = captureStdout(() =>
    printResult({
      kind: 'wolnelektury.read',
      api: {
        provider: 'wolnelektury',
        endpoint: 'GET official TXT download URL from /api/books/{slug}/',
        authentication: 'none',
        usesBrowserClickstream: false,
        cliReadLimitCap: 200,
      },
      query: { slug: 'studnia-i-wahadlo', offset: 80, limit: 3 },
      page: {
        slug: 'studnia-i-wahadlo',
        sourceUrl: 'https://wolnelektury.pl/media/book/txt/studnia-i-wahadlo.txt',
        offset: 80,
        limit: 3,
        totalLines: 200,
        returnedLines: 3,
        lines: ['first text line', '', 'third text line with enough words to remain readable in the terminal output'],
      },
    }, 'text'),
  )
  assert.match(readOutput, /Wolne Lektury Read/)
  assert.match(readOutput, /lines 81-83 of 200/)
  assert.match(readOutput, /first text line/)
  assert.match(readOutput, /third text line/)
  assert.match(readOutput, /previous page.*--offset 77.*--limit 3/u)
  assert.match(readOutput, /next page.*--offset 83.*--limit 3/u)
  assert.doesNotMatch(readOutput, /^\{/)
})


test('text output renders Cataas cats without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'cataas.cats',
      api: {
        provider: 'cataas',
        endpoint: 'GET /api/cats',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { tags: 'cute', limit: 1 },
      count: 1,
      cats: [
        { id: 'cat-123', tags: ['cute'], mimetype: 'image/jpeg', url: 'https://cataas.com/cat/cat-123' },
      ],
    }, 'text'),
  )

  assert.match(output, /Cataas Cats/)
  assert.match(output, /no auth/)
  assert.match(output, /cat-123/)
  assert.match(output, /next.*cataas\.cats/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Cataas tags as navigable clean choices', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'cataas.tags',
      api: {
        provider: 'cataas',
        endpoint: 'GET /api/tags',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: {},
      total: 3,
      tags: ['', '#christmascat', 'cute'],
    }, 'text'),
  )

  assert.match(output, /Cataas Tags/)
  assert.match(output, /query default parameters/)
  assert.doesNotMatch(output, /\n, #christmascat/u)
  assert.match(output, /next.*cataas\.cats.*--tags '#christmascat'/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Dog CEO images without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'dogceo.images',
      api: {
        provider: 'dog-ceo',
        endpoint: 'GET /breed/:breed/images/random/:count',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { breed: 'hound', count: 2 },
      count: 2,
      imageUrls: [
        'https://images.dog.ceo/breeds/hound-afghan/a.jpg',
        'https://images.dog.ceo/breeds/hound-basset/b.jpg',
      ],
    }, 'text'),
  )

  assert.match(output, /Dog CEO Images/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /breed=hound count=2/)
  assert.match(output, /hound-afghan/)
  assert.match(output, /next.*dogceo\.images/u)
  assert.match(output, /sub-breeds.*dogceo\.subbreeds/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders HTTP Dog status without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'httpdog.status',
      api: {
        provider: 'http-dog',
        endpoint: 'GET /:statusCode.json',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { statusCode: 404 },
      status: {
        code: 404,
        title: 'Not Found',
        url: 'https://http.dog/404',
        images: {
          jpg: 'https://http.dog/404.jpg',
          webp: 'https://http.dog/404.webp',
          avif: 'https://http.dog/404.avif',
          jxl: 'https://http.dog/404.jxl',
        },
      },
    }, 'text'),
  )

  assert.match(output, /HTTP Dog Status/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /status.*404 Not Found/)
  assert.match(output, /https:\/\/http\.dog\/404\.jpg/)
  assert.match(output, /next.*--status-code 500/u)
  assert.match(output, /examples.*200 \| 404 \| 500/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Httpbin get and uuid without fallback JSON', () => {
  const getOutput = captureStdout(() =>
    printResult({
      kind: 'httpbin.get',
      api: {
        provider: 'httpbin',
        endpoint: 'GET /get',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON',
        rateLimit: 'not documented',
      },
      query: { query: 'hello=world' },
      request: {
        args: { hello: 'world' },
        headers: { 'User-Agent': 'public-apis-tui test' },
        origin: '203.0.113.10',
        url: 'https://httpbin.org/get?hello=world',
      },
    }, 'text'),
  )
  assert.match(getOutput, /Httpbin GET Echo/)
  assert.match(getOutput, /open REST API only · no auth/)
  assert.match(getOutput, /query pairs=hello=world/)
  assert.match(getOutput, /hello: world/)
  assert.match(getOutput, /again public-apis apis run httpbin\.get -- --query hello=world/)
  assert.match(getOutput, /uuid public-apis apis run httpbin\.uuid/)
  assert.doesNotMatch(getOutput, /^\{/)

  const emptyGetOutput = captureStdout(() =>
    printResult({
      kind: 'httpbin.get',
      api: {
        provider: 'httpbin',
        endpoint: 'GET /get',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON',
        rateLimit: 'not documented',
      },
      query: {},
      request: {
        args: {},
        headers: { 'User-Agent': 'public-apis-tui test' },
        origin: '203.0.113.10',
        url: 'https://httpbin.org/get',
      },
    }, 'text'),
  )
  assert.match(emptyGetOutput, /No query arguments were echoed by Httpbin/)
  assert.match(emptyGetOutput, /try echo public-apis apis run httpbin\.get -- --query hello=world/)
  assert.doesNotMatch(emptyGetOutput, /^\{/)

  const uuidOutput = captureStdout(() =>
    printResult({
      kind: 'httpbin.uuid',
      api: {
        provider: 'httpbin',
        endpoint: 'GET /uuid',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON',
        rateLimit: 'not documented',
      },
      query: {},
      uuid: '123e4567-e89b-12d3-a456-426614174000',
    }, 'text'),
  )
  assert.match(uuidOutput, /Httpbin UUID/)
  assert.match(uuidOutput, /123e4567-e89b-12d3-a456-426614174000/)
  assert.doesNotMatch(uuidOutput, /^\{/)
})

test('text output renders Icanhazip IP address without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'icanhazip.ip',
      api: {
        provider: 'icanhazip',
        endpoint: 'GET /',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS text/plain',
        rateLimit: 'not documented',
      },
      query: { protocol: 'ipv4' },
      ip: { address: '203.0.113.10', version: 4 },
      response: { endpoint: 'https://ipv4.icanhazip.com', contentType: 'text/plain' },
    }, 'text'),
  )

  assert.match(output, /Icanhazip IP Address/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /HTTPS text\/plain/)
  assert.match(output, /203\.0\.113\.10/)
  assert.match(output, /compare auto public-apis apis run icanhazip\.ip -- --protocol auto/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders IPFast lookup without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'ipfast.lookup',
      api: {
        provider: 'ipfast',
        endpoint: 'GET /json',
        authentication: 'none',
        usesBrowserClickstream: false,
        docs: 'https://ipfast.dev',
        publicApisListedDocsStatus: 'stale: redirects to parked/non-API content during 2026-05-04 live probe',
        transport: 'HTTPS JSON',
      },
      query: {},
      ip: { address: '203.0.113.10' },
      geo: { city: 'Portland', region: 'Oregon', countryName: 'United States', latitude: '45.52345', longitude: '-122.67621' },
      network: { asn: 16276, asOrganization: 'OVH US LLC', colo: 'PDX' },
      locale: { languages: 'English', currency: 'USD', callingCode: '+1' },
      rateLimit: { limit: '120', remaining: '119', reset: '1777826221' },
      response: { endpoint: 'https://ipfast.dev/json', contentType: 'application/json' },
    }, 'text'),
  )

  assert.match(output, /IPFast IP Geo Lookup/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /203\.0\.113\.10/)
  assert.match(output, /OVH US LLC/)
  assert.match(output, /save public-apis apis run ipfast\.lookup --online --persist/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders IPFast storage-aware next commands', () => {
  const result = {
    kind: 'ipfast.lookup',
    api: {
      provider: 'ipfast',
      endpoint: 'GET /json',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://ipfast.dev',
      publicApisListedDocsStatus: 'stale: redirects to parked/non-API content during 2026-05-04 live probe',
      transport: 'HTTPS JSON',
    },
    query: {},
    ip: { address: '203.0.113.10' },
    geo: { city: 'Portland', region: 'Oregon', countryName: 'United States' },
    network: { asn: 16276, asOrganization: 'OVH US LLC' },
    locale: { languages: 'English', currency: 'USD' },
    rateLimit: { limit: '120', remaining: '119', reset: '1777826221' },
    response: { endpoint: 'https://ipfast.dev/json', contentType: 'application/json' },
  }

  const persistedOutput = captureStdout(() =>
    printResult({
      ...result,
      storage: { mode: 'online', persisted: true },
    }, 'text'),
  )
  const offlineOutput = captureStdout(() =>
    printResult({
      ...result,
      storage: { mode: 'offline', persisted: true },
    }, 'text'),
  )

  assert.match(persistedOutput, /offline public-apis apis run ipfast\.lookup --offline/)
  assert.match(offlineOutput, /refresh public-apis apis run ipfast\.lookup --online --persist/)
})

test('text output renders IPify IP address without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'ipify.ip',
      api: {
        provider: 'ipify',
        endpoint: 'GET /?format=json',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON',
        rateLimit: 'official homepage says no limit',
        excludedFormats: 'plain text and JSONP are documented but intentionally not exposed',
      },
      query: { protocol: 'auto' },
      ip: { address: '203.0.113.10', version: 4 },
      response: { endpoint: 'https://api64.ipify.org?format=json', contentType: 'application/json' },
    }, 'text'),
  )

  assert.match(output, /IPify IP Address/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /HTTPS JSON/)
  assert.match(output, /203\.0\.113\.10/)
  assert.match(output, /compare ipv4 public-apis apis run ipify\.ip -- --protocol ipv4/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders IPify protocol comparison without repeating current protocol', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'ipify.ip',
      api: {
        provider: 'ipify',
        endpoint: 'GET /?format=json',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON',
        rateLimit: 'official homepage says no limit',
      },
      query: { protocol: 'ipv4' },
      ip: { address: '203.0.113.10', version: 4 },
      response: { endpoint: 'https://api.ipify.org?format=json', contentType: 'application/json' },
    }, 'text'),
  )

  assert.match(output, /compare auto public-apis apis run ipify\.ip -- --protocol auto/)
  assert.doesNotMatch(output, /compare ipv4 public-apis apis run ipify\.ip -- --protocol ipv4/)
})

test('text output renders Istanbul Open Data search and records without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'istanbulopendata.search',
      api: { provider: 'istanbulopendata', endpoint: 'GET /api/3/action/package_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'IMM Open Data License', limitPolicy: 'package_search rows defaults/caps at 1000' },
      query: { query: 'metro', limit: 1000 },
      count: 1,
      total: 64,
      pagination: { returned: 1, limit: 1000, maxLimit: 1000 },
      datasets: [
        {
          id: '2d6ec648-cdc2-49cd-991e-13a2dd540ef4',
          name: 'metro-hatlari-enerji-tuketimi',
          title: 'Metro Lines Energy Consumption',
          organizationTitle: 'Metro Istanbul',
          resources: [{ id: '32c8813b-544e-4f6e-887d-5bb0835411d1', name: 'Metro Hatları Enerji Tüketimi', format: 'XLSX', datastoreActive: true }],
        },
      ],
    }, 'text'),
  )

  assert.match(searchOutput, /Istanbul Open Data Dataset Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /Metro Lines Energy Consumption/)
  assert.match(searchOutput, /resource Metro Hatları Enerji Tüketimi · XLSX · 32c8813b-544e-4f6e-887d-5bb0835411d1/)
  assert.match(searchOutput, /again public-apis apis run istanbulopendata\.search --online --persist -- --query metro --limit 1000/)
  assert.match(searchOutput, /replay public-apis apis run istanbulopendata\.search --offline -- --query metro --limit 1000/)
  assert.match(searchOutput, /read records public-apis apis run istanbulopendata\.records --online --persist -- --resource-id 32c8813b-544e-4f6e-887d-5bb0835411d1 --limit 5000/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const recordsOutput = captureStdout(() =>
    printResult({
      kind: 'istanbulopendata.records',
      api: { provider: 'istanbulopendata', endpoint: 'GET /api/3/action/datastore_search', authentication: 'none', usesBrowserClickstream: false, transport: 'HTTPS JSON CKAN Action API', licenseNote: 'IMM Open Data License', limitPolicy: 'datastore_search defaults/caps at 5000' },
      query: { resourceId: '32c8813b-544e-4f6e-887d-5bb0835411d1', limit: 5000 },
      resourceId: '32c8813b-544e-4f6e-887d-5bb0835411d1',
      total: 12,
      fields: ['_id', 'Hat', "100 KM'de Enerji Tuketimi (kWh)"],
      count: 1,
      pagination: { returned: 1, limit: 5000, maxLimit: 5000 },
      records: [{ _id: 1, Hat: 'M1', "100 KM'de Enerji Tuketimi (kWh)": '1008.0' }],
    }, 'text'),
  )

  assert.match(recordsOutput, /Istanbul Open Data Records/)
  assert.match(recordsOutput, /open REST API only · no auth/)
  assert.match(recordsOutput, /Hat=M1/)
  assert.match(recordsOutput, /again public-apis apis run istanbulopendata\.records --online --persist -- --resource-id 32c8813b-544e-4f6e-887d-5bb0835411d1 --limit 5000/)
  assert.match(recordsOutput, /replay public-apis apis run istanbulopendata\.records --offline -- --resource-id 32c8813b-544e-4f6e-887d-5bb0835411d1 --limit 5000/)
  assert.match(recordsOutput, /search public-apis apis run istanbulopendata\.search --online --persist -- --query metro --limit 1000/)
  assert.match(recordsOutput, /no Chrome clickstream/)
  assert.doesNotMatch(recordsOutput, /^\{/)
})

test('text output renders Jikan anime without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'jikan.anime',
      api: {
        provider: 'jikan',
        endpoint: 'GET /anime',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: '3 requests/second and 60 requests/minute',
        cacheTtl: '24 hours',
      },
      query: { query: 'naruto', limit: 2, page: 1, sfw: true, type: 'tv', orderBy: 'score', sort: 'desc' },
      pagination: { currentPage: 1, lastVisiblePage: 10, hasNextPage: true, count: 2, total: 20, perPage: 2 },
      count: 2,
      anime: [
        {
          id: 20,
          url: 'https://myanimelist.net/anime/20/Naruto',
          title: 'Naruto',
          type: 'TV',
          episodes: 220,
          status: 'Finished Airing',
          score: 8.02,
          synopsis: 'A ninja story.',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Jikan Anime/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /query=naruto/)
  assert.match(output, /Naruto/)
  assert.match(output, /3 requests\/second/)
  assert.match(output, /next.*--query naruto --sfw true --type tv --order-by score --sort desc --page 2 --limit 2/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders jsDelivr metadata and stats without fallback JSON', () => {
  const metadataOutput = captureStdout(() =>
    printResult({
      kind: 'jsdelivr.metadata',
      api: {
        provider: 'jsdelivr',
        endpoint: 'GET /v1/packages/npm/{package}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'free API with no hard rate limit',
      },
      query: { packageName: 'jquery', versionLimit: 2 },
      package: {
        name: 'jquery',
        latest: '4.0.0',
        tags: { latest: '4.0.0' },
        versionCount: 2,
        versions: [{ version: '4.0.0' }, { version: '3.7.1' }],
      },
      pagination: { shown: 2, total: 2 },
    }, 'text'),
  )
  assert.match(metadataOutput, /jsDelivr npm Package Metadata/)
  assert.match(metadataOutput, /open REST API only · no auth/)
  assert.match(metadataOutput, /jquery latest 4\.0\.0/)
  assert.doesNotMatch(metadataOutput, /^\{/)

  const statsOutput = captureStdout(() =>
    printResult({
      kind: 'jsdelivr.stats',
      api: {
        provider: 'jsdelivr',
        endpoint: 'GET /v1/stats/packages/npm/{package}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'free API with no hard rate limit',
        statsDelay: 'usage statistics are available with a 48 hour delay',
      },
      query: { packageName: 'jquery', period: 'month', dateLimit: 2 },
      stats: {
        hits: { total: 300, rank: 23, previousTotal: 250, dates: [{ date: '2026-05-01', value: 100 }, { date: '2026-05-02', value: 200 }] },
        bandwidth: { total: 3072, rank: 30, previousTotal: 2048, dates: [{ date: '2026-05-02', value: 2048 }] },
      },
    }, 'text'),
  )
  assert.match(statsOutput, /jsDelivr npm Package Stats/)
  assert.match(statsOutput, /300/)
  assert.match(statsOutput, /3\.0 KB/)
  assert.doesNotMatch(statsOutput, /^\{/)
})

test('text output renders npm Registry search and package without fallback JSON', () => {
  const searchPackages = Array.from({ length: 12 }, (_, packageIndex) => ({
    name: `typescript-${packageIndex + 1}`,
    version: '5.9.3',
    description: 'TypeScript is a language for application scale JavaScript development',
    date: '2026-01-01T00:00:00.000Z',
    links: { npm: `https://www.npmjs.com/package/typescript-${packageIndex + 1}` },
    maintainerCount: 1,
    score: { final: 0.99 },
  }))
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'npmregistry.search',
      api: {
        provider: 'npm-registry',
        endpoint: 'GET /-/v1/search',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaxSize: 250,
        rateLimit: 'public npm registry; no API key documented for read endpoints',
      },
      query: { query: 'typescript', size: 250, from: 0 },
      pagination: { from: 0, size: 250, returned: 12, total: 12, hasNextPage: false },
      search: { packages: searchPackages },
    }, 'text'),
  )
  assert.match(searchOutput, /npm Registry Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /typescript-1/)
  assert.match(searchOutput, /typescript-10/)
  assert.doesNotMatch(searchOutput, /typescript-11/)
  assert.match(searchOutput, /2 more package\(s\) in this response/)
  assert.match(searchOutput, /documented max 250/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const packageOutput = captureStdout(() =>
    printResult({
      kind: 'npmregistry.package',
      api: {
        provider: 'npm-registry',
        endpoint: 'GET /{package}',
        authentication: 'none',
        usesBrowserClickstream: false,
        packumentProjection: 'summary-only-no-readme-or-full-versions',
        rateLimit: 'public npm registry; no API key documented for read endpoints',
      },
      query: { packageName: 'typescript', versionLimit: 2 },
      package: {
        name: 'typescript',
        description: 'TypeScript is a language for application scale JavaScript development',
        distTags: { latest: '5.9.3' },
        license: 'Apache-2.0',
        maintainersCount: 2,
        versionCount: 2,
        latestVersion: { version: '5.9.3', dependenciesCount: 0, unpackedSize: 1234 },
        versions: [{ version: '5.9.3', publishedAt: '2026-01-01T00:00:00.000Z' }],
      },
      pagination: { shownVersions: 1, totalVersions: 2 },
    }, 'text'),
  )
  assert.match(packageOutput, /npm Registry Package/)
  assert.match(packageOutput, /summary-only-no-readme-or-full-versions/)
  assert.match(packageOutput, /typescript latest 5\.9\.3/)
  assert.doesNotMatch(packageOutput, /^\{/)
})

test('text output renders Nominatim search and reverse without fallback JSON', () => {
  const place = {
    placeId: 145549253,
    osmType: 'relation',
    osmId: 62422,
    latitude: 52.5173885,
    longitude: 13.3951309,
    category: 'boundary',
    type: 'administrative',
    addressType: 'city',
    name: 'Berlin',
    displayName: 'Berlin, Deutschland',
    importance: 0.8522,
    address: { city: 'Berlin', country: 'Deutschland', countryCode: 'de' },
    boundingBox: ['52.3382448', '52.6755087', '13.0883450', '13.7611609'],
  }
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'nominatim.search',
      api: {
        providerId: 'nominatim',
        endpoint: 'GET /search',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: '≤1 request/second; CLI exposes only bounded manual lookups and encourages --persist/--offline replay.',
        attribution: 'Data © OpenStreetMap contributors, ODbL 1.0',
      },
      storage: { mode: 'online', persisted: false },
      query: { query: 'Berlin', limit: 2, language: 'en' },
      places: [place],
      pagination: { returned: 1, limit: 2, maxLimit: 5 },
    }, 'text'),
  )
  assert.match(searchOutput, /Nominatim Search/)
  assert.match(searchOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(searchOutput, /OpenStreetMap contributors/)
  assert.match(searchOutput, /Berlin, Deutschland/)
  assert.match(searchOutput, /again public-apis apis run nominatim\.search --online --persist -- --query Berlin --limit 2 --language en/)
  assert.match(searchOutput, /replay public-apis apis run nominatim\.search --offline -- --query Berlin --limit 2 --language en/)
  assert.match(searchOutput, /reverse public-apis apis run nominatim\.reverse --online --persist -- --latitude 52\.5173885 --longitude 13\.3951309 --language en/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const reverseOutput = captureStdout(() =>
    printResult({
      kind: 'nominatim.reverse',
      api: {
        providerId: 'nominatim',
        endpoint: 'GET /reverse',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: '≤1 request/second; CLI exposes only bounded manual lookups and encourages --persist/--offline replay.',
        attribution: 'Data © OpenStreetMap contributors, ODbL 1.0',
      },
      storage: { mode: 'online', persisted: false },
      query: { latitude: 52.5170365, longitude: 13.3888599, language: 'en' },
      place,
    }, 'text'),
  )
  assert.match(reverseOutput, /Nominatim Reverse/)
  assert.match(reverseOutput, /Berlin, Deutschland/)
  assert.match(reverseOutput, /coordinates.*52\.5173885, 13\.3951309/u)
  assert.match(reverseOutput, /again public-apis apis run nominatim\.reverse --online --persist -- --latitude 52\.5170365 --longitude 13\.3888599 --language en/)
  assert.match(reverseOutput, /search public-apis apis run nominatim\.search --online --persist -- --query Berlin --limit 3 --language en/)
  assert.doesNotMatch(reverseOutput, /^\{/)

  const emptySearchOutput = captureStdout(() =>
    printResult({
      kind: 'nominatim.search',
      api: { providerId: 'nominatim', endpoint: 'GET /search', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { query: 'zzzz-not-a-place', limit: 2, language: 'en' },
      places: [],
      pagination: { returned: 0, limit: 2, maxLimit: 5 },
    }, 'text'),
  )
  assert.match(emptySearchOutput, /No Nominatim places returned/)
  assert.match(emptySearchOutput, /reset public-apis apis run nominatim\.search --online --persist -- --query Berlin --limit 3 --language en/)
})

test('text output renders Open Topo Data lookup without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'opentopodata.lookup',
      api: {
        providerId: 'opentopodata',
        endpoint: 'GET /v1/{dataset}',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'Public demo server; docs ask users to host their own instance for high-volume use.',
        attribution: 'Elevation datasets retain their source licences; see Open Topo Data dataset documentation.',
      },
      storage: { mode: 'online', persisted: false },
      query: { locations: '39.7471,-104.9963', dataset: 'srtm90m', interpolation: 'bilinear', points: [{ latitude: 39.7471, longitude: -104.9963 }] },
      elevations: [{ dataset: 'srtm90m', elevation: 1603, location: { latitude: 39.7471, longitude: -104.9963 } }],
      pagination: { requested: 1, returned: 1, maxLocations: 5 },
    }, 'text'),
  )
  assert.match(output, /Open Topo Data Lookup/)
  assert.match(output, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(output, /39\.7471, -104\.9963 · 1603 m · srtm90m/)
  assert.match(output, /again public-apis apis run opentopodata\.lookup --online --persist -- --locations 39\.7471,-104\.9963 --dataset srtm90m --interpolation bilinear/)
  assert.match(output, /replay public-apis apis run opentopodata\.lookup --offline -- --locations 39\.7471,-104\.9963 --dataset srtm90m --interpolation bilinear/)
  assert.match(output, /bathymetry public-apis apis run opentopodata\.lookup --online --persist -- --locations 0,0 --dataset gebco2020 --interpolation bilinear/)
  assert.doesNotMatch(output, /^\{/)

  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'opentopodata.lookup',
      api: { providerId: 'opentopodata', endpoint: 'GET /v1/{dataset}', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { locations: '0,0', dataset: 'srtm90m', interpolation: 'bilinear' },
      elevations: [],
      pagination: { requested: 1, returned: 0, maxLocations: 5 },
    }, 'text'),
  )
  assert.match(emptyOutput, /No Open Topo Data elevations returned/)
  assert.match(emptyOutput, /reset public-apis apis run opentopodata\.lookup --online --persist -- --locations 39\.7471,-104\.9963 --dataset srtm90m --interpolation bilinear/)
})

test('text output renders Pinball Map regions and locations without fallback JSON', () => {
  const regionsOutput = captureStdout(() =>
    printResult({
      kind: 'pinballmap.regions',
      api: {
        providerId: 'pinballmap',
        endpoint: 'GET /api/v1/regions.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        attribution: 'Pinball Map asks API users to include attribution when using the data.',
      },
      storage: { mode: 'online', persisted: false },
      query: { query: 'oregon', limit: 1 },
      regions: [{ id: 1, name: 'portland', fullName: 'Portland, Oregon', latitude: 45.52341, longitude: -122.67561, state: 'Oregon', effectiveRadius: 40 }],
      pagination: { returned: 1, limit: 1, maxLimit: 50 },
    }, 'text'),
  )
  assert.match(regionsOutput, /Pinball Map Regions/)
  assert.match(regionsOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(regionsOutput, /portland · Portland, Oregon/)
  assert.match(regionsOutput, /locations public-apis apis run pinballmap\.locations --online --persist -- --region portland --query ground --limit 10/)
  assert.doesNotMatch(regionsOutput, /^\{/)

  const locationsOutput = captureStdout(() =>
    printResult({
      kind: 'pinballmap.locations',
      api: {
        providerId: 'pinballmap',
        endpoint: 'GET /api/v1/locations.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        writeBoundary: 'CLI exposes read-only GET endpoints only; suggestion/edit POST/PUT/DELETE endpoints are not exposed.',
        attribution: 'Pinball Map asks API users to include attribution when using the data.',
      },
      storage: { mode: 'online', persisted: false },
      query: { region: 'portland', query: 'ground', limit: 2 },
      locations: [{ id: 874, name: 'Ground Kontrol Classic Arcade', street: '115 NW 5th Ave', city: 'Portland', state: 'OR', zip: '97209', latitude: 45.5240826, longitude: -122.675826, country: 'US', machineCount: 45, isSternArmy: true, icActive: true }],
      pagination: { returned: 1, limit: 2, maxLimit: 50, noDetails: true },
    }, 'text'),
  )
  assert.match(locationsOutput, /Pinball Map Locations/)
  assert.match(locationsOutput, /read-only GET endpoints only/)
  assert.match(locationsOutput, /Ground Kontrol Classic Arcade/)
  assert.match(locationsOutput, /again public-apis apis run pinballmap\.locations --online --persist -- --region portland --query ground --limit 2/)
  assert.match(locationsOutput, /replay public-apis apis run pinballmap\.locations --offline -- --region portland --query ground --limit 2/)
  assert.doesNotMatch(locationsOutput, /^\{/)
})

test('text output renders PostalCodes.info search without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'postalcodes.search',
      api: {
        providerId: 'postalcodes',
        endpoint: 'GET /search',
        authentication: 'none',
        usesBrowserClickstream: false,
        licence: 'Open Database License 1.0',
        reliability: 'Reference/search data only; not an official delivery-grade postal authority API.',
        downloadBoundary: 'CLI exposes lightweight /search only; tokenized same-origin download.php exports are not exposed.',
      },
      storage: { mode: 'online', persisted: false },
      query: { query: '90210', country: 'US', limit: 3 },
      suggestions: [{ type: 'Postal Code', text: 'Beverly Hills (90210)', sub: 'United States', url: '/postal-codes/united-states/code/90210', absoluteUrl: 'https://postalcodes.info/postal-codes/united-states/code/90210' }],
      pagination: { returned: 1, limit: 3, maxLimit: 25 },
    }, 'text'),
  )
  assert.match(output, /PostalCodes\.info Search/)
  assert.match(output, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(output, /not an official delivery-grade postal authority API/)
  assert.match(output, /tokenized same-origin download\.php exports are not exposed/)
  assert.match(output, /Beverly Hills \(90210\)/)
  assert.match(output, /again public-apis apis run postalcodes\.search --online --persist -- --query 90210 --country US --limit 3/)
  assert.match(output, /replay public-apis apis run postalcodes\.search --offline -- --query 90210 --country US --limit 3/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders PostcodeData.nl HTTP-only lookup without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'postcodedata-nl.lookup',
      api: {
        providerId: 'postcodedata-nl',
        endpoint: 'GET /v1/postcode/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTP JSON REST',
        httpOnly: true,
        privacy: 'Dutch address lookup sends postcode and house number over HTTP cleartext; use only with non-sensitive sample/manual lookups.',
        reliability: 'Legacy reference API; not an official delivery-grade postal authority workflow.',
      },
      storage: { mode: 'online', persisted: false },
      query: { postcode: '1211EP', streetNumber: 60, ref: 'public-apis-tui.local' },
      addresses: [{
        street: 'Stationsstraat',
        city: 'Hilversum',
        municipality: 'Hilversum',
        province: 'Noord-Holland',
        postcode: '1211 EP',
        latitude: 52.2269378842251,
        longitude: 5.1780191356884,
      }],
      count: { returned: 1 },
    }, 'text'),
  )
  assert.match(output, /PostcodeData\.nl Lookup/)
  assert.match(output, /open HTTP REST API only · no auth · HTTP-only · no Chrome clickstream/)
  assert.match(output, /postcode and house number over HTTP cleartext/)
  assert.match(output, /Stationsstraat/)
  assert.match(output, /Hilversum/)
  assert.match(output, /again public-apis apis run postcodedata-nl\.lookup --online --persist -- --postcode 1211EP --street-number 60 --ref public-apis-tui\.local/)
  assert.match(output, /replay public-apis apis run postcodedata-nl\.lookup --offline -- --postcode 1211EP --street-number 60 --ref public-apis-tui\.local/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Postcodes.io lookup and collection outputs without fallback JSON', () => {
  const postcode = {
    postcode: 'SW1A 2AA',
    country: 'England',
    region: 'London',
    adminDistrict: 'Westminster',
    adminWard: "St James's",
    parliamentaryConstituency: 'Cities of London and Westminster',
    longitude: -0.12767,
    latitude: 51.503541,
    outcode: 'SW1A',
  }
  const lookupOutput = captureStdout(() =>
    printResult({
      kind: 'postcodes-io.lookup',
      api: { providerId: 'postcodes-io', endpoint: 'GET /postcodes/{postcode}', authentication: 'none', usesBrowserClickstream: false, reliability: 'Reference/geocoding data for UK postcodes; validate delivery-critical decisions against official postal or address sources.' },
      storage: { mode: 'online', persisted: false },
      query: { postcode: 'SW1A 2AA' },
      postcode,
      count: { returned: 1 },
    }, 'text'),
  )
  assert.match(lookupOutput, /Postcodes\.io Lookup/)
  assert.match(lookupOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(lookupOutput, /SW1A 2AA/)
  assert.match(lookupOutput, /Westminster, London, England/)
  assert.match(lookupOutput, /again public-apis apis run postcodes-io\.lookup --online --persist -- --postcode 'SW1A 2AA'/)
  assert.match(lookupOutput, /search public-apis apis run postcodes-io\.search --online --persist -- --query SW1A --limit 5/)
  assert.doesNotMatch(lookupOutput, /^\{/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'postcodes-io.search',
      api: { providerId: 'postcodes-io', endpoint: 'GET /postcodes?q={query}', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { query: 'SW1A', limit: 2 },
      postcodes: [postcode],
      pagination: { returned: 1, limit: 2, maxLimit: 20 },
    }, 'text'),
  )
  assert.match(searchOutput, /Postcodes\.io Search/)
  assert.match(searchOutput, /again public-apis apis run postcodes-io\.search --online --persist -- --query SW1A --limit 2/)
  assert.match(searchOutput, /lookup public-apis apis run postcodes-io\.lookup --online --persist -- --postcode 'SW1A 2AA'/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const nearestOutput = captureStdout(() =>
    printResult({
      kind: 'postcodes-io.nearest',
      api: { providerId: 'postcodes-io', endpoint: 'GET /postcodes?lat={latitude}&lon={longitude}', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { latitude: 51.5074, longitude: -0.1278, limit: 1, radius: 1000 },
      postcodes: [postcode],
      pagination: { returned: 1, limit: 1, maxLimit: 20 },
    }, 'text'),
  )
  assert.match(nearestOutput, /Postcodes\.io Nearest/)
  assert.match(nearestOutput, /--latitude 51\.5074 --longitude -0\.1278 --limit 1 --radius 1000/)
  assert.doesNotMatch(nearestOutput, /^\{/)
})

test('text output renders Queimadas INPE latest CSV without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'queimadas-inpe.latest10min',
      api: {
        providerId: 'queimadas-inpe',
        endpoint: 'GET focos/csv/10min/{latest-file}.csv',
        authentication: 'none',
        usesBrowserClickstream: false,
        publicSafety: 'Probable wildfire/heat-focus observations are environmental monitoring data, not emergency dispatch or public-safety command data.',
        reliability: 'Near-real-time satellite detections can be delayed, duplicated, false-positive, or incomplete; verify with official emergency/environmental authorities before operational decisions.',
      },
      storage: { mode: 'online', persisted: false },
      query: { limit: 2 },
      file: { name: 'focos_10min_20260508_1410.csv', url: 'https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/focos_10min_20260508_1410.csv' },
      focuses: [
        { latitude: -32.67771, longitude: -61.49353, satellite: 'TERRA_M-T', observedAt: '2026-05-08 12:44:00' },
        { latitude: -30.61297, longitude: -60.91613, satellite: 'TERRA_M-T', observedAt: '2026-05-08 12:44:00' },
      ],
      count: { returned: 2, totalRows: 2, maxLimit: 50 },
    }, 'text'),
  )
  assert.match(output, /Queimadas INPE Latest 10min/)
  assert.match(output, /open data CSV only · no auth · no Chrome clickstream/)
  assert.match(output, /not emergency dispatch/)
  assert.match(output, /TERRA_M-T/)
  assert.match(output, /again public-apis apis run queimadas-inpe\.latest10min --online --persist -- --limit 2/)
  assert.match(output, /Do not use this CLI output for emergency dispatch/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders REST Countries outputs without fallback JSON', () => {
  const country = {
    commonName: 'Germany',
    officialName: 'Federal Republic of Germany',
    cca2: 'DE',
    cca3: 'DEU',
    capital: ['Berlin'],
    region: 'Europe',
    subregion: 'Western Europe',
    population: 83491249,
    area: 357114,
    languages: ['German'],
    currencies: ['EUR euro'],
  }
  const alphaOutput = captureStdout(() =>
    printResult({
      kind: 'restcountries.alpha',
      api: { providerId: 'restcountries', endpoint: 'GET /v3.1/alpha/{code}', authentication: 'none', usesBrowserClickstream: false, reliability: 'Reference country metadata; validate legal, travel, sanctions, or compliance decisions against official government sources.' },
      storage: { mode: 'online', persisted: false },
      query: { code: 'DE' },
      country,
      count: { returned: 1 },
    }, 'text'),
  )
  assert.match(alphaOutput, /REST Countries Alpha/)
  assert.match(alphaOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(alphaOutput, /Germany · DE\/DEU · Europe/)
  assert.match(alphaOutput, /again public-apis apis run restcountries\.alpha --online --persist -- --code DE/)
  assert.match(alphaOutput, /region public-apis apis run restcountries\.region --online --persist -- --region Europe --limit 10/)
  assert.doesNotMatch(alphaOutput, /^\{/)

  const nameOutput = captureStdout(() =>
    printResult({
      kind: 'restcountries.name',
      api: { providerId: 'restcountries', endpoint: 'GET /v3.1/name/{name}', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { name: 'peru', limit: 1 },
      countries: [country],
      pagination: { returned: 1, limit: 1, maxLimit: 60 },
    }, 'text'),
  )
  assert.match(nameOutput, /REST Countries Name/)
  assert.match(nameOutput, /again public-apis apis run restcountries\.name --online --persist -- --name peru --limit 1/)
  assert.match(nameOutput, /alpha public-apis apis run restcountries\.alpha --online --persist -- --code DE/)
  assert.doesNotMatch(nameOutput, /^\{/)

  const regionOutput = captureStdout(() =>
    printResult({
      kind: 'restcountries.region',
      api: { providerId: 'restcountries', endpoint: 'GET /v3.1/region/{region}', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { region: 'europe', limit: 1 },
      countries: [country],
      pagination: { returned: 1, limit: 1, maxLimit: 60 },
    }, 'text'),
  )
  assert.match(regionOutput, /REST Countries Region/)
  assert.match(regionOutput, /again public-apis apis run restcountries\.region --online --persist -- --region europe --limit 1/)
  assert.doesNotMatch(regionOutput, /^\{/)
})

test('text output renders SLF lookup without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'slf.lookup',
      api: {
        providerId: 'slf',
        endpoint: 'GET /data.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        reliability: 'Static Stadt-Land-Fluss word-list/game helper data; validate language-sensitive or authoritative uses elsewhere.',
      },
      storage: { mode: 'online', persisted: false },
      query: { letter: 'a', category: 'stadt', limit: 3 },
      values: ['Aalen', 'Aachen', 'Amberg'],
      availableCategories: ['stadt', 'land', 'fluss', 'name', 'beruf', 'tier', 'marke', 'pflanze'],
      count: { returned: 3, maxLimit: 50 },
    }, 'text'),
  )
  assert.match(output, /SLF Lookup/)
  assert.match(output, /static JSON only · no auth · no Chrome clickstream/)
  assert.match(output, /Aalen/)
  assert.match(output, /stadt, land, fluss/)
  assert.match(output, /again public-apis apis run slf\.lookup --online --persist -- --letter a --category stadt --limit 3/)
  assert.match(output, /country public-apis apis run slf\.lookup --online --persist -- --letter a --category land --limit 3/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders ViaCep lookup and search without fallback JSON', () => {
  const address = {
    cep: '01001-000',
    street: 'Praça da Sé',
    complement: 'lado ímpar',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
    stateName: 'São Paulo',
    region: 'Sudeste',
    ibge: '3550308',
    ddd: '11',
    siafi: '7107',
  }
  const lookupOutput = captureStdout(() =>
    printResult({
      kind: 'viacep.lookup',
      api: {
        providerId: 'viacep',
        endpoint: 'GET /ws/{cep}/json/',
        authentication: 'none',
        usesBrowserClickstream: false,
        reliability: 'Reference/geocoding data for Brazilian CEP addresses; validate delivery-critical or legal decisions against Correios or other official sources.',
      },
      storage: { mode: 'online', persisted: false },
      query: { cep: '01001000' },
      address,
      count: { returned: 1 },
    }, 'text'),
  )
  assert.match(lookupOutput, /ViaCep Lookup/)
  assert.match(lookupOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(lookupOutput, /Praça da Sé/)
  assert.match(lookupOutput, /IBGE 3550308 · DDD 11 · SIAFI 7107/)
  assert.match(lookupOutput, /again public-apis apis run viacep\.lookup --online --persist -- --cep 01001000/)
  assert.match(lookupOutput, /search public-apis apis run viacep\.search --online --persist -- --state SP --city 'São Paulo' --street 'Praça da Sé' --limit 10/)
  assert.doesNotMatch(lookupOutput, /^\{/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'viacep.search',
      api: { providerId: 'viacep', endpoint: 'GET /ws/{uf}/{city}/{street}/json/', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { state: 'SP', city: 'São Paulo', street: 'Paulista', limit: 1 },
      addresses: [address],
      pagination: { returned: 1, limit: 1, maxLimit: 50 },
    }, 'text'),
  )
  assert.match(searchOutput, /ViaCep Search/)
  assert.match(searchOutput, /again public-apis apis run viacep\.search --online --persist -- --state SP --city 'São Paulo' --street Paulista --limit 1/)
  assert.match(searchOutput, /lookup public-apis apis run viacep\.lookup --online --persist -- --cep 01001-000/)
  assert.doesNotMatch(searchOutput, /^\{/)
})

test('text output renders Zippopotam.us lookup and search without fallback JSON', () => {
  const lookupOutput = captureStdout(() =>
    printResult({
      kind: 'zippopotam-us.lookup',
      api: {
        providerId: 'zippopotam-us',
        endpoint: 'GET /{country}/{postalCode}',
        authentication: 'none',
        usesBrowserClickstream: false,
        reliability: 'Reference postal/place data adapted from GeoNames; validate delivery-critical or legal decisions against official postal sources.',
      },
      storage: { mode: 'online', persisted: false },
      query: { country: 'US', postalCode: '90210', limit: 1 },
      result: { country: 'United States', countryAbbreviation: 'US', postalCode: '90210' },
      places: [{ placeName: 'Beverly Hills', longitude: '-118.4065', latitude: '34.0901', state: 'California', stateAbbreviation: 'CA' }],
      pagination: { returned: 1, limit: 1, maxLimit: 50 },
    }, 'text'),
  )
  assert.match(lookupOutput, /Zippopotam\.us Lookup/)
  assert.match(lookupOutput, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(lookupOutput, /Beverly Hills · 90210/)
  assert.match(lookupOutput, /coordinates 34\.0901, -118\.4065/)
  assert.match(lookupOutput, /again public-apis apis run zippopotam-us\.lookup --online --persist -- --country US --postal-code 90210 --limit 1/)
  assert.match(lookupOutput, /search public-apis apis run zippopotam-us\.search --online --persist -- --country US --state CA --city 'Beverly Hills' --limit 10/)
  assert.doesNotMatch(lookupOutput, /^\{/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'zippopotam-us.search',
      api: { providerId: 'zippopotam-us', endpoint: 'GET /{country}/{state}/{city}', authentication: 'none', usesBrowserClickstream: false },
      storage: { mode: 'online', persisted: false },
      query: { country: 'US', state: 'MA', city: 'Belmont', limit: 1 },
      result: { country: 'United States', countryAbbreviation: 'US', state: 'Massachusetts', stateAbbreviation: 'MA', placeName: 'Belmont' },
      places: [{ placeName: 'Belmont', longitude: '-71.4594', latitude: '42.4464', postalCode: '02178' }],
      pagination: { returned: 1, limit: 1, maxLimit: 50 },
    }, 'text'),
  )
  assert.match(searchOutput, /Zippopotam\.us Search/)
  assert.match(searchOutput, /Belmont · 02178/)
  assert.match(searchOutput, /again public-apis apis run zippopotam-us\.search --online --persist -- --country US --state MA --city Belmont --limit 1/)
  assert.match(searchOutput, /lookup public-apis apis run zippopotam-us\.lookup --online --persist -- --country US --postal-code 02178 --limit 10/)
  assert.doesNotMatch(searchOutput, /^\{/)
})

test('text output renders Ziptastic lookup without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'ziptastic.lookup',
      api: {
        providerId: 'ziptastic',
        endpoint: 'GET /{zip}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON body over text/html content-type',
        contentTypeCaveat: 'The live endpoint returns JSON text while advertising text/html; the client parses only JSON bodies and never treats HTML as data.',
        reliability: 'Reference ZIP/postal lookup data; validate delivery-critical or legal decisions against official postal sources.',
      },
      storage: { mode: 'online', persisted: false },
      query: { zip: '90210' },
      address: { country: 'US', state: 'CA', city: 'BEVERLY HILLS' },
      count: { returned: 1 },
    }, 'text'),
  )
  assert.match(output, /Ziptastic Lookup/)
  assert.match(output, /JSON body only · no auth · no Chrome clickstream/)
  assert.match(output, /text\/html content-type/)
  assert.match(output, /BEVERLY HILLS · CA · US/)
  assert.match(output, /again public-apis apis run ziptastic\.lookup --online --persist -- --zip 90210/)
  assert.match(output, /compare public-apis apis run zippopotam-us\.lookup --online --persist -- --country US --postal-code 90210 --limit 10/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders MeowFacts without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'meowfacts.facts',
      api: {
        provider: 'meowfacts',
        endpoint: 'GET /',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { count: 2, lang: 'eng-us' },
      count: 2,
      facts: [
        'Cats walk on their toes.',
        'A cat can sprint at about thirty-one miles per hour.',
      ],
    }, 'text'),
  )

  assert.match(output, /MeowFacts/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /count=2 lang=eng-us/)
  assert.match(output, /Cats walk on their toes/)
  assert.match(output, /next.*--count 3 --lang eng-us/u)
  assert.match(output, /languages.*eng-us \| esp-mx \| ukr-ua/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders RandomDog woof without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'randomdog.woof',
      api: {
        provider: 'random-dog',
        endpoint: 'GET /woof.json',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: {},
      file: {
        url: 'https://random.dog/sample.jpg',
        fileSizeBytes: 12345,
        extension: 'jpg',
        mediaType: 'image',
      },
    }, 'text'),
  )

  assert.match(output, /RandomDog Woof/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /sample\.jpg/)
  assert.match(output, /next.*randomdog\.files.*--media-type image/u)
  assert.match(output, /again.*randomdog\.woof/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders NekosBest random assets without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'nekosbest.random',
      api: {
        provider: 'nekosbest',
        endpoint: 'GET /:category',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: '200 requests/minute for category endpoints; 7 requests/5 seconds for /search',
      },
      query: { category: 'neko', amount: 2 },
      count: 1,
      assets: [
        {
          url: 'https://nekos.best/api/v2/neko/example.png',
          dimensions: { width: 420, height: 690 },
          category: 'neko',
          contentType: 'image',
          artistName: 'John Doe',
          sourceUrl: 'https://example.com/art/1',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /NekosBest Random/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /category=neko amount=2/)
  assert.match(output, /example\.png/)
  assert.match(output, /again.*nekosbest\.random.*--category neko --amount 2/u)
  assert.match(output, /search.*nekosbest\.search.*--query neko --type image --amount 2/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders NekosBest search assets without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'nekosbest.search',
      api: {
        provider: 'nekosbest',
        endpoint: 'GET /search',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { query: 'saber', type: 'image', typeCode: 1, amount: 2 },
      count: 1,
      assets: [
        {
          url: 'https://nekos.best/api/v2/neko/search.png',
          dimensions: { width: 1200, height: 1800 },
          category: 'neko',
          contentType: 'image',
          artistName: 'Catsberus',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /NekosBest Search/)
  assert.match(output, /query=saber type=image typeCode=1 amount=2/)
  assert.match(output, /search\.png/)
  assert.match(output, /again.*nekosbest\.search.*--query saber --type image --amount 2/u)
  assert.match(output, /random.*nekosbest\.random.*--category neko --amount 2/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders NekosBest empty state remediation', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'nekosbest.search',
      api: {
        provider: 'nekosbest',
        endpoint: 'GET /search',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { query: 'unlikely', type: 'image', amount: 2 },
      count: 0,
      assets: [],
    }, 'text'),
  )

  assert.match(output, /No NekosBest assets returned/)
  assert.match(output, /try.*nekosbest\.random.*--category neko --amount 2/u)
  assert.match(output, /try.*nekosbest\.search.*--query unlikely --type image --amount 2/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders RandomDog files without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'randomdog.files',
      api: {
        provider: 'random-dog',
        endpoint: 'GET /doggos',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { limit: 2, mediaType: 'image' },
      totalKnownFiles: 100,
      count: 2,
      files: [
        { name: 'a.jpg', url: 'https://random.dog/a.jpg', extension: 'jpg', mediaType: 'image' },
        { name: 'b.png', url: 'https://random.dog/b.png', extension: 'png', mediaType: 'image' },
      ],
    }, 'text'),
  )

  assert.match(output, /RandomDog Files/)
  assert.match(output, /limit=2 mediaType=image/)
  assert.match(output, /a\.jpg/)
  assert.match(output, /more.*--media-type image --limit 20/u)
  assert.match(output, /switch.*--media-type video --limit 2/u)
  assert.match(output, /random.*randomdog\.woof/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders RandomFox floof without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'randomfox.floof',
      api: {
        provider: 'random-fox',
        endpoint: 'GET /floof/',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: {},
      fox: {
        image: 'https://randomfox.ca/images/34.jpg',
        link: 'https://randomfox.ca/?i=34',
      },
    }, 'text'),
  )

  assert.match(output, /RandomFox Floof/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /images\/34\.jpg/)
  assert.match(output, /again.*randomfox\.floof/u)
  assert.match(output, /save.*--online --persist/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders RainViewer maps without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'rainviewer.maps',
      api: {
        provider: 'rainviewer',
        endpoint: 'GET /public/weather-maps.json',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      storage: { mode: 'online', persisted: true },
      query: { limit: 2, size: 512, zoom: 5, latitude: 37.7749, longitude: -122.4194, color: 2, smooth: true, snow: false },
      maps: {
        version: '2.0',
        generated: 1777920330,
        host: 'https://tilecache.rainviewer.com',
        radarPast: [
          { time: 1777912800, path: '/v2/radar/a13ac739c26d', tileUrl: 'https://tilecache.rainviewer.com/v2/radar/a13ac739c26d/512/5/37.7749/-122.4194/2/1_0.png' },
        ],
        radarNowcast: [],
        satelliteInfrared: [],
      },
      pagination: { returnedRadarPast: 1, returnedRadarNowcast: 0, returnedSatelliteInfrared: 0, limit: 2, maxLimit: 13 },
    }, 'text'),
  )

  assert.match(output, /RainViewer Weather Maps/)
  assert.match(output, /open REST API only · no auth · no Chrome clickstream/)
  assert.match(output, /radar 1 · nowcast 0 · satellite 0 · limit 2 \/ max 13/)
  assert.match(output, /sample tile/)
  assert.match(output, /sample public-apis apis run rainviewer\.maps -- --limit 2 --size 512 --zoom 5 --latitude 37\.7749 --longitude -122\.4194 --color 2 --smooth true --snow false/)
  assert.match(output, /again public-apis apis run rainviewer\.maps --online --persist -- --limit 2 --size 512 --zoom 5 --latitude 37\.7749 --longitude -122\.4194 --color 2 --smooth true --snow false/)
  assert.match(output, /replay public-apis apis run rainviewer\.maps --offline -- --limit 2 --size 512 --zoom 5 --latitude 37\.7749 --longitude -122\.4194 --color 2 --smooth true --snow false/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Studio Ghibli films without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'studioghibli.films',
      api: {
        provider: 'studio-ghibli',
        endpoint: 'GET /films',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumLimit: 250,
      },
      query: { limit: 250, title: 'totoro' },
      count: 1,
      films: [
        {
          id: '58611129-2dbc-4a81-a72f-77ddfc1b1b49',
          title: 'My Neighbor Totoro',
          originalTitle: 'となりのトトロ',
          originalTitleRomanised: 'Tonari no Totoro',
          description: 'Two sisters move to the country and discover Totoros.',
          director: 'Hayao Miyazaki',
          producer: 'Hayao Miyazaki',
          releaseDate: '1988',
          runningTimeMinutes: 86,
          rtScore: 93,
          peopleCount: 1,
          speciesCount: 1,
          locationsCount: 0,
          vehiclesCount: 0,
          url: 'https://ghibliapi.vercel.app/films/58611129-2dbc-4a81-a72f-77ddfc1b1b49',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Studio Ghibli Films/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /title=totoro/)
  assert.match(output, /My Neighbor Totoro/)
  assert.match(output, /again.*studioghibli\.films.*--title totoro --limit 250/u)
  assert.match(output, /director.*studioghibli\.films.*--director 'Hayao Miyazaki' --limit 250/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Studio Ghibli empty state remediation', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'studioghibli.films',
      api: {
        provider: 'studio-ghibli',
        endpoint: 'GET /films',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumLimit: 250,
      },
      query: { limit: 250, title: 'no-match' },
      count: 0,
      films: [],
    }, 'text'),
  )

  assert.match(output, /No Studio Ghibli films matched/)
  assert.match(output, /try.*studioghibli\.films.*--limit 250/u)
  assert.match(output, /try.*studioghibli\.films.*--title totoro --limit 250/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Art Institute of Chicago artworks without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'artic.artworks',
      api: {
        provider: 'art-institute-chicago',
        endpoint: 'GET /artworks/search',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumLimit: 'No finite maximum found; CLI caps interactive requests at 100',
      },
      query: { query: 'cats', limit: 3, page: 1, fields: 'id,title,artist_display,date_display,image_id,is_public_domain' },
      pagination: { total: 131926, limit: 3, offset: 0, totalPages: 43976, currentPage: 1 },
      count: 1,
      license: { text: 'CC0 except description.', links: ['https://creativecommons.org/publicdomain/zero/1.0/'], version: '1.14' },
      artworks: [
        {
          id: 656,
          title: 'Lion (One of a Pair, South Pedestal)',
          artistDisplay: 'Edward Kemeys (American, 1843–1907)',
          dateDisplay: '1893',
          imageId: '6b1edb9c-0f3f-0ee3-47c7-ca25c39ee360',
          imageUrl: 'https://www.artic.edu/iiif/2/6b1edb9c-0f3f-0ee3-47c7-ca25c39ee360/full/843,/0/default.jpg',
          artworkUrl: 'https://www.artic.edu/artworks/656',
          apiUrl: 'https://api.artic.edu/api/v1/artworks/656',
          isPublicDomain: false,
          score: 91.43464,
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Art Institute of Chicago Artworks/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /query=cats/)
  assert.match(output, /Lion \(One of a Pair, South Pedestal\)/)
  assert.match(output, /www\.artic\.edu\/artworks\/656/)
  assert.match(output, /image: https:\/\/www\.artic\.edu\/iiif\/2\//)
  assert.match(output, /again.*artic\.artworks.*--query cats --limit 3 --page 1/u)
  assert.match(output, /next.*artic\.artworks.*--query cats --limit 3 --page 2/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Art Institute of Chicago empty state remediation', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'artic.artworks',
      api: {
        provider: 'art-institute-chicago',
        endpoint: 'GET /artworks/search',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumLimit: 'No finite maximum found; CLI caps interactive requests at 100',
      },
      query: { query: 'no-match', limit: 3, page: 1, fields: 'id,title,artist_display,date_display,image_id,is_public_domain' },
      pagination: { total: 0, limit: 3, offset: 0, totalPages: 0, currentPage: 1 },
      count: 0,
      license: { text: 'CC0 except description.', links: ['https://creativecommons.org/publicdomain/zero/1.0/'], version: '1.14' },
      artworks: [],
    }, 'text'),
  )

  assert.match(output, /No Art Institute of Chicago artworks returned/)
  assert.match(output, /try.*artic\.artworks.*--query cats --limit 3 --page 1/u)
  assert.match(output, /browse.*artic\.artworks.*--limit 3 --page 1/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Colormind palette and models without fallback JSON', () => {
  const paletteOutput = captureStdout(() =>
    printResult({
      kind: 'colormind.palette',
      api: {
        provider: 'colormind',
        endpoint: 'POST /api/',
        authentication: 'none',
        transport: 'http-only',
        usesBrowserClickstream: false,
        usageTerms: 'Free for personal and non-commercial use; commercial use should contact the maintainer.',
      },
      query: { model: 'default', input: [] },
      count: 5,
      colors: [
        { rgb: [217, 110, 93], hex: '#D96E5D' },
        { rgb: [233, 199, 153], hex: '#E9C799' },
      ],
    }, 'text'),
  )

  assert.match(paletteOutput, /Colormind Palette/)
  assert.match(paletteOutput, /HTTP-only/)
  assert.match(paletteOutput, /no auth/)
  assert.match(paletteOutput, /query.*model=default/)
  assert.match(paletteOutput, /#D96E5D/)
  assert.match(paletteOutput, /again.*colormind\.palette.*--model default/u)
  assert.match(paletteOutput, /models.*colormind\.models.*--limit 50/u)
  assert.doesNotMatch(paletteOutput, /^\{/)

  const lockedPaletteOutput = captureStdout(() =>
    printResult({
      kind: 'colormind.palette',
      api: {
        provider: 'colormind',
        endpoint: 'POST /api/',
        authentication: 'none',
        transport: 'http-only',
        usesBrowserClickstream: false,
      },
      query: { model: 'default', input: [[44, 43, 44], [90, 83, 82], 'N', 'N', 'N'] },
      count: 0,
      colors: [],
    }, 'text'),
  )

  assert.match(lockedPaletteOutput, /input=#2C2B2C,#5A5352,N,N,N/)
  assert.doesNotMatch(lockedPaletteOutput, /44,43,44,90,83,82,N,N,N/)
  assert.match(lockedPaletteOutput, /try.*colormind\.palette.*--model default/u)

  const modelsOutput = captureStdout(() =>
    printResult({
      kind: 'colormind.models',
      api: {
        provider: 'colormind',
        endpoint: 'GET /list/',
        authentication: 'none',
        transport: 'http-only',
        usesBrowserClickstream: false,
      },
      query: { limit: 3 },
      count: 3,
      models: ['default', 'ui', 'makoto_shinkai'],
    }, 'text'),
  )

  assert.match(modelsOutput, /Colormind Models/)
  assert.match(modelsOutput, /HTTP-only/)
  assert.match(modelsOutput, /makoto_shinkai/)
  assert.match(modelsOutput, /palette.*colormind\.palette.*--model ui/u)
  assert.match(modelsOutput, /again.*colormind\.models.*--limit 3/u)
  assert.doesNotMatch(modelsOutput, /^\{/)
})

test('text output renders Chainlink feeds without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'chainlink.feeds',
      api: {
        provider: 'chainlink',
        endpoint: 'GET /feeds-*.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumResult: 'No finite maximum documented for reference-data-directory JSON files; CLI caps output at 100 and defaults to 100.',
      },
      query: { network: 'ethereum-mainnet', query: 'ETH', limit: 2 },
      source: {
        file: 'feeds-mainnet.json',
        url: 'https://reference-data-directory.vercel.app/feeds-mainnet.json',
      },
      count: 1,
      totalMatched: 1,
      feeds: [
        {
          name: 'ETH / USD',
          path: 'eth-usd',
          assetName: 'Ethereum',
          pair: ['ETH', 'USD'],
          proxyAddress: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
          contractAddress: '0x3607e46698d218B3a5Cae44bF381475C0a5e2ca7',
          heartbeatSeconds: 3600,
          category: 'verified',
          assetClass: 'rates',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Chainlink Data Feeds/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /feeds-mainnet\.json/)
  assert.match(output, /ETH \/ USD/)
  assert.match(output, /proxy:/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Helium hotspots without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'helium.hotspots',
      api: {
        provider: 'helium',
        endpoint: 'GET /v2/hotspots',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedPageSize: 10000,
      },
      query: { subnetwork: 'iot', active: true, limit: 1 },
      pagination: {
        cursor: 'next-token',
        pageSize: 10000,
        totalItems: 1034741,
        totalPages: 104,
      },
      count: 1,
      totalFetched: 2,
      totalMatched: 1,
      hotspots: [
        {
          keyToAssetKey: 'YM9Xn8A5H3L1R6AnPFjDa4YTay4fEXMATUiUbxEcmk7',
          entityKey: '1126Ab9X6wTgdy43BGcEnjEwkpFFCBDFwLokZFYYkxt83LHr6TFa',
          isActive: true,
          lat: 45.399853,
          long: 8.073501,
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Helium Hotspots/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /pageSize 10000/)
  assert.match(output, /1126Ab9X6wTgdy43BGcEnjEwkpFFCBDFwLokZFYYkxt83LHr6TFa/)
  assert.match(output, /next.*helium\.hotspots.*--active true --limit 1 --cursor next-token/u)
  assert.doesNotMatch(output, /next-token…/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Bhagavad Gita Telugu verse without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'gitatelugu.verse',
      api: {
        provider: 'gita-telugu',
        endpoint: 'GET /{language}/verse/{chapter}/{verse}',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumResult: 'Single verse lookup only; no pagination maximum applies.',
      },
      query: { language: 'tel', chapter: 1, verse: 1 },
      verse: {
        chapterNo: 1,
        verseNo: 1,
        language: 'telugu',
        chapterName: 'Arjuna Vishada Yoga',
        text: ['ధృతరాష్ట్ర ఉవాచ ।'],
        transliteration: [],
        synonyms: ['dhṛtarāṣṭra uvāca'],
        translation: 'Dhritarashtra said.',
        purport: ['A short purport preview.'],
      },
      navigation: {
        next: {
          language: 'tel',
          chapter: 1,
          verse: 2,
          command: 'public-apis apis run gitatelugu.verse -- --language tel --chapter 1 --verse 2',
        },
        alternateLanguage: {
          language: 'odi',
          command: 'public-apis apis run gitatelugu.verse -- --language odi --chapter 1 --verse 1',
        },
      },
    }, 'text'),
  )

  assert.match(output, /Bhagavad Gita Telugu Verse/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /language=tel/)
  assert.match(output, /ధృతరాష్ట్ర/)
  assert.match(output, /Dhritarashtra said/)
  assert.match(output, /previous already at the first verse/)
  assert.match(output, /next.*gitatelugu\.verse.*--language tel --chapter 1 --verse 2/u)
  assert.match(output, /switch language.*gitatelugu\.verse.*--language odi --chapter 1 --verse 1/u)
  assert.doesNotMatch(output, /next.*--language odi --chapter 1 --verse 1/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Steem discussions without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'steem.discussions',
      api: {
        provider: 'steem',
        endpoint: 'POST condenser_api.get_discussions_by_*',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumLimit: 100,
      },
      query: { sort: 'trending', tag: 'steem', limit: 1, truncateBody: 120 },
      count: 1,
      discussions: [
        {
          author: 'alice',
          permlink: 'hello',
          category: 'dev',
          title: 'Hello Steem',
          body: 'A short body preview.',
          created: '2026-05-03T01:02:03',
          children: 2,
          pendingPayoutValue: '0.123 SBD',
          url: 'https://steemit.com/dev/@alice/hello',
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Steem Discussions/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /Hello Steem/)
  assert.match(output, /steemit\.com/)
  assert.match(output, /thread.*steem\.thread.*--author alice --permlink hello/u)
  assert.match(output, /refresh.*steem\.discussions.*--sort trending --tag steem --limit 1 --truncate-body 120/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Steem thread with scroll commands', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'steem.thread',
      api: {
        provider: 'steem',
        endpoint: 'POST condenser_api.get_content + get_content_replies recursive',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumLimit: 100,
        traversal: 'Depth-first pre-order traversal preserves Steem reply hierarchy from get_content_replies.',
      },
      query: { author: 'alice', permlink: 'hello', cursor: 0, pageSize: 2, direction: 'down', truncateBody: 120 },
      root: {
        index: 0,
        author: 'alice',
        permlink: 'hello',
        category: 'dev',
        title: 'Hello Steem',
        body: 'Root body.',
        url: 'https://steemit.com/dev/@alice/hello',
        depth: 0,
        path: [],
        childCount: 1,
      },
      visibleItems: [
        {
          index: 0,
          author: 'alice',
          permlink: 'hello',
          category: 'dev',
          title: 'Hello Steem',
          body: 'Root body.',
          created: '2026-05-03T01:02:03',
          url: 'https://steemit.com/dev/@alice/hello',
          depth: 0,
          path: [],
          childCount: 1,
        },
        {
          index: 1,
          author: 'bob',
          permlink: 're-hello',
          title: '',
          body: 'Reply body.',
          created: '2026-05-03T02:03:04',
          url: 'https://steemit.com/dev/@alice/hello#@bob/re-hello',
          depth: 1,
          path: [0],
          childCount: 0,
        },
      ],
      items: [],
      tree: {},
      scroll: { direction: 'down', cursor: 0, pageSize: 2, start: 0, end: 2, returned: 2, total: 3, atTop: true, atBottom: false, nextCursor: 2 },
    }, 'text'),
  )

  assert.match(output, /Steem Thread/)
  assert.match(output, /open JSON-RPC API only · no auth/)
  assert.match(output, /Hello Steem/)
  assert.match(output, /↳ reply by bob/)
  assert.match(output, /up already at top/)
  assert.match(output, /down.*steem\.thread.*--author alice --permlink hello --cursor 2 --direction down --page-size 2/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Spaceflight News articles without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'spaceflightnews.articles',
      api: {
        provider: 'spaceflightnews',
        endpoint: 'GET /v4/articles/',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimitPolicy: 'Spaceflight News may return HTTP 429; use --persist and --offline.',
      },
      query: { limit: 1, offset: 0, ordering: '-published_at', search: 'starship', newsSite: 'NASASpaceflight' },
      pagination: { returned: 1, total: 33980, limit: 1, offset: 0, maxLimit: 500 },
      articles: [
        {
          title: 'Launch boosts European Earth monitoring and connectivity',
          newsSite: 'ESA',
          publishedAt: '2026-05-04T08:01:00Z',
          authors: [{ name: 'ESA' }],
          summary: 'Thirteen European satellites reached orbit.',
          url: 'https://www.esa.int/Applications/Observing_the_Earth/Launch_boosts_European_Earth_monitoring_and_connectivity',
          launches: [],
          events: [],
          featured: false,
        },
      ],
    }, 'text'),
  )

  assert.match(output, /Spaceflight News Articles/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /Launch boosts European/)
  assert.match(output, /HTTP 429/)
  assert.match(output, /next public-apis apis run spaceflightnews\.articles -- --limit 1 --offset 1 --search starship --news-site NASASpaceflight --ordering -published_at/)
  assert.match(output, /again public-apis apis run spaceflightnews\.articles -- --limit 1 --offset 0 --search starship --news-site NASASpaceflight --ordering -published_at/)
  assert.match(output, /replay public-apis apis run spaceflightnews\.articles --offline -- --limit 1 --offset 0 --search starship --news-site NASASpaceflight --ordering -published_at/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders xColors random and conversion without fallback JSON', () => {
  const randomOutput = captureStdout(() =>
    printResult({
      kind: 'xcolors.random',
      api: {
        provider: 'xcolors',
        endpoint: 'GET /api/random/{hue}',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximumResult: 'No finite maximum documented for number; CLI caps random colors at 50 and defaults to 10.',
      },
      query: { hue: 'blue', number: 2, type: 'light' },
      count: 2,
      colors: [
        { hex: '#D0E6FB', rgb: 'rgb(208, 230, 251)', hsl: 'hsl(210, 84%, 90%)' },
        { hex: '#759FE8', rgb: 'rgb(117, 159, 232)', hsl: 'hsl(218, 71%, 68%)' },
      ],
    }, 'text'),
  )

  assert.match(randomOutput, /xColors Random/)
  assert.match(randomOutput, /open REST API only · no auth/)
  assert.match(randomOutput, /#D0E6FB/)
  assert.doesNotMatch(randomOutput, /^\{/)

  const convertOutput = captureStdout(() =>
    printResult({
      kind: 'xcolors.convert',
      api: {
        provider: 'xcolors',
        endpoint: 'GET /api/{conversion}',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { operation: 'rgb2hex', value: '120-200-30' },
      color: { rgb: 'rgb(120, 200, 30)', hex: '#78C81E' },
    }, 'text'),
  )

  assert.match(convertOutput, /xColors Convert/)
  assert.match(convertOutput, /rgb2hex/)
  assert.match(convertOutput, /#78C81E/)
  assert.doesNotMatch(convertOutput, /^\{/)
})

test('text output renders EmojiHub results without fallback JSON', () => {
  const randomOutput = captureStdout(() =>
    printResult({
      kind: 'emojihub.random',
      api: { provider: 'emojihub', endpoint: 'GET /random', authentication: 'none', usesBrowserClickstream: false },
      query: {},
      emoji: { name: 'smiling cat face with open mouth', category: 'smileys and people', group: 'cat face', htmlCode: ['&#128570;'], unicode: ['U+1F63A'], character: '😺' },
    }, 'text'),
  )
  assert.match(randomOutput, /EmojiHub Random/)
  assert.match(randomOutput, /open REST API only · no auth/)
  assert.match(randomOutput, /😺/)
  assert.match(randomOutput, /again.*emojihub\.random/u)
  assert.match(randomOutput, /group.*emojihub\.search.*--group cat-face --limit 20/u)
  assert.match(randomOutput, /category.*emojihub\.search.*--category smileys-and-people --limit 20/u)
  assert.doesNotMatch(randomOutput, /^\{/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'emojihub.search',
      api: { provider: 'emojihub', endpoint: 'GET /search', authentication: 'none', usesBrowserClickstream: false },
      query: { query: 'cat', limit: 2 },
      count: 1,
      emojis: [{ name: 'smiling cat face with open mouth', category: 'smileys and people', group: 'cat face', htmlCode: ['&#128570;'], unicode: ['U+1F63A'], character: '😺' }],
    }, 'text'),
  )
  assert.match(searchOutput, /EmojiHub Search/)
  assert.match(searchOutput, /query=cat/)
  assert.match(searchOutput, /smiling cat face/)
  assert.match(searchOutput, /again.*emojihub\.search.*--query cat --limit 2/u)
  assert.match(searchOutput, /group.*emojihub\.search.*--group cat-face --limit 2/u)
  assert.match(searchOutput, /category.*emojihub\.search.*--category smileys-and-people --limit 2/u)
  assert.doesNotMatch(searchOutput, /^\{/)

  const categoriesOutput = captureStdout(() =>
    printResult({
      kind: 'emojihub.categories',
      api: { provider: 'emojihub', endpoint: 'GET /categories', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 2 },
      count: 2,
      categories: ['smileys and people', 'animals and nature'],
    }, 'text'),
  )
  assert.match(categoriesOutput, /EmojiHub Categories/)
  assert.match(categoriesOutput, /animals and nature/)
  assert.match(categoriesOutput, /search.*emojihub\.search.*--category smileys-and-people --limit 20/u)
  assert.match(categoriesOutput, /again.*emojihub\.categories.*--limit 2/u)
  assert.doesNotMatch(categoriesOutput, /^\{/)
})

test('text output renders EmojiHub empty state remediation', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'emojihub.search',
      api: { provider: 'emojihub', endpoint: 'GET /search', authentication: 'none', usesBrowserClickstream: false },
      query: { query: 'no-match', limit: 5 },
      count: 0,
      emojis: [],
    }, 'text'),
  )

  assert.match(searchOutput, /No EmojiHub emojis matched/)
  assert.match(searchOutput, /try.*emojihub\.search.*--query cat --limit 5/u)
  assert.match(searchOutput, /taxonomy.*emojihub\.categories.*--limit 100/u)

  const groupsOutput = captureStdout(() =>
    printResult({
      kind: 'emojihub.groups',
      api: { provider: 'emojihub', endpoint: 'GET /groups', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 5 },
      count: 0,
      groups: [],
    }, 'text'),
  )

  assert.match(groupsOutput, /No EmojiHub group names returned/)
  assert.match(groupsOutput, /try.*emojihub\.groups.*--limit 100/u)
})

test('text output renders Met Museum results without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'metmuseum.search',
      api: { provider: 'metmuseum', endpoint: 'GET /search', authentication: 'none', usesBrowserClickstream: false, rateLimit: '80 requests/second' },
      query: { query: 'cat', hasImages: true, limit: 3, detailLimit: 1 },
      total: 2,
      count: 2,
      objectIds: [436121, 436545],
      objects: [
        {
          objectId: 436121,
          title: 'A Woman Seated beside a Vase of Flowers',
          department: 'European Paintings',
          objectName: 'Painting',
          artistDisplayName: 'Edgar Degas',
          objectDate: '1865',
          medium: 'Oil on canvas',
          dimensions: '29 x 36 1/4 in.',
          isPublicDomain: true,
          primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DP-25460-001.jpg',
          objectUrl: 'https://www.metmuseum.org/art/collection/search/436121',
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /Met Museum Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /80 requests\/second/)
  assert.match(searchOutput, /Edgar Degas/)
  assert.match(searchOutput, /image: https:\/\/images\.metmuseum\.org\//)
  assert.match(searchOutput, /again.*metmuseum\.search.*--query cat --has-images true --limit 3 --detail-limit 1/u)
  assert.match(searchOutput, /object.*metmuseum\.object.*--object-id 436121/u)
  assert.match(searchOutput, /departments.*metmuseum\.departments.*--limit 100/u)
  assert.doesNotMatch(searchOutput, /^\{/)

  const departmentsOutput = captureStdout(() =>
    printResult({
      kind: 'metmuseum.departments',
      api: { provider: 'metmuseum', endpoint: 'GET /departments', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 1 },
      count: 1,
      departments: [{ departmentId: 11, displayName: 'European Paintings' }],
    }, 'text'),
  )
  assert.match(departmentsOutput, /Met Museum Departments/)
  assert.match(departmentsOutput, /11 · European Paintings/)
  assert.match(departmentsOutput, /search.*metmuseum\.search.*--query cat --department-id 11 --has-images true --limit 10 --detail-limit 3/u)
  assert.match(departmentsOutput, /again.*metmuseum\.departments.*--limit 1/u)
  assert.doesNotMatch(departmentsOutput, /^\{/)
})

test('text output renders Met Museum object and empty states', () => {
  const objectOutput = captureStdout(() =>
    printResult({
      kind: 'metmuseum.object',
      api: { provider: 'metmuseum', endpoint: 'GET /objects/:objectID', authentication: 'none', usesBrowserClickstream: false },
      query: { objectId: 436121 },
      object: {
        objectId: 436121,
        title: 'A Woman Seated beside a Vase of Flowers',
        department: 'European Paintings',
        objectName: 'Painting',
        artistDisplayName: 'Edgar Degas',
        objectDate: '1865',
        medium: 'Oil on canvas',
        dimensions: '29 x 36 1/4 in.',
        isPublicDomain: true,
        primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DP-25460-001.jpg',
        objectUrl: 'https://www.metmuseum.org/art/collection/search/436121',
      },
    }, 'text'),
  )

  assert.match(objectOutput, /Met Museum Object/)
  assert.match(objectOutput, /search.*metmuseum\.search.*--query 'A Woman Seated beside a Vase of Flowers' --has-images true --limit 3 --detail-limit 1/u)
  assert.match(objectOutput, /departments.*metmuseum\.departments.*--limit 100/u)

  const emptySearchOutput = captureStdout(() =>
    printResult({
      kind: 'metmuseum.search',
      api: { provider: 'metmuseum', endpoint: 'GET /search', authentication: 'none', usesBrowserClickstream: false, rateLimit: '80 requests/second' },
      query: { query: 'no-match', hasImages: true, limit: 3, detailLimit: 1 },
      total: 0,
      count: 0,
      objectIds: [],
      objects: [],
    }, 'text'),
  )

  assert.match(emptySearchOutput, /No Met Museum objects matched/)
  assert.match(emptySearchOutput, /try.*metmuseum\.search.*--query cat --has-images true --limit 3 --detail-limit 1/u)

  const emptyDepartmentsOutput = captureStdout(() =>
    printResult({
      kind: 'metmuseum.departments',
      api: { provider: 'metmuseum', endpoint: 'GET /departments', authentication: 'none', usesBrowserClickstream: false },
      query: { limit: 10 },
      count: 0,
      departments: [],
    }, 'text'),
  )

  assert.match(emptyDepartmentsOutput, /No Met Museum departments returned/)
  assert.match(emptyDepartmentsOutput, /try.*metmuseum\.departments.*--limit 100/u)
})

test('text output renders Minor Planet Center search without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'minorplanetcenter.search',
      api: {
        provider: 'minorplanetcenter',
        endpoint: 'GET /api/mpc',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        sourceDataset: 'Minor Planet Center MPCORB.DAT via Asterank',
        updatePolicy: 'Official Asterank docs state MPC data is updated nightly.',
        boundary: 'Read-only bounded asteroid records only.',
      },
      storage: { mode: 'online', persisted: true },
      query: {
        query: 'Ceres',
        maxEccentricity: 0.2,
        limit: 2,
      },
      pagination: { returned: 1, limit: 2, hasMoreUnknown: true },
      asteroids: [
        {
          readableDesignation: '(1) Ceres',
          designation: '00001',
          absoluteMagnitude: 3.34,
          eccentricity: 0.0760091,
          semiMajorAxisAu: 2.7691652,
          inclinationDeg: 10.59407,
          observations: 6725,
          oppositions: 114,
          lastObservation: '20180430',
          epoch: 'K194R',
          reference: 'MPO452155',
        },
      ],
    }, 'text'),
  )
  assert.match(output, /Minor Planet Center Asteroids/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /Ceres/)
  assert.match(output, /a 2\.77 AU/)
  assert.match(output, /6725 obs/)
  assert.match(output, /again.*minorplanetcenter\.search/u)
  assert.match(output, /low orbit.*--max-eccentricity 0\.1/u)
  assert.doesNotMatch(output, /^\{/)

  const emptyOutput = captureStdout(() =>
    printResult({
      kind: 'minorplanetcenter.search',
      api: {
        provider: 'minorplanetcenter',
        endpoint: 'GET /api/mpc',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { query: 'zzzzzzunlikelyasteroid', limit: 2 },
      pagination: { returned: 0, limit: 2, hasMoreUnknown: true },
      asteroids: [],
    }, 'text'),
  )
  assert.match(emptyOutput, /No Minor Planet Center asteroids matched/)
  assert.match(emptyOutput, /try.*minorplanetcenter\.search/u)
})

test('text output renders NASA search and asset without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'nasa.search',
      api: {
        provider: 'nasa',
        endpoint: 'GET /search',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'NASA Image and Video Library JSON metadata only.',
        keyRequiredBoundary: 'api.nasa.gov api_key endpoints are excluded.',
      },
      storage: { mode: 'online', persisted: true },
      query: {
        query: 'apollo 11',
        mediaType: 'image',
        center: 'JSC',
        yearStart: 1969,
        yearEnd: 1970,
        page: 1,
        pageSize: 2,
      },
      pagination: {
        totalHits: 1510,
        returned: 1,
        page: 1,
        pageSize: 2,
        maxPageSize: 50,
        hasMore: true,
      },
      items: [
        {
          nasaId: 'jsc2007e034221',
          title: 'Apollo 11 spacecraft pre-launch',
          description: 'Personnel atop the mobile service structure.',
          center: 'JSC',
          dateCreated: '1969-07-11T00:00:00Z',
          mediaType: 'image',
          keywords: ['Apollo', 'Apollo 11', 'Launch'],
          previewUrl: 'https://images-assets.nasa.gov/thumb.jpg',
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /NASA Image Library Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.match(searchOutput, /api\.nasa\.gov api_key endpoints are excluded/)
  assert.match(searchOutput, /Apollo 11 spacecraft pre-launch/)
  assert.match(searchOutput, /asset public-apis apis run nasa\.asset/)
  assert.match(searchOutput, /again.*nasa\.search/u)
  assert.match(searchOutput, /replay.*nasa\.search/u)
  assert.doesNotMatch(searchOutput, /^\{/)

  const assetOutput = captureStdout(() =>
    printResult({
      kind: 'nasa.asset',
      api: {
        provider: 'nasa',
        endpoint: 'GET /asset/{nasa_id}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'NASA Image and Video Library manifest URLs only.',
      },
      query: { nasaId: 'as11-40-5874', limit: 2 },
      pagination: { returned: 2, limit: 2, hasMore: true },
      files: [
        {
          href: 'https://images-assets.nasa.gov/image/as11-40-5874/file~orig.jpg',
          filename: 'file~orig.jpg',
          role: 'original',
          extension: 'jpg',
        },
        {
          href: 'https://images-assets.nasa.gov/image/as11-40-5874/file~medium.jpg',
          filename: 'file~medium.jpg',
          role: 'medium',
          extension: 'jpg',
        },
      ],
    }, 'text'),
  )
  assert.match(assetOutput, /NASA Asset Manifest/)
  assert.match(assetOutput, /file~orig\.jpg/)
  assert.match(assetOutput, /original/)
  assert.match(assetOutput, /again.*nasa\.asset/u)
  assert.match(assetOutput, /search.*nasa\.search/u)
  assert.doesNotMatch(assetOutput, /^\{/)
})

test('text output renders OSF nodes and preprints without fallback JSON', () => {
  const nodesOutput = captureStdout(() =>
    printResult({
      kind: 'osf.nodes',
      api: {
        provider: 'osf',
        endpoint: 'GET /v2/nodes/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON:API REST',
        authBoundary: 'Public list endpoints return current_user null.',
        boundary: 'Read-only public JSON:API metadata only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { title: 'reproducibility', public: true, limit: 2, page: 1 },
      pagination: { returned: 1, total: 688, limit: 2, page: 1, nextPage: 2 },
      nodes: [
        {
          id: 'a9zjq',
          title: 'Reproducibility Materials',
          description: 'An anonymised dataset and analysis files.',
          category: 'project',
          public: true,
          preprint: false,
          dateModified: '2026-05-04T19:12:25.643911',
          tags: ['reproducibility', 'open science'],
          subjects: ['Social and Behavioral Sciences'],
          links: { html: 'https://osf.io/a9zjq/' },
        },
      ],
    }, 'text'),
  )
  assert.match(nodesOutput, /OSF Public Nodes/)
  assert.match(nodesOutput, /open REST API only · no auth/)
  assert.match(nodesOutput, /no Chrome clickstream/)
  assert.match(nodesOutput, /Reproducibility Materials/)
  assert.match(nodesOutput, /more public-apis apis run osf\.nodes/)
  assert.match(nodesOutput, /replay public-apis apis run osf\.nodes/)
  assert.doesNotMatch(nodesOutput, /^\{/)

  const preprintsOutput = captureStdout(() =>
    printResult({
      kind: 'osf.preprints',
      api: {
        provider: 'osf',
        endpoint: 'GET /v2/preprints/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON:API REST',
        authBoundary: 'Public list endpoints return current_user null.',
        boundary: 'Read-only public JSON:API metadata only.',
      },
      storage: { mode: 'online', persisted: false },
      query: { provider: 'psyarxiv', isPublished: true, limit: 2, page: 1 },
      pagination: { returned: 1, total: 58527, limit: 2, page: 1 },
      preprints: [
        {
          id: 'g69za_v1',
          title: 'Responsibility for influencing others',
          description: 'Collective outcomes often result from social dynamics.',
          provider: 'psyarxiv',
          reviewsState: 'accepted',
          datePublished: '2026-05-10T15:30:30.511488',
          isLatestVersion: true,
          tags: ['causal reasoning', 'responsibility'],
          subjects: ['Social Cognition'],
          dataLinks: ['https://example.org/data'],
          links: {
            html: 'https://osf.io/preprints/psyarxiv/g69za_v1/',
            doi: 'https://doi.org/10.31234/osf.io/g69za_v1',
          },
        },
      ],
    }, 'text'),
  )
  assert.match(preprintsOutput, /OSF Public Preprints/)
  assert.match(preprintsOutput, /Responsibility for influencing others/)
  assert.match(preprintsOutput, /provider psyarxiv/)
  assert.match(preprintsOutput, /again public-apis apis run osf\.preprints/)
  assert.match(preprintsOutput, /replay public-apis apis run osf\.preprints/)
  assert.doesNotMatch(preprintsOutput, /^\{/)
})

test('text output renders SHARE search and sources without fallback JSON', () => {
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'share.search',
      api: {
        provider: 'share',
        endpoint: 'POST /api/v2/search/creativeworks/_search',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        queryPolicy: 'Curated simple_query_string only.',
        boundary: 'Read-only SHARE normalized metadata only.',
      },
      storage: { mode: 'online', persisted: true },
      query: {
        query: 'reproducibility',
        type: 'preprint',
        source: 'OSF',
        limit: 2,
        offset: 0,
        sort: 'relevance',
      },
      pagination: { returned: 1, total: 2415, limit: 2, offset: 0, nextOffset: 1 },
      search: { took: 6, timedOut: false },
      works: [
        {
          id: 'E00D0-60A-128',
          title: 'Reproducibility in Management Science',
          type: 'preprint',
          date: '2023-11-01T21:29:20.468782+00:00',
          score: 18.2,
          description: 'Reproducibility work package and analysis materials.',
          sources: ['OSF'],
          contributors: ['Miloš Fišar', 'Christoph Huber'],
          tags: ['reproducibility', 'open science'],
          subjects: ['bepress|Business'],
          links: {
            primary: 'http://osf.io/mydzv/',
            doi: 'http://dx.doi.org/10.31219/OSF.IO/MYDZV',
          },
        },
      ],
    }, 'text'),
  )
  assert.match(searchOutput, /SHARE Creative Works/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.match(searchOutput, /Reproducibility in Management Science/)
  assert.match(searchOutput, /more public-apis apis run share\.search/)
  assert.match(searchOutput, /sources public-apis apis run share\.sources/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const sourcesOutput = captureStdout(() =>
    printResult({
      kind: 'share.sources',
      api: {
        provider: 'share',
        endpoint: 'GET /api/v2/sources/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only SHARE source metadata only.',
      },
      storage: { mode: 'online', persisted: false },
      query: { query: 'open science', limit: 2, offset: 0 },
      pagination: {
        returned: 1,
        total: 1,
        limit: 2,
        offset: 0,
        upstreamReturned: 10,
        upstreamNext: 'https://share.osf.io/api/v2/sources/?page%5Bcursor%5D=x',
      },
      sources: [
        {
          id: '1',
          name: 'OSF',
          longTitle: 'Open Science Framework',
          homePage: 'https://osf.io/',
          sourceConfigCount: 1,
          links: { self: 'https://share.osf.io/api/v2/sources/DC0DE-ADB-EEF/' },
        },
      ],
    }, 'text'),
  )
  assert.match(sourcesOutput, /SHARE Sources/)
  assert.match(sourcesOutput, /Open Science Framework/)
  assert.match(sourcesOutput, /search public-apis apis run share\.search/)
  assert.match(sourcesOutput, /replay public-apis apis run share\.sources/)
  assert.doesNotMatch(sourcesOutput, /^\{/)
})

test('text output renders SpaceX REST operations without fallback JSON', () => {
  const companyOutput = captureStdout(() =>
    printResult({
      kind: 'spacex.company',
      api: {
        provider: 'spacex',
        endpoint: 'GET /v4/company',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only SpaceX REST JSON metadata only.',
      },
      storage: { mode: 'online', persisted: true },
      company: {
        id: '5eb75edc42fea42237d7f3ed',
        name: 'SpaceX',
        founder: 'Elon Musk',
        founded: 2002,
        employees: 8000,
        vehicles: 3,
        launchSites: 3,
        testSites: 1,
        ceo: 'Elon Musk',
        cto: 'Elon Musk',
        coo: 'Gwynne Shotwell',
        valuation: 52000000000,
        summary: 'SpaceX designs, manufactures and launches advanced rockets.',
        headquarters: {
          address: 'Rocket Road',
          city: 'Hawthorne',
          state: 'California',
        },
        links: { website: 'https://www.spacex.com/' },
      },
    }, 'text'),
  )
  assert.match(companyOutput, /SpaceX Company/)
  assert.match(companyOutput, /open REST API only · no auth/)
  assert.match(companyOutput, /no Chrome clickstream/)
  assert.match(companyOutput, /valuation \$52,000,000,000/)
  assert.match(companyOutput, /launches public-apis apis run spacex\.launches/)
  assert.doesNotMatch(companyOutput, /^\{/)

  const rocketsOutput = captureStdout(() =>
    printResult({
      kind: 'spacex.rockets',
      api: {
        provider: 'spacex',
        endpoint: 'GET /v4/rockets',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only SpaceX REST JSON metadata only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { search: 'Falcon', active: true, limit: 2, offset: 0 },
      pagination: { total: 4, matched: 1, returned: 1, limit: 2, offset: 0 },
      rockets: [{
        id: '5e9d0d95eda69973a809d1ec',
        name: 'Falcon 9',
        active: true,
        firstFlight: '2010-06-04',
        country: 'United States',
        successRatePct: 97,
        heightMeters: 70,
        diameterMeters: 3.7,
        massKg: 549054,
        engineCount: 9,
        engineType: 'merlin',
        engineVersion: '1D+',
        propellants: ['liquid oxygen', 'RP-1 kerosene'],
        description: 'Falcon 9 is a two-stage rocket.',
        wikipedia: 'https://en.wikipedia.org/wiki/Falcon_9',
      }],
    }, 'text'),
  )
  assert.match(rocketsOutput, /SpaceX Rockets/)
  assert.match(rocketsOutput, /Falcon 9/)
  assert.match(rocketsOutput, /open REST API only · no auth/)
  assert.match(rocketsOutput, /replay public-apis apis run spacex\.rockets/)
  assert.doesNotMatch(rocketsOutput, /^\{/)

  const launchpadsOutput = captureStdout(() =>
    printResult({
      kind: 'spacex.launchpads',
      api: {
        provider: 'spacex',
        endpoint: 'GET /v4/launchpads',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        boundary: 'Read-only SpaceX REST JSON metadata only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { status: 'active', limit: 2, offset: 0 },
      pagination: { total: 6, matched: 3, returned: 1, limit: 2, offset: 0 },
      launchpads: [{
        id: '5e9e4502f509094188566f88',
        name: 'KSC LC 39A',
        fullName: 'Kennedy Space Center LC 39A',
        locality: 'Cape Canaveral',
        region: 'Florida',
        timezone: 'America/New_York',
        latitude: 28.6080585,
        longitude: -80.6039558,
        status: 'active',
        launchAttempts: 55,
        launchSuccesses: 54,
        launchCount: 55,
        rocketIds: ['5e9d0d95eda69973a809d1ec'],
      }],
    }, 'text'),
  )
  assert.match(launchpadsOutput, /SpaceX Launchpads/)
  assert.match(launchpadsOutput, /Kennedy Space Center LC 39A/)
  assert.match(launchpadsOutput, /open REST API only · no auth/)
  assert.match(launchpadsOutput, /replay public-apis apis run spacex\.launchpads/)
  assert.doesNotMatch(launchpadsOutput, /^\{/)

  const launchesOutput = captureStdout(() =>
    printResult({
      kind: 'spacex.launches',
      api: {
        provider: 'spacex',
        endpoint: 'POST /v5/launches/query',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        queryPolicy: 'CLI exposes fixed filters.',
        boundary: 'Read-only SpaceX REST JSON metadata only.',
      },
      storage: { mode: 'online', persisted: true },
      query: { name: 'Crew', upcoming: false, limit: 2, page: 1 },
      pagination: {
        total: 6,
        returned: 1,
        limit: 2,
        page: 1,
        totalPages: 3,
        nextPage: 2,
      },
      launches: [{
        id: '633f72130531f07b4fdf59c3',
        name: 'Crew-5',
        flightNumber: 187,
        dateUtc: '2022-10-05T16:00:00.000Z',
        datePrecision: 'hour',
        upcoming: false,
        success: true,
        rocketId: '5e9d0d95eda69973a809d1ec',
        launchpadId: '5e9e4502f509094188566f88',
        details: 'Crew-5 transported astronauts to the ISS.',
        payloadCount: 1,
        crewCount: 4,
        failureReasons: [],
        links: { webcast: 'https://youtu.be/5EwW8ZkArL4' },
      }],
    }, 'text'),
  )
  assert.match(launchesOutput, /SpaceX Launches/)
  assert.match(launchesOutput, /Crew-5/)
  assert.match(launchesOutput, /open REST API only · no auth/)
  assert.match(launchesOutput, /more public-apis apis run spacex\.launches/)
  assert.match(launchesOutput, /rockets public-apis apis run spacex\.rockets/)
  assert.doesNotMatch(launchesOutput, /^\{/)
})

test('text output renders Sunrise-Sunset times without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'sunrisesunset.times',
      api: {
        provider: 'sunrisesunset',
        endpoint: 'GET /json',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        attributionRequired: true,
      },
      storage: { mode: 'online', persisted: true },
      query: {
        latitude: 36.72016,
        longitude: -4.42034,
        date: '2026-05-11',
        tzid: 'UTC',
      },
      status: 'OK',
      tzid: 'UTC',
      times: {
        sunrise: '2026-05-11T05:12:08+00:00',
        sunset: '2026-05-11T19:15:59+00:00',
        solarNoon: '2026-05-11T12:14:04+00:00',
        dayLengthSeconds: 50631,
        civilTwilightBegin: '2026-05-11T04:45:00+00:00',
        civilTwilightEnd: '2026-05-11T19:43:07+00:00',
        nauticalTwilightBegin: '2026-05-11T04:10:13+00:00',
        nauticalTwilightEnd: '2026-05-11T20:17:55+00:00',
        astronomicalTwilightBegin: '2026-05-11T03:32:47+00:00',
        astronomicalTwilightEnd: '2026-05-11T20:55:21+00:00',
      },
    }, 'text'),
  )
  assert.match(output, /Sunrise and Sunset Times/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /attribution required/)
  assert.match(output, /day length 14h 3m/)
  assert.match(output, /replay public-apis apis run sunrisesunset\.times/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output marks Sunrise-Sunset unavailable polar events', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'sunrisesunset.times',
      api: {
        provider: 'sunrisesunset',
        endpoint: 'GET /json',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        attributionRequired: true,
      },
      query: {
        latitude: 90,
        longitude: 0,
        date: '2026-05-11',
        tzid: 'UTC',
      },
      status: 'OK',
      tzid: 'UTC',
      times: {
        sunrise: '1970-01-01T00:00:01+00:00',
        sunset: '1970-01-01T00:00:01+00:00',
        solarNoon: '2026-05-11T11:56:23+00:00',
        dayLengthSeconds: 0,
        civilTwilightBegin: '1970-01-01T00:00:01+00:00',
        civilTwilightEnd: '1970-01-01T00:00:01+00:00',
        nauticalTwilightBegin: '1970-01-01T00:00:01+00:00',
        nauticalTwilightEnd: '1970-01-01T00:00:01+00:00',
        astronomicalTwilightBegin: '1970-01-01T00:00:01+00:00',
        astronomicalTwilightEnd: '1970-01-01T00:00:01+00:00',
      },
    }, 'text'),
  )
  assert.match(output, /unavailable \(provider 1970 sentinel\)/)
  assert.match(output, /day length 0m/)
})

test('text output renders TLE search and satellite without fallback JSON', () => {
  const satellite = {
    satelliteId: 25544,
    name: 'ISS (ZARYA)',
    date: '2026-05-10T17:09:53+00:00',
    line1: '1 25544U 98067A   26130.71520280  .00006215  00000+0  12011-3 0  9998',
    line2: '2 25544  51.6310 125.5915 0007454  44.6609 315.4979 15.49176858565946',
    orbital: {
      classification: 'U',
      internationalDesignator: '98-067-A',
      epochYear: '26',
      epochDay: '130.71520280',
      inclinationDegrees: 51.631,
      rightAscensionDegrees: 125.5915,
      eccentricity: 0.0007454,
      argumentOfPerigeeDegrees: 44.6609,
      meanAnomalyDegrees: 315.4979,
      meanMotionRevsPerDay: 15.49176858,
      revolutionNumber: 56594,
    },
  }
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'tle.search',
      api: {
        provider: 'tle',
        endpoint: 'GET /api/tle/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        dataSource: 'CelesTrak',
      },
      storage: { mode: 'online', persisted: true },
      query: { search: 'ISS', page: 1, pageSize: 20 },
      pagination: {
        returned: 1,
        totalItems: 25,
        page: 1,
        pageSize: 20,
        hasMore: true,
      },
      satellites: [satellite],
    }, 'text'),
  )
  assert.match(searchOutput, /TLE Satellite Search/)
  assert.match(searchOutput, /ISS \(ZARYA\)/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /no Chrome clickstream/)
  assert.match(searchOutput, /next page public-apis apis run tle\.search/)
  assert.match(searchOutput, /open first public-apis apis run tle\.satellite/)
  assert.doesNotMatch(searchOutput, /^\{/)

  const satelliteOutput = captureStdout(() =>
    printResult({
      kind: 'tle.satellite',
      api: {
        provider: 'tle',
        endpoint: 'GET /api/tle/{satelliteId}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS JSON REST',
        dataSource: 'CelesTrak',
      },
      storage: { mode: 'offline', persisted: false },
      query: { satelliteId: 25544 },
      satellite,
    }, 'text'),
  )
  assert.match(satelliteOutput, /TLE Satellite/)
  assert.match(satelliteOutput, /ISS \(ZARYA\)/)
  assert.match(satelliteOutput, /line1 1 25544U/)
  assert.match(satelliteOutput, /search name public-apis apis run tle\.search/)
  assert.doesNotMatch(satelliteOutput, /^\{/)
})

test('text output renders Urantia operations without media or HTML dumps', () => {
  const paragraph = {
    id: '0:0.0.1',
    standardReferenceId: '0:0.1',
    paperId: '0',
    sectionId: '0',
    partId: '0',
    paperTitle: 'Foreword',
    paragraphId: '1',
    text: 'IN THE MINDS of the mortals of Urantia there exists great confusion.',
    labels: ['Theology'],
  }
  const tocOutput = captureStdout(() =>
    printResult({
      kind: 'urantia.toc',
      api: {
        provider: 'urantia',
        endpoint: 'GET /toc',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      storage: { mode: 'online', persisted: true },
      query: { limit: 1, offset: 0 },
      pagination: { returned: 1, total: 5, limit: 1, offset: 0 },
      totals: { parts: 5, papers: 197 },
      parts: [{
        id: '0',
        title: 'Foreword',
        papers: [{ id: '0', title: 'Foreword', labels: ['Theology'] }],
      }],
    }, 'text'),
  )
  assert.match(tocOutput, /Urantia Papers TOC/)
  assert.match(tocOutput, /open REST API only · no auth/)
  assert.match(tocOutput, /audio\/video\/html fields omitted/)
  assert.match(tocOutput, /open public-apis apis run urantia\.paper/)

  const paperOutput = captureStdout(() =>
    printResult({
      kind: 'urantia.paper',
      api: {
        provider: 'urantia',
        endpoint: 'GET /papers/{id}',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      storage: { mode: 'offline', persisted: true },
      query: { paperId: '0', lang: 'eng', limit: 1, offset: 0 },
      pagination: { returned: 1, total: 172, limit: 1, offset: 0, nextOffset: 1 },
      paper: { id: '0', partId: '0', title: 'Foreword', labels: ['Theology'] },
      paragraphs: [paragraph],
    }, 'text'),
  )
  assert.match(paperOutput, /Urantia Paper/)
  assert.match(paperOutput, /Foreword/)
  assert.match(paperOutput, /next public-apis apis run urantia\.paper/)
  assert.doesNotMatch(paperOutput, /<span/)
  assert.doesNotMatch(paperOutput, /audio\.urantia/)

  const paragraphOutput = captureStdout(() =>
    printResult({
      kind: 'urantia.paragraph',
      api: {
        provider: 'urantia',
        endpoint: 'GET /paragraphs/{ref}',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { ref: '0:0.1', lang: 'eng' },
      paragraph,
      navigation: { next: '0:0.2' },
    }, 'text'),
  )
  assert.match(paragraphOutput, /Urantia Paragraph/)
  assert.match(paragraphOutput, /next public-apis apis run urantia\.paragraph/)
  assert.match(paragraphOutput, /paper public-apis apis run urantia\.paper/)

  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'urantia.search',
      api: {
        provider: 'urantia',
        endpoint: 'GET /search',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { query: 'thought adjuster', type: 'and', limit: 1, page: 0 },
      pagination: {
        returned: 1,
        total: 244,
        limit: 1,
        page: 0,
        totalPages: 244,
        nextPage: 1,
      },
      paragraphs: [paragraph],
    }, 'text'),
  )
  assert.match(searchOutput, /Urantia Full-Text Search/)
  assert.match(searchOutput, /open first public-apis apis run urantia\.paragraph/)
  assert.doesNotMatch(searchOutput, /^\{/)
})

test('text output renders USGS Earthquake operations without product dumps', () => {
  const event = {
    id: 'us6000swvm',
    title: 'M 5.2 - 72 km NW of Malango, Solomon Islands',
    magnitude: 5.2,
    place: '72 km NW of Malango, Solomon Islands',
    time: '2026-05-11T09:48:51.604Z',
    updated: '2026-05-11T10:35:36.750Z',
    eventType: 'earthquake',
    status: 'reviewed',
    alert: null,
    tsunami: false,
    significance: 417,
    felt: 4,
    cdi: 2.7,
    mmi: null,
    network: 'us',
    code: '6000swvm',
    magnitudeType: 'mww',
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000swvm',
    coordinates: { latitude: -9.2967, longitude: 159.1915, depthKm: 10 },
    productTypes: ['origin', 'phase-data', 'shakemap'],
    sources: ['us', 'usauto'],
  }
  const searchOutput = captureStdout(() =>
    printResult({
      kind: 'usgsearthquake.search',
      api: {
        provider: 'usgsearthquake',
        endpoint: 'GET /query',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS GeoJSON REST',
      },
      storage: { mode: 'online', persisted: true },
      query: { minMagnitude: 4.5, limit: 1, offset: 1, orderBy: 'time' },
      metadata: { apiVersion: '2.4.0', title: 'USGS Earthquakes' },
      pagination: { returned: 1, limit: 1, offset: 1, nextOffset: 2 },
      events: [event],
    }, 'text'),
  )
  assert.match(searchOutput, /USGS Earthquake Search/)
  assert.match(searchOutput, /open REST API only · no auth/)
  assert.match(searchOutput, /product attachments and binary assets omitted/)
  assert.match(searchOutput, /next public-apis apis run usgsearthquake\.search/)
  assert.match(searchOutput, /open first public-apis apis run usgsearthquake\.event/)
  assert.doesNotMatch(searchOutput, /download\.bin/)

  const eventOutput = captureStdout(() =>
    printResult({
      kind: 'usgsearthquake.event',
      api: {
        provider: 'usgsearthquake',
        endpoint: 'GET /query?eventid={eventId}',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS GeoJSON REST',
      },
      storage: { mode: 'offline', persisted: true },
      query: { eventId: 'us6000swvm' },
      event,
    }, 'text'),
  )
  assert.match(eventOutput, /USGS Earthquake Event/)
  assert.match(eventOutput, /event page https:\/\/earthquake\.usgs\.gov/)
  assert.match(eventOutput, /search recent public-apis apis run/)
  assert.doesNotMatch(eventOutput, /^\{/)
  assert.doesNotMatch(eventOutput, /application\/octet-stream/)
})

test('text output renders USGS Water operations without bulk dumps', () => {
  const series = {
    id: 'USGS:01646500:00060:00003',
    site: {
      code: '01646500',
      name: 'POTOMAC RIVER NEAR WASH, DC LITTLE FALLS PUMP STA',
      agencyCode: 'USGS',
      latitude: 38.94977778,
      longitude: -77.12763889,
      timeZone: 'EDT',
    },
    variable: {
      code: '00060',
      name: 'Streamflow, ft3/s',
      description: 'Discharge, cubic feet per second',
      unit: 'ft3/s',
      valueType: 'Derived Value',
      statisticCode: '00003',
      statisticName: 'Mean',
    },
    qualifiers: [{
      code: 'P',
      description: 'Provisional data subject to revision.',
    }],
    readings: [{
      value: '1340',
      numericValue: 1340,
      dateTime: '2026-05-11T10:00:00.000-04:00',
      qualifiers: ['P'],
    }],
  }

  const instantaneousOutput = captureStdout(() =>
    printResult({
      kind: 'usgswater.instantaneous',
      api: {
        provider: 'usgswater',
        endpoint: 'GET /nwis/iv/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS WaterML JSON REST',
        reliability: 'Recent values can be provisional.',
      },
      storage: { mode: 'online', persisted: true },
      query: {
        site: '01646500',
        parameterCodes: ['00060', '00065'],
        limit: 1,
      },
      pagination: { returnedSeries: 1, returnedValues: 1, limit: 1 },
      series: [series],
    }, 'text'),
  )
  assert.match(instantaneousOutput, /USGS Water Instantaneous Values/)
  assert.match(instantaneousOutput, /open REST API only · no auth/)
  assert.match(instantaneousOutput, /no Chrome clickstream/)
  assert.match(instantaneousOutput, /bulk exports omitted/)
  assert.match(instantaneousOutput, /Discharge, cubic feet per second/)
  assert.match(instantaneousOutput, /daily public-apis apis run usgswater\.daily/)
  assert.doesNotMatch(instantaneousOutput, /^\{/)
  assert.doesNotMatch(instantaneousOutput, /application\/octet-stream/)
  assert.doesNotMatch(instantaneousOutput, /<html/i)
  assert.doesNotMatch(instantaneousOutput, /RDB|KML|XML/)

  const dailyOutput = captureStdout(() =>
    printResult({
      kind: 'usgswater.daily',
      api: {
        provider: 'usgswater',
        endpoint: 'GET /nwis/dv/',
        authentication: 'none',
        usesBrowserClickstream: false,
        transport: 'HTTPS WaterML JSON REST',
        reliability: 'Daily values can be provisional.',
      },
      storage: { mode: 'offline', persisted: true },
      query: {
        site: '01646500',
        parameterCodes: ['00060'],
        statisticCode: '00003',
        startDate: '2026-05-01',
        endDate: '2026-05-11',
        limit: 1,
      },
      pagination: { returnedSeries: 1, returnedValues: 1, limit: 1 },
      series: [series],
    }, 'text'),
  )
  assert.match(dailyOutput, /USGS Water Daily Values/)
  assert.match(dailyOutput, /current public-apis apis run/)
  assert.match(dailyOutput, /--start-date 2026-05-01/)
  assert.doesNotMatch(dailyOutput, /^\{/)
  assert.doesNotMatch(dailyOutput, /stateCd|county|bbox|api-key/)
})

test('text output renders PHP-Noise result without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'phpnoise.generate',
      api: { provider: 'php-noise', endpoint: 'GET /noise.php?base64', authentication: 'none', usesBrowserClickstream: false },
      query: { hex: '336699', tiles: 3, tileSize: 5, borderWidth: 1, mode: 'brightness', multi: '1.5', steps: 5 },
      image: {
        dataUrl: 'data:image/png;base64,cG5n',
        mimeType: 'image/png',
        base64Bytes: 3,
        dimensions: { width: 17, height: 17 },
      },
    }, 'text'),
  )

  assert.match(output, /PHP-Noise Generate/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /image\/png/)
  assert.match(output, /17×17/)
  assert.match(output, /PNG data URL omitted from text output/)
  assert.doesNotMatch(output, /data:image\/png;base64/)
  assert.doesNotMatch(output, /cG5n/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders QuickChart result without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'quickchart.render',
      api: {
        provider: 'quickchart',
        endpoint: 'GET /chart',
        authentication: 'none',
        usesBrowserClickstream: false,
        documentedMaximums: { width: 2000, height: 2000 },
        rateLimit: 'no API key documented for basic chart rendering',
      },
      query: { chartType: 'bar', labels: ['A', 'B'], data: [1, 2], title: 'Demo', width: 500, height: 300, format: 'png' },
      chart: {
        url: 'https://quickchart.io/chart?c=demo',
        contentType: 'image/png',
        mediaType: 'image/png',
        bytes: 1024,
        dataUrl: 'data:image/png;base64,cG5n',
        dimensions: { width: 500, height: 300 },
      },
    }, 'text'),
  )

  assert.match(output, /QuickChart Render/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /image\/png/)
  assert.match(output, /500×300/)
  assert.match(output, /data URL omitted from text output/)
  assert.match(output, /quickchart\.io\/chart/)
  assert.doesNotMatch(output, /data:image\/png;base64/)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Waifu.im images and tags without fallback JSON', () => {
  const imagesOutput = captureStdout(() =>
    printResult({
      kind: 'waifuim.images',
      api: {
        provider: 'waifu.im',
        endpoint: 'GET /images',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { includedTags: ['waifu'], excludedTags: [], nsfw: 'False', animated: 'All', orderBy: 'Random', orientation: 'All', page: 1, pageSize: 3 },
      pagination: { pageNumber: 1, totalPages: 10, totalCount: 10, maxPageSize: -1, defaultPageSize: 1, hasNextPage: true, hasPreviousPage: false },
      count: 1,
      images: [
        {
          id: 884,
          url: 'https://cdn.waifu.im/884.jpeg',
          source: 'https://reddit.com/g2v6s2/',
          extension: '.jpeg',
          dominantColor: '#D3C2C3',
          width: 2250,
          height: 4000,
          byteSize: 517067,
          isNsfw: false,
          isAnimated: false,
          favorites: 8,
          uploadedAt: '2021-11-02T11:16:19.048684Z',
          artists: [],
          tags: ['waifu'],
        },
      ],
    }, 'text'),
  )

  assert.match(imagesOutput, /Waifu\.im Images/)
  assert.match(imagesOutput, /open REST API only · no auth/)
  assert.match(imagesOutput, /waifu/)
  assert.doesNotMatch(imagesOutput, /excludedTags=/)
  assert.match(imagesOutput, /again.*waifuim\.images.*--included-tags waifu.*--page 1 --page-size 3/u)
  assert.match(imagesOutput, /next.*waifuim\.images.*--included-tags waifu.*--page 2 --page-size 3/u)
  assert.match(imagesOutput, /tags.*waifuim\.tags.*--name waifu --page-size 100/u)
  assert.doesNotMatch(imagesOutput, /^\{/)

  const tagsOutput = captureStdout(() =>
    printResult({
      kind: 'waifuim.tags',
      api: {
        provider: 'waifu.im',
        endpoint: 'GET /tags',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { name: 'waifu', slugs: [], page: 1, pageSize: 100 },
      pagination: { pageNumber: 1, totalPages: 1, totalCount: 1, maxPageSize: -1, defaultPageSize: 30, hasNextPage: false, hasPreviousPage: false },
      count: 1,
      tags: [
        { id: 12, name: 'Waifu', slug: 'waifu', description: 'A female anime/manga character.', imageCount: 4249 },
      ],
    }, 'text'),
  )

  assert.match(tagsOutput, /Waifu\.im Tags/)
  assert.match(tagsOutput, /waifu/)
  assert.doesNotMatch(tagsOutput, /slugs=/)
  assert.match(tagsOutput, /images.*waifuim\.images.*--included-tags waifu.*--page-size 100/u)
  assert.match(tagsOutput, /again.*waifuim\.tags.*--name waifu --page 1 --page-size 100/u)
  assert.doesNotMatch(tagsOutput, /^\{/)
})

test('text output renders Waifu.im empty state remediation', () => {
  const imagesOutput = captureStdout(() =>
    printResult({
      kind: 'waifuim.images',
      api: {
        provider: 'waifu.im',
        endpoint: 'GET /images',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { includedTags: ['unlikely'], excludedTags: [], nsfw: 'False', animated: 'All', orderBy: 'Random', orientation: 'All', page: 1, pageSize: 3 },
      pagination: { pageNumber: 1, totalPages: 0, totalCount: 0, maxPageSize: -1, defaultPageSize: 1, hasNextPage: false, hasPreviousPage: false },
      count: 0,
      images: [],
    }, 'text'),
  )

  assert.match(imagesOutput, /No Waifu\.im images returned/)
  assert.match(imagesOutput, /tags.*waifuim\.tags.*--name unlikely --page-size 100/u)
  assert.match(imagesOutput, /try.*waifuim\.images.*--included-tags waifu.*--page-size 3/u)

  const tagsOutput = captureStdout(() =>
    printResult({
      kind: 'waifuim.tags',
      api: {
        provider: 'waifu.im',
        endpoint: 'GET /tags',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { name: 'unlikely', slugs: [], page: 1, pageSize: 100 },
      pagination: { pageNumber: 1, totalPages: 0, totalCount: 0, maxPageSize: -1, defaultPageSize: 30, hasNextPage: false, hasPreviousPage: false },
      count: 0,
      tags: [],
    }, 'text'),
  )

  assert.match(tagsOutput, /No Waifu\.im tags returned/)
  assert.match(tagsOutput, /try.*waifuim\.tags.*--name waifu --page-size 100/u)
  assert.match(tagsOutput, /try.*waifuim\.images.*--included-tags waifu.*--page-size 100/u)
})

test('text output renders AnimeChan random quote without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'animechan.random',
      api: {
        provider: 'animechan',
        endpoint: 'GET /quotes/random',
        authentication: 'none',
        usesBrowserClickstream: false,
        freeRateLimit: '5 requests/hour',
      },
      query: { anime: 'ReLIFE' },
      quote: {
        content: 'If you only face forward, there is something you will miss seeing.',
        anime: { id: 497, name: 'ReLIFE', altName: 'ReLife' },
        character: { id: 837, name: 'Arata Kaizaki' },
      },
    }, 'text'),
  )

  assert.match(output, /AnimeChan Random Quote/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /anime=ReLIFE/)
  assert.match(output, /5 requests\/hour/)
  assert.match(output, /Arata Kaizaki/)
  assert.match(output, /next.*--anime ReLIFE/u)
  assert.match(output, /character.*--character 'Arata Kaizaki'/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders AnimeNewsNetwork titles without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'animenewsnetwork.titles',
      api: {
        provider: 'anime-news-network',
        endpoint: 'GET /encyclopedia/reports.xml?id=155&type=anime',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: '1 request/second/IP',
        attribution: 'Anime News Network source/link attribution required by provider terms.',
      },
      query: { reportId: 155, type: 'anime', skip: 0, limit: 2, namePrefix: 'Z' },
      pagination: { skipped: 0, listed: 2, nextSkip: 2 },
      count: 2,
      titles: [
        { id: 38280, type: 'TV', name: 'ZERO RISE', precision: 'TV', url: 'https://www.animenewsnetwork.com/encyclopedia/anime.php?id=38280' },
        { id: 34508, type: 'movie', name: 'Zombie Land Saga: Yumeginga Paradise', precision: 'movie', vintage: '2025-10-24', url: 'https://www.animenewsnetwork.com/encyclopedia/anime.php?id=34508' },
      ],
    }, 'text'),
  )

  assert.match(output, /AnimeNewsNetwork Titles/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /namePrefix=Z/)
  assert.match(output, /ZERO RISE/)
  assert.match(output, /Anime News Network source\/link attribution/)
  assert.match(output, /next.*--skip 2 --limit 2 --name-prefix Z/u)
  assert.match(output, /search.*--name-prefix Z --limit 2/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders CatFact Ninja facts without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'catfact.facts',
      api: {
        provider: 'catfact-ninja',
        endpoint: 'GET /facts',
        authentication: 'none',
        usesBrowserClickstream: false,
      },
      query: { limit: 2 },
      pagination: { currentPage: 1, lastPage: 1, perPage: 2, total: 2 },
      facts: [
        { fact: 'Cats walk on their toes.', length: 24 },
      ],
    }, 'text'),
  )

  assert.match(output, /CatFact Ninja Facts/)
  assert.match(output, /no auth/)
  assert.match(output, /Cats walk on their toes/)
  assert.match(output, /next.*catfact\.facts/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders Hebcal conversion and calendar without fallback JSON', () => {
  const convertOutput = captureStdout(() =>
    printResult({
      kind: 'hebcal.convert',
      api: {
        provider: 'hebcal',
        endpoint: 'GET /converter',
        authentication: 'none',
        usesBrowserClickstream: false,
        rateLimit: 'More than 90 requests per 10-second window may be throttled or blocked.',
      },
      query: { date: '2026-05-03', strict: true },
      conversion: {
        gregorianDate: '2026-05-03',
        hebrewDate: '5786 Iyyar 16',
        hebrewText: 'ט״ז בְּאִיָיר תשפ״ו',
        events: ['Pesach Sheni'],
        sourceUrl: 'https://www.hebcal.com/converter?cfg=json&date=2026-05-03&g2h=1',
      },
    }, 'text'),
  )

  assert.match(convertOutput, /Hebcal Date Conversion/)
  assert.match(convertOutput, /open REST API only · no auth/)
  assert.match(convertOutput, /2026-05-03/)
  assert.match(convertOutput, /Pesach Sheni/)
  assert.match(convertOutput, /week.*hebcal\.calendar.*--start 2026-05-03 --days 7/u)
  assert.match(convertOutput, /israel.*--israel true/u)
  assert.doesNotMatch(convertOutput, /^\{/)

  const calendarOutput = captureStdout(() =>
    printResult({
      kind: 'hebcal.calendar',
      api: {
        provider: 'hebcal',
        endpoint: 'GET /hebcal',
        authentication: 'none',
        usesBrowserClickstream: false,
        calendarDaysCap: 180,
        rateLimit: 'More than 90 requests per 10-second window may be throttled or blocked.',
      },
      query: { start: '2026-05-03', end: '2026-05-10', days: 8, israel: false },
      count: 2,
      events: [
        {
          title: 'Pesach Sheni',
          date: '2026-05-01',
          category: 'holiday',
          subcat: 'minor',
          hebrew: 'פסח שני',
          link: 'https://www.hebcal.com/holidays/pesach-sheni-2026',
        },
      ],
    }, 'text'),
  )

  assert.match(calendarOutput, /Hebcal Jewish Calendar/)
  assert.match(calendarOutput, /cap 180/)
  assert.match(calendarOutput, /Pesach Sheni/)
  assert.match(calendarOutput, /no Chrome clickstream/)
  assert.match(calendarOutput, /convert.*hebcal\.convert.*--date 2026-05-03/u)
  assert.match(calendarOutput, /next range.*--start 2026-05-11 --days 8/u)
  assert.match(calendarOutput, /prev range.*--start 2026-04-25 --days 8/u)
  assert.doesNotMatch(calendarOutput, /^\{/)
})

test('text output renders Nager.Date countries and holidays without fallback JSON', () => {
  const countriesOutput = captureStdout(() =>
    printResult({
      kind: 'nagerdate.countries',
      api: {
        provider: 'nagerdate',
        endpoint: 'GET /availablecountries',
        authentication: 'none',
        usesBrowserClickstream: false,
        noRateLimitClaim: true,
        countryLimitCap: 250,
        defaultCountryCode: 'US',
        defaultCountryLimit: 250,
        defaultYear: 2026,
      },
      query: { query: 'united', limit: 250 },
      count: 1,
      countries: [{ countryCode: 'US', name: 'United States' }],
    }, 'text'),
  )

  assert.match(countriesOutput, /Nager\.Date Countries/)
  assert.match(countriesOutput, /open REST API only · no auth/)
  assert.match(countriesOutput, /US · United States/)
  assert.match(countriesOutput, /provider advertises no rate limit/)
  assert.match(countriesOutput, /next.*nagerdate\.holidays.*--country-code US --year 2026/u)
  assert.doesNotMatch(countriesOutput, /^\{/)

  const holidaysOutput = captureStdout(() =>
    printResult({
      kind: 'nagerdate.holidays',
      api: {
        provider: 'nagerdate',
        endpoint: 'GET /publicholidays/{year}/{countryCode}',
        authentication: 'none',
        usesBrowserClickstream: false,
        noRateLimitClaim: true,
        defaultCountryCode: 'US',
        defaultYear: 2026,
      },
      query: { year: 2026, countryCode: 'US' },
      count: 1,
      holidays: [
        {
          date: '2026-01-01',
          localName: "New Year's Day",
          name: "New Year's Day",
          countryCode: 'US',
          fixed: false,
          global: true,
          counties: [],
          types: ['Public', 'Bank'],
        },
      ],
    }, 'text'),
  )

  assert.match(holidaysOutput, /Nager\.Date Public Holidays/)
  assert.match(holidaysOutput, /New Year's Day/)
  assert.match(holidaysOutput, /no Chrome clickstream/)
  assert.match(holidaysOutput, /again.*nagerdate\.holidays.*--country-code US --year 2026/u)
  assert.match(holidaysOutput, /next year.*nagerdate\.holidays.*--year 2027/u)
  assert.doesNotMatch(holidaysOutput, /^\{/)
})

test('text output renders UK Bank Holidays without fallback JSON', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'ukbankholidays.events',
      api: {
        provider: 'uk-bank-holidays',
        endpoint: 'GET /bank-holidays.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultYear: 2026,
        defaultLimit: 100,
        limitCap: 200,
      },
      query: { division: 'england-and-wales', year: 2026, limit: 20 },
      count: 2,
      totalEvents: 4,
      divisions: [{ division: 'england-and-wales', count: 2 }],
      events: [
        {
          division: 'england-and-wales',
          title: 'New Year’s Day',
          date: '2026-01-01',
          notes: '',
          bunting: true,
        },
        {
          division: 'england-and-wales',
          title: 'Good Friday',
          date: '2026-04-03',
          notes: '',
          bunting: false,
        },
      ],
    }, 'text'),
  )

  assert.match(output, /UK Bank Holidays/)
  assert.match(output, /open REST API only · no auth/)
  assert.match(output, /2026-01-01/)
  assert.match(output, /New Year’s Day/)
  assert.match(output, /no Chrome clickstream/)
  assert.match(output, /2 shown of 4 event\(s\) · limit 20 · cap 200/u)
  assert.match(output, /again.*ukbankholidays\.events.*--year 2026 --division england-and-wales --limit 20/u)
  assert.match(output, /next year.*--year 2027 --division england-and-wales --limit 20/u)
  assert.match(output, /all divisions.*--year 2026 --limit 20/u)
  assert.match(output, /upcoming.*--year 2026 --division england-and-wales --upcoming true --limit 20/u)
  assert.doesNotMatch(output, /^\{/)
})

test('text output renders UK Bank Holidays empty-state remediation dynamically', () => {
  const output = captureStdout(() =>
    printResult({
      kind: 'ukbankholidays.events',
      api: {
        provider: 'uk-bank-holidays',
        endpoint: 'GET /bank-holidays.json',
        authentication: 'none',
        usesBrowserClickstream: false,
        defaultYear: 2026,
        defaultLimit: 100,
        limitCap: 200,
      },
      query: { division: 'northern-ireland', year: 1900, upcoming: true, limit: 20 },
      count: 0,
      totalEvents: 0,
      divisions: [],
      events: [],
    }, 'text'),
  )

  assert.match(output, /No UK bank holidays matched this query\./)
  assert.match(output, /current year.*--year 2026 --division northern-ireland --limit 20/u)
  assert.match(output, /same year.*--year 1900 --division northern-ireland --limit 20/u)
  assert.match(output, /all divisions.*--year 2026 --limit 20/u)
})

test('text output renders Namedays Calendar date and name without fallback JSON', () => {
  const dateOutput = captureStdout(() =>
    printResult({
      kind: 'namedays.date',
      api: {
        provider: 'namedays',
        endpoint: 'GET /V2/date',
        authentication: 'none',
        usesBrowserClickstream: false,
        docs: 'https://nameday.abalin.net/docs/api',
        defaultDateLabel: 'today',
        defaultDay: 6,
        defaultMonth: 5,
        defaultCountryLimit: 30,
        countryLimitCap: 30,
      },
      query: { day: 6, month: 5, country: 'us', limit: 30 },
      count: 1,
      totalCountries: 1,
      countries: [{ country: 'us', names: 'Morna, Mya, Myah, Myrna, Orson, Prudence' }],
    }, 'text'),
  )

  assert.match(dateOutput, /Namedays Calendar Date/)
  assert.match(dateOutput, /open REST API only · no auth/)
  assert.match(dateOutput, /us · Morna, Mya/)
  assert.match(dateOutput, /search.*namedays\.name.*--name Morna --country us/u)
  assert.match(dateOutput, /prev day.*--day 5 --month 5 --country us --limit 30/u)
  assert.match(dateOutput, /next day.*--day 7 --month 5 --country us --limit 30/u)
  assert.doesNotMatch(dateOutput, /^\{/)

  const nameOutput = captureStdout(() =>
    printResult({
      kind: 'namedays.name',
      api: {
        provider: 'namedays',
        endpoint: 'POST /V2/getname',
        authentication: 'none',
        usesBrowserClickstream: false,
        docs: 'https://nameday.abalin.net/docs/api',
        defaultDateLabel: 'today',
        defaultDay: 6,
        defaultMonth: 5,
        matchLimitCap: 50,
      },
      query: { name: 'Prudence', limit: 20 },
      count: 1,
      matches: [{ country: 'fr', day: 6, month: 5, names: 'Prudence' }],
    }, 'text'),
  )

  assert.match(nameOutput, /Namedays Calendar Name Search/)
  assert.match(nameOutput, /5\/6/)
  assert.match(nameOutput, /Prudence/)
  assert.match(nameOutput, /date.*namedays\.date.*--day 6 --month 5 --country fr/u)
  assert.match(nameOutput, /today.*namedays\.date.*--day 6 --month 5/u)
  assert.match(nameOutput, /same country.*namedays\.name.*--name Prudence --country fr/u)
  assert.match(nameOutput, /no Chrome clickstream/)
  assert.doesNotMatch(nameOutput, /^\{/)
})

test('public API text renderers expose required TUI boundary markers', () => {
  for (const operation of defaultPublicApiRegistry.operations) {
    const output = captureStdout(() => printResult(createRendererFixture(operation.providerId, operation.resultKind), 'text'))
    assert.doesNotMatch(output, /^\{/, `${operation.id} should not fall back to JSON in text mode`)
    assert.match(output, /mode /, `${operation.id} should render storage/execution mode`)
    assert.match(output, /no Chrome clickstream/, `${operation.id} should render the clickstream boundary`)
    const provider = defaultPublicApiRegistry.manifests.find(manifest => manifest.id === operation.providerId)
    if (provider?.auth.mode === 'none') {
      assert.match(output, /no auth/, `${operation.id} should render no-auth boundary`)
    } else if (provider?.auth.mode === 'api-key') {
      assert.match(output, /API key|API token|api-key|access_key|CURRENTS_API_KEY/u, `${operation.id} should render keyed-auth boundary`)
    }
    assert.match(output, /query/, `${operation.id} should render query summary`)
  }
})

test('CLI error output surfaces news flash failure details with redaction', () => {
  const output = captureStderr(() => printError({
    code: 'OPEN_API_FAILED',
    message: 'Cannot install news flash monitor because the required smoke run failed.',
    details: {
      provider: 'spaceflightnews',
      checks: [{ name: 'Claude credentials', ok: false, detail: 'ANTHROPIC_API_KEY=sk-secret-value' }],
      smokeRun: {
        exitCode: 1,
        stderrTail: 'ANTHROPIC_BASE_URL=https://secret.example/v1 Bearer sk-secret-value',
        stdoutTail: 'retry with NEWSAPI_API_KEY=abc123',
      },
    },
  }))

  assert.match(output, /Failed Checks/)
  assert.match(output, /Claude credentials/)
  assert.match(output, /Smoke Run/)
  assert.match(output, /news-flash doctor --provider spaceflightnews/)
  assert.match(output, /NEWSAPI_API_KEY=<redacted>/)
  assert.doesNotMatch(output, /sk-secret-value/)
  assert.doesNotMatch(output, /https:\/\/secret\.example/)
})

function captureStdout(run: () => void): string {
  const originalWrite = process.stdout.write
  let output = ''
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += String(chunk)
    return true
  }) as typeof process.stdout.write

  try {
    run()
    return output
  } finally {
    process.stdout.write = originalWrite
  }
}

function captureStderr(run: () => void): string {
  const originalWrite = process.stderr.write
  let output = ''
  process.stderr.write = ((chunk: string | Uint8Array) => {
    output += String(chunk)
    return true
  }) as typeof process.stderr.write

  try {
    run()
    return output
  } finally {
    process.stderr.write = originalWrite
  }
}

function createRendererFixture(providerId: string, resultKind: string): Record<string, unknown> {
  return {
    kind: resultKind,
    api: {
      provider: providerId,
      endpoint: 'GET /fixture',
      authentication: providerId === 'mediastack' ? 'api-key' : 'none',
      usesBrowserClickstream: false,
      transport: providerId === 'colormind' ? 'http-only' : 'https',
      configured: providerId !== 'mediastack',
      freePlanLimit: 100,
      documentedDefaultLimit: 100,
      documentedMaximumLimit: 100,
      documentedMaximumResult: 100,
      documentedMaximumRows: 100,
      documentedPageSize: 'fixture',
      documentedPagination: 'fixture',
      noRateLimitClaim: true,
      limitCap: 100,
      cliLimitCap: 100,
      countryLimitCap: 250,
      countryLimit: 30,
      matchLimitCap: 50,
      rateLimit: 'fixture',
      docs: 'https://example.com/docs',
    },
    query: {
      q: 'fixture',
      query: 'fixture',
      name: 'John',
      day: 3,
      month: 5,
      limit: 1,
      count: 1,
      page: 1,
      reference: 'John 3:16',
      translation: 'web',
      countryCode: 'US',
      country: 'us',
      year: 2026,
      operation: 'hex2hsl',
      value: 'FFFFFF',
    },
    storage: { mode: 'online', persisted: false },
    pagination: { page: 1, currentPage: 1, totalPages: 1, total: 0, count: 0, limit: 1, offset: 0, pageSize: 1, itemsPerPage: 1, totalResults: 0 },
    rateLimit: { limit: '1', interval: '1s', concurrencyLimit: '1', apiPool: 'public', remaining: '1', reset: '1' },
    count: 0,
    totalBreeds: 0,
    totalMatched: 0,
    totalVerses: 0,
    colors: [],
    models: [],
    facts: [],
    breeds: [],
    imageUrls: [],
    subBreeds: [],
    books: [],
    countries: [],
    holidays: [],
    events: [],
    divisions: [],
    providers: [],
    apis: [],
    metrics: { numSpecs: 0, numAPIs: 0, numEndpoints: 0 },
    datasets: [],
    records: [{ Minutes1UTC: '2026-05-03T19:15:00', CO2Emission: 114.37, ProductionGe100MW: 708.59, ProductionLt100MW: 467.9, SolarPower: 7.23, OffshoreWindPower: 374.96, OnshoreWindPower: 154.3, Exchange_Sum: 2310.19, HourUTC: '2025-09-30T21:00:00', PriceArea: 'DK1', SpotPriceDKK: 690.7, SpotPriceEUR: 92.54 }],
    libraries: [],
    library: { name: 'fixture', latest: 'https://example.com/latest.js', assets: [] },
    files: [],
    trace: { host: 'fixture', ip: '203.0.113.10', colo: 'PDX' },
    fields: { h: 'fixture' },
    status: { indicator: 'none', description: 'All Systems Operational' },
    totals: { components: 0, incidents: 0, scheduledMaintenances: 0 },
    activeIncidents: [],
    scheduledMaintenances: [],
    components: [],
    matches: [],
    works: [],
    articles: [],
    sources: [],
    company: {
      id: '5eb75edc42fea42237d7f3ed',
      name: 'SpaceX',
      founder: 'Elon Musk',
      founded: 2002,
      employees: 8000,
      vehicles: 3,
      launchSites: 3,
      testSites: 1,
      ceo: 'Elon Musk',
      cto: 'Elon Musk',
      coo: 'Gwynne Shotwell',
      valuation: 52000000000,
      summary: 'SpaceX designs, manufactures and launches advanced rockets.',
      headquarters: { address: 'Rocket Road', city: 'Hawthorne', state: 'CA' },
      links: { website: 'https://www.spacex.com/' },
    },
    rockets: [],
    launchpads: [],
    launches: [],
    series: [],
    satellites: [],
    satellite: {
      satelliteId: 25544,
      name: 'ISS (ZARYA)',
      date: '2026-05-10T17:09:53+00:00',
      line1: '1 25544U 98067A   26130.71520280  .00006215  00000+0  12011-3 0  9998',
      line2: '2 25544  51.6310 125.5915 0007454  44.6609 315.4979 15.49176858565946',
      orbital: {
        inclinationDegrees: 51.631,
        rightAscensionDegrees: 125.5915,
        eccentricity: 0.0007454,
        meanMotionRevsPerDay: 15.49176858,
      },
    },
    times: {},
    chapters: [],
    verses: [],
    assets: [],
    films: [],
    species: [],
    occurrences: [],
    emojis: [],
    departments: [],
    discussions: [],
    hotspots: [],
    validation: {
      format: true,
      domain: 'example.com',
      disposable: false,
      dns: true,
      confidence: 0,
      signals: [],
      domainInfo: { tld: 'com', isSubdomain: false, parentDomain: null },
      mxInfo: [],
      role: false,
      free: false,
    },
    tags: [],
    palettes: [],
    artwork: [],
    artworks: [],
    fact: { fact: 'fixture', length: 7 },
    quote: { content: 'fixture', anime: { name: 'Fixture' }, character: { name: 'Fixture' } },
    result: { status: 200, imageUrl: 'https://example.com/dog.jpg', target: 'gmail.com', disposable: false },
    floof: { image: 'https://example.com/fox.jpg', link: 'https://example.com' },
    dog: { url: 'https://example.com/dog.jpg' },
    cat: { id: 'fixture', tags: [], url: 'https://example.com/cat.jpg' },
    book: { id: 1, title: 'Fixture', authors: [], languages: [], summaries: [], subjects: [], bookshelves: [], copyright: null, mediaType: 'Text', downloadCount: 0, formats: {} },
    work: { doi: '10.1000/fixture', title: 'Fixture', authors: [], url: 'https://doi.org/10.1000/fixture' },
    object: { objectId: 1, title: 'Fixture' },
    color: { hex: '#FFFFFF', rgb: 'rgb(255,255,255)', hsl: 'hsl(0,0%,100%)' },
    translation: { id: 'web', name: 'World English Bible' },
    verse: { text: 'Fixture', bookName: 'John', chapter: 3, verse: 16 },
    chapter: { id: 1, name: 'Fixture' },
    prediction: { name: 'fixture', age: 1, count: 1 },
    reference: 'John 3:16',
  }
}
