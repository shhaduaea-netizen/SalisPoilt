import { useMemo } from 'react';
import { NAV_ITEMS, type NavItem } from '@/app/navigation';
import { useCurrentUser } from '@/data/queries';
import { can } from '@/domain/permissions';

export function useVisibleNavItems(): NavItem[] {
  const { data: user } = useCurrentUser();
  return useMemo(() => NAV_ITEMS.filter((item) => can(user, item.action)), [user]);
}
