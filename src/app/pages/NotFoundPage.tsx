import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/Card';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Card className="max-w-md p-8 text-center">
        <p className="text-sm font-semibold text-accent-700">404</p>
        <h1 className="mt-2 text-xl font-semibold text-primary-900">{t('states.notFoundTitle')}</h1>
        <p className="mt-2 text-sm text-neutral-600">{t('states.notFoundBody')}</p>
      </Card>
    </div>
  );
}
