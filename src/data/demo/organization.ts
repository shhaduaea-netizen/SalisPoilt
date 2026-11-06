import type { Branch, Company, Employee, Product, Role, SessionUser, Team } from '@/shared/types/domain';

export const FIRST_NAMES: readonly { en: string; ar: string }[] = [
  { en: 'Ahmed', ar: 'أحمد' },
  { en: 'Fatima', ar: 'فاطمة' },
  { en: 'Omar', ar: 'عمر' },
  { en: 'Mariam', ar: 'مريم' },
  { en: 'Khalid', ar: 'خالد' },
  { en: 'Noura', ar: 'نورا' },
  { en: 'Yousef', ar: 'يوسف' },
  { en: 'Aisha', ar: 'عائشة' },
  { en: 'Rashid', ar: 'راشد' },
  { en: 'Layla', ar: 'ليلى' },
  { en: 'Hamad', ar: 'حمد' },
  { en: 'Reem', ar: 'ريم' },
  { en: 'Rahul', ar: 'راهول' },
  { en: 'Priya', ar: 'بريا' },
  { en: 'Michael', ar: 'مايكل' },
  { en: 'Sophia', ar: 'صوفيا' },
  { en: 'Carlos', ar: 'كارلوس' },
  { en: 'Elena', ar: 'إلينا' },
  { en: 'Hassan', ar: 'حسن' },
  { en: 'Dana', ar: 'دانا' },
  { en: 'Tariq', ar: 'طارق' },
  { en: 'Hessa', ar: 'حصة' },
];

export const LAST_NAMES: readonly { en: string; ar: string }[] = [
  { en: 'Al Mansoori', ar: 'المنصوري' },
  { en: 'Al Marzooqi', ar: 'المرزوقي' },
  { en: 'Haddad', ar: 'حداد' },
  { en: 'Khoury', ar: 'الخوري' },
  { en: 'Nair', ar: 'ناير' },
  { en: 'Sharma', ar: 'شارما' },
  { en: 'Brown', ar: 'براون' },
  { en: 'Rossi', ar: 'روسي' },
  { en: 'Al Blooshi', ar: 'البلوشي' },
  { en: 'Hussain', ar: 'حسين' },
  { en: 'Demir', ar: 'ديمير' },
  { en: 'Santos', ar: 'سانتوس' },
  { en: 'Al Shamsi', ar: 'الشامسي' },
  { en: 'Kapoor', ar: 'كابور' },
  { en: 'Al Hammadi', ar: 'الحمادي' },
];

export const DEMO_COMPANY_IDS = {
  alNoor: 'co-alnoor',
  gulfMotors: 'co-gulfmotors',
} as const;

export const DEMO_PLATFORM_ADMIN_ID = 'platform-admin';

export const alNoorCompany: Company = {
  id: DEMO_COMPANY_IDS.alNoor,
  name: 'Al Noor Properties',
  nameAr: 'شركة النور العقارية',
  industry: 'Real estate',
  status: 'active',
  plan: 'enterprise',
  currencyCode: 'AED',
  vatRate: 0.05,
  workWeek: 'mon_fri',
  approvalMode: 'MANAGER_APPROVAL',
  manualSalesRequireApproval: true,
  performanceBasis: 'net',
  performanceWeights: { count: 40, value: 60 },
  rankingMetric: 'score',
  leaderboardVisibility: 'full',
  createdAt: '2024-03-01T08:00:00+04:00',
};

export const gulfMotorsCompany: Company = {
  id: DEMO_COMPANY_IDS.gulfMotors,
  name: 'Gulf Motors Group',
  nameAr: 'مجموعة الخليج للسيارات',
  industry: 'Automotive',
  status: 'active',
  plan: 'growth',
  currencyCode: 'AED',
  vatRate: 0.05,
  workWeek: 'sun_thu',
  approvalMode: 'AUTOMATIC',
  manualSalesRequireApproval: false,
  performanceBasis: 'net',
  performanceWeights: { count: 40, value: 60 },
  rankingMetric: 'score',
  leaderboardVisibility: 'rank_only',
  createdAt: '2025-01-15T08:00:00+04:00',
};

export const companies: Company[] = [alNoorCompany, gulfMotorsCompany];

export const branches: Branch[] = [
  {
    id: 'br-noor-dxb',
    companyId: alNoorCompany.id,
    name: 'Dubai HQ',
    nameAr: 'المقر الرئيسي دبي',
    city: 'Dubai',
    managerId: null,
  },
  {
    id: 'br-noor-auh',
    companyId: alNoorCompany.id,
    name: 'Abu Dhabi',
    nameAr: 'أبوظبي',
    city: 'Abu Dhabi',
    managerId: null,
  },
  {
    id: 'br-noor-shj',
    companyId: alNoorCompany.id,
    name: 'Sharjah',
    nameAr: 'الشارقة',
    city: 'Sharjah',
    managerId: null,
  },
  {
    id: 'br-gulf-dxb',
    companyId: gulfMotorsCompany.id,
    name: 'Dubai Showroom',
    nameAr: 'معرض دبي',
    city: 'Dubai',
    managerId: null,
  },
  {
    id: 'br-gulf-shj',
    companyId: gulfMotorsCompany.id,
    name: 'Sharjah Showroom',
    nameAr: 'معرض الشارقة',
    city: 'Sharjah',
    managerId: null,
  },
];

const TEAM_NAMES: readonly { en: string; ar: string }[] = [
  { en: 'Off-Plan Sales', ar: 'فريق المشاريع الجديدة' },
  { en: 'Secondary Market', ar: 'فريق السوق الثانوي' },
];

export const teams: Team[] = [
  ...['br-noor-dxb', 'br-noor-auh', 'br-noor-shj'].flatMap((branchId) =>
    TEAM_NAMES.map((name, index) => ({
      id: `tm-${branchId}-${index + 1}`,
      companyId: alNoorCompany.id,
      branchId,
      name: `${branchId.replace('br-noor-', '').toUpperCase()} ${name.en}`,
      nameAr: name.ar,
      leaderId: null as string | null,
    }))
  ),
  {
    id: 'tm-gulf-dxb-1',
    companyId: gulfMotorsCompany.id,
    branchId: 'br-gulf-dxb',
    name: 'Dubai Retail Sales',
    nameAr: 'فريق مبيعات دبي',
    leaderId: null,
  },
  {
    id: 'tm-gulf-shj-1',
    companyId: gulfMotorsCompany.id,
    branchId: 'br-gulf-shj',
    name: 'Sharjah Retail Sales',
    nameAr: 'فريق مبيعات الشارقة',
    leaderId: null,
  },
];

export const products: Product[] = [
  {
    id: 'pr-apt',
    companyId: alNoorCompany.id,
    name: 'Apartment (off-plan)',
    nameAr: 'شقة (على الخارطة)',
    category: 'Residential',
    currencyCode: 'AED',
  },
  {
    id: 'pr-villa',
    companyId: alNoorCompany.id,
    name: 'Villa',
    nameAr: 'فيلا',
    category: 'Residential',
    currencyCode: 'AED',
  },
  {
    id: 'pr-town',
    companyId: alNoorCompany.id,
    name: 'Townhouse',
    nameAr: 'تاون هاوس',
    category: 'Residential',
    currencyCode: 'AED',
  },
  {
    id: 'pr-comm',
    companyId: alNoorCompany.id,
    name: 'Commercial unit',
    nameAr: 'وحدة تجارية',
    category: 'Commercial',
    currencyCode: 'AED',
  },
  {
    id: 'pr-mgmt',
    companyId: alNoorCompany.id,
    name: 'Property management plan',
    nameAr: 'خطة إدارة العقارات',
    category: 'Services',
    currencyCode: 'AED',
  },
  {
    id: 'pr-sedan',
    companyId: gulfMotorsCompany.id,
    name: 'Sedan',
    nameAr: 'سيدان',
    category: 'New cars',
    currencyCode: 'AED',
  },
  {
    id: 'pr-suv',
    companyId: gulfMotorsCompany.id,
    name: 'SUV',
    nameAr: 'دفع رباعي',
    category: 'New cars',
    currencyCode: 'AED',
  },
  {
    id: 'pr-cpo',
    companyId: gulfMotorsCompany.id,
    name: 'Certified pre-owned',
    nameAr: 'مستعملة معتمدة',
    category: 'Used cars',
    currencyCode: 'AED',
  },
];

interface Seat {
  role: Role;
  branchId: string;
  teamId: string | null;
}

/** Al Noor: one admin, three branch managers, six team leaders, and thirty employees. */
function buildAlNoorSeats(): Seat[] {
  const seats: Seat[] = [{ role: 'COMPANY_ADMIN', branchId: 'br-noor-dxb', teamId: null }];
  for (const branch of ['br-noor-dxb', 'br-noor-auh', 'br-noor-shj']) {
    seats.push({ role: 'BRANCH_MANAGER', branchId: branch, teamId: null });
    for (const team of teams.filter((t) => t.branchId === branch)) {
      seats.push({ role: 'TEAM_LEADER', branchId: branch, teamId: team.id });
      for (let i = 0; i < 5; i += 1) seats.push({ role: 'EMPLOYEE', branchId: branch, teamId: team.id });
    }
  }
  return seats;
}

/** Gulf Motors: one admin, two showroom managers, two team leaders, and ten sales staff. */
function buildGulfSeats(): Seat[] {
  const seats: Seat[] = [{ role: 'COMPANY_ADMIN', branchId: 'br-gulf-dxb', teamId: null }];
  for (const branch of ['br-gulf-dxb', 'br-gulf-shj']) {
    seats.push({ role: 'BRANCH_MANAGER', branchId: branch, teamId: null });
  }
  for (const team of teams.filter((t) => t.companyId === gulfMotorsCompany.id)) {
    seats.push({ role: 'TEAM_LEADER', branchId: team.branchId, teamId: team.id });
    for (let i = 0; i < 5; i += 1) seats.push({ role: 'EMPLOYEE', branchId: team.branchId, teamId: team.id });
  }
  return seats;
}

function buildEmployees(
  companyId: string,
  prefix: string,
  emailDomain: string,
  seats: Seat[],
  nameOffset: number
): Employee[] {
  return seats.map((seat, index) => {
    const first = FIRST_NAMES[(index + nameOffset) % FIRST_NAMES.length];
    const last = LAST_NAMES[(index * 3 + nameOffset) % LAST_NAMES.length];
    const code = `${prefix}-${String(index + 1).padStart(3, '0')}`;
    const slug = `${first.en}.${last.en.replace(/\s+/g, '')}`.toLowerCase();
    return {
      id: `emp-${code.toLowerCase()}`,
      companyId,
      branchId: seat.branchId,
      teamId: seat.teamId,
      employeeCode: code,
      firstName: first.en,
      lastName: last.en,
      firstNameAr: first.ar,
      lastNameAr: last.ar,
      email: `${slug}@${emailDomain}`,
      role: seat.role,
      status: 'active',
      joinedOn: `${2023 + (index % 3)}-0${(index % 9) + 1}-15`,
    };
  });
}

export const employees: Employee[] = [
  ...buildEmployees(alNoorCompany.id, 'ANR', 'alnoor-properties.ae', buildAlNoorSeats(), 0),
  ...buildEmployees(gulfMotorsCompany.id, 'GMG', 'gulfmotors.ae', buildGulfSeats(), 7),
];

for (const team of teams) {
  team.leaderId = employees.find((e) => e.teamId === team.id && e.role === 'TEAM_LEADER')?.id ?? null;
}

for (const branch of branches) {
  branch.managerId = employees.find((e) => e.branchId === branch.id && e.role === 'BRANCH_MANAGER')?.id ?? null;
}

export function findPersonaSeedEmployee(companyId: string, role: Role, branchId?: string): Employee {
  const match = employees.find(
    (e) => e.companyId === companyId && e.role === role && (branchId === undefined || e.branchId === branchId)
  );
  if (!match) throw new Error(`Demo seed missing ${role} for ${companyId}`);
  return match;
}

export function toSessionUser(employee: Employee): SessionUser {
  return {
    id: employee.id,
    companyId: employee.companyId,
    role: employee.role,
    displayName: `${employee.firstName} ${employee.lastName}`,
    branchIds: [employee.branchId],
    teamId: employee.teamId,
  };
}
