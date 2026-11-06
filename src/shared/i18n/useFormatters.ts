import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime, formatNumber, formatPercent, resolveLocale } from '@/shared/utils/format';
import { usePreferences } from '@/shared/stores/preferences';

export function useFormatters() {
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const digits = usePreferences((state) => state.digits);
  const locale = resolveLocale(language, digits);

  return useMemo(() => {
    const currencySymbol = t('currency.aed');
    const money = (amount: number, fractionDigits = 2) => {
      const formatted = formatNumber(amount, locale, fractionDigits);
      return language === 'ar' ? `${formatted} ${currencySymbol}` : `${currencySymbol} ${formatted}`;
    };
    return {
      locale,
      money,
      number: (value: number, fractionDigits = 0) => formatNumber(value, locale, fractionDigits),
      percent: (value: number) => formatPercent(value, locale),
      date: (isoDate: string) => formatDate(isoDate, locale),
      dateTime: (isoTimestamp: string) => formatDateTime(isoTimestamp, locale),
    };
  }, [t, language, locale]);
}
