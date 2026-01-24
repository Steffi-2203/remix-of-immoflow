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
