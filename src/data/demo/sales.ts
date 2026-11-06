import type { Random } from '@/data/demo/random';
import type { Employee, PaymentMethod, PaymentStatus, Product, Sale, SaleStatus } from '@/shared/types/domain';

const PRICE_RANGES: Record<string, readonly [number, number]> = {
  'pr-apt': [600_000, 2_400_000],
  'pr-villa': [2_500_000, 6_000_000],
  'pr-town': [1_400_000, 2_800_000],
  'pr-comm': [1_000_000, 4_000_000],
  'pr-mgmt': [15_000, 45_000],
  'pr-sedan': [80_000, 160_000],
  'pr-suv': [140_000, 290_000],
  'pr-cpo': [60_000, 130_000],
};

const STATUS_WEIGHTS: readonly [SaleStatus, number][] = [
  ['approved', 82],
  ['pending_approval', 5],
  ['rejected', 3],
  ['cancelled', 3],
  ['returned', 4],
  ['draft', 3],
];

const PAYMENT_METHOD_WEIGHTS: readonly [PaymentMethod, number][] = [
  ['bank_transfer', 35],
  ['financing', 25],
  ['cheque', 20],
  ['card', 12],
  ['cash', 8],
];

const PAYMENT_STATUS_WEIGHTS: readonly [PaymentStatus, number][] = [
  ['paid', 55],
  ['partial', 30],
  ['unpaid', 15],
];

const NOTES = [
  '',
  '',
  '',
  'Referred by an existing client',
  'Handover to finance pending',
  'Early settlement requested',
];

const DAY_MS = 86_400_000;

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function parseIsoDate(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

interface SalesGenerationInput {
  random: Random;
  companyId: string;
  sellers: Employee[];
  managerByBranch: Map<string, string | null>;
  products: Product[];
  count: number;
  startDate: string;
  endDate: string;
  numberOffset: number;
}

/** Generates a realistic sales history for one company, sorted chronologically with sequential numbers. */
export function generateSales(input: SalesGenerationInput): Sale[] {
  const { random, companyId, sellers, managerByBranch, products, count, startDate, endDate, numberOffset } = input;
  const startMs = parseIsoDate(startDate);
  const totalDays = Math.round((parseIsoDate(endDate) - startMs) / DAY_MS);
  const endMs = parseIsoDate(endDate);

  const drafts = Array.from({ length: count }, () => {
    const seller = random.pick(sellers);
    const product = random.pick(products);
    const saleMs = startMs + random.int(0, totalDays) * DAY_MS;
    return { seller, product, saleMs };
  }).sort((a, b) => a.saleMs - b.saleMs);

  return drafts.map(({ seller, product, saleMs }, index) => {
    const [min, max] = PRICE_RANGES[product.id] ?? [10_000, 50_000];
    const roundTo = max > 100_000 ? 1_000 : 100;
    const netAmount = Math.round((min + random.next() * (max - min)) / roundTo) * roundTo;
    const vatAmount = Math.round(netAmount * 0.05 * 100) / 100;
    const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100;

    let status = random.weighted(STATUS_WEIGHTS);
    const returnMs = saleMs + random.int(10, 60) * DAY_MS;
    if (status === 'returned' && returnMs > endMs) status = 'approved';

    const saleDate = isoDate(saleMs);
    const sequence = numberOffset + index + 1;
    const createdAt = `${saleDate}T10:${String(index % 60).padStart(2, '0')}:00+04:00`;

    return {
      id: `sale-${companyId}-${sequence}`,
      companyId,
      saleNumber: `SL-${String(sequence).padStart(6, '0')}`,
      invoiceNumber: `INV-${saleDate.slice(0, 4)}-${String(sequence).padStart(5, '0')}`,
      saleDate,
      employeeId: seller.id,
      teamId: seller.teamId,
      branchId: seller.branchId,
      customerId: null,
      productId: product.id,
      netAmount,
      vatAmount,
      grossAmount,
      currencyCode: 'AED',
      paymentMethod: random.weighted(PAYMENT_METHOD_WEIGHTS),
      paymentStatus: random.weighted(PAYMENT_STATUS_WEIGHTS),
      source: 'manual',
      importBatchId: null,
      notes: random.pick(NOTES),
      status,
      createdBy: seller.id,
      approvedBy:
        status === 'approved' || status === 'returned' ? (managerByBranch.get(seller.branchId) ?? null) : null,
      returnedOn: status === 'returned' ? isoDate(returnMs) : null,
      createdAt,
      updatedAt: createdAt,
    };
  });
}
