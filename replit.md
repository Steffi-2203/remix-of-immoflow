# ImmoFlowMe - Austrian Property Management System

## Overview
ImmoFlowMe is an Austrian property management (Hausverwaltung) application designed for MRG (Mietrechtsgesetz) compliance. It streamlines property and tenant management, automates financial processes, and ensures regulatory adherence within the Austrian market. Key capabilities include automated invoice generation with Austrian VAT rates, OCR-based document processing, SEPA payment export, comprehensive operating cost settlements (HeizKG, WEG), and specialized tools for professional accountants. The project aims to provide a robust, compliant, and efficient solution for Austrian property managers.

## User Preferences
- Language: German (Austrian German)
- Currency: EUR with Austrian formatting
- Date format: DD.MM.YYYY

## System Architecture
ImmoflowMe employs a modern full-stack architecture with a Node.js (Express.js) backend and a React (Vite) frontend. PostgreSQL (Neon) with Drizzle ORM handles data persistence.

**UI/UX Decisions:**
The frontend utilizes React 18, Vite, Tailwind CSS, and shadcn/ui for a responsive user interface. UI components support subscription management and feature gating. The sidebar has been consolidated, and a reusable `GuidedEmptyState` component is used for empty states. The system features a timeline-style UI for activity logs and traffic-light indicators for overdue items.

**Technical Implementations:**
- **Backend**: Express.js, TypeScript.
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui.
- **Database**: PostgreSQL (Neon), Drizzle ORM.
- **Authentication**: Replit Auth, with bcrypt-based authentication for tenant/owner portals and TOTP 2FA.
- **Data Access**: REST API endpoints, managed with TanStack Query.
- **API Security**: Authentication, organization-based multi-tenancy, Postgres RLS, strict ownership checks, role-based authorization, soft-delete, Zod validation, idempotency keys, PII redaction in logs.
- **Database Security**: Row-Level Security (RLS) on critical tables with `app.current_org` session variable.
- **MRG & WEG Compliance**: Supports MRG-compliant distribution keys, rent history, Austrian VAT, Wasserkosten tracking, settlement deadline warnings, Offene Posten management, Leerstand handling, and comprehensive WEG (Wohnungseigentumsgesetz 2002) management including owner assignments, assembly tracking, budget plans, reserve funds, and specific WEG-Vorschreibungen (owner invoicing). Features include a Heizkostenabrechnung system compliant with HeizKG and Richtwertmietzins/Kategoriemietzins calculators.
- **HeizKG-Heizkostenabrechnung**: Full §§5-15 compliant heating cost settlement with: separate heating/hot water accounting (§5), 55-65% consumption / 35-45% area split (§8), Ersatzverteilung for missing meters (§12), kaufmännische Rundung with restcent assignment, trial balance checks (0.01 EUR tolerance), compliance checking against all HeizKG paragraphs, plausibility checks, multi-step wizard UI (4 phases: Grunddaten → Messdaten → Ergebnis → Prüfprotokoll), PDF generation with Austrian Pflichtangaben, DATEV/CSV export, storno/correction support with version tracking, and audit logging. Database: heat_billing_runs, heat_billing_lines, heat_billing_audit_log. Service: HeatBillingService (pure calculation, no DB deps). API: 8 endpoints under /api/heizkosten/. Tests: 20 Vitest unit tests.
- **Double-Entry Accounting**: Full doppelte Buchführung with a 71-account Austrian Kontenrahmen, journal entries, Saldenliste, Bilanz, GuV, UVA, Kontoblatt, and Storno capability. Includes Einnahmen-Ausgaben-Rechnung (E/A) and Kaution lifecycle management.
- **EBICS Live-Banking**: Electronic banking integration for account statement retrieval and payment submission.
- **Offene Posten Management**: Dedicated interface for open items, reconciliation, and bank matching.
- **Jahresabschluss Wizard**: Guided annual closing process.
- **Accounting Features**: SEPA export, MRG §21 compliant settlement PDFs, automatic advance adjustment, automated dunning, VPI automation for rent adjustment, MieWeG-Indexierungsrechner, BMD NTCS/DATEV export, FinanzOnline integration, XLSX export.
- **Testing**: Vitest for unit tests (29 test files, 493+ tests: financial calculations, SEPA XML, invoice generation, dunning, security, tenant isolation, deposit lifecycle, bank reconciliation) and Playwright for E2E tests (7 spec files: health, authentication, security headers, input validation, betriebskosten/SEPA, zahlungen/offene-posten, mahnwesen/VPI/eigentümer/schlüssel).
- **OCR Functionality**: Integrates AI for tenant data import, PDF processing, and invoice data extraction.
- **Subscription & Access Control**: Stripe integration for subscriptions, five distinct user roles, and demo access.
- **Self-Service Portals**: Secure portals for tenants and owners.
- **Automated Workflows**: Guided workflows for settlements, dunning, VPI adjustment, tenant move-in. Rules engine with dry-run capability for various trigger types.
- **Financial Automation**: AI-based transaction matching for bank reconciliation, automatic bank synchronization with open invoices.
- **Document Management**: DMS with version history, tag system, full-text search. MRG-compliant lease contract generator.
- **Electronic Signatures**: eIDAS-conformant system with canvas signature pad, SHA-256 hashing, audit trail, public verification.
- **KI-Autopilot Add-on**: Premium AI features including chat-based copilot, automated invoicing/dunning, AI invoice recognition, anomaly detection, and AI email drafting.
- **Compliance & Security**: BAO §132 retention, GoBD audit hash chain, WEG/MRG specific compliance, DSGVO compliance, strong password policy, account lockout, API rate limiting, session security, CSRF, IDOR protection, input sanitization, HTTP security headers, nonce-based CSP, active session management, PII redaction in logs, 2FA, security/compliance dashboards, and a penetration test suite.
- **PWA Support**: Progressive Web App with manifest, service worker for caching, and push notifications.
- **ESG/Energiemonitoring**: Energy certificate management, consumption tracking, CO2 balance, and ESG scoring.
- **Schadensmeldungen**: Damage reporting system with workflow and cost tracking.
- **Reporting**: Recharts-based dashboards, ad-hoc query builder, scheduled report generation, full-text search.
- **Bulk Operations**: Mass-invoice creation, mass-notifications, bulk-export with progress tracking.
- **Performance**: Granular rate limits, BackpressureController, graceful degradation.

**System Design Choices:**
- **Modular Structure**: Clear separation of `server/`, `shared/`, and `src/` directories.
- **Drizzle ORM**: Type-safe database interactions.
- **Dedicated Tables**: For leases, payment allocations, financial audit logs, idempotency keys, push subscriptions, document versions/tags, automation rules/logs, 2FA, signatures, saved reports, report schedules.
- **Feature Routes Architecture**: 47 modular route files in `server/routes/` organized by domain. Core orchestrator `server/routes.ts` (958 lines) registers all route modules. Key domain modules: `authProfileRoutes.ts` (auth/profile/invitations), `aiRoutes.ts` (KI-Autopilot/OCR/chat), `dunningRoutes.ts` (Mahnwesen/VPI/maintenance), `sepaRoutes.ts` (SEPA export/settlement PDF), `keyRoutes.ts` (Schlüsselübergabe), `budgetRoutes.ts` (Budgets/MieWeG), `ownerRoutes.ts` (Eigentümer/BMD/DATEV/FinanzOnline). All route handlers use `AuthenticatedRequest` typed interface (defined in `server/routes/helpers.ts`) instead of `req: any` for session type safety.
- **Defense in Depth**: App-level organization checks + Postgres RLS policies + property ownership validation.
- **Type Safety**: `AuthenticatedRequest` interface extends Express `Request` with typed session (`userId`, `organizationId`). Exported from `server/routes/helpers.ts` and used across all route files.

## Legal Pages (Public Routes)
- **/impressum**: Impressum nach § 5 ECG, Aufsichtsbehörde (DSB), Platzhalter für Adresse/UID
- **/datenschutz**: DSGVO-konforme Datenschutzerklärung mit Löschfristen (BAO §132: 7J, UStG §18: 22J), Sub-Auftragsverarbeiter-Liste, TOM, Betroffenenrechte, Drittlandtransfer
- **/agb**: AGB vereinfacht (11 Abschnitte), Haftungsbegrenzung EUR 10.000, SaaS-Klauseln, Stripe-Zahlung, Datenexport, geistiges Eigentum
- **/avv**: Auftragsverarbeitungsvertrag nach Art. 28 DSGVO mit TOM, Sub-Auftragsverarbeiter (Neon, Replit, Stripe, Resend, OpenAI), Löschkonzept, Kontrollrechte
- **/sla**: Service Level Agreement mit 3 Tiers (99%/99.5%/99.9%), Störungskategorien, Gutschriften, Backup-Details
- **/loeschkonzept**: Löschkonzept für personenbezogene Daten (6 Abschnitte), Aufbewahrungsfristen-Tabelle (BAO §132, UStG §18, HeizKG), Lösch-/Anonymisierungsmethoden, Beziehung zu AVV/Datenschutzerklärung
- **Hinweis**: Alle Dokumente enthalten Muster-Disclaimer und sollten vor Verwendung anwaltlich geprüft werden

## SEO & Domain Configuration
- **Domain**: www.immoflowme.at (canonical host)
- **DNS**: CNAME records at World4You pointing to cname.replit.com
- **SEO**: robots.txt, dynamic sitemap.xml, JSON-LD structured data (Organization, SoftwareApplication, BreadcrumbList), Open Graph, Twitter Cards, canonical tags
- **Performance**: gzip/brotli compression via `compression` middleware, immutable 1-year cache for static assets, no-cache for HTML
- **Auth Architecture**: ActiveOrganizationProvider only wraps protected routes via `ProtectedWithOrg` wrapper; public routes render without auth context
- **Service Worker**: v11, network-first for HTML/JS/CSS, cache-first for images/fonts
- **Email Queue**: BullMQ + Redis (optional, fallback to inline Resend). server/lib/emailQueue.ts with enqueueEmail/enqueueEmails, 5 retries, exponential backoff 2s base, concurrency 3, rate limit 10/s. Worker starts on server boot. Queue stats in /api/admin/health.
- **Migration Runner**: migrations/runner.ts — transactional up/down with _migrations tracking table. Run: `npx tsx migrations/<name>.ts` (--down for rollback).

## External Dependencies
- **PostgreSQL (Neon)**: Cloud-native database service with pg_trgm extension and RLS.
- **Replit Auth**: Authentication service.
- **Resend**: Email API (via BullMQ queue or inline fallback).
- **BullMQ/Redis**: Optional email queue backend (set REDIS_URL secret to enable).
- **Stripe**: Payment processing.
- **OpenAI's GPT-5.2 (via Replit AI Integrations)**: For OCR and AI features.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI component library.
- **TanStack Query**: Data fetching and state management.
- **xlsx (SheetJS)**: Excel file generation.
- **web-push**: Push notification delivery.
- **otpauth**: TOTP generation and verification.
- **qrcode**: QR code generation.