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
- **API Security**: Authentication and organization-based multi-tenancy are implemented across routes with strict ownership checks via relationship traversal (e.g., tenant→unit→property→org).
- **Data Integrity**: Soft-delete functionality using `deletedAt` timestamps for key entities and `Zod` validation for all POST/PATCH API endpoints ensure data consistency and security.
- **MRG Compliance**:
    - Six standard MRG-compliant distribution keys (Nutzfläche, Einheiten, Personen, Pauschal, Verbrauch, Sondernutzung) are managed for operating cost allocation.
    - Rent history is tracked in a `rent_history` table with `validFrom`/`validUntil` fields.
    - Austrian VAT rates are applied consistently (e.g., 10% for residential rent/BK, 20% for heating/commercial).
    - **§ 21 MRG Legal Warnings**: Automatic warnings for settlement deadlines (Abs 3: after 30.06. of following year) and statute of limitations (Abs 4: expires 01.01. of 4th following year).
    - **Offene Posten**: SOLL values sourced from Vorschreibung (monthly_invoices) with fallback to tenant fields.
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
- **OCR Functionality**: Integration of GPT-4o via Replit AI for vision-based OCR to extract structured data from invoices and bank statements, supporting Austrian-specific categories.
- **Subscription Management**: Two parallel systems: a legacy organization-based system (Stripe integrated) and a newer user-based system with `profiles.subscriptionTier` tracking, feature gating, and Stripe checkout integration.
- **Role-Based Access Control**: Five distinct roles (admin, property_manager, finance, viewer, tester) with varying permissions and a "tester" mode for data masking of personal information.

**System Design Choices:**
- **Modular Structure**: The project is organized into `server/`, `shared/`, and `src/` directories for clear separation of backend, shared schemas, and frontend concerns.
- **Drizzle ORM**: Used for type-safe database interactions and schema management, with over 30 tables covering organizations, users, properties, tenants, financials, settlements, maintenance, and MRG compliance.
- **Migrated Functions**: Key business logic functions, originally Supabase Edge Functions, are now integrated directly into the Express.js backend for unified management.

## External Dependencies
- **PostgreSQL (Neon)**: Cloud-native PostgreSQL database service.
- **Replit Auth**: Authentication service for user management.
- **Resend**: Email API for sending notifications, invitations, and dunning letters.
- **Stripe**: Payment processing for subscription management.
- **OpenAI's GPT-4o (via Replit AI Integrations)**: For OCR capabilities (invoice and bank statement processing).
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI components for React.
- **TanStack Query**: Data fetching and state management library.