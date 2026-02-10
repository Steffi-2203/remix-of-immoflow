# ImmoflowMe - Austrian Property Management System

## Overview
ImmoflowMe is an Austrian property management (Hausverwaltung) application designed for MRG (Mietrechtsgesetz) compliance. It aims to streamline property and tenant management, automate financial processes, and ensure regulatory adherence within the Austrian market. Key features include automated invoice generation with Austrian VAT rates, OCR-based document processing, SEPA payment export, and comprehensive operating cost settlements (Betriebskostenabrechnung). The project provides a robust, compliant, and efficient solution for Austrian property managers, including specialized tools for professional accountants.

## User Preferences
- Language: German (Austrian German)
- Currency: EUR with Austrian formatting
- Date format: DD.MM.YYYY

## System Architecture
ImmoflowMe employs a modern full-stack architecture. The backend uses Node.js with Express.js, and the frontend is built with React and Vite. PostgreSQL (Neon) with Drizzle ORM is used for data persistence.

**UI/UX Decisions:**
The frontend uses React 18, Vite, Tailwind CSS, and shadcn/ui for a responsive user interface. Subscription management and feature gating are handled with components like `SubscriptionTeaser`, `TrialBanner`, `UserUpgradeBanner`, `FeatureLockPopup`, and `LimitGatedButton`.

**Technical Implementations:**
- **Backend**: Express.js, TypeScript.
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui.
- **Database**: PostgreSQL (Neon), Drizzle ORM for type-safe interactions.
- **Authentication**: Replit Auth.
- **Data Access**: Frontend interacts exclusively via REST API endpoints (`/api/*`).
- **Email**: Resend integration for notifications and invitations.
- **Routing**: `react-router-dom` for frontend, Express for backend API.
- **State Management**: TanStack Query for data fetching and caching.
- **API Security**: Authentication and organization-based multi-tenancy with strict ownership checks. Backend role-based authorization middleware (e.g., `requireRole`, `requireMutationAccess`) enforces permissions on all mutation routes. Viewers and testers are blocked from server-side mutations.
- **Data Integrity**: Soft-delete functionality using `deletedAt` timestamps and Zod validation for all API endpoints.
- **MRG Compliance**:
    - Supports six standard MRG-compliant distribution keys for operating cost allocation.
    - Tracks rent history with `validFrom`/`validUntil` fields.
    - Applies correct Austrian VAT rates (e.g., 10% for residential, 20% for heating/commercial).
    - Tracks Wasserkosten (water costs) as a separate invoice line item with 10% VAT.
    - Provides automatic warnings for settlement deadlines (§ 21 MRG).
    - Manages Offene Posten (open items) from `Vorschreibung` (monthly invoices).
    - Handles Leerstand (vacancy) by generating invoices for BK+HK (no rent), with owner paying costs.
    - Implements bank account year-end carry-over for balances.
- **Professional Accountant Features**:
    - **SEPA Export**: Generates `pain.008.001.02` (Direct Debit) and `pain.001.001.03` (Credit Transfer) XML files.
    - **Settlement PDFs**: Creates MRG §21 compliant Betriebskostenabrechnung templates.
    - **Automatic Advance Adjustment**: Calculates new advances post-settlement using the MRG-compliant formula.
    - **Owner Plausibility Report**: Generates a comprehensive owner summary with cost overviews.
    - **Automated Dunning**: 3-level escalation system for overdue payments with ABGB §1333 interest calculation.
    - **VPI Automation**: Monitors Austrian consumer price index for automatic rent adjustment triggers.
    - **MieWeG-Indexierungsrechner**: Calculation tool for rent increases under the 2026 Mieten-Wertsicherungsgesetz.
    - **Reporting**: Owner reporting, contract expiration, security deposits, meter readings.
    - **Export Formats**: BMD NTCS CSV and DATEV ASCII for accounting software integration.
    - **FinanzOnline Integration**: Generates USt-Voranmeldung XML (Form U30).
    - **Document Management**: Metadata-based document storage with category system.
- **Unit Testing Infrastructure**: Comprehensive test suite covering MRG payment allocation, settlement calculations, MieWeG indexation, SEPA export, dunning, and distribution keys.
- **OCR Functionality**: Integrates GPT-5.2 Vision for OCR:
    - **Tenant Data Import**: Extracts tenant information from rental contracts or Vorschreibungen.
    - **PDF Support**: Client-side PDF-to-image conversion for OCR.
    - **Invoice Processing**: Extracts structured data from invoices and bank statements.
- **Subscription Management**: Supports both legacy organization-based and newer user-based subscription systems with feature gating and Stripe integration.
- **Role-Based Access Control**: Five roles (admin, property_manager, finance, viewer, tester) with distinct permissions, including a "tester" mode for data masking.
- **Demo Access System**: Provides time-limited 30-minute trial access with automatic demo data generation and expiration handling.
- **WEG Management**: Comprehensive support for Wohnungseigentumsgesetz 2002, including:
    - **Eigentümer & MEA**: Unit-owner assignments with co-ownership shares.
    - **Versammlungen**: Assembly tracking with types, invitation deadlines, quorum, and protocol management.
    - **Tagesordnungspunkte (TOPs)**: Agenda items for assemblies.
    - **Abstimmungen**: MEA-weighted voting with required majority types.
    - **Wirtschaftsplan**: Annual budget plans and reserve contribution tracking.
    - **Instandhaltungsrücklage**: Reserve fund tracking.
    - **Sonderumlagen**: Special assessments with MEA-based allocation.
    - **Erhaltung & Verbesserung**: Maintenance tracking.
    - **Eigentümerwechsel**: Full ownership transfer workflow with aliquotierung (proration), transactional execution, and compliance warnings.
- **Insurance Management**: Policy tracking and claims management.
- **Deadline Calendar**: Unified system for contracts, renewals, maintenance, and tax deadlines.
- **Serial Letters**: Template-based bulk letter generation.
- **Management Contracts**: Tracking of HV-Verträge with auto-renewal and fee management.
- **Heating Cost Import**: CSV import for external heating cost readings.
- **Owner Payouts**: Calculation of Eigentümer-Auszahlung.
- **Organization Switcher**: Multi-mandant support via `user_organizations` for managing multiple HV organizations.
- **Feature Routes Architecture**: New modules use `server/routes/featureRoutes.ts` with snake_case↔camelCase conversion and organization-scoped access control.

**System Design Choices:**
- **Modular Structure**: Project organized into `server/`, `shared/`, and `src/` for clear separation.
- **Drizzle ORM**: Used for type-safe database interactions and schema management across 45+ tables.
- **Leases Table**: Dedicated `leases` table for rental contract history.
- **Payment Allocations**: `payment_allocations` table for flexible payment-to-invoice mapping.
- **Migrated Functions**: Key business logic functions integrated directly into the Express.js backend.

## Security Configuration (updated 2026-02-10)
- **Password Policy**:
    - Minimum length: 12 characters
    - zxcvbn complexity threshold: score ≥ 3 (out of 4)
    - Leaked password check: Have I Been Pwned k-Anonymity API (SHA-1 prefix query, privacy-safe)
    - Password history: prevents reuse of last 5 passwords (via `password_history` table)
    - Applied to: register, reset-password
- **Account Lockout**:
    - Lock after 5 failed login attempts within 15 minutes
    - Automatic unlock after 15-minute cooldown
    - Remaining attempts warning shown when ≤ 2 attempts left
    - Tracked via `login_attempts` table with IP address logging
    - Successful login clears all failed attempt records
- **API Rate Limiting**:
    - General API: 100 requests / 15 min per IP (`express-rate-limit`)
    - Auth routes (`/api/auth/*`): 20 requests / 1 min per IP (strict)
    - Stripe webhooks: 5 requests / 1 min per IP
- **Session Security**:
    - Cookie: `httpOnly: true`, `secure: true` (prod), `sameSite: 'none'` (prod) / `'lax'` (dev)
    - Session name: `__Secure-immo_sid` (prod) / `immo_sid` (dev)
    - maxAge: 24 hours
    - Storage: PostgreSQL via `connect-pg-simple` (`user_sessions` table)
- **CSRF Protection** (added 2026-02-10):
    - Double-Submit Cookie pattern with `crypto.timingSafeEqual` validation
    - Token: 32 bytes random, stored in non-httpOnly cookie for JS access
    - Exempt paths: Stripe webhooks, health checks, demo endpoints
    - Frontend sends token via `x-csrf-token` header on all mutating requests
    - Endpoint: `GET /api/csrf-token` to retrieve/initialize token
- **IDOR Protection** (added 2026-02-10):
    - Centralized `server/lib/ownershipCheck.ts` with 5 verify functions
    - All 28 ID-param routes in `routes.ts` now verify org ownership via DB joins
    - Pattern: tenant→unit→property→organization chain verification
    - Returns 403 "Zugriff verweigert" for cross-org access attempts
- **Input Sanitization** (added 2026-02-10):
    - `server/middleware/sanitize.ts` HTML-escapes all string inputs on POST/PUT/PATCH
    - Exempts: Stripe webhooks, OCR endpoints
    - Prevents stored XSS by encoding `< > " ' /`
- **Runtime Service Guards** (added 2026-02-10):
    - BillingService: `organizationId` is now **required** (throws if missing/empty)
    - PaymentService: `allocatePayment()` verifies tenant belongs to org before transaction
- **Auth Event Audit Logging**:
    - All login/register/logout events logged to `audit_logs` table via centralized `createAuditLog`
    - Captures: action, email, userId, IP address, user agent, success/failure, failure reason
    - Events: `login`, `login_failed` (unknown_email, wrong_password, account_locked), `register`, `register_failed`, `logout`
- **HTTP Security Headers**: Helmet.js (CSP, HSTS, etc.)
- **CORS**: Whitelist-based origin validation
- **Dependencies**: zxcvbn (password strength), bcrypt (12 rounds), HIBP API (leak check), cookie-parser

## Testing Infrastructure (updated 2026-02-10)
- **Test Runner**: Vitest with two configs:
    - Default: `npx vitest run tests/unit/` (via `npm test`)
    - Server config: `npx vitest run --config vitest.server.config.ts` (includes all tests)
- **Test Count**: 186 tests across 17 files, all passing
- **Test Coverage Areas**:
    - FIFO multi-invoice payment allocation (10 tests)
    - Payment storno/reversal with LIFO allocation reversal (14 tests)
    - Deposit lifecycle: interest, deductions, Bar/Garantie/Sparbuch types (12 tests)
    - Pro-rata billing: move-in/out, leap year, tenant changeover (16 tests)
    - VPI index adjustment: threshold, chaining, MRG deflation protection (12 tests)
    - Concurrent edge cases: optimistic locking, idempotency, duplicate detection (10 tests)
    - Ledger sync: saldo calculation, audit hash chain, reconciliation (13 tests)
    - Bank reconciliation: fuzzy matching, Levenshtein, IBAN, reference patterns (9 tests)
    - SEPA XML validation, dunning, settlement calculations (36 tests)
    - Billing service integration tests (6 tests)
    - Invoice generation with MRG VAT rates (9 tests)
    - Payment allocation MRG-compliant BK→HK→Miete (10 tests)
    - Concurrency simulation (3 tests)
    - Server startup validation (2 tests)
    - roundMoney utility (4 tests)
    - Cross-tenant isolation: billing org-scoping, GDPR org-check, storage layer isolation (9 tests)
    - Security guards: IDOR ownership checks, billing/payment org guards, BAO period locks (11 tests)
- **Data Integrity**:
    - FIFO payment allocation repair completed (2026-02-09): 71 allocations, 56 invoices bezahlt, 2 teilbezahlt
    - Integrity check endpoint: `GET /api/integrity/payment-allocations` (admin/finance only, paginated)
    - All paid_amount values verified to match sum(payment_allocations) exactly

## External Dependencies
- **PostgreSQL (Neon)**: Cloud-native database service.
- **Replit Auth**: Authentication service.
- **Resend**: Email API.
- **Stripe**: Payment processing.
- **OpenAI's GPT-5.2 (via Replit AI Integrations)**: For OCR capabilities.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI component library.
- **TanStack Query**: Data fetching and state management.