# ImmoflowMe - Austrian Property Management System

## Overview
ImmoflowMe is an Austrian property management (Hausverwaltung) application focused on MRG (Mietrechtsgesetz) compliance. Its core purpose is to streamline property and tenant management, automate financial processes, and ensure regulatory adherence for the Austrian market. Key capabilities include automated invoice generation with Austrian VAT rates, OCR-based document processing, SEPA payment export, and comprehensive operating cost settlements (Betriebskostenabrechnung). The project aims to provide a robust, compliant, and efficient solution for property managers in Austria, including specialized features for professional accountants.

## User Preferences
- Language: German (Austrian German)
- Currency: EUR with Austrian formatting
- Date format: DD.MM.YYYY

## System Architecture
ImmoflowMe is built on a modern full-stack architecture using Node.js with Express.js for the backend and React with Vite for the frontend. PostgreSQL (Neon) with Drizzle ORM serves as the primary database.

**UI/UX Decisions:**
The frontend utilizes React 18, Vite, Tailwind CSS, and shadcn/ui components for a modern, responsive user interface. Specific design elements like `SubscriptionTeaser`, `TrialBanner`, `UserUpgradeBanner`, `FeatureLockPopup`, and `LimitGatedButton` are implemented for subscription management and feature gating.

**Technical Implementations:**
- **Backend**: Express.js with Vite middleware, TypeScript.
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui.
- **Database**: PostgreSQL (Neon), Drizzle ORM.
- **Authentication**: Replit Auth.
- **Data Access**: All frontend components use REST API endpoints (`/api/*`) - complete migration from Supabase SDK (January 2026).
- **Email**: Resend integration for notifications and invitations.
- **Routing**: `react-router-dom` for frontend, Express for backend API.
- **State Management**: TanStack Query (React Query) for data fetching and caching.
- **API Security**: Authentication and organization-based multi-tenancy are implemented across routes with strict ownership checks via relationship traversal (e.g., tenant→unit→property→org). Backend role-based authorization middleware (`requireRole`, `requireMutationAccess`, `requireFinanceAccess`, `requireAdminAccess`) enforces permissions on all 120+ mutation routes (POST/PATCH/DELETE). Viewers and testers are blocked from mutations server-side.
- **Data Integrity**: Soft-delete functionality using `deletedAt` timestamps for key entities and `Zod` validation for all POST/PATCH API endpoints ensure data consistency and security.
- **MRG Compliance**:
    - Six standard MRG-compliant distribution keys (Nutzfläche, Einheiten, Personen, Pauschal, Verbrauch, Sondernutzung) are managed for operating cost allocation.
    - Rent history is tracked in a `rent_history` table with `validFrom`/`validUntil` fields.
    - Austrian VAT rates are applied consistently (e.g., 10% for residential rent/BK/Wasser, 20% for heating/commercial).
    - **Wasserkosten**: Water costs (Wasserkosten) are tracked as a separate invoice line item with 10% VAT, supporting properties where water is billed separately from BK.
    - **§ 21 MRG Legal Warnings**: Automatic warnings for settlement deadlines (Abs 3: after 30.06. of following year) and statute of limitations (Abs 4: expires 01.01. of 4th following year).
    - **Offene Posten**: SOLL values sourced from Vorschreibung (monthly_invoices) with fallback to tenant fields.
    - **Leerstand (Vacancy)**: Vacant units generate Vorschreibungen with BK+HK but no rent (Miete=0). Owner pays these costs. Units have `leerstandBk` and `leerstandHk` fields to define vacancy costs. Vacancy invoices are created automatically during invoice generation and marked with `isVacancy=true`.
    - **Bank Account Year-End Carry-Over**: API route `/api/bank-accounts/:id/carry-over` transfers 31.12. closing balance to 01.01. opening balance with conflict detection.
- **Professional Accountant Features**:
    - **SEPA Export**: Generation of `pain.008.001.02` (Direct Debit) and `pain.001.001.03` (Credit Transfer) XML files compliant with Austrian banking standards.
    - **Settlement PDFs**: MRG §21 compliant Betriebskostenabrechnung templates with detailed expense breakdowns and per-tenant cost allocation.
    - **Automatic Advance Adjustment**: After BK-Abrechnung, new advances are calculated using MRG-compliant formula: `(BK + HK) / 12 × 1.03` (3% safety reserve). API route `/api/advances/update` updates tenant `betriebskostenVorschuss` and `heizkostenVorschuss` fields.
    - **Owner Plausibility Report**: `generateGesamtabrechnungPdf` creates comprehensive owner summary with cost overview (BK/HK by tenant/owner), per-unit breakdown, and verification calculation.
    - **Automated Dunning**: A 3-level escalation system for overdue payments with ABGB §1333 interest calculation and automatic email sending.
    - **VPI Automation**: Monitoring of Austrian consumer price index (VPI) for automatic rent adjustment triggers and notification letter generation.
    - **MieWeG-Indexierungsrechner**: Calculation tool for rent increases under the 2026 Mieten-Wertsicherungsgesetz with Hälfteregelung (50% rule for inflation > 3%), 2026/2027 caps for Kategorie/Richtwert (1%/2%), April 1 rule, and annual limit enforcement.
    - **Reporting**: Owner reporting with financial summaries and specific reports for contract expiration, security deposits, and meter readings.
    - **Export Formats**: BMD NTCS CSV and DATEV ASCII export formats for accounting software integration.
    - **FinanzOnline Integration**: USt-Voranmeldung XML generation (Form U30) with Austrian tax authority compliance.
    - **Document Management**: Metadata-based document storage with category system and access control.
- **Unit Testing Infrastructure**: Comprehensive test suite with 70+ tests (7 test files) covering:
    - MRG payment allocation (BK→HK→Miete priority)
    - Settlement calculations with vacancy logic per §21 MRG
    - MieWeG rent indexation (Hälfteregelung, 2026/2027 caps)
    - SEPA export validation (IBAN/BIC validation, XML escaping)
    - Dunning system (ABGB §1333 interest calculation)
    - Distribution keys (MEA, QM, Personen, Verbrauch, Einheiten)
- **OCR Functionality**: Integration of GPT-5.2 Vision via Replit AI Integrations for vision-based OCR:
    - **Tenant Data Import**: Extract tenant information from images of rental contracts or Vorschreibungen (first/last name, rent amounts, BK/HK, rental start date, unit number). Accessible via "PDF scannen" button in tenant list.
    - **PDF Support**: Client-side PDF-to-image conversion using pdfjs-dist with local bundled worker. First page is converted for OCR processing.
    - **Invoice Processing**: Extract structured data from invoices and bank statements, supporting Austrian-specific categories.
- **Subscription Management**: Two parallel systems: a legacy organization-based system (Stripe integrated) and a newer user-based system with `profiles.subscriptionTier` tracking, feature gating, and Stripe checkout integration.
- **Role-Based Access Control**: Five distinct roles (admin, property_manager, finance, viewer, tester) with varying permissions and a "tester" mode for data masking of personal information.
- **Demo Access System**: Time-limited 30-minute trial access for prospects via email invitation. Includes:
    - Email-based demo request flow with token validation (24-hour expiry)
    - Automatic demo data generation (Vienna Altbau + Graz Neubau properties, 8 tenants, invoices, expenses)
    - Countdown timer banner showing remaining demo time
    - Modal blocking access upon demo expiration with upgrade/contact options
    - Routes: `/demo` (request), `/demo/activate` (activation), `/api/demo/*` (backend)

- **WEG Management** (Wohnungseigentumsgesetz 2002): Comprehensive WEG compliance with:
    - **Eigentümer & MEA**: Unit-owner assignments with Miteigentumsanteile (co-ownership shares) per § 2 WEG (`weg_unit_owners` table)
    - **Versammlungen**: Assembly tracking with types (ordentlich/außerordentlich/Umlaufbeschluss), invitation deadline compliance per § 25 Abs 2 (14-day rule), quorum tracking, protocol management
    - **Tagesordnungspunkte (TOPs)**: Agenda items per assembly with numbering and categories
    - **Abstimmungen**: MEA-weighted voting per § 24 WEG with required majority types (einfach >50%, qualifiziert >66.67%, einstimmig 100%), per-owner vote recording (`weg_owner_votes`)
    - **Wirtschaftsplan**: Annual budget plans per § 31 WEG with line items, allocation keys, and reserve contribution tracking
    - **Instandhaltungsrücklage**: Reserve fund per § 31 WEG with per-owner/unit tracking
    - **Sonderumlagen**: Special assessments with MEA-based allocation
    - **Erhaltung & Verbesserung**: Maintenance tracking per § 28-29 WEG with categories (ordentliche/außerordentliche Verwaltung, Notmaßnahme), financing source tracking (Rücklage/Sonderumlage/Laufend)
    - **Eigentümerwechsel**: Complete ownership transfer workflow per § 38/§ 39 WEG 2002 (`weg_owner_changes` table) with:
      - 6-step wizard UI: unit/owner selection → new owner → transfer dates/Grundbuch data → Rechtsgrund → preview with aliquotierung → confirmation & execution
      - Day-based aliquotierung per § 34 WEG (proration of transfer month by days)
      - Transactional execution: atomic updates to unit owners (validTo/validFrom), invoice cancellation/aliquotierung, new invoice generation, reserve fund transfers, audit logging
      - § 38 WEG Solidarhaftung warnings for past-due BK debts
      - § 39 WEG reserve fund automatic transfer (no payout to previous owner)
      - Rechtsgrund tracking: kauf/schenkung/erbschaft/zwangsversteigerung/einbringung
      - Grundbuch data: TZ-Nummer, Eintragungsdatum, Kaufvertragsdatum
      - PDF Übergabebestätigung export with aliquotierung breakdown and WEG compliance notes
      - Owner change history table with status tracking (entwurf → grundbuch_eingetragen → abgeschlossen)
      - API: `/api/weg/owner-changes`, `/api/weg/owner-changes/:id/preview`, `/api/weg/owner-changes/:id/execute`
    - Routes: `/weg`, API: `/api/weg/*`
- **Insurance Management**: Policy tracking (Gebäudeversicherung, Haftpflicht, etc.) and claims management (Schadensmeldungen). Routes: `/versicherungen`, API: `/api/insurance/*`.
- **Deadline Calendar**: Unified deadline/reminder system for contracts, insurance renewals, maintenance, settlements, and tax deadlines. Routes: `/fristen`, API: `/api/deadlines`.
- **Serial Letters**: Template-based bulk letter generation with placeholder substitution for tenants. Routes: `/serienbriefe`, API: `/api/letter-templates`, `/api/serial-letters`.
- **Management Contracts**: HV-Vertrag tracking with auto-renewal, notice periods, and fee management. Routes: `/hv-vertraege`, API: `/api/management-contracts`.
- **Heating Cost Import**: External heating cost readings (ISTA/Techem) with CSV import support. API: `/api/heating-cost-readings`.
- **Owner Payouts**: Eigentümer-Auszahlung calculation with income/expense/fee breakdown. API: `/api/owner-payouts`.
- **Organization Switcher**: Multi-mandant support via `user_organizations` table for managing multiple HV organizations.
- **Feature Routes Architecture**: New feature modules use a separate `server/routes/featureRoutes.ts` with snake_case↔camelCase auto-conversion between frontend and Drizzle ORM, organization-scoped access control on all CRUD operations.

**System Design Choices:**
- **Modular Structure**: The project is organized into `server/`, `shared/`, and `src/` directories for clear separation of backend, shared schemas, and frontend concerns.
- **Drizzle ORM**: Used for type-safe database interactions and schema management, with 45+ tables covering organizations, users, properties, tenants, financials, settlements, maintenance, MRG compliance, WEG management, insurance, deadlines, serial letters, management contracts, heating cost readings, and owner payouts.
- **Leases Table**: Dedicated `leases` table for rental contract history, linking tenants to units with start/end dates, rent amounts, and deposit tracking. Enables multiple sequential leases per unit.
- **Payment Allocations**: `payment_allocations` table enables flexible 1:n payment-to-invoice mapping for partial payments, overpayments, and multi-invoice allocation.
- **Migrated Functions**: Key business logic functions, originally Supabase Edge Functions, are now integrated directly into the Express.js backend for unified management.

## External Dependencies
- **PostgreSQL (Neon)**: Cloud-native PostgreSQL database service.
- **Replit Auth**: Authentication service for user management.
- **Resend**: Email API for sending notifications, invitations, and dunning letters.
- **Stripe**: Payment processing for subscription management.
- **OpenAI's GPT-5.2 (via Replit AI Integrations)**: For OCR capabilities (tenant data extraction, invoice and bank statement processing).
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components for React.
- **TanStack Query**: Data fetching and state management library.