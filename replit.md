# ImmoflowMe - Austrian Property Management System

## Overview
ImmoflowMe is an Austrian property management (Hausverwaltung) application designed for MRG (Mietrechtsgesetz) compliance. It streamlines property and tenant management, automates financial processes, and ensures regulatory adherence within the Austrian market. Key capabilities include automated invoice generation with Austrian VAT rates, OCR-based document processing, SEPA payment export, comprehensive operating cost settlements, and specialized tools for professional accountants. The project aims to provide a robust, compliant, and efficient solution for Austrian property managers.

## User Preferences
- Language: German (Austrian German)
- Currency: EUR with Austrian formatting
- Date format: DD.MM.YYYY

## Recent Changes (2026-02-14)
- **Accounting UX Improvements**: Consolidated sidebar (Banking merged into Finanzbuchhaltung as a tab), extended feature tour with 5 accounting-specific steps, beginner-friendly quick-start guide on WEG Management page, contextual KI feature hints on Accounting and OffenePosten pages linking to OCR/AI/Anomaly Detection, backward-compatible /buchhaltung redirect.
- **PWA Enhancement**: Full icon set (8 sizes incl. maskable), iOS-specific apple-touch-icon and theme-color media queries, service worker v4 with styled offline fallback page and version messaging, service worker registration in main.tsx, InstallBanner component with beforeinstallprompt/7-day dismiss, OfflineIndicator with online/offline events, manifest shortcuts for Dashboard/Liegenschaften/Finanzbuchhaltung.

- **Postgres RLS**: Row-Level Security policies on 9 tenant-critical tables (properties, units, tenants, monthly_invoices, payments, payment_allocations, leases, settlements, journal_entries) with org-isolation and bypass policies. Middleware sets `app.current_org` per request.
- **Idempotency Keys**: Deduplizierung for payment endpoints via `Idempotency-Key` header, idempotency_keys table, 24h TTL.
- **Full-Text Search**: pg_trgm extension with GIN trigram indexes, `/api/search` endpoint, GlobalSearch component with Ctrl+K shortcut.
- **PWA Support**: Service Worker (cache-first for static, network-first for API), Web App Manifest, push notifications with web-push/VAPID, push_subscriptions table.
- **PII Redaction**: Automatic masking of IBAN, email, phone, credit card, BIC in all server logs via `redactPII()`.
- **XLSX Export**: Excel exports for Saldenliste, Bilanz, GuV, OP-Liste via SheetJS (`xlsx` package).
- **Bulk Actions**: Mass-invoice creation, mass-notifications, bulk-export at `/massen-aktionen`.
- **Scheduled Reports**: Cron-based report generation with email delivery, report_schedules table, at `/geplante-berichte`.
- **DMS Versioning & Tagging**: Document version history, tag system with colors, document_versions/document_tags/document_tag_assignments tables.
- **Rules Engine Dry-Run**: Automation rules with test mode, 4 trigger types, automation_rules/automation_rule_logs tables.
- **2FA (TOTP)**: Two-factor authentication via authenticator apps, user_2fa table, QR code setup, backup codes.
- **eIDAS Signatures**: Electronic signature requests, canvas signature pad, SHA-256 document hashing, public verification endpoint, signature_requests/signatures tables, at `/signaturen`.
- **Ad-hoc Query Builder**: Custom report builder with 5 entities, field selection, filters, grouping, sorting, saved_reports table, at `/abfrage-builder`.
- **Property-Level Isolation**: All accounting endpoints filter by propertyId with ownership validation.
- **WEG Settlement System**: MEA-based cost distribution with Restcent-Verteilung (remainder cent to largest MEA owner), annual Jahresabrechnung (Soll/Ist/Saldo per owner), weg_settlements and weg_settlement_details tables.
- **WEG Accounting**: Reserve fund operations with interest booking, withdrawal with Beschluss control (requires voteId unless emergency), insurance claim workflow, special assessment invoicing.
- **Kaution Lifecycle Management**: Security deposit trust account booking, interest calculation (365-day basis), return workflow with deduction support, kautionen and kautions_bewegungen tables, 10 API endpoints.
- **Trial Balance Validation**: Automated Soll=Haben checks with reconciliation rate metrics, property-level filtering.
- **Payment Splitting**: Austrian law priority allocation (Miete→BK→HK→WK→Mahngebühren), auto-matching for unallocated payments, org-scoped validation.
- **WEG XLSX Reports**: Jahresabrechnung (3 sheets: summary, owner details, cost distribution), Rücklagen overview, Kautionen overview, Saldenliste export.
- **Penetration Test Suite**: 60+ security tests covering RLS-bypass, IDOR, payment flow edge cases, SQL injection, XSS, business logic validation (MEA, Kaution, trial balance).
- **Observability/Metrics**: metricsService with circuit breaker monitoring, OCR cost per tenant tracking (GPT-4o/4o-mini pricing), reconciliation failure rate, threshold-based alerts, `/api/admin/metrics` endpoint.
- **Automated Retests**: retestService with security findings management, 5 built-in test functions (RLS, IDOR, payment, SQL injection, trial balance), batch retest execution, `/api/admin/security-findings` and `/api/admin/retests` endpoints.
- **Performance Safety**: Granular rate limits per endpoint category (bulk 5/min, export 10/min, OCR 10/min, reports 15/min), BackpressureController (max 3 concurrent bulk jobs, queue depth 10), graceful degradation (memory-pressure based), `/api/admin/performance` endpoint.

## System Architecture
ImmoflowMe employs a modern full-stack architecture with a Node.js (Express.js) backend and a React (Vite) frontend. PostgreSQL (Neon) with Drizzle ORM handles data persistence.

**UI/UX Decisions:**
The frontend utilizes React 18, Vite, Tailwind CSS, and shadcn/ui for a responsive user interface. UI components support subscription management and feature gating. The sidebar has been consolidated, and a reusable `GuidedEmptyState` component is used for empty states.

**Technical Implementations:**
- **Backend**: Express.js, TypeScript.
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui.
- **Database**: PostgreSQL (Neon), Drizzle ORM.
- **Authentication**: Replit Auth, with dedicated bcrypt-based authentication for tenant and owner portals. 2FA (TOTP) via otpauth library.
- **Data Access**: Frontend communicates via REST API endpoints, managed with TanStack Query.
- **API Security**: Authentication, organization-based multi-tenancy, Postgres RLS policies, strict ownership checks, role-based authorization, soft-delete, Zod validation, idempotency keys for payments.
- **Database Security**: Row-Level Security (RLS) on 9 tables with `app.current_org` session variable, bypass policies for unauthenticated contexts.
- **MRG & WEG Compliance**: Supports MRG-compliant distribution keys, rent history, Austrian VAT, Wasserkosten tracking, settlement deadline warnings, Offene Posten management, Leerstand handling, and comprehensive WEG (Wohnungseigentumsgesetz 2002) management including owner assignments, assembly tracking, budget plans, reserve funds, and specific WEG-Vorschreibungen (owner invoicing).
- **Double-Entry Accounting**: Full doppelte Buchführung with 71-account Austrian Kontenrahmen (Klassen 0-9), journal entries with auto-numbering, Saldenliste, Bilanz, GuV, UVA, Kontoblatt, and Storno capability. Property-level isolation with validatePropertyOwnership. Tables: chart_of_accounts, journal_entries, journal_entry_lines, booking_number_sequences.
- **EBICS Live-Banking**: Electronic banking integration with connection management, RSA key initialization (INI/HIA/HPB), account statement retrieval (C52/C53), payment submission (CCT/CDD), and payment batch processing. Tables: ebics_connections, ebics_orders, ebics_payment_batches.
- **Offene Posten Management**: Dedicated /offene-posten page with 3 tabs: Abstimmung (KPI dashboard with aging 30/60/90+), OP-Liste (filterable table with due-date traffic lights, XLSX export), Bank↔OP Match (automatic matching of unassigned payments to open invoices with 1-click assignment). Backend: openItemsRoutes.ts with org-scoped endpoints.
- **Jahresabschluss Wizard**: Guided 6-step annual closing at /jahresabschluss: Periode wählen → AfA buchen → Abgrenzungen prüfen → Bilanz/GuV Review → Periode sperren → Abschlussbericht (Bilanz + GuV + Anlagenspiegel Export). Tables: fiscal_periods, depreciation_assets. Backend: fiscalYearRoutes.ts.
- **Accounting Features**: SEPA export (`pain.008.001.02`, `pain.001.001.03`), MRG §21 compliant settlement PDFs, automatic advance adjustment, automated dunning with ABGB §1333 interest, VPI automation for rent adjustment, MieWeG-Indexierungsrechner, various reporting, BMD NTCS/DATEV export, FinanzOnline integration, XLSX export for all reports.
- **Testing**: Vitest for unit tests (490+ tests) covering financial calculations, SEPA XML, invoice generation, dunning, security, and PII redaction. Playwright for E2E tests (24+ tests) covering health, authentication, security headers, and input validation.
- **OCR Functionality**: Integrates GPT-5.2 Vision for tenant data import, PDF processing, and invoice data extraction, protected by a circuit breaker.
- **Subscription & Access Control**: Supports user/organization subscriptions via Stripe, five distinct roles (admin, property_manager, finance, viewer, tester), and a demo access system.
- **Self-Service Portals**: Dedicated, secure portals for tenants and owners with separate logins, dashboards, document access, and administrative management of access grants.
- **Automated Workflows**: Guided workflows for settlements, dunning, VPI adjustment, and tenant move-in. Rules engine with dry-run capability for 4 trigger types (payment_received, invoice_due, lease_expiring, maintenance_due).
- **Financial Automation**: AI-based transaction matching for bank reconciliation (IBAN, amount, reference), automatic bank synchronization with open invoices, idempotency keys for payment endpoints.
- **Document Management**: DMS with version history, tag system (color-coded), full-text search. MRG-compliant lease contract generator with templates, data auto-fill, and PDF generation.
- **Electronic Signatures**: eIDAS-conformant signature system with canvas signature pad, SHA-256 document hashing, audit trail (IP, user agent, timestamp), public verification endpoint, signature request workflow with email notifications.
- **KI-Autopilot Add-on**: Premium AI features including a chat-based copilot, automated invoicing/dunning, AI invoice recognition, anomaly detection, and AI email drafting.
- **Compliance & Security**: BAO §132 retention, GoBD audit hash chain, WEG/MRG specific compliance checks, DSGVO compliance (consent, processing registry, retention, data export/anonymization), strong password policy, account lockout, API rate limiting, session security, CSRF, IDOR protection, input sanitization, HTTP security headers, nonce-based CSP, active session management, PII redaction in logs, 2FA (TOTP), and dedicated security/compliance dashboards.
- **PWA Support**: Progressive Web App manifest for mobile installation, service worker with cache strategies, push notifications via web-push/VAPID.
- **ESG/Energiemonitoring**: Energy certificate management, consumption tracking, CO2 balance, and ESG scoring.
- **Schadensmeldungen**: Damage reporting system with workflow and cost tracking.
- **Reporting**: Recharts-based dashboards for monthly revenue, payment rates, expense/income categories, and ESG scores. Ad-hoc query builder with 5 entities, saved reports, CSV/XLSX export. Scheduled report generation with cron-based email delivery.
- **Bulk Operations**: Mass-invoice creation, mass-notifications, bulk-export with progress tracking.
- **Full-Text Search**: pg_trgm-based fuzzy search across properties, units, tenants with GlobalSearch (Ctrl+K) component.

**System Design Choices:**
- **Modular Structure**: Clear separation of `server/`, `shared/`, and `src/` directories.
- **Drizzle ORM**: Type-safe database interactions.
- **Dedicated Tables**: For leases, payment allocations, financial audit logs, idempotency keys, push subscriptions, document versions/tags, automation rules/logs, 2FA, signatures, saved reports, report schedules.
- **Feature Routes Architecture**: Modular route structure organized by domain, with consistent naming and organization-scoped access control.
- **Defense in Depth**: App-level org checks + Postgres RLS policies + property ownership validation.

## External Dependencies
- **PostgreSQL (Neon)**: Cloud-native database service with pg_trgm extension and RLS.
- **Replit Auth**: Authentication service.
- **Resend**: Email API for notifications, scheduled reports, signature requests.
- **Stripe**: Payment processing.
- **OpenAI's GPT-5.2 (via Replit AI Integrations)**: For OCR capabilities and AI features.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI component library.
- **TanStack Query**: Data fetching and state management.
- **xlsx (SheetJS)**: Excel file generation for report exports.
- **web-push**: Push notification delivery with VAPID keys.
- **otpauth**: TOTP generation and verification for 2FA.
- **qrcode**: QR code generation for 2FA setup.
