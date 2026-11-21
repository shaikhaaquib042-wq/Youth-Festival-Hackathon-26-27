import { z } from 'zod';
import { heatRequestSchema } from '../schemas/heat.schema.js';
import { simulationRequestSchema } from '../schemas/simulation.schema.js';
import { protectionRequestSchema, protectionPlanSchema } from '../schemas/protection.schema.js';
import { assessmentResponseSchema, apiErrorSchema, weatherResponseSchema } from '../schemas/shared.schema.js';
import { submissionSchema, reportSchema } from '../../../dist/src/routes/safezone.routes.js';
const json = (schema: z.ZodType) => ({ 'application/json': { schema: z.toJSONSchema(schema) } });
const errorResponse = { description: 'Standardized error; requestId matches X-Request-Id', content: json(apiErrorSchema) };
function post(summary: string, input: z.ZodType, output: z.ZodType) {
  return {
    summary,
    requestBody: { required: true, content: json(input) },
    responses: {
      '200': { description: 'Explainable prototype advisory', content: json(output) },
      ...Object.fromEntries(['400', '413', '415', '422', '429', '500', '503'].map(code => [code, errorResponse])),
    },
  };
}
export const openapi = {
  openapi: '3.1.0',
  info: { title: 'SunShield API', version: '1.0.0', description: 'Prototype occupational heat guidance. Not medically validated. Never permission to continue working.' },
  servers: [{ url: '/' }],
  paths: {
    '/api/v1/health': { get: { summary: 'Application availability (no database required)', responses: {
      '200': { description: 'Application available', content: json(z.object({ status: z.literal('UP'), application: z.literal('SunShield'), version: z.literal('1.0.0') })) },
    } } },
    '/api/v1/heat/assess': { post: post('Assess the profile using the injected live weather provider', heatRequestSchema, assessmentResponseSchema) },
    '/api/v1/protection/plan': { post: post('Build the current local workday timeline; same-day schedules only', protectionRequestSchema, protectionPlanSchema) },
    '/api/v1/simulation/evaluate': { post: post('Evaluate independent HeatLab scenario without fetching or persisting weather', simulationRequestSchema, assessmentResponseSchema) },
    '/api/v1/weather': { get: {
      summary: 'Normalized current and hourly Open-Meteo weather; cached reads retain original timestamps',
      parameters: [
        { name: 'latitude', in: 'query', required: true, schema: { type: 'number', minimum: -90, maximum: 90 } },
        { name: 'longitude', in: 'query', required: true, schema: { type: 'number', minimum: -180, maximum: 180 } },
      ],
      responses: { '200': { description: 'Weather observations and forecast, not a work-clearance advisory', content: json(weatherResponseSchema) },
        ...Object.fromEntries(['422', '429', '500', '503'].map(code => [code, errorResponse])) },
    } },
    '/api/v1/safe-zones': {
      get: { summary: 'Discover non-rejected resources within an approximate straight-line radius; DEMO excluded by default',
        parameters: [
          { name: 'latitude', in: 'query', required: true, schema: { type: 'number', minimum: -90, maximum: 90 } },
          { name: 'longitude', in: 'query', required: true, schema: { type: 'number', minimum: -180, maximum: 180 } },
          { name: 'radiusKm', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100, default: 5 } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['DRINKING_WATER','SHADED_REST_AREA','COOLING_CENTER','COMMUNITY_SHOP','MEDICAL_FACILITY'] } },
          { name: 'availabilityStatus', in: 'query', schema: { type: 'string', enum: ['AVAILABLE','LIMITED','UNAVAILABLE','UNKNOWN'] } },
          { name: 'includeDemo', in: 'query', schema: { type: 'boolean', default: false } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 100 } },
        ], responses: { '200': { description: 'distanceMethod STRAIGHT_LINE and facilities array; may be empty; status is never inferred' }, '422': errorResponse, '429': errorResponse, '503': errorResponse } },
      post: { summary: 'Suggest a PENDING/UNKNOWN facility; disabled by default until authorized', requestBody: { required: true, content: json(submissionSchema) }, responses: { '201': { description: 'Pending, unverified suggestion' }, '422': errorResponse, '429': errorResponse, '503': errorResponse } },
    },
    '/api/v1/safe-zones/{id}': { get: { summary: 'Read a non-rejected facility; DEMO remains labelled DEMO', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'Facility detail with original verification/availability metadata' }, '404': errorResponse, '422': errorResponse, '503': errorResponse } } },
    '/api/v1/safe-zones/{id}/reports': { post: { summary: 'Record a community report without verifying a facility; disabled by default', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], requestBody: { required: true, content: json(reportSchema) }, responses: { '201': { description: 'Report recorded; verification is unchanged' }, '404': errorResponse, '422': errorResponse, '429': errorResponse, '503': errorResponse } } },
  },
};
