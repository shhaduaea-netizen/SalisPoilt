import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function NoPermissionState() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-50 text-warning-700">
        <ShieldAlert className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-primary-900">{t('states.noPermissionTitle')}</h2>
      <p className="max-w-sm text-sm text-neutral-600">{t('states.noPermissionBody')}</p>
    </div>
  );
}
