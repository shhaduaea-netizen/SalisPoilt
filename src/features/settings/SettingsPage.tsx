import { Check, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/shared/i18n';
import { usePreferences, type Appearance, type AppLanguage, type ThemeName } from '@/shared/stores/preferences';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui/PageHeader';

const themes: { name: ThemeName; colors: string[] }[] = [
  { name: 'ocean', colors: ['#0b2d4d', '#1976a8', '#63c7c0'] },
  { name: 'forest', colors: ['#173b2f', '#2f7655', '#a4d96c'] },
  { name: 'sunset', colors: ['#5d2632', '#c05a45', '#f2b05e'] },
  { name: 'slate', colors: ['#25313f', '#53677d', '#9db7c8'] },
  { name: 'rose', colors: ['#4f263d', '#a14b70', '#e6a6b8'] },
  { name: 'sand', colors: ['#49351e', '#9b7041', '#d5b66d'] },
  { name: 'midnight', colors: ['#101827', '#27456b', '#65a8d9'] },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const appearance = usePreferences((state) => state.appearance);
  const theme = usePreferences((state) => state.theme);
  const setAppearance = usePreferences((state) => state.setAppearance);
  const setTheme = usePreferences((state) => state.setTheme);

  const selectLanguage = (next: AppLanguage) => void changeLanguage(next);

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.35fr]">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-primary-900">{t('settings.languageTitle')}</h2>
          <p className="mt-1 text-sm text-neutral-600">{t('settings.languageDescription')}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(['en', 'ar'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={language === code}
                onClick={() => selectLanguage(code)}
                className={`rounded-xl border px-4 py-4 text-start text-sm font-semibold transition ${
                  language === code ? 'border-accent-500 bg-accent-50 text-primary-900 shadow-sm' : 'border-neutral-200 text-neutral-700 hover:border-accent-300'
                }`}
              >
                {code === 'en' ? t('settings.english') : t('settings.arabic')}
                {language === code && <Check className="float-end h-4 w-4 text-accent-700" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-primary-900">{t('settings.appearanceTitle')}</h2>
          <p className="mt-1 text-sm text-neutral-600">{t('settings.appearanceDescription')}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(['light', 'dark'] as Appearance[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={appearance === mode}
                onClick={() => setAppearance(mode)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-start text-sm font-semibold transition ${
                  appearance === mode ? 'border-accent-500 bg-accent-50 text-primary-900 shadow-sm' : 'border-neutral-200 text-neutral-700 hover:border-accent-300'
                }`}
              >
                {mode === 'light' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
                {t(`settings.${mode}`)}
                {appearance === mode && <Check className="ms-auto h-4 w-4 text-accent-700" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-primary-900">{t('settings.themeTitle')}</h2>
        <p className="mt-1 text-sm text-neutral-600">{t('settings.themeDescription')}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {themes.map((option) => (
            <button
              key={option.name}
              type="button"
              aria-pressed={theme === option.name}
              onClick={() => setTheme(option.name)}
              className={`group rounded-2xl border p-3 text-start transition ${theme === option.name ? 'border-accent-500 ring-2 ring-accent-200' : 'border-neutral-200 hover:-translate-y-0.5 hover:border-accent-300'}`}
            >
              <span className="flex h-20 overflow-hidden rounded-xl">
                {option.colors.map((color) => <span key={color} className="flex-1" style={{ backgroundColor: color }} />)}
              </span>
              <span className="mt-3 flex items-center justify-between text-sm font-semibold text-primary-900">
                {t(`settings.themes.${option.name}`)}
                {theme === option.name && <Check className="h-4 w-4 text-accent-700" aria-hidden="true" />}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}
