import type { ReactNode } from 'react';
import type { Action } from '@/domain/permissions';
import { useCan } from '@/app/guards/useCan';
import { NoPermissionState } from '@/shared/ui/NoPermissionState';

export function RequirePermission({ action, children }: { action: Action; children: ReactNode }) {
  const allowed = useCan(action);
  if (!allowed) return <NoPermissionState />;
  return <>{children}</>;
}
