import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import heavy from '../../backend/examples/integration/heatlab-heavy.response.json' with { type: 'json' };
import lower from '../../backend/examples/integration/heatlab-lower.response.json' with { type: 'json' };
import { constructionScenario } from '../src/constants/options';
import { demoFacilities, demoWeather } from '../src/mocks/demo';
import en from '../src/locales/en.json' with { type: 'json' };

test('actual backend HeatLab: independent CRITICAL and HIGH results, matching weather, priority and labeling', async ({
  page,
}, info) => {
  const requests: { profile: { occupation: string }; weatherOverride: unknown }[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/simulation/evaluate')) requests.push(request.postDataJSON());
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/heatlab');
  await page.getByRole('button', { name: 'Evaluate both scenarios', exact: true }).click();
  const a = page.getByRole('region', { name: 'Scenario A · Construction', exact: true });
  const b = page.getByRole('region', { name: 'Scenario B · Street vendor', exact: true });
  await expect(a.getByText('CRITICAL', { exact: true })).toBeVisible();
  await expect(b.getByText('HIGH', { exact: true }).first()).toBeVisible();
  await expect(
    a.getByText('Stop unsafe work and move away from the exposure.', { exact: true }),
  ).toBeVisible();
  await expect(b.getByText('Reduce strenuous activity.', { exact: true })).toBeVisible();
  await expect(a.getByText('40.68°C')).toBeVisible();
  await expect(b.getByText('40.68°C')).toBeVisible();
  await expect(a.getByText('SIMULATION · Not live weather')).toBeVisible();
  for (const region of [a, b]) {
    for (const code of [heavy.assessment.disclaimerCode, ...heavy.assessment.limitations]) {
      await expect(
        region.getByText(en[`limit.${code}` as keyof typeof en], { exact: true }).first(),
      ).toBeVisible();
    }
  }
  expect(requests).toHaveLength(2);
  expect(requests[0].weatherOverride).toEqual(requests[1].weatherOverride);
  expect(requests.map((value) => value.profile.occupation).sort()).toEqual([
    'CONSTRUCTION',
    'STREET_VENDOR',
  ]);
  expect(await page.evaluate(() => localStorage.getItem('sunshield.workerProfile'))).toBeNull();
  expect(errors).toEqual([]);
  await page.screenshot({ path: info.outputPath('heatlab-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('heatlab-mobile.png'), fullPage: true });
});

test('onboarding, explicit city coordinates, persistence, profile editing and back navigation', async ({
  page,
}) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Supported city center', { exact: true }).selectOption('Mumbai');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page).toHaveURL(/worker\/dashboard/);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('sunshield.workerProfile') ?? '{}'),
  );
  expect(stored.location).toMatchObject({ city: 'Mumbai', latitude: 19.076, longitude: 72.8777 });
  await page.reload();
  await expect(page.getByText('CONSTRUCTION', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Construction worker · Mumbai/)).toBeVisible();
  await page.getByRole('link', { name: 'Edit preferences', exact: true }).click();
  await expect(page.getByLabel('Work starts')).toHaveValue('09:00');
  await page.goBack();
  await expect(page).toHaveURL(/worker\/dashboard/);
});

test('dashboard sections fail independently; GPS updates profile and query coordinates', async ({
  page,
  context,
}) => {
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 19.1, longitude: 72.9 });
  await page.route('**/api/v1/weather?**', (route) =>
    route.fulfill({ json: { ...demoWeather, dataMode: 'LIVE', current: null } }),
  );
  await page.route('**/api/v1/heat/assess', (route) =>
    route.fulfill({ json: { ...heavy, dataMode: 'LIVE' } }),
  );
  await page.route('**/api/v1/safe-zones?**', (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: { code: 'WEATHER_UNAVAILABLE', message: 'private detail', requestId: 'test' },
      },
    }),
  );
  await page.goto('/worker/dashboard');
  await expect(page.getByText('Stop unsafe work and move away from the exposure.')).toBeVisible();
  await expect(page.getByText('Current observations are unavailable.')).toBeVisible();
  await expect(
    page.getByText('This service is temporarily unavailable or awaiting integration.'),
  ).toBeVisible();
  const request = page.waitForRequest(
    (request) =>
      request.url().endsWith('/heat/assess') &&
      request.postDataJSON().profile.location.latitude === 19.1,
  );
  await page.getByRole('button', { name: 'Use my location', exact: true }).click();
  await request;
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('sunshield.workerProfile') ?? '{}').location.latitude,
    ),
  ).toBe(19.1);
});

test('malicious facility names remain text; canonical filters and map controls work', async ({
  page,
}) => {
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  const name = '<img src=x onerror="window.frontendInjected=1">';
  await page.route('**/api/v1/safe-zones?**', (route) =>
    route.fulfill({
      json: {
        distanceMethod: 'STRAIGHT_LINE',
        facilities: [
          {
            ...demoFacilities[0],
            verificationStatus: 'PENDING',
            category: 'SHADED_REST_AREA',
            name,
          },
        ],
      },
    }),
  );
  await page.goto('/safe-zones');
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await page.getByLabel('Category', { exact: true }).selectOption('SHADED_REST_AREA');
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('.leaflet-control-zoom-in')).toBeVisible();
  await page.locator('.leaflet-control-zoom-in').click();
  await page.getByLabel('Verification status', { exact: true }).selectOption('VERIFIED');
  await expect(page.getByText('No facilities match these filters.')).toBeVisible();
});

test('nullable weather, stale limitations and UNKNOWN remain explicit', async ({ page }) => {
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  await page.route('**/api/v1/weather?**', (route) =>
    route.fulfill({
      json: {
        ...demoWeather,
        dataMode: 'CACHED',
        current: { ...demoWeather.current, apparentTemperatureC: null, windSpeedKmh: null },
      },
    }),
  );
  await page.route('**/api/v1/heat/assess', (route) =>
    route.fulfill({
      json: {
        ...heavy,
        dataMode: 'CACHED',
        assessment: {
          ...heavy.assessment,
          advisoryLevel: 'UNKNOWN',
          limitations: ['STALE_WEATHER'],
          environmentalIndicators: {
            ...heavy.assessment.environmentalIndicators,
            temperatureC: null,
            heatIndexC: null,
            environmentalAdvisoryLevel: 'UNKNOWN',
          },
        },
      },
    }),
  );
  await page.route('**/api/v1/safe-zones?**', (route) =>
    route.fulfill({ json: { distanceMethod: 'STRAIGHT_LINE', facilities: [] } }),
  );
  await page.goto('/worker/dashboard');
  await expect(
    page.getByRole('heading', { name: 'UNKNOWN · Assessment unsupported', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Weather is too old to support a current assessment.')).toBeVisible();
});

test('emergency access without profile or backend, language switching, keyboard skip link', async ({
  page,
}) => {
  await page.route('**/api/v1/**', (route) => route.abort());
  await page.goto('/sos');
  await expect(page.getByRole('link', { name: 'Call 112 now', exact: true })).toHaveAttribute(
    'href',
    'tel:112',
  );
  await expect(page.getByText(/Do not give fluids/)).toBeVisible();
  await page.getByLabel('Language', { exact: true }).selectOption('hi');
  await expect(page.getByRole('link', { name: 'अभी 112 पर कॉल करें' })).toBeVisible();
  await page.getByLabel('भाषा', { exact: true }).selectOption('mr');
  await expect(page.getByRole('link', { name: 'आत्ताच 112 वर कॉल करा' })).toBeVisible();
  expect(await page.locator('html').getAttribute('lang')).toBe('mr');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Heat illness emergency help', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
});

test('Hindi and Marathi keep explicit critical stop-work instructions from real responses', async ({
  page,
}) => {
  await page.goto('/heatlab');
  for (const [lang, label] of [
    ['hi', 'असुरक्षित काम रोकें और गर्मी के संपर्क से दूर जाएँ।'],
    ['mr', 'असुरक्षित काम थांबवा आणि उष्णतेच्या संपर्कापासून दूर जा.'],
  ]) {
    await page.locator('.language select').selectOption(lang);
    await page
      .getByRole('button', {
        name: lang === 'hi' ? 'दोनों का आकलन करें' : 'दोन्हींचे मूल्यांकन करा',
        exact: true,
      })
      .click();
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
});

test('invalid simulated values send no assessment request', async ({ page }) => {
  await page.goto('/heatlab');
  let calls = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/simulation/evaluate')) calls++;
  });
  await page.getByLabel('Humidity (%)', { exact: true }).fill('101');
  await page.getByRole('button', { name: 'Evaluate both scenarios', exact: true }).click();
  await expect(
    page.getByText('Complete the required fields with valid values.').first(),
  ).toBeVisible();
  expect(calls).toBe(0);
});

test('failed simulation does not substitute mocked results', async ({ page }) => {
  await page.route('**/api/v1/simulation/evaluate', (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: 'FAIL', message: '<img src=x onerror=evil>', requestId: 'test-id' } },
    }),
  );
  await page.goto('/heatlab');
  await page.getByRole('button', { name: 'Evaluate both scenarios', exact: true }).click();
  await expect(
    page.getByText('This service is temporarily unavailable or awaiting integration.').first(),
  ).toBeVisible();
  await expect(page.getByText('CRITICAL', { exact: true })).toHaveCount(0);
  await expect(page.locator('img[src=x]')).toHaveCount(0);
});

test('corrupt preferences recover and 404/deep links are refresh-safe', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sunshield.workerProfile', '{broken'));
  await page.goto('/worker/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Choose your work conditions and location first.' }),
  ).toBeVisible();
  await page.goto('/not-a-route');
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
  await page.goto('/heatlab');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Same weather. Different working conditions.' }),
  ).toBeVisible();
});

test('read-only keyboard and automated accessibility checks on landing, HeatLab and SOS', async ({
  page,
}) => {
  for (const path of ['/', '/heatlab', '/sos']) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations).toEqual([]);
  }
});

for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`responsive routes at ${width}px: no horizontal overflow`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(
      (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
      constructionScenario,
    );
    await page.route('**/api/v1/weather?**', (route) =>
      route.fulfill({
        json: {
          ...demoWeather,
          hourly: [35, 36, 34].map((temperatureC, index) => ({
            time: `2026-11-21T${String(9 + index).padStart(2, '0')}:00:00+05:30`,
            temperatureC,
            humidityPercent: 50,
            windSpeedKmh: 5,
          })),
        },
      }),
    );
    await page.route('**/api/v1/heat/assess', (route) => route.fulfill({ json: heavy }));
    await page.route('**/api/v1/safe-zones?**', (route) =>
      route.fulfill({
        json: {
          distanceMethod: 'STRAIGHT_LINE',
          facilities: [{ ...demoFacilities[0], verificationStatus: 'PENDING' }],
        },
      }),
    );
    await page.route('**/api/v1/protection/plan', (route) =>
      route.fulfill({
        json: {
          dataMode: 'SIMULATION',
          timezone: 'Asia/Kolkata',
          workDate: '2026-11-21',
          workStart: '09:00',
          workEnd: '18:00',
          timeline: [
            {
              start: '2026-11-21T09:00:00+05:30',
              end: '2026-11-21T09:15:00+05:30',
              advisoryLevel: 'CRITICAL',
              temperatureC: 35,
              factors: heavy.assessment.factors,
              recommendationCodes: heavy.assessment.recommendations.map((item) => item.code),
              availability: 'AVAILABLE',
              assessment: heavy.assessment,
            },
            {
              start: '2026-11-21T09:15:00+05:30',
              end: '2026-11-21T18:00:00+05:30',
              advisoryLevel: 'UNKNOWN',
              temperatureC: null,
              factors: [],
              recommendationCodes: ['STOP_UNSAFE_ACTIVITY'],
              availability: 'UNAVAILABLE',
              assessment: {
                ...heavy.assessment,
                advisoryLevel: 'UNKNOWN',
                factors: [],
                recommendations: [{ code: 'STOP_UNSAFE_ACTIVITY', priority: 'HIGH' }],
                observedAt: null,
                limitations: ['FORECAST_PERIOD_UNAVAILABLE'],
                environmentalIndicators: {
                  temperatureC: null,
                  humidityPercent: null,
                  apparentTemperatureC: null,
                  windSpeedKmh: null,
                  heatIndexC: null,
                  heatIndexMethod: 'NOT_APPLICABLE',
                  environmentalAdvisoryLevel: 'UNKNOWN',
                },
              },
            },
          ],
          disclaimerCode: 'NOT_A_CERTIFIED_WORK_REST_PLAN',
          limitations: ['SAME_DAY_SCHEDULE_ONLY'],
          optionalScheduleAdvice: [],
        },
      }),
    );
    for (const path of [
      '/',
      '/onboarding',
      '/heatlab',
      '/sos',
      '/safe-zones/add',
      '/enterprise/dashboard',
      '/enterprise/planner',
      '/worker/dashboard',
      '/worker/plan',
      '/worker/profile',
      '/safe-zones',
    ]) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      if (path === '/worker/dashboard') {
        await expect(page.locator('.chart .recharts-surface').first()).toBeVisible();
        await expect(
          page.getByText('Stop unsafe work and move away from the exposure.', { exact: true }),
        ).toBeVisible();
        if (width === 390 || width === 1440)
          await page.screenshot({
            path: info.outputPath(`dashboard-${width}.png`),
            fullPage: true,
          });
      }
      if (path === '/worker/plan') {
        await expect(
          page.getByText('Forecast unavailable for this period', { exact: true }),
        ).toBeVisible();
        await expect(
          page
            .getByText('Stop unsafe work and move away from the exposure.', { exact: true })
            .first(),
        ).toBeVisible();
      }
      if (path === '/safe-zones') {
        await expect(
          page.getByRole('heading', { name: 'Demonstration water resource', exact: true }),
        ).toBeVisible();
        await expect(page.locator('.leaflet-container')).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}

test('simulation state resets without altering saved worker preferences', async ({ page }) => {
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  await page.goto('/heatlab');
  await page.getByLabel('Temperature (°C)', { exact: true }).fill('40');
  await page.getByRole('button', { name: 'Reset scenarios', exact: true }).click();
  await expect(page.getByLabel('Temperature (°C)', { exact: true })).toHaveValue('35');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('sunshield.workerProfile') ?? '{}').workload,
    ),
  ).toBe('HEAVY');
});

test('independent scenario failures preserve the other successful response', async ({ page }) => {
  await page.route('**/api/v1/simulation/evaluate', (route) =>
    route.request().postDataJSON().profile.occupation === 'CONSTRUCTION'
      ? route.fulfill({
          status: 503,
          json: { error: { code: 'FAIL', message: 'Unavailable', requestId: 'a' } },
        })
      : route.fulfill({ json: lower }),
  );
  await page.goto('/heatlab');
  await page.getByRole('button', { name: 'Evaluate both scenarios', exact: true }).click();
  await expect(page.getByText('HIGH', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('This service is temporarily unavailable or awaiting integration.'),
  ).toBeVisible();
});

test('community form sends canonical fields and honestly reports disabled writes', async ({
  page,
}) => {
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  await page.goto('/safe-zones/add');
  await page.getByLabel('Facility name', { exact: true }).fill('Community water');
  await page.getByLabel('Address', { exact: true }).fill('Pune');
  const sent = page.waitForRequest(
    (request) => request.url().endsWith('/api/v1/safe-zones') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
  const request = await sent;
  expect(request.postDataJSON()).toMatchObject({
    name: 'Community water',
    category: 'DRINKING_WATER',
  });
  expect(request.postDataJSON()).not.toHaveProperty('verificationStatus');
  await expect(
    page.getByText('This service is temporarily unavailable or awaiting integration.'),
  ).toBeVisible();
  await expect(
    page.getByText('Submitted for review. This does not verify the facility.'),
  ).toHaveCount(0);
});

test('malicious facility addresses and report comments remain inert', async ({ page }) => {
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  const malicious = '<img src=x onerror="window.frontendInjected=1">';
  const facility = {
    ...demoFacilities[0],
    verificationStatus: 'PENDING',
    address: malicious,
    availabilityStatus: 'UNKNOWN',
  };
  await page.route('**/api/v1/safe-zones?**', (route) =>
    route.fulfill({ json: { distanceMethod: 'STRAIGHT_LINE', facilities: [facility] } }),
  );
  await page.route(`**/api/v1/safe-zones/${facility.id}`, (route) =>
    route.fulfill({ json: facility }),
  );
  await page.goto('/safe-zones');
  await page.getByRole('button', { name: 'Show details', exact: true }).click();
  await expect(page.getByText(malicious, { exact: true })).toBeVisible();
  await page.getByLabel('Comment', { exact: true }).fill(malicious);
  await expect(page.locator('img[src=x]')).toHaveCount(0);
});

test('mobile navigation, landscape layout and primary touch targets remain usable', async ({
  page,
}) => {
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/worker/dashboard');
  await page.locator('.mobile-nav').getByRole('link', { name: 'My plan', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your protection timeline', exact: true }),
  ).toBeVisible();
  await page.locator('.mobile-nav').getByRole('link', { name: 'HeatLab', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Same weather. Different working conditions.', exact: true }),
  ).toBeVisible();
  const target = await page.locator('.site-header .sos-link').boundingBox();
  expect(target?.height).toBeGreaterThanOrEqual(48);
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.site-header .sos-link').click();
  await expect(page.getByRole('link', { name: 'Call 112 now', exact: true })).toBeVisible();
});

test('a cancelled older scenario cannot replace a newer result', async ({ page }) => {
  let releaseOld: () => void = () => undefined;
  const oldHandled = new Promise<void>((resolve) => {
    releaseOld = resolve;
  });
  await page.route('**/api/v1/simulation/evaluate', async (route) => {
    const old = route.request().postDataJSON().weatherOverride.temperatureC === 35;
    if (old) await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      await route.fulfill({
        json: {
          ...heavy,
          assessment: { ...heavy.assessment, source: old ? 'older-fixture' : 'newer-fixture' },
        },
      });
    } catch {
      /* An obsolete HTTP request may already have been aborted. */
    } finally {
      if (old) releaseOld();
    }
  });
  await page.goto('/heatlab');
  const scenario = page.getByRole('region', { name: 'Scenario A · Construction', exact: true });
  const first = page.waitForRequest((request) => request.url().endsWith('/simulation/evaluate'));
  await scenario.getByRole('button', { name: 'Evaluate this scenario', exact: true }).click();
  await first;
  await page.getByLabel('Temperature (°C)', { exact: true }).fill('36');
  await scenario.getByRole('button', { name: 'Evaluate this scenario', exact: true }).click();
  await expect(scenario.getByText(/Source: newer-fixture/)).toBeVisible();
  await oldHandled;
  await expect(scenario.getByText(/Source: newer-fixture/)).toBeVisible();
  await expect(scenario.getByText(/Source: older-fixture/)).toHaveCount(0);
});

test('denied GPS has an explicit recovery without silently using Pune', async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Use my location', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    /Location permission was denied|GPS is unavailable|Location request timed out/,
  );
  expect(await page.evaluate(() => localStorage.getItem('sunshield.workerProfile'))).toBeNull();
  await page.getByLabel('Supported city center', { exact: true }).selectOption('New Delhi');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('sunshield.workerProfile') ?? '{}').location.latitude,
    ),
  ).toBe(28.6139);
});
