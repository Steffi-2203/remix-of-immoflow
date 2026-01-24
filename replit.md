# ImmoflowMe - Austrian Property Management System

## Overview
ImmoflowMe is a comprehensive Austrian property management (Hausverwaltung) application with MRG (Mietrechtsgesetz) compliance. It features property and tenant management, automated invoice generation with Austrian VAT rates, OCR-based document processing, SEPA payment export, and operating cost settlements (Betriebskostenabrechnung).

## Current State
- **Migration Status**: Migrating from Lovable/Supabase to Replit with Neon PostgreSQL
- **Server**: Express.js with Vite middleware running on port 5000
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Frontend**: React with Vite, Tailwind CSS, shadcn/ui components

## Tech Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Routing**: react-router-dom (frontend), Express (backend)
- **State Management**: TanStack Query (React Query)

## Project Structure
```
├── server/           # Express server
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API routes
│   ├── storage.ts    # Database queries
│   ├── vite.ts       # Vite middleware setup
│   └── db.ts         # Database connection
├── shared/           # Shared types and schemas
│   └── schema.ts     # Drizzle database schema
├── src/              # Frontend React app
│   ├── components/   # UI components
│   ├── hooks/        # React hooks (many for Supabase, need migration)
│   ├── pages/        # Route pages
│   └── integrations/ # Supabase integration (being migrated)
├── supabase/         # Legacy Supabase files
│   ├── functions/    # Edge functions to migrate
│   └── migrations/   # Database migrations (reference only)
└── drizzle.config.ts # Drizzle configuration
```

## Database Schema
The schema includes 30+ tables for:
- **Organizations & Users**: organizations, profiles, user_roles
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

## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

## Migration Notes
14 Supabase Edge Functions need migration to Express routes:
1. check-maintenance-reminders
2. cron-generate-invoices
3. delete-account
4. export-user-data
5. generate-monthly-invoices
6. ocr-bank-statement
7. ocr-invoice
8. ocr-invoice-text
9. send-dunning
10. send-invite
11. send-message
12. send-settlement-email
13. validate-invoice

## Environment Variables Needed
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `RESEND_API_KEY` - For email sending (required for notifications)
- `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` - For OCR processing

## User Preferences
- Language: German (Austrian German)
- Currency: EUR with Austrian formatting
- Date format: DD.MM.YYYY
