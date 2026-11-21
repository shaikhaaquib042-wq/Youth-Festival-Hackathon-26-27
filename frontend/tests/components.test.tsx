import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../src/i18n';
import {
  AssessmentPanel,
  Recommendations,
  SpeechButton,
} from '../src/components/safety/AssessmentPanel';
import { WeatherPanel } from '../src/components/weather/WeatherPanel';
import { FacilityCard } from '../src/features/safe-zones/FacilityCard';
import { ErrorPanel } from '../src/components/common/Primitives';
import { ApiError } from '../src/services/client';
import { constructionScenario } from '../src/constants/options';
import { assessmentResponseSchema, facilitySchema } from '../src/schemas/contracts';
import { demoFacilities, demoWeather } from '../src/mocks/demo';
import heavy from '../../backend/examples/integration/heatlab-heavy.response.json';
import { LocationPicker } from '../src/features/profile/LocationPicker';
import SubmissionPage from '../src/features/safe-zones/SubmissionPage';
import { Providers } from '../src/app/providers';
import { MemoryRouter } from 'react-router-dom';
import OnboardingPage from '../src/features/onboarding/OnboardingPage';

function localized(ui: React.ReactNode) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}
describe('safety and independent presentation', () => {
  it('shows actual CRITICAL stop-work guidance, all recommendations, and limitations', async () => {
    await i18n.changeLanguage('en');
    localized(<AssessmentPanel response={assessmentResponseSchema.parse(heavy)} />);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(
      screen.getByText('Stop unsafe work and move away from the exposure.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Only give fluids/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(8);
  });
  it('preserves critical priority even if the incoming array is unsorted', () => {
    localized(
      <Recommendations
        recommendations={[
          { code: 'MAINTAIN_HYDRATION', priority: 'MEDIUM' },
          { code: 'STOP_UNSAFE_ACTIVITY', priority: 'CRITICAL' },
        ]}
      />,
    );
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Stop unsafe');
  });
  it('shows an explicit fallback for unknown codes without displaying raw codes', () => {
    localized(
      <Recommendations
        recommendations={[{ code: '<img src=x onerror=evil>', priority: 'HIGH' }]}
      />,
    );
    expect(screen.getByText(/Additional guidance could not be interpreted/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
  it('renders missing weather independently and never as 0 C', () => {
    localized(<WeatherPanel weather={{ ...demoWeather, dataMode: 'LIVE', current: null }} />);
    expect(screen.getByText('Current observations are unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('0°C')).not.toBeInTheDocument();
  });
  it.each(['hi', 'mr'])('renders explicit critical guidance in %s', async (language) => {
    await i18n.changeLanguage(language);
    localized(
      <Recommendations
        recommendations={[{ code: 'STOP_UNSAFE_ACTIVITY', priority: 'CRITICAL' }]}
      />,
    );
    expect(screen.getByRole('listitem').textContent).not.toContain('Review the advisory');
    expect(screen.getByRole('listitem').textContent).toMatch(/[\u0900-\u097f]/);
    await i18n.changeLanguage('en');
  });
});
describe('actual rendering paths keep malicious data inert', () => {
  const malicious = '<img src=x onerror="window.evil=1">';
  it('renders untrusted facility names as text', () => {
    const fixture = facilitySchema.parse({ ...demoFacilities[0], name: malicious });
    const view = localized(
      <FacilityCard facility={fixture} origin={constructionScenario.location} />,
    );
    expect(screen.getByText(malicious)).toBeInTheDocument();
    expect(view.container.querySelector('img')).toBeNull();
  });
  it('renders untrusted API request IDs as text while hiding private errors', () => {
    const view = localized(<ErrorPanel error={new ApiError('HTTP_503', 503, malicious)} />);
    expect(screen.getByText(malicious)).toBeInTheDocument();
    expect(view.container.querySelector('img')).toBeNull();
  });
  it('renders malicious source strings as text', () => {
    const view = localized(
      <AssessmentPanel
        response={{
          ...assessmentResponseSchema.parse(heavy),
          assessment: { ...assessmentResponseSchema.parse(heavy).assessment, source: malicious },
        }}
      />,
    );
    expect(view.container.textContent).toContain(malicious);
    expect(view.container.querySelector('img')).toBeNull();
  });
  it('renders a malicious persisted city as inert text in the real location picker', () => {
    const view = localized(
      <LocationPicker
        value={{ ...constructionScenario.location, city: malicious }}
        onChange={() => undefined}
      />,
    );
    expect(view.container.textContent).toContain(malicious);
    expect(view.container.querySelector('img')).toBeNull();
  });
  it('keeps facility names and addresses inert in actual form inputs', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const view = render(
      <Providers>
        <SubmissionPage />
      </Providers>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Facility name'), malicious);
    await user.type(screen.getByLabelText('Address', { exact: true }), malicious);
    expect(screen.getByLabelText('Address', { exact: true })).toHaveValue(malicious);
    expect(view.container.querySelector('img')).toBeNull();
  });
});

describe('browser capability recovery', () => {
  it('delivers a delayed GPS result to the latest profile callback', () => {
    let complete: PositionCallback = () => undefined;
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          complete = success;
        },
      },
    });
    const oldCallback = vi.fn();
    const latestCallback = vi.fn();
    const view = render(<LocationPicker value={null} onChange={oldCallback} />);
    fireEvent.click(screen.getByRole('button', { name: /^Use my location$/ }));
    view.rerender(<LocationPicker value={null} onChange={latestCallback} />);
    act(() =>
      complete({
        coords: {
          latitude: 19.1,
          longitude: 72.9,
          accuracy: 1,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition),
    );
    expect(oldCallback).not.toHaveBeenCalled();
    expect(latestCallback).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 19.1, longitude: 72.9 }),
    );
  });
  it('retains text guidance and reports unavailable speech support', () => {
    localized(<SpeechButton assessment={assessmentResponseSchema.parse(heavy).assessment} />);
    fireEvent.click(screen.getByRole('button', { name: /^Listen to guidance$/ }));
    expect(
      screen.getByText('A suitable voice is unavailable. Read the text guidance.'),
    ).toBeInTheDocument();
  });
  it('completes profile setup in memory when saving browser storage is blocked', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(
      <Providers>
        <MemoryRouter>
          <OnboardingPage />
        </MemoryRouter>
      </Providers>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^Continue$/ }));
    await user.click(screen.getByRole('button', { name: /^Continue$/ }));
    await user.selectOptions(screen.getByLabelText('Supported city center'), 'Mumbai');
    await user.click(screen.getByRole('button', { name: /^Save profile$/ }));
    expect(screen.getByText(/Preferences could not be saved on this device/)).toBeInTheDocument();
  });
});
