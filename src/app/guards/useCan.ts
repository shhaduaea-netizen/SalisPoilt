import { can, type Action, type PermissionResource } from '@/domain/permissions';
import { useCurrentUser } from '@/data/queries';

export function useCan(action: Action, resource?: PermissionResource): boolean {
  const { data: user } = useCurrentUser();
  return can(user, action, resource);
}
