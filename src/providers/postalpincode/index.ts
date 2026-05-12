import { z } from 'zod'
import {
  lookupPostalPinCodePincode,
  lookupPostalPinCodePostOffice,
  type PostalPinCodePincodeInput,
  type PostalPinCodePostOfficeInput,
} from '../../application/usecases/postalPinCode.js'
import {
  POSTAL_PIN_CODE_DEFAULT_LIMIT,
  POSTAL_PIN_CODE_DEFAULT_PINCODE,
  POSTAL_PIN_CODE_DEFAULT_POST_OFFICE,
  normalizePostalPinCodePincodeInput,
  normalizePostalPinCodePostOfficeInput,
} from '../../infrastructure/openApis/postalPinCodeClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const pincodeParamsSchema = z.object({
  pincode: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<PostalPinCodePincodeInput>

const postOfficeParamsSchema = z.object({
  name: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<PostalPinCodePostOfficeInput>

const pincodeOperation: PublicApiOperationDefinition<PostalPinCodePincodeInput> = {
  id: 'postalpincode.pincode',
  providerId: 'postalpincode',
  name: 'Lookup PIN Code',
  commandPath: ['postalpincode', 'pincode'],
  rpcMethod: 'postalpincode.pincode',
  description: 'Lookup Indian post offices by six-digit Postal PIN Code.',
  category: 'tracking',
  options: [
    {
      name: 'pincode',
      flag: '--pincode <digits>',
      description: `Six-digit PIN code, default ${POSTAL_PIN_CODE_DEFAULT_PINCODE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented /pincode/{PINCODE} endpoint is keyed by a six-digit Indian Postal PIN Code.',
      defaultValue: POSTAL_PIN_CODE_DEFAULT_PINCODE,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Post offices to show/cache, default ${POSTAL_PIN_CODE_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The upstream endpoint has no pagination parameter; CLI locally caps result size to keep terminal output and persisted payloads bounded.',
      valueType: 'integer',
      defaultValue: String(POSTAL_PIN_CODE_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: pincodeParamsSchema,
  execute: params => lookupPostalPinCodePincode(params),
  normalizeParams: params => normalizePostalPinCodePincodeInput(pincodeParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizePostalPinCodePincodeInput(params),
  resultKind: 'postalpincode.pincode',
  defaultFormat: 'text',
}

const postOfficeOperation: PublicApiOperationDefinition<PostalPinCodePostOfficeInput> = {
  id: 'postalpincode.postOffice',
  providerId: 'postalpincode',
  name: 'Lookup Post Office',
  commandPath: ['postalpincode', 'post-office'],
  rpcMethod: 'postalpincode.postOffice',
  description: 'Lookup Indian postal PIN code records by post office branch name.',
  category: 'tracking',
  options: [
    {
      name: 'name',
      flag: '--name <text>',
      description: `Post office branch name, default ${POSTAL_PIN_CODE_DEFAULT_POST_OFFICE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented /postoffice/{POSTOFFICEBRANCHNAME} endpoint is keyed by branch name.',
      defaultValue: POSTAL_PIN_CODE_DEFAULT_POST_OFFICE,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Post offices to show/cache, default ${POSTAL_PIN_CODE_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Broad branch-name searches can return very large result sets, so CLI enforces a local output/persistence cap.',
      valueType: 'integer',
      defaultValue: String(POSTAL_PIN_CODE_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: postOfficeParamsSchema,
  execute: params => lookupPostalPinCodePostOffice(params),
  normalizeParams: params => normalizePostalPinCodePostOfficeInput(postOfficeParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizePostalPinCodePostOfficeInput(params),
  resultKind: 'postalpincode.postOffice',
  defaultFormat: 'text',
}

export const postalPinCodeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'postalpincode',
    name: 'PostalPinCode',
    description: 'No-auth JSON API for Indian Postal PIN Code and post office branch lookups.',
    publicApisCategory: 'Tracking',
    homepageUrl: 'http://www.postalpincode.in/Api-Details',
    docsUrl: 'http://www.postalpincode.in/Api-Details',
    auth: {
      mode: 'none',
      notes: ['The documented api.postalpincode.in endpoints return JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['tracking', 'india', 'postal-code', 'pincode', 'post-office', 'no-auth', 'json'],
    freePlanNotes: [
      'Official docs list GET https://api.postalpincode.in/pincode/{PINCODE} and GET https://api.postalpincode.in/postoffice/{POSTOFFICEBRANCHNAME}.',
      'The listed docs page is HTTP/HTML, but the documented API host supports HTTPS JSON.',
      'The upstream API has no pagination parameter; CLI locally caps displayed and cached records.',
    ],
  },
  operations: [pincodeOperation, postOfficeOperation],
  endpoints: [
    {
      id: 'postalpincode-pincode',
      method: 'GET',
      urlPattern: 'https://api.postalpincode.in/pincode/*',
      category: 'public-apis:tracking',
      evidenceStatus: 'confirmed',
      description: 'PostalPinCode no-auth JSON lookup by Indian Postal PIN Code.',
      observedOn: '2026-05-09',
      sampleSources: ['http://www.postalpincode.in/Api-Details', 'https://api.postalpincode.in/pincode/110001'],
      consumedBy: ['public-apis apis run postalpincode.pincode'],
      notes: ['No authentication required; returns Status, Message, and PostOffice JSON fields.', 'No Chrome clickstream or HTML scraping is used.'],
    },
    {
      id: 'postalpincode-postoffice',
      method: 'GET',
      urlPattern: 'https://api.postalpincode.in/postoffice/*',
      category: 'public-apis:tracking',
      evidenceStatus: 'confirmed',
      description: 'PostalPinCode no-auth JSON lookup by Indian post office branch name.',
      observedOn: '2026-05-09',
      sampleSources: ['http://www.postalpincode.in/Api-Details', 'https://api.postalpincode.in/postoffice/Connaught%20Place'],
      consumedBy: ['public-apis apis run postalpincode.postOffice'],
      notes: ['No authentication required; branch-name searches can be broad, so CLI enforces local limits.', 'No Chrome clickstream or HTML scraping is used.'],
    },
  ],
}
