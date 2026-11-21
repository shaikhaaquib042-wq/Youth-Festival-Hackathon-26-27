import { workerSchema } from '../schemas/contracts';
import type { WorkerProfile } from '../schemas/contracts';
export const PROFILE_STORAGE_KEY = 'sunshield.workerProfile';
export function restoreProfile(storage: Pick<Storage, 'getItem'>): WorkerProfile | null {
  try {
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const value = workerSchema.safeParse(JSON.parse(raw));
    return value.success ? value.data : null;
  } catch {
    return null;
  }
}
