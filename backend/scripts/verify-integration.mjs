// Verification only: the inline provider fixtures below are never wired into server.ts.
// Run after npm run build: node scripts/verify-integration.mjs
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { DateTime } from 'luxon';
import { createApp } from '../dist/app.js';
import { assessmentResponseSchema, weatherResponseSchema } from '../dist/schemas/shared.schema.js';
import { protectionPlanSchema } from '../dist/schemas/protection.schema.js';

const exampleDirectory = new URL('../examples/integration/', import.meta.url);
const generatedAt = new Date();
const base = JSON.parse(await readFile(new URL('../examples/heatlab.json', import.meta.url), 'utf8'));
const commonWeather = { temperatureC: 35, humidityPercent: 50, windSpeedKmh: 5 };
const scenarios = {
  heavy: { ...base, weatherOverride: { ...commonWeather } },
  lower: {
    profile: {
      ...base.profile, occupation: 'STREET_VENDOR', workload: 'LIGHT', environment: 'PARTIAL_SHADE',
      waterAccess: 'AVAILABLE', shadeAccess: 'AVAILABLE', scheduleFlexibility: 'FLEXIBLE',
    },
    weatherOverride: { ...commonWeather },
  },
};

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address();
    assert(address && typeof address === 'object');
    const url = `http://127.0.0.1:${address.port}`;
    async function send(path, body) {
      const response = await fetch(`${url}${path}`, {
        ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(5000),
      });
      return { status: response.status, body: await response.json(), requestId: response.headers.get('x-request-id') };
    }
    return await callback(send, url);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

const captured = {};
const checks = [];
await withServer(createApp(), async (send, url) => {
  const health = await send('/api/v1/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: 'UP', application: 'SunShield', version: '1.0.0' });
  captured.health = health.body;
  checks.push({ check: 'health without provider/database', status: health.status });

  for (const [name, input] of Object.entries(scenarios)) {
    const result = await send('/api/v1/simulation/evaluate', input);
    assert.equal(result.status, 200);
    assessmentResponseSchema.parse(result.body);
    assert.equal(result.body.dataMode, 'SIMULATION');
    captured[name] = result.body;
    checks.push({ check: `${name} HeatLab over HTTP`, status: result.status, dataMode: result.body.dataMode, advisoryLevel: result.body.assessment.advisoryLevel });
  }
  assert.deepEqual(captured.heavy.assessment.environmentalIndicators, captured.lower.assessment.environmentalIndicators);
  assert.notEqual(captured.heavy.assessment.advisoryLevel, captured.lower.assessment.advisoryLevel);

  for (const path of ['/api/v1/heat/assess', '/api/v1/protection/plan']) {
    const result = await send(path, { profile: base.profile });
    assert.equal(result.status, 503);
    assert.equal(result.body.error.code, 'WEATHER_PROVIDER_UNAVAILABLE');
    assert.equal(result.body.error.requestId, result.requestId);
    checks.push({ check: `${path} without provider`, status: result.status, code: result.body.error.code });
  }
  const invalid = await send('/api/v1/simulation/evaluate', { profile: {} });
  assert.equal(invalid.status, 422);
  checks.push({ check: 'invalid scenario validation', status: invalid.status });
  const spec = await send('/openapi.json');
  assert.equal(spec.status, 200);
  const docs = await fetch(`${url}/docs/`, { signal: AbortSignal.timeout(5000) });
  assert.equal(docs.status, 200);
  await docs.text();
  checks.push({ check: 'OpenAPI and Swagger', status: 200 });
});

function providerFixture(dataMode) {
  const day = DateTime.fromJSDate(generatedAt, { zone: base.profile.location.timezone }).startOf('day');
  return {
    dataMode, source: 'INTEGRATION_FIXTURE_NOT_LIVE', timezone: base.profile.location.timezone,
    fetchedAt: generatedAt.toISOString(), current: { ...commonWeather, observedAt: generatedAt.toISOString() },
    hourly: Array.from({ length: 24 }, (_, hour) => ({ ...commonWeather, time: day.plus({ hours: hour }).toISO() })),
  };
}

for (const mode of ['LIVE', 'CACHED']) {
  const fixture = weatherResponseSchema.parse(providerFixture(mode));
  let calls = 0;
  const app = createApp({ now: () => generatedAt, weatherProvider: { getWeather: async () => { calls++; return fixture; } } });
  await withServer(app, async send => {
    const result = await send('/api/v1/heat/assess', { profile: base.profile });
    assert.equal(result.status, 200);
    assessmentResponseSchema.parse(result.body);
    assert.equal(result.body.dataMode, mode);
    assert.equal(result.body.assessment.limitations.includes('CACHED_WEATHER'), mode === 'CACHED');
    const plan = await send('/api/v1/protection/plan', { profile: { ...base.profile, workStart: '09:15', workEnd: '11:45' } });
    assert.equal(plan.status, 200);
    protectionPlanSchema.parse(plan.body);
    assert.equal(plan.body.timeline.length, 3);
    assert(plan.body.timeline.every(period => period.availability === 'AVAILABLE'));
    const callsBefore = calls;
    await send('/api/v1/simulation/evaluate', scenarios.heavy);
    assert.equal(calls, callsBefore);
    checks.push({ check: `${mode} injected contract fixture: assessment, partial-hour plan, simulation isolation`, status: 200, realWeatherVerified: false });
  });
}

const stale = providerFixture('CACHED');
stale.current.observedAt = new Date(generatedAt.getTime() - 3_600_001).toISOString();
await withServer(createApp({ now: () => generatedAt, weatherProvider: { getWeather: async () => stale } }), async send => {
  const result = await send('/api/v1/heat/assess', { profile: base.profile });
  assert.equal(result.status, 200);
  assert.equal(result.body.assessment.advisoryLevel, 'UNKNOWN');
  assert(result.body.assessment.limitations.includes('STALE_WEATHER'));
  checks.push({ check: 'stale cached contract fixture', status: 200, advisoryLevel: 'UNKNOWN', realWeatherVerified: false });
});

await withServer(createApp({ weatherProvider: { getWeather: async () => { throw new Error('PRIVATE_UPSTREAM_DETAIL'); } } }), async send => {
  for (const path of ['/api/v1/heat/assess', '/api/v1/protection/plan']) {
    const result = await send(path, { profile: base.profile });
    assert.equal(result.status, 503);
    assert.equal(result.body.error.code, 'WEATHER_UNAVAILABLE');
    assert(!JSON.stringify(result.body).includes('PRIVATE_UPSTREAM_DETAIL'));
  }
  const simulation = await send('/api/v1/simulation/evaluate', scenarios.lower);
  assert.equal(simulation.status, 200);
  checks.push({ check: 'throwing contract fixture: sanitized 503s; HeatLab remains available', status: 200, realWeatherVerified: false });
});

// Save only after every verification has passed, so examples cannot imply a failed run succeeded.
await mkdir(exampleDirectory, { recursive: true });
const save = (name, value) => writeFile(new URL(name, exampleDirectory), JSON.stringify(value, null, 2) + '\n');
for (const [name, input] of Object.entries(scenarios)) {
  await save(`heatlab-${name}.request.json`, input);
  await save(`heatlab-${name}.response.json`, captured[name]);
}
await save('health.response.json', captured.health);
await save('verification.json', {
  generatedAt: generatedAt.toISOString(),
  execution: 'Compiled Express application over loopback HTTP; no external weather or database calls',
  realWeatherIntegrationVerified: false, commonSimulatedWeather: commonWeather, checks,
});
console.log(JSON.stringify({ examples: fileURLToPath(exampleDirectory), checksPassed: checks.length,
  scenarios: Object.fromEntries(Object.entries(captured).filter(([name]) => name !== 'health').map(([name, result]) => [name, {
    dataMode: result.dataMode, advisoryLevel: result.assessment.advisoryLevel,
    indicators: result.assessment.environmentalIndicators, recommendationCodes: result.assessment.recommendations.map(r => r.code),
  }])) }, null, 2));
