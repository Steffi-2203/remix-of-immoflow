# ImmoflowMe - Austrian Property Management System

## Overview
ImmoflowMe is a comprehensive Austrian property management (Hausverwaltung) application with MRG (Mietrechtsgesetz) compliance. It features property and tenant management, automated invoice generation with Austrian VAT rates, OCR-based document processing, SEPA payment export, and operating cost settlements (Betriebskostenabrechnung).

## Current State
- **Migration Status**: Migrated from Lovable/Supabase to Replit with Neon PostgreSQL
- **Authentication**: Replit Auth (replaces Supabase Auth)
- **Email**: Resend integration for notifications and invitations
- **Server**: Express.js with Vite middleware running on port 5000
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Frontend**: React with Vite, Tailwind CSS, shadcn/ui components

## Recent Changes (January 2026)
- **Hook Migration abgeschlossen**: Alle Frontend-Hooks von Supabase auf Express API migriert
  - useInvoices, useExpenses, usePayments, useUnits, useTenants verwenden jetzt Express API
  - CRUD-Operationen (GET/POST/PATCH/DELETE) für alle Entitäten verfügbar
  - Feldnamen auf camelCase angepasst für Backend-Kompatibilität
- **2025 Simulation**: Umfassende Testdaten für volles Jahr 2025
  - 1 Immobilie (Musterhaus Simulation 2025), 5 Einheiten, 6 Mieter
  - 59 Vorschreibungen, 57 Zahlungen, 24 Ausgaben (€16.240 BK, €12.000 Instandhaltung)
  - Realistische Szenarien: Auszug, Leerstand, Neuvermietung, Zahlungsrückstände
- **OCR-Integration**: GPT-4o vision-based OCR for invoices and bank statements via Replit AI Integrations
- **Eigentümerverwaltung**: Owner management with property assignment (OwnerList.tsx)
- **Zählerstand-Erfassung**: Meter readings with history tracking (MeterReadings.tsx)
- **Vertragsablauf Report**: Contract expiration report with 1/3/6 month alerts
- **Kautionsübersicht**: Security deposit report with PDF/CSV export
- **CSV Export**: Export functionality added to Kaution and Vertragsablauf reports
- **Dashboard KPIs**: New widget showing vacancy rate, outstanding receivables, dunning status
- **Schlüsselverwaltung**: Key inventory and handover tracking (KeyManagement.tsx)
- **VPI-Indexanpassungen**: Rent adjustments based on Austrian consumer price index (VpiAdjustments.tsx)

### OCR Functionality
OCR is now fully functional using OpenAI's GPT-4o via Replit AI Integrations:
- **ocr-invoice**: Extracts data from invoice images (lieferant, betrag, datum, IBAN, etc.)
- **ocr-invoice-text**: Analyzes OCR text from PDFs for structured invoice data
- **ocr-bank-statement**: Extracts transactions from bank statement images
- All endpoints return consistent `{data}` response format
- Austrian-specific categories and expense types supported
- File type validation (JPEG, PNG, GIF, WebP) with 10MB limit

### New Database Tables
- `owners` - Property owner information
- `property_owners` - Many-to-many relationship for properties and owners
- `meters` - Water/gas/electric/heating meters
- `meter_readings` - Historical meter readings
- `key_inventory` - Key inventory per property/unit
- `key_handovers` - Key handover tracking
- `vpi_adjustments` - VPI rent adjustment calculations

## Tech Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Authentication**: Replit Auth
- **Email**: Resend
- **Routing**: react-router-dom (frontend), Express (backend)
- **State Management**: TanStack Query (React Query)

## Project Structure
```
├── server/           # Express server
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API routes
│   ├── functions.ts  # Migrated Edge Functions
│   ├── storage.ts    # Database queries
│   ├── lib/resend.ts # Email service
│   ├── vite.ts       # Vite middleware setup
│   ├── db.ts         # Database connection
│   └── replit_integrations/ # Replit Auth integration
├── shared/           # Shared types and schemas
│   └── schema.ts     # Drizzle database schema
├── src/              # Frontend React app
│   ├── components/   # UI components
│   ├── hooks/        # React hooks
│   ├── pages/        # Route pages
│   └── integrations/ # API integrations
├── supabase/         # Legacy Supabase files (reference only)
│   ├── functions/    # Original Edge functions (migrated)
│   └── migrations/   # Database migrations (reference only)
└── drizzle.config.ts # Drizzle configuration
```

## Database Schema
The schema includes 30+ tables for:
- **Organizations & Users**: organizations, profiles, user_roles, organization_invites
- **Properties**: properties, units, property_managers
- **Tenants**: tenants (with MRG-compliant fields)
- **Financials**: monthly_invoices, payments, expenses, bank_accounts, transactions
- **Settlements**: settlements, settlement_details
- **Maintenance**: maintenance_contracts, maintenance_tasks, contractors
- **MRG Compliance**: distribution_keys, unit_distribution_values
- **SEPA**: sepa_collections
- **Audit**: audit_logs, messages

## Austrian VAT Rates (MRG-compliant)
- Wohnung (Residential): Miete 10%, BK 10%, Heizung 20%
- Geschäft/Garage/Stellplatz/Lager (Commercial): All 20%

## Role System
Five roles with different permissions:
- **admin**: Full access, organization management
- **property_manager**: Property and tenant management
- **finance**: Financial operations, invoicing
- **viewer**: Read-only access
- **tester**: Limited access, personal data masked (names, emails, phone numbers, IBAN, addresses replaced with placeholders)

## Tester Mode Data Masking
When a user has the "tester" role, personal data (Personenbezogene Daten) is automatically masked in API responses:
- Names → "Max Mustermann"
- Email → "mieter@beispiel.at"
- Phone → "+43 XXX XXXXXX"
- IBAN → "AT** **** **** **** ****"
- Address → "Musterstraße 1, 1010 Wien"

Masking is applied to: tenants, payments, invoices, bank accounts, transactions, organization members

## Subscription System
Two parallel subscription systems exist:

### Organization-Based Subscription (Legacy)
Three-tier model with Stripe integration:
- **Starter** (€29/month): 5 properties, 20 units, 2 users, basic features
- **Professional** (€59/month): 25 properties, 100 units, 5 users, SEPA-Export, Mahnwesen, Wartungsverträge, OCR-Belegerfassung
- **Enterprise** (€149/month): Unlimited everything, API access, Priority Support

Key Components:
- `useSubscription` hook: organization subscription status
- `SubscriptionTeaser`: wrapper component for gating features
- `TrialBanner`: shows trial countdown for organization

### User-Based Subscription (New)
Three-tier model stored in profiles table:
- **Trial** (14 Tage kostenlos): 1 Immobilie, 3 Mieter, Abrechnungen nur ansehen, kein Export/Upload
- **Starter** (€149/Monat): 50 Immobilien, unbegrenzte Mieter, voller Zugang außer Automatisierung
- **Pro** (€299/Monat): Unbegrenzt, Automatisierung, API-Zugang, Priority Support

Key Components:
- `useSubscriptionLimits` hook: user subscription status and feature limits
- `UserUpgradeBanner`: shows trial/expired status and upgrade prompt
- `FeatureLockPopup`: dialog for locked features with upgrade button
- `LimitGatedButton`: wrapper for buttons that check limits
- `/pricing` page: plan comparison and selection
- `/checkout` page: Stripe checkout for user subscriptions

API Endpoints:
- `GET /api/user/subscription`: Get user subscription status
- `POST /api/stripe/checkout`: Create checkout session for user subscription

Webhook Handler:
- Updates profiles.subscriptionTier on successful checkout
- Stores stripeCustomerId and stripeSubscriptionId in profiles

### Admin Organization
Admin organization (stephania.pfeffer@outlook.de) has active enterprise subscription by default.

## Migrated Edge Functions (server/functions.ts)
1. generate-monthly-invoices - MRG-compliant invoice generation
2. send-invite - Email invitations via Resend
3. send-dunning - Payment reminders and dunning letters
4. check-maintenance-reminders - Maintenance contract reminders
5. validate-invoice - Invoice data validation
6. export-user-data - GDPR data export
7. send-settlement-email - Settlement notifications
8. send-message - General email sending
9. delete-account - Account deletion requests
10. cron-generate-invoices - Scheduled invoice generation

## Pending OCR Functions (require OpenAI)
- ocr-invoice - Invoice image OCR
- ocr-invoice-text - Invoice text extraction
- ocr-bank-statement - Bank statement processing

## API Endpoints

### Authentication
- POST /api/login - Replit Auth login
- POST /api/logout - Logout
- GET /api/auth/user - Current user

### Organizations
- GET /api/organizations - List organizations
- POST /api/invites - Create invitation
- POST /api/invites/:token/accept - Accept invitation

### Properties & Tenants
- GET /api/properties - List properties
- GET /api/properties/:id/units - Units for property
- GET /api/tenants - List tenants

### Functions
- POST /api/functions/generate-monthly-invoices - Generate invoices
- POST /api/functions/send-dunning - Send payment reminders
- GET /api/functions/export-user-data - Export user data
- POST /api/functions/validate-invoice - Validate invoice data

## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `RESEND_API_KEY` - For email sending (configured via Resend integration)
- `INTERNAL_CRON_SECRET` - Secret for internal cron endpoints (optional)

## Admin Account
- Email: stephania.pfeffer@outlook.de
- Role: admin
- Organization: ImmoflowMe Admin

## User Preferences
- Language: German (Austrian German)
- Currency: EUR with Austrian formatting
- Date format: DD.MM.YYYY
