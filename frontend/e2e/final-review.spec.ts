import { expect, test } from '@playwright/test';
import { constructionScenario } from '../src/constants/options';
import heavy from '../../backend/examples/integration/heatlab-heavy.response.json' with { type: 'json' };
import en from '../src/locales/en.json' with { type: 'json' };
import hi from '../src/locales/hi.json' with { type: 'json' };
import mr from '../src/locales/mr.json' with { type: 'json' };

const locales = { en, hi, mr };
const paths = [
  '/',
  '/onboarding',
  '/worker/dashboard',
  '/worker/plan',
  '/worker/profile',
  '/safe-zones',
  '/safe-zones/add',
  '/heatlab',
  '/sos',
  '/enterprise/dashboard',
  '/enterprise/planner',
];

for (const language of ['en', 'hi', 'mr'] as const) {
  test(`final acceptance: eleven actual routes in ${language} at mobile width`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (profile) => {
        localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile));
      },
      { ...constructionScenario, language },
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await page.locator('main').innerText()).not.toMatch(
        /(?:recommendation|limit|field|page|enum|priority)\.[A-Z_a-z]+/,
      );
      if (path === '/heatlab' || path === '/sos') {
        await page.screenshot({
          path: info.outputPath(`${language}-${path.slice(1)}.png`),
          fullPage: true,
        });
      }
    }
    expect(errors).toEqual([]);
  });

  test(`UNKNOWN planner preserves stop instruction without expanding details in ${language}`, async ({
    page,
  }) => {
    const text = locales[language];
    await page.addInitScript(
      (profile) => {
        localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile));
      },
      { ...constructionScenario, language },
    );
    const assessment = {
      ...heavy.assessment,
      advisoryLevel: 'UNKNOWN',
      recommendations: [{ code: 'STOP_UNSAFE_ACTIVITY', priority: 'HIGH' }],
      limitations: ['FORECAST_PERIOD_UNAVAILABLE', 'NOT_PERMISSION_TO_CONTINUE_WORK'],
      environmentalIndicators: {
        ...heavy.assessment.environmentalIndicators,
        temperatureC: null,
        heatIndexC: null,
        environmentalAdvisoryLevel: 'UNKNOWN',
      },
    };
    // Explicit UI fixture: this does not establish live weather integration.
    await page.route('**/api/v1/protection/plan', (route) =>
      route.fulfill({
        json: {
          dataMode: 'CACHED',
          timezone: 'Asia/Kolkata',
          workDate: '2026-11-21',
          workStart: '09:00',
          workEnd: '18:00',
          timeline: [
            {
              start: '2026-11-21T09:00:00+05:30',
              end: '2026-11-21T18:00:00+05:30',
              advisoryLevel: 'UNKNOWN',
              temperatureC: null,
              factors: [],
              recommendationCodes: ['STOP_UNSAFE_ACTIVITY'],
              availability: 'UNAVAILABLE',
              assessment,
            },
          ],
          disclaimerCode: 'NOT_A_CERTIFIED_WORK_REST_PLAN',
          limitations: ['SAME_DAY_SCHEDULE_ONLY'],
          optionalScheduleAdvice: [],
        },
      }),
    );
    await page.goto('/worker/plan');
    await expect(page.getByText(text['advisory.UNKNOWN'], { exact: true }).first()).toBeVisible();
    await expect(page.getByText(text['plan.gap'], { exact: true })).toBeVisible();
    await expect(
      page
        .locator('.period > .recommendations')
        .getByText(text['recommendation.STOP_UNSAFE_ACTIVITY'], { exact: true }),
    ).toBeVisible();
    expect(await page.locator('details').getAttribute('open')).toBeNull();
    await page.locator('summary').click();
    await expect(
      page
        .locator('details')
        .getByText(text['limit.NOT_PERMISSION_TO_CONTINUE_WORK'], { exact: true })
        .first(),
    ).toBeVisible();
  });
}

test('HeatLab reset clears obsolete validation warnings and preserves profile', async ({
  page,
}) => {
  await page.addInitScript(
    (profile) => localStorage.setItem('sunshield.workerProfile', JSON.stringify(profile)),
    constructionScenario,
  );
  await page.goto('/heatlab');
  const saved = await page.evaluate(() => localStorage.getItem('sunshield.workerProfile'));
  await page.getByRole('spinbutton', { name: 'Temperature (°C)', exact: true }).fill('66');
  await page.getByRole('button', { name: 'Evaluate both scenarios', exact: true }).click();
  await expect(page.getByText(en['ui.required'], { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Reset scenarios', exact: true }).click();
  await expect(page.getByText(en['ui.required'], { exact: true })).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Temperature (°C)', exact: true })).toHaveValue(
    '35',
  );
  await page.getByRole('button', { name: 'Evaluate both scenarios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CRITICAL', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sunshield.workerProfile'))).toBe(saved);
});
