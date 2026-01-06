CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'property_manager'
);


--
-- Name: expense_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_category AS ENUM (
    'betriebskosten_umlagefaehig',
    'instandhaltung'
);


--
-- Name: expense_type; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_status AS ENUM (
    'offen',
    'bezahlt',
    'teilbezahlt',
    'ueberfaellig'
);


--
-- Name: payment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_type AS ENUM (
    'sepa',
    'ueberweisung',
    'bar',
    'sonstiges'
);


--
-- Name: settlement_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.settlement_status AS ENUM (
    'entwurf',
    'berechnet',
    'versendet',
    'abgeschlossen'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'trial',
    'active',
    'cancelled',
    'expired'
);


--
-- Name: subscription_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_tier AS ENUM (
    'starter',
    'professional',
    'enterprise'
);


--
-- Name: tenant_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tenant_status AS ENUM (
    'aktiv',
    'leerstand',
    'beendet'
);


--
-- Name: unit_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.unit_type AS ENUM (
    'wohnung',
    'geschaeft',
    'garage',
    'stellplatz',
    'lager',
    'sonstiges'
);


--
-- Name: calculate_bank_balance(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_bank_balance(account_id uuid, as_of_date date DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  opening_bal DECIMAL(10,2);
  opening_date DATE;
  transaction_sum DECIMAL(10,2);
BEGIN
  SELECT opening_balance, opening_balance_date 
  INTO opening_bal, opening_date
  FROM bank_accounts WHERE id = account_id;
  
  SELECT COALESCE(SUM(amount), 0)
  INTO transaction_sum
  FROM transactions
  WHERE bank_account_id = account_id
    AND transaction_date >= COALESCE(opening_date, '1900-01-01')
    AND transaction_date <= as_of_date;
  
  RETURN COALESCE(opening_bal, 0) + transaction_sum;
END;
$$;


--
-- Name: create_default_account_categories(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_account_categories() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Einnahmen
  INSERT INTO account_categories (organization_id, name, type, is_system) VALUES
    (NEW.id, 'Mieteinnahmen', 'income', true),
    (NEW.id, 'Betriebskostenvorauszahlungen', 'income', true),
    (NEW.id, 'Sonstige Einnahmen', 'income', true);
  
  -- Ausgaben
  INSERT INTO account_categories (organization_id, name, type, is_system) VALUES
    (NEW.id, 'Versicherungen', 'expense', true),
    (NEW.id, 'Instandhaltung', 'expense', true),
    (NEW.id, 'Lift/Aufzug', 'expense', true),
    (NEW.id, 'Heizung', 'expense', true),
    (NEW.id, 'Wasser/Abwasser', 'expense', true),
    (NEW.id, 'Strom Allgemein', 'expense', true),
    (NEW.id, 'Müllabfuhr', 'expense', true),
    (NEW.id, 'Hausbetreuung/Reinigung', 'expense', true),
    (NEW.id, 'Gartenpflege', 'expense', true),
    (NEW.id, 'Schneeräumung', 'expense', true),
    (NEW.id, 'Grundsteuer', 'expense', true),
    (NEW.id, 'Verwaltungskosten', 'expense', true),
    (NEW.id, 'Reparaturen', 'expense', true),
    (NEW.id, 'Sonstige Ausgaben', 'expense', true);
  
  RETURN NEW;
END;
$$;


--
-- Name: get_managed_property_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_managed_property_ids(_user_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT property_id
    FROM public.property_managers
    WHERE user_id = _user_id
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_org_id UUID;
  company_name TEXT;
BEGIN
  -- Get company name from metadata, default to user's name + " Hausverwaltung"
  company_name := COALESCE(
    NEW.raw_user_meta_data ->> 'company_name',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Meine') || ' Hausverwaltung'
  );
  
  -- Create the organization with 14-day trial
  INSERT INTO public.organizations (name, subscription_tier, subscription_status, trial_ends_at)
  VALUES (company_name, 'starter', 'trial', now() + interval '14 days')
  RETURNING id INTO new_org_id;
  
  -- Create the profile with organization reference
  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name', new_org_id);
  
  -- Assign default role of property_manager
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'property_manager');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;


--
-- Name: is_property_manager(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_property_manager(_user_id uuid, _property_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.property_managers
        WHERE user_id = _user_id
          AND property_id = _property_id
    )
$$;


--
-- Name: is_property_unassigned(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_property_unassigned(_property_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.property_managers
        WHERE property_id = _property_id
    )
$$;


--
-- Name: prevent_tenant_deletion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_tenant_deletion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Allow deletion if the caller has the service role (admin operations like cleanup)
  -- Check if this is a cascade delete (unit is being deleted)
  IF NOT EXISTS (SELECT 1 FROM public.units WHERE id = OLD.unit_id) THEN
    RETURN OLD;
  END IF;
  
  RAISE EXCEPTION 'Mieter können nicht gelöscht werden. Bitte setzen Sie den Status auf "beendet" (Altmieter).';
  RETURN NULL;
END;
$$;


--
-- Name: sync_unit_status_on_tenant_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_unit_status_on_tenant_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- For INSERT or UPDATE: Check if tenant is active
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'aktiv' THEN
      -- Set unit to active when tenant is active
      UPDATE units SET status = 'aktiv' WHERE id = NEW.unit_id;
    ELSIF NEW.status = 'beendet' THEN
      -- Check if there's another active tenant for this unit
      IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE unit_id = NEW.unit_id 
        AND status = 'aktiv' 
        AND id != NEW.id
      ) THEN
        -- No other active tenant, set unit to leerstand
        UPDATE units SET status = 'leerstand' WHERE id = NEW.unit_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: account_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name text NOT NULL,
    type text NOT NULL,
    parent_id uuid,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT account_categories_type_check CHECK ((type = ANY (ARRAY['income'::text, 'expense'::text, 'asset'::text])))
);


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    account_name text NOT NULL,
    iban text,
    bank_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    opening_balance numeric(10,2) DEFAULT 0,
    opening_balance_date date,
    current_balance numeric(10,2) DEFAULT 0,
    last_synced_at timestamp with time zone
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    category public.expense_category NOT NULL,
    expense_type public.expense_type DEFAULT 'sonstiges'::public.expense_type NOT NULL,
    bezeichnung text NOT NULL,
    betrag numeric DEFAULT 0 NOT NULL,
    datum date NOT NULL,
    beleg_nummer text,
    notizen text,
    year integer NOT NULL,
    month integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    beleg_url text
);


--
-- Name: learned_matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learned_matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    pattern text NOT NULL,
    unit_id uuid,
    tenant_id uuid,
    match_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    grundmiete numeric(10,2) DEFAULT 0 NOT NULL,
    betriebskosten numeric(10,2) DEFAULT 0 NOT NULL,
    heizungskosten numeric(10,2) DEFAULT 0 NOT NULL,
    gesamtbetrag numeric(10,2) DEFAULT 0 NOT NULL,
    ust numeric(10,2) DEFAULT 0 NOT NULL,
    status public.invoice_status DEFAULT 'offen'::public.invoice_status NOT NULL,
    faellig_am date NOT NULL,
    bezahlt_am date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ust_satz_miete numeric DEFAULT 0 NOT NULL,
    ust_satz_bk numeric DEFAULT 10 NOT NULL,
    ust_satz_heizung numeric DEFAULT 20 NOT NULL,
    mahnstufe integer DEFAULT 0 NOT NULL,
    zahlungserinnerung_am timestamp with time zone,
    mahnung_am timestamp with time zone
);


--
-- Name: operating_cost_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operating_cost_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    year integer NOT NULL,
    status public.settlement_status DEFAULT 'entwurf'::public.settlement_status NOT NULL,
    gesamtkosten numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    finalized_at timestamp with time zone,
    total_bk numeric DEFAULT 0 NOT NULL,
    total_hk numeric DEFAULT 0 NOT NULL,
    bk_mieter numeric DEFAULT 0 NOT NULL,
    hk_mieter numeric DEFAULT 0 NOT NULL,
    bk_eigentuemer numeric DEFAULT 0 NOT NULL,
    hk_eigentuemer numeric DEFAULT 0 NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subscription_tier public.subscription_tier DEFAULT 'starter'::public.subscription_tier NOT NULL,
    subscription_status public.subscription_status DEFAULT 'trial'::public.subscription_status NOT NULL,
    trial_ends_at timestamp with time zone DEFAULT (now() + '14 days'::interval),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    invoice_id uuid,
    betrag numeric(10,2) NOT NULL,
    zahlungsart public.payment_type DEFAULT 'ueberweisung'::public.payment_type NOT NULL,
    referenz text,
    eingangs_datum date NOT NULL,
    buchungs_datum date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid
);


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    postal_code text NOT NULL,
    country text DEFAULT 'Österreich'::text NOT NULL,
    building_year integer,
    total_units integer DEFAULT 0 NOT NULL,
    total_qm numeric(10,2) DEFAULT 0 NOT NULL,
    total_mea numeric(10,2) DEFAULT 0 NOT NULL,
    bk_anteil_wohnung numeric(5,2) DEFAULT 10 NOT NULL,
    bk_anteil_geschaeft numeric(5,2) DEFAULT 20 NOT NULL,
    bk_anteil_garage numeric(5,2) DEFAULT 20 NOT NULL,
    heizung_anteil_wohnung numeric(5,2) DEFAULT 20 NOT NULL,
    heizung_anteil_geschaeft numeric(5,2) DEFAULT 20 NOT NULL,
    betriebskosten_gesamt numeric(12,2) DEFAULT 0 NOT NULL,
    heizungskosten_gesamt numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: property_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    file_url text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: property_managers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_managers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    property_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rent_expectations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rent_expectations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    organization_id uuid,
    monthly_rent numeric(10,2) NOT NULL,
    due_day integer DEFAULT 1,
    start_date date NOT NULL,
    end_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: settlement_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlement_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    settlement_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    tenant_id uuid,
    tenant_name text NOT NULL,
    tenant_email text,
    is_leerstand_bk boolean DEFAULT false NOT NULL,
    is_leerstand_hk boolean DEFAULT false NOT NULL,
    bk_anteil numeric DEFAULT 0 NOT NULL,
    hk_anteil numeric DEFAULT 0 NOT NULL,
    bk_vorschuss numeric DEFAULT 0 NOT NULL,
    hk_vorschuss numeric DEFAULT 0 NOT NULL,
    bk_saldo numeric DEFAULT 0 NOT NULL,
    hk_saldo numeric DEFAULT 0 NOT NULL,
    gesamt_saldo numeric DEFAULT 0 NOT NULL,
    email_sent_at timestamp with time zone,
    email_status text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    mietbeginn date NOT NULL,
    mietende date,
    kaution numeric(10,2) DEFAULT 0 NOT NULL,
    kaution_bezahlt boolean DEFAULT false NOT NULL,
    grundmiete numeric(10,2) DEFAULT 0 NOT NULL,
    betriebskosten_vorschuss numeric(10,2) DEFAULT 0 NOT NULL,
    heizungskosten_vorschuss numeric(10,2) DEFAULT 0 NOT NULL,
    sepa_mandat boolean DEFAULT false NOT NULL,
    iban text,
    bic text,
    mandat_reference text,
    status public.tenant_status DEFAULT 'aktiv'::public.tenant_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transaction_splits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transaction_splits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid,
    category_id uuid,
    amount numeric(10,2) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    unit_id uuid,
    tenant_id uuid,
    amount numeric NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    transaction_date date NOT NULL,
    booking_date date,
    description text,
    reference text,
    counterpart_name text,
    counterpart_iban text,
    status text DEFAULT 'unmatched'::text NOT NULL,
    match_confidence numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    bank_account_id uuid,
    property_id uuid,
    matched_at timestamp with time zone,
    matched_by uuid,
    notes text,
    category_id uuid,
    is_split boolean DEFAULT false,
    tags text[],
    CONSTRAINT transactions_status_check CHECK ((status = ANY (ARRAY['matched'::text, 'unmatched'::text, 'ignored'::text])))
);


--
-- Name: unit_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    file_url text NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    top_nummer text NOT NULL,
    type public.unit_type DEFAULT 'wohnung'::public.unit_type NOT NULL,
    floor integer,
    qm numeric(10,2) DEFAULT 0 NOT NULL,
    mea numeric(10,4) DEFAULT 0 NOT NULL,
    status public.tenant_status DEFAULT 'leerstand'::public.tenant_status NOT NULL,
    vs_qm numeric(10,2) DEFAULT 0,
    vs_mea numeric(10,4) DEFAULT 0,
    vs_personen integer DEFAULT 0,
    vs_heizung_verbrauch numeric(10,2) DEFAULT 0,
    vs_wasser_verbrauch numeric(10,2) DEFAULT 0,
    vs_lift_wohnung numeric(10,2) DEFAULT 0,
    vs_lift_geschaeft numeric(10,2) DEFAULT 0,
    vs_muell numeric(10,2) DEFAULT 0,
    vs_strom_allgemein numeric(10,2) DEFAULT 0,
    vs_versicherung numeric(10,2) DEFAULT 0,
    vs_hausbetreuung numeric(10,2) DEFAULT 0,
    vs_garten numeric(10,2) DEFAULT 0,
    vs_schneeraeumung numeric(10,2) DEFAULT 0,
    vs_kanal numeric(10,2) DEFAULT 0,
    vs_grundsteuer numeric(10,2) DEFAULT 0,
    vs_verwaltung numeric(10,2) DEFAULT 0,
    vs_ruecklage numeric(10,2) DEFAULT 0,
    vs_sonstiges_1 numeric(10,2) DEFAULT 0,
    vs_sonstiges_2 numeric(10,2) DEFAULT 0,
    vs_sonstiges_3 numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: account_categories account_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_categories
    ADD CONSTRAINT account_categories_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: learned_matches learned_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learned_matches
    ADD CONSTRAINT learned_matches_pkey PRIMARY KEY (id);


--
-- Name: monthly_invoices monthly_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_invoices
    ADD CONSTRAINT monthly_invoices_pkey PRIMARY KEY (id);


--
-- Name: operating_cost_settlements operating_cost_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operating_cost_settlements
    ADD CONSTRAINT operating_cost_settlements_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: property_documents property_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_documents
    ADD CONSTRAINT property_documents_pkey PRIMARY KEY (id);


--
-- Name: property_managers property_managers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_managers
    ADD CONSTRAINT property_managers_pkey PRIMARY KEY (id);


--
-- Name: property_managers property_managers_user_id_property_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_managers
    ADD CONSTRAINT property_managers_user_id_property_id_key UNIQUE (user_id, property_id);


--
-- Name: rent_expectations rent_expectations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_expectations
    ADD CONSTRAINT rent_expectations_pkey PRIMARY KEY (id);


--
-- Name: settlement_items settlement_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_items
    ADD CONSTRAINT settlement_items_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: transaction_splits transaction_splits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_splits
    ADD CONSTRAINT transaction_splits_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: unit_documents unit_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_documents
    ADD CONSTRAINT unit_documents_pkey PRIMARY KEY (id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_bank_accounts_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_accounts_org ON public.bank_accounts USING btree (organization_id);


--
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);


--
-- Name: idx_expenses_property_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_property_year ON public.expenses USING btree (property_id, year);


--
-- Name: idx_organizations_stripe_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_stripe_customer_id ON public.organizations USING btree (stripe_customer_id);


--
-- Name: idx_organizations_stripe_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_stripe_subscription_id ON public.organizations USING btree (stripe_subscription_id);


--
-- Name: idx_rent_expectations_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rent_expectations_org ON public.rent_expectations USING btree (organization_id);


--
-- Name: idx_rent_expectations_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rent_expectations_unit ON public.rent_expectations USING btree (unit_id);


--
-- Name: idx_transactions_bank_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_bank_account ON public.transactions USING btree (bank_account_id);


--
-- Name: idx_transactions_property; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_property ON public.transactions USING btree (property_id);


--
-- Name: organizations on_organization_created_add_categories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_organization_created_add_categories AFTER INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.create_default_account_categories();


--
-- Name: tenants prevent_tenant_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_tenant_delete BEFORE DELETE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_deletion();


--
-- Name: tenants prevent_tenant_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_tenant_delete_trigger BEFORE DELETE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_deletion();


--
-- Name: tenants sync_unit_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_unit_status_trigger AFTER INSERT OR UPDATE OF status ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.sync_unit_status_on_tenant_change();


--
-- Name: bank_accounts update_bank_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: properties update_properties_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rent_expectations update_rent_expectations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rent_expectations_updated_at BEFORE UPDATE ON public.rent_expectations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: operating_cost_settlements update_settlements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON public.operating_cost_settlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: units update_units_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account_categories account_categories_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_categories
    ADD CONSTRAINT account_categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: account_categories account_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_categories
    ADD CONSTRAINT account_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.account_categories(id) ON DELETE CASCADE;


--
-- Name: bank_accounts bank_accounts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: learned_matches learned_matches_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learned_matches
    ADD CONSTRAINT learned_matches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: learned_matches learned_matches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learned_matches
    ADD CONSTRAINT learned_matches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: learned_matches learned_matches_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learned_matches
    ADD CONSTRAINT learned_matches_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: monthly_invoices monthly_invoices_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_invoices
    ADD CONSTRAINT monthly_invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: monthly_invoices monthly_invoices_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_invoices
    ADD CONSTRAINT monthly_invoices_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: operating_cost_settlements operating_cost_settlements_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operating_cost_settlements
    ADD CONSTRAINT operating_cost_settlements_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.monthly_invoices(id) ON DELETE SET NULL;


--
-- Name: payments payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: property_documents property_documents_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_documents
    ADD CONSTRAINT property_documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: property_managers property_managers_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_managers
    ADD CONSTRAINT property_managers_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: property_managers property_managers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_managers
    ADD CONSTRAINT property_managers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rent_expectations rent_expectations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_expectations
    ADD CONSTRAINT rent_expectations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: rent_expectations rent_expectations_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_expectations
    ADD CONSTRAINT rent_expectations_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: settlement_items settlement_items_settlement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_items
    ADD CONSTRAINT settlement_items_settlement_id_fkey FOREIGN KEY (settlement_id) REFERENCES public.operating_cost_settlements(id) ON DELETE CASCADE;


--
-- Name: settlement_items settlement_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_items
    ADD CONSTRAINT settlement_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: settlement_items settlement_items_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement_items
    ADD CONSTRAINT settlement_items_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: tenants tenants_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: transaction_splits transaction_splits_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_splits
    ADD CONSTRAINT transaction_splits_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.account_categories(id) ON DELETE SET NULL;


--
-- Name: transaction_splits transaction_splits_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_splits
    ADD CONSTRAINT transaction_splits_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.account_categories(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL;


--
-- Name: unit_documents unit_documents_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_documents
    ADD CONSTRAINT unit_documents_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: units units_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: organizations Admins can update all organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all organizations" ON public.organizations FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: organizations Admins can view all organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all organizations" ON public.organizations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: properties Admins can view all properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all properties" ON public.properties FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: property_managers Admins can view all property managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all property managers" ON public.property_managers FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: units Admins can view all units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all units" ON public.units FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can view all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: property_managers Authenticated users can claim properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can claim properties" ON public.property_managers FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND public.is_property_unassigned(property_id)));


--
-- Name: properties Authenticated users can create properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create properties" ON public.properties FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: property_documents Managers can create documents for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create documents for their properties" ON public.property_documents FOR INSERT TO authenticated WITH CHECK ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: expenses Managers can create expenses for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create expenses for their properties" ON public.expenses FOR INSERT TO authenticated WITH CHECK ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: monthly_invoices Managers can create invoices for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create invoices for their properties" ON public.monthly_invoices FOR INSERT TO authenticated WITH CHECK ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: payments Managers can create payments for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create payments for their properties" ON public.payments FOR INSERT TO authenticated WITH CHECK ((tenant_id IN ( SELECT t.id
   FROM (public.tenants t
     JOIN public.units u ON ((t.unit_id = u.id)))
  WHERE (u.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: settlement_items Managers can create settlement items for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create settlement items for their properties" ON public.settlement_items FOR INSERT TO authenticated WITH CHECK ((settlement_id IN ( SELECT operating_cost_settlements.id
   FROM public.operating_cost_settlements
  WHERE (operating_cost_settlements.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: operating_cost_settlements Managers can create settlements for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create settlements for their properties" ON public.operating_cost_settlements FOR INSERT TO authenticated WITH CHECK ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: tenants Managers can create tenants in their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create tenants in their properties" ON public.tenants FOR INSERT TO authenticated WITH CHECK ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: unit_documents Managers can create unit documents for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create unit documents for their properties" ON public.unit_documents FOR INSERT TO authenticated WITH CHECK ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: units Managers can create units in their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create units in their properties" ON public.units FOR INSERT TO authenticated WITH CHECK ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: property_documents Managers can delete documents for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete documents for their properties" ON public.property_documents FOR DELETE TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: expenses Managers can delete expenses for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete expenses for their properties" ON public.expenses FOR DELETE TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: monthly_invoices Managers can delete invoices for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete invoices for their properties" ON public.monthly_invoices FOR DELETE TO authenticated USING ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: payments Managers can delete payments for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete payments for their properties" ON public.payments FOR DELETE TO authenticated USING ((tenant_id IN ( SELECT t.id
   FROM (public.tenants t
     JOIN public.units u ON ((t.unit_id = u.id)))
  WHERE (u.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: settlement_items Managers can delete settlement items for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete settlement items for their properties" ON public.settlement_items FOR DELETE TO authenticated USING ((settlement_id IN ( SELECT operating_cost_settlements.id
   FROM public.operating_cost_settlements
  WHERE (operating_cost_settlements.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: operating_cost_settlements Managers can delete settlements for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete settlements for their properties" ON public.operating_cost_settlements FOR DELETE TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: tenants Managers can delete tenants in their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete tenants in their properties" ON public.tenants FOR DELETE USING ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: properties Managers can delete their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete their properties" ON public.properties FOR DELETE TO authenticated USING (public.is_property_manager(auth.uid(), id));


--
-- Name: unit_documents Managers can delete unit documents for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete unit documents for their properties" ON public.unit_documents FOR DELETE TO authenticated USING ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: units Managers can delete units in their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete units in their properties" ON public.units FOR DELETE TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: property_documents Managers can update documents for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update documents for their properties" ON public.property_documents FOR UPDATE TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: expenses Managers can update expenses for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update expenses for their properties" ON public.expenses FOR UPDATE TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: monthly_invoices Managers can update invoices for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update invoices for their properties" ON public.monthly_invoices FOR UPDATE TO authenticated USING ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: payments Managers can update payments for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update payments for their properties" ON public.payments FOR UPDATE TO authenticated USING ((tenant_id IN ( SELECT t.id
   FROM (public.tenants t
     JOIN public.units u ON ((t.unit_id = u.id)))
  WHERE (u.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: settlement_items Managers can update settlement items for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update settlement items for their properties" ON public.settlement_items FOR UPDATE TO authenticated USING ((settlement_id IN ( SELECT operating_cost_settlements.id
   FROM public.operating_cost_settlements
  WHERE (operating_cost_settlements.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: operating_cost_settlements Managers can update settlements for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update settlements for their properties" ON public.operating_cost_settlements FOR UPDATE TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: tenants Managers can update tenants in their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update tenants in their properties" ON public.tenants FOR UPDATE TO authenticated USING ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: properties Managers can update their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update their properties" ON public.properties FOR UPDATE TO authenticated USING (public.is_property_manager(auth.uid(), id));


--
-- Name: unit_documents Managers can update unit documents for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update unit documents for their properties" ON public.unit_documents FOR UPDATE TO authenticated USING ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: units Managers can update units in their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update units in their properties" ON public.units FOR UPDATE TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: property_documents Managers can view documents for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view documents for their properties" ON public.property_documents FOR SELECT TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: expenses Managers can view expenses for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view expenses for their properties" ON public.expenses FOR SELECT TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: monthly_invoices Managers can view invoices for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view invoices for their properties" ON public.monthly_invoices FOR SELECT TO authenticated USING ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: payments Managers can view payments for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view payments for their properties" ON public.payments FOR SELECT TO authenticated USING ((tenant_id IN ( SELECT t.id
   FROM (public.tenants t
     JOIN public.units u ON ((t.unit_id = u.id)))
  WHERE (u.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: settlement_items Managers can view settlement items for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view settlement items for their properties" ON public.settlement_items FOR SELECT TO authenticated USING ((settlement_id IN ( SELECT operating_cost_settlements.id
   FROM public.operating_cost_settlements
  WHERE (operating_cost_settlements.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: operating_cost_settlements Managers can view settlements for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view settlements for their properties" ON public.operating_cost_settlements FOR SELECT TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: tenants Managers can view tenants in their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view tenants in their properties" ON public.tenants FOR SELECT TO authenticated USING ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: properties Managers can view their assigned properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view their assigned properties" ON public.properties FOR SELECT USING (public.is_property_manager(auth.uid(), id));


--
-- Name: unit_documents Managers can view unit documents for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view unit documents for their properties" ON public.unit_documents FOR SELECT TO authenticated USING ((unit_id IN ( SELECT units.id
   FROM public.units
  WHERE (units.property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)))));


--
-- Name: units Managers can view units in their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view units in their properties" ON public.units FOR SELECT TO authenticated USING ((property_id IN ( SELECT public.get_managed_property_ids(auth.uid()) AS get_managed_property_ids)));


--
-- Name: learned_matches Users can create learned matches for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create learned matches for their organization" ON public.learned_matches FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transactions Users can create transactions for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create transactions for their organization" ON public.transactions FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: bank_accounts Users can delete bank accounts in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete bank accounts in their org" ON public.bank_accounts FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: account_categories Users can delete custom categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete custom categories" ON public.account_categories FOR DELETE USING (((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (is_system = false)));


--
-- Name: learned_matches Users can delete learned matches from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete learned matches from their organization" ON public.learned_matches FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: property_managers Users can delete own property assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own property assignments" ON public.property_managers FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: rent_expectations Users can delete rent expectations in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete rent expectations in their org" ON public.rent_expectations FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transaction_splits Users can delete splits for their transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete splits for their transactions" ON public.transaction_splits FOR DELETE USING ((transaction_id IN ( SELECT transactions.id
   FROM public.transactions
  WHERE (transactions.organization_id IN ( SELECT profiles.organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: transactions Users can delete transactions from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete transactions from their organization" ON public.transactions FOR DELETE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: bank_accounts Users can insert bank accounts in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert bank accounts in their org" ON public.bank_accounts FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: account_categories Users can insert custom categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert custom categories" ON public.account_categories FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: rent_expectations Users can insert rent expectations in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert rent expectations in their org" ON public.rent_expectations FOR INSERT WITH CHECK ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transaction_splits Users can insert splits for their transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert splits for their transactions" ON public.transaction_splits FOR INSERT WITH CHECK ((transaction_id IN ( SELECT transactions.id
   FROM public.transactions
  WHERE (transactions.organization_id IN ( SELECT profiles.organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: bank_accounts Users can update bank accounts in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update bank accounts in their org" ON public.bank_accounts FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: account_categories Users can update custom categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update custom categories" ON public.account_categories FOR UPDATE USING (((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (is_system = false)));


--
-- Name: learned_matches Users can update learned matches from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update learned matches from their organization" ON public.learned_matches FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: rent_expectations Users can update rent expectations in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update rent expectations in their org" ON public.rent_expectations FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transaction_splits Users can update splits for their transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update splits for their transactions" ON public.transaction_splits FOR UPDATE USING ((transaction_id IN ( SELECT transactions.id
   FROM public.transactions
  WHERE (transactions.organization_id IN ( SELECT profiles.organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: organizations Users can update their own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own organization" ON public.organizations FOR UPDATE USING ((id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transactions Users can update transactions from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update transactions from their organization" ON public.transactions FOR UPDATE USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: bank_accounts Users can view bank accounts in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view bank accounts in their org" ON public.bank_accounts FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: account_categories Users can view categories in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view categories in their org" ON public.account_categories FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: learned_matches Users can view learned matches from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view learned matches from their organization" ON public.learned_matches FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: property_managers Users can view own property assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own property assignments" ON public.property_managers FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: rent_expectations Users can view rent expectations in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view rent expectations in their org" ON public.rent_expectations FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transaction_splits Users can view splits for their transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view splits for their transactions" ON public.transaction_splits FOR SELECT USING ((transaction_id IN ( SELECT transactions.id
   FROM public.transactions
  WHERE (transactions.organization_id IN ( SELECT profiles.organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: organizations Users can view their own organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own organization" ON public.organizations FOR SELECT USING ((id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: transactions Users can view transactions from their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view transactions from their organization" ON public.transactions FOR SELECT USING ((organization_id IN ( SELECT profiles.organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: account_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: learned_matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learned_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monthly_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: operating_cost_settlements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operating_cost_settlements ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: properties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

--
-- Name: property_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: property_managers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.property_managers ENABLE ROW LEVEL SECURITY;

--
-- Name: rent_expectations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rent_expectations ENABLE ROW LEVEL SECURITY;

--
-- Name: settlement_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_splits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: unit_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unit_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;