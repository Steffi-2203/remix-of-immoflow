# ImmoflowMe - Austrian Property Management System

## Overview
ImmoflowMe is an Austrian property management (Hausverwaltung) application designed for MRG (Mietrechtsgesetz) compliance. It streamlines property and tenant management, automates financial processes, and ensures regulatory adherence within the Austrian market. Key capabilities include automated invoice generation with Austrian VAT rates, OCR-based document processing, SEPA payment export, comprehensive operating cost settlements, and specialized tools for professional accountants. The project aims to provide a robust, compliant, and efficient solution for Austrian property managers.

## User Preferences
- Language: German (Austrian German)
- Currency: EUR with Austrian formatting
- Date format: DD.MM.YYYY

## System Architecture
ImmoflowMe employs a modern full-stack architecture with a Node.js (Express.js) backend and a React (Vite) frontend. PostgreSQL (Neon) with Drizzle ORM handles data persistence.

**UI/UX Decisions:**
The frontend utilizes React 18, Vite, Tailwind CSS, and shadcn/ui for a responsive user interface. Subscription management and feature gating are implemented with dedicated UI components.

**Technical Implementations:**
- **Backend**: Express.js, TypeScript.
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui.
- **Database**: PostgreSQL (Neon), Drizzle ORM.
- **Authentication**: Replit Auth.
- **Data Access**: Frontend communicates via REST API endpoints.
- **Email**: Resend integration.
- **Routing**: `react-router-dom` for frontend, Express for backend API.
- **State Management**: TanStack Query for data fetching.
- **API Security**: Authentication, organization-based multi-tenancy, strict ownership checks, and role-based authorization middleware.
- **Data Integrity**: Soft-delete functionality and Zod validation for all API endpoints.
- **MRG Compliance**: Supports MRG-compliant distribution keys, rent history tracking, Austrian VAT rates, Wasserkosten tracking, settlement deadline warnings, Offene Posten management, Leerstand handling, and bank account year-end carry-over.
- **Professional Accountant Features**: SEPA export (`pain.008.001.02`, `pain.001.001.03`), MRG §21 compliant settlement PDFs, automatic advance adjustment, owner plausibility reports, automated dunning with ABGB §1333 interest calculation, VPI automation for rent adjustment, MieWeG-Indexierungsrechner, various reporting functionalities, BMD NTCS CSV and DATEV ASCII export, FinanzOnline integration (USt-Voranmeldung XML), and metadata-based document management.
- **Unit Testing Infrastructure**: Comprehensive test suite (225 tests across 19 files) covering business logic, E2E billing cycles, data integrity, GoBD audit trails, and multi-tenant isolation.
- **OCR Functionality**: Integrates GPT-5.2 Vision for tenant data import, PDF processing, and invoice data extraction.
- **Subscription Management**: Supports user and organization-based subscriptions with Stripe integration.
- **Role-Based Access Control**: Five distinct roles (admin, property_manager, finance, viewer, tester) with specific permissions, including a "tester" mode for data masking.
- **Demo Access System**: Time-limited trial access with auto-generated demo data.
- **WEG Management**: Comprehensive support for Wohnungseigentumsgesetz 2002, including owner assignments, assembly tracking, agenda items, MEA-weighted voting, annual budget plans, reserve fund tracking, special assessments, maintenance tracking, and ownership transfer workflows.
- **Additional Features**: Insurance management, deadline calendar, serial letters, management contracts, heating cost import, owner payouts, and multi-mandant support via an organization switcher.
- **Observability**: Structured logging, request logger, enhanced health checks, and readiness probes.
- **Compliance**: BAO §132 retention, GoBD audit hash chain with tamper detection (integrated into invoice/payment/settlement mutations with enriched payloads), WEG §31 MEA-weighted reserve checks with per-unit analysis, WEG §24 invitation deadline validation, MRG §27 deposit return tracking, and a compliance dashboard.
- **API Standards**: Centralized error handling with `ApiError` class and standardized error codes.
- **DB Performance**: 16 performance indexes on frequently queried columns.
- **Security**: Password policy (length, complexity, leak check, history), account lockout, API rate limiting, session security (HTTP-only, secure cookies, PostgreSQL storage), CSRF protection (double-submit cookie), IDOR protection (centralized ownership checks), input sanitization (HTML-escaping), runtime service guards, authentication event audit logging, HTTP security headers (Helmet.js), nonce-based CSP (script-src with per-request nonce, script-src-attr 'none', upgrade-insecure-requests), active session management with device tracking, and security dashboard with scoring.
- **DSGVO Compliance**: Server-side consent management with versioned audit trail (Art. 7), Art. 30 processing activities registry, automated data retention policies with legal basis tracking (BAO §132, ABGB §1489, HeizKG), tenant data export (Art. 15/20), tenant data anonymization (Art. 17), cookie banner with granular consent controls, and compliance scoring dashboard.
- **Support Ticketing**: In-app ticket system with auto-generated ticket numbers, category/priority management, comment threads, status tracking, and tenant/property/unit association.
- **Guided Workflows**: Step-by-step wizard assistants for BK-Abrechnung (6 steps), Mahnlauf (5 steps), VPI-Mietanpassung (5 steps), and Mietereinzug (6 steps) with progress tracking.
- **PWA Support**: Progressive Web App manifest for mobile installation, service worker for offline capability, and mobile-optimized viewport configuration.

**System Design Choices:**
- **Modular Structure**: Clear separation of `server/`, `shared/`, and `src/` directories.
- **Drizzle ORM**: Type-safe database interactions and schema management.
- **Dedicated Tables**: `leases` for contract history, `payment_allocations` for flexible payment mapping, `financial_audit_log` for GoBD compliance.
- **Feature Routes Architecture**: New modules use `server/routes/featureRoutes.ts` with consistent naming conventions and organization-scoped access control.

## External Dependencies
- **PostgreSQL (Neon)**: Cloud-native database service.
- **Replit Auth**: Authentication service.
- **Resend**: Email API.
- **Stripe**: Payment processing.
- **OpenAI's GPT-5.2 (via Replit AI Integrations)**: For OCR capabilities.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI component library.
- **TanStack Query**: Data fetching and state management.