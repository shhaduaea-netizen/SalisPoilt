import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Field, inputClass } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import type { RosterListResponse, RosterMember } from '@/features/roster/rosterApi';
import type { CustomRank } from '@/features/roster/rosterApi';

const schema = z.object({
  fullNameEn: z.string().trim().min(1),
  fullNameAr: z.string().trim(),
  customRankId: z.string(),
  branchId: z.string(),
  status: z.enum(['Active', 'Suspended']),
});

type EditValues = z.infer<typeof schema>;

export interface EditMemberSaveFields {
  fullNameEn: string;
  fullNameAr: string | null;
  customRankId: string | null;
  branchId: string | null;
  status: 'Active' | 'Suspended';
}

export function EditMemberDialog({
  member,
  roster,
  ranks,
  pending,
  error,
  onSave,
  onOpenChange,
}: {
  member: RosterMember | null;
  roster: RosterListResponse;
  ranks: CustomRank[];
  pending: boolean;
  error: boolean;
  onSave: (fields: EditMemberSaveFields) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  });

  useEffect(() => {
    reset(member ? valuesFor(member) : emptyValues());
  }, [member, reset]);

  const submit = (values: EditValues) => onSave({
    fullNameEn: values.fullNameEn,
    fullNameAr: values.fullNameAr || null,
    customRankId: values.customRankId || null,
    branchId: values.branchId || null,
    status: values.status,
  });

  return (
    <Modal open={member !== null} onOpenChange={onOpenChange} size="lg" title={t('roster.edit.title')} description={t('roster.edit.description')}>
      <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="edit-name-en" label={t('roster.edit.nameEn')} error={errors.fullNameEn && t('roster.edit.nameRequired')}>
            <input id="edit-name-en" className={inputClass} {...register('fullNameEn')} />
          </Field>
          <Field id="edit-name-ar" label={t('roster.edit.nameAr')}>
            <input id="edit-name-ar" dir="auto" className={inputClass} {...register('fullNameAr')} />
          </Field>
          <Field id="edit-rank" label={t('roster.edit.rank')}>
            <select id="edit-rank" className={inputClass} {...register('customRankId')}>
              <option value="">{t('roster.import.noRank')}</option>
              {ranks.map((rank) => <option key={rank.id} value={rank.id}>{rank.nameAr ?? rank.name}</option>)}
            </select>
          </Field>
          <Field id="edit-branch" label={t('roster.edit.branch')}>
            <select id="edit-branch" className={inputClass} {...register('branchId')}>
              <option value="">{t('roster.edit.noBranch')}</option>
              {roster.lookups.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </Field>
          <Field id="edit-status" label={t('roster.edit.status')}>
            <select id="edit-status" className={inputClass} {...register('status')}>
              <option value="Active">{t('roster.status.Active')}</option>
              <option value="Suspended">{t('roster.status.Suspended')}</option>
            </select>
          </Field>
        </div>
        {error && <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">{t('roster.edit.saveFailed')}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={pending}>{pending ? t('roster.edit.saving') : t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}

function emptyValues(): EditValues {
  return { fullNameEn: '', fullNameAr: '', customRankId: '', branchId: '', status: 'Active' };
}

function valuesFor(member: RosterMember): EditValues {
  return {
    fullNameEn: member.fullNameEn,
    fullNameAr: member.fullNameAr ?? '',
    customRankId: member.customRankId ?? '',
    branchId: member.branchId ?? '',
    status: member.status,
  };
}
