import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title?: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-700">
        {icon ?? <Inbox className="h-7 w-7" aria-hidden="true" />}
      </span>
      <h3 className="text-base font-semibold text-primary-900">{title ?? t('states.emptyTitle')}</h3>
      <p className="max-w-sm text-sm text-neutral-600">{body ?? t('states.emptyBody')}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
