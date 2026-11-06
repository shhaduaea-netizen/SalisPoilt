import { Building2, GitBranch, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { useRosterList } from '@/features/roster/useRoster';
import type { RosterMember } from '@/features/roster/rosterApi';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

type OrganizationSection = 'companies' | 'branches' | 'teams';

export function OrganizationPage({ section }: { section: OrganizationSection }) {
  const { t } = useTranslation();
  const { state } = useAuth();
  const member = state.status === 'ready' ? state.member : null;
  const query = useRosterList(member?.id ?? '');
  const roster = query.data;

  if (!member || query.isPending) return <Skeleton className="h-96 w-full" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  const title = t(`sections.${section}.title`);
  const description = t(`sections.${section}.description`);
  const companies = roster?.lookups.companies ?? [];
  const branches = roster?.lookups.branches ?? [];
  const teams = roster?.lookups.teams ?? [];
  const people = [...(roster?.members ?? [])].sort(comparePeople);

  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="mt-8">
        {section === 'companies' && <CompaniesView companies={companies} branches={branches} teams={teams} people={people} />}
        {section === 'branches' && <BranchesView companies={companies} branches={branches} teams={teams} people={people} />}
        {section === 'teams' && <TeamsView companies={companies} branches={branches} teams={teams} people={people} />}
      </div>
    </>
  );
}

function CompaniesView({ companies, branches, teams, people }: OrganizationData) {
  const { t } = useTranslation();
  if (companies.length === 0) return <EmptyState icon={<Building2 className="h-7 w-7" aria-hidden="true" />} title={t('organization.emptyCompanies')} body={t('organization.emptyBody')} />;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {companies.map((company) => {
        const companyBranches = branches.filter((branch) => branch.company_id === company.id);
        return <Card key={company.id} className="p-5"><Heading icon={<Building2 />} title={company.name} count={companyBranches.length} label={t('organization.branches')} />
          <div className="mt-5 flex flex-col gap-3">{companyBranches.map((branch) => <BranchBlock key={branch.id} branch={branch} teams={teams} people={people} />)}</div>
        </Card>;
      })}
    </div>
  );
}

function BranchesView({ companies, branches, teams, people }: OrganizationData) {
  const { t } = useTranslation();
  if (branches.length === 0) return <EmptyState icon={<GitBranch className="h-7 w-7" aria-hidden="true" />} title={t('organization.emptyBranches')} body={t('organization.emptyBody')} />;
  return <div className="grid gap-5 xl:grid-cols-2">{branches.map((branch) => <Card key={branch.id} className="p-5"><Heading icon={<GitBranch />} title={branch.name} count={people.filter((person) => person.branchId === branch.id).length} label={companies.find((company) => company.id === branch.company_id)?.name ?? ''} /><div className="mt-5 flex flex-col gap-3"><BranchBlock branch={branch} teams={teams} people={people} /></div></Card>)}</div>;
}

function TeamsView({ companies, branches, teams, people }: OrganizationData) {
  const { t } = useTranslation();
  if (teams.length === 0) return <EmptyState icon={<UsersRound className="h-7 w-7" aria-hidden="true" />} title={t('organization.emptyTeams')} body={t('organization.emptyBody')} />;
  return <div className="grid gap-5 xl:grid-cols-2">{teams.map((team) => { const branch = branches.find((item) => item.id === team.branch_id); return <Card key={team.id} className="p-5"><Heading icon={<UsersRound />} title={team.name} count={people.filter((person) => person.teamId === team.id).length} label={branch ? `${companies.find((company) => company.id === branch.company_id)?.name ?? ''} · ${branch.name}` : ''} /><PeopleList people={people.filter((person) => person.teamId === team.id)} emptyLabel={t('organization.noPeople')} /></Card>; })}</div>;
}

type OrganizationData = {
  companies: { id: string; name: string }[];
  branches: { id: string; company_id: string; name: string }[];
  teams: { id: string; branch_id: string; name: string }[];
  people: RosterMember[];
};

function BranchBlock({ branch, teams, people }: { branch: OrganizationData['branches'][number]; teams: OrganizationData['teams']; people: RosterMember[] }) {
  const { t } = useTranslation();
  const branchTeams = teams.filter((team) => team.branch_id === branch.id);
  return <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-primary-900">{branch.name}</span><Badge tone="neutral">{t('organization.teamsCount', { count: branchTeams.length })}</Badge></div><div className="mt-3 flex flex-col gap-3">{branchTeams.map((team) => <div key={team.id} className="rounded-lg border border-neutral-200 bg-white p-3"><div className="flex items-center justify-between gap-3"><span className="font-medium text-primary-900">{team.name}</span><span className="text-xs text-neutral-600">{t('organization.peopleCount', { count: people.filter((person) => person.teamId === team.id).length })}</span></div><PeopleList people={people.filter((person) => person.teamId === team.id)} emptyLabel={t('organization.noPeople')} /></div>)}</div></div>;
}

function PeopleList({ people, emptyLabel }: { people: RosterMember[]; emptyLabel: string }) {
  return <div className="mt-3 flex flex-col gap-2">{people.length === 0 ? <p className="text-xs text-neutral-500">{emptyLabel}</p> : people.map((person) => <div key={person.id} className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-2 text-sm"><span className="truncate font-medium text-primary-900">{person.fullNameEn}</span><span className="shrink-0 font-mono text-xs text-neutral-500" dir="ltr">{person.userId}</span></div>)}</div>;
}

function Heading({ icon, title, count, label }: { icon: ReactNode; title: string; count: number; label: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">{icon}</span><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold text-primary-900">{title}</h2><p className="text-xs text-neutral-600">{label} · {count}</p></div></div>;
}

function comparePeople(left: RosterMember, right: RosterMember) {
  if (left.rosterOrder !== null && right.rosterOrder !== null) return left.rosterOrder - right.rosterOrder;
  if (left.rosterOrder !== null) return -1;
  if (right.rosterOrder !== null) return 1;
  return left.fullNameEn.localeCompare(right.fullNameEn);
}
