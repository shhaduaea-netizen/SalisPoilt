import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MobileNav } from '@/app/layouts/MobileNav';
import { Sidebar } from '@/app/layouts/Sidebar';
import { TopBar } from '@/app/layouts/TopBar';
import { useCurrentUser } from '@/data/queries';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ErrorState } from '@/shared/ui/ErrorState';

export function AppLayout() {
  const { t } = useTranslation();
  const { data: user, isPending, isError, refetch } = useCurrentUser();

  if (isPending) {
    return (
      <div role="status" aria-label={t('states.loadingLabel')} className="flex min-h-dvh flex-col gap-4 p-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900 lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-900 focus:shadow-lg"
      >
        {t('common.skipToContent')}
      </a>
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
