import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import type { RosterMember } from '@/features/roster/rosterApi';

export function RemoveMemberDialog({
  member,
  pending,
  error,
  onConfirm,
  onOpenChange,
}: {
  member: RosterMember | null;
  pending: boolean;
  error: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={member !== null}
      onOpenChange={onOpenChange}
      title={t('roster.remove.title', { name: member?.fullNameEn ?? '' })}
      description={t('roster.remove.description')}
    >
      <div className="flex flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
            {t('roster.remove.failed')}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button variant="danger" disabled={pending} onClick={onConfirm} className="w-full sm:w-auto">
            {pending ? t('roster.remove.removing') : t('roster.remove.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
