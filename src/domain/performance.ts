import type { PerformanceBasis, PerformanceWeights, RankingMetric, Sale } from '@/shared/types/domain';

export const ATTAINMENT_CAP_PERCENT = 150;

export interface PerformanceTotals {
  count: number;
  value: number;
}

export interface PerformancePeriod {
  start: string;
  end: string;
}

export function attainmentPercent(actual: number, target: number): number {
  if (target <= 0) return 0;
  return (actual / target) * 100;
}

export function capAttainment(percent: number): number {
  return Math.min(Math.max(percent, 0), ATTAINMENT_CAP_PERCENT);
}

export function performanceScore(
  countAttainmentPercent: number,
  valueAttainmentPercent: number,
  weights: PerformanceWeights
): number {
  const totalWeight = weights.count + weights.value;
  if (totalWeight <= 0) return 0;
  const weighted =
    weights.count * capAttainment(countAttainmentPercent) + weights.value * capAttainment(valueAttainmentPercent);
  return weighted / totalWeight;
}

export function saleValue(sale: Pick<Sale, 'netAmount' | 'grossAmount'>, basis: PerformanceBasis): number {
  return basis === 'net' ? sale.netAmount : sale.grossAmount;
}

function isWithin(date: string, period: PerformancePeriod): boolean {
  return date >= period.start && date <= period.end;
}

/**
 * Approved sales count in the period of their sale date. A returned sale was counted when it was
 * approved, and its reversal is deducted in the period the return happened.
 */
export function sumPerformance(
  sales: Pick<Sale, 'status' | 'saleDate' | 'returnedOn' | 'netAmount' | 'grossAmount'>[],
  basis: PerformanceBasis,
  period: PerformancePeriod
): PerformanceTotals {
  return sales.reduce<PerformanceTotals>(
    (totals, sale) => {
      const value = saleValue(sale, basis);
      if (sale.status === 'approved' || sale.status === 'returned') {
        if (isWithin(sale.saleDate, period)) {
          totals.count += 1;
          totals.value += value;
        }
      }
      if (sale.status === 'returned' && sale.returnedOn && isWithin(sale.returnedOn, period)) {
        totals.count -= 1;
        totals.value -= value;
      }
      return totals;
    },
    { count: 0, value: 0 }
  );
}

export interface RankableSubject {
  id: string;
  score: number;
  value: number;
  count: number;
  lastSaleDate: string | null;
}

export interface RankedSubject extends RankableSubject {
  rank: number;
}

function compareSubjects(a: RankableSubject, b: RankableSubject, metric: RankingMetric): number {
  const primary = metric === 'score' ? b.score - a.score : metric === 'value' ? b.value - a.value : b.count - a.count;
  if (primary !== 0) return primary;
  if (b.value !== a.value) return b.value - a.value;
  if (b.count !== a.count) return b.count - a.count;
  if (a.lastSaleDate === b.lastSaleDate) return 0;
  if (a.lastSaleDate === null) return 1;
  if (b.lastSaleDate === null) return -1;
  return a.lastSaleDate < b.lastSaleDate ? -1 : 1;
}

export function rankSubjects<T extends RankableSubject>(
  subjects: T[],
  metric: RankingMetric
): (T & { rank: number })[] {
  return [...subjects]
    .sort((a, b) => compareSubjects(a, b, metric))
    .map((subject, index) => ({ ...subject, rank: index + 1 }));
}
