import assert from 'node:assert/strict'
import test from 'node:test'
import { describePublicApiProvider, listPublicApis } from '../src/application/usecases/publicApis.js'
import { defaultPublicApiRegistry, findPublicApiOperationByCommandPath } from '../src/providers/providerRegistry.js'

const expectedProviderIds = [
  'admindivisions', 'adresse', 'agify', 'arbeitnow',
  'apisguru', 'arxiv', 'artic', 'aviationweather',
  'bdapis', 'bible-api', 'banknegaramalaysia', 'bankofrussia',
  'bcferries', 'berlinopendata', 'binlist', 'bng2latlong',
  'brazilcentralbank', 'cataas', 'catfact-ninja', 'cdnjs',
  'censusgov', 'chainlink', 'churchcalendar', 'chroniclingamerica',
  'cloudflare-trace',
  'colormind', 'coloradodata', 'countryis', 'crossref',
  'currents', 'czechnationalbank', 'currencyapi', 'datausa',
  'dcopendata', 'ducksunlimited', 'digitalocean-status', 'disify',
  'dogceo', 'econdb', 'economiaawesome', 'emojihub',
  'energidataservice', 'entur', 'velib', 'epa',
  'fakerapi', 'fedtreasury', 'filterlists', 'fipe',
  'foodstandardsagency', 'free-dictionary', 'frankfurter', 'genderize',
  'gbif', 'geoapi', 'geojs', 'gdanskopendata', 'gdyniaopendata',
  'gurbaninow',
  'hellosalut', 'gnews', 'guardian', 'indianpincode',
  'gita-telugu', 'gruenstromindex', 'gutendex', 'hackernews',
  'hashnode', 'helium', 'hebcal', 'hko',
  'helsinkiopendata', 'hongkonggeodata', 'httpdog', 'httpbin',
  'icanhazip', 'icsdb', 'idigbio', 'ibge', 'inspirehep', 'isdayoff',
  'iseven', 'isro', 'ip-api',
  'ipgeo', 'ipinfo', 'ipfast', 'ipify', 'itis', 'istanbulopendata',
  'jsonplaceholder', 'jsdelivr', 'kickbox', 'lanyard',
  'lametro', 'launchlibrary2', 'lectserve', 'luchtmeetnet', 'marketaux',
  'meowfacts', 'mediastack', 'metmuseum', 'mfapi', 'minorplanetcenter',
  'minneapolisopendata', 'msrc', 'nasa',
  'nationalgrideso', 'nationalize', 'namedays',
  'networkcalc', 'newsapi', 'newsdata', 'nagerdate',
  'nbp', 'newton', 'noctua', 'nominatim', 'nhtsa', 'npm-registry',
  'nvd', 'nytimes', 'nycopendata', 'openbrewerydb',
  'opencollective', 'openfoodfacts', 'opengovernmentau',
  'opengovernmentcanada', 'opengovernmentde', 'opengovernmentuk',
  'opengovernmentusa', 'openlibrary', 'opennotify', 'opensky',
  'openmeteo', 'opensensemap', 'opentopodata', 'osf', 'phpnoise',
  'pinballmap', 'pm25opendata', 'poetrydb', 'postcodedata-nl',
  'postcodes-io', 'postalcodes', 'postalpincode', 'portfoliooptimizer',
  'pragueopendata', 'quickchart', 'quranapi', 'qurancloud',
  'queimadas-inpe', 'randomdog', 'randomfox', 'rainviewer',
  'razorpayifsc', 'receitaws', 'restcountries', 'rigveda',
  'runyankolebible',
  'secedgar', 'serialifcolor', 'share', 'slf', 'spacex', 'spaceflightnews',
  'steem', 'sunrisesunset', 'thenews', 'tle',
  'torontoopendata', 'uk-bank-holidays', 'ukcarbonintensity',
  'ukpolice', 'umeaopendata', 'urantia', 'usgsearthquake', 'usgswater',
  'usaspending', 'usweather',
  'usercheck', 'vatcomply', 'vedicsociety', 'viacep', 'voidly',
  'websitecarbon', 'whiskyhunter', 'wiktionary', 'wizardworld', 'wolnelektury',
  'worldbank', 'xcolors', 'zippopotam-us', 'ziptastic',
]

test('public API registry exposes provider manifests, operations, and command paths', () => {
  assert.deepEqual(
    defaultPublicApiRegistry.manifests.map(provider => provider.id),
    expectedProviderIds,
  )
  assert.deepEqual(defaultPublicApiRegistry.operations.map(operation => operation.id), [
    'admindivisions.country',
    'adresse.search',
    'adresse.reverse',
    'agify.age',
    'arbeitnow.jobs',
    'apisguru.providers',
    'apisguru.search',
    'apisguru.metrics',
    'arxiv.search',
    'arxiv.paper',
    'artic.artworks',
    'aviationweather.metar',
    'aviationweather.taf',
    'bdapis.divisions',
    'bdapis.districts',
    'bdapis.division',
    'bdapis.district',
    'bibleapi.passage',
    'bibleapi.random',
    'banknegaramalaysia.opr',
    'banknegaramalaysia.exchangeRates',
    'banknegaramalaysia.kijangEmas',
    'bankofrussia.rates',
    'bankofrussia.history',
    'bcferries.routes',
    'berlinopendata.search',
    'berlinopendata.dataset',
    'binlist.lookup',
    'bng2latlong.convert',
    'brazilcentralbank.datasets',
    'brazilcentralbank.sgsLatest',
    'cataas.cat',
    'cataas.tags',
    'cataas.cats',
    'catfact.fact',
    'catfact.facts',
    'catfact.breeds',
    'cdnjs.search',
    'cdnjs.library',
    'cdnjs.version',
    'censusgov.datasets',
    'censusgov.acsProfileStates',
    'chainlink.feeds',
    'churchcalendar.day',
    'churchcalendar.month',
    'chroniclingamerica.search',
    'cloudflaretrace.trace',
    'colormind.palette',
    'colormind.models',
    'coloradodata.datasets',
    'coloradodata.businessEntities',
    'countryis.lookup',
    'countryis.info',
    'crossref.works',
    'crossref.work',
    'currents.news',
    'czechnationalbank.rates',
    'currencyapi.currencies',
    'currencyapi.rates',
    'datausa.population',
    'datausa.geographies',
    'dcopendata.datasets',
    'dcopendata.businessLicenses',
    'ducksunlimited.chapters',
    'digitaloceanstatus.summary',
    'digitaloceanstatus.incidents',
    'digitaloceanstatus.maintenances',
    'disify.email',
    'disify.domain',
    'dogceo.breeds',
    'dogceo.images',
    'dogceo.subbreeds',
    'econdb.sources',
    'econdb.datasets',
    'economiaawesome.latest',
    'economiaawesome.daily',
    'emojihub.random',
    'emojihub.search',
    'emojihub.categories',
    'emojihub.groups',
    'energidataservice.rightnow',
    'energidataservice.elspotprices',
    'entur.places',
    'entur.departures',
    'velib.stations',
    'epa.uvHourly',
    'epa.uvDaily',
    'fakerapi.persons',
    'fakerapi.companies',
    'fedtreasury.debt',
    'fedtreasury.rates',
    'filterlists.lists',
    'fipe.brands',
    'fipe.models',
    'fipe.years',
    'fipe.price',
    'foodstandardsagency.authorities',
    'foodstandardsagency.establishments',
    'freedictionary.define',
    'frankfurter.currencies',
    'frankfurter.rates',
    'frankfurter.convert',
    'genderize.predict',
    'gbif.species',
    'gbif.occurrences',
    'geoapi.communes',
    'geoapi.departments',
    'geoapi.regions',
    'geojs.lookup',
    'geojs.currentIp',
    'gdanskopendata.search',
    'gdanskopendata.dataset',
    'gdyniaopendata.search',
    'gdyniaopendata.dataset',
    'gurbaninow.search',
    'gurbaninow.banis',
    'gurbaninow.bani',
    'hellosalut.translate',
    'gnews.search',
    'gnews.headlines',
    'guardian.search',
    'indianpincode.search',
    'gitatelugu.verse',
    'gruenstromindex.forecast',
    'gutendex.books',
    'gutendex.book',
    'hackernews.stories',
    'hackernews.item',
    'hackernews.thread',
    'hashnode.posts',
    'helium.hotspots',
    'hebcal.convert',
    'hebcal.calendar',
    'hko.current',
    'hko.forecast',
    'helsinkiopendata.search',
    'helsinkiopendata.dataset',
    'hongkonggeodata.locationSearch',
    'httpdog.status',
    'httpbin.get',
    'httpbin.uuid',
    'icanhazip.ip',
    'icsdb.calendars',
    'icsdb.events',
    'idigbio.records',
    'idigbio.media',
    'ibge.states',
    'ibge.municipalities',
    'inspirehep.search',
    'inspirehep.record',
    'isdayoff.day',
    'isdayoff.range',
    'iseven.check',
    'isro.catalog',
    'ipapi.lookup',
    'ipgeo.lookup',
    'ipinfo.lookup',
    'ipfast.lookup',
    'ipify.ip',
    'itis.search',
    'itis.record',
    'istanbulopendata.search',
    'istanbulopendata.records',
    'jsonplaceholder.posts',
    'jsonplaceholder.post',
    'jsdelivr.metadata',
    'jsdelivr.stats',
    'kickbox.disposable',
    'lanyard.presence',
    'lametro.routes',
    'lametro.stops',
    'launchlibrary2.launches',
    'launchlibrary2.events',
    'lectserve.date',
    'lectserve.sunday',
    'luchtmeetnet.components',
    'luchtmeetnet.measurements',
    'luchtmeetnet.concentrations',
    'marketaux.news',
    'meowfacts.facts',
    'mediastack.news',
    'metmuseum.search',
    'metmuseum.object',
    'metmuseum.departments',
    'mfapi.search',
    'mfapi.latest',
    'minorplanetcenter.search',
    'minneapolisopendata.datasets',
    'msrc.vulnerabilities',
    'nasa.search',
    'nasa.asset',
    'nationalgrideso.search',
    'nationalgrideso.records',
    'nationalize.predict',
    'namedays.date',
    'namedays.name',
    'networkcalc.subnet',
    'networkcalc.binary',
    'newsapi.headlines',
    'newsapi.everything',
    'newsdata.latest',
    'nagerdate.countries',
    'nagerdate.holidays',
    'nbp.tables',
    'nbp.history',
    'newton.compute',
    'noctua.stats',
    'noctua.source',
    'nominatim.search',
    'nominatim.reverse',
    'nhtsa.decodeVin',
    'nhtsa.makesForType',
    'npmregistry.search',
    'npmregistry.package',
    'nvd.cves',
    'nytimes.search',
    'nytimes.topStories',
    'nycopendata.datasets',
    'nycopendata.311Requests',
    'openbrewerydb.breweries',
    'openbrewerydb.search',
    'openbrewerydb.meta',
    'opencollective.account',
    'openfoodfacts.product',
    'opengovernmentau.search',
    'opengovernmentau.records',
    'opengovernmentcanada.search',
    'opengovernmentcanada.dataset',
    'opengovernmentde.search',
    'opengovernmentde.dataset',
    'opengovernmentuk.search',
    'opengovernmentuk.dataset',
    'opengovernmentusa.search',
    'opengovernmentusa.organizations',
    'opengovernmentusa.keywords',
    'openlibrary.search',
    'openlibrary.work',
    'opennotify.astros',
    'opennotify.issNow',
    'opensky.states',
    'openmeteo.forecast',
    'openmeteo.geocoding',
    'opensensemap.stats',
    'opensensemap.boxes',
    'opensensemap.sensors',
    'opentopodata.lookup',
    'osf.nodes',
    'osf.preprints',
    'phpnoise.generate',
    'pinballmap.regions',
    'pinballmap.locations',
    'pm25opendata.airbox',
    'pm25opendata.lass',
    'poetrydb.search',
    'poetrydb.random',
    'postcodedata-nl.lookup',
    'postcodes-io.lookup',
    'postcodes-io.search',
    'postcodes-io.nearest',
    'postalcodes.search',
    'postalpincode.pincode',
    'postalpincode.postOffice',
    'portfoliooptimizer.minimumVariance',
    'pragueopendata.datasets',
    'pragueopendata.dataset',
    'quickchart.render',
    'quranapi.verse',
    'quranapi.chapter',
    'qurancloud.ayah',
    'qurancloud.surah',
    'queimadas-inpe.latest10min',
    'randomdog.woof',
    'randomdog.files',
    'randomfox.floof',
    'rainviewer.maps',
    'razorpayifsc.lookup',
    'receitaws.lookup',
    'restcountries.name',
    'restcountries.alpha',
    'restcountries.region',
    'rigveda.book',
    'rigveda.search',
    'runyankolebible.books',
    'runyankolebible.verse',
    'runyankolebible.chapter',
    'runyankolebible.search',
    'runyankolebible.random',
    'secedgar.submissions',
    'secedgar.companyConcept',
    'serialifcolor.lookup',
    'share.search',
    'share.sources',
    'slf.lookup',
    'spacex.company',
    'spacex.rockets',
    'spacex.launchpads',
    'spacex.launches',
    'spaceflightnews.articles',
    'steem.discussions',
    'steem.thread',
    'sunrisesunset.times',
    'thenews.all',
    'tle.search',
    'tle.satellite',
    'torontoopendata.search',
    'torontoopendata.dataset',
    'ukbankholidays.events',
    'ukcarbonintensity.intensity',
    'ukcarbonintensity.generation',
    'ukpolice.streetCrimes',
    'umeaopendata.datasets',
    'urantia.toc',
    'urantia.paper',
    'urantia.paragraph',
    'urantia.search',
    'usgsearthquake.search',
    'usgsearthquake.event',
    'usgswater.instantaneous',
    'usgswater.daily',
    'usaspending.awards',
    'usaspending.overTime',
    'usaspending.agencies',
    'usweather.point',
    'usweather.forecast',
    'usercheck.email',
    'vatcomply.rates',
    'vatcomply.vatRates',
    'vatcomply.geolocate',
    'vatcomply.vat',
    'vedicsociety.words',
    'vedicsociety.descriptions',
    'vedicsociety.category',
    'viacep.lookup',
    'viacep.search',
    'voidly.incidents',
    'websitecarbon.data',
    'whiskyhunter.distilleries',
    'wiktionary.search',
    'wiktionary.extract',
    'wizardworld.catalog',
    'wolnelektury.books',
    'wolnelektury.book',
    'wolnelektury.read',
    'worldbank.countries',
    'worldbank.indicator',
    'xcolors.random',
    'xcolors.convert',
    'zippopotam-us.lookup',
    'zippopotam-us.search',
    'ziptastic.lookup',
  ])
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['agify', 'age'])?.rpcMethod,
    'agify.age',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['admindivisions', 'country'])?.rpcMethod,
    'admindivisions.country',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['adresse', 'search'])?.rpcMethod,
    'adresse.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['adresse', 'reverse'])?.rpcMethod,
    'adresse.reverse',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['arbeitnow', 'jobs'])?.rpcMethod,
    'arbeitnow.jobs',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['apisguru', 'providers'])?.rpcMethod,
    'apisguru.providers',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['apisguru', 'search'])?.rpcMethod,
    'apisguru.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['apisguru', 'metrics'])?.rpcMethod,
    'apisguru.metrics',
  )
  const arxivSearchOperation = findPublicApiOperationByCommandPath(
    defaultPublicApiRegistry,
    ['arxiv', 'search'],
  )
  const arxivPaperOperation = findPublicApiOperationByCommandPath(
    defaultPublicApiRegistry,
    ['arxiv', 'paper'],
  )
  assert.equal(arxivSearchOperation?.rpcMethod, 'arxiv.search')
  assert.equal(arxivPaperOperation?.rpcMethod, 'arxiv.paper')
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['artic', 'artworks'])?.rpcMethod,
    'artic.artworks',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bdapis', 'divisions'])?.rpcMethod,
    'bdapis.divisions',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bdapis', 'districts'])?.rpcMethod,
    'bdapis.districts',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bdapis', 'division'])?.rpcMethod,
    'bdapis.division',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bdapis', 'district'])?.rpcMethod,
    'bdapis.district',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bibleapi', 'passage'])?.rpcMethod,
    'bibleapi.passage',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bibleapi', 'random'])?.rpcMethod,
    'bibleapi.random',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['aviationweather', 'metar'])?.rpcMethod,
    'aviationweather.metar',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['aviationweather', 'taf'])?.rpcMethod,
    'aviationweather.taf',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bcferries', 'routes'])?.rpcMethod,
    'bcferries.routes',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['berlinopendata', 'search'])?.rpcMethod,
    'berlinopendata.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['berlinopendata', 'dataset'])?.rpcMethod,
    'berlinopendata.dataset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['binlist', 'lookup'])?.rpcMethod,
    'binlist.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bng2latlong', 'convert'])?.rpcMethod,
    'bng2latlong.convert',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['brazilcentralbank', 'datasets'])?.rpcMethod,
    'brazilcentralbank.datasets',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['cataas', 'cats'])?.rpcMethod,
    'cataas.cats',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['catfact', 'facts'])?.rpcMethod,
    'catfact.facts',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['cdnjs', 'search'])?.rpcMethod,
    'cdnjs.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['cdnjs', 'library'])?.rpcMethod,
    'cdnjs.library',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['cdnjs', 'version'])?.rpcMethod,
    'cdnjs.version',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['censusgov', 'datasets'])?.rpcMethod,
    'censusgov.datasets',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['chainlink', 'feeds'])?.rpcMethod,
    'chainlink.feeds',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['churchcalendar', 'day'],
    )?.rpcMethod,
    'churchcalendar.day',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['churchcalendar', 'month'],
    )?.rpcMethod,
    'churchcalendar.month',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['chroniclingamerica', 'search'])?.rpcMethod,
    'chroniclingamerica.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['cloudflaretrace', 'trace'])?.rpcMethod,
    'cloudflaretrace.trace',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['colormind', 'palette'])?.rpcMethod,
    'colormind.palette',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['colormind', 'models'])?.rpcMethod,
    'colormind.models',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['coloradodata', 'business-entities'])?.rpcMethod,
    'coloradodata.businessEntities',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['countryis', 'lookup'])?.rpcMethod,
    'countryis.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['countryis', 'info'])?.rpcMethod,
    'countryis.info',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['crossref', 'works'])?.rpcMethod,
    'crossref.works',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['crossref', 'work'])?.rpcMethod,
    'crossref.work',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['currents', 'news'])?.rpcMethod,
    'currents.news',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['czechnationalbank', 'rates'])?.rpcMethod,
    'czechnationalbank.rates',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['currencyapi', 'currencies'])?.rpcMethod,
    'currencyapi.currencies',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['currencyapi', 'rates'])?.rpcMethod,
    'currencyapi.rates',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['geoapi', 'communes'])?.rpcMethod,
    'geoapi.communes',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['geoapi', 'departments'])?.rpcMethod,
    'geoapi.departments',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['geoapi', 'regions'])?.rpcMethod,
    'geoapi.regions',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['geojs', 'lookup'])?.rpcMethod,
    'geojs.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['geojs', 'current-ip'])?.rpcMethod,
    'geojs.currentIp',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gdanskopendata', 'search'])?.rpcMethod,
    'gdanskopendata.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gdanskopendata', 'dataset'])?.rpcMethod,
    'gdanskopendata.dataset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gdyniaopendata', 'search'])?.rpcMethod,
    'gdyniaopendata.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gdyniaopendata', 'dataset'])?.rpcMethod,
    'gdyniaopendata.dataset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['hellosalut', 'translate'])?.rpcMethod,
    'hellosalut.translate',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['dcopendata', 'business-licenses'])?.rpcMethod,
    'dcopendata.businessLicenses',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ducksunlimited', 'chapters'])?.rpcMethod,
    'ducksunlimited.chapters',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['digitaloceanstatus', 'summary'])?.rpcMethod,
    'digitaloceanstatus.summary',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['digitaloceanstatus', 'incidents'])?.rpcMethod,
    'digitaloceanstatus.incidents',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['digitaloceanstatus', 'maintenances'])?.rpcMethod,
    'digitaloceanstatus.maintenances',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['datausa', 'population'])?.rpcMethod,
    'datausa.population',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['datausa', 'geographies'])?.rpcMethod,
    'datausa.geographies',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['epa', 'uv-hourly'])?.rpcMethod,
    'epa.uvHourly',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['epa', 'uv-daily'])?.rpcMethod,
    'epa.uvDaily',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['emojihub', 'search'])?.rpcMethod,
    'emojihub.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['freedictionary', 'define'])?.rpcMethod,
    'freedictionary.define',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['frankfurter', 'currencies'])?.rpcMethod,
    'frankfurter.currencies',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['frankfurter', 'rates'])?.rpcMethod,
    'frankfurter.rates',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['frankfurter', 'convert'])?.rpcMethod,
    'frankfurter.convert',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['fakerapi', 'persons'])?.rpcMethod,
    'fakerapi.persons',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['fakerapi', 'companies'])?.rpcMethod,
    'fakerapi.companies',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['fedtreasury', 'debt'])?.rpcMethod,
    'fedtreasury.debt',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['fedtreasury', 'rates'])?.rpcMethod,
    'fedtreasury.rates',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['fipe', 'brands'])?.rpcMethod,
    'fipe.brands',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['fipe', 'models'])?.rpcMethod,
    'fipe.models',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['fipe', 'years'])?.rpcMethod,
    'fipe.years',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['fipe', 'price'])?.rpcMethod,
    'fipe.price',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['foodstandardsagency', 'authorities'])?.rpcMethod,
    'foodstandardsagency.authorities',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['foodstandardsagency', 'establishments'])?.rpcMethod,
    'foodstandardsagency.establishments',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['genderize', 'predict'])?.rpcMethod,
    'genderize.predict',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['gbif', 'species'],
    )?.rpcMethod,
    'gbif.species',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['gbif', 'occurrences'],
    )?.rpcMethod,
    'gbif.occurrences',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['gurbaninow', 'search'],
    )?.rpcMethod,
    'gurbaninow.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['gurbaninow', 'banis'],
    )?.rpcMethod,
    'gurbaninow.banis',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['gurbaninow', 'bani'],
    )?.rpcMethod,
    'gurbaninow.bani',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['idigbio', 'records'],
    )?.rpcMethod,
    'idigbio.records',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['idigbio', 'media'],
    )?.rpcMethod,
    'idigbio.media',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['inspirehep', 'search'],
    )?.rpcMethod,
    'inspirehep.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['inspirehep', 'record'],
    )?.rpcMethod,
    'inspirehep.record',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['iseven', 'check'],
    )?.rpcMethod,
    'iseven.check',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['isro', 'catalog'],
    )?.rpcMethod,
    'isro.catalog',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['wizardworld', 'catalog'],
    )?.rpcMethod,
    'wizardworld.catalog',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['worldbank', 'countries'],
    )?.rpcMethod,
    'worldbank.countries',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['worldbank', 'indicator'],
    )?.rpcMethod,
    'worldbank.indicator',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['itis', 'record'],
    )?.rpcMethod,
    'itis.record',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gnews', 'search'])?.rpcMethod,
    'gnews.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gnews', 'headlines'])?.rpcMethod,
    'gnews.headlines',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['indianpincode', 'search'])?.rpcMethod,
    'indianpincode.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['mfapi', 'search'])?.rpcMethod,
    'mfapi.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['mfapi', 'latest'])?.rpcMethod,
    'mfapi.latest',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['minorplanetcenter', 'search'],
    )?.rpcMethod,
    'minorplanetcenter.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nationalgrideso', 'search'])?.rpcMethod,
    'nationalgrideso.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nationalgrideso', 'records'])?.rpcMethod,
    'nationalgrideso.records',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['razorpayifsc', 'lookup'])?.rpcMethod,
    'razorpayifsc.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gitatelugu', 'verse'])?.rpcMethod,
    'gitatelugu.verse',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gruenstromindex', 'forecast'])?.rpcMethod,
    'gruenstromindex.forecast',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gutendex', 'books'])?.rpcMethod,
    'gutendex.books',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['gutendex', 'book'])?.rpcMethod,
    'gutendex.book',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['hackernews', 'stories'])?.rpcMethod,
    'hackernews.stories',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['hackernews', 'item'])?.rpcMethod,
    'hackernews.item',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['hackernews', 'thread'])?.rpcMethod,
    'hackernews.thread',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['guardian', 'search'])?.rpcMethod,
    'guardian.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['hashnode', 'posts'])?.rpcMethod,
    'hashnode.posts',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['helium', 'hotspots'])?.rpcMethod,
    'helium.hotspots',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['hebcal', 'calendar'])?.rpcMethod,
    'hebcal.calendar',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['hko', 'current'])?.rpcMethod,
    'hko.current',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['hko', 'forecast'])?.rpcMethod,
    'hko.forecast',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['helsinkiopendata', 'search'])?.rpcMethod,
    'helsinkiopendata.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['helsinkiopendata', 'dataset'])?.rpcMethod,
    'helsinkiopendata.dataset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['banknegaramalaysia', 'opr'])?.rpcMethod,
    'banknegaramalaysia.opr',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['banknegaramalaysia', 'exchange-rates'])?.rpcMethod,
    'banknegaramalaysia.exchangeRates',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['banknegaramalaysia', 'kijang-emas'])?.rpcMethod,
    'banknegaramalaysia.kijangEmas',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['networkcalc', 'subnet'])?.rpcMethod,
    'networkcalc.subnet',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['networkcalc', 'binary'])?.rpcMethod,
    'networkcalc.binary',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bankofrussia', 'rates'])?.rpcMethod,
    'bankofrussia.rates',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['bankofrussia', 'history'])?.rpcMethod,
    'bankofrussia.history',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['serialifcolor', 'lookup'])?.rpcMethod,
    'serialifcolor.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['slf', 'lookup'])?.rpcMethod,
    'slf.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['mediastack', 'news'])?.rpcMethod,
    'mediastack.news',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['metmuseum', 'search'])?.rpcMethod,
    'metmuseum.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['namedays', 'date'])?.rpcMethod,
    'namedays.date',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nagerdate', 'holidays'])?.rpcMethod,
    'nagerdate.holidays',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nbp', 'tables'])?.rpcMethod,
    'nbp.tables',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nbp', 'history'])?.rpcMethod,
    'nbp.history',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nominatim', 'search'])?.rpcMethod,
    'nominatim.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nominatim', 'reverse'])?.rpcMethod,
    'nominatim.reverse',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['vatcomply', 'rates'])?.rpcMethod,
    'vatcomply.rates',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['vatcomply', 'vat-rates'])?.rpcMethod,
    'vatcomply.vatRates',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['vatcomply', 'geolocate'])?.rpcMethod,
    'vatcomply.geolocate',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['vatcomply', 'vat'])?.rpcMethod,
    'vatcomply.vat',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['vedicsociety', 'words'],
    )?.rpcMethod,
    'vedicsociety.words',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['vedicsociety', 'descriptions'],
    )?.rpcMethod,
    'vedicsociety.descriptions',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['vedicsociety', 'category'],
    )?.rpcMethod,
    'vedicsociety.category',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['viacep', 'lookup'])?.rpcMethod,
    'viacep.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['viacep', 'search'])?.rpcMethod,
    'viacep.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nhtsa', 'decode-vin'])?.rpcMethod,
    'nhtsa.decodeVin',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nhtsa', 'makes-for-type'])?.rpcMethod,
    'nhtsa.makesForType',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nvd', 'cves'])?.rpcMethod,
    'nvd.cves',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ukpolice', 'street-crimes'])?.rpcMethod,
    'ukpolice.streetCrimes',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['npmregistry', 'search'])?.rpcMethod,
    'npmregistry.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['npmregistry', 'package'])?.rpcMethod,
    'npmregistry.package',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['newsdata', 'latest'])?.rpcMethod,
    'newsdata.latest',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nytimes', 'search'])?.rpcMethod,
    'nytimes.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nytimes', 'top-stories'])?.rpcMethod,
    'nytimes.topStories',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['thenews', 'all'])?.rpcMethod,
    'thenews.all',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['torontoopendata', 'search'])?.rpcMethod,
    'torontoopendata.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['torontoopendata', 'dataset'])?.rpcMethod,
    'torontoopendata.dataset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ukbankholidays', 'events'])?.rpcMethod,
    'ukbankholidays.events',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ukcarbonintensity', 'intensity'])?.rpcMethod,
    'ukcarbonintensity.intensity',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ukcarbonintensity', 'generation'])?.rpcMethod,
    'ukcarbonintensity.generation',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['usaspending', 'awards'])?.rpcMethod,
    'usaspending.awards',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['usaspending', 'over-time'])?.rpcMethod,
    'usaspending.overTime',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['usaspending', 'agencies'])?.rpcMethod,
    'usaspending.agencies',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['usweather', 'point'])?.rpcMethod,
    'usweather.point',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['usweather', 'forecast'])?.rpcMethod,
    'usweather.forecast',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['openmeteo', 'forecast'])?.rpcMethod,
    'openmeteo.forecast',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['openmeteo', 'geocoding'])?.rpcMethod,
    'openmeteo.geocoding',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opennotify', 'astros'])?.rpcMethod,
    'opennotify.astros',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opennotify', 'iss-now'])?.rpcMethod,
    'opennotify.issNow',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opensensemap', 'stats'])?.rpcMethod,
    'opensensemap.stats',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opensensemap', 'boxes'])?.rpcMethod,
    'opensensemap.boxes',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opensensemap', 'sensors'])?.rpcMethod,
    'opensensemap.sensors',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opentopodata', 'lookup'])?.rpcMethod,
    'opentopodata.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['osf', 'nodes'])?.rpcMethod,
    'osf.nodes',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['osf', 'preprints'])?.rpcMethod,
    'osf.preprints',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['phpnoise', 'generate'])?.rpcMethod,
    'phpnoise.generate',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['pinballmap', 'regions'])?.rpcMethod,
    'pinballmap.regions',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['pinballmap', 'locations'])?.rpcMethod,
    'pinballmap.locations',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['pm25opendata', 'airbox'])?.rpcMethod,
    'pm25opendata.airbox',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['pm25opendata', 'lass'])?.rpcMethod,
    'pm25opendata.lass',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['postalcodes', 'search'])?.rpcMethod,
    'postalcodes.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['disify', 'email'])?.rpcMethod,
    'disify.email',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['disify', 'domain'])?.rpcMethod,
    'disify.domain',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['energidataservice', 'rightnow'])?.rpcMethod,
    'energidataservice.rightnow',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['energidataservice', 'elspotprices'])?.rpcMethod,
    'energidataservice.elspotprices',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['entur', 'places'])?.rpcMethod,
    'entur.places',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['entur', 'departures'])?.rpcMethod,
    'entur.departures',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['dogceo', 'images'])?.rpcMethod,
    'dogceo.images',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['httpdog', 'status'])?.rpcMethod,
    'httpdog.status',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['httpbin', 'get'])?.rpcMethod,
    'httpbin.get',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['httpbin', 'uuid'])?.rpcMethod,
    'httpbin.uuid',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['icanhazip', 'ip'])?.rpcMethod,
    'icanhazip.ip',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ipfast', 'lookup'])?.rpcMethod,
    'ipfast.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ipify', 'ip'])?.rpcMethod,
    'ipify.ip',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['istanbulopendata', 'search'])?.rpcMethod,
    'istanbulopendata.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['istanbulopendata', 'records'])?.rpcMethod,
    'istanbulopendata.records',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['jsonplaceholder', 'posts'])?.rpcMethod,
    'jsonplaceholder.posts',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['jsonplaceholder', 'post'])?.rpcMethod,
    'jsonplaceholder.post',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['jsdelivr', 'metadata'])?.rpcMethod,
    'jsdelivr.metadata',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['jsdelivr', 'stats'])?.rpcMethod,
    'jsdelivr.stats',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['kickbox', 'disposable'])?.rpcMethod,
    'kickbox.disposable',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['lanyard', 'presence'])?.rpcMethod,
    'lanyard.presence',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['lametro', 'routes'])?.rpcMethod,
    'lametro.routes',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['lametro', 'stops'])?.rpcMethod,
    'lametro.stops',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['launchlibrary2', 'launches'],
    )?.rpcMethod,
    'launchlibrary2.launches',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['launchlibrary2', 'events'],
    )?.rpcMethod,
    'launchlibrary2.events',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['lectserve', 'date'],
    )?.rpcMethod,
    'lectserve.date',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['lectserve', 'sunday'],
    )?.rpcMethod,
    'lectserve.sunday',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['icsdb', 'calendars'],
    )?.rpcMethod,
    'icsdb.calendars',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['icsdb', 'events'],
    )?.rpcMethod,
    'icsdb.events',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['isdayoff', 'day'],
    )?.rpcMethod,
    'isdayoff.day',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['isdayoff', 'range'],
    )?.rpcMethod,
    'isdayoff.range',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['nasa', 'search'],
    )?.rpcMethod,
    'nasa.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['nasa', 'asset'],
    )?.rpcMethod,
    'nasa.asset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['noctua', 'stats'],
    )?.rpcMethod,
    'noctua.stats',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['noctua', 'source'],
    )?.rpcMethod,
    'noctua.source',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['luchtmeetnet', 'components'])?.rpcMethod,
    'luchtmeetnet.components',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['luchtmeetnet', 'measurements'])?.rpcMethod,
    'luchtmeetnet.measurements',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['luchtmeetnet', 'concentrations'])?.rpcMethod,
    'luchtmeetnet.concentrations',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['marketaux', 'news'])?.rpcMethod,
    'marketaux.news',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['meowfacts', 'facts'])?.rpcMethod,
    'meowfacts.facts',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['nycopendata', '311-requests'])?.rpcMethod,
    'nycopendata.311Requests',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['openbrewerydb', 'breweries'])?.rpcMethod,
    'openbrewerydb.breweries',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['openbrewerydb', 'search'])?.rpcMethod,
    'openbrewerydb.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['openbrewerydb', 'meta'])?.rpcMethod,
    'openbrewerydb.meta',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opencollective', 'account'])?.rpcMethod,
    'opencollective.account',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['openfoodfacts', 'product'])?.rpcMethod,
    'openfoodfacts.product',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['openfoodfacts', 'search']),
    undefined,
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentau', 'search'])?.rpcMethod,
    'opengovernmentau.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentau', 'records'])?.rpcMethod,
    'opengovernmentau.records',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentcanada', 'search'])?.rpcMethod,
    'opengovernmentcanada.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentcanada', 'dataset'])?.rpcMethod,
    'opengovernmentcanada.dataset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentde', 'search'])?.rpcMethod,
    'opengovernmentde.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentde', 'dataset'])?.rpcMethod,
    'opengovernmentde.dataset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentuk', 'search'])?.rpcMethod,
    'opengovernmentuk.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentuk', 'dataset'])?.rpcMethod,
    'opengovernmentuk.dataset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentusa', 'search'])?.rpcMethod,
    'opengovernmentusa.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentusa', 'organizations'])?.rpcMethod,
    'opengovernmentusa.organizations',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opengovernmentusa', 'keywords'])?.rpcMethod,
    'opengovernmentusa.keywords',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['openlibrary', 'search'])?.rpcMethod,
    'openlibrary.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['openlibrary', 'work'])?.rpcMethod,
    'openlibrary.work',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['opensky', 'states'])?.rpcMethod,
    'opensky.states',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['poetrydb', 'search'])?.rpcMethod,
    'poetrydb.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['poetrydb', 'random'])?.rpcMethod,
    'poetrydb.random',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['postcodedata-nl', 'lookup'])?.rpcMethod,
    'postcodedata-nl.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['postcodes-io', 'lookup'])?.rpcMethod,
    'postcodes-io.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['postcodes-io', 'search'])?.rpcMethod,
    'postcodes-io.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['postcodes-io', 'nearest'])?.rpcMethod,
    'postcodes-io.nearest',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['postalpincode', 'pincode'])?.rpcMethod,
    'postalpincode.pincode',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['postalpincode', 'post-office'])?.rpcMethod,
    'postalpincode.postOffice',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['portfoliooptimizer', 'minimum-variance'])?.rpcMethod,
    'portfoliooptimizer.minimumVariance',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['pragueopendata', 'datasets'])?.rpcMethod,
    'pragueopendata.datasets',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['pragueopendata', 'dataset'])?.rpcMethod,
    'pragueopendata.dataset',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['quickchart', 'render'])?.rpcMethod,
    'quickchart.render',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['quranapi', 'verse'])?.rpcMethod,
    'quranapi.verse',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['quranapi', 'chapter'])?.rpcMethod,
    'quranapi.chapter',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['qurancloud', 'ayah'])?.rpcMethod,
    'qurancloud.ayah',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['qurancloud', 'surah'])?.rpcMethod,
    'qurancloud.surah',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['queimadas-inpe', 'latest-10min'])?.rpcMethod,
    'queimadas-inpe.latest10min',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['wolnelektury', 'books'])?.rpcMethod,
    'wolnelektury.books',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['wolnelektury', 'book'])?.rpcMethod,
    'wolnelektury.book',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['wolnelektury', 'read'])?.rpcMethod,
    'wolnelektury.read',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['randomdog', 'files'])?.rpcMethod,
    'randomdog.files',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['randomfox', 'floof'])?.rpcMethod,
    'randomfox.floof',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['rainviewer', 'maps'])?.rpcMethod,
    'rainviewer.maps',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['secedgar', 'submissions'])?.rpcMethod,
    'secedgar.submissions',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['secedgar', 'company-concept'])?.rpcMethod,
    'secedgar.companyConcept',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['spaceflightnews', 'articles'])?.rpcMethod,
    'spaceflightnews.articles',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['steem', 'discussions'])?.rpcMethod,
    'steem.discussions',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['steem', 'thread'])?.rpcMethod,
    'steem.thread',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['usercheck', 'email'])?.rpcMethod,
    'usercheck.email',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['websitecarbon', 'data'])?.rpcMethod,
    'websitecarbon.data',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['whiskyhunter', 'distilleries'])?.rpcMethod,
    'whiskyhunter.distilleries',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['wiktionary', 'search'])?.rpcMethod,
    'wiktionary.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['wiktionary', 'extract'])?.rpcMethod,
    'wiktionary.extract',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['receitaws', 'lookup'])?.rpcMethod,
    'receitaws.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['restcountries', 'name'])?.rpcMethod,
    'restcountries.name',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['restcountries', 'alpha'])?.rpcMethod,
    'restcountries.alpha',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['restcountries', 'region'])?.rpcMethod,
    'restcountries.region',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['rigveda', 'book'],
    )?.rpcMethod,
    'rigveda.book',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['rigveda', 'search'],
    )?.rpcMethod,
    'rigveda.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['runyankolebible', 'books'],
    )?.rpcMethod,
    'runyankolebible.books',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['runyankolebible', 'verse'],
    )?.rpcMethod,
    'runyankolebible.verse',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['runyankolebible', 'chapter'],
    )?.rpcMethod,
    'runyankolebible.chapter',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['runyankolebible', 'search'],
    )?.rpcMethod,
    'runyankolebible.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['runyankolebible', 'random'],
    )?.rpcMethod,
    'runyankolebible.random',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['share', 'search'],
    )?.rpcMethod,
    'share.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['share', 'sources'],
    )?.rpcMethod,
    'share.sources',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['spacex', 'company'],
    )?.rpcMethod,
    'spacex.company',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['spacex', 'rockets'],
    )?.rpcMethod,
    'spacex.rockets',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['spacex', 'launchpads'],
    )?.rpcMethod,
    'spacex.launchpads',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['spacex', 'launches'],
    )?.rpcMethod,
    'spacex.launches',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['sunrisesunset', 'times'],
    )?.rpcMethod,
    'sunrisesunset.times',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['tle', 'search'],
    )?.rpcMethod,
    'tle.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(
      defaultPublicApiRegistry,
      ['tle', 'satellite'],
    )?.rpcMethod,
    'tle.satellite',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['xcolors', 'random'])?.rpcMethod,
    'xcolors.random',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['xcolors', 'convert'])?.rpcMethod,
    'xcolors.convert',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['zippopotam-us', 'lookup'])?.rpcMethod,
    'zippopotam-us.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['zippopotam-us', 'search'])?.rpcMethod,
    'zippopotam-us.search',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ziptastic', 'lookup'])?.rpcMethod,
    'ziptastic.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['velib', 'stations'])?.rpcMethod,
    'velib.stations',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['hongkonggeodata', 'location-search'])?.rpcMethod,
    'hongkonggeodata.locationSearch',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ibge', 'states'])?.rpcMethod,
    'ibge.states',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ibge', 'municipalities'])?.rpcMethod,
    'ibge.municipalities',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ipapi', 'lookup'])?.rpcMethod,
    'ipapi.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ipgeo', 'lookup'])?.rpcMethod,
    'ipgeo.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['ipinfo', 'lookup'])?.rpcMethod,
    'ipinfo.lookup',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['minneapolisopendata', 'datasets'])?.rpcMethod,
    'minneapolisopendata.datasets',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['msrc', 'vulnerabilities'])?.rpcMethod,
    'msrc.vulnerabilities',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['filterlists', 'lists'])?.rpcMethod,
    'filterlists.lists',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['umeaopendata', 'datasets'])?.rpcMethod,
    'umeaopendata.datasets',
  )
  assert.equal(
    findPublicApiOperationByCommandPath(defaultPublicApiRegistry, ['voidly', 'incidents'])?.rpcMethod,
    'voidly.incidents',
  )
})

test('public API discovery usecases summarize providers and operation metadata', () => {
  const list = listPublicApis(defaultPublicApiRegistry)
  assert.equal(list.kind, 'publicApis.list')
  assert.equal(list.providerCount, 194)
  assert.equal(list.operationCount, 350)
  assert.equal(list.operations.some(operation => operation.command === 'admindivisions country'), true)
  assert.equal(list.operations.some(operation => operation.command === 'adresse search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'adresse reverse'), true)
  assert.equal(list.operations.some(operation => operation.command === 'agify age'), true)
  assert.equal(list.operations.some(operation => operation.command === 'arbeitnow jobs'), true)
  assert.equal(list.operations.some(operation => operation.command === 'apisguru providers'), true)
  assert.equal(list.operations.some(operation => operation.command === 'apisguru search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'apisguru metrics'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'arxiv search'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'arxiv paper'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'artic artworks'), true)
  assert.equal(list.operations.some(operation => operation.command === 'aviationweather metar'), true)
  assert.equal(list.operations.some(operation => operation.command === 'aviationweather taf'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bdapis divisions'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bdapis districts'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bdapis division'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bdapis district'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bibleapi passage'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bibleapi random'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bcferries routes'), true)
  assert.equal(list.operations.some(operation => operation.command === 'banknegaramalaysia opr'), true)
  assert.equal(list.operations.some(operation => operation.command === 'banknegaramalaysia exchange-rates'), true)
  assert.equal(list.operations.some(operation => operation.command === 'banknegaramalaysia kijang-emas'), true)
  assert.equal(list.operations.some(operation => operation.command === 'networkcalc subnet'), true)
  assert.equal(list.operations.some(operation => operation.command === 'networkcalc binary'), true)
  assert.equal(list.operations.some(operation => operation.command === 'serialifcolor lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bankofrussia rates'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bankofrussia history'), true)
  assert.equal(list.operations.some(operation => operation.command === 'binlist lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'bng2latlong convert'), true)
  assert.equal(list.operations.some(operation => operation.command === 'brazilcentralbank datasets'), true)
  assert.equal(list.operations.some(operation => operation.command === 'brazilcentralbank sgs-latest'), true)
  assert.equal(list.operations.some(operation => operation.command === 'fakerapi persons'), true)
  assert.equal(list.operations.some(operation => operation.command === 'fakerapi companies'), true)
  assert.equal(list.operations.some(operation => operation.command === 'fedtreasury debt'), true)
  assert.equal(list.operations.some(operation => operation.command === 'fedtreasury rates'), true)
  assert.equal(list.operations.some(operation => operation.command === 'fipe brands'), true)
  assert.equal(list.operations.some(operation => operation.command === 'fipe models'), true)
  assert.equal(list.operations.some(operation => operation.command === 'fipe years'), true)
  assert.equal(list.operations.some(operation => operation.command === 'fipe price'), true)
  assert.equal(list.operations.some(operation => operation.command === 'foodstandardsagency authorities'), true)
  assert.equal(list.operations.some(operation => operation.command === 'foodstandardsagency establishments'), true)
  assert.equal(list.operations.some(operation => operation.command === 'jsonplaceholder posts'), true)
  assert.equal(list.operations.some(operation => operation.command === 'jsonplaceholder post'), true)
  assert.equal(list.operations.some(operation => operation.command === 'jsdelivr metadata'), true)
  assert.equal(list.operations.some(operation => operation.command === 'jsdelivr stats'), true)
  assert.equal(list.operations.some(operation => operation.command === 'kickbox disposable'), true)
  assert.equal(list.operations.some(operation => operation.command === 'luchtmeetnet components'), true)
  assert.equal(list.operations.some(operation => operation.command === 'luchtmeetnet measurements'), true)
  assert.equal(list.operations.some(operation => operation.command === 'luchtmeetnet concentrations'), true)
  assert.equal(list.operations.some(operation => operation.command === 'marketaux news'), true)
  assert.equal(list.operations.some(operation => operation.command === 'cataas cats'), true)
  assert.equal(list.operations.some(operation => operation.command === 'catfact facts'), true)
  assert.equal(list.operations.some(operation => operation.command === 'cdnjs search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'cdnjs library'), true)
  assert.equal(list.operations.some(operation => operation.command === 'coloradodata datasets'), true)
  assert.equal(list.operations.some(operation => operation.command === 'coloradodata business-entities'), true)
  assert.equal(list.operations.some(operation => operation.command === 'censusgov datasets'), true)
  assert.equal(list.operations.some(operation => operation.command === 'censusgov acs-profile-states'), true)
  assert.equal(list.operations.some(operation => operation.command === 'cdnjs version'), true)
  assert.equal(list.operations.some(operation => operation.command === 'chainlink feeds'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'churchcalendar day'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'churchcalendar month'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'chroniclingamerica search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'datausa population'), true)
  assert.equal(list.operations.some(operation => operation.command === 'datausa geographies'), true)
  assert.equal(list.operations.some(operation => operation.command === 'czechnationalbank rates'), true)
  assert.equal(list.operations.some(operation => operation.command === 'currencyapi currencies'), true)
  assert.equal(list.operations.some(operation => operation.command === 'currencyapi rates'), true)
  assert.equal(list.operations.some(operation => operation.command === 'dcopendata datasets'), true)
  assert.equal(list.operations.some(operation => operation.command === 'dcopendata business-licenses'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ducksunlimited chapters'), true)
  assert.equal(list.operations.some(operation => operation.command === 'cloudflaretrace trace'), true)
  assert.equal(list.operations.some(operation => operation.command === 'colormind palette'), true)
  assert.equal(list.operations.some(operation => operation.command === 'colormind models'), true)
  assert.equal(list.operations.some(operation => operation.command === 'countryis lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'countryis info'), true)
  assert.equal(list.operations.some(operation => operation.command === 'crossref works'), true)
  assert.equal(list.operations.some(operation => operation.command === 'crossref work'), true)
  assert.equal(list.operations.some(operation => operation.command === 'currents news'), true)
  assert.equal(list.operations.some(operation => operation.command === 'digitaloceanstatus summary'), true)
  assert.equal(list.operations.some(operation => operation.command === 'digitaloceanstatus incidents'), true)
  assert.equal(list.operations.some(operation => operation.command === 'digitaloceanstatus maintenances'), true)
  assert.equal(list.operations.some(operation => operation.command === 'disify email'), true)
  assert.equal(list.operations.some(operation => operation.command === 'disify domain'), true)
  assert.equal(list.operations.some(operation => operation.command === 'dogceo images'), true)
  assert.equal(list.operations.some(operation => operation.command === 'econdb sources'), true)
  assert.equal(list.operations.some(operation => operation.command === 'econdb datasets'), true)
  assert.equal(list.operations.some(operation => operation.command === 'economiaawesome latest'), true)
  assert.equal(list.operations.some(operation => operation.command === 'economiaawesome daily'), true)
  assert.equal(list.operations.some(operation => operation.command === 'energidataservice rightnow'), true)
  assert.equal(list.operations.some(operation => operation.command === 'energidataservice elspotprices'), true)
  assert.equal(list.operations.some(operation => operation.command === 'entur places'), true)
  assert.equal(list.operations.some(operation => operation.command === 'entur departures'), true)
  assert.equal(list.operations.some(operation => operation.command === 'epa uv-hourly'), true)
  assert.equal(list.operations.some(operation => operation.command === 'epa uv-daily'), true)
  assert.equal(list.operations.some(operation => operation.command === 'filterlists lists'), true)
  assert.equal(list.operations.some(operation => operation.command === 'emojihub search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'freedictionary define'), true)
  assert.equal(list.operations.some(operation => operation.command === 'frankfurter currencies'), true)
  assert.equal(list.operations.some(operation => operation.command === 'frankfurter rates'), true)
  assert.equal(list.operations.some(operation => operation.command === 'frankfurter convert'), true)
  assert.equal(list.operations.some(operation => operation.command === 'genderize predict'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'gbif species'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'gbif occurrences'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'gurbaninow search'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'gurbaninow banis'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'gurbaninow bani'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'geoapi communes'), true)
  assert.equal(list.operations.some(operation => operation.command === 'geoapi departments'), true)
  assert.equal(list.operations.some(operation => operation.command === 'geoapi regions'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gdanskopendata search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gdanskopendata dataset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gdyniaopendata search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gdyniaopendata dataset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'geojs lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'geojs current-ip'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hellosalut translate'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gnews search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gnews headlines'), true)
  assert.equal(list.operations.some(operation => operation.command === 'guardian search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'indianpincode search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gitatelugu verse'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gruenstromindex forecast'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gutendex books'), true)
  assert.equal(list.operations.some(operation => operation.command === 'gutendex book'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hackernews stories'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hackernews item'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hackernews thread'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hashnode posts'), true)
  assert.equal(list.operations.some(operation => operation.command === 'helium hotspots'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hebcal convert'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hebcal calendar'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hko current'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hko forecast'), true)
  assert.equal(list.operations.some(operation => operation.command === 'helsinkiopendata search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'helsinkiopendata dataset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'hongkonggeodata location-search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'httpdog status'), true)
  assert.equal(list.operations.some(operation => operation.command === 'httpbin get'), true)
  assert.equal(list.operations.some(operation => operation.command === 'httpbin uuid'), true)
  assert.equal(list.operations.some(operation => operation.command === 'icanhazip ip'), true)
  assert.equal(list.operations.some(operation => operation.command === 'icsdb calendars'), true)
  assert.equal(list.operations.some(operation => operation.command === 'icsdb events'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'isdayoff day'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'isdayoff range'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'idigbio records'), true)
  assert.equal(list.operations.some(operation => operation.command === 'idigbio media'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'inspirehep search'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'inspirehep record'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'iseven check'), true)
  assert.equal(list.operations.some(operation => operation.command === 'isro catalog'), true)
  assert.equal(list.operations.some(operation => operation.command === 'wizardworld catalog'), true)
  assert.equal(list.operations.some(operation => operation.command === 'worldbank countries'), true)
  assert.equal(list.operations.some(operation => operation.command === 'worldbank indicator'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'spacex company'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'spacex rockets'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'spacex launchpads'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'spacex launches'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'sunrisesunset times'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'tle search'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'tle satellite'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'ibge states'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ibge municipalities'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ipapi lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'itis search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'itis record'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ipgeo lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ipinfo lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ipfast lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ipify ip'), true)
  assert.equal(list.operations.some(operation => operation.command === 'istanbulopendata search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'istanbulopendata records'), true)
  assert.equal(list.operations.some(operation => operation.command === 'lanyard presence'), true)
  assert.equal(list.operations.some(operation => operation.command === 'lametro routes'), true)
  assert.equal(list.operations.some(operation => operation.command === 'lametro stops'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'launchlibrary2 launches'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'launchlibrary2 events'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'lectserve date'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'lectserve sunday'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'meowfacts facts'), true)
  assert.equal(list.operations.some(operation => operation.command === 'metmuseum search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'mfapi search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'mfapi latest'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'minorplanetcenter search'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'nasa search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nasa asset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'msrc vulnerabilities'), true)
  assert.equal(list.operations.some(operation => operation.command === 'minneapolisopendata datasets'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nationalgrideso search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nationalgrideso records'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nationalize predict'), true)
  assert.equal(list.operations.some(operation => operation.command === 'namedays date'), true)
  assert.equal(list.operations.some(operation => operation.command === 'namedays name'), true)
  assert.equal(list.operations.some(operation => operation.command === 'newsapi headlines'), true)
  assert.equal(list.operations.some(operation => operation.command === 'newsapi everything'), true)
  assert.equal(list.operations.some(operation => operation.command === 'newsdata latest'), true)
  assert.equal(list.operations.some(operation => operation.command === 'phpnoise generate'), true)
  assert.equal(list.operations.some(operation => operation.command === 'pm25opendata airbox'), true)
  assert.equal(list.operations.some(operation => operation.command === 'pm25opendata lass'), true)
  assert.equal(list.operations.some(operation => operation.command === 'postalcodes search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'postalpincode pincode'), true)
  assert.equal(list.operations.some(operation => operation.command === 'postalpincode post-office'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nagerdate countries'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nagerdate holidays'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nbp tables'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nbp history'), true)
  assert.equal(list.operations.some(operation => operation.command === 'newton compute'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'noctua stats'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'noctua source'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'nominatim search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nominatim reverse'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nhtsa decode-vin'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nhtsa makes-for-type'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nvd cves'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ukpolice street-crimes'), true)
  assert.equal(list.operations.some(operation => operation.command === 'npmregistry search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'npmregistry package'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nytimes search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nytimes top-stories'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nycopendata datasets'), true)
  assert.equal(list.operations.some(operation => operation.command === 'nycopendata 311-requests'), true)
  assert.equal(list.operations.some(operation => operation.command === 'openbrewerydb breweries'), true)
  assert.equal(list.operations.some(operation => operation.command === 'openbrewerydb search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'openbrewerydb meta'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opencollective account'), true)
  assert.equal(list.operations.some(operation => operation.command === 'openfoodfacts product'), true)
  assert.equal(list.operations.some(operation => operation.command === 'openfoodfacts search'), false)
  assert.equal(list.operations.some(operation => operation.command === 'pragueopendata datasets'), true)
  assert.equal(list.operations.some(operation => operation.command === 'pragueopendata dataset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'berlinopendata search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'berlinopendata dataset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentau search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentau records'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentcanada search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentcanada dataset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentde search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentde dataset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentuk search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentuk dataset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentusa search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentusa organizations'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opengovernmentusa keywords'), true)
  assert.equal(list.operations.some(operation => operation.command === 'torontoopendata search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'torontoopendata dataset'), true)
  assert.equal(list.operations.some(operation => operation.command === 'umeaopendata datasets'), true)
  assert.equal(list.operations.some(operation => operation.command === 'openlibrary search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'openlibrary work'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opennotify astros'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opennotify iss-now'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opensky states'), true)
  assert.equal(list.operations.some(operation => operation.command === 'opentopodata lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'osf nodes'), true)
  assert.equal(list.operations.some(operation => operation.command === 'osf preprints'), true)
  assert.equal(list.operations.some(operation => operation.command === 'pinballmap regions'), true)
  assert.equal(list.operations.some(operation => operation.command === 'pinballmap locations'), true)
  assert.equal(list.operations.some(operation => operation.command === 'poetrydb search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'poetrydb random'), true)
  assert.equal(list.operations.some(operation => operation.command === 'postcodedata-nl lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'postcodes-io lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'postcodes-io search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'postcodes-io nearest'), true)
  assert.equal(list.operations.some(operation => operation.command === 'portfoliooptimizer minimum-variance'), true)
  assert.equal(list.operations.some(operation => operation.command === 'quickchart render'), true)
  assert.equal(list.operations.some(operation => operation.command === 'quranapi verse'), true)
  assert.equal(list.operations.some(operation => operation.command === 'quranapi chapter'), true)
  assert.equal(list.operations.some(operation => operation.command === 'qurancloud ayah'), true)
  assert.equal(list.operations.some(operation => operation.command === 'qurancloud surah'), true)
  assert.equal(list.operations.some(operation => operation.command === 'queimadas-inpe latest-10min'), true)
  assert.equal(list.operations.some(operation => operation.command === 'randomdog files'), true)
  assert.equal(list.operations.some(operation => operation.command === 'randomfox floof'), true)
  assert.equal(list.operations.some(operation => operation.command === 'rainviewer maps'), true)
  assert.equal(list.operations.some(operation => operation.command === 'razorpayifsc lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'receitaws lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'restcountries name'), true)
  assert.equal(list.operations.some(operation => operation.command === 'restcountries alpha'), true)
  assert.equal(list.operations.some(operation => operation.command === 'restcountries region'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'rigveda book'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'rigveda search'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'runyankolebible books'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'runyankolebible verse'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'runyankolebible chapter'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'runyankolebible search'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'runyankolebible random'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'secedgar submissions'), true)
  assert.equal(list.operations.some(operation => operation.command === 'secedgar company-concept'), true)
  assert.equal(list.operations.some(operation => operation.command === 'share search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'share sources'), true)
  assert.equal(list.operations.some(operation => operation.command === 'slf lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'spaceflightnews articles'), true)
  assert.equal(list.operations.some(operation => operation.command === 'steem discussions'), true)
  assert.equal(list.operations.some(operation => operation.command === 'steem thread'), true)
  assert.equal(list.operations.some(operation => operation.command === 'thenews all'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'tle search'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'tle satellite'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'ukbankholidays events'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ukcarbonintensity intensity'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ukcarbonintensity generation'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'urantia toc'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'urantia paper'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'urantia paragraph'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'urantia search'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'usgsearthquake search'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'usgsearthquake event'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'usgswater instantaneous'),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'usgswater daily'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'usaspending awards'), true)
  assert.equal(list.operations.some(operation => operation.command === 'usaspending over-time'), true)
  assert.equal(list.operations.some(operation => operation.command === 'usaspending agencies'), true)
  assert.equal(list.operations.some(operation => operation.command === 'usweather point'), true)
  assert.equal(list.operations.some(operation => operation.command === 'usweather forecast'), true)
  assert.equal(list.operations.some(operation => operation.command === 'usercheck email'), true)
  assert.equal(list.operations.some(operation => operation.command === 'vatcomply rates'), true)
  assert.equal(list.operations.some(operation => operation.command === 'vatcomply vat-rates'), true)
  assert.equal(list.operations.some(operation => operation.command === 'vatcomply geolocate'), true)
  assert.equal(list.operations.some(operation => operation.command === 'vatcomply vat'), true)
  assert.equal(
    list.operations.some(operation => operation.command === 'vedicsociety words'),
    true,
  )
  assert.equal(
    list.operations.some(operation => {
      return operation.command === 'vedicsociety descriptions'
    }),
    true,
  )
  assert.equal(
    list.operations.some(operation => operation.command === 'vedicsociety category'),
    true,
  )
  assert.equal(list.operations.some(operation => operation.command === 'viacep lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'viacep search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'voidly incidents'), true)
  assert.equal(list.operations.some(operation => operation.command === 'velib stations'), true)
  assert.equal(list.operations.some(operation => operation.command === 'websitecarbon data'), true)
  assert.equal(list.operations.some(operation => operation.command === 'whiskyhunter distilleries'), true)
  assert.equal(list.operations.some(operation => operation.command === 'wiktionary search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'wiktionary extract'), true)
  assert.equal(list.operations.some(operation => operation.command === 'wolnelektury books'), true)
  assert.equal(list.operations.some(operation => operation.command === 'wolnelektury book'), true)
  assert.equal(list.operations.some(operation => operation.command === 'wolnelektury read'), true)
  assert.equal(list.operations.some(operation => operation.command === 'xcolors random'), true)
  assert.equal(list.operations.some(operation => operation.command === 'xcolors convert'), true)
  assert.equal(list.operations.some(operation => operation.command === 'zippopotam-us lookup'), true)
  assert.equal(list.operations.some(operation => operation.command === 'zippopotam-us search'), true)
  assert.equal(list.operations.some(operation => operation.command === 'ziptastic lookup'), true)
  assert.equal(list.operations[0]?.defaultFormat, 'text')

  const info = describePublicApiProvider('catfact.facts', defaultPublicApiRegistry)
  assert.equal(info.kind, 'publicApis.info')
  assert.equal(info.provider.id, 'catfact-ninja')
  assert.equal(info.endpoints[0]?.id, 'catfact-ninja-fact')
  const factsOperation = info.operations.find(operation => operation.id === 'catfact.facts')
  assert.ok(factsOperation)
  assert.equal(factsOperation.cli.exposedOptionCount, 3)
  const firstOption = factsOperation.cli.options[0]
  assert.ok(firstOption)
  assert.equal(firstOption.reason.length > 0, true)

  const commandAliasInfo = describePublicApiProvider('npmregistry', defaultPublicApiRegistry)
  assert.equal(commandAliasInfo.kind, 'publicApis.info')
  assert.equal(commandAliasInfo.provider.id, 'npm-registry')
  assert.equal(commandAliasInfo.operations.some(operation => operation.id === 'npmregistry.search'), true)
})

test('public API operation options require UX exposure metadata', () => {
  for (const operation of defaultPublicApiRegistry.operations) {
    for (const option of operation.options) {
      assert.match(option.flag, /^--/)
      assert.match(option.reason, /\S/)
      assert.ok(['primary', 'advanced', 'hidden'].includes(option.exposure))
      assert.ok(['authentication', 'query', 'filters', 'pagination', 'content', 'presentation', 'transport', 'debug'].includes(option.group))
    }
  }
})
