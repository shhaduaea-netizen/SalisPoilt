# SalesPilot

SalesPilot is a multi-tenant sales-performance platform for UAE businesses. Each company has branches, teams, employees, products and sales records. Sales are approved, tracked against targets, ranked on leaderboards and reported on dashboards, with every screen limited to what the signed-in role may see.

This phase ships the frontend only, running on a demo data adapter. The data layer is a repository seam, so a real backend can be plugged in later without touching screens.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Scripts:

| Script | Purpose |
| --- | --- |
| `dev` | Local development server (Vite) |
| `build` | Production build |
| `typecheck` | `tsc --noEmit -p tsconfig.app.json` |
| `lint` | ESLint over the project |
| `test` | Vitest, runs `src/**/*.test.ts` |
| `format` | Prettier over `src` |

Environment variables (read in `src/shared/constants/env.ts`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_DATA_MODE` | `demo` | Only `demo` is implemented. Any other value throws in `createDataAdapter`. |
| `VITE_ENABLE_DEMO_ROLE_SWITCHER` | `true` | Shows the dev-only persona switcher in the user menu. Set to `false` to hide it. |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | empty | Firebase web config from the Firebase console. Required for sign-in. |

Sign-in and roster setup:

1. In the Firebase console, enable the Email/Password sign-in provider for the project.
2. Create the owner account once in the Firebase console (Authentication, Users, Add user). Its password is never stored in code.
3. Fill the `VITE_FIREBASE_*` values in `.env` (see `.env.example`).
4. Sign in as the owner, open Team roster, and import the Excel file (sheet named `Employees`). Each new person gets a Firebase account with the temporary password from the file and must choose a new password at first sign-in.
5. The roster is served by the Supabase edge function `roster`, which checks rank rules on every change. The roster tables are reachable only by that function (service role).

## Architecture

The UI never touches sample data or a database directly. It calls hooks in `src/data/queries.ts`, which call a `DataAdapter` obtained from context.

```
Screens (features/*)
   |  useCan / <Can> / RequirePermission   (who may see it)
   v
Query hooks (src/data/queries.ts)           (TanStack Query, keyed by scope + actor)
   |
   v
DataAdapter interface (src/data/adapters/repositories.ts)
   |- auth          session user, demo personas
   |- platform      company list for Super Admin
   |- organization  company, branches, teams, employees
   |- sales         sales list with filters
   |- catalog       products
   v
createDemoAdapter (src/data/adapters/demo)  -> src/data/demo (seed data only)
```

Tenant rules:

- Every tenant method receives the acting `SessionUser` and filters by `companyId` first.
- Then it narrows by scope (company, branch, team or self) using `can()`.
- Super Admin has no company. It may call `platform.listCompanies` only. Tenant sales rows are denied and reject with `AccessDeniedError`.
- Tenant query keys are `['tenant', scope, actorId, ...extra]`, so one persona's cache never shows another's data. Switching personas resets all queries.

Permissions:

- One matrix, `PERMISSION_MATRIX` in `src/domain/permissions.ts`, maps each action to a scope per role (`platform | company | branch | team | self`).
- `can(user, action, resource)` is the only check. Screens use `useCan`, `<Can>` and `RequirePermission`, never role names.
- The dashboard, settings, roles and account actions are visible to every tenant role.

Navigation:

- `src/app/navigation.ts` (`NAV_ITEMS`) drives both the sidebar and the routes. Each item carries its permission action.

## Folder map

```
src/
  app/                 Router, navigation, providers, guards, layouts
    guards/            useCan, Can, RequirePermission
    layouts/           AppLayout, Sidebar, TopBar, MobileNav
    dev/               Dev-only demo role switcher (remove with the flag)
    pages/             Shared pages (not-found, section placeholders)
  domain/              Pure business rules and their tests
    permissions.ts     Action matrix and can()
    performance.ts     Attainment, score, sums, ranking
    sale-lifecycle.ts  Status transitions and initial status
  data/
    adapters/          DataAdapter interface and the demo implementation
    demo/              Seed data (companies, branches, teams, employees, sales, products)
    queries.ts         TanStack Query hooks used by screens
    provider.ts        createDataAdapter(mode)
  features/            One folder per section (dashboard, ...)
  shared/
    constants/         Environment flags
    i18n/              i18next setup, locales (en, ar), formatters
    stores/            Zustand preferences (persisted)
    types/             Domain types
    ui/                Button, Badge, Card, PageHeader, states
    utils/             cn, format helpers
```

Note on demo data: all sample data lives in `src/data/demo`. Screens and domain code never embed sample values.

## Adapter swap guide

To replace the demo data with a real backend:

1. Create `src/data/adapters/<name>/create<Name>Adapter.ts` that returns a `DataAdapter`.
2. Implement each repository in `src/data/adapters/repositories.ts`. Every tenant method must:
   - accept the acting `SessionUser`,
   - filter by `companyId`,
   - apply the same scope rules as `can()` (or delegate that filtering to database policies that mirror them),
   - reject with `AccessDeniedError` on denial, and always return a promise.
3. Add the new mode to `DataMode` and a branch in `createDataAdapter` in `src/data/provider.ts`.
4. Set `VITE_DATA_MODE` to the new mode.
5. Keep `src/domain` unchanged. Screens and hooks need no edits.
6. Run the adapter contract tests in `src/data/adapters/demo/createDemoAdapter.test.ts` against the new adapter. They cover tenant isolation, branch and employee scoping, Super Admin denial and platform listing.

## Business rules (defaults)

These live in `src/domain` and are covered by `domain.test.ts`.

- Attainment is actual divided by target, as a percent. Attainment is capped between 0% and 150% (`capAttainment`).
- Performance score is the weighted average of count attainment and value attainment, each capped, using the company's weights.
- Approved and returned sales count toward performance in the period of their sale date. A return is deducted in the period in which the return happened, not the original period.
- Ranking uses the company's ranking metric (score, value or count). Ties are broken by value, then count, then the earlier last sale date. A subject with no sales ranks last among ties. Ranks are sequential, so no two subjects share a rank.
- Sale statuses change only through these transitions:
  - draft: pending approval, approved, cancelled
  - pending approval: approved, rejected, cancelled
  - approved: returned, cancelled
  - rejected: draft
  - cancelled and returned: no further changes
- Initial status for a new sale:
  - Imports: approved if the import approval mode is automatic, otherwise pending approval.
  - Manual entries by Super Admin, Company Admin or Branch Manager: approved.
  - Other manual entries: approved unless the company requires approval for manual sales, then pending approval.
- VAT is 5%. Currency is AED. Dates use Asia/Dubai.
- Money shows as `AED x` in English and `x د.إ` in Arabic. Digits follow the user's choice (Western or Arabic-Indic).

## Localization

- English and Arabic are both complete for the shell, navigation, roles, states and dashboard.
- Arabic switches the layout to right-to-left using logical CSS properties.
- Strings live in `src/shared/i18n/locales/en.json` and `ar.json`. Add a key to both files.

## Supabase phase checklist

Not started. When the backend phase begins, the checklist is:

- [ ] Tables: companies, branches, teams, employees, products, sales, sale_status_history, targets, commissions, imports, import_rows, notifications, audit_log, company_settings.
- [ ] Every tenant table has a `company_id` column, and all queries filter on it.
- [ ] Row Level Security is enabled on every table.
- [ ] Policies check company membership and role scope (branch, team, self) for SELECT, INSERT, UPDATE and DELETE separately.
- [ ] Super Admin access to companies goes through a platform-only policy or function. Sales rows stay denied.
- [ ] Sensitive changes (approval, status, role, weights) go through functions that check permission server-side.
- [ ] Auth: email and password sign-in, with a company and role record linked to each user.
- [ ] Storage: a private bucket per company for import files, with signed URLs and no public access.
- [ ] Audit log written by the server, not the browser.
- [ ] A new adapter (see the swap guide) passes the same contract tests as the demo adapter.

## Assumptions and open questions

- Demo only in this phase. The brief asks for a demo adapter with a clean seam for Supabase later. No backend code has been written yet.
- Money is computed in AED with a 5% VAT. Multi-currency needs an exchange-rate field on the company, which is not yet built.
- Approval modes (manual, auto, or by import batch) are defined by the company. The default for imports is manual review.
- Leaderboard visibility, the performance basis and the ranking metric are company settings. The demo data sets their initial values.
- WhatsApp notifications and billing are extension points only. They are not implemented.
- Open question: should Supabase persistence start next, or stay demo-only until the screens are complete?
