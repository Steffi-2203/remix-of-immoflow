export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          beleg_nummer: string | null
          beleg_url: string | null
          betrag: number
          bezeichnung: string
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          datum: string
          expense_type: Database["public"]["Enums"]["expense_type"]
          id: string
          month: number
          notizen: string | null
          property_id: string
          updated_at: string
          year: number
        }
        Insert: {
          beleg_nummer?: string | null
          beleg_url?: string | null
          betrag?: number
          bezeichnung: string
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          datum: string
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          month: number
          notizen?: string | null
          property_id: string
          updated_at?: string
          year: number
        }
        Update: {
          beleg_nummer?: string | null
          beleg_url?: string | null
          betrag?: number
          bezeichnung?: string
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          datum?: string
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          month?: number
          notizen?: string | null
          property_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      learned_matches: {
        Row: {
          created_at: string
          id: string
          match_count: number | null
          organization_id: string | null
          pattern: string
          tenant_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_count?: number | null
          organization_id?: string | null
          pattern: string
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_count?: number | null
          organization_id?: string | null
          pattern?: string
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learned_matches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learned_matches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learned_matches_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_invoices: {
        Row: {
          betriebskosten: number
          bezahlt_am: string | null
          created_at: string
          faellig_am: string
          gesamtbetrag: number
          grundmiete: number
          heizungskosten: number
          id: string
          mahnstufe: number
          mahnung_am: string | null
          month: number
          status: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string
          unit_id: string
          ust: number
          ust_satz_bk: number
          ust_satz_heizung: number
          ust_satz_miete: number
          year: number
          zahlungserinnerung_am: string | null
        }
        Insert: {
          betriebskosten?: number
          bezahlt_am?: string | null
          created_at?: string
          faellig_am: string
          gesamtbetrag?: number
          grundmiete?: number
          heizungskosten?: number
          id?: string
          mahnstufe?: number
          mahnung_am?: string | null
          month: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string
          unit_id: string
          ust?: number
          ust_satz_bk?: number
          ust_satz_heizung?: number
          ust_satz_miete?: number
          year: number
          zahlungserinnerung_am?: string | null
        }
        Update: {
          betriebskosten?: number
          bezahlt_am?: string | null
          created_at?: string
          faellig_am?: string
          gesamtbetrag?: number
          grundmiete?: number
          heizungskosten?: number
          id?: string
          mahnstufe?: number
          mahnung_am?: string | null
          month?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id?: string
          unit_id?: string
          ust?: number
          ust_satz_bk?: number
          ust_satz_heizung?: number
          ust_satz_miete?: number
          year?: number
          zahlungserinnerung_am?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_invoices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_cost_settlements: {
        Row: {
          bk_eigentuemer: number
          bk_mieter: number
          created_at: string
          finalized_at: string | null
          gesamtkosten: number
          hk_eigentuemer: number
          hk_mieter: number
          id: string
          property_id: string
          status: Database["public"]["Enums"]["settlement_status"]
          total_bk: number
          total_hk: number
          updated_at: string
          year: number
        }
        Insert: {
          bk_eigentuemer?: number
          bk_mieter?: number
          created_at?: string
          finalized_at?: string | null
          gesamtkosten?: number
          hk_eigentuemer?: number
          hk_mieter?: number
          id?: string
          property_id: string
          status?: Database["public"]["Enums"]["settlement_status"]
          total_bk?: number
          total_hk?: number
          updated_at?: string
          year: number
        }
        Update: {
          bk_eigentuemer?: number
          bk_mieter?: number
          created_at?: string
          finalized_at?: string | null
          gesamtkosten?: number
          hk_eigentuemer?: number
          hk_mieter?: number
          id?: string
          property_id?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          total_bk?: number
          total_hk?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "operating_cost_settlements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          betrag: number
          buchungs_datum: string
          created_at: string
          eingangs_datum: string
          id: string
          invoice_id: string | null
          referenz: string | null
          tenant_id: string
          zahlungsart: Database["public"]["Enums"]["payment_type"]
        }
        Insert: {
          betrag: number
          buchungs_datum: string
          created_at?: string
          eingangs_datum: string
          id?: string
          invoice_id?: string | null
          referenz?: string | null
          tenant_id: string
          zahlungsart?: Database["public"]["Enums"]["payment_type"]
        }
        Update: {
          betrag?: number
          buchungs_datum?: string
          created_at?: string
          eingangs_datum?: string
          id?: string
          invoice_id?: string | null
          referenz?: string | null
          tenant_id?: string
          zahlungsart?: Database["public"]["Enums"]["payment_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "monthly_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          betriebskosten_gesamt: number
          bk_anteil_garage: number
          bk_anteil_geschaeft: number
          bk_anteil_wohnung: number
          building_year: number | null
          city: string
          country: string
          created_at: string
          heizung_anteil_geschaeft: number
          heizung_anteil_wohnung: number
          heizungskosten_gesamt: number
          id: string
          name: string
          postal_code: string
          total_mea: number
          total_qm: number
          total_units: number
          updated_at: string
        }
        Insert: {
          address: string
          betriebskosten_gesamt?: number
          bk_anteil_garage?: number
          bk_anteil_geschaeft?: number
          bk_anteil_wohnung?: number
          building_year?: number | null
          city: string
          country?: string
          created_at?: string
          heizung_anteil_geschaeft?: number
          heizung_anteil_wohnung?: number
          heizungskosten_gesamt?: number
          id?: string
          name: string
          postal_code: string
          total_mea?: number
          total_qm?: number
          total_units?: number
          updated_at?: string
        }
        Update: {
          address?: string
          betriebskosten_gesamt?: number
          bk_anteil_garage?: number
          bk_anteil_geschaeft?: number
          bk_anteil_wohnung?: number
          building_year?: number | null
          city?: string
          country?: string
          created_at?: string
          heizung_anteil_geschaeft?: number
          heizung_anteil_wohnung?: number
          heizungskosten_gesamt?: number
          id?: string
          name?: string
          postal_code?: string
          total_mea?: number
          total_qm?: number
          total_units?: number
          updated_at?: string
        }
        Relationships: []
      }
      property_documents: {
        Row: {
          file_url: string
          id: string
          name: string
          property_id: string
          type: string
          uploaded_at: string
        }
        Insert: {
          file_url: string
          id?: string
          name: string
          property_id: string
          type: string
          uploaded_at?: string
        }
        Update: {
          file_url?: string
          id?: string
          name?: string
          property_id?: string
          type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_managers: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_managers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_items: {
        Row: {
          bk_anteil: number
          bk_saldo: number
          bk_vorschuss: number
          created_at: string
          email_sent_at: string | null
          email_status: string | null
          gesamt_saldo: number
          hk_anteil: number
          hk_saldo: number
          hk_vorschuss: number
          id: string
          is_leerstand_bk: boolean
          is_leerstand_hk: boolean
          settlement_id: string
          tenant_email: string | null
          tenant_id: string | null
          tenant_name: string
          unit_id: string
        }
        Insert: {
          bk_anteil?: number
          bk_saldo?: number
          bk_vorschuss?: number
          created_at?: string
          email_sent_at?: string | null
          email_status?: string | null
          gesamt_saldo?: number
          hk_anteil?: number
          hk_saldo?: number
          hk_vorschuss?: number
          id?: string
          is_leerstand_bk?: boolean
          is_leerstand_hk?: boolean
          settlement_id: string
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name: string
          unit_id: string
        }
        Update: {
          bk_anteil?: number
          bk_saldo?: number
          bk_vorschuss?: number
          created_at?: string
          email_sent_at?: string | null
          email_status?: string | null
          gesamt_saldo?: number
          hk_anteil?: number
          hk_saldo?: number
          hk_vorschuss?: number
          id?: string
          is_leerstand_bk?: boolean
          is_leerstand_hk?: boolean
          settlement_id?: string
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "operating_cost_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          betriebskosten_vorschuss: number
          bic: string | null
          created_at: string
          email: string | null
          first_name: string
          grundmiete: number
          heizungskosten_vorschuss: number
          iban: string | null
          id: string
          kaution: number
          kaution_bezahlt: boolean
          last_name: string
          mandat_reference: string | null
          mietbeginn: string
          mietende: string | null
          phone: string | null
          sepa_mandat: boolean
          status: Database["public"]["Enums"]["tenant_status"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          betriebskosten_vorschuss?: number
          bic?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          grundmiete?: number
          heizungskosten_vorschuss?: number
          iban?: string | null
          id?: string
          kaution?: number
          kaution_bezahlt?: boolean
          last_name: string
          mandat_reference?: string | null
          mietbeginn: string
          mietende?: string | null
          phone?: string | null
          sepa_mandat?: boolean
          status?: Database["public"]["Enums"]["tenant_status"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          betriebskosten_vorschuss?: number
          bic?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          grundmiete?: number
          heizungskosten_vorschuss?: number
          iban?: string | null
          id?: string
          kaution?: number
          kaution_bezahlt?: boolean
          last_name?: string
          mandat_reference?: string | null
          mietbeginn?: string
          mietende?: string | null
          phone?: string | null
          sepa_mandat?: boolean
          status?: Database["public"]["Enums"]["tenant_status"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          booking_date: string | null
          counterpart_iban: string | null
          counterpart_name: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          match_confidence: number | null
          organization_id: string | null
          reference: string | null
          status: string
          tenant_id: string | null
          transaction_date: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          booking_date?: string | null
          counterpart_iban?: string | null
          counterpart_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          match_confidence?: number | null
          organization_id?: string | null
          reference?: string | null
          status?: string
          tenant_id?: string | null
          transaction_date: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_date?: string | null
          counterpart_iban?: string | null
          counterpart_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          match_confidence?: number | null
          organization_id?: string | null
          reference?: string | null
          status?: string
          tenant_id?: string | null
          transaction_date?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_documents: {
        Row: {
          file_url: string
          id: string
          name: string
          type: string
          unit_id: string
          uploaded_at: string
        }
        Insert: {
          file_url: string
          id?: string
          name: string
          type: string
          unit_id: string
          uploaded_at?: string
        }
        Update: {
          file_url?: string
          id?: string
          name?: string
          type?: string
          unit_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          floor: number | null
          id: string
          mea: number
          property_id: string
          qm: number
          status: Database["public"]["Enums"]["tenant_status"]
          top_nummer: string
          type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
          vs_garten: number | null
          vs_grundsteuer: number | null
          vs_hausbetreuung: number | null
          vs_heizung_verbrauch: number | null
          vs_kanal: number | null
          vs_lift_geschaeft: number | null
          vs_lift_wohnung: number | null
          vs_mea: number | null
          vs_muell: number | null
          vs_personen: number | null
          vs_qm: number | null
          vs_ruecklage: number | null
          vs_schneeraeumung: number | null
          vs_sonstiges_1: number | null
          vs_sonstiges_2: number | null
          vs_sonstiges_3: number | null
          vs_strom_allgemein: number | null
          vs_versicherung: number | null
          vs_verwaltung: number | null
          vs_wasser_verbrauch: number | null
        }
        Insert: {
          created_at?: string
          floor?: number | null
          id?: string
          mea?: number
          property_id: string
          qm?: number
          status?: Database["public"]["Enums"]["tenant_status"]
          top_nummer: string
          type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          vs_garten?: number | null
          vs_grundsteuer?: number | null
          vs_hausbetreuung?: number | null
          vs_heizung_verbrauch?: number | null
          vs_kanal?: number | null
          vs_lift_geschaeft?: number | null
          vs_lift_wohnung?: number | null
          vs_mea?: number | null
          vs_muell?: number | null
          vs_personen?: number | null
          vs_qm?: number | null
          vs_ruecklage?: number | null
          vs_schneeraeumung?: number | null
          vs_sonstiges_1?: number | null
          vs_sonstiges_2?: number | null
          vs_sonstiges_3?: number | null
          vs_strom_allgemein?: number | null
          vs_versicherung?: number | null
          vs_verwaltung?: number | null
          vs_wasser_verbrauch?: number | null
        }
        Update: {
          created_at?: string
          floor?: number | null
          id?: string
          mea?: number
          property_id?: string
          qm?: number
          status?: Database["public"]["Enums"]["tenant_status"]
          top_nummer?: string
          type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
          vs_garten?: number | null
          vs_grundsteuer?: number | null
          vs_hausbetreuung?: number | null
          vs_heizung_verbrauch?: number | null
          vs_kanal?: number | null
          vs_lift_geschaeft?: number | null
          vs_lift_wohnung?: number | null
          vs_mea?: number | null
          vs_muell?: number | null
          vs_personen?: number | null
          vs_qm?: number | null
          vs_ruecklage?: number | null
          vs_schneeraeumung?: number | null
          vs_sonstiges_1?: number | null
          vs_sonstiges_2?: number | null
          vs_sonstiges_3?: number | null
          vs_strom_allgemein?: number | null
          vs_versicherung?: number | null
          vs_verwaltung?: number | null
          vs_wasser_verbrauch?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_managed_property_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_property_manager: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      is_property_unassigned: {
        Args: { _property_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "property_manager"
      expense_category: "betriebskosten_umlagefaehig" | "instandhaltung"
      expense_type:
        | "versicherung"
        | "grundsteuer"
        | "muellabfuhr"
        | "wasser_abwasser"
        | "heizung"
        | "strom_allgemein"
        | "hausbetreuung"
        | "lift"
        | "gartenpflege"
        | "schneeraeumung"
        | "verwaltung"
        | "ruecklage"
        | "reparatur"
        | "sanierung"
        | "sonstiges"
      invoice_status: "offen" | "bezahlt" | "teilbezahlt" | "ueberfaellig"
      payment_type: "sepa" | "ueberweisung" | "bar" | "sonstiges"
      settlement_status: "entwurf" | "berechnet" | "versendet" | "abgeschlossen"
      subscription_status: "trial" | "active" | "cancelled" | "expired"
      subscription_tier: "starter" | "professional" | "enterprise"
      tenant_status: "aktiv" | "leerstand" | "beendet"
      unit_type:
        | "wohnung"
        | "geschaeft"
        | "garage"
        | "stellplatz"
        | "lager"
        | "sonstiges"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "property_manager"],
      expense_category: ["betriebskosten_umlagefaehig", "instandhaltung"],
      expense_type: [
        "versicherung",
        "grundsteuer",
        "muellabfuhr",
        "wasser_abwasser",
        "heizung",
        "strom_allgemein",
        "hausbetreuung",
        "lift",
        "gartenpflege",
        "schneeraeumung",
        "verwaltung",
        "ruecklage",
        "reparatur",
        "sanierung",
        "sonstiges",
      ],
      invoice_status: ["offen", "bezahlt", "teilbezahlt", "ueberfaellig"],
      payment_type: ["sepa", "ueberweisung", "bar", "sonstiges"],
      settlement_status: ["entwurf", "berechnet", "versendet", "abgeschlossen"],
      subscription_status: ["trial", "active", "cancelled", "expired"],
      subscription_tier: ["starter", "professional", "enterprise"],
      tenant_status: ["aktiv", "leerstand", "beendet"],
      unit_type: [
        "wohnung",
        "geschaeft",
        "garage",
        "stellplatz",
        "lager",
        "sonstiges",
      ],
    },
  },
} as const
