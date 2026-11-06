import { useEffect, useState } from 'react';
import { GitBranch, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';
import { EditMemberDialog, type EditMemberSaveFields } from '@/features/roster/EditMemberDialog';
import { useCreateBranch, useDeleteBranch, useRanks, useRosterList, useUpdateBranch, useUpdateRosterMember } from '@/features/roster/useRoster';
import type { RosterMember } from '@/features/roster/rosterApi';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { Field, inputClass } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

export function BranchesPage() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const member = state.status === 'ready' ? state.member : null;
  const rosterQuery = useRosterList(member?.id ?? '');
  const ranksQuery = useRanks();
  const updateMemberMutation = useUpdateRosterMember();
  const [addOpen, setAddOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<{ id: string; name: string } | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<{ id: string; name: string } | null>(null);
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);

  if (!member || rosterQuery.isPending) return <Skeleton className="h-96 w-full" />;
  if (rosterQuery.isError) return <ErrorState onRetry={() => void rosterQuery.refetch()} />;

  const roster = rosterQuery.data;
  const branches = roster?.lookups.branches ?? [];
  const companies = roster?.lookups.companies ?? [];
  const members = roster?.members ?? [];
  const ranks = ranksQuery.data?.ranks ?? [];

  const saveMember = (fields: EditMemberSaveFields) => {
    if (!editingMember) return;
    updateMemberMutation.mutate({
      id: editingMember.id,
      fields: {
        ...fields,
        role: editingMember.role,
        companyId: editingMember.companyId,
        branchId: fields.branchId,
        teamId: editingMember.teamId,
      },
    }, { onSuccess: () => setEditingMember(null) });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('branchesPage.title')}
        description={t('branchesPage.description')}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" />{t('branchesPage.add')}</Button>}
      />
      {branches.length === 0 ? (
        <Card><EmptyState icon={<GitBranch className="h-7 w-7" aria-hidden="true" />} title={t('branchesPage.emptyTitle')} body={t('branchesPage.emptyBody')} /></Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {branches.map((branch) => {
            const companyName = companies.find((c) => c.id === branch.company_id)?.name ?? '';
            const branchMembers = members.filter((m) => m.branchId === branch.id);
            return (
              <Card key={branch.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700"><GitBranch className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold text-primary-900">{branch.name}</h2>
                    <p className="text-xs text-neutral-600">{companyName}</p>
                    <p className="mt-1 text-xs text-neutral-600">{t('branchesPage.membersCount', { count: branchMembers.length })}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingBranch({ id: branch.id, name: branch.name })} aria-label={t('branchesPage.edit')}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeletingBranch({ id: branch.id, name: branch.name })} className="text-error-700 hover:bg-error-50" aria-label={t('branchesPage.delete')}><Trash2 className="h-4 w-4" /></Button>
                    <Badge tone="neutral">{t('branchesPage.branch')}</Badge>
                  </div>
                </div>
                {branchMembers.length > 0 && (
                  <div className="mt-4 border-t border-neutral-100 pt-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-600"><Users className="h-4 w-4" />{t('branchesPage.people')}</p>
                    <div className="flex flex-col gap-2">
                      {branchMembers.map((person) => <button key={person.id} type="button" onClick={() => setEditingMember(person)} className="flex items-center justify-between rounded-lg px-2 py-2 text-start hover:bg-neutral-50"><span className="text-sm text-primary-900">{person.fullNameAr ?? person.fullNameEn}</span><span className="text-xs text-neutral-500">{person.email}</span></button>)}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <AddBranchDialog open={addOpen} onOpenChange={setAddOpen} />
      <BranchNameDialog branch={editingBranch} onOpenChange={(open) => { if (!open) setEditingBranch(null); }} />
      <DeleteBranchDialog branch={deletingBranch} onOpenChange={(open) => { if (!open) setDeletingBranch(null); }} />
      {roster && <EditMemberDialog member={editingMember} roster={roster} ranks={ranks} pending={updateMemberMutation.isPending} error={updateMemberMutation.isError} onSave={saveMember} onOpenChange={(open) => { if (!open) setEditingMember(null); }} />}
    </div>
  );
}

function AddBranchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const mutation = useCreateBranch();
  const [name, setName] = useState('');
  const close = (next: boolean) => { if (!next && mutation.isPending) return; if (!next) { setName(''); mutation.reset(); } onOpenChange(next); };
  return <Modal open={open} onOpenChange={close} title={t('branchesPage.addTitle')}><form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void mutation.mutateAsync({ name: name.trim() }).then(() => close(false)).catch(() => undefined); }} className="flex flex-col gap-4"><Field id="branch-name" label={t('branchesPage.fieldName')}><input id="branch-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>{mutation.isError && <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{t('branchesPage.addFailed')}</p>}<div className="flex justify-end gap-3"><Button variant="secondary" type="button" onClick={() => close(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={!name.trim() || mutation.isPending}>{t('branchesPage.add')}</Button></div></form></Modal>;
}

function BranchNameDialog({ branch, onOpenChange }: { branch: { id: string; name: string } | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const mutation = useUpdateBranch();
  const [name, setName] = useState(branch?.name ?? '');
  useEffect(() => { setName(branch?.name ?? ''); mutation.reset(); }, [branch, mutation.reset]);
  return <Modal open={branch !== null} onOpenChange={onOpenChange} title={t('branchesPage.editTitle')}><form onSubmit={(e) => { e.preventDefault(); if (!branch || !name.trim()) return; void mutation.mutateAsync({ id: branch.id, name: name.trim() }).then(() => onOpenChange(false)); }} className="flex flex-col gap-4"><Field id="edit-branch-name" label={t('branchesPage.fieldName')}><input id="edit-branch-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>{mutation.isError && <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{t('branchesPage.editFailed')}</p>}<div className="flex justify-end gap-3"><Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button><Button type="submit" disabled={!name.trim() || mutation.isPending}>{t('common.save')}</Button></div></form></Modal>;
}

function DeleteBranchDialog({ branch, onOpenChange }: { branch: { id: string; name: string } | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const mutation = useDeleteBranch();
  return <Modal open={branch !== null} onOpenChange={onOpenChange} title={t('branchesPage.deleteTitle')}><div className="flex flex-col gap-4"><p className="text-sm text-neutral-700">{t('branchesPage.deleteConfirm', { name: branch?.name ?? '' })}</p>{mutation.isError && <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{t('branchesPage.deleteFailed')}</p>}<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button><Button variant="danger" disabled={!branch || mutation.isPending} onClick={() => branch && void mutation.mutateAsync(branch.id).then(() => onOpenChange(false))}>{t('branchesPage.delete')}</Button></div></div></Modal>;
}
