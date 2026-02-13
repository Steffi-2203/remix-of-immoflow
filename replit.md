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
The frontend utilizes React 18, Vite, Tailwind CSS, and shadcn/ui for a responsive user interface. UI components support subscription management and feature gating. The sidebar has been consolidated, and a reusable `GuidedEmptyState` component is used for empty states.

**Technical Implementations:**
- **Backend**: Express.js, TypeScript.
- **Frontend**: React 18, Vite, Tailwind CSS, shadcn/ui.
- **Database**: PostgreSQL (Neon), Drizzle ORM.
- **Authentication**: Replit Auth, with dedicated bcrypt-based authentication for tenant and owner portals.
- **Data Access**: Frontend communicates via REST API endpoints, managed with TanStack Query.
- **API Security**: Authentication, organization-based multi-tenancy, strict ownership checks, role-based authorization, soft-delete, and Zod validation.
- **MRG & WEG Compliance**: Supports MRG-compliant distribution keys, rent history, Austrian VAT, Wasserkosten tracking, settlement deadline warnings, Offene Posten management, Leerstand handling, and comprehensive WEG (Wohnungseigentumsgesetz 2002) management including owner assignments, assembly tracking, budget plans, reserve funds, and specific WEG-Vorschreibungen (owner invoicing).
- **Accounting Features**: SEPA export (`pain.008.001.02`, `pain.001.001.03`), MRG §21 compliant settlement PDFs, automatic advance adjustment, automated dunning with ABGB §1333 interest, VPI automation for rent adjustment, MieWeG-Indexierungsrechner, various reporting, BMD NTCS/DATEV export, FinanzOnline integration.
- **Testing**: Vitest for unit tests (260+ tests) covering financial calculations, SEPA XML, invoice generation, dunning, and security. Playwright for E2E tests (24+ tests) covering health, authentication, security headers, and input validation.
- **OCR Functionality**: Integrates GPT-5.2 Vision for tenant data import, PDF processing, and invoice data extraction, protected by a circuit breaker.
- **Subscription & Access Control**: Supports user/organization subscriptions via Stripe, five distinct roles (admin, property_manager, finance, viewer, tester), and a demo access system.
- **Self-Service Portals**: Dedicated, secure portals for tenants and owners with separate logins, dashboards, document access, and administrative management of access grants.
- **Automated Workflows**: Guided workflows for settlements, dunning, VPI adjustment, and tenant move-in.
- **Financial Automation**: AI-based transaction matching for bank reconciliation (IBAN, amount, reference), and automatic bank synchronization with open invoices.
- **Document Generation**: MRG-compliant lease contract generator with templates, data auto-fill, and PDF generation.
- **KI-Autopilot Add-on**: Premium AI features including a chat-based copilot, automated invoicing/dunning, AI invoice recognition, anomaly detection, and AI email drafting.
- **Compliance & Security**: BAO §132 retention, GoBD audit hash chain, WEG/MRG specific compliance checks, DSGVO compliance (consent, processing registry, retention, data export/anonymization), strong password policy, account lockout, API rate limiting, session security, CSRF, IDOR protection, input sanitization, HTTP security headers, nonce-based CSP, active session management, and dedicated security/compliance dashboards.
- **PWA Support**: Progressive Web App manifest for mobile installation, service worker for offline capability, and push notifications.
- **ESG/Energiemonitoring**: Energy certificate management, consumption tracking, CO2 balance, and ESG scoring.
- **Schadensmeldungen**: Damage reporting system with workflow and cost tracking.
- **Reporting**: Recharts-based dashboards for monthly revenue, payment rates, expense/income categories, and ESG scores.

**System Design Choices:**
- **Modular Structure**: Clear separation of `server/`, `shared/`, and `src/` directories.
- **Drizzle ORM**: Type-safe database interactions.
- **Dedicated Tables**: For leases, payment allocations, and financial audit logs.
- **Feature Routes Architecture**: Modular route structure organized by domain, with consistent naming and organization-scoped access control.

## External Dependencies
- **PostgreSQL (Neon)**: Cloud-native database service.
- **Replit Auth**: Authentication service.
- **Resend**: Email API.
- **Stripe**: Payment processing.
- **OpenAI's GPT-5.2 (via Replit AI Integrations)**: For OCR capabilities and AI features.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Reusable UI component library.
- **TanStack Query**: Data fetching and state management.