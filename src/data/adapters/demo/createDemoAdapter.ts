import { can } from '@/domain/permissions';
import { createDemoDataset, type DemoDataset } from '@/data/demo';
import { AccessDeniedError, type DataAdapter, type SaleFilters } from '@/data/adapters/repositories';
import type { SessionUser } from '@/shared/types/domain';

const SIMULATED_LATENCY_MS = 180;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS));
}

function requireCompany(actor: SessionUser): string {
  if (!actor.companyId) throw new AccessDeniedError('This action needs a company context');
  return actor.companyId;
}

export function createDemoAdapter(dataset: DemoDataset = createDemoDataset()): DataAdapter {
  let currentPersonaId = dataset.personas[1].id;

  const currentUser = () => dataset.personas.find((p) => p.id === currentPersonaId) ?? dataset.personas[0];

  return {
    mode: 'demo',

    auth: {
      currentUser: () => delay({ ...currentUser() }),
      listDemoPersonas: () => delay(dataset.personas.map((p) => ({ ...p }))),
      switchDemoPersona: (personaId) => {
        const persona = dataset.personas.find((p) => p.id === personaId);
        if (!persona) return Promise.reject(new AccessDeniedError('Unknown demo persona'));
        currentPersonaId = persona.id;
        return delay({ ...persona });
      },
    },

    platform: {
      listCompanies: async (actor) => {
        if (!can(actor, 'platform.manage_companies')) return Promise.reject(new AccessDeniedError());
        return delay(dataset.companies.map((c) => ({ ...c })));
      },
    },

    organization: {
      getCompany: async (actor) => {
        const companyId = requireCompany(actor);
        const company = dataset.companies.find((c) => c.id === companyId);
        if (!company) return Promise.reject(new AccessDeniedError());
        return delay({ ...company });
      },
      listBranches: async (actor) => {
        const companyId = requireCompany(actor);
        return delay(
          dataset.branches
            .filter((b) => b.companyId === companyId)
            .filter((b) => can(actor, 'branch.view', { companyId, branchId: b.id }))
        );
      },
      listTeams: async (actor) => {
        const companyId = requireCompany(actor);
        return delay(
          dataset.teams
            .filter((t) => t.companyId === companyId)
            .filter((t) => can(actor, 'team.view', { companyId, branchId: t.branchId, teamId: t.id }))
        );
      },
      listEmployees: async (actor) => {
        const companyId = requireCompany(actor);
        return delay(
          dataset.employees
            .filter((e) => e.companyId === companyId)
            .filter((e) =>
              can(actor, 'employee.view', { companyId, branchId: e.branchId, teamId: e.teamId, employeeId: e.id })
            )
        );
      },
    },

    sales: {
      listSales: async (actor, filters: SaleFilters = {}) => {
        const companyId = requireCompany(actor);
        if (!can(actor, 'sale.view', { companyId })) return Promise.reject(new AccessDeniedError());
        return delay(
          dataset.sales
            .filter((s) => s.companyId === companyId)
            .filter((s) =>
              can(actor, 'sale.view', {
                companyId,
                branchId: s.branchId,
                teamId: s.teamId,
                employeeId: s.employeeId,
              })
            )
            .filter((s) => !filters.statuses || filters.statuses.includes(s.status))
            .filter((s) => !filters.branchId || s.branchId === filters.branchId)
            .filter((s) => !filters.teamId || s.teamId === filters.teamId)
            .filter((s) => !filters.employeeId || s.employeeId === filters.employeeId)
            .filter((s) => !filters.from || s.saleDate >= filters.from)
            .filter((s) => !filters.to || s.saleDate <= filters.to)
            .sort((a, b) => (a.saleDate < b.saleDate ? 1 : a.saleDate > b.saleDate ? -1 : 0))
            .map((s) => ({ ...s }))
        );
      },
    },

    catalog: {
      listProducts: async (actor) => {
        const companyId = requireCompany(actor);
        return delay(dataset.products.filter((p) => p.companyId === companyId));
      },
    },
  };
}
