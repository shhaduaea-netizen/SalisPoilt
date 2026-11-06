import type { Branch, Company, Employee, Product, Sale, SaleStatus, SessionUser, Team } from '@/shared/types/domain';

export type DataMode = 'demo' | 'supabase';

export class AccessDeniedError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export interface SaleFilters {
  statuses?: SaleStatus[];
  branchId?: string;
  teamId?: string;
  employeeId?: string;
  from?: string;
  to?: string;
}

/**
 * Every tenant-scoped method takes the acting user. Adapters must restrict results to that user's
 * company and visibility scope. Cross-tenant access only goes through PlatformRepository.
 */
export interface AuthRepository {
  currentUser(): Promise<SessionUser>;
  listDemoPersonas(): Promise<SessionUser[]>;
  switchDemoPersona(personaId: string): Promise<SessionUser>;
}

export interface PlatformRepository {
  listCompanies(actor: SessionUser): Promise<Company[]>;
}

export interface OrganizationRepository {
  getCompany(actor: SessionUser): Promise<Company>;
  listBranches(actor: SessionUser): Promise<Branch[]>;
  listTeams(actor: SessionUser): Promise<Team[]>;
  listEmployees(actor: SessionUser): Promise<Employee[]>;
}

export interface SalesRepository {
  listSales(actor: SessionUser, filters?: SaleFilters): Promise<Sale[]>;
}

export interface CatalogRepository {
  listProducts(actor: SessionUser): Promise<Product[]>;
}

export interface DataAdapter {
  readonly mode: DataMode;
  readonly auth: AuthRepository;
  readonly platform: PlatformRepository;
  readonly organization: OrganizationRepository;
  readonly sales: SalesRepository;
  readonly catalog: CatalogRepository;
}
