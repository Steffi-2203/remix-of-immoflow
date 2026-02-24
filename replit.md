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
The frontend utilizes React 18, Vite, Tailwind CSS, and shadcn/ui for a responsive user interface. UI components support subscription management and feature gating. The system features a timeline-style UI for activity logs and traffic-light indicators for overdue items.

**Technical Implementations:**
- **Backend**: Express.js, TypeScript.
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui.
- **Database**: PostgreSQL (Neon), Drizzle ORM.
- **Authentication**: Replit Auth, with bcrypt-based authentication for tenant/owner portals and TOTP 2FA.
- **API Security**: Authentication, organization-based multi-tenancy, Postgres RLS, strict ownership checks, role-based authorization, soft-delete, Zod validation, idempotency keys, PII redaction in logs.
- **MRG & WEG Compliance**: Supports MRG-compliant distribution keys, rent history, Austrian VAT, Wasserkosten tracking, settlement deadline warnings, Offene Posten management, Leerstand handling, and comprehensive WEG (Wohnungseigentumsgesetz 2002) management including owner assignments, assembly tracking, budget plans, reserve funds, and specific WEG-Vorschreibungen. Features include a Heizkostenabrechnung system compliant with HeizKG and Richtwertmietzins/Kategoriemietzins calculators.
- **HeizKG-Heizkostenabrechnung**: Full §§5-15 compliant heating cost settlement with specific calculation rules, PDF generation, and export capabilities.
- **Double-Entry Accounting**: Full doppelte Buchführung with a 71-account Austrian Kontenrahmen, journal entries, Saldenliste, Bilanz, GuV, UVA, Kontoblatt, and Storno capability. Includes Einnahmen-Ausgaben-Rechnung (E/A) and Kaution lifecycle management.
- **EBICS Live-Banking**: Electronic banking integration for account statement retrieval and payment submission.
- **Accounting Features**: SEPA export, MRG §21 compliant settlement PDFs, automatic advance adjustment, automated dunning, VPI automation for rent adjustment, MieWeG-Indexierungsrechner, BMD NTCS/DATEV export, FinanzOnline integration, XLSX export.
- **Testing**: Vitest for unit tests (financial calculations, SEPA XML, invoice generation, dunning, security, tenant isolation, deposit lifecycle, bank reconciliation) and Playwright for E2E tests (health, authentication, security headers, input validation, betriebskosten/SEPA, zahlungen/offene-posten, mahnwesen/VPI/eigentümer/schlüssel).
- **OCR Functionality**: Integrates AI for tenant data import, PDF processing, and invoice data extraction.
- **Subscription & Access Control**: Stripe integration for subscriptions, five distinct user roles, and demo access.
- **Self-Service Portals**: Secure portals for tenants and owners.
- **Automated Workflows**: Guided workflows for settlements, dunning, VPI adjustment, tenant move-in. Rules engine with dry-run capability.
- **Financial Automation**: AI-based transaction matching for bank reconciliation, automatic bank synchronization with open invoices. The `payment_allocations` table serves as the source of truth for payments.
- **Document Management**: DMS with version history, tag system, full-text search. MRG-compliant lease contract generator.
- **Electronic Signatures**: eIDAS-conformant system with canvas signature pad, SHA-256 hashing, audit trail, public verification.
- **KI-Autopilot Add-on**: Premium AI features including chat-based copilot, automated invoicing/dunning, AI invoice recognition, anomaly detection, and AI email drafting.
- **Financial Audit Logging**: GoBD-compliant SHA-256 hash chain via `auditHashService.ts` for critical financial actions.
- **Compliance & Security**: BAO §132 retention, GoBD audit hash chain, WEG/MRG specific compliance, DSGVO compliance, strong password policy, account lockout, API rate limiting, session security, CSRF, IDOR protection, input sanitization, HTTP security headers, nonce-based CSP, active session management, PII redaction in logs, 2FA, security/compliance dashboards, and a penetration test suite.
- **PWA Support**: Progressive Web App with manifest, service worker for caching, and push notifications.
- **ESG/Energiemonitoring**: Energy certificate management, consumption tracking, CO2 balance, and ESG scoring.
- **Schadensmeldungen**: Damage reporting system with workflow and cost tracking.
- **Reporting**: Recharts-based dashboards, ad-hoc query builder, scheduled report generation, full-text search.
- **Bulk Operations**: Mass-invoice creation, mass-notifications, bulk-export with progress tracking.

**System Design Choices:**
- **Modular Structure**: Clear separation of `server/`, `shared/`, and `src/` directories.
- **Drizzle ORM**: Type-safe database interactions.
- **Dedicated Tables**: For leases, payment allocations, financial audit logs, idempotency keys, push subscriptions, document versions/tags, automation rules/logs, 2FA, signatures, saved reports, report schedules.
- **Feature Routes Architecture**: Modular route files in `server/routes/` organized by domain.
- **Defense in Depth**: App-level organization checks + Postgres RLS policies + property ownership validation.
- **Type Safety**: `AuthenticatedRequest` interface extends Express `Request` with typed session (`userId`, `organizationId`).
- **Legal Pages**: Public routes for impressum, datenschutz, agb, avv, sla, and loeschkonzept, all with legal disclaimers.
- **SEO & Domain Configuration**: Canonical domain, DNS records, robots.txt, sitemap.xml, JSON-LD structured data, Open Graph, Twitter Cards, canonical tags.
- **Performance**: gzip/brotli compression, immutable 1-year cache for static assets.
- **Email Queue**: BullMQ + Redis for email queuing, with a fallback to inline Resend.
- **Migration Runner**: Transactional up/down migrations using `migrations/runner.ts`.
- **E2E Test Infrastructure**: Deterministic test data with fixed UUIDs for consistent testing environments.

## External Dependencies
- **PostgreSQL (Neon)**: Cloud-native database service.
- **Replit Auth**: Authentication service.
- **Resend**: Email API.
- **BullMQ/Redis**: Optional email queue backend.
- **Stripe**: Payment processing.
- **OpenAI's GPT-5.2 (via Replit AI Integrations)**: For OCR and AI features.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI component library.
- **TanStack Query**: Data fetching and state management.
- **xlsx (SheetJS)**: Excel file generation.
- **web-push**: Push notification delivery.
- **otpauth**: TOTP generation and verification.
- **qrcode**: QR code generation.