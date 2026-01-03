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
          month: number
          status: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string
          unit_id: string
          ust: number
          year: number
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
          month: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string
          unit_id: string
          ust?: number
          year: number
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
          month?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id?: string
          unit_id?: string
          ust?: number
          year?: number
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
          created_at: string
          gesamtkosten: number
          id: string
          property_id: string
          status: Database["public"]["Enums"]["settlement_status"]
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          gesamtkosten?: number
          id?: string
          property_id: string
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          gesamtkosten?: number
          id?: string
          property_id?: string
          status?: Database["public"]["Enums"]["settlement_status"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      invoice_status: "offen" | "bezahlt" | "teilbezahlt" | "ueberfaellig"
      payment_type: "sepa" | "ueberweisung" | "bar" | "sonstiges"
      settlement_status: "entwurf" | "berechnet" | "versendet" | "abgeschlossen"
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
      invoice_status: ["offen", "bezahlt", "teilbezahlt", "ueberfaellig"],
      payment_type: ["sepa", "ueberweisung", "bar", "sonstiges"],
      settlement_status: ["entwurf", "berechnet", "versendet", "abgeschlossen"],
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
