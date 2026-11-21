import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import i18n from '../i18n';
import { languages, workerSchema } from '../schemas/contracts';
import { restoreProfile, PROFILE_STORAGE_KEY } from '../utils/storage';
import type { Language, WorkerProfile } from '../schemas/contracts';

interface ProfileState {
  profile: WorkerProfile | null;
  language: Language;
  saveProfile: (profile: WorkerProfile) => void;
  setLanguage: (language: Language) => void;
  storageWarning: boolean;
}
const ProfileContext = createContext<ProfileState | null>(null);
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(() => {
    try {
      return restoreProfile(window.localStorage);
    } catch {
      return null;
    }
  });
  const [language, updateLanguage] = useState<Language>(() => profile?.language ?? 'en');
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [language]);
  const saveProfile = (input: WorkerProfile) => {
    const parsed = workerSchema.parse(input);
    setProfile(parsed);
    updateLanguage(parsed.language);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(parsed));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  };
  const setLanguage = (value: Language) => {
    if (!languages.includes(value)) return;
    updateLanguage(value);
    if (profile) saveProfile({ ...profile, language: value });
  };
  return (
    <ProfileContext.Provider
      value={{ profile, language, saveProfile, setLanguage, storageWarning }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
// The context and hook share one small state boundary.
// eslint-disable-next-line react-refresh/only-export-components
export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('ProfileProvider required');
  return value;
}
