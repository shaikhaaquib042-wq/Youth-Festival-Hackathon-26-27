import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest, ApiError, mockMode } from './client';
import {
  assessmentResponseSchema,
  conditionsSchema,
  facilitiesSchema,
  facilityDetailSchema,
  healthSchema,
  locationSchema,
  protectionSchema,
  reportInputSchema,
  reportResponseSchema,
  simulationRequestSchema,
  submissionSchema,
  weatherSchema,
  workerSchema,
} from '../schemas/contracts';
import type { Conditions, Location, WorkerProfile, Submission } from '../schemas/contracts';
import type { RequestOptions } from './client';

function requireApi() {
  if (mockMode()) throw new ApiError('DEMO_NO_ENGINE');
}
export const healthOptions = () =>
  queryOptions({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiRequest('/health', healthSchema, { signal }),
    staleTime: 30_000,
  });
export const weatherOptions = (location: Location) =>
  queryOptions({
    queryKey: ['weather', location],
    queryFn: async ({ signal }) => {
      locationSchema.parse(location);
      if (mockMode()) {
        const { demoWeather } = await import('../mocks/demo');
        return weatherSchema.parse(demoWeather);
      }
      return apiRequest(
        `/weather?${new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude) })}`,
        weatherSchema,
        { signal },
      );
    },
  });
export const assessmentOptions = (profile: WorkerProfile) =>
  queryOptions({
    queryKey: ['assessment', profile],
    queryFn: ({ signal }) => {
      requireApi();
      return apiRequest('/heat/assess', assessmentResponseSchema, {
        signal,
        body: { profile: workerSchema.parse(profile) },
      });
    },
  });
export const protectionOptions = (profile: WorkerProfile) =>
  queryOptions({
    queryKey: ['protection', profile],
    queryFn: ({ signal }) => {
      requireApi();
      return apiRequest('/protection/plan', protectionSchema, {
        signal,
        body: { profile: workerSchema.parse(profile) },
      });
    },
  });
export interface FacilityQuery {
  location: Location;
  radiusKm: number;
  category?: string;
  includeDemo: boolean;
}
export const facilitiesOptions = (query: FacilityQuery) =>
  queryOptions({
    queryKey: ['facilities', query],
    queryFn: async ({ signal }) => {
      locationSchema.parse(query.location);
      if (mockMode()) {
        const { demoFacilities } = await import('../mocks/demo');
        return facilitiesSchema.parse({
          distanceMethod: 'STRAIGHT_LINE',
          facilities: query.includeDemo ? demoFacilities : [],
        });
      }
      const params = new URLSearchParams({
        latitude: String(query.location.latitude),
        longitude: String(query.location.longitude),
        radiusKm: String(query.radiusKm),
        includeDemo: String(query.includeDemo),
      });
      if (query.category) params.set('category', query.category);
      return apiRequest(`/safe-zones?${params}`, facilitiesSchema, { signal });
    },
  });
export const facilityOptions = (id: string) =>
  queryOptions({
    queryKey: ['facility', id],
    queryFn: ({ signal }) => {
      z.uuid().parse(id);
      requireApi();
      return apiRequest(`/safe-zones/${encodeURIComponent(id)}`, facilityDetailSchema, { signal });
    },
  });
export async function evaluateSimulation(
  profile: WorkerProfile,
  conditions: Conditions,
  options: RequestOptions = {},
) {
  requireApi();
  const body = simulationRequestSchema.parse({
    profile,
    weatherOverride: conditionsSchema.parse(conditions),
  });
  const result = await apiRequest('/simulation/evaluate', assessmentResponseSchema, {
    ...options,
    body,
  });
  if (result.dataMode !== 'SIMULATION') throw new ApiError('INVALID_RESPONSE');
  return result;
}
export function submitFacility(input: Submission) {
  requireApi();
  return apiRequest('/safe-zones', facilityDetailSchema, {
    body: submissionSchema.parse(input),
  }).then((result) => {
    if (result.verificationStatus !== 'PENDING') throw new ApiError('INVALID_RESPONSE');
    return result;
  });
}
export function reportFacility(id: string, input: z.infer<typeof reportInputSchema>) {
  requireApi();
  z.uuid().parse(id);
  return apiRequest(`/safe-zones/${encodeURIComponent(id)}/reports`, reportResponseSchema, {
    body: reportInputSchema.parse(input),
  });
}
