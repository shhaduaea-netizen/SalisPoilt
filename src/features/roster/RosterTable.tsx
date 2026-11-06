import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import type { RosterMember, RosterStatus } from '@/features/roster/rosterApi';

const STATUS_TONE: Record<RosterStatus, BadgeTone> = {
  Active: 'success',
  Suspended: 'error',
};

const HEADER_CLASS = 'px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-neutral-600';

export function RosterTable({
  members,
  rankName,
  onEdit,
  onRemove,
}: {
  members: RosterMember[];
  rankName?: (member: RosterMember) => string | null;
  onEdit: (member: RosterMember) => void;
  onRemove: (member: RosterMember) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-neutral-200 text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th scope="col" className={HEADER_CLASS}>{t('roster.columns.person')}</th>
            <th scope="col" className={HEADER_CLASS}>{t('roster.columns.userId')}</th>
            <th scope="col" className={HEADER_CLASS}>{t('roster.columns.rank')}</th>
            <th scope="col" className={HEADER_CLASS}>{t('roster.columns.branch')}</th>
            <th scope="col" className={HEADER_CLASS}>{t('roster.columns.team')}</th>
            <th scope="col" className={HEADER_CLASS}>{t('roster.columns.status')}</th>
            <th scope="col" className={HEADER_CLASS}>
              <span className="sr-only">{t('roster.columns.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {members.map((member) => {
            const rank = rankName ? rankName(member) : null;
            return (
              <tr key={member.id} className="transition-colors hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-primary-900" dir="auto">
                      {member.fullNameEn}
                    </span>
                    {member.fullNameAr && (
                      <span className="text-xs text-neutral-600" dir="auto">
                        {member.fullNameAr}
                      </span>
                    )}
                    <span className="text-xs text-neutral-500" dir="ltr">
                      {member.email}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-neutral-700" dir="ltr">{member.userId}</td>
                <td className="px-4 py-3">
                  {rank ? (
                    <Badge tone="info">{rank}</Badge>
                  ) : (
                    <span className="text-xs text-neutral-400">{t('common.none')}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-700">{member.branchName ?? t('common.none')}</td>
                <td className="px-4 py-3 text-neutral-700">{member.teamName ?? t('common.none')}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[member.status]}>{t(`roster.status.${member.status}`)}</Badge>
                </td>
                <td className="px-4 py-3">
                  {member.canManage && (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(member)} aria-label={t('roster.actions.edit')}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden xl:inline">{t('roster.actions.edit')}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(member)}
                        aria-label={t('roster.actions.remove')}
                        className="text-error-700 hover:bg-error-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden xl:inline">{t('roster.actions.remove')}</span>
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
