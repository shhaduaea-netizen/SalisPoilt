import { describe, expect, it } from 'vitest';
import { attainmentPercent, capAttainment, performanceScore, rankSubjects, sumPerformance } from '@/domain/performance';
import { PERMISSION_MATRIX, can } from '@/domain/permissions';
import { canTransitionSale, resolveInitialSaleStatus } from '@/domain/sale-lifecycle';
import type { SessionUser } from '@/shared/types/domain';

const period = { start: '2026-10-01', end: '2026-10-31' };

describe('attainment and score', () => {
  it('computes attainment and returns 0 for a missing target', () => {
    expect(attainmentPercent(50, 100)).toBe(50);
    expect(attainmentPercent(50, 0)).toBe(0);
  });

  it('caps attainment at 150% and floors at 0', () => {
    expect(capAttainment(400)).toBe(150);
    expect(capAttainment(-20)).toBe(0);
  });

  it('weights count and value using the configured weights', () => {
    expect(performanceScore(100, 50, { count: 40, value: 60 })).toBeCloseTo(70);
  });

  it('caps each component before weighting', () => {
    expect(performanceScore(300, 100, { count: 40, value: 60 })).toBeCloseTo(0.4 * 150 + 0.6 * 100);
  });
});

describe('sumPerformance', () => {
  const base = { netAmount: 1000, grossAmount: 1050, returnedOn: null };

  it('counts only approved sales dated inside the period', () => {
    const totals = sumPerformance(
      [
        { ...base, status: 'approved', saleDate: '2026-10-05' },
        { ...base, status: 'pending_approval', saleDate: '2026-10-06' },
        { ...base, status: 'cancelled', saleDate: '2026-10-07' },
        { ...base, status: 'approved', saleDate: '2026-09-30' },
      ],
      'net',
      period
    );
    expect(totals).toEqual({ count: 1, value: 1000 });
  });

  it('uses gross amounts when the basis is gross', () => {
    const totals = sumPerformance([{ ...base, status: 'approved', saleDate: '2026-10-05' }], 'gross', period);
    expect(totals.value).toBe(1050);
  });

  it('deducts a return in the period it happened, not the sale period', () => {
    const sale = { ...base, status: 'returned' as const, saleDate: '2026-09-15', returnedOn: '2026-10-10' };
    expect(sumPerformance([sale], 'net', { start: '2026-09-01', end: '2026-09-30' })).toEqual({
      count: 1,
      value: 1000,
    });
    expect(sumPerformance([sale], 'net', period)).toEqual({ count: -1, value: -1000 });
  });
});

describe('rankSubjects', () => {
  const subjects = [
    { id: 'a', score: 90, value: 500, count: 5, lastSaleDate: '2026-10-02' },
    { id: 'b', score: 90, value: 700, count: 3, lastSaleDate: '2026-10-09' },
    { id: 'c', score: 90, value: 500, count: 5, lastSaleDate: '2026-10-01' },
    { id: 'd', score: 95, value: 100, count: 1, lastSaleDate: null },
  ];

  it('ranks by score and breaks ties by value, then count, then earliest last sale', () => {
    expect(rankSubjects(subjects, 'score').map((s) => s.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('ranks by value when requested', () => {
    expect(rankSubjects(subjects, 'value')[0].id).toBe('b');
  });
});

describe('sale lifecycle', () => {
  it('allows the approval and return transitions only', () => {
    expect(canTransitionSale('pending_approval', 'approved')).toBe(true);
    expect(canTransitionSale('approved', 'returned')).toBe(true);
    expect(canTransitionSale('returned', 'approved')).toBe(false);
    expect(canTransitionSale('cancelled', 'draft')).toBe(false);
  });

  it('routes imports and manual entries to the right initial status', () => {
    expect(
      resolveInitialSaleStatus({
        source: 'import',
        importApprovalMode: 'MANAGER_APPROVAL',
        manualSalesRequireApproval: true,
        actorRole: 'COMPANY_ADMIN',
      })
    ).toBe('pending_approval');
    expect(
      resolveInitialSaleStatus({
        source: 'manual',
        importApprovalMode: 'AUTOMATIC',
        manualSalesRequireApproval: true,
        actorRole: 'EMPLOYEE',
      })
    ).toBe('pending_approval');
    expect(
      resolveInitialSaleStatus({
        source: 'manual',
        importApprovalMode: 'AUTOMATIC',
        manualSalesRequireApproval: true,
        actorRole: 'BRANCH_MANAGER',
      })
    ).toBe('approved');
  });
});

describe('permissions', () => {
  const employee: SessionUser = {
    id: 'emp-1',
    companyId: 'co-1',
    role: 'EMPLOYEE',
    displayName: 'Test',
    branchIds: ['br-1'],
    teamId: 'tm-1',
  };
  const manager: SessionUser = { ...employee, id: 'mgr-1', role: 'BRANCH_MANAGER', teamId: null };
  const superAdmin: SessionUser = {
    ...employee,
    id: 'sa',
    companyId: null,
    role: 'SUPER_ADMIN',
    branchIds: [],
    teamId: null,
  };

  it('lets employees act only on their own records', () => {
    expect(can(employee, 'sale.create', { companyId: 'co-1', employeeId: 'emp-1' })).toBe(true);
    expect(can(employee, 'sale.create', { companyId: 'co-1', employeeId: 'other' })).toBe(false);
  });

  it('keeps managers inside their branch and company', () => {
    expect(can(manager, 'sale.approve', { companyId: 'co-1', branchId: 'br-1' })).toBe(true);
    expect(can(manager, 'sale.approve', { companyId: 'co-1', branchId: 'br-2' })).toBe(false);
    expect(can(manager, 'sale.approve', { companyId: 'co-2', branchId: 'br-1' })).toBe(false);
  });

  it('gives Super Admin full access across platform and tenant actions', () => {
    expect(can(superAdmin, 'platform.manage_companies')).toBe(true);
    expect(can(superAdmin, 'sale.view', { companyId: 'co-1' })).toBe(true);
    expect(can(superAdmin, 'employee.manage', { companyId: 'co-2' })).toBe(true);
  });

  it('denies every action to an anonymous visitor', () => {
    expect(can(null, 'dashboard.view')).toBe(false);
  });

  it('defines a scope for every action in the matrix', () => {
    for (const [action, roles] of Object.entries(PERMISSION_MATRIX)) {
      expect(Object.keys(roles).length, action).toBeGreaterThan(0);
    }
  });
});
