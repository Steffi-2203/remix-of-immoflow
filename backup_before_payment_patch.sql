--
-- PostgreSQL database dump
--

\restrict rtXW9hkLCKdH3bbeuGihup48yRRUSGoJ9FBiGVVVtc2doOZYfc6JsqVWyLAxUTZ

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: stripe; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA stripe;


ALTER SCHEMA stripe OWNER TO postgres;

--
-- Name: app_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'property_manager',
    'finance',
    'viewer',
    'tester'
);


ALTER TYPE public.app_role OWNER TO postgres;

--
-- Name: budget_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.budget_status AS ENUM (
    'entwurf',
    'eingereicht',
    'genehmigt',
    'abgelehnt'
);


ALTER TYPE public.budget_status OWNER TO postgres;

--
-- Name: demo_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.demo_status AS ENUM (
    'pending',
    'activated',
    'expired',
    'converted'
);


ALTER TYPE public.demo_status OWNER TO postgres;

--
-- Name: document_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_category AS ENUM (
    'vertrag',
    'rechnung',
    'bescheid',
    'protokoll',
    'korrespondenz',
    'abrechnung',
    'mahnung',
    'kaution',
    'uebergabe',
    'sonstiges'
);


ALTER TYPE public.document_category OWNER TO postgres;

--
-- Name: expense_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.expense_category AS ENUM (
    'betriebskosten_umlagefaehig',
    'instandhaltung'
);


ALTER TYPE public.expense_category OWNER TO postgres;

--
-- Name: expense_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.expense_type AS ENUM (
    'versicherung',
    'grundsteuer',
    'muellabfuhr',
    'wasser_abwasser',
    'heizung',
    'strom_allgemein',
    'hausbetreuung',
    'lift',
    'gartenpflege',
    'schneeraeumung',
    'verwaltung',
    'ruecklage',
    'reparatur',
    'sanierung',
    'sonstiges'
);


ALTER TYPE public.expense_type OWNER TO postgres;

--
-- Name: invite_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invite_status AS ENUM (
    'pending',
    'accepted',
    'expired',
    'cancelled'
);


ALTER TYPE public.invite_status OWNER TO postgres;

--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_status AS ENUM (
    'offen',
    'bezahlt',
    'teilbezahlt',
    'ueberfaellig'
);


ALTER TYPE public.invoice_status OWNER TO postgres;

--
-- Name: key_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.key_status AS ENUM (
    'vorhanden',
    'ausgegeben',
    'verloren',
    'gesperrt'
);


ALTER TYPE public.key_status OWNER TO postgres;

--
-- Name: key_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.key_type AS ENUM (
    'hauptschluessel',
    'wohnungsschluessel',
    'kellerschluessel',
    'garagenschluessel',
    'briefkastenschluessel',
    'sonstiges'
);


ALTER TYPE public.key_type OWNER TO postgres;

--
-- Name: meter_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.meter_type AS ENUM (
    'strom',
    'gas',
    'wasser',
    'heizung',
    'warmwasser',
    'sonstiges'
);


ALTER TYPE public.meter_type OWNER TO postgres;

--
-- Name: mrg_bk_kategorie; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.mrg_bk_kategorie AS ENUM (
    'wasserversorgung',
    'abwasserentsorgung',
    'muellabfuhr',
    'kanalraeumung',
    'hausreinigung',
    'hausbetreuung',
    'rauchfangkehrer',
    'schaedlingsbekaempfung',
    'lichtkosten',
    'beleuchtung',
    'feuerversicherung',
    'haftpflichtversicherung',
    'leitungswasserschaden',
    'sturmschaden',
    'glasversicherung',
    'grundsteuer',
    'verwaltung',
    'sonstige'
);


ALTER TYPE public.mrg_bk_kategorie OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status AS ENUM (
    'active',
    'past_due',
    'canceled',
    'unpaid'
);


ALTER TYPE public.payment_status OWNER TO postgres;

--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_type AS ENUM (
    'sepa',
    'ueberweisung',
    'bar',
    'sonstiges'
);


ALTER TYPE public.payment_type OWNER TO postgres;

--
-- Name: settlement_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.settlement_status AS ENUM (
    'entwurf',
    'berechnet',
    'versendet',
    'abgeschlossen'
);


ALTER TYPE public.settlement_status OWNER TO postgres;

--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscription_status AS ENUM (
    'trial',
    'active',
    'cancelled',
    'expired'
);


ALTER TYPE public.subscription_status OWNER TO postgres;

--
-- Name: subscription_tier; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscription_tier AS ENUM (
    'starter',
    'professional',
    'enterprise'
);


ALTER TYPE public.subscription_tier OWNER TO postgres;

--
-- Name: tenant_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tenant_status AS ENUM (
    'aktiv',
    'leerstand',
    'beendet'
);


ALTER TYPE public.tenant_status OWNER TO postgres;

--
-- Name: unit_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.unit_type AS ENUM (
    'wohnung',
    'geschaeft',
    'garage',
    'stellplatz',
    'lager',
    'sonstiges'
);


ALTER TYPE public.unit_type OWNER TO postgres;

--
-- Name: user_subscription_tier; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_subscription_tier AS ENUM (
    'trial',
    'inactive',
    'starter',
    'pro',
    'enterprise'
);


ALTER TYPE public.user_subscription_tier OWNER TO postgres;

--
-- Name: white_label_inquiry_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.white_label_inquiry_status AS ENUM (
    'neu',
    'kontaktiert',
    'demo_vereinbart',
    'verhandlung',
    'abgeschlossen',
    'abgelehnt'
);


ALTER TYPE public.white_label_inquiry_status OWNER TO postgres;

--
-- Name: white_label_license_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.white_label_license_status AS ENUM (
    'aktiv',
    'gekuendigt',
    'pausiert',
    'abgelaufen'
);


ALTER TYPE public.white_label_license_status OWNER TO postgres;

--
-- Name: pricing_tiers; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.pricing_tiers AS ENUM (
    'graduated',
    'volume'
);


ALTER TYPE stripe.pricing_tiers OWNER TO postgres;

--
-- Name: pricing_type; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.pricing_type AS ENUM (
    'one_time',
    'recurring'
);


ALTER TYPE stripe.pricing_type OWNER TO postgres;

--
-- Name: subscription_status; Type: TYPE; Schema: stripe; Owner: postgres
--

CREATE TYPE stripe.subscription_status AS ENUM (
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);


ALTER TYPE stripe.subscription_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name text NOT NULL,
    type text NOT NULL,
    parent_id uuid,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    default_distribution_key_id uuid
);


ALTER TABLE public.account_categories OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    table_name text NOT NULL,
    record_id text,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    property_id uuid,
    account_name text NOT NULL,
    iban text,
    bic text,
    bank_name text,
    opening_balance numeric(10,2) DEFAULT '0'::numeric,
    opening_balance_date date,
    current_balance numeric(10,2) DEFAULT '0'::numeric,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: contractors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contractors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    company_name text NOT NULL,
    contact_person text,
    email text,
    phone text,
    mobile text,
    address text,
    city text,
    postal_code text,
    iban text,
    bic text,
    specializations text[],
    rating integer,
    notes text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.contractors OWNER TO postgres;

--
-- Name: demo_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demo_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    status public.demo_status DEFAULT 'pending'::public.demo_status,
    expires_at timestamp with time zone NOT NULL,
    activated_at timestamp with time zone,
    demo_ends_at timestamp with time zone,
    user_id uuid,
    organization_id uuid,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.demo_invites OWNER TO postgres;

--
-- Name: distribution_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.distribution_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    key_code text NOT NULL,
    name text NOT NULL,
    description text,
    unit text DEFAULT 'm²'::text,
    input_type text DEFAULT 'flaeche'::text,
    is_system boolean DEFAULT false,
    is_active boolean DEFAULT true,
    mrg_konform boolean DEFAULT true,
    mrg_paragraph text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    property_id uuid,
    formula text DEFAULT 'flaeche'::text,
    included_unit_types text[]
);


ALTER TABLE public.distribution_keys OWNER TO postgres;

--
-- Name: expense_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expense_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    allocated_net numeric(12,2) NOT NULL,
    allocation_basis character varying(50) NOT NULL,
    allocation_detail text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.expense_allocations OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    category public.expense_category NOT NULL,
    expense_type public.expense_type DEFAULT 'sonstiges'::public.expense_type,
    bezeichnung text NOT NULL,
    betrag numeric(10,2) DEFAULT '0'::numeric,
    datum date NOT NULL,
    beleg_nummer text,
    beleg_url text,
    notes text,
    year integer NOT NULL,
    month integer NOT NULL,
    mrg_kategorie public.mrg_bk_kategorie,
    mrg_paragraph text,
    ist_umlagefaehig boolean DEFAULT true,
    transaction_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    distribution_key_id uuid
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: invoice_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    expense_type character varying(50) NOT NULL,
    description text,
    net_amount numeric(12,2) NOT NULL,
    vat_rate integer NOT NULL,
    gross_amount numeric(12,2) NOT NULL,
    allocation_reference character varying(100),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.invoice_lines OWNER TO postgres;

--
-- Name: key_handovers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.key_handovers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_inventory_id uuid NOT NULL,
    tenant_id uuid,
    recipient_name text,
    handover_date date NOT NULL,
    return_date date,
    quantity integer DEFAULT 1,
    status public.key_status DEFAULT 'ausgegeben'::public.key_status,
    handover_protocol text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.key_handovers OWNER TO postgres;

--
-- Name: key_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.key_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    unit_id uuid,
    key_type public.key_type NOT NULL,
    key_number text,
    description text,
    total_count integer DEFAULT 1,
    available_count integer DEFAULT 1,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.key_inventory OWNER TO postgres;

--
-- Name: learned_matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.learned_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    pattern text NOT NULL,
    unit_id uuid,
    tenant_id uuid,
    match_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.learned_matches OWNER TO postgres;

--
-- Name: maintenance_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    property_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    contract_type text DEFAULT 'wartung'::text,
    contractor_name text,
    contractor_contact text,
    contractor_email text,
    contract_fee numeric(10,2),
    interval_months integer DEFAULT 12,
    next_due_date date NOT NULL,
    last_maintenance_date date,
    reminder_days integer DEFAULT 14,
    reminder_sent_at timestamp with time zone,
    document_url text,
    notes text,
    is_active boolean DEFAULT true,
    estimated_cost numeric(10,2),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.maintenance_contracts OWNER TO postgres;

--
-- Name: maintenance_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    property_id uuid NOT NULL,
    unit_id uuid,
    contract_id uuid,
    title text NOT NULL,
    description text,
    category text DEFAULT 'reparatur'::text,
    priority text DEFAULT 'normal'::text,
    status text DEFAULT 'open'::text,
    due_date date,
    completed_at timestamp with time zone,
    contractor_name text,
    contractor_contact text,
    estimated_cost numeric(10,2),
    actual_cost numeric(10,2),
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.maintenance_tasks OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    recipient_type text DEFAULT 'internal'::text,
    recipient_email text,
    message_type text,
    subject text,
    message_body text,
    status text DEFAULT 'draft'::text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: meter_readings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meter_readings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meter_id uuid NOT NULL,
    reading_date date NOT NULL,
    reading_value numeric(12,3) NOT NULL,
    is_estimated boolean DEFAULT false,
    read_by text,
    image_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.meter_readings OWNER TO postgres;

--
-- Name: meters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    property_id uuid,
    meter_number text NOT NULL,
    meter_type public.meter_type NOT NULL,
    location text,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.meters OWNER TO postgres;

--
-- Name: monthly_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.monthly_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    grundmiete numeric(10,2) DEFAULT '0'::numeric,
    betriebskosten numeric(10,2) DEFAULT '0'::numeric,
    heizungskosten numeric(10,2) DEFAULT '0'::numeric,
    ust_satz_miete integer DEFAULT 10,
    ust_satz_bk integer DEFAULT 10,
    ust_satz_heizung integer DEFAULT 20,
    ust numeric(10,2) DEFAULT '0'::numeric,
    gesamtbetrag numeric(10,2) DEFAULT '0'::numeric,
    status public.invoice_status DEFAULT 'offen'::public.invoice_status,
    faellig_am date,
    pdf_url text,
    vortrag_miete numeric(10,2) DEFAULT '0'::numeric,
    vortrag_bk numeric(10,2) DEFAULT '0'::numeric,
    vortrag_hk numeric(10,2) DEFAULT '0'::numeric,
    vortrag_sonstige numeric(10,2) DEFAULT '0'::numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    wasserkosten numeric(10,2) DEFAULT '0'::numeric,
    ust_satz_wasser integer DEFAULT 10,
    paid_amount numeric(12,2) DEFAULT 0,
    version integer DEFAULT 1 NOT NULL,
    CONSTRAINT monthly_invoices_ust_satz_bk_check CHECK ((ust_satz_bk = ANY (ARRAY[0, 10, 13, 20]))),
    CONSTRAINT monthly_invoices_ust_satz_heizung_check CHECK ((ust_satz_heizung = ANY (ARRAY[0, 10, 13, 20]))),
    CONSTRAINT monthly_invoices_ust_satz_miete_check CHECK ((ust_satz_miete = ANY (ARRAY[0, 10, 13, 20]))),
    CONSTRAINT monthly_invoices_ust_satz_wasser_check CHECK ((ust_satz_wasser = ANY (ARRAY[0, 10, 13, 20]))),
    CONSTRAINT monthly_invoices_vat_check CHECK (((ust_satz_miete = ANY (ARRAY[0, 10, 13, 20])) AND (ust_satz_bk = ANY (ARRAY[0, 10, 13, 20])) AND (ust_satz_heizung = ANY (ARRAY[0, 10, 13, 20]))))
);


ALTER TABLE public.monthly_invoices OWNER TO postgres;

--
-- Name: organization_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organization_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email text NOT NULL,
    role public.app_role NOT NULL,
    token text NOT NULL,
    status public.invite_status DEFAULT 'pending'::public.invite_status,
    invited_by uuid,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.organization_invites OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subscription_tier public.subscription_tier DEFAULT 'starter'::public.subscription_tier,
    subscription_status public.subscription_status DEFAULT 'trial'::public.subscription_status,
    trial_ends_at timestamp with time zone,
    iban text,
    bic text,
    address text,
    city text,
    postal_code text,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    brand_name text,
    logo_url text,
    primary_color text,
    support_email text
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: owners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.owners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    first_name text NOT NULL,
    last_name text NOT NULL,
    company_name text,
    email text,
    phone text,
    mobile_phone text,
    address text,
    city text,
    postal_code text,
    country text DEFAULT 'Österreich'::text,
    iban text,
    bic text,
    bank_name text,
    tax_number text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.owners OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_id uuid,
    betrag numeric(10,2) NOT NULL,
    buchungs_datum date NOT NULL,
    payment_type public.payment_type DEFAULT 'ueberweisung'::public.payment_type,
    verwendungszweck text,
    transaction_id uuid,
    notizen text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    full_name text,
    organization_id uuid,
    avatar_url text,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    password_hash text,
    subscription_tier public.user_subscription_tier DEFAULT 'trial'::public.user_subscription_tier,
    trial_ends_at timestamp with time zone,
    subscription_ends_at timestamp with time zone,
    stripe_customer_id text,
    stripe_subscription_id text,
    payment_status public.payment_status DEFAULT 'active'::public.payment_status,
    payment_failed_at timestamp with time zone,
    canceled_at timestamp with time zone
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: properties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    postal_code text NOT NULL,
    total_units integer DEFAULT 0,
    total_area numeric(10,2),
    construction_year integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


ALTER TABLE public.properties OWNER TO postgres;

--
-- Name: property_budgets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    organization_id uuid,
    year integer NOT NULL,
    position_1_name text,
    position_1_amount numeric(12,2) DEFAULT '0'::numeric,
    position_2_name text,
    position_2_amount numeric(12,2) DEFAULT '0'::numeric,
    position_3_name text,
    position_3_amount numeric(12,2) DEFAULT '0'::numeric,
    position_4_name text,
    position_4_amount numeric(12,2) DEFAULT '0'::numeric,
    position_5_name text,
    position_5_amount numeric(12,2) DEFAULT '0'::numeric,
    status public.budget_status DEFAULT 'entwurf'::public.budget_status,
    approved_by text,
    approved_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.property_budgets OWNER TO postgres;

--
-- Name: property_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    organization_id uuid,
    name text NOT NULL,
    category public.document_category DEFAULT 'sonstiges'::public.document_category,
    file_url text,
    file_size integer,
    mime_type text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.property_documents OWNER TO postgres;

--
-- Name: property_managers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_managers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    property_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.property_managers OWNER TO postgres;

--
-- Name: property_owners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_owners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    ownership_share numeric(5,2) DEFAULT 100.00,
    valid_from date,
    valid_to date,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.property_owners OWNER TO postgres;

--
-- Name: rent_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rent_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    valid_from date NOT NULL,
    valid_until date,
    grundmiete numeric(10,2) NOT NULL,
    betriebskosten_vorschuss numeric(10,2) NOT NULL,
    heizungskosten_vorschuss numeric(10,2) NOT NULL,
    change_reason text,
    created_at timestamp with time zone DEFAULT now(),
    wasserkosten_vorschuss numeric(10,2) DEFAULT '0'::numeric
);


ALTER TABLE public.rent_history OWNER TO postgres;

--
-- Name: sepa_collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sepa_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    month integer NOT NULL,
    year integer NOT NULL,
    total_amount numeric(10,2) DEFAULT '0'::numeric,
    tenant_count integer DEFAULT 0,
    status text DEFAULT 'draft'::text,
    xml_content text,
    file_name text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sepa_collections OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: settlement_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settlement_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    settlement_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    anteil numeric(10,4) DEFAULT '0'::numeric,
    ausgaben_anteil numeric(10,2) DEFAULT '0'::numeric,
    vorschuss numeric(10,2) DEFAULT '0'::numeric,
    differenz numeric(10,2) DEFAULT '0'::numeric,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.settlement_details OWNER TO postgres;

--
-- Name: settlements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    year integer NOT NULL,
    status public.settlement_status DEFAULT 'entwurf'::public.settlement_status,
    gesamtausgaben numeric(10,2) DEFAULT '0'::numeric,
    gesamtvorschuss numeric(10,2) DEFAULT '0'::numeric,
    differenz numeric(10,2) DEFAULT '0'::numeric,
    berechnungs_datum timestamp with time zone,
    versand_datum timestamp with time zone,
    pdf_url text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.settlements OWNER TO postgres;

--
-- Name: tenant_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    organization_id uuid,
    name text NOT NULL,
    category public.document_category DEFAULT 'sonstiges'::public.document_category,
    file_url text,
    file_size integer,
    mime_type text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tenant_documents OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    mobile_phone text,
    status public.tenant_status DEFAULT 'aktiv'::public.tenant_status,
    mietbeginn date,
    mietende date,
    grundmiete numeric(10,2) DEFAULT '0'::numeric,
    betriebskosten_vorschuss numeric(10,2) DEFAULT '0'::numeric,
    heizungskosten_vorschuss numeric(10,2) DEFAULT '0'::numeric,
    kaution numeric(10,2),
    kaution_bezahlt boolean DEFAULT false,
    iban text,
    bic text,
    sepa_mandat boolean DEFAULT false,
    sepa_mandat_datum date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    wasserkosten_vorschuss numeric(10,2) DEFAULT '0'::numeric,
    sonstige_kosten jsonb,
    warmwasserkosten_vorschuss numeric(10,2) DEFAULT '0'::numeric
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    bank_account_id uuid,
    amount numeric(10,2) NOT NULL,
    transaction_date date NOT NULL,
    booking_text text,
    partner_name text,
    partner_iban text,
    reference text,
    category_id uuid,
    is_matched boolean DEFAULT false,
    matched_tenant_id uuid,
    matched_unit_id uuid,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: unit_distribution_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unit_distribution_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    key_id uuid NOT NULL,
    value numeric(10,4) DEFAULT '0'::numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.unit_distribution_values OWNER TO postgres;

--
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    top_nummer text NOT NULL,
    type public.unit_type DEFAULT 'wohnung'::public.unit_type,
    status public.tenant_status DEFAULT 'leerstand'::public.tenant_status,
    flaeche numeric(10,2),
    zimmer integer,
    nutzwert numeric(10,4),
    stockwerk integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    vs_personen integer DEFAULT 0
);


ALTER TABLE public.units OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vpi_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vpi_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    adjustment_date date NOT NULL,
    previous_rent numeric(10,2) NOT NULL,
    new_rent numeric(10,2) NOT NULL,
    vpi_old numeric(8,2),
    vpi_new numeric(8,2),
    percentage_change numeric(5,2),
    notification_sent boolean DEFAULT false,
    notification_date date,
    effective_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.vpi_adjustments OWNER TO postgres;

--
-- Name: white_label_inquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.white_label_inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text NOT NULL,
    contact_person text NOT NULL,
    email text NOT NULL,
    phone text,
    property_count integer,
    unit_count integer,
    message text,
    status public.white_label_inquiry_status DEFAULT 'neu'::public.white_label_inquiry_status,
    notes text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.white_label_inquiries OWNER TO postgres;

--
-- Name: white_label_licenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.white_label_licenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    license_name text NOT NULL,
    monthly_price numeric(10,2),
    setup_fee numeric(10,2),
    contract_start date NOT NULL,
    contract_end date,
    status public.white_label_license_status DEFAULT 'aktiv'::public.white_label_license_status,
    custom_domain text,
    max_users integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.white_label_licenses OWNER TO postgres;

--
-- Name: _migrations; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe._migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE stripe._migrations OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.customers (
    id text NOT NULL,
    object text,
    address jsonb,
    description text,
    email text,
    metadata jsonb,
    name text,
    phone text,
    shipping jsonb,
    balance integer,
    created integer,
    currency text,
    default_source text,
    delinquent boolean,
    discount jsonb,
    invoice_prefix text,
    invoice_settings jsonb,
    livemode boolean,
    next_invoice_sequence integer,
    preferred_locales jsonb,
    tax_exempt text
);


ALTER TABLE stripe.customers OWNER TO postgres;

--
-- Name: prices; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.prices (
    id text NOT NULL,
    object text,
    active boolean,
    currency text,
    metadata jsonb,
    nickname text,
    recurring jsonb,
    type stripe.pricing_type,
    unit_amount integer,
    billing_scheme text,
    created integer,
    livemode boolean,
    lookup_key text,
    tiers_mode stripe.pricing_tiers,
    transform_quantity jsonb,
    unit_amount_decimal text,
    product text
);


ALTER TABLE stripe.prices OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.products (
    id text NOT NULL,
    object text,
    active boolean,
    description text,
    metadata jsonb,
    name text,
    created integer,
    images jsonb,
    livemode boolean,
    package_dimensions jsonb,
    shippable boolean,
    statement_descriptor text,
    unit_label text,
    updated integer,
    url text
);


ALTER TABLE stripe.products OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: stripe; Owner: postgres
--

CREATE TABLE stripe.subscriptions (
    id text NOT NULL,
    object text,
    cancel_at_period_end boolean,
    current_period_end integer,
    current_period_start integer,
    default_payment_method text,
    items jsonb,
    metadata jsonb,
    pending_setup_intent text,
    pending_update jsonb,
    status stripe.subscription_status,
    application_fee_percent double precision,
    billing_cycle_anchor integer,
    billing_thresholds jsonb,
    cancel_at integer,
    canceled_at integer,
    collection_method text,
    created integer,
    days_until_due integer,
    default_source text,
    default_tax_rates jsonb,
    discount jsonb,
    ended_at integer,
    livemode boolean,
    next_pending_invoice_item_invoice integer,
    pause_collection jsonb,
    pending_invoice_item_interval jsonb,
    start_date integer,
    transfer_data jsonb,
    trial_end jsonb,
    trial_start jsonb,
    schedule text,
    customer text,
    latest_invoice text,
    plan text
);


ALTER TABLE stripe.subscriptions OWNER TO postgres;

--
-- Data for Name: account_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_categories (id, organization_id, name, type, parent_id, is_system, created_at, default_distribution_key_id) FROM stdin;
d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	\N	Mieteinnahmen	income	\N	t	2026-01-25 16:50:57.30908+00	\N
8cc70902-4fa6-456d-b03b-ceccc20297a0	\N	Betriebskosten-Vorschreibung	income	\N	t	2026-01-25 16:50:57.30908+00	\N
ecf28f5b-5c7f-47d4-b854-7dd9c104ecce	\N	Heizkosten-Vorschreibung	income	\N	t	2026-01-25 16:50:57.30908+00	\N
2e5550d1-f116-45fe-ab54-f5e605f7297f	\N	Instandhaltung	expense	\N	t	2026-01-25 16:50:57.30908+00	\N
a6601f05-2654-4c57-b43a-2a71a2b3aae8	\N	Verwaltung	expense	\N	t	2026-01-25 16:50:57.30908+00	\N
310cb6ec-557b-4d52-b26f-f3f9afad20cd	\N	Versicherungen	expense	\N	t	2026-01-25 16:50:57.30908+00	\N
53b4880f-37b2-4aa8-9695-905f9c028a20	\N	Energiekosten	expense	\N	t	2026-01-25 16:50:57.30908+00	\N
ff883da0-1771-44c9-84c6-a91269765eed	\N	Sonstige Ausgaben	expense	\N	t	2026-01-25 16:50:57.30908+00	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, table_name, record_id, action, old_data, new_data, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_accounts (id, organization_id, property_id, account_name, iban, bic, bank_name, opening_balance, opening_balance_date, current_balance, last_synced_at, created_at, updated_at) FROM stdin;
8d518944-9cae-4579-9423-9c55e7bc255b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	Hausverwaltung Musterhaus	AT89 3704 0044 0532 0130 00	RLNWATWW	Raiffeisen Landesbank NÖ-Wien	0.00	2025-01-01	53391.00	\N	2026-01-25 08:30:28.962226+00	2026-01-25 08:30:28.962226+00
\.


--
-- Data for Name: contractors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contractors (id, organization_id, company_name, contact_person, email, phone, mobile, address, city, postal_code, iban, bic, specializations, rating, notes, is_active, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: demo_invites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.demo_invites (id, email, token, status, expires_at, activated_at, demo_ends_at, user_id, organization_id, ip_address, user_agent, created_at, updated_at) FROM stdin;
88422db3-f921-47e6-b2af-afc756932402	stephania.pfeffer@gmx.de	fe060ebfff6588729ce41bd2cdc9865a3b311921b24ef727a2b52ef1f49c24fc	activated	2026-02-01 15:52:31.845+00	2026-01-31 15:53:49.766+00	2026-01-31 16:23:49.753+00	fe2b9e63-0106-49c2-b1f1-26a7e15605d4	8b5cca20-19c0-43b9-8a29-bc1fe7c4a7c7	185.159.201.60, 10.83.9.13	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0	2026-01-31 15:52:31.846108+00	2026-01-31 15:52:31.846108+00
df8841a7-109a-42ce-a0dc-eb0fcb43dac1	stephania.pfeffer@gmx.de	db5c5597750c454c514cf6cf216d996d2c3fdeeb7d2a36eb601955bf81f360e5	pending	2026-02-01 15:58:13.931+00	\N	\N	\N	\N	\N	\N	2026-01-31 15:58:13.931544+00	2026-01-31 15:58:13.931544+00
3008e91c-61dc-4d93-bb18-086220d33515	s.pfeffer@gerstl.at	404e9033dbe6d13540563cbd30e918f9f2442952e0b89aabaae1169ce695613d	pending	2026-02-01 16:02:44.224+00	\N	\N	\N	\N	\N	\N	2026-01-31 16:02:44.225268+00	2026-01-31 16:02:44.225268+00
dfe64d0f-7579-4ccd-8b65-af4f827414ae	nadjaolfert@web.de	d199771db42565254b8148ab98afb2885e3af30604bd784849aea9c30c03e782	pending	2026-02-01 16:03:25.453+00	\N	\N	\N	\N	\N	\N	2026-01-31 16:03:25.454075+00	2026-01-31 16:03:25.454075+00
d63ad5c8-6243-4d05-9032-fcd97d3850c3	yolandapfeffer@gmx.de	1f62add00e3008b3c36686bd841dd2e01cf5207180b519c576b64ca8b2beb52e	activated	2026-02-01 16:35:01.394+00	2026-01-31 16:35:45.92+00	2026-01-31 17:05:45.869+00	b741103b-3b09-4a9d-879f-1274b7125678	5475d57b-5c46-4290-9a67-63f8c30dd148	95.89.120.163, 10.83.0.36	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0	2026-01-31 16:35:01.395391+00	2026-01-31 16:35:01.395391+00
022e8d88-efff-4396-a4c2-eb9e946d9bce	schlot63@gmx.de	037f128be8b774fedc3ee92e0b1981c02e028912a53950608c851911a8b98ff5	activated	2026-02-01 17:16:36.874+00	2026-01-31 17:17:03.61+00	2026-01-31 17:47:03.592+00	99e2487e-a99d-4591-bde4-30913cec1d4b	4a2c829d-31cc-4300-83e7-bfa99791218c	185.159.201.60, 10.83.3.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0	2026-01-31 15:50:36.077248+00	2026-01-31 15:50:36.077248+00
eb0b6c4e-e4c7-4160-a677-9253827a0db6	yolandapfeffer@icloud.com	5a691738b903e5535bdee821275b7492c06c8b17f279e8a9429d06b1956efa7a	pending	2026-02-02 10:48:04.335+00	\N	\N	\N	\N	\N	\N	2026-01-31 16:26:26.611054+00	2026-01-31 16:26:26.611054+00
\.


--
-- Data for Name: distribution_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.distribution_keys (id, organization_id, key_code, name, description, unit, input_type, is_system, is_active, mrg_konform, mrg_paragraph, sort_order, created_at, updated_at, property_id, formula, included_unit_types) FROM stdin;
e8e7bd60-0868-4447-af9a-f4b76fcfc928	\N	nutzflaeche	Nutzfläche (m²)	Verteilung nach Nutzfläche in Quadratmetern	m²	flaeche	t	t	t	§21 MRG	1	2026-01-25 13:06:17.608727+00	2026-01-25 13:06:17.608727+00	\N	flaeche	\N
fece31ce-f6bc-43e5-95f2-0e1a1a3993f1	\N	einheiten	Anzahl Einheiten	Gleicher Anteil pro Mieteinheit (1:1)	Stück	anzahl	t	t	t	§21 MRG	2	2026-01-25 13:06:17.646377+00	2026-01-25 13:06:17.646377+00	\N	flaeche	\N
366636e7-c723-4731-8be3-b008adab9ee7	\N	personen	Anzahl Personen	Verteilung nach Anzahl der Bewohner	Personen	anzahl	t	t	t	§21 MRG	3	2026-01-25 13:06:17.651495+00	2026-01-25 13:06:17.651495+00	\N	flaeche	\N
3b6b3095-b4fd-449d-b1c3-dc1c59a619f5	\N	pauschal	Pauschal (Gleichverteilung)	Gleiche Verteilung auf alle aktiven Mieter	Anteil	pauschal	t	t	t	§21 MRG	4	2026-01-25 13:06:17.658131+00	2026-01-25 13:06:17.658131+00	\N	flaeche	\N
fa7397ca-7292-4ade-802e-56c405465500	\N	verbrauch	Verbrauch	Verteilung nach tatsächlichem Verbrauch (Zählerstand)	kWh/m³	verbrauch	t	t	t	§21 MRG	5	2026-01-25 13:06:17.6644+00	2026-01-25 13:06:17.6644+00	\N	flaeche	\N
4ce089f1-fa83-45a9-b2d5-9c6d6588edcf	\N	sondernutzung	Sondernutzung	Für Garage, Keller, Terrasse etc. mit individuellen Anteilen	Anteil	sondernutzung	t	t	t	§21 MRG	6	2026-01-25 13:06:17.672222+00	2026-01-25 13:06:17.672222+00	\N	flaeche	\N
b635ea36-ffa2-4ef2-b932-da323c90111e	8f949680-dddb-46f2-b21b-890295e73356	MEA	Miteigentumsanteile	\N	‰	mea	t	t	t	§21 Abs 1	1	2026-01-31 12:36:03.524497+00	2026-01-31 12:36:03.524497+00	\N	flaeche	\N
77c0e0d7-1195-4332-9cad-ee6d2331b941	8f949680-dddb-46f2-b21b-890295e73356	QM	Nutzfläche	\N	m²	qm	t	t	t	§21 Abs 1	2	2026-01-31 12:36:03.524497+00	2026-01-31 12:36:03.524497+00	\N	flaeche	\N
c7c479ec-85dc-4237-9381-1b19b9615a56	8f949680-dddb-46f2-b21b-890295e73356	PERS	Personenanzahl	\N	Pers.	personen	t	t	t	§21 Abs 1	3	2026-01-31 12:36:03.524497+00	2026-01-31 12:36:03.524497+00	\N	flaeche	\N
5c28f74f-d960-4632-9b43-3c597e8cfc55	8f949680-dddb-46f2-b21b-890295e73356	EINH	Einheiten	\N	Stk.	anzahl	t	t	t	§21 Abs 1	4	2026-01-31 12:36:03.524497+00	2026-01-31 12:36:03.524497+00	\N	flaeche	\N
a407cd2f-3334-46e1-89a9-2af3a5c4fa88	4da551db-f90a-45e6-83c0-b38a2aeccf14	MEA	Miteigentumsanteile	\N	‰	mea	t	t	t	§21 Abs 1	1	2026-01-31 14:45:57.851434+00	2026-01-31 14:45:57.851434+00	\N	flaeche	\N
d82673cc-5ab3-4bc2-887f-924ed2d5bf2c	4da551db-f90a-45e6-83c0-b38a2aeccf14	QM	Nutzfläche	\N	m²	qm	t	t	t	§21 Abs 1	2	2026-01-31 14:45:57.851434+00	2026-01-31 14:45:57.851434+00	\N	flaeche	\N
5ec5990a-440a-41c3-b2da-125e7bd64149	4da551db-f90a-45e6-83c0-b38a2aeccf14	PERS	Personenanzahl	\N	Pers.	personen	t	t	t	§21 Abs 1	3	2026-01-31 14:45:57.851434+00	2026-01-31 14:45:57.851434+00	\N	flaeche	\N
d7d790e7-476d-4666-9e78-a1d0a00a18e0	4da551db-f90a-45e6-83c0-b38a2aeccf14	EINH	Einheiten	\N	Stk.	anzahl	t	t	t	§21 Abs 1	4	2026-01-31 14:45:57.851434+00	2026-01-31 14:45:57.851434+00	\N	flaeche	\N
1ce5fcb8-f436-4052-993e-e9cd1b7f5c86	8b5cca20-19c0-43b9-8a29-bc1fe7c4a7c7	MEA	Miteigentumsanteile	\N	‰	mea	t	t	t	§21 Abs 1	1	2026-01-31 15:53:49.784372+00	2026-01-31 15:53:49.784372+00	\N	flaeche	\N
f35c47a8-e4db-4bad-9766-4b3f50d7291c	8b5cca20-19c0-43b9-8a29-bc1fe7c4a7c7	QM	Nutzfläche	\N	m²	qm	t	t	t	§21 Abs 1	2	2026-01-31 15:53:49.784372+00	2026-01-31 15:53:49.784372+00	\N	flaeche	\N
fdc5f621-4e70-4234-8359-7e74c1213cbc	8b5cca20-19c0-43b9-8a29-bc1fe7c4a7c7	PERS	Personenanzahl	\N	Pers.	personen	t	t	t	§21 Abs 1	3	2026-01-31 15:53:49.784372+00	2026-01-31 15:53:49.784372+00	\N	flaeche	\N
87b5e51e-d28c-4736-b808-993960f1a247	8b5cca20-19c0-43b9-8a29-bc1fe7c4a7c7	EINH	Einheiten	\N	Stk.	anzahl	t	t	t	§21 Abs 1	4	2026-01-31 15:53:49.784372+00	2026-01-31 15:53:49.784372+00	\N	flaeche	\N
9f7ac58f-8186-4cf0-848c-24cf0550320d	5475d57b-5c46-4290-9a67-63f8c30dd148	MEA	Miteigentumsanteile	\N	‰	mea	t	t	t	§21 Abs 1	1	2026-01-31 16:35:45.927757+00	2026-01-31 16:35:45.927757+00	\N	flaeche	\N
437e7ba9-0706-4762-8fdd-878b3748035a	5475d57b-5c46-4290-9a67-63f8c30dd148	QM	Nutzfläche	\N	m²	qm	t	t	t	§21 Abs 1	2	2026-01-31 16:35:45.927757+00	2026-01-31 16:35:45.927757+00	\N	flaeche	\N
63fe4803-65f9-4b59-9ba0-8283a4002a76	5475d57b-5c46-4290-9a67-63f8c30dd148	PERS	Personenanzahl	\N	Pers.	personen	t	t	t	§21 Abs 1	3	2026-01-31 16:35:45.927757+00	2026-01-31 16:35:45.927757+00	\N	flaeche	\N
14e575e5-aa9d-4159-b1b6-7e6e728a5bc2	5475d57b-5c46-4290-9a67-63f8c30dd148	EINH	Einheiten	\N	Stk.	anzahl	t	t	t	§21 Abs 1	4	2026-01-31 16:35:45.927757+00	2026-01-31 16:35:45.927757+00	\N	flaeche	\N
c484680b-303d-4309-9e9e-feed7849cfd2	4a2c829d-31cc-4300-83e7-bfa99791218c	MEA	Miteigentumsanteile	\N	‰	mea	t	t	t	§21 Abs 1	1	2026-01-31 17:17:03.621293+00	2026-01-31 17:17:03.621293+00	\N	flaeche	\N
97dfe443-1a53-43d7-8259-093e54c8e00d	4a2c829d-31cc-4300-83e7-bfa99791218c	QM	Nutzfläche	\N	m²	qm	t	t	t	§21 Abs 1	2	2026-01-31 17:17:03.621293+00	2026-01-31 17:17:03.621293+00	\N	flaeche	\N
46895495-1ca1-4a82-ad8b-5b9fa8c17b8d	4a2c829d-31cc-4300-83e7-bfa99791218c	PERS	Personenanzahl	\N	Pers.	personen	t	t	t	§21 Abs 1	3	2026-01-31 17:17:03.621293+00	2026-01-31 17:17:03.621293+00	\N	flaeche	\N
9c7dccaa-98f5-4d2f-991e-d46f4cbc1b1c	4a2c829d-31cc-4300-83e7-bfa99791218c	EINH	Einheiten	\N	Stk.	anzahl	t	t	t	§21 Abs 1	4	2026-01-31 17:17:03.621293+00	2026-01-31 17:17:03.621293+00	\N	flaeche	\N
\.


--
-- Data for Name: expense_allocations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_allocations (id, expense_id, unit_id, allocated_net, allocation_basis, allocation_detail, created_at) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, property_id, category, expense_type, bezeichnung, betrag, datum, beleg_nummer, beleg_url, notes, year, month, mrg_kategorie, mrg_paragraph, ist_umlagefaehig, transaction_id, created_at, updated_at, distribution_key_id) FROM stdin;
69b7f6b5-83fa-4d0e-a710-ab80f1bc720c	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	wasser_abwasser	Wassergebühren Q1	450.00	2025-01-15	2025/01/884	\N	\N	2025	1	wasserversorgung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
bc6c783b-c9d9-4160-b4ae-fe6d2ea93c98	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	muellabfuhr	Müllabfuhr Q1	280.00	2025-01-15	2025/01/180	\N	\N	2025	1	muellabfuhr	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
13af3aaa-401d-4aa1-93d6-055a666378db	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	versicherung	Gebäudeversicherung 2025	1200.00	2025-02-15	2025/02/78	\N	\N	2025	2	feuerversicherung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
4fadee64-fd9b-4226-9134-da2627cb7319	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	hausbetreuung	Hausbetreuung Jan-Feb	320.00	2025-02-15	2025/02/190	\N	\N	2025	2	hausbetreuung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
b530969d-8952-40b2-927e-c8c00b5cf93f	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	heizung	Heizkosten Winter Q1	2800.00	2025-03-15	2025/03/314	\N	\N	2025	3	sonstige	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
d13c056a-e224-48a6-a0ae-7ca92daa43fc	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	instandhaltung	reparatur	Dachsanierung Teil 1	3500.00	2025-03-15	2025/03/930	\N	\N	2025	3	\N	\N	f	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
9bdea93b-f96a-47e1-a931-8c1b16521c77	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	grundsteuer	Grundsteuer 2025	890.00	2025-04-15	2025/04/690	\N	\N	2025	4	grundsteuer	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
8aaedfeb-41d8-498c-abb5-fbf485ad957a	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	wasser_abwasser	Wassergebühren Q2	480.00	2025-04-15	2025/04/908	\N	\N	2025	4	wasserversorgung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
4ef86973-ee13-4fdc-9607-1033554ff5e0	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	hausbetreuung	Hausbetreuung März-Apr	320.00	2025-05-15	2025/05/872	\N	\N	2025	5	hausbetreuung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
56138fbe-16c8-467e-be20-c46e1a7921de	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	instandhaltung	sanierung	Fassadenreparatur (Budgetüberschreitung)	5000.00	2025-05-15	2025/05/526	\N	\N	2025	5	\N	\N	f	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
cc4ff25a-4200-40c1-8c6a-0a40949fb88d	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	gartenpflege	Gartenpflege Frühjahr	450.00	2025-06-15	2025/06/454	\N	\N	2025	6	sonstige	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
050f3507-6705-47e1-8562-810284ff79f3	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	strom_allgemein	Allgemeinstrom H1	380.00	2025-06-15	2025/06/145	\N	\N	2025	6	lichtkosten	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
0e48e28f-cfe5-487c-8467-d04cc7a1d461	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	wasser_abwasser	Wassergebühren Q3	420.00	2025-07-15	2025/07/342	\N	\N	2025	7	wasserversorgung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
d83264e5-b77f-47e7-9b28-f5cacdd4f6a4	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	muellabfuhr	Müllabfuhr Q2	290.00	2025-07-15	2025/07/143	\N	\N	2025	7	muellabfuhr	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
ae19bfb8-ecbb-4b01-8410-7fc6e9c8af90	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	hausbetreuung	Hausbetreuung Mai-Jun	320.00	2025-08-15	2025/08/986	\N	\N	2025	8	hausbetreuung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
238bb6bd-de7f-4993-ac2b-054fb58820c3	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	instandhaltung	reparatur	Aufzugswartung + Reparatur	2200.00	2025-08-15	2025/08/336	\N	\N	2025	8	\N	\N	f	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
1e889a1e-281a-4c6e-90b5-d120d12965a4	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	heizung	Heizungsanlage Service	1200.00	2025-09-15	2025/09/662	\N	\N	2025	9	sonstige	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
c389017d-2b67-46ec-8b39-7e2e8ed528c8	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	wasser_abwasser	Wassergebühren Q4	440.00	2025-10-15	2025/10/237	\N	\N	2025	10	wasserversorgung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
08977128-bce7-4ef9-93bf-b9ad21fa85c8	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	hausbetreuung	Hausbetreuung Jul-Aug	320.00	2025-10-15	2025/10/649	\N	\N	2025	10	hausbetreuung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
49be34e2-d3e3-4fd8-8aa3-89401a32520d	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	muellabfuhr	Müllabfuhr Q3	285.00	2025-11-15	2025/11/717	\N	\N	2025	11	muellabfuhr	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
cf6c73e7-8970-4bdc-811d-ba11a131ca0c	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	instandhaltung	reparatur	Fensterreparatur Top 3	1300.00	2025-11-15	2025/11/160	\N	\N	2025	11	\N	\N	f	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
b06ae46b-dcee-43df-ac72-4222944eb69a	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	heizung	Heizkosten Winter Q4	2600.00	2025-12-15	2025/12/700	\N	\N	2025	12	sonstige	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
9ba32478-08ac-4c40-a416-cee62d72ee5d	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	verwaltung	Verwaltungshonorar 2025	2400.00	2025-12-15	2025/12/316	\N	\N	2025	12	verwaltung	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
f491e865-cc8e-4c9c-bc99-d2abb5fc9f12	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	betriebskosten_umlagefaehig	strom_allgemein	Allgemeinstrom H2	395.00	2025-12-15	2025/12/273	\N	\N	2025	12	lichtkosten	\N	t	\N	2026-01-25 07:18:51.64576+00	2026-01-25 07:18:51.64576+00	\N
\.


--
-- Data for Name: invoice_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_lines (id, invoice_id, expense_type, description, net_amount, vat_rate, gross_amount, allocation_reference, created_at) FROM stdin;
\.


--
-- Data for Name: key_handovers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.key_handovers (id, key_inventory_id, tenant_id, recipient_name, handover_date, return_date, quantity, status, handover_protocol, notes, created_at) FROM stdin;
\.


--
-- Data for Name: key_inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.key_inventory (id, property_id, unit_id, key_type, key_number, description, total_count, available_count, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: learned_matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.learned_matches (id, organization_id, pattern, unit_id, tenant_id, match_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: maintenance_contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_contracts (id, organization_id, property_id, title, description, contract_type, contractor_name, contractor_contact, contractor_email, contract_fee, interval_months, next_due_date, last_maintenance_date, reminder_days, reminder_sent_at, document_url, notes, is_active, estimated_cost, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: maintenance_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_tasks (id, organization_id, property_id, unit_id, contract_id, title, description, category, priority, status, due_date, completed_at, contractor_name, contractor_contact, estimated_cost, actual_cost, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, organization_id, recipient_type, recipient_email, message_type, subject, message_body, status, sent_at, created_at) FROM stdin;
\.


--
-- Data for Name: meter_readings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meter_readings (id, meter_id, reading_date, reading_value, is_estimated, read_by, image_url, notes, created_at) FROM stdin;
\.


--
-- Data for Name: meters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meters (id, unit_id, property_id, meter_number, meter_type, location, is_active, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: monthly_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.monthly_invoices (id, tenant_id, unit_id, year, month, grundmiete, betriebskosten, heizungskosten, ust_satz_miete, ust_satz_bk, ust_satz_heizung, ust, gesamtbetrag, status, faellig_am, pdf_url, vortrag_miete, vortrag_bk, vortrag_hk, vortrag_sonstige, created_at, updated_at, wasserkosten, ust_satz_wasser, paid_amount, version) FROM stdin;
84a44a11-b4a8-49bd-a8c9-1065db6d1724	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	1	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-01-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
62c84185-e2a9-403f-80fd-3b9839724499	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	1	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-01-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
b2b0de68-d92b-4013-b14b-a44278e0eef3	4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	1	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-01-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
a1b58650-51c2-4c09-8748-5b396258ccd5	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	1	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-01-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
ebee17b6-17b1-40c4-9afb-1a7784eb1149	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	1	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-01-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
858df43b-ccd3-4b61-a8cb-5b927af77871	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	2	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-02-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
13029e19-c2b9-49a7-85c2-b33600f15aaa	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	2	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-02-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
12e6c5bb-3d0c-4e38-82f1-13d9902b9d83	4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	2	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-02-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
b01d1b7c-6761-4d7d-9416-6c0316e2bafc	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	2	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-02-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
cc582f1f-2c42-4d39-a57a-1ec388cf13c1	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	2	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-02-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
f8a02fbe-567b-48f4-8b69-d910a9d8a965	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	3	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-03-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
09810a85-e037-43f7-80d8-3c2f6432d102	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	3	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-03-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
e1430458-9ab4-452f-be25-45fc27f6c661	4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	3	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-03-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
2f3985e7-88e0-4689-8b8b-393f662c603b	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	3	650.00	120.00	80.00	10	10	20	93.00	943.00	teilbezahlt	2025-03-05	\N	0.00	120.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
4037dd31-c9e8-4f5c-8d0a-1cb46acbeb41	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	3	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-03-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
c92474ae-69c4-4487-97a7-7adbfe6d1e77	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	4	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-04-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
26426ca3-a783-474e-83dc-f986d1098f9e	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	4	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-04-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
82f3cd89-171a-4d92-8337-0b01c6040f75	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	4	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-04-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
3aab85cd-26df-4ade-8475-4cb4e6b0734e	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	4	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-04-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
7b6480ac-f9c1-429f-9851-aaf85f7e0246	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	5	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-05-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
079cc5ab-9e70-42af-9ab7-d1f47d2078cc	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	5	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-05-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
234b75e2-748c-4c66-9fe8-f70e0c0820f2	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	5	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-05-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
730f3d85-5fa5-4074-83f7-3cc96c58fd3f	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	5	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-05-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
a2492fb1-6740-4fbe-9648-4e1c3157765c	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	5	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-05-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
bf90d284-0fc9-4c0a-8724-67a660d2d3bf	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	6	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-06-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
27d0492d-cdec-41b0-b9b9-398dc9da77c3	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	6	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-06-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
2c62bc0e-51a1-4dfb-8f44-ca2aa1e79e92	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	6	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-06-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
587c0fad-8553-40f0-a545-3dd6bbcde998	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	6	650.00	120.00	80.00	10	10	20	93.00	943.00	teilbezahlt	2025-06-05	\N	0.00	120.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
41ea3f1b-ce5c-46a7-93da-1e4cb8546fbb	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	6	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-06-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
f50f6938-0cfe-4315-9fa7-3b1ae3fd74e6	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	7	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-07-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
870ee290-6e53-4a3a-bf89-320454e121f6	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	7	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-07-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
8cf70a26-d622-4679-804d-82d70f00a9bd	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	7	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-07-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
8d05f5d1-69f1-4a52-8e0d-36787bedb9b4	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	7	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-07-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
89815839-58fc-4297-ae29-6cef9851f45b	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	7	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-07-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
6d29ab79-74ea-4138-aa01-d429c665a91b	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	8	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-08-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
79e8a7ec-f6cf-4563-b476-d28fb6ca2e66	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	8	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-08-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
9761b2d4-329c-4edc-95a1-869adcfb3133	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	8	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-08-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
79ec5b7f-4f7a-42e9-a906-c0057bc2113d	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	8	650.00	120.00	80.00	10	10	20	93.00	943.00	offen	2025-08-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
513f6f86-8387-40fe-acde-1e1e0f8207bb	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	8	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-08-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
f91f5614-7450-4396-878c-c9987e27faa9	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	9	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-09-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
662b7433-223c-455b-a186-c1979160cfd7	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	9	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-09-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
6f02b9de-b1b2-4784-a3e7-cbd636d9d0da	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	9	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-09-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
ae5c6fa8-0211-4ada-a45b-3354bdb27413	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	9	650.00	120.00	80.00	10	10	20	93.00	943.00	teilbezahlt	2025-09-05	\N	0.00	120.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
c7c4034c-e805-46f9-89e6-478113ffb2fc	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	9	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-09-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
797bcd7b-0034-4c17-a85a-bb207f16ce4c	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	10	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-10-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
8f857cde-881b-4bdc-aa4c-686ba966a725	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	10	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-10-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
1d840a02-a045-4a6b-88a7-e03a72e6aaa4	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	10	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-10-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
1d7de173-34bf-4436-8e8a-87aa521868a5	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	10	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-10-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
e9a4138f-2a94-42d0-ac03-619af16c0474	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	10	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-10-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
036491a3-d9d2-4ae9-995e-666020cadc6c	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	11	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-11-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
28e51849-ecc1-4075-a972-13aafbab6fa7	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	11	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-11-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
d874a80d-035b-4ebc-b66a-b29defd495c8	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	11	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-11-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
2fb53179-a9a4-4b89-b69e-1e17c74d9a8c	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	11	650.00	120.00	80.00	10	10	20	93.00	943.00	offen	2025-11-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
32422f76-1c66-4113-aec4-d79b8dd1a395	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	11	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-11-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
892805d2-52a3-4188-87c4-2015cd068c4b	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	2025	12	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-12-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
4cd9146a-451d-425d-ae70-af644df0ef42	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2025	12	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-12-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
95b95171-1467-4670-93c2-416360bf90c3	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	12	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-12-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
65c87278-c345-4885-9555-60ead10553b6	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2025	12	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-12-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
6c073122-765f-48a2-b843-bbab6f3fc062	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2025	12	650.00	120.00	80.00	10	10	20	93.00	943.00	bezahlt	2025-12-05	\N	0.00	0.00	0.00	0.00	2026-01-25 07:18:51.626333+00	2026-01-25 07:18:51.626333+00	0.00	10	0.00	1
23c62ea8-c442-4b6e-9cd2-87ce61fa6411	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	2025	2	650.00	120.00	0.00	10	10	20	0.00	850.00	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 05:41:50.797315+00	2026-02-01 05:41:50.797315+00	0.00	10	0.00	1
6bf825fe-5ca7-440d-823b-79759fc44672	0e11277b-19b3-4dd5-a8b4-9ad70e62d52d	583849e1-06a8-486d-a9d4-d1dd0f38f2a1	2025	2	302.32	183.16	0.00	10	10	20	0.00	485.48	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.639294+00	2026-02-01 07:38:34.639294+00	0.00	10	0.00	1
b7ebd6a4-6a58-43c1-9116-3ddf06ff315a	d213f162-ca89-478b-af80-f0d7e39e102e	572d89f1-e239-4e99-87ad-25a88a7fe70f	2025	2	396.73	36.65	0.00	10	10	20	0.00	433.38	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.645037+00	2026-02-01 07:38:34.645037+00	0.00	10	0.00	1
c8d49354-0363-4d9a-be44-88f1f61f1cd3	db5c3d17-19fc-4f12-ad8f-5212e0d4d69e	1ca9f5e6-c672-4209-884b-85b490ace091	2025	2	461.11	48.37	0.00	10	10	20	0.00	509.48	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.649841+00	2026-02-01 07:38:34.649841+00	0.00	10	0.00	1
aebe2076-80cc-492b-ac45-6ddccad1e356	dba809d8-ef24-4c58-b27c-70cef6cb150e	6ae715bb-e249-4b1d-bdb4-38a6f2389637	2025	2	305.90	61.07	0.00	10	10	20	0.00	366.97	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.654749+00	2026-02-01 07:38:34.654749+00	0.00	10	0.00	1
30cb199a-fed2-4a21-a333-cb3074c00d97	3093681b-f89b-42e3-a218-49b4dc213763	f72b9c2e-208b-46eb-8ce3-724af756d9cf	2025	2	325.00	67.03	0.00	10	10	20	0.00	392.03	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.659586+00	2026-02-01 07:38:34.659586+00	0.00	10	0.00	1
88680623-6f3f-4401-b9c6-c63f42f76fe8	23c8f866-7d72-4d5f-930d-92d8a33d9c88	3982e6b9-6911-43c0-ad60-0506001b02d8	2025	2	266.05	90.82	0.00	10	10	20	0.00	356.87	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.664507+00	2026-02-01 07:38:34.664507+00	0.00	10	0.00	1
a0577556-3725-4adf-b15f-fd63aaa2cfcd	e46e8b08-6b98-47fa-8e5d-65a4998d107f	698340e1-1fc6-4b48-8517-3c525d8b0399	2025	2	322.63	103.34	0.00	10	10	20	0.00	425.97	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.669233+00	2026-02-01 07:38:34.669233+00	0.00	10	0.00	1
b27c4856-ca0b-47c1-874e-cdab52b52a08	0d47ee00-1ce8-4ec0-99c6-5d9bd7067475	ec40d134-6a14-43b4-86ad-0812eb2c32de	2025	2	147.04	13.13	0.00	10	10	20	0.00	160.17	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.674446+00	2026-02-01 07:38:34.674446+00	0.00	10	0.00	1
88cc1638-7721-482e-872a-463f33b89d27	80f828f3-694a-4b42-a784-064dc44d4132	ef29792d-0198-44e7-b28f-b3d4c477c612	2025	2	444.24	84.36	0.00	10	10	20	0.00	528.60	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.679017+00	2026-02-01 07:38:34.679017+00	0.00	10	0.00	1
e9dca2c2-88ee-4623-a541-41f9e64030a6	3e1222e8-42e8-4b5b-b6a3-8cf7b5a5a3e4	e0ecd724-fa78-4278-8db4-e823115bf428	2025	2	46.45	14.14	0.00	10	10	20	0.00	60.59	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.6842+00	2026-02-01 07:38:34.6842+00	0.00	10	0.00	1
32b72329-9376-4313-8bed-31810b6f6ca0	46b68e89-389e-4f84-b73d-0e14bd8eaf39	865ad5a1-43cd-4bf1-b303-07cfd951672e	2025	2	0.00	16.57	0.00	10	10	20	0.00	16.57	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.689833+00	2026-02-01 07:38:34.689833+00	0.00	10	0.00	1
b8401fb4-2bda-490d-b06b-5b6d9e11fd27	15aa9064-8d89-47ce-ac61-253df1b20b72	88f6f992-9364-48d9-8452-d88d3210c594	2025	2	70.19	16.57	0.00	10	10	20	0.00	86.76	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.695136+00	2026-02-01 07:38:34.695136+00	0.00	10	0.00	1
9b48d77e-268b-4ce8-9326-cf75c79ab842	ee198d15-962c-4671-b787-29592f75be87	14e28a5c-d583-43bf-a091-aebcaedec42c	2025	2	70.19	13.25	0.00	10	10	20	0.00	83.44	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.701+00	2026-02-01 07:38:34.701+00	0.00	10	0.00	1
1a273689-a077-47eb-9380-63c4bebed2ee	1831853e-5a28-48f4-ac65-51b6c7b8ecef	47bd43c9-5e04-4213-96c9-6953adc2774c	2025	2	61.86	14.04	0.00	10	10	20	0.00	75.90	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.706104+00	2026-02-01 07:38:34.706104+00	0.00	10	0.00	1
5204383a-5aee-4eaa-af1f-8c85d44c3d77	b02fba5e-f2e6-4887-b4b9-4c637b9aadf9	47bd43c9-5e04-4213-96c9-6953adc2774c	2025	2	61.86	14.04	0.00	10	10	20	0.00	75.90	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.709887+00	2026-02-01 07:38:34.709887+00	0.00	10	0.00	1
1479aa64-35c4-48e8-bb84-7cc721c6f6c8	40160c69-4f41-47ac-8274-2d42e5bc25cc	c8038478-95dd-4c89-b0b8-66b7ffbe83b1	2025	2	0.00	14.04	0.00	10	10	20	0.00	14.04	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.714022+00	2026-02-01 07:38:34.714022+00	0.00	10	0.00	1
6d7284e8-04a5-448d-b843-5074b407e75a	2613b10c-f27c-41ad-a701-b53eb7234a23	4fe2308e-b38f-4479-957a-85ddbe3af911	2025	2	62.91	15.47	0.00	10	10	20	0.00	78.38	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.718289+00	2026-02-01 07:38:34.718289+00	0.00	10	0.00	1
dd7d8c32-63fd-47a5-8926-1bcb66baf2e0	05227f38-4c24-49e6-b241-e1fe003c13a8	f52af7a2-9364-4683-a10c-88ce5d7c6854	2025	2	381.95	115.80	0.00	10	10	20	0.00	497.75	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.722903+00	2026-02-01 07:38:34.722903+00	0.00	10	0.00	1
0eac71e5-6858-4fba-bc90-71798cf8fbb0	8af52f15-c990-4b99-a512-2da31e31751b	813ed731-7514-43dd-8910-7f64b0857574	2025	2	254.60	69.31	0.00	10	10	20	0.00	323.91	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.72715+00	2026-02-01 07:38:34.72715+00	0.00	10	0.00	1
d3b54a42-c442-4bb8-96c4-b96959984ed2	6ad82287-c2d0-4850-9679-96eab3bf39c1	fb6fbfd3-819e-4e37-938f-b204d9488037	2025	2	466.48	69.01	0.00	10	10	20	0.00	535.49	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.731812+00	2026-02-01 07:38:34.731812+00	0.00	10	0.00	1
e711fbeb-4cd2-4a88-9cd1-741d9cb263f1	c8fefc1a-ccd3-46b6-bb9a-558cb85c6f88	fb6fbfd3-819e-4e37-938f-b204d9488037	2025	2	466.48	69.01	0.00	10	10	20	0.00	535.49	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.737125+00	2026-02-01 07:38:34.737125+00	0.00	10	0.00	1
5264f095-562f-4252-be1c-afdb6628fe09	33105205-38f8-44e5-9b09-0ce944228729	6cb3027b-7a6f-4b14-9d1e-ce484094a9fd	2025	2	353.93	34.36	0.00	10	10	20	0.00	388.29	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.741314+00	2026-02-01 07:38:34.741314+00	0.00	10	0.00	1
3fece985-3118-46af-968e-7093343305c2	151eda3b-c9c0-44e2-9d51-8e1137b3287e	6cb3027b-7a6f-4b14-9d1e-ce484094a9fd	2025	2	353.93	34.36	0.00	10	10	20	0.00	388.29	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.745985+00	2026-02-01 07:38:34.745985+00	0.00	10	0.00	1
816e1a8a-5443-4be4-94b7-1ef8bd9e0fc8	2af43f4d-5880-4906-abb5-d42dd6f68be8	4a3439ed-0a5c-4f55-8010-1eb952760d3b	2025	2	414.31	54.85	0.00	10	10	20	0.00	469.16	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.75057+00	2026-02-01 07:38:34.75057+00	0.00	10	0.00	1
7931a248-c913-4d22-8149-af46d27099e3	593c13c8-1e8f-45f5-b483-3391c7bf341f	444918e8-7ff8-4a3b-8cba-01a2c8aee296	2025	2	410.31	47.53	0.00	10	10	20	0.00	457.84	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.755121+00	2026-02-01 07:38:34.755121+00	0.00	10	0.00	1
f5ee10b7-2597-44f9-88bd-722b00f3399a	a3244d56-49de-4573-a780-a94e97c4661f	dea7353a-5be9-42e8-ac2b-681688bea5c2	2025	2	580.86	223.48	0.00	10	10	20	0.00	804.34	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.759407+00	2026-02-01 07:38:34.759407+00	0.00	10	0.00	1
1d0c58d6-6e64-45b9-95cd-509a4fd049fe	5c919d53-abf9-45b8-aff6-610895d3f8a4	dea7353a-5be9-42e8-ac2b-681688bea5c2	2025	2	580.86	223.48	0.00	10	10	20	0.00	804.34	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.763143+00	2026-02-01 07:38:34.763143+00	0.00	10	0.00	1
465212b1-e383-41a8-8a2b-92402abd3c69	60402c2d-d925-45fb-9a1d-08a5934dde98	4d958a39-e9de-407e-8605-5d63237e29c0	2025	2	306.50	104.92	0.00	10	10	20	0.00	411.42	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.767384+00	2026-02-01 07:38:34.767384+00	0.00	10	0.00	1
6cdb3576-5ccc-4792-becd-da7d58550df9	51eb3367-6564-4299-ac75-e836397051d8	91bbf7b1-1444-4060-b03d-67989b387bd6	2025	2	281.28	49.22	0.00	10	10	20	0.00	330.50	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.771838+00	2026-02-01 07:38:34.771838+00	0.00	10	0.00	1
36e02c04-e015-4b34-8b53-c85137f6f74a	27547202-6d54-4071-b087-4268a003f5bd	1f38e7ad-c4d5-4822-8c18-fa165dab4b80	2025	2	389.51	140.72	0.00	10	10	20	0.00	530.23	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.775897+00	2026-02-01 07:38:34.775897+00	0.00	10	0.00	1
8d33dec6-1613-4cbb-afb7-abbcd3faedb4	fee3b99a-4261-4251-a4e8-4050bab6957f	1f38e7ad-c4d5-4822-8c18-fa165dab4b80	2025	2	389.51	140.72	0.00	10	10	20	0.00	530.23	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.780127+00	2026-02-01 07:38:34.780127+00	0.00	10	0.00	1
80e1c827-8cba-47db-b317-c1c6c568b3ff	cb7b8043-cfad-4cf1-9708-03d491a217c7	b272bf88-f87d-4800-bd36-c8fe6e8d244c	2025	2	681.02	202.55	0.00	10	10	20	0.00	883.57	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.784426+00	2026-02-01 07:38:34.784426+00	0.00	10	0.00	1
ea1e98fd-4f02-4476-aaa9-16a3b44e3ce8	96705457-88cc-49eb-a978-50ca8fe52908	4223f474-6f6c-4efe-8d44-064f99079a0a	2025	2	381.29	114.89	0.00	10	10	20	0.00	496.18	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.788254+00	2026-02-01 07:38:34.788254+00	0.00	10	0.00	1
90f646f2-fe37-4868-8d6f-1ea61cca05d6	1107db29-079d-4144-ae27-ba52dcf06c57	4223f474-6f6c-4efe-8d44-064f99079a0a	2025	2	381.29	114.89	0.00	10	10	20	0.00	496.18	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.792158+00	2026-02-01 07:38:34.792158+00	0.00	10	0.00	1
504fedc5-4ffd-4da1-997c-9b2487d667d6	57457c80-8a3d-49b9-896f-0b6cfa32880f	9f3bb2b5-beed-4491-8d74-184bcabd8527	2025	2	318.66	91.26	0.00	10	10	20	0.00	409.92	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.796387+00	2026-02-01 07:38:34.796387+00	0.00	10	0.00	1
a5b17e80-3c82-49c1-aa83-07935a48225e	f551a2e5-1dd3-4260-b1e6-94a9ecad61aa	f2b93d88-3f17-43ac-bb0f-e0ea8da19732	2025	2	552.34	225.50	0.00	10	10	20	0.00	777.84	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.800392+00	2026-02-01 07:38:34.800392+00	0.00	10	0.00	1
57e7f4a0-2432-4f9a-b774-3c8663abab02	25669e2d-b4c1-4cbf-a357-eb3cc1445e89	f2b93d88-3f17-43ac-bb0f-e0ea8da19732	2025	2	552.34	225.50	0.00	10	10	20	0.00	777.84	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.804178+00	2026-02-01 07:38:34.804178+00	0.00	10	0.00	1
bea68d9b-bb6b-4cbc-ab9f-68416a59c8c5	4328e764-a2a2-492e-ae6d-32054251b40d	e06045aa-ced0-4891-b49b-dbc447e14237	2025	2	540.98	64.05	0.00	10	10	20	0.00	605.03	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.808545+00	2026-02-01 07:38:34.808545+00	0.00	10	0.00	1
1650f78e-bfe2-48dd-ae7e-d5bd48b4d4df	02950e82-61b4-45e2-91e2-9b89dfbe466e	f406cc40-5c38-4874-824b-850a0cd5acbf	2025	2	95.59	20.04	0.00	10	10	20	0.00	115.63	offen	2025-02-01	\N	0.00	0.00	0.00	0.00	2026-02-01 07:38:34.811912+00	2026-02-01 07:38:34.811912+00	0.00	10	0.00	1
00000000-0000-0000-0000-000000000031	00000000-0000-0000-0000-000000000021	00000000-0000-0000-0000-000000000011	2026	1	650.00	120.00	80.00	10	10	20	0.00	850.00	offen	\N	\N	0.00	0.00	0.00	0.00	2026-02-01 13:53:17.368+00	2026-02-01 13:53:17.368349+00	0.00	10	0.00	1
00000000-0000-0000-0000-000000000032	00000000-0000-0000-0000-000000000021	00000000-0000-0000-0000-000000000011	2026	2	650.00	120.00	80.00	10	10	20	0.00	850.00	offen	\N	\N	0.00	0.00	0.00	0.00	2026-02-01 13:53:17.372+00	2026-02-01 13:53:17.37252+00	0.00	10	0.00	1
\.


--
-- Data for Name: organization_invites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organization_invites (id, organization_id, email, role, token, status, invited_by, expires_at, accepted_at, created_at) FROM stdin;
c93ba013-cc3e-4da2-9e18-239a5d5e89d8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	s.pfeffer@gerstl.at	admin	a73477bc-b3a4-477c-a64a-c5f70fc480a4	pending	e118c1df-eb5d-4939-960d-cdf61b56d6e4	2026-02-01 16:41:09.03+00	\N	2026-01-25 16:41:09.032187+00
fdd76013-6c2c-414f-b43c-249c72d145d0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	s.pfeffer@gerstl.at	viewer	516fb6d3-910b-428d-82d4-10e1ea7658e2	pending	e118c1df-eb5d-4939-960d-cdf61b56d6e4	2026-02-02 18:35:54.265+00	\N	2026-01-26 18:35:54.266348+00
ac09af19-e61d-4f9f-afe4-9babb415a8b7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	s.pfeffer@gerstl.at	viewer	e6d1263a-9a75-4416-a019-699e97e2457d	pending	e118c1df-eb5d-4939-960d-cdf61b56d6e4	2026-02-04 18:53:50.494+00	\N	2026-01-28 18:53:50.496156+00
1a6adfa7-e5b4-41a4-9360-242166e7e1b1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	stephania.pfeffer@gmx.de	viewer	3f80f375-ffaf-4f5f-b4ee-b669ef051dda	pending	e118c1df-eb5d-4939-960d-cdf61b56d6e4	2026-02-04 19:08:53.723+00	\N	2026-01-28 19:08:53.724636+00
b6b7ca56-f487-4a4e-a8b7-7f44523c12b0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	schlot63@gmx.de	property_manager	af51034a-b615-4d02-8eb4-b711ffd62890	pending	e118c1df-eb5d-4939-960d-cdf61b56d6e4	2026-02-07 14:13:48.003+00	\N	2026-01-31 14:13:48.005141+00
f2e14858-051e-449a-9498-fb3780c4478c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	yolandapfeffer@gmx.de	property_manager	44d66822-8362-43fa-9ac1-88a30696e1ad	pending	e118c1df-eb5d-4939-960d-cdf61b56d6e4	2026-02-07 14:14:05.161+00	\N	2026-01-31 14:14:05.162518+00
1a2a59f6-067b-46e5-bb4f-5b7bdb1c82c7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	stephania.pfeffer@gmx.de	property_manager	dd4ae1cc-a17b-4432-b6d3-dc048fa539ec	pending	e118c1df-eb5d-4939-960d-cdf61b56d6e4	2026-02-07 14:17:17.966+00	\N	2026-01-31 14:17:17.967143+00
6d0afc0c-ec8f-4a18-b702-553e6a65d5c4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	yolandapfeffer@gmx.de	property_manager	07163fc0-5ee0-43fe-8559-2756286243b5	pending	e118c1df-eb5d-4939-960d-cdf61b56d6e4	2026-02-07 14:44:19.82+00	\N	2026-01-31 14:44:19.821015+00
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, name, subscription_tier, subscription_status, trial_ends_at, iban, bic, address, city, postal_code, phone, email, created_at, updated_at, brand_name, logo_url, primary_color, support_email) FROM stdin;
6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	ImmoflowMe Admin	enterprise	active	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-24 16:50:51.297687+00	2026-01-24 16:50:51.297687+00	\N	\N	\N	\N
8f949680-dddb-46f2-b21b-890295e73356	Demo - stephania.pfeffer@outlook.de	professional	trial	2026-01-31 13:06:03.397+00	\N	\N	\N	\N	\N	\N	\N	2026-01-31 12:36:03.399011+00	2026-01-31 12:36:03.399011+00	\N	\N	\N	\N
4da551db-f90a-45e6-83c0-b38a2aeccf14	Demo - test-trial@immoflow.at	professional	trial	2026-01-31 15:15:57.789+00	\N	\N	\N	\N	\N	\N	\N	2026-01-31 14:45:57.790577+00	2026-01-31 14:45:57.790577+00	\N	\N	\N	\N
8b5cca20-19c0-43b9-8a29-bc1fe7c4a7c7	Demo - Steffi	professional	trial	2026-01-31 16:23:49.753+00	\N	\N	\N	\N	\N	\N	\N	2026-01-31 15:53:49.754623+00	2026-01-31 15:53:49.754623+00	\N	\N	\N	\N
5475d57b-5c46-4290-9a67-63f8c30dd148	Demo -  tamina	professional	trial	2026-01-31 17:05:45.869+00	\N	\N	\N	\N	\N	\N	\N	2026-01-31 16:35:45.869973+00	2026-01-31 16:35:45.869973+00	\N	\N	\N	\N
4a2c829d-31cc-4300-83e7-bfa99791218c	Demo - test 12345	professional	trial	2026-01-31 17:47:03.592+00	\N	\N	\N	\N	\N	\N	\N	2026-01-31 17:17:03.593626+00	2026-01-31 17:17:03.593626+00	\N	\N	\N	\N
00000000-0000-0000-0000-000000000100	Test Organisation	starter	trial	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-01 13:52:34.186+00	2026-02-01 13:52:34.187977+00	\N	\N	\N	\N
\.


--
-- Data for Name: owners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.owners (id, organization_id, first_name, last_name, company_name, email, phone, mobile_phone, address, city, postal_code, country, iban, bic, bank_name, tax_number, notes, created_at, updated_at) FROM stdin;
fe93e7d5-62f2-49c3-ac35-ba0f630cd378	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	Maria	Eigentümer	\N	eigentuemer@beispiel.at	+43 1 234 5678	\N	Eigentümerweg 1	Wien	1010	Österreich	\N	\N	\N	\N	\N	2026-01-25 07:18:51.581067+00	2026-01-25 07:18:51.581067+00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, tenant_id, invoice_id, betrag, buchungs_datum, payment_type, verwendungszweck, transaction_id, notizen, created_at) FROM stdin;
a39d555d-189e-4dc8-8512-6eafd4d3a1e3	2c23f9a6-4168-4947-a60d-4de39d0bd932	f8a02fbe-567b-48f4-8b69-d910a9d8a965	943.00	2025-03-03	ueberweisung	Miete + BK 2025-03	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
e1e1543e-d4b3-45a3-b493-e13af315458c	2c23f9a6-4168-4947-a60d-4de39d0bd932	858df43b-ccd3-4b61-a8cb-5b927af77871	943.00	2025-02-03	ueberweisung	Miete + BK 2025-02	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
d0274642-6b27-4742-91f0-608f8e55ce85	2c23f9a6-4168-4947-a60d-4de39d0bd932	84a44a11-b4a8-49bd-a8c9-1065db6d1724	943.00	2025-01-03	ueberweisung	Miete + BK 2025-01	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
f7937807-5559-4ee9-aaf9-9986e485507d	1527b71f-2815-48fe-b909-47bd1daca87d	13029e19-c2b9-49a7-85c2-b33600f15aaa	943.00	2025-02-03	ueberweisung	Miete + BK 2025-02	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
eac366e6-0aad-477f-8694-1bfa42f79e21	1527b71f-2815-48fe-b909-47bd1daca87d	62c84185-e2a9-403f-80fd-3b9839724499	943.00	2025-01-03	ueberweisung	Miete + BK 2025-01	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
42bceef8-8c28-433c-91a5-30782d66e190	4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	12e6c5bb-3d0c-4e38-82f1-13d9902b9d83	943.00	2025-02-03	ueberweisung	Miete + BK 2025-02	4ae5d3bc-90d6-426c-afd2-3266721015fe	\N	2026-01-25 07:18:51.638636+00
99a91714-1b46-4c77-859d-89994b59a326	4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	b2b0de68-d92b-4013-b14b-a44278e0eef3	943.00	2025-01-03	ueberweisung	Miete + BK 2025-01	4ae5d3bc-90d6-426c-afd2-3266721015fe	\N	2026-01-25 07:18:51.638636+00
2d022687-1dbf-47e0-bc27-6f59fe626262	809e9fd3-5495-4111-8c84-16be2ffc797e	b01d1b7c-6761-4d7d-9416-6c0316e2bafc	943.00	2025-02-03	ueberweisung	Miete + BK 2025-02	e789e8d5-d8e5-402b-9b11-c5cba44cbfe0	\N	2026-01-25 07:18:51.638636+00
288ffa04-22a4-48e7-9d90-0dffd565ef23	809e9fd3-5495-4111-8c84-16be2ffc797e	a1b58650-51c2-4c09-8748-5b396258ccd5	943.00	2025-01-03	ueberweisung	Miete + BK 2025-01	e789e8d5-d8e5-402b-9b11-c5cba44cbfe0	\N	2026-01-25 07:18:51.638636+00
ce6a9dad-6e73-4a8e-899a-d77c5f198dbe	bd7bd729-f522-42c8-97d2-01e73c38f81c	cc582f1f-2c42-4d39-a57a-1ec388cf13c1	943.00	2025-02-03	ueberweisung	Miete + BK 2025-02	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
5e83e196-7881-4c44-9c31-c1aa40fc0628	bd7bd729-f522-42c8-97d2-01e73c38f81c	ebee17b6-17b1-40c4-9afb-1a7784eb1149	943.00	2025-01-03	ueberweisung	Miete + BK 2025-01	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
dc3f2239-ee51-4238-8155-31007c2590f7	2c23f9a6-4168-4947-a60d-4de39d0bd932	892805d2-52a3-4188-87c4-2015cd068c4b	943.00	2025-12-03	ueberweisung	Miete + BK 2025-12	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
b7387f2a-c245-49ba-a0b6-77c9249d8f44	2c23f9a6-4168-4947-a60d-4de39d0bd932	036491a3-d9d2-4ae9-995e-666020cadc6c	943.00	2025-11-03	ueberweisung	Miete + BK 2025-11	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
ac0e923c-92a8-4f7b-9751-cacddfd0f6f4	2c23f9a6-4168-4947-a60d-4de39d0bd932	797bcd7b-0034-4c17-a85a-bb207f16ce4c	943.00	2025-10-03	ueberweisung	Miete + BK 2025-10	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
3338b286-3a0e-4eb4-9338-c4bbd8ed4d73	2c23f9a6-4168-4947-a60d-4de39d0bd932	f91f5614-7450-4396-878c-c9987e27faa9	943.00	2025-09-03	ueberweisung	Miete + BK 2025-09	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
d5931b30-ccf0-49fb-916d-6ddad83a9b52	2c23f9a6-4168-4947-a60d-4de39d0bd932	6d29ab79-74ea-4138-aa01-d429c665a91b	943.00	2025-08-03	ueberweisung	Miete + BK 2025-08	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
ee20169d-136c-4d46-b7e2-e91531e14784	2c23f9a6-4168-4947-a60d-4de39d0bd932	f50f6938-0cfe-4315-9fa7-3b1ae3fd74e6	943.00	2025-07-03	ueberweisung	Miete + BK 2025-07	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
9278da62-5e71-44b5-8c5a-602cc0f6d332	2c23f9a6-4168-4947-a60d-4de39d0bd932	bf90d284-0fc9-4c0a-8724-67a660d2d3bf	943.00	2025-06-03	ueberweisung	Miete + BK 2025-06	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
e5f24905-bc87-47e1-8101-cdcbdca7f740	2c23f9a6-4168-4947-a60d-4de39d0bd932	7b6480ac-f9c1-429f-9851-aaf85f7e0246	943.00	2025-05-03	ueberweisung	Miete + BK 2025-05	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
89e31dc5-5b1c-4d19-9634-69d4e103f1c5	2c23f9a6-4168-4947-a60d-4de39d0bd932	c92474ae-69c4-4487-97a7-7adbfe6d1e77	943.00	2025-04-03	ueberweisung	Miete + BK 2025-04	2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	\N	2026-01-25 07:18:51.638636+00
6b169513-ae07-4c6f-b8e5-465a7bbd707c	1527b71f-2815-48fe-b909-47bd1daca87d	4cd9146a-451d-425d-ae70-af644df0ef42	943.00	2025-12-03	ueberweisung	Miete + BK 2025-12	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
2770e8f9-e6d4-4f36-abca-b2a40747b05e	1527b71f-2815-48fe-b909-47bd1daca87d	28e51849-ecc1-4075-a972-13aafbab6fa7	943.00	2025-11-03	ueberweisung	Miete + BK 2025-11	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
0134ce0b-5332-4dfc-8058-a22309417aa3	1527b71f-2815-48fe-b909-47bd1daca87d	8f857cde-881b-4bdc-aa4c-686ba966a725	943.00	2025-10-03	ueberweisung	Miete + BK 2025-10	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
b2e5b1be-b817-4a0b-8a36-a02b1536cfc8	1527b71f-2815-48fe-b909-47bd1daca87d	662b7433-223c-455b-a186-c1979160cfd7	943.00	2025-09-03	ueberweisung	Miete + BK 2025-09	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
342593a2-e18b-479a-9551-0523cf393e87	1527b71f-2815-48fe-b909-47bd1daca87d	79e8a7ec-f6cf-4563-b476-d28fb6ca2e66	943.00	2025-08-03	ueberweisung	Miete + BK 2025-08	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
96120fbf-8562-4e6c-b761-03e4d3476737	1527b71f-2815-48fe-b909-47bd1daca87d	870ee290-6e53-4a3a-bf89-320454e121f6	943.00	2025-07-03	ueberweisung	Miete + BK 2025-07	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
88bde029-f0fc-4ed5-bf62-d36fbde9e949	1527b71f-2815-48fe-b909-47bd1daca87d	27d0492d-cdec-41b0-b9b9-398dc9da77c3	943.00	2025-06-03	ueberweisung	Miete + BK 2025-06	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
6819e7a8-60f4-4f1e-bb6c-370f8b640b8e	1527b71f-2815-48fe-b909-47bd1daca87d	079cc5ab-9e70-42af-9ab7-d1f47d2078cc	943.00	2025-05-03	ueberweisung	Miete + BK 2025-05	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
05056177-61eb-40c1-a308-11965df13aed	1527b71f-2815-48fe-b909-47bd1daca87d	26426ca3-a783-474e-83dc-f986d1098f9e	943.00	2025-04-03	ueberweisung	Miete + BK 2025-04	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
844a84b3-d982-4734-a0b0-dc36ef0350c1	1527b71f-2815-48fe-b909-47bd1daca87d	09810a85-e037-43f7-80d8-3c2f6432d102	943.00	2025-03-03	ueberweisung	Miete + BK 2025-03	7decd40a-3b23-4bd1-9437-3764be32083c	\N	2026-01-25 07:18:51.638636+00
ab976815-9e14-4fb5-bb8a-fbb61aad0ccf	4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	e1430458-9ab4-452f-be25-45fc27f6c661	943.00	2025-03-03	ueberweisung	Miete + BK 2025-03	4ae5d3bc-90d6-426c-afd2-3266721015fe	\N	2026-01-25 07:18:51.638636+00
e7c614c8-800b-4624-9343-82747f5188f7	809e9fd3-5495-4111-8c84-16be2ffc797e	65c87278-c345-4885-9555-60ead10553b6	943.00	2025-12-03	ueberweisung	Miete + BK 2025-12	e789e8d5-d8e5-402b-9b11-c5cba44cbfe0	\N	2026-01-25 07:18:51.638636+00
5beeb2d6-b2e8-4a59-8b1b-d9d0341a2855	809e9fd3-5495-4111-8c84-16be2ffc797e	1d7de173-34bf-4436-8e8a-87aa521868a5	943.00	2025-10-03	ueberweisung	Miete + BK 2025-10	e789e8d5-d8e5-402b-9b11-c5cba44cbfe0	\N	2026-01-25 07:18:51.638636+00
5ea939a7-1eef-470d-b67c-204091c6c745	809e9fd3-5495-4111-8c84-16be2ffc797e	8d05f5d1-69f1-4a52-8e0d-36787bedb9b4	943.00	2025-07-03	ueberweisung	Miete + BK 2025-07	e789e8d5-d8e5-402b-9b11-c5cba44cbfe0	\N	2026-01-25 07:18:51.638636+00
06120c42-8805-41da-b906-95bb41d81ce5	809e9fd3-5495-4111-8c84-16be2ffc797e	730f3d85-5fa5-4074-83f7-3cc96c58fd3f	943.00	2025-05-03	ueberweisung	Miete + BK 2025-05	e789e8d5-d8e5-402b-9b11-c5cba44cbfe0	\N	2026-01-25 07:18:51.638636+00
ca0afd84-8d58-4e1f-beee-62f7642a1c8e	809e9fd3-5495-4111-8c84-16be2ffc797e	82f3cd89-171a-4d92-8337-0b01c6040f75	943.00	2025-04-03	ueberweisung	Miete + BK 2025-04	e789e8d5-d8e5-402b-9b11-c5cba44cbfe0	\N	2026-01-25 07:18:51.638636+00
9161a111-f350-4eb1-8092-f9bdd57f4d0d	bd7bd729-f522-42c8-97d2-01e73c38f81c	6c073122-765f-48a2-b843-bbab6f3fc062	943.00	2025-12-03	ueberweisung	Miete + BK 2025-12	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
fd18c1a3-0f00-44b3-a743-3cda2afb960d	bd7bd729-f522-42c8-97d2-01e73c38f81c	32422f76-1c66-4113-aec4-d79b8dd1a395	943.00	2025-11-03	ueberweisung	Miete + BK 2025-11	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
8e225e7d-6312-4923-9e78-90331e870979	bd7bd729-f522-42c8-97d2-01e73c38f81c	e9a4138f-2a94-42d0-ac03-619af16c0474	943.00	2025-10-03	ueberweisung	Miete + BK 2025-10	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
999aaa00-4ae5-4a47-b325-e66ef103ab76	bd7bd729-f522-42c8-97d2-01e73c38f81c	c7c4034c-e805-46f9-89e6-478113ffb2fc	943.00	2025-09-03	ueberweisung	Miete + BK 2025-09	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
7e4b5ff3-4556-4bb4-83a7-bf32bdb8a52a	bd7bd729-f522-42c8-97d2-01e73c38f81c	513f6f86-8387-40fe-acde-1e1e0f8207bb	943.00	2025-08-03	ueberweisung	Miete + BK 2025-08	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
147e1de6-367b-4895-a1ba-667327a73b1e	bd7bd729-f522-42c8-97d2-01e73c38f81c	89815839-58fc-4297-ae29-6cef9851f45b	943.00	2025-07-03	ueberweisung	Miete + BK 2025-07	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
29105820-197e-4d5d-9dac-991b1eceb3de	bd7bd729-f522-42c8-97d2-01e73c38f81c	41ea3f1b-ce5c-46a7-93da-1e4cb8546fbb	943.00	2025-06-03	ueberweisung	Miete + BK 2025-06	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
1d2cecdc-64c7-4a8a-85fe-be4eb6f53b07	bd7bd729-f522-42c8-97d2-01e73c38f81c	a2492fb1-6740-4fbe-9648-4e1c3157765c	943.00	2025-05-03	ueberweisung	Miete + BK 2025-05	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
7e9941ce-f0f5-4309-85fc-93c72fbb7d85	bd7bd729-f522-42c8-97d2-01e73c38f81c	3aab85cd-26df-4ade-8475-4cb4e6b0734e	943.00	2025-04-03	ueberweisung	Miete + BK 2025-04	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
61846879-9a54-4a10-831a-73a323ee9a63	bd7bd729-f522-42c8-97d2-01e73c38f81c	4037dd31-c9e8-4f5c-8d0a-1cb46acbeb41	943.00	2025-03-03	ueberweisung	Miete + BK 2025-03	c87c7fa3-58f9-41dc-b583-201fa4ee0432	\N	2026-01-25 07:18:51.638636+00
38d2da6b-edc7-41a2-9d4d-e632e89f6f23	809e9fd3-5495-4111-8c84-16be2ffc797e	ae5c6fa8-0211-4ada-a45b-3354bdb27413	823.00	2025-09-03	ueberweisung	Miete + BK 2025-09	eb4fb480-3411-483a-a405-863fca30abe9	\N	2026-01-25 07:18:51.638636+00
7149c34e-1705-4270-bf52-8e66949e9660	809e9fd3-5495-4111-8c84-16be2ffc797e	587c0fad-8553-40f0-a545-3dd6bbcde998	823.00	2025-06-03	ueberweisung	Miete + BK 2025-06	eb4fb480-3411-483a-a405-863fca30abe9	\N	2026-01-25 07:18:51.638636+00
137ac20b-7a52-460e-9488-290017697d5a	809e9fd3-5495-4111-8c84-16be2ffc797e	2f3985e7-88e0-4689-8b8b-393f662c603b	823.00	2025-03-03	ueberweisung	Miete + BK 2025-03	eb4fb480-3411-483a-a405-863fca30abe9	\N	2026-01-25 07:18:51.638636+00
3818d254-a731-4883-abd3-e27bb72402aa	49e02c08-39ed-48e4-b5f0-c870669e892b	95b95171-1467-4670-93c2-416360bf90c3	943.00	2025-12-03	ueberweisung	Miete + BK 2025-12	961abacf-14c5-4ce0-bd68-ecaed95ce8ba	\N	2026-01-25 07:18:51.638636+00
a693c867-cdb9-4542-ade2-0d0e422d3a7d	49e02c08-39ed-48e4-b5f0-c870669e892b	d874a80d-035b-4ebc-b66a-b29defd495c8	943.00	2025-11-03	ueberweisung	Miete + BK 2025-11	961abacf-14c5-4ce0-bd68-ecaed95ce8ba	\N	2026-01-25 07:18:51.638636+00
226fe0e8-d78d-467c-81a7-b0c2a9a80ae7	49e02c08-39ed-48e4-b5f0-c870669e892b	1d840a02-a045-4a6b-88a7-e03a72e6aaa4	943.00	2025-10-03	ueberweisung	Miete + BK 2025-10	961abacf-14c5-4ce0-bd68-ecaed95ce8ba	\N	2026-01-25 07:18:51.638636+00
6ec42c8c-a031-4f0a-922b-30ac45fa3ef7	49e02c08-39ed-48e4-b5f0-c870669e892b	6f02b9de-b1b2-4784-a3e7-cbd636d9d0da	943.00	2025-09-03	ueberweisung	Miete + BK 2025-09	961abacf-14c5-4ce0-bd68-ecaed95ce8ba	\N	2026-01-25 07:18:51.638636+00
0e3b7c9f-5f5a-41d5-9a1d-205fd7379261	49e02c08-39ed-48e4-b5f0-c870669e892b	9761b2d4-329c-4edc-95a1-869adcfb3133	943.00	2025-08-03	ueberweisung	Miete + BK 2025-08	961abacf-14c5-4ce0-bd68-ecaed95ce8ba	\N	2026-01-25 07:18:51.638636+00
824ab58d-2525-4b8c-99c0-a155971741f8	49e02c08-39ed-48e4-b5f0-c870669e892b	8cf70a26-d622-4679-804d-82d70f00a9bd	943.00	2025-07-03	ueberweisung	Miete + BK 2025-07	961abacf-14c5-4ce0-bd68-ecaed95ce8ba	\N	2026-01-25 07:18:51.638636+00
1ae3dc6a-7821-49d7-bdbc-68ee29e50388	49e02c08-39ed-48e4-b5f0-c870669e892b	2c62bc0e-51a1-4dfb-8f44-ca2aa1e79e92	943.00	2025-06-03	ueberweisung	Miete + BK 2025-06	961abacf-14c5-4ce0-bd68-ecaed95ce8ba	\N	2026-01-25 07:18:51.638636+00
7e6a0abb-b6da-4471-8b62-94269eb68e8e	49e02c08-39ed-48e4-b5f0-c870669e892b	234b75e2-748c-4c66-9fe8-f70e0c0820f2	943.00	2025-05-03	ueberweisung	Miete + BK 2025-05	961abacf-14c5-4ce0-bd68-ecaed95ce8ba	\N	2026-01-25 07:18:51.638636+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, email, full_name, organization_id, avatar_url, phone, created_at, updated_at, password_hash, subscription_tier, trial_ends_at, subscription_ends_at, stripe_customer_id, stripe_subscription_id, payment_status, payment_failed_at, canceled_at) FROM stdin;
e118c1df-eb5d-4939-960d-cdf61b56d6e4	stephania.pfeffer@outlook.de	Stephania Pfeffer	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	\N	2026-01-24 16:51:03.346681+00	2026-01-25 04:35:41.876+00	$2b$12$vPIf7DdtO74hAvap1Sub5.TaveLgFyuK.V6rG0jQtUtXRJNotC2AO	enterprise	\N	\N	\N	\N	active	\N	\N
c5a696de-4e66-4ba5-81b9-cb28aeed0626	test-trial@immoflow.at	Test Benutzer	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	\N	2026-01-25 09:26:56.56581+00	2026-01-25 09:26:56.56581+00	$2b$12$JzEA9hXWi9S31MDb6zOYIekpjVdVhnVz5oyyyTq1HOoA8vHK5lm4G	trial	2026-02-08 09:26:56.56+00	\N	cus_Tr7zli8XleKYE8	\N	\N	\N	\N
f0434a83-5421-4231-950c-bbaeb920d43f	nadjaolfert@web.de	test-trial@immoflow.at	4da551db-f90a-45e6-83c0-b38a2aeccf14	\N	\N	2026-01-31 14:45:57.828332+00	2026-01-31 14:45:57.828332+00	$2b$10$bRSa0uGBAojPFXNfPnmPLeLR8P2g1QTVJgJVlM430UIEC/ecW1thq	pro	2026-01-31 15:15:57.789+00	\N	\N	\N	active	\N	\N
fe2b9e63-0106-49c2-b1f1-26a7e15605d4	stephania.pfeffer@gmx.de	Steffi	8b5cca20-19c0-43b9-8a29-bc1fe7c4a7c7	\N	\N	2026-01-31 15:53:49.760035+00	2026-01-31 15:53:49.760035+00	$2b$10$/YY63oVUwwbX6DPN/pSrDekkaay79OZNbEiYkSHTF4TiZNHop29bW	pro	2026-01-31 16:23:49.753+00	\N	\N	\N	active	\N	\N
b741103b-3b09-4a9d-879f-1274b7125678	yolandapfeffer@gmx.de	 tamina	5475d57b-5c46-4290-9a67-63f8c30dd148	\N	\N	2026-01-31 16:35:45.910623+00	2026-01-31 16:35:45.910623+00	$2b$10$rVAy/ps12QaAv.S2L8HUFeib56aPT3fZsLO/coz1LE8EXpaSl/1ry	pro	2026-01-31 17:05:45.869+00	\N	\N	\N	active	\N	\N
99e2487e-a99d-4591-bde4-30913cec1d4b	schlot63@gmx.de	test 12345	4a2c829d-31cc-4300-83e7-bfa99791218c	\N	\N	2026-01-31 17:17:03.598942+00	2026-01-31 17:17:03.598942+00	$2b$10$j7cH7R1f8ZaSPlZCBBJwUeYlIIXwRQ8Bbyu0XptH1SIQLuRyed7wq	pro	2026-01-31 17:47:03.592+00	\N	\N	\N	active	\N	\N
\.


--
-- Data for Name: properties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.properties (id, organization_id, name, address, city, postal_code, total_units, total_area, construction_year, notes, created_at, updated_at, deleted_at) FROM stdin;
d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	Musterhaus Simulation 2025	Simulationsstraße 42	Wien	1100	5	450.00	1985	Simulation für BK-Abrechnung 2025	2026-01-25 07:18:51.573168+00	2026-01-25 07:18:51.573168+00	\N
d62b5016-7783-4c4e-be6f-01c454af675f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	Berghoferhaus	Stelzhamer	Wien	1010	0	\N	\N	\N	2026-02-01 06:08:21.494089+00	2026-02-01 06:08:21.494089+00	2026-02-01 07:49:15.464+00
acd67da1-8e24-4437-86de-54df659355b9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	Berghoferhaus	Stelzhamer	Wien	1010	0	\N	\N	\N	2026-02-01 07:49:27.902653+00	2026-02-01 07:49:27.902653+00	2026-02-01 08:23:15.009+00
81005dc5-883b-433d-b3a2-ffbcca1554c2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	Berghoferhaus	Stelzhamer	Wien	1010	0	\N	\N	\N	2026-02-01 08:23:28.790418+00	2026-02-01 08:23:28.790418+00	2026-02-01 09:10:19.933+00
5bf3fe81-2abe-4a6a-9f88-a51e164fa664	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	Berghoferhaus	Stelzhamer	Wien	1010	0	\N	\N	\N	2026-02-01 09:10:31.656971+00	2026-02-01 09:10:31.656971+00	2026-02-01 09:42:41.31+00
12a04808-9142-4044-a9ff-100a8b80b8c4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	Berghoferhaus	Stelzhamer	Wien	1010	0	\N	\N	\N	2026-02-01 09:42:52.286431+00	2026-02-01 09:42:52.286431+00	2026-02-01 10:12:18.347+00
0eceef7c-5d3c-472d-ae48-00d274b90c81	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	Berghoferhaus	Stelzhamer	Wien	1010	0	\N	\N	\N	2026-02-01 10:12:30.209364+00	2026-02-01 10:12:30.209364+00	\N
00000000-0000-0000-0000-000000000001	00000000-0000-0000-0000-000000000100	Testhaus Wien	Testgasse 1	Wien	1010	0	\N	\N	\N	2026-02-01 13:52:34.192+00	2026-02-01 13:52:34.193333+00	\N
\.


--
-- Data for Name: property_budgets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_budgets (id, property_id, organization_id, year, position_1_name, position_1_amount, position_2_name, position_2_amount, position_3_name, position_3_amount, position_4_name, position_4_amount, position_5_name, position_5_amount, status, approved_by, approved_at, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: property_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_documents (id, property_id, organization_id, name, category, file_url, file_size, mime_type, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: property_managers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_managers (id, user_id, property_id, created_at) FROM stdin;
49f51615-21b0-4963-9202-1c75349f6b2d	e118c1df-eb5d-4939-960d-cdf61b56d6e4	d62b5016-7783-4c4e-be6f-01c454af675f	2026-02-01 06:08:21.499819+00
7c2a3617-3938-4fcc-9d14-ef0495660897	e118c1df-eb5d-4939-960d-cdf61b56d6e4	acd67da1-8e24-4437-86de-54df659355b9	2026-02-01 07:49:27.916701+00
ca10258c-1bab-46be-bbff-389b28df0bec	e118c1df-eb5d-4939-960d-cdf61b56d6e4	81005dc5-883b-433d-b3a2-ffbcca1554c2	2026-02-01 08:23:28.794269+00
b1d71225-e351-4ad8-a8a0-c5f02c7e6eee	e118c1df-eb5d-4939-960d-cdf61b56d6e4	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	2026-02-01 09:10:31.661413+00
47de10a4-4917-419f-b222-07c5a721d2fc	e118c1df-eb5d-4939-960d-cdf61b56d6e4	12a04808-9142-4044-a9ff-100a8b80b8c4	2026-02-01 09:42:52.290544+00
50000215-1d8c-4272-bd1c-32c72dd1cd64	e118c1df-eb5d-4939-960d-cdf61b56d6e4	0eceef7c-5d3c-472d-ae48-00d274b90c81	2026-02-01 10:12:30.212733+00
\.


--
-- Data for Name: property_owners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_owners (id, property_id, owner_id, ownership_share, valid_from, valid_to, notes, created_at) FROM stdin;
3c83094b-f679-4f3e-bb17-555a4fb326a7	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	fe93e7d5-62f2-49c3-ac35-ba0f630cd378	100.00	2020-01-01	\N	\N	2026-01-25 07:18:51.595914+00
\.


--
-- Data for Name: rent_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rent_history (id, tenant_id, valid_from, valid_until, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, change_reason, created_at, wasserkosten_vorschuss) FROM stdin;
\.


--
-- Data for Name: sepa_collections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sepa_collections (id, organization_id, month, year, total_amount, tenant_count, status, xml_content, file_name, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (sid, sess, expire) FROM stdin;
ORCkt10RRyOghPdIvR9RZbAf212BbXxT	{"cookie": {"path": "/", "secure": true, "expires": "2026-01-31T17:18:53.245Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "7GJNGFP2M2yqXIxGoqGCXHRx76mYcxuiuTzFFmpwpWI"}}	2026-01-31 17:18:54
iVPHdDiDQxw0Z68hsJx_6WG6efcWnhEq	{"cookie": {"path": "/", "secure": true, "expires": "2026-01-31T17:23:17.672Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "PvVtjAO-_rP7MYzHW8fsKGGIS2lfYaD6QonRXfgERuU"}}	2026-01-31 17:23:18
WwMlFMQrvNgbaBEtLQACQKp0eNY2U75E	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T03:53:54.194Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "exyHqwBUxpkvFryj6V2rsWjsd6riOXs2Nm3ySZiVvgE"}}	2026-02-01 03:53:55
ZQ2rst4vFaFryelPql8fh7LmNvx2qu_r	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T04:17:27.887Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "NsKVPdTJsPCNg2l1NGrCatb7HFwn9oqVnc9g1mTyw2s"}}	2026-02-01 04:17:28
uoie5F5kPvPqlZ5JSqxohdP_HuTn_hxK	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T04:15:32.698Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "BVg8NgVTa4KszapeIyBt6IbRCjOu3_-IGHT4Jx6cj3o"}}	2026-02-01 04:15:33
IzDTlGmZhQ1vZSokLcZQbgTIJeEHy9Z9	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T04:00:13.272Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "f2-YbQkAfgwWJIBc9rJrQpK90QV6y65GaGo6A1JjuXA"}}	2026-02-01 04:00:14
cMU7pX_xg08cf8eT_kttIHbJev6sE8QA	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T03:55:09.911Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "xMZ6l_Ns2G9A8zM64wLY7Rb-88blcn7uDfBfUYzqMCw"}}	2026-02-01 03:55:10
4XeNjadTeoP0glkOIL1gZWmYete2AbBk	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T03:58:01.085Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "RUz42HSe-OpXqaxGljYCA_92KhMoyjOqqm_wYZQAhPI"}}	2026-02-01 03:58:02
rYjdEGtYhES4_1nMamNfEZp_PZIM0hmk	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T04:04:50.196Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "Ot0HhqjxXMtgcuNgZE5poptRAexGWAQ8F6Ilc6XHV7E"}}	2026-02-01 04:04:51
Uml_yhHxmnVF9eXhikP6vzCTNaFksM-z	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T04:17:38.010Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "8dScmUUG1mE_rQsx5HGTIAw6-RyOI9hSuM8Nq8mouHc"}}	2026-02-01 04:17:39
bSPsz3BJhdxgI66_0WL6ZOl4QGFbrnSl	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T03:40:34.455Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "0Fnn-wLZFLMNyL7889qI4iU6sb-6aLFf5NbqMrJKFTA"}}	2026-02-01 03:40:35
yh89w6ejIYHjxI4dJ1-npibHVj3YtkTg	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T04:16:18.684Z", "httpOnly": true, "originalMaxAge": 604800000}, "passport": {"user": {"claims": {"aud": "66d9798b-298c-4a9c-af7e-84018228585d", "exp": 1769318178, "iat": 1769314578, "iss": "https://replit.com/oidc", "sub": "53329481", "email": "stephania.pfeffer@outlook.de", "at_hash": "deppV8x98ZtrdEpchADlFw", "username": "stephaniapfeffe", "auth_time": 1769314578, "last_name": "Pfeffer", "first_name": "Stephania"}, "expires_at": 1769318178, "access_token": "g8wmBMl3EtnzmfbOUh8jsVbv1hrklI4uP6odZkZFNFr", "refresh_token": "Z7SAIXSth1ukt2jjIrRbTZr9CkQK_rEuRJ-s1IDLiPH"}}}	2026-02-01 04:30:48
DAb2Hvr0RKjzRreWklgJ9PD3JihFljKv	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T04:09:06.197Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "1r5xoS3O0KNIu_r24vnyUm5Oy8t5Y9p2XUhpJD2r228"}}	2026-02-01 04:09:07
bBrzgA2E6YKFX3PjRNs6sB5IC1PHxb0L	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T03:58:12.597Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "ddaTlE03FzFM-n3Cf2MNFZXeo1zgfazuhJJ4zWf2-e4"}}	2026-02-01 03:58:13
lDfoAXst2rFInU7l1IRY2vtcP0zpYXEs	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T03:44:38.026Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "7THzX0kbjKdTrYrUIcCqQGLUsFW4qFgCy8nGRcyIe5s"}}	2026-02-01 03:44:39
eZ1VhQiRuDJHEjkQay9HNvdRV0g7NXNC	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T04:22:30.411Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "7Gt92zPc32uR2xT_D9NugreI5-_kxRrVO_-0S9Dfrzw"}}	2026-02-01 04:22:31
iSmHmby_IQ0z2lE_p5nzgqWLbV0KwC_F	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T04:31:02.080Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "SV70n6WbMy74NVNW9joB14sk--_5Pp_-fH_8P4IOWwk"}}	2026-02-01 04:31:03
zyUuNm6mPuQr4gCLHdliWlDXj7vcEAI7	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-01T03:51:34.346Z", "httpOnly": true, "originalMaxAge": 604800000}, "replit.com": {"code_verifier": "cwmDOBgjvJUjYID-D_oO2feqSAUsuzSODisBVyUYfVE"}}	2026-02-01 03:51:35
\.


--
-- Data for Name: settlement_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settlement_details (id, settlement_id, tenant_id, unit_id, anteil, ausgaben_anteil, vorschuss, differenz, created_at) FROM stdin;
4d60a015-cfe4-4bdb-a94e-2a992e9cc48b	621ca208-c695-47e8-93e8-303bdd4d9966	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	1968.2300	1968.23	0.00	1968.23	2026-01-28 17:35:48.599028+00
6f8a0544-5ca0-4043-b144-307ec2958664	621ca208-c695-47e8-93e8-303bdd4d9966	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	2130.3100	2130.31	0.00	2130.31	2026-01-28 17:35:48.604824+00
3ac10c48-bc3d-4e1f-8617-340eb90aae39	621ca208-c695-47e8-93e8-303bdd4d9966	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	1806.1300	1806.13	0.00	1806.13	2026-01-28 17:35:48.608142+00
073dcb3b-f538-4a12-b4ea-185889458a2b	621ca208-c695-47e8-93e8-303bdd4d9966	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	2199.7700	2199.77	0.00	2199.77	2026-01-28 17:35:48.611876+00
94bda49e-6596-4515-9491-97f2ff548bea	621ca208-c695-47e8-93e8-303bdd4d9966	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	2315.5600	2315.56	0.00	2315.56	2026-01-28 17:35:48.61691+00
\.


--
-- Data for Name: settlements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settlements (id, property_id, year, status, gesamtausgaben, gesamtvorschuss, differenz, berechnungs_datum, versand_datum, pdf_url, notes, created_by, created_at, updated_at) FROM stdin;
621ca208-c695-47e8-93e8-303bdd4d9966	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	2025	abgeschlossen	16240.00	7080.00	-9160.00	2026-01-25 07:24:34.378+00	\N	\N	Leerstandskosten: €234.56 gehen auf Eigentümer Maria Eigentümer	\N	2026-01-25 07:24:34.381109+00	2026-01-28 17:35:50.786+00
\.


--
-- Data for Name: tenant_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_documents (id, tenant_id, organization_id, name, category, file_url, file_size, mime_type, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (id, unit_id, first_name, last_name, email, phone, mobile_phone, status, mietbeginn, mietende, grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss, kaution, kaution_bezahlt, iban, bic, sepa_mandat, sepa_mandat_datum, notes, created_at, updated_at, deleted_at, wasserkosten_vorschuss, sonstige_kosten, warmwasserkosten_vorschuss) FROM stdin;
2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	Hans	Müller	hans.müller@beispiel.at	+43 1 100200300	\N	aktiv	2022-01-01	\N	650.00	120.00	80.00	1950.00	t	AT61 1234 5678 9012 3456	\N	t	2022-01-01	\N	2026-01-25 07:18:51.61032+00	2026-01-25 07:18:51.61032+00	\N	0.00	\N	0.00
1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	Anna	Schmidt	anna.schmidt@beispiel.at	+43 1 101201301	\N	aktiv	2021-06-01	\N	650.00	120.00	80.00	1950.00	t	AT61 1234 5678 9012 3457	\N	t	2021-06-01	\N	2026-01-25 07:18:51.61032+00	2026-01-25 07:18:51.61032+00	\N	0.00	\N	0.00
4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	Peter	Huber	peter.huber@beispiel.at	+43 1 102202302	\N	beendet	2020-03-01	2025-03-31	650.00	120.00	80.00	1950.00	t	AT61 1234 5678 9012 3458	\N	t	2020-03-01	\N	2026-01-25 07:18:51.61032+00	2026-01-25 07:18:51.61032+00	\N	0.00	\N	0.00
49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	Lisa	Neumieter	lisa.neumieter@beispiel.at	+43 1 103203303	\N	aktiv	2025-05-01	\N	650.00	120.00	80.00	1950.00	t	AT61 1234 5678 9012 3459	\N	t	2025-05-01	\N	2026-01-25 07:18:51.61032+00	2026-01-25 07:18:51.61032+00	\N	0.00	\N	0.00
809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	Franz	Zahlungssäumig	franz.zahlungssäumig@beispiel.at	+43 1 104204304	\N	aktiv	2023-09-01	\N	650.00	120.00	80.00	1950.00	t	AT61 1234 5678 9012 3460	\N	t	2023-09-01	\N	2026-01-25 07:18:51.61032+00	2026-01-25 07:18:51.61032+00	\N	0.00	\N	0.00
bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	Claudia	Bauer	claudia.bauer@beispiel.at	+43 1 105205305	\N	aktiv	2019-11-01	\N	650.00	120.00	80.00	1950.00	t	AT61 1234 5678 9012 3461	\N	t	2019-11-01	\N	2026-01-25 07:18:51.61032+00	2026-01-25 07:18:51.61032+00	\N	0.00	\N	0.00
80f828f3-694a-4b42-a784-064dc44d4132	ef29792d-0198-44e7-b28f-b3d4c477c612	Jamal	Al Karwani	\N	\N	\N	aktiv	2024-02-01	\N	444.24	84.36	0.00	\N	f	\N	\N	f	\N	Nutzungsart: Geschäftslokal; BE-Nr: 3; Kunden-Nr: 00402 0003 002; Vorschreibung Monat 12/2025; Zahlung: Einzug; IBAN: AT48 2032 0321 0070 9745	2026-02-01 07:36:46.693757+00	2026-02-01 07:36:46.693757+00	\N	5.53	\N	0.00
0e11277b-19b3-4dd5-a8b4-9ad70e62d52d	583849e1-06a8-486d-a9d4-d1dd0f38f2a1	Gizella	Füzi	\N	\N	\N	aktiv	2021-03-15	\N	302.32	183.16	0.00	\N	f	\N	\N	f	\N	Nutzungsart: Wohnung; Geschoß: 1. OG; BE-Nr: 4; Kunden-Nr: 00402 0004 001; Vorschreibung Monat 12/2025; Zahlungsart: Zahlschein; Betriebskosten Lift: 13.81	2026-02-01 07:36:46.856976+00	2026-02-01 07:36:46.856976+00	\N	12.01	\N	0.00
d213f162-ca89-478b-af80-f0d7e39e102e	572d89f1-e239-4e99-87ad-25a88a7fe70f	Nadja	Plavac	\N	\N	\N	aktiv	2005-05-01	\N	396.73	36.65	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr. 5; Verrechnung ab 2022-01-01; Zahlungsart: Zahlschein; weitere Posten: Betriebskosten 40,83; Betriebskosten Lift 7,68; Warmwasser 11,34.	2026-02-01 07:36:47.197698+00	2026-02-01 07:36:47.197698+00	\N	24.43	\N	0.00
db5c3d17-19fc-4f12-ad8f-5212e0d4d69e	1ca9f5e6-c672-4209-884b-85b490ace091	Mihai-Alexandru	Ipatoaei	\N	\N	\N	aktiv	2018-06-15	\N	461.11	48.37	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr. 6; Verrechnung ab 2022-01-01; Zahlungsart: Einzug; IBAN: AT44 6000 0404 1010 3232 (Oesterreichische Postsparkasse); weitere Posten: Betriebskosten 53,90; Betriebskosten Lift 10,14; Warmwasser 38,25.	2026-02-01 07:36:47.498814+00	2026-02-01 07:36:47.498814+00	\N	32.25	\N	0.00
6ad82287-c2d0-4850-9679-96eab3bf39c1	fb6fbfd3-819e-4e37-938f-b204d9488037	Ioan-Marius	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	69.01	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Stiege/Tür-Nr.: 1.OG/004; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025	2026-02-01 07:36:47.66304+00	2026-02-01 07:36:47.66304+00	\N	7.05	\N	0.00
c8fefc1a-ccd3-46b6-bb9a-558cb85c6f88	fb6fbfd3-819e-4e37-938f-b204d9488037	Alexandra	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	69.01	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Stiege/Tür-Nr.: 1.OG/004; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025	2026-02-01 07:36:47.81423+00	2026-02-01 07:36:47.81423+00	\N	7.05	\N	0.00
33105205-38f8-44e5-9b09-0ce944228729	6cb3027b-7a6f-4b14-9d1e-ce484094a9fd	Madeleine	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	34.36	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Stiege/Tür-Nr.: 2.OG/005; Befristung: 2027-12-08; Beendigung zum: 2026-03-31 (Beendigungsart: Aufkündigung durch Benutzer); Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025	2026-02-01 07:36:47.964696+00	2026-02-01 07:36:47.964696+00	\N	7.47	\N	0.00
151eda3b-c9c0-44e2-9d51-8e1137b3287e	6cb3027b-7a6f-4b14-9d1e-ce484094a9fd	Christina	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	34.36	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Stiege/Tür-Nr.: 2.OG/005; Befristung: 2027-12-08; Beendigung zum: 2026-03-31 (Beendigungsart: Aufkündigung durch Benutzer); Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025	2026-02-01 07:36:48.128409+00	2026-02-01 07:36:48.128409+00	\N	7.47	\N	0.00
dba809d8-ef24-4c58-b27c-70cef6cb150e	6ae715bb-e249-4b1d-bdb4-38a6f2389637	Iustinian	Adavidoae	\N	\N	\N	aktiv	2023-11-01	\N	305.90	61.07	0.00	\N	f	\N	\N	f	\N	BE-Nr. 9; Nutzung: Wohnung; Geschoss: 2. OG; Stiege/Tür: 2.OG/006; Vertragsbeginn: 01.11.2023; Befristung bis: 31.10.2026; Kündigungsverzicht bis: 31.10.2024; Summe brutto: 459,99	2026-02-01 07:36:48.429693+00	2026-02-01 07:36:48.429693+00	\N	0.00	\N	0.00
3093681b-f89b-42e3-a218-49b4dc213763	f72b9c2e-208b-46eb-8ce3-724af756d9cf	Cengiz	Kesgin	\N	\N	\N	aktiv	2025-06-16	\N	325.00	67.03	0.00	\N	f	\N	\N	f	\N	BE-Nr. 10; Nutzung: Wohnung; Geschoss: 2. OG; Stiege/Tür: 2.OG/007; Vertragsbeginn: 16.06.2025; Befristung bis: 15.06.2028; Kündigungsverzicht bis: 15.06.2026; Summe brutto: 498,43	2026-02-01 07:36:48.741565+00	2026-02-01 07:36:48.741565+00	\N	0.00	\N	0.00
2af43f4d-5880-4906-abb5-d42dd6f68be8	4a3439ed-0a5c-4f55-8010-1eb952760d3b	Wolfgang	Raab	\N	\N	\N	aktiv	2013-11-01	\N	414.31	54.85	0.00	\N	f	\N	\N	f	\N	BE-Nr. 11; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/008; Vorschreibung Monat 12/2025; Kunden-Nr.: 00402 0011 001; Verrechnung ab: 2022-01-01; Zahlungsart: Einzug; BK-Lift 10,31; Betriebskosten2 (inkl. Stellplätze) 49,22; Kaltwasser 1 32,82; Summe brutto 670,19	2026-02-01 07:36:48.915751+00	2026-02-01 07:36:48.915751+00	\N	5.10	\N	0.00
593c13c8-1e8f-45f5-b483-3391c7bf341f	444918e8-7ff8-4a3b-8cba-01a2c8aee296	Katharina	Stiefmüller	\N	\N	\N	aktiv	2012-05-01	\N	410.31	47.53	0.00	\N	f	\N	\N	f	\N	BE-Nr. 12; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/009; Vorschreibung Monat 12/2025; Kunden-Nr.: 00402 0012 001; Verrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; BK-Lift 8,94; Betriebskosten2 (inkl. Stellplätze) 42,65; Betriebskosten1 28,43; Summe brutto 639,40	2026-02-01 07:36:49.074673+00	2026-02-01 07:36:49.074673+00	\N	8.43	\N	0.00
a3244d56-49de-4573-a780-a94e97c4661f	dea7353a-5be9-42e8-ac2b-681688bea5c2	Darko	Terek	\N	\N	\N	aktiv	2019-08-01	\N	580.86	223.48	0.00	\N	f	\N	\N	f	\N	Weitere(r) Mieter(in): Suzana Zrinski Terek; Nutzung: Wohnung; Geschoss: 2. OG; Stiege/Tür: 2.OG/012; Verrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Befristung bis: 2028-07-31	2026-02-01 07:36:49.230499+00	2026-02-01 07:36:49.230499+00	\N	0.00	\N	0.00
5c919d53-abf9-45b8-aff6-610895d3f8a4	dea7353a-5be9-42e8-ac2b-681688bea5c2	Suzana	Zrinski Terek	\N	\N	\N	aktiv	2019-08-01	\N	580.86	223.48	0.00	\N	f	\N	\N	f	\N	Weitere(r) Mieter(in): Darko Terek; Nutzung: Wohnung; Geschoss: 2. OG; Stiege/Tür: 2.OG/012; Verrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Befristung bis: 2028-07-31	2026-02-01 07:36:49.40516+00	2026-02-01 07:36:49.40516+00	\N	0.00	\N	0.00
60402c2d-d925-45fb-9a1d-08a5934dde98	4d958a39-e9de-407e-8605-5d63237e29c0	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	306.50	104.92	0.00	\N	f	\N	\N	f	\N	Nutzung: Wohnung; Geschoss: 3. OG; Stiege/Tür: 3.OG/013; Verrechnung ab: 2024-12-01; Zahlungsart: Dauerauftrag; Befristung bis: 2027-11-30	2026-02-01 07:36:49.585899+00	2026-02-01 07:36:49.585899+00	\N	0.00	\N	0.00
23c8f866-7d72-4d5f-930d-92d8a33d9c88	3982e6b9-6911-43c0-ad60-0506001b02d8	Ali Reza	ARYA	\N	\N	\N	aktiv	2024-12-01	\N	266.05	90.82	0.00	\N	f	\N	\N	f	\N	BE-Nr. 17; Nutzung: Wohnung; Geschoss: 3. OG; Stiege/Tür-Nr.: 3.OG/014; Vertragsbeginn: 2024-12-01; Befristung: 2027-11-30; Summe: 430.04	2026-02-01 07:36:49.926556+00	2026-02-01 07:36:49.926556+00	\N	19.31	\N	0.00
e46e8b08-6b98-47fa-8e5d-65a4998d107f	698340e1-1fc6-4b48-8517-3c525d8b0399	A.L.	GmbH	\N	\N	\N	aktiv	2023-02-01	\N	322.63	103.34	0.00	\N	f	\N	\N	f	\N	BE-Nr. 18; Nutzung: Wohnung; Geschoss: 3. OG; Stiege/Tür-Nr.: 3.OG/015; Vertragsbeginn: 2023-02-01; Befristung: 2028-01-31; Zahlungsart: Einzug; IBAN: AT43 3477 0000 0578 8484; Bank: RAIFFEISENBANK WELS SUED; Summe: 499.98	2026-02-01 07:36:50.239637+00	2026-02-01 07:36:50.239637+00	\N	21.12	\N	0.00
51eb3367-6564-4299-ac75-e836397051d8	91bbf7b1-1444-4060-b03d-67989b387bd6	Aja	Muhandes	\N	\N	\N	aktiv	2025-04-01	\N	281.28	49.22	0.00	\N	f	\N	\N	f	\N	BE-Nr. 19; Geschoss 3. OG; Stiege/Tür-Nr.: 3.OG/016; Befristung bis 2028-03-31; weitere Positionen: Betriebskosten 2=32.82, Betriebskosten=54.85, Lift=10.31; Mahnkosten 15.00 separat ausgewiesen	2026-02-01 07:36:50.394878+00	2026-02-01 07:36:50.394878+00	\N	11.21	\N	0.00
27547202-6d54-4071-b087-4268a003f5bd	1f38e7ad-c4d5-4822-8c18-fa165dab4b80	Perihan	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	140.72	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr. 22; Geschoss 3. OG; Stiege/Tür: 3.OG/019; Befristung bis 2028-10-31; Zahlungsart: Dauerauftrag; Verrechnung ab 2022-11-01; Summe brutto 686.91; Kunden-Nr. 00402 0022 005	2026-02-01 07:36:50.551006+00	2026-02-01 07:36:50.551006+00	\N	19.10	\N	0.00
fee3b99a-4261-4251-a4e8-4050bab6957f	1f38e7ad-c4d5-4822-8c18-fa165dab4b80	Hüsmen	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	140.72	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr. 22; Geschoss 3. OG; Stiege/Tür: 3.OG/019; Befristung bis 2028-10-31; Zahlungsart: Dauerauftrag; Verrechnung ab 2022-11-01; Summe brutto 686.91; Kunden-Nr. 00402 0022 005	2026-02-01 07:36:50.708934+00	2026-02-01 07:36:50.708934+00	\N	19.10	\N	0.00
cb7b8043-cfad-4cf1-9708-03d491a217c7	b272bf88-f87d-4800-bd36-c8fe6e8d244c	Timo	Hennes	\N	\N	\N	aktiv	2023-04-01	\N	681.02	202.55	0.00	\N	f	\N	\N	f	\N	BE-Nr. 23; Geschoss: 3. OG; Stiege/Tür-Nr.: 3.OG/020; Vertragsbeginn: 01.04.2023; Befristung: 31.03.2026; Kündigungsverzicht bis: 31.03.2024; Zahlungsart: Zahlschein; Summe brutto: 1104.80; Netto: 999.97	2026-02-01 07:36:50.867437+00	2026-02-01 07:36:50.867437+00	\N	8.43	\N	0.00
96705457-88cc-49eb-a978-50ca8fe52908	4223f474-6f6c-4efe-8d44-064f99079a0a	Monika	Mühlberger	\N	\N	\N	aktiv	2022-12-10	\N	381.29	114.89	0.00	\N	f	\N	\N	f	\N	BE-Nr. 24; Stiege/Tür-Nr.: /021; Vertragsbeginn: 10.12.2022; Befristung: 09.12.2028; Zahlungsart: Einzug; IBAN: AT10 2032 0322 0253 6955; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Summe brutto: 617.76; Netto: 557.49	2026-02-01 07:36:51.029721+00	2026-02-01 07:36:51.029721+00	\N	15.74	\N	0.00
1107db29-079d-4144-ae27-ba52dcf06c57	4223f474-6f6c-4efe-8d44-064f99079a0a	Anna	Ragauer	\N	\N	\N	aktiv	2022-12-10	\N	381.29	114.89	0.00	\N	f	\N	\N	f	\N	BE-Nr. 24 (Mitmieterin); Stiege/Tür-Nr.: /021; Vertragsbeginn: 10.12.2022; Befristung: 09.12.2028; Zahlungsart: Einzug; IBAN: AT10 2032 0322 0253 6955; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Summe brutto: 617.76; Netto: 557.49	2026-02-01 07:36:51.181169+00	2026-02-01 07:36:51.181169+00	\N	15.74	\N	0.00
4e838545-4f29-4416-858e-da1d404af364	b68a4a2d-0352-4438-9616-3c85a137c870	Ioan-Marius	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	146.90	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Nutzung: Wohnung; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/004; Zahlungsart: Dauerauftrag	2026-02-01 07:56:59.58493+00	2026-02-01 07:56:59.58493+00	\N	46.00	\N	0.00
26c7bb97-232c-4eaf-8392-9ac9dce5df43	b68a4a2d-0352-4438-9616-3c85a137c870	Alexandra	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	146.90	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Nutzung: Wohnung; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/004; Zahlungsart: Dauerauftrag	2026-02-01 07:56:59.759852+00	2026-02-01 07:56:59.759852+00	\N	46.00	\N	0.00
57457c80-8a3d-49b9-896f-0b6cfa32880f	9f3bb2b5-beed-4491-8d74-184bcabd8527	A.L.	GmbH	\N	\N	\N	aktiv	2024-07-01	\N	318.66	91.26	0.00	\N	f	\N	\N	f	\N	BE-Nr. 25; Kunden-Nr. 00402 0025 005; Befristung bis 2027-06-30; Kündigungsverzicht bis 2025-06-30; Zahlungsart: Einzug; Bank: Raiffeisenbank Wels Sued; IBAN: AT43 3477 0000 0578 8484; Summe brutto 478.36	2026-02-01 07:36:51.494666+00	2026-02-01 07:36:51.494666+00	\N	7.14	\N	0.00
f551a2e5-1dd3-4260-b1e6-94a9ecad61aa	f2b93d88-3f17-43ac-bb0f-e0ea8da19732	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	552.34	225.50	0.00	\N	f	\N	\N	f	\N	BE-Nr. 26; Kunden-Nr. 00402 0026 005; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Zahlungsart: Dauerauftrag; Summe brutto 920.62; weiterer Mieter: Oliver Weiß	2026-02-01 07:36:51.651997+00	2026-02-01 07:36:51.651997+00	\N	17.79	\N	0.00
25669e2d-b4c1-4cbf-a357-eb3cc1445e89	f2b93d88-3f17-43ac-bb0f-e0ea8da19732	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	552.34	225.50	0.00	\N	f	\N	\N	f	\N	BE-Nr. 26; Kunden-Nr. 00402 0026 005; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Zahlungsart: Dauerauftrag; Summe brutto 920.62; weiterer Mieter: Fabian Waischner	2026-02-01 07:36:51.809723+00	2026-02-01 07:36:51.809723+00	\N	17.79	\N	0.00
4328e764-a2a2-492e-ae6d-32054251b40d	e06045aa-ced0-4891-b49b-dbc447e14237	Edina	Teuschler	\N	\N	\N	aktiv	2024-11-15	\N	540.98	64.05	0.00	\N	f	\N	\N	f	\N	BE-Nr. 27; Kunden-Nr. 00402 0027 003; Vorschreibungsliste Monat 12/2025; Betriebskosten2 57,48; Kaltwasser 38,32; Betriebskosten Lift 12,04; Zentralheizung 1 20,02; Summe brutto 820,64; Netto 744,22; Verrechnung ab 2024-11-15; Zahlungsart: Dauerauftrag.	2026-02-01 07:36:52.115591+00	2026-02-01 07:36:52.115591+00	\N	11.33	\N	0.00
8af52f15-c990-4b99-a512-2da31e31751b	813ed731-7514-43dd-8910-7f64b0857574	David	Zivko	\N	\N	\N	aktiv	2024-07-01	\N	254.60	69.31	0.00	\N	f	\N	\N	f	\N	BE-Nr. 28; Kunden-Nr. 00402 0028 003; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/002A; Vertragsbeginn 2024-07-01; Befristung bis 2027-06-30; Kündigungsverzicht bis 2025-06-30; Verrechnung ab 2024-07-01; Zahlungsart: Dauerauftrag; Betriebskosten2 62,20; Betriebskosten Lift 13,03; Warmwasser 20,26; Summe brutto 584,10; Netto 525,15.	2026-02-01 07:36:52.431701+00	2026-02-01 07:36:52.431701+00	\N	41.47	\N	0.00
05227f38-4c24-49e6-b241-e1fe003c13a8	f52af7a2-9364-4683-a10c-88ce5d7c6854	Nadja	Bamberger	\N	\N	\N	aktiv	2020-06-15	\N	381.95	115.80	0.00	\N	f	\N	\N	f	\N	BE-Nr. 29; Nutzung: Wohnung; Geschoss: 1. OG; Verrechnung ab 2022-01-01; Befristung bis 2026-06-14; Kündigungsverzicht bis 2024-06-14; Vorschreibung 12/2025; Zahlart: Zahlschein; Posten: Hauptmietzins 381,95; BK 54,77 + 61,03; Kaltwasser 36,51; Betriebskosten Lift 11,48; Warmwasser 8,92; Zentralheizung 38,76; Summe brutto 656,64	2026-02-01 07:36:52.591454+00	2026-02-01 07:36:52.591454+00	\N	0.00	\N	0.00
02950e82-61b4-45e2-91e2-9b89dfbe466e	f406cc40-5c38-4874-824b-850a0cd5acbf	MAX	Orient OG	\N	\N	\N	aktiv	2022-01-01	\N	95.59	20.04	0.00	\N	f	\N	\N	f	\N	BE-Nr. 31; Nutzung: Garagenstellplatz; Verrechnung ab 2022-01-01; Zahlart: Einzug; IBAN: AT40 2031 7077 0117 6062; Bank: SPARKASSE LAMBACH BANK AKTIENGESELLSCHAFT; Vorschreibung 12/2025; Posten: Garagenmiete 95,59; BK 14,83; Betriebskosten Garage 6,21; Summe brutto 140,20	2026-02-01 07:36:52.755959+00	2026-02-01 07:36:52.755959+00	\N	0.00	\N	0.00
3e1222e8-42e8-4b5b-b6a3-8cf7b5a5a3e4	e0ecd724-fa78-4278-8db4-e823115bf428	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	46.45	14.14	0.00	\N	f	\N	\N	f	\N	BE-Nr. 35; Nutzungsart: Garagenstellplatz; Vertragbeginn 2024-12-01; Befristung bis 2027-11-30; Verrechnung ab 2024-12-01; Zahlungsart: Dauerauftrag; Betriebskosten Garage 6.41; Summe 80.40	2026-02-01 07:36:52.922529+00	2026-02-01 07:36:52.922529+00	\N	0.00	\N	0.00
46b68e89-389e-4f84-b73d-0e14bd8eaf39	865ad5a1-43cd-4bf1-b303-07cfd951672e	Norikum	Wohnungsbau-gesellschaft m.b.H.	\N	\N	\N	aktiv	2022-01-01	\N	0.00	16.57	0.00	\N	f	\N	\N	f	\N	BE-Nr. 36; Nutzungsart: Garagenstellplatz; Vertragbeginn 2022-01-01; Verrechnung ab 2022-01-01; Zahlungsart: Dauerauftrag; Betriebskosten Garage 6.41; Summe 27.58	2026-02-01 07:36:53.229665+00	2026-02-01 07:36:53.229665+00	\N	0.00	\N	0.00
15aa9064-8d89-47ce-ac61-253df1b20b72	88f6f992-9364-48d9-8452-d88d3210c594	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	16.57	0.00	\N	f	\N	\N	f	\N	BE-Nr. 37; Nutzungsart: Garagenstellplatz; Vertragbeginn 2019-10-01; Befristung bis 2028-09-30; Verrechnung ab 2022-01-01; Zahlungsart: Zahlschein; Betriebskosten Garage 6.41; Summe 111.80	2026-02-01 07:36:53.395994+00	2026-02-01 07:36:53.395994+00	\N	0.00	\N	0.00
ee198d15-962c-4671-b787-29592f75be87	14e28a5c-d583-43bf-a091-aebcaedec42c	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	13.25	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); Nutzungsart: Garagenstellplatz; BE-Nr. 38; Zahlungsart: Zahlschein; Befristung: 2028-09-30; Verrechnung ab: 2022-01-01; BK Garage: 6.41; USt 20%: 17.97; Summe brutto: 107.82	2026-02-01 07:36:53.563256+00	2026-02-01 07:36:53.563256+00	\N	0.00	\N	0.00
1831853e-5a28-48f4-ac65-51b6c7b8ecef	47bd43c9-5e04-4213-96c9-6953adc2774c	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	61.86	14.04	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); Nutzungsart: Garagenstellplatz; BE-Nr. 39; Hauptmieter(in); Zahlungsart: Dauerauftrag; Befristung: 2026-11-30; Verrechnung ab: 2023-12-01; BK Garage: 6.41; USt 20%: 16.46; Summe brutto: 98.77	2026-02-01 07:36:53.719325+00	2026-02-01 07:36:53.719325+00	\N	0.00	\N	0.00
b02fba5e-f2e6-4887-b4b9-4c637b9aadf9	47bd43c9-5e04-4213-96c9-6953adc2774c	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	61.86	14.04	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); Nutzungsart: Garagenstellplatz; BE-Nr. 39; (mit Fabian Waischner gemeinsam angeführt); Zahlungsart: Dauerauftrag; Befristung: 2026-11-30; Verrechnung ab: 2023-12-01; BK Garage: 6.41; USt 20%: 16.46; Summe brutto: 98.77	2026-02-01 07:36:53.87783+00	2026-02-01 07:36:53.87783+00	\N	0.00	\N	0.00
40160c69-4f41-47ac-8274-2d42e5bc25cc	c8038478-95dd-4c89-b0b8-66b7ffbe83b1	Norikum	Wohnungsbau-gesellschaft m.b.H.	\N	\N	\N	aktiv	2022-09-13	\N	0.00	14.04	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); Nutzungsart: Garagenstellplatz; BE-Nr. 40; Art: Mieter(in); Zahlungsart: Dauerauftrag; Verrechnung ab: 2022-09-13; BK Garage: 6.41; USt 20%: 4.09; Summe brutto: 24.54	2026-02-01 07:36:54.032156+00	2026-02-01 07:36:54.032156+00	\N	0.00	\N	0.00
2613b10c-f27c-41ad-a701-b53eb7234a23	4fe2308e-b38f-4479-957a-85ddbe3af911	Timo	Hennes	\N	\N	\N	aktiv	2023-05-01	\N	62.91	15.47	0.00	\N	f	\N	\N	f	\N	BE-Nr. 42; Nutzungsart: Garagenstellplatz; Vorschreibungsart: Standardvorschreibung; BK Garage 6,41; USt 20% 16,96; Summe 101,75	2026-02-01 07:36:54.18838+00	2026-02-01 07:36:54.18838+00	\N	0.00	\N	0.00
0d47ee00-1ce8-4ec0-99c6-5d9bd7067475	ec40d134-6a14-43b4-86ad-0812eb2c32de	Vision	L & T (Mergim Izairi)	\N	\N	\N	aktiv	2024-01-15	\N	147.04	13.13	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; Nutzungsart: PKW-Freiplatz; BE-Nr. 44; Vertragsbeginn 15.01.2024; Befristung bis 14.01.2027; Zahlungart: Dauerauftrag; Summe brutto 192.20 (Netto 160.17).	2026-02-01 07:36:54.340301+00	2026-02-01 07:36:54.340301+00	\N	0.00	\N	0.00
02762f22-b518-44bd-9d9a-2f00c662929e	6bdf083b-17a9-4fd0-ac88-2aaff4ca1669	MAX	Orient	\N	\N	\N	aktiv	2022-01-01	\N	1080.70	160.44	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Noricum Wohnbauträger GmbH); Nutzung: Geschäftslokal; Kunden-Nr.: 00402 0001 001; Vorschreibung 12/2025; USt 20%.	2026-02-01 07:56:57.520203+00	2026-02-01 07:56:57.520203+00	\N	50.65	\N	0.00
5de26d96-7d5e-456b-80a3-bc7a76c83f72	edb211cc-8590-4e66-b6c1-19273b2f367a	Vision	L & T (Mergim Tzairi)	\N	\N	\N	aktiv	2024-01-15	\N	1333.64	268.82	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Noricum Wohnbauträger GmbH); Nutzung: Geschäftslokal; Kunden-Nr.: 00402 0002 003; Vertragsbefristung bis 2027-01-14; Kündigungsverzicht bis 2028-01-31; Vorschreibung 12/2025; USt 20%.	2026-02-01 07:56:57.886657+00	2026-02-01 07:56:57.886657+00	\N	100.53	\N	0.00
b19c4094-c2b2-44d1-b611-d7c93764ec1d	011b1d76-d2cc-49a4-84a7-634a1c2e8e5b	Jamal	Al Karwani	\N	\N	\N	aktiv	2024-02-01	\N	444.24	84.36	0.00	\N	f	\N	\N	f	\N	BE-Nr. 3; Nutzungsart: Geschäftslokal; Verrechnung ab: 2024-02-01; Kündigungsverzicht bis: 2025-02-28	2026-02-01 07:56:58.225251+00	2026-02-01 07:56:58.225251+00	\N	26.60	\N	0.00
05223d9c-d281-4e45-8488-960c9f8d1d5d	09e6fffc-5ca8-4549-bc96-a2136df317c4	Gizella	Füzi	\N	\N	\N	aktiv	2021-03-15	\N	302.32	139.62	0.00	\N	f	\N	\N	f	\N	BE-Nr. 4; Nutzungsart: Wohnung; Geschoß: 1. OG; Verrechnung ab: 2022-01-01; Befristung: 2027-03-14; Kündigungsverzicht bis: 2022-03-14	2026-02-01 07:56:58.565595+00	2026-02-01 07:56:58.565595+00	\N	43.93	\N	0.00
a69d3f46-be63-48e6-b10f-ae87976154a6	ddac049a-76d0-47bc-888a-98afc6f30922	Nadja	Plavac	\N	\N	\N	aktiv	2005-05-01	\N	396.73	77.48	0.00	\N	f	\N	\N	f	\N	BE-Nr. 5; Geschoß: 1. OG; Stiege/Tür-Nr.: 1.OG/002; Vorschreibung Monat 12/2025; Zahlungsart: Zahlschein; Verrechnung ab: 2022-01-01; Kunden-Nr.: 00402 0005 001	2026-02-01 07:56:58.906959+00	2026-02-01 07:56:58.906959+00	\N	24.43	\N	0.00
60528da9-704a-4f04-8674-125987c41207	bbe763e9-f6e4-44b1-b386-e5e9af92c25b	Mihai-Alexandru	Ipatoaei	\N	\N	\N	aktiv	2018-06-15	\N	461.11	101.28	0.00	\N	f	\N	\N	f	\N	BE-Nr. 6; Geschoß: 1. OG; Stiege/Tür-Nr.: 1.OG/003; Vorschreibung Monat 12/2025; Zahlungsart: Einzug; Verrechnung ab: 2022-01-01; IBAN: AT44 6000 0404 1010 3232; Bank: OESTERREICHISCHE POSTSPARKASSE; Kunden-Nr.: 00402 0006 001	2026-02-01 07:56:59.248885+00	2026-02-01 07:56:59.248885+00	\N	32.25	\N	0.00
9798b91a-fdc4-4f7b-8817-b1deab26acbf	4abf365a-e5a7-4ceb-9408-28f4f1becc32	Madeleine	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	63.14	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Nutzung: Wohnung; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/005; Befristung bis: 2027-12-08; Beendigung zum: 2026-03-31; Beendigungsart: Aufkündigung durch Benutzer; Zahlungsart: Dauerauftrag	2026-02-01 07:57:00.108709+00	2026-02-01 07:57:00.108709+00	\N	22.90	\N	0.00
b2af6932-2fd7-4a96-a16a-585a1b7e3c30	4abf365a-e5a7-4ceb-9408-28f4f1becc32	Christina	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	63.14	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Nutzung: Wohnung; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/005; Befristung bis: 2027-12-08; Beendigung zum: 2026-03-31; Beendigungsart: Aufkündigung durch Benutzer; Zahlungsart: Dauerauftrag	2026-02-01 07:57:00.273369+00	2026-02-01 07:57:00.273369+00	\N	22.90	\N	0.00
b359b840-ebe3-420e-bcb3-8c29dcc88bc8	fb801654-0138-448d-a7e5-7058c7d4559d	Iustinian	Adavidoae	\N	\N	\N	aktiv	2023-11-01	\N	305.90	67.25	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr. 9; Geschoss 2. OG; Stiege/Tür-Nr.: 2.OG/006; Befristung bis 31.10.2026	2026-02-01 07:57:00.605536+00	2026-02-01 07:57:00.605536+00	\N	19.31	\N	0.00
65a79c56-1ced-4544-adee-d5f16a300aef	6814329e-943b-41ed-b4cd-52782e04d6b1	Cengiz	Kesgin	\N	\N	\N	aktiv	2025-06-16	\N	325.00	88.92	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr. 10; Geschoss 2. OG; Stiege/Tür-Nr.: 2.OG/007; Befristung bis 15.06.2028	2026-02-01 07:57:00.937683+00	2026-02-01 07:57:00.937683+00	\N	21.12	\N	0.00
bc2677e3-1afe-4a47-ac5b-5d8239cff2d4	a71ae3c1-8d4a-42fe-a22f-68b95f181a29	Wolfgang	Raab	\N	\N	\N	aktiv	2013-11-01	\N	414.31	64.77	0.00	\N	f	\N	\N	f	\N	BE-Nr. 11; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/008; Zahlungsart: Einzug; Vorschreibungsmonat: 12/2025	2026-02-01 07:57:01.270131+00	2026-02-01 07:57:01.270131+00	\N	32.82	\N	0.00
287cea78-5796-4d07-9ccd-190cc688f149	ec0484d3-d35e-4bfb-bc7e-cdcd92591e20	Katharina	Stiefmüller	\N	\N	\N	aktiv	2012-05-01	\N	410.31	66.06	0.00	\N	f	\N	\N	f	\N	BE-Nr. 12; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/009; Zahlungsart: Zahlschein; Vorschreibungsmonat: 12/2025	2026-02-01 07:57:01.60781+00	2026-02-01 07:57:01.60781+00	\N	28.43	\N	0.00
d877fcfd-929a-4009-a22e-f1c1c6631ded	9d4e62dc-188c-47cf-baa7-7190e2375637	Darko	Terek	\N	\N	\N	aktiv	2019-08-01	\N	580.86	145.90	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7. Weitere/r Mieter/in laut Liste: Suzana Zrinski Terek. Abrechnung: 01.01.2022. Zahlungsart: Zahlschein. Befristung bis 2028-07-31. Stiege/Tür: 2.OG/012.	2026-02-01 07:57:01.939465+00	2026-02-01 07:57:01.939465+00	\N	46.00	\N	0.00
7b6a4a0b-57c7-4fff-96a4-dbb33df0761c	9d4e62dc-188c-47cf-baa7-7190e2375637	Suzana	Zrinski Terek	\N	\N	\N	aktiv	2019-08-01	\N	580.86	145.90	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7. Mitmieter/in mit Darko Terek. Abrechnung: 01.01.2022. Zahlungsart: Zahlschein. Befristung bis 2028-07-31. Stiege/Tür: 2.OG/012.	2026-02-01 07:57:02.135894+00	2026-02-01 07:57:02.135894+00	\N	46.00	\N	0.00
30b8e365-9e64-4776-8553-8d779bd94729	7e9cd53a-96da-4672-ae9e-50ab3495593b	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	306.50	99.06	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7. Abrechnung: 01.12.2024. Zahlungsart: Dauerauftrag. Befristung bis 2027-11-30. Stiege/Tür: 3.OG/013.	2026-02-01 07:57:02.470056+00	2026-02-01 07:57:02.470056+00	\N	22.90	\N	0.00
5a022a89-648a-41fe-ade2-c44076407faf	f2aef802-b70a-4597-af6b-3272b69bc494	Ali Reza	ARYA	\N	\N	\N	aktiv	2024-12-01	\N	266.05	61.23	0.00	\N	f	\N	\N	f	\N	BE-Nr. 17; Kunden-Nr. 00402 0017 005; Geschoss 3. OG; Stiege/Tür-Nr.: 3.OG/014; Befristung bis 2027-11-30; Zahlungsart: Dauerauftrag; Vorschreibungsliste Monat 12/2025; Summe 430.04 (Netto 388.27).	2026-02-01 07:57:02.790865+00	2026-02-01 07:57:02.790865+00	\N	19.31	\N	0.00
9535998f-672a-4c68-b834-e5b60ab7e46d	166b85e3-e7df-4e0d-a558-2cf23dda1a2f	A.L.	GmbH	\N	\N	\N	aktiv	2023-02-01	\N	322.63	66.47	0.00	\N	f	\N	\N	f	\N	BE-Nr. 18; Kunden-Nr. 00402 0018 003; Geschoss 3. OG; Stiege/Tür-Nr.: 3.OG/015; Befristung bis 2028-01-31; Zahlungsart: Einzug; IBAN: AT43 3477 0000 0578 8484 (RAIFFEISENBANK WELS SUED); Vorschreibungsliste Monat 12/2025; Summe 499.98 (Netto 452.28).	2026-02-01 07:57:03.121689+00	2026-02-01 07:57:03.121689+00	\N	21.12	\N	0.00
eef35458-25aa-4a2e-a150-5f8580b23e54	05fcbe77-7790-4af2-b630-ac076af05b96	Aja	Muhandes	\N	\N	\N	aktiv	2025-04-01	\N	281.28	136.80	0.00	\N	f	\N	\N	f	\N	BE-Nr 19; Geschoss 3. OG; Befristung bis 2028-03-31; Stiege/Tür-Nr 3.OG/016	2026-02-01 07:57:03.461026+00	2026-02-01 07:57:03.461026+00	\N	32.82	\N	0.00
2b0d30a7-0199-480b-a4d9-d54182aa402a	d2a0389d-0d33-4923-81ca-46f085d77f89	A.L.	GmbH	\N	\N	\N	aktiv	2024-06-01	\N	348.04	78.34	0.00	\N	f	\N	\N	f	\N	BE-Nr. 21; Nutzungsart: Wohnung; Geschoß: 3. OG; Stiege/Tür-Nr.: 3.OG/018; Kunden-Nr.: 00402 0021 006; Vertragsbeginn: 01.06.2024; Befristung: 31.05.2027; Kündigungsverzicht bis: 31.05.2025; Vorschreibungsmonat: 12/2025; Summe brutto: 545.66; Netto: 493.48	2026-02-01 07:57:03.796383+00	2026-02-01 07:57:03.796383+00	\N	24.70	\N	0.00
a01fb993-54d0-4097-a242-e08d3b8fdeb1	02f70964-d306-4161-b605-fc6e94d82d1b	Perihan	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	86.42	0.00	\N	f	\N	\N	f	\N	BE-Nr. 22; Nutzungsart: Wohnung; Geschoß: 3. OG; Stiege/Tür-Nr.: 3.OG/019; Kunden-Nr.: 00402 0022 005; Verrechnung ab: 01.11.2022; Befristung: 31.10.2028; Vorschreibungsmonat: 12/2025; Summe brutto: 686.91; Netto: 618.55; Weitere Person im Dokument: Hüsmen Güven	2026-02-01 07:57:04.125472+00	2026-02-01 07:57:04.125472+00	\N	32.31	\N	0.00
8e61cbaa-9fb3-4fa3-9e38-763b6f59379a	02f70964-d306-4161-b605-fc6e94d82d1b	Hüsmen	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	86.42	0.00	\N	f	\N	\N	f	\N	BE-Nr. 22; Nutzungsart: Wohnung; Geschoß: 3. OG; Stiege/Tür-Nr.: 3.OG/019; Kunden-Nr.: 00402 0022 005; Verrechnung ab: 01.11.2022; Befristung: 31.10.2028; Vorschreibungsmonat: 12/2025; Summe brutto: 686.91; Netto: 618.55; Weitere Person im Dokument: Perihan Güven	2026-02-01 07:57:04.295368+00	2026-02-01 07:57:04.295368+00	\N	32.31	\N	0.00
18b3d3af-a77b-4012-b055-85c5e0a1152f	21cc105e-5006-41fb-93ca-8b14a89444fe	Timo	Hennes	\N	\N	\N	aktiv	2023-04-01	\N	681.02	193.10	0.00	\N	f	\N	\N	f	\N	BE-Nr. 23; Stiege/Tür-Nr.: 3.OG/020; Vorschreibungsliste Monat 12/2025; Befristung bis 2026-03-31; Kündigungsverzicht bis 2024-03-31	2026-02-01 07:57:04.616223+00	2026-02-01 07:57:04.616223+00	\N	58.44	\N	0.00
c981c77c-47e6-4880-80a7-b017dcbf6e12	6cd726fb-48bd-4c4e-b478-452abe50e4f3	Monika	Mühlberger	\N	\N	\N	aktiv	2022-12-10	\N	381.29	81.75	0.00	\N	f	\N	\N	f	\N	BE-Nr. 24; Stiege/Tür-Nr.: /021; Vorschreibungsliste Monat 12/2025; Befristung bis 2028-12-09	2026-02-01 07:57:04.95092+00	2026-02-01 07:57:04.95092+00	\N	25.68	\N	0.00
734b1546-2cee-4937-823a-79c61e3100f3	6cd726fb-48bd-4c4e-b478-452abe50e4f3	Anna	Ragauer	\N	\N	\N	aktiv	2022-12-10	\N	381.29	81.75	0.00	\N	f	\N	\N	f	\N	BE-Nr. 24; Stiege/Tür-Nr.: /021; Vorschreibungsliste Monat 12/2025; Befristung bis 2028-12-09	2026-02-01 07:57:05.116534+00	2026-02-01 07:57:05.116534+00	\N	25.68	\N	0.00
52dcb392-850b-43a8-8e81-118edb28f98b	f73428ec-57e1-4139-ae34-5f570ab0d7ca	A.L.	GmbH	\N	\N	\N	aktiv	2024-07-01	\N	318.66	38.05	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr. 25; Kunden-Nr. 00402 0025 005; Befristung bis 2027-06-30; Kündigungsverzicht bis 2025-06-30; Zahlungsart: Einzug	2026-02-01 07:57:05.478429+00	2026-02-01 07:57:05.478429+00	\N	19.52	\N	0.00
d136ec08-5b2e-4edd-8eec-e34a5d5f85da	e25967ec-cfa3-434b-bfe5-5455e50b118e	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	552.34	152.35	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr. 26; Kunden-Nr. 00402 0026 005; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Zahlungsart: Dauerauftrag	2026-02-01 07:57:05.804663+00	2026-02-01 07:57:05.804663+00	\N	48.20	\N	0.00
6aeba986-eab2-46f0-b2e9-11df59817168	e25967ec-cfa3-434b-bfe5-5455e50b118e	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	552.34	152.35	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr. 26 (gemeinsam mit Fabian Waischner); Kunden-Nr. 00402 0026 005; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Zahlungsart: Dauerauftrag	2026-02-01 07:57:05.970999+00	2026-02-01 07:57:05.970999+00	\N	48.20	\N	0.00
7102f746-c57b-4257-84a6-9cc62f885a3a	fa254c34-81da-46b7-bf68-7a8b278efa76	Edina	Teuschler	\N	\N	\N	aktiv	2024-11-15	\N	540.98	121.53	0.00	\N	f	\N	\N	f	\N	BE-Nr. 27; Kunden-Nr. 00402 0027 003; Zahlungsart: Dauerauftrag; Vorschreibungsliste Monat 12/2025; Summe brutto 820.64 (Netto 744.22)	2026-02-01 07:57:06.33525+00	2026-02-01 07:57:06.33525+00	\N	38.32	\N	0.00
3bb1b857-63f2-42be-83b0-6476e06e1f73	73d29e6e-a080-4274-ab6a-e1dd2e3d70f2	David	Zivko	\N	\N	\N	aktiv	2024-07-01	\N	254.60	131.38	0.00	\N	f	\N	\N	f	\N	BE-Nr. 28; Kunden-Nr. 00402 0028 003; Geschoß: 1. OG; Befristung bis 2027-06-30; Kündigungsverzicht bis 2025-06-30; Zahlungsart: Dauerauftrag; Summe brutto 584.10 (Netto 525.15)	2026-02-01 07:57:06.678804+00	2026-02-01 07:57:06.678804+00	\N	41.47	\N	0.00
4bdec4f7-cf49-4de9-9742-9baafc0999ab	18403f55-7c39-4975-b527-a02f1166dc93	Nadja	Bamberger	\N	\N	\N	aktiv	2020-06-15	\N	381.95	115.80	0.00	\N	f	\N	\N	f	\N	BE-Nr. 29; Kundennr. 00402 0029 001; Nutzung: Wohnung; Geschoss: 1. OG; Stiege/Tür: 1.OG/001A; Verrechnung ab 2022-01-01; Befristung bis 2026-06-14; Kündigungsverzicht bis 2024-06-14; Vorschreibung Monat 12/2025	2026-02-01 07:57:07.013106+00	2026-02-01 07:57:07.013106+00	\N	36.51	\N	0.00
0464b0fb-6e02-403a-8441-7acd4a82ff43	fb58d735-887c-4bb8-8ff5-808c7665dd45	MAX	Orient OG	\N	\N	\N	aktiv	2022-01-01	\N	95.59	21.84	0.00	\N	f	\N	\N	f	\N	BE-Nr. 31; Kundennr. 00402 0031 001; Nutzung: Garagenstellplatz; Verrechnung ab 2022-01-01; Zahlungsart: Einzug; IBAN: AT40 2031 7077 0117 6062; Vorschreibung Monat 12/2025	2026-02-01 07:57:07.339981+00	2026-02-01 07:57:07.339981+00	\N	0.00	\N	0.00
59898125-02be-405e-bb45-5b2ac37d4245	4d2ffd4e-a662-4aa6-9a5d-289dfb1899e2	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	46.45	20.55	0.00	\N	f	\N	\N	f	\N	BE-Nr. 35; Nutzungsart: Garagenstellplatz; Vertragbeginn 01.12.2024; Befristung 30.11.2027; Zahlung: Dauerauftrag; Positionen: Garagenmiete 46,45; Betriebskosten2 14,14; Betriebskosten inkl Stellplätze/BK Garage 6,41; Summe 80,40	2026-02-01 07:57:07.669256+00	2026-02-01 07:57:07.669256+00	\N	0.00	\N	0.00
e0cda4b7-32eb-4b54-b26f-9c4716776cb7	5d1c2fb3-74e7-4739-a96a-31fd42f59208	Norikum	Wohnungsbau-gesellschaft m.b.H.	\N	\N	\N	aktiv	2022-02-01	\N	0.00	23.08	0.00	\N	f	\N	\N	f	\N	BE-Nr. 36; Nutzungsart: Garagenstellplatz; Vertragbeginn 01.01.2022; Verrechnung ab 01.02.2022; Zahlung: Dauerauftrag; Positionen: Betriebskosten2 16,57; Betriebskosten inkl Stellplätze/BK Garage 6,41; Summe 27,58	2026-02-01 07:57:07.995048+00	2026-02-01 07:57:07.995048+00	\N	0.00	\N	0.00
f1200fcc-b65b-4349-bc5e-982768b529c0	68dd6a79-6afb-47c7-9a3f-dcdbe1875ba9	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	23.08	0.00	\N	f	\N	\N	f	\N	BE-Nr. 37; Nutzungsart: Garagenstellplatz; Vertragbeginn 01.10.2019; Verrechnung ab 01.01.2022; Befristung 30.09.2028; Zahlung: Zahlschein; Positionen: Garagenmiete 70,19; Betriebskosten2 16,57; Betriebskosten inkl Stellplätze/BK Garage 6,41; Summe 111,80	2026-02-01 07:57:08.32933+00	2026-02-01 07:57:08.32933+00	\N	0.00	\N	0.00
6e46bc14-42e3-4f5d-8241-89c615ef0115	9e925d1f-81c7-4658-9cbc-b623c7f0e55a	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	19.66	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0038 001; Verrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Befristung: 2028-09-30; Kündigungsverzicht bis: 2028-09-30	2026-02-01 07:57:08.654542+00	2026-02-01 07:57:08.654542+00	\N	0.00	\N	0.00
dc004454-f0e7-4884-b407-a16b3e79e68f	cbcd2f4c-7c3a-4f55-a3f7-ce0fe8105dfc	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	61.86	18.45	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; zweiter Mieter im Dokument: Oliver Weiß; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0039 004; Verrechnung ab: 2023-12-01; Zahlungsart: Dauerauftrag; Befristung: 2026-11-30; Kündigungsverzicht bis: 2025-11-30; Art: Hauptmieter(in)	2026-02-01 07:57:08.977898+00	2026-02-01 07:57:08.977898+00	\N	0.00	\N	0.00
895521f1-5018-4065-84ee-9d706141b71f	cbcd2f4c-7c3a-4f55-a3f7-ce0fe8105dfc	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	61.86	18.45	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; gemeinsam mit Fabian Waischner; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0039 004; Verrechnung ab: 2023-12-01; Zahlungsart: Dauerauftrag; Befristung: 2026-11-30; Kündigungsverzicht bis: 2025-11-30	2026-02-01 07:57:09.146273+00	2026-02-01 07:57:09.146273+00	\N	0.00	\N	0.00
2a72e027-4db2-48f3-80e2-810842ac52fc	257c849d-4493-4817-9495-9101cbb0e2c7	Norikum	Wohnungsbau-gesellschaft m.b.H.	\N	\N	\N	aktiv	2022-09-13	\N	0.00	20.45	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0040 002; Verrechnung ab: 2022-09-13; Zahlungsart: Dauerauftrag	2026-02-01 07:57:09.490217+00	2026-02-01 07:57:09.490217+00	\N	0.00	\N	0.00
642a7268-d084-4156-98ed-d372ce27d5c8	838c184e-043f-475e-8069-5f6c61b30f0b	Timo	Hennes	\N	\N	\N	aktiv	2023-05-01	\N	62.91	22.14	0.00	\N	f	\N	\N	f	\N	BE-Nr. 42; Nutzungsart: Garagenstellplatz; Zahlungsart: Zahlschein; Verrechnung ab: 2023-05-01; Entgeltposten: Garagenmiete, Betriebskosten2, Betriebskosten Garage	2026-02-01 07:57:09.819687+00	2026-02-01 07:57:09.819687+00	\N	0.00	\N	0.00
b81cf496-a2f8-48b2-88bb-03f0b64104cf	d9c3bf82-0123-4f02-a771-a60315fb0494	Vision	L & T (Mergim Izairi)	\N	\N	\N	aktiv	2024-01-15	\N	147.04	13.13	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); Nutzungsart: PKW-Freiplatz; BE-Nr. 44; Verrechnung ab: 2024-02-01; Befristung: 2027-01-14; Summe brutto: 192.20; USt 20%: 32.03	2026-02-01 07:57:10.15118+00	2026-02-01 07:57:10.15118+00	\N	0.00	\N	0.00
5d8942b9-399b-4ab9-a625-e38921dd8a7f	291bea8d-c8f2-42c3-a5b8-1ab72aa3be33	MAX	Orient	\N	\N	\N	aktiv	2022-01-01	\N	1080.70	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 1; Kunden-Nr.: 00402 0001 001; Verrechnung ab: 2022-01-01; Zahlungsart: Einzug; IBAN: AT40 2031 7077 0117 6062; Bank: SPARKASSE LAMBACH BANK AKTIENGESELLSCHAFT; Nutzfläche: 0,00 m²; Stiege/Tür-Nr.: /GE01	2026-02-01 09:00:47.790333+00	2026-02-01 09:00:47.790333+00	\N	0.00	\N	0.00
64ecba7b-8bb1-49d2-891e-de0b05852776	4f9aa092-3383-40ee-bdd3-34e6e47b9a70	Vision	L & T (Mergim Tzairi)	\N	\N	\N	aktiv	2024-01-15	\N	1333.64	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 2; Kunden-Nr.: 00402 0002 003; Verrechnung ab: 2024-02-01; Zahlungsart: Dauerauftrag; IBAN: AT80 2032 0321 0070 4125; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Befristung: 2027-01-14; Kündigungsverzicht bis: 2028-01-31; Nutzfläche: 0,00 m²; Stiege/Tür-Nr.: /GE02	2026-02-01 09:00:48.150879+00	2026-02-01 09:00:48.150879+00	\N	0.00	\N	0.00
19f7b53d-4c58-4d74-9a4e-afb9e8b06453	e1bb9cdb-6618-44c2-80cd-6b808d491ff5	Jamal	Al Karwani	\N	\N	\N	aktiv	2024-02-01	\N	444.24	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 3; Vorschreibung Monat 12/2025; Zahlungsart: Einzug; IBAN: AT48 2032 0321 0070 9745; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Verrechnung ab: 2024-02-01; Kündigungsverzicht bis: 2025-02-28; Kunden-Nr.: 00402 0003 002; Stiege/Tür-Nr.: /GE03; Nutzfläche: 0,00 m²	2026-02-01 09:00:48.500319+00	2026-02-01 09:00:48.500319+00	\N	0.00	\N	0.00
6d9ac611-8998-49ab-91fa-e3c314fa2ccc	7b847f5b-700b-4abb-a4e4-ee02378aaaf0	Gizella	Füzi	\N	\N	\N	aktiv	2021-03-15	\N	302.32	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 4; Vorschreibung Monat 12/2025; Geschoß: 1. OG; Stiege/Tür-Nr.: 1.OG/001; Zahlungsart: Zahlschein; Verrechnung ab: 2022-01-01; Befristung: 2027-03-14; Kündigungsverzicht bis: 2022-03-14; Kunden-Nr.: 00402 0004 001; Nutzfläche: 0,00 m²	2026-02-01 09:00:48.821548+00	2026-02-01 09:00:48.821548+00	\N	0.00	\N	0.00
d30e8d2e-e278-4507-b97e-d2cb5f994c3f	0f115f6d-7aeb-4290-bdc7-40aa5879328f	Nadja	Plavac	\N	\N	\N	aktiv	2005-05-01	\N	396.73	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 5; Geschoss: 1. OG; Stiege/Tür: 1.OG/002; Verrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Kunden-Nr.: 00402 0005 001	2026-02-01 09:00:49.158334+00	2026-02-01 09:00:49.158334+00	\N	0.00	\N	0.00
fd42fb88-8de3-454e-b6b2-62b3272caa0e	5e03a349-5657-4d6b-b1fc-4f77704d23cb	Mihai-Alexandru	Ipatoaei	\N	\N	\N	aktiv	2018-06-15	\N	461.11	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 6; Geschoss: 1. OG; Stiege/Tür: 1.OG/003; Verrechnung ab: 2022-01-01; Zahlungsart: Einzug; IBAN: AT44 6000 0404 1010 3232; Bank: OESTERREICHISCHE POSTSPARKASSE; Kunden-Nr.: 00402 0006 001	2026-02-01 09:00:49.487966+00	2026-02-01 09:00:49.487966+00	\N	0.00	\N	0.00
6e6ebfd6-ce01-4bfc-95b9-04e6857278d8	4a52e17b-4105-4db5-b397-6628618ae66f	Ioan-Marius	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Geschoß: 1. OG; Stiege/Tür-Nr.: 1.OG/004; Zahlungsart: Dauerauftrag; Nettosumme: 740.00; Bruttosumme: 820.01	2026-02-01 09:00:49.815398+00	2026-02-01 09:00:49.815398+00	\N	0.00	\N	0.00
b17ab4d7-0a1b-483a-9d31-6cd1abf69468	4a52e17b-4105-4db5-b397-6628618ae66f	Alexandra	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7 (Mitmieterin); Geschoß: 1. OG; Stiege/Tür-Nr.: 1.OG/004; Zahlungsart: Dauerauftrag; Nettosumme: 740.00; Bruttosumme: 820.01	2026-02-01 09:00:49.979292+00	2026-02-01 09:00:49.979292+00	\N	0.00	\N	0.00
837daf52-e3a1-4014-a0ea-6c0a8ea9dc3e	5a58e549-80d5-4b1f-b580-49d0fe361385	Madeleine	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Geschoß: 2. OG; Stiege/Tür-Nr.: 2.OG/005; Befristung: 2027-12-08; Beendigung zum: 2026-03-31; Beendigungsart: Aufkündigung durch Benutzer; Zahlungsart: Dauerauftrag; Nettosumme: 503.74; Bruttosumme: 558.07	2026-02-01 09:00:50.302688+00	2026-02-01 09:00:50.302688+00	\N	0.00	\N	0.00
b2adb569-db5d-44b3-80cc-04d95327a4d9	5a58e549-80d5-4b1f-b580-49d0fe361385	Christina	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8 (Mitmieterin); Geschoß: 2. OG; Stiege/Tür-Nr.: 2.OG/005; Befristung: 2027-12-08; Beendigung zum: 2026-03-31; Beendigungsart: Aufkündigung durch Benutzer; Zahlungsart: Dauerauftrag; Nettosumme: 503.74; Bruttosumme: 558.07	2026-02-01 09:00:50.474221+00	2026-02-01 09:00:50.474221+00	\N	0.00	\N	0.00
1842409e-d042-45c9-8d20-f7f53fa3b6b1	4a11211a-075a-4ce5-93ed-ed5423f61120	Iustinian	Adavidoae	\N	\N	\N	aktiv	2023-11-01	\N	305.90	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 9; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/006; Kunden-Nr.: 00402 0009 004; Zahlungsart: Dauerauftrag; Befristung: 31.10.2026; Kündigungsverzicht bis: 31.10.2024; Vorschreibung Monat 12/2025	2026-02-01 09:00:50.806239+00	2026-02-01 09:00:50.806239+00	\N	0.00	\N	0.00
eae9aecc-21a2-4c48-97e8-776dbce2f86f	a7f945a4-00b6-4383-8c74-7918e0e4db43	Cengiz	Kesgin	\N	\N	\N	aktiv	2025-06-16	\N	325.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 10; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/007; Kunden-Nr.: 00402 0010 006; Zahlungsart: Dauerauftrag; Befristung: 15.06.2028; Kündigungsverzicht bis: 15.06.2026; Vorschreibung Monat 12/2025	2026-02-01 09:00:51.129656+00	2026-02-01 09:00:51.129656+00	\N	0.00	\N	0.00
235b7562-2c75-49ae-8362-dd88a6e53433	6c0eb762-b57e-4dac-95bb-527d816e2e9e	Wolfgang	Raab	\N	\N	\N	aktiv	2013-11-01	\N	414.31	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 11; Stiege/Tür-Nr.: 2.OG/008; Verrechnung ab: 2022-01-01; Zahlungsart: Einzug; Kunden-Nr.: 00402 0011 001; Netto-Summe laut Vorschreibung: 605,71	2026-02-01 09:00:51.452118+00	2026-02-01 09:00:51.452118+00	\N	0.00	\N	0.00
2158eb97-34aa-4665-84ea-327a2befe32b	f3586303-b83d-466c-875d-2f9754b4a884	Katharina	Stiefmüller	\N	\N	\N	aktiv	2012-05-01	\N	410.31	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 12; Stiege/Tür-Nr.: 2.OG/009; Verrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Kunden-Nr.: 00402 0012 001; Netto-Summe laut Vorschreibung: 578,41	2026-02-01 09:00:51.778714+00	2026-02-01 09:00:51.778714+00	\N	0.00	\N	0.00
8b3fdcbc-8dd9-4b87-a83d-ccce4dfdeccd	3d814a97-ee65-4877-bef5-7769f567e2dd	Darko	Terek	\N	\N	\N	aktiv	2019-08-01	\N	580.86	0.00	0.00	\N	f	\N	\N	f	\N	Weitere im Dokument genannte Person: Suzana Zrinski Terek. BE-Nr. 15; Stiege/Tür-Nr.: 2.OG/012; Geschoss: 2. OG; Abrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Befristung: 2028-07-31.	2026-02-01 09:00:52.09631+00	2026-02-01 09:00:52.09631+00	\N	0.00	\N	0.00
03018d62-513d-4b4c-8080-c2516439e034	207c0697-1b72-4e26-8038-7569b30d3e83	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	306.50	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 16; Stiege/Tür-Nr.: 3.OG/013; Geschoss: 3. OG; Abrechnung ab: 2024-12-01; Zahlungsart: Dauerauftrag; Befristung: 2027-11-30.	2026-02-01 09:00:52.4143+00	2026-02-01 09:00:52.4143+00	\N	0.00	\N	0.00
89d42981-10cb-4dae-a3f6-bdd794ab99a1	0c765cdc-ad13-4ea1-9883-42e4ee8ff0c1	Ali	Reza ARYA	\N	\N	\N	aktiv	2024-12-01	\N	266.05	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 17; Stiege/Tür-Nr: 3.OG/014; Geschoss: 3.OG; Zahlungsart: Dauerauftrag; Befristung bis 2027-11-30; Verrechnung ab 2024-12-01; Kunden-Nr 00402 0017 005	2026-02-01 09:00:52.744793+00	2026-02-01 09:00:52.744793+00	\N	0.00	\N	0.00
e5a42c54-f83e-448a-987e-c2d57c226ee7	38f592b7-7436-4790-9818-c0ad85909a61	A.L.	GmbH	\N	\N	\N	aktiv	2023-02-01	\N	322.63	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 18; Stiege/Tür-Nr: 3.OG/015; Geschoss: 3.OG; Zahlungsart: Einzug; Befristung bis 2028-01-31; Verrechnung ab 2023-02-01; Kunden-Nr 00402 0018 003; IBAN: AT43 3477 0000 0578 8484; Bank: RAIFFEISENBANK WELS SUED	2026-02-01 09:00:53.057476+00	2026-02-01 09:00:53.057476+00	\N	0.00	\N	0.00
71dea263-836c-4311-a67e-696cd1961e77	e3b6bae1-935c-4cf6-86e6-2d7501fcde2a	Aja	Muhandes	\N	\N	\N	aktiv	2025-04-01	\N	281.28	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); BE-Nr. 19; Geschoss: 3. OG; Stiege/Tür: 3.OG/016; Befristung: 2028-03-31; Verrechnung ab: 2025-04-01; Vorschreibungsliste Monat 12/2025.	2026-02-01 09:00:53.366292+00	2026-02-01 09:00:53.366292+00	\N	0.00	\N	0.00
b414c9b7-4467-438f-9670-9bff0fee2fd3	34a659c4-3c5f-486f-a6f8-9691be2a2ae8	Perihan	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 22; weiterer Mieter: Hüsmen Güven; Stiege/Tür-Nr.: 3.OG/019; Zahlungsart: Dauerauftrag; Befristung bis 2028-10-31	2026-02-01 09:00:53.681821+00	2026-02-01 09:00:53.681821+00	\N	0.00	\N	0.00
012a76a2-96dd-489a-9830-4bdd9a8fddc9	34a659c4-3c5f-486f-a6f8-9691be2a2ae8	Hüsmen	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 22; weiterer Mieter: Perihan Güven; Stiege/Tür-Nr.: 3.OG/019; Zahlungsart: Dauerauftrag; Befristung bis 2028-10-31	2026-02-01 09:00:53.842291+00	2026-02-01 09:00:53.842291+00	\N	0.00	\N	0.00
cc74a2ea-1af4-460a-ab7e-d0fc46ddeeb7	b937ad14-3d50-40a1-8646-56fd121c0fb4	Timo	Hennes	\N	\N	\N	aktiv	2023-04-01	\N	681.02	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 23; Kunden-Nr 00402 0023 004; Zahlungsart: Zahlschein; Befristung bis 2026-03-31; Kündigungsverzicht bis 2024-03-31; Stiege/Tür: 3.OG/020	2026-02-01 09:00:54.144983+00	2026-02-01 09:00:54.144983+00	\N	0.00	\N	0.00
d1770fb1-a536-4dab-beff-4b9f22cb9e58	e7d17901-0a90-46cc-a96d-c6fa518918f3	Monika	Mühlberger	\N	\N	\N	aktiv	2022-12-10	\N	381.29	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 24; Mitmieterin: Anna Ragauer; Kunden-Nr 00402 0024 005; Zahlungsart: Einzug; IBAN: AT10 2032 0322 0253 6955; Befristung bis 2028-12-09; Stiege/Tür: /021	2026-02-01 09:00:54.449258+00	2026-02-01 09:00:54.449258+00	\N	0.00	\N	0.00
d97ed0ce-f420-4cbc-987e-5f61d362eb13	e7d17901-0a90-46cc-a96d-c6fa518918f3	Anna	Ragauer	\N	\N	\N	aktiv	2022-12-10	\N	381.29	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 24; Mitmieterin: Monika Mühlberger; Kunden-Nr 00402 0024 005; Zahlungsart: Einzug; IBAN: AT10 2032 0322 0253 6955; Befristung bis 2028-12-09; Stiege/Tür: /021	2026-02-01 09:00:54.606834+00	2026-02-01 09:00:54.606834+00	\N	0.00	\N	0.00
7bf27af9-c187-48f1-be9f-6a408551abe1	89e6ea57-2f99-4132-a797-9634f34ee182	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	552.34	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 26; weiterer Mieter im Dokument: Oliver Weiß; Vertragsbeginn 01.12.2023; Befristung bis 30.11.2026; Kündigungsverzicht bis 30.11.2025; Vorschreibung Monat 12/2025.	2026-02-01 09:00:54.913483+00	2026-02-01 09:00:54.913483+00	\N	0.00	\N	0.00
26e26eb3-a483-4da3-bc94-a67e9a967230	89e6ea57-2f99-4132-a797-9634f34ee182	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	552.34	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 26; weiterer Mieter im Dokument: Fabian Waischner; Vertragsbeginn 01.12.2023; Befristung bis 30.11.2026; Kündigungsverzicht bis 30.11.2025; Vorschreibung Monat 12/2025.	2026-02-01 09:00:55.076074+00	2026-02-01 09:00:55.076074+00	\N	0.00	\N	0.00
c30fb5a5-2c67-4413-93b8-ef5358c87d18	014d6626-6ac9-4861-8a54-8baf5819779e	Edina	Teuschler	\N	\N	\N	aktiv	2024-11-15	\N	540.98	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 27; Kunden-Nr. 00402 0027 003; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025; Stiege/Tür-Nr.: /024	2026-02-01 09:00:55.481824+00	2026-02-01 09:00:55.481824+00	\N	0.00	\N	0.00
5b2261ce-f3e0-4a6e-8cf3-46f130cca4bc	4794d8c9-a706-4f21-8e9b-36dec8831704	David	Zivko	\N	\N	\N	aktiv	2024-07-01	\N	254.60	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 28; Kunden-Nr. 00402 0028 003; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025; Geschoß: 1. OG; Stiege/Tür-Nr.: 1.OG/002A; Befristung bis 2027-06-30; Kündigungsverzicht bis 2025-06-30	2026-02-01 09:00:55.798376+00	2026-02-01 09:00:55.798376+00	\N	0.00	\N	0.00
e938a9f0-a746-430f-9ce7-ec2d91bab143	4cc76234-eb09-41b3-add7-5794de489cf7	Nadja	Bamberger	\N	\N	\N	aktiv	2020-06-15	\N	381.95	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 29; Kunden-Nr. 00402 0029 001; Verrechnung ab 2022-01-01; Geschoss: 1. OG; Stiege/Tür: 1.OG/001A; Befristung bis 2026-06-14; Kündigungsverzicht bis 2024-06-14; Zahlungsart: Zahlschein	2026-02-01 09:00:56.111038+00	2026-02-01 09:00:56.111038+00	\N	0.00	\N	0.00
77dfa891-9300-4fe7-9e96-455299b61c3e	a6ac9d4a-cacc-452e-86ca-9fb21f0e904f	MAX	Orient OG	\N	\N	\N	aktiv	2022-01-01	\N	95.59	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 31; Kunden-Nr. 00402 0031 001; Objekt: Garagenstellplatz; Verrechnung ab 2022-01-01; Zahlungsart: Einzug; IBAN: AT40 2031 7077 0117 6062; Bank: Sparkasse Lambach Bank Aktiengesellschaft	2026-02-01 09:00:56.423278+00	2026-02-01 09:00:56.423278+00	\N	0.00	\N	0.00
2b46c186-8557-4345-b7e0-80efb56fca7f	ea0872f8-f906-4915-a2a3-698bec653de2	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	46.45	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 35; Nutzungsart laut Vorschreibung: Garagenstellplatz; Verrechnung ab 2024-12-01; Befristung bis 2027-11-30; Zahlungsart: Dauerauftrag	2026-02-01 09:00:56.732577+00	2026-02-01 09:00:56.732577+00	\N	0.00	\N	0.00
8eac7263-543a-452f-9eb6-5e327795dab9	7e1c71f5-6f00-4160-9373-0b1a3c3891d3	Norikum	Wohnungsbau-gesellschaft m.b.H.	\N	\N	\N	aktiv	2022-02-01	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 36; Nutzungsart laut Vorschreibung: Garagenstellplatz; Verrechnung ab 2022-02-01; Zahlungsart: Dauerauftrag	2026-02-01 09:00:57.037856+00	2026-02-01 09:00:57.037856+00	\N	0.00	\N	0.00
fd6ed2fb-b794-41d4-b2ad-5be5bb97a45c	3195cf01-a086-417c-9bdb-10d1699d041a	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 37; Nutzungsart laut Vorschreibung: Garagenstellplatz; Verrechnung ab 2022-01-01; Befristung bis 2028-09-30; Zahlungsart: Zahlschein	2026-02-01 09:00:57.339035+00	2026-02-01 09:00:57.339035+00	\N	0.00	\N	0.00
cdec5498-295f-403f-be09-7288ea381b1e	3be83a7a-47ce-4a14-b409-b1c08fbc2f5a	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	0.00	0.00	\N	f	\N	\N	f	\N	Nutzungsart: Garagenstellplatz; BE-Nr 38; Kunden-Nr 00402 0038 001; Verrechnung ab 2022-01-01; Befristung bis 2028-09-30; Zahlungsart: Zahlschein	2026-02-01 09:00:57.642841+00	2026-02-01 09:00:57.642841+00	\N	0.00	\N	0.00
75a499f1-28ee-4a4b-85b7-ee7c5015c8b2	123f1e3a-df1b-4739-b2fd-547bcd159679	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	61.86	0.00	0.00	\N	f	\N	\N	f	\N	Nutzungsart: Garagenstellplatz; weiterer angeführter Name: Oliver Weiß; BE-Nr 39; Kunden-Nr 00402 0039 004; Verrechnung ab 2023-12-01; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Zahlungsart: Dauerauftrag	2026-02-01 09:00:57.962162+00	2026-02-01 09:00:57.962162+00	\N	0.00	\N	0.00
bf526d1f-bfb3-453b-a40b-bf9382cfb1cd	c455e38a-cc0f-42bb-b52f-bf7dc10c4698	Timo	Hennes	\N	\N	\N	aktiv	2023-05-01	\N	62.91	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 42; Nutzungsart laut Dokument: Garagenstellplatz; Vorschreibung Monat 12/2025; Zahlungsart: Zahlschein; Verrechnung ab: 2023-05-01; Summe netto 84.79	2026-02-01 09:00:58.285506+00	2026-02-01 09:00:58.285506+00	\N	0.00	\N	0.00
d2e04023-ed27-49ee-a58f-9d2b8bf5dbb7	7bf26e7f-439d-4676-b902-6628754e834b	Mergim	Izairi	\N	\N	\N	aktiv	2024-01-15	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	Nutzungsart: PKW-Freiplatz. Befristung bis 2027-01-14. Abrechnung ab 2024-02-01. BE-Nr. 44. Kunden-Nr. 00402 0044 003.	2026-02-01 09:00:58.588855+00	2026-02-01 09:00:58.588855+00	\N	0.00	\N	0.00
82245f89-1f8e-49cd-9308-aa47947d42f1	673792d8-ce3b-4c87-be85-9bfe0f86ad93	MAX	Orient OG	\N	\N	\N	aktiv	2022-01-01	\N	1080.70	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); Vorschreibung 12/2025; Kunden-Nr.: 00402 0001 001; Verrechnung ab: 2022-01-01; Zahlungsart: Einzug; IBAN: AT40 2031 7077 0117 6062	2026-02-01 09:22:41.123153+00	2026-02-01 09:22:41.123153+00	\N	0.00	{"Warmwasser": {"ust": 20, "betrag": 13.31, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 20, "betrag": 50.65, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 20, "betrag": 84.66, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 20, "betrag": 75.98, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 62.01, "schluessel": "Zentralheizung"}}	0.00
5d4e9a14-04a1-42fa-b21f-337f4563832b	fbd11c23-ce61-4645-bc81-a024fc805672	Vision	L & T (Mergim Zairi)	\N	\N	\N	aktiv	2024-01-15	\N	1333.64	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); Vorschreibung 12/2025; Kunden-Nr.: 00402 0002 003; Verrechnung ab: 2024-02-01; Befristung: 2027-01-14; Kündigungsverzicht bis: 2028-01-31; Zahlungsart: Dauerauftrag; IBAN: AT80 2032 0321 0070 4125	2026-02-01 09:22:41.440325+00	2026-02-01 09:22:41.440325+00	\N	0.00	{"Mahnkosten": {"ust": 0, "betrag": 15, "schluessel": "Direktwert"}, "Warmwasser": {"ust": 20, "betrag": 13.36, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 20, "betrag": 100.53, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 20, "betrag": 168.02, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 20, "betrag": 150.79, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 73.44, "schluessel": "Zentralheizung"}}	0.00
1c89c4a0-029f-4b28-840f-9d16af60e4df	c43d9143-842d-4e9d-8337-c8db9cfc56a8	Jamal	Al Karwani	\N	\N	\N	aktiv	2024-02-01	\N	444.24	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 3; Kunden-Nr. 00402 0003 002; Zahlung: Einzug; Steige/Tür: /GE03; Vorschreibung Monat 12/2025; Summe netto 638,18; USt 127,64; Brutto 765,82	2026-02-01 09:22:41.750098+00	2026-02-01 09:22:41.750098+00	\N	0.00	{"Kaltwasser": {"ust": 20, "betrag": 26.6, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 20, "betrag": 5.53, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 20, "betrag": 44.46, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 77.45, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 20, "betrag": 39.9, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
9f952f55-5ccd-43da-90af-12ff2e7deb4d	1d9d3354-e95d-45be-a26f-830477b91e5e	Gizella	Füzi	\N	\N	\N	aktiv	2021-03-15	\N	302.32	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 4; Kunden-Nr. 00402 0004 001; Geschoss 1. OG; Steige/Tür: 1.OG/001; Verrechnung ab 2022-01-01; Befristung bis 2027-03-14; Kündigungsverzicht bis 2022-03-14; Zahlung: Zahlschein; Vorschreibung Monat 12/2025; Summe netto 556,17; USt 61,99; Brutto 616,27	2026-02-01 09:22:42.066134+00	2026-02-01 09:22:42.066134+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 13.81, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 43.93, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 12.01, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 73.42, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 44.79, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 65.89, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
6e77432c-4452-4362-877a-e841e7064491	434a36e8-ccca-4d62-b28b-fa3d1613aad3	Nadja	Plavac	\N	\N	\N	aktiv	2005-05-01	\N	396.73	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 5; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/002; Zahlungsart: Zahlschein; Verrechnung ab: 2022-01-01; Kunden-Nr.: 00402 0005 001	2026-02-01 09:22:42.376823+00	2026-02-01 09:22:42.376823+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 7.68, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 24.43, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 11.34, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 40.83, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 29.46, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 36.65, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
736ac00b-9e5e-4708-a99c-cdc8212cfea1	4a802a0d-7564-405f-9b0c-3a6ce3fdb2ed	Mihai-Alexandru	Ipatoaei	\N	\N	\N	aktiv	2018-06-15	\N	461.11	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 6; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/003; Zahlungsart: Einzug; IBAN: AT44 6000 0404 1010 3232; Bank: Oesterreichische Postsparkasse; Verrechnung ab: 2022-01-01; Kunden-Nr.: 00402 0006 001	2026-02-01 09:22:42.683253+00	2026-02-01 09:22:42.683253+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.14, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 32.25, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 38.25, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 53.9, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 35.7, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 48.37, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
60e82dcb-e174-4911-8e65-d7c60b708316	c554895e-e601-4912-bb32-4005ce13a37d	Ioan-Marius	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Mieter: Ioan-Marius Hanti, Alexandra Hanti; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/004; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025	2026-02-01 09:22:42.987444+00	2026-02-01 09:22:42.987444+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 14.46, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 46, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.05, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 76.89, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 60.11, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 69.01, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
7eaa721f-e74b-435d-9edb-83192de4b70e	c554895e-e601-4912-bb32-4005ce13a37d	Alexandra	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Mieter: Ioan-Marius Hanti, Alexandra Hanti; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/004; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025	2026-02-01 09:22:43.153011+00	2026-02-01 09:22:43.153011+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 14.46, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 46, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.05, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 76.89, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 60.11, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 69.01, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
758670ec-154f-4ac8-ad04-5a82be6dfa74	cc784544-2a39-4b6e-96ae-0365bf09c35c	Madeleine	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Mieter: Madeleine Allram, Christina Allram; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/005; Befristung: 2027-12-08; Beendigung zum: 2026-03-31; Beendigungsart: Aufkündigung durch Benutzer; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025	2026-02-01 09:22:43.457692+00	2026-02-01 09:22:43.457692+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 7.2, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 22.9, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.47, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 38.28, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 39.6, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 34.36, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
1bdc41ff-f15e-4070-bd65-f8c7abd23e0c	cc784544-2a39-4b6e-96ae-0365bf09c35c	Christina	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Mieter: Madeleine Allram, Christina Allram; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/005; Befristung: 2027-12-08; Beendigung zum: 2026-03-31; Beendigungsart: Aufkündigung durch Benutzer; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025	2026-02-01 09:22:43.612106+00	2026-02-01 09:22:43.612106+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 7.2, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 22.9, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.47, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 38.28, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 39.6, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 34.36, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
6a2e2951-17bc-4afb-9c5b-6cfb94672f84	fa89342e-c81d-43cd-8ff3-80e92aef3e57	Iustinian	Adavidoae	\N	\N	\N	aktiv	2023-11-01	\N	305.90	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 9; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/006; Zahlungsart: Dauerauftrag; Befristung bis: 2026-10-31; Kündigungsverzicht bis: 2024-10-31	2026-02-01 09:22:43.913957+00	2026-02-01 09:22:43.913957+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 6.07, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 19.31, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 3.26, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 32.27, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 20.53, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 28.96, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
ad822235-2e8b-4c26-ad48-1f916162b34f	46282132-a7bb-4565-98f6-bbfe6ec22e95	Cengiz	Kesgin	\N	\N	\N	aktiv	2025-06-16	\N	325.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 10; Geschoss: 2. OG; Stiege/Tür-Nr.: 2.OG/007; Zahlungsart: Dauerauftrag; Befristung bis: 2028-06-15; Kündigungsverzicht bis: 2026-06-15	2026-02-01 09:22:44.217602+00	2026-02-01 09:22:44.217602+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 6.64, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 21.12, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 8.84, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 35.3, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 22.49, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 31.68, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
cb84cb2f-28ce-472c-b4e9-b815ba3bbf7d	594c297e-c1ba-4cee-aced-ac328fa687af	Wolfgang	Raab	\N	\N	\N	aktiv	2013-11-01	\N	414.31	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr 11; Geschoss 2. OG; Stiege/Tür-Nr 2.OG/008; Verrechnung ab 2022-01-01; Zahlungsart Einzug.	2026-02-01 09:22:44.529747+00	2026-02-01 09:22:44.529747+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.31, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 32.82, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 5.1, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 54.85, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 39.1, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 49.22, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
da0d3d07-a736-428a-91e2-24d4e6e58ae0	5d04cd7f-0a9a-482b-a016-564b31a3631d	Katharina	Stiefmüller	\N	\N	\N	aktiv	2012-05-01	\N	410.31	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste Monat 12/2025; BE-Nr 12; Geschoss 2. OG; Stiege/Tür-Nr 2.OG/009; Verrechnung ab 2022-01-01; Zahlungsart Zahlschein.	2026-02-01 09:22:44.831747+00	2026-02-01 09:22:44.831747+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 8.94, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 28.43, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 9.11, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 47.53, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 31.44, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 42.65, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
f9751bd8-c65e-4a8f-919b-9c1811d524ae	1ee78364-96a8-46e3-b7b6-6d18cf78c486	Darko	Terek	\N	\N	\N	aktiv	2019-08-01	\N	580.86	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 15; Stiege/Tür: 2.OG/012; Vertrag bis 2028-07-31; Verrechnung ab 2022-01-01; Zahlungsart: Zahlschein. Weitere im Dokument genannte Mieterin: Suzana Zrinski Terek.	2026-02-01 09:22:45.138727+00	2026-02-01 09:22:45.138727+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 21.6, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 46, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 50.81, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 69.01, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten 1": {"ust": 10, "betrag": 76.89, "schluessel": "Betriebskosten 01"}, "Betriebskosten Lift": {"ust": 10, "betrag": 14.46, "schluessel": "BK Lift"}}	0.00
0d74358b-88f0-4223-b16e-1dab36afd5eb	1ee78364-96a8-46e3-b7b6-6d18cf78c486	Suzana	Zrinski Terek	\N	\N	\N	aktiv	2019-08-01	\N	580.86	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 15; Stiege/Tür: 2.OG/012; Vertrag bis 2028-07-31; Verrechnung ab 2022-01-01; Zahlungsart: Zahlschein. Als zusätzlicher Mieter neben Darko Terek angeführt.	2026-02-01 09:22:45.296865+00	2026-02-01 09:22:45.296865+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 21.6, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 46, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 50.81, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 69.01, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten 1": {"ust": 10, "betrag": 76.89, "schluessel": "Betriebskosten 01"}, "Betriebskosten Lift": {"ust": 10, "betrag": 14.46, "schluessel": "BK Lift"}}	0.00
662b6add-66fa-47f2-af94-f236af839f19	11beceba-8c34-496d-9e05-ed51cae7e8c5	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	306.50	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 16; Stiege/Tür: 3.OG/013; Vertrag bis 2027-11-30; Verrechnung ab 2024-12-01; Zahlungsart: Dauerauftrag.	2026-02-01 09:22:45.599537+00	2026-02-01 09:22:45.599537+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 8.75, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 22.9, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 20.6, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 34.36, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten 1": {"ust": 10, "betrag": 38.28, "schluessel": "Betriebskosten 01"}, "Betriebskosten Lift": {"ust": 10, "betrag": 7.2, "schluessel": "BK Lift"}}	0.00
47447aa6-6d52-40a9-a8be-760a0f335aa7	59a2e56f-c2a5-4299-afb1-ccba4cec4aff	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	61.86	0.00	0.00	\N	f	\N	\N	f	\N	Mitmieter/zweite genannte Person bei TG10; Vorschreibung Monat 12/2025; Nutzungsart: Garagenstellplatz; Verrechnung ab 2023-12-01; Zahlungsart: Dauerauftrag; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Kunden-Nr.: 00402 0039 004; Stiege/Tür-Nr.: /TG10	2026-02-01 09:22:50.898665+00	2026-02-01 09:22:50.898665+00	\N	0.00	{"Betriebskosten": {"ust": 20, "betrag": 14.04, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
46a0190e-7880-4501-83cf-72f058b86afe	fbac317b-2773-4a2e-9e73-d83c1a24e1b3	Ali Reza	ARYA	\N	\N	\N	aktiv	2024-12-01	\N	266.05	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 17; Geschoss: 3. OG; Stiege/Tür-Nr.: 3.OG/014; Kunden-Nr.: 00402 0017 005; Befristung bis: 2027-11-30; Zahlungsart: Dauerauftrag	2026-02-01 09:22:45.904535+00	2026-02-01 09:22:45.904535+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 6.07, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 19.31, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 6.15, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 32.27, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 29.46, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 28.96, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
367bb6cb-b0eb-4fd0-b833-c042c41a927c	8db9779f-5273-4652-9caf-906c333525a6	A.L.	GmbH	\N	\N	\N	aktiv	2023-02-01	\N	322.63	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 18; Geschoss: 3. OG; Stiege/Tür-Nr.: 3.OG/015; Kunden-Nr.: 00402 0018 003; Befristung bis: 2028-01-31; Zahlungsart: Einzug; IBAN: AT43 3477 0000 0578 8484; Bank: Raiffeisenbank Wels Sued	2026-02-01 09:22:46.208061+00	2026-02-01 09:22:46.208061+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 6.64, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 21.12, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 10.17, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 35.3, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 24.74, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 31.68, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
02c9c697-45d4-4053-86a9-387892a7ca3f	65fabb09-a5d4-4051-89aa-706e4ead4561	Aja	Muhandes	\N	\N	\N	aktiv	2025-04-01	\N	281.28	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 19; Vertragsbeginn 2025-04-01; Befristung bis 2028-03-31; Stiege/Tür-Nr.: 3.OG/016	2026-02-01 09:22:46.531958+00	2026-02-01 09:22:46.531958+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.31, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 32.82, "schluessel": "Betriebskosten 01"}, "Mahnkosten": {"ust": 0, "betrag": 15, "schluessel": "Direktwert"}, "Warmwasser": {"ust": 10, "betrag": 11.21, "schluessel": "Direktwert"}, "Zentralheizung": {"ust": 20, "betrag": 47.21, "schluessel": "Zentralheizung"}, "Betriebskosten1": {"ust": 10, "betrag": 49.22, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten2": {"ust": 10, "betrag": 54.85, "schluessel": "Betriebskosten 01"}}	0.00
2d235015-9c22-4898-b80b-336d6955c0be	497c6cf2-cf45-4126-a2e4-e795b05c3ce6	Perihan	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 22; weiterer Mieter im Dokument: Hüsmen Güven (Name ohne weitere Kontaktdaten); Geschoss: 3. OG; Stiege/Tür-Nr.: 3.OG/019; Befristung bis 2028-10-31; Zahlungsart: Dauerauftrag; Index/Menge (Einheiten): 46,16; Index/Menge (m²): 46,16	2026-02-01 09:22:46.838642+00	2026-02-01 09:22:46.838642+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.16, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 32.31, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 19.1, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 54.01, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 64.99, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 48.47, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
d54a56c2-fdd2-47ea-9980-3a4363ca9aad	497c6cf2-cf45-4126-a2e4-e795b05c3ce6	Hüsmen	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 22; weiterer Mieter im Dokument: Perihan Güven; Geschoss: 3. OG; Stiege/Tür-Nr.: 3.OG/019; Befristung bis 2028-10-31; Zahlungsart: Dauerauftrag; Index/Menge (Einheiten): 46,16; Index/Menge (m²): 46,16	2026-02-01 09:22:46.991057+00	2026-02-01 09:22:46.991057+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.16, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 32.31, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 19.1, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 54.01, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 64.99, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 48.47, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
d515f05a-4336-4f77-895a-27f69f7a44c5	d9b3a4d8-8305-48b1-a3e8-2d1e39044cc8	Timo	Hennes	\N	\N	\N	aktiv	2023-04-01	\N	681.02	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 23; Stiege/Tür-Nr.: 3.OG/020; Zahlungsart: Zahlschein; Befristung: 2032-03-31; Kündigungsverzicht bis: 2024-03-31	2026-02-01 09:22:47.290629+00	2026-02-01 09:22:47.290629+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 18.37, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 58.44, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 8.43, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 97.68, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 48.37, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 87.66, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
8f9cd752-0c50-4860-bc4c-26ecd04c7583	0bb56190-49aa-4044-af7d-f9e83c343479	Monika	Mühlberger	\N	\N	\N	aktiv	2022-12-10	\N	381.29	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 24; Stiege/Tür-Nr.: /021; Zahlungsart: Einzug; IBAN: AT10 2032 0322 0253 6955; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Befristung: 2028-12-09; Kündigungsverzicht bis: 2023-12-09; weiterer Mieter: Anna Ragauer	2026-02-01 09:22:47.593411+00	2026-02-01 09:22:47.593411+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 8.07, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 25.68, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 15.74, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 42.93, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 45.26, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 38.52, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
cd133ed6-ea0c-440f-b480-18bfe1694d7e	0bb56190-49aa-4044-af7d-f9e83c343479	Anna	Ragauer	\N	\N	\N	aktiv	2022-12-10	\N	381.29	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 24; Stiege/Tür-Nr.: /021; Zahlungsart: Einzug; IBAN: AT10 2032 0322 0253 6955; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Befristung: 2028-12-09; Kündigungsverzicht bis: 2023-12-09; weiterer Mieter: Monika Mühlberger	2026-02-01 09:22:47.749501+00	2026-02-01 09:22:47.749501+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 8.07, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 25.68, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 15.74, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 42.93, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 45.26, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 38.52, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
af07ce8b-5698-4ca3-9fbd-f68c51c7d86a	ba3caabf-47e0-44f3-94fc-f01f2096d68f	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	552.34	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 26; weiterer Mieter: Oliver Weiß; Kunden-Nr 00402 0026 005; Zahlungsart: Dauerauftrag; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Verrechnung ab 2023-12-01	2026-02-01 09:22:48.045914+00	2026-02-01 09:22:48.045914+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 48.2, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 17.79, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 80.55, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 46.39, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 72.29, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 15.15, "schluessel": "BK Lift"}}	0.00
71665eca-5c9d-4951-853e-376c12e77417	ba3caabf-47e0-44f3-94fc-f01f2096d68f	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	552.34	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 26; weiterer Mieter: Fabian Waischner; Kunden-Nr 00402 0026 005; Zahlungsart: Dauerauftrag; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Verrechnung ab 2023-12-01	2026-02-01 09:22:48.193129+00	2026-02-01 09:22:48.193129+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 48.2, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 17.79, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 80.55, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 46.39, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 72.29, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 15.15, "schluessel": "BK Lift"}}	0.00
3d079578-c7f1-4990-820b-a3491d2b0612	729123be-477e-4f65-813f-00c0fce7f8c1	Edina	Teuschler	\N	\N	\N	aktiv	2024-11-15	\N	540.98	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 27; Kunden-Nr 00402 0027 003; Zahlungsart Dauerauftrag; Stiege/Tür-Nr: /024	2026-02-01 09:22:48.499986+00	2026-02-01 09:22:48.499986+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 38.32, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 11.33, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 64.05, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 20.02, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 57.48, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 12.04, "schluessel": "BK Lift"}}	0.00
f6e61661-6848-421f-96d7-bd1ceca2cf01	ee22d24b-5723-432b-aa32-6aa344955029	David	Zivko	\N	\N	\N	aktiv	2024-07-01	\N	254.60	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 28; Kunden-Nr 00402 0028 003; Geschoss: 1. OG; Stiege/Tür-Nr: 1.OG/002A; Befristung: 2027-06-30	2026-02-01 09:22:48.804504+00	2026-02-01 09:22:48.804504+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 41.47, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 20.26, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 69.31, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 64.28, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 62.2, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 13.03, "schluessel": "BK Lift"}}	0.00
353365d5-9dcd-4cdc-84bf-89b9fd7908f6	f1a6fd78-bcdd-4937-b625-3868d0f64eb7	Nadja	Bamberger	\N	\N	\N	aktiv	2020-06-15	\N	381.95	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 29; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/001A; Zahlungsart: Zahlschein; Verrechnung ab: 2022-01-01; Befristung: 2026-06-14; Kündigungsverzicht bis: 2024-06-14	2026-02-01 09:22:49.109116+00	2026-02-01 09:22:49.109116+00	\N	0.00	{"Kaltwasser 1": {"ust": 10, "betrag": 36.51, "schluessel": "Betriebskosten 01"}, "Warmwasser 1": {"ust": 10, "betrag": 8.92, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 10, "betrag": 54.77, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten 1": {"ust": 10, "betrag": 61.03, "schluessel": "Betriebskosten 01"}, "Zentralheizung 1": {"ust": 20, "betrag": 38.76, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 11.48, "schluessel": "BK Lift"}}	0.00
077a2978-54fc-4e0a-86e5-2508fd037460	52b7afaf-6e92-49ec-9854-66a9a1622f6b	MAX	Orient OG	\N	\N	\N	aktiv	2022-01-01	\N	95.59	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 31; Nutzungsart im Dokument: Garagenstellplatz; Verrechnung ab: 2022-01-01; Zahlungsart: Einzug; IBAN: AT40 2031 7077 0117 6062	2026-02-01 09:22:49.413535+00	2026-02-01 09:22:49.413535+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 14.83, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
83880cef-1e38-402f-bcde-cda554f579a3	0430bb88-aa72-41ec-9d03-ba901899ec51	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	46.45	0.00	0.00	\N	f	\N	\N	f	\N	Nutzungsart laut Vorschreibung: Garagenstellplatz; Kunden-Nr. 00402 0035 003; Verrechnung ab 2024-12-01; Zahlungsart: Dauerauftrag; Befristung bis 2027-11-30.	2026-02-01 09:22:49.718777+00	2026-02-01 09:22:49.718777+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 14.14, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
6f468d00-5461-4694-be59-0e05d1332b8c	44b3f0e9-7c2e-4886-aefe-645a3fd2ca0a	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	0.00	0.00	\N	f	\N	\N	f	\N	Nutzungsart laut Vorschreibung: Garagenstellplatz; Kunden-Nr. 00402 0037 001; Verrechnung ab 2022-01-01; Zahlungsart: Zahlschein; Befristung bis 2028-09-30.	2026-02-01 09:22:50.139587+00	2026-02-01 09:22:50.139587+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 16.57, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
450fb32b-9ade-4b0b-afc7-c896896cf179	bf7c33a2-c088-425a-9fa2-d1e4ec05494f	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibung Monat 12/2025; Nutzungsart: Garagenstellplatz; Verrechnung ab 2022-01-01; Zahlungsart: Zahlschein; Befristung bis 2028-09-30; Kunden-Nr.: 00402 0038 001; Stiege/Tür-Nr.: /TG09; Gesamt netto Positionen: 89.85	2026-02-01 09:22:50.444696+00	2026-02-01 09:22:50.444696+00	\N	0.00	{"Betriebskosten": {"ust": 20, "betrag": 13.25, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
11c4451a-68e5-4f8b-b07b-789a86f78c6c	59a2e56f-c2a5-4299-afb1-ccba4cec4aff	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	61.86	0.00	0.00	\N	f	\N	\N	f	\N	Zweiter Mieter im Dokument: Oliver Weiß (mitangeführt, vermutlich weiterer Hauptmieter). Vorschreibung Monat 12/2025; Nutzungsart: Garagenstellplatz; Verrechnung ab 2023-12-01; Zahlungsart: Dauerauftrag; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Kunden-Nr.: 00402 0039 004; Stiege/Tür-Nr.: /TG10; Gesamt netto Positionen: 82.31	2026-02-01 09:22:50.749578+00	2026-02-01 09:22:50.749578+00	\N	0.00	{"Betriebskosten": {"ust": 20, "betrag": 14.04, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
1c539300-3126-4c72-84be-bd5eee13a945	f10402c9-7847-41d6-be8d-f83b78bb0d85	Norikum	Wohnungsbau-gesellschaft m.b.H.	\N	\N	\N	aktiv	2022-09-13	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibung Monat 12/2025; Nutzungsart: Garagenstellplatz; Vertragsbeginn/Verrechnung ab: 2022-09-13; Zahlungsart: Dauerauftrag; Kunden-Nr.: 00402 0040 002; Stiege/Tür-Nr.: /TG11; Gesamt netto Positionen: 20.45; Garagenmiete in dieser Vorschreibung nicht ausgewiesen (nur BK-Positionen).	2026-02-01 09:22:51.199455+00	2026-02-01 09:22:51.199455+00	\N	0.00	{"Betriebskosten": {"ust": 20, "betrag": 14.04, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
315481ef-1802-45be-b422-7de01b7b46e5	b03cc0e9-ee11-480e-a9c0-fb60830382dc	Timo	Hennes	\N	\N	\N	aktiv	2023-05-01	\N	62.91	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 42; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0042 003; Zahlungsart: Zahlschein; Verrechnung ab: 2023-05-01; Summe netto 84,79; Summe brutto 101,75	2026-02-01 09:22:51.494155+00	2026-02-01 09:22:51.494155+00	\N	0.00	{"USt 20%": {"ust": 0, "betrag": 16.96, "schluessel": "Direktwert"}, "Garagenmiete": {"ust": 20, "betrag": 62.91, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 20, "betrag": 15.47, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
c446e286-303c-462e-a682-3889092e7458	6bb70fa1-6ea5-4d03-826e-121d4c4c7b04	Mergim	Izairi	\N	\N	\N	aktiv	2024-01-15	\N	147.04	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 44; Nutzungsart: PKW-Freiplatz; Vertragsbeginn 15.01.2024; Befristung bis 14.01.2027; Verrechnung ab 01.02.2024; Zahlungsart: Dauerauftrag; IBAN: AT80 2032 0321 0070 4125 (Allgemeine Sparkasse Oberösterreich BankAG)	2026-02-01 09:22:51.806336+00	2026-02-01 09:22:51.806336+00	\N	0.00	{"Garagenmiete": {"ust": 20, "betrag": 147.04, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 13.13, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
2e8196aa-52c8-4678-8da5-184ad5dbaa68	78569629-9203-430e-9bf8-9cabbfee6554	MAX	Orient	\N	\N	\N	aktiv	2022-01-01	\N	1080.70	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 1; Kunden-Nr. 00402 0001 001; Zahlungsart: Einzug; Verrechnung ab: 2022-01-01; Stiege/Tür-Nr.: /GE01; Nutzfläche: 0,00 m²	2026-02-01 09:56:30.349074+00	2026-02-01 09:56:30.349074+00	\N	0.00	{"UST 20%": {"ust": 0, "betrag": 273.46, "schluessel": "Direktwert"}, "Warmwasser": {"ust": 20, "betrag": 13.31, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 20, "betrag": 50.65, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 20, "betrag": 84.66, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 20, "betrag": 75.98, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 62.01, "schluessel": "Zentralheizung"}}	0.00
64885454-4ae2-4f71-86f7-850f9822fe0c	5b0988af-2e2e-4a29-be3f-51e9ee392fb9	Vision	L & T (Mergim Zairi)	\N	\N	\N	aktiv	2024-01-15	\N	1333.64	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 2; Kunden-Nr. 00402 0002 003; Zahlungsart: Dauerauftrag; Verrechnung ab: 2024-02-01; Befristung: 2027-01-14; Kündigungsverzicht bis: 2028-01-31; Stiege/Tür-Nr.: /GE02; Nutzfläche: 0,00 m²	2026-02-01 09:56:30.668934+00	2026-02-01 09:56:30.668934+00	\N	0.00	{"UST 20%": {"ust": 0, "betrag": 367.96, "schluessel": "Direktwert"}, "Mahnkosten": {"ust": 0, "betrag": 15, "schluessel": "Direktwert"}, "Warmwasser": {"ust": 20, "betrag": 13.36, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 20, "betrag": 100.53, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 20, "betrag": 168.02, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 20, "betrag": 150.79, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 73.44, "schluessel": "Zentralheizung"}}	0.00
2aab6c7b-952b-436f-957a-f5d9a63ac9a8	fb4699e1-fcc6-4a50-9925-3b4c207cc64d	Jamal	Al Karwani	\N	\N	\N	aktiv	2024-02-01	\N	444.24	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibung 12/2025; BE-Nr. 3; Kunden-Nr. 00402 0003 002; Zahlungsart: Einzug; Verrechnung ab: 2024-02-01; Kündigungsverzicht bis: 2025-02-28	2026-02-01 09:56:30.988358+00	2026-02-01 09:56:30.988358+00	\N	0.00	{"Kaltwasser": {"ust": 20, "betrag": 26.6, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 20, "betrag": 5.53, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 20, "betrag": 44.46, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 77.45, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 20, "betrag": 39.9, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
99ce0601-22c0-448e-8226-b8e3ae4b3ae6	9e99ed26-483f-485b-853f-91a3835dd734	Gizella	Füzi	\N	\N	\N	aktiv	2021-03-15	\N	302.32	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibung 12/2025; BE-Nr. 4; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/001; Kunden-Nr. 00402 0004 001; Zahlungsart: Zahlschein; Verrechnung ab: 2022-01-01; Befristung: 2027-03-14; Kündigungsverzicht bis: 2022-03-14	2026-02-01 09:56:31.305511+00	2026-02-01 09:56:31.305511+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 13.81, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 43.93, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 12.01, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 73.42, "schluessel": "Betriebskosten"}, "Zentralheizung": {"ust": 20, "betrag": 44.79, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 65.89, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
e44db7d9-d950-4d62-8598-9631982f683e	d8fdf06f-b9e3-4bfc-804d-c29c1ddac569	Nadja	Plavac	\N	\N	\N	aktiv	2005-05-01	\N	396.73	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 5; Geschoss: 1. OG; Stiege/Tür: 1.OG/002; Verrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Vorschreibung Monat 12/2025; Netto Summe Positionen: 547.12	2026-02-01 09:56:31.623204+00	2026-02-01 09:56:31.623204+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 11.34, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 24.43, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 10, "betrag": 40.83, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 29.46, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 36.65, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 7.68, "schluessel": "BK Lift"}}	0.00
43e0f6dc-bde4-4aa6-b9f2-01714cab2cef	28cd9b41-2d21-455d-99d4-b0928816cfa8	Mihai-Alexandru	Ipatoaei	\N	\N	\N	aktiv	2018-06-15	\N	461.11	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 6; Geschoss: 1. OG; Stiege/Tür: 1.OG/003; Verrechnung ab: 2022-01-01; Zahlungsart: Einzug; IBAN: AT44 6000 0404 1010 3232; Bank: OESTERREICHISCHE POSTS PARKASSE; Vorschreibung Monat 12/2025; Netto Summe Positionen: 679.72	2026-02-01 09:56:31.948804+00	2026-02-01 09:56:31.948804+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 38.25, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 32.25, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 10, "betrag": 53.9, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 35.7, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 48.37, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 10.14, "schluessel": "BK Lift"}}	0.00
048ff06b-460e-48c9-9521-bf7e52aa57ec	2ed3aed9-f97e-4f1d-8e97-11fa30685df1	Ioan-Marius	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Stiege/Tür-Nr.: 1.OG/004; Geschoss: 1. OG; Kunden-Nr.: 00402 0007 005; Zahlungsart: Dauerauftrag; Vorschreibungsmonat: 12/2025; Nettosumme: 740,00	2026-02-01 09:56:32.266656+00	2026-02-01 09:56:32.266656+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 46, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.05, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 76.89, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 60.11, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 69.01, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 14.46, "schluessel": "BK Lift"}}	0.00
17bb13e5-c1b2-4918-b4f1-cca97878094b	2ed3aed9-f97e-4f1d-8e97-11fa30685df1	Alexandra	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Stiege/Tür-Nr.: 1.OG/004; Geschoss: 1. OG; Kunden-Nr.: 00402 0007 005; Zahlungsart: Dauerauftrag; Vorschreibungsmonat: 12/2025; Nettosumme: 740,00	2026-02-01 09:56:32.424388+00	2026-02-01 09:56:32.424388+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 46, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.05, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 76.89, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 60.11, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 69.01, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 14.46, "schluessel": "BK Lift"}}	0.00
61b43bda-9a2d-4128-9c84-0fd3032193a3	af00a848-e5c1-4bce-98e1-65648cd7c524	Madeleine	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Stiege/Tür-Nr.: 2.OG/005; Geschoss: 2. OG; Kunden-Nr.: 00402 0008 005; Zahlungsart: Dauerauftrag; Befristung: 2027-12-08; Beendigung zum: 2026-03-31; Beendigungsart: Aufkündigung durch Benutzer; Kündigungsverzicht bis: 2025-12-31; Vorschreibungsmonat: 12/2025; Nettosumme: 503,74	2026-02-01 09:56:32.74205+00	2026-02-01 09:56:32.74205+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 22.9, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.47, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 38.28, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 39.6, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 34.36, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 7.2, "schluessel": "BK Lift"}}	0.00
4dce2e51-fa91-43d4-95e9-952042e7e606	af00a848-e5c1-4bce-98e1-65648cd7c524	Christina	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Stiege/Tür-Nr.: 2.OG/005; Geschoss: 2. OG; Kunden-Nr.: 00402 0008 005; Zahlungsart: Dauerauftrag; Befristung: 2027-12-08; Beendigung zum: 2026-03-31; Beendigungsart: Aufkündigung durch Benutzer; Kündigungsverzicht bis: 2025-12-31; Vorschreibungsmonat: 12/2025; Nettosumme: 503,74	2026-02-01 09:56:32.932388+00	2026-02-01 09:56:32.932388+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 22.9, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.47, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 38.28, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 39.6, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 34.36, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 7.2, "schluessel": "BK Lift"}}	0.00
a1fdf3d0-2f01-430d-9857-c3fc24a67840	3e3c3d8c-944a-4f8a-bda0-5c8ae6797872	Iustinian	Adavidoae	\N	\N	\N	aktiv	2023-11-01	\N	305.90	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 9; Geschoss 2. OG; Stiege/Tür-Nr 2.OG/006; Kunden-Nr 00402 0009 004; Zahlungsart Dauerauftrag; Befristung 2026-10-31; Kündigungsverzicht bis 2024-10-31	2026-02-01 09:56:33.243154+00	2026-02-01 09:56:33.243154+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 3.26, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 19.31, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 10, "betrag": 32.27, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 28.96, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 20.53, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 6.07, "schluessel": "BK Lift"}}	0.00
c6260442-ae4b-4b16-9098-ed988971123e	5a1f23c6-9e63-4a20-ae70-984f8ceafa48	Cengiz	Kesgin	\N	\N	\N	aktiv	2025-06-16	\N	325.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 10; Geschoss 2. OG; Stiege/Tür-Nr 2.OG/007; Kunden-Nr 00402 0010 006; Zahlungsart Dauerauftrag; Befristung 2028-06-15; Kündigungsverzicht bis 2026-06-15	2026-02-01 09:56:33.555689+00	2026-02-01 09:56:33.555689+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 8.84, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 21.12, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 10, "betrag": 35.3, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 31.68, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 22.49, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 6.64, "schluessel": "BK Lift"}}	0.00
3832ea46-997f-4d88-a8e9-8644d015b4e1	d3c536ba-fb10-42ca-8cb4-8ab2d64c0eed	Wolfgang	Raab	\N	\N	\N	aktiv	2013-11-01	\N	414.31	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); Vorschreibung 12/2025; Kunden-Nr.: 00402 0011 001; Verrechnung ab: 2022-01-01; Zahlungsart: Einzug; Stiege/Tür: 2.OG/008	2026-02-01 09:56:33.875752+00	2026-02-01 09:56:33.875752+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 32.82, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 5.1, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 54.85, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 49.22, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 39.1, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 10.31, "schluessel": "BK Lift"}}	0.00
928e57aa-70d3-45cf-85ac-6b1f07bdd5ca	ae727a34-6d12-412b-ad52-7a4391065538	Katharina	Stiefmüller	\N	\N	\N	aktiv	2012-05-01	\N	410.31	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); Vorschreibung 12/2025; Kunden-Nr.: 00402 0012 001; Verrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Stiege/Tür: 2.OG/009	2026-02-01 09:56:34.190788+00	2026-02-01 09:56:34.190788+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 28.43, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 9.11, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 47.53, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 42.65, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 31.44, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 8.94, "schluessel": "BK Lift"}}	0.00
2f24cb49-2607-4271-8d95-fbabba7dc176	8a36ba14-32ad-4724-b833-d503b7361ce1	Darko	Terek	\N	\N	\N	aktiv	2019-08-01	\N	580.86	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 15; weitere im Dokument genannte Person: Suzana Zrinski Terek; Geschoss: 2. OG; Stiege/Tür-Nr: 2.OG/012; Abrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Befristung bis: 2028-07-31; Vorschreibung Monat 12/2025; Summe Netto 859.63	2026-02-01 09:56:34.500174+00	2026-02-01 09:56:34.500174+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 14.46, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 46, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 21.6, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 76.89, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 50.81, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 69.01, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
f656f119-49d9-4ddc-8f81-6679a91b6e80	24730b6b-ef39-4ce5-bead-e050453b4683	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	306.50	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 16; Geschoss: 3. OG; Stiege/Tür-Nr: 3.OG/013; Abrechnung ab: 2024-12-01; Zahlungsart: Dauerauftrag; Befristung bis: 2027-11-30; Vorschreibung Monat 12/2025; Summe Netto 438.59	2026-02-01 09:56:34.811002+00	2026-02-01 09:56:34.811002+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 7.2, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 22.9, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 8.75, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 38.28, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 20.6, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 34.36, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
b202983b-5f81-45d9-ba3c-92716ed7abbc	67000db0-e079-45ca-af16-608215a4c5c3	Ali Reza	ARYA	\N	\N	\N	aktiv	2024-12-01	\N	266.05	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH). Vorschreibungsliste Monat 12/2025. BE-Nr. 17. Stiege/Tür-Nr.: 3.OG/014. Befristung bis 2027-11-30. Zahlungsart: Dauerauftrag.	2026-02-01 09:56:35.121988+00	2026-02-01 09:56:35.121988+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 6.07, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 19.31, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 6.15, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 32.27, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 29.46, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 28.96, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
d6381cdb-f4f8-48e4-ad44-f905f25c050d	ec04408c-ba5d-4f41-9690-caebf21bf898	Aja	Muhandes	\N	\N	\N	aktiv	2025-04-01	\N	281.28	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH); BE-Nr. 19; Geschoss: 3. OG; Stiege/Tür-Nr.: 3.OG/016; Kunden-Nr.: 00402 0019 003; Verrechnung ab: 2025-04-01; Zahlungsart: Einzug; IBAN: AT31 2032 0324 0225 3078; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Vorschreibungsliste Monat 12/2025.	2026-02-01 09:56:35.432542+00	2026-02-01 09:56:35.432542+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.31, "schluessel": "BK Lift"}, "Mahnkosten": {"ust": 0, "betrag": 15, "schluessel": "Direktwert"}, "Warmwasser": {"ust": 10, "betrag": 11.21, "schluessel": "Direktwert"}, "Kaltwasser1": {"ust": 10, "betrag": 32.82, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 47.21, "schluessel": "Zentralheizung"}, "Betriebskosten1": {"ust": 10, "betrag": 49.22, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten2": {"ust": 10, "betrag": 54.85, "schluessel": "Betriebskosten 01"}}	0.00
0fb3d30a-be6a-42bd-9c1d-5ad6efc17ea7	d4fba9af-bd42-4355-8016-8aa32c0909dd	Perihan	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibung Monat 12/2025; BE-Nr. 22; Stiege/Tür: 3.OG/019; zweiter Mieter im Dokument: Hüsmen Güven; Befristung bis 2028-10-31; Zahlungsart: Dauerauftrag; Netto-Summe 618.55 (zzgl. USt 68.36 = Brutto 686.91).	2026-02-01 09:56:35.734989+00	2026-02-01 09:56:35.734989+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.16, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 32.31, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 19.1, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 54.01, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 64.99, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 48.47, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
a41cc22f-f42c-4578-8268-0295c0bbb8a4	d4fba9af-bd42-4355-8016-8aa32c0909dd	Hüsmen	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibung Monat 12/2025; BE-Nr. 22; Stiege/Tür: 3.OG/019; gemeinsamer Mietposten mit Perihan Güven; Befristung bis 2028-10-31.	2026-02-01 09:56:35.883181+00	2026-02-01 09:56:35.883181+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.16, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 32.31, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 19.1, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 54.01, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 64.99, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 48.47, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
514ecfaa-ea09-42d1-a137-b0022e51aebc	5827d936-05c8-49db-a63b-a86cfea3eda0	Timo	Hennes	\N	\N	\N	aktiv	2023-04-01	\N	681.02	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 23; Stiege/Tür-Nr: 3.OG/020; Vertragsbeginn 01.04.2023; Verrechnung ab 01.04.2023; Befristung 31.03.2026; Kündigungsverzicht bis 31.03.2024; Zahlungsart: Zahlschein; Vorschreibung Monat 12/2025; Menge/Index: VO; Betriebskosten-Schlüsselwerte: 83,49 Einheiten; BK Lift: 83,49 m²	2026-02-01 09:56:36.182807+00	2026-02-01 09:56:36.182807+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 58.44, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 8.43, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 97.68, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 48.37, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 87.66, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 18.37, "schluessel": "BK Lift"}}	0.00
4b14eabf-7c4b-49f8-9ace-502064f4dc5d	511f874d-41db-42fc-b1ab-f7dc388aaabe	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 35; Nutzungsart: Garagenstellplatz; Kunden-Nr 00402 0035 003; Verrechnung ab 2024-12-01; Befristung: 2027-11-30; Zahlungsart: Dauerauftrag; Vorschreibungsmonat: 12/2025	2026-02-01 09:56:38.673342+00	2026-02-01 09:56:38.673342+00	\N	0.00	{"Garagenmiete": {"ust": 20, "betrag": 46.45, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 14.14, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten_Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
e48ee4d1-6c6f-4ddd-9686-9d98768b2783	a8ed74ed-62fc-491f-b488-29664add45be	Monika	Mühlberger	\N	\N	\N	aktiv	2022-12-10	\N	381.29	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 24; weitere Mieterin im Dokument: Anna Ragauer; Stiege/Tür-Nr: /021; Vertragsbeginn 10.12.2022; Verrechnung ab 10.12.2022; Befristung 09.12.2028; Kündigungsverzicht bis 09.12.2023; Zahlungsart: Einzug; IBAN: AT10 2032 0232 0253 6955; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Vorschreibung Monat 12/2025; Menge/Index: VO; Betriebskosten-Schlüsselwerte: 36,69 Einheiten; BK Lift: 36,69 m²	2026-02-01 09:56:36.490107+00	2026-02-01 09:56:36.490107+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 25.68, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 15.74, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 42.93, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 45.26, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 38.52, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 8.07, "schluessel": "BK Lift"}}	0.00
e84e7327-6880-405a-bc40-e41cf6973c26	a8ed74ed-62fc-491f-b488-29664add45be	Anna	Ragauer	\N	\N	\N	aktiv	2022-12-10	\N	381.29	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 24; gemeinsam mit Monika Mühlberger als Mieterin geführt; Stiege/Tür-Nr: /021; Vertragsbeginn 10.12.2022; Verrechnung ab 10.12.2022; Befristung 09.12.2028; Kündigungsverzicht bis 09.12.2023; Zahlungsart: Einzug; IBAN: AT10 2032 0232 0253 6955; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Vorschreibung Monat 12/2025	2026-02-01 09:56:36.653733+00	2026-02-01 09:56:36.653733+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 25.68, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 15.74, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 42.93, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 45.26, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 38.52, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 8.07, "schluessel": "BK Lift"}}	0.00
32cea583-30d5-4081-9f35-fa8ea2987214	b56f0e45-9995-46b9-89fb-96fa96450b80	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	552.34	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 26; weiterer Mieter im Dokument: Oliver Weiß; Kunden-Nr 00402 0026 005; Verrechnung ab 2023-12-01; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Zahlungsart: Dauerauftrag	2026-02-01 09:56:36.969918+00	2026-02-01 09:56:36.969918+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 48.2, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 17.79, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 80.55, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 72.29, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 46.39, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 15.15, "schluessel": "BK Lift"}}	0.00
16d1a714-2897-45d7-a42c-c4df3bd807ef	b56f0e45-9995-46b9-89fb-96fa96450b80	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	552.34	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 26; weiterer Mieter im Dokument: Fabian Waischner; Kunden-Nr 00402 0026 005; Verrechnung ab 2023-12-01; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Zahlungsart: Dauerauftrag	2026-02-01 09:56:37.121997+00	2026-02-01 09:56:37.121997+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 48.2, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 17.79, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 80.55, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 72.29, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 46.39, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 15.15, "schluessel": "BK Lift"}}	0.00
bdd22487-ccf4-4e7c-8313-1d4aa1f6bcde	83a661c2-fc96-4127-9409-1efc3cf93006	Edina	Teuschler	\N	\N	\N	aktiv	2024-11-15	\N	540.98	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 27; Kunden-Nr 00402 0027 003; Zahlungsart Dauerauftrag; Vorschreibungsliste Monat 12/2025; Stiege/Tür-Nr: /024; Nutzfläche 0,00 m²; Summe Netto 744,22; Summe Brutto 820,64.	2026-02-01 09:56:37.427709+00	2026-02-01 09:56:37.427709+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 38.32, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 11.33, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 64.05, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 20.02, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 57.48, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 12.04, "schluessel": "BK Lift"}}	0.00
bf6626b9-5d48-40ee-b892-5205365b8efb	caa3e373-a01a-4825-80ff-f1e135374ebc	David	Zivko	\N	\N	\N	aktiv	2024-07-01	\N	254.60	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 28; Kunden-Nr 00402 0028 003; Geschoss 1. OG; Zahlungsart Dauerauftrag; Vertragsbeginn 01.07.2024; Befristung 30.06.2027; Kündigungsverzicht bis 30.06.2025; Stiege/Tür-Nr: 1.OG/002A; Nutzfläche 0,00 m²; Summe Netto 525,15; Summe Brutto 584,10.	2026-02-01 09:56:37.724531+00	2026-02-01 09:56:37.724531+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 41.47, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 20.26, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 69.31, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 64.28, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 62.2, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 13.03, "schluessel": "BK Lift"}}	0.00
f8a42242-6842-4714-a335-72ee94fcdb0e	3680c3a1-952d-44fa-8755-99896d91e719	Nadja	Bamberger	\N	\N	\N	aktiv	2020-06-15	\N	381.95	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 29; Verrechnung ab 2022-01-01; Befristung bis 2026-06-14; Kündigungsverzicht bis 2024-06-14; Zahlschein	2026-02-01 09:56:38.052181+00	2026-02-01 09:56:38.052181+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 36.51, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 8.92, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 61.03, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 54.77, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 38.76, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 11.48, "schluessel": "BK Lift"}}	0.00
ef310d9a-19d2-4fcc-9b97-bd6620e963a9	8abeaeb2-df2e-455f-99e3-1445d0e5032b	MAX	Orient OG	\N	\N	\N	aktiv	2022-01-01	\N	95.59	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 31; Nutzungsart: Garagenstellplatz; Verrechnung ab 2022-01-01; Einzug; IBAN: AT40 2031 7077 0117 6062; Bank: SPARKASSE LAMBACH BANK AKTIENGESELLSCHAFT	2026-02-01 09:56:38.373365+00	2026-02-01 09:56:38.373365+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 14.83, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
4e51b8d3-3a35-4c39-af6d-86610bf2b69c	74718f80-dbcf-4b2d-8270-65c78de0ad37	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 37; Nutzungsart: Garagenstellplatz; Kunden-Nr 00402 0037 001; Verrechnung ab 2022-01-01; Befristung: 2028-09-30; Zahlungsart: Zahlschein; Vorschreibungsmonat: 12/2025	2026-02-01 09:56:38.980598+00	2026-02-01 09:56:38.980598+00	\N	0.00	{"Garagenmiete": {"ust": 20, "betrag": 70.19, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 16.57, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten_Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
2b57f8bb-dc23-4745-a500-32ca329b1b60	9ec4cdea-73d6-403c-8cb6-55a103ba131a	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 38; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0038 001; Verrechnung ab: 2022-01-01; Zahlungsart: Zahlschein; Befristung: 2028-09-30	2026-02-01 09:56:39.283783+00	2026-02-01 09:56:39.283783+00	\N	0.00	{"Garagenmiete": {"ust": 20, "betrag": 70.19, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 13.25, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
ebeed833-5219-45ac-afd4-86451c9854a2	df8c957f-9f6a-44e3-ad62-d81f2ba4b6e7	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 39; weiterer Mieter genannt: Oliver Weiß; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0039 004; Verrechnung ab: 2023-12-01; Zahlungsart: Dauerauftrag; Befristung: 2026-11-30; Kündigungsverzicht bis: 2025-11-30	2026-02-01 09:56:39.59459+00	2026-02-01 09:56:39.59459+00	\N	0.00	{"Garagenmiete": {"ust": 20, "betrag": 61.86, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 14.04, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
9955d0e9-538e-4527-a036-c529d1a0fadd	df8c957f-9f6a-44e3-ad62-d81f2ba4b6e7	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 39; gemeinsam mit Fabian Waischner genannt; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0039 004; Verrechnung ab: 2023-12-01; Zahlungsart: Dauerauftrag; Befristung: 2026-11-30; Kündigungsverzicht bis: 2025-11-30	2026-02-01 09:56:39.754369+00	2026-02-01 09:56:39.754369+00	\N	0.00	{"Garagenmiete": {"ust": 20, "betrag": 61.86, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 14.04, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
79a1273a-cff2-4c90-b045-780190e6d92a	83c0fd34-547d-4b45-bc47-cf7b5f3d8d43	Norikum	Wohnungsbau-gesellschaft m.b.H.	\N	\N	\N	aktiv	2022-09-13	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 40; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0040 002; Verrechnung ab: 2022-09-13; Zahlungsart: Dauerauftrag	2026-02-01 09:56:40.052984+00	2026-02-01 09:56:40.052984+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 14.04, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
53625ac4-dde9-4055-ae25-e3e629c66083	e410076b-ecfb-431c-a433-e3f9ae535798	Timo	Hennes	\N	\N	\N	aktiv	2023-05-01	\N	62.91	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 42; Nutzungsart laut Dokument: Garagenstellplatz; Abrechnung ab 2023-05-01; Zahlungsart: Zahlschein; Standardvorschreibung 12/2025; USt 20% ausgewiesen (16,96) bei Netto 84,79; Summe brutto 101,75	2026-02-01 09:56:40.465335+00	2026-02-01 09:56:40.465335+00	\N	0.00	{"Garagenmiete": {"ust": 20, "betrag": 62.91, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 15.47, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
0cfd3ab0-1bb5-47ff-a629-e04fd923cdee	1d683902-1ff9-4bc0-9f94-95e01f01c13e	T	Vision L & T (Mergim Izairi)	\N	\N	\N	aktiv	2024-01-15	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 44; Nutzungsart PKW-Freiplatz; Kunden-Nr 00402 0044 003; Verrechnung ab 2024-02-01; Befristung bis 2027-01-14; Zahlungsart Dauerauftrag; IBAN AT80 2032 0321 0070 4125; Bank Allgemeine Sparkasse Oberösterreich BankAG; Netto-Summe 160.17; USt 20% 32.03; Brutto-Summe 192.20	2026-02-01 09:56:40.768927+00	2026-02-01 09:56:40.768927+00	\N	0.00	{"Garagenmiete": {"ust": 20, "betrag": 147.04, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 13.13, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
6e3592d7-ebbe-46b2-8556-c8ec1f6dde16	4a53a62f-ea18-4dfe-8420-f2cc59ed6391	MAX	Orient OG	\N	\N	\N	aktiv	2022-01-01	\N	1080.70	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Noricum Wohnbauträger Gmbh); Zahlungsart: Einzug; Abrechnung ab: 2022-01-01	2026-02-01 11:15:33.401371+00	2026-02-01 11:15:33.401371+00	\N	0.00	{"Kaltwasser": {"ust": 20, "betrag": 50.65, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 20, "betrag": 13.31, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 20, "betrag": 84.66, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 20, "betrag": 75.98, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 62.01, "schluessel": "Zentralheizung"}}	0.00
f53fcb73-a900-45aa-911f-c3abc8c5a8d3	c6ddf9fe-99e9-4448-a204-e7020a0740fd	Vision	L & T (Mergim Tzairi)	\N	\N	\N	aktiv	2024-01-15	\N	1333.64	0.00	0.00	\N	f	\N	\N	f	\N	Verrechnung ab: 2024-02-01; Befristung: 2027-01-14; Kündigungsverzicht bis: 2028-01-31; Zahlungsart: Dauerauftrag	2026-02-01 11:15:33.720081+00	2026-02-01 11:15:33.720081+00	\N	0.00	{"Kaltwasser": {"ust": 20, "betrag": 100.53, "schluessel": "Betriebskosten 01"}, "Mahnkosten": {"ust": 0, "betrag": 15, "schluessel": "Direktwert"}, "Warmwasser": {"ust": 20, "betrag": 13.36, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 20, "betrag": 168.02, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 20, "betrag": 150.79, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 73.44, "schluessel": "Zentralheizung"}}	0.00
388b48a2-4a02-491c-b759-24e4b55ed7f6	6fd5b5d9-9b17-4544-b4ca-4dc769c79a6d	Jamal	Al Karwani	\N	\N	\N	aktiv	2024-02-01	\N	444.24	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 3; Kunden-Nr. 00402 0003 002; Verrechnung ab 2024-02-01; Zahlungsart: Einzug; Kündigungsverzicht bis 2025-02-28	2026-02-01 11:15:34.045297+00	2026-02-01 11:15:34.045297+00	\N	0.00	{"Kaltwasser": {"ust": 20, "betrag": 26.6, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 20, "betrag": 5.53, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 20, "betrag": 44.46, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 77.45, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 20, "betrag": 39.9, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
b93046b6-f367-4c98-af23-9943903e3a73	8a05e073-ecf8-4a50-9d6a-690bf991972d	Gizella	Füzi	\N	\N	\N	aktiv	2021-03-15	\N	302.32	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 4; Geschoss: 1. OG; Stiege/Tür-Nr.: 1.OG/001; Kunden-Nr. 00402 0004 001; Verrechnung ab 2022-01-01; Befristung bis 2027-03-14; Kündigungsverzicht bis 2022-03-14; Zahlungsart: Zahlschein	2026-02-01 11:15:34.375259+00	2026-02-01 11:15:34.375259+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 13.81, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 43.93, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 12.01, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 73.42, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 44.79, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 65.89, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
67a71dec-57c3-41bd-b534-a72f4e7977ba	1c5b89b9-1d7a-4439-8d36-ac0a67c27afb	Nadja	Plavac	\N	\N	\N	aktiv	2005-05-01	\N	396.73	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 5; Kunden-Nr. 00402 0005 001; Verrechnung ab 2022-01-01; Zahlungsart: Zahlschein; Geschoss 1. OG; Stiege/Tür-Nr.: 1.OG/002	2026-02-01 11:15:34.69938+00	2026-02-01 11:15:34.69938+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 7.68, "schluessel": "BK Lift"}, "Warmwasser": {"ust": 10, "betrag": 11.34, "schluessel": "Direktwert"}, "Kaltwasser1": {"ust": 10, "betrag": 24.43, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 29.46, "schluessel": "Zentralheizung"}, "Betriebskosten1": {"ust": 10, "betrag": 40.83, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 36.65, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
662a1de7-c1a2-47ca-b350-e39fe102bbf2	31e79c7d-90e0-4871-a7ae-f6c564a132c4	Mihai-Alexandru	Ipatoaei	\N	\N	\N	aktiv	2018-06-15	\N	461.11	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 6; Kunden-Nr. 00402 0006 001; Verrechnung ab 2022-01-01; Zahlungsart: Einzug; IBAN: AT44 6000 0404 1010 3232; Bank: OESTERREICHISCHE POSTSPARKASSE; Geschoss 1. OG; Stiege/Tür-Nr.: 1.OG/003	2026-02-01 11:15:35.023836+00	2026-02-01 11:15:35.023836+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.14, "schluessel": "BK Lift"}, "Warmwasser": {"ust": 10, "betrag": 38.25, "schluessel": "Direktwert"}, "Kaltwasser1": {"ust": 10, "betrag": 32.25, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 35.7, "schluessel": "Zentralheizung"}, "Betriebskosten1": {"ust": 10, "betrag": 53.9, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 48.37, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
583ea4d5-6e28-4b4b-ab30-692bdf44d9bc	35d817a0-00a8-4d64-ac6d-f1ab84143f8d	Ioan-Marius	Hanti	\N	\N	\N	aktiv	2025-11-15	\N	466.48	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 7; Stiege/Tür-Nr.: 1.OG/004; Geschoss: 1. OG; Zahlungsart: Dauerauftrag; Abrechnung ab: 2025-11-15; Vorschreibungsmonat: 12/2025.	2026-02-01 11:15:35.341844+00	2026-02-01 11:15:35.341844+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 14.46, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 46, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.05, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 76.89, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 60.11, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 69.01, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
a9d6ba32-c6e9-4ce7-a9dc-31675b565005	2b41964f-88c9-4dcb-8c8b-f32f33a8cb7c	Madeleine	Allram	\N	\N	\N	aktiv	2024-12-09	\N	353.93	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 8; Stiege/Tür-Nr.: 2.OG/005; Geschoss: 2. OG; Zahlungsart: Dauerauftrag; Abrechnung ab: 2024-12-09; Befristung: 2027-12-08; Beendigung zum: 2026-03-31; Beendigungsart: Aufkündigung durch Benutzer; Kündigungsverzicht bis: 2025-12-31; Vorschreibungsmonat: 12/2025.	2026-02-01 11:15:35.659683+00	2026-02-01 11:15:35.659683+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 7.2, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 22.9, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 7.47, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 38.28, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 39.6, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 34.36, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
f395fd48-0e45-4531-a7f8-963940d98d08	d09d71fa-8083-428f-97bb-af74d05054fe	Iustinian	Adavidoae	\N	\N	\N	aktiv	2023-11-01	\N	305.90	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 9; Geschoss 2. OG; Stiege/Tür-Nr.: 2.OG/006; Zahlungsart: Dauerauftrag; Befristung: 31.10.2026; Kündigungsverzicht bis: 31.10.2024	2026-02-01 11:15:35.985788+00	2026-02-01 11:15:35.985788+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 6.07, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 19.31, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 3.26, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 32.27, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 20.53, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 28.96, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
3a422122-8720-47cd-8a6f-b8d8f491cca5	3d9f9711-5a3a-47ff-a64e-95bd33e62598	Cengiz	Kesgin	\N	\N	\N	aktiv	2025-06-16	\N	325.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 10; Geschoss 2. OG; Stiege/Tür-Nr.: 2.OG/007; Zahlungsart: Dauerauftrag; Befristung: 15.06.2028; Kündigungsverzicht bis: 15.06.2026	2026-02-01 11:15:36.298219+00	2026-02-01 11:15:36.298219+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 6.64, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 21.12, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 8.84, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 35.3, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 22.49, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 31.68, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
bbee7a70-173e-4a60-8808-1cef62643970	bd9ef0f4-2cdf-4646-a327-221ecbab072c	Wolfgang	Raab	\N	\N	\N	aktiv	2013-11-01	\N	414.31	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibung Monat 12/2025; BE-Nr. 11; Geschoss 2. OG; Stiege/Tür 2.OG/008; Zahlungsart Einzug; Verrechnung ab 2022-01-01	2026-02-01 11:15:36.613538+00	2026-02-01 11:15:36.613538+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 10.31, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 32.82, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 5.1, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 54.85, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 39.1, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 49.22, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
1b9598ef-7add-484a-b5bd-ab31a99fe9e3	2b5ab87e-647b-4988-bd9c-0201b6c9cf55	Katharina	Stiefmüller	\N	\N	\N	aktiv	2012-05-01	\N	410.31	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibung Monat 12/2025; BE-Nr. 12; Geschoss 2. OG; Stiege/Tür 2.OG/009; Zahlungsart Zahlschein; Verrechnung ab 2022-01-01	2026-02-01 11:15:36.930957+00	2026-02-01 11:15:36.930957+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 8.94, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 28.43, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 9.11, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 47.53, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 31.44, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 42.65, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
85461048-fb6f-4ead-8434-b67995a2571e	394a1218-5552-4a88-978d-66d1a82386c7	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 38; Nutzungsart: Garagenstellplatz; Kunden-Nr. 00402 0038 001; Verrechnung ab 2022-01-01; Zahlungsart: Zahlschein; Befristung bis 2028-09-30; Stiege/Tür-Nr.: /TG09; Vorschreibung Monat 12/2025	2026-02-01 11:15:42.368031+00	2026-02-01 11:15:42.368031+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 13.25, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
60c78c28-8234-47e6-99ff-615b635ad420	bda17640-83cf-423f-bd30-013aaa7f91ae	Darko	Terek	\N	\N	\N	aktiv	2019-08-01	\N	580.86	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 15; weitere Person genannt: Suzana Zrinski Terek; Verrechnung ab 2022-01-01; Befristung bis 2028-07-31; Stiege/Tür: 2.OG/012; Zahlungsart: Zahlschein.	2026-02-01 11:15:37.245204+00	2026-02-01 11:15:37.245204+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 14.46, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 46, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 21.6, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 76.89, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 50.81, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 69.01, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
10a4c2fb-9663-43ea-b60c-cd50eba2ce36	61b5644a-ed8e-4efc-ba9f-bc17b7ef872a	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	306.50	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 16; Verrechnung ab 2024-12-01; Befristung bis 2027-11-30; Stiege/Tür: 3.OG/013; Zahlungsart: Dauerauftrag.	2026-02-01 11:15:37.550213+00	2026-02-01 11:15:37.550213+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 7.2, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 22.9, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 8.75, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 38.28, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 20.6, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 34.36, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
2f01d4a6-ad1f-4e7a-9558-35dd389e4dd9	4a2af100-ca16-4d1d-9205-c5fb2cc9824c	Ali Reza	ARYA	\N	\N	\N	aktiv	2024-12-01	\N	266.05	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 17; Kunden-Nr. 00402 0017 005; Geschoss 3. OG; Stiege/Tür-Nr. 3.OG/014; Befristung bis 2027-11-30; Verrechnung ab 2024-12-01; Zahlungsart: Dauerauftrag.	2026-02-01 11:15:37.853819+00	2026-02-01 11:15:37.853819+00	\N	0.00	{"Lift": {"ust": 10, "betrag": 6.07, "schluessel": "BK Lift"}, "Kaltwasser": {"ust": 10, "betrag": 19.31, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 6.15, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 32.27, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 29.46, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 28.96, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
4d78a4ed-2099-4f78-8314-d519280fc340	8c330c60-24e3-4fda-b2a0-2a5c3c955cbe	Aja	Muhandes	\N	\N	\N	aktiv	2025-04-01	\N	281.28	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 19; Geschoß 3. OG; Stiege/Tür-Nr. 3.OG/016; Kunden-Nr. 00402 0019 003; Befristung bis 2028-03-31; Verrechnung ab 2025-04-01; Zahlungsart Einzug; Mahnung in Vorschreibung.	2026-02-01 11:15:38.157535+00	2026-02-01 11:15:38.157535+00	\N	0.00	{"Mahnkosten": {"ust": 0, "betrag": 15, "schluessel": "Direktwert"}, "Warmwasser": {"ust": 10, "betrag": 11.21, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 32.82, "schluessel": "Betriebskosten 01"}, "Betriebskosten1": {"ust": 10, "betrag": 49.22, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten2": {"ust": 10, "betrag": 54.85, "schluessel": "Betriebskosten 01"}, "Zentralheizung 1": {"ust": 20, "betrag": 47.21, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 10.31, "schluessel": "BK Lift"}}	0.00
e06d765a-c967-4623-ba79-2d96fb99c0f2	1ff4daf6-1b54-472a-bcd4-951b566c3eba	A.L	GmbH	\N	\N	\N	aktiv	2022-07-01	\N	373.50	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 20; Geschoß 3. OG; Stiege/Tür-Nr. 3.OG/017; Kunden-Nr. 00402 0020 002; Befristung bis 2028-06-30; Verrechnung ab 2022-07-01; Zahlungsart Einzug.	2026-02-01 11:15:38.466228+00	2026-02-01 11:15:38.466228+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 9.9, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 28.44, "schluessel": "Betriebskosten 01"}, "Betriebskosten1": {"ust": 10, "betrag": 42.66, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten2": {"ust": 10, "betrag": 47.54, "schluessel": "Betriebskosten 01"}, "Zentralheizung 1": {"ust": 20, "betrag": 35.78, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 8.94, "schluessel": "BK Lift"}}	0.00
a8c0c232-6526-477d-8cbb-9e39b7b1aa9b	a60749ac-004e-4941-bb5b-f55fa2f3e7b6	Perihan	Güven	\N	\N	\N	aktiv	2022-11-01	\N	389.51	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 22; weiterer Mieter: Hüsmen Güven; Geschoss 3. OG; Stiege/Tür-Nr 3.OG/019; Kunden-Nr 00402 0022 05; Befristung bis 2028-10-31; Zahlungsart Dauerauftrag; Nutzfläche 0,00 m² im Dokument	2026-02-01 11:15:38.772714+00	2026-02-01 11:15:38.772714+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 19.1, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 32.31, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 48.47, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten 1": {"ust": 10, "betrag": 54.01, "schluessel": "Betriebskosten 01"}, "Zentralheizung 1": {"ust": 20, "betrag": 64.99, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 10.16, "schluessel": "BK Lift"}}	0.00
871341f3-90c8-4447-ae85-e0ebb963dd32	a60749ac-004e-4941-bb5b-f55fa2f3e7b6	Hüsmen	Güven	\N	\N	\N	aktiv	2022-11-01	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	Im Dokument als (Mit-)Mieter bei BE-Nr 22/Top 019 genannt; Kosten wurden unter Perihan Güven ausgewiesen.	2026-02-01 11:15:38.925162+00	2026-02-01 11:15:38.925162+00	\N	0.00	{}	0.00
0addf53f-5e12-4228-bf35-65e2c9484ea9	655f44af-4b87-4e30-8fb0-6e506b33cdbf	Timo	Hennes	\N	\N	\N	aktiv	2023-04-01	\N	681.02	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH), Vorschreibung Monat 12/2025; Verrechnung ab 2023-04-01; Befristung 2026-03-31; Kündigungsverzicht bis 2024-03-31; Zahlungsart: Zahlschein; Stiege/Tür-Nr.: 3.OG/020	2026-02-01 11:15:39.229723+00	2026-02-01 11:15:39.229723+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 58.44, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 8.43, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 97.68, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 48.37, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 87.66, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 18.37, "schluessel": "BK Lift"}}	0.00
b92d9f0a-34b6-4e94-9b1a-ab4893b9d8a7	24d5c520-f275-4ce5-b5b4-3e7cd9425ee1	Monika	Mühlberger	\N	\N	\N	aktiv	2022-12-10	\N	381.29	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH), Vorschreibung Monat 12/2025; Verrechnung ab 2022-12-10; Befristung 2028-12-09; Kündigungsverzicht bis 2023-12-09; Zahlungsart: Einzug; IBAN: AT10 2032 0232 0253 6955; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Stiege/Tür-Nr.: /021; weiterer Mieter im Dokument: Anna Ragauer	2026-02-01 11:15:39.551335+00	2026-02-01 11:15:39.551335+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 25.68, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 15.74, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 42.93, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 45.26, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 38.52, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 8.07, "schluessel": "BK Lift"}}	0.00
e84de276-a97b-453b-8f86-6b0437746f40	24d5c520-f275-4ce5-b5b4-3e7cd9425ee1	Anna	Ragauer	\N	\N	\N	aktiv	2022-12-10	\N	381.29	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH), Vorschreibung Monat 12/2025; gemeinsam mit Monika Mühlberger; Verrechnung ab 2022-12-10; Befristung 2028-12-09; Kündigungsverzicht bis 2023-12-09; Zahlungsart: Einzug; IBAN: AT10 2032 0232 0253 6955; Bank: Allgemeine Sparkasse Oberösterreich BankAG; Stiege/Tür-Nr.: /021	2026-02-01 11:15:39.702598+00	2026-02-01 11:15:39.702598+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 25.68, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 15.74, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 42.93, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 45.26, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 38.52, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 8.07, "schluessel": "BK Lift"}}	0.00
5d9e99a6-5b03-4ed7-b52d-4caaa538ea42	8b1de22a-6fe8-48c4-86d7-762c87b2029e	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	552.34	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 26; weiterer Mieter: Oliver Weiß; Kunden-Nr. 00402 0026 005; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Zahlungsart: Dauerauftrag; Stiege/Tür-Nr.: /023	2026-02-01 11:15:40.006084+00	2026-02-01 11:15:40.006084+00	\N	0.00	{"Kaltwasser 1": {"ust": 10, "betrag": 48.2, "schluessel": "Betriebskosten 01"}, "Warmwasser 1": {"ust": 10, "betrag": 17.79, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 10, "betrag": 72.29, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten 1": {"ust": 10, "betrag": 80.55, "schluessel": "Betriebskosten 01"}, "Zentralheizung 1": {"ust": 20, "betrag": 46.39, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 15.15, "schluessel": "BK Lift"}}	0.00
4db8c04a-38b0-480c-8bd8-bbf208993468	8b1de22a-6fe8-48c4-86d7-762c87b2029e	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	552.34	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 26; weiterer Mieter: Fabian Waischner; Kunden-Nr. 00402 0026 005; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Zahlungsart: Dauerauftrag; Stiege/Tür-Nr.: /023	2026-02-01 11:15:40.157485+00	2026-02-01 11:15:40.157485+00	\N	0.00	{"Kaltwasser 1": {"ust": 10, "betrag": 48.2, "schluessel": "Betriebskosten 01"}, "Warmwasser 1": {"ust": 10, "betrag": 17.79, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 10, "betrag": 72.29, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten 1": {"ust": 10, "betrag": 80.55, "schluessel": "Betriebskosten 01"}, "Zentralheizung 1": {"ust": 20, "betrag": 46.39, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 15.15, "schluessel": "BK Lift"}}	0.00
cc42f74c-115d-4e46-afce-222885fb5745	0c132150-6856-400a-85e3-ed4b1e8c3c0b	Edina	Teuschler	\N	\N	\N	aktiv	2024-11-15	\N	540.98	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH), Obj.-Nr. 402; BE-Nr. 27; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025.	2026-02-01 11:15:40.460337+00	2026-02-01 11:15:40.460337+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 11.33, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 38.32, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 10, "betrag": 64.05, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 57.48, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 20.02, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 12.04, "schluessel": "BK Lift"}}	0.00
a8664f58-37b6-40ca-bb07-94509209435c	4b2d1cfd-cb11-4697-bc20-ba6e8dc9ce8b	David	Zivko	\N	\N	\N	aktiv	2024-07-01	\N	254.60	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger GmbH), Obj.-Nr. 402; BE-Nr. 28; Geschoß: 1. OG; Stiege/Tür-Nr.: 1.OG/002A; Vertragsbeginn/Verrechnung ab: 2024-07-01; Befristung bis: 2027-06-30; Kündigungsverzicht bis: 2025-06-30; Zahlungsart: Dauerauftrag; Vorschreibung Monat 12/2025.	2026-02-01 11:15:40.774821+00	2026-02-01 11:15:40.774821+00	\N	0.00	{"Warmwasser": {"ust": 10, "betrag": 20.26, "schluessel": "Direktwert"}, "Kaltwasser 1": {"ust": 10, "betrag": 41.47, "schluessel": "Betriebskosten 01"}, "Betriebskosten": {"ust": 10, "betrag": 69.31, "schluessel": "Betriebskosten 01"}, "Betriebskosten2": {"ust": 10, "betrag": 62.2, "schluessel": "Betriebskosten inkl Stellplätze"}, "Zentralheizung 1": {"ust": 20, "betrag": 64.28, "schluessel": "Zentralheizung"}, "Betriebskosten Lift": {"ust": 10, "betrag": 13.03, "schluessel": "BK Lift"}}	0.00
854ddd1c-6e9e-47d2-9e2b-28e8417321bc	12f3e307-eea4-47b9-bdce-d5b4ba0edb2f	Nadja	Bamberger	\N	\N	\N	aktiv	2020-06-15	\N	381.95	0.00	0.00	\N	f	\N	\N	f	\N	Objekt: Stelzhamerstraße 12/Spitalhof 7 (Norikum Wohnbauträger Gmbh), Vorschreibung Monat 12/2025. Kunden-Nr.: 00402 0029 001. Verrechnung ab: 2022-01-01. Zahlungsart: Zahlschein. Befristung: 2026-06-14. Kündigungsverzicht bis: 2024-06-14. Menge/Index: BK 52,16 Einheiten; Lift 11,16 m².	2026-02-01 11:15:41.071966+00	2026-02-01 11:15:41.071966+00	\N	0.00	{"Kaltwasser": {"ust": 10, "betrag": 36.51, "schluessel": "Betriebskosten 01"}, "Warmwasser": {"ust": 10, "betrag": 8.92, "schluessel": "Direktwert"}, "Betriebskosten": {"ust": 10, "betrag": 61.03, "schluessel": "Betriebskosten 01"}, "Zentralheizung": {"ust": 20, "betrag": 38.76, "schluessel": "Zentralheizung"}, "Betriebskosten2": {"ust": 10, "betrag": 54.77, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Lift": {"ust": 10, "betrag": 11.48, "schluessel": "BK Lift"}}	0.00
59f397ea-2082-46c8-b3e3-36b78504e40b	926799f3-87a0-4d49-8511-8eb1809d6c56	MAX	Orient OG	\N	\N	\N	aktiv	2022-01-01	\N	95.59	0.00	0.00	\N	f	\N	\N	f	\N	Nutzungsart: Garagenstellplatz. Kunden-Nr.: 00402 0031 001. Verrechnung ab: 2022-01-01. Zahlungsart: Einzug. IBAN: AT40 2031 7077 0117 6062. Bank: SPARKASSE LAMBACH BANK AKTIENGESELLSCHAFT. Menge/Index: BK inkl Stellplätze 14,12 Einheiten; BK Garage 1,00 Stk.	2026-02-01 11:15:41.371011+00	2026-02-01 11:15:41.371011+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 14.83, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
c8db2cec-ef2b-4902-a578-2f0c2b45511f	cc0a8ffc-96e9-4b07-b501-b94ca49a58aa	Diana	Ribic	\N	\N	\N	aktiv	2024-12-01	\N	46.45	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 35; Nutzungsart: Garagenstellplatz; Kunden-Nr 00402 0035 003; Verrechnung ab 2024-12-01; Befristung bis 2027-11-30; Zahlungsart: Dauerauftrag.	2026-02-01 11:15:41.677494+00	2026-02-01 11:15:41.677494+00	\N	0.00	{"BK Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}, "Betriebskosten2": {"ust": 20, "betrag": 14.14, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
ef1f4d9f-fb46-421c-8339-33c60ec9f5dc	00181224-49bc-4c58-8957-46439bc266e0	Darko	Terek	\N	\N	\N	aktiv	2019-10-01	\N	70.19	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr 37; Nutzungsart: Garagenstellplatz; Kunden-Nr 00402 0037 001; Verrechnung ab 2022-01-01; Befristung bis 2028-09-30; Zahlungsart: Zahlschein.	2026-02-01 11:15:41.978821+00	2026-02-01 11:15:41.978821+00	\N	0.00	{"BK Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}, "Betriebskosten2": {"ust": 20, "betrag": 16.57, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
6f291fe0-e9d7-43b6-ba74-91d0d16aeb1b	523e2832-42b0-427b-a46a-1e0169fd6477	Fabian	Waischner	\N	\N	\N	aktiv	2023-12-01	\N	61.86	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 39; Nutzungsart: Garagenstellplatz; weiterer Mietername im Dokument: Oliver Weiß; Kunden-Nr. 00402 0039 004; Art: Hauptmieter(in); Verrechnung ab 2023-12-01; Zahlungsart: Dauerauftrag; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Stiege/Tür-Nr.: /TG10; Vorschreibung Monat 12/2025	2026-02-01 11:15:42.664333+00	2026-02-01 11:15:42.664333+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 14.04, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
745bd6b7-f643-4316-ac05-198ffd49b302	523e2832-42b0-427b-a46a-1e0169fd6477	Oliver	Weiß	\N	\N	\N	aktiv	2023-12-01	\N	61.86	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 39; Nutzungsart: Garagenstellplatz; gemeinsamer Eintrag mit Fabian Waischner; Kunden-Nr. 00402 0039 004; Art: Hauptmieter(in); Verrechnung ab 2023-12-01; Zahlungsart: Dauerauftrag; Befristung bis 2026-11-30; Kündigungsverzicht bis 2025-11-30; Stiege/Tür-Nr.: /TG10; Vorschreibung Monat 12/2025	2026-02-01 11:15:42.936606+00	2026-02-01 11:15:42.936606+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 14.04, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
302fc7e6-ec40-4805-9be8-3389d4d96efd	ee472044-0c9b-4467-b5ff-c8b64cea08bc	Norikum	Wohnungsbau-gesellschaft m.b.H.	\N	\N	\N	aktiv	2022-09-13	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	BE-Nr. 40; Nutzungsart: Garagenstellplatz; Kunden-Nr. 00402 0040 002; Verrechnung ab 2022-09-13; Zahlungsart: Dauerauftrag; Stiege/Tür-Nr.: /TG11; Vorschreibung Monat 12/2025; Garagenmiete-Betrag im Dokument nicht ersichtlich	2026-02-01 11:15:43.239737+00	2026-02-01 11:15:43.239737+00	\N	0.00	{"Betriebskosten2": {"ust": 20, "betrag": 14.04, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
b42fc52a-bcdf-4d93-a471-27df0c634b6b	2cfaade7-c993-481e-becc-05ddcd868949	Timo	Hennes	\N	\N	\N	aktiv	2023-05-01	\N	62.91	0.00	0.00	\N	f	\N	\N	f	\N	Vorschreibungsliste 12/2025; BE-Nr. 42; Nutzungsart: Garagenstellplatz; Kunden-Nr.: 00402 0042 003; Verrechnung ab: 2023-05-01; Zahlungsart: Zahlschein; Summe netto 84.79, brutto 101.75	2026-02-01 11:15:43.548694+00	2026-02-01 11:15:43.548694+00	\N	0.00	{"UST 20%": {"ust": 0, "betrag": 16.96, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 15.47, "schluessel": "Betriebskosten inkl Stellplätze"}, "Betriebskosten Garage": {"ust": 20, "betrag": 6.41, "schluessel": "BK Garage"}}	0.00
f49f7636-6966-442f-92c2-bdd6cefc7b59	0b1e6a4f-6c64-420e-8f37-5bd2b3136cdc	Vision	L & T (Mergim Izairi)	\N	\N	\N	aktiv	2024-01-15	\N	0.00	0.00	0.00	\N	f	\N	\N	f	\N	Nutzungsart: PKW-Freiplatz; Vertragsbeginn 15.01.2024; Befristung bis 14.01.2027; Verrechnung ab 01.02.2024; Zahlungsart: Dauerauftrag; IBAN: AT80 2032 0321 0070 4125	2026-02-01 11:15:43.840884+00	2026-02-01 11:15:43.840884+00	\N	0.00	{"Garagenmiete": {"ust": 20, "betrag": 147.04, "schluessel": "Direktwert"}, "Betriebskosten2": {"ust": 20, "betrag": 13.13, "schluessel": "Betriebskosten inkl Stellplätze"}}	0.00
00000000-0000-0000-0000-000000000021	00000000-0000-0000-0000-000000000011	Test	Mieter	\N	\N	\N	aktiv	\N	\N	650.00	120.00	80.00	\N	f	\N	\N	f	\N	\N	2026-02-01 13:53:17.364+00	2026-02-01 13:53:17.36434+00	\N	0.00	\N	0.00
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, organization_id, bank_account_id, amount, transaction_date, booking_text, partner_name, partner_iban, reference, category_id, is_matched, matched_tenant_id, matched_unit_id, raw_data, created_at) FROM stdin;
241dd378-cb6f-4d5f-9d0e-a900795c6eaa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:51.082019+00
47e841af-c451-45e2-ab56-fd001fd33b0d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:46.581678+00
2f5a2e1c-9141-4e4b-a923-e0487882c614	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:46.743171+00
1a3abca5-c437-4fc6-9be2-93fce3ce47fa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:46.899426+00
519949eb-3203-4dad-9a25-0c3446583e4a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:47.06791+00
eb954fe9-9221-49e1-bcdc-0fcc2e1fd16f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:47.244354+00
85b1ef97-9d44-4b03-a5b3-38891789d924	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:47.413251+00
8a865a2e-893e-4428-941f-ec830ab15a61	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:47.564491+00
89b88d3f-c08f-435b-9fea-ed6dd0d75d37	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:47.717428+00
5bd6635f-e5eb-46bd-b562-73c79697c0a4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:47.868641+00
af9d3e7e-e3fe-448e-9720-45a2ef1dea61	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:48.021393+00
59e23f22-e2f4-42cc-a363-d53eb06dae38	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:48.17948+00
f0eadd21-379e-4340-b8c3-2c2ad2895c9c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:48.337865+00
62a82b37-d821-4516-8d69-f9b48307f344	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:48.499396+00
8b497c12-c5cc-45eb-a72a-6ed36d5d586f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:48.666938+00
cbd44cb1-bde4-45ff-9d10-dc159ed08126	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:48.829708+00
416431f4-67ca-4097-a3d9-9af8f105a9e3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:48.978575+00
e2011b51-1bc5-4a80-b5ba-69bcb5964ae3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:49.144732+00
1db9d355-211e-4447-a82c-dd1e64873d97	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:49.303721+00
b7f81027-9457-4c94-8a33-8a3e1e869907	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:49.456656+00
48ebdee7-7ff0-4c53-b305-8edaf86a91d0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:49.617592+00
8604f597-6fd7-4a58-b2ae-e6ef18e25497	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:49.774562+00
79637444-2e77-453d-afd4-81a5a83f86b5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:49.933164+00
14ddc795-dd64-4491-81a7-cc489ebf831f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:50.088761+00
a01a5311-4475-4b04-b30c-89821e639f0a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:50.248904+00
e881c04d-5529-4881-939f-7ec365fb5f1b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:50.403524+00
3da2fbed-be3c-4ffc-8938-5aa77dac7177	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:50.564304+00
9ec2689d-9166-44e7-9109-49fff25b7dd5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:50.751041+00
7e79cf40-ce97-4ea3-9595-eb1dabb848e8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:50.920319+00
d633bdd0-5078-48e6-9f02-a40d4e87ccd1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:51.239361+00
0a032d03-60a5-44e5-90bd-2f9822598011	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:51.403863+00
abdc6e37-4558-411f-9fa4-b946256dd529	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:51.555814+00
220c0707-322b-4304-a95a-ddd27b9fd2f2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:51.715317+00
1d62d498-392b-47e8-8077-fb7a8806f54a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:51.871164+00
aede5ad7-5127-450a-8a16-774bce4b398e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:52.020571+00
e2750a30-375f-4624-955d-f20a568d682a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:52.175419+00
9f3c2d38-a3f1-4d90-a3cd-c2b5679be402	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:52.33333+00
37181e89-57bf-40af-aac7-b3fb5e5c9d77	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:52.491092+00
eb54e7f5-fd7b-4fa3-be4d-1433b10f3d1c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:52.647942+00
a1397e0b-1e75-4b86-967f-1dc9b308674f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:52.804424+00
4c9d4c2d-b3cf-4aa6-8d0f-8e2f4d628aef	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:52.95872+00
7d671142-eb82-47b2-9f8e-c9ede33c6fc2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:53.117465+00
ad0d585f-77d4-4b35-9d7d-840b0db148dd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:53.274581+00
30a83120-3096-4ab2-b581-7a1e3508a829	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:53.431227+00
0a120418-b023-413b-8b0a-fe3cc94b921c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:53.58376+00
94898197-bc17-4aa9-97b4-75f6c5b889cd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:53.735586+00
664f6c4b-4289-4997-afa6-8ce104d722bc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:53.888963+00
521604ad-4376-480f-ad45-34ad98a681c7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:54.046895+00
c2fc5670-859c-4cdf-817e-51b506e699b3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:54.204753+00
70421809-69d7-4f4d-a3e7-d5cd8015d8f9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:54.361094+00
7533fffd-ddb1-454e-b51d-af9c2f718fe7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:54.51731+00
3c2c42b9-b5f3-4b60-9ab0-bbd3dcaa306a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:54.676127+00
2385421a-a99d-4050-b012-86209075de69	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:54.827505+00
20d86e7a-91d8-45f1-a480-514b40a08731	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:54.978395+00
5b81b330-9fc1-4a2b-a7bf-89749ecbe367	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:55.134542+00
1da4d661-0c03-4a9e-9a21-502b1ed74d93	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:55.285459+00
e974b208-a11b-47a7-a755-c5cca2f3f895	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:07:55.440776+00
3fd20f07-71be-4aa6-b612-4a06b8bb1cab	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:29.436038+00
a60820fe-3ff2-4f84-8c71-9e6ffe15a33e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:29.594537+00
dd76c9a3-07a5-4ca3-8992-87dec1e1b128	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:29.766899+00
3c450fc2-c904-442a-a07e-45d2e25496b4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:29.92522+00
6f357c35-2c0a-4fe5-a37d-c80a4e903aca	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:30.096083+00
74f7e05f-b752-41e9-947c-8329b6372774	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:30.297369+00
17d77cb5-f65c-4bc1-a39d-b4d0f61ff4ad	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:30.471065+00
dabf9cd0-6aa8-44b0-9cff-5d0831e1b4ad	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:30.641278+00
2c7f0af7-02da-428f-be14-2bc26bedb825	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:30.798868+00
791834c1-4da9-4ee1-a657-3632ffd5af6c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:30.946401+00
6696af0d-bc98-4078-80ab-1016ad3e0ba5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:31.12582+00
f49ca4d4-2580-41e6-bb3e-874ee340d6c3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:31.29353+00
5a57eede-88a5-4f2d-a85d-86d5b21e438f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:31.448082+00
ea1528a2-e191-4e4f-840e-b60803f3f948	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:31.613668+00
35e8bc47-9c7d-4f64-9658-934f390c2b6d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:31.779976+00
f1034cd9-f1a0-4bbb-a3ad-4e6fde11d9fa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:31.937705+00
88bf258a-148d-426d-9967-c9856bdfb63d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:32.111573+00
90aa848d-db37-4bda-bd72-d6aef79d4de8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:32.288119+00
02710a56-7b52-455e-8916-09eb67ba6834	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:32.442596+00
bb049afd-ee00-4d69-807e-16b172da4759	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:32.595627+00
08ddfe91-3699-47b8-b2ba-f59f72b0ba24	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:32.753944+00
8967aa29-e8f2-4484-8701-aae7273a4f0d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:32.914457+00
7c323b08-d812-4096-ab5d-70f0ada78ee8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:33.071396+00
8aa69742-a108-4bea-bb67-12b180be8cbb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:33.237028+00
2f992f37-df10-439a-9e32-d4bc67bf6518	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:33.411213+00
242cfa3a-5103-4afb-9103-e22d3f535a0e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:33.57501+00
778d5b50-49c3-4b0b-93c7-cf0b8477fe90	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:33.73803+00
121a8a11-9bc8-4dd5-9dc0-ea49f42cbaad	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:33.893282+00
fea22e35-9222-4c30-963b-b2434b72ff6e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:34.058134+00
7347379a-8a58-4c7e-83a2-32849d2297f5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:34.233476+00
85870a55-d9e9-45e9-81be-77e41c7f3e14	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:34.400523+00
23581abc-5215-4c0e-b9a6-5ea5a7b5e114	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:34.566547+00
feec1973-c6dd-4b11-a8bf-79fed27181c0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:34.731156+00
d309b858-47b4-4ba6-9b48-c34dcad1a482	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:34.891289+00
d2c764d9-0812-42ff-a9ee-9318bc080570	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:35.069172+00
41b7220e-4e41-44f3-9f7e-946240c6bd51	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:35.241463+00
96585397-c93f-46a1-9869-ecc73dfc03a9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:35.403471+00
8c2ac371-6b6d-4fcf-a99c-96919663e946	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:35.552882+00
fbdcba28-18b3-4f5f-ba7d-33da0c07e8b3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:35.717909+00
61751073-d48a-494e-bb2c-c94128e16f84	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:35.871276+00
8e06bceb-b9bf-4554-a5a4-8f99c263713f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:36.031936+00
7334fead-14ba-41f9-8867-74e4468d103d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:36.202107+00
69ba11cc-0fc0-4fb7-a0bf-859b84f7cc7c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:36.371372+00
3f2d0a54-81f4-403a-a9f4-68a1c92fae7d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:36.52358+00
6745c085-295d-42af-bca6-440767c640ca	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:36.679255+00
f9183c88-4013-4b00-8879-070db56a614b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:36.832256+00
ca25a950-976f-4ee5-adec-025b667e5992	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:36.987946+00
31717772-b096-4548-983c-4076906725fc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:37.162466+00
0a16333f-ca2d-4d8b-a8c5-846f3958d3e0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:37.326258+00
bf905d21-04de-43d5-bf3c-938315dcbbdc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:37.483221+00
3f7aad34-6d1d-48ad-bb0a-e9710f78bd32	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:37.653995+00
7965de77-ede4-4c94-b9a7-ee531c113589	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:37.813175+00
b8630ed3-e935-4b9c-85ed-7a8491ad5c75	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:37.96055+00
1f8ca3e8-d849-4038-b8b2-0fc5fb7def50	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:38.111038+00
0742671c-27e0-4674-a357-e3e3c7db5c8f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:38.256376+00
c1ef9202-ce1a-427e-b354-dd3a2305687d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:38.423744+00
1869b753-347d-4268-9333-aa305c57ae18	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:43:38.5852+00
01660bf1-dba2-41da-94e5-9f42f0b8a8bb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:03.748605+00
dfa4f25b-b329-4513-83ac-af765101dbf6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:03.905759+00
12128ac4-bf80-42cd-b8d0-c7324facede2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:04.065534+00
c2742984-10e4-4f15-b9c1-abe4c9da69f0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:04.228775+00
7e3d7e7e-913c-4fac-b160-480054c2bd45	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:04.381326+00
ddde259f-38f1-497b-bc11-1a408e417089	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:04.535849+00
6aea4007-da9a-44c0-8188-8cd17b3073a0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:04.692638+00
a31d40c5-dea0-4c5b-9e34-ca1066e299ab	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:04.846071+00
262a3dbc-a073-4652-9a89-94f8e7369d6e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:05.00075+00
24af1a09-6787-4a67-a7c4-dc6921985b38	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:05.158901+00
422226d9-2835-43ff-9ae5-7f5149b0d5fc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:05.317672+00
711e153a-5947-4e21-a8fd-00a51b4d5d83	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:05.472215+00
f3595085-2005-4d97-ac01-81eb633ff1ca	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:05.62482+00
5ecc8d74-27f7-4d75-ba9b-07b429b3d94a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:05.783591+00
46248489-c90c-47a3-b030-9f2ac081aedf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:05.938402+00
db9ea61f-8c78-42c2-80c2-6b94b5db22a1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:06.083532+00
1cfeaac2-1b25-4953-b5ad-db45d25be97c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:06.241758+00
2fc01872-d496-467a-9864-6656e0ab8df3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:06.392803+00
a34a1205-43a7-49c9-adb1-386f5af14e7e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:06.542026+00
634f17ef-65d1-42a9-a48a-c8900fb739cf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:06.698062+00
803573dc-5edb-4b2e-84a0-a27ae94f50d7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:06.843557+00
06abad1c-1945-4f1a-9cff-aa04c85e2f27	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:06.995243+00
9f0b7f29-9297-49e1-a8fe-a024903c1471	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:07.149716+00
8d8822b4-7ac3-4c97-b56b-02ea707ee82c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:07.298613+00
fe953811-26d9-421e-9871-ebe152a228d3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:07.560442+00
327afd33-7cb0-497d-97bf-fcc5ffa383e0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:07.706638+00
44b4acbc-3eec-4ae7-a1e4-ecc0dffe8004	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:07.85443+00
4ceb20b0-5760-4a5d-8332-262cf78b5a4c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:08.005372+00
76bd41ad-1fc1-4b03-8c4f-d93241660a43	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:08.189215+00
639067e8-237e-413a-adcd-0a9088367802	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:08.353532+00
a83766d6-f139-4629-b61c-ddd0f96186db	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:08.516536+00
0a653724-0ea5-41b9-bb9f-a13c2d053a76	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:08.67201+00
ca795eeb-f6a7-46af-abcf-d7c3cab5eaaa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:08.82022+00
894ed563-8715-4bc4-8325-8ab10d58b643	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:08.994636+00
b6744ac5-64ed-443a-a603-6548f3197799	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:09.154686+00
3c58134a-0066-4dea-a249-b8be0f8f159d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:09.324977+00
e7bc299f-cfad-4663-82e6-408a85e647df	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:09.50256+00
96e93109-ed8d-4aa2-a1aa-23b65050abfd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:09.657227+00
386aa9c5-5b68-4728-9cb7-a9bcf7652aad	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:09.821755+00
26c2780c-6f9d-471a-870e-07c9a5c45d18	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:09.996874+00
76a742de-0e31-43ca-913d-32c8f0046163	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:10.1615+00
554462a0-0b82-461d-89e7-4eb42874d4ec	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:10.318776+00
8a805e1f-c678-4fec-9392-dcfdcf3ea9f9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:10.473672+00
ad69ee27-6ca4-4438-86c6-d771da2f2718	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:10.652668+00
17a6a096-db5b-40f5-8606-4b568118a32c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:10.800553+00
f68b30a5-5fdd-4ffa-900d-f48a57fff936	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:10.973666+00
3f5629d1-c1df-47e6-ab3c-1c3ad83032cc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:11.141727+00
31ad1631-b5eb-4808-a28c-6f9ebf7498f1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:11.314311+00
99a4604a-a8ae-4f81-a3be-2dcebc8a1111	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:11.483217+00
611cb60d-4d89-45ba-899b-e723ca788f88	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:11.648209+00
51a86b70-b9cf-4318-beff-db28631d9d9d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:11.82379+00
1e63c176-ed22-48df-afbe-49f380814800	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:12.002796+00
c30551be-9ef7-42cc-b180-ae320dc52575	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:12.172007+00
ce908024-bbb2-4c56-8ce7-9d9962a5b7d2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:12.34819+00
6cb6e739-a893-42c2-bb99-8c32ff02d0bd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:12.519349+00
171af32d-53c6-49db-b469-84867ebf8399	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:12.693134+00
94fbff94-e96e-4b95-b8c2-abd283b062b3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:45:12.865641+00
c695dadb-f785-44ed-8208-3f42f51b3c2e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:18.216306+00
5baa37b6-98f2-4f63-b010-31b25c576771	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:18.393326+00
1ae0121c-c692-419b-be19-7ed3e1de44b9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:18.573179+00
45050af5-cdcc-4a15-b4f0-a4b204dad20f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:18.73852+00
3e3d5859-d3c8-437d-bf58-a1b51dd0c743	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:18.903674+00
f5672f39-d281-4230-bb18-b84ab0e9fbfd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:19.068726+00
40d0f3b5-cf3b-4895-b30a-8df979d23878	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:19.241214+00
cf5074e7-98a0-4256-a198-6626510b1e6a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:19.406498+00
94a02c25-4d40-4289-9def-08318f1d1661	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:19.568863+00
d04e8bdf-e89c-41f2-a3fb-3ee5ae30603c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:19.736267+00
4de09cbf-a429-432c-b6b2-916bdc6f07fb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:19.896566+00
ca198a1a-21a0-4e0a-9aac-b57bbf6161d3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:20.061798+00
8b7ae770-9953-4c81-b2bb-f9bc8f5d84ec	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:20.232815+00
47237a8f-2cd2-47d2-ad37-f7741c7def90	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:20.407643+00
a65fdfeb-e7bb-4a53-a9f0-9c620ca97674	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:20.588911+00
1406d408-95ee-47e6-85d3-938ace912c97	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:20.785897+00
32c043a0-2ec5-4303-9e79-ddd446b84c54	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:20.959296+00
e8175568-ddec-431e-b90c-d83386947042	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:21.126409+00
8d1c51bd-b9fe-4b32-9404-c1b1e50c198a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:21.29555+00
0df2ed92-84ba-4ca6-9213-dd3d73b05605	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:21.4581+00
5cb51a06-5b14-490c-a97b-b6d0d8b4c0f6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:21.6227+00
4297c87f-2db7-4083-bbd1-e791fe7bf8bf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:21.789346+00
aafa16f9-f90a-49f4-9999-1aef77c3092f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:21.955178+00
dcdb3b3d-f4c5-4fcd-ab7b-350009f6a2ea	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:22.117313+00
058f3d77-77ca-4b6e-bed1-4f6101ff3989	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:22.278973+00
c40f3daa-1deb-4566-80cb-216a922699bf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:22.437221+00
7e3109af-585b-4dbb-a924-50b167a66436	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:22.601231+00
39718490-3052-456c-88c8-a830571931c0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:22.778343+00
b2ee88a1-69f6-4ff5-84a4-b3c4e7b0b470	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:22.948434+00
080cea19-d492-449e-b6ea-55fa2bf82b00	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:23.123401+00
57cd55cf-c54d-45f5-b223-398b8ce61a50	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:23.279751+00
4dd35664-142e-4f04-bb37-631332537989	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:23.435117+00
f366a5b6-8ecf-46c0-a4fe-17d49543c007	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:23.605117+00
501d4b21-5590-4ade-88ed-d40626da50a1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:23.773363+00
fcbae712-fa8b-4f71-82be-c826a488c11a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:23.924364+00
c4742e62-6d51-4708-a1a5-e55cf27d5da9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:24.090567+00
85299f21-eb86-4bd5-9ae1-ffec7bbb6cf6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:24.251099+00
58f7c2f8-97e7-4d42-aef3-23f1a03820b5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:24.423572+00
83d7278a-bef6-44b2-a971-2b189ce4e641	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:24.595555+00
4981a3cb-34d5-4763-b02f-96071365115a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:24.762412+00
22bea76a-0976-419e-988f-8d7457805115	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:24.933227+00
746e821b-d196-40cf-b033-66c44b970b41	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:25.103167+00
ad414cee-a3f5-48b6-9800-8bd36e506dbe	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:25.258184+00
bed10545-1f18-41ca-8524-7db8d6399180	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:25.417777+00
3aacb5b7-9acc-4d0a-bd31-89dda11c24d5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:25.575452+00
f67f9583-f730-4ecd-9f00-51886f0dbdbf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:25.741174+00
6dbd99d4-3ece-4b20-a47e-3f276f952c93	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:25.8898+00
7e3970f1-f06c-4c4c-84c3-abd1aae42f34	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:26.057693+00
d7bf2c9f-2eff-4e47-a573-1626ad65321a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:26.211278+00
e922458a-900e-410a-99a8-920a91348c87	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:26.384331+00
f103a5a5-1917-47e8-802b-0dab528e470a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:26.540265+00
06810ed2-69cb-4260-b40b-bb7b8d864d2f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:26.697006+00
1fdb385b-fe84-47a9-8b94-76ff1f2afaa1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:26.854552+00
cc697d0c-3153-4fc3-bf7c-c8e3cfc94328	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:27.011083+00
b9dcc824-9986-4ee6-a8f4-dd175db076e1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:27.174318+00
61959dec-cc83-494c-bdb8-39a8565ef6a4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:27.348627+00
e7de5f53-061d-4424-a247-695eec1fd3b0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:27.541322+00
ca54fd5f-a38a-477f-a7a4-3e16abff1112	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:38.686626+00
ee6b251c-acc6-4c99-bb8c-b87f501144b9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:38.844519+00
f1ead159-6dd6-4e53-8fee-c1fc3b820af6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:38.997427+00
2eff9996-1289-43df-9735-cb701f34e210	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:39.152742+00
24af5949-de98-48b9-a5dc-6d17fb8636c4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:39.326724+00
013625c4-8dc8-4ef0-9b1a-f574d57bd195	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:39.478477+00
0983c723-6931-4ea1-9eae-3f223e27c863	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:39.627297+00
44531f58-a257-4d60-aa24-f9523a64d242	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:39.777144+00
1c86a36c-5c31-4bcf-92e2-e567ae0be468	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:39.931767+00
4cd57115-4b76-4353-b518-5b2ebd06b5c4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:40.088339+00
550784eb-d495-4635-a090-965cc7d51e2f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:40.317322+00
ce5d5898-1a6b-4eeb-a0f8-ed9cd3af2921	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:40.583933+00
dfcd05ba-5381-4aa7-8f8b-3b26f648f648	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:40.737005+00
0954def2-51c8-432e-a0ab-cf5b0ac1178b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:40.89825+00
bf0d71eb-1f2e-46f1-8137-eb910cd54095	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:41.067075+00
81334063-9f85-43f7-8748-2a036ed5505b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:41.229803+00
3cf4f7cb-2f10-4b10-b2bb-e45dc60b2196	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:41.381568+00
d62611cc-97c2-46ee-9060-d09f8fae3fb3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:41.537239+00
f2180080-9939-4e9c-b0e0-15144ae022c9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:41.716311+00
4ec6f6aa-2f25-46d8-b9cb-00a58dac3a40	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:41.871314+00
eaa60f9b-feb6-4c10-bdcf-27141f0cc51f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:42.022253+00
bfbcedc4-4b3b-4978-a501-4970b4fc3967	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:42.184424+00
e040a62c-bd54-42a6-b01d-171b79473572	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:42.34496+00
e240f9e7-e686-43e6-ab18-7234d722e96d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:42.502127+00
aabeee22-7a0d-42b4-a2a5-ab6466541226	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:42.654848+00
b6dc8d65-dc1a-47c4-9327-761c51db924b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:42.814169+00
85d1da8e-238d-4b0a-984b-36f6ed486a13	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:42.971657+00
c1cc2019-f120-4e3e-82f0-b3e21ae56725	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:43.128737+00
3525d0be-349d-4763-a551-92e3c0cd555a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:43.328434+00
d043018f-557b-40c4-832a-65a897805042	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:43.487202+00
cf7d258c-2746-4a68-bb1a-e1fd74d5a839	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:43.640204+00
e060be6c-b531-428a-8130-d9bde50ee0e6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:43.801364+00
44545a2d-f2ef-4621-bb54-ae2a8a5c2dd3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:43.957329+00
86112cbc-d0e0-4c34-937d-11c27ea01e96	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:44.11006+00
1f046b6a-27ef-4893-a80d-fb1192188dbb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:44.261851+00
57f8c830-f6bb-4cb4-85a8-91e3fdbe3179	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:44.42129+00
dd630fea-65fc-44f6-ba70-eac8c4e60410	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:44.579185+00
542eed97-6167-4f97-8d85-d04932da383a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:44.731883+00
5f2a4046-cae3-48f0-b9f9-f4ce5f30d9b7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:44.887633+00
af59c50a-db72-4dd1-ad49-b301a712d576	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:45.036378+00
c526fb90-8ceb-44b4-9155-db7322bc376f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:45.19854+00
4f2e734c-ec21-47e5-9f7d-1f38b1488101	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:45.362143+00
fa9b8f9d-e498-4694-9e44-9b7073c9e4f2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:45.519333+00
781b2c16-d3f0-4255-9dbf-7fdac4fe5409	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:45.67433+00
e6447978-350c-4ba0-a243-064326387d0a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:45.835002+00
470e53f3-5c16-4ae6-98c0-e3b79b5fb089	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:45.988501+00
d5e62954-13f3-4335-bcf1-ee6b5059f968	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:46.151655+00
584c17e7-1d5b-403c-b987-7b602bce4046	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:46.301296+00
725f91b8-ea65-4854-b296-f34f2ec09ffd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:46.45412+00
2bd5e34a-7d49-42df-9545-38c4d4332796	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:46.639918+00
742cdda3-cd74-45a6-9ab9-377a9bdfae77	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:46.806067+00
934ab226-adb0-4e85-a4be-1b746c763173	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:46.967419+00
6cc55aeb-e981-4588-9d7c-f95f9fdde9bd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:47.123445+00
1447d2a2-7102-4d6a-b742-8cd13856fefd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:47.286448+00
565d48cc-a77a-480c-9a36-dcd0e26f50dc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:47.450826+00
7af0d891-2cd9-4fe6-911b-c886bf05bd1c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:47.613474+00
10a53971-9bc9-4d8d-b89f-2c90898e18d5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 17:46:47.778232+00
9d4bebf8-3d8f-49e9-a719-b2d8538ad0a2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:51.728715+00
825a07a9-4b9c-4b76-a374-30e8f10e2464	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:51.895095+00
fa114dcd-7033-468b-8da3-7dd0541a72de	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:52.064743+00
208aa46d-0a12-4e35-81ae-9e17c4395b21	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:52.235602+00
41cd056f-e864-498f-a0c1-f61492922735	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:52.406452+00
0a920c12-ba50-465e-a6fc-7932ea38606d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:52.561526+00
e5ed219e-c4ff-4fdf-ba8d-8119b48f23c5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:52.711549+00
404ab039-73e6-4555-9498-6fc2e0092b0f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:52.878515+00
0af23f48-dae8-4fc5-bcdf-e1e3a9a194ed	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:53.045056+00
f5724b66-be1f-422b-b02d-cc0db2472d52	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:53.205108+00
e8ae5a78-e165-4509-9146-65a976b19cce	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:53.369319+00
f3d728ce-528d-4cbc-9de0-9e410ad6c743	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:53.529654+00
8114fae3-e97b-4903-8fd0-939163fcd073	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:53.699431+00
615666af-834f-4750-8996-8722eb66259f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:53.865398+00
ab194adc-c0ee-4320-a7b8-d01073edbe95	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:54.039422+00
5805fd93-cf43-4c32-ae2f-d506e2f4d492	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:54.201575+00
c54b367e-2d91-43d1-87d7-4d0c5e499fa7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:54.361201+00
89b45539-b137-4dc7-941b-1bff807b3a39	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:54.531428+00
5398ef3d-d646-4da4-bf5c-4694a1ef7f39	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:54.703153+00
ecee3b77-a400-4f74-be6b-2696d3726250	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:54.878212+00
4d35b083-3403-4aaf-b21d-85d06e2899d3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:55.043191+00
1dbae795-6f07-4ff9-aa99-c5ebce39575e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:55.199597+00
26390538-eadd-4173-902f-09276c1ad79d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:55.369459+00
abdc30cd-7714-424f-9d6b-21b91e307850	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:55.537255+00
ecf2fa90-a843-47d3-83fe-c34a32e24893	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:55.721664+00
d41d4026-ae84-4e02-9c5d-00af3bb3b02c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:55.88428+00
0f74d608-e994-4493-9a45-d7c321f1f159	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:56.052974+00
1c0e154e-2252-4614-98d9-48e92824926e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:56.212865+00
950f1037-aa83-4072-86e1-bb6ac82cedea	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:56.375062+00
0e09d351-aa82-4965-89fd-08742ec8cbfc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:56.540517+00
fbe352b0-bb64-4a37-b933-b7739dc65560	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:56.697638+00
dfc66594-4ff4-47a8-a634-28a489cb50d4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:56.857206+00
4d7694d5-e72d-44cc-b2a9-ec518aed7f7e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:57.009854+00
813e348d-992a-4bfc-afd0-9ff3a97c8026	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:57.155948+00
359be39e-a815-4e7a-afee-6887c93d9025	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:57.312103+00
c0bf8932-8645-41be-acd2-6401d21c98e2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:57.472225+00
ef3a49de-9f5e-48d7-a79b-54f25b64f6b6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:57.634792+00
ea40fac4-80fa-42e9-9ff1-45a02bb9e67f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:57.79307+00
a208fa13-2927-460b-b170-3ea5f6faf392	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:57.965332+00
5975f8a2-c1a7-4a75-ac3b-5a2cfcfb8f9a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:58.124767+00
6fdc0c35-2944-4bca-b3cc-e770b66b38e6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:58.287255+00
ea482ce2-9cbc-4637-b6e3-5534b16cf0d7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:58.433167+00
ab55016d-aca2-47f7-bbc4-78cdc5c3b4c4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:58.603005+00
f069ccf9-7e9e-4193-abad-d5e122f3e63a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:58.769978+00
05c11c6c-a3ae-4867-a79f-843b0c2400a3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:58.9164+00
b84f86ca-6f8a-4fb3-987c-f36abe8abc28	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:59.061299+00
8606b89d-1ba0-4b72-a465-d596ebed7fe4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:59.211595+00
0cbd9d40-e6ea-4933-a6da-c0df5717348f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:59.362015+00
14f6da54-cc86-4e41-8cb7-4d4bd563dd63	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:59.514148+00
b7fd2976-5ac3-41ae-8b9d-e0eb53e106a4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:59.665734+00
7a3d4b10-a9f0-4948-b351-688342ddb755	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:59.815493+00
d65bb68f-691d-4d34-812b-e6ecf1473d90	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:12:59.998389+00
d8831116-3060-4ac9-a63f-3bbe35287fa5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:13:00.181094+00
61fcdeb3-aa6a-4ff6-875f-b51ad5fb8784	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:13:00.334633+00
d4bfe38e-4c79-492b-b779-96b54a0a512b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:13:00.486014+00
3514caa1-3128-46b6-820e-caaf2cebde3d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:13:00.633004+00
e0ccb21a-8705-488e-a4e1-fd0c95afa697	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:13:00.790488+00
84ce7764-24a8-488b-9538-28dc5bae6cbc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:14.366699+00
0e154162-3426-440a-a178-aa67f7c382a9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:14.529819+00
595278ae-9df4-46a0-8735-fac43745f423	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:14.696703+00
31989f91-c57d-4d9c-80d1-5e28a48ca084	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:14.853561+00
790a1eb2-7cd0-49fd-91f4-009fe7203da3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:15.044898+00
84cd586c-16fd-4d57-a4b8-6a5f8c30f26f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:15.221067+00
dfd5d3fc-c92a-4085-a570-162bf54c7032	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:15.388282+00
6bd8a9eb-3508-4f1f-8eea-0798106e6dc9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:15.541568+00
0653c0f2-a6b9-4fde-9e9b-f02fe3911185	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:15.714031+00
b77797ba-596c-494c-898f-43872116ebe7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:15.865065+00
71332213-a3a6-4105-bbc7-243322847b50	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:16.028681+00
64c23c15-21e0-4a00-aa91-adad96cb3a41	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:16.199173+00
01f8e484-eeb9-48c6-bb22-ed41bb9292ca	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:16.357471+00
89ccb56c-73b9-4ffe-b362-b0f9fe479bee	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:16.515387+00
ef052b64-000b-45a1-8f66-dd676eb0ceec	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:16.68055+00
3e6f8798-9a72-4efc-94ee-69c290e2ab46	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:16.84271+00
43abf6fa-4ced-4cfe-b354-b8cbaf3b276b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:17.033491+00
2ed85178-9f48-44c4-9072-304284b56f5e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:17.191573+00
8153112f-969f-4c98-bb56-96417865d7f0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:17.354023+00
ff734b29-fb43-437e-8b6d-c41382bdbd83	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:17.510263+00
39ae0627-3e95-4555-9c26-929c4d3a678d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:17.670737+00
3fa42f5e-2eca-4c1e-a4c3-cfda1bbc59d6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:17.841164+00
4b3c3e17-a7e2-453d-b8bf-732b16288338	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:18.008425+00
121a9ded-c715-40e7-9055-1577c294d72a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:18.170001+00
7f51aeee-0f49-415d-9069-6c1babc77480	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:18.323417+00
9b3d695f-6487-49e9-9de8-8105a653d038	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:18.481372+00
053f9ac7-607e-40fd-938c-f468ae3a127b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:18.631239+00
da6d91fa-d4fe-4046-8c79-b4cea6f36001	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:18.788649+00
4b382e3a-cda2-4052-a4f3-4984c5085f0d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:18.940526+00
5486591d-db78-450e-a12d-6d233c63405b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:19.096265+00
983c8b9e-1c3a-4e04-8468-82e4dac9355d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:19.249031+00
edd13b1b-72f1-412d-98ad-f55fee2067b3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:19.417325+00
7ceb4d05-d7e7-4591-a00f-45c63f2adf09	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:19.589878+00
458ec2e7-48d9-45b6-971c-ce259ff50ee2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:19.752273+00
f34290ea-4cf3-401a-afa8-6a6a8696e4b2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:19.923313+00
0f27ae05-7401-45cb-b7c4-1184be9a153f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:20.096+00
0f4c1f89-a779-44ba-9feb-1bece8a0639b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:20.253796+00
a7baf165-91f0-4e99-91d7-8403357a16a9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:20.412136+00
e1f6d253-11ca-4356-b4a6-f37e7cda9ac3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:20.577675+00
01c1be37-3747-4ebb-bda0-ac90b2a969c1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:20.740674+00
360dfddf-b541-4f86-8705-9117b6ab476d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:20.910291+00
620bb2d9-5a2c-4c10-b879-0b50c3ea70c4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:21.062094+00
f81e3d6c-f05e-42bc-a126-b3925c96eff3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:21.350665+00
0348d277-101c-4990-8aed-655d9a36291f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:21.514481+00
dd92721c-6a34-4102-bb8a-0838d4d9f474	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:21.676874+00
0837f71b-ef55-4743-8b68-37c9a90e68cf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:21.84381+00
c6393ad3-658b-4b5d-901b-45728eb9307b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:21.995177+00
f5a00ff2-39d3-4f13-881d-f460cf3462ae	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:22.156009+00
ec3cdaf2-b93f-48a0-be3d-931b44c09892	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:22.310003+00
a0494627-ef9f-43a7-b1eb-669fbf893aa0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:22.472866+00
3b3cbc25-9995-4686-b90a-fb4af0600cfe	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:22.630846+00
14ce58a7-880f-41f5-96ae-07a2ab5761e6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:22.795199+00
56d9ba08-03d0-4cb1-a1c1-7bf9ae333239	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:22.94639+00
360c844e-76f0-47f1-9cb0-2f25aad8f35c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:23.109056+00
3873080f-7824-4dca-95fb-ffb9abcd4870	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:23.280853+00
4d63bc02-9ca9-49b6-b6ce-531ffcb8887f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:23.455673+00
321c7379-9603-4dc5-a475-8ce532e9c621	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-25 18:38:23.621457+00
d6b526be-783c-40aa-8cfe-f30e17760747	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:57.294208+00
f3d8281e-2a4f-4eed-bf4f-4d23decd9b3b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:57.463107+00
db83a59c-1e68-4559-8243-7f36148c25a2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:57.622273+00
3894d9db-cfc7-47b0-a7e5-edca4dd5cb8d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:57.781435+00
476b8254-908b-4e1b-a5e3-66f919ae6807	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:58.349401+00
2a62c869-baec-4e4c-8e8f-449deeeb9f61	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:58.510947+00
016dcc81-61de-4ca6-8ec5-f993fcb9f774	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:58.671137+00
1b9d46bc-42f0-4428-bc81-12ce8acca6e2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:58.831787+00
1e83dc1c-4dd3-477c-87a7-4a09843bb875	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:58.996564+00
403fa05d-a1cc-47ca-b886-bd0ca2bc831c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:59.173915+00
3bec0cce-38ea-4b77-976a-9036011596f1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:59.336163+00
da0b86fb-fc8f-498b-a764-0b413e87c534	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:59.497028+00
ce82758b-fdaf-456f-a2bc-eb9725bb04dc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:59.658078+00
f07a1639-3fc2-4f78-aa68-7eb0225137e3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:59.826173+00
93a2603f-4a7e-462c-b455-34d26ec5aa85	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:19:59.986908+00
357c9a4b-f4c9-44f0-add7-d6f573b2ef0c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:00.157248+00
738edfa2-8a1d-4016-8971-100735abdd2f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:00.321482+00
9f244994-5070-4f7a-a890-126bc3823e43	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:00.48559+00
e74f6d95-f51a-4da2-80eb-2d0d83e99c1c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:00.649225+00
3ae8f50a-48d2-446e-80a7-68130ef3072a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:00.809114+00
d370f0d4-fed8-40ed-baec-3e8de90a8cc6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:00.967646+00
25e8e502-34a6-4160-9e51-5007dcb53d7d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:01.129405+00
3fb58f7e-5a4e-464c-9ea9-02458a2dd752	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:01.290274+00
1e9aac5a-a18a-4c7e-8fff-669d734cb41e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:01.445929+00
fb590722-7ec8-4648-8a05-7270c66c5e9c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:01.604892+00
2dc8c953-3212-4cd5-9c35-b78a96f3a6f1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:01.76264+00
0c6fe437-47eb-475a-bdb4-f1d85e6ccf12	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:01.92125+00
60e5b758-6e5e-4ab7-97b9-aa76094e4a97	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:02.082908+00
e0c61494-52b2-4949-9eb2-dd2d6338da0e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:02.244729+00
08af1a06-fd44-4de3-873a-175af48fd298	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:02.403917+00
0f780098-d9b0-4c83-85e4-0d08c094a668	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:02.580878+00
7522976a-01c3-4577-a653-a744da7891ba	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:02.762525+00
d4f62300-6e80-484b-a51a-9c3b7242dcb0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:02.946993+00
a6d7c012-661e-4bfc-a44e-da5a36a0460d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:03.157371+00
c6250c3a-b7ca-4f1d-9b59-36c1d8cd1ffd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:03.318347+00
bad1f0fe-b834-4117-a92c-86b07463214b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:03.474053+00
94a5a572-b7ad-49ad-bb5b-a8fd48b933fa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:03.63157+00
0a025afa-f653-431c-bf07-46221049d2bb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:03.801117+00
46d7d6fb-ed3b-48f7-9cb3-adf25e9a54d6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:03.955194+00
c2afe65c-2eac-4802-a24b-d18481315e6c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:04.141498+00
8c92baba-5cd5-4c02-80a0-24c88441e9fd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:04.321157+00
19dbe412-51fc-43e5-98b9-3f6a82eaaa1d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:04.477772+00
b7b44ed1-cf34-4f14-8c74-7d63f5e9d04b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:04.634307+00
679faee6-7522-4b85-ad6d-36f7cd21db29	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:04.79085+00
3d595226-6a5f-40cc-ad18-d06e23192dd3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:04.949021+00
e7e9dcf1-f935-4362-b350-a5f077899d26	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:05.111191+00
73fd930c-c135-4e5e-9dc4-f957f8fd3cfb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:05.262693+00
fe6e29f5-f710-4b47-a518-26f4481e9f0a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:05.429287+00
2f3634c5-7271-45e8-a5ec-d2e1ee715080	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:05.58954+00
baa9df1b-0c16-484f-9c11-3f2d7791f906	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:05.745721+00
9642a5c5-8030-416f-baf8-73ccf1d4693d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:05.898491+00
c1f68c73-39a4-41f3-92af-5d764c8d0410	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:06.052611+00
945d1828-4120-416b-a7c3-9103efa67340	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:06.220514+00
1b5e90b0-235c-445d-94a9-50678649170f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:06.370384+00
9022e635-8d3b-419e-8b17-997e9e16a91b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:06.522943+00
a07bc155-da67-4cd8-ba80-82e0236c98ee	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:06.700479+00
6a8df85b-15bf-4598-ad27-981662570cfc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:20:06.883481+00
d4206873-3143-4886-afe0-fdfe9fbb5f31	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:56.059293+00
25189021-47e4-46b7-adc4-a505cb577b38	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:56.227442+00
60781419-123c-48bb-a75a-b392b383852b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:56.394009+00
e5f60227-682e-48b9-99e9-4aae475c1103	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:56.553212+00
683a0918-5ad6-4d84-88da-8a7f97a8aa91	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:56.807145+00
2710ebc7-f89c-4ac5-8b00-43ff508f9475	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:56.957153+00
bdc8a883-77d6-4a76-af1a-237fa275f4cd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:57.115828+00
63f5a779-b2f5-49d7-835b-7ec67ee160d7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:57.292567+00
75954572-dcdb-47c5-96e5-79316e684882	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:57.45501+00
1b49be90-0428-427c-aa56-1ef7f76bf4a7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:57.675968+00
f55e97af-2092-469d-8a8a-d73ed304d3e0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:57.83812+00
50fae597-9131-47b2-aafe-157bc7d969c6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:57.999685+00
2e101c9d-6217-497d-ac6b-01c438cea217	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:58.16235+00
67e2a058-02ce-445c-a0b9-41cbd4870ba9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:58.323327+00
ae5ef93a-aa73-4fa0-a491-351ef2ac7edf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:58.484944+00
8620e4af-f06d-46c6-8c95-2ba386cdbf9f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:58.646034+00
320a9d6e-287d-4bd2-b06f-db7d818485e6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:58.805156+00
1ff482cf-a8a5-4af1-81f7-f211a4cb537f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:58.972254+00
7c4aeac7-1e51-4d87-baa9-d0355ad9aaa9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:59.142533+00
fe33b825-cef9-403a-97cd-83cd86e8c6f6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:59.323717+00
f1a0705e-390a-4dd3-84f4-948713e477e9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:59.478723+00
bf7c84f4-2074-49cf-b9d8-894439244fe5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:59.640785+00
cc6d5877-dcbc-48c2-8907-4fbd5c583f2f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:59.806785+00
c119d9bc-57c2-458c-b9f4-bcb71d7a6f44	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:22:59.9754+00
c1d7b010-e4e0-4fac-8116-50219517f8a4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:00.14016+00
e38991b7-ea13-497a-b2c7-e9811b834477	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:00.306496+00
90e7c32a-425b-4959-b594-ec14a8d4ca4f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:00.456653+00
48d8005a-0510-4709-96a3-f9485491221b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:00.621085+00
7d9ef12d-a246-4b32-b595-7aa17a230d13	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:00.792071+00
42ae7797-eb85-4ce0-97a9-03e70cff2dae	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:00.954583+00
a8426179-a5b6-4f87-aeaf-ea55a9280036	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:01.118154+00
70a02443-59a0-4996-847d-9649ff846acc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:01.282178+00
7984f9c5-4d2b-442a-ac9f-a4792266b0fc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:01.459966+00
9bfe9f7d-105a-4a73-968f-463f14b427f0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:01.625248+00
d521adba-4049-4d92-875e-7266fb772241	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:01.792428+00
3e0c930c-34c7-482f-83f2-215ae764ec19	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:01.957731+00
378754e2-0681-41a3-b078-8de55f8caae1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:02.133352+00
740cacd4-2a61-46af-b3ea-fd5df9ecd8e3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:02.292718+00
27ee4b96-59a4-483f-88e4-255b25188e10	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:02.451653+00
6ecd4d47-15dc-4dd9-bc36-38cfed92b4af	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:02.606819+00
a7668e13-701d-472f-808e-75bbb4f344a4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:02.767722+00
f97b499b-2bfb-4970-b1c7-171390d82645	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:02.927408+00
769bab0f-66ee-47b8-a8bb-eba917d6aa7f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:03.088021+00
33c1ec3f-8523-4f67-bd00-8e83cae28584	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:03.25378+00
26ce33af-ac20-4b21-aff6-e9899bed0967	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:03.416276+00
95dd36c7-e70f-463c-8f54-9a97686680ae	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:03.574916+00
3e8064c3-17c1-42a5-b445-ee074d1b3806	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:03.73791+00
aacf9500-a90a-48aa-8f25-6007b4f49fdf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:03.898299+00
ee9b4494-a49d-4850-be92-7902886e1a4d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:04.06424+00
7a02e129-6e36-4cf3-a5c2-134dff9e4145	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:04.218066+00
3b13fb0f-a088-45f1-ba3a-e274f1b41038	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:04.374613+00
f3068451-c3ca-412d-953e-c29a44aa6604	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:04.528204+00
0069b946-0491-48bc-805a-7949e2a8fceb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:04.690709+00
ea1aec19-8449-4657-b0e7-70da770869f9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:04.848172+00
82389c95-1d0b-43c1-bb53-009caf69f1da	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:05.007137+00
553fc971-6ed8-4afd-b8af-c9f42c49252d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:05.162614+00
1a0608e4-675a-4fea-852e-744c4cff6657	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:23:05.319186+00
a0e4119c-a48b-4a98-82b2-d5ab0177d95c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:49.542227+00
a373f31a-5f7b-4981-8072-5c31f10d4552	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:49.691916+00
8245b819-ef99-475e-b996-8b8d4e678537	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:49.842+00
cf8d1775-2137-466d-9081-00f7a5e8b826	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:50.009957+00
c9878201-d514-4769-b526-ce1033a10823	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:50.158908+00
7f062862-350d-4d34-b776-38dca7af8c86	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:50.309619+00
6c2b4ec9-d95b-4bfe-b1e4-692882d9b076	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:50.454841+00
55ff88e4-5d99-4437-80be-f9ccbed47cfb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:50.605048+00
8b439c8f-48ed-4cc8-b086-b8aab0fc8121	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:50.765839+00
46ac6d8f-0e45-48b7-b98d-925838f3f8aa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:50.914824+00
610df831-6ecc-4b98-94f9-64d8af770361	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:51.062983+00
f0f5d534-ac19-4ef6-a681-dddc430cb433	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:51.212744+00
772825f4-f685-491c-aad6-f32a79642d89	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:51.357169+00
3e63f8f1-f694-44d0-a427-48410d0d713b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:51.504438+00
71e43029-e39a-4af9-a870-7d6bd9cf3aae	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:51.654717+00
5d6bd07b-63c5-4dd9-8e9a-d6193bdb70ad	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:51.804442+00
bb8d9ae6-c256-4108-b647-f6209946351d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:51.961068+00
8e0d9ee9-d9a9-4602-b8b2-e9c6670bdaec	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:52.114165+00
f61eefa3-1684-4b9d-876d-ee7eb8887364	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:52.263741+00
2d1579aa-351d-4509-8f74-657f345d4c13	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:52.414263+00
6ab3f907-faaf-4006-b61f-bf8c348736c4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:52.564291+00
a3938605-26e7-4939-86a3-cadd04d826e4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:52.73507+00
ecfde457-96fc-4f14-b3d3-6647a17b2dd2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:52.885957+00
2da75416-7770-4d5d-9003-3c6320c3056f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:53.045183+00
b7a8ee0b-1868-46f6-82f5-86894f879eea	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:53.198257+00
e38d664b-35a6-439d-9d5b-dbf2c3400bdb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:53.359106+00
f8fa6998-6254-40fc-9e4c-12469602ebe9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:53.513176+00
a0c7f59a-2b04-4566-a05c-1612e95f6602	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:53.668685+00
f89ab369-6805-4e06-b706-563dd63e4f3d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:53.82995+00
89bfb6a3-61a1-4eb1-9429-8ed3afdb640a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:53.989825+00
1a24d2a0-7f73-4215-93c8-9ef017ff6803	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:54.163656+00
edf79a86-c76c-40c5-b8ee-604650d119fd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:54.313147+00
5e7ffa23-84e0-446e-9c95-75a61ead5025	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:54.463808+00
27fa7a43-d4a5-46aa-946b-adc794b295d8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:54.616444+00
9f7855cf-804c-47b3-8fdd-38728ef8c98f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:54.77347+00
296d62c0-abb1-4dad-af29-be825d8d437f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:54.929885+00
0016eb7b-c3a5-4925-acb1-2180efa819b3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:55.082075+00
f9a257fc-d71b-4c33-8c97-148562c85f5e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:55.240109+00
71552391-6957-439e-a302-54dbaf9014b2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:55.395974+00
f6de4afa-63c2-44fd-aa1b-f2d408532d9f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:55.554143+00
4ac11f6f-f71b-4882-b4a4-b2769324a5bb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:55.744707+00
5491ea9b-0a7a-4b4f-9d4a-cdd0836cc533	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:55.921902+00
a579ca99-17e9-4402-b718-aed51cce4ac7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:56.078756+00
dbeacd43-c9bd-4d17-af57-3e52e8744efa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:56.230887+00
528e26c3-dad0-4394-a938-f12e59b6aa97	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:56.380282+00
4367f00b-e424-4977-adff-c7f68515adf3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:56.527778+00
042339f9-c869-4204-b967-d6a856686a74	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:56.67944+00
d1e15ed8-7b85-45f5-a42e-ece626fb1c34	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:56.836414+00
4ea3e805-db30-44d4-8c53-6ad241f56b94	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:56.985616+00
210ae273-365f-4831-9a7a-80fcf6a9aa64	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:57.135234+00
949fc7e1-9260-45c8-8c10-b28c18282b5c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:57.283649+00
d64ffe0c-4e0f-4e2d-b48e-847fd43af12b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:57.432937+00
9fedb0c4-e827-4c4a-bf85-cca67f5cb809	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:57.578275+00
98748a59-f5b1-4c6f-9491-f8548394fc21	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:57.723285+00
9e1b4ce4-6e42-4752-b1c6-83b2159dadc3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:57.874059+00
8ebe0ae6-1165-4fca-ada1-de96363db521	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:58.099972+00
c63b2a5c-5602-4c82-9b77-c9b5c8c54b97	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:26:58.248221+00
ffc8d966-796b-4c87-b136-c5d3381110bc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:35.827443+00
c9680dec-9eec-4287-830e-8c72bfbf6d8c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:35.985808+00
4e8d2e68-a61e-4580-b563-4db8b25fa118	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:36.160553+00
fe4204ec-cb6a-42fd-b731-a93d4a6f23aa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:36.310254+00
98f01c12-85a2-4962-8dda-984635101eee	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:36.459121+00
4b958dbd-e03f-404c-a5a6-ec898108cded	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:36.613205+00
ce4fd018-8f56-40aa-9af9-c8e8dfcb69a5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:36.759761+00
3b22be5f-f1a6-4e11-b81d-1aca3ae5c685	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:36.918755+00
398cf282-0bd8-4a0a-8edd-7534721453cf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:37.067646+00
5746da35-cd8a-4c88-b5d6-2709081dc575	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:37.217956+00
8261583e-ffa7-4d09-bbb4-730a894281d2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:37.36793+00
17ab49dc-9b52-4124-9732-d69cfc9eb2c8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:37.518697+00
1421b1bd-1a3b-4fe2-97ed-69020accaba2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:37.667294+00
b2c9d2c9-c48f-4cab-98c8-62a2f43cde6d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:37.817415+00
0c92dc3e-759f-47c2-b105-25cec306404d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:37.968213+00
589e3cd2-a9e9-4291-9d89-02e5cef19648	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:38.117372+00
77c6cd73-65b1-4850-b13d-3b4a389b3862	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:38.265908+00
6435749b-5d51-4a0f-80c2-44a9e1bc7169	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:38.414657+00
34869cb6-7da8-4b32-a6f0-4a82a65422bd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:38.581097+00
fc4dbd68-d701-4751-bb78-477010200d68	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:38.730394+00
3828ca9b-3dc7-4003-a33e-4afc95b21af7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:38.888954+00
feb1bf18-7b0a-4dc6-a14f-cf4ef2cfeed8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:39.048235+00
ef3c8a29-aace-464e-8092-64f5f5bd29ea	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:39.200979+00
253924c0-c19e-4645-b6b8-cd75fa698775	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:39.364248+00
a0727fcf-21b4-4124-ba8f-ad594e04d740	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:39.51543+00
1d019afb-0701-4f52-922c-4fc5c00e8613	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:39.677002+00
44ac9858-c426-4828-a4cf-1e04572c1752	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:39.83825+00
9b07e66f-2b2d-4f18-bb70-75917086e4c6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:39.99865+00
2924d2b2-8e99-403d-a907-da01497898c9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:40.159875+00
fedc9ac3-92ec-4cae-a317-485f23c9a780	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:40.322045+00
938c909d-1425-4e1e-9253-840877051482	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:40.481304+00
218bbd17-9f92-4fcf-8c75-52e2d8bd0ecc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:40.644323+00
79642f4f-aabe-4800-94ce-dd756ac3ebb6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:40.802905+00
1aa38bb5-0c72-4c19-9641-876e53c8786a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:40.959535+00
7b458235-9c6b-49c2-b5bc-e7325fef4eb0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:41.119098+00
f1d8a25b-683f-453a-be2c-9aa3bbe10200	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:41.276629+00
17fee440-b7c9-45b5-9ef0-aa71e0c095f5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:41.431058+00
ea9cbb5b-7a85-4a4a-ad79-eb3ab08f3a71	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:41.589232+00
92295431-17c2-46ac-b724-966c9b1c3dc2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:41.749286+00
96e0dc1f-a06d-4cb6-a01b-c6a1be6218f9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:41.909279+00
09b72e9a-d3e3-47c1-b9f3-de73a7d883ca	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:42.066223+00
b4f7f7dd-357b-4d21-ba45-4cdbf79b12cb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:42.312806+00
c9d2a52b-e344-4430-91fb-bebab3127e33	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:42.473607+00
7888036e-1e5a-4ba5-82c4-e3cb7f33db01	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:42.630749+00
59819d32-48aa-45f0-a53d-b70f29d3217f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:42.786073+00
8a9f61ec-9eba-4466-84a1-d8b6530245ac	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:42.944807+00
eff86bc0-f1e9-47d4-afaa-46d24e55ca0a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:43.108434+00
e4c7941a-949c-4bf9-ac6b-3ae134f9e1f2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:43.273695+00
a6156907-014c-46c5-b7be-06b786771e13	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:43.455242+00
ecd87cb6-d24a-4a9f-8d10-98f64310b16f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:43.624785+00
eedc1944-fc6d-4934-9dc8-f91c40b2a2be	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:43.785163+00
0a488fb8-c6ce-45e5-9b56-e5d6aa6dd86f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:43.943797+00
3fcacf08-e371-40d1-bafe-43221e5899e7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:44.103972+00
66155b81-dca4-4ed8-a0a7-aff32b545be0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:44.262455+00
89c2f92c-b365-438e-96d0-c8b24c6d82ac	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:44.423083+00
bcb1b80e-25a1-49c1-82eb-be07a4bad4d5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:44.592433+00
3058147d-f8d7-44e0-964f-37ef6d6ce313	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:41:44.756213+00
0eaa7ab8-7f2c-40de-acbe-06f4397bf181	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:15.11591+00
020dd1fd-6581-4445-bc65-e53196ce36a3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:15.26707+00
edd92d95-363f-401c-a70c-a8ec3acd688d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:15.414281+00
6823dfad-8a5b-4d63-8894-5476514e0552	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:15.561436+00
ead9321c-3a8a-414e-8a9f-be058fc9562b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:15.711003+00
34667fb1-276a-4c97-b1ae-12fe24631238	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:15.856665+00
e2d01e4c-42ff-453e-a52f-9edac25ed59d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:16.003417+00
24c362b9-58bb-40fd-85ca-829f8363eec2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:16.150155+00
da6724a5-69c7-4f10-a499-5098c63d9000	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:16.29602+00
a8f37f95-8a8f-49c5-b841-b3e843280327	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:16.443416+00
c54e5e7b-0469-4718-a9ac-9e1804203249	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:16.592205+00
912d7762-e9fd-4dc4-926f-10d0cebf671e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:16.740608+00
1004b2a5-8d64-458d-ae99-85f327f2bfb5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:16.883914+00
fd20195a-89fb-47d9-a8ad-a1ba225b7ee6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:17.032744+00
bae0f20b-10c8-4212-b699-6cf7c7701cd5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:17.198397+00
c1bc23a5-1d15-4419-9a37-81f0373cafbe	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:17.345247+00
aea754e9-ff2e-4ea7-af61-dbab0c8b531c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:17.489654+00
c266f4d1-f7c7-4bbc-9aa5-a9a736b760ef	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:17.666423+00
c26a0e2c-6245-4b80-ae54-b3e6e3e951ab	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:17.892144+00
9ed420a9-faca-422c-ac65-237eaad92f58	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:18.043903+00
89061929-c13e-4056-93d0-8e279336dbbb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:18.218852+00
fca38e19-cbf8-4050-b53a-e28e14e34b6a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:18.456815+00
4c557c54-8d74-453a-bada-bc6d789d9398	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:18.606698+00
f15cde7b-823b-4641-bac2-0a9b186bf43c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:18.75243+00
386f7b7c-25f3-4a88-adac-96469631cbbc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:18.899172+00
0e025e65-641a-4f3c-93a2-2d59dc313e7b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:19.046988+00
1d5c5b66-13b0-4d7a-9847-28589761ec9e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:19.19735+00
d734513d-f5d2-4443-bccb-b18920ebcdd6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:19.344755+00
1eaf4f4d-bb2f-40b5-942f-637061320250	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:19.49805+00
02e14d64-d22d-43ae-9bb3-c3eed398cb32	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:19.64633+00
975849dd-71e3-49d4-8412-fabd005ea24e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:19.802515+00
7053715b-85e5-40c3-abe3-27dd6c3783bc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:19.963489+00
30a8a21d-d8e9-43b8-9eb6-4d9ca0053598	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:20.113404+00
8a351e4f-825c-4b08-8fb7-139d3606dedd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:20.280221+00
27fb09b4-77c1-47f7-96ea-2caba757b3fe	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:20.44294+00
c9844c0d-96c2-4943-9922-f37f92c90c06	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:20.6271+00
cdfd317c-f382-428d-ad10-4843abbf4039	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:20.788246+00
3780ce77-8a0b-4aa6-811d-b3d6e7268e04	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:20.949413+00
96d4c31b-0edc-49b3-9fb5-86751d8f6a98	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:21.127623+00
6620efe0-6354-428d-8710-9c54ba754447	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:21.291901+00
162196b0-243a-4f95-9258-3db84edd293c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:21.455584+00
e906c0a8-3d76-4889-83cb-17cb7fbfe7a5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:21.621309+00
64fdd86a-0ad2-49e5-ae6e-933f59ccdbed	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:21.798118+00
9f32bc54-a2fd-4788-9850-7cbd4ece9300	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:21.96113+00
fd487237-d0e1-4017-ae02-b48b9c2d0c04	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:22.122813+00
d417ea84-6cef-4179-963e-79ccd669ad8a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:22.292785+00
e0794055-288c-4579-a56a-eca85fe45f99	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:22.459821+00
ce692e02-84b5-4c4c-97b2-e9e2774f3c47	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:22.618014+00
88513ac5-3597-4d65-8209-a3dc7b14a87e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:22.780394+00
c807f576-906f-46fa-82b4-dcfa22b0e7e2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:22.943017+00
e9d2dcdd-98e6-4aaf-ab1d-30e3b9382b6e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:23.10432+00
336db608-f861-49d6-81f4-1dac8f595e40	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:23.716855+00
7d3a1c4d-b5c0-4b8d-a5f6-146e10c1bef9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:24.40629+00
077b618a-e023-462d-acb1-61b962a96113	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:25.577538+00
f7034fbc-c061-4da9-9752-83900f61383f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:25.740231+00
cf747a76-6257-4699-be31-26a016eac163	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:25.896706+00
8ffb48ca-1f81-43e4-8b66-5e5f83ad3bf9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 18:46:26.065207+00
29e66cdd-2e72-456f-a93b-9f5282572cd0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:31.947313+00
4c5584db-53c9-44bf-aadb-60823ba7059b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:32.09698+00
769181b0-bca2-41ed-8dd3-64be20a061c5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:32.243611+00
3775ea1c-e362-4d77-b7b5-1899f5d27807	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:32.390707+00
faaf9e0b-fc97-46b1-a4de-8ac5310d37a5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:32.53722+00
004a2167-d12c-44d4-ab83-86ddaa0bd491	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:32.683792+00
582955d7-ca98-4512-bd5d-97bb2758eac4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:32.83373+00
680135b7-3fa4-4c9f-832a-327d21285686	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:32.99005+00
b6705232-d0f2-4862-b77c-17286e42f6ee	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:33.147989+00
40603cb6-a3b1-4716-b764-f61f3085006e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:33.299756+00
ce806e7f-1a50-48db-8ab8-39ac4d436dbf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:33.451183+00
0dce50a0-fe19-4f24-a72d-b71d4205046d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:33.600028+00
fcfa98ef-ffe4-4450-be95-155b3ff14e81	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:33.76037+00
856bc37c-7c97-4af0-9c37-0bba4121f267	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:33.908727+00
a98f9a55-f7e9-46bc-8742-861603bec2f7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:34.064386+00
22196a9b-715e-4db0-8138-8afa2de40371	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:34.212518+00
892090a1-f5e0-4bcf-bf97-f4e0d8a22115	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:34.364506+00
72165bf6-9c58-4478-aa24-3fe182f24662	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:34.526003+00
e1e31ca5-8995-4d3d-88db-c53fc9838c07	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:34.678062+00
01591eb9-a3cc-49e9-8c16-fbe7b9530405	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:34.847717+00
7a6ae54b-d6b2-4138-aa41-633b02719003	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:35.167112+00
3a802b6c-7e49-4ca3-b84a-a7f04a275817	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:35.360191+00
8d7f0df7-0507-4bef-a5b2-af93d5ce74a6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:35.516998+00
d69de95b-0b04-4c45-9f26-2e2539286c37	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:35.666957+00
9fd89d37-cd18-44cb-8fad-d7a994773fa1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:35.820522+00
db417752-a6c8-4bf0-b40c-ba4b0aea9ed6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:35.979302+00
cd5ea519-502f-43a9-84ff-1b2504d2e075	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:36.130256+00
0c6335d7-efad-4037-a4ff-3231a1788407	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:36.282725+00
fdbc49e4-bc3c-4b47-93c4-b6f7fc102f7d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:36.434953+00
df6292e9-d667-45a1-bde5-87a3d0219b86	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:36.587415+00
17988494-5e67-4c50-bebc-1950aefd39e3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:36.741999+00
7e295a56-1c4f-4f62-8d77-627541d51065	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:36.894132+00
7e8960cf-7535-4e9c-943c-8f12dc8a5f4d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:37.047341+00
51853147-433c-4706-a7e2-4ab7b9bc2a77	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:37.196119+00
403f1f56-5e71-4bf6-b7e5-3544602e0af1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:37.345154+00
aee332ad-676d-4420-b33f-ef91b03159f0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:37.493841+00
17cdaae3-41ac-45e2-863e-cdc07fa621e1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:37.644101+00
74deddb3-b365-4541-9d56-fd6331c05096	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:37.798346+00
c57a1690-f4df-46e3-8e9f-ebe8ba05992a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:37.948688+00
5554a8eb-2317-4cd9-8709-dc476980c669	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:38.094848+00
f9318843-075c-4db5-bfe1-9993119185cd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:38.246334+00
67a6ef98-1884-4a55-ad6e-a7b2b51f0605	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:38.395807+00
5162f1c2-d03a-41cd-b80b-94ac94c83ead	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:38.545624+00
e1026622-d146-4496-a9e0-99401f2ca4b2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:38.698474+00
a894566a-f077-4915-b9a8-2b43e4c18422	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:38.85275+00
f09a2089-886a-487f-9771-4e0686b14aa9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:39.006902+00
c5fdb6fd-e666-405d-b2d0-3e735e61a7cb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:39.154989+00
5fb47d4d-d98b-4abc-89c0-aaf891cb50fa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:39.303714+00
c7736845-6bc6-475a-a39f-e27af08450e5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:39.459901+00
715fa934-43a6-420e-8631-35867cb2e160	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:39.620692+00
2cefa6fb-f0ba-4368-ae58-78a921677a34	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:39.791344+00
f01cf540-5923-4387-a1b0-4f2530f0c7ea	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:39.952608+00
259220ac-8d4e-4b3a-b27f-80a17286101c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:40.11337+00
87a2d579-3908-4e1b-87da-3317582f1757	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:40.272751+00
085f7f94-3c18-4fd1-bf55-0f8bad38a36e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:40.444752+00
3d839f66-7d16-4da2-bb28-e7d085e7c667	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:40.59972+00
b9e8dba4-41fa-4fde-a55d-9dea27beddef	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-26 19:17:40.760293+00
1f46d5b2-974e-4406-8fd6-d7b24e5f98f2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:25.966522+00
62022504-a25d-422f-af90-3d47c1881916	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:26.172922+00
58d5466a-1dd4-4d82-983a-adc7f5ca5497	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:26.35453+00
53d3203b-1bef-42a5-8ad2-3af773811b1b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:26.541192+00
54488052-59c9-4497-8e3b-f7976f13d3ef	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:26.727392+00
38dbf1a8-4a51-441b-a8f4-42a156b8bc09	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:26.909413+00
48e8477b-7432-4672-a927-7d624b268aac	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:27.092502+00
a170ba88-e409-449e-9e20-3439f906390c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:27.274235+00
f5332300-187e-413f-bba5-5f09778d63ad	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:27.460975+00
f342b7be-b471-45e6-8016-503be9f65b95	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:27.651609+00
b4f31132-d5a0-450f-8b83-5d613a8567e0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:27.832838+00
acbece34-27b1-46c1-807a-c40eb90442fc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:28.022462+00
765d0fe3-499d-47c9-95d8-4f99eb3fa859	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:28.212668+00
d1812234-ece8-47d6-9442-2ceb76b3fe4e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:28.399768+00
38b997a8-0b0f-4092-beed-b0697ad9fc84	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:28.593332+00
7ae546bc-6d3c-4eb0-a217-fd64a61c7385	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:28.795319+00
e87631df-9b2d-4434-ac47-4b5b970f2d04	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:28.992368+00
072b890c-9351-4423-af74-ffb7e208fa14	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:29.182596+00
1cacd129-b4e9-48c6-b1ae-c196d9849cf1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:29.374172+00
82affa98-9719-47b2-be24-a58ab08d3db0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:29.565904+00
e7029462-bbc6-409e-9140-789395124096	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:29.769717+00
3f9fc600-e6f5-4ceb-b855-1d656b76657a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:29.959823+00
c487de26-3b44-4b0c-a516-9cf7fe06ed07	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:30.153715+00
caf37949-62f7-4b64-8488-51a160097208	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:30.351707+00
513e521d-c505-4588-a6b4-e6796e914e9c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:30.551278+00
f3990fb7-3da7-4248-ba89-a326311f6afa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:30.750677+00
fddbe569-8de8-457e-a22e-2ad474fec9da	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:30.945004+00
0a670a38-6afd-46d5-b48a-b8c66a49ee11	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:31.182871+00
90968282-2fd3-4d06-be77-b34043f29701	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:31.366117+00
a2511eff-37ff-4972-9d71-1683257a98c4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:31.553961+00
82e4591e-8e35-420a-b46c-59f97531d515	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:31.757525+00
c5ed1947-7e33-45d4-b6e6-0fdb506f1784	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:31.962638+00
d3628db5-49e6-4a5b-b533-9b440a01dc6c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:32.162478+00
0271a7be-e51d-4026-8313-40f429019a75	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:32.364164+00
e2ffdced-663b-46ea-b743-442a8dda0bd8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:32.547364+00
b9408bad-9efd-4088-b1ea-6d6b5430c936	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:32.729421+00
54abad19-3c69-4f9c-bbca-8121bb2efd8a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:32.916408+00
20a3e239-1095-4ef1-b9b3-85bff259a438	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:33.103402+00
96709262-2f9c-4d99-ac5b-ee2e6f1c4901	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:33.29782+00
0b53073e-779d-4f0b-bb47-c4b23451afcf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:33.488045+00
28c6eea5-0ba6-41b7-94bc-e197fe4882de	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:33.677827+00
34c3df4c-1197-41e4-a44e-adf23681b67f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:33.879285+00
d55f3708-2382-4ec0-84a0-7b92342e4363	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:34.084735+00
92f9eb8f-8d2d-46c5-9e31-2a8374aba402	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:34.281361+00
679ac946-7105-45bf-8055-99bc94068b3e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:34.462657+00
3b8097b1-9c7d-4e77-bd5c-e0272ebea997	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:34.656055+00
1fb3e478-795f-464a-87ab-89dae1520f12	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:34.847674+00
00673d58-f09e-4493-8b02-652c2032b655	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:35.045669+00
233749d3-33bb-4543-9e5b-167eccc2f59a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:35.251579+00
0c042100-a905-49d2-a71b-2eaed4af4bb9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:35.555418+00
425d1f2a-2c8b-40a8-b770-7501aef02ea2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:35.752869+00
2b623327-70dd-4aec-a815-c877465e0aa5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:35.94373+00
c3bf6112-d797-4935-89f1-83a4c5aa25c4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:36.136881+00
32bca680-74ce-4639-8b9c-8ee697ad0e9f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:36.311417+00
8da52fa6-6011-4faf-ac87-257373ffbb24	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:36.497776+00
068b5754-efec-43d1-aada-020547c208bf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:36.687193+00
c623c278-9aad-46ff-963c-1c07237050eb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 11:17:36.852829+00
f691d9be-f6d5-42b3-9127-c68c3961bac2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:02.413669+00
7504de70-5d93-4988-8728-f098b3169620	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:02.584326+00
8b000eaf-f227-4e02-b51e-ece4733455c8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:02.748399+00
bcfafa15-84b7-4c85-ab62-8fd7cfc5a599	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:02.917918+00
4edb85c5-79a3-4a7f-a0de-b1853246a689	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:03.084897+00
b824fd1e-c53c-46a9-a83b-ad140f9d5cca	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:03.253791+00
eba8514a-92fb-4343-bead-df1280467af0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:03.416683+00
48d7bcde-be67-44d8-9b44-a77b6eb66e5f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:03.584215+00
a12a6b2d-2bb9-457a-9d2e-8bed4655200a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:03.747535+00
ade1ebd2-e968-49a1-b23b-a9ca7f876e5a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:03.908893+00
7b4bb6bd-04ce-460d-a7eb-27d444a84649	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:04.076074+00
203c56b3-d72e-4e0d-bb2c-c3fcc9cef1f6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:04.24732+00
089cedd5-f7d9-412f-a148-2534a4097085	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:04.404724+00
f6545c39-8d8f-4d02-8deb-39c09c462026	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:04.567082+00
4cdc24d2-cf35-40f5-ac4e-fef9b4fd28aa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:04.73566+00
426a23fb-8ef4-4f29-9152-30cd3b07727f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:04.903221+00
80d73824-4df6-4182-b0dd-1246ea28cf03	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:05.065148+00
b826daef-d02a-4036-bb05-9609ba2f3a66	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:05.234048+00
f0f9187d-a14c-47e8-9929-d2f2b0570429	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:05.394443+00
72564070-0580-4c56-8ee7-b96ab141a8c6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:05.564772+00
1721e468-5ff4-4658-a3b9-717539ac7df0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:05.728904+00
20f7d77e-aa46-4f37-8ef3-daef1d928eb8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:05.894474+00
932bd3fd-5496-4a29-87cd-4bf3dcb0fa87	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:06.055656+00
d54a9677-8e72-434e-b29d-35d92ef8529c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:06.219713+00
b2698a3a-7e61-4176-b426-06f28fd87a06	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:06.37672+00
d0c73f9e-8daa-4da6-846a-c5c0e1e84b25	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:06.537958+00
fd20624d-3b37-4e7c-9c1e-06834797df7f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:06.700062+00
6f0c12a1-c2ea-4134-a37e-d0bbbcaae2fc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:06.862272+00
8f9904f4-f1ec-4195-a093-28ba3d06da29	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:07.021881+00
2200c681-3f93-47aa-b544-1993e2271bef	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:07.178116+00
ffb5a98d-ee3c-46b9-a89c-a84964cec339	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:07.335279+00
0eab5085-36a1-471c-8bb8-2700b2a11102	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:07.491758+00
2b88fa12-5af1-4895-bcdf-9f5303087abf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:07.656428+00
bb5316b7-22ea-4c28-b251-96e8af6bb8e9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:07.821261+00
3deee806-e3c9-4e7d-8b97-52e444929d39	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:07.997758+00
e640e237-002b-42c8-adbb-2fdb96ce70a5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:08.169349+00
9613172c-71b4-4a90-ab12-6557fd3cfb27	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:08.335068+00
d4b5df54-a616-4464-9422-06f1fa745ec0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:08.498543+00
1e11eb13-6844-4308-b8c3-bf48a1b52af9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:08.659755+00
4da7e6d6-a33e-47b0-bd3d-84f90c69dd94	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:08.82043+00
45659538-601b-44d1-892c-d9638c3529fc	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:08.988615+00
ce070126-8498-45fd-b186-ca28c07b08d3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:09.153909+00
5e75c6c1-7788-4bc4-9f1b-bb6481895751	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:09.320585+00
1fa9e6c1-3a4b-4d1d-ae66-4904c0bd18a7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:09.483839+00
bc70da89-adc8-4423-999b-07891f83a411	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:09.645508+00
159fa3e0-5768-44de-a15d-61bdc66f1f5d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:09.804336+00
360facef-1405-4503-a2fc-0ed9172fe1ef	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:09.956839+00
659aa508-95c7-47c1-8a0b-97c3cabdf8f7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:10.118038+00
5c7aa333-1503-408f-8b9c-ccd6ba06bb3b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:10.272834+00
f2464674-03b2-4e71-b4b7-b38d3793579e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:10.426096+00
0c751baa-e51e-4e53-9a78-b6d86e86df0a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:10.58677+00
a5214979-47c4-49e1-9764-c995e13eb0dd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:10.742879+00
fa524c53-a121-45da-b1c1-df25b55cb1db	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:10.894084+00
8d98c7f6-e2a3-4c5a-9350-3db70871b85e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:11.047354+00
35b794d4-9d2a-407d-a5e4-ec9607b2697c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:11.200337+00
494ce6c8-4d4d-40ac-a46c-a94bef18c4bb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:11.352423+00
702483d8-150c-476e-aaef-312ba2a0cb97	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:11.506574+00
3aeb550e-bf49-43b0-9c71-3d9b576177fb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:52.801086+00
6c8510c5-bf8a-4340-afbb-5cf617040c91	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:52.968629+00
6d02025c-a0db-451e-9222-1af294162f8d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:53.125979+00
ea6d5242-f6a0-45c1-aeb8-2f8ba919740b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:53.294648+00
206dcbd6-1302-40f8-8d05-b717cc83785b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:53.455563+00
dd61041e-1326-47a2-9639-21a3414c9ac5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:53.60919+00
c073d6b5-555c-4911-a809-2197e55ae276	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:53.768244+00
762c261d-4c8e-4cb8-9567-7c8eb8752411	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:53.921562+00
d57371af-982a-409d-b453-f0beae82e538	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:54.084136+00
0e6a7b21-27d2-4550-91c0-ae2e061fb20c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:54.243677+00
3482101d-a681-499b-8365-507c57d4e8ee	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:54.419929+00
dbda68b0-8347-4afc-adbe-c8309ed3b88e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:54.592923+00
e0bd9a0b-b888-4644-942e-70ad80c6f8aa	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:54.759304+00
d59154d4-8580-4bf6-bf65-09627288d05e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:54.938819+00
658584d4-e26f-4ed9-a79f-7425ccad8386	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:55.117567+00
c09c739c-468f-4510-97ac-688cb27b1922	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:55.291149+00
f0f96ef5-2964-494a-a3b4-24bc0df18fb8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:55.464868+00
5cd846cd-2dde-44dd-acb4-800b040ed26b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:55.65623+00
b760ec09-28ba-47ad-a5ed-633de93066ad	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:55.816501+00
78266dec-63ea-411d-9d4e-10c037538f70	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:55.995479+00
9c466bfa-1fb0-4dea-9af5-7c537e86f560	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:56.168375+00
76c55388-ba1b-4867-aa75-0cab9fe61f4a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:56.338842+00
5f4f5c95-ddc4-4948-a9ed-d32a49e653a0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:56.506462+00
09e84850-cf17-4961-94ce-e3d4aa788bbe	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:56.669744+00
89ca65a0-d797-4a6d-b3ca-416a4fd0f6fe	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:56.831491+00
65b1336e-85db-42b1-b84a-2f393572c6c8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:56.992006+00
d8d570e4-7899-4486-86d7-5dd3e3bb6d6f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:57.149241+00
59fe9455-dde4-4bcc-a139-ffd1b35a587b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:57.324294+00
463fbb7f-4cfd-4d56-b6e3-e621b69d85f8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:57.492728+00
0fc74357-e12d-432f-91c0-3192d135ec3e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:57.653905+00
a47f1ddd-c16d-4269-aabc-6009d8d5741b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:57.804374+00
3fb7c09a-a234-4eda-b3be-9a5730ff3722	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:57.981337+00
1a4b1b88-069f-4f1f-9488-8aba3795a928	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:58.14736+00
2b3c0669-ad60-4633-a464-7847e0198654	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:58.311537+00
31e2f6cc-ac89-4f0f-8e6e-654af1b151b1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:58.467661+00
10cb063c-00ab-4ef4-9488-6fc30083b495	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:58.653978+00
86d7d1de-d3a8-4095-9e11-2b57faf2a227	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:58.803117+00
459cdfee-0d87-4b85-bfec-3f6a4b7c4d68	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:58.953224+00
de6ef74d-8bcb-4aa6-baf5-b3eaa4d0ed8e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:59.129709+00
f57b5cf7-ae0d-4b95-a197-969fd36bd04e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:59.280616+00
4e3913bc-2b46-4f60-9000-a0a0459c0a86	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:59.457313+00
b95b810c-82e0-4049-b664-519e7064fc50	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:59.626523+00
38993435-cb1b-48c9-b65c-4b7bdcaa291d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:59.784067+00
a5a88980-c7c3-412b-ab20-808aa2160433	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:02:59.94228+00
675b31f1-c1cb-42f1-b284-c12430c96dd5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:00.096208+00
3d13dc3f-a72d-42d8-97bf-0a81336661a7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:00.257832+00
1046e750-261a-40c5-be98-c6d2087ce6e2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:00.434848+00
82d952c5-9f7d-4c4b-92e8-533fce790fed	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:00.611641+00
cbf9687f-30d7-4a71-a1eb-5202df9b7971	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:00.784781+00
5cb8b5b2-e53b-4d0a-8030-38621d73662f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:00.942957+00
fe1206a3-077d-43cd-b1bf-d204819218d0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:01.094439+00
a530d4b1-2249-4d6e-ba7f-a579dc14cb26	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:01.248411+00
fad45864-9d52-4fae-ad52-58b9250b4d61	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:01.401302+00
222aca1f-8bee-44c0-9382-bede6d82672e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:01.550327+00
57cb09ba-ac4d-4900-88e4-ac057e0e5570	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:01.701106+00
62f6aaf2-3327-417c-83c0-ca2260a31bbb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:01.857709+00
220a0719-acef-4406-8d36-9345c31bce93	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:03:02.012142+00
c5c847af-83cf-4926-bd50-711ef914d13a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:16.769736+00
dd4415c3-0e80-4f6a-9614-2954aa9df1ff	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:16.932529+00
1d7fd3f7-d1ce-4fb5-a4a2-c6f24cbc8f08	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:17.088387+00
46d46246-25be-4e7c-a14e-49ffc28dedd8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:17.24013+00
ceddda35-3670-45c5-850c-2bdd9dbe7b1f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-12-03	\N	\N	\N	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:17.3928+00
e3ab0706-0084-4b38-9f19-95417ee05163	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:17.553484+00
3ed5ce73-9623-40f2-b116-083186fff0cb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:17.710331+00
de854c91-e3f3-40ca-b944-c2df2bfe6781	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:17.869271+00
7329ad88-a87f-43c8-835c-711fa56090c7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-11-03	\N	\N	\N	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:18.022954+00
e1969fd4-c0c6-4583-9e43-c7bc13769706	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:18.180253+00
b7821f40-05e2-49a7-993f-908474069c39	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:18.336268+00
f8d5c99b-489b-4a1e-9bee-1c903bc1d3e7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:18.489827+00
4f0c5e7a-f291-4b99-bd27-02c641af392a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:18.646636+00
e380afda-6d52-4b32-9f79-2a3878a7ccb4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-10-03	\N	\N	\N	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:18.798645+00
1218b8c4-df9c-4a62-9355-01aa4c4b4bec	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:18.973922+00
0d257306-5888-4ea6-9a22-ea67141e73f6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:19.128002+00
150cb915-82e4-43af-9447-2173b37a3dcf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:19.278744+00
f24daa38-1ad2-448c-9b8f-0f5749717ce9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:19.428634+00
bb620e1d-5507-4932-9025-f6525e723e59	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-09-03	\N	\N	\N	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:19.58117+00
38062577-3894-454b-8534-47ce28aa0456	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:19.742059+00
fa0452cc-073b-4ffa-8226-6df0c7abbdfd	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:19.895687+00
1c69f9df-8abf-4c98-a3dc-ceec72c63360	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:20.045361+00
b3138afd-f3d1-4411-96d0-18dfbcd39d83	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-08-03	\N	\N	\N	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:20.198031+00
28c40226-01db-409f-9df3-0400b2356f07	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:20.348731+00
06d6a44b-370d-4b6c-a0f7-b18dd8dbb0e1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:20.498406+00
ab220b34-fa07-4a4c-8957-4de7763fcc4c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:20.64941+00
b1760ea4-c96b-4336-a8d6-218236e2a8a0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:20.80218+00
72496024-4466-4139-8134-e5469556fac1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-07-03	\N	\N	\N	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:20.952434+00
b38e35bd-f5bc-44a4-bfd4-65423a006ea2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:21.103183+00
a7a9fe7d-482f-4308-8081-22196ee726c7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:21.254077+00
5c0a3bd2-413f-4cc5-ac72-9f9af621e059	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:21.407867+00
e2032434-d99b-4816-869e-2f7e62e98652	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:21.561065+00
6fa1aacf-bef2-4669-811b-518fbd17b242	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-06-03	\N	\N	\N	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:21.713856+00
0da52d9a-e205-4d67-a5be-aadbf75f5eb1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:21.862984+00
cf466c9f-e248-4318-aa5f-b1947ef5e478	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:22.013215+00
86612c59-5c34-44bd-b8c8-c3bae865b02c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:22.161532+00
aa34a19c-0ab6-4050-946f-3b363092113f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:22.313968+00
0264dedb-9f77-47fa-9f85-5cf7945eec55	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-05-03	\N	\N	\N	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:22.466295+00
55ed474b-1113-4b5e-809a-bf11bca3c23b	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:22.617943+00
ab16d33f-09f1-48ad-9923-46d648e727b9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:22.768483+00
248b9601-d14b-49ad-8936-8fc256f5c92f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:22.918496+00
1b8413a9-3e24-4b6a-91eb-c7617eb295c7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-04-03	\N	\N	\N	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:23.067607+00
86062624-8328-4dce-a734-957f3d0b7c30	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:23.216975+00
873a859f-c6cf-47f3-a7de-0f41c0383942	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:23.367309+00
e17c8759-c329-4951-acaf-3881a4c666f6	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:23.543801+00
c43433a3-0178-488a-946c-9f4da8452e62	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	823.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:23.704148+00
da777b69-85ed-4550-ba5f-8151dccf5097	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-03-03	\N	\N	\N	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:23.868161+00
6db56532-15ff-4ddd-bc7d-ab2089bad1ce	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:24.034258+00
6c84721b-5d0e-401c-80d3-ffbb7fbc5cb7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:24.203948+00
d7cbb391-965f-4d91-a45c-22420a63a5d9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:24.374787+00
13f06748-33b1-48c0-8072-4995a43b6743	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:24.633309+00
acd7d30e-ade8-4d7a-967c-71a6b3eca835	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-02-03	\N	\N	\N	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:24.792575+00
296629c8-a3b3-4c97-9cc5-7039738b8661	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:24.963521+00
ed6507a1-a0cd-42ef-86d5-ef4176915da0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:25.126334+00
1bbd7e36-92c1-4518-abdc-7aec22972b56	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:25.312778+00
69c27b59-5144-45a7-9aa8-6248d1e9ec62	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:25.474614+00
9684ffa1-44ab-4a56-add0-d4de340f09f5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	\N	943.00	2025-01-03	\N	\N	\N	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	f	\N	\N	\N	2026-01-31 14:46:25.637203+00
2d51c01f-883a-4a1d-bcf7-63a03cb1a12d	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-01-03	Mietzahlung 01/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
7decd40a-3b23-4bd1-9437-3764be32083c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-01-03	Mietzahlung 01/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
4ae5d3bc-90d6-426c-afd2-3266721015fe	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-01-03	Mietzahlung 01/2025	Peter Huber	AT61 1234 5678 9012 3458	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
e789e8d5-d8e5-402b-9b11-c5cba44cbfe0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-01-03	Mietzahlung 01/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
c87c7fa3-58f9-41dc-b583-201fa4ee0432	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-01-03	Mietzahlung 01/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-01	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
57222ca6-f6ab-40d2-acb5-96cf24bc4485	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-02-03	Mietzahlung 02/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
e45402f0-7705-4a8a-9eec-a1984e7cba61	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-02-03	Mietzahlung 02/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
8ceb07aa-8b05-493d-afd7-6d87886dc545	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-02-03	Mietzahlung 02/2025	Peter Huber	AT61 1234 5678 9012 3458	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
57fc3996-a561-475c-8561-0031f5fd75b0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-02-03	Mietzahlung 02/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
682d87ae-9764-4c70-9ed4-a96168764377	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-02-03	Mietzahlung 02/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-02	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
fce6d71c-bb78-45d0-b347-fb880e0f7554	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-03-03	Mietzahlung 03/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
6ba6dce8-1aa6-4e70-8e55-039d92cc1d09	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-03-03	Mietzahlung 03/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
74498114-9ff5-493c-8dd8-f5dc3634f8bf	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-03-03	Mietzahlung 03/2025	Peter Huber	AT61 1234 5678 9012 3458	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	4bd3ab72-9deb-42cd-b702-5e2ddedfea4b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
eb4fb480-3411-483a-a405-863fca30abe9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	823.00	2025-03-03	Mietzahlung 03/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
f5a0047b-452e-4fe4-a4c5-77d23a81b280	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-03-03	Mietzahlung 03/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-03	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
5bafcd24-9c6f-4e63-a0e6-3bc83587cd2f	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-04-03	Mietzahlung 04/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
ab68444d-ebb5-47d4-bf70-5e773f721c20	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-04-03	Mietzahlung 04/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
289922b9-255e-4266-9599-393f7aab9ce9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-04-03	Mietzahlung 04/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
4e3cf3ef-21f0-4f48-bc7f-f323d0ad689c	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-04-03	Mietzahlung 04/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-04	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
28c8d683-df3f-4a2b-8650-600a409f766e	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-05-03	Mietzahlung 05/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
02bd0523-45ef-4527-912c-41cf8b9a7935	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-05-03	Mietzahlung 05/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
961abacf-14c5-4ce0-bd68-ecaed95ce8ba	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-05-03	Mietzahlung 05/2025	Lisa Neumieter	AT61 1234 5678 9012 3459	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
ff25c39b-222c-4764-bd1d-8fe5c4bd50f3	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-05-03	Mietzahlung 05/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
f14a6df2-f760-465b-b334-46f04b833f4a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-05-03	Mietzahlung 05/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-05	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
c8241898-a71f-4079-89e3-6fb738fca691	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-06-03	Mietzahlung 06/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
e439f107-3bed-4272-887f-9ab381ba93e4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-06-03	Mietzahlung 06/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
4c6c7f80-f7b1-46f3-80c2-0d391231f155	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-06-03	Mietzahlung 06/2025	Lisa Neumieter	AT61 1234 5678 9012 3459	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
38e1468b-e767-45b6-8d11-ee869c50e4e0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	823.00	2025-06-03	Mietzahlung 06/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
57af7629-a2e2-440e-8180-5d2205f91d32	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-06-03	Mietzahlung 06/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-06	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
23c100c3-9189-43c4-9ae5-bbcc526082f7	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-07-03	Mietzahlung 07/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
e3b3d5fd-edb9-4031-bc90-304802b4cded	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-07-03	Mietzahlung 07/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
2242b113-05b7-4f33-bdd1-0561f04a9061	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-07-03	Mietzahlung 07/2025	Lisa Neumieter	AT61 1234 5678 9012 3459	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
bc5e54d9-4fe4-44dd-86d5-bbb08d9119e4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-07-03	Mietzahlung 07/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
71f40187-3690-44bf-abb7-fca4776e5ceb	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-07-03	Mietzahlung 07/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-07	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
335720ef-bcf0-4018-8c55-276b2e6c7e87	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-08-03	Mietzahlung 08/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
c330a4c9-c23e-4271-a7f9-cf2e38d79c73	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-08-03	Mietzahlung 08/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
6d373f1a-3b09-4db1-929f-c15617cc0718	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-08-03	Mietzahlung 08/2025	Lisa Neumieter	AT61 1234 5678 9012 3459	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
5ad5dddb-2b35-4633-bf00-6fe91de7a00a	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-08-03	Mietzahlung 08/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-08	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
be1c761c-8c92-48c2-8948-1623badae2e0	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-09-03	Mietzahlung 09/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
03fb1653-afbc-4814-8293-e4c30c5be416	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-09-03	Mietzahlung 09/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
12ece3b3-3f49-45a6-88b2-7de16ee3b7d9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-09-03	Mietzahlung 09/2025	Lisa Neumieter	AT61 1234 5678 9012 3459	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
dcd96ff6-4b47-48ec-a80e-11d922243eb5	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	823.00	2025-09-03	Mietzahlung 09/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
916f94cb-624a-412d-ac75-40ab4a687846	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-09-03	Mietzahlung 09/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-09	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
8f40d797-6417-4113-a3e1-0a10c26c00e4	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-10-03	Mietzahlung 10/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
0daa18b3-79ab-4116-af36-a7319fca0966	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-10-03	Mietzahlung 10/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
67518878-313c-4b47-a342-5aa4a93514f9	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-10-03	Mietzahlung 10/2025	Lisa Neumieter	AT61 1234 5678 9012 3459	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
04b54ecb-962a-47d1-b16b-e327f917ffb2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-10-03	Mietzahlung 10/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
a41758f9-e00b-414b-982d-83f5b865c124	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-10-03	Mietzahlung 10/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-10	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
e44c841c-b357-4de0-8090-6b02ca97ab06	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-11-03	Mietzahlung 11/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
5fb9872c-152d-49aa-b4c8-1f89a000e838	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-11-03	Mietzahlung 11/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
8e61083e-aacb-4e33-88e6-d9d030020394	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-11-03	Mietzahlung 11/2025	Lisa Neumieter	AT61 1234 5678 9012 3459	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
49f409e5-5eac-4b5f-a240-d3e4a10151db	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-11-03	Mietzahlung 11/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-11	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
892211d4-c74d-4b48-a5fe-40b191d131a2	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-12-03	Mietzahlung 12/2025	Hans Müller	AT61 1234 5678 9012 3456	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	2c23f9a6-4168-4947-a60d-4de39d0bd932	6960763b-6519-491a-a4fe-405ab2107c19	\N	2026-01-25 08:30:41.808729+00
d11315fb-c1e7-4203-ac04-1eb9640d4c28	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-12-03	Mietzahlung 12/2025	Anna Schmidt	AT61 1234 5678 9012 3457	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	1527b71f-2815-48fe-b909-47bd1daca87d	27639f6f-de74-4656-bbbf-8f04d58dd4c7	\N	2026-01-25 08:30:41.808729+00
f6701a08-64e0-4a36-81b5-43df3903fc08	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-12-03	Mietzahlung 12/2025	Lisa Neumieter	AT61 1234 5678 9012 3459	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	49e02c08-39ed-48e4-b5f0-c870669e892b	2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	\N	2026-01-25 08:30:41.808729+00
7b59cce2-7992-4f58-a56f-c793721398f1	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-12-03	Mietzahlung 12/2025	Franz Zahlungssäumig	AT61 1234 5678 9012 3460	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	809e9fd3-5495-4111-8c84-16be2ffc797e	5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	\N	2026-01-25 08:30:41.808729+00
3752176b-b69c-40b9-a0c0-994de00d6af8	6f4bf3ce-03e3-4907-aa1b-7dc4145dd795	8d518944-9cae-4579-9423-9c55e7bc255b	943.00	2025-12-03	Mietzahlung 12/2025	Claudia Bauer	AT61 1234 5678 9012 3461	Miete + BK 2025-12	d3a0185f-ae91-418a-a3da-b78c9e0ffa2e	t	bd7bd729-f522-42c8-97d2-01e73c38f81c	9ceece04-ba90-4a59-ae58-73abeaa3a7d3	\N	2026-01-25 08:30:41.808729+00
\.


--
-- Data for Name: unit_distribution_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.unit_distribution_values (id, unit_id, key_id, value, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.units (id, property_id, top_nummer, type, status, flaeche, zimmer, nutzwert, stockwerk, notes, created_at, updated_at, deleted_at, vs_personen) FROM stdin;
6960763b-6519-491a-a4fe-405ab2107c19	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	Top 1	wohnung	aktiv	85.00	3	0.1889	1	\N	2026-01-25 07:18:51.601207+00	2026-01-25 07:18:51.601207+00	\N	2
27639f6f-de74-4656-bbbf-8f04d58dd4c7	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	Top 2	wohnung	aktiv	92.00	3	0.2044	2	\N	2026-01-25 07:18:51.601207+00	2026-01-25 07:18:51.601207+00	\N	2
2874cb9c-00f3-4694-9f4b-1a3f26f46fa1	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	Top 3	wohnung	aktiv	78.00	2	0.1733	3	\N	2026-01-25 07:18:51.601207+00	2026-01-25 07:18:51.601207+00	\N	2
5dee93ad-d56b-4612-82dc-eb2b9dbbbc48	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	Top 4	wohnung	aktiv	95.00	4	0.2111	4	\N	2026-01-25 07:18:51.601207+00	2026-01-25 07:18:51.601207+00	\N	2
9ceece04-ba90-4a59-ae58-73abeaa3a7d3	d5ae7b6f-2fd2-4d03-8c99-f673c8ab6fda	Top 5	wohnung	aktiv	100.00	4	0.2222	5	\N	2026-01-25 07:18:51.601207+00	2026-01-25 07:18:51.601207+00	\N	2
d01f4a7c-dbed-401a-81e6-f3ddaae45da9	d62b5016-7783-4c4e-be6f-01c454af675f	GE01	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:24.578383+00	2026-02-01 07:26:24.578383+00	\N	\N
cc970e1f-376e-4b29-b8de-1311db5d81fb	d62b5016-7783-4c4e-be6f-01c454af675f	GE02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:24.938234+00	2026-02-01 07:26:24.938234+00	\N	\N
ef29792d-0198-44e7-b28f-b3d4c477c612	d62b5016-7783-4c4e-be6f-01c454af675f	GE03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:25.297374+00	2026-02-01 07:26:25.297374+00	\N	\N
583849e1-06a8-486d-a9d4-d1dd0f38f2a1	d62b5016-7783-4c4e-be6f-01c454af675f	001	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:25.652954+00	2026-02-01 07:26:25.652954+00	\N	\N
b84428ef-6b71-4093-ac4c-33c65380b574	d62b5016-7783-4c4e-be6f-01c454af675f	Top 002	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:25.981984+00	2026-02-01 07:26:25.981984+00	\N	\N
0ee8838b-e3b6-49fb-b298-c83346b54de5	d62b5016-7783-4c4e-be6f-01c454af675f	Top 003	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:26.351885+00	2026-02-01 07:26:26.351885+00	\N	\N
fb6fbfd3-819e-4e37-938f-b204d9488037	d62b5016-7783-4c4e-be6f-01c454af675f	Top 004	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:26.678552+00	2026-02-01 07:26:26.678552+00	\N	\N
6cb3027b-7a6f-4b14-9d1e-ce484094a9fd	d62b5016-7783-4c4e-be6f-01c454af675f	Top 005	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:27.1866+00	2026-02-01 07:26:27.1866+00	\N	\N
4a3439ed-0a5c-4f55-8010-1eb952760d3b	d62b5016-7783-4c4e-be6f-01c454af675f	Top 008	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:27.697273+00	2026-02-01 07:26:27.697273+00	\N	\N
444918e8-7ff8-4a3b-8cba-01a2c8aee296	d62b5016-7783-4c4e-be6f-01c454af675f	Top 009	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:28.026617+00	2026-02-01 07:26:28.026617+00	\N	\N
dea7353a-5be9-42e8-ac2b-681688bea5c2	d62b5016-7783-4c4e-be6f-01c454af675f	Top 012	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:28.357583+00	2026-02-01 07:26:28.357583+00	\N	\N
4d958a39-e9de-407e-8605-5d63237e29c0	d62b5016-7783-4c4e-be6f-01c454af675f	Top 013	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:28.866251+00	2026-02-01 07:26:28.866251+00	\N	\N
00a0c1a3-378c-4c6f-8593-83d04fc3c7a5	d62b5016-7783-4c4e-be6f-01c454af675f	Top 014	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:29.185438+00	2026-02-01 07:26:29.185438+00	\N	\N
1d43629c-b679-48b1-9282-95821d3ca751	d62b5016-7783-4c4e-be6f-01c454af675f	Top 015	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:29.521897+00	2026-02-01 07:26:29.521897+00	\N	\N
91bbf7b1-1444-4060-b03d-67989b387bd6	d62b5016-7783-4c4e-be6f-01c454af675f	Top 016	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:29.849904+00	2026-02-01 07:26:29.849904+00	\N	\N
b33c9d90-8614-4ee0-85f6-87b3288e8465	d62b5016-7783-4c4e-be6f-01c454af675f	Top 018	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:30.17401+00	2026-02-01 07:26:30.17401+00	\N	\N
1f38e7ad-c4d5-4822-8c18-fa165dab4b80	d62b5016-7783-4c4e-be6f-01c454af675f	Top 019	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:30.491768+00	2026-02-01 07:26:30.491768+00	\N	\N
b272bf88-f87d-4800-bd36-c8fe6e8d244c	d62b5016-7783-4c4e-be6f-01c454af675f	Top 020	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:30.986802+00	2026-02-01 07:26:30.986802+00	\N	\N
4223f474-6f6c-4efe-8d44-064f99079a0a	d62b5016-7783-4c4e-be6f-01c454af675f	Top 021	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:31.303717+00	2026-02-01 07:26:31.303717+00	\N	\N
f2b93d88-3f17-43ac-bb0f-e0ea8da19732	d62b5016-7783-4c4e-be6f-01c454af675f	Top 023	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:31.815047+00	2026-02-01 07:26:31.815047+00	\N	\N
fb044788-07a5-423a-8b67-5d4713d1db0a	d62b5016-7783-4c4e-be6f-01c454af675f	024	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:32.304583+00	2026-02-01 07:26:32.304583+00	\N	\N
d124989b-515d-4f9c-bd1b-5a3472cfada6	d62b5016-7783-4c4e-be6f-01c454af675f	002A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:32.630165+00	2026-02-01 07:26:32.630165+00	\N	\N
f52af7a2-9364-4683-a10c-88ce5d7c6854	d62b5016-7783-4c4e-be6f-01c454af675f	Top 001A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:32.946157+00	2026-02-01 07:26:32.946157+00	\N	\N
f406cc40-5c38-4874-824b-850a0cd5acbf	d62b5016-7783-4c4e-be6f-01c454af675f	Top TG02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:33.268591+00	2026-02-01 07:26:33.268591+00	\N	\N
e0ecd724-fa78-4278-8db4-e823115bf428	d62b5016-7783-4c4e-be6f-01c454af675f	TG06	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:33.585683+00	2026-02-01 07:26:33.585683+00	\N	\N
88f6f992-9364-48d9-8452-d88d3210c594	d62b5016-7783-4c4e-be6f-01c454af675f	TG08	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:33.898299+00	2026-02-01 07:26:33.898299+00	\N	\N
14e28a5c-d583-43bf-a091-aebcaedec42c	d62b5016-7783-4c4e-be6f-01c454af675f	TG09	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:34.217906+00	2026-02-01 07:26:34.217906+00	\N	\N
47bd43c9-5e04-4213-96c9-6953adc2774c	d62b5016-7783-4c4e-be6f-01c454af675f	TG10	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:34.522377+00	2026-02-01 07:26:34.522377+00	\N	\N
c8038478-95dd-4c89-b0b8-66b7ffbe83b1	d62b5016-7783-4c4e-be6f-01c454af675f	TG11	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:34.992812+00	2026-02-01 07:26:34.992812+00	\N	\N
4fe2308e-b38f-4479-957a-85ddbe3af911	d62b5016-7783-4c4e-be6f-01c454af675f	TG13	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:35.322804+00	2026-02-01 07:26:35.322804+00	\N	\N
ec40d134-6a14-43b4-86ad-0812eb2c32de	d62b5016-7783-4c4e-be6f-01c454af675f	AB01-03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:26:35.63922+00	2026-02-01 07:26:35.63922+00	\N	\N
572d89f1-e239-4e99-87ad-25a88a7fe70f	d62b5016-7783-4c4e-be6f-01c454af675f	002	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:47.034867+00	2026-02-01 07:36:47.034867+00	\N	\N
1ca9f5e6-c672-4209-884b-85b490ace091	d62b5016-7783-4c4e-be6f-01c454af675f	003	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:47.348569+00	2026-02-01 07:36:47.348569+00	\N	\N
6ae715bb-e249-4b1d-bdb4-38a6f2389637	d62b5016-7783-4c4e-be6f-01c454af675f	006	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:48.278953+00	2026-02-01 07:36:48.278953+00	\N	\N
f72b9c2e-208b-46eb-8ce3-724af756d9cf	d62b5016-7783-4c4e-be6f-01c454af675f	007	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:48.582063+00	2026-02-01 07:36:48.582063+00	\N	\N
3982e6b9-6911-43c0-ad60-0506001b02d8	d62b5016-7783-4c4e-be6f-01c454af675f	014	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:49.759363+00	2026-02-01 07:36:49.759363+00	\N	\N
698340e1-1fc6-4b48-8517-3c525d8b0399	d62b5016-7783-4c4e-be6f-01c454af675f	015	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:50.077792+00	2026-02-01 07:36:50.077792+00	\N	\N
9f3bb2b5-beed-4491-8d74-184bcabd8527	d62b5016-7783-4c4e-be6f-01c454af675f	Top 022	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:51.343215+00	2026-02-01 07:36:51.343215+00	\N	\N
e06045aa-ced0-4891-b49b-dbc447e14237	d62b5016-7783-4c4e-be6f-01c454af675f	Top 024	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:51.959227+00	2026-02-01 07:36:51.959227+00	\N	\N
813ed731-7514-43dd-8910-7f64b0857574	d62b5016-7783-4c4e-be6f-01c454af675f	Top 002A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:52.270754+00	2026-02-01 07:36:52.270754+00	\N	\N
865ad5a1-43cd-4bf1-b303-07cfd951672e	d62b5016-7783-4c4e-be6f-01c454af675f	TG07	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:36:53.077504+00	2026-02-01 07:36:53.077504+00	\N	\N
6bdf083b-17a9-4fd0-ac88-2aaff4ca1669	acd67da1-8e24-4437-86de-54df659355b9	GE01	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:56:57.343701+00	2026-02-01 07:56:57.343701+00	\N	\N
edb211cc-8590-4e66-b6c1-19273b2f367a	acd67da1-8e24-4437-86de-54df659355b9	GE02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:56:57.716207+00	2026-02-01 07:56:57.716207+00	\N	\N
011b1d76-d2cc-49a4-84a7-634a1c2e8e5b	acd67da1-8e24-4437-86de-54df659355b9	GE03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:56:58.049993+00	2026-02-01 07:56:58.049993+00	\N	\N
09e6fffc-5ca8-4549-bc96-a2136df317c4	acd67da1-8e24-4437-86de-54df659355b9	001	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:56:58.387872+00	2026-02-01 07:56:58.387872+00	\N	\N
ddac049a-76d0-47bc-888a-98afc6f30922	acd67da1-8e24-4437-86de-54df659355b9	Top 002	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:56:58.740686+00	2026-02-01 07:56:58.740686+00	\N	\N
bbe763e9-f6e4-44b1-b386-e5e9af92c25b	acd67da1-8e24-4437-86de-54df659355b9	Top 003	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:56:59.084774+00	2026-02-01 07:56:59.084774+00	\N	\N
b68a4a2d-0352-4438-9616-3c85a137c870	acd67da1-8e24-4437-86de-54df659355b9	Top 004	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:56:59.412492+00	2026-02-01 07:56:59.412492+00	\N	\N
4abf365a-e5a7-4ceb-9408-28f4f1becc32	acd67da1-8e24-4437-86de-54df659355b9	Top 005	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:56:59.933278+00	2026-02-01 07:56:59.933278+00	\N	\N
fb801654-0138-448d-a7e5-7058c7d4559d	acd67da1-8e24-4437-86de-54df659355b9	Top 006	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:00.439327+00	2026-02-01 07:57:00.439327+00	\N	\N
6814329e-943b-41ed-b4cd-52782e04d6b1	acd67da1-8e24-4437-86de-54df659355b9	Top 007	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:00.7669+00	2026-02-01 07:57:00.7669+00	\N	\N
a71ae3c1-8d4a-42fe-a22f-68b95f181a29	acd67da1-8e24-4437-86de-54df659355b9	Top 008	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:01.105474+00	2026-02-01 07:57:01.105474+00	\N	\N
ec0484d3-d35e-4bfb-bc7e-cdcd92591e20	acd67da1-8e24-4437-86de-54df659355b9	Top 009	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:01.438195+00	2026-02-01 07:57:01.438195+00	\N	\N
9d4e62dc-188c-47cf-baa7-7190e2375637	acd67da1-8e24-4437-86de-54df659355b9	Top 012	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:01.770368+00	2026-02-01 07:57:01.770368+00	\N	\N
7e9cd53a-96da-4672-ae9e-50ab3495593b	acd67da1-8e24-4437-86de-54df659355b9	Top 013	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:02.297207+00	2026-02-01 07:57:02.297207+00	\N	\N
f2aef802-b70a-4597-af6b-3272b69bc494	acd67da1-8e24-4437-86de-54df659355b9	014	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:02.629827+00	2026-02-01 07:57:02.629827+00	\N	\N
166b85e3-e7df-4e0d-a558-2cf23dda1a2f	acd67da1-8e24-4437-86de-54df659355b9	015	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:02.960226+00	2026-02-01 07:57:02.960226+00	\N	\N
05fcbe77-7790-4af2-b630-ac076af05b96	acd67da1-8e24-4437-86de-54df659355b9	Top 016	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:03.294872+00	2026-02-01 07:57:03.294872+00	\N	\N
d2a0389d-0d33-4923-81ca-46f085d77f89	acd67da1-8e24-4437-86de-54df659355b9	Top 018	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:03.625003+00	2026-02-01 07:57:03.625003+00	\N	\N
02f70964-d306-4161-b605-fc6e94d82d1b	acd67da1-8e24-4437-86de-54df659355b9	Top 019	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:03.958957+00	2026-02-01 07:57:03.958957+00	\N	\N
21cc105e-5006-41fb-93ca-8b14a89444fe	acd67da1-8e24-4437-86de-54df659355b9	Top 020	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:04.455315+00	2026-02-01 07:57:04.455315+00	\N	\N
6cd726fb-48bd-4c4e-b478-452abe50e4f3	acd67da1-8e24-4437-86de-54df659355b9	Top 021	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:04.780726+00	2026-02-01 07:57:04.780726+00	\N	\N
f73428ec-57e1-4139-ae34-5f570ab0d7ca	acd67da1-8e24-4437-86de-54df659355b9	Top 022	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:05.310173+00	2026-02-01 07:57:05.310173+00	\N	\N
e25967ec-cfa3-434b-bfe5-5455e50b118e	acd67da1-8e24-4437-86de-54df659355b9	Top 023	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:05.636949+00	2026-02-01 07:57:05.636949+00	\N	\N
fa254c34-81da-46b7-bf68-7a8b278efa76	acd67da1-8e24-4437-86de-54df659355b9	024	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:06.156392+00	2026-02-01 07:57:06.156392+00	\N	\N
73d29e6e-a080-4274-ab6a-e1dd2e3d70f2	acd67da1-8e24-4437-86de-54df659355b9	002A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:06.517636+00	2026-02-01 07:57:06.517636+00	\N	\N
18403f55-7c39-4975-b527-a02f1166dc93	acd67da1-8e24-4437-86de-54df659355b9	001A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:06.85145+00	2026-02-01 07:57:06.85145+00	\N	\N
fb58d735-887c-4bb8-8ff5-808c7665dd45	acd67da1-8e24-4437-86de-54df659355b9	TG02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:07.173718+00	2026-02-01 07:57:07.173718+00	\N	\N
4d2ffd4e-a662-4aa6-9a5d-289dfb1899e2	acd67da1-8e24-4437-86de-54df659355b9	TG06	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:07.498482+00	2026-02-01 07:57:07.498482+00	\N	\N
5d1c2fb3-74e7-4739-a96a-31fd42f59208	acd67da1-8e24-4437-86de-54df659355b9	TG07	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:07.829174+00	2026-02-01 07:57:07.829174+00	\N	\N
68dd6a79-6afb-47c7-9a3f-dcdbe1875ba9	acd67da1-8e24-4437-86de-54df659355b9	TG08	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:08.16099+00	2026-02-01 07:57:08.16099+00	\N	\N
9e925d1f-81c7-4658-9cbc-b623c7f0e55a	acd67da1-8e24-4437-86de-54df659355b9	TG09	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:08.49384+00	2026-02-01 07:57:08.49384+00	\N	\N
cbcd2f4c-7c3a-4f55-a3f7-ce0fe8105dfc	acd67da1-8e24-4437-86de-54df659355b9	TG10	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:08.811973+00	2026-02-01 07:57:08.811973+00	\N	\N
257c849d-4493-4817-9495-9101cbb0e2c7	acd67da1-8e24-4437-86de-54df659355b9	TG11	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:09.322762+00	2026-02-01 07:57:09.322762+00	\N	\N
838c184e-043f-475e-8069-5f6c61b30f0b	acd67da1-8e24-4437-86de-54df659355b9	TG13	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:09.649891+00	2026-02-01 07:57:09.649891+00	\N	\N
d9c3bf82-0123-4f02-a771-a60315fb0494	acd67da1-8e24-4437-86de-54df659355b9	AB01-03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 07:57:09.977992+00	2026-02-01 07:57:09.977992+00	\N	\N
291bea8d-c8f2-42c3-a5b8-1ab72aa3be33	81005dc5-883b-433d-b3a2-ffbcca1554c2	GE01	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:47.363666+00	2026-02-01 09:00:47.363666+00	\N	\N
4f9aa092-3383-40ee-bdd3-34e6e47b9a70	81005dc5-883b-433d-b3a2-ffbcca1554c2	GE02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:47.967374+00	2026-02-01 09:00:47.967374+00	\N	\N
e1bb9cdb-6618-44c2-80cd-6b808d491ff5	81005dc5-883b-433d-b3a2-ffbcca1554c2	GE03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:48.317389+00	2026-02-01 09:00:48.317389+00	\N	\N
7b847f5b-700b-4abb-a4e4-ee02378aaaf0	81005dc5-883b-433d-b3a2-ffbcca1554c2	001	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:48.661928+00	2026-02-01 09:00:48.661928+00	\N	\N
0f115f6d-7aeb-4290-bdc7-40aa5879328f	81005dc5-883b-433d-b3a2-ffbcca1554c2	002	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:48.986499+00	2026-02-01 09:00:48.986499+00	\N	\N
5e03a349-5657-4d6b-b1fc-4f77704d23cb	81005dc5-883b-433d-b3a2-ffbcca1554c2	003	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:49.320064+00	2026-02-01 09:00:49.320064+00	\N	\N
4a52e17b-4105-4db5-b397-6628618ae66f	81005dc5-883b-433d-b3a2-ffbcca1554c2	004	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:49.653795+00	2026-02-01 09:00:49.653795+00	\N	\N
5a58e549-80d5-4b1f-b580-49d0fe361385	81005dc5-883b-433d-b3a2-ffbcca1554c2	005	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:50.139711+00	2026-02-01 09:00:50.139711+00	\N	\N
4a11211a-075a-4ce5-93ed-ed5423f61120	81005dc5-883b-433d-b3a2-ffbcca1554c2	006	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:50.638824+00	2026-02-01 09:00:50.638824+00	\N	\N
a7f945a4-00b6-4383-8c74-7918e0e4db43	81005dc5-883b-433d-b3a2-ffbcca1554c2	007	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:50.967035+00	2026-02-01 09:00:50.967035+00	\N	\N
6c0eb762-b57e-4dac-95bb-527d816e2e9e	81005dc5-883b-433d-b3a2-ffbcca1554c2	008	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:51.289524+00	2026-02-01 09:00:51.289524+00	\N	\N
f3586303-b83d-466c-875d-2f9754b4a884	81005dc5-883b-433d-b3a2-ffbcca1554c2	009	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:51.616461+00	2026-02-01 09:00:51.616461+00	\N	\N
3d814a97-ee65-4877-bef5-7769f567e2dd	81005dc5-883b-433d-b3a2-ffbcca1554c2	012	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:51.941493+00	2026-02-01 09:00:51.941493+00	\N	\N
207c0697-1b72-4e26-8038-7569b30d3e83	81005dc5-883b-433d-b3a2-ffbcca1554c2	013	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:52.25828+00	2026-02-01 09:00:52.25828+00	\N	\N
0c765cdc-ad13-4ea1-9883-42e4ee8ff0c1	81005dc5-883b-433d-b3a2-ffbcca1554c2	014	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:52.576347+00	2026-02-01 09:00:52.576347+00	\N	\N
38f592b7-7436-4790-9818-c0ad85909a61	81005dc5-883b-433d-b3a2-ffbcca1554c2	015	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:52.901155+00	2026-02-01 09:00:52.901155+00	\N	\N
e3b6bae1-935c-4cf6-86e6-2d7501fcde2a	81005dc5-883b-433d-b3a2-ffbcca1554c2	016	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:53.210159+00	2026-02-01 09:00:53.210159+00	\N	\N
34a659c4-3c5f-486f-a6f8-9691be2a2ae8	81005dc5-883b-433d-b3a2-ffbcca1554c2	019	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:53.519195+00	2026-02-01 09:00:53.519195+00	\N	\N
b937ad14-3d50-40a1-8646-56fd121c0fb4	81005dc5-883b-433d-b3a2-ffbcca1554c2	020	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:53.993647+00	2026-02-01 09:00:53.993647+00	\N	\N
e7d17901-0a90-46cc-a96d-c6fa518918f3	81005dc5-883b-433d-b3a2-ffbcca1554c2	021	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:54.297164+00	2026-02-01 09:00:54.297164+00	\N	\N
89e6ea57-2f99-4132-a797-9634f34ee182	81005dc5-883b-433d-b3a2-ffbcca1554c2	023	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:54.763769+00	2026-02-01 09:00:54.763769+00	\N	\N
014d6626-6ac9-4861-8a54-8baf5819779e	81005dc5-883b-433d-b3a2-ffbcca1554c2	024	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:55.327587+00	2026-02-01 09:00:55.327587+00	\N	\N
4794d8c9-a706-4f21-8e9b-36dec8831704	81005dc5-883b-433d-b3a2-ffbcca1554c2	002A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:55.637798+00	2026-02-01 09:00:55.637798+00	\N	\N
4cc76234-eb09-41b3-add7-5794de489cf7	81005dc5-883b-433d-b3a2-ffbcca1554c2	001A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:55.954898+00	2026-02-01 09:00:55.954898+00	\N	\N
a6ac9d4a-cacc-452e-86ca-9fb21f0e904f	81005dc5-883b-433d-b3a2-ffbcca1554c2	TG02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:56.271326+00	2026-02-01 09:00:56.271326+00	\N	\N
ea0872f8-f906-4915-a2a3-698bec653de2	81005dc5-883b-433d-b3a2-ffbcca1554c2	TG06	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:56.575712+00	2026-02-01 09:00:56.575712+00	\N	\N
7e1c71f5-6f00-4160-9373-0b1a3c3891d3	81005dc5-883b-433d-b3a2-ffbcca1554c2	TG07	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:56.885281+00	2026-02-01 09:00:56.885281+00	\N	\N
3195cf01-a086-417c-9bdb-10d1699d041a	81005dc5-883b-433d-b3a2-ffbcca1554c2	TG08	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:57.186981+00	2026-02-01 09:00:57.186981+00	\N	\N
3be83a7a-47ce-4a14-b409-b1c08fbc2f5a	81005dc5-883b-433d-b3a2-ffbcca1554c2	TG09	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:57.492821+00	2026-02-01 09:00:57.492821+00	\N	\N
123f1e3a-df1b-4739-b2fd-547bcd159679	81005dc5-883b-433d-b3a2-ffbcca1554c2	TG10	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:57.801421+00	2026-02-01 09:00:57.801421+00	\N	\N
c455e38a-cc0f-42bb-b52f-bf7dc10c4698	81005dc5-883b-433d-b3a2-ffbcca1554c2	TG13	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:58.131322+00	2026-02-01 09:00:58.131322+00	\N	\N
7bf26e7f-439d-4676-b902-6628754e834b	81005dc5-883b-433d-b3a2-ffbcca1554c2	AB01-03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:00:58.436727+00	2026-02-01 09:00:58.436727+00	\N	\N
673792d8-ce3b-4c87-be85-9bfe0f86ad93	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	GE01	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:40.962046+00	2026-02-01 09:22:40.962046+00	\N	\N
fbd11c23-ce61-4645-bc81-a024fc805672	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	GE02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:41.281892+00	2026-02-01 09:22:41.281892+00	\N	\N
c43d9143-842d-4e9d-8337-c8db9cfc56a8	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	GE03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:41.599084+00	2026-02-01 09:22:41.599084+00	\N	\N
1d9d3354-e95d-45be-a26f-830477b91e5e	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	001	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:41.90657+00	2026-02-01 09:22:41.90657+00	\N	\N
434a36e8-ccca-4d62-b28b-fa3d1613aad3	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	002	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:42.222768+00	2026-02-01 09:22:42.222768+00	\N	\N
4a802a0d-7564-405f-9b0c-3a6ce3fdb2ed	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	003	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:42.534595+00	2026-02-01 09:22:42.534595+00	\N	\N
c554895e-e601-4912-bb32-4005ce13a37d	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	004	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:42.834535+00	2026-02-01 09:22:42.834535+00	\N	\N
cc784544-2a39-4b6e-96ae-0365bf09c35c	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	005	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:43.306616+00	2026-02-01 09:22:43.306616+00	\N	\N
fa89342e-c81d-43cd-8ff3-80e92aef3e57	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	006	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:43.760352+00	2026-02-01 09:22:43.760352+00	\N	\N
46282132-a7bb-4565-98f6-bbfe6ec22e95	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	007	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:44.065491+00	2026-02-01 09:22:44.065491+00	\N	\N
594c297e-c1ba-4cee-aced-ac328fa687af	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	008	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:44.37513+00	2026-02-01 09:22:44.37513+00	\N	\N
5d04cd7f-0a9a-482b-a016-564b31a3631d	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	009	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:44.68178+00	2026-02-01 09:22:44.68178+00	\N	\N
1ee78364-96a8-46e3-b7b6-6d18cf78c486	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	012	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:44.982808+00	2026-02-01 09:22:44.982808+00	\N	\N
11beceba-8c34-496d-9e05-ed51cae7e8c5	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	013	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:45.449741+00	2026-02-01 09:22:45.449741+00	\N	\N
fbac317b-2773-4a2e-9e73-d83c1a24e1b3	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	014	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:45.753595+00	2026-02-01 09:22:45.753595+00	\N	\N
8db9779f-5273-4652-9caf-906c333525a6	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	015	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:46.05418+00	2026-02-01 09:22:46.05418+00	\N	\N
65fabb09-a5d4-4051-89aa-706e4ead4561	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	016	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:46.365595+00	2026-02-01 09:22:46.365595+00	\N	\N
497c6cf2-cf45-4126-a2e4-e795b05c3ce6	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	019	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:46.686831+00	2026-02-01 09:22:46.686831+00	\N	\N
d9b3a4d8-8305-48b1-a3e8-2d1e39044cc8	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	020	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:47.138179+00	2026-02-01 09:22:47.138179+00	\N	\N
0bb56190-49aa-4044-af7d-f9e83c343479	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	021	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:47.443855+00	2026-02-01 09:22:47.443855+00	\N	\N
ba3caabf-47e0-44f3-94fc-f01f2096d68f	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	023	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:47.89367+00	2026-02-01 09:22:47.89367+00	\N	\N
729123be-477e-4f65-813f-00c0fce7f8c1	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	024	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:48.345599+00	2026-02-01 09:22:48.345599+00	\N	\N
ee22d24b-5723-432b-aa32-6aa344955029	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	002A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:48.65046+00	2026-02-01 09:22:48.65046+00	\N	\N
f1a6fd78-bcdd-4937-b625-3868d0f64eb7	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	001A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:48.959929+00	2026-02-01 09:22:48.959929+00	\N	\N
52b7afaf-6e92-49ec-9854-66a9a1622f6b	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	TG02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:49.259821+00	2026-02-01 09:22:49.259821+00	\N	\N
0430bb88-aa72-41ec-9d03-ba901899ec51	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	TG06	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:49.568545+00	2026-02-01 09:22:49.568545+00	\N	\N
44b3f0e9-7c2e-4886-aefe-645a3fd2ca0a	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	TG08	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:49.986835+00	2026-02-01 09:22:49.986835+00	\N	\N
bf7c33a2-c088-425a-9fa2-d1e4ec05494f	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	TG09	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:50.288993+00	2026-02-01 09:22:50.288993+00	\N	\N
59a2e56f-c2a5-4299-afb1-ccba4cec4aff	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	TG10	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:50.600353+00	2026-02-01 09:22:50.600353+00	\N	\N
f10402c9-7847-41d6-be8d-f83b78bb0d85	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	TG11	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:51.047977+00	2026-02-01 09:22:51.047977+00	\N	\N
b03cc0e9-ee11-480e-a9c0-fb60830382dc	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	TG13	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:51.34414+00	2026-02-01 09:22:51.34414+00	\N	\N
6bb70fa1-6ea5-4d03-826e-121d4c4c7b04	5bf3fe81-2abe-4a6a-9f88-a51e164fa664	AB01-03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:22:51.650945+00	2026-02-01 09:22:51.650945+00	\N	\N
78569629-9203-430e-9bf8-9cabbfee6554	12a04808-9142-4044-a9ff-100a8b80b8c4	GE01	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:30.174068+00	2026-02-01 09:56:30.174068+00	\N	\N
5b0988af-2e2e-4a29-be3f-51e9ee392fb9	12a04808-9142-4044-a9ff-100a8b80b8c4	GE02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:30.513338+00	2026-02-01 09:56:30.513338+00	\N	\N
fb4699e1-fcc6-4a50-9925-3b4c207cc64d	12a04808-9142-4044-a9ff-100a8b80b8c4	GE03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:30.829761+00	2026-02-01 09:56:30.829761+00	\N	\N
9e99ed26-483f-485b-853f-91a3835dd734	12a04808-9142-4044-a9ff-100a8b80b8c4	001	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:31.147729+00	2026-02-01 09:56:31.147729+00	\N	\N
d8fdf06f-b9e3-4bfc-804d-c29c1ddac569	12a04808-9142-4044-a9ff-100a8b80b8c4	002	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:31.461649+00	2026-02-01 09:56:31.461649+00	\N	\N
28cd9b41-2d21-455d-99d4-b0928816cfa8	12a04808-9142-4044-a9ff-100a8b80b8c4	003	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:31.784127+00	2026-02-01 09:56:31.784127+00	\N	\N
2ed3aed9-f97e-4f1d-8e97-11fa30685df1	12a04808-9142-4044-a9ff-100a8b80b8c4	004	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:32.110616+00	2026-02-01 09:56:32.110616+00	\N	\N
af00a848-e5c1-4bce-98e1-65648cd7c524	12a04808-9142-4044-a9ff-100a8b80b8c4	005	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:32.576056+00	2026-02-01 09:56:32.576056+00	\N	\N
3e3c3d8c-944a-4f8a-bda0-5c8ae6797872	12a04808-9142-4044-a9ff-100a8b80b8c4	006	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:33.08919+00	2026-02-01 09:56:33.08919+00	\N	\N
5a1f23c6-9e63-4a20-ae70-984f8ceafa48	12a04808-9142-4044-a9ff-100a8b80b8c4	007	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:33.40136+00	2026-02-01 09:56:33.40136+00	\N	\N
d3c536ba-fb10-42ca-8cb4-8ab2d64c0eed	12a04808-9142-4044-a9ff-100a8b80b8c4	008	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:33.708043+00	2026-02-01 09:56:33.708043+00	\N	\N
ae727a34-6d12-412b-ad52-7a4391065538	12a04808-9142-4044-a9ff-100a8b80b8c4	009	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:34.035892+00	2026-02-01 09:56:34.035892+00	\N	\N
8a36ba14-32ad-4724-b833-d503b7361ce1	12a04808-9142-4044-a9ff-100a8b80b8c4	012	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:34.345284+00	2026-02-01 09:56:34.345284+00	\N	\N
24730b6b-ef39-4ce5-bead-e050453b4683	12a04808-9142-4044-a9ff-100a8b80b8c4	013	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:34.655429+00	2026-02-01 09:56:34.655429+00	\N	\N
67000db0-e079-45ca-af16-608215a4c5c3	12a04808-9142-4044-a9ff-100a8b80b8c4	014	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:34.967981+00	2026-02-01 09:56:34.967981+00	\N	\N
ec04408c-ba5d-4f41-9690-caebf21bf898	12a04808-9142-4044-a9ff-100a8b80b8c4	016	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:35.275244+00	2026-02-01 09:56:35.275244+00	\N	\N
d4fba9af-bd42-4355-8016-8aa32c0909dd	12a04808-9142-4044-a9ff-100a8b80b8c4	019	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:35.581297+00	2026-02-01 09:56:35.581297+00	\N	\N
5827d936-05c8-49db-a63b-a86cfea3eda0	12a04808-9142-4044-a9ff-100a8b80b8c4	020	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:36.034545+00	2026-02-01 09:56:36.034545+00	\N	\N
a8ed74ed-62fc-491f-b488-29664add45be	12a04808-9142-4044-a9ff-100a8b80b8c4	021	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:36.337356+00	2026-02-01 09:56:36.337356+00	\N	\N
b56f0e45-9995-46b9-89fb-96fa96450b80	12a04808-9142-4044-a9ff-100a8b80b8c4	023	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:36.805802+00	2026-02-01 09:56:36.805802+00	\N	\N
83a661c2-fc96-4127-9409-1efc3cf93006	12a04808-9142-4044-a9ff-100a8b80b8c4	024	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:37.271672+00	2026-02-01 09:56:37.271672+00	\N	\N
caa3e373-a01a-4825-80ff-f1e135374ebc	12a04808-9142-4044-a9ff-100a8b80b8c4	002A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:37.572679+00	2026-02-01 09:56:37.572679+00	\N	\N
3680c3a1-952d-44fa-8755-99896d91e719	12a04808-9142-4044-a9ff-100a8b80b8c4	001A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:37.889405+00	2026-02-01 09:56:37.889405+00	\N	\N
8abeaeb2-df2e-455f-99e3-1445d0e5032b	12a04808-9142-4044-a9ff-100a8b80b8c4	TG02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:38.222337+00	2026-02-01 09:56:38.222337+00	\N	\N
511f874d-41db-42fc-b1ab-f7dc388aaabe	12a04808-9142-4044-a9ff-100a8b80b8c4	TG06	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:38.525212+00	2026-02-01 09:56:38.525212+00	\N	\N
74718f80-dbcf-4b2d-8270-65c78de0ad37	12a04808-9142-4044-a9ff-100a8b80b8c4	TG08	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:38.826006+00	2026-02-01 09:56:38.826006+00	\N	\N
9ec4cdea-73d6-403c-8cb6-55a103ba131a	12a04808-9142-4044-a9ff-100a8b80b8c4	TG09	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:39.12581+00	2026-02-01 09:56:39.12581+00	\N	\N
df8c957f-9f6a-44e3-ad62-d81f2ba4b6e7	12a04808-9142-4044-a9ff-100a8b80b8c4	TG10	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:39.443413+00	2026-02-01 09:56:39.443413+00	\N	\N
83c0fd34-547d-4b45-bc47-cf7b5f3d8d43	12a04808-9142-4044-a9ff-100a8b80b8c4	TG11	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:39.899538+00	2026-02-01 09:56:39.899538+00	\N	\N
e410076b-ecfb-431c-a433-e3f9ae535798	12a04808-9142-4044-a9ff-100a8b80b8c4	TG13	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:40.210149+00	2026-02-01 09:56:40.210149+00	\N	\N
1d683902-1ff9-4bc0-9f94-95e01f01c13e	12a04808-9142-4044-a9ff-100a8b80b8c4	AB01-03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 09:56:40.615224+00	2026-02-01 09:56:40.615224+00	\N	\N
6e7e609c-f753-465f-a19b-34968519e2cb	0eceef7c-5d3c-472d-ae48-00d274b90c81	GE 3	geschaeft	leerstand	0.00	\N	\N	\N	\N	2026-02-01 10:22:23.740801+00	2026-02-01 10:22:23.740801+00	\N	\N
4a53a62f-ea18-4dfe-8420-f2cc59ed6391	0eceef7c-5d3c-472d-ae48-00d274b90c81	GE01	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:33.221137+00	2026-02-01 11:15:33.221137+00	\N	\N
c6ddf9fe-99e9-4448-a204-e7020a0740fd	0eceef7c-5d3c-472d-ae48-00d274b90c81	GE02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:33.561346+00	2026-02-01 11:15:33.561346+00	\N	\N
6fd5b5d9-9b17-4544-b4ca-4dc769c79a6d	0eceef7c-5d3c-472d-ae48-00d274b90c81	GE03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:33.882929+00	2026-02-01 11:15:33.882929+00	\N	\N
8a05e073-ecf8-4a50-9d6a-690bf991972d	0eceef7c-5d3c-472d-ae48-00d274b90c81	001	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:34.210149+00	2026-02-01 11:15:34.210149+00	\N	\N
1c5b89b9-1d7a-4439-8d36-ac0a67c27afb	0eceef7c-5d3c-472d-ae48-00d274b90c81	002	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:34.538883+00	2026-02-01 11:15:34.538883+00	\N	\N
31e79c7d-90e0-4871-a7ae-f6c564a132c4	0eceef7c-5d3c-472d-ae48-00d274b90c81	003	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:34.865777+00	2026-02-01 11:15:34.865777+00	\N	\N
35d817a0-00a8-4d64-ac6d-f1ab84143f8d	0eceef7c-5d3c-472d-ae48-00d274b90c81	004	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:35.180717+00	2026-02-01 11:15:35.180717+00	\N	\N
2b41964f-88c9-4dcb-8c8b-f32f33a8cb7c	0eceef7c-5d3c-472d-ae48-00d274b90c81	005	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:35.504989+00	2026-02-01 11:15:35.504989+00	\N	\N
d09d71fa-8083-428f-97bb-af74d05054fe	0eceef7c-5d3c-472d-ae48-00d274b90c81	006	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:35.820507+00	2026-02-01 11:15:35.820507+00	\N	\N
3d9f9711-5a3a-47ff-a64e-95bd33e62598	0eceef7c-5d3c-472d-ae48-00d274b90c81	007	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:36.141895+00	2026-02-01 11:15:36.141895+00	\N	\N
bd9ef0f4-2cdf-4646-a327-221ecbab072c	0eceef7c-5d3c-472d-ae48-00d274b90c81	008	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:36.458931+00	2026-02-01 11:15:36.458931+00	\N	\N
2b5ab87e-647b-4988-bd9c-0201b6c9cf55	0eceef7c-5d3c-472d-ae48-00d274b90c81	009	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:36.775655+00	2026-02-01 11:15:36.775655+00	\N	\N
bda17640-83cf-423f-bd30-013aaa7f91ae	0eceef7c-5d3c-472d-ae48-00d274b90c81	012	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:37.0878+00	2026-02-01 11:15:37.0878+00	\N	\N
61b5644a-ed8e-4efc-ba9f-bc17b7ef872a	0eceef7c-5d3c-472d-ae48-00d274b90c81	013	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:37.3964+00	2026-02-01 11:15:37.3964+00	\N	\N
4a2af100-ca16-4d1d-9205-c5fb2cc9824c	0eceef7c-5d3c-472d-ae48-00d274b90c81	014	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:37.699976+00	2026-02-01 11:15:37.699976+00	\N	\N
8c330c60-24e3-4fda-b2a0-2a5c3c955cbe	0eceef7c-5d3c-472d-ae48-00d274b90c81	016	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:38.002863+00	2026-02-01 11:15:38.002863+00	\N	\N
1ff4daf6-1b54-472a-bcd4-951b566c3eba	0eceef7c-5d3c-472d-ae48-00d274b90c81	017	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:38.311564+00	2026-02-01 11:15:38.311564+00	\N	\N
a60749ac-004e-4941-bb5b-f55fa2f3e7b6	0eceef7c-5d3c-472d-ae48-00d274b90c81	019	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:38.620827+00	2026-02-01 11:15:38.620827+00	\N	\N
655f44af-4b87-4e30-8fb0-6e506b33cdbf	0eceef7c-5d3c-472d-ae48-00d274b90c81	020	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:39.076828+00	2026-02-01 11:15:39.076828+00	\N	\N
24d5c520-f275-4ce5-b5b4-3e7cd9425ee1	0eceef7c-5d3c-472d-ae48-00d274b90c81	021	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:39.383673+00	2026-02-01 11:15:39.383673+00	\N	\N
8b1de22a-6fe8-48c4-86d7-762c87b2029e	0eceef7c-5d3c-472d-ae48-00d274b90c81	023	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:39.857231+00	2026-02-01 11:15:39.857231+00	\N	\N
0c132150-6856-400a-85e3-ed4b1e8c3c0b	0eceef7c-5d3c-472d-ae48-00d274b90c81	024	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:40.307922+00	2026-02-01 11:15:40.307922+00	\N	\N
4b2d1cfd-cb11-4697-bc20-ba6e8dc9ce8b	0eceef7c-5d3c-472d-ae48-00d274b90c81	002A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:40.612812+00	2026-02-01 11:15:40.612812+00	\N	\N
12f3e307-eea4-47b9-bdce-d5b4ba0edb2f	0eceef7c-5d3c-472d-ae48-00d274b90c81	001A	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:40.924564+00	2026-02-01 11:15:40.924564+00	\N	\N
926799f3-87a0-4d49-8511-8eb1809d6c56	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG02	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:41.218571+00	2026-02-01 11:15:41.218571+00	\N	\N
cc0a8ffc-96e9-4b07-b501-b94ca49a58aa	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG06	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:41.52249+00	2026-02-01 11:15:41.52249+00	\N	\N
00181224-49bc-4c58-8957-46439bc266e0	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG08	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:41.829706+00	2026-02-01 11:15:41.829706+00	\N	\N
394a1218-5552-4a88-978d-66d1a82386c7	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG09	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:42.129068+00	2026-02-01 11:15:42.129068+00	\N	\N
523e2832-42b0-427b-a46a-1e0169fd6477	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG10	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:42.518231+00	2026-02-01 11:15:42.518231+00	\N	\N
ee472044-0c9b-4467-b5ff-c8b64cea08bc	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG11	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:43.084243+00	2026-02-01 11:15:43.084243+00	\N	\N
2cfaade7-c993-481e-becc-05ddcd868949	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG13	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:43.388746+00	2026-02-01 11:15:43.388746+00	\N	\N
0b1e6a4f-6c64-420e-8f37-5bd2b3136cdc	0eceef7c-5d3c-472d-ae48-00d274b90c81	AB01-03	wohnung	aktiv	0.00	\N	\N	\N	\N	2026-02-01 11:15:43.691286+00	2026-02-01 11:15:43.691286+00	\N	\N
53e0a3f0-ad82-4dfe-bd7f-3e5ae1ec67a7	0eceef7c-5d3c-472d-ae48-00d274b90c81	010	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:19.094239+00	2026-02-01 11:57:19.094239+00	\N	\N
2b3b19a1-c31b-42ad-b02a-b18982b4fc31	0eceef7c-5d3c-472d-ae48-00d274b90c81	011	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:19.567597+00	2026-02-01 11:57:19.567597+00	\N	\N
5ed9ef70-dad0-495b-a58f-0322cd65a5c7	0eceef7c-5d3c-472d-ae48-00d274b90c81	015	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:19.724433+00	2026-02-01 11:57:19.724433+00	\N	\N
20260740-4ad7-4a7a-a54e-0ed150ce9806	0eceef7c-5d3c-472d-ae48-00d274b90c81	018	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:19.881918+00	2026-02-01 11:57:19.881918+00	\N	\N
ca9c4f5c-236a-46ad-ad88-1f581683c592	0eceef7c-5d3c-472d-ae48-00d274b90c81	022	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:20.035262+00	2026-02-01 11:57:20.035262+00	\N	\N
5cbcd919-2fff-428f-b765-e94c3a009bd4	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG03	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:20.211199+00	2026-02-01 11:57:20.211199+00	\N	\N
5fc9897e-be07-4594-86eb-c816ba647636	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG04	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:20.378325+00	2026-02-01 11:57:20.378325+00	\N	\N
01208c82-6564-4848-b9ef-c879878ed62f	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG05	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:20.529524+00	2026-02-01 11:57:20.529524+00	\N	\N
21cd55b2-006b-4e47-a326-cee741f00b65	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG07	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:20.682258+00	2026-02-01 11:57:20.682258+00	\N	\N
5f16bd48-ce76-433d-a335-6e0956bfb592	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG12	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:20.849372+00	2026-02-01 11:57:20.849372+00	\N	\N
e1e323c8-1083-46fa-8a45-9c4405d58b56	0eceef7c-5d3c-472d-ae48-00d274b90c81	TG14	wohnung	leerstand	0.00	\N	\N	\N	\N	2026-02-01 11:57:21.002574+00	2026-02-01 11:57:21.002574+00	\N	\N
00000000-0000-0000-0000-000000000011	00000000-0000-0000-0000-000000000001	Top 1	wohnung	leerstand	65.50	\N	\N	\N	\N	2026-02-01 13:52:54.998+00	2026-02-01 13:52:54.999011+00	\N	0
00000000-0000-0000-0000-000000000012	00000000-0000-0000-0000-000000000001	Top 2	wohnung	leerstand	80.00	\N	\N	\N	\N	2026-02-01 13:52:55.035+00	2026-02-01 13:52:55.035314+00	\N	0
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, user_id, role, created_at) FROM stdin;
bec2d9f3-0676-4b2a-96c7-a98b85db459e	e118c1df-eb5d-4939-960d-cdf61b56d6e4	admin	2026-01-24 16:51:13.106698+00
f8343527-2828-4a92-8774-c68ac00c0c13	c5a696de-4e66-4ba5-81b9-cb28aeed0626	property_manager	2026-01-25 09:26:56.608019+00
dc43d5be-e9c8-4c26-b5d5-0e1e40f3f065	f0434a83-5421-4231-950c-bbaeb920d43f	admin	2026-01-31 14:45:57.833207+00
0370aef2-6f87-48d6-9588-9177c87df3b1	fe2b9e63-0106-49c2-b1f1-26a7e15605d4	admin	2026-01-31 15:53:49.763691+00
ff1816b7-4204-40f9-ad7a-da51465e02c1	b741103b-3b09-4a9d-879f-1274b7125678	admin	2026-01-31 16:35:45.916461+00
7c96ee36-3e5e-458e-a5b4-9319da4bb480	99e2487e-a99d-4591-bde4-30913cec1d4b	admin	2026-01-31 17:17:03.604135+00
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (sid, sess, expire) FROM stdin;
SdVoZw5XUIm20llmvfwd8pAwNPVQxsxi	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-07T17:17:03.706Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "99e2487e-a99d-4591-bde4-30913cec1d4b"}	2026-02-07 17:17:04
sgG5wA1cocgLFvcHAB8IjXDghz5Fr_cv	{"email": "stephania.pfeffer@outlook.de", "cookie": {"path": "/", "secure": true, "expires": "2026-02-07T13:36:30.286Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "e118c1df-eb5d-4939-960d-cdf61b56d6e4"}	2026-02-07 13:36:31
wEtEHnWI0MnMLwsaDdBmLWMaMIZoDSHT	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-07T16:35:46.016Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "b741103b-3b09-4a9d-879f-1274b7125678"}	2026-02-07 16:49:16
1vp8TC_XPZllvGt1ESJimr5jPV8jxB3V	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-07T14:45:57.914Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "f0434a83-5421-4231-950c-bbaeb920d43f"}	2026-02-07 14:45:58
9LEduX2ynnUbcSEc-cAqq426YhqZ0Yy7	{"email": "stephania.pfeffer@outlook.de", "cookie": {"path": "/", "secure": true, "expires": "2026-02-07T16:49:57.154Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "e118c1df-eb5d-4939-960d-cdf61b56d6e4"}	2026-02-08 13:37:31
9i7-5U5YYB3UZ6FCdCdP3nSdsjUi28ZU	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-07T15:53:49.854Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "fe2b9e63-0106-49c2-b1f1-26a7e15605d4"}	2026-02-07 15:58:31
p8mEjVgxYTEODpeBsuuASwfp5XWDqzdD	{"email": "stephania.pfeffer@outlook.de", "cookie": {"path": "/", "secure": true, "expires": "2026-02-06T14:24:10.196Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "e118c1df-eb5d-4939-960d-cdf61b56d6e4"}	2026-02-06 14:24:11
RZf1yA26qXiXjiHg42heywT7zM0KOZgJ	{"email": "stephania.pfeffer@outlook.de", "cookie": {"path": "/", "secure": true, "expires": "2026-02-01T17:40:02.898Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "e118c1df-eb5d-4939-960d-cdf61b56d6e4"}	2026-02-06 16:25:20
LA0y6wj4vbyUXzz6WiRn5k3ssWTXlKvS	{"email": "stephania.pfeffer@outlook.de", "cookie": {"path": "/", "secure": true, "expires": "2026-02-07T04:55:53.964Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "e118c1df-eb5d-4939-960d-cdf61b56d6e4"}	2026-02-07 04:55:54
YRMMNGritYUcXUN7LspiaCQP3TmYxG8O	{"email": "stephania.pfeffer@outlook.de", "cookie": {"path": "/", "secure": true, "expires": "2026-02-07T11:16:53.053Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "e118c1df-eb5d-4939-960d-cdf61b56d6e4"}	2026-02-07 11:16:54
DrMRxdyh7pz0Jwd9ceY7E-5Yap8HIRWv	{"email": "stephania.pfeffer@outlook.de", "cookie": {"path": "/", "secure": true, "expires": "2026-02-07T04:57:45.969Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "e118c1df-eb5d-4939-960d-cdf61b56d6e4"}	2026-02-07 05:31:20
EfMV2FG2sj3uW_Iy_gan_A3d6iwTwR-X	{"email": "stephania.pfeffer@outlook.de", "cookie": {"path": "/", "secure": true, "expires": "2026-02-07T10:31:24.250Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "e118c1df-eb5d-4939-960d-cdf61b56d6e4"}	2026-02-07 10:31:25
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, first_name, last_name, profile_image_url, created_at, updated_at) FROM stdin;
53329481	stephania.pfeffer@outlook.de	Stephania	Pfeffer	\N	2026-01-25 03:37:57.129702	2026-01-25 04:16:18.559
\.


--
-- Data for Name: vpi_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vpi_adjustments (id, tenant_id, adjustment_date, previous_rent, new_rent, vpi_old, vpi_new, percentage_change, notification_sent, notification_date, effective_date, notes, created_at) FROM stdin;
\.


--
-- Data for Name: white_label_inquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.white_label_inquiries (id, company_name, contact_person, email, phone, property_count, unit_count, message, status, notes, ip_address, user_agent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: white_label_licenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.white_label_licenses (id, organization_id, license_name, monthly_price, setup_fee, contract_start, contract_end, status, custom_domain, max_users, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: _migrations; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe._migrations (id, name, hash, executed_at) FROM stdin;
0	initial_migration	c18983eedaa79cc2f6d92727d70c4f772256ef3d	2026-01-24 17:16:40.525622
1	products	b99ffc23df668166b94156f438bfa41818d4e80c	2026-01-24 17:16:40.530583
2	customers	33e481247ddc217f4e27ad10dfe5430097981670	2026-01-24 17:16:40.538807
3	prices	7d5ff35640651606cc24cec8a73ff7c02492ecdf	2026-01-24 17:16:40.546429
4	subscriptions	2cc6121a943c2a623c604e5ab12118a57a6c329a	2026-01-31 11:05:59.407118
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.customers (id, object, address, description, email, metadata, name, phone, shipping, balance, created, currency, default_source, delinquent, discount, invoice_prefix, invoice_settings, livemode, next_invoice_sequence, preferred_locales, tax_exempt) FROM stdin;
\.


--
-- Data for Name: prices; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.prices (id, object, active, currency, metadata, nickname, recurring, type, unit_amount, billing_scheme, created, livemode, lookup_key, tiers_mode, transform_quantity, unit_amount_decimal, product) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.products (id, object, active, description, metadata, name, created, images, livemode, package_dimensions, shippable, statement_descriptor, unit_label, updated, url) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: stripe; Owner: postgres
--

COPY stripe.subscriptions (id, object, cancel_at_period_end, current_period_end, current_period_start, default_payment_method, items, metadata, pending_setup_intent, pending_update, status, application_fee_percent, billing_cycle_anchor, billing_thresholds, cancel_at, canceled_at, collection_method, created, days_until_due, default_source, default_tax_rates, discount, ended_at, livemode, next_pending_invoice_item_invoice, pause_collection, pending_invoice_item_interval, start_date, transfer_data, trial_end, trial_start, schedule, customer, latest_invoice, plan) FROM stdin;
\.


--
-- Name: account_categories account_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_categories
    ADD CONSTRAINT account_categories_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: contractors contractors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractors
    ADD CONSTRAINT contractors_pkey PRIMARY KEY (id);


--
-- Name: demo_invites demo_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_invites
    ADD CONSTRAINT demo_invites_pkey PRIMARY KEY (id);


--
-- Name: demo_invites demo_invites_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_invites
    ADD CONSTRAINT demo_invites_token_unique UNIQUE (token);


--
-- Name: distribution_keys distribution_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribution_keys
    ADD CONSTRAINT distribution_keys_pkey PRIMARY KEY (id);


--
-- Name: expense_allocations expense_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_allocations
    ADD CONSTRAINT expense_allocations_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: invoice_lines invoice_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_pkey PRIMARY KEY (id);


--
-- Name: key_handovers key_handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.key_handovers
    ADD CONSTRAINT key_handovers_pkey PRIMARY KEY (id);


--
-- Name: key_inventory key_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.key_inventory
    ADD CONSTRAINT key_inventory_pkey PRIMARY KEY (id);


--
-- Name: learned_matches learned_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learned_matches
    ADD CONSTRAINT learned_matches_pkey PRIMARY KEY (id);


--
-- Name: maintenance_contracts maintenance_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_pkey PRIMARY KEY (id);


--
-- Name: maintenance_tasks maintenance_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: meter_readings meter_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_readings
    ADD CONSTRAINT meter_readings_pkey PRIMARY KEY (id);


--
-- Name: meters meters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT meters_pkey PRIMARY KEY (id);


--
-- Name: monthly_invoices monthly_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_invoices
    ADD CONSTRAINT monthly_invoices_pkey PRIMARY KEY (id);


--
-- Name: monthly_invoices monthly_invoices_unique_tenant_period; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_invoices
    ADD CONSTRAINT monthly_invoices_unique_tenant_period UNIQUE (tenant_id, year, month);


--
-- Name: organization_invites organization_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_pkey PRIMARY KEY (id);


--
-- Name: organization_invites organization_invites_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_token_unique UNIQUE (token);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: owners owners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_unique UNIQUE (token);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_unique UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: property_budgets property_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_budgets
    ADD CONSTRAINT property_budgets_pkey PRIMARY KEY (id);


--
-- Name: property_documents property_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_documents
    ADD CONSTRAINT property_documents_pkey PRIMARY KEY (id);


--
-- Name: property_managers property_managers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_managers
    ADD CONSTRAINT property_managers_pkey PRIMARY KEY (id);


--
-- Name: property_owners property_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_owners
    ADD CONSTRAINT property_owners_pkey PRIMARY KEY (id);


--
-- Name: rent_history rent_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_history
    ADD CONSTRAINT rent_history_pkey PRIMARY KEY (id);


--
-- Name: sepa_collections sepa_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sepa_collections
    ADD CONSTRAINT sepa_collections_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: settlement_details settlement_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_details
    ADD CONSTRAINT settlement_details_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: tenant_documents tenant_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_documents
    ADD CONSTRAINT tenant_documents_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: unit_distribution_values unit_distribution_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_distribution_values
    ADD CONSTRAINT unit_distribution_values_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vpi_adjustments vpi_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vpi_adjustments
    ADD CONSTRAINT vpi_adjustments_pkey PRIMARY KEY (id);


--
-- Name: white_label_inquiries white_label_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.white_label_inquiries
    ADD CONSTRAINT white_label_inquiries_pkey PRIMARY KEY (id);


--
-- Name: white_label_licenses white_label_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.white_label_licenses
    ADD CONSTRAINT white_label_licenses_pkey PRIMARY KEY (id);


--
-- Name: _migrations _migrations_name_key; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._migrations
    ADD CONSTRAINT _migrations_name_key UNIQUE (name);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_invoice_lines_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_lines_invoice_id ON public.invoice_lines USING btree (invoice_id);


--
-- Name: idx_invoices_tenant_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_tenant_period ON public.monthly_invoices USING btree (tenant_id, year, month);


--
-- Name: idx_invoices_unit_status_year_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_unit_status_year_month ON public.monthly_invoices USING btree (unit_id, status, year, month);


--
-- Name: idx_meter_readings_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meter_readings_date ON public.meter_readings USING btree (meter_id, reading_date);


--
-- Name: units_property_top_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX units_property_top_unique ON public.units USING btree (property_id, top_nummer);


--
-- Name: account_categories account_categories_default_distribution_key_id_distribution_key; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_categories
    ADD CONSTRAINT account_categories_default_distribution_key_id_distribution_key FOREIGN KEY (default_distribution_key_id) REFERENCES public.distribution_keys(id);


--
-- Name: account_categories account_categories_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_categories
    ADD CONSTRAINT account_categories_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: audit_logs audit_logs_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: bank_accounts bank_accounts_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: bank_accounts bank_accounts_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: contractors contractors_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractors
    ADD CONSTRAINT contractors_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: contractors contractors_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contractors
    ADD CONSTRAINT contractors_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: demo_invites demo_invites_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_invites
    ADD CONSTRAINT demo_invites_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: demo_invites demo_invites_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_invites
    ADD CONSTRAINT demo_invites_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: distribution_keys distribution_keys_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribution_keys
    ADD CONSTRAINT distribution_keys_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: distribution_keys distribution_keys_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribution_keys
    ADD CONSTRAINT distribution_keys_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: expense_allocations expense_allocations_expense_id_expenses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_allocations
    ADD CONSTRAINT expense_allocations_expense_id_expenses_id_fk FOREIGN KEY (expense_id) REFERENCES public.expenses(id);


--
-- Name: expense_allocations expense_allocations_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_allocations
    ADD CONSTRAINT expense_allocations_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: expenses expenses_distribution_key_id_distribution_keys_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_distribution_key_id_distribution_keys_id_fk FOREIGN KEY (distribution_key_id) REFERENCES public.distribution_keys(id);


--
-- Name: expenses expenses_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: expenses expenses_transaction_id_transactions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_transaction_id_transactions_id_fk FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: invoice_lines invoice_lines_invoice_id_monthly_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_invoice_id_monthly_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.monthly_invoices(id);


--
-- Name: key_handovers key_handovers_key_inventory_id_key_inventory_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.key_handovers
    ADD CONSTRAINT key_handovers_key_inventory_id_key_inventory_id_fk FOREIGN KEY (key_inventory_id) REFERENCES public.key_inventory(id);


--
-- Name: key_handovers key_handovers_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.key_handovers
    ADD CONSTRAINT key_handovers_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: key_inventory key_inventory_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.key_inventory
    ADD CONSTRAINT key_inventory_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: key_inventory key_inventory_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.key_inventory
    ADD CONSTRAINT key_inventory_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: learned_matches learned_matches_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learned_matches
    ADD CONSTRAINT learned_matches_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: learned_matches learned_matches_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learned_matches
    ADD CONSTRAINT learned_matches_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: learned_matches learned_matches_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.learned_matches
    ADD CONSTRAINT learned_matches_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: maintenance_contracts maintenance_contracts_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: maintenance_contracts maintenance_contracts_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: maintenance_contracts maintenance_contracts_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_contracts
    ADD CONSTRAINT maintenance_contracts_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: maintenance_tasks maintenance_tasks_contract_id_maintenance_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_contract_id_maintenance_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.maintenance_contracts(id);


--
-- Name: maintenance_tasks maintenance_tasks_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: maintenance_tasks maintenance_tasks_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: maintenance_tasks maintenance_tasks_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: maintenance_tasks maintenance_tasks_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: messages messages_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: meter_readings meter_readings_meter_id_meters_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_readings
    ADD CONSTRAINT meter_readings_meter_id_meters_id_fk FOREIGN KEY (meter_id) REFERENCES public.meters(id);


--
-- Name: meters meters_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT meters_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: meters meters_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meters
    ADD CONSTRAINT meters_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: monthly_invoices monthly_invoices_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_invoices
    ADD CONSTRAINT monthly_invoices_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: monthly_invoices monthly_invoices_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.monthly_invoices
    ADD CONSTRAINT monthly_invoices_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: organization_invites organization_invites_invited_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_invited_by_profiles_id_fk FOREIGN KEY (invited_by) REFERENCES public.profiles(id);


--
-- Name: organization_invites organization_invites_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organization_invites
    ADD CONSTRAINT organization_invites_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: owners owners_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: payments payments_invoice_id_monthly_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_monthly_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.monthly_invoices(id);


--
-- Name: payments payments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: profiles profiles_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: properties properties_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: property_budgets property_budgets_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_budgets
    ADD CONSTRAINT property_budgets_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: property_budgets property_budgets_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_budgets
    ADD CONSTRAINT property_budgets_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: property_documents property_documents_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_documents
    ADD CONSTRAINT property_documents_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: property_documents property_documents_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_documents
    ADD CONSTRAINT property_documents_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: property_managers property_managers_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_managers
    ADD CONSTRAINT property_managers_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: property_managers property_managers_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_managers
    ADD CONSTRAINT property_managers_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: property_owners property_owners_owner_id_owners_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_owners
    ADD CONSTRAINT property_owners_owner_id_owners_id_fk FOREIGN KEY (owner_id) REFERENCES public.owners(id);


--
-- Name: property_owners property_owners_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_owners
    ADD CONSTRAINT property_owners_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: rent_history rent_history_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_history
    ADD CONSTRAINT rent_history_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: sepa_collections sepa_collections_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sepa_collections
    ADD CONSTRAINT sepa_collections_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: sepa_collections sepa_collections_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sepa_collections
    ADD CONSTRAINT sepa_collections_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: settlement_details settlement_details_settlement_id_settlements_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_details
    ADD CONSTRAINT settlement_details_settlement_id_settlements_id_fk FOREIGN KEY (settlement_id) REFERENCES public.settlements(id);


--
-- Name: settlement_details settlement_details_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_details
    ADD CONSTRAINT settlement_details_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: settlement_details settlement_details_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlement_details
    ADD CONSTRAINT settlement_details_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: settlements settlements_created_by_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_created_by_profiles_id_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: settlements settlements_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settlements
    ADD CONSTRAINT settlements_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: tenant_documents tenant_documents_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_documents
    ADD CONSTRAINT tenant_documents_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: tenant_documents tenant_documents_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_documents
    ADD CONSTRAINT tenant_documents_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: tenants tenants_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: transactions transactions_bank_account_id_bank_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_bank_account_id_bank_accounts_id_fk FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: transactions transactions_matched_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_matched_tenant_id_tenants_id_fk FOREIGN KEY (matched_tenant_id) REFERENCES public.tenants(id);


--
-- Name: transactions transactions_matched_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_matched_unit_id_units_id_fk FOREIGN KEY (matched_unit_id) REFERENCES public.units(id);


--
-- Name: transactions transactions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: unit_distribution_values unit_distribution_values_key_id_distribution_keys_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_distribution_values
    ADD CONSTRAINT unit_distribution_values_key_id_distribution_keys_id_fk FOREIGN KEY (key_id) REFERENCES public.distribution_keys(id);


--
-- Name: unit_distribution_values unit_distribution_values_unit_id_units_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_distribution_values
    ADD CONSTRAINT unit_distribution_values_unit_id_units_id_fk FOREIGN KEY (unit_id) REFERENCES public.units(id);


--
-- Name: units units_property_id_properties_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_property_id_properties_id_fk FOREIGN KEY (property_id) REFERENCES public.properties(id);


--
-- Name: user_roles user_roles_user_id_profiles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: vpi_adjustments vpi_adjustments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vpi_adjustments
    ADD CONSTRAINT vpi_adjustments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: white_label_licenses white_label_licenses_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.white_label_licenses
    ADD CONSTRAINT white_label_licenses_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: prices prices_product_fkey; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.prices
    ADD CONSTRAINT prices_product_fkey FOREIGN KEY (product) REFERENCES stripe.products(id);


--
-- Name: subscriptions subscriptions_customer_fkey; Type: FK CONSTRAINT; Schema: stripe; Owner: postgres
--

ALTER TABLE ONLY stripe.subscriptions
    ADD CONSTRAINT subscriptions_customer_fkey FOREIGN KEY (customer) REFERENCES stripe.customers(id);


--
-- PostgreSQL database dump complete
--

\unrestrict rtXW9hkLCKdH3bbeuGihup48yRRUSGoJ9FBiGVVVtc2doOZYfc6JsqVWyLAxUTZ

