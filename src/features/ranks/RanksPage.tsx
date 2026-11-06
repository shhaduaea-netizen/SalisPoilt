import { useEffect, useState } from 'react';
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useRanks,
  useRosterList,
  useCreateRank,
  useUpdateRank,
  useDeleteRank,
} from '@/features/roster/useRoster';
import {
  RANK_PERMISSIONS,
  type CustomRank,
} from '@/features/roster/rosterApi';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Field, inputClass } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

type RankScope = 'company' | 'branch' | 'specific';

export function RanksPage() {
  const { t } = useTranslation();
  const ranksQuery = useRanks();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<CustomRank | null>(null);
  const [deleting, setDeleting] = useState<CustomRank | null>(null);

  if (ranksQuery.isPending) return <Skeleton className="h-96 w-full" />;
  if (ranksQuery.isError) return <ErrorState onRetry={() => void ranksQuery.refetch()} />;

  const ranks = ranksQuery.data?.ranks ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('ranksPage.title')}
        description={t('ranksPage.description')}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('ranksPage.add')}
          </Button>
        }
      />
      {ranks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Shield className="h-7 w-7" aria-hidden="true" />}
            title={t('ranksPage.emptyTitle')}
            body={t('ranksPage.emptyBody')}
          />
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {ranks.map((rank) => (
            <Card key={rank.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                    <Shield className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-primary-900">{rank.name}</h2>
                    {rank.nameAr && <p className="text-xs text-neutral-600" dir="auto">{rank.nameAr}</p>}
                    <p className="mt-1 text-xs font-medium text-accent-700">{t(`ranksPage.scope.${rank.scope}`)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(rank)} aria-label={t('common.save')}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(rank)}
                    className="text-error-700 hover:bg-error-50"
                    aria-label={t('roster.actions.remove')}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              {rank.permissions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
                  {rank.permissions.map((perm) => (
                    <Badge key={perm} tone="info">
                      {t(`ranksPage.permissions.${perm}`, { defaultValue: perm })}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <RankDialog
        open={addOpen || editing !== null}
        rank={editing}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setEditing(null);
          }
        }}
      />
      <DeleteRankDialog
        rank={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </div>
  );
}

function PermissionSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (perms: string[]) => void;
}) {
  const { t } = useTranslation();
  const toggle = (perm: string) => {
    if (selected.includes(perm)) onChange(selected.filter((p) => p !== perm));
    else onChange([...selected, perm]);
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {RANK_PERMISSIONS.map((perm) => (
        <label
          key={perm}
          className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-neutral-50"
        >
          <input
            type="checkbox"
            checked={selected.includes(perm)}
            onChange={() => toggle(perm)}
            className="h-4 w-4 rounded border-neutral-300 text-accent-600 focus:ring-accent-500"
          />
          <span className="text-primary-900">{t(`ranksPage.permissions.${perm}`, { defaultValue: perm })}</span>
        </label>
      ))}
    </div>
  );
}

function ScopeSelector({
  scope,
  onChange,
}: {
  scope: RankScope;
  onChange: (scope: RankScope) => void;
}) {
  const { t } = useTranslation();
  const isCompany = scope === 'company';
  const isSpecific = scope === 'specific';
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm transition-colors ${isSpecific ? 'opacity-50' : 'cursor-pointer hover:bg-neutral-50'}`}>
        <span className="text-primary-900">{t('ranksPage.applyToAll')}</span>
        <button
          type="button"
          role="switch"
          aria-checked={isCompany}
          disabled={isSpecific}
          onClick={() => onChange(isCompany ? 'branch' : 'company')}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${isCompany ? 'bg-accent-600' : 'bg-neutral-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCompany ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'}`} />
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-primary-900 cursor-pointer">
        <input
          type="checkbox"
          checked={isSpecific}
          onChange={() => onChange(isSpecific ? 'branch' : 'specific')}
          className="h-4 w-4 rounded border-neutral-300 text-accent-600 focus:ring-accent-500"
        />
        {t('ranksPage.selectSpecific')}
      </label>
    </div>
  );
}

function MemberPicker({
  members,
  selected,
  onChange,
}: {
  members: { id: string; fullNameEn: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };
  if (members.length === 0) {
    return <p className="text-sm text-neutral-500">{t('ranksPage.noMembers')}</p>;
  }
  return (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 p-2">
      {members.map((m) => (
        <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer rounded hover:bg-neutral-50">
          <input
            type="checkbox"
            checked={selected.includes(m.id)}
            onChange={() => toggle(m.id)}
            className="h-4 w-4 rounded border-neutral-300 text-accent-600 focus:ring-accent-500"
          />
          <span className="text-primary-900" dir="auto">{m.fullNameEn}</span>
        </label>
      ))}
    </div>
  );
}

function RankDialog({
  open,
  rank,
  onOpenChange,
}: {
  open: boolean;
  rank: CustomRank | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const createMutation = useCreateRank();
  const updateMutation = useUpdateRank();
  const rosterQuery = useRosterList('');
  const isEdit = rank !== null;
  const mutation = isEdit ? updateMutation : createMutation;

  const [name, setName] = useState(rank?.name ?? '');
  const [nameAr, setNameAr] = useState(rank?.nameAr ?? '');
  const [permissions, setPermissions] = useState<string[]>(rank?.permissions ?? []);
  const [scope, setScope] = useState<RankScope>(rank?.scope ?? 'company');
  const [memberIds, setMemberIds] = useState<string[]>(rank?.memberIds ?? []);

  useEffect(() => {
    if (rank) {
      setName(rank.name);
      setNameAr(rank.nameAr ?? '');
      setPermissions(rank.permissions);
      setScope(rank.scope);
      setMemberIds(rank.memberIds);
    } else {
      setName('');
      setNameAr('');
      setPermissions([]);
      setScope('company');
      setMemberIds([]);
    }
  }, [rank, open]);

  const allMembers = (rosterQuery.data?.members ?? []).map((m) => ({ id: m.id, fullNameEn: m.fullNameEn }));

  const handleClose = (next: boolean) => {
    if (!next && mutation.isPending) return;
    if (!next) {
      mutation.reset();
    }
    onOpenChange(next);
  };

  const submit = async () => {
    try {
      if (isEdit && rank) {
        await updateMutation.mutateAsync({
          id: rank.id,
          name: name.trim(),
          nameAr: nameAr.trim() || null,
          permissions,
          scope,
          memberIds: scope === 'specific' ? memberIds : [],
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          nameAr: nameAr.trim() || null,
          permissions,
          scope,
          memberIds: scope === 'specific' ? memberIds : [],
        });
      }
      handleClose(false);
    } catch {
      // surfaced via mutation.isError
    }
  };

  const canSubmit = name.trim() && !mutation.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      size="lg"
      title={isEdit ? t('ranksPage.editTitle') : t('ranksPage.addTitle')}
      description={t('ranksPage.addDescription')}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void submit();
        }}
        className="flex flex-col gap-5"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="rank-name" label={t('ranksPage.fieldName')}>
            <input
              id="rank-name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={mutation.isPending}
              autoFocus
            />
          </Field>
          <Field id="rank-name-ar" label={t('ranksPage.fieldNameAr')}>
            <input
              id="rank-name-ar"
              className={inputClass}
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              disabled={mutation.isPending}
              dir="auto"
            />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-primary-900">{t('ranksPage.permissionsLabel')}</p>
          <PermissionSelector selected={permissions} onChange={setPermissions} />
        </div>
        <div className="border-t border-neutral-200 pt-4">
          <p className="mb-3 text-sm font-medium text-primary-900">{t('ranksPage.scopeLabel')}</p>
          <ScopeSelector scope={scope} onChange={setScope} />
          {scope === 'specific' && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-neutral-600">{t('ranksPage.specificHint')}</p>
              <MemberPicker members={allMembers} selected={memberIds} onChange={setMemberIds} />
            </div>
          )}
        </div>
        {mutation.isError && (
          <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
            {t('ranksPage.saveFailed')}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={() => handleClose(false)} disabled={mutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {mutation.isPending ? t('common.save') : isEdit ? t('common.save') : t('ranksPage.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteRankDialog({
  rank,
  onOpenChange,
}: {
  rank: CustomRank | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteRank();

  const confirm = async () => {
    if (!rank) return;
    try {
      await deleteMutation.mutateAsync(rank.id);
      onOpenChange(false);
    } catch {
      // surfaced via mutation.isError
    }
  };

  return (
    <Modal open={rank !== null} onOpenChange={onOpenChange} title={t('ranksPage.deleteTitle')}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-700">
          {t('ranksPage.deleteConfirm', { name: rank?.name ?? '' })}
        </p>
        {deleteMutation.isError && (
          <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
            {t('ranksPage.deleteFailed')}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={() => void confirm()} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? t('roster.remove.removing') : t('roster.actions.remove')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
