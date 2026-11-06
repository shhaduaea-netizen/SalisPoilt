import { describe, expect, it } from 'vitest';
import { createDemoAdapter } from '@/data/adapters/demo/createDemoAdapter';
import { AccessDeniedError } from '@/data/adapters/repositories';
import { DEMO_COMPANY_IDS } from '@/data/demo/organization';
import type { Role } from '@/shared/types/domain';

async function adapterAs(role: Role) {
  const adapter = createDemoAdapter();
  const persona = (await adapter.auth.listDemoPersonas()).find((p) => p.role === role);
  if (!persona) throw new Error(`No persona for ${role}`);
  await adapter.auth.switchDemoPersona(persona.id);
  return { adapter, actor: await adapter.auth.currentUser() };
}

describe('demo adapter tenant isolation and visibility', () => {
  it('returns only the acting company records to a company admin', async () => {
    const { adapter, actor } = await adapterAs('COMPANY_ADMIN');
    const employees = await adapter.organization.listEmployees(actor);
    const sales = await adapter.sales.listSales(actor);
    expect(employees.every((e) => e.companyId === DEMO_COMPANY_IDS.alNoor)).toBe(true);
    expect(sales.every((s) => s.companyId === DEMO_COMPANY_IDS.alNoor)).toBe(true);
    expect(sales).toHaveLength(600);
  });

  it('limits a branch manager to their own branch', async () => {
    const { adapter, actor } = await adapterAs('BRANCH_MANAGER');
    const sales = await adapter.sales.listSales(actor);
    expect(sales.length).toBeGreaterThan(0);
    expect(sales.every((s) => actor.branchIds.includes(s.branchId))).toBe(true);
  });

  it('limits an employee to their own sales', async () => {
    const { adapter, actor } = await adapterAs('EMPLOYEE');
    const sales = await adapter.sales.listSales(actor);
    expect(sales.every((s) => s.employeeId === actor.id)).toBe(true);
  });

  it('denies tenant sales rows to Super Admin', async () => {
    const { adapter, actor } = await adapterAs('SUPER_ADMIN');
    await expect(adapter.sales.listSales(actor)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it('lists companies only through the platform path', async () => {
    const { adapter, actor } = await adapterAs('SUPER_ADMIN');
    const companies = await adapter.platform.listCompanies(actor);
    expect(companies.map((c) => c.id)).toEqual([DEMO_COMPANY_IDS.alNoor, DEMO_COMPANY_IDS.gulfMotors]);
    const { adapter: tenantAdapter, actor: tenantActor } = await adapterAs('COMPANY_ADMIN');
    await expect(tenantAdapter.platform.listCompanies(tenantActor)).rejects.toBeInstanceOf(AccessDeniedError);
  });
});
