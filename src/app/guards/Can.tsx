import type { ReactNode } from 'react';
import type { Action, PermissionResource } from '@/domain/permissions';
import { useCan } from '@/app/guards/useCan';

export function Can({
  action,
  resource,
  fallback = null,
  children,
}: {
  action: Action;
  resource?: PermissionResource;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return useCan(action, resource) ? <>{children}</> : <>{fallback}</>;
}
