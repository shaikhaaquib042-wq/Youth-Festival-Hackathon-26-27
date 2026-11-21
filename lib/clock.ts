import { Clock } from '../types';

export function createSimulatedClock(initialIso: string): Clock & {
  advanceMinutes: (minutes: number) => void;
  advanceSeconds: (seconds: number) => void;
  setTime: (isoString: string) => void;
} {
  let currentMs = Date.parse(initialIso);

  return {
    now: () => new Date(currentMs).toISOString(),
    unixMs: () => currentMs,
    advanceMinutes: (minutes: number) => {
      currentMs += minutes * 60 * 1000;
    },
    advanceSeconds: (seconds: number) => {
      currentMs += seconds * 1000;
    },
    setTime: (isoString: string) => {
      currentMs = Date.parse(isoString);
    },
  };
}
