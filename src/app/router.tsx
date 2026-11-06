import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/navigation';
import { AppLayout } from '@/app/layouts/AppLayout';
import { RequirePermission } from '@/app/guards/RequirePermission';
import { CompaniesPage } from '@/features/companies/CompaniesPage';
import { BranchesPage } from '@/features/branches/BranchesPage';
import { RanksPage } from '@/features/ranks/RanksPage';
import { PasswordRequestsPage } from '@/features/passwordRequests/PasswordRequestsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { SectionPlaceholderPage } from '@/app/pages/SectionPlaceholderPage';
import { AuthGate } from '@/features/auth/AuthGate';
import { RosterPage } from '@/features/roster/RosterPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { OrganizationPage } from '@/features/organization/OrganizationPage';

const sectionRoutes: RouteObject[] = NAV_ITEMS.map((item) => {
  const page = item.key === 'dashboard'
    ? <DashboardPage />
    : item.key === 'employees'
      ? <RosterPage />
      : item.key === 'companies'
      ? <CompaniesPage />
      : item.key === 'branches'
      ? <BranchesPage />
      : item.key === 'ranks'
      ? <RanksPage />
      : item.key === 'passwordRequests'
      ? <PasswordRequestsPage />
      : item.key === 'teams'
        ? <OrganizationPage section="teams" />
    : item.key === 'settings'
        ? <SettingsPage />
        : item.key === 'profile'
          ? <ProfilePage />
          : <SectionPlaceholderPage sectionKey={item.key} />;
  const element = <RequirePermission action={item.action}>{page}</RequirePermission>;
  return item.path === '/' ? { index: true, element } : { path: item.path.slice(1), element };
});

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthGate>{() => <AppLayout />}</AuthGate>,
    children: [...sectionRoutes, { path: '*', element: <NotFoundPage /> }],
  },
]);
