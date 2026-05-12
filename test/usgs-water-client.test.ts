import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getUsgsWaterDaily,
  getUsgsWaterInstantaneous,
  normalizeUsgsWaterDailyInput,
  normalizeUsgsWaterInstantaneousInput,
} from '../src/application/usecases/usgsWater.js'
import {
  UsgsWaterClient,
} from '../src/infrastructure/openApis/usgsWaterClient.js'

test('USGS Water client calls documented no-auth WaterML JSON endpoints', async () => {
  const requestedUrls: URL[] = []
  const client = new UsgsWaterClient({
    baseUrl: 'https://waterservices.usgs.example/nwis',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url)
      return jsonResponse(createWaterFixture(url))
    }) as typeof fetch,
  })

  const instantaneous = await client.instantaneous({
    site: '01646500',
    parameterCodes: ['00060', '00065'],
    period: 'P1D',
  })
  const daily = await client.daily({
    site: '01646500',
    parameterCodes: ['00060'],
    statisticCode: '00003',
    startDate: '2026-05-01',
    endDate: '2026-05-11',
  })

  assert.equal(requestedUrls[0]?.pathname, '/nwis/iv/')
  assert.equal(requestedUrls[0]?.searchParams.get('format'), 'json')
  assert.equal(requestedUrls[0]?.searchParams.get('sites'), '01646500')
  assert.equal(requestedUrls[0]?.searchParams.get('parameterCd'), '00060,00065')
  assert.equal(requestedUrls[0]?.searchParams.get('siteStatus'), 'all')
  assert.equal(requestedUrls[0]?.searchParams.get('period'), 'P1D')
  assert.equal(requestedUrls[1]?.pathname, '/nwis/dv/')
  assert.equal(requestedUrls[1]?.searchParams.get('statCd'), '00003')
  assert.equal(requestedUrls[1]?.searchParams.get('startDT'), '2026-05-01')
  assert.equal(requestedUrls[1]?.searchParams.get('endDT'), '2026-05-11')
  assert.equal(instantaneous.series[0]?.site.code, '01646500')
  assert.equal(instantaneous.series[0]?.variable.unit, 'ft3/s')
  assert.equal(instantaneous.series[0]?.readings[0]?.numericValue, 1340)
  assert.equal(instantaneous.series[0]?.qualifiers[0]?.code, 'P')
  assert.equal(daily.series[0]?.variable.statisticCode, '00003')
})

test('USGS Water usecases project bounded values without raw dumps', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(createWaterFixture(url))
  }) as typeof fetch

  try {
    const instantaneous = await getUsgsWaterInstantaneous({ limit: 1 })
    assert.equal(instantaneous.kind, 'usgswater.instantaneous')
    assert.equal(instantaneous.api.authentication, 'none')
    assert.equal(instantaneous.api.usesBrowserClickstream, false)
    assert.equal(instantaneous.query.site, '01646500')
    assert.equal(instantaneous.pagination.returnedValues, 1)
    assert.equal(instantaneous.series[0]?.readings.length, 1)
    assert.equal('timeSeries' in instantaneous, false)
    assert.equal('value' in instantaneous, false)

    const daily = await getUsgsWaterDaily({ limit: 2 })
    assert.equal(daily.kind, 'usgswater.daily')
    assert.equal(daily.query.statisticCode, '00003')
    assert.equal(daily.pagination.returnedValues, 2)
    assert.match(daily.api.boundary, /single site|one site/i)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('USGS Water normalizers enforce bounded curated parameters', () => {
  assert.deepEqual(normalizeUsgsWaterInstantaneousInput({}), {
    site: '01646500',
    parameterCodes: ['00060', '00065'],
    limit: 10,
  })
  assert.deepEqual(normalizeUsgsWaterDailyInput({}), {
    site: '01646500',
    parameterCodes: ['00060'],
    statisticCode: '00003',
    startDate: '2026-05-01',
    endDate: '2026-05-11',
    limit: 10,
  })
  assert.throws(
    () => normalizeUsgsWaterInstantaneousInput({ site: '../secret' }),
    /site/,
  )
  assert.throws(
    () => normalizeUsgsWaterInstantaneousInput({
      parameterCodes: '00001,00002,00003,00004,00005,00006',
    }),
    /parameter-codes/,
  )
  assert.throws(
    () => normalizeUsgsWaterInstantaneousInput({ parameterCodes: 'abcde' }),
    /parameter-codes/,
  )
  assert.throws(
    () => normalizeUsgsWaterInstantaneousInput({ period: 'P1Y' }),
    /period/,
  )
  assert.throws(
    () => normalizeUsgsWaterInstantaneousInput({ limit: 51 }),
    /limit/,
  )
  assert.throws(
    () => normalizeUsgsWaterDailyInput({
      startDate: '2026-05-11',
      endDate: '2026-05-01',
    }),
    /start-date/,
  )
  assert.throws(
    () => normalizeUsgsWaterDailyInput({
      startDate: '2026-04-01',
      endDate: '2026-05-11',
    }),
    /31 days/,
  )
})

test('USGS Water client surfaces challenge HTML clearly', async () => {
  const client = new UsgsWaterClient({
    baseUrl: 'https://waterservices.usgs.example/nwis',
    fetchImpl: (async () => new Response(
      '<!DOCTYPE html><title>Just a moment...</title>',
      {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      },
    )) as typeof fetch,
  })

  await assert.rejects(
    () => client.instantaneous({
      site: '01646500',
      parameterCodes: ['00060'],
    }),
    /challenge HTML page/u,
  )
})

function createWaterFixture(url: URL): Record<string, unknown> {
  return {
    declaredType: 'org.cuahsi.waterml.TimeSeriesResponseType',
    value: {
      queryInfo: {
        queryURL: url.toString(),
      },
      timeSeries: [createWaterSeriesFixture()],
    },
  }
}

function createWaterSeriesFixture(): Record<string, unknown> {
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

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
