import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppLanguage = 'en' | 'ar';
export type DigitStyle = 'latin';
export type Appearance = 'light' | 'dark';
export type ThemeName = 'ocean' | 'forest' | 'sunset' | 'slate' | 'rose' | 'sand' | 'midnight';

type ProfilePreferences = {
  language: AppLanguage;
  digits: DigitStyle;
  appearance: Appearance;
  theme: ThemeName;
};

interface PreferencesState extends ProfilePreferences {
  activeUserId: string | null;
  sidebarCollapsed: boolean;
  profiles: Record<string, ProfilePreferences>;
  setUserId: (userId: string) => void;
  setLanguage: (language: AppLanguage) => void;
  setDigits: (digits: DigitStyle) => void;
  setAppearance: (appearance: Appearance) => void;
  setTheme: (theme: ThemeName) => void;
  toggleSidebar: () => void;
}

const defaults: ProfilePreferences = {
  language: 'en',
  digits: 'latin',
  appearance: 'light',
  theme: 'ocean',
};

function updateProfile<K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) {
  return (state: PreferencesState): Partial<PreferencesState> => {
    const next = { ...state, [key]: value } as PreferencesState;
    if (!state.activeUserId) return next;
    return {
      ...next,
      profiles: {
        ...state.profiles,
        [state.activeUserId]: {
          ...state.profiles[state.activeUserId],
          [key]: value,
        },
      },
    };
  };
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaults,
      activeUserId: null,
      sidebarCollapsed: false,
      profiles: {},
      setUserId: (userId) =>
        set((state) => ({
          ...state,
          activeUserId: userId,
          ...(state.profiles[userId] ?? defaults),
          digits: 'latin',
        })),
      setLanguage: (language) => set(updateProfile('language', language)),
      setDigits: (digits) => set(updateProfile('digits', digits)),
      setAppearance: (appearance) => set(updateProfile('appearance', appearance)),
      setTheme: (theme) => set(updateProfile('theme', theme)),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    { name: 'salespilot-preferences' }
  )
);
