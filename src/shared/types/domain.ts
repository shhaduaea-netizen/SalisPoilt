export const ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] as const;
export type Role = (typeof ROLES)[number];

export const SALE_STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled', 'returned'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'cheque', 'financing'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['paid', 'partial', 'unpaid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type SaleSource = 'manual' | 'import';
export type ApprovalMode = 'AUTOMATIC' | 'MANAGER_APPROVAL';
export type PerformanceBasis = 'net' | 'gross';
export type RankingMetric = 'score' | 'value' | 'count';
export type LeaderboardVisibility = 'full' | 'rank_only' | 'hidden';
export type WorkWeek = 'mon_fri' | 'sat_wed' | 'sun_thu';
export type CompanyStatus = 'active' | 'suspended';
export type EmployeeStatus = 'active' | 'inactive';

export interface PerformanceWeights {
  count: number;
  value: number;
}

export interface Company {
  id: string;
  name: string;
  nameAr: string;
  industry: string;
  status: CompanyStatus;
  plan: 'starter' | 'growth' | 'enterprise';
  currencyCode: 'AED';
  exchangeRate?: number;
  vatRate: number;
  workWeek: WorkWeek;
  approvalMode: ApprovalMode;
  manualSalesRequireApproval: boolean;
  performanceBasis: PerformanceBasis;
  performanceWeights: PerformanceWeights;
  rankingMetric: RankingMetric;
  leaderboardVisibility: LeaderboardVisibility;
  createdAt: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  nameAr: string;
  city: 'Dubai' | 'Abu Dhabi' | 'Sharjah';
  managerId: string | null;
}

export interface Team {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  nameAr: string;
  leaderId: string | null;
}

export interface Employee {
  id: string;
  companyId: string;
  branchId: string;
  teamId: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  email: string;
  role: Role;
  status: EmployeeStatus;
  joinedOn: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  nameAr: string;
  category: string;
  currencyCode: 'AED';
}

export interface Sale {
  id: string;
  companyId: string;
  saleNumber: string;
  invoiceNumber: string;
  saleDate: string;
  employeeId: string;
  teamId: string | null;
  branchId: string;
  customerId: string | null;
  productId: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currencyCode: 'AED';
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  source: SaleSource;
  importBatchId: string | null;
  notes: string;
  status: SaleStatus;
  createdBy: string;
  approvedBy: string | null;
  returnedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  companyId: string | null;
  role: Role;
  displayName: string;
  branchIds: string[];
  teamId: string | null;
  customRankId?: string | null;
  customRankName?: string | null;
  customRankPermissions?: string[];
}
