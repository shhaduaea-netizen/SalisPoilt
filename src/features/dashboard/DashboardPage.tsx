import type { LucideIcon } from 'lucide-react';
import { Building2, GitBranch, Receipt, Users, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBranches, useCompany, useCurrentUser, useEmployees, useSales, useTeams } from '@/data/queries';
import { useFormatters } from '@/shared/i18n/useFormatters';
import { usePreferences } from '@/shared/stores/preferences';
import { Card } from '@/shared/ui/Card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

function StatCard({ label, value, icon: Icon }: { label: string; value: number | undefined; icon: LucideIcon }) {
  const f = useFormatters();
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-neutral-600">{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-1 h-7 w-20" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums text-primary-900">{f.number(value)}</p>
        )}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const language = usePreferences((state) => state.language);
  const { data: user } = useCurrentUser();
  const company = useCompany();
  const branches = useBranches();
  const teams = useTeams();
  const employees = useEmployees();
  const sales = useSales();

  if (!user) return null;

  if (!user.companyId) {
    return (
      <>
        <PageHeader title={t('nav.dashboard')} />
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-semibold text-primary-900">{t('dashboard.platformTitle')}</h2>
          <p className="mt-2 text-sm text-neutral-600">{t('dashboard.platformBody')}</p>
        </Card>
      </>
    );
  }

  const queries = [company, branches, teams, employees, sales];
  const hasError = queries.some((query) => query.isError);
  const companyName = company.data ? (language === 'ar' ? company.data.nameAr : company.data.name) : '';

  if (hasError) {
    return <ErrorState onRetry={() => queries.forEach((query) => void query.refetch())} />;
  }

  return (
    <>
      <PageHeader
        title={t('dashboard.greeting', { name: user.displayName })}
        description={t('dashboard.subtitle', { company: companyName })}
      />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.statEmployees')} value={employees.data?.length} icon={Users} />
        <StatCard label={t('dashboard.statSales')} value={sales.data?.length} icon={Receipt} />
        <StatCard label={t('dashboard.statBranches')} value={branches.data?.length} icon={GitBranch} />
        <StatCard label={t('dashboard.statTeams')} value={teams.data?.length} icon={UsersRound} />
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-neutral-500">
        <Building2 className="h-4 w-4" aria-hidden="true" />
        {t('dashboard.scopeCompany')}
      </p>
    </>
  );
}
