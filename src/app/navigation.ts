import {
  Bell,
  BarChart3,
  Building2,
  ClipboardCheck,
  Contact,
  FileUp,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  Target,
  UserCircle,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { Action } from '@/domain/permissions';

export interface NavItem {
  key: string;
  path: string;
  action: Action;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar; the rest live under "More". */
  mobilePrimary?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', path: '/', action: 'dashboard.view', icon: LayoutDashboard, mobilePrimary: true },
  { key: 'companies', path: '/companies', action: 'platform.manage_companies', icon: Building2 },
  { key: 'branches', path: '/branches', action: 'branch.manage', icon: GitBranch },
  { key: 'ranks', path: '/ranks', action: 'roles.manage', icon: Shield },
  { key: 'employees', path: '/employees', action: 'employee.view', icon: Users },
  { key: 'teams', path: '/teams', action: 'team.view', icon: UsersRound },
  { key: 'sales', path: '/sales', action: 'sale.view', icon: Receipt, mobilePrimary: true },
  { key: 'salesImport', path: '/sales/import', action: 'sale.import', icon: FileUp },
  { key: 'reports', path: '/reports', action: 'report.view', icon: BarChart3 },
  { key: 'targets', path: '/targets', action: 'target.view', icon: Target },
  { key: 'approvals', path: '/approvals', action: 'sale.approve', icon: ClipboardCheck, mobilePrimary: true },
  { key: 'passwordRequests', path: '/password-requests', action: 'password.approve', icon: KeyRound },
  { key: 'customers', path: '/customers', action: 'customer.manage', icon: Contact },
  { key: 'notifications', path: '/notifications', action: 'notification.view', icon: Bell },
  { key: 'auditLog', path: '/audit-log', action: 'audit.view', icon: ScrollText },
  { key: 'settings', path: '/settings', action: 'settings.view', icon: Settings },
  { key: 'profile', path: '/profile', action: 'account.manage', icon: UserCircle },
];
