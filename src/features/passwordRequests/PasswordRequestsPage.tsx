import { useTranslation } from 'react-i18next';
import { Check, Clock, KeyRound, X } from 'lucide-react';
import { usePasswordRequests, useReviewPasswordRequest } from '@/features/roster/useRoster';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Skeleton } from '@/shared/ui/Skeleton';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

export function PasswordRequestsPage() {
  const { t } = useTranslation();
  const query = usePasswordRequests();
  const reviewMutation = useReviewPasswordRequest();

  if (query.isPending) return <Skeleton className="h-96 w-full" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  const requests = query.data?.requests ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('passwordRequests.title')}
        description={t('passwordRequests.description')}
      />
      {requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<KeyRound className="h-7 w-7" aria-hidden="true" />}
            title={t('passwordRequests.emptyTitle')}
            body={t('passwordRequests.emptyBody')}
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t('passwordRequests.columns.employee')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t('passwordRequests.columns.userId')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t('passwordRequests.columns.requestedAt')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t('passwordRequests.columns.status')}
                </th>
                <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  {t('passwordRequests.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {requests.map((req) => (
                <tr key={req.id} className="transition-colors hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-primary-900">
                        {req.members?.full_name_en ?? t('common.unknown')}
                      </span>
                      <span className="text-xs text-neutral-500" dir="ltr">
                        {req.members?.email ?? ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-700" dir="ltr">
                    {req.members?.user_id ?? ''}
                  </td>
                  <td className="px-4 py-3 text-neutral-700" dir="ltr">
                    {new Date(req.requested_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[req.status] ?? 'neutral'}>
                      {req.status === 'pending' && <Clock className="h-3 w-3" aria-hidden="true" />}
                      {t(`passwordRequests.status.${req.status}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void reviewMutation.mutateAsync({ id: req.id, decision: 'approved' })}
                          disabled={reviewMutation.isPending}
                          className="text-success-700"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                          {t('passwordRequests.approve')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void reviewMutation.mutateAsync({ id: req.id, decision: 'rejected' })}
                          disabled={reviewMutation.isPending}
                          className="text-error-700 hover:bg-error-50"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          {t('passwordRequests.reject')}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
