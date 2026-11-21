import { expect, test } from '@playwright/test';
import { constructionScenario } from '../src/constants/options';
import { demoFacilities, demoWeather } from '../src/mocks/demo';
import en from '../src/locales/en.json' with { type: 'json' };

test('employer draft review stays explicitly uncalculated and sends no enterprise request', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/v1/enterprise')) requests.push(request.url());
  });
  await page.goto('/enterprise/dashboard');
  await page.locator('main a[href="/enterprise/planner"]').last().click();
  await page.getByLabel(en['field.worksite'], { exact: true }).fill('Acceptance worksite');
  await page.getByLabel(en['field.workforce'], { exact: true }).fill('12');
  await page.getByLabel(en['field.workload'], { exact: true }).selectOption('MODERATE');
  await page.getByLabel(en['field.waterAccess'], { exact: true }).selectOption('AVAILABLE');
  await page.getByLabel(en['field.shadeAccess'], { exact: true }).selectOption('LIMITED');
  await page.getByRole('button', { name: en['ui.review'], exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Acceptance worksite');
  await expect(page.getByRole('status')).toContainText(en['page.draftNotice']);
  expect(requests).toEqual([]);
});

test('community submission validates fields and only accepts PENDING fixture confirmation', async ({
  page,
}) => {
  let body: Record<string, unknown> | undefined;
  await page.route('**/api/v1/safe-zones', (route) => {
    body = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      json: { ...demoFacilities[0], ...body, verificationStatus: 'PENDING', lastVerifiedAt: null },
    });
  });
  await page.goto('/safe-zones/add');
  await page.getByRole('button', { name: en['zones.submit'], exact: true }).click();
  expect(body).toBeUndefined();
  await page.getByLabel(en['field.name'], { exact: true }).fill('Acceptance fixture only');
  await page.getByLabel(en['field.address'], { exact: true }).fill('Test address');
  await page.getByLabel(en['field.category'], { exact: true }).selectOption('SHADED_REST_AREA');
  await page.getByLabel(en['field.latitude'], { exact: true }).fill('18.52');
  await page.getByLabel(en['field.longitude'], { exact: true }).fill('73.85');
  await page.getByLabel(en['field.openingHours'], { exact: true }).fill('09:00–18:00');
  await page.getByLabel(en['field.shadeAccess'], { exact: true }).check();
  await page.getByLabel(en['field.seating'], { exact: true }).check();
  await page.getByRole('button', { name: en['zones.submit'], exact: true }).click();
  await expect(page.getByText(en['ui.confirmPending'], { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: en['zones.submit'], exact: true })).toBeDisabled();
  expect(body).toMatchObject({
    name: 'Acceptance fixture only',
    category: 'SHADED_REST_AREA',
    shadeAvailable: true,
    seatingAvailable: true,
  });
  expect(body).not.toHaveProperty('verificationStatus');
});

test('Safe Zone controls, map popup, details and report feedback use explicit UI fixtures', async ({
  page,
}) => {
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  const facility = {
    ...demoFacilities[0],
    distanceKm: 0.3,
    verificationStatus: 'VERIFIED',
    lastVerifiedAt: '2026-11-21T09:00:00Z',
    address: 'Acceptance fixture address',
    seatingAvailable: true,
    openingHours: '09:00–18:00',
    availabilityStatus: 'UNKNOWN',
  };
  const queries: URLSearchParams[] = [];
  await page.route('**/api/v1/safe-zones?**', (route) => {
    queries.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ json: { distanceMethod: 'STRAIGHT_LINE', facilities: [facility] } });
  });
  await page.route(`**/api/v1/safe-zones/${facility.id}`, (route) =>
    route.fulfill({ json: facility }),
  );
  let report: unknown;
  await page.route(`**/api/v1/safe-zones/${facility.id}/reports`, async (route) => {
    report = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      json: {
        id: 'a1000000-0000-4000-8000-000000000002',
        safeZoneId: facility.id,
        availabilityStatus: 'LIMITED',
        comment: 'Acceptance fixture only',
        createdAt: '2026-11-21T09:00:00Z',
      },
    });
  });
  await page.goto('/safe-zones');
  await expect(page.getByRole('heading', { name: facility.name, exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('not a matching facility');
  await expect(page.getByText(en['ui.noMatches'], { exact: true })).toBeVisible();
  await page.getByRole('button', { name: en['ui.clear'], exact: true }).click();
  await page.getByLabel(en['field.radius'], { exact: true }).fill('0');
  await expect(page.getByText(en['ui.noMatches'], { exact: true })).toBeVisible();
  await page.getByLabel(en['field.radius'], { exact: true }).fill('5');
  await page.getByLabel(en['field.category'], { exact: true }).selectOption('COOLING_CENTER');
  await expect(page.getByText(en['ui.noMatches'], { exact: true })).toBeVisible();
  await page.getByLabel(en['field.category'], { exact: true }).selectOption('DRINKING_WATER');
  await page.getByLabel(en['field.verification'], { exact: true }).selectOption('PENDING');
  await expect(page.getByText(en['ui.noMatches'], { exact: true })).toBeVisible();
  await page.getByLabel(en['field.verification'], { exact: true }).selectOption('VERIFIED');
  await page.getByLabel(en['zones.demoInclude'], { exact: true }).check();
  await expect.poll(() => queries.some((query) => query.get('includeDemo') === 'true')).toBe(true);
  await page.getByLabel(en['field.availableOnly'], { exact: true }).check();
  await expect(page.locator('.empty')).toHaveText(en['zones.unsupportedAvailability']);
  await page.getByLabel(en['field.availableOnly'], { exact: true }).uncheck();
  await page.locator('.leaflet-control-zoom-in').click();
  await page.locator('.leaflet-control-zoom-out').click();
  await page.locator('.leaflet-interactive').first().click();
  await expect(page.locator('.leaflet-popup')).toContainText(facility.name);
  await page.locator('.leaflet-popup-close-button').click();
  const directions = page.getByRole('link', { name: en['zones.directions'], exact: true });
  await expect(directions).toHaveAttribute(
    'href',
    /https:\/\/www\.openstreetmap\.org\/directions\?/,
  );
  await expect(directions).toHaveAttribute('rel', 'noopener noreferrer');
  await page.getByRole('button', { name: en['ui.details'], exact: true }).click();
  await expect(page.getByText(facility.address, { exact: true })).toBeVisible();
  await page.getByLabel(en['field.availability'], { exact: true }).selectOption('LIMITED');
  await page.getByLabel(en['field.comment'], { exact: true }).fill('Acceptance fixture only');
  await page.getByRole('button', { name: en['zones.report'], exact: true }).click();
  await expect(page.getByText(en['ui.reportSaved'], { exact: true })).toBeVisible();
  expect(report).toEqual({ availabilityStatus: 'LIMITED', comment: 'Acceptance fixture only' });
  await page.getByRole('button', { name: en['ui.close'], exact: true }).click();
  await expect(page.getByText(facility.address, { exact: true })).toHaveCount(0);
});

test('chart tooltip and independent loading state use explicit weather fixtures', async ({
  page,
}) => {
  await page.route('**/api/v1/heat/assess', (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: 'WEATHER_UNAVAILABLE',
          message: 'Explicit independence fixture',
          requestId: 'chart-independence-fixture',
        },
      },
    }),
  );
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  let releaseWeather: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseWeather = resolve;
  });
  await page.route('**/api/v1/weather?**', async (route) => {
    await gate;
    await route.fulfill({
      json: {
        ...demoWeather,
        hourly: [{ time: '2026-11-21T10:00:00+05:30', temperatureC: 35, humidityPercent: 50 }],
      },
    });
  });
  await page.goto('/worker/dashboard');
  await expect(
    page.getByRole('region', { name: en['weather.current'], exact: true }).getByRole('status'),
  ).toBeVisible();
  releaseWeather();
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
  await page.locator('.recharts-bar-rectangle').first().hover();
  await expect(page.locator('.recharts-tooltip-wrapper')).toBeVisible();
  await expect(page.locator('.recharts-tooltip-wrapper')).toContainText('35');
  await expect(
    page.getByRole('region', { name: en['assessment.title'], exact: true }).getByRole('alert'),
  ).toBeVisible();
});
