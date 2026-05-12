import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeNhtsaVin, getNhtsaMakesForVehicleType } from '../src/application/usecases/nhtsa.js'
import { NhtsaClient, normalizeNhtsaDecodeVinInput, normalizeNhtsaMakesForTypeInput } from '../src/infrastructure/openApis/nhtsaClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('NHTSA client reads VIN decode and makes for vehicle type', async () => {
  const client = new NhtsaClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.searchParams.get('format'), 'json')
      if (url.pathname.includes('/DecodeVinValues/')) {
        assert.equal(url.searchParams.get('modelyear'), '2003')
        return jsonResponse(createDecodeFixture())
      }
      assert.equal(url.pathname.endsWith('/GetMakesForVehicleType/car'), true)
      return jsonResponse(createMakesFixture())
    }) as typeof fetch,
  })

  const decode = await client.decodeVin({ vin: '1HGCM82633A004352', modelYear: 2003 })
  assert.equal(decode.results[0]?.make, 'HONDA')
  assert.equal(decode.count, 1)

  const makes = await client.getMakesForVehicleType({ vehicleType: 'car', limit: 1 })
  assert.equal(makes.results.length, 1)
  assert.equal(makes.results[0]?.makeName, 'ASTON MARTIN')
})

test('NHTSA usecases project TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(url.pathname.includes('/DecodeVinValues/') ? createDecodeFixture() : createMakesFixture())
  }) as typeof fetch

  try {
    const decode = await decodeNhtsaVin({ vin: '1hgcm82633a004352', modelYear: 2003 })
    assert.equal(decode.kind, 'nhtsa.decodeVin')
    assert.equal(decode.api.authentication, 'none')
    assert.equal(decode.api.usesBrowserClickstream, false)
    assert.equal(decode.query.vin, '1HGCM82633A004352')
    assert.equal(decode.decode?.model, 'Accord')

    const makes = await getNhtsaMakesForVehicleType({ vehicleType: 'car', limit: 2 })
    assert.equal(makes.kind, 'nhtsa.makesForType')
    assert.equal(makes.api.authentication, 'none')
    assert.equal(makes.api.usesBrowserClickstream, false)
    assert.equal(makes.pagination.returned, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('NHTSA normalizers enforce VIN, year, and limit bounds', () => {
  assert.deepEqual(normalizeNhtsaDecodeVinInput({}), { vin: '1HGCM82633A004352', modelYear: 2003 })
  assert.deepEqual(normalizeNhtsaMakesForTypeInput({}), { vehicleType: 'car', limit: 200 })
  assert.throws(() => normalizeNhtsaDecodeVinInput({ vin: 'IOQ' }), RuntimeFailure)
  assert.throws(() => normalizeNhtsaDecodeVinInput({ vin: '   ' }), RuntimeFailure)
  assert.throws(() => normalizeNhtsaDecodeVinInput({ modelYear: 1800 }), RuntimeFailure)
  assert.throws(() => normalizeNhtsaMakesForTypeInput({ vehicleType: '   ' }), RuntimeFailure)
  assert.throws(() => normalizeNhtsaMakesForTypeInput({ limit: 501 }), RuntimeFailure)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function createDecodeFixture(): Record<string, unknown> {
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
        Trim: 'EX-V6',
        VehicleType: 'PASSENGER CAR',
        BodyClass: 'Sedan/Saloon',
        Doors: '4',
        DriveType: '4x2',
        EngineModel: 'J30A4',
        FuelTypePrimary: 'Gasoline',
        PlantCountry: 'UNITED STATES (USA)',
        Manufacturer: 'AMERICAN HONDA MOTOR CO., INC.',
        ErrorCode: '0',
        ErrorText: '0 - VIN decoded clean.',
      },
    ],
  }
}

function createMakesFixture(): Record<string, unknown> {
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
