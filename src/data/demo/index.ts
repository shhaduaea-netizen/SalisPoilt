import { createRandom } from '@/data/demo/random';
import {
  alNoorCompany,
  branches,
  companies,
  DEMO_COMPANY_IDS,
  DEMO_PLATFORM_ADMIN_ID,
  employees,
  findPersonaSeedEmployee,
  gulfMotorsCompany,
  products,
  teams,
  toSessionUser,
} from '@/data/demo/organization';
import { generateSales } from '@/data/demo/sales';
import type { Branch, Company, Employee, Product, Sale, SessionUser, Team } from '@/shared/types/domain';

export interface DemoDataset {
  companies: Company[];
  branches: Branch[];
  teams: Team[];
  employees: Employee[];
  products: Product[];
  sales: Sale[];
  personas: SessionUser[];
}

const SALES_START = '2025-11-01';
const SALES_END = '2026-10-31';

function buildSales(): Sale[] {
  const random = createRandom(20261031);
  const managerByBranch = new Map(branches.map((b) => [b.id, b.managerId]));

  const alNoorSales = generateSales({
    random,
    companyId: alNoorCompany.id,
    sellers: employees.filter(
      (e) => e.companyId === alNoorCompany.id && (e.role === 'EMPLOYEE' || e.role === 'TEAM_LEADER')
    ),
    managerByBranch,
    products: products.filter((p) => p.companyId === alNoorCompany.id),
    count: 600,
    startDate: SALES_START,
    endDate: SALES_END,
    numberOffset: 0,
  });

  const gulfSales = generateSales({
    random,
    companyId: gulfMotorsCompany.id,
    sellers: employees.filter((e) => e.companyId === gulfMotorsCompany.id && e.role === 'EMPLOYEE'),
    managerByBranch,
    products: products.filter((p) => p.companyId === gulfMotorsCompany.id),
    count: 80,
    startDate: SALES_START,
    endDate: SALES_END,
    numberOffset: 600,
  });

  return [...alNoorSales, ...gulfSales];
}

function buildPersonas(): SessionUser[] {
  return [
    findPersonaSeedEmployee(DEMO_COMPANY_IDS.alNoor, 'COMPANY_ADMIN'),
    findPersonaSeedEmployee(DEMO_COMPANY_IDS.alNoor, 'BRANCH_MANAGER', 'br-noor-dxb'),
    findPersonaSeedEmployee(DEMO_COMPANY_IDS.alNoor, 'TEAM_LEADER', 'br-noor-dxb'),
    findPersonaSeedEmployee(DEMO_COMPANY_IDS.alNoor, 'EMPLOYEE', 'br-noor-dxb'),
  ].map(toSessionUser);
}

export function createDemoDataset(): DemoDataset {
  const platformAdmin: SessionUser = {
    id: DEMO_PLATFORM_ADMIN_ID,
    companyId: null,
    role: 'SUPER_ADMIN',
    displayName: 'SalesPilot Platform',
    branchIds: [],
    teamId: null,
  };

  return {
    companies,
    branches,
    teams,
    employees,
    products,
    sales: buildSales(),
    personas: [platformAdmin, ...buildPersonas()],
  };
}
