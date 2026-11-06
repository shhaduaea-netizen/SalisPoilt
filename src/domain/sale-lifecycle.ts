import type { ApprovalMode, Role, SaleSource, SaleStatus } from '@/shared/types/domain';

const TRANSITIONS: Record<SaleStatus, readonly SaleStatus[]> = {
  draft: ['pending_approval', 'approved', 'cancelled'],
  pending_approval: ['approved', 'rejected', 'cancelled'],
  approved: ['returned', 'cancelled'],
  rejected: ['draft'],
  cancelled: [],
  returned: [],
};

export function canTransitionSale(from: SaleStatus, to: SaleStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface InitialStatusInput {
  source: SaleSource;
  importApprovalMode: ApprovalMode;
  manualSalesRequireApproval: boolean;
  actorRole: Role;
}

const MANAGER_ENTRY_ROLES: readonly Role[] = ['COMPANY_ADMIN', 'BRANCH_MANAGER', 'SUPER_ADMIN'];

export function resolveInitialSaleStatus(input: InitialStatusInput): SaleStatus {
  if (input.source === 'import') {
    return input.importApprovalMode === 'AUTOMATIC' ? 'approved' : 'pending_approval';
  }
  if (MANAGER_ENTRY_ROLES.includes(input.actorRole)) return 'approved';
  return input.manualSalesRequireApproval ? 'pending_approval' : 'approved';
}
