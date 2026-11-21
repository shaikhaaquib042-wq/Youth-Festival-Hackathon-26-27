import { describe, expect, it, vi } from 'vitest';
import { apiRequest, apiUrl, mockMode } from '../src/services/client';
import { healthSchema } from '../src/schemas/contracts';
import { constructionScenario, demoConditions } from '../src/constants/options';
import { evaluateSimulation, assessmentOptions, weatherOptions } from '../src/services/queries';
import heavy from '../../backend/examples/integration/heatlab-heavy.response.json';
describe('central API client', () => {
  it('normalizes API paths without doubling the prefix', () => {
    expect(apiUrl('/api/v1/health', 'http://localhost:8000/api/v1/')).toBe(
      'http://localhost:8000/api/v1/health',
    );
    expect(apiUrl('/health', 'http://localhost:8000')).toBe('http://localhost:8000/api/v1/health');
  });
  it('sends the exact simulation body and validates the actual response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(heavy)));
    vi.stubGlobal('fetch', fetcher);
    const result = await evaluateSimulation(constructionScenario, demoConditions);
    const init = fetcher.mock.calls[0][1];
    expect(JSON.parse(init.body)).toEqual({
      profile: constructionScenario,
      weatherOverride: demoConditions,
    });
    expect(result.assessment.advisoryLevel).toBe('CRITICAL');
  });
  it('rejects invalid response rather than casting it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    await expect(apiRequest('/health', healthSchema)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
  it('hides malicious server messages and preserves request reference', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { message: '<img onerror=evil>', requestId: 'req-test' } }),
            { status: 503 },
          ),
        ),
    );
    await expect(apiRequest('/health', healthSchema)).rejects.toMatchObject({
      code: 'HTTP_503',
      requestId: 'req-test',
    });
  });
  it('handles request cancellation without a fallback response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            if (init.signal.aborted) reject(new Error('abort'));
            else init.signal.addEventListener('abort', () => reject(new Error('abort')));
          }),
      ),
    );
    const controller = new AbortController();
    const promise = apiRequest('/health', healthSchema, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: 'REQUEST_CANCELLED' });
  });
  it('handles timeout as a typed error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, init) =>
          new Promise((_resolve, reject) =>
            init.signal.addEventListener('abort', () => reject(new Error('timeout'))),
          ),
      ),
    );
    await expect(apiRequest('/health', healthSchema, { timeoutMs: 1 })).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
    });
  });
  it('defaults to API and isolates explicit mock mode', async () => {
    expect(mockMode()).toBe(false);
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(evaluateSimulation(constructionScenario, demoConditions)).rejects.toMatchObject({
      code: 'DEMO_NO_ENGINE',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keys weather and assessments by changed location and working conditions', () => {
    const changed = {
      ...constructionScenario,
      location: { ...constructionScenario.location, latitude: 19 },
    };
    expect(assessmentOptions(changed).queryKey).not.toEqual(
      assessmentOptions(constructionScenario).queryKey,
    );
    expect(weatherOptions(changed.location).queryKey).not.toEqual(
      weatherOptions(constructionScenario.location).queryKey,
    );
  });
});
