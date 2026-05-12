import assert from 'node:assert/strict'
import test from 'node:test'
import { handleJsonRpcLine } from '../../src/interfaces/rpc/jsonRpcServer.js'
import { createSiteRegistry } from '../../src/infrastructure/site/siteRegistry.js'
import type { JsonRpcServerOptions } from '../../src/interfaces/rpc/jsonRpcServer.js'

const options: JsonRpcServerOptions = {
  packageName: 'public-apis-cli',
  packageVersion: '0.1.0',
  registry: createSiteRegistry(),
  endpointCatalog: {
    records: [
      {
        id: 'example-api',
        method: 'GET',
        urlPattern: 'https://example.com/api/*',
        category: 'api',
        evidenceStatus: 'observed',
        description: 'Example endpoint catalog record.',
      },
    ],
  },
  browserOptions: {
    headless: true,
    timeoutMs: 1_000,
  },
}

const requiredAuthOptions: JsonRpcServerOptions = {
  ...options,
  registry: createSiteRegistry({
    defaultSiteId: 'private',
    authProfiles: [
      {
        id: 'reviewer',
        label: 'Reviewer',
      },
    ],
    sites: [
      {
        id: 'private',
        name: 'Private',
        baseUrl: 'https://example.com/private',
        selectors: { ready: 'body' },
        auth: { mode: 'required', profileId: 'reviewer' },
        roles: ['primary'],
      },
    ],
    workflows: [],
  }),
}

test('system.describe returns JSON-RPC result with registry details', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'system.describe' }),
  )

  assert.equal(readProperty(response, 'jsonrpc'), '2.0')
  assert.equal(readProperty(response, 'id'), 1)
  assert.equal(readProperty(response, 'result.name'), 'public-apis-cli')
  assert.equal(readProperty(response, 'result.site.id'), 'public-apis-tui')
  assert.equal(readProperty(response, 'result.registry.defaultSiteId'), 'public-apis-tui')
  assert.equal(readProperty(response, 'result.browser.supportsProfileConsistency'), true)
  assert.equal(readProperty(response, 'result.browser.supportsInteractionPacing'), true)
  assert.equal(readProperty(response, 'result.browser.supportsSessionImportExport'), true)
  assert.equal(readProperty(response, 'result.browser.supportsDedicatedManagedAuthProfiles'), true)
  assert.equal(readProperty(response, 'result.browser.supportsProfileClone'), true)
  assert.equal(readProperty(response, 'result.browser.acceptsManagedSession'), true)
  assert.equal(readProperty(response, 'result.browser.supportsManagedSessionList'), true)
  assert.equal(readProperty(response, 'result.browser.supportsManagedSessionStop'), true)
  assert.equal(readProperty(response, 'result.browser.defaultsCommandRunsHeadless'), true)
  assert.equal(readProperty(response, 'result.browser.checksRequiredAuthProfileReadiness'), true)
  assert.equal(readProperty(response, 'result.browser.usesUnifiedProfileRoot'), true)
  assert.equal(readProperty(response, 'result.browser.hardensManagedProfileDirectories'), true)
})

test('site.list returns auth-aware site registry', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'site.list' }),
  )

  assert.equal(readProperty(response, 'result.defaultSiteId'), 'public-apis-tui')
  assert.equal(readProperty(response, 'result.sites.0.auth.mode'), 'none')
})

test('workflow.list returns configured workflow plans', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'workflow.list' }),
  )

  assert.equal(readProperty(response, 'result.workflows.0.id'), 'mediastack-open-api-start')
})

test('publicApis.list returns provider registry metadata', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 31, method: 'publicApis.list' }),
  )

  assert.equal(readProperty(response, 'result.kind'), 'publicApis.list')
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'agify'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'arbeitnow'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'apisguru'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'artic'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'cataas'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'mediastack'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'currents'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'catfact-ninja'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'cdnjs'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'chainlink'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'chroniclingamerica'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'cloudflare-trace'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'colormind'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'digitalocean-status'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'disify'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'dogceo'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'emojihub'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'free-dictionary'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'energidataservice'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'epa'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'genderize'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'hellosalut'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'hongkonggeodata'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'ibge'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'ip-api'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'ipgeo'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'ipinfo'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'gnews'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'indianpincode'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'postalpincode'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'helium'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'httpbin'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'icanhazip'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'icsdb'), true)
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'isdayoff',
    ),
    true,
  )
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'idigbio'), true)
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'inspirehep',
    ),
    true,
  )
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'iseven'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'isro'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'itis'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'ipfast'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'ipify'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'istanbulopendata'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'nationalize'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'jsdelivr'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'kickbox'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'marketaux'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'nytimes'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'newsapi'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'npm-registry'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'uk-bank-holidays'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'usercheck'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'metmuseum'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'spaceflightnews'), true)
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'spacex',
    ),
    true,
  )
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'slf'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'steem'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'viacep'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'zippopotam-us'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'ziptastic'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'wiktionary'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'xcolors'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'czechnationalbank'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'economiaawesome'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'frankfurter'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'nbp'), true)
  assert.equal((readProperty(response, 'result.providers') as Array<{ id: string }>).some(provider => provider.id === 'vatcomply'), true)
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'runyankolebible',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'share',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'tle',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'urantia',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'usgsearthquake',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'usgswater',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'vedicsociety',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.providers') as Array<{ id: string }>).some(
      provider => provider.id === 'worldbank',
    ),
    true,
  )
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'agify.age'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'arbeitnow.jobs'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'apisguru.providers'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'apisguru.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'apisguru.metrics'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'cataas.cats'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'mediastack.news'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'currents.news'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'czechnationalbank.rates'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'economiaawesome.latest'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'economiaawesome.daily'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'frankfurter.currencies'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'frankfurter.rates'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'frankfurter.convert'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'nbp.tables'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'nbp.history'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'vatcomply.rates'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'vatcomply.vatRates'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'vatcomply.geolocate'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'vatcomply.vat'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'currencyapi.currencies'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'currencyapi.rates'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'catfact.facts'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'cdnjs.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'cdnjs.library'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'cdnjs.version'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'chainlink.feeds'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'chroniclingamerica.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'cloudflaretrace.trace'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'colormind.palette'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'colormind.models'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'digitaloceanstatus.summary'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'digitaloceanstatus.incidents'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'digitaloceanstatus.maintenances'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'disify.email'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'disify.domain'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'dogceo.images'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'energidataservice.rightnow'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'energidataservice.elspotprices'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'epa.uvHourly'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'epa.uvDaily'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'freedictionary.define'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'genderize.predict'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'hellosalut.translate'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'hongkonggeodata.locationSearch'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'ibge.states'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'ibge.municipalities'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'ipapi.lookup'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'ipgeo.lookup'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'ipinfo.lookup'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'nominatim.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'nominatim.reverse'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'opentopodata.lookup'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'pinballmap.regions'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'pinballmap.locations'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'postalcodes.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'postalpincode.pincode'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'postalpincode.postOffice'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'slf.lookup'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'viacep.lookup'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'viacep.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'zippopotam-us.lookup'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'zippopotam-us.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'ziptastic.lookup'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'gnews.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'gnews.headlines'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'indianpincode.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'emojihub.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'helium.hotspots'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'httpbin.get'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'httpbin.uuid'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'icanhazip.ip'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'icsdb.calendars'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'icsdb.events'), true)
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'isdayoff.day',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'isdayoff.range',
    ),
    true,
  )
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'idigbio.records'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'idigbio.media'), true)
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'inspirehep.search',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'inspirehep.record',
    ),
    true,
  )
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'iseven.check'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'isro.catalog'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'wizardworld.catalog'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'worldbank.countries'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'worldbank.indicator'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'itis.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'itis.record'), true)
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'launchlibrary2.launches',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'launchlibrary2.events',
    ),
    true,
  )
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'ipfast.lookup'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'ipify.ip'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'istanbulopendata.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'istanbulopendata.records'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'artic.artworks'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'jsdelivr.metadata'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'jsdelivr.stats'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'kickbox.disposable'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'marketaux.news'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'nytimes.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'nytimes.topStories'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'newsapi.headlines'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'newsapi.everything'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'npmregistry.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'npmregistry.package'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'ukbankholidays.events'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'usercheck.email'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'metmuseum.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'minorplanetcenter.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'nasa.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'nasa.asset'), true)
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'noctua.stats',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'noctua.source',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'rigveda.book',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'rigveda.search',
    ),
    true,
  )
  for (const operationId of [
    'vedicsociety.words',
    'vedicsociety.descriptions',
    'vedicsociety.category',
  ]) {
    assert.equal(
      (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
        operation => operation.id === operationId,
      ),
      true,
    )
  }
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'runyankolebible.books',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'runyankolebible.verse',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'runyankolebible.chapter',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'runyankolebible.search',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'runyankolebible.random',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'share.search',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
      operation => operation.id === 'share.sources',
    ),
    true,
  )
  for (const operationId of ['tle.search', 'tle.satellite']) {
    assert.equal(
      (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
        operation => operation.id === operationId,
      ),
      true,
    )
  }
  for (const operationId of [
    'urantia.toc',
    'urantia.paper',
    'urantia.paragraph',
    'urantia.search',
  ]) {
    assert.equal(
      (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
        operation => operation.id === operationId,
      ),
      true,
    )
  }
  for (const operationId of [
    'usgsearthquake.search',
    'usgsearthquake.event',
  ]) {
    assert.equal(
      (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
        operation => operation.id === operationId,
      ),
      true,
    )
  }
  for (const operationId of [
    'usgswater.instantaneous',
    'usgswater.daily',
  ]) {
    assert.equal(
      (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
        operation => operation.id === operationId,
      ),
      true,
    )
  }
  for (const operationId of [
    'spacex.company',
    'spacex.rockets',
    'spacex.launchpads',
    'spacex.launches',
  ]) {
    assert.equal(
      (readProperty(response, 'result.operations') as Array<{ id: string }>).some(
        operation => operation.id === operationId,
      ),
      true,
    )
  }
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'nationalize.predict'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'phpnoise.generate'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'quickchart.render'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'spaceflightnews.articles'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'steem.discussions'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'steem.thread'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'opengovernmentusa.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'opengovernmentusa.organizations'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'opengovernmentusa.keywords'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'usaspending.awards'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'usaspending.overTime'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'usaspending.agencies'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'wiktionary.search'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'wiktionary.extract'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'xcolors.random'), true)
  assert.equal((readProperty(response, 'result.operations') as Array<{ id: string }>).some(operation => operation.id === 'xcolors.convert'), true)
})

test('publicApis.info returns one provider and endpoint metadata', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 32, method: 'publicApis.info', params: { id: 'mediastack' } }),
  )

  assert.equal(readProperty(response, 'result.kind'), 'publicApis.info')
  assert.equal(readProperty(response, 'result.provider.id'), 'mediastack')
  assert.equal(readProperty(response, 'result.endpoints.0.id'), 'mediastack-news')
  assert.equal(readProperty(response, 'result.operations.0.cli.exposedOptionCount'), 10)
  assert.equal(readProperty(response, 'result.operations.0.cli.options.0.exposure'), 'advanced')
  assert.equal(readProperty(response, 'result.operations.0.cli.options.0.group'), 'authentication')
})

test('publicApis.info returns CatFact Ninja provider metadata', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 321, method: 'publicApis.info', params: { id: 'catfact.facts' } }),
  )

  assert.equal(readProperty(response, 'result.kind'), 'publicApis.info')
  assert.equal(readProperty(response, 'result.provider.id'), 'catfact-ninja')
  assert.equal(readProperty(response, 'result.provider.auth.mode'), 'none')
  assert.equal(readProperty(response, 'result.endpoints.1.id'), 'catfact-ninja-facts')
})

test('publicApis.config returns provider persistence config paths', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 33, method: 'publicApis.config', params: { providerId: 'mediastack' } }),
  )

  assert.equal(readProperty(response, 'result.kind'), 'publicApis.config')
  assert.equal(readProperty(response, 'result.providerId'), 'mediastack')
  assert.equal(readProperty(response, 'result.config.persistence.defaultMode'), 'online')
})

test('publicApis.cacheList returns cache result shape', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({
      jsonrpc: '2.0',
      id: 34,
      method: 'publicApis.cacheList',
      params: { providerOrOperation: 'mediastack.news', limit: 5 },
    }),
  )

  assert.equal(readProperty(response, 'result.kind'), 'publicApis.cache.list')
  assert.equal(readProperty(response, 'result.providerId'), 'mediastack')
  assert.equal(readProperty(response, 'result.operationId'), 'mediastack.news')
})

test('lanyard.presence is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response(JSON.stringify({
      success: true,
      data: {
        discord_user: { id: '94490510688792576', username: 'phin', display_name: 'Phineas', bot: false },
        activities: [{ id: 'activity-1', name: 'Visual Studio Code', type: 0 }],
        discord_status: 'dnd',
        active_on_discord_web: false,
        active_on_discord_desktop: true,
        active_on_discord_mobile: false,
        active_on_discord_embedded: false,
        active_on_discord_vr: false,
        listening_to_spotify: false,
        spotify: null,
        kv: { location: 'Tokyo' },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 815, method: 'lanyard.presence', params: { userId: '94490510688792576' } }))
    assert.equal(readProperty(response, 'result.kind'), 'lanyard.presence')
    assert.equal(readProperty(response, 'result.api.provider'), 'lanyard')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.presence.discordUser.username'), 'phin')
    assert.equal(requestedUrl, 'https://api.lanyard.rest/v1/users/94490510688792576')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bcferries.routes is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response(JSON.stringify({
      routes: [{ routeCode: 'HSBNAN', fromTerminalCode: 'HSB', toTerminalCode: 'NAN', sailingDuration: '1:40', sailings: [{ time: '6:15 am', arrivalTime: '7:55 am', sailingStatus: 'current', fill: 12, carFill: 10, vesselName: 'Queen of Oak Bay' }] }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 816, method: 'bcferries.routes', params: { type: 'capacity', routeCode: 'HSBNAN', limit: 1 } }))
    assert.equal(readProperty(response, 'result.kind'), 'bcferries.routes')
    assert.equal(readProperty(response, 'result.api.provider'), 'bcferries')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.routes.0.routeCode'), 'HSBNAN')
    assert.equal(requestedUrl, 'https://bcferriesapi.ca/v2/capacity/')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('churchcalendar RPC exposes no-auth operations', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  const dayFixture = {
    date: '2026-05-10',
    season: 'easter',
    season_week: 6,
    weekday: 'sunday',
    celebrations: [{ title: 'Sixth Sunday of Easter', colour: 'white' }],
  }
  globalThis.fetch = (async input => {
    const url = String(input)
    requestedUrls.push(url)
    const body = url.endsWith('/2026/5')
      ? JSON.stringify([dayFixture])
      : JSON.stringify(dayFixture)
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const day = await handleJsonRpcLine(options, JSON.stringify({
      jsonrpc: '2.0',
      id: 823,
      method: 'churchcalendar.day',
      params: { date: '2026-05-10' },
    }))
    assert.equal(readProperty(day, 'result.kind'), 'churchcalendar.day')
    assert.equal(readProperty(day, 'result.api.provider'), 'churchcalendar')
    assert.equal(readProperty(day, 'result.api.authentication'), 'none')
    assert.equal(readProperty(day, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(day, 'result.day.celebrations.0.title'), (
      'Sixth Sunday of Easter'
    ))

    const month = await handleJsonRpcLine(options, JSON.stringify({
      jsonrpc: '2.0',
      id: 824,
      method: 'churchcalendar.month',
      params: { year: 2026, month: 5, limit: 1 },
    }))
    assert.equal(readProperty(month, 'result.kind'), 'churchcalendar.month')
    assert.equal(readProperty(month, 'result.count'), 1)
    assert.equal(readProperty(month, 'result.days.0.date'), '2026-05-10')
    assert.deepEqual(requestedUrls, [
      'http://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/2026/5/10',
      'http://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/2026/5',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})


test('opensky.states is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response(JSON.stringify({
      time: 1777907971,
      states: [['ad5621', 'ALFT    ', 'United States', 1777907970, 1777907970, -123.1804, 48.0225, 792.48, false, 65.29, 300.81, -1.63, null, 762, null, false, 0]],
    }), { status: 200, headers: { 'content-type': 'application/json', 'x-rate-limit-remaining': '399' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 817, method: 'opensky.states', params: { lamin: 45.8, lomin: -124, lamax: 49.2, lomax: -116, limit: 1 } }))
    assert.equal(readProperty(response, 'result.kind'), 'opensky.states')
    assert.equal(readProperty(response, 'result.api.provider'), 'opensky')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.aircraft.0.icao24'), 'ad5621')
    assert.match(requestedUrl, /^https:\/\/opensky-network\.org\/api\/states\/all\?/)
  } finally {
    globalThis.fetch = originalFetch
  }
})


test('lametro routes and stops are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    const url = new URL(String(input))
    if (url.pathname.includes('/route_stops/')) {
      return new Response(JSON.stringify([{ route_id: '720-13172', route_code: 720, day_type: 'weekday', stop_id: 1213, stop_sequence: 1, direction_id: 1, stop_name: 'Central / 6th', geometry: { type: 'Point', coordinates: [-118.239787, 34.039201] }, departure_times: "['03:43:00']", agency_id: 'LACMTA' }]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify([{ route_id: '720-13172', route_code: '720', route_short_name: '720', route_desc: 'DTWN LA - SM VIA WILSHIRE', route_type: 'bus', terminal_1: 'Downtown LA', terminal_2: 'Santa Monica', is_active: true }]), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const routes = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 818, method: 'lametro.routes', params: { query: 'wilshire', routeType: 'bus', limit: 1 } }))
    assert.equal(readProperty(routes, 'result.kind'), 'lametro.routes')
    assert.equal(readProperty(routes, 'result.api.provider'), 'lametro')
    assert.equal(readProperty(routes, 'result.api.authentication'), 'none')
    assert.equal(readProperty(routes, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(routes, 'result.routes.0.routeCode'), '720')

    const stops = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 819, method: 'lametro.stops', params: { routeCode: '720', dayType: 'all', limit: 1 } }))
    assert.equal(readProperty(stops, 'result.kind'), 'lametro.stops')
    assert.equal(readProperty(stops, 'result.stops.0.stopName'), 'Central / 6th')
    assert.equal(requestedUrls[0], 'https://api.metro.net/LACMTA/route_overview')
    assert.equal(requestedUrls[1], 'https://api.metro.net/LACMTA/route_stops/720?daytype=all')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('entur places and departures are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requests: Array<{ url: string; method?: string | undefined; body?: unknown }> = []
  globalThis.fetch = (async (input, init) => {
    requests.push({ url: String(input), method: init?.method, body: init?.body })
    const url = String(input)
    if (url.includes('/journey-planner/')) {
      return new Response(JSON.stringify({
        data: {
          stopPlace: {
            id: 'NSR:StopPlace:59872',
            name: 'Oslo S',
            estimatedCalls: [
              {
                expectedDepartureTime: '2026-05-05T10:00:00+02:00',
                actualDepartureTime: '2026-05-05T10:01:00+02:00',
                destinationDisplay: { frontText: 'Lillestrøm' },
                serviceJourney: { journeyPattern: { line: { publicCode: 'R12', name: 'Kongsberg - Eidsvoll', transportMode: 'rail' } } },
              },
            ],
          },
        },
      }), { status: 200, headers: { 'content-type': 'application/json', 'rate-limit-available': '98' } })
    }
    return new Response(JSON.stringify({
      features: [
        {
          geometry: { type: 'Point', coordinates: [10.751, 59.91] },
          properties: { id: 'NSR:StopPlace:59872', name: 'Oslo S', label: 'Oslo S, Oslo', layer: 'venue', locality: 'Oslo', country_a: 'NOR', mode: [{ rail: true }] },
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json', 'rate-limit-available': '99' } })
  }) as typeof fetch
  try {
    const places = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 820, method: 'entur.places', params: { text: 'Oslo S', size: 1 } }))
    assert.equal(readProperty(places, 'result.kind'), 'entur.places')
    assert.equal(readProperty(places, 'result.api.provider'), 'entur')
    assert.equal(readProperty(places, 'result.api.authentication'), 'none')
    assert.equal(readProperty(places, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(places, 'result.places.0.id'), 'NSR:StopPlace:59872')

    const departures = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 821, method: 'entur.departures', params: { stopPlaceId: 'NSR:StopPlace:59872', departures: 1 } }))
    assert.equal(readProperty(departures, 'result.kind'), 'entur.departures')
    assert.equal(readProperty(departures, 'result.api.provider'), 'entur')
    assert.equal(readProperty(departures, 'result.api.authentication'), 'none')
    assert.equal(readProperty(departures, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(departures, 'result.departures.0.lineCode'), 'R12')
    assert.match(requests[0]?.url ?? '', /^https:\/\/api\.entur\.io\/geocoder\/v1\/autocomplete\?/)
    assert.equal(requests[1]?.url, 'https://api.entur.io/journey-planner/v3/graphql')
    assert.equal(requests[1]?.method, 'POST')
    assert.match(String(requests[1]?.body ?? ''), /estimatedCalls/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('velib.stations is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    return new Response(JSON.stringify(String(input).includes('station_status')
      ? {
          lastUpdatedOther: 1777913999,
          ttl: 3600,
          data: { stations: [{ station_id: 213688169, num_bikes_available: 25, num_bikes_available_types: [{ mechanical: 20 }, { ebike: 5 }], num_docks_available: 9, is_installed: 1, is_returning: 1, is_renting: 1, last_reported: 1777910918, stationCode: '16107' }] },
        }
      : {
          lastUpdatedOther: 1777913998,
          ttl: 3600,
          data: { stations: [{ station_id: 213688169, stationCode: '16107', name: 'Benjamin Godard - Victor Hugo', lat: 48.865983, lon: 2.275725, capacity: 35 }] },
        }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 822, method: 'velib.stations', params: { query: 'Godard', minBikes: 1, limit: 1 } }))
    assert.equal(readProperty(response, 'result.kind'), 'velib.stations')
    assert.equal(readProperty(response, 'result.api.provider'), 'velib')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.stations.0.stationCode'), '16107')
    assert.deepEqual(requestedUrls, [
      'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_information.json',
      'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/station_status.json',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fipe operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    const url = String(input)
    if (url.endsWith('/anos/2014-3')) {
      return new Response(JSON.stringify({ TipoVeiculo: 1, Valor: 'R$ 86.907,00', Marca: 'VW - VolksWagen', Modelo: 'AMAROK High.CD 2.0 16V TDI 4x4 Dies. Aut', AnoModelo: 2014, Combustivel: 'Diesel', CodigoFipe: '005340-6', MesReferencia: 'maio de 2026', SiglaCombustivel: 'D' }), { status: 200, headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '500', 'x-ratelimit-remaining': '496' } })
    }
    if (url.endsWith('/anos')) {
      return new Response(JSON.stringify([{ codigo: '2022-3', nome: '2022 Diesel' }, { codigo: '2014-3', nome: '2014 Diesel' }]), { status: 200, headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '500', 'x-ratelimit-remaining': '497' } })
    }
    if (url.endsWith('/modelos')) {
      return new Response(JSON.stringify({ modelos: [{ codigo: 5940, nome: 'AMAROK High.CD 2.0 16V TDI 4x4 Dies. Aut' }] }), { status: 200, headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '500', 'x-ratelimit-remaining': '498' } })
    }
    return new Response(JSON.stringify([{ codigo: '59', nome: 'VW - VolksWagen' }]), { status: 200, headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '500', 'x-ratelimit-remaining': '499' } })
  }) as typeof fetch
  try {
    const brands = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 823, method: 'fipe.brands', params: { query: 'volks', limit: 1 } }))
    assert.equal(readProperty(brands, 'result.kind'), 'fipe.brands')
    assert.equal(readProperty(brands, 'result.api.provider'), 'fipe')
    assert.equal(readProperty(brands, 'result.api.authentication'), 'none')
    assert.equal(readProperty(brands, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(brands, 'result.items.0.code'), '59')

    const models = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 824, method: 'fipe.models', params: { brandCode: '59', limit: 1 } }))
    assert.equal(readProperty(models, 'result.kind'), 'fipe.models')
    assert.equal(readProperty(models, 'result.items.0.code'), '5940')

    const years = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 825, method: 'fipe.years', params: { brandCode: '59', modelCode: '5940', limit: 1 } }))
    assert.equal(readProperty(years, 'result.kind'), 'fipe.years')
    assert.equal(readProperty(years, 'result.items.0.code'), '2022-3')

    const price = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 826, method: 'fipe.price', params: { brandCode: '59', modelCode: '5940', yearCode: '2014-3' } }))
    assert.equal(readProperty(price, 'result.kind'), 'fipe.price')
    assert.equal(readProperty(price, 'result.price.fipeCode'), '005340-6')
    assert.deepEqual(requestedUrls, [
      'https://parallelum.com.br/fipe/api/v1/carros/marcas',
      'https://parallelum.com.br/fipe/api/v1/carros/marcas/59/modelos',
      'https://parallelum.com.br/fipe/api/v1/carros/marcas/59/modelos/5940/anos',
      'https://parallelum.com.br/fipe/api/v1/carros/marcas/59/modelos/5940/anos/2014-3',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('aviationweather METAR and TAF are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    return new Response(JSON.stringify(String(input).includes('/taf?')
      ? [{ icaoId: 'KSFO', issueTime: '2026-05-04T14:59:00.000Z', validTimeFrom: 1777906800, validTimeTo: 1778004000, rawTAF: 'TAF KSFO 041459Z 0415/0518 00000KT P6SM FEW009 SCT022', name: 'San Francisco Intl', fcsts: [{ timeFrom: 1777906800 }] }]
      : [{ icaoId: 'KSFO', receiptTime: '2026-05-04T17:00:10.914Z', obsTime: 1777913760, reportTime: '2026-05-04T17:00:00.000Z', temp: 15.6, dewp: 8.3, wdir: 300, wspd: 5, visib: '10+', altim: 1015.3, rawOb: 'METAR KSFO 041656Z 30005KT 10SM FEW009 BKN026 16/08 A2998', name: 'San Francisco Intl, CA, US', fltCat: 'MVFR' }]), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'max-age=90' } })
  }) as typeof fetch
  try {
    const metar = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 827, method: 'aviationweather.metar', params: { ids: 'ksfo', limit: 1 } }))
    assert.equal(readProperty(metar, 'result.kind'), 'aviationweather.metar')
    assert.equal(readProperty(metar, 'result.api.provider'), 'aviationweather')
    assert.equal(readProperty(metar, 'result.api.authentication'), 'none')
    assert.equal(readProperty(metar, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(metar, 'result.reports.0.icaoId'), 'KSFO')

    const taf = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 828, method: 'aviationweather.taf', params: { ids: 'ksfo', limit: 1 } }))
    assert.equal(readProperty(taf, 'result.kind'), 'aviationweather.taf')
    assert.equal(readProperty(taf, 'result.reports.0.forecastCount'), 1)
    assert.match(requestedUrls[0] ?? '', /^https:\/\/aviationweather\.gov\/api\/data\/metar\?/)
    assert.match(requestedUrls[1] ?? '', /^https:\/\/aviationweather\.gov\/api\/data\/taf\?/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('endpoint.list returns known endpoint catalog records', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'endpoint.list' }),
  )

  assert.equal(readProperty(response, 'result.endpoints.0.id'), 'example-api')
  assert.equal(readProperty(response, 'result.endpoints.0.evidenceStatus'), 'observed')
})

test('system.describe advertises endpoint observation surfaces', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'system.describe' }),
  )

  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('inspect-network'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('site.inspectNetwork'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('browser.sessionExport'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('browser.authLogin'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('browser list'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('mediastack news'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('apisguru search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('artic artworks'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('browser.sessionStop'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('mediastack.news'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('apisguru.metrics'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('artic.artworks'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('cataas cats'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('catfact facts'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('cdnjs search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('chainlink feeds'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('chroniclingamerica search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('cloudflaretrace trace'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('colormind palette'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('digitaloceanstatus summary'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('disify email'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('disify domain'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('dogceo images'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('energidataservice rightnow'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('energidataservice elspotprices'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('emojihub search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('econdb datasets'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('genderize predict'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('hellosalut translate'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('hongkonggeodata location-search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('ibge states'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('ibge municipalities'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('ipapi lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('ipgeo lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('ipinfo lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('gruenstromindex forecast'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('helium hotspots'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('httpdog status'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('httpbin get'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('icanhazip ip'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('ipfast lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('ipify ip'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('nominatim search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('nominatim reverse'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('opentopodata lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('pinballmap regions'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('pinballmap locations'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('postalcodes search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('slf lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('viacep lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('viacep search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('zippopotam-us lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('zippopotam-us search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('ziptastic lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('luchtmeetnet measurements'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('kickbox disposable'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('nationalize predict'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('nationalgrideso records'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('pm25opendata airbox'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('razorpayifsc lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('jsdelivr metadata'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('jsdelivr stats'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('meowfacts facts'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('czechnationalbank rates'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('economiaawesome latest'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('economiaawesome daily'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('frankfurter rates'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('nbp history'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('vatcomply vat-rates'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('randomdog files'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('randomfox floof'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('metmuseum search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes(
      'minorplanetcenter search',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('nasa search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('nasa asset'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('noctua stats'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('noctua source'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('rigveda book'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('rigveda search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes(
      'runyankolebible books',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes(
      'runyankolebible verse',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes(
      'runyankolebible chapter',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes(
      'runyankolebible search',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes(
      'runyankolebible random',
    ),
    true,
  )
  for (const command of [
    'vedicsociety words',
    'vedicsociety descriptions',
    'vedicsociety category',
  ]) {
    assert.equal(
      (readProperty(response, 'result.commands') as string[]).includes(command),
      true,
    )
  }
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('share search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('share sources'),
    true,
  )
  for (const command of [
    'urantia toc',
    'urantia paper',
    'urantia paragraph',
    'urantia search',
  ]) {
    assert.equal(
      (readProperty(response, 'result.commands') as string[]).includes(command),
      true,
    )
  }
  for (const command of [
    'usgsearthquake search',
    'usgsearthquake event',
  ]) {
    assert.equal(
      (readProperty(response, 'result.commands') as string[]).includes(command),
      true,
    )
  }
  for (const command of [
    'usgswater instantaneous',
    'usgswater daily',
  ]) {
    assert.equal(
      (readProperty(response, 'result.commands') as string[]).includes(command),
      true,
    )
  }
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('isdayoff day'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('isdayoff range'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('phpnoise generate'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('quickchart render'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('spaceflightnews articles'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('steem discussions'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('steem thread'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('usercheck email'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('xcolors random'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('cataas.cats'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('catfact.facts'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('cdnjs.version'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('chainlink.feeds'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('cloudflaretrace.trace'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('colormind.models'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('digitaloceanstatus.maintenances'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('disify.email'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('disify.domain'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('dogceo.images'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('energidataservice.rightnow'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('energidataservice.elspotprices'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('emojihub.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('foodstandardsagency.authorities'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('foodstandardsagency.establishments'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('freedictionary.define'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('genderize.predict'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('hellosalut.translate'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('hongkonggeodata.locationSearch'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('ibge.states'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('ibge.municipalities'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('ipapi.lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('ipgeo.lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('ipinfo.lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('indianpincode.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('postalpincode.pincode'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('postalpincode.postOffice'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('helium.hotspots'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('httpdog.status'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('httpbin.uuid'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('icanhazip.ip'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('ipfast.lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('ipify.ip'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('nominatim.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('nominatim.reverse'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('opentopodata.lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('pinballmap.regions'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('pinballmap.locations'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('postalcodes.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('slf.lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('viacep.lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('viacep.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('zippopotam-us.lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('zippopotam-us.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('ziptastic.lookup'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('istanbulopendata.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('istanbulopendata.records'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('kickbox.disposable'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('nationalize.predict'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('jsdelivr.metadata'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('jsdelivr.stats'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('npmregistry.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('npmregistry.package'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('meowfacts.facts'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('czechnationalbank.rates'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('economiaawesome.latest'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('economiaawesome.daily'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('frankfurter.convert'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('nbp.tables'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('vatcomply.vat'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('randomdog.files'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('randomfox.floof'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('metmuseum.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes(
      'minorplanetcenter.search',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('nasa.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('nasa.asset'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('noctua.stats'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('noctua.source'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('rigveda.book'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes(
      'rigveda.search',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes(
      'runyankolebible.books',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes(
      'runyankolebible.verse',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes(
      'runyankolebible.chapter',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes(
      'runyankolebible.search',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes(
      'runyankolebible.random',
    ),
    true,
  )
  for (const method of [
    'vedicsociety.words',
    'vedicsociety.descriptions',
    'vedicsociety.category',
  ]) {
    assert.equal(
      (readProperty(response, 'result.rpcMethods') as string[]).includes(method),
      true,
    )
  }
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('share.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('share.sources'),
    true,
  )
  for (const method of [
    'urantia.toc',
    'urantia.paper',
    'urantia.paragraph',
    'urantia.search',
  ]) {
    assert.equal(
      (readProperty(response, 'result.rpcMethods') as string[]).includes(method),
      true,
    )
  }
  for (const method of [
    'usgsearthquake.search',
    'usgsearthquake.event',
  ]) {
    assert.equal(
      (readProperty(response, 'result.rpcMethods') as string[]).includes(method),
      true,
    )
  }
  for (const method of [
    'usgswater.instantaneous',
    'usgswater.daily',
  ]) {
    assert.equal(
      (readProperty(response, 'result.rpcMethods') as string[]).includes(method),
      true,
    )
  }
  for (const method of ['tle.search', 'tle.satellite']) {
    assert.equal(
      (readProperty(response, 'result.rpcMethods') as string[]).includes(method),
      true,
    )
  }
  for (const method of [
    'spacex.company',
    'spacex.rockets',
    'spacex.launchpads',
    'spacex.launches',
  ]) {
    assert.equal(
      (readProperty(response, 'result.rpcMethods') as string[]).includes(method),
      true,
    )
  }
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('icsdb.calendars'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('icsdb.events'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('isdayoff.day'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes(
      'isdayoff.range',
    ),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('phpnoise.generate'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('quickchart.render'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('spaceflightnews.articles'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('steem.discussions'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('steem.thread'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('usercheck.email'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('wiktionary.search'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('wiktionary.extract'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('xcolors.convert'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.commands') as string[]).includes('apis run'),
    true,
  )
  assert.equal(
    (readProperty(response, 'result.rpcMethods') as string[]).includes('publicApis.cacheList'),
    true,
  )
})

test('browser.sessionList returns registered managed browser sessions', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 6, method: 'browser.sessionList' }),
  )

  assert.equal(Array.isArray(readProperty(response, 'result.sessions')), true)
})

test('site RPC methods fail clearly when required auth profile is not ready', async () => {
  const response = await handleJsonRpcLine(
    requiredAuthOptions,
    JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'site.search', params: { query: 'hello' } }),
  )

  assert.equal(readProperty(response, 'error.data.code'), 'AUTH_PROFILE_NOT_READY')
  assert.equal(readProperty(response, 'error.data.details.authProfileId'), 'reviewer')
})

test('admindivisions.country is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://raw.githubusercontent.com/kamikazechaser/administrative-divisions-db/master/api/KE.json')
    return new Response(JSON.stringify(['Nairobi Area', 'Mombasa', 'Kiambu']), { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 6, method: 'admindivisions.country', params: { country: 'KE', limit: 2 } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'admindivisions.country')
    assert.equal(readProperty(response, 'result.api.providerId'), 'admindivisions')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.deepEqual(readProperty(response, 'result.divisions'), ['Nairobi Area', 'Mombasa'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('nominatim search and reverse are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  const userAgents: string[] = []
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    userAgents.push(new Headers(init?.headers).get('user-agent') ?? '')
    const body = url.pathname === '/search' ? [createNominatimPlaceFixture()] : createNominatimPlaceFixture()
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 71, method: 'nominatim.search', params: { query: 'Berlin', limit: 2, language: 'en' } }),
    )
    assert.equal(readProperty(search, 'result.kind'), 'nominatim.search')
    assert.equal(readProperty(search, 'result.api.providerId'), 'nominatim')
    assert.equal(readProperty(search, 'result.api.authentication'), 'none')
    assert.equal(readProperty(search, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(search, 'result.query.limit'), 2)
    assert.equal(readProperty(search, 'result.pagination.maxLimit'), 5)
    assert.equal(readProperty(search, 'result.places.0.displayName'), 'Berlin, Deutschland')

    const reverse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 72, method: 'nominatim.reverse', params: { latitude: '52.5170365', longitude: '13.3888599', language: 'en' } }),
    )
    assert.equal(readProperty(reverse, 'result.kind'), 'nominatim.reverse')
    assert.equal(readProperty(reverse, 'result.api.providerId'), 'nominatim')
    assert.equal(readProperty(reverse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(reverse, 'result.place.displayName'), 'Berlin, Deutschland')
    assert.ok(requestedUrls.some(url => url === 'https://nominatim.openstreetmap.org/search?q=Berlin&format=jsonv2&addressdetails=1&limit=2&accept-language=en'))
    assert.ok(requestedUrls.some(url => url === 'https://nominatim.openstreetmap.org/reverse?lat=52.5170365&lon=13.3888599&format=jsonv2&addressdetails=1&accept-language=en'))
    assert.match(userAgents[0] ?? '', /public-apis-tui/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('opentopodata.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response(JSON.stringify(createOpenTopoDataLookupFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 73, method: 'opentopodata.lookup', params: { locations: '39.7471,-104.9963', dataset: 'srtm90m', interpolation: 'bilinear' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'opentopodata.lookup')
    assert.equal(readProperty(response, 'result.api.providerId'), 'opentopodata')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.dataset'), 'srtm90m')
    assert.equal(readProperty(response, 'result.elevations.0.elevation'), 1603)
    assert.equal(requestedUrl, 'https://api.opentopodata.org/v1/srtm90m?locations=39.7471%2C-104.9963&interpolation=bilinear')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('pinballmap regions and locations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = String(input)
    requestedUrls.push(url)
    return new Response(JSON.stringify(url.includes('regions') ? createPinballMapRegionsFixture() : createPinballMapLocationsFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const regions = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 74, method: 'pinballmap.regions', params: { query: 'oregon', limit: 1 } }),
    )
    assert.equal(readProperty(regions, 'result.kind'), 'pinballmap.regions')
    assert.equal(readProperty(regions, 'result.api.providerId'), 'pinballmap')
    assert.equal(readProperty(regions, 'result.api.authentication'), 'none')
    assert.equal(readProperty(regions, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(regions, 'result.regions.0.name'), 'portland')

    const locations = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 75, method: 'pinballmap.locations', params: { region: 'portland', query: 'ground', limit: 1 } }),
    )
    assert.equal(readProperty(locations, 'result.kind'), 'pinballmap.locations')
    assert.equal(readProperty(locations, 'result.api.providerId'), 'pinballmap')
    assert.equal(readProperty(locations, 'result.pagination.noDetails'), true)
    assert.equal(readProperty(locations, 'result.locations.0.name'), 'Ground Kontrol Classic Arcade')
    assert.deepEqual(requestedUrls, [
      'https://pinballmap.com/api/v1/regions.json',
      'https://pinballmap.com/api/v1/regions.json',
      'https://pinballmap.com/api/v1/locations.json?region=portland&no_details=1&by_location_name=ground',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('postalcodes.search is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response(JSON.stringify(createPostalCodesSearchFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 76, method: 'postalcodes.search', params: { query: '90210', country: 'US', limit: 1 } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'postalcodes.search')
    assert.equal(readProperty(response, 'result.api.providerId'), 'postalcodes')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.suggestions.0.text'), 'Beverly Hills (90210)')
    assert.equal(requestedUrl, 'https://postalcodes.info/search?q=90210&country=US')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('postcodedata-nl.lookup is exposed through JSON-RPC without auth and with HTTP-only metadata', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response(JSON.stringify(createPostcodeDataNlLookupFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 77, method: 'postcodedata-nl.lookup', params: { postcode: '1211EP', streetNumber: 60, ref: 'public-apis-tui.local' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'postcodedata-nl.lookup')
    assert.equal(readProperty(response, 'result.api.providerId'), 'postcodedata-nl')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.api.httpOnly'), true)
    assert.equal(readProperty(response, 'result.addresses.0.street'), 'Stationsstraat')
    assert.equal(requestedUrl, 'http://api.postcodedata.nl/v1/postcode/?postcode=1211EP&streetnumber=60&ref=public-apis-tui.local&type=json')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('postcodes-io operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    const result = requestedUrls.length === 1 ? createPostcodesIoPostcodeFixture() : [createPostcodesIoPostcodeFixture()]
    return new Response(JSON.stringify({ status: 200, result }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const lookup = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 771, method: 'postcodes-io.lookup', params: { postcode: 'SW1A 2AA' } }),
    )
    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 772, method: 'postcodes-io.search', params: { query: 'SW1A', limit: 1 } }),
    )
    const nearest = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 773, method: 'postcodes-io.nearest', params: { latitude: 51.5074, longitude: -0.1278, limit: 1, radius: 1000 } }),
    )
    assert.equal(readProperty(lookup, 'result.kind'), 'postcodes-io.lookup')
    assert.equal(readProperty(lookup, 'result.api.authentication'), 'none')
    assert.equal(readProperty(lookup, 'result.postcode.postcode'), 'SW1A 2AA')
    assert.equal(readProperty(search, 'result.kind'), 'postcodes-io.search')
    assert.equal(readProperty(search, 'result.postcodes.0.adminDistrict'), 'Westminster')
    assert.equal(readProperty(nearest, 'result.kind'), 'postcodes-io.nearest')
    assert.equal(readProperty(nearest, 'result.postcodes.0.region'), 'London')
    assert.deepEqual(requestedUrls, [
      'https://api.postcodes.io/postcodes/SW1A%202AA',
      'https://api.postcodes.io/postcodes?q=SW1A',
      'https://api.postcodes.io/postcodes?lat=51.5074&lon=-0.1278&radius=1000',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('queimadas-inpe.latest10min is exposed through JSON-RPC without auth and with safety metadata', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    const body = String(input).endsWith('.csv')
      ? 'lat,lon,satelite,data\n -32.677710, -61.493530,TERRA_M-T,2026-05-08 12:44:00\n'
      : '<a href="focos_10min_20260508_1410.csv">latest</a>'
    return new Response(body, { status: 200, headers: { 'content-type': String(input).endsWith('.csv') ? 'text/csv' : 'text/html' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 774, method: 'queimadas-inpe.latest10min', params: { limit: 1 } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'queimadas-inpe.latest10min')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.match(String(readProperty(response, 'result.api.publicSafety')), /not emergency dispatch/u)
    assert.equal(readProperty(response, 'result.focuses.0.satellite'), 'TERRA_M-T')
    assert.deepEqual(requestedUrls, [
      'https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/',
      'https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/focos_10min_20260508_1410.csv',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('REST Countries operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    return new Response(JSON.stringify(String(input).includes('/alpha/') ? createRestCountriesCountryFixture() : [createRestCountriesCountryFixture()]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const name = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 775, method: 'restcountries.name', params: { name: 'peru', limit: 1 } }))
    const alpha = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 776, method: 'restcountries.alpha', params: { code: 'DE' } }))
    const region = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 777, method: 'restcountries.region', params: { region: 'europe', limit: 1 } }))
    assert.equal(readProperty(name, 'result.kind'), 'restcountries.name')
    assert.equal(readProperty(name, 'result.api.authentication'), 'none')
    assert.equal(readProperty(name, 'result.countries.0.commonName'), 'Germany')
    assert.equal(readProperty(alpha, 'result.kind'), 'restcountries.alpha')
    assert.equal(readProperty(alpha, 'result.country.cca3'), 'DEU')
    assert.equal(readProperty(region, 'result.kind'), 'restcountries.region')
    assert.equal(readProperty(region, 'result.countries.0.region'), 'Europe')
    assert.deepEqual(requestedUrls, [
      'https://restcountries.com/v3.1/name/peru?fields=name%2Ccca2%2Ccca3%2Ccapital%2Cregion%2Csubregion%2Cpopulation%2Carea%2Clanguages%2Ccurrencies%2Cflags',
      'https://restcountries.com/v3.1/alpha/DE?fields=name%2Ccca2%2Ccca3%2Ccapital%2Cregion%2Csubregion%2Cpopulation%2Carea%2Clanguages%2Ccurrencies%2Cflags',
      'https://restcountries.com/v3.1/region/europe?fields=name%2Ccca2%2Ccca3%2Ccapital%2Cregion%2Csubregion%2Cpopulation%2Carea%2Clanguages%2Ccurrencies%2Cflags',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('slf.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://slftool.github.io/data.json')
    return new Response(JSON.stringify({
      a: {
        stadt: ['Aalen', 'Aachen'],
        land: ['Albanien'],
        fluss: ['Aabach'],
        name: ['Anna'],
        beruf: ['Arzt'],
        tier: ['Affe'],
        marke: ['Audi'],
        pflanze: ['Ahorn'],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 778, method: 'slf.lookup', params: { letter: 'a', category: 'stadt', limit: 1 } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'slf.lookup')
    assert.equal(readProperty(response, 'result.api.providerId'), 'slf')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.values.0'), 'Aalen')
    assert.equal(readProperty(response, 'result.count.returned'), 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ViaCep operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  const fixture = {
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    bairro: 'Sé',
    localidade: 'São Paulo',
    uf: 'SP',
    estado: 'São Paulo',
    regiao: 'Sudeste',
    ibge: '3550308',
    ddd: '11',
    siafi: '7107',
  }
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    return new Response(JSON.stringify(String(input).includes('/01001000/') ? fixture : [fixture]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const lookup = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 779, method: 'viacep.lookup', params: { cep: '01001-000' } }))
    const search = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 780, method: 'viacep.search', params: { state: 'SP', city: 'São Paulo', street: 'Paulista', limit: 1 } }))
    assert.equal(readProperty(lookup, 'result.kind'), 'viacep.lookup')
    assert.equal(readProperty(lookup, 'result.api.authentication'), 'none')
    assert.equal(readProperty(lookup, 'result.address.city'), 'São Paulo')
    assert.equal(readProperty(search, 'result.kind'), 'viacep.search')
    assert.equal(readProperty(search, 'result.addresses.0.cep'), '01001-000')
    assert.deepEqual(requestedUrls, [
      'https://viacep.com.br/ws/01001000/json/',
      'https://viacep.com.br/ws/SP/S%C3%A3o%20Paulo/Paulista/json/',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Zippopotam.us operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  const lookupFixture = {
    country: 'United States',
    'country abbreviation': 'US',
    'post code': '90210',
    places: [{ 'place name': 'Beverly Hills', longitude: '-118.4065', latitude: '34.0901', state: 'California', 'state abbreviation': 'CA' }],
  }
  const searchFixture = {
    country: 'United States',
    'country abbreviation': 'US',
    state: 'Massachusetts',
    'state abbreviation': 'MA',
    'place name': 'Belmont',
    places: [{ 'place name': 'Belmont', longitude: '-71.4594', latitude: '42.4464', 'post code': '02178' }],
  }
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    return new Response(JSON.stringify(String(input).endsWith('/90210') ? lookupFixture : searchFixture), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const lookup = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 781, method: 'zippopotam-us.lookup', params: { country: 'US', postalCode: '90210', limit: 1 } }))
    const search = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 782, method: 'zippopotam-us.search', params: { country: 'US', state: 'MA', city: 'Belmont', limit: 1 } }))
    assert.equal(readProperty(lookup, 'result.kind'), 'zippopotam-us.lookup')
    assert.equal(readProperty(lookup, 'result.api.authentication'), 'none')
    assert.equal(readProperty(lookup, 'result.places.0.placeName'), 'Beverly Hills')
    assert.equal(readProperty(search, 'result.kind'), 'zippopotam-us.search')
    assert.equal(readProperty(search, 'result.places.0.postalCode'), '02178')
    assert.deepEqual(requestedUrls, [
      'https://api.zippopotam.us/us/90210',
      'https://api.zippopotam.us/us/ma/belmont',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ziptastic.lookup is exposed through JSON-RPC without auth and JSON-body caveat', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://ziptasticapi.com/90210')
    return new Response(JSON.stringify({ country: 'US', state: 'CA', city: 'BEVERLY HILLS' }), {
      status: 200,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 783, method: 'ziptastic.lookup', params: { zip: '90210' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'ziptastic.lookup')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.match(String(readProperty(response, 'result.api.transport')), /text\/html/u)
    assert.equal(readProperty(response, 'result.address.city'), 'BEVERLY HILLS')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('mediastack.news is exposed through JSON-RPC', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({
      pagination: { limit: 1, offset: 0, count: 1, total: 1 },
      data: [
        {
          author: null,
          title: 'RPC headline',
          description: null,
          url: 'https://example.com/rpc-headline',
          source: 'Example News',
          image: null,
          category: 'technology',
          language: 'en',
          country: 'us',
          published_at: '2026-05-02T12:00:00+00:00',
        },
      ],
    }))) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'mediastack.news',
        params: { apiKey: 'test-key', keywords: 'rpc', limit: 1 },
      }),
    )

    assert.equal(readProperty(response, 'jsonrpc'), '2.0')
    assert.equal(readProperty(response, 'id'), 8)
    assert.equal(readProperty(response, 'result.api.provider'), 'mediastack')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.articles.0.title'), 'RPC headline')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('currents.news is exposed through JSON-RPC with keyed config and secret-free result', async () => {
  const previousFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response(JSON.stringify({
      status: 'ok',
      news: [
        {
          id: 'article-1',
          title: 'Currents RPC headline',
          description: 'A short article description.',
          url: 'https://example.com/currents-rpc',
          author: 'Reporter',
          image: null,
          language: 'en',
          category: ['technology'],
          published: '2026-05-04T08:00:00+00:00',
        },
      ],
      page: 1,
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '1000',
        'x-ratelimit-remaining': '999',
      },
    })
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 801,
        method: 'currents.news',
        params: { apiKey: 'test-key', keywords: 'rpc', language: 'en', pageSize: 1 },
      }),
    )

    assert.ok(requestedUrl)
    const url = new URL(requestedUrl)
    assert.equal(url.searchParams.get('apiKey'), 'test-key')
    assert.equal(url.searchParams.get('keywords'), 'rpc')
    assert.equal(url.searchParams.get('page_size'), '1')
    assert.equal(readProperty(response, 'jsonrpc'), '2.0')
    assert.equal(readProperty(response, 'id'), 801)
    assert.equal(readProperty(response, 'result.kind'), 'currents.news')
    assert.equal(readProperty(response, 'result.api.provider'), 'currents')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.match(String(readProperty(response, 'result.api.authentication')), /CURRENTS_API_KEY/)
    assert.equal(readProperty(response, 'result.query.keywords'), 'rpc')
    assert.equal(readProperty(response, 'result.pagination.pageSize'), 1)
    assert.equal(readProperty(response, 'result.articles.0.title'), 'Currents RPC headline')
    assert.doesNotMatch(JSON.stringify(response), /test-key/)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('currencyapi currencies and rates are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/currencies.json')) {
      return new Response(JSON.stringify({ usd: 'US Dollar', eur: 'Euro', jpy: 'Japanese Yen', btc: 'Bitcoin' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.match(url.pathname, /\/currencies\/usd\.json$/)
    return new Response(JSON.stringify({ date: '2026-05-04', usd: { eur: 0.85, jpy: 157.23, btc: 0.000012 } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const currencies = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 746, method: 'currencyapi.currencies', params: { search: 'u', limit: 1 } }))
    assert.equal(readProperty(currencies, 'result.kind'), 'currencyapi.currencies')
    assert.equal(readProperty(currencies, 'result.api.provider'), 'currencyapi')
    assert.equal(readProperty(currencies, 'result.api.authentication'), 'none')
    assert.equal(readProperty(currencies, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(currencies, 'result.currencies.0.code'), 'usd')

    const rates = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 747, method: 'currencyapi.rates', params: { base: 'usd', symbols: 'eur,btc', limit: 2 } }))
    assert.equal(readProperty(rates, 'result.kind'), 'currencyapi.rates')
    assert.equal(readProperty(rates, 'result.api.authentication'), 'none')
    assert.equal(readProperty(rates, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(rates, 'result.rates.0.code'), 'eur')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('czechnationalbank rates are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><kurzy banka="CNB" datum="05.05.2026" poradi="85"><tabulka typ="XML_TYP_CNB_KURZY_DEVIZOVEHO_TRHU"><radek kod="EUR" mena="euro" mnozstvi="1" kurz="24,395" zeme="EMU"/><radek kod="USD" mena="dollar" mnozstvi="1" kurz="21,438" zeme="USA"/></tabulka></kurzy>', { status: 200, headers: { 'content-type': 'application/xml' } })
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 748, method: 'czechnationalbank.rates', params: { code: 'eur', date: '2026-05-05', limit: 1 } }))
    assert.match(requestedUrl, /denni_kurz\.xml\?date=05\.05\.2026$/)
    assert.equal(readProperty(response, 'result.kind'), 'czechnationalbank.rates')
    assert.equal(readProperty(response, 'result.api.provider'), 'czechnationalbank')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.rates.0.code'), 'EUR')
  } finally {
    globalThis.fetch = originalFetch
  }
})



test('frankfurter currencies, rates, and conversion are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(`${url.pathname}${url.search}`)
    if (url.pathname.endsWith('/currencies')) {
      return new Response(JSON.stringify([
        { iso_code: 'USD', iso_numeric: '840', name: 'United States Dollar', symbol: '$', start_date: '1792-04-02', end_date: '2026-05-05' },
        { iso_code: 'EUR', iso_numeric: '978', name: 'Euro', symbol: '€', start_date: '1999-01-04', end_date: '2026-05-05' },
      ]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname.includes('/rate/')) {
      return new Response(JSON.stringify({ date: '2026-05-05', base: 'USD', quote: 'EUR', rate: 0.85387 }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify([{ date: '2026-05-05', base: 'USD', quote: 'EUR', rate: 0.85387 }]), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const currencies = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 751, method: 'frankfurter.currencies', params: { search: 'dollar', limit: 1 } }))
    assert.equal(readProperty(currencies, 'result.kind'), 'frankfurter.currencies')
    assert.equal(readProperty(currencies, 'result.api.provider'), 'frankfurter')
    assert.equal(readProperty(currencies, 'result.api.authentication'), 'none')
    assert.equal(readProperty(currencies, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(currencies, 'result.currencies.0.code'), 'USD')

    const rates = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 752, method: 'frankfurter.rates', params: { base: 'USD', quotes: 'EUR', date: '2026-05-05', limit: 1 } }))
    assert.equal(readProperty(rates, 'result.kind'), 'frankfurter.rates')
    assert.equal(readProperty(rates, 'result.rates.0.quote'), 'EUR')

    const conversion = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 753, method: 'frankfurter.convert', params: { base: 'USD', quote: 'EUR', amount: 100, date: '2026-05-05' } }))
    assert.equal(readProperty(conversion, 'result.kind'), 'frankfurter.convert')
    assert.equal(readProperty(conversion, 'result.conversion.converted'), 85.387)
    assert.deepEqual(requestedUrls, [
      '/v2/currencies?scope=all',
      '/v2/rates?base=USD&quotes=EUR&from=2026-05-05&to=2026-05-05',
      '/v2/rate/USD/EUR?date=2026-05-05',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('economiaawesome latest and daily are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.pathname)
    if (url.pathname.startsWith('/json/daily/')) {
      return new Response(JSON.stringify([createEconomiaAwesomeQuote('USD', 'BRL')]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ USDBRL: createEconomiaAwesomeQuote('USD', 'BRL'), EURBRL: createEconomiaAwesomeQuote('EUR', 'BRL', '5.82072') }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const latest = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 749, method: 'economiaawesome.latest', params: { pairs: 'USD-BRL,EUR-BRL' } }))
    assert.equal(readProperty(latest, 'result.kind'), 'economiaawesome.latest')
    assert.equal(readProperty(latest, 'result.api.provider'), 'economiaawesome')
    assert.equal(readProperty(latest, 'result.api.authentication'), 'none')
    assert.equal(readProperty(latest, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(latest, 'result.quotes.0.pair'), 'EUR-BRL')

    const daily = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 750, method: 'economiaawesome.daily', params: { pair: 'USD-BRL', days: 1 } }))
    assert.equal(readProperty(daily, 'result.kind'), 'economiaawesome.daily')
    assert.equal(readProperty(daily, 'result.api.authentication'), 'none')
    assert.equal(readProperty(daily, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(daily, 'result.quotes.0.pair'), 'USD-BRL')
    assert.deepEqual(requestedUrls, ['/json/last/USD-BRL,EUR-BRL', '/json/daily/USD-BRL/1'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

function createEconomiaAwesomeQuote(code: string, codein: string, bid = '4.9842'): Record<string, string> {
  return {
    code,
    codein,
    name: `${code}/${codein}`,
    high: '4.9850',
    low: '4.9780',
    varBid: '-0.0007',
    pctChange: '-0.0140',
    bid,
    ask: '4.9872',
    timestamp: '1777954229',
    create_date: '2026-05-05 01:10:29',
  }
}

test('gnews search and headlines are exposed through JSON-RPC with keyed config', async () => {
  const previousFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    return new Response(JSON.stringify({
      totalArticles: 7,
      articles: [
        {
          id: 'article-1',
          title: 'GNews RPC headline',
          description: 'A short article description.',
          content: 'A short article preview.',
          url: 'https://example.com/gnews-rpc',
          image: null,
          publishedAt: '2026-05-04T08:00:00Z',
          lang: 'en',
          source: { id: 'example', name: 'Example News', url: 'https://example.com', country: 'us' },
        },
      ],
      information: 'fixture information',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 802, method: 'gnews.search', params: { apiKey: 'test-key', query: 'rpc', language: 'en', max: 1 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'gnews.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'gnews')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.match(String(readProperty(searchResponse, 'result.api.authentication')), /GNEWS_API_KEY/)
    assert.equal(readProperty(searchResponse, 'result.query.query'), 'rpc')
    assert.equal(readProperty(searchResponse, 'result.pagination.max'), 1)
    assert.equal(readProperty(searchResponse, 'result.articles.0.title'), 'GNews RPC headline')
    assert.doesNotMatch(JSON.stringify(searchResponse), /test-key/)

    const headlinesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 803, method: 'gnews.headlines', params: { apiKey: 'test-key', category: 'technology', language: 'en', max: 1 } }),
    )
    assert.equal(readProperty(headlinesResponse, 'result.kind'), 'gnews.headlines')
    assert.equal(readProperty(headlinesResponse, 'result.query.category'), 'technology')
    assert.equal(readProperty(headlinesResponse, 'result.articles.0.title'), 'GNews RPC headline')
    assert.doesNotMatch(JSON.stringify(headlinesResponse), /test-key/)

    assert.equal(new URL(requestedUrls[0] ?? '').pathname, '/api/v4/search')
    assert.equal(new URL(requestedUrls[0] ?? '').searchParams.get('apikey'), 'test-key')
    assert.equal(new URL(requestedUrls[1] ?? '').pathname, '/api/v4/top-headlines')
    assert.equal(new URL(requestedUrls[1] ?? '').searchParams.get('apikey'), 'test-key')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('guardian.search is exposed through JSON-RPC with keyed config', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    response: {
      status: 'ok',
      userTier: 'developer',
      total: 1,
      startIndex: 1,
      pageSize: 1,
      currentPage: 1,
      pages: 1,
      orderBy: 'relevance',
      results: [{
        id: 'technology/2026/may/04/example',
        type: 'article',
        sectionId: 'technology',
        sectionName: 'Technology',
        webPublicationDate: '2026-05-04T08:00:00Z',
        webTitle: 'Guardian RPC headline',
        webUrl: 'https://www.theguardian.com/technology/example',
        fields: { headline: 'Guardian RPC headline', trailText: 'Desc', byline: 'Reporter' },
      }],
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 8041, method: 'guardian.search', params: { apiKey: 'test-key', query: 'rpc', pageSize: 1 } }))
    assert.equal(readProperty(response, 'result.kind'), 'guardian.search')
    assert.equal(readProperty(response, 'result.api.provider'), 'guardian')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.match(String(readProperty(response, 'result.api.authentication')), /GUARDIAN_API_KEY/)
    assert.equal(readProperty(response, 'result.query.query'), 'rpc')
    assert.equal(readProperty(response, 'result.articles.0.title'), 'Guardian RPC headline')
    assert.doesNotMatch(JSON.stringify(response), /test-key/)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('marketaux.news is exposed through JSON-RPC with keyed config', async () => {
  const previousFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response(JSON.stringify({
      meta: { found: 1, returned: 1, limit: 1, page: 1 },
      data: [
        {
          uuid: 'article-1',
          title: 'MarketAux RPC headline',
          description: 'A short article description.',
          snippet: 'A short article snippet.',
          url: 'https://example.com/marketaux-rpc',
          image_url: null,
          language: 'en',
          published_at: '2026-05-04T08:00:00Z',
          source: 'Example News',
          keywords: 'markets',
          relevance_score: null,
          entities: [{ symbol: 'TSLA', name: 'Tesla Inc', sentiment_score: 0.42 }],
          similar: [],
        },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 804, method: 'marketaux.news', params: { apiKey: 'test-key', symbols: 'TSLA', language: 'en', limit: 1 } }),
    )
    assert.ok(requestedUrl)
    const url = new URL(requestedUrl)
    assert.equal(url.searchParams.get('api_token'), 'test-key')
    assert.equal(url.searchParams.get('symbols'), 'TSLA')
    assert.equal(url.searchParams.get('limit'), '1')
    assert.equal(readProperty(response, 'result.kind'), 'marketaux.news')
    assert.equal(readProperty(response, 'result.api.provider'), 'marketaux')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.match(String(readProperty(response, 'result.api.authentication')), /MARKETAUX_API_KEY/)
    assert.equal(readProperty(response, 'result.query.symbols'), 'TSLA')
    assert.equal(readProperty(response, 'result.pagination.limit'), 1)
    assert.equal(readProperty(response, 'result.articles.0.title'), 'MarketAux RPC headline')
    assert.doesNotMatch(JSON.stringify(response), /test-key/)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('nytimes search and top stories are exposed through JSON-RPC with keyed config', async () => {
  const previousFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    return String(input).includes('/topstories/')
      ? new Response(JSON.stringify({ status: 'OK', section: 'home', num_results: 1, results: [{ uri: 'nyt://article/1', title: 'Top story', abstract: 'A top story.', url: 'https://www.nytimes.com/top', byline: 'By Reporter', section: 'home', published_date: '2026-05-04T08:00:00Z' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response(JSON.stringify({ status: 'OK', response: { metadata: { hits: 1, offset: 0 }, docs: [{ _id: 'nyt://article/1', headline: { main: 'NYTimes RPC headline' }, abstract: 'A short abstract.', web_url: 'https://www.nytimes.com/rpc', byline: { original: 'By Reporter' }, section_name: 'Technology', pub_date: '2026-05-04T08:00:00Z' }] } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const searchResponse = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 805, method: 'nytimes.search', params: { apiKey: 'test-key', query: 'rpc' } }))
    assert.equal(readProperty(searchResponse, 'result.kind'), 'nytimes.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'nytimes')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.match(String(readProperty(searchResponse, 'result.api.authentication')), /NYTIMES_API_KEY/)
    assert.equal(readProperty(searchResponse, 'result.articles.0.title'), 'NYTimes RPC headline')
    assert.doesNotMatch(JSON.stringify(searchResponse), /test-key/)

    const topResponse = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 806, method: 'nytimes.topStories', params: { apiKey: 'test-key', section: 'home', limit: 1 } }))
    assert.equal(readProperty(topResponse, 'result.kind'), 'nytimes.topStories')
    assert.equal(readProperty(topResponse, 'result.articles.0.title'), 'Top story')
    assert.doesNotMatch(JSON.stringify(topResponse), /test-key/)
    assert.equal(new URL(requestedUrls[0] ?? '').searchParams.get('api-key'), 'test-key')
    assert.equal(new URL(requestedUrls[1] ?? '').searchParams.get('api-key'), 'test-key')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('newsapi headlines and everything are exposed through JSON-RPC with keyed config', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    status: 'ok',
    totalResults: 1,
    articles: [{ source: { id: 'example', name: 'Example News' }, author: 'Reporter', title: 'NewsAPI RPC headline', description: 'Desc', url: 'https://example.com/newsapi-rpc', publishedAt: '2026-05-04T08:00:00Z', content: 'Preview' }],
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const headlines = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 807, method: 'newsapi.headlines', params: { apiKey: 'test-key', country: 'us', pageSize: 1 } }))
    assert.equal(readProperty(headlines, 'result.kind'), 'newsapi.headlines')
    assert.equal(readProperty(headlines, 'result.api.provider'), 'newsapi')
    assert.equal(readProperty(headlines, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(headlines, 'result.articles.0.title'), 'NewsAPI RPC headline')
    assert.doesNotMatch(JSON.stringify(headlines), /test-key/)
    const everything = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 808, method: 'newsapi.everything', params: { apiKey: 'test-key', query: 'rpc', pageSize: 1 } }))
    assert.equal(readProperty(everything, 'result.kind'), 'newsapi.everything')
    assert.equal(readProperty(everything, 'result.query.query'), 'rpc')
    assert.doesNotMatch(JSON.stringify(everything), /test-key/)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('newsdata.latest is exposed through JSON-RPC with keyed config', async () => {
  const previousFetch = globalThis.fetch
  let requestedUrl: string | undefined
  globalThis.fetch = (async input => {
    requestedUrl = String(input)
    return new Response(JSON.stringify({
      status: 'success',
      totalResults: 1,
      nextPage: 'next-token',
      results: [{
        article_id: 'article-1',
        title: 'NewsData RPC headline',
        link: 'https://example.com/newsdata-rpc',
        description: 'Desc',
        keywords: ['api'],
        creator: ['Reporter'],
        language: 'en',
        country: ['us'],
        category: ['technology'],
        datatype: 'news',
        pubDate: '2026-05-04T08:00:00Z',
        source_id: 'example',
        source_name: 'Example News',
        source_url: 'https://example.com',
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 809, method: 'newsdata.latest', params: { apiKey: 'test-key', query: 'rpc', language: 'en', size: 1 } }))
    assert.equal(readProperty(response, 'result.kind'), 'newsdata.latest')
    assert.equal(readProperty(response, 'result.api.provider'), 'newsdata')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.match(String(readProperty(response, 'result.api.authentication')), /NEWSDATAIO_API_KEY/)
    assert.equal(readProperty(response, 'result.query.query'), 'rpc')
    assert.equal(readProperty(response, 'result.pagination.size'), 1)
    assert.equal(readProperty(response, 'result.articles.0.title'), 'NewsData RPC headline')
    assert.equal(new URL(requestedUrl ?? '').searchParams.get('apikey'), 'test-key')
    assert.doesNotMatch(JSON.stringify(response), /test-key/)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('thenews.all is exposed through JSON-RPC with keyed config', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: [{ uuid: 'article-1', title: 'TheNews RPC headline', description: 'Desc', url: 'https://example.com/thenews-rpc', language: 'en', published_at: '2026-05-04T08:00:00Z', source: 'example.com', categories: ['business'], locale: 'us' }],
    meta: { found: 1, returned: 1, limit: 1, page: 1 },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 810, method: 'thenews.all', params: { apiKey: 'test-key', search: 'rpc', language: 'en', limit: 1 } }))
    assert.equal(readProperty(response, 'result.kind'), 'thenews.all')
    assert.equal(readProperty(response, 'result.api.provider'), 'thenews')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.match(String(readProperty(response, 'result.api.authentication')), /THENEWSAPI_API_KEY/)
    assert.equal(readProperty(response, 'result.query.search'), 'rpc')
    assert.equal(readProperty(response, 'result.articles.0.title'), 'TheNews RPC headline')
    assert.doesNotMatch(JSON.stringify(response), /test-key/)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('hashnode.posts is exposed through JSON-RPC without auth', async () => {
  const previousFetch = globalThis.fetch
  let requestedBody: string | undefined
  globalThis.fetch = (async (_input, init) => {
    requestedBody = String(init?.body)
    return new Response(JSON.stringify({
      data: {
        publication: {
          id: 'pub-1',
          title: 'Developer DAO',
          url: 'https://blog.developerdao.com',
          posts: {
            pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
            edges: [{
              node: {
                id: 'post-1',
                title: 'Hashnode RPC headline',
                brief: 'Desc',
                url: 'https://blog.developerdao.com/rpc',
                slug: 'rpc',
                publishedAt: '2026-05-04T08:00:00Z',
                readTimeInMinutes: 3,
                author: { name: 'Reporter', username: 'reporter' },
                tags: [{ name: 'API', slug: 'api' }],
              },
            }],
          },
        },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 811, method: 'hashnode.posts', params: { host: 'blog.developerdao.com', first: 1 } }))
    assert.equal(readProperty(response, 'result.kind'), 'hashnode.posts')
    assert.equal(readProperty(response, 'result.api.provider'), 'hashnode')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none for public publication reads')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.host'), 'blog.developerdao.com')
    assert.equal(readProperty(response, 'result.query.first'), 1)
    assert.equal(readProperty(response, 'result.posts.0.title'), 'Hashnode RPC headline')
    const variables = JSON.parse(requestedBody ?? '{}') as { variables?: Record<string, unknown> }
    assert.equal(variables.variables?.host, 'blog.developerdao.com')
    assert.equal(variables.variables?.first, 1)
    assert.doesNotMatch(JSON.stringify(response), /api[_-]?key|token/i)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('opencollective.account is exposed through JSON-RPC without auth', async () => {
  const previousFetch = globalThis.fetch
  let requestedBody: string | undefined
  globalThis.fetch = (async (_input, init) => {
    requestedBody = String(init?.body)
    return new Response(JSON.stringify({
      data: {
        account: {
          id: 'account-1',
          slug: 'webpack',
          type: 'COLLECTIVE',
          name: 'webpack',
          description: 'webpack is a build solution for modern web applications.',
          website: 'https://webpack.js.org/',
          imageUrl: 'https://images.opencollective.com/webpack/logo.png',
          currency: 'USD',
          isVerified: true,
          isActive: true,
          isArchived: false,
          tags: ['open-source'],
          stats: {
            balance: { valueInCents: 9711549, currency: 'USD' },
            yearlyBudget: { valueInCents: 15916255, currency: 'USD' },
            totalAmountReceived: { valueInCents: 196101735, currency: 'USD' },
          },
        },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 812, method: 'opencollective.account', params: { slug: 'webpack' } }))
    assert.equal(readProperty(response, 'result.kind'), 'opencollective.account')
    assert.equal(readProperty(response, 'result.api.provider'), 'opencollective')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none for public GraphQL reads')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.slug'), 'webpack')
    assert.equal(readProperty(response, 'result.account.name'), 'webpack')
    const variables = JSON.parse(requestedBody ?? '{}') as { variables?: Record<string, unknown> }
    assert.equal(variables.variables?.slug, 'webpack')
    assert.doesNotMatch(JSON.stringify(response), /api[_-]?key|personal-token|authorization/i)
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('agify.age is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://api.agify.io/?name=michael&country_id=US')
    return new Response(JSON.stringify(createAgifyFixture()), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-rate-limit-limit': '100',
        'x-rate-limit-remaining': '99',
        'x-rate-limit-reset': '3600',
      },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 36, method: 'agify.age', params: { name: 'michael', countryId: 'US' } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'agify.age')
    assert.equal(readProperty(response, 'result.api.provider'), 'agify')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.prediction.age'), 58)
    assert.equal(readProperty(response, 'result.rateLimit.limit'), '100')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('arbeitnow.jobs is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://www.arbeitnow.com/api/job-board-api?page=1&visa_sponsorship=true')
    return new Response(JSON.stringify({
      data: [
        {
          slug: 'data-engineer-berlin-123',
          company_name: 'Example GmbH',
          title: 'Data Engineer',
          description: '<p>Build data products</p>',
          remote: false,
          url: 'https://www.arbeitnow.com/view/data-engineer-berlin-123',
          tags: ['Data'],
          job_types: ['Full-time'],
          location: 'Berlin, Germany',
          created_at: 1777885200,
          visa_sponsorship: true,
        },
      ],
      links: { first: 'https://www.arbeitnow.com/api/job-board-api?page=1', prev: null, next: null, last: null },
      meta: { current_page: 1, from: 1, to: 1, per_page: 100, terms: 'free public API', info: 'Jobs are updated every hour.' },
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '5',
        'x-ratelimit-remaining': '4',
      },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 37, method: 'arbeitnow.jobs', params: { page: 1, visaSponsorship: true } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'arbeitnow.jobs')
    assert.equal(readProperty(response, 'result.api.provider'), 'arbeitnow')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.visaSponsorship'), true)
    assert.equal(readProperty(response, 'result.jobs.0.companyName'), 'Example GmbH')
    assert.equal(readProperty(response, 'result.rateLimit.limit'), '5')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('genderize.predict is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://api.genderize.io/?name=kim&country_id=US')
    return new Response(JSON.stringify(createGenderizeFixture()), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-rate-limit-limit': '100',
        'x-rate-limit-remaining': '99',
        'x-rate-limit-reset': '3600',
      },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 37, method: 'genderize.predict', params: { name: 'kim', countryId: 'US' } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'genderize.predict')
    assert.equal(readProperty(response, 'result.api.provider'), 'genderize')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.prediction.gender'), 'female')
    assert.equal(readProperty(response, 'result.prediction.probability'), 0.94)
    assert.equal(readProperty(response, 'result.rateLimit.limit'), '100')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('disify.email and disify.domain are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/email/test%40example.com') {
      return new Response(JSON.stringify(createDisifyFixture({ domain: 'example.com', disposable: true, free: false })), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '30', 'x-ratelimit-remaining': '29' },
      })
    }
    if (url.pathname === '/api/domain/gmail.com') {
      return new Response(JSON.stringify(createDisifyFixture({ domain: 'gmail.com', disposable: false, free: true, whitelist: true })), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '30', 'x-ratelimit-remaining': '28' },
      })
    }
    return new Response(JSON.stringify({ error: 'unexpected url' }), { status: 404, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const emailResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 381, method: 'disify.email', params: { email: 'test@example.com' } }),
    )
    assert.equal(readProperty(emailResponse, 'result.kind'), 'disify.email')
    assert.equal(readProperty(emailResponse, 'result.api.provider'), 'disify')
    assert.equal(readProperty(emailResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(emailResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(emailResponse, 'result.query.email'), 'test@example.com')
    assert.equal(readProperty(emailResponse, 'result.validation.disposable'), true)
    assert.equal(readProperty(emailResponse, 'result.rateLimit.limit'), '30')

    const domainResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 382, method: 'disify.domain', params: { domain: 'gmail.com' } }),
    )
    assert.equal(readProperty(domainResponse, 'result.kind'), 'disify.domain')
    assert.equal(readProperty(domainResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(domainResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(domainResponse, 'result.query.domain'), 'gmail.com')
    assert.equal(readProperty(domainResponse, 'result.validation.free'), true)
    assert.equal(readProperty(domainResponse, 'result.validation.whitelist'), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('kickbox.disposable is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://open.kickbox.com/v1/disposable/gmail.com')
    return new Response(JSON.stringify({ disposable: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 383, method: 'kickbox.disposable', params: { target: 'gmail.com' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'kickbox.disposable')
    assert.equal(readProperty(response, 'result.api.provider'), 'kickbox-open')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.target'), 'gmail.com')
    assert.equal(readProperty(response, 'result.result.disposable'), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('usercheck.email is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://api.usercheck.com/email/test%40example.com')
    return new Response(JSON.stringify(createUserCheckEmailFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '5', 'x-ratelimit-remaining': '4' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 384, method: 'usercheck.email', params: { email: 'test@example.com' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'usercheck.email')
    assert.equal(readProperty(response, 'result.api.provider'), 'usercheck')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.email'), 'test@example.com')
    assert.equal(readProperty(response, 'result.validation.domain'), 'example.com')
    assert.equal(readProperty(response, 'result.validation.roleAccount'), true)
    assert.equal(readProperty(response, 'result.rateLimit.limit'), '5')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('energidataservice datasets are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/dataset/PowerSystemRightNow') {
      assert.equal(url.searchParams.get('start'), 'now-PT15M')
      assert.equal(url.searchParams.get('limit'), '5')
      return new Response(JSON.stringify(createEnergiRightNowFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json', totalcalls: '40', remainingcalls: '39' },
      })
    }
    assert.equal(url.pathname, '/dataset/Elspotprices')
    assert.equal(url.searchParams.get('filter'), '{"PriceArea":["DK1"]}')
    assert.equal(url.searchParams.get('sort'), 'HourUTC desc')
    assert.equal(url.searchParams.get('limit'), '5')
    return new Response(JSON.stringify(createEnergiElspotFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json', totalcalls: '40', remainingcalls: '38' },
    })
  }) as typeof fetch
  try {
    const rightNowResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 385, method: 'energidataservice.rightnow', params: { start: 'now-PT15M', limit: 5 } }),
    )
    assert.equal(readProperty(rightNowResponse, 'result.kind'), 'energidataservice.rightnow')
    assert.equal(readProperty(rightNowResponse, 'result.api.provider'), 'energidataservice')
    assert.equal(readProperty(rightNowResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(rightNowResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(rightNowResponse, 'result.records.0.CO2Emission'), 114.37)

    const elspotResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 386, method: 'energidataservice.elspotprices', params: { priceArea: 'DK1', limit: 5 } }),
    )
    assert.equal(readProperty(elspotResponse, 'result.kind'), 'energidataservice.elspotprices')
    assert.equal(readProperty(elspotResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(elspotResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(elspotResponse, 'result.query.priceArea'), 'DK1')
    assert.equal(readProperty(elspotResponse, 'result.records.0.SpotPriceEUR'), 92.54)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('epa UV forecasts are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.includes('getEnvirofactsUVHOURLY')) {
      assert.equal(url.pathname, '/dmapservice/getEnvirofactsUVHOURLY/ZIP/20050/JSON')
      return new Response(JSON.stringify(createEpaUvHourlyFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.pathname, '/dmapservice/getEnvirofactsUVDAILY/ZIP/20050/JSON')
    return new Response(JSON.stringify(createEpaUvDailyFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const hourly = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 388, method: 'epa.uvHourly', params: { zip: '20050', limit: 21 } }),
    )
    assert.equal(readProperty(hourly, 'result.kind'), 'epa.uvHourly')
    assert.equal(readProperty(hourly, 'result.api.provider'), 'epa')
    assert.equal(readProperty(hourly, 'result.api.authentication'), 'none')
    assert.equal(readProperty(hourly, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(hourly, 'result.forecasts.0.city'), 'Washington')

    const daily = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 389, method: 'epa.uvDaily', params: { zip: '20050' } }),
    )
    assert.equal(readProperty(daily, 'result.kind'), 'epa.uvDaily')
    assert.equal(readProperty(daily, 'result.api.authentication'), 'none')
    assert.equal(readProperty(daily, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(daily, 'result.forecasts.0.uvIndex'), 7)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('freedictionary.define is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/api/v2/entries/en/hello')
    return new Response(JSON.stringify([
      {
        word: 'hello',
        phonetics: [{ text: '/həˈloʊ/' }],
        meanings: [
          {
            partOfSpeech: 'interjection',
            definitions: [{ definition: 'A greeting.', example: 'Hello, everyone.', synonyms: [], antonyms: [] }],
            synonyms: ['greeting'],
            antonyms: ['goodbye'],
          },
        ],
        sourceUrls: ['https://en.wiktionary.org/wiki/hello'],
      },
    ]), { status: 200, headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '450' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 314, method: 'freedictionary.define', params: { word: 'hello', definitionLimit: 1 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'freedictionary.define')
    assert.equal(readProperty(response, 'result.api.provider'), 'free-dictionary')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.entries.0.word'), 'hello')
    assert.equal(readProperty(response, 'result.count.definitionsShown'), 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('nationalize.predict is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.searchParams.get('name'), 'kim')
    return new Response(JSON.stringify({
      count: 383585,
      name: 'kim',
      country: [{ country_id: 'KR', probability: 0.5227 }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 392, method: 'nationalize.predict', params: { name: 'kim' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'nationalize.predict')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.prediction.topCountry.countryId'), 'KR')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('APIs.guru operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/providers.json')) {
      return new Response(JSON.stringify({ data: ['example.com', 'googleapis.com'] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.pathname.endsWith('/list.json')) {
      return new Response(JSON.stringify(createApisGuruListFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({
      numSpecs: 2,
      numAPIs: 2,
      numEndpoints: 20,
      numProviders: 2,
      datasets: [{ title: 'providerCount', data: { 'example.com': 1 } }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const providersResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 37, method: 'apisguru.providers', params: { query: 'google', limit: 5 } }),
    )
    assert.equal(readProperty(providersResponse, 'result.kind'), 'apisguru.providers')
    assert.equal(readProperty(providersResponse, 'result.api.provider'), 'apisguru')
    assert.equal(readProperty(providersResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(providersResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(providersResponse, 'result.providers.0'), 'googleapis.com')

    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 38, method: 'apisguru.search', params: { query: 'example', limit: 5 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'apisguru.search')
    assert.equal(readProperty(searchResponse, 'result.api.upstreamPagination'), 'none')
    assert.equal(readProperty(searchResponse, 'result.apis.0.id'), 'example.com')

    const metricsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 39, method: 'apisguru.metrics', params: {} }),
    )
    assert.equal(readProperty(metricsResponse, 'result.kind'), 'apisguru.metrics')
    assert.equal(readProperty(metricsResponse, 'result.metrics.numEndpoints'), 20)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('catfact.facts is exposed through JSON-RPC without auth', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({
      current_page: 1,
      data: [
        { fact: 'Cats walk on their toes.', length: 24 },
      ],
      first_page_url: 'https://catfact.ninja/facts?page=1',
      from: 1,
      last_page: 1,
      last_page_url: 'https://catfact.ninja/facts?page=1',
      next_page_url: null,
      path: 'https://catfact.ninja/facts',
      per_page: 1,
      prev_page_url: null,
      to: 1,
      total: 1,
    }))) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 82,
        method: 'catfact.facts',
        params: { limit: 1 },
      }),
    )

    assert.equal(readProperty(response, 'jsonrpc'), '2.0')
    assert.equal(readProperty(response, 'id'), 82)
    assert.equal(readProperty(response, 'result.api.provider'), 'catfact-ninja')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.facts.0.fact'), 'Cats walk on their toes.')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('CDNJS operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/libraries') {
      return new Response(JSON.stringify(createCdnjsSearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.pathname === '/libraries/jquery') {
      return new Response(JSON.stringify(createCdnjsLibraryFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ files: ['jquery.js', 'jquery.min.js'], sri: { 'jquery.min.js': 'sha512-min' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 40, method: 'cdnjs.search', params: { query: 'jquery', limit: 1 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'cdnjs.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'cdnjs')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.libraries.0.name'), 'jquery')

    const libraryResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 41, method: 'cdnjs.library', params: { name: 'jquery', versionLimit: 1, fileLimit: 2 } }),
    )
    assert.equal(readProperty(libraryResponse, 'result.kind'), 'cdnjs.library')
    assert.equal(readProperty(libraryResponse, 'result.library.assets.0.version'), '3.7.1')

    const versionResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 42, method: 'cdnjs.version', params: { name: 'jquery', version: '3.7.1', fileLimit: 2 } }),
    )
    assert.equal(readProperty(versionResponse, 'result.kind'), 'cdnjs.version')
    assert.equal(readProperty(versionResponse, 'result.files.1.sri'), 'sha512-min')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('censusgov datasets and ACS profile states are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/data.json') {
      return new Response(JSON.stringify(createCensusGovCatalogFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.pathname, '/data/2024/acs/acs5/profile')
    assert.equal(url.searchParams.get('get'), 'NAME,DP05_0001E,DP03_0062E')
    assert.equal(url.searchParams.get('for'), 'state:*')
    return new Response(JSON.stringify(createCensusGovAcsProfileFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const datasets = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 734, method: 'censusgov.datasets', params: { query: 'acs', limit: 100 } }))
    assert.equal(readProperty(datasets, 'result.kind'), 'censusgov.datasets')
    assert.equal(readProperty(datasets, 'result.api.provider'), 'censusgov')
    assert.equal(readProperty(datasets, 'result.api.authentication'), 'none')
    assert.equal(readProperty(datasets, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(datasets, 'result.datasets.0.title'), '2024 ACS 5-Year Data Profiles')

    const states = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 735, method: 'censusgov.acsProfileStates', params: { year: 2024, limit: 52 } }))
    assert.equal(readProperty(states, 'result.kind'), 'censusgov.acsProfileStates')
    assert.equal(readProperty(states, 'result.api.authentication'), 'none')
    assert.equal(readProperty(states, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(states, 'result.states.0.name'), 'California')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('cloudflaretrace.trace is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(createCloudflareTraceFixture(), {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  })) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 43, method: 'cloudflaretrace.trace', params: { endpoint: 'cloudflare.com' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'cloudflaretrace.trace')
    assert.equal(readProperty(response, 'result.api.provider'), 'cloudflare-trace')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.api.transport'), 'HTTPS text/plain key-value')
    assert.equal(readProperty(response, 'result.trace.ip'), '203.0.113.10')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('chroniclingamerica.search is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.origin, 'https://www.loc.gov')
    assert.equal(url.pathname, '/collections/chronicling-america/')
    assert.equal(url.searchParams.get('fo'), 'json')
    assert.equal(url.searchParams.get('at'), 'results,pagination')
    assert.equal(url.searchParams.get('q'), 'lincoln')
    assert.equal(url.searchParams.get('c'), '5')
    assert.equal(url.searchParams.get('sp'), '1')
    return new Response(JSON.stringify({
      pagination: { current: 1, from: 1, to: 1, perpage: 5, total: 1249405 },
      results: [
        {
          id: 'http://www.loc.gov/resource/sn85033611/1860-11-08/ed-1/?sp=2',
          title: 'Image 2 of The Cass County Republican',
          date: '1860-11-08',
          digitized: true,
          url: 'https://www.loc.gov/resource/sn85033611/1860-11-08/ed-1/?sp=2&q=lincoln',
          subject: ['newspapers'],
          location: ['michigan'],
          partof: ['chronicling america'],
          original_format: ['newspaper'],
          online_format: ['image', 'pdf'],
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 361, method: 'chroniclingamerica.search', params: { query: 'lincoln', count: 5, page: 1 } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'chroniclingamerica.search')
    assert.equal(readProperty(response, 'result.api.provider'), 'chroniclingamerica')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.items.0.title'), 'Image 2 of The Cass County Republican')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('coloradodata datasets and business entities are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.hostname === 'api.us.socrata.com') {
      assert.equal(url.pathname, '/api/catalog/v1')
      assert.equal(url.searchParams.get('domains'), 'data.colorado.gov')
      return new Response(JSON.stringify(createColoradoDataCatalogFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.pathname, '/resource/4ykn-tg5h.json')
    assert.equal(url.searchParams.get('$limit'), '1000')
    assert.equal(url.searchParams.get('entitystatus'), 'Good Standing')
    return new Response(JSON.stringify(createColoradoBusinessEntitiesFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const datasets = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 738, method: 'coloradodata.datasets', params: { query: 'business', limit: 100 } }))
    assert.equal(readProperty(datasets, 'result.kind'), 'coloradodata.datasets')
    assert.equal(readProperty(datasets, 'result.api.provider'), 'coloradodata')
    assert.equal(readProperty(datasets, 'result.api.authentication'), 'none')
    assert.equal(readProperty(datasets, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(datasets, 'result.datasets.0.id'), '4ykn-tg5h')

    const entities = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 739, method: 'coloradodata.businessEntities', params: { status: 'Good Standing', limit: 1000 } }))
    assert.equal(readProperty(entities, 'result.kind'), 'coloradodata.businessEntities')
    assert.equal(readProperty(entities, 'result.api.authentication'), 'none')
    assert.equal(readProperty(entities, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(entities, 'result.entities.0.entityName'), 'KYLDERON MIST VALLEY LLC')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('dcopendata datasets and business licenses are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.hostname === 'opendata.dc.gov') {
      assert.equal(url.pathname, '/api/search/v1/collections/dataset/items')
      assert.equal(url.searchParams.get('q'), 'business')
      assert.equal(url.searchParams.get('limit'), '100')
      return new Response(JSON.stringify(createDcOpenDataCatalogFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.pathname, '/dcgis/rest/services/FEEDS/DCRA/FeatureServer/0/query')
    assert.equal(url.searchParams.get('where'), "LICENSESTATUS='Active'")
    assert.equal(url.searchParams.get('resultRecordCount'), '1000')
    return new Response(JSON.stringify(createDcOpenDataBusinessLicensesFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const datasets = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 740, method: 'dcopendata.datasets', params: { query: 'business', limit: 100 } }))
    assert.equal(readProperty(datasets, 'result.kind'), 'dcopendata.datasets')
    assert.equal(readProperty(datasets, 'result.api.provider'), 'dcopendata')
    assert.equal(readProperty(datasets, 'result.api.authentication'), 'none')
    assert.equal(readProperty(datasets, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(datasets, 'result.datasets.0.title'), 'Basic Business Licenses')

    const licenses = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 741, method: 'dcopendata.businessLicenses', params: { status: 'Active', limit: 1000 } }))
    assert.equal(readProperty(licenses, 'result.kind'), 'dcopendata.businessLicenses')
    assert.equal(readProperty(licenses, 'result.api.authentication'), 'none')
    assert.equal(readProperty(licenses, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(licenses, 'result.licenses.0.entityName'), 'SK+I URBAN INC.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('DigitalOcean Status operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/summary.json')) {
      return new Response(JSON.stringify(createDigitalOceanStatusSummaryFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.pathname.endsWith('/incidents/unresolved.json')) {
      return new Response(JSON.stringify(createDigitalOceanStatusIncidentsFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify(createDigitalOceanStatusMaintenancesFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const summaryResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 44,
        method: 'digitaloceanstatus.summary',
        params: { componentQuery: 'API', componentLimit: 2 },
      }),
    )
    assert.equal(readProperty(summaryResponse, 'result.kind'), 'digitaloceanstatus.summary')
    assert.equal(readProperty(summaryResponse, 'result.api.provider'), 'digitalocean-status')
    assert.equal(readProperty(summaryResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(summaryResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(summaryResponse, 'result.components.0.name'), 'API')

    const incidentsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 45,
        method: 'digitaloceanstatus.incidents',
        params: { scope: 'unresolved', limit: 1, includeUpdates: true },
      }),
    )
    assert.equal(readProperty(incidentsResponse, 'result.kind'), 'digitaloceanstatus.incidents')
    assert.equal(readProperty(incidentsResponse, 'result.query.scope'), 'unresolved')
    assert.equal(readProperty(incidentsResponse, 'result.events.0.name'), 'API latency')
    assert.equal(readProperty(incidentsResponse, 'result.events.0.updates.0.status'), 'investigating')

    const maintenancesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 46,
        method: 'digitaloceanstatus.maintenances',
        params: { scope: 'upcoming', limit: 1 },
      }),
    )
    assert.equal(readProperty(maintenancesResponse, 'result.kind'), 'digitaloceanstatus.maintenances')
    assert.equal(readProperty(maintenancesResponse, 'result.query.scope'), 'upcoming')
    assert.equal(readProperty(maintenancesResponse, 'result.events.0.name'), 'Core Maintenance')
    assert.equal(readProperty(maintenancesResponse, 'result.events.0.componentNames.0'), 'API')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('chainlink.feeds is exposed through JSON-RPC without auth', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify([
      {
        name: 'ETH / USD',
        path: 'eth-usd',
        proxyAddress: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
        contractAddress: '0x3607e46698d218B3a5Cae44bF381475C0a5e2ca7',
        pair: ['ETH', 'USD'],
        heartbeat: 3600,
        assetName: 'Ethereum',
        feedCategory: 'verified',
        docs: { assetClass: 'rates' },
      },
    ]), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 47,
        method: 'chainlink.feeds',
        params: { query: 'ETH', limit: 1 },
      }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'chainlink.feeds')
    assert.equal(readProperty(response, 'result.api.provider'), 'chainlink')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.feeds.0.name'), 'ETH / USD')
    assert.equal(readProperty(response, 'result.feeds.0.proxyAddress'), '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('cataas.cats is exposed through JSON-RPC without auth', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify([
      {
        id: 'cat-123',
        tags: ['cute'],
        mimetype: 'image/jpeg',
        createdAt: '2024-11-11T21:11:17.120Z',
      },
    ]))) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 83,
        method: 'cataas.cats',
        params: { tags: 'cute', limit: 1 },
      }),
    )

    assert.equal(readProperty(response, 'jsonrpc'), '2.0')
    assert.equal(readProperty(response, 'id'), 83)
    assert.equal(readProperty(response, 'result.api.provider'), 'cataas')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.cats.0.id'), 'cat-123')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('dogceo.images is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    message: ['https://images.dog.ceo/breeds/hound-afghan/a.jpg'],
    status: 'success',
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 51, method: 'dogceo.images', params: { breed: 'hound', count: 1 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'dogceo.images')
    assert.equal(readProperty(response, 'result.api.provider'), 'dog-ceo')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.imageUrls.0'), 'https://images.dog.ceo/breeds/hound-afghan/a.jpg')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('helium.hotspots is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/pagination-metadata')) {
      return new Response(JSON.stringify({ pageSize: 10000, totalItems: 2, totalPages: 1 }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      cursor: 'next-token',
      items: [
        {
          key_to_asset_key: 'YM9Xn8A5H3L1R6AnPFjDa4YTay4fEXMATUiUbxEcmk7',
          entity_key_str: '1126Ab9X6wTgdy43BGcEnjEwkpFFCBDFwLokZFYYkxt83LHr6TFa',
          is_active: true,
          lat: 45.399853,
          long: 8.073501,
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 57, method: 'helium.hotspots', params: { subnetwork: 'iot', active: true, limit: 1 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'helium.hotspots')
    assert.equal(readProperty(response, 'result.api.provider'), 'helium')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.hotspots.0.entityKey'), '1126Ab9X6wTgdy43BGcEnjEwkpFFCBDFwLokZFYYkxt83LHr6TFa')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('httpdog.status is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    status_code: 404,
    title: 'Not Found',
    url: 'https://http.dog/404',
    image: {
      jpg: 'https://http.dog/404.jpg',
      webp: 'https://http.dog/404.webp',
      avif: 'https://http.dog/404.avif',
      jxl: 'https://http.dog/404.jxl',
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 52, method: 'httpdog.status', params: { statusCode: 404 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'httpdog.status')
    assert.equal(readProperty(response, 'result.api.provider'), 'http-dog')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.status.images.jpg'), 'https://http.dog/404.jpg')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('httpbin.get and httpbin.uuid are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/uuid') {
      return new Response(JSON.stringify({ uuid: '123e4567-e89b-12d3-a456-426614174000' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.href, 'https://httpbin.org/get?hello=world')
    return new Response(JSON.stringify({
      args: { hello: 'world' },
      headers: { 'User-Agent': 'public-apis-tui test' },
      origin: '203.0.113.10',
      url: url.href,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const getResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 53, method: 'httpbin.get', params: { query: 'hello=world' } }),
    )
    assert.equal(readProperty(getResponse, 'result.kind'), 'httpbin.get')
    assert.equal(readProperty(getResponse, 'result.api.provider'), 'httpbin')
    assert.equal(readProperty(getResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(getResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(getResponse, 'result.request.args.hello'), 'world')

    const uuidResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 54, method: 'httpbin.uuid', params: {} }),
    )
    assert.equal(readProperty(uuidResponse, 'result.kind'), 'httpbin.uuid')
    assert.equal(readProperty(uuidResponse, 'result.uuid'), '123e4567-e89b-12d3-a456-426614174000')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('icanhazip.ip is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://ipv4.icanhazip.com/')
    return new Response('203.0.113.10\n', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 55, method: 'icanhazip.ip', params: { protocol: 'ipv4' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'icanhazip.ip')
    assert.equal(readProperty(response, 'result.api.provider'), 'icanhazip')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.api.transport'), 'HTTPS text/plain')
    assert.equal(readProperty(response, 'result.ip.address'), '203.0.113.10')
    assert.equal(readProperty(response, 'result.ip.version'), 4)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ipfast.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://ipfast.dev/json')
    return new Response(JSON.stringify({
      ip: '203.0.113.10',
      country: 'US',
      countryName: 'United States',
      city: 'Portland',
      region: 'Oregon',
      asn: 16276,
      asOrganization: 'OVH US LLC',
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '120',
      },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 551, method: 'ipfast.lookup', params: {} }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'ipfast.lookup')
    assert.equal(readProperty(response, 'result.api.provider'), 'ipfast')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.ip.address'), '203.0.113.10')
    assert.equal(readProperty(response, 'result.geo.city'), 'Portland')
    assert.equal(readProperty(response, 'result.rateLimit.limit'), '120')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('indianpincode.search is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://indianpincode.com/api/search?q=mumbai')
    return new Response(JSON.stringify(createIndianPincodeSearchFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 39, method: 'indianpincode.search', params: { query: 'mumbai', limit: 10 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'indianpincode.search')
    assert.equal(readProperty(response, 'result.api.provider'), 'indianpincode')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.results.0.districtName'), 'Mumbai')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('postalpincode lookups are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    return new Response(JSON.stringify(createPostalPinCodeLookupFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const pincode = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 391, method: 'postalpincode.pincode', params: { pincode: '110001', limit: 2 } }),
    )

    assert.equal(readProperty(pincode, 'result.kind'), 'postalpincode.pincode')
    assert.equal(readProperty(pincode, 'result.api.provider'), 'postalpincode')
    assert.equal(readProperty(pincode, 'result.api.authentication'), 'none')
    assert.equal(readProperty(pincode, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(pincode, 'result.postOffices.0.name'), 'Connaught Place')

    const postOffice = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 392, method: 'postalpincode.postOffice', params: { name: 'Connaught Place', limit: 2 } }),
    )

    assert.equal(readProperty(postOffice, 'result.kind'), 'postalpincode.postOffice')
    assert.equal(readProperty(postOffice, 'result.postOffices.0.pincode'), '110001')
    assert.deepEqual(requestedUrls, [
      'https://api.postalpincode.in/pincode/110001',
      'https://api.postalpincode.in/postoffice/Connaught%20Place',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ipify.ip is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://api.ipify.org/?format=json')
    return new Response(JSON.stringify({ ip: '203.0.113.10' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 552, method: 'ipify.ip', params: { protocol: 'ipv4' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'ipify.ip')
    assert.equal(readProperty(response, 'result.api.provider'), 'ipify')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.ip.address'), '203.0.113.10')
    assert.equal(readProperty(response, 'result.ip.version'), 4)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('istanbulopendata search and records are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/package_search')) {
      assert.equal(url.searchParams.get('q'), 'metro')
      assert.equal(url.searchParams.get('rows'), '1000')
      return new Response(JSON.stringify(createIstanbulOpenDataPackageSearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname.endsWith('/datastore_search'), true)
    assert.equal(url.searchParams.get('resource_id'), '32c8813b-544e-4f6e-887d-5bb0835411d1')
    assert.equal(url.searchParams.get('limit'), '5000')
    return new Response(JSON.stringify(createIstanbulOpenDataDatastoreFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 553, method: 'istanbulopendata.search', params: { query: 'metro', limit: 1000 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'istanbulopendata.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'istanbulopendata')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.datasets.0.title'), 'Metro Lines Energy Consumption')

    const recordsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 554, method: 'istanbulopendata.records', params: { resourceId: '32c8813b-544e-4f6e-887d-5bb0835411d1', limit: 5000 } }),
    )
    assert.equal(readProperty(recordsResponse, 'result.kind'), 'istanbulopendata.records')
    assert.equal(readProperty(recordsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(recordsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(recordsResponse, 'result.records.0.Hat'), 'M1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('jsonplaceholder.posts and jsonplaceholder.post are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/posts') {
      assert.equal(url.searchParams.get('_limit'), '2')
      return new Response(JSON.stringify([createJsonPlaceholderPostFixture(1), createJsonPlaceholderPostFixture(2)]), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-total-count': '100', 'x-ratelimit-limit': '1000', 'x-ratelimit-remaining': '999' },
      })
    }
    assert.equal(url.pathname, '/posts/1')
    return new Response(JSON.stringify(createJsonPlaceholderPostFixture(1)), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '1000', 'x-ratelimit-remaining': '998' },
    })
  }) as typeof fetch
  try {
    const postsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 581, method: 'jsonplaceholder.posts', params: { limit: 2 } }),
    )
    assert.equal(readProperty(postsResponse, 'result.kind'), 'jsonplaceholder.posts')
    assert.equal(readProperty(postsResponse, 'result.api.provider'), 'jsonplaceholder')
    assert.equal(readProperty(postsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(postsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(postsResponse, 'result.posts.0.title'), 'Post 1')
    assert.equal(readProperty(postsResponse, 'result.pagination.total'), '100')

    const postResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 582, method: 'jsonplaceholder.post', params: { id: 1 } }),
    )
    assert.equal(readProperty(postResponse, 'result.kind'), 'jsonplaceholder.post')
    assert.equal(readProperty(postResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(postResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(postResponse, 'result.post.body'), 'Body for post 1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fakerapi.persons and fakerapi.companies are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.searchParams.get('_quantity'), '2')
    assert.equal(url.searchParams.get('_locale'), 'en_US')
    assert.equal(url.searchParams.get('_seed'), '12345')
    const data = url.pathname.endsWith('/persons')
      ? [createFakerApiPersonFixture(1), createFakerApiPersonFixture(2)]
      : [createFakerApiCompanyFixture(1), createFakerApiCompanyFixture(2)]
    return new Response(JSON.stringify({ status: 'OK', code: 200, total: 2, data }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '59' },
    })
  }) as typeof fetch
  try {
    const personsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 583, method: 'fakerapi.persons', params: { quantity: 2, locale: 'en_US', seed: 12345 } }),
    )
    assert.equal(readProperty(personsResponse, 'result.kind'), 'fakerapi.persons')
    assert.equal(readProperty(personsResponse, 'result.api.provider'), 'fakerapi')
    assert.equal(readProperty(personsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(personsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(personsResponse, 'result.persons.0.firstName'), 'Ada')

    const companiesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 584, method: 'fakerapi.companies', params: { quantity: 2, locale: 'en_US', seed: 12345 } }),
    )
    assert.equal(readProperty(companiesResponse, 'result.kind'), 'fakerapi.companies')
    assert.equal(readProperty(companiesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(companiesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(companiesResponse, 'result.companies.0.name'), 'Ada Labs 1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('openbrewerydb operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/breweries/meta')) {
      assert.equal(url.searchParams.get('by_city'), 'san_diego')
      return new Response(JSON.stringify(createOpenBreweryDbMetaFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '120', 'x-ratelimit-remaining': '117' },
      })
    }
    if (url.pathname.endsWith('/breweries/search')) {
      assert.equal(url.searchParams.get('query'), 'dogfish')
      assert.equal(url.searchParams.get('per_page'), '2')
      return new Response(JSON.stringify([createOpenBreweryDbBreweryFixture('search-1')]), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '120', 'x-ratelimit-remaining': '118' },
      })
    }
    assert.equal(url.searchParams.get('by_city'), 'san_diego')
    assert.equal(url.searchParams.get('per_page'), '2')
    return new Response(JSON.stringify([createOpenBreweryDbBreweryFixture('list-1')]), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-ratelimit-limit': '120', 'x-ratelimit-remaining': '119' },
    })
  }) as typeof fetch
  try {
    const breweriesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 585, method: 'openbrewerydb.breweries', params: { city: 'san_diego', perPage: 2 } }),
    )
    assert.equal(readProperty(breweriesResponse, 'result.kind'), 'openbrewerydb.breweries')
    assert.equal(readProperty(breweriesResponse, 'result.api.provider'), 'openbrewerydb')
    assert.equal(readProperty(breweriesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(breweriesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(breweriesResponse, 'result.breweries.0.name'), 'Example Brewery')

    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 586, method: 'openbrewerydb.search', params: { query: 'dogfish', perPage: 2 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'openbrewerydb.search')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.query.query'), 'dogfish')

    const metaResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 587, method: 'openbrewerydb.meta', params: { city: 'san_diego' } }),
    )
    assert.equal(readProperty(metaResponse, 'result.kind'), 'openbrewerydb.meta')
    assert.equal(readProperty(metaResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(metaResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(metaResponse, 'result.meta.byType.micro'), 45)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('openfoodfacts product is exposed through JSON-RPC without auth and unstable search is hidden', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/api/v2/product/737628064502.json')
    assert.equal(url.searchParams.has('fields'), true)
    return new Response(JSON.stringify(createOpenFoodFactsProductEnvelopeFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const productResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 588, method: 'openfoodfacts.product', params: { barcode: '737628064502' } }),
    )
    assert.equal(readProperty(productResponse, 'result.kind'), 'openfoodfacts.product')
    assert.equal(readProperty(productResponse, 'result.api.provider'), 'openfoodfacts')
    assert.equal(readProperty(productResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(productResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(productResponse, 'result.product.name'), 'Thai peanut noodle kit')

    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 589, method: 'openfoodfacts.search', params: { query: 'nutella', pageSize: 2 } }),
    )
    assert.equal(readProperty(searchResponse, 'error.code'), -32601)
    assert.match(String(readProperty(searchResponse, 'error.message')), /Unknown RPC method/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('opengovernmentau search and records are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/package_search')) {
      assert.equal(url.searchParams.get('q'), 'business')
      assert.equal(url.searchParams.get('rows'), '1000')
      return new Response(JSON.stringify(createOpenGovernmentAustraliaPackageSearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname.endsWith('/datastore_search'), true)
    assert.equal(url.searchParams.get('resource_id'), '55ad4b1c-5eeb-44ea-8b29-d410da431be3')
    assert.equal(url.searchParams.get('limit'), '5000')
    return new Response(JSON.stringify(createOpenGovernmentAustraliaDatastoreFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 590, method: 'opengovernmentau.search', params: { query: 'business', limit: 1000 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'opengovernmentau.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'opengovernmentau')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.datasets.0.title'), 'ASIC - Business Names Dataset')

    const recordsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 591, method: 'opengovernmentau.records', params: { resourceId: '55ad4b1c-5eeb-44ea-8b29-d410da431be3', limit: 5000 } }),
    )
    assert.equal(readProperty(recordsResponse, 'result.kind'), 'opengovernmentau.records')
    assert.equal(readProperty(recordsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(recordsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(recordsResponse, 'result.records.0.BN_NAME'), 'HOMSAFE')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('opengovernmentcanada search and dataset are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/package_search')) {
      assert.equal(url.searchParams.get('q'), 'business')
      assert.equal(url.searchParams.get('rows'), '1000')
      return new Response(JSON.stringify(createOpenGovernmentCanadaPackageSearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname.endsWith('/package_show'), true)
    assert.equal(url.searchParams.get('id'), '2d90548d-50ef-4802-91f8-c59c5cf68251')
    return new Response(JSON.stringify(createOpenGovernmentCanadaPackageShowFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 592, method: 'opengovernmentcanada.search', params: { query: 'business', limit: 1000 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'opengovernmentcanada.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'opengovernmentcanada')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.datasets.0.title'), 'Open Government API')

    const datasetResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 593, method: 'opengovernmentcanada.dataset', params: { packageId: '2d90548d-50ef-4802-91f8-c59c5cf68251' } }),
    )
    assert.equal(readProperty(datasetResponse, 'result.kind'), 'opengovernmentcanada.dataset')
    assert.equal(readProperty(datasetResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(datasetResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(datasetResponse, 'result.dataset.resources.0.name'), 'OpenAPI Specification')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('opengovernmentde search and dataset are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/package_search')) {
      assert.equal(url.searchParams.get('q'), 'verkehr')
      assert.equal(url.searchParams.get('rows'), '1000')
      return new Response(JSON.stringify(createOpenGovernmentGermanyPackageSearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname.endsWith('/package_show'), true)
    assert.equal(url.searchParams.get('id'), '89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7')
    return new Response(JSON.stringify(createOpenGovernmentGermanyPackageShowFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 594, method: 'opengovernmentde.search', params: { query: 'verkehr', limit: 1000 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'opengovernmentde.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'opengovernmentde')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.datasets.0.title'), 'GovData Metadatenkatalog')

    const datasetResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 595, method: 'opengovernmentde.dataset', params: { packageId: '89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7' } }),
    )
    assert.equal(readProperty(datasetResponse, 'result.kind'), 'opengovernmentde.dataset')
    assert.equal(readProperty(datasetResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(datasetResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(datasetResponse, 'result.dataset.resources.0.name'), 'JSON-LD Catalog')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('opengovernmentuk search and dataset are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/package_search')) {
      assert.equal(url.searchParams.get('q'), 'business')
      assert.equal(url.searchParams.get('rows'), '1000')
      return new Response(JSON.stringify(createOpenGovernmentUkPackageSearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname.endsWith('/package_show'), true)
    assert.equal(url.searchParams.get('id'), '6d3d7654-4992-4203-92e8-81bfd6fd258b')
    return new Response(JSON.stringify(createOpenGovernmentUkPackageShowFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 596, method: 'opengovernmentuk.search', params: { query: 'business', limit: 1000 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'opengovernmentuk.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'opengovernmentuk')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.datasets.0.title'), 'Business Rates - Small Business Rate Relief')

    const datasetResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 597, method: 'opengovernmentuk.dataset', params: { packageId: '6d3d7654-4992-4203-92e8-81bfd6fd258b' } }),
    )
    assert.equal(readProperty(datasetResponse, 'result.kind'), 'opengovernmentuk.dataset')
    assert.equal(readProperty(datasetResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(datasetResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(datasetResponse, 'result.dataset.resources.0.name'), 'Small Business rates relief - October 2025')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('opengovernmentusa search, organizations, and keywords are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/search') {
      assert.equal(url.searchParams.get('q'), 'business')
      assert.equal(url.searchParams.get('per_page'), '1000')
      assert.equal(url.searchParams.get('org_slug'), 'census')
      return new Response(JSON.stringify(createOpenGovernmentUsSearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.pathname === '/api/organizations') {
      return new Response(JSON.stringify(createOpenGovernmentUsOrganizationsFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/api/keywords')
    assert.equal(url.searchParams.get('size'), '1000')
    assert.equal(url.searchParams.get('min_count'), '1')
    return new Response(JSON.stringify(createOpenGovernmentUsKeywordsFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 598, method: 'opengovernmentusa.search', params: { query: 'business', limit: 1000, orgSlug: 'census' } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'opengovernmentusa.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'opengovernmentusa')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.datasets.0.title'), 'Small Business Size Standards')

    const organizationsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 599, method: 'opengovernmentusa.organizations', params: { limit: 120 } }),
    )
    assert.equal(readProperty(organizationsResponse, 'result.kind'), 'opengovernmentusa.organizations')
    assert.equal(readProperty(organizationsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(organizationsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(organizationsResponse, 'result.organizations.0.slug'), 'census')

    const keywordsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 600, method: 'opengovernmentusa.keywords', params: { size: 1000, minCount: 1 } }),
    )
    assert.equal(readProperty(keywordsResponse, 'result.kind'), 'opengovernmentusa.keywords')
    assert.equal(readProperty(keywordsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(keywordsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(keywordsResponse, 'result.keywords.0.keyword'), 'county or equivalent entity')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('usaspending awards, overTime, and agencies are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/spending_by_award/')) {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      assert.equal(body.limit, 100)
      assert.equal(body.page, 1)
      return new Response(JSON.stringify(createUsaSpendingAwardsFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.pathname.endsWith('/spending_over_time/')) {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      assert.equal(body.group, 'fiscal_year')
      return new Response(JSON.stringify(createUsaSpendingOverTimeFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname.endsWith('/toptier_agencies/'), true)
    assert.equal(url.searchParams.get('sort'), 'budget_authority_amount')
    return new Response(JSON.stringify(createUsaSpendingAgenciesFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const awardsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 601, method: 'usaspending.awards', params: { limit: 100 } }),
    )
    assert.equal(readProperty(awardsResponse, 'result.kind'), 'usaspending.awards')
    assert.equal(readProperty(awardsResponse, 'result.api.provider'), 'usaspending')
    assert.equal(readProperty(awardsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(awardsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(awardsResponse, 'result.awards.0.recipientName'), 'HUMANA GOVERNMENT BUSINESS INC')

    const overTimeResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 602, method: 'usaspending.overTime', params: { group: 'fiscal_year' } }),
    )
    assert.equal(readProperty(overTimeResponse, 'result.kind'), 'usaspending.overTime')
    assert.equal(readProperty(overTimeResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(overTimeResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(overTimeResponse, 'result.periods.0.label'), '2025')

    const agenciesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 603, method: 'usaspending.agencies', params: { limit: 100 } }),
    )
    assert.equal(readProperty(agenciesResponse, 'result.kind'), 'usaspending.agencies')
    assert.equal(readProperty(agenciesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(agenciesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(agenciesResponse, 'result.agencies.0.abbreviation'), 'TREAS')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('whiskyhunter.distilleries is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/api/distilleries_info/')
    return new Response(JSON.stringify(createWhiskyHunterDistilleriesFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 590, method: 'whiskyhunter.distilleries', params: { country: 'Scotland', limit: 2 } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'whiskyhunter.distilleries')
    assert.equal(readProperty(response, 'result.api.provider'), 'whiskyhunter')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.distilleries.0.name'), '8 Doors Distillery')
    assert.equal(readProperty(response, 'result.pagination.upstreamTotal'), 3)
  } finally {
    globalThis.fetch = originalFetch
  }
})


test('nbp table and history are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(`${url.pathname}${url.search}`)
    if (url.pathname.includes('/rates/')) {
      return new Response(JSON.stringify({ table: 'A', currency: 'dolar amerykański', code: 'USD', rates: [{ no: '084/A/NBP/2026', effectiveDate: '2026-05-04', mid: 3.6303 }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify([{ table: 'A', no: '084/A/NBP/2026', effectiveDate: '2026-05-04', rates: [{ currency: 'dolar amerykański', code: 'USD', mid: 3.6303 }] }]), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const table = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 754, method: 'nbp.tables', params: { table: 'A', code: 'USD', limit: 1 } }))
    assert.equal(readProperty(table, 'result.kind'), 'nbp.tables')
    assert.equal(readProperty(table, 'result.api.provider'), 'nbp')
    assert.equal(readProperty(table, 'result.api.authentication'), 'none')
    assert.equal(readProperty(table, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(table, 'result.rates.0.code'), 'USD')

    const history = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 755, method: 'nbp.history', params: { table: 'A', code: 'USD', count: 1 } }))
    assert.equal(readProperty(history, 'result.kind'), 'nbp.history')
    assert.equal(readProperty(history, 'result.rates.0.mid'), 3.6303)
    assert.deepEqual(requestedUrls, [
      '/api/exchangerates/tables/a/?format=json',
      '/api/exchangerates/rates/a/usd/last/1/?format=json',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('vatcomply operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(`${url.pathname}${url.search}`)
    if (url.pathname === '/rates') {
      return new Response(JSON.stringify({ date: '2026-04-16', base: 'USD', rates: { EUR: 0.848752, GBP: 0.738355 } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === '/vat_rates') {
      return new Response(JSON.stringify([{ country_code: 'DE', country_name: 'Germany', standard_rate: 19, reduced_rates: [7], currency: 'EUR', member_state: true, rate_comments: {}, rate_categories: {} }]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === '/geolocate') {
      return new Response(JSON.stringify({ country_code: 'US', iso3: 'USA', name: 'United States', currency: 'USD', region: 'Americas', subregion: 'Northern America', latitude: 38, longitude: -97, ip: '203.0.113.10' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ valid: false, vat_number: '123456789', country_code: 'DE', name: '---', address: '---' }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const rates = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 756, method: 'vatcomply.rates', params: { base: 'USD', symbols: 'EUR,GBP', limit: 2 } }))
    assert.equal(readProperty(rates, 'result.kind'), 'vatcomply.rates')
    assert.equal(readProperty(rates, 'result.api.provider'), 'vatcomply')
    assert.equal(readProperty(rates, 'result.api.authentication'), 'none')
    assert.equal(readProperty(rates, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(rates, 'result.rates.0.code'), 'EUR')

    const vatRates = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 757, method: 'vatcomply.vatRates', params: { countryCode: 'DE', limit: 1 } }))
    assert.equal(readProperty(vatRates, 'result.kind'), 'vatcomply.vatRates')
    assert.equal(readProperty(vatRates, 'result.rates.0.countryCode'), 'DE')

    const geolocate = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 758, method: 'vatcomply.geolocate', params: {} }))
    assert.equal(readProperty(geolocate, 'result.kind'), 'vatcomply.geolocate')
    assert.equal(readProperty(geolocate, 'result.location.countryCode'), 'US')

    const vat = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 759, method: 'vatcomply.vat', params: { vatNumber: 'DE123456789' } }))
    assert.equal(readProperty(vat, 'result.kind'), 'vatcomply.vat')
    assert.equal(readProperty(vat, 'result.validation.valid'), false)

    assert.deepEqual(requestedUrls, [
      '/rates?base=USD&symbols=EUR%2CGBP',
      '/vat_rates?country_code=DE',
      '/geolocate',
      '/vat?vat_number=DE123456789',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('nhtsa decode and makes operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.searchParams.get('format'), 'json')
    if (url.pathname.includes('/DecodeVinValues/')) {
      assert.equal(url.searchParams.get('modelyear'), '2003')
      return new Response(JSON.stringify(createNhtsaDecodeFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname.endsWith('/GetMakesForVehicleType/car'), true)
    return new Response(JSON.stringify(createNhtsaMakesFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const decodeResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 591, method: 'nhtsa.decodeVin', params: { vin: '1HGCM82633A004352', modelYear: 2003 } }),
    )
    assert.equal(readProperty(decodeResponse, 'result.kind'), 'nhtsa.decodeVin')
    assert.equal(readProperty(decodeResponse, 'result.api.provider'), 'nhtsa')
    assert.equal(readProperty(decodeResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(decodeResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(decodeResponse, 'result.decode.make'), 'HONDA')

    const makesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 592, method: 'nhtsa.makesForType', params: { vehicleType: 'car', limit: 2 } }),
    )
    assert.equal(readProperty(makesResponse, 'result.kind'), 'nhtsa.makesForType')
    assert.equal(readProperty(makesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(makesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(makesResponse, 'result.makes.0.makeName'), 'ASTON MARTIN')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('openmeteo forecast and geocoding are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.hostname === 'api.open-meteo.com') {
      assert.equal(url.pathname, '/v1/forecast')
      assert.equal(url.searchParams.get('forecast_days'), '16')
      return new Response(JSON.stringify(createOpenMeteoForecastFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.hostname, 'geocoding-api.open-meteo.com')
    assert.equal(url.searchParams.get('name'), 'Berlin')
    return new Response(JSON.stringify(createOpenMeteoGeocodingFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const forecastResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 593, method: 'openmeteo.forecast', params: { latitude: 52.52, longitude: 13.41, forecastDays: 16 } }),
    )
    assert.equal(readProperty(forecastResponse, 'result.kind'), 'openmeteo.forecast')
    assert.equal(readProperty(forecastResponse, 'result.api.provider'), 'openmeteo')
    assert.equal(readProperty(forecastResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(forecastResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(forecastResponse, 'result.location.timezone'), 'Europe/Berlin')

    const geocodingResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 594, method: 'openmeteo.geocoding', params: { name: 'Berlin', count: 2 } }),
    )
    assert.equal(readProperty(geocodingResponse, 'result.kind'), 'openmeteo.geocoding')
    assert.equal(readProperty(geocodingResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(geocodingResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(geocodingResponse, 'result.locations.0.name'), 'Berlin')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('opensensemap stats, boxes, and sensors are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedPaths: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.hostname, 'api.opensensemap.org')
    requestedPaths.push(url.pathname)
    if (url.pathname === '/stats') {
      return new Response(JSON.stringify([16734, 11416106403, 6863]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === '/boxes') {
      assert.equal(url.searchParams.get('name'), 'Berlin')
      return new Response(JSON.stringify([createOpenSenseMapBoxFixture()]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.pathname, '/boxes/5391be52a8341554157792e6/sensors')
    return new Response(JSON.stringify(createOpenSenseMapBoxFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const statsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 599, method: 'opensensemap.stats', params: {} }),
    )
    assert.equal(readProperty(statsResponse, 'result.kind'), 'opensensemap.stats')
    assert.equal(readProperty(statsResponse, 'result.api.provider'), 'opensensemap')
    assert.equal(readProperty(statsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(statsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(statsResponse, 'result.stats.senseBoxes'), 16734)

    const boxesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 600, method: 'opensensemap.boxes', params: { name: 'Berlin', limit: 5 } }),
    )
    assert.equal(readProperty(boxesResponse, 'result.kind'), 'opensensemap.boxes')
    assert.equal(readProperty(boxesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(boxesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(boxesResponse, 'result.boxes.0.name'), 'LeKa Berlin')

    const sensorsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 601, method: 'opensensemap.sensors', params: { boxId: '5391be52a8341554157792e6', count: 1 } }),
    )
    assert.equal(readProperty(sensorsResponse, 'result.kind'), 'opensensemap.sensors')
    assert.equal(readProperty(sensorsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(sensorsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(sensorsResponse, 'result.box.sensors.0.title'), 'Temperatur')
    assert.deepEqual(requestedPaths, ['/stats', '/boxes', '/boxes/5391be52a8341554157792e6/sensors'])
  } finally {
    globalThis.fetch = originalFetch
  }
})






test('econdb sources and datasets are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    const results = url.pathname.endsWith('/sources/')
      ? [{ source: 'Eurostat', description: 'Eurostat', prefix: 'EU' }]
      : [{ dataset: 'NAMA_10_A64_E', description: 'National accounts employment data by industry', size: 45844, lastupdate: '2026-01-07', last_sync: '2026-01-19T00:18:00Z' }]
    return new Response(JSON.stringify({ count: 1, pages: 1, next: null, previous: null, results }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const sources = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 612, method: 'econdb.sources', params: { page: 1, limit: 1 } }))
    assert.equal(readProperty(sources, 'result.kind'), 'econdb.sources')
    assert.equal(readProperty(sources, 'result.api.authentication'), 'none')
    assert.equal(readProperty(sources, 'result.api.usesBrowserClickstream'), false)

    const datasets = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 613, method: 'econdb.datasets', params: { page: 1, limit: 1 } }))
    assert.equal(readProperty(datasets, 'result.kind'), 'econdb.datasets')
    assert.equal(readProperty(datasets, 'result.datasets.0.dataset'), 'NAMA_10_A64_E')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('portfoliooptimizer minimum variance is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/v1/portfolios/optimization/minimum-variance')
    assert.equal(init?.method, 'POST')
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    assert.equal(body.assets, 3)
    return new Response(JSON.stringify({ assetsWeights: [0.6245788660589642, 0.23740499218849087, 0.13801614175254476] }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'ratelimit-limit': '1', 'ratelimit-remaining': '0', 'ratelimit-reset': '1' },
    })
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 614, method: 'portfoliooptimizer.minimumVariance', params: { assets: 3 } }))
    assert.equal(readProperty(response, 'result.kind'), 'portfoliooptimizer.minimumVariance')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.portfolio.assetsWeights.0'), 0.6245788660589642)
    assert.equal(readProperty(response, 'result.rateLimit.limit'), '1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('secedgar submissions and company concept are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return new Response(JSON.stringify(url.pathname.includes('/submissions/') ? createSecEdgarSubmissionsFixture() : createSecEdgarConceptFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const submissions = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 615, method: 'secedgar.submissions', params: { cik: '0000320193', limit: 2 } }))
    assert.equal(readProperty(submissions, 'result.kind'), 'secedgar.submissions')
    assert.equal(readProperty(submissions, 'result.api.authentication'), 'none')
    assert.equal(readProperty(submissions, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(submissions, 'result.company.name'), 'Apple Inc.')

    const concept = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 616, method: 'secedgar.companyConcept', params: { cik: '0000320193', tag: 'AccountsPayableCurrent', limit: 2 } }))
    assert.equal(readProperty(concept, 'result.kind'), 'secedgar.companyConcept')
    assert.equal(readProperty(concept, 'result.api.authentication'), 'none')
    assert.equal(readProperty(concept, 'result.facts.0.form'), '10-Q')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('pm25opendata airbox and lass are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    const source = url.pathname.endsWith('last-all-airbox.json') ? 'airbox' : 'lass'
    return new Response(JSON.stringify({
      source: `last-all-${source} by IIS-NRL`,
      num_of_records: source === 'airbox' ? 506 : 10,
      feeds: [{ device_id: source === 'airbox' ? '74DA38F7C63C' : 'WF_8629500', s_d0: 23, s_d1: 29, timestamp: '2026-05-03T23:18:42Z', gps_lat: 24.998, gps_lon: 121.425 }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const airbox = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 610, method: 'pm25opendata.airbox', params: { limit: 1 } }))
    assert.equal(readProperty(airbox, 'result.kind'), 'pm25opendata.airbox')
    assert.equal(readProperty(airbox, 'result.api.authentication'), 'none')
    assert.equal(readProperty(airbox, 'result.api.usesBrowserClickstream'), false)

    const lass = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 611, method: 'pm25opendata.lass', params: { limit: 1 } }))
    assert.equal(readProperty(lass, 'result.kind'), 'pm25opendata.lass')
    assert.equal(readProperty(lass, 'result.feeds.0.pm25'), 23)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('nationalgrideso search and records are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/package_search')) {
      return new Response(JSON.stringify({ success: true, result: { count: 1, results: [{ id: 'dataset-id', name: 'daily-demand-update', title: 'Demand Data Update', resources: [{ id: '177f6fa4-ae49-4182-81ea-0c6b35f26ca6', datastore_active: true }] }] } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true, result: { resource_id: '177f6fa4-ae49-4182-81ea-0c6b35f26ca6', total: 1, fields: [{ id: '_id' }, { id: 'SETTLEMENT_DATE' }, { id: 'ND' }], records: [{ _id: 1, SETTLEMENT_DATE: '2026-04-01', ND: 24019 }] } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const search = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 608, method: 'nationalgrideso.search', params: { query: 'demand', limit: 1 } }))
    assert.equal(readProperty(search, 'result.kind'), 'nationalgrideso.search')
    assert.equal(readProperty(search, 'result.api.authentication'), 'none')
    assert.equal(readProperty(search, 'result.api.usesBrowserClickstream'), false)

    const records = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 609, method: 'nationalgrideso.records', params: { resourceId: '177f6fa4-ae49-4182-81ea-0c6b35f26ca6', limit: 1 } }))
    assert.equal(readProperty(records, 'result.kind'), 'nationalgrideso.records')
    assert.equal(readProperty(records, 'result.records.0.ND'), 24019)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('luchtmeetnet operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/components')) {
      return new Response(JSON.stringify({ pagination: { current_page: 1, page_list: [1] }, data: [{ formula: 'NO2', name: { EN: 'Nitrogen dioxide (NO2)' } }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname.endsWith('/measurements')) {
      return new Response(JSON.stringify({ pagination: { current_page: 1, page_list: [1] }, data: [{ station_number: 'NL01485', value: 17.4, timestamp_measured: '2026-05-03T22:00:00+00:00', formula: 'NO2' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ data: [{ value: 41, timestamp_measured: '2026-05-03T22:00:00+00:00', formula: 'NO2' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const components = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 605, method: 'luchtmeetnet.components', params: { limit: 1 } }))
    assert.equal(readProperty(components, 'result.kind'), 'luchtmeetnet.components')
    assert.equal(readProperty(components, 'result.api.authentication'), 'none')
    assert.equal(readProperty(components, 'result.api.usesBrowserClickstream'), false)

    const measurements = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 606, method: 'luchtmeetnet.measurements', params: { stationNumber: 'NL01485', formula: 'NO2', limit: 1 } }))
    assert.equal(readProperty(measurements, 'result.kind'), 'luchtmeetnet.measurements')
    assert.equal(readProperty(measurements, 'result.measurements.0.value'), 17.4)

    const concentrations = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 607, method: 'luchtmeetnet.concentrations', params: { formula: 'NO2', latitude: 51.924452, longitude: 4.458807, limit: 1 } }))
    assert.equal(readProperty(concentrations, 'result.kind'), 'luchtmeetnet.concentrations')
    assert.equal(readProperty(concentrations, 'result.concentrations.0.value'), 41)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('gruenstromindex.forecast is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    forecast: [
      { epochtime: 1777842000, eevalue: 1, ewind: 0, esolar: 0, sci: 25, gsi: 0.95, timeStamp: 1777842000000, energyprice: '-0.0005000', co2_avg: 342, co2_g_standard: 373, co2_g_oekostrom: 64, zip: '69168' },
      { epochtime: 1777845600, eevalue: 13, ewind: 12, esolar: 0, sci: 25, gsi: 12.35, timeStamp: 1777845600000, energyprice: '-0.0065000', co2_avg: 342, co2_g_standard: 334, co2_g_oekostrom: 58, zip: '69168' },
    ],
    provisioning: { license: 'CC BY-NC-SA 4.0', tier: 'anonymous' },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 604, method: 'gruenstromindex.forecast', params: { zip: '69168', limit: 2 } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'gruenstromindex.forecast')
    assert.equal(readProperty(response, 'result.api.provider'), 'gruenstromindex')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.forecast.1.gsi'), 12.35)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('datausa population and geographies are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/tesseract/data.jsonrecords') {
      assert.equal(url.searchParams.get('cube'), 'acs_yg_total_population_5')
      assert.equal(url.searchParams.get('drilldowns'), 'State,Year')
      assert.equal(url.searchParams.get('time'), 'Year.latest')
      assert.equal(url.searchParams.get('State'), '04000US06')
      return new Response(JSON.stringify(createDataUsaPopulationFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/tesseract/members')
    assert.equal(url.searchParams.get('level'), 'State')
    return new Response(JSON.stringify(createDataUsaGeographiesFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const populationResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 597, method: 'datausa.population', params: { drilldown: 'State', geographyId: '04000US06', year: 'latest', limit: 20 } }),
    )
    assert.equal(readProperty(populationResponse, 'result.kind'), 'datausa.population')
    assert.equal(readProperty(populationResponse, 'result.api.provider'), 'datausa')
    assert.equal(readProperty(populationResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(populationResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(populationResponse, 'result.rows.0.geography'), 'California')

    const geographiesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 598, method: 'datausa.geographies', params: { level: 'State', query: 'California', limit: 20 } }),
    )
    assert.equal(readProperty(geographiesResponse, 'result.kind'), 'datausa.geographies')
    assert.equal(readProperty(geographiesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(geographiesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(geographiesResponse, 'result.members.0.key'), '04000US06')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('fedtreasury debt and rates are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.searchParams.get('page[size]'), url.pathname.endsWith('/avg_interest_rates') ? '5' : '1')
    if (url.pathname.endsWith('/debt_to_penny')) {
      assert.equal(url.searchParams.get('fields'), 'record_date,tot_pub_debt_out_amt,intragov_hold_amt,debt_held_public_amt')
      return new Response(JSON.stringify(createFedTreasuryDebtFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname.endsWith('/avg_interest_rates'), true)
    assert.equal(url.searchParams.get('fields'), 'record_date,security_desc,avg_interest_rate_amt,src_line_nbr')
    return new Response(JSON.stringify(createFedTreasuryRatesFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const debtResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 599, method: 'fedtreasury.debt', params: { pageSize: 1 } }),
    )
    assert.equal(readProperty(debtResponse, 'result.kind'), 'fedtreasury.debt')
    assert.equal(readProperty(debtResponse, 'result.api.provider'), 'fedtreasury')
    assert.equal(readProperty(debtResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(debtResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(debtResponse, 'result.rows.0.recordDate'), '2026-04-30')

    const ratesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 600, method: 'fedtreasury.rates', params: { pageSize: 5 } }),
    )
    assert.equal(readProperty(ratesResponse, 'result.kind'), 'fedtreasury.rates')
    assert.equal(readProperty(ratesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(ratesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(ratesResponse, 'result.rows.0.securityDescription'), 'Treasury Bills')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Food Standards Agency operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input))
    assert.equal(init?.headers !== undefined && (init.headers as Record<string, string>)['x-api-version'], '2')
    if (url.pathname === '/Authorities/basic') {
      return new Response(JSON.stringify(createFoodStandardsAgencyAuthoritiesFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/Establishments')
    assert.equal(url.searchParams.get('name'), 'coffee')
    assert.equal(url.searchParams.get('pageSize'), '5000')
    return new Response(JSON.stringify(createFoodStandardsAgencyEstablishmentsFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const authoritiesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 601, method: 'foodstandardsagency.authorities', params: { limit: 5000 } }),
    )
    assert.equal(readProperty(authoritiesResponse, 'result.kind'), 'foodstandardsagency.authorities')
    assert.equal(readProperty(authoritiesResponse, 'result.api.provider'), 'foodstandardsagency')
    assert.equal(readProperty(authoritiesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(authoritiesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(authoritiesResponse, 'result.authorities.0.name'), 'Aberdeen City')

    const establishmentsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 602, method: 'foodstandardsagency.establishments', params: { query: 'coffee', pageSize: 5000 } }),
    )
    assert.equal(readProperty(establishmentsResponse, 'result.kind'), 'foodstandardsagency.establishments')
    assert.equal(readProperty(establishmentsResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(establishmentsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(establishmentsResponse, 'result.establishments.0.businessName'), 'Coffey Coffee')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('mfapi search and latest are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/mf/search') {
      assert.equal(url.searchParams.get('q'), 'SBI')
      return new Response(JSON.stringify(createMfApiSearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/mf/125497/latest')
    return new Response(JSON.stringify(createMfApiLatestFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 601, method: 'mfapi.search', params: { query: 'SBI', limit: 2 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'mfapi.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'mfapi')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.schemes.0.schemeCode'), 125497)

    const latestResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 602, method: 'mfapi.latest', params: { schemeCode: 125497 } }),
    )
    assert.equal(readProperty(latestResponse, 'result.kind'), 'mfapi.latest')
    assert.equal(readProperty(latestResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(latestResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(latestResponse, 'result.fund.schemeCode'), 125497)
    assert.equal(readProperty(latestResponse, 'result.nav.nav'), 193.4131)
  } finally {
    globalThis.fetch = originalFetch
  }
})


test('razorpayifsc.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    MICR: '560226263',
    BRANCH: 'THE AGS EMPLOYEES COOP BANK LTD',
    ADDRESS: 'SANGMESH BIRADAR BANGALORE',
    STATE: 'KARNATAKA',
    CONTACT: '+918022265658',
    UPI: true,
    RTGS: true,
    CITY: 'BANGALORE URBAN',
    CENTRE: 'BANGALORE',
    DISTRICT: 'BANGALORE',
    NEFT: true,
    IMPS: true,
    SWIFT: 'HDFCINBB',
    ISO3166: 'IN-KA',
    BANK: 'HDFC Bank',
    BANKCODE: 'HDFC',
    IFSC: 'HDFC0CAGSBK',
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 603, method: 'razorpayifsc.lookup', params: { ifsc: 'HDFC0CAGSBK' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'razorpayifsc.lookup')
    assert.equal(readProperty(response, 'result.api.provider'), 'razorpayifsc')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.branch.bank'), 'HDFC Bank')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('usweather point and forecast are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input))
    assert.match(String((init?.headers as Record<string, string> | undefined)?.['user-agent'] ?? ''), /public-apis-tui/)
    if (url.pathname === '/points/38.8894,-77.0352') {
      return new Response(JSON.stringify(createUsWeatherPointFixture()), {
        status: 200,
        headers: { 'content-type': 'application/geo+json' },
      })
    }
    assert.equal(url.pathname, '/gridpoints/LWX/97,71/forecast')
    return new Response(JSON.stringify(createUsWeatherForecastFixture()), {
      status: 200,
      headers: { 'content-type': 'application/geo+json' },
    })
  }) as typeof fetch
  try {
    const pointResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 595, method: 'usweather.point', params: { latitude: 38.8894, longitude: -77.0352 } }),
    )
    assert.equal(readProperty(pointResponse, 'result.kind'), 'usweather.point')
    assert.equal(readProperty(pointResponse, 'result.api.provider'), 'usweather')
    assert.equal(readProperty(pointResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(pointResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(pointResponse, 'result.point.office'), 'LWX')

    const forecastResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 596, method: 'usweather.forecast', params: { office: 'LWX', gridX: 97, gridY: 71, limit: 2 } }),
    )
    assert.equal(readProperty(forecastResponse, 'result.kind'), 'usweather.forecast')
    assert.equal(readProperty(forecastResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(forecastResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(forecastResponse, 'result.forecast.periods.0.name'), 'Tonight')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('hko current and forecast are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedDataTypes: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.hostname, 'data.weather.gov.hk')
    requestedDataTypes.push(url.searchParams.get('dataType') ?? '')
    return new Response(JSON.stringify(url.searchParams.get('dataType') === 'rhrread' ? createHkoCurrentFixture() : createHkoForecastFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const currentResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 597, method: 'hko.current', params: { lang: 'en', station: 'Observatory', limit: 10 } }),
    )
    assert.equal(readProperty(currentResponse, 'result.kind'), 'hko.current')
    assert.equal(readProperty(currentResponse, 'result.api.provider'), 'hko')
    assert.equal(readProperty(currentResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(currentResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(currentResponse, 'result.current.temperature.data.0.place'), 'Hong Kong Observatory')

    const forecastResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 598, method: 'hko.forecast', params: { lang: 'en', limit: 1 } }),
    )
    assert.equal(readProperty(forecastResponse, 'result.kind'), 'hko.forecast')
    assert.equal(readProperty(forecastResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(forecastResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(forecastResponse, 'result.forecasts.0.forecastDate'), '20260505')
    assert.deepEqual(requestedDataTypes, ['rhrread', 'fnd'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('jsdelivr metadata and stats are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.includes('/stats/')) {
      return new Response(JSON.stringify({
        hits: { rank: 23, typeRank: 16, total: 300, dates: { '2026-05-01': 100, '2026-05-02': 200 }, prev: { total: 250 } },
        bandwidth: { rank: 30, typeRank: 20, total: 3072, dates: { '2026-05-01': 1024, '2026-05-02': 2048 }, prev: { total: 2048 } },
        links: { self: url.href },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.pathname, '/v1/packages/npm/jquery')
    return new Response(JSON.stringify({
      type: 'npm',
      name: 'jquery',
      tags: { latest: '4.0.0' },
      versions: [{ version: '4.0.0', links: { self: 'https://data.jsdelivr.com/v1/packages/npm/jquery@4.0.0' } }],
      links: { self: url.href },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const metadataResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 581, method: 'jsdelivr.metadata', params: { packageName: 'jquery', versionLimit: 1 } }),
    )
    assert.equal(readProperty(metadataResponse, 'result.kind'), 'jsdelivr.metadata')
    assert.equal(readProperty(metadataResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(metadataResponse, 'result.package.latest'), '4.0.0')

    const statsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 582, method: 'jsdelivr.stats', params: { packageName: 'jquery', period: 'month', dateLimit: 1 } }),
    )
    assert.equal(readProperty(statsResponse, 'result.kind'), 'jsdelivr.stats')
    assert.equal(readProperty(statsResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(statsResponse, 'result.stats.hits.total'), 300)
    assert.equal(readProperty(statsResponse, 'result.stats.hits.dates.0.date'), '2026-05-02')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('npmregistry search and package are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/-/v1/search') {
      return new Response(JSON.stringify({
        objects: [
          {
            package: {
              name: 'typescript',
              version: '5.9.3',
              description: 'TypeScript language',
              links: { npm: 'https://www.npmjs.com/package/typescript' },
              maintainers: [{ username: 'bot' }],
            },
            score: { final: 0.99, detail: { quality: 0.95, popularity: 0.98, maintenance: 0.97 } },
          },
        ],
        total: 1,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.pathname, '/typescript')
    return new Response(JSON.stringify({
      name: 'typescript',
      description: 'TypeScript language',
      'dist-tags': { latest: '5.9.3' },
      time: { created: '2020-01-01T00:00:00.000Z', modified: '2026-01-01T00:00:00.000Z', '5.9.3': '2026-01-01T00:00:00.000Z' },
      license: 'Apache-2.0',
      maintainers: [{ name: 'bot' }],
      versions: {
        '5.9.3': {
          version: '5.9.3',
          license: 'Apache-2.0',
          dependencies: {},
          devDependencies: {},
          dist: { unpackedSize: 1234, tarball: 'https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz' },
        },
      },
      readme: 'large readme',
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 591, method: 'npmregistry.search', params: { query: 'typescript', size: 250 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'npmregistry.search')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.search.packages.0.name'), 'typescript')

    const packageResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 592, method: 'npmregistry.package', params: { packageName: 'typescript', versionLimit: 1 } }),
    )
    assert.equal(readProperty(packageResponse, 'result.kind'), 'npmregistry.package')
    assert.equal(readProperty(packageResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(packageResponse, 'result.package.name'), 'typescript')
    assert.equal(readProperty(packageResponse, 'result.package.latestVersion.dependenciesCount'), 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('nycopendata datasets and 311 requests are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/catalog/v1') {
      assert.equal(url.searchParams.get('domains'), 'data.cityofnewyork.us')
        assert.equal(url.searchParams.get('only'), 'datasets')
      return new Response(JSON.stringify(createNycOpenDataCatalogFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.pathname, '/resource/erm2-nwe9.json')
    assert.equal(url.searchParams.get('$limit'), '1000')
    assert.equal(url.searchParams.get('borough'), 'BROOKLYN')
    return new Response(JSON.stringify(createNycOpenData311Fixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const datasets = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 736, method: 'nycopendata.datasets', params: { query: '311', limit: 100 } }))
    assert.equal(readProperty(datasets, 'result.kind'), 'nycopendata.datasets')
    assert.equal(readProperty(datasets, 'result.api.provider'), 'nycopendata')
    assert.equal(readProperty(datasets, 'result.api.authentication'), 'none')
    assert.equal(readProperty(datasets, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(datasets, 'result.datasets.0.id'), 'erm2-nwe9')

    const requests = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 737, method: 'nycopendata.311Requests', params: { borough: 'BROOKLYN', limit: 1000 } }))
    assert.equal(readProperty(requests, 'result.kind'), 'nycopendata.311Requests')
    assert.equal(readProperty(requests, 'result.api.authentication'), 'none')
    assert.equal(readProperty(requests, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(requests, 'result.requests.0.complaintType'), 'Illegal Parking')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('meowfacts.facts is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    data: ['Cats walk on their toes.'],
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 53, method: 'meowfacts.facts', params: { count: 1, lang: 'eng-us' } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'meowfacts.facts')
    assert.equal(readProperty(response, 'result.api.provider'), 'meowfacts')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.facts.0'), 'Cats walk on their toes.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('randomdog.files is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify([
    'a.jpg',
    'b.mp4',
    'c.png',
  ]), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 54, method: 'randomdog.files', params: { limit: 2, mediaType: 'image' } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'randomdog.files')
    assert.equal(readProperty(response, 'result.api.provider'), 'random-dog')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.files.0.name'), 'a.jpg')
    assert.equal(readProperty(response, 'result.files.1.name'), 'c.png')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('randomfox.floof is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    image: 'https://randomfox.ca/images/34.jpg',
    link: 'https://randomfox.ca/?i=34',
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 55, method: 'randomfox.floof', params: {} }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'randomfox.floof')
    assert.equal(readProperty(response, 'result.api.provider'), 'random-fox')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.fox.image'), 'https://randomfox.ca/images/34.jpg')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('rainviewer.maps is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.hostname, 'api.rainviewer.com')
    assert.equal(url.pathname, '/public/weather-maps.json')
    return new Response(JSON.stringify(createRainViewerMapsFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 56, method: 'rainviewer.maps', params: { limit: 1, latitude: 1, longitude: 2 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'rainviewer.maps')
    assert.equal(readProperty(response, 'result.api.provider'), 'rainviewer')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.maps.radarPast.0.path'), '/v2/radar/5cb0d794f2da')
    assert.match(String(readProperty(response, 'result.maps.radarPast.0.tileUrl')), /\/512\/5\/1\.0\/2\.0\/2\/1_0\.png$/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('steem.discussions is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    result: [
      {
        post_id: 1,
        author: 'alice',
        permlink: 'hello',
        category: 'dev',
        title: 'Hello Steem',
        body: 'A short body preview.',
        created: '2026-05-03T01:02:03',
        children: 2,
        pending_payout_value: '0.123 SBD',
        body_length: 345,
      },
    ],
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 67, method: 'steem.discussions', params: { sort: 'created', tag: 'dev', limit: 1, truncateBody: 80 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'steem.discussions')
    assert.equal(readProperty(response, 'result.api.provider'), 'steem')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.discussions.0.title'), 'Hello Steem')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('steem.thread is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { method?: string; params?: unknown[] }
    if (body.method === 'condenser_api.get_content') {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {
          post_id: 1,
          author: 'alice',
          permlink: 'hello',
          category: 'dev',
          title: 'Hello Steem',
          body: 'A root post.',
          created: '2026-05-03T01:02:03',
          children: 1,
          pending_payout_value: '0.123 SBD',
          body_length: 12,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const author = Array.isArray(body.params) ? body.params[0] : undefined
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: author === 'alice'
        ? [{
            post_id: 2,
            author: 'bob',
            permlink: 're-hello',
            category: 'dev',
            title: '',
            body: 'A reply.',
            created: '2026-05-03T02:03:04',
            children: 0,
            pending_payout_value: '0.000 SBD',
            url: '/dev/@alice/hello#@bob/re-hello',
            body_length: 8,
          }]
        : [],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 68, method: 'steem.thread', params: { author: 'alice', permlink: 'hello', pageSize: 1 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'steem.thread')
    assert.equal(readProperty(response, 'result.api.provider'), 'steem')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.items.0.title'), 'Hello Steem')
    assert.equal(readProperty(response, 'result.items.1.author'), 'bob')
    assert.equal(readProperty(response, 'result.scroll.nextCursor'), 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('spaceflightnews.articles is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/v4/articles/')
    assert.equal(url.searchParams.get('limit'), '1')
    assert.equal(url.searchParams.get('offset'), '0')
    assert.equal(url.searchParams.get('ordering'), '-published_at')
    return new Response(JSON.stringify({
      count: 33980,
      next: 'https://api.spaceflightnewsapi.net/v4/articles/?limit=1&offset=1',
      previous: null,
      results: [
        {
          id: 37763,
          title: 'Launch boosts European Earth monitoring and connectivity',
          authors: [{ name: 'ESA', socials: null }],
          url: 'https://www.esa.int/Applications/Observing_the_Earth/Launch_boosts_European_Earth_monitoring_and_connectivity',
          image_url: 'https://www.esa.int/example.jpg',
          news_site: 'ESA',
          summary: 'Thirteen European satellites reached orbit.',
          published_at: '2026-05-04T08:01:00Z',
          updated_at: '2026-05-04T08:30:00Z',
          featured: false,
          launches: [],
          events: [],
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 617, method: 'spaceflightnews.articles', params: { limit: 1, offset: 0 } }))
    assert.equal(readProperty(response, 'result.kind'), 'spaceflightnews.articles')
    assert.equal(readProperty(response, 'result.api.provider'), 'spaceflightnews')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.articles.0.newsSite'), 'ESA')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('gitatelugu.verse is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/tel/verse/1/1')
    return new Response(JSON.stringify(createGitaVerseFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 68, method: 'gitatelugu.verse', params: { language: 'tel', chapter: 1, verse: 1 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'gitatelugu.verse')
    assert.equal(readProperty(response, 'result.api.provider'), 'gita-telugu')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.language'), 'tel')
    assert.equal(readProperty(response, 'result.verse.chapterNo'), 1)
    assert.equal(readProperty(response, 'result.verse.text.0'), 'ధృతరాష్ట్ర ఉవాచ ।')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('hackernews.stories and hackernews.item are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/v0/topstories.json') {
      return new Response(JSON.stringify([1001, 1002, 1003]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    const id = Number(url.pathname.match(/item\/(\d+)\.json/u)?.[1] ?? 1001)
    const fixture = id >= 2000
      ? { id, type: 'comment', by: `user${id}`, time: 1175714300, parent: 1001, text: `Comment ${id}` }
      : createHackerNewsItemFixture(id)
    return new Response(JSON.stringify(fixture), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const storiesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 681, method: 'hackernews.stories', params: { list: 'top', limit: 2 } }),
    )
    assert.equal(readProperty(storiesResponse, 'result.kind'), 'hackernews.stories')
    assert.equal(readProperty(storiesResponse, 'result.api.provider'), 'hackernews')
    assert.equal(readProperty(storiesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(storiesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(storiesResponse, 'result.stories.0.title'), 'Example story 1001')
    assert.equal(readProperty(storiesResponse, 'result.pagination.upstreamTotal'), 3)

    const itemResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 682, method: 'hackernews.item', params: { id: 1002 } }),
    )
    assert.equal(readProperty(itemResponse, 'result.kind'), 'hackernews.item')
    assert.equal(readProperty(itemResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(itemResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(itemResponse, 'result.item.title'), 'Example story 1002')

    const threadResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 683, method: 'hackernews.thread', params: { id: 1001, pageSize: 2 } }),
    )
    assert.equal(readProperty(threadResponse, 'result.kind'), 'hackernews.thread')
    assert.equal(readProperty(threadResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(threadResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(threadResponse, 'result.items.0.id'), 1001)
    assert.equal(readProperty(threadResponse, 'result.visibleItems.0.id'), 1001)
    assert.equal(readProperty(threadResponse, 'result.scroll.nextCursor'), 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bibleapi.passage and bibleapi.random are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.includes('/random')) {
      assert.equal(url.pathname, '/data/web/random/JHN')
      return new Response(JSON.stringify(createBibleRandomFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/John+3%3A16')
    assert.equal(url.searchParams.get('translation'), 'web')
    return new Response(JSON.stringify(createBiblePassageFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const passageResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 69, method: 'bibleapi.passage', params: { reference: 'John 3:16', translation: 'web', maxVerses: 1 } }),
    )
    assert.equal(readProperty(passageResponse, 'result.kind'), 'bibleapi.passage')
    assert.equal(readProperty(passageResponse, 'result.api.provider'), 'bible-api')
    assert.equal(readProperty(passageResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(passageResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(passageResponse, 'result.verses.0.bookName'), 'John')

    const randomResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 70, method: 'bibleapi.random', params: { translation: 'web', book: 'JHN' } }),
    )
    assert.equal(readProperty(randomResponse, 'result.kind'), 'bibleapi.random')
    assert.equal(readProperty(randomResponse, 'result.api.provider'), 'bible-api')
    assert.equal(readProperty(randomResponse, 'result.translation.license'), 'Public Domain')
    assert.equal(readProperty(randomResponse, 'result.verse.text'), 'Random verse text.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('binlist.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://lookup.binlist.net/45717360')
    return new Response(JSON.stringify(createBinlistLookupFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 701, method: 'binlist.lookup', params: { bin: '4571 7360' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'binlist.lookup')
    assert.equal(readProperty(response, 'result.api.provider'), 'binlist')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.bin'), '45717360')
    assert.equal(readProperty(response, 'result.card.scheme'), 'visa')
    assert.equal(readProperty(response, 'result.country.name'), 'Denmark')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('brazilcentralbank datasets and SGS latest are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.hostname === 'dadosabertos.bcb.gov.br') {
      assert.equal(url.pathname, '/api/3/action/package_search')
      assert.equal(url.searchParams.get('q'), 'selic')
      assert.equal(url.searchParams.get('rows'), '100')
      return new Response(JSON.stringify(createBrazilCentralBankDatasetsFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.hostname, 'api.bcb.gov.br')
    assert.equal(url.pathname, '/dados/serie/bcdata.sgs.11/dados/ultimos/20')
    return new Response(JSON.stringify(createBrazilCentralBankSgsFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const datasets = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 731, method: 'brazilcentralbank.datasets', params: { query: 'selic', rows: 100 } }))
    assert.equal(readProperty(datasets, 'result.kind'), 'brazilcentralbank.datasets')
    assert.equal(readProperty(datasets, 'result.api.provider'), 'brazilcentralbank')
    assert.equal(readProperty(datasets, 'result.api.authentication'), 'none')
    assert.equal(readProperty(datasets, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(datasets, 'result.datasets.0.name'), 'estatisticas-selic-operacoes')

    const latest = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 732, method: 'brazilcentralbank.sgsLatest', params: { seriesCode: 11, limit: 20 } }))
    assert.equal(readProperty(latest, 'result.kind'), 'brazilcentralbank.sgsLatest')
    assert.equal(readProperty(latest, 'result.api.authentication'), 'none')
    assert.equal(readProperty(latest, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(latest, 'result.observations.0.rawValue'), '0.053400')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('receitaws.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://www.receitaws.com.br/v1/cnpj/27865757000102')
    return new Response(JSON.stringify(createReceitaWsFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 733, method: 'receitaws.lookup', params: { cnpj: '27.865.757/0001-02' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'receitaws.lookup')
    assert.equal(readProperty(response, 'result.api.provider'), 'receitaws')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.cnpj'), '27865757000102')
    assert.equal(readProperty(response, 'result.company.name'), 'GLOBO COMUNICACAO E PARTICIPACOES S/A')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('banknegaramalaysia operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    const fixture = url.pathname === '/public/opr'
      ? createBnmOprFixture()
      : url.pathname === '/public/kijang-emas'
        ? createBnmKijangEmasFixture()
        : createBnmExchangeRatesFixture()
    return new Response(JSON.stringify(fixture), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  try {
    const opr = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 617, method: 'banknegaramalaysia.opr', params: {} }))
    assert.equal(readProperty(opr, 'result.kind'), 'banknegaramalaysia.opr')
    assert.equal(readProperty(opr, 'result.api.authentication'), 'none')
    assert.equal(readProperty(opr, 'result.api.usesBrowserClickstream'), false)

    const rates = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 618, method: 'banknegaramalaysia.exchangeRates', params: { limit: 2 } }))
    assert.equal(readProperty(rates, 'result.kind'), 'banknegaramalaysia.exchangeRates')
    assert.equal(readProperty(rates, 'result.rates.0.currencyCode'), 'CHF')

    const gold = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 619, method: 'banknegaramalaysia.kijangEmas', params: {} }))
    assert.equal(readProperty(gold, 'result.kind'), 'banknegaramalaysia.kijangEmas')
    assert.equal(readProperty(gold, 'result.kijangEmas.oneOz.selling'), 19149)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bankofrussia XML operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/XML_dynamic.asp')) {
      assert.equal(url.searchParams.get('VAL_NM_RQ'), 'R01235')
      return new Response(createBankOfRussiaDynamicXml(), { status: 200, headers: { 'content-type': 'application/xml; charset=windows-1251' } })
    }
    return new Response(createBankOfRussiaDailyXml(), { status: 200, headers: { 'content-type': 'application/xml; charset=windows-1251' } })
  }) as typeof fetch

  try {
    const rates = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 620, method: 'bankofrussia.rates', params: { code: 'USD', limit: 1 } }))
    assert.equal(readProperty(rates, 'result.kind'), 'bankofrussia.rates')
    assert.equal(readProperty(rates, 'result.api.provider'), 'bankofrussia')
    assert.equal(readProperty(rates, 'result.api.authentication'), 'none')
    assert.equal(readProperty(rates, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(rates, 'result.rates.0.charCode'), 'USD')

    const history = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 621, method: 'bankofrussia.history', params: { code: 'USD', from: '2026-05-01', to: '2026-05-05', limit: 2 } }))
    assert.equal(readProperty(history, 'result.kind'), 'bankofrussia.history')
    assert.equal(readProperty(history, 'result.api.authentication'), 'none')
    assert.equal(readProperty(history, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(history, 'result.records.1.value'), 75.4388)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('crossref.works and crossref.work are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/works') {
      assert.equal(url.searchParams.get('query'), 'metadata')
      assert.equal(url.searchParams.get('rows'), '1')
      return new Response(JSON.stringify(createCrossrefWorksFixture()), {
        status: 200,
        headers: createCrossrefRateHeaders(),
      })
    }
    assert.equal(url.pathname, '/works/10.1000%2Ftest')
    return new Response(JSON.stringify(createCrossrefWorkFixture()), {
      status: 200,
      headers: createCrossrefRateHeaders(),
    })
  }) as typeof fetch
  try {
    const worksResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 71, method: 'crossref.works', params: { query: 'metadata', rows: 1 } }),
    )
    assert.equal(readProperty(worksResponse, 'result.kind'), 'crossref.works')
    assert.equal(readProperty(worksResponse, 'result.api.provider'), 'crossref')
    assert.equal(readProperty(worksResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(worksResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(worksResponse, 'result.rateLimit.limit'), '5')
    assert.equal(readProperty(worksResponse, 'result.works.0.title'), 'Metadata for Everyone')

    const workResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 72, method: 'crossref.work', params: { doi: '10.1000/test' } }),
    )
    assert.equal(readProperty(workResponse, 'result.kind'), 'crossref.work')
    assert.equal(readProperty(workResponse, 'result.work.doi'), '10.1000/test')
    assert.equal(readProperty(workResponse, 'result.work.authors.0'), 'Ada Lovelace')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('gutendex.books and gutendex.book are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/books/') {
      assert.equal(url.searchParams.get('search'), 'great')
      assert.equal(url.searchParams.get('languages'), 'en')
      return new Response(JSON.stringify(createGutendexBooksFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/books/1342/')
    return new Response(JSON.stringify(createGutendexBookFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const booksResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 73, method: 'gutendex.books', params: { search: 'great', languages: 'en' } }),
    )
    assert.equal(readProperty(booksResponse, 'result.kind'), 'gutendex.books')
    assert.equal(readProperty(booksResponse, 'result.api.provider'), 'gutendex')
    assert.equal(readProperty(booksResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(booksResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(booksResponse, 'result.books.0.title'), 'Great Expectations')

    const bookResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 74, method: 'gutendex.book', params: { id: 1342 } }),
    )
    assert.equal(readProperty(bookResponse, 'result.kind'), 'gutendex.book')
    assert.equal(readProperty(bookResponse, 'result.book.title'), 'Pride and Prejudice')
    assert.equal(readProperty(bookResponse, 'result.book.authors.0'), 'Austen, Jane (1775-1817)')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('openlibrary.search and openlibrary.work are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/search.json') {
      assert.equal(url.searchParams.get('q'), 'pride')
      assert.equal(url.searchParams.get('language'), 'eng')
      assert.equal(url.searchParams.get('limit'), '2')
      return new Response(JSON.stringify(createOpenLibrarySearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/works/OL66554W.json')
    return new Response(JSON.stringify(createOpenLibraryWorkFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 75, method: 'openlibrary.search', params: { query: 'pride', language: 'eng', limit: 2 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'openlibrary.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'openlibrary')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.works.0.title'), 'Pride and Prejudice')

    const workResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 76, method: 'openlibrary.work', params: { workKey: 'OL66554W' } }),
    )
    assert.equal(readProperty(workResponse, 'result.kind'), 'openlibrary.work')
    assert.equal(readProperty(workResponse, 'result.work.title'), 'Pride and Prejudice')
    assert.equal(readProperty(workResponse, 'result.work.authors.0'), '/authors/OL21594A')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GBIF operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/species/search')) {
      assert.equal(url.searchParams.get('q'), 'Quercus robur')
      assert.equal(url.searchParams.get('rank'), 'SPECIES')
      assert.equal(url.searchParams.get('limit'), '2')
      return new Response(JSON.stringify(createGbifSpeciesFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/v1/occurrence/search')
    assert.equal(url.searchParams.get('scientificName'), 'Quercus robur')
    assert.equal(url.searchParams.get('country'), 'GB')
    assert.equal(url.searchParams.get('limit'), '2')
    return new Response(JSON.stringify(createGbifOccurrenceFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const speciesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 877,
        method: 'gbif.species',
        params: { query: 'Quercus robur', rank: 'SPECIES', limit: 2 },
      }),
    )
    assert.equal(readProperty(speciesResponse, 'result.kind'), 'gbif.species')
    assert.equal(readProperty(speciesResponse, 'result.api.provider'), 'gbif')
    assert.equal(readProperty(speciesResponse, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(speciesResponse, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(
      readProperty(speciesResponse, 'result.species.0.canonicalName'),
      'Quercus robur',
    )

    const occurrenceResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 878,
        method: 'gbif.occurrences',
        params: { scientificName: 'Quercus robur', country: 'GB', limit: 2 },
      }),
    )
    assert.equal(readProperty(occurrenceResponse, 'result.kind'), 'gbif.occurrences')
    assert.equal(
      readProperty(occurrenceResponse, 'result.occurrences.0.datasetTitle'),
      'Example occurrence dataset',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GurbaniNow operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.includes('/search/')) {
      assert.equal(url.searchParams.get('source'), '1')
      assert.equal(url.searchParams.get('searchtype'), '1')
      assert.equal(url.searchParams.get('results'), '2')
      return new Response(JSON.stringify(createGurbaniNowSearchFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.pathname.endsWith('/banis')) {
      return new Response(JSON.stringify(createGurbaniNowBanisFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/v2/banis/1')
    return new Response(JSON.stringify(createGurbaniNowBaniFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 879,
        method: 'gurbaninow.search',
        params: { query: 'DDrgj', source: 1, searchType: 1, results: 2 },
      }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'gurbaninow.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'gurbaninow')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(searchResponse, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(
      readProperty(searchResponse, 'result.shabads.0.writer.english'),
      'Satta and Balwand',
    )

    const banisResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 880,
        method: 'gurbaninow.banis',
        params: { limit: 1 },
      }),
    )
    assert.equal(readProperty(banisResponse, 'result.kind'), 'gurbaninow.banis')
    assert.equal(readProperty(banisResponse, 'result.banis.0.english'), 'Jap Ji Sahib')

    const baniResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 881,
        method: 'gurbaninow.bani',
        params: { id: 1, offset: 1, limit: 1 },
      }),
    )
    assert.equal(readProperty(baniResponse, 'result.kind'), 'gurbaninow.bani')
    assert.equal(readProperty(baniResponse, 'result.lines.0.id'), 'RBP6')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('iDigBio operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/records/')) {
      assert.deepEqual(
        JSON.parse(url.searchParams.get('rq') ?? '{}'),
        {
          scientificname: 'Quercus robur',
          family: 'Fagaceae',
          country: 'United States',
          hasImage: true,
        },
      )
      assert.equal(url.searchParams.get('limit'), '2')
      return new Response(JSON.stringify(createIdigbioRecordsFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/v2/search/media/')
    assert.deepEqual(
      JSON.parse(url.searchParams.get('rq') ?? '{}'),
      { scientificname: 'Quercus robur' },
    )
    assert.deepEqual(
      JSON.parse(url.searchParams.get('mq') ?? '{}'),
      { mediatype: 'images', hasSpecimen: true },
    )
    return new Response(JSON.stringify(createIdigbioMediaFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const recordsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 882,
        method: 'idigbio.records',
        params: {
          scientificName: 'Quercus robur',
          family: 'Fagaceae',
          country: 'United States',
          hasImage: true,
          limit: 2,
        },
      }),
    )
    assert.equal(readProperty(recordsResponse, 'result.kind'), 'idigbio.records')
    assert.equal(readProperty(recordsResponse, 'result.api.provider'), 'idigbio')
    assert.equal(readProperty(recordsResponse, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(recordsResponse, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(
      readProperty(recordsResponse, 'result.records.0.scientificName'),
      'Quercus robur L.',
    )

    const mediaResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 883,
        method: 'idigbio.media',
        params: {
          scientificName: 'Quercus robur',
          hasSpecimen: true,
          limit: 2,
        },
      }),
    )
    assert.equal(readProperty(mediaResponse, 'result.kind'), 'idigbio.media')
    assert.equal(
      readProperty(mediaResponse, 'result.media.0.accessUri'),
      'https://example.org/media.jpg',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('INSPIRE HEP operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/literature/4328') {
      return new Response(JSON.stringify(createInspireHepRecordFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/api/literature')
    assert.equal(url.searchParams.get('q'), 'higgs')
    assert.equal(url.searchParams.get('sort'), 'mostcited')
    assert.equal(url.searchParams.get('size'), '2')
    assert.match(url.searchParams.get('fields') ?? '', /authors\.full_name/u)
    return new Response(JSON.stringify({
      hits: {
        total: 1,
        hits: [createInspireHepRecordFixture()],
      },
      links: { self: 'https://inspirehep.net/api/literature/?q=higgs' },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 884,
        method: 'inspirehep.search',
        params: { query: 'higgs', sort: 'mostcited', limit: 2 },
      }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'inspirehep.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'inspirehep')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(searchResponse, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(
      readProperty(searchResponse, 'result.papers.0.title'),
      'Partial Symmetries of Weak Interactions',
    )

    const recordResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 885,
        method: 'inspirehep.record',
        params: { recid: 4328 },
      }),
    )
    assert.equal(readProperty(recordResponse, 'result.kind'), 'inspirehep.record')
    assert.equal(readProperty(recordResponse, 'result.paper.recid'), 4328)
    assert.equal(
      readProperty(recordResponse, 'result.paper.dois.0'),
      '10.1016/0029-5582(61)90469-2',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('iseven.check is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://api.isevenapi.xyz/api/iseven/6/')
    return new Response(JSON.stringify({
      iseven: true,
      ad: 'Buy isEvenCoin, the hottest new cryptocurrency!',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 886,
        method: 'iseven.check',
        params: { number: 6 },
      }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'iseven.check')
    assert.equal(readProperty(response, 'result.api.provider'), 'iseven')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.result.number'), 6)
    assert.equal(readProperty(response, 'result.result.isEven'), true)
    assert.equal(
      readProperty(response, 'result.upstream.ad'),
      'Buy isEvenCoin, the hottest new cryptocurrency!',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('isro.catalog is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://isro.vercel.app/api/centres')
    return new Response(JSON.stringify({
      centres: [
        {
          id: 14,
          name: 'Space Commission',
          Place: 'Bengaluru',
          State: 'Karnataka',
        },
        {
          id: 39,
          name: 'Satish Dhawan Space Centre (SDSC), SHAR',
          Place: 'Sriharikota',
          State: 'Andhra Pradesh',
        },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 887,
        method: 'isro.catalog',
        params: { resource: 'centres', search: 'Bengaluru', limit: 5 },
      }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'isro.catalog')
    assert.equal(readProperty(response, 'result.api.provider'), 'isro')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.resource'), 'centres')
    assert.equal(readProperty(response, 'result.pagination.matched'), 1)
    assert.equal(readProperty(response, 'result.items.0.name'), 'Space Commission')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('wizardworld.catalog is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://wizard-world-api.herokuapp.com/Spells?Name=Patronus')
    return new Response(JSON.stringify([
      {
        id: '90e5b314-fa78-4b02-9bbc-ca37736b7f9f',
        name: 'Patronus Charm',
        incantation: 'Expecto Patronum',
        effect: 'Conjures a spirit guardian',
        canBeVerbal: true,
        type: 'Charm',
        light: 'Silver',
        creator: null,
      },
    ]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 888,
        method: 'wizardworld.catalog',
        params: { resource: 'spells', name: 'Patronus', limit: 5 },
      }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'wizardworld.catalog')
    assert.equal(readProperty(response, 'result.api.provider'), 'wizardworld')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.resource'), 'spells')
    assert.equal(readProperty(response, 'result.pagination.matched'), 1)
    assert.equal(readProperty(response, 'result.items.0.name'), 'Patronus Charm')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('worldbank operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    if (url.pathname === '/v2/country') {
      return jsonResponse([
        { page: 1, pages: 99, per_page: 3, total: 296 },
        [
          {
            id: 'US',
            iso2Code: 'US',
            name: 'United States',
            region: { id: 'NAC', value: 'North America' },
            incomeLevel: { id: 'HIC', value: 'High income' },
            lendingType: { id: 'LNX', value: 'Not classified' },
          },
        ],
      ])
    }
    if (url.pathname === '/v2/country/US/indicator/SP.POP.TOTL') {
      return jsonResponse([
        { page: 1, pages: 1, per_page: 3, total: 3 },
        [
          {
            indicator: { id: 'SP.POP.TOTL', value: 'Population, total' },
            country: { id: 'US', value: 'United States' },
            countryiso3code: 'USA',
            date: '2022',
            value: 333287557,
            unit: '',
            obs_status: '',
            decimal: 0,
          },
        ],
      ])
    }
    if (url.pathname === '/v2/indicator/SP.POP.TOTL') {
      return jsonResponse([
        { page: 1, pages: 1, per_page: 1, total: 1 },
        [{ id: 'SP.POP.TOTL', name: 'Population, total', topics: [] }],
      ])
    }
    return new Response(JSON.stringify({ error: 'unexpected url' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const countriesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 889,
        method: 'worldbank.countries',
        params: { page: 1, perPage: 3 },
      }),
    )
    assert.equal(readProperty(countriesResponse, 'result.kind'), 'worldbank.countries')
    assert.equal(readProperty(countriesResponse, 'result.api.provider'), 'worldbank')
    assert.equal(readProperty(countriesResponse, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(countriesResponse, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(readProperty(countriesResponse, 'result.query.perPage'), 3)
    assert.equal(readProperty(countriesResponse, 'result.countries.0.id'), 'US')

    const indicatorResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 890,
        method: 'worldbank.indicator',
        params: {
          country: 'US',
          indicator: 'SP.POP.TOTL',
          date: '2020:2022',
          perPage: 3,
        },
      }),
    )
    assert.equal(readProperty(indicatorResponse, 'result.kind'), 'worldbank.indicator')
    assert.equal(readProperty(indicatorResponse, 'result.api.provider'), 'worldbank')
    assert.equal(readProperty(indicatorResponse, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(indicatorResponse, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(readProperty(indicatorResponse, 'result.query.country'), 'US')
    assert.equal(readProperty(indicatorResponse, 'result.indicator.name'), 'Population, total')
    assert.equal(readProperty(indicatorResponse, 'result.points.0.value'), 333287557)
    assert.deepEqual(requestedUrls, [
      'https://api.worldbank.org/v2/country?format=json&page=1&per_page=3',
      [
        'https://api.worldbank.org/v2/country/US/indicator/',
        'SP.POP.TOTL?format=json&date=2020%3A2022&page=1&per_page=3',
      ].join(''),
      'https://api.worldbank.org/v2/indicator/SP.POP.TOTL?format=json&per_page=1',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ITIS operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/searchByScientificName')) {
      assert.equal(url.searchParams.get('srchKey'), 'Quercus robur')
      return new Response(JSON.stringify({
        scientificNames: [
          {
            tsn: '19405',
            combinedName: 'Quercus robur',
            author: 'L.',
            kingdom: 'Plantae',
          },
        ],
      }), {
        status: 200,
        headers: { 'content-type': 'text/json;charset=ISO-8859-1' },
      })
    }
    assert.equal(url.pathname.endsWith('/getFullRecordFromTSN'), true)
    assert.equal(url.searchParams.get('tsn'), '19405')
    return new Response(JSON.stringify({
      tsn: '19405',
      scientificName: {
        tsn: '19405',
        combinedName: 'Quercus robur',
        author: 'L.',
      },
      commonNameList: {
        commonNames: [
          { commonName: 'English oak', language: 'English', tsn: '19405' },
        ],
      },
      synonymList: { synonyms: [] },
      hierarchyUp: {
        tsn: '19405',
        taxonName: 'Quercus robur',
        rankName: 'Species',
        parentTsn: '19276',
        parentName: 'Quercus',
      },
      usage: { taxonUsageRating: 'accepted' },
      jurisdictionalOriginList: { jurisdictionalOrigins: [] },
    }), {
      status: 200,
      headers: { 'content-type': 'text/json;charset=ISO-8859-1' },
    })
  }) as typeof fetch

  try {
    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 888,
        method: 'itis.search',
        params: { query: 'Quercus robur', limit: 5 },
      }),
    )
    assert.equal(readProperty(search, 'result.kind'), 'itis.search')
    assert.equal(readProperty(search, 'result.api.provider'), 'itis')
    assert.equal(readProperty(search, 'result.api.authentication'), 'none')
    assert.equal(readProperty(search, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(search, 'result.names.0.tsn'), '19405')

    const record = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 889,
        method: 'itis.record',
        params: { tsn: '19405', commonLimit: 1 },
      }),
    )
    assert.equal(readProperty(record, 'result.kind'), 'itis.record')
    assert.equal(readProperty(record, 'result.record.scientificName.combinedName'), 'Quercus robur')
    assert.equal(readProperty(record, 'result.record.commonNames.0.commonName'), 'English oak')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Launch Library 2 operations are exposed through JSON-RPC', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/launches/upcoming/')) {
      return new Response(JSON.stringify({
        count: 1,
        next: null,
        previous: null,
        results: [{
          id: '24f0b5b1-f573-4cc9-8898-1eb7fd5cc0f2',
          url: [
            'https://ll.thespacedevs.com/2.3.0/launches/',
            '24f0b5b1-f573-4cc9-8898-1eb7fd5cc0f2/',
          ].join(''),
          name: 'Falcon 9 Block 5 | NROL-172',
          status: { name: 'Go for Launch', abbrev: 'Go' },
          net: '2026-05-11T22:28:00Z',
          launch_service_provider: { name: 'SpaceX', abbrev: 'SpX' },
          rocket: { configuration: { full_name: 'Falcon 9 Block 5' } },
          mission: { name: 'NROL-172', orbit: { name: 'Unknown' } },
          pad: { name: 'Space Launch Complex 4E' },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 1449,
        url: 'https://ll.thespacedevs.com/2.3.0/events/1449/',
        name: 'SpaceX CRS-34 Dragon Docking',
        date: '2026-05-14T13:50:00Z',
        type: { name: 'Docking' },
        location: 'International Space Station',
        vid_urls: [{ publisher: 'NASA', url: 'https://plus.nasa.gov/crs-34/' }],
      }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const launches = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 890,
        method: 'launchlibrary2.launches',
        params: { search: 'Falcon', limit: 1 },
      }),
    )
    assert.equal(readProperty(launches, 'result.kind'), 'launchlibrary2.launches')
    assert.equal(readProperty(launches, 'result.api.provider'), 'launchlibrary2')
    assert.equal(readProperty(launches, 'result.api.authentication'), 'none')
    assert.equal(readProperty(launches, 'result.api.usesBrowserClickstream'), false)
    assert.equal(
      readProperty(launches, 'result.launches.0.rocket.name'),
      'Falcon 9 Block 5',
    )

    const events = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 891,
        method: 'launchlibrary2.events',
        params: { search: 'Docking', limit: 1 },
      }),
    )
    assert.equal(readProperty(events, 'result.kind'), 'launchlibrary2.events')
    assert.equal(readProperty(events, 'result.events.0.type'), 'Docking')
    assert.equal(readProperty(events, 'result.events.0.videoUrls.0.publisher'), 'NASA')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('LectServe operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/sunday') {
      return new Response(JSON.stringify(createLectServeSundayFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({
      sunday: createLectServeSundayFixture('2026-05-10', 'rcl'),
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
      red_letter: createLectServeSundayFixture('2026-05-10', 'rcl'),
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const date = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 892,
        method: 'lectserve.date',
        params: { date: '2026-05-10', lectionary: 'rcl' },
      }),
    )
    assert.equal(readProperty(date, 'result.kind'), 'lectserve.date')
    assert.equal(readProperty(date, 'result.api.provider'), 'lectserve')
    assert.equal(readProperty(date, 'result.api.authentication'), 'none')
    assert.equal(readProperty(date, 'result.api.usesBrowserClickstream'), false)
    assert.equal(
      readProperty(date, 'result.daily.readings.morning.first'),
      'Deuteronomy 11',
    )
    assert.equal(
      readProperty(date, 'result.sunday.services.0.name'),
      'Sixth Sunday of Easter',
    )

    const sunday = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 893,
        method: 'lectserve.sunday',
        params: { lectionary: 'acna' },
      }),
    )
    assert.equal(readProperty(sunday, 'result.kind'), 'lectserve.sunday')
    assert.equal(readProperty(sunday, 'result.sunday.date'), '2026-05-17')
    assert.equal(
      readProperty(sunday, 'result.query.scope'),
      'upcoming-server-relative-sunday',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Minor Planet Center search is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify([
    {
      readable_des: '(1) Ceres',
      des: '00001',
      H: 3.34,
      e: 0.0760091,
      a: 2.7691652,
      i: 10.59407,
      num_obs: 6725,
    },
  ]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 894,
        method: 'minorplanetcenter.search',
        params: {
          query: 'Ceres',
          maxEccentricity: '0.2',
          limit: 1,
        },
      }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'minorplanetcenter.search')
    assert.equal(readProperty(response, 'result.api.provider'), 'minorplanetcenter')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.maxEccentricity'), 0.2)
    assert.equal(
      readProperty(response, 'result.asteroids.0.readableDesignation'),
      '(1) Ceres',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NASA search and asset are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.startsWith('/asset/')) {
      assert.equal(url.pathname, '/asset/as11-40-5874')
      return new Response(JSON.stringify({
        collection: {
          items: [
            {
              href: [
                'https://images-assets.nasa.gov/image/as11-40-5874/',
                'as11-40-5874~orig.jpg',
              ].join(''),
            },
          ],
        },
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/search')
    assert.equal(url.searchParams.get('q'), 'apollo 11')
    return new Response(JSON.stringify({
      collection: {
        metadata: { total_hits: 1 },
        items: [
          {
            data: [
              {
                nasa_id: 'jsc2007e034221',
                title: 'Apollo 11 spacecraft pre-launch',
                media_type: 'image',
              },
            ],
          },
        ],
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 895,
        method: 'nasa.search',
        params: { query: 'apollo 11', pageSize: 1 },
      }),
    )
    assert.equal(readProperty(search, 'result.kind'), 'nasa.search')
    assert.equal(readProperty(search, 'result.api.provider'), 'nasa')
    assert.equal(readProperty(search, 'result.api.authentication'), 'none')
    assert.equal(readProperty(search, 'result.api.usesBrowserClickstream'), false)
    assert.equal(
      readProperty(search, 'result.items.0.nasaId'),
      'jsc2007e034221',
    )

    const asset = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 896,
        method: 'nasa.asset',
        params: { nasaId: 'as11-40-5874', limit: 1 },
      }),
    )
    assert.equal(readProperty(asset, 'result.kind'), 'nasa.asset')
    assert.equal(readProperty(asset, 'result.api.provider'), 'nasa')
    assert.equal(readProperty(asset, 'result.files.0.role'), 'original')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Newton compute is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(
      String(input),
      'https://newton.vercel.app/api/v2/simplify/2%5E2%2B2(2)',
    )
    return new Response(JSON.stringify({
      operation: 'simplify',
      expression: '2^2+2(2)',
      result: '8',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 74,
        method: 'newton.compute',
        params: { operation: 'simplify', expression: '2^2+2(2)' },
      }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'newton.compute')
    assert.equal(readProperty(response, 'result.api.provider'), 'newton')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.calculation.resultText'), '8')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Noctua stats and source are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/v1/skysources/stats/') {
      return new Response(JSON.stringify({
        nb_skysources: 5851320,
        by_types: [
          { _id: 'dso', count: 3238401 },
          { _id: 'star', count: 2167661 },
        ],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/api/v1/skysources/name/Mars')
    return new Response(JSON.stringify({
      interest: 4.95,
      match: 'NAME Mars',
      model: 'jpl_sso',
      model_data: {
        albedo: '0.15',
        jpl_horizon_id: 499,
        orbit: 'horizons:2458545.500000000, A.D. 2019-Mar-03 00:00:00.0000',
        parent: 'NAME Sun',
        radius: '3394',
      },
      names: ['NAME Mars'],
      short_name: 'Mars',
      types: ['Pla', 'SSO'],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const stats = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 75,
        method: 'noctua.stats',
        params: {},
      }),
    )
    assert.equal(readProperty(stats, 'result.kind'), 'noctua.stats')
    assert.equal(readProperty(stats, 'result.api.provider'), 'noctua')
    assert.equal(readProperty(stats, 'result.api.authentication'), 'none')
    assert.equal(readProperty(stats, 'result.stats.byTypes.0.type'), 'dso')

    const source = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 76,
        method: 'noctua.source',
        params: { name: 'Mars' },
      }),
    )
    assert.equal(readProperty(source, 'result.kind'), 'noctua.source')
    assert.equal(readProperty(source, 'result.api.provider'), 'noctua')
    assert.equal(readProperty(source, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(source, 'result.source.shortName'), 'Mars')
    assert.equal(readProperty(source, 'result.source.modelData.jplHorizonId'), 499)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Rig Veda book and search are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    requestedUrls.push(String(input))
    return new Response(JSON.stringify([{
      mandal: requestedUrls.length === 1 ? 4 : 10,
      meter: requestedUrls.length === 1 ? 'Gayatri' : 'Jagati',
      sukta: requestedUrls.length === 1 ? 1 : 75,
      sungby: requestedUrls.length === 1
        ? 'Vamadev Gautam'
        : 'Sindhukshit Praiyamedh',
      sungbycategory: 'human male',
      sungfor: requestedUrls.length === 1 ? 'Agni' : 'Ganga',
      sungforcategory: requestedUrls.length === 1 ? 'divine male' : 'divine female',
    }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const book = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 761,
        method: 'rigveda.book',
        params: { mandal: 4, limit: 1 },
      }),
    )
    assert.equal(readProperty(book, 'result.kind'), 'rigveda.book')
    assert.equal(readProperty(book, 'result.api.provider'), 'rigveda')
    assert.equal(readProperty(book, 'result.api.authentication'), 'none')
    assert.equal(readProperty(book, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(book, 'result.verses.0.sungfor'), 'Agni')

    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 762,
        method: 'rigveda.search',
        params: { field: 'god', value: 'ganga', limit: 1 },
      }),
    )
    assert.equal(readProperty(search, 'result.kind'), 'rigveda.search')
    assert.equal(readProperty(search, 'result.api.provider'), 'rigveda')
    assert.equal(readProperty(search, 'result.verses.0.sungfor'), 'Ganga')
    assert.deepEqual(requestedUrls, [
      'https://indica-1hwj.onrender.com/rv/v2/meta/book/4',
      'https://indica-1hwj.onrender.com/rv/v2/meta/god/ganga',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Vedic Society operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.toString())
    return new Response(JSON.stringify([{
      word: url.pathname.includes('/categories/') ? 'ganga' : 'agnishala',
      nagari: url.pathname.includes('/categories/')
        ? 'गङ्गा'
        : 'अग्निशाला',
      description: url.pathname.includes('/descriptions/')
        ? 'fireplace'
        : 'the central hall containing the fireplace',
      category: url.pathname.includes('/categories/') ? 'river' : 'building',
    }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const words = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 785,
        method: 'vedicsociety.words',
        params: { word: 'agni', limit: 1 },
      }),
    )
    assert.equal(readProperty(words, 'result.kind'), 'vedicsociety.words')
    assert.equal(readProperty(words, 'result.api.provider'), 'vedicsociety')
    assert.equal(readProperty(words, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(words, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(readProperty(words, 'result.entries.0.word'), 'agnishala')

    const descriptions = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 786,
        method: 'vedicsociety.descriptions',
        params: { description: 'fire', limit: 1 },
      }),
    )
    assert.equal(
      readProperty(descriptions, 'result.kind'),
      'vedicsociety.descriptions',
    )
    assert.equal(
      readProperty(descriptions, 'result.entries.0.description'),
      'fireplace',
    )

    const category = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 787,
        method: 'vedicsociety.category',
        params: { category: 'river', limit: 1 },
      }),
    )
    assert.equal(readProperty(category, 'result.kind'), 'vedicsociety.category')
    assert.equal(readProperty(category, 'result.entries.0.category'), 'river')
    assert.deepEqual(requestedUrls, [
      'https://indica-1hwj.onrender.com/vs/v2/words/agni',
      'https://indica-1hwj.onrender.com/vs/v2/descriptions/fire',
      'https://indica-1hwj.onrender.com/vs/v2/categories/river',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Runyankole Bible operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.toString())
    return runyankoleBibleJsonResponse(responseForRunyankoleBibleRpcUrl(url))
  }) as typeof fetch

  try {
    const books = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 763,
        method: 'runyankolebible.books',
        params: { limit: 1 },
      }),
    )
    assert.equal(readProperty(books, 'result.kind'), 'runyankolebible.books')
    assert.equal(readProperty(books, 'result.api.provider'), 'runyankolebible')
    assert.equal(readProperty(books, 'result.api.authentication'), 'none')
    assert.equal(readProperty(books, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(books, 'result.books.0.id'), 10)

    const verse = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 764,
        method: 'runyankolebible.verse',
        params: { book: 10, chapter: 1, verse: 1 },
      }),
    )
    assert.equal(readProperty(verse, 'result.kind'), 'runyankolebible.verse')
    assert.equal(readProperty(verse, 'result.verse.bookName'), 'Okutandika')

    const chapter = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 765,
        method: 'runyankolebible.chapter',
        params: { book: 10, chapter: 1, limit: 1 },
      }),
    )
    assert.equal(readProperty(chapter, 'result.kind'), 'runyankolebible.chapter')
    assert.equal(readProperty(chapter, 'result.verses.0.verse'), 1)

    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 766,
        method: 'runyankolebible.search',
        params: { query: 'Ruhanga', limit: 2, offset: 1 },
      }),
    )
    assert.equal(readProperty(search, 'result.kind'), 'runyankolebible.search')
    assert.equal(readProperty(search, 'result.pagination.nextOffset'), 3)

    const random = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 767,
        method: 'runyankolebible.random',
        params: { book: 10 },
      }),
    )
    assert.equal(readProperty(random, 'result.kind'), 'runyankolebible.random')
    assert.equal(readProperty(random, 'result.verse.bookId'), 10)
    assert.deepEqual(requestedUrls, [
      'https://runyankole-bible-api.vercel.app/api/books',
      [
        'https://runyankole-bible-api.vercel.app/api/verse',
        '?book=10&chapter=1&verse=1',
      ].join(''),
      'https://runyankole-bible-api.vercel.app/api/chapter?book=10&chapter=1',
      [
        'https://runyankole-bible-api.vercel.app/api/search',
        '?q=Ruhanga&limit=2&offset=1',
      ].join(''),
      'https://runyankole-bible-api.vercel.app/api/random?book=10',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SHARE search and sources are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async (input, init = {}) => {
    const url = new URL(String(input))
    requestedUrls.push(`${String(init.method ?? 'GET')} ${url.toString()}`)
    if (url.pathname.endsWith('/_search')) {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>
      assert.equal(body.size, 1)
      assert.equal(body.from, 0)
      return shareJsonResponse({
        took: 4,
        timed_out: false,
        hits: {
          total: { value: 7 },
          hits: [{
            _id: 'E00D0-60A-128',
            _score: 18.2,
            _source: {
              id: 'E00D0-60A-128',
              title: 'Reproducibility in Management Science',
              type: 'preprint',
              sources: ['OSF'],
              contributors: ['Miloš Fišar'],
              identifiers: ['http://osf.io/mydzv/'],
              tags: ['reproducibility'],
              subjects: ['bepress|Business'],
            },
          }],
        },
      })
    }
    return shareJsonResponse({
      data: [{
        type: 'Source',
        id: '1',
        attributes: {
          name: 'OSF',
          homePage: 'https://osf.io/',
          longTitle: 'Open Science Framework',
        },
        relationships: {
          sourceConfigs: {
            meta: { count: 1 },
            data: [{ type: 'SourceConfig', id: '1' }],
          },
        },
        links: {
          self: 'https://share.osf.io/api/v2/sources/DC0DE-ADB-EEF/',
        },
      }],
      links: { next: null },
    }, 'application/vnd.api+json')
  }) as typeof fetch

  try {
    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 768,
        method: 'share.search',
        params: { query: 'reproducibility', type: 'preprint', limit: 1 },
      }),
    )
    assert.equal(readProperty(search, 'result.kind'), 'share.search')
    assert.equal(readProperty(search, 'result.api.provider'), 'share')
    assert.equal(readProperty(search, 'result.api.authentication'), 'none')
    assert.equal(readProperty(search, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(search, 'result.works.0.title'), 'Reproducibility in Management Science')

    const sources = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 769,
        method: 'share.sources',
        params: { query: 'open science', limit: 1 },
      }),
    )
    assert.equal(readProperty(sources, 'result.kind'), 'share.sources')
    assert.equal(readProperty(sources, 'result.api.provider'), 'share')
    assert.equal(readProperty(sources, 'result.sources.0.name'), 'OSF')
    assert.deepEqual(requestedUrls, [
      'POST https://share.osf.io/api/v2/search/creativeworks/_search',
      'GET https://share.osf.io/api/v2/sources/',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SpaceX REST operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requested: string[] = []
  globalThis.fetch = (async (input, init = {}) => {
    const url = new URL(String(input))
    requested.push(`${String(init.method ?? 'GET')} ${url.href}`)
    if (url.pathname === '/v4/company') {
      return jsonResponse({
        id: '5eb75edc42fea42237d7f3ed',
        name: 'SpaceX',
        founded: 2002,
        links: { website: 'https://www.spacex.com/' },
      })
    }
    if (url.pathname === '/v4/rockets') {
      return jsonResponse([{
        id: '5e9d0d95eda69973a809d1ec',
        name: 'Falcon 9',
        active: true,
        country: 'United States',
      }])
    }
    if (url.pathname === '/v4/launchpads') {
      return jsonResponse([{
        id: '5e9e4502f509094188566f88',
        name: 'KSC LC 39A',
        full_name: 'Kennedy Space Center LC 39A',
        status: 'active',
      }])
    }
    return jsonResponse({
      docs: [{
        id: '633f72130531f07b4fdf59c3',
        name: 'Crew-5',
        flight_number: 187,
        date_utc: '2022-10-05T16:00:00.000Z',
        upcoming: false,
        success: true,
        links: { youtube_id: '5EwW8ZkArL4' },
      }],
      totalDocs: 1,
      limit: 1,
      page: 1,
      totalPages: 1,
      hasPrevPage: false,
      hasNextPage: false,
    })
  }) as typeof fetch

  try {
    const company = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 770,
        method: 'spacex.company',
        params: {},
      }),
    )
    assert.equal(readProperty(company, 'result.kind'), 'spacex.company')
    assert.equal(readProperty(company, 'result.api.authentication'), 'none')
    assert.equal(readProperty(company, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(company, 'result.company.name'), 'SpaceX')

    const rockets = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 771,
        method: 'spacex.rockets',
        params: { search: 'Falcon', active: true, limit: 1 },
      }),
    )
    assert.equal(readProperty(rockets, 'result.kind'), 'spacex.rockets')
    assert.equal(readProperty(rockets, 'result.rockets.0.name'), 'Falcon 9')

    const launchpads = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 772,
        method: 'spacex.launchpads',
        params: { status: 'active', limit: 1 },
      }),
    )
    assert.equal(readProperty(launchpads, 'result.kind'), 'spacex.launchpads')
    assert.equal(
      readProperty(launchpads, 'result.launchpads.0.fullName'),
      'Kennedy Space Center LC 39A',
    )

    const launches = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 773,
        method: 'spacex.launches',
        params: { name: 'Crew', upcoming: false, limit: 1 },
      }),
    )
    assert.equal(readProperty(launches, 'result.kind'), 'spacex.launches')
    assert.equal(readProperty(launches, 'result.launches.0.name'), 'Crew-5')
    assert.deepEqual(requested, [
      'GET https://api.spacexdata.com/v4/company',
      'GET https://api.spacexdata.com/v4/rockets',
      'GET https://api.spacexdata.com/v4/launchpads',
      'POST https://api.spacexdata.com/v5/launches/query',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Sunrise-Sunset times are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  let requestedUrl: URL | undefined
  globalThis.fetch = (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse(createSunriseSunsetFixture())
  }) as typeof fetch

  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 774,
        method: 'sunrisesunset.times',
        params: {
          latitude: 36.72016,
          longitude: -4.42034,
          date: '2026-05-11',
          tzid: 'UTC',
        },
      }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'sunrisesunset.times')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(response, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(
      readProperty(response, 'result.times.sunrise'),
      '2026-05-11T05:12:08+00:00',
    )
    assert.equal(requestedUrl?.hostname, 'api.sunrise-sunset.org')
    assert.equal(requestedUrl?.pathname, '/json')
    assert.equal(requestedUrl?.searchParams.get('formatted'), '0')
    assert.equal(requestedUrl?.searchParams.get('callback'), null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('TLE search and satellite are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.toString())
    return jsonResponse(
      url.pathname === '/api/tle/25544'
        ? createTleFixture()
        : createTleSearchFixture(),
    )
  }) as typeof fetch

  try {
    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 775,
        method: 'tle.search',
        params: { search: 'ISS', page: 1 },
      }),
    )
    assert.equal(readProperty(search, 'result.kind'), 'tle.search')
    assert.equal(readProperty(search, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(search, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(readProperty(search, 'result.satellites.0.name'), 'ISS (ZARYA)')
    assert.equal(
      readProperty(search, 'result.satellites.0.orbital.inclinationDegrees'),
      51.631,
    )

    const satellite = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 776,
        method: 'tle.satellite',
        params: { satelliteId: 25544 },
      }),
    )
    assert.equal(readProperty(satellite, 'result.kind'), 'tle.satellite')
    assert.equal(readProperty(satellite, 'result.api.provider'), 'tle')
    assert.equal(readProperty(satellite, 'result.satellite.satelliteId'), 25544)
    assert.deepEqual(requestedUrls, [
      'https://tle.ivanstanojevic.me/api/tle/?page=1&search=ISS',
      'https://tle.ivanstanojevic.me/api/tle/25544',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Urantia core operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.toString())
    return jsonResponse(createUrantiaRpcFixture(url))
  }) as typeof fetch

  try {
    const toc = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 777,
        method: 'urantia.toc',
        params: { limit: 1 },
      }),
    )
    assert.equal(readProperty(toc, 'result.kind'), 'urantia.toc')
    assert.equal(readProperty(toc, 'result.api.authentication'), 'none')
    assert.equal(readProperty(toc, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(toc, 'result.parts.0.title'), 'Foreword')

    const paper = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 778,
        method: 'urantia.paper',
        params: { paperId: '0', limit: 1 },
      }),
    )
    assert.equal(readProperty(paper, 'result.kind'), 'urantia.paper')
    assert.equal(readProperty(paper, 'result.paper.title'), 'Foreword')
    assert.equal(readProperty(paper, 'result.paragraphs.0.htmlText'), undefined)

    const paragraph = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 779,
        method: 'urantia.paragraph',
        params: { ref: '0:0.1' },
      }),
    )
    assert.equal(readProperty(paragraph, 'result.kind'), 'urantia.paragraph')
    assert.equal(readProperty(paragraph, 'result.navigation.next'), '0:0.2')

    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 780,
        method: 'urantia.search',
        params: { query: 'thought adjuster', limit: 3 },
      }),
    )
    assert.equal(readProperty(search, 'result.kind'), 'urantia.search')
    assert.equal(readProperty(search, 'result.paragraphs.0.paperTitle'), (
      'The Seven Master Spirits'
    ))
    assert.deepEqual(requestedUrls, [
      'https://api.urantia.dev/toc',
      'https://api.urantia.dev/papers/0?lang=eng',
      'https://api.urantia.dev/paragraphs/0%3A0.1?lang=eng',
      [
        'https://api.urantia.dev/search?q=thought+adjuster&type=and',
        'limit=3&page=0&lang=eng',
      ].join('&'),
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('USGS Earthquake RPC exposes no-auth operations safely', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.toString())
    return jsonResponse(createUsgsEarthquakeRpcFixture(url))
  }) as typeof fetch

  try {
    const search = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 781,
        method: 'usgsearthquake.search',
        params: { minMagnitude: 4.5, limit: 2 },
      }),
    )
    assert.equal(readProperty(search, 'result.kind'), 'usgsearthquake.search')
    assert.equal(readProperty(search, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(search, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(readProperty(search, 'result.events.0.id'), 'us6000swvm')
    assert.equal(readProperty(search, 'result.events.0.products'), undefined)
    assert.equal(readProperty(search, 'result.events.0.contents'), undefined)

    const event = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 782,
        method: 'usgsearthquake.event',
        params: { eventId: 'us6000swvm' },
      }),
    )
    assert.equal(readProperty(event, 'result.kind'), 'usgsearthquake.event')
    assert.equal(readProperty(event, 'result.event.productTypes.0'), 'origin')
    assert.equal(readProperty(event, 'result.event.products'), undefined)
    assert.equal(readProperty(event, 'result.event.contents'), undefined)
    assert.deepEqual(requestedUrls, [
      [
        'https://earthquake.usgs.gov/fdsnws/event/1/query?',
        'format=geojson&eventtype=earthquake&minmagnitude=4.5',
        '&limit=2&offset=1&orderby=time',
      ].join(''),
      [
        'https://earthquake.usgs.gov/fdsnws/event/1/query?',
        'format=geojson&eventid=us6000swvm',
      ].join(''),
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('USGS Water RPC exposes no-auth operations safely', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: URL[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url)
    return jsonResponse(createUsgsWaterRpcFixture(url))
  }) as typeof fetch

  try {
    const instantaneous = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 783,
        method: 'usgswater.instantaneous',
        params: {
          site: '01646500',
          parameterCodes: '00060,00065',
          limit: 1,
        },
      }),
    )
    assert.equal(
      readProperty(instantaneous, 'result.kind'),
      'usgswater.instantaneous',
    )
    assert.equal(readProperty(instantaneous, 'result.api.authentication'), 'none')
    assert.equal(
      readProperty(instantaneous, 'result.api.usesBrowserClickstream'),
      false,
    )
    assert.equal(
      readProperty(instantaneous, 'result.series.0.site.code'),
      '01646500',
    )
    assert.equal(
      readProperty(instantaneous, 'result.series.0.readings.0.value'),
      '1340',
    )
    assert.equal(readProperty(instantaneous, 'result.timeSeries'), undefined)
    assert.equal(readProperty(instantaneous, 'result.queryInfo'), undefined)

    const daily = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 784,
        method: 'usgswater.daily',
        params: {
          site: '01646500',
          parameterCodes: '00060',
          startDate: '2026-05-01',
          endDate: '2026-05-11',
          limit: 2,
        },
      }),
    )
    assert.equal(readProperty(daily, 'result.kind'), 'usgswater.daily')
    assert.equal(readProperty(daily, 'result.api.provider'), 'usgswater')
    assert.equal(
      readProperty(daily, 'result.series.0.variable.statisticCode'),
      '00003',
    )
    assert.equal(readProperty(daily, 'result.pagination.returnedValues'), 2)
    assert.equal(requestedUrls[0]?.pathname, '/nwis/iv/')
    assert.equal(requestedUrls[0]?.searchParams.get('format'), 'json')
    assert.equal(requestedUrls[0]?.searchParams.get('sites'), '01646500')
    assert.equal(
      requestedUrls[0]?.searchParams.get('parameterCd'),
      '00060,00065',
    )
    assert.equal(requestedUrls[0]?.searchParams.get('siteStatus'), 'all')
    assert.equal(requestedUrls[1]?.pathname, '/nwis/dv/')
    assert.equal(requestedUrls[1]?.searchParams.get('parameterCd'), '00060')
    assert.equal(requestedUrls[1]?.searchParams.get('statCd'), '00003')
    assert.equal(requestedUrls[1]?.searchParams.get('startDT'), '2026-05-01')
    assert.equal(requestedUrls[1]?.searchParams.get('endDT'), '2026-05-11')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('icsdb calendars and events are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.hostname === 'api.github.com') {
      return new Response(JSON.stringify({
        truncated: false,
        tree: [
          { path: 'build/en-US/us-all-nonworkingdays.ics', type: 'blob' },
          { path: 'build/en-US/france-nonworkingdays.ics', type: 'blob' },
          { path: 'build/fr-FR/us-all-nonworkingdays.ics', type: 'blob' },
        ],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(
      url.pathname,
      '/gadael/icsdb/master/build/en-US/us-all-nonworkingdays.ics',
    )
    return new Response(createIcsdbFixture(), {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }) as typeof fetch

  try {
    const calendars = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 77,
        method: 'icsdb.calendars',
        params: { locale: 'en-US', query: 'us', limit: 5 },
      }),
    )
    assert.equal(readProperty(calendars, 'result.kind'), 'icsdb.calendars')
    assert.equal(readProperty(calendars, 'result.api.provider'), 'icsdb')
    assert.equal(readProperty(calendars, 'result.api.authentication'), 'none')
    assert.equal(readProperty(calendars, 'result.calendars.0.slug'), 'us-all')

    const events = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 78,
        method: 'icsdb.events',
        params: { locale: 'en-US', slug: 'us-all', limit: 2 },
      }),
    )
    assert.equal(readProperty(events, 'result.kind'), 'icsdb.events')
    assert.equal(readProperty(events, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(events, 'result.calendar.title'), 'US legal holidays')
    assert.equal(readProperty(events, 'result.events.0.summary'), "New Year's Day")
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('isdayoff operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/api/getdata')
    if (url.searchParams.has('date1')) {
      assert.equal(url.searchParams.get('date1'), '20260510')
      assert.equal(url.searchParams.get('date2'), '20260512')
      return new Response('102', {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      })
    }
    assert.equal(url.searchParams.get('year'), '2026')
    assert.equal(url.searchParams.get('month'), '05')
    assert.equal(url.searchParams.get('day'), '11')
    return new Response('1', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }) as typeof fetch

  try {
    const day = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 79,
        method: 'isdayoff.day',
        params: { date: '2026-05-11', countryCode: 'ru' },
      }),
    )
    assert.equal(readProperty(day, 'result.kind'), 'isdayoff.day')
    assert.equal(readProperty(day, 'result.api.provider'), 'isdayoff')
    assert.equal(readProperty(day, 'result.api.authentication'), 'none')
    assert.equal(readProperty(day, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(day, 'result.status.code'), '1')

    const range = await handleJsonRpcLine(
      options,
      JSON.stringify({
        jsonrpc: '2.0',
        id: 80,
        method: 'isdayoff.range',
        params: { from: '2026-05-10', days: 3, countryCode: 'ru' },
      }),
    )
    assert.equal(readProperty(range, 'result.kind'), 'isdayoff.range')
    assert.equal(readProperty(range, 'result.api.provider'), 'isdayoff')
    assert.equal(readProperty(range, 'result.count'), 3)
    assert.equal(readProperty(range, 'result.days.2.code'), '2')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('poetrydb.search and poetrydb.random are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.startsWith('/random/')) {
      assert.equal(url.pathname, '/random/1/author,title,linecount,lines.json')
      return new Response(JSON.stringify(createPoetryDbFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/title,poemcount/Ozymandias:abs;2/author,title,linecount,lines.json')
    return new Response(JSON.stringify(createPoetryDbFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 77, method: 'poetrydb.search', params: { field: 'title', term: 'Ozymandias', exact: true, count: 2, lineLimit: 1 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'poetrydb.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'poetrydb')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.poems.0.title'), 'Ozymandias')
    assert.equal(readProperty(searchResponse, 'result.poems.0.truncatedLines'), 1)

    const randomResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 78, method: 'poetrydb.random', params: { includeLines: true } }),
    )
    assert.equal(readProperty(randomResponse, 'result.kind'), 'poetrydb.random')
    assert.equal(readProperty(randomResponse, 'result.poems.0.author'), 'Percy Bysshe Shelley')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('qurancloud.ayah and qurancloud.surah are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.startsWith('/v1/ayah/')) {
      assert.equal(url.pathname, '/v1/ayah/2%3A255/en.asad')
      return new Response(JSON.stringify({ code: 200, status: 'OK', data: createQuranCloudAyahFixture() }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/v1/surah/1/en.asad')
    assert.equal(url.searchParams.get('limit'), '7')
    return new Response(JSON.stringify({ code: 200, status: 'OK', data: createQuranCloudSurahFixture() }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const ayahResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 79, method: 'qurancloud.ayah', params: { reference: '2:255', edition: 'en.asad' } }),
    )
    assert.equal(readProperty(ayahResponse, 'result.kind'), 'qurancloud.ayah')
    assert.equal(readProperty(ayahResponse, 'result.api.provider'), 'qurancloud')
    assert.equal(readProperty(ayahResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(ayahResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(ayahResponse, 'result.ayah.numberInSurah'), 255)

    const surahResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 80, method: 'qurancloud.surah', params: { surah: 1, edition: 'en.asad', limit: 7 } }),
    )
    assert.equal(readProperty(surahResponse, 'result.kind'), 'qurancloud.surah')
    assert.equal(readProperty(surahResponse, 'result.surah.englishName'), 'Al-Faatiha')
    assert.equal(readProperty(surahResponse, 'result.ayahs.0.numberInSurah'), 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('quranapi.verse and quranapi.chapter are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/4/157.json')) {
      return new Response(JSON.stringify(createQuranApiVerseFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/gh/fawazahmed0/quran-api@1/editions/eng-ummmuhammad/1.json')
    return new Response(JSON.stringify(createQuranApiChapterFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const verseResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 81, method: 'quranapi.verse', params: { edition: 'eng-ummmuhammad', chapter: 4, verse: 157 } }),
    )
    assert.equal(readProperty(verseResponse, 'result.kind'), 'quranapi.verse')
    assert.equal(readProperty(verseResponse, 'result.api.provider'), 'quranapi')
    assert.equal(readProperty(verseResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(verseResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(verseResponse, 'result.verse.verse'), 157)

    const chapterResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 82, method: 'quranapi.chapter', params: { edition: 'eng-ummmuhammad', chapter: 1, limit: 2 } }),
    )
    assert.equal(readProperty(chapterResponse, 'result.kind'), 'quranapi.chapter')
    assert.equal(readProperty(chapterResponse, 'result.query.offset'), 0)
    assert.equal(readProperty(chapterResponse, 'result.totalVerses'), 2)
    assert.equal(readProperty(chapterResponse, 'result.verses.0.verse'), 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('wolnelektury.books, wolnelektury.book, and wolnelektury.read are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/books/') {
      return new Response(JSON.stringify(createWolneLekturyBooksFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.pathname === '/api/books/studnia-i-wahadlo/') {
      return new Response(JSON.stringify(createWolneLekturyBookFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/media/book/txt/studnia-i-wahadlo.txt')
    return new Response(['title', 'line 1', 'line 2', 'line 3'].join('\n'), {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }) as typeof fetch
  try {
    const booksResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 83, method: 'wolnelektury.books', params: { query: 'studnia', limit: 5 } }),
    )
    assert.equal(readProperty(booksResponse, 'result.kind'), 'wolnelektury.books')
    assert.equal(readProperty(booksResponse, 'result.api.provider'), 'wolnelektury')
    assert.equal(readProperty(booksResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(booksResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(booksResponse, 'result.books.0.slug'), 'studnia-i-wahadlo')

    const bookResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 84, method: 'wolnelektury.book', params: { slug: 'studnia-i-wahadlo' } }),
    )
    assert.equal(readProperty(bookResponse, 'result.kind'), 'wolnelektury.book')
    assert.equal(readProperty(bookResponse, 'result.book.title'), 'Studnia i wahadło')
    assert.equal(readProperty(bookResponse, 'result.book.authors.0'), 'Edgar Allan Poe')

    const readResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 85, method: 'wolnelektury.read', params: { slug: 'studnia-i-wahadlo', offset: 1, limit: 2 } }),
    )
    assert.equal(readProperty(readResponse, 'result.kind'), 'wolnelektury.read')
    assert.equal(readProperty(readResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(readResponse, 'result.page.lines.0'), 'line 1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('hebcal.convert and hebcal.calendar are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/converter') {
      assert.equal(url.searchParams.get('cfg'), 'json')
      assert.equal(url.searchParams.get('g2h'), '1')
      return new Response(JSON.stringify(createHebcalConvertFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/hebcal')
    assert.equal(url.searchParams.get('v'), '1')
    assert.equal(url.searchParams.get('cfg'), 'json')
    return new Response(JSON.stringify(createHebcalCalendarFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const convertResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 85, method: 'hebcal.convert', params: { date: '2026-05-03', strict: true } }),
    )
    assert.equal(readProperty(convertResponse, 'result.kind'), 'hebcal.convert')
    assert.equal(readProperty(convertResponse, 'result.api.provider'), 'hebcal')
    assert.equal(readProperty(convertResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(convertResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(convertResponse, 'result.conversion.gregorianDate'), '2026-05-03')

    const calendarResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 86, method: 'hebcal.calendar', params: { start: '2026-05-03', days: 8, israel: false } }),
    )
    assert.equal(readProperty(calendarResponse, 'result.kind'), 'hebcal.calendar')
    assert.equal(readProperty(calendarResponse, 'result.events.0.title'), 'Pesach Sheni')
    assert.equal(readProperty(calendarResponse, 'result.query.days'), 8)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('nagerdate.countries and nagerdate.holidays are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/availablecountries')) {
      return new Response(JSON.stringify(createNagerDateCountriesFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/api/v3/publicholidays/2026/US')
    return new Response(JSON.stringify(createNagerDateHolidaysFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const countriesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 87, method: 'nagerdate.countries', params: { query: 'United', limit: 10 } }),
    )
    assert.equal(readProperty(countriesResponse, 'result.kind'), 'nagerdate.countries')
    assert.equal(readProperty(countriesResponse, 'result.api.provider'), 'nagerdate')
    assert.equal(readProperty(countriesResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(countriesResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(countriesResponse, 'result.countries.0.countryCode'), 'US')

    const holidaysResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 88, method: 'nagerdate.holidays', params: { year: 2026, countryCode: 'US' } }),
    )
    assert.equal(readProperty(holidaysResponse, 'result.kind'), 'nagerdate.holidays')
    assert.equal(readProperty(holidaysResponse, 'result.holidays.0.name'), "New Year's Day")
    assert.equal(readProperty(holidaysResponse, 'result.query.countryCode'), 'US')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('namedays.date and namedays.name are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/V2/date')) {
      assert.equal(url.searchParams.get('day'), '3')
      assert.equal(url.searchParams.get('month'), '5')
      return new Response(JSON.stringify(createNamedaysDateFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/api/V2/getname')
    assert.equal(String(init?.body), JSON.stringify({ name: 'John' }))
    return new Response(JSON.stringify(createNamedaysNameFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const dateResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 89, method: 'namedays.date', params: { day: 3, month: 5, country: 'us' } }),
    )
    assert.equal(readProperty(dateResponse, 'result.kind'), 'namedays.date')
    assert.equal(readProperty(dateResponse, 'result.api.provider'), 'namedays')
    assert.equal(readProperty(dateResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(dateResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(dateResponse, 'result.countries.0.country'), 'us')

    const nameResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 90, method: 'namedays.name', params: { name: 'John', country: 'us' } }),
    )
    assert.equal(readProperty(nameResponse, 'result.kind'), 'namedays.name')
    assert.equal(readProperty(nameResponse, 'result.matches.0.country'), 'us')
    assert.equal(readProperty(nameResponse, 'result.matches.0.day'), 24)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ukbankholidays.events is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://www.gov.uk/bank-holidays.json')
    return new Response(JSON.stringify(createUkBankHolidaysFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 62, method: 'ukbankholidays.events', params: { division: 'england-and-wales', year: 2026, limit: 20 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'ukbankholidays.events')
    assert.equal(readProperty(response, 'result.api.provider'), 'uk-bank-holidays')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.division'), 'england-and-wales')
    assert.equal(readProperty(response, 'result.events.0.title'), 'New Year’s Day')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ukcarbonintensity operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/intensity') {
      return new Response(JSON.stringify(createUkCarbonIntensityFixture()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    assert.equal(url.pathname, '/generation')
    return new Response(JSON.stringify(createUkCarbonGenerationFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const intensityResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 63, method: 'ukcarbonintensity.intensity' }),
    )
    assert.equal(readProperty(intensityResponse, 'result.kind'), 'ukcarbonintensity.intensity')
    assert.equal(readProperty(intensityResponse, 'result.api.provider'), 'ukcarbonintensity')
    assert.equal(readProperty(intensityResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(intensityResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(intensityResponse, 'result.reading.actual'), 204)

    const generationResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 64, method: 'ukcarbonintensity.generation' }),
    )
    assert.equal(readProperty(generationResponse, 'result.kind'), 'ukcarbonintensity.generation')
    assert.equal(readProperty(generationResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(generationResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(generationResponse, 'result.generationMix.0.fuel'), 'biomass')
    assert.equal(readProperty(generationResponse, 'result.generationMix.3.percentage'), 46.1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('artic.artworks is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({
    pagination: {
      total: 131926,
      limit: 3,
      offset: 0,
      total_pages: 43976,
      current_page: 1,
    },
    data: [
      {
        _score: 91.43464,
        id: 656,
        title: 'Lion (One of a Pair, South Pedestal)',
        date_display: '1893',
        artist_display: 'Edward Kemeys (American, 1843–1907)',
        image_id: '6b1edb9c-0f3f-0ee3-47c7-ca25c39ee360',
        is_public_domain: false,
      },
    ],
    info: {
      license_text: 'Data is licensed under CC0 and Terms and Conditions of artic.edu.',
      license_links: ['https://creativecommons.org/publicdomain/zero/1.0/'],
      version: '1.14',
    },
    config: {
      iiif_url: 'https://www.artic.edu/iiif/2',
      website_url: 'http://www.artic.edu',
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 64, method: 'artic.artworks', params: { query: 'cats', limit: 3 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'artic.artworks')
    assert.equal(readProperty(response, 'result.api.provider'), 'art-institute-chicago')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.query'), 'cats')
    assert.equal(readProperty(response, 'result.artworks.0.title'), 'Lion (One of a Pair, South Pedestal)')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('colormind.palette and colormind.models are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/list/') {
      return new Response(JSON.stringify({ result: ['default', 'ui', 'makoto_shinkai'] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ result: [[49, 47, 49], [91, 83, 81], [133, 155, 143], [226, 209, 167], [235, 198, 126]] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const paletteResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 65, method: 'colormind.palette', params: { model: 'ui', input: '#2c2b2c,#5a5352,N,N,N' } }),
    )
    assert.equal(readProperty(paletteResponse, 'result.kind'), 'colormind.palette')
    assert.equal(readProperty(paletteResponse, 'result.api.provider'), 'colormind')
    assert.equal(readProperty(paletteResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(paletteResponse, 'result.api.transport'), 'http-only')
    assert.equal(readProperty(paletteResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(paletteResponse, 'result.colors.0.hex'), '#312F31')

    const modelsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 66, method: 'colormind.models', params: { limit: 2 } }),
    )
    assert.equal(readProperty(modelsResponse, 'result.kind'), 'colormind.models')
    assert.deepEqual(readProperty(modelsResponse, 'result.models'), ['default', 'ui'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('emojihub operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/random') {
      return new Response(JSON.stringify(createEmojiFixture()), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === '/api/categories') {
      return new Response(JSON.stringify(['smileys and people', 'animals and nature']), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === '/api/groups') {
      return new Response(JSON.stringify(['cat face', 'animal mammal']), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify([createEmojiFixture()]), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const randomResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 67, method: 'emojihub.random', params: {} }),
    )
    assert.equal(readProperty(randomResponse, 'result.kind'), 'emojihub.random')
    assert.equal(readProperty(randomResponse, 'result.api.provider'), 'emojihub')
    assert.equal(readProperty(randomResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(randomResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(randomResponse, 'result.emoji.character'), '😺')

    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 68, method: 'emojihub.search', params: { query: 'cat', limit: 1 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'emojihub.search')
    assert.equal(readProperty(searchResponse, 'result.emojis.0.name'), 'smiling cat face with open mouth')

    const categoriesResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 69, method: 'emojihub.categories', params: { limit: 1 } }),
    )
    assert.deepEqual(readProperty(categoriesResponse, 'result.categories'), ['smileys and people'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('metmuseum operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/search')) {
      return new Response(JSON.stringify({ total: 2, objectIDs: [436121, 436545] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname.endsWith('/departments')) {
      return new Response(JSON.stringify({ departments: [{ departmentId: 11, displayName: 'European Paintings' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify(createMetObjectFixture(Number(url.pathname.split('/').pop() ?? 436121))), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 70, method: 'metmuseum.search', params: { query: 'cat', limit: 2, detailLimit: 1 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'metmuseum.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'metmuseum')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.objects.0.title'), 'A Woman Seated beside a Vase of Flowers')

    const objectResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 71, method: 'metmuseum.object', params: { objectId: 436121 } }),
    )
    assert.equal(readProperty(objectResponse, 'result.kind'), 'metmuseum.object')
    assert.equal(readProperty(objectResponse, 'result.object.objectId'), 436121)

    const departmentsResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 72, method: 'metmuseum.departments', params: { limit: 1 } }),
    )
    assert.deepEqual(readProperty(departmentsResponse, 'result.departments'), [{ departmentId: 11, displayName: 'European Paintings' }])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('phpnoise.generate is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({ base64: `data:image/png;base64,${Buffer.from('png').toString('base64')}` }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 73, method: 'phpnoise.generate', params: { hex: '336699', tiles: 3, tileSize: 5, borderWidth: 1 } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'phpnoise.generate')
    assert.equal(readProperty(response, 'result.api.provider'), 'php-noise')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.image.mimeType'), 'image/png')
    assert.equal(readProperty(response, 'result.image.dimensions.width'), 17)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('quickchart.render is exposed through JSON-RPC without auth', async () => {
  const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01])
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.pathname, '/chart')
    assert.equal(url.searchParams.get('width'), '500')
    assert.equal(url.searchParams.get('height'), '300')
    return new Response(pngBytes, { status: 200, headers: { 'content-type': 'image/png' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 74, method: 'quickchart.render', params: { chartType: 'bar', labels: 'A,B', data: '1,2', title: 'Demo' } }),
    )

    assert.equal(readProperty(response, 'result.kind'), 'quickchart.render')
    assert.equal(readProperty(response, 'result.api.provider'), 'quickchart')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.chart.mediaType'), 'image/png')
    assert.equal(readProperty(response, 'result.chart.dimensions.width'), 500)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('networkcalc subnet and binary are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    if (url.pathname.startsWith('/api/binary/')) {
      return new Response(JSON.stringify({
        status: 'OK',
        original: 'ff',
        converted: '11111111',
        from: '16',
        to: '2',
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      status: 'OK',
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
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const subnetResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 75, method: 'networkcalc.subnet', params: { ip: '10.5.1.0', cidr: 27, binary: true } }),
    )
    assert.equal(readProperty(subnetResponse, 'result.kind'), 'networkcalc.subnet')
    assert.equal(readProperty(subnetResponse, 'result.api.providerId'), 'networkcalc')
    assert.equal(readProperty(subnetResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(subnetResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(subnetResponse, 'result.address.network_address'), '10.5.1.0')

    const binaryResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 76, method: 'networkcalc.binary', params: { value: 'ff', from: 16, to: 2 } }),
    )
    assert.equal(readProperty(binaryResponse, 'result.kind'), 'networkcalc.binary')
    assert.equal(readProperty(binaryResponse, 'result.api.providerId'), 'networkcalc')
    assert.equal(readProperty(binaryResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(binaryResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(binaryResponse, 'result.conversion.converted'), '11111111')
    assert.deepEqual(requestedUrls, [
      'https://networkcalc.com/api/ip/10.5.1.0/27?binary=true',
      'https://networkcalc.com/api/binary/ff?from=16&to=2',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('serialifcolor.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://color.serialif.com/aquamarine')
    return new Response(JSON.stringify({
      status: 'success',
      base: {
        keyword: 'aquamarine',
        hex: { value: '#7fffd4' },
        rgb: { value: 'rgb(127, 255, 212)' },
        hsl: { value: 'hsl(160, 100%, 75%)' },
      },
      base_without_alpha_contrasted_text: {
        keyword: 'black',
        hex: { value: '#000000' },
        rgb: { value: 'rgb(0, 0, 0)' },
        hsl: { value: 'hsl(0, 0%, 0%)' },
      },
      complementary: {
        hex: { value: '#80002b' },
        rgb: { value: 'rgb(128, 0, 43)' },
        hsl: { value: 'hsl(340, 100%, 25%)' },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 77, method: 'serialifcolor.lookup', params: { color: 'aquamarine' } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'serialifcolor.lookup')
    assert.equal(readProperty(response, 'result.api.providerId'), 'serialifcolor')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.colors.base.hex'), '#7fffd4')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('adresse search and reverse are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    return new Response(JSON.stringify({
      type: 'FeatureCollection',
      query: url.searchParams.get('q') ?? undefined,
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2.062821, 49.031624] },
          properties: {
            label: url.pathname.includes('reverse') ? 'Grande Rue 91720 Prunay-sur-Essonne' : '8 Boulevard du Port 95000 Cergy',
            score: url.pathname.includes('reverse') ? 0.9851 : 0.4924,
            distance: url.pathname.includes('reverse') ? 149 : undefined,
            name: url.pathname.includes('reverse') ? 'Grande Rue' : '8 Boulevard du Port',
            postcode: url.pathname.includes('reverse') ? '91720' : '95000',
            citycode: url.pathname.includes('reverse') ? '91507' : '95127',
            city: url.pathname.includes('reverse') ? 'Prunay-sur-Essonne' : 'Cergy',
            context: url.pathname.includes('reverse') ? '91, Essonne, Île-de-France' : "95, Val-d'Oise, Île-de-France",
            type: url.pathname.includes('reverse') ? 'street' : 'housenumber',
          },
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 778, method: 'adresse.search', params: { query: '8 bd du port', limit: 2 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'adresse.search')
    assert.equal(readProperty(searchResponse, 'result.api.providerId'), 'adresse')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.results.0.city'), 'Cergy')

    const reverseResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 779, method: 'adresse.reverse', params: { latitude: 48.357, longitude: 2.37, limit: 2 } }),
    )
    assert.equal(readProperty(reverseResponse, 'result.kind'), 'adresse.reverse')
    assert.equal(readProperty(reverseResponse, 'result.api.providerId'), 'adresse')
    assert.equal(readProperty(reverseResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(reverseResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(reverseResponse, 'result.results.0.distance'), 149)
    assert.deepEqual(requestedUrls, [
      'https://data.geopf.fr/geocodage/search?q=8+bd+du+port&limit=2',
      'https://data.geopf.fr/geocodage/reverse?lat=48.357&lon=2.37&limit=2',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bdapis operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    if (url.pathname.endsWith('/divisions')) {
      return new Response(JSON.stringify({ status: { code: 200, message: 'ok' }, data: [{ division: 'Dhaka', divisionbn: 'ঢাকা', coordinates: '23.9536, 90.1495' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      status: { code: 200, message: 'ok' },
      data: [{ district: 'Dhaka', districtbn: 'ঢাকা', coordinates: '23.8105, 90.3372', upazillas: ['Dhamrai', 'Dohar', 'Keraniganj', 'Nawabganj', 'Savar'] }],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const divisions = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 780, method: 'bdapis.divisions', params: { limit: 1 } }))
    assert.equal(readProperty(divisions, 'result.kind'), 'bdapis.divisions')
    assert.equal(readProperty(divisions, 'result.api.providerId'), 'bdapis')
    assert.equal(readProperty(divisions, 'result.api.authentication'), 'none')
    assert.equal(readProperty(divisions, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(divisions, 'result.divisions.0.division'), 'Dhaka')

    const districts = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 781, method: 'bdapis.districts', params: { limit: 1 } }))
    assert.equal(readProperty(districts, 'result.kind'), 'bdapis.districts')
    assert.equal(readProperty(districts, 'result.districts.0.district'), 'Dhaka')

    const division = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 782, method: 'bdapis.division', params: { division: 'dhaka', limit: 1 } }))
    assert.equal(readProperty(division, 'result.kind'), 'bdapis.division')
    assert.equal(readProperty(division, 'result.districts.0.upazillas.0'), 'Dhamrai')

    const district = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 783, method: 'bdapis.district', params: { district: 'dhaka' } }))
    assert.equal(readProperty(district, 'result.kind'), 'bdapis.district')
    assert.equal(readProperty(district, 'result.district.district'), 'Dhaka')
    assert.deepEqual(requestedUrls, [
      'https://bdapis.com/api/v1.2/divisions',
      'https://bdapis.com/api/v1.2/districts',
      'https://bdapis.com/api/v1.2/division/dhaka',
      'https://bdapis.com/api/v1.2/district/dhaka',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bng2latlong.convert is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    assert.equal(String(input), 'https://api.getthedata.com/bng2latlong/319421/174588/json')
    return new Response(JSON.stringify({ status: 'ok', easting: 319421, northing: 174588, latitude: 51.4645, longitude: -3.16134 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 784, method: 'bng2latlong.convert', params: { easting: 319421, northing: 174588 } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'bng2latlong.convert')
    assert.equal(readProperty(response, 'result.api.providerId'), 'bng2latlong')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.conversion.latitude'), 51.4645)
  } finally {
    globalThis.fetch = originalFetch
  }
})








test('ipinfo.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    return new Response(JSON.stringify({
      anycast: true,
      city: 'Mountain View',
      country: 'US',
      hostname: 'dns.google',
      ip: '8.8.8.8',
      loc: '37.4056,-122.0775',
      org: 'AS15169 Google LLC',
      readme: 'https://ipinfo.io/missingauth',
      region: 'California',
      timezone: 'America/Los_Angeles',
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 797, method: 'ipinfo.lookup', params: { ip: '8.8.8.8' } }))
    assert.equal(readProperty(response, 'result.kind'), 'ipinfo.lookup')
    assert.equal(readProperty(response, 'result.api.providerId'), 'ipinfo')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.lookup.country'), 'US')
    assert.equal(readProperty(response, 'result.lookup.latitude'), 37.4056)
    assert.deepEqual(requestedUrls, ['https://ipinfo.io/8.8.8.8/json'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ipapi.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    return new Response(JSON.stringify({
      status: 'success',
      country: 'United States',
      countryCode: 'US',
      region: 'VA',
      regionName: 'Virginia',
      city: 'Ashburn',
      lat: 39.03,
      lon: -77.5,
      timezone: 'America/New_York',
      isp: 'Google LLC',
      org: 'Google Public DNS',
      as: 'AS15169 Google LLC',
      query: '8.8.8.8',
    }), { status: 200, headers: { 'content-type': 'application/json', 'x-rl': '44', 'x-ttl': '60' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 798, method: 'ipapi.lookup', params: { query: '8.8.8.8' } }))
    assert.equal(readProperty(response, 'result.kind'), 'ipapi.lookup')
    assert.equal(readProperty(response, 'result.api.providerId'), 'ip-api')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.api.transport'), 'HTTP JSON REST')
    assert.equal(readProperty(response, 'result.lookup.countryCode'), 'US')
    assert.equal(readProperty(response, 'result.lookup.latitude'), 39.03)
    assert.equal(readProperty(response, 'result.transport.security'), 'http-only')
    assert.deepEqual(requestedUrls, ['http://ip-api.com/json/8.8.8.8?fields=status%2Cmessage%2Ccountry%2CcountryCode%2Cregion%2CregionName%2Ccity%2Czip%2Clat%2Clon%2Ctimezone%2Cisp%2Corg%2Cas%2Cquery'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ipgeo.lookup is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    return new Response(JSON.stringify({
      status: 'success',
      continent: 'North America',
      country: 'United States',
      countryCode: 'US',
      regionName: 'Virginia',
      city: 'Ashburn',
      lat: 39.03,
      lon: -77.5,
      timezone: 'America/New_York',
      isp: 'Google LLC',
      org: 'Google Public DNS',
      as: 'AS15169 Google LLC',
      reverse: 'dns.google',
      mobile: false,
      proxy: false,
      hosting: true,
      ip: '8.8.8.8',
      cached: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 799, method: 'ipgeo.lookup', params: { query: '8.8.8.8' } }))
    assert.equal(readProperty(response, 'result.kind'), 'ipgeo.lookup')
    assert.equal(readProperty(response, 'result.api.providerId'), 'ipgeo')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.api.transport'), 'HTTPS JSON REST')
    assert.equal(readProperty(response, 'result.lookup.countryCode'), 'US')
    assert.equal(readProperty(response, 'result.lookup.latitude'), 39.03)
    assert.equal(readProperty(response, 'result.lookup.hosting'), true)
    assert.deepEqual(requestedUrls, ['https://api.techniknews.net/ipgeo/8.8.8.8'])
  } finally {
    globalThis.fetch = originalFetch
  }
})



test('ibge states and municipalities are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    const states = [{ id: 35, sigla: 'SP', nome: 'São Paulo', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } }]
    const municipalities = [{ id: 3550308, nome: 'São Paulo', 'regiao-imediata': { nome: 'São Paulo', 'regiao-intermediaria': { nome: 'São Paulo', UF: states[0] } } }]
    return new Response(JSON.stringify(url.pathname.includes('/municipios') ? municipalities : states), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const states = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 795, method: 'ibge.states', params: { limit: 1 } }))
    assert.equal(readProperty(states, 'result.kind'), 'ibge.states')
    assert.equal(readProperty(states, 'result.api.providerId'), 'ibge')
    assert.equal(readProperty(states, 'result.api.authentication'), 'none')
    assert.equal(readProperty(states, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(states, 'result.states.0.acronym'), 'SP')

    const municipalities = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 796, method: 'ibge.municipalities', params: { state: 'SP', limit: 1 } }))
    assert.equal(readProperty(municipalities, 'result.kind'), 'ibge.municipalities')
    assert.equal(readProperty(municipalities, 'result.api.providerId'), 'ibge')
    assert.equal(readProperty(municipalities, 'result.municipalities.0.name'), 'São Paulo')
    assert.deepEqual(requestedUrls, [
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios?orderBy=nome',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})



test('hongkonggeodata.locationSearch is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    return new Response(JSON.stringify([
      { nameEN: 'Hong Kong Cultural Centre', addressEN: '10 Salisbury Road', districtEN: 'Yau Tsim Mong District', x: 835599, y: 817190 },
    ]), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 794, method: 'hongkonggeodata.locationSearch', params: { query: 'cultural centre', limit: 1 } }))
    assert.equal(readProperty(response, 'result.kind'), 'hongkonggeodata.locationSearch')
    assert.equal(readProperty(response, 'result.api.providerId'), 'hongkonggeodata')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.query'), 'cultural centre')
    assert.equal(readProperty(response, 'result.locations.0.nameEnglish'), 'Hong Kong Cultural Centre')
    assert.deepEqual(requestedUrls, ['https://www.map.gov.hk/gs/api/v1.0.0/locationSearch?q=cultural+centre'])
  } finally {
    globalThis.fetch = originalFetch
  }
})



test('hellosalut.translate is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    return new Response(JSON.stringify({ code: 'fr', hello: 'Salut' }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 793, method: 'hellosalut.translate', params: { language: 'fr' } }))
    assert.equal(readProperty(response, 'result.kind'), 'hellosalut.translate')
    assert.equal(readProperty(response, 'result.api.providerId'), 'hellosalut')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.language'), 'fr')
    assert.equal(readProperty(response, 'result.translation.hello'), 'Salut')
    assert.deepEqual(requestedUrls, ['https://hellosalut.stefanbohacek.com/?lang=fr'])
  } finally {
    globalThis.fetch = originalFetch
  }
})



test('geojs lookup and current IP are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    if (url.pathname === '/v1/ip.json') {
      return new Response(JSON.stringify({ ip: '77.1.2.3' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      accuracy: 1000,
      asn: 15169,
      continent_code: 'NA',
      country: 'United States',
      country_code: 'US',
      country_code3: 'USA',
      ip: '8.8.8.8',
      latitude: '37.751',
      longitude: '-97.822',
      organization: 'AS15169 Google LLC',
      organization_name: 'Google LLC',
      timezone: 'America/Chicago',
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const lookup = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 791, method: 'geojs.lookup', params: { ip: '8.8.8.8' } }))
    assert.equal(readProperty(lookup, 'result.kind'), 'geojs.lookup')
    assert.equal(readProperty(lookup, 'result.api.providerId'), 'geojs')
    assert.equal(readProperty(lookup, 'result.api.authentication'), 'none')
    assert.equal(readProperty(lookup, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(lookup, 'result.lookup.countryCode'), 'US')
    assert.equal(readProperty(lookup, 'result.lookup.latitude'), 37.751)

    const currentIp = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 792, method: 'geojs.currentIp', params: {} }))
    assert.equal(readProperty(currentIp, 'result.kind'), 'geojs.currentIp')
    assert.equal(readProperty(currentIp, 'result.api.providerId'), 'geojs')
    assert.equal(readProperty(currentIp, 'result.currentIp.ip'), '77.1.2.3')
    assert.deepEqual(requestedUrls, ['https://get.geojs.io/v1/ip/geo/8.8.8.8.json', 'https://get.geojs.io/v1/ip.json'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('geoapi operations are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    if (url.pathname.includes('departements')) {
      return new Response(JSON.stringify([{ nom: 'Paris', code: '75', region: { code: '11', nom: 'Île-de-France' } }]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === '/regions') {
      return new Response(JSON.stringify([{ nom: 'Île-de-France', code: '11' }]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify([{ nom: 'Paris', code: '75056', codesPostaux: ['75001'], centre: { type: 'Point', coordinates: [2.347, 48.8589] }, population: 2103778, departement: { code: '75', nom: 'Paris' }, region: { code: '11', nom: 'Île-de-France' } }]), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const communes = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 788, method: 'geoapi.communes', params: { query: 'Paris', limit: 3, includeGeometry: true } }))
    assert.equal(readProperty(communes, 'result.kind'), 'geoapi.communes')
    assert.equal(readProperty(communes, 'result.api.providerId'), 'geoapi')
    assert.equal(readProperty(communes, 'result.api.authentication'), 'none')
    assert.equal(readProperty(communes, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(communes, 'result.communes.0.code'), '75056')
    assert.equal(readProperty(communes, 'result.communes.0.latitude'), 48.8589)

    const departments = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 789, method: 'geoapi.departments', params: { regionCode: '11', limit: 5 } }))
    assert.equal(readProperty(departments, 'result.kind'), 'geoapi.departments')
    assert.equal(readProperty(departments, 'result.departments.0.code'), '75')

    const regions = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 790, method: 'geoapi.regions', params: { limit: 18 } }))
    assert.equal(readProperty(regions, 'result.kind'), 'geoapi.regions')
    assert.equal(readProperty(regions, 'result.regions.0.code'), '11')

    assert.deepEqual(requestedUrls, [
      'https://geo.api.gouv.fr/communes?nom=Paris&boost=population&fields=nom%2Ccode%2CcodesPostaux%2Ccentre%2Cdepartement%2Cregion%2Cpopulation&format=json&geometry=centre&limit=3',
      'https://geo.api.gouv.fr/regions/11/departements?fields=nom%2Ccode%2Cregion&format=json',
      'https://geo.api.gouv.fr/regions?fields=nom%2Ccode&format=json',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('ducksunlimited.chapters is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    return new Response(JSON.stringify({
      objectIdFieldName: 'OBJECTID',
      geometryType: 'esriGeometryPoint',
      exceededTransferLimit: false,
      features: [
        {
          attributes: {
            OBJECTID: 76,
            University_Chapter: 'Texas A&M University',
            City: 'College Station',
            State: 'TX',
            ChapterID: 'TX-0217',
            MEVR_RD: 'Rob Wilson',
          },
          geometry: { x: -96.34616814755597, y: 30.60579567005256 },
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 787, method: 'ducksunlimited.chapters', params: { state: 'TX', query: 'Texas', limit: 5, includeGeometry: true } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'ducksunlimited.chapters')
    assert.equal(readProperty(response, 'result.api.providerId'), 'ducksunlimited')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.state'), 'TX')
    assert.equal(readProperty(response, 'result.chapters.0.universityChapter'), 'Texas A&M University')
    assert.equal(readProperty(response, 'result.chapters.0.latitude'), 30.60579567005256)
    assert.equal(requestedUrls.length, 1)
    const requested = new URL(requestedUrls[0] ?? '')
    assert.equal(requested.hostname, 'services2.arcgis.com')
    assert.equal(requested.searchParams.get('returnGeometry'), 'true')
    assert.equal(requested.searchParams.get('resultRecordCount'), '5')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('countryis lookup and info are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  const requestedUrls: string[] = []
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    requestedUrls.push(url.href)
    if (url.pathname === '/info') {
      return new Response(JSON.stringify({ version: '4.2.3', dataSources: ['maxmind', 'cloudflare'], lastUpdated: '2026-05-05T07:28:10.000Z' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({
      ip: '8.8.8.8',
      country: 'US',
      city: null,
      continent: 'NA',
      subdivision: null,
      postal: null,
      location: { latitude: 37.751, longitude: -97.822, accuracy_radius: 1000, time_zone: 'America/Chicago' },
      asn: { number: 15169, organization: 'Google LLC' },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const lookup = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 785, method: 'countryis.lookup', params: { ip: '8.8.8.8', includeDetails: true } }),
    )
    assert.equal(readProperty(lookup, 'result.kind'), 'countryis.lookup')
    assert.equal(readProperty(lookup, 'result.api.providerId'), 'countryis')
    assert.equal(readProperty(lookup, 'result.api.authentication'), 'none')
    assert.equal(readProperty(lookup, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(lookup, 'result.lookup.country'), 'US')
    assert.equal(readProperty(lookup, 'result.lookup.asn.organization'), 'Google LLC')

    const info = await handleJsonRpcLine(options, JSON.stringify({ jsonrpc: '2.0', id: 786, method: 'countryis.info', params: {} }))
    assert.equal(readProperty(info, 'result.kind'), 'countryis.info')
    assert.equal(readProperty(info, 'result.api.providerId'), 'countryis')
    assert.equal(readProperty(info, 'result.info.version'), '4.2.3')
    assert.deepEqual(requestedUrls, [
      'https://api.country.is/8.8.8.8?fields=city%2Ccontinent%2Csubdivision%2Cpostal%2Clocation%2Casn',
      'https://api.country.is/info',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('xcolors.random and xcolors.convert are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/api/random/blue') {
      return new Response(JSON.stringify([{ hex: '#D0E6FB', rgb: 'rgb(208, 230, 251)', hsl: 'hsl(210, 84%, 90%)' }]), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (url.pathname === '/api/rgb2hex') {
      return new Response(JSON.stringify({ rgb: 'rgb(120, 200, 30)', hex: '#78C81E' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ error: 'unexpected url' }), { status: 404, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const randomResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 74, method: 'xcolors.random', params: { hue: 'blue', number: 1, type: 'light' } }),
    )
    assert.equal(readProperty(randomResponse, 'result.kind'), 'xcolors.random')
    assert.equal(readProperty(randomResponse, 'result.api.provider'), 'xcolors')
    assert.equal(readProperty(randomResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(randomResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(randomResponse, 'result.colors.0.hex'), '#D0E6FB')

    const convertResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 75, method: 'xcolors.convert', params: { operation: 'rgb2hex', value: '120-200-30' } }),
    )
    assert.equal(readProperty(convertResponse, 'result.kind'), 'xcolors.convert')
    assert.equal(readProperty(convertResponse, 'result.color.hex'), '#78C81E')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('websitecarbon.data is exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.href, 'https://api.websitecarbon.com/data?bytes=1000000&green=1')
    return new Response(JSON.stringify(createWebsiteCarbonDataFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  try {
    const response = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 631, method: 'websitecarbon.data', params: { bytes: 1_000_000, green: true } }),
    )
    assert.equal(readProperty(response, 'result.kind'), 'websitecarbon.data')
    assert.equal(readProperty(response, 'result.api.provider'), 'websitecarbon')
    assert.equal(readProperty(response, 'result.api.authentication'), 'none')
    assert.equal(readProperty(response, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(response, 'result.query.bytes'), 1_000_000)
    assert.equal(readProperty(response, 'result.result.rating'), 'B')
    assert.equal(readProperty(response, 'result.statistics.co2.grid.grams'), 0.1042066141963005)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('wiktionary.search and wiktionary.extract are exposed through JSON-RPC without auth', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    assert.equal(url.origin, 'https://en.wiktionary.org')
    assert.equal(url.pathname, '/w/api.php')
    if (url.searchParams.get('list') === 'search') {
      assert.equal(url.searchParams.get('srsearch'), 'hello')
      assert.equal(url.searchParams.get('srlimit'), '2')
      return new Response(JSON.stringify({
        batchcomplete: true,
        continue: { sroffset: 2, continue: '-||' },
        query: {
          searchinfo: { totalhits: 1535 },
          search: [
            {
              ns: 0,
              title: 'hello',
              pageid: 4803,
              size: 42895,
              wordcount: 1017,
              snippet: '<span class="searchmatch">Hello</span>, world',
              timestamp: '2026-03-23T18:04:21Z',
            },
          ],
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    assert.equal(url.searchParams.get('prop'), 'extracts')
    assert.equal(url.searchParams.get('titles'), 'hello')
    assert.equal(url.searchParams.get('exchars'), '200')
    return new Response(JSON.stringify({
      batchcomplete: true,
      query: {
        pages: [
          {
            pageid: 4803,
            ns: 0,
            title: 'hello',
            extract: '== English ==\n\n=== Interjection ===\nA greeting.',
          },
        ],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  try {
    const searchResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 64, method: 'wiktionary.search', params: { query: 'hello', limit: 2 } }),
    )
    assert.equal(readProperty(searchResponse, 'result.kind'), 'wiktionary.search')
    assert.equal(readProperty(searchResponse, 'result.api.provider'), 'wiktionary')
    assert.equal(readProperty(searchResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(searchResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(searchResponse, 'result.results.0.title'), 'hello')
    assert.equal(readProperty(searchResponse, 'result.pagination.nextOffset'), 2)

    const extractResponse = await handleJsonRpcLine(
      options,
      JSON.stringify({ jsonrpc: '2.0', id: 65, method: 'wiktionary.extract', params: { title: 'hello', chars: 200 } }),
    )
    assert.equal(readProperty(extractResponse, 'result.kind'), 'wiktionary.extract')
    assert.equal(readProperty(extractResponse, 'result.api.authentication'), 'none')
    assert.equal(readProperty(extractResponse, 'result.api.usesBrowserClickstream'), false)
    assert.equal(readProperty(extractResponse, 'result.page.title'), 'hello')
    assert.equal((readProperty(extractResponse, 'result.page.extract') as string).includes('A greeting'), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('public API RPC rejects invalid execution mode', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({
      jsonrpc: '2.0',
      id: 81,
      method: 'mediastack.news',
      params: { mode: 'sideways', keywords: 'rpc' },
    }),
  )

  assert.equal(readProperty(response, 'error.code'), -32000)
  assert.equal(readProperty(response, 'error.data.name'), 'ZodError')
})

test('unknown method preserves request id in JSON-RPC error', async () => {
  const response = await handleJsonRpcLine(
    options,
    JSON.stringify({ jsonrpc: '2.0', id: 'x', method: 'missing.method' }),
  )

  assert.equal(readProperty(response, 'jsonrpc'), '2.0')
  assert.equal(readProperty(response, 'id'), 'x')
  assert.equal(readProperty(response, 'error.code'), -32601)
  assert.equal(readProperty(response, 'error.data.code'), 'RPC_METHOD_NOT_FOUND')
})

test('parse errors use null request id', async () => {
  const response = await handleJsonRpcLine(options, '{not-json')

  assert.equal(readProperty(response, 'jsonrpc'), '2.0')
  assert.equal(readProperty(response, 'id'), null)
  assert.equal(readProperty(response, 'error.code'), -32000)
})

function createEmojiFixture(): Record<string, unknown> {
  return {
    name: 'smiling cat face with open mouth',
    category: 'smileys and people',
    group: 'cat face',
    htmlCode: ['&#128570;'],
    unicode: ['U+1F63A'],
  }
}

function createTleSearchFixture(): Record<string, unknown> {
  return {
    '@id': 'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=1',
    totalItems: 25,
    parameters: { search: 'ISS', page: 1, 'page-size': 20 },
    view: {
      first: 'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=1',
      next: 'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=2',
      last: 'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=2',
    },
    member: [createTleFixture()],
  }
}

function createTleFixture(): Record<string, unknown> {
  return {
    '@id': 'https://tle.ivanstanojevic.me/api/tle/25544',
    satelliteId: 25544,
    name: 'ISS (ZARYA)',
    date: '2026-05-10T17:09:53+00:00',
    line1: [
      '1 25544U 98067A   26130.71520280  .00006215',
      '00000+0  12011-3 0  9998',
    ].join('  '),
    line2: [
      '2 25544  51.6310 125.5915 0007454  44.6609',
      '315.4979 15.49176858565946',
    ].join(' '),
  }
}

function createUrantiaRpcFixture(url: URL): Record<string, unknown> {
  if (url.pathname === '/toc') {
    return {
      data: {
        parts: [{
          id: '0',
          title: 'Foreword',
          sponsorship: null,
          papers: [{ id: '0', title: 'Foreword', labels: ['Theology'] }],
        }],
      },
    }
  }
  if (url.pathname === '/papers/0') {
    return {
      data: {
        paper: {
          id: '0',
          partId: '0',
          title: 'Foreword',
          sortId: '0.000.000.000',
          labels: ['Theology'],
          video: { nova: { mp4: 'https://video.example/0.mp4' } },
        },
        paragraphs: [createUrantiaParagraphRpcFixture()],
      },
    }
  }
  if (url.pathname === '/paragraphs/0%3A0.1') {
    return {
      data: createUrantiaParagraphRpcFixture(),
      navigation: { prev: null, next: '0:0.2' },
    }
  }
  if (url.pathname === '/search') {
    return {
      data: [createUrantiaParagraphRpcFixture({
        id: '1:16.8.3',
        standardReferenceId: '16:8.3',
        paperId: '16',
        paperTitle: 'The Seven Master Spirits',
        sectionTitle: 'Urantia Personality',
        rank: 1,
      })],
      meta: { page: 0, limit: 3, total: 244, totalPages: 82 },
    }
  }
  return { data: [] }
}

function createUrantiaParagraphRpcFixture(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: '0:0.0.1',
    standardReferenceId: '0:0.1',
    sortId: '0.000.000.001',
    paperId: '0',
    sectionId: '0',
    partId: '0',
    paperTitle: 'Foreword',
    sectionTitle: null,
    paragraphId: '1',
    text: 'IN THE MINDS of the mortals of Urantia there exists great confusion.',
    htmlText: '<span>IN THE MINDS</span>',
    labels: ['Theology'],
    audio: { nova: { mp3: 'https://audio.example/0.mp3' } },
    ...overrides,
  }
}

function createUsgsEarthquakeRpcFixture(url: URL): Record<string, unknown> {
  if (url.searchParams.has('eventid')) return createUsgsEarthquakeEventFixture()
  return {
    type: 'FeatureCollection',
    metadata: {
      generated: 1778507928000,
      url: url.toString(),
      title: 'USGS Earthquakes',
      status: 200,
      api: '2.4.0',
      limit: 2,
      offset: 1,
    },
    features: [createUsgsEarthquakeEventFixture()],
  }
}

function createUsgsEarthquakeEventFixture(): Record<string, unknown> {
  return {
    type: 'Feature',
    id: 'us6000swvm',
    properties: {
      mag: 5.2,
      place: '72 km NW of Malango, Solomon Islands',
      time: 1778492931604,
      updated: 1778495736750,
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000swvm',
      detail: [
        'https://earthquake.usgs.gov/fdsnws/event/1/query?',
        'eventid=us6000swvm&format=geojson',
      ].join(''),
      felt: 4,
      cdi: 2.7,
      mmi: null,
      alert: null,
      status: 'reviewed',
      tsunami: 0,
      sig: 417,
      net: 'us',
      code: '6000swvm',
      sources: ',us,usauto,',
      types: ',origin,phase-data,',
      magType: 'mww',
      type: 'earthquake',
      title: 'M 5.2 - 72 km NW of Malango, Solomon Islands',
      products: {
        origin: [{
          contents: {
            'download.bin': {
              contentType: 'application/octet-stream',
              url: 'https://earthquake.usgs.gov/product/download.bin',
            },
          },
        }],
      },
    },
    geometry: { type: 'Point', coordinates: [159.1915, -9.2967, 10] },
  }
}

function createUsgsWaterRpcFixture(url: URL): Record<string, unknown> {
  return {
    declaredType: 'org.cuahsi.waterml.TimeSeriesResponseType',
    value: {
      queryInfo: { queryURL: url.toString() },
      timeSeries: [createUsgsWaterSeriesRpcFixture()],
    },
  }
}

function createUsgsWaterSeriesRpcFixture(): Record<string, unknown> {
  return {
    name: 'USGS:01646500:00060:00003',
    sourceInfo: {
      siteName: 'POTOMAC RIVER NEAR WASH, DC LITTLE FALLS PUMP STA',
      siteCode: [{ value: '01646500', agencyCode: 'USGS' }],
      geoLocation: {
        geogLocation: {
          latitude: 38.94977778,
          longitude: -77.12763889,
        },
      },
      timeZoneInfo: {
        defaultTimeZone: { zoneAbbreviation: 'EST' },
        daylightSavingsTimeZone: { zoneAbbreviation: 'EDT' },
      },
    },
    variable: {
      variableCode: [{ value: '00060' }],
      variableName: 'Streamflow, ft&#179;/s',
      variableDescription: 'Discharge, cubic feet per second',
      valueType: 'Derived Value',
      unit: { unitCode: 'ft3/s' },
      options: {
        option: [{ optionCode: '00003', value: 'Mean' }],
      },
      noDataValue: -999999,
    },
    values: [{
      qualifier: [{
        qualifierCode: 'P',
        qualifierDescription: 'Provisional data subject to revision.',
      }],
      value: [
        {
          value: '1340',
          dateTime: '2026-05-11T10:00:00.000-04:00',
          qualifiers: ['P'],
        },
        {
          value: '1350',
          dateTime: '2026-05-11T10:15:00.000-04:00',
          qualifiers: ['P'],
        },
      ],
    }],
  }
}

function createMetObjectFixture(objectID: number): Record<string, unknown> {
  return {
    objectID,
    title: 'A Woman Seated beside a Vase of Flowers',
    department: 'European Paintings',
    objectName: 'Painting',
    artistDisplayName: 'Edgar Degas',
    objectDate: '1865',
    medium: 'Oil on canvas',
    dimensions: '29 x 36 1/4 in.',
    isPublicDomain: true,
    primaryImage: 'https://images.metmuseum.org/CRDImages/ep/original/DP-25460-001.jpg',
    primaryImageSmall: 'https://images.metmuseum.org/CRDImages/ep/web-large/DP-25460-001.jpg',
    objectURL: `https://www.metmuseum.org/art/collection/search/${objectID}`,
  }
}

function createGitaVerseFixture(): Record<string, unknown> {
  return {
    chapter_no: 1,
    verse_no: 1,
    language: 'telugu',
    chapter_name: 'Arjuna Vishada Yoga',
    verse: 'ధృతరాష్ట్ర ఉవాచ ।',
    transliteration: '',
    synonyms: 'dhṛtarāṣṭra uvāca',
    audio_link: 'https://www.holy-bhagavad-gita.org/public/audio/001_001.mp3',
    translation: 'Dhritarashtra said.',
    purport: ['A short purport preview.'],
  }
}

function createHackerNewsItemFixture(id: number): Record<string, unknown> {
  return {
    id,
    type: 'story',
    by: 'pg',
    time: 1175714200,
    title: `Example story ${id}`,
    url: `https://example.com/${id}`,
    score: 57,
    descendants: 15,
    kids: [2001, 2002],
  }
}

function createJsonPlaceholderPostFixture(id: number): Record<string, unknown> {
  return {
    userId: 1,
    id,
    title: `Post ${id}`,
    body: `Body for post ${id}`,
  }
}

function createFakerApiPersonFixture(id: number): Record<string, unknown> {
  return {
    id,
    firstname: 'Ada',
    lastname: 'Lovelace',
    email: `ada${id}@example.com`,
    phone: '+12025550123',
    birthday: '1815-12-10',
    gender: 'female',
    address: {
      id,
      street: '1 Computing Way',
      streetName: 'Computing Way',
      buildingNumber: '1',
      city: 'London',
      zipcode: 'SW1A 1AA',
      country: 'United Kingdom',
      country_code: 'GB',
      latitude: 51.5,
      longitude: -0.1,
    },
    website: 'https://example.com',
    image: 'https://example.com/ada.jpg',
  }
}

function createFakerApiCompanyFixture(id: number): Record<string, unknown> {
  return {
    id,
    name: `Ada Labs ${id}`,
    email: `hello${id}@adalabs.example`,
    vat: '123456789',
    phone: '+12025550124',
    country: 'United Kingdom',
    addresses: [createFakerApiPersonFixture(id).address],
    website: 'https://adalabs.example',
    image: 'https://example.com/company.jpg',
    contact: createFakerApiPersonFixture(id),
  }
}

function createOpenBreweryDbBreweryFixture(id: string): Record<string, unknown> {
  return {
    id,
    name: 'Example Brewery',
    brewery_type: 'micro',
    address_1: '1 Beer Way',
    address_2: null,
    address_3: null,
    city: 'San Diego',
    state_province: 'California',
    postal_code: '92101',
    country: 'United States',
    longitude: -117.1,
    latitude: 32.7,
    phone: '6195550100',
    website_url: 'https://example.com',
    state: 'California',
    street: '1 Beer Way',
  }
}

function createOpenBreweryDbMetaFixture(): Record<string, unknown> {
  return {
    total: 91,
    by_state: { California: 91 },
    by_type: { micro: 45, brewpub: 23 },
    page: 1,
    per_page: 50,
  }
}

function createOpenFoodFactsProductEnvelopeFixture(): Record<string, unknown> {
  return {
    code: '737628064502',
    status: 1,
    status_verbose: 'product found',
    product: createOpenFoodFactsProductFixture('737628064502'),
  }
}

function createOpenFoodFactsProductFixture(code: string): Record<string, unknown> {
  return {
    code,
    product_name: code === '737628064502' ? 'Thai peanut noodle kit' : 'Nutella',
    brands: code === '737628064502' ? 'Simply Asia' : 'Ferrero',
    quantity: '400 g',
    nutriscore_grade: 'd',
    nova_group: 4,
    categories_tags: ['en:spreads'],
    labels_tags: ['en:vegetarian'],
    ingredients_text: 'Sugar, palm oil, hazelnuts, cocoa.',
    nutriments: { energy_kcal_100g: 539 },
    url: `https://world.openfoodfacts.org/product/${code}`,
  }
}

function createOpenGovernmentAustraliaPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 6163,
      results: [
        {
          id: 'bc515135-4bb6-4d50-957a-3713709a76d3',
          name: 'asic-business-names',
          title: 'ASIC - Business Names Dataset',
          notes: 'ASIC business names dataset.',
          organization: { title: 'Australian Securities and Investments Commission (ASIC)' },
          resources: [
            {
              id: '55ad4b1c-5eeb-44ea-8b29-d410da431be3',
              name: 'Business Names Dataset - Current',
              format: 'CSV',
              datastore_active: true,
              url: 'https://data.gov.au/data/dataset/example/resource/current.csv',
            },
          ],
        },
      ],
    },
  }
}

function createOpenGovernmentAustraliaDatastoreFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      resource_id: '55ad4b1c-5eeb-44ea-8b29-d410da431be3',
      total: 3293016,
      fields: [
        { id: '_id' },
        { id: 'REGISTER_NAME' },
        { id: 'BN_NAME' },
        { id: 'BN_STATUS' },
      ],
      records: [
        {
          _id: 1,
          REGISTER_NAME: 'BUSINESS NAMES',
          BN_NAME: 'HOMSAFE',
          BN_STATUS: 'Registered',
          BN_ABN: '56098948915',
        },
      ],
    },
  }
}

function createOpenGovernmentCanadaPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 3790,
      results: [createOpenGovernmentCanadaDatasetFixture()],
    },
  }
}

function createOpenGovernmentCanadaPackageShowFixture(): Record<string, unknown> {
  return {
    success: true,
    result: createOpenGovernmentCanadaDatasetFixture(),
  }
}

function createOpenGovernmentCanadaDatasetFixture(): Record<string, unknown> {
  return {
    id: '2d90548d-50ef-4802-91f8-c59c5cf68251',
    name: '2d90548d-50ef-4802-91f8-c59c5cf68251',
    title: 'Open Government API',
    notes: 'This API provides live access to the CKAN portion of the Open Government Portal and Registry systems.',
    license_title: 'Open Government Licence - Canada',
    license_url: 'https://open.canada.ca/en/open-government-licence-canada',
    organization: { title: 'Treasury Board of Canada Secretariat | Secrétariat du Conseil du Trésor du Canada' },
    resources: [
      {
        id: '36830ed0-cd83-4fea-b2ae-15890116c68e',
        name: 'OpenAPI Specification',
        format: 'JSON',
        datastore_active: false,
        url: 'https://open.canada.ca/data/dataset/2d90548d-50ef-4802-91f8-c59c5cf68251/resource/36830ed0-cd83-4fea-b2ae-15890116c68e/download/openapi-en.json',
      },
    ],
  }
}

function createOpenGovernmentGermanyPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 12673,
      results: [createOpenGovernmentGermanyDatasetFixture()],
    },
  }
}

function createOpenGovernmentGermanyPackageShowFixture(): Record<string, unknown> {
  return {
    success: true,
    result: createOpenGovernmentGermanyDatasetFixture(),
  }
}

function createOpenGovernmentGermanyDatasetFixture(): Record<string, unknown> {
  return {
    id: '89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7',
    name: '89e7db2e-e5a4-4a2f-b255-7f74ff7a65d7',
    title: 'GovData Metadatenkatalog',
    notes: 'GovData metadata catalog package.',
    license_title: 'Datenlizenz Deutschland – Zero – Version 2.0',
    license_url: 'https://www.govdata.de/dl-de/zero-2-0',
    organization: { title: 'Geschäfts- und Koordinierungsstelle GovData' },
    resources: [
      {
        id: '1103b63a-4500-401a-b4ff-4b6f1854c9af',
        name: 'JSON-LD Catalog',
        format: 'JSON',
        datastore_active: false,
        url: 'https://www.govdata.de/ckan/catalog/catalog.jsonld',
      },
    ],
  }
}

function createOpenGovernmentUkPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 5731,
      results: [createOpenGovernmentUkDatasetFixture()],
    },
  }
}

function createOpenGovernmentUkPackageShowFixture(): Record<string, unknown> {
  return {
    success: true,
    result: createOpenGovernmentUkDatasetFixture(),
  }
}

function createOpenGovernmentUkDatasetFixture(): Record<string, unknown> {
  return {
    id: '6d3d7654-4992-4203-92e8-81bfd6fd258b',
    name: '6d3d7654-4992-4203-92e8-81bfd6fd258b',
    title: 'Business Rates - Small Business Rate Relief',
    notes: 'Business rates relief metadata.',
    license_title: 'UK Open Government Licence',
    license_url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
    organization: { title: 'Calderdale Metropolitan Borough Council' },
    resources: [
      {
        id: '29427c66-7785-4c2e-a361-5694bb02c531',
        name: 'Small Business rates relief - October 2025',
        format: 'JSON',
        datastore_active: false,
        url: 'https://data.gov.uk/dataset/business-rates-small-business-rate-relief1',
      },
    ],
  }
}

function createOpenGovernmentUsSearchFixture(): Record<string, unknown> {
  return {
    after: 'cursor-2',
    results: [
      {
        identifier: 'SBA-GCBD-2014-08-001',
        slug: 'small-business-size-standards',
        title: 'Small Business Size Standards',
        publisher: 'Small Business Administration',
        organization: {
          id: '842b8561-cf24-49cf-b901-66c6932a392b',
          name: 'Small Business Administration',
          organization_type: 'Federal Government',
          slug: 'sba',
        },
        keyword: ['SBA', 'small business', 'standards'],
        distribution_titles: ['Small Business Size Standards'],
        dcat: {
          accessLevel: 'public',
          distribution: [
            {
              title: 'Small Business Size Standards',
              accessURL: 'https://data.sba.gov/dataset/small-business-size-standards',
            },
          ],
        },
      },
    ],
  }
}

function createOpenGovernmentUsOrganizationsFixture(): Record<string, unknown> {
  return {
    organizations: [
      {
        dataset_count: 284033,
        id: 'fb3131aa-ef06-4a00-ad84-67d93a71d7e3',
        name: 'U.S. Census Bureau, Department of Commerce',
        organization_type: 'Federal Government',
        slug: 'census',
        source_count: 590,
      },
    ],
  }
}

function createOpenGovernmentUsKeywordsFixture(): Record<string, unknown> {
  return {
    keywords: [
      { count: 257307, keyword: 'county or equivalent entity' },
      { count: 152182, keyword: 'state fips code' },
    ],
    min_count: 1,
    size: 2,
    total: 2,
  }
}

function createUsaSpendingAwardsFixture(): Record<string, unknown> {
  return {
    spending_level: 'awards',
    limit: 100,
    results: [
      {
        internal_id: 307885715,
        'Award ID': 'HT940216C0001',
        'Recipient Name': 'HUMANA GOVERNMENT BUSINESS INC',
        'Award Amount': 51269205263.03,
        'Awarding Agency': 'Department of Defense',
        'Start Date': '2016-08-01',
        'End Date': '2025-12-31',
        Description: 'IGF::OT::IGF',
        agency_slug: 'department-of-defense',
        generated_internal_id: 'CONT_AWD_HT940216C0001_9700_-NONE-_-NONE-',
      },
    ],
    page_metadata: { page: 1, total: 1, limit: 100, hasNext: false, hasPrevious: false },
    messages: [],
  }
}

function createUsaSpendingOverTimeFixture(): Record<string, unknown> {
  return {
    group: 'fiscal_year',
    spending_level: 'awards',
    results: [
      { time_period: { fiscal_year: '2025' }, aggregated_amount: 1837329531356.32, total_outlays: 252223947671.66, Contract_Obligations: 1837329531356.32, Grant_Obligations: 0, Loan_Obligations: 0, Direct_Obligations: 0, Other_Obligations: 0 },
    ],
    messages: ['time period note'],
  }
}

function createUsaSpendingAgenciesFixture(): Record<string, unknown> {
  return {
    results: [
      { agency_id: 456, toptier_code: '020', abbreviation: 'TREAS', agency_name: 'Department of the Treasury', active_fy: '2026', active_fq: '2', outlay_amount: 1036662242415.49, obligated_amount: 1037806753785.61, budget_authority_amount: 5571642140279.95, current_total_budget_authority_amount: 16146657299383.3, percentage_of_total_budget_authority: 0.3450647423162162, agency_slug: 'department-of-the-treasury' },
    ],
  }
}

function createWhiskyHunterDistilleriesFixture(): Array<Record<string, unknown>> {
  return [
    { name: '8 Doors Distillery', slug: '8_doors', country: 'Scotland' },
    { name: 'Aberfeldy', slug: 'aberfeldy', country: 'Scotland' },
    { name: 'Yoichi Distillery', slug: 'yoichi', country: 'Japan' },
  ]
}

function createNhtsaDecodeFixture(): Record<string, unknown> {
  return {
    Count: 1,
    Message: 'Results returned successfully',
    SearchCriteria: 'VIN(s): 1HGCM82633A004352',
    Results: [
      {
        VIN: '1HGCM82633A004352',
        Make: 'HONDA',
        Model: 'Accord',
        ModelYear: '2003',
        VehicleType: 'PASSENGER CAR',
        BodyClass: 'Sedan/Saloon',
        FuelTypePrimary: 'Gasoline',
        PlantCountry: 'UNITED STATES (USA)',
        Manufacturer: 'AMERICAN HONDA MOTOR CO., INC.',
        ErrorCode: '0',
        ErrorText: '0 - VIN decoded clean.',
      },
    ],
  }
}

function createNhtsaMakesFixture(): Record<string, unknown> {
  return {
    Count: 2,
    Message: 'Results returned successfully',
    SearchCriteria: 'Vehicle Type: car',
    Results: [
      { MakeId: 440, MakeName: 'ASTON MARTIN', VehicleTypeId: 2, VehicleTypeName: 'Passenger Car' },
      { MakeId: 441, MakeName: 'TESLA', VehicleTypeId: 2, VehicleTypeName: 'Passenger Car' },
    ],
  }
}

function createOpenMeteoForecastFixture(): Record<string, unknown> {
  return {
    latitude: 52.52,
    longitude: 13.42,
    utc_offset_seconds: 7200,
    timezone: 'Europe/Berlin',
    timezone_abbreviation: 'GMT+2',
    elevation: 38,
    current_units: { time: 'iso8601', temperature_2m: '°C', wind_speed_10m: 'km/h', weather_code: 'wmo code' },
    current: { time: '2026-05-03T23:15', temperature_2m: 21.4, wind_speed_10m: 4.4, weather_code: 3 },
    daily_units: { time: 'iso8601', temperature_2m_max: '°C', temperature_2m_min: '°C', precipitation_sum: 'mm' },
    daily: { time: ['2026-05-03'], temperature_2m_max: [28.4], temperature_2m_min: [11.2], precipitation_sum: [0] },
  }
}

function createOpenMeteoGeocodingFixture(): Record<string, unknown> {
  return {
    results: [
      {
        id: 2950159,
        name: 'Berlin',
        latitude: 52.52437,
        longitude: 13.41053,
        elevation: 74,
        feature_code: 'PPLC',
        country_code: 'DE',
        timezone: 'Europe/Berlin',
        population: 3426354,
        country: 'Germany',
        admin1: 'State of Berlin',
      },
    ],
  }
}

function createSunriseSunsetFixture(): Record<string, unknown> {
  return {
    results: {
      sunrise: '2026-05-11T05:12:08+00:00',
      sunset: '2026-05-11T19:15:59+00:00',
      solar_noon: '2026-05-11T12:14:04+00:00',
      day_length: 50631,
      civil_twilight_begin: '2026-05-11T04:45:00+00:00',
      civil_twilight_end: '2026-05-11T19:43:07+00:00',
      nautical_twilight_begin: '2026-05-11T04:10:13+00:00',
      nautical_twilight_end: '2026-05-11T20:17:55+00:00',
      astronomical_twilight_begin: '2026-05-11T03:32:47+00:00',
      astronomical_twilight_end: '2026-05-11T20:55:21+00:00',
    },
    status: 'OK',
    tzid: 'UTC',
  }
}

function createOpenSenseMapBoxFixture(): Record<string, unknown> {
  return {
    _id: '5391be52a8341554157792e6',
    name: 'LeKa Berlin',
    exposure: 'outdoor',
    model: 'homeWifi',
    currentLocation: {
      coordinates: [13.42761039733887, 52.54760056249269],
      type: 'Point',
      timestamp: '2014-06-06T13:12:50.000Z',
    },
    sensors: [
      {
        _id: '5391be52a8341554157792eb',
        sensorType: 'BMP085',
        title: 'Temperatur',
        unit: '°C',
        lastMeasurement: { createdAt: '2024-10-16T02:32:18.156Z', value: '22.4' },
      },
    ],
    lastMeasurementAt: '2024-10-16T02:32:18.156Z',
  }
}

function createDataUsaPopulationFixture(): Record<string, unknown> {
  return {
    annotations: {
      dataset_name: 'ACS 5-year Estimate',
      source_name: 'Census Bureau',
      topic: 'Diversity',
      table_id: 'B01003',
    },
    page: { limit: 20, offset: 0, total: 1 },
    columns: ['State ID', 'State', 'Year', 'Population'],
    data: [
      { 'State ID': '04000US06', State: 'California', Year: 2024, Population: 39287377 },
    ],
  }
}

function createDataUsaGeographiesFixture(): Record<string, unknown> {
  return {
    name: 'State',
    caption: 'State',
    depth: 1,
    members: [
      { key: '', caption: '' },
      { key: '04000US06', caption: 'California' },
      { key: '04000US36', caption: 'New York' },
    ],
  }
}

function createFedTreasuryDebtFixture(): Record<string, unknown> {
  return {
    meta: { count: 1, 'total-count': 8298, 'total-pages': 8298, labels: { record_date: 'Record Date' } },
    links: { next: '&page%5Bnumber%5D=2&page%5Bsize%5D=1' },
    data: [
      {
        record_date: '2026-04-30',
        tot_pub_debt_out_amt: '38967833861543.11',
        intragov_hold_amt: '7695343996107.23',
        debt_held_public_amt: '31272489865435.88',
      },
    ],
  }
}

function createFedTreasuryRatesFixture(): Record<string, unknown> {
  return {
    meta: { count: 2, 'total-count': 4929, 'total-pages': 986, labels: { record_date: 'Record Date' } },
    links: { next: '&page%5Bnumber%5D=2&page%5Bsize%5D=5' },
    data: [
      { record_date: '2026-03-31', security_desc: 'Treasury Bills', avg_interest_rate_amt: '3.702', src_line_nbr: '1' },
      { record_date: '2026-03-31', security_desc: 'Treasury Notes', avg_interest_rate_amt: '3.212', src_line_nbr: '2' },
    ],
  }
}

function createMfApiSearchFixture(): Array<Record<string, unknown>> {
  return [
    { schemeCode: 125497, schemeName: 'SBI Small Cap Fund - Direct Plan - Growth' },
    { schemeCode: 100122, schemeName: 'HDFC Balanced Fund - Growth Option' },
  ]
}

function createMfApiLatestFixture(): Record<string, unknown> {
  return {
    meta: {
      fund_house: 'SBI Mutual Fund',
      scheme_type: 'Open Ended Schemes',
      scheme_category: 'Equity Scheme - Small Cap Fund',
      scheme_code: 125497,
      scheme_name: 'SBI Small Cap Fund - Direct Plan - Growth',
      isin_growth: 'INF200K01T51',
      isin_div_reinvestment: null,
    },
    data: [
      { date: '30-04-2026', nav: '193.41310' },
    ],
    status: 'SUCCESS',
  }
}

function createUsWeatherPointFixture(): Record<string, unknown> {
  return {
    id: 'https://api.weather.gov/points/38.8894,-77.0352',
    properties: {
      gridId: 'LWX',
      gridX: 97,
      gridY: 71,
      forecast: 'https://api.weather.gov/gridpoints/LWX/97,71/forecast',
      forecastHourly: 'https://api.weather.gov/gridpoints/LWX/97,71/forecast/hourly',
      forecastGridData: 'https://api.weather.gov/gridpoints/LWX/97,71',
      observationStations: 'https://api.weather.gov/gridpoints/LWX/97,71/stations',
      timeZone: 'America/New_York',
      radarStation: 'KLWX',
      relativeLocation: {
        properties: {
          city: 'Washington',
          state: 'DC',
        },
      },
    },
  }
}

function createUsWeatherForecastFixture(): Record<string, unknown> {
  return {
    properties: {
      updated: '2026-05-04T01:00:00+00:00',
      units: 'us',
      generatedAt: '2026-05-04T01:05:00+00:00',
      periods: [
        {
          number: 1,
          name: 'Tonight',
          startTime: '2026-05-04T01:00:00-04:00',
          endTime: '2026-05-04T06:00:00-04:00',
          isDaytime: false,
          temperature: 62,
          temperatureUnit: 'F',
          probabilityOfPrecipitation: { value: 10 },
          windSpeed: '5 mph',
          windDirection: 'NW',
          icon: 'https://api.weather.gov/icons/land/night/few?size=medium',
          shortForecast: 'Mostly Clear',
          detailedForecast: 'Mostly clear, with a low around 62.',
        },
        {
          number: 2,
          name: 'Monday',
          startTime: '2026-05-04T06:00:00-04:00',
          endTime: '2026-05-04T18:00:00-04:00',
          isDaytime: true,
          temperature: 78,
          temperatureUnit: 'F',
          probabilityOfPrecipitation: { value: 20 },
          windSpeed: '6 mph',
          windDirection: 'NW',
          shortForecast: 'Sunny',
          detailedForecast: 'Sunny, with a high near 78.',
        },
      ],
    },
  }
}

function createHkoCurrentFixture(): Record<string, unknown> {
  return {
    rainfall: {
      data: [{ unit: 'mm', place: 'Wan Chai', max: 0, main: 'FALSE' }],
      startTime: '2026-05-05T00:00:00+08:00',
      endTime: '2026-05-05T01:00:00+08:00',
    },
    icon: [62],
    iconUpdateTime: '2026-05-04T18:00:00+08:00',
    uvindex: '',
    updateTime: '2026-05-05T01:02:00+08:00',
    temperature: {
      data: [
        { place: 'Hong Kong Observatory', value: 23, unit: 'C' },
        { place: 'Tai Po', value: 22, unit: 'C' },
      ],
      recordTime: '2026-05-05T01:00:00+08:00',
    },
    humidity: {
      recordTime: '2026-05-05T01:00:00+08:00',
      data: [{ unit: 'percent', value: 80, place: 'Hong Kong Observatory' }],
    },
  }
}

function createHkoForecastFixture(): Record<string, unknown> {
  return {
    generalSituation: 'The northeast monsoon will continue to bring slightly cooler weather.',
    updateTime: '2026-05-05T00:00:00+08:00',
    weatherForecast: [
      {
        forecastDate: '20260505',
        week: 'Tuesday',
        forecastWind: 'East force 4 to 5.',
        forecastWeather: 'Mainly cloudy with occasional showers.',
        forecastMaxtemp: { value: 24, unit: 'C' },
        forecastMintemp: { value: 21, unit: 'C' },
        forecastMaxrh: { value: 95, unit: 'percent' },
        forecastMinrh: { value: 80, unit: 'percent' },
        ForecastIcon: 63,
        PSR: 'Medium High',
      },
    ],
  }
}

function createBiblePassageFixture(): Record<string, unknown> {
  return {
    reference: 'John 3:16',
    verses: [
      {
        book_id: 'JHN',
        book_name: 'John',
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world.',
      },
    ],
    text: 'For God so loved the world.',
    translation_id: 'web',
    translation_name: 'World English Bible',
  }
}

function createBibleRandomFixture(): Record<string, unknown> {
  return {
    translation: {
      identifier: 'web',
      name: 'World English Bible',
      language: 'English',
      language_code: 'eng',
      license: 'Public Domain',
    },
    random_verse: {
      book_id: 'JHN',
      book: 'John',
      chapter: 3,
      verse: 16,
      text: 'Random verse text.',
    },
  }
}

function createBinlistLookupFixture(): Record<string, unknown> {
  return {
    number: {},
    scheme: 'visa',
    type: 'debit',
    brand: 'Visa Classic/Dankort',
    country: {
      numeric: '208',
      alpha2: 'DK',
      name: 'Denmark',
      emoji: '🇩🇰',
      currency: 'DKK',
      latitude: 56,
      longitude: 10,
    },
    bank: { name: 'Jyske Bank A/S' },
  }
}

function createCrossrefWorksFixture(): Record<string, unknown> {
  return {
    status: 'ok',
    message: {
      'total-results': 100,
      'items-per-page': 1,
      items: [
        {
          DOI: '10.1000/test',
          title: ['Metadata for Everyone'],
          author: [{ given: 'Ada', family: 'Lovelace' }],
          publisher: 'Example Publisher',
          type: 'book-chapter',
          issued: { 'date-parts': [[2026, 5, 3]] },
          URL: 'https://doi.org/10.1000/test',
        },
      ],
    },
  }
}

function createCrossrefWorkFixture(): Record<string, unknown> {
  return {
    status: 'ok',
    message: {
      DOI: '10.1000/test',
      title: ['Metadata for Everyone'],
      author: [{ given: 'Ada', family: 'Lovelace' }],
      publisher: 'Example Publisher',
      type: 'book-chapter',
      issued: { 'date-parts': [[2026, 5, 3]] },
      URL: 'https://doi.org/10.1000/test',
    },
  }
}

function createCrossrefRateHeaders(): Headers {
  return new Headers({
    'content-type': 'application/json',
    'x-rate-limit-limit': '5',
    'x-rate-limit-interval': '1s',
    'x-concurrency-limit': '1',
    'x-api-pool': 'public',
  })
}

function createGutendexBooksFixture(): Record<string, unknown> {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1400,
        title: 'Great Expectations',
        authors: [{ name: 'Dickens, Charles', birth_year: 1812, death_year: 1870 }],
        translators: [],
        summaries: ['A coming-of-age novel.'],
        subjects: ['Bildungsroman'],
        bookshelves: [],
        languages: ['en'],
        copyright: false,
        media_type: 'Text',
        formats: { 'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/1400/1400-0.txt' },
        download_count: 12345,
      },
    ],
  }
}

function createGutendexBookFixture(): Record<string, unknown> {
  return {
    id: 1342,
    title: 'Pride and Prejudice',
    authors: [{ name: 'Austen, Jane', birth_year: 1775, death_year: 1817 }],
    translators: [],
    summaries: ['A novel about manners and first impressions.'],
    subjects: ['Courtship -- Fiction'],
    bookshelves: [],
    languages: ['en'],
    copyright: false,
    media_type: 'Text',
    formats: { 'text/plain; charset=us-ascii': 'https://www.gutenberg.org/files/1342/1342-0.txt' },
    download_count: 54321,
  }
}

function createOpenLibrarySearchFixture(): Record<string, unknown> {
  return {
    numFound: 1,
    start: 0,
    numFoundExact: true,
    docs: [
      {
        key: '/works/OL66554W',
        title: 'Pride and Prejudice',
        author_name: ['Jane Austen'],
        first_publish_year: 1813,
        language: ['eng'],
        edition_count: 4038,
        cover_i: 14348537,
        ebook_access: 'public',
        ia: ['prideprejudice00aust'],
        has_fulltext: true,
      },
    ],
  }
}

function createOpenLibraryWorkFixture(): Record<string, unknown> {
  return {
    key: '/works/OL66554W',
    title: 'Pride and Prejudice',
    description: 'A novel about manners and first impressions.',
    subjects: ['Courtship', 'Sisters'],
    first_publish_date: '1813',
    authors: [{ author: { key: '/authors/OL21594A' } }],
    latest_revision: 117,
    revision: 117,
  }
}

function createPoetryDbFixture(): Array<Record<string, unknown>> {
  return [
    {
      title: 'Ozymandias',
      author: 'Percy Bysshe Shelley',
      linecount: '14',
      lines: ['I met a traveller from an antique land', 'Who said: Two vast and trunkless legs of stone'],
    },
  ]
}

function createQuranCloudAyahFixture(): Record<string, unknown> {
  return {
    number: 262,
    text: 'God - there is no deity save Him.',
    numberInSurah: 255,
    juz: 3,
    page: 42,
    surah: {
      number: 2,
      name: 'سُورَةُ البَقَرَة',
      englishName: 'Al-Baqara',
      englishNameTranslation: 'The Cow',
      numberOfAyahs: 286,
      revelationType: 'Medinan',
    },
    edition: { identifier: 'en.asad', language: 'en', englishName: 'Asad' },
  }
}

function createQuranCloudSurahFixture(): Record<string, unknown> {
  return {
    number: 1,
    name: 'سُورَةُ ٱلْفَاتِحَةِ',
    englishName: 'Al-Faatiha',
    englishNameTranslation: 'The Opening',
    numberOfAyahs: 7,
    revelationType: 'Meccan',
    edition: { identifier: 'en.asad', language: 'en', englishName: 'Asad' },
    ayahs: [
      { number: 1, text: 'In the name of God.', numberInSurah: 1, juz: 1, page: 1 },
      { number: 2, text: 'All praise is due to God alone.', numberInSurah: 2, juz: 1, page: 1 },
    ],
  }
}

function createQuranApiVerseFixture(): Record<string, unknown> {
  return { chapter: 4, verse: 157, text: 'And they did not kill him, nor did they crucify him.' }
}

function createQuranApiChapterFixture(): Record<string, unknown> {
  return {
    chapter: [
      { chapter: 1, verse: 1, text: 'In the name of Allah.' },
      { chapter: 1, verse: 2, text: 'All praise is due to Allah.' },
    ],
  }
}

function createWolneLekturyBooksFixture(): Array<Record<string, unknown>> {
  return [
    {
      title: 'Studnia i wahadło',
      author: 'Edgar Allan Poe',
      epoch: 'Romantyzm',
      genre: 'Opowiadanie',
      kind: 'Epika',
      href: 'https://wolnelektury.pl/api/books/studnia-i-wahadlo/',
      url: 'https://wolnelektury.pl/katalog/lektura/studnia-i-wahadlo/',
      cover: 'book/cover/studnia-i-wahadlo.jpg',
      audio_length: null,
    },
  ]
}

function createWolneLekturyBookFixture(): Record<string, unknown> {
  return {
    title: 'Studnia i wahadło',
    authors: [{ name: 'Edgar Allan Poe', slug: 'edgar-allan-poe' }],
    epochs: [{ name: 'Romantyzm', slug: 'romantyzm' }],
    genres: [{ name: 'Opowiadanie', slug: 'opowiadanie' }],
    kinds: [{ name: 'Epika', slug: 'epika' }],
    url: 'https://wolnelektury.pl/katalog/lektura/studnia-i-wahadlo/',
    txt: 'https://wolnelektury.pl/media/book/txt/studnia-i-wahadlo.txt',
    pdf: 'https://wolnelektury.pl/media/book/pdf/studnia-i-wahadlo.pdf',
    children: [],
  }
}

function createAgifyFixture(): Record<string, unknown> {
  return { count: 108496, name: 'michael', age: 58, country_id: 'US' }
}

function createGenderizeFixture(): Record<string, unknown> {
  return { count: 62805, name: 'kim', gender: 'female', probability: 0.94, country_id: 'US' }
}

function createDisifyFixture(input: { domain: string; disposable: boolean; free: boolean; whitelist?: boolean | undefined }): Record<string, unknown> {
  return {
    format: true,
    domain: input.domain,
    disposable: input.disposable,
    dns: true,
    confidence: input.disposable ? 100 : 0,
    signals: input.disposable ? ['blacklist_exact'] : [],
    domain_info: {
      tld: input.domain.split('.').at(-1),
      is_subdomain: false,
      parent_domain: null,
    },
    mx_info: ['mx.example.com'],
    role: false,
    free: input.free,
    ...(input.whitelist !== undefined ? { whitelist: input.whitelist } : {}),
  }
}

function createUserCheckEmailFixture(): Record<string, unknown> {
  return {
    status: 200,
    email: 'test@example.com',
    normalized_email: 'test@example.com',
    domain: 'example.com',
    domain_age_in_days: 11220,
    mx: false,
    mx_records: [],
    mx_providers: [],
    disposable: false,
    public_domain: false,
    relay_domain: false,
    alias: false,
    role_account: true,
    spam: false,
    did_you_mean: null,
  }
}

function createEnergiRightNowFixture(): Record<string, unknown> {
  return {
    total: 15,
    filters: '',
    limit: 5,
    dataset: 'PowerSystemRightNow',
    records: [
      {
        Minutes1UTC: '2026-05-03T19:15:00',
        Minutes1DK: '2026-05-03T21:15:00',
        CO2Emission: 114.37,
        ProductionGe100MW: 708.59,
        ProductionLt100MW: 467.9,
        SolarPower: 7.23,
        OffshoreWindPower: 374.96,
        OnshoreWindPower: 154.3,
        Exchange_Sum: 2310.19,
      },
    ],
  }
}

function createEnergiElspotFixture(): Record<string, unknown> {
  return {
    total: 230124,
    filters: '{"PriceArea":["DK1"]}',
    sort: 'HourUTC desc',
    limit: 5,
    dataset: 'Elspotprices',
    records: [
      {
        HourUTC: '2025-09-30T21:00:00',
        HourDK: '2025-09-30T23:00:00',
        PriceArea: 'DK1',
        SpotPriceDKK: 690.700059,
        SpotPriceEUR: 92.54,
      },
    ],
  }
}

function createApisGuruListFixture(): Record<string, unknown> {
  return {
    'example.com': {
      preferred: 'v1',
      versions: {
        v1: {
          updated: '2026-05-01T00:00:00.000Z',
          openapiVer: '3.0.0',
          swaggerUrl: 'https://api.apis.guru/v2/specs/example.com/v1/swagger.json',
          info: {
            title: 'Example API',
            description: 'Example OpenAPI directory entry',
            'x-providerName': 'example.com',
            'x-apisguru-categories': ['developer_tools'],
          },
        },
      },
    },
  }
}

function createCdnjsSearchFixture(): Record<string, unknown> {
  return {
    results: [
      {
        name: 'jquery',
        latest: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
        version: '3.7.1',
        filename: 'jquery.min.js',
        description: 'JavaScript library for DOM operations',
        keywords: ['jquery', 'library'],
        license: 'MIT',
        github: { user: 'jquery', repo: 'jquery', stargazers_count: 59543, forks: 20557, subscribers_count: 3151 },
        repository: { type: 'git', url: 'https://github.com/jquery/jquery.git' },
      },
    ],
    total: 1,
    available: 6169,
  }
}

function createCdnjsLibraryFixture(): Record<string, unknown> {
  return {
    name: 'jquery',
    latest: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
    version: '3.7.1',
    filename: 'jquery.min.js',
    description: 'JavaScript library for DOM operations',
    keywords: ['jquery', 'library'],
    license: 'MIT',
    github: { user: 'jquery', repo: 'jquery', stargazers_count: 59543, forks: 20557, subscribers_count: 3151 },
    repository: { type: 'git', url: 'https://github.com/jquery/jquery.git' },
    assets: [
      {
        version: '3.7.1',
        files: ['jquery.js', 'jquery.min.js'],
        rawFiles: ['jquery.js', 'jquery.min.js'],
        sri: { 'jquery.min.js': 'sha512-min' },
      },
    ],
  }
}

function createCloudflareTraceFixture(): string {
  return [
    'fl=119f149',
    'h=cloudflare.com',
    'ip=203.0.113.10',
    'ts=1777820156.179',
    'visit_scheme=https',
    'uag=public-apis-tui test',
    'colo=PDX',
    'sliver=none',
    'http=http/2',
    'loc=US',
    'tls=TLSv1.3',
    'sni=plaintext',
    'warp=off',
    'gateway=off',
    'rbi=off',
    'kex=X25519',
  ].join('\n')
}

function createDigitalOceanStatusSummaryFixture(): Record<string, unknown> {
  return {
    page: createDigitalOceanStatusPageFixture(),
    status: { indicator: 'none', description: 'All Systems Operational' },
    components: [
      createDigitalOceanStatusComponentFixture(),
      {
        id: 'component-spaces',
        name: 'Spaces',
        status: 'operational',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2026-05-02T14:23:45.298Z',
        position: 2,
        group_id: null,
        page_id: 'page-digitalocean',
        group: false,
        only_show_if_degraded: false,
        description: null,
        components: [],
      },
    ],
    incidents: [createDigitalOceanStatusIncidentFixture()],
    scheduled_maintenances: [createDigitalOceanStatusMaintenanceFixture()],
  }
}

function createDigitalOceanStatusIncidentsFixture(): Record<string, unknown> {
  return {
    page: createDigitalOceanStatusPageFixture(),
    incidents: [createDigitalOceanStatusIncidentFixture()],
  }
}

function createDigitalOceanStatusMaintenancesFixture(): Record<string, unknown> {
  return {
    page: createDigitalOceanStatusPageFixture(),
    scheduled_maintenances: [createDigitalOceanStatusMaintenanceFixture()],
  }
}

function createDigitalOceanStatusPageFixture(): Record<string, unknown> {
  return {
    id: 'page-digitalocean',
    name: 'DigitalOcean',
    url: 'https://status.digitalocean.com',
    time_zone: 'Etc/UTC',
    updated_at: '2026-05-02T14:23:45.298Z',
  }
}

function createDigitalOceanStatusComponentFixture(): Record<string, unknown> {
  return {
    id: 'component-api',
    name: 'API',
    status: 'operational',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2026-05-02T14:23:45.298Z',
    position: 1,
    group_id: null,
    page_id: 'page-digitalocean',
    group: false,
    only_show_if_degraded: false,
    description: null,
    components: [],
  }
}

function createDigitalOceanStatusIncidentFixture(): Record<string, unknown> {
  return {
    id: 'incident-api-latency',
    name: 'API latency',
    status: 'investigating',
    impact: 'minor',
    shortlink: 'https://stspg.io/example',
    created_at: '2026-05-02T14:00:00.000Z',
    updated_at: '2026-05-02T14:10:00.000Z',
    monitoring_at: null,
    resolved_at: null,
    started_at: '2026-05-02T13:59:00.000Z',
    scheduled_for: null,
    scheduled_until: null,
    incident_updates: [
      {
        id: 'incident-update-api-latency',
        status: 'investigating',
        body: 'We are investigating increased API latency.',
        created_at: '2026-05-02T14:05:00.000Z',
        updated_at: '2026-05-02T14:05:00.000Z',
        display_at: '2026-05-02T14:05:00.000Z',
        affected_components: [
          { code: 'component-api', name: 'API', old_status: 'operational', new_status: 'degraded_performance' },
        ],
      },
    ],
    components: [createDigitalOceanStatusComponentFixture()],
  }
}

function createDigitalOceanStatusMaintenanceFixture(): Record<string, unknown> {
  return {
    id: 'maintenance-core',
    name: 'Core Maintenance',
    status: 'scheduled',
    impact: 'maintenance',
    shortlink: 'https://stspg.io/maintenance',
    created_at: '2026-05-01T14:00:00.000Z',
    updated_at: '2026-05-02T14:10:00.000Z',
    monitoring_at: null,
    resolved_at: null,
    started_at: null,
    scheduled_for: '2026-05-04T13:00:00.000Z',
    scheduled_until: '2026-05-04T14:00:00.000Z',
    incident_updates: [
      {
        id: 'maintenance-update-core',
        status: 'scheduled',
        body: 'Core platform maintenance is scheduled.',
        created_at: '2026-05-01T14:05:00.000Z',
        updated_at: '2026-05-01T14:05:00.000Z',
        display_at: '2026-05-01T14:05:00.000Z',
        affected_components: [],
      },
    ],
    components: [createDigitalOceanStatusComponentFixture()],
  }
}

function createCensusGovCatalogFixture(): Record<string, unknown> {
  return {
    dataset: [
      {
        '@id': 'https://api.census.gov/data/2024/acs/acs5/profile.json',
        title: '2024 ACS 5-Year Data Profiles',
        description: 'ACS demographic and economic profile tables.',
        c_vintage: 2024,
        c_dataset: ['acs', 'acs5', 'profile'],
        c_variablesLink: 'https://api.census.gov/data/2024/acs/acs5/profile/variables.json',
        c_examplesLink: 'https://api.census.gov/data/2024/acs/acs5/profile/examples.json',
        c_documentationLink: 'https://www.census.gov/data/developers/data-sets/acs-5year.html',
      },
    ],
  }
}

function createCensusGovAcsProfileFixture(): unknown[] {
  return [
    ['NAME', 'DP05_0001E', 'DP03_0062E', 'state'],
    ['California', '39287377', '99122', '06'],
  ]
}

function createColoradoDataCatalogFixture(): Record<string, unknown> {
  return {
    results: [
      {
        resource: {
          id: '4ykn-tg5h',
          name: 'Business Entities in Colorado',
          attribution: 'Department of State',
          category: 'Business',
          description: 'Business entities registered with the Colorado Department of State.',
          updatedAt: '2026-05-03T19:17:49.000Z',
        },
      },
    ],
  }
}

function createColoradoBusinessEntitiesFixture(): Array<Record<string, unknown>> {
  return [
    {
      entityid: '20251665680',
      entityname: 'KYLDERON MIST VALLEY LLC',
      entitystatus: 'Good Standing',
      entitytype: 'DLLC',
      jurisdictonofformation: 'CO',
      entityformdate: '2025-06-16T00:00:00.000',
      principalcity: 'Delta',
      principalstate: 'CO',
      principalzipcode: '81416',
      agentfirstname: 'KEQIANG',
      agentlastname: 'DENG',
    },
  ]
}
function createDcOpenDataCatalogFixture(): Record<string, unknown> {
  return {
    type: 'FeatureCollection',
    numberMatched: 1,
    numberReturned: 1,
    features: [
      {
        id: '85bf98d3915f412c8a4de706f2d13513',
        type: 'Feature',
        properties: {
          title: 'Basic Business Licenses',
          type: 'Feature Service',
          owner: 'DCGISopendata',
          snippet: 'Business license locations and related metadata.',
          categories: ['/Categories/Business Economy/Licensing'],
          tags: ['business', 'license'],
          modified: 1777628880000,
          url: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/FEEDS/DCRA/FeatureServer/0',
        },
      },
    ],
  }
}

function createDcOpenDataBusinessLicensesFixture(): Record<string, unknown> {
  return {
    objectIdFieldName: 'OBJECTID',
    fields: [],
    features: [
      {
        attributes: {
          OBJECTID: 398486255,
          ENTITY_NAME: 'SK+I URBAN INC.',
          LICENSE_CATEGORY_TEXT: 'General Business',
          LICENSESTATUS: 'Active',
          LICENSE_START_DATE: 1733029200000,
          LICENSE_END_DATE: 1796014800000,
          SITE_ADDRESS: '4750 41ST ST NW',
          CITY: 'WASHINGTON',
          STATE: 'DC',
          ZIP: '20016',
          WARD: '3',
          LATITUDE: 38.95180534,
          LONGITUDE: -77.08068206,
        },
      },
    ],
  }
}

function createNycOpenDataCatalogFixture(): Record<string, unknown> {
  return {
    results: [
      {
        resource: {
          id: 'erm2-nwe9',
          name: '311 Service Requests from 2020 to Present',
          attribution: '311',
          category: 'Social Services',
          description: '311 responds to thousands of requests.',
          updatedAt: '2026-05-03T19:17:49.000Z',
        },
      },
    ],
  }
}

function createNycOpenData311Fixture(): Array<Record<string, unknown>> {
  return [
    {
      unique_key: '68855202',
      created_date: '2026-05-02T02:06:41.000',
      agency: 'NYPD',
      complaint_type: 'Illegal Parking',
      borough: 'BROOKLYN',
      status: 'In Progress',
    },
  ]
}

function createHebcalConvertFixture(): Record<string, unknown> {
  return {
    gy: 2026,
    gm: 5,
    gd: 3,
    hy: 5786,
    hm: 'Iyyar',
    hd: 16,
    hebrew: 'ט״ז בְּאִיָיר תשפ״ו',
    events: ['Pesach Sheni'],
  }
}

function createHebcalCalendarFixture(): Record<string, unknown> {
  return {
    title: 'Hebcal Diaspora May 2026',
    items: [
      {
        title: 'Pesach Sheni',
        date: '2026-05-01',
        category: 'holiday',
        subcat: 'minor',
        hebrew: 'פסח שני',
        link: 'https://www.hebcal.com/holidays/pesach-sheni-2026',
      },
    ],
  }
}

function createNagerDateCountriesFixture(): Array<Record<string, unknown>> {
  return [
    { countryCode: 'US', name: 'United States' },
    { countryCode: 'CA', name: 'Canada' },
  ]
}

function createNagerDateHolidaysFixture(): Array<Record<string, unknown>> {
  return [
    {
      date: '2026-01-01',
      localName: "New Year's Day",
      name: "New Year's Day",
      countryCode: 'US',
      fixed: false,
      global: true,
      counties: null,
      launchYear: null,
      types: ['Public', 'Bank'],
    },
  ]
}

function createNominatimPlaceFixture(): Record<string, unknown> {
  return {
    place_id: 145549253,
    licence: 'Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright',
    osm_type: 'relation',
    osm_id: 62422,
    lat: '52.5173885',
    lon: '13.3951309',
    category: 'boundary',
    type: 'administrative',
    place_rank: 8,
    importance: 0.8522,
    addresstype: 'city',
    name: 'Berlin',
    display_name: 'Berlin, Deutschland',
    address: { city: 'Berlin', country: 'Deutschland', country_code: 'de' },
    boundingbox: ['52.3382448', '52.6755087', '13.0883450', '13.7611609'],
  }
}

function createOpenTopoDataLookupFixture(): Record<string, unknown> {
  return {
    results: [
      {
        dataset: 'srtm90m',
        elevation: 1603,
        location: { lat: 39.7471, lng: -104.9963 },
      },
    ],
    status: 'OK',
  }
}

function createPinballMapRegionsFixture(): Record<string, unknown> {
  return {
    regions: [
      { id: 1, name: 'portland', full_name: 'Portland, Oregon', lat: '45.52341', lon: '-122.67561', state: 'Oregon', effective_radius: 40.0 },
      { id: 2, name: 'chicago', full_name: 'Chicago', lat: '41.8781', lon: '-87.6298', state: 'Illinois', effective_radius: 35.0 },
    ],
  }
}

function createPinballMapLocationsFixture(): Record<string, unknown> {
  return {
    locations: [
      {
        id: 874,
        name: 'Ground Kontrol Classic Arcade',
        street: '115 NW 5th Ave',
        city: 'Portland',
        state: 'OR',
        zip: '97209',
        lat: '45.5240826',
        lon: '-122.675826',
        country: 'US',
        machine_count: 45,
        is_stern_army: true,
        ic_active: true,
        last_updated_by_username: 'gkrepairs',
      },
    ],
  }
}

function createPostalCodesSearchFixture(): Array<Record<string, unknown>> {
  return [
    {
      type: 'Postal Code',
      text: 'Beverly Hills (90210)',
      sub: 'United States',
      url: '/postal-codes/united-states/code/90210',
    },
  ]
}

function createPostcodeDataNlLookupFixture(): Record<string, unknown> {
  return {
    status: 'ok',
    details: [
      {
        street: 'Stationsstraat',
        city: 'Hilversum',
        municipality: 'Hilversum',
        province: 'Noord-Holland',
        postcode: '1211 EP',
        pnum: '1211',
        pchar: 'EP',
        rd_x: '140707.47566666666666666667',
        rd_y: '471005.06166666666666666667',
        lat: '52.2269378842251',
        lon: '5.1780191356884',
      },
    ],
  }
}

function createPostcodesIoPostcodeFixture(): Record<string, unknown> {
  return {
    postcode: 'SW1A 2AA',
    quality: 1,
    eastings: 530047,
    northings: 179951,
    country: 'England',
    longitude: -0.12767,
    latitude: 51.503541,
    region: 'London',
    admin_district: 'Westminster',
    admin_county: null,
    admin_ward: "St James's",
    parliamentary_constituency: 'Cities of London and Westminster',
    outcode: 'SW1A',
    incode: '2AA',
  }
}

function createRestCountriesCountryFixture(): Record<string, unknown> {
  return {
    flags: { png: 'https://flagcdn.com/w320/de.png', svg: 'https://flagcdn.com/de.svg', alt: 'Flag of Germany' },
    name: { common: 'Germany', official: 'Federal Republic of Germany' },
    currencies: { EUR: { name: 'euro', symbol: '€' } },
    languages: { deu: 'German' },
    cca2: 'DE',
    cca3: 'DEU',
    capital: ['Berlin'],
    region: 'Europe',
    subregion: 'Western Europe',
    area: 357114,
    population: 83491249,
  }
}

function createNamedaysDateFixture(): Record<string, unknown> {
  return {
    success: true,
    message: 'Namedays for 05-03',
    data: {
      us: 'Joletta, Trey, Troy, Viola, Violet',
      at: 'Jakob, Philipp, Viola',
    },
  }
}

function createNamedaysNameFixture(): Record<string, unknown> {
  return {
    success: true,
    message: 'Namedays for name John',
    data: [
      { country: 'us', 0: { day: 24, month: 6, name: 'Hans, John, Johnny' } },
    ],
  }
}

function createUkBankHolidaysFixture(): Record<string, unknown> {
  return {
    'england-and-wales': {
      division: 'england-and-wales',
      events: [
        { title: 'New Year’s Day', date: '2026-01-01', notes: '', bunting: true },
      ],
    },
    scotland: {
      division: 'scotland',
      events: [
        { title: 'New Year’s Day', date: '2026-01-01', notes: '', bunting: true },
      ],
    },
    'northern-ireland': {
      division: 'northern-ireland',
      events: [
        { title: 'New Year’s Day', date: '2026-01-01', notes: '', bunting: true },
      ],
    },
  }
}

function createUkCarbonIntensityFixture(): Record<string, unknown> {
  return {
    data: [
      {
        from: '2026-05-03T19:00Z',
        to: '2026-05-03T19:30Z',
        intensity: {
          forecast: 212,
          actual: 204,
          index: 'high',
        },
      },
    ],
  }
}

function createUkCarbonGenerationFixture(): Record<string, unknown> {
  return {
    data: {
      from: '2026-05-03T19:00Z',
      to: '2026-05-03T19:30Z',
      generationmix: [
        { fuel: 'biomass', perc: 9 },
        { fuel: 'coal', perc: 0 },
        { fuel: 'imports', perc: 17.6 },
        { fuel: 'gas', perc: 46.1 },
        { fuel: 'nuclear', perc: 17.8 },
        { fuel: 'solar', perc: 1.3 },
        { fuel: 'wind', perc: 8.3 },
      ],
    },
  }
}

function createWebsiteCarbonDataFixture(): Record<string, unknown> {
  return {
    bytes: 1_000_000,
    green: true,
    gco2e: 0.08510206826031208,
    rating: 'B',
    statistics: {
      adjustedBytes: 755000,
      energy: 0.00021094456315040588,
      co2: {
        grid: { grams: 0.1042066141963005, litres: 0.05795971881598233 },
        renewable: { grams: 0.08510206826031208, litres: 0.04733377036638557 },
      },
    },
    cleanerThan: 0.8,
  }
}

function createSecEdgarSubmissionsFixture(): Record<string, unknown> {
  return {
    cik: '0000320193',
    name: 'Apple Inc.',
    tickers: ['AAPL'],
    exchanges: ['Nasdaq'],
    filings: {
      recent: {
        accessionNumber: ['0000320193-26-000013', '0000320193-26-000007'],
        filingDate: ['2026-05-01', '2026-02-06'],
        reportDate: ['2026-03-28', '2025-12-27'],
        form: ['10-Q', '10-Q'],
        primaryDocument: ['aapl-20260328.htm', 'aapl-20251227.htm'],
        primaryDocDescription: ['10-Q', '10-Q'],
      },
    },
  }
}

function createSecEdgarConceptFixture(): Record<string, unknown> {
  return {
    cik: '0000320193',
    taxonomy: 'us-gaap',
    tag: 'AccountsPayableCurrent',
    label: 'Accounts Payable, Current',
    entityName: 'Apple Inc.',
    units: {
      USD: [
        { end: '2025-12-27', val: 62985000000, accn: '0000320193-26-000007', fy: 2026, fp: 'Q1', form: '10-Q', filed: '2026-02-06' },
        { end: '2026-03-28', val: 57349000000, accn: '0000320193-26-000013', fy: 2026, fp: 'Q2', form: '10-Q', filed: '2026-05-01' },
      ],
    },
  }
}

function createBnmOprFixture(): Record<string, unknown> {
  return {
    data: { year: 2026, date: '2026-03-05', change_in_opr: 0, new_opr_level: 2.75 },
    meta: { last_updated: '2026-03-05 15:02:15', total_result: 1 },
  }
}

function createBrazilCentralBankDatasetsFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 1,
      results: [
        {
          id: '2e5311b0-a4b5-4b03-a5ce-6db362cb719f',
          name: 'estatisticas-selic-operacoes',
          title: 'Estatísticas Selic',
          notes: 'Informações e estatísticas de operações registradas no Sistema Especial de Liquidação e de Custódia.',
          metadata_modified: '2026-04-30T20:03:02.002192',
          num_resources: 12,
          organization: { title: 'Banco Central do Brasil' },
          tags: [{ name: 'selic' }],
        },
      ],
    },
  }
}

function createBrazilCentralBankSgsFixture(): unknown[] {
  return [
    { data: '30/04/2026', valor: '0.053400' },
    { data: '29/04/2026', valor: '0.054266' },
  ]
}

function createReceitaWsFixture(): Record<string, unknown> {
  return {
    status: 'OK',
    abertura: '31/01/1986',
    situacao: 'ATIVA',
    tipo: 'MATRIZ',
    nome: 'GLOBO COMUNICACAO E PARTICIPACOES S/A',
    fantasia: 'GLOBOPLAY',
    porte: 'DEMAIS',
    natureza_juridica: '205-4 - Sociedade Anônima Fechada',
    atividade_principal: [{ code: '60.21-7-00', text: 'Atividades de televisão aberta' }],
    atividades_secundarias: [{ code: '62.04-0-00', text: 'Consultoria em tecnologia da informação' }],
    municipio: 'RIO DE JANEIRO',
    uf: 'RJ',
    cep: '22.460-901',
    cnpj: '27.865.757/0001-02',
  }
}

function createBnmExchangeRatesFixture(): Record<string, unknown> {
  return {
    data: [
      { currency_code: 'CHF', unit: 1, rate: { date: '2026-04-30', buying_rate: 5.0253, selling_rate: 5.0329, middle_rate: 5.0291 } },
      { currency_code: 'USD', unit: 1, rate: { date: '2026-04-30', buying_rate: 3.945, selling_rate: 3.97, middle_rate: null } },
    ],
    meta: { quote: 'rm', session: '1130', last_updated: '2026-04-30 23:01:23', total_result: 27 },
  }
}

function createBnmKijangEmasFixture(): Record<string, unknown> {
  return {
    data: {
      effective_date: '2026-04-30',
      one_oz: { buying: 18396, selling: 19149 },
      half_oz: { buying: 9198, selling: 9755 },
      quarter_oz: { buying: 4599, selling: 4968 },
    },
    meta: { last_updated: '2026-04-30 01:00:04', total_result: 1 },
  }
}

function createEpaUvHourlyFixture(): Array<Record<string, unknown>> {
  return [
    { ORDER: 1, ZIP: '20050', CITY: 'Washington', STATE: 'DC', DATE_TIME: 'May/04/2026 08 AM', UV_VALUE: 0 },
    { ORDER: 2, ZIP: '20050', CITY: 'Washington', STATE: 'DC', DATE_TIME: 'May/04/2026 09 AM', UV_VALUE: 2 },
  ]
}

function createEpaUvDailyFixture(): Array<Record<string, unknown>> {
  return [
    { ZIP_CODE: '20050', CITY: 'Washington', STATE: 'DC', UV_INDEX: '7', UV_ALERT: '0', DATE: 'May/04/2026' },
  ]
}

function createIndianPincodeSearchFixture(): Record<string, unknown> {
  return {
    results: [
      {
        type: 'district',
        districtName: 'Mumbai',
        districtSlug: 'mumbai',
        stateName: 'Maharashtra',
        stateSlug: 'maharashtra',
        pincodesCount: 111,
      },
      {
        type: 'pincode',
        code: '400001',
        postOfficeName: 'Mumbai GPO',
        districtName: 'Mumbai',
        districtSlug: 'mumbai',
        stateName: 'Maharashtra',
        stateSlug: 'maharashtra',
        area: '',
        officeType: 'HO',
      },
    ],
  }
}

function createPostalPinCodeLookupFixture(): Array<Record<string, unknown>> {
  return [
    {
      Message: 'Number of Post office(s) found:2',
      Status: 'Success',
      PostOffice: [
        {
          Name: 'Connaught Place',
          BranchType: 'Sub Post Office',
          DeliveryStatus: 'Non-Delivery',
          Circle: 'Delhi',
          District: 'Central Delhi',
          Division: 'New Delhi Central',
          Region: 'Delhi',
          State: 'Delhi',
          Country: 'India',
          Pincode: '110001',
        },
        {
          Name: 'New Delhi',
          BranchType: 'Head Post Office',
          DeliveryStatus: 'Delivery',
          Circle: 'Delhi',
          District: 'New Delhi',
          Division: 'New Delhi GPO',
          Region: 'Delhi',
          State: 'Delhi',
          Country: 'India',
          Pincode: '110001',
        },
      ],
    },
  ]
}

function createIstanbulOpenDataPackageSearchFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      count: 64,
      results: [
        {
          id: '2d6ec648-cdc2-49cd-991e-13a2dd540ef4',
          name: 'metro-hatlari-enerji-tuketimi',
          title: 'Metro Lines Energy Consumption',
          notes: 'Metro energy consumption dataset.',
          organization: { title: 'Metro Istanbul' },
          resources: [
            {
              id: '32c8813b-544e-4f6e-887d-5bb0835411d1',
              name: 'Metro Hatları Enerji Tüketimi',
              format: 'XLSX',
              datastore_active: true,
              url: 'https://data.ibb.gov.tr/dataset/example/download.xlsx',
            },
          ],
        },
      ],
    },
  }
}

function createIstanbulOpenDataDatastoreFixture(): Record<string, unknown> {
  return {
    success: true,
    result: {
      resource_id: '32c8813b-544e-4f6e-887d-5bb0835411d1',
      total: 12,
      fields: [
        { id: '_id' },
        { id: 'Hat' },
        { id: "100 KM'de Enerji Tuketimi (kWh)" },
      ],
      records: [
        {
          _id: 1,
          Hat: 'M1',
          "100 KM'de Enerji Tuketimi (kWh)": '1008.0',
          '1 Gunde Enerji Tuketimi (kWh)': '97503.0',
        },
      ],
    },
  }
}

function createFoodStandardsAgencyAuthoritiesFixture(): Record<string, unknown> {
  return {
    authorities: [
      {
        LocalAuthorityId: 197,
        LocalAuthorityIdCode: '760',
        Name: 'Aberdeen City',
        EstablishmentCount: 2261,
        SchemeType: 2,
      },
    ],
    meta: {
      itemCount: 1,
      returncode: 'OK',
    },
    links: [],
  }
}

function createFoodStandardsAgencyEstablishmentsFixture(): Record<string, unknown> {
  return {
    establishments: [
      {
        FHRSID: 1830226,
        BusinessName: 'Coffey Coffee',
        BusinessType: 'Mobile caterer',
        LocalAuthorityName: 'Darlington',
        LocalAuthorityCode: '874',
        RatingValue: '5',
        RatingDate: '2025-05-06T00:00:00',
        PostCode: 'DL2',
        SchemeType: 'FHRS',
        geocode: { longitude: null, latitude: null },
        scores: { Hygiene: 0, Structural: 0, ConfidenceInManagement: 0 },
      },
    ],
    meta: {
      dataSource: 'ElasticSearch',
      extractDate: '2026-05-04T03:44:10.3359624+01:00',
      itemCount: 1,
      returncode: 'OK',
      totalCount: 11613,
      totalPages: 12,
      pageSize: 5000,
      pageNumber: 1,
    },
    links: [],
  }
}

function createRainViewerMapsFixture(): Record<string, unknown> {
  return {
    version: '2.0',
    generated: 1777920330,
    host: 'https://tilecache.rainviewer.com',
    radar: {
      past: [
        { time: 1777912800, path: '/v2/radar/a13ac739c26d' },
        { time: 1777920000, path: '/v2/radar/5cb0d794f2da' },
      ],
      nowcast: [],
    },
    satellite: { infrared: [] },
  }
}

function createGbifSpeciesFixture(): Record<string, unknown> {
  return {
    count: 1,
    limit: 2,
    offset: 0,
    endOfRecords: false,
    results: [
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
  }
}

function createGbifOccurrenceFixture(): Record<string, unknown> {
  return {
    count: 1,
    limit: 2,
    offset: 0,
    endOfRecords: false,
    results: [
      {
        key: 45123456,
        gbifID: '45123456',
        scientificName: 'Quercus robur L.',
        countryCode: 'GB',
        decimalLatitude: 51.5,
        decimalLongitude: -0.12,
        eventDate: '2026-04-01',
        basisOfRecord: 'HUMAN_OBSERVATION',
        datasetTitle: 'Example occurrence dataset',
        license: 'CC_BY_4_0',
        issues: ['GEODETIC_DATUM_ASSUMED_WGS84'],
        media: [{ identifier: 'https://example.com/image.jpg' }],
      },
    ],
  }
}

function createGurbaniNowSearchFixture(): Record<string, unknown> {
  return {
    inputvalues: { searchvalue: 'DDrgj', searchtype: '1', source: '1' },
    count: 1,
    shabads: [
      {
        shabad: {
          id: 'YLSG',
          shabadid: '02L',
          gurmukhi: {
            unicode: 'ਧੰਨੁ ਧੰਨੁ ਰਾਮਦਾਸ ਗੁਰੁ ਜਿਨਿ ਸਿਰਿਆ ਤਿਨੈ ਸਵਾਰਿਆ ॥',
          },
          translation: {
            english: { default: 'Blessed, blessed is Guru Raam Daas.' },
          },
          source: { id: 1, english: 'Sri Guru Granth Sahib Ji' },
          writer: { id: 35, english: 'Satta and Balwand' },
          raag: { id: 22, english: 'Raag Raamkalee' },
          pageno: 968,
          lineno: 9,
        },
      },
    ],
    error: false,
  }
}

function createGurbaniNowBanisFixture(): Array<Record<string, unknown>> {
  return [
    {
      id: 1,
      akhar: 'jpu jI swihb',
      unicode: 'ਜਪੁ ਜੀ ਸਾਹਿਬ',
      english: 'Jap Ji Sahib',
    },
  ]
}

function createGurbaniNowBaniFixture(): Record<string, unknown> {
  return {
    baniinfo: {
      id: 1,
      english: 'Jap Ji Sahib',
      count: 2,
      source: { id: 1, english: 'Sri Guru Granth Sahib Ji' },
      writer: { id: 1, english: 'Guru Nanak Dev Ji' },
      raag: { id: 1, english: 'Jap' },
    },
    bani: [
      {
        line: {
          id: '0NVY',
          gurmukhi: { unicode: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ॥' },
          translation: { english: { default: 'One Universal Creator God.' } },
          linenum: 1,
        },
      },
      {
        line: {
          id: 'RBP6',
          gurmukhi: { unicode: '॥ ਜਪੁ ॥' },
          translation: { english: { default: 'Chant And Meditate:' } },
          linenum: 2,
        },
      },
    ],
  }
}

function createIdigbioRecordsFixture(): Record<string, unknown> {
  return {
    itemCount: 1,
    lastModified: '2026-04-23T17:36:48.691Z',
    items: [
      {
        uuid: 'record-uuid',
        type: 'records',
        etag: 'etag-record',
        data: {
          'dwc:scientificName': 'Quercus robur L.',
          'dwc:institutionCode': 'ALA',
          'dwc:collectionCode': 'V',
          'dwc:catalogNumber': '126679',
        },
        indexTerms: {
          scientificname: 'Quercus robur L.',
          family: 'Fagaceae',
          country: 'United States',
          stateprovince: 'California',
          eventdate: '2024-04-01',
          basisofrecord: 'PreservedSpecimen',
          geopoint: { lat: 34.05, lon: -118.24 },
          hasimage: true,
          mediarecords: ['media-uuid'],
        },
      },
    ],
  }
}

function createIdigbioMediaFixture(): Record<string, unknown> {
  return {
    itemCount: 1,
    lastModified: '2026-04-23T17:36:48.691Z',
    items: [
      {
        uuid: 'media-uuid',
        type: 'mediarecords',
        etag: 'etag-media',
        data: {
          'dcterms:title': 'ALA V126679: Quercus robur',
          'dc:type': 'image',
          'dc:format': 'image/jpeg',
          'dcterms:rights': 'CC BY',
          'ac:accessURI': 'https://example.org/media.jpg',
          'ac:attributionLinkURL': 'https://example.org/record',
        },
        indexTerms: {
          mediatype: 'images',
          format: 'image/jpeg',
          rights: 'CC BY',
          recordset: 'recordset-uuid',
          records: ['record-uuid'],
          hasspecimen: true,
        },
      },
    ],
  }
}

function createInspireHepRecordFixture(): Record<string, unknown> {
  return {
    id: '4328',
    created: '1982-01-01T00:00:00+00:00',
    updated: '2023-03-09T12:32:12.611268+00:00',
    links: {
      json: 'https://inspirehep.net/api/literature/4328?format=json',
      citations: 'https://inspirehep.net/api/literature/?q=refersto:recid:4328',
      bibtex: 'https://inspirehep.net/api/literature/4328?format=bibtex',
    },
    metadata: {
      control_number: 4328,
      citation_count: 10459,
      citation_count_without_self_citations: 10441,
      titles: [{ title: 'Partial Symmetries of Weak Interactions' }],
      authors: [{ full_name: 'Glashow, S.L.' }],
      publication_info: [
        {
          year: 1961,
          page_start: '579',
          page_end: '588',
          journal_title: 'Nucl.Phys.',
          journal_volume: '22',
        },
      ],
      dois: [{ value: '10.1016/0029-5582(61)90469-2' }],
      arxiv_eprints: [{ value: 'hep-ph/0000001' }],
      primary_arxiv_category: 'hep-ph',
      inspire_categories: [{ term: 'Phenomenology-HEP' }],
      document_type: ['article'],
      texkeys: ['Glashow:1961tr'],
      abstracts: [
        { value: 'Weak and electromagnetic interactions are examined.' },
      ],
      earliest_date: '1961',
    },
  }
}

function createLectServeSundayFixture(
  date = '2026-05-17',
  lectionary = 'acna',
): Record<string, unknown> {
  return {
    date,
    date_pretty: date === '2026-05-10' ? '10. May 2026' : '17. May 2026',
    day: 'Sunday',
    year: 'A',
    type: 'Sunday',
    lectionary,
    prevSunday: '2026-05-10',
    nextSunday: '2026-05-24',
    services: [
      {
        name: date === '2026-05-10'
          ? 'Sixth Sunday of Easter'
          : 'The Sunday after Ascension Day',
        alt: '',
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

function createIcsdbFixture(): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Paul de Rosanbo//NONSGML icsdb//EN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:UTC',
    'X-WR-CALNAME:US legal holidays',
    'BEGIN:VEVENT',
    'DTSTART;VALUE=DATE:19700101',
    'DTEND;VALUE=DATE:19700102',
    'RRULE:FREQ=YEARLY',
    'UID:new-year',
    "SUMMARY:New Year's Day",
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function responseForRunyankoleBibleRpcUrl(url: URL): Record<string, unknown> {
  if (url.pathname === '/api/books') {
    return {
      count: 2,
      books: [
        { id: 10, short_name: 'Kut', long_name: 'Okutandika' },
        { id: 20, short_name: 'Kur', long_name: 'Okuruga' },
      ],
    }
  }
  if (url.pathname === '/api/chapter') {
    return {
      book_id: 10,
      book_short: 'Kut',
      book_name: 'Okutandika',
      chapter: 1,
      verse_count: 2,
      verses: [
        {
          verse: 1,
          text: "Omu kutandika Ruhanga akahanga eiguru n'ensi.",
        },
        { verse: 2, text: 'Ensi ekaba etari mu buteeka.' },
      ],
    }
  }
  if (url.pathname === '/api/search') {
    return {
      query: String(url.searchParams.get('q') ?? 'Ruhanga'),
      total: 4,
      limit: Number(url.searchParams.get('limit')),
      offset: Number(url.searchParams.get('offset')),
      results: [
        createRunyankoleBibleRpcVerse({ verse: 2, text: 'Ruhanga yaagira ati.' }),
        createRunyankoleBibleRpcVerse({ verse: 3, text: 'Habeho omushana.' }),
      ],
    }
  }
  return createRunyankoleBibleRpcVerse()
}

function createRunyankoleBibleRpcVerse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    book_id: 10,
    book_short: 'Kut',
    book_name: 'Okutandika',
    chapter: 1,
    verse: 1,
    text: "Omu kutandika Ruhanga akahanga eiguru n'ensi.",
    ...overrides,
  }
}

function runyankoleBibleJsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function shareJsonResponse(
  value: unknown,
  contentType = 'application/json',
): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': contentType },
  })
}

function jsonResponse(value: unknown, contentType = 'application/json'): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': contentType },
  })
}

function createBankOfRussiaDailyXml(): string {
  return '<?xml version="1.0" encoding="windows-1251"?><ValCurs Date="05.05.2026" name="Foreign Currency Market"><Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>Доллар США</Name><Value>75,4388</Value><VunitRate>75,4388</VunitRate></Valute><Valute ID="R01239"><NumCode>978</NumCode><CharCode>EUR</CharCode><Nominal>1</Nominal><Name>Евро</Name><Value>88,2651</Value><VunitRate>88,2651</VunitRate></Valute></ValCurs>'
}

function createBankOfRussiaDynamicXml(): string {
  return '<?xml version="1.0" encoding="windows-1251"?><ValCurs ID="R01235" DateRange1="01.05.2026" DateRange2="05.05.2026" name="Foreign Currency Market Dynamic"><Record Date="01.05.2026" Id="R01235"><Nominal>1</Nominal><Value>74,8014</Value><VunitRate>74,8014</VunitRate></Record><Record Date="05.05.2026" Id="R01235"><Nominal>1</Nominal><Value>75,4388</Value><VunitRate>75,4388</VunitRate></Record></ValCurs>'
}

function readProperty(value: unknown, path: string): unknown {
  let current = value
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') {
      return undefined
    }

    if (Array.isArray(current)) {
      const index = Number(part)
      current = Number.isInteger(index) ? current[index] : undefined
      continue
    }

    if (!(part in current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return current
}
