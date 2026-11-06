import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '@/shared/i18n/locales/ar.json';
import en from '@/shared/i18n/locales/en.json';
import { usePreferences, type AppLanguage } from '@/shared/stores/preferences';

function applyDocumentDirection(language: string) {
  document.documentElement.lang = language;
  document.documentElement.dir = i18n.dir(language);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: usePreferences.getState().language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDocumentDirection(i18n.language);
i18n.on('languageChanged', applyDocumentDirection);

export function changeLanguage(language: AppLanguage) {
  usePreferences.getState().setLanguage(language);
  return i18n.changeLanguage(language);
}

export default i18n;
