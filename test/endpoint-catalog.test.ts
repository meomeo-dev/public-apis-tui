import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultEndpointCatalog,
  listEndpointCatalog,
  matchEndpointRecord,
  matchesUrlPattern,
  type EndpointCatalog,
} from '../src/infrastructure/network/endpointCatalog.js'

test('endpoint catalog lists configured API endpoint records', () => {
  const catalog = createCatalogFixture()

  assert.deepEqual(listEndpointCatalog(catalog).map(record => record.id), ['docs-search'])
})

test('default endpoint catalog includes public API endpoint records', () => {
  const ids = defaultEndpointCatalog.records.map(record => record.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of [
    'agify-age',
    'berlinopendata-package-search',
    'berlinopendata-package-show',
    'countryis-lookup',
    'geojs-ip-geo',
    'gdanskopendata-package-search',
    'gdanskopendata-package-show',
    'gdyniaopendata-package-search',
    'gdyniaopendata-package-show',
    'helsinkiopendata-package-search',
    'helsinkiopendata-package-show',
    'hellosalut-translate',
    'hongkonggeodata-location-search',
    'icsdb-github-tree',
    'icsdb-raw-build-ics',
    'isdayoff-getdata-day',
    'isdayoff-getdata-range',
    'ibge-states',
    'ibge-municipalities',
    'inspirehep-literature-search',
    'inspirehep-literature-record',
    'iseven-check',
    'isro-catalog-resource',
    'itis-search-scientific-name',
    'itis-full-record',
    'launchlibrary2-upcoming-launches',
    'launchlibrary2-upcoming-events',
    'lectserve-date',
    'lectserve-sunday',
    'minorplanetcenter-mpc-search',
    'nasa-images-search',
    'nasa-images-asset',
    'noctua-skysource-stats',
    'noctua-skysource-name',
    'ipapi-json-lookup',
    'ipgeo-lookup',
    'nominatim-search',
    'nominatim-reverse',
    'opentopodata-lookup',
    'pinballmap-regions',
    'pinballmap-locations',
    'rigveda-book',
    'rigveda-god',
    'rigveda-godcategory-by-poetcategory',
    'vedicsociety-words',
    'vedicsociety-descriptions',
    'vedicsociety-categories',
    'wizardworld-catalog-resource',
    'worldbank-countries',
    'worldbank-country-indicator',
    'worldbank-indicator-metadata',
    'runyankolebible-books',
    'runyankolebible-verse',
    'runyankolebible-chapter',
    'runyankolebible-search',
    'runyankolebible-random',
    'share-creativeworks-search',
    'share-sources-list',
    'spacex-company',
    'spacex-rockets',
    'spacex-launchpads',
    'spacex-launches-query',
    'sunrisesunset-json',
    'tle-search',
    'tle-satellite',
    'postcodedata-nl-postcode-lookup',
    'postcodes-io-postcode-lookup',
    'postcodes-io-postcode-search',
    'postcodes-io-nearest-postcodes',
    'postalcodes-search',
    'postalpincode-pincode',
    'postalpincode-postoffice',
    'queimadas-inpe-10min-csv-index',
    'queimadas-inpe-10min-csv-file',
    'restcountries-name',
    'restcountries-alpha',
    'restcountries-region',
    'ipinfo-lookup',
    'ipfast-json',
    'ipify-ipv4-json',
    'serialifcolor-lookup',
    'slf-data-json',
    'viacep-cep-lookup',
    'viacep-address-search',
    'xcolors-convert',
    'zippopotam-us-postal-code',
    'zippopotam-us-city-search',
    'ziptastic-zip-lookup',
  ]) {
    assert.equal(ids.includes(id), true, `expected default endpoint catalog to include ${id}`)
  }
})

test('endpoint catalog matches by method and wildcard URL pattern', () => {
  const catalog = createCatalogFixture()

  assert.equal(
    matchEndpointRecord(catalog, {
      method: 'GET',
      url: 'https://example.com/docs/search',
    })?.id,
    'docs-search',
  )
  assert.equal(
    matchEndpointRecord(catalog, {
      method: 'POST',
      url: 'https://example.com/docs/search',
    }),
    undefined,
  )
})

test('endpoint URL patterns support path, wildcard, and regex styles', () => {
  assert.equal(matchesUrlPattern('https://example.com/api/search?q=x', '/api/search'), true)
  assert.equal(matchesUrlPattern('https://example.com/api/search?q=x', 'https://example.com/api/search'), true)
  assert.equal(matchesUrlPattern('https://example.com/api/search?q=x', 'https://example.com/api/*'), true)
  assert.equal(matchesUrlPattern('https://example.com/api/search?q=x', 'regex:/api/search'), true)
  assert.equal(matchesUrlPattern('https://api.agify.io?name=michael', 'https://api.agify.io*'), true)
  assert.equal(matchesUrlPattern('https://api.apis.guru/v2/providers.json', 'https://api.apis.guru/v2/providers.json'), true)
  assert.equal(matchesUrlPattern('https://api.apis.guru/v2/list.json', 'https://api.apis.guru/v2/list.json'), true)
  assert.equal(matchesUrlPattern('https://api.apis.guru/v2/metrics.json', 'https://api.apis.guru/v2/metrics.json'), true)
  assert.equal(matchesUrlPattern('https://www.cbr.ru/scripts/XML_daily.asp?date_req=05/05/2026', 'https://www.cbr.ru/scripts/XML_daily.asp*'), true)
  assert.equal(matchesUrlPattern('https://www.cbr.ru/scripts/XML_dynamic.asp?date_req1=01/05/2026&date_req2=05/05/2026&VAL_NM_RQ=R01235', 'https://www.cbr.ru/scripts/XML_dynamic.asp*'), true)
  assert.equal(matchesUrlPattern('https://cataas.com/api/cats?limit=2', 'https://cataas.com/api/cats*'), true)
  assert.equal(matchesUrlPattern('https://catfact.ninja/facts?limit=2', 'https://catfact.ninja/facts*'), true)
  assert.equal(matchesUrlPattern('https://api.cdnjs.com/libraries?search=jquery', 'regex:^https://api\\.cdnjs\\.com/libraries(?:\\?.*)?$'), true)
  assert.equal(matchesUrlPattern('https://api.cdnjs.com/libraries/jquery?fields=assets', 'regex:^https://api\\.cdnjs\\.com/libraries/[^/?]+(?:\\?.*)?$'), true)
  assert.equal(matchesUrlPattern('https://api.cdnjs.com/libraries/jquery/3.7.1?fields=files,sri', 'regex:^https://api\\.cdnjs\\.com/libraries/[^/]+/[^/?]+(?:\\?.*)?$'), true)
  assert.equal(matchesUrlPattern('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json', 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@*/v1/currencies.json'), true)
  assert.equal(matchesUrlPattern('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@2026-05-04/v1/currencies/usd.json', 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@*/v1/currencies/*.json'), true)
  assert.equal(matchesUrlPattern('https://latest.currency-api.pages.dev/v1/currencies/usd.json', 'regex:^https://(?:latest|\\d{4}-\\d{2}-\\d{2})\\.currency-api\\.pages\\.dev/v1/currencies(?:/[^/?]+)?\\.json$'), true)
  assert.equal(matchesUrlPattern('https://disify.com/api/email/test@example.com', 'https://disify.com/api/email/*'), true)
  assert.equal(matchesUrlPattern('https://disify.com/api/domain/gmail.com', 'https://disify.com/api/domain/*'), true)
  assert.equal(matchesUrlPattern('https://dog.ceo/api/breed/hound/images/random/2', 'https://dog.ceo/api/breed/*/images/random*'), true)
  assert.equal(matchesUrlPattern('https://api.energidataservice.dk/dataset/PowerSystemRightNow?start=now-PT15M&limit=5', 'https://api.energidataservice.dk/dataset/PowerSystemRightNow*'), true)
  assert.equal(matchesUrlPattern('https://api.energidataservice.dk/dataset/Elspotprices?limit=5', 'https://api.energidataservice.dk/dataset/Elspotprices*'), true)
  assert.equal(matchesUrlPattern('https://en.wiktionary.org/w/api.php?action=query&list=search', 'https://en.wiktionary.org/w/api.php*'), true)
  assert.equal(matchesUrlPattern('https://open.kickbox.com/v1/disposable/gmail.com', 'https://open.kickbox.com/v1/disposable/*'), true)
  assert.equal(matchesUrlPattern('https://api.usercheck.com/email/test@example.com', 'https://api.usercheck.com/email/*'), true)
  assert.equal(matchesUrlPattern('https://api.vatcomply.com/rates?base=USD&symbols=EUR', 'https://api.vatcomply.com/rates*'), true)
  assert.equal(matchesUrlPattern('https://api.vatcomply.com/vat_rates?country_code=DE', 'https://api.vatcomply.com/vat_rates*'), true)
  assert.equal(matchesUrlPattern('https://api.vatcomply.com/vat?vat_number=DE123456789', 'https://api.vatcomply.com/vat?*'), true)
  assert.equal(matchesUrlPattern('https://api.vatcomply.com/vat_rates?country_code=DE', 'https://api.vatcomply.com/vat?*'), false)
  assert.equal(matchesUrlPattern('https://cloudflare.com/cdn-cgi/trace', 'regex:^https://(?:one\\.one\\.one\\.one|1\\.0\\.0\\.1|cloudflare-dns\\.com|cloudflare-eth\\.com|workers\\.dev|pages\\.dev|cloudflare\\.tv|icanhazip\\.com|cloudflare\\.com)/cdn-cgi/trace$'), true)
  assert.equal(matchesUrlPattern('https://status.digitalocean.com/api/v2/summary.json', 'https://status.digitalocean.com/api/v2/summary.json'), true)
  assert.equal(matchesUrlPattern('https://status.digitalocean.com/api/v2/incidents/unresolved.json', 'regex:^https://status\\.digitalocean\\.com/api/v2/incidents(?:/unresolved)?\\.json$'), true)
  assert.equal(matchesUrlPattern('https://status.digitalocean.com/api/v2/scheduled-maintenances/upcoming.json', 'regex:^https://status\\.digitalocean\\.com/api/v2/scheduled-maintenances(?:/(?:upcoming|active))?\\.json$'), true)
  assert.equal(matchesUrlPattern('https://http.dog/404.json', 'https://http.dog/*.json'), true)
  assert.equal(matchesUrlPattern('https://httpbin.org/get?hello=world', 'https://httpbin.org/get*'), true)
  assert.equal(matchesUrlPattern('https://httpbin.org/uuid', 'https://httpbin.org/uuid'), true)
  assert.equal(matchesUrlPattern('https://icanhazip.com/', 'https://icanhazip.com/'), true)
  assert.equal(matchesUrlPattern('https://ipv4.icanhazip.com/', 'https://ipv4.icanhazip.com/'), true)
  assert.equal(
    matchesUrlPattern(
      [
        'https://raw.githubusercontent.com/gadael/icsdb/master/build/',
        'en-US/us-all-nonworkingdays.ics',
      ].join(''),
      String.raw`regex:^https://raw\.githubusercontent\.com/` +
        String.raw`gadael/icsdb/master/build/(?:en-US|fr-FR)/` +
        String.raw`[a-z0-9% -]+-nonworkingdays\.ics$`,
    ),
    true,
  )
  assert.equal(matchesUrlPattern('https://ipfast.dev/json', 'https://ipfast.dev/json'), true)
  assert.equal(matchesUrlPattern('https://api.ipify.org/?format=json', 'regex:^https://api\\.ipify\\.org/\\?format=json$'), true)
  assert.equal(matchesUrlPattern('https://api64.ipify.org/?format=json', 'regex:^https://api64\\.ipify\\.org/\\?format=json$'), true)
  assert.equal(matchesUrlPattern('https://meowfacts.herokuapp.com/?count=3', 'https://meowfacts.herokuapp.com/*'), true)
  assert.equal(matchesUrlPattern('https://random.dog/woof.json', 'https://random.dog/woof.json'), true)
  assert.equal(matchesUrlPattern('https://randomfox.ca/floof/', 'https://randomfox.ca/floof/*'), true)
  assert.equal(matchesUrlPattern('https://api.animechan.io/v1/quotes/random?anime=ReLIFE', 'https://api.animechan.io/v1/quotes/random*'), true)
  assert.equal(matchesUrlPattern('https://www.animenewsnetwork.com/encyclopedia/reports.xml?id=155&type=anime&nlist=3', 'https://www.animenewsnetwork.com/encyclopedia/reports.xml*'), true)
  assert.equal(matchesUrlPattern('https://api.jikan.moe/v4/anime?q=naruto&limit=3', 'https://api.jikan.moe/v4/anime*'), true)
  assert.equal(matchesUrlPattern('https://fakerapi.it/api/v2/persons?_quantity=2', 'https://fakerapi.it/api/v2/persons*'), true)
  assert.equal(matchesUrlPattern('https://fakerapi.it/api/v2/companies?_quantity=2', 'https://fakerapi.it/api/v2/companies*'), true)
  assert.equal(matchesUrlPattern('https://jsonplaceholder.typicode.com/posts?_limit=5', 'https://jsonplaceholder.typicode.com/posts*'), true)
  assert.equal(matchesUrlPattern('https://jsonplaceholder.typicode.com/posts/1', 'https://jsonplaceholder.typicode.com/posts/*'), true)
  assert.equal(matchesUrlPattern('https://api.dictionaryapi.dev/api/v2/entries/en/hello', 'https://api.dictionaryapi.dev/api/v2/entries/*'), true)
  assert.equal(matchesUrlPattern('https://api.bnm.gov.my/public/opr', 'https://api.bnm.gov.my/public/opr'), true)
  assert.equal(matchesUrlPattern('https://api.bnm.gov.my/public/exchange-rate/USD', 'https://api.bnm.gov.my/public/exchange-rate*'), true)
  assert.equal(matchesUrlPattern('https://api.bnm.gov.my/public/kijang-emas', 'https://api.bnm.gov.my/public/kijang-emas'), true)
  assert.equal(matchesUrlPattern('https://lookup.binlist.net/45717360', 'https://lookup.binlist.net/*'), true)
  assert.equal(matchesUrlPattern('https://data.jsdelivr.com/v1/packages/npm/jquery', String.raw`regex:^https://data\.jsdelivr\.com/v1/packages/npm/[^/?]+(?:\?.*)?$`), true)
  assert.equal(matchesUrlPattern('https://data.jsdelivr.com/v1/stats/packages/npm/jquery?period=month', String.raw`regex:^https://data\.jsdelivr\.com/v1/stats/packages/npm/[^/?]+(?:\?.*)?$`), true)
  assert.equal(matchesUrlPattern('https://hacker-news.firebaseio.com/v0/topstories.json', 'https://hacker-news.firebaseio.com/v0/*stories.json'), true)
  assert.equal(matchesUrlPattern('https://hacker-news.firebaseio.com/v0/item/8863.json', 'https://hacker-news.firebaseio.com/v0/item/*.json'), true)
  assert.equal(matchesUrlPattern('https://api.mediastack.com/v1/news?limit=100', 'https://api.mediastack.com/v1/news*'), true)
  assert.equal(matchesUrlPattern('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/1HGCM82633A004352?format=json', 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/*'), true)
  assert.equal(matchesUrlPattern('https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json', 'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/*'), true)
  assert.equal(matchesUrlPattern('https://api.openbrewerydb.org/v1/breweries?by_city=san_diego', 'https://api.openbrewerydb.org/v1/breweries*'), true)
  assert.equal(matchesUrlPattern('https://api.openbrewerydb.org/v1/breweries/search?query=dogfish', 'https://api.openbrewerydb.org/v1/breweries/search*'), true)
  assert.equal(matchesUrlPattern('https://api.openbrewerydb.org/v1/breweries/meta?by_city=san_diego', 'https://api.openbrewerydb.org/v1/breweries/meta*'), true)
  assert.equal(matchesUrlPattern('https://world.openfoodfacts.org/api/v2/product/737628064502.json?fields=code', 'https://world.openfoodfacts.org/api/v2/product/*.json*'), true)
  assert.equal(matchesUrlPattern('https://world.openfoodfacts.org/cgi/search.pl?search_terms=nutella&json=1', 'https://world.openfoodfacts.org/cgi/search.pl*'), true)
  assert.equal(matchesUrlPattern('https://disease.sh/v3/covid-19/all?yesterday=true', 'https://disease.sh/v3/covid-19/all*'), true)
  assert.equal(matchesUrlPattern('https://disease.sh/v3/covid-19/countries?sort=cases', 'https://disease.sh/v3/covid-19/countries*'), true)
  assert.equal(matchesUrlPattern('https://disease.sh/v3/influenza/cdc/ILINet', 'https://disease.sh/v3/influenza/cdc/ILINet'), true)
  assert.equal(matchesUrlPattern('https://api.nationalize.io/?name=kim', 'https://api.nationalize.io/*'), true)
  assert.equal(matchesUrlPattern('https://www.hebcal.com/converter?cfg=json&date=2026-05-03&g2h=1', 'https://www.hebcal.com/converter'), true)
  assert.equal(matchesUrlPattern('https://www.hebcal.com/hebcal?v=1&cfg=json&start=2026-05-03', 'https://www.hebcal.com/hebcal'), true)
  assert.equal(matchesUrlPattern('http://ip-api.com/json/8.8.8.8?fields=status', 'regex:^http://ip-api\\.com/json/[^/?]+(?:\\?.*)?$'), true)
  assert.equal(matchesUrlPattern('https://api.techniknews.net/ipgeo/8.8.8.8', 'regex:^https://api\\.techniknews\\.net/ipgeo/[^/?]+/?$'), true)
  assert.equal(
    matchesUrlPattern(
      'https://inspirehep.net/api/literature?q=higgs&size=1',
      'regex:^https://inspirehep\\.net/api/literature(?:\\?.*)?$',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://inspirehep.net/api/literature/4328',
      'regex:^https://inspirehep\\.net/api/literature/[0-9]+(?:\\?.*)?$',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://share.osf.io/api/v2/search/creativeworks/_search',
      'https://share.osf.io/api/v2/search/creativeworks/_search',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://share.osf.io/api/v2/sources/?page%5Bcursor%5D=x',
      'https://share.osf.io/api/v2/sources/*',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://tle.ivanstanojevic.me/api/tle/?search=ISS&page=1',
      'https://tle.ivanstanojevic.me/api/tle/*',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://tle.ivanstanojevic.me/api/tle/25544',
      String.raw`regex:^https://tle\.ivanstanojevic\.me/api/tle/[0-9]+$`,
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://api.isevenapi.xyz/api/iseven/6/',
      'regex:^https://api\\.isevenapi\\.xyz/api/iseven/[0-9]+/?$',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://isdayoff.ru/api/getdata?year=2026&month=5&day=11&cc=ru',
      'https://isdayoff.ru/api/getdata?*',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://isdayoff.ru/api/getdata?date1=20260510&date2=20260512&cc=ru',
      'https://isdayoff.ru/api/getdata?*',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://isro.vercel.app/api/spacecrafts',
      'regex:^https://isro\\.vercel\\.app/api/(spacecrafts|launchers|customer_satellites|centres)$',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://isro.vercel.app/api/spacecraft_missions',
      'regex:^https://isro\\.vercel\\.app/api/(spacecrafts|launchers|customer_satellites|centres)$',
    ),
    false,
  )
  assert.equal(
    matchesUrlPattern(
      'https://images-api.nasa.gov/search?q=apollo%2011&media_type=image',
      'https://images-api.nasa.gov/search*',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://images-api.nasa.gov/asset/as11-40-5874',
      'regex:^https://images-api\\.nasa\\.gov/asset/[^/?]+$',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://api.noctuasky.com/api/v1/skysources/stats/',
      'https://api.noctuasky.com/api/v1/skysources/stats/',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://api.noctuasky.com/api/v1/skysources/name/Mars',
      'regex:^https://api\\.noctuasky\\.com/api/v1/skysources/name/[^/?]+$',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://www.itis.gov/ITISWebService/jsonservice/searchByScientificName?srchKey=Quercus',
      'https://www.itis.gov/ITISWebService/jsonservice/searchByScientificName*',
    ),
    true,
  )
  assert.equal(
    matchesUrlPattern(
      'https://www.itis.gov/ITISWebService/jsonservice/getFullRecordFromTSN?tsn=19405',
      'https://www.itis.gov/ITISWebService/jsonservice/getFullRecordFromTSN*',
    ),
    true,
  )
  assert.equal(matchesUrlPattern('https://nominatim.openstreetmap.org/search?q=Berlin&format=jsonv2', 'https://nominatim.openstreetmap.org/search*'), true)
  assert.equal(matchesUrlPattern('https://nominatim.openstreetmap.org/reverse?lat=52.5170365&lon=13.3888599&format=jsonv2', 'https://nominatim.openstreetmap.org/reverse*'), true)
  assert.equal(matchesUrlPattern('https://api.opentopodata.org/v1/srtm90m?locations=39.7471,-104.9963', 'https://api.opentopodata.org/v1/*'), true)
  assert.equal(matchesUrlPattern('https://pinballmap.com/api/v1/regions.json', 'https://pinballmap.com/api/v1/regions.json*'), true)
  assert.equal(matchesUrlPattern('https://pinballmap.com/api/v1/locations.json?region=portland&no_details=1', 'https://pinballmap.com/api/v1/locations.json*'), true)
  assert.equal(matchesUrlPattern('https://postalcodes.info/search?q=90210&country=US', 'https://postalcodes.info/search*'), true)
  assert.equal(matchesUrlPattern('http://api.postcodedata.nl/v1/postcode/?postcode=1211EP&streetnumber=60&ref=public-apis-tui.local&type=json', 'http://api.postcodedata.nl/v1/postcode/*'), true)
  assert.equal(matchesUrlPattern('https://api.postcodes.io/postcodes/SW1A%202AA', 'https://api.postcodes.io/postcodes/*'), true)
  assert.equal(matchesUrlPattern('https://api.postcodes.io/postcodes?q=SW1A', 'https://api.postcodes.io/postcodes?q=*'), true)
  assert.equal(matchesUrlPattern('https://api.postcodes.io/postcodes?lat=51.5074&lon=-0.1278', 'regex:^https://api\\.postcodes\\.io/postcodes\\?(?:.*&)?lat=[^&]+&lon=[^&]+(?:&.*)?$'), true)
  assert.equal(matchesUrlPattern('https://api.postalpincode.in/pincode/110001', 'https://api.postalpincode.in/pincode/*'), true)
  assert.equal(matchesUrlPattern('https://api.postalpincode.in/postoffice/Connaught%20Place', 'https://api.postalpincode.in/postoffice/*'), true)
  assert.equal(matchesUrlPattern('https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/focos_10min_20260508_1410.csv', 'regex:^https://dataserver-coids\\.inpe\\.br/queimadas/queimadas/focos/csv/10min/focos_10min_[0-9]{8}_[0-9]{4}\\.csv$'), true)
  assert.equal(matchesUrlPattern('https://restcountries.com/v3.1/name/peru?fields=name,cca2', 'https://restcountries.com/v3.1/name/*'), true)
  assert.equal(matchesUrlPattern('https://restcountries.com/v3.1/alpha/DE?fields=name,cca2', 'https://restcountries.com/v3.1/alpha/*'), true)
  assert.equal(matchesUrlPattern('https://restcountries.com/v3.1/region/europe?fields=name,cca2', 'https://restcountries.com/v3.1/region/*'), true)
  assert.equal(matchesUrlPattern('https://slftool.github.io/data.json', 'https://slftool.github.io/data.json'), true)
  assert.equal(matchesUrlPattern('https://viacep.com.br/ws/01001000/json/', 'regex:^https://viacep\\.com\\.br/ws/[0-9]{8}/json/?$'), true)
  assert.equal(matchesUrlPattern('https://viacep.com.br/ws/SP/S%C3%A3o%20Paulo/Paulista/json/', 'regex:^https://viacep\\.com\\.br/ws/[A-Z]{2}/[^/]+/[^/]+/json/?$'), true)
  assert.equal(matchesUrlPattern('https://api.zippopotam.us/us/90210', 'regex:^https://api\\.zippopotam\\.us/[A-Za-z]{2}/[^/?#]+$'), true)
  assert.equal(matchesUrlPattern('https://api.zippopotam.us/us/ma/belmont', 'regex:^https://api\\.zippopotam\\.us/[A-Za-z]{2}/[^/?#]+/[^/?#]+$'), true)
  assert.equal(matchesUrlPattern('https://ziptasticapi.com/90210', 'regex:^https://ziptasticapi\\.com/[^/?#]+$'), true)
  assert.equal(matchesUrlPattern('https://datenregister.berlin.de/api/3/action/package_search?q=verkehr&rows=3', 'https://datenregister.berlin.de/api/3/action/package_search'), true)
  assert.equal(matchesUrlPattern('https://datenregister.berlin.de/api/3/action/package_show?id=727ae619-b46c-4437-9525-4d8b964fd841', 'https://datenregister.berlin.de/api/3/action/package_show'), true)
  assert.equal(matchesUrlPattern('https://ckan.multimediagdansk.pl/api/3/action/package_search?q=transport&rows=3', 'https://ckan.multimediagdansk.pl/api/3/action/package_search'), true)
  assert.equal(matchesUrlPattern('https://ckan.multimediagdansk.pl/api/3/action/package_show?id=b066863b-d402-45fd-8c04-0b66e53b51b4', 'https://ckan.multimediagdansk.pl/api/3/action/package_show'), true)
  assert.equal(matchesUrlPattern('https://otwartedane.gdynia.pl/api/3/action/package_search?q=transport&rows=3', 'https://otwartedane.gdynia.pl/api/3/action/package_search'), true)
  assert.equal(matchesUrlPattern('https://otwartedane.gdynia.pl/api/3/action/package_show?id=8b80bddf-6420-4689-8f54-ba33db71dba6', 'https://otwartedane.gdynia.pl/api/3/action/package_show'), true)
  assert.equal(matchesUrlPattern('https://hri.fi/data/api/3/action/package_search?q=transport&rows=3', 'https://hri.fi/data/api/3/action/package_search'), true)
  assert.equal(matchesUrlPattern('https://hri.fi/data/api/3/action/package_show?id=0ba02e5d-9f06-496a-8354-bb15beec5629', 'https://hri.fi/data/api/3/action/package_show'), true)
  assert.equal(matchesUrlPattern('https://nekos.best/api/v2/neko?amount=20', 'regex:^https://nekos\\.best/api/v2/(?!search(?:\\?|$))[a-z]+(?:\\?.*)?$'), true)
  assert.equal(matchesUrlPattern('https://nekos.best/api/v2/search?query=saber&type=1', 'https://nekos.best/api/v2/search*'), true)
  assert.equal(matchesUrlPattern('https://date.nager.at/api/v3/availablecountries', 'https://date.nager.at/api/v3/availablecountries'), true)
  assert.equal(matchesUrlPattern('https://date.nager.at/api/v3/publicholidays/2026/US', 'https://date.nager.at/api/v3/publicholidays/*'), true)
  assert.equal(matchesUrlPattern('https://registry.npmjs.org/-/v1/search?text=typescript&size=250', 'https://registry.npmjs.org/-/v1/search*'), true)
  assert.equal(matchesUrlPattern('https://registry.npmjs.org/@types/node', 'regex:^https://registry\\.npmjs\\.org/(?:@[^/?]+/)?[^/?]+(?:\\?.*)?$'), true)
  assert.equal(matchesUrlPattern('https://nameday.abalin.net/api/V2/date?day=3&month=5', 'https://nameday.abalin.net/api/V2/date*'), true)
  assert.equal(matchesUrlPattern('https://quickchart.io/chart?c={type:%27bar%27}', 'https://quickchart.io/chart*'), true)
  assert.equal(matchesUrlPattern('https://nameday.abalin.net/api/V2/getname', 'https://nameday.abalin.net/api/V2/getname'), true)
  assert.equal(matchesUrlPattern('https://api.portfoliooptimizer.io/v1/portfolios/optimization/minimum-variance', 'https://api.portfoliooptimizer.io/v1/portfolios/optimization/minimum-variance'), true)
  assert.equal(matchesUrlPattern('https://api.rainviewer.com/public/weather-maps.json', 'https://api.rainviewer.com/public/weather-maps.json'), true)
  assert.equal(matchesUrlPattern('https://ghibliapi.vercel.app/films?limit=250', 'https://ghibliapi.vercel.app/films*'), true)
  assert.equal(matchesUrlPattern('https://www.gov.uk/bank-holidays.json', 'https://www.gov.uk/bank-holidays.json'), true)
  assert.equal(matchesUrlPattern('https://api.carbonintensity.org.uk/intensity', 'https://api.carbonintensity.org.uk/intensity'), true)
  assert.equal(matchesUrlPattern('https://api.carbonintensity.org.uk/generation', 'https://api.carbonintensity.org.uk/generation'), true)
  assert.equal(matchesUrlPattern('https://api.waifu.im/images?IncludedTags=waifu', 'https://api.waifu.im/images*'), true)
  assert.equal(matchesUrlPattern('https://api.waifu.im/tags?Name=Waifu', 'https://api.waifu.im/tags*'), true)
  assert.equal(matchesUrlPattern('https://api.websitecarbon.com/data?bytes=1000000&green=1', 'https://api.websitecarbon.com/data*'), true)
  assert.equal(matchesUrlPattern('https://data.sec.gov/submissions/CIK0000320193.json', 'https://data.sec.gov/submissions/CIK*.json'), true)
  assert.equal(matchesUrlPattern('https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/AccountsPayableCurrent.json', 'https://data.sec.gov/api/xbrl/companyconcept/CIK*/*/*.json'), true)
})

function createCatalogFixture(): EndpointCatalog {
  return {
    records: [
      {
        id: 'docs-search',
        method: 'GET',
        urlPattern: 'https://example.com/docs/search*',
        category: 'search',
        evidenceStatus: 'observed',
        description: 'Docs search page request used by the smoke check.',
        siteIds: ['docs-example'],
      },
    ],
  }
}
