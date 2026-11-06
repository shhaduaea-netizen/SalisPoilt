import type { AppLanguage, DigitStyle } from '@/shared/stores/preferences';

const TIMEZONE = 'Asia/Dubai';

export function resolveLocale(language: AppLanguage, _digits: DigitStyle): string {
  const base = language === 'ar' ? 'ar-AE' : 'en-AE';
  return `${base}-u-nu-latn`;
}

export function formatNumber(value: number, locale: string, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
}

export function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatDateTime(isoTimestamp: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  }).format(new Date(isoTimestamp));
}
