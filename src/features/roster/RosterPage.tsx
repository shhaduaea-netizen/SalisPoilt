import { useMemo, useState } from 'react';
import { Search, Upload, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';
import { inputClass } from '@/shared/ui/Field';
import type { RosterMember } from '@/features/roster/rosterApi';
import type { EditMemberSaveFields } from '@/features/roster/EditMemberDialog';
import { useRemoveRosterMember, useRanks, useRosterList, useUpdateRosterMember } from '@/features/roster/useRoster';
import { RosterTable } from '@/features/roster/RosterTable';
import { EditMemberDialog } from '@/features/roster/EditMemberDialog';
import { RemoveMemberDialog } from '@/features/roster/RemoveMemberDialog';
import { ImportRosterDialog } from '@/features/roster/ImportRosterDialog';

export function RosterPage() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const member: RosterMember | null = state.status === 'ready' ? state.member : null;
  const rosterQuery = useRosterList(member?.id ?? 'unknown');
  const ranksQuery = useRanks();
  const ranks = ranksQuery.data?.ranks ?? [];
  const updateMutation = useUpdateRosterMember();
  const removeMutation = useRemoveRosterMember();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RosterMember | null>(null);
  const [removing, setRemoving] = useState<RosterMember | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const canImport = member?.role !== 'EMPLOYEE' || member?.customRankPermissions.includes('employee.import');

  const roster = rosterQuery.data;
  const visibleMembers = useMemo(() => {
    const members = roster?.members ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((person) =>
      [person.fullNameEn, person.fullNameAr, person.email, person.userId].some((field) =>
        (field ?? '').toLowerCase().includes(term)
      )
    );
  }, [roster, search]);

  const closeEdit = () => {
    setEditing(null);
    updateMutation.reset();
  };

  const closeRemove = () => {
    setRemoving(null);
    removeMutation.reset();
  };

  const saveEdit = (fields: EditMemberSaveFields) => {
    if (!editing) return;
    updateMutation.mutate(
      {
        id: editing.id,
        fields: {
          fullNameEn: fields.fullNameEn,
          fullNameAr: fields.fullNameAr,
          role: editing.role,
          status: fields.status,
          companyId: editing.companyId,
          branchId: fields.branchId,
          teamId: editing.teamId,
          customRankId: fields.customRankId,
        },
      },
      { onSuccess: closeEdit },
    );
  };

  const confirmRemove = () => {
    if (!removing) return;
    removeMutation.mutate(removing.id, { onSuccess: closeRemove });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('roster.title')}
        description={t('roster.description')}
        actions={
          canImport && (
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t('roster.import.open')}
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('roster.searchPlaceholder')}
              aria-label={t('roster.searchPlaceholder')}
              className={`${inputClass} ps-9`}
            />
          </div>
          {roster && <p className="text-sm text-neutral-600">{t('roster.total', { count: roster.members.length })}</p>}
        </div>

        {rosterQuery.isPending && <RosterSkeleton />}
        {rosterQuery.isError && (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <ErrorState onRetry={() => void rosterQuery.refetch()} />
          </div>
        )}
        {roster && roster.members.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <EmptyState
              icon={<Users className="h-7 w-7" aria-hidden="true" />}
              title={t('roster.emptyTitle')}
              body={t('roster.emptyBody')}
            />
          </div>
        )}
        {roster && roster.members.length > 0 && visibleMembers.length === 0 && (
          <p className="rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center text-sm text-neutral-600 shadow-sm">
            {t('roster.noMatches')}
          </p>
        )}
        {visibleMembers.length > 0 && (
          <RosterTable
            members={visibleMembers}
            rankName={(m) => m.customRankName ?? ranks.find((r) => r.id === m.customRankId)?.nameAr ?? ranks.find((r) => r.id === m.customRankId)?.name ?? null}
            onEdit={setEditing}
            onRemove={setRemoving}
          />
        )}
      </div>

      {roster && (
        <EditMemberDialog
          member={editing}
          roster={roster}
          ranks={ranks}
          pending={updateMutation.isPending}
          error={updateMutation.isError}
          onSave={saveEdit}
          onOpenChange={(open) => {
            if (!open) closeEdit();
          }}
        />
      )}
      <RemoveMemberDialog
        member={removing}
        pending={removeMutation.isPending}
        error={removeMutation.isError}
        onConfirm={confirmRemove}
        onOpenChange={(open) => {
          if (!open) closeRemove();
        }}
      />
      {canImport && <ImportRosterDialog open={importOpen} onOpenChange={setImportOpen} />}
    </div>
  );
}

function RosterSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm" role="status">
      <span className="sr-only">{t('common.loading')}</span>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
