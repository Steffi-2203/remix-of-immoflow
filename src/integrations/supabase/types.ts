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
      account_categories: {
        Row: {
          created_at: string | null
          id: string
          is_system: boolean | null
          name: string
          organization_id: string | null
          parent_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          parent_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          bank_name: string | null
          bic: string | null
          created_at: string | null
          current_balance: number | null
          iban: string | null
          id: string
          last_synced_at: string | null
          opening_balance: number | null
          opening_balance_date: string | null
          organization_id: string | null
          property_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          bank_name?: string | null
          bic?: string | null
          created_at?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          last_synced_at?: string | null
          opening_balance?: number | null
          opening_balance_date?: string | null
          organization_id?: string | null
          property_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          bank_name?: string | null
          bic?: string | null
          created_at?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          last_synced_at?: string | null
          opening_balance?: number | null
          opening_balance_date?: string | null
          organization_id?: string | null
          property_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_number_sequences: {
        Row: {
          current_number: number
          current_year: number
          id: string
          organization_id: string
        }
        Insert: {
          current_number?: number
          current_year?: number
          id?: string
          organization_id: string
        }
        Update: {
          current_number?: number
          current_year?: number
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_number_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_number: string
          account_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          organization_id: string | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_number: string
          account_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          organization_id?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          organization_id?: string | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          bic: string | null
          city: string | null
          company_name: string
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          iban: string | null
          id: string
          is_active: boolean | null
          mobile: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          postal_code: string | null
          rating: number | null
          specializations: string[] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bic?: string | null
          city?: string | null
          company_name: string
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          specializations?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bic?: string | null
          city?: string | null
          company_name?: string
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          rating?: number | null
          specializations?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlines: {
        Row: {
          category: string
          created_at: string
          deadline_date: string
          description: string | null
          id: string
          is_recurring: boolean
          organization_id: string | null
          property_id: string | null
          recurrence_months: number | null
          reminder_days: number
          reminder_sent_at: string | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          deadline_date: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          organization_id?: string | null
          property_id?: string | null
          recurrence_months?: number | null
          reminder_days?: number
          reminder_sent_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          deadline_date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          organization_id?: string | null
          property_id?: string | null
          recurrence_months?: number | null
          reminder_days?: number
          reminder_sent_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_keys: {
        Row: {
          created_at: string
          description: string | null
          erlaubter_schluessel: string[] | null
          id: string
          input_type: string
          is_active: boolean
          is_system: boolean
          key_code: string
          mrg_konform: boolean | null
          mrg_paragraph: string | null
          name: string
          organization_id: string | null
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          erlaubter_schluessel?: string[] | null
          id?: string
          input_type?: string
          is_active?: boolean
          is_system?: boolean
          key_code: string
          mrg_konform?: boolean | null
          mrg_paragraph?: string | null
          name: string
          organization_id?: string | null
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          erlaubter_schluessel?: string[] | null
          id?: string
          input_type?: string
          is_active?: boolean
          is_system?: boolean
          key_code?: string
          mrg_konform?: boolean | null
          mrg_paragraph?: string | null
          name?: string
          organization_id?: string | null
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          beleg_nummer: string | null
          beleg_url: string | null
          betrag: number
          bezeichnung: string
          budget_position: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          datum: string
          distribution_key_id: string | null
          expense_type: Database["public"]["Enums"]["expense_type"]
          id: string
          ist_umlagefaehig: boolean | null
          month: number
          mrg_kategorie: Database["public"]["Enums"]["mrg_bk_kategorie"] | null
          mrg_paragraph: string | null
          notizen: string | null
          property_id: string
          transaction_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          beleg_nummer?: string | null
          beleg_url?: string | null
          betrag?: number
          bezeichnung: string
          budget_position?: number | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          datum: string
          distribution_key_id?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          ist_umlagefaehig?: boolean | null
          month: number
          mrg_kategorie?: Database["public"]["Enums"]["mrg_bk_kategorie"] | null
          mrg_paragraph?: string | null
          notizen?: string | null
          property_id: string
          transaction_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          beleg_nummer?: string | null
          beleg_url?: string | null
          betrag?: number
          bezeichnung?: string
          budget_position?: number | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          datum?: string
          distribution_key_id?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          ist_umlagefaehig?: boolean | null
          month?: number
          mrg_kategorie?: Database["public"]["Enums"]["mrg_bk_kategorie"] | null
          mrg_paragraph?: string | null
          notizen?: string | null
          property_id?: string
          transaction_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_distribution_key_id_fkey"
            columns: ["distribution_key_id"]
            isOneToOne: false
            referencedRelation: "distribution_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          acquisition_cost: number
          acquisition_date: string
          annual_depreciation: number | null
          asset_type: string
          created_at: string
          depreciation_method: string
          description: string | null
          id: string
          is_active: boolean
          monthly_depreciation: number | null
          name: string
          notes: string | null
          organization_id: string
          property_id: string | null
          residual_value: number
          sold_amount: number | null
          sold_at: string | null
          updated_at: string
          useful_life_years: number
        }
        Insert: {
          acquisition_cost: number
          acquisition_date: string
          annual_depreciation?: number | null
          asset_type: string
          created_at?: string
          depreciation_method?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_depreciation?: number | null
          name: string
          notes?: string | null
          organization_id: string
          property_id?: string | null
          residual_value?: number
          sold_amount?: number | null
          sold_at?: string | null
          updated_at?: string
          useful_life_years?: number
        }
        Update: {
          acquisition_cost?: number
          acquisition_date?: string
          annual_depreciation?: number | null
          asset_type?: string
          created_at?: string
          depreciation_method?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_depreciation?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          property_id?: string | null
          residual_value?: number
          sold_amount?: number | null
          sold_at?: string | null
          updated_at?: string
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      heating_cost_readings: {
        Row: {
          consumption: number
          consumption_unit: string
          cost_share: number
          created_at: string
          id: string
          notes: string | null
          organization_id: string | null
          period_from: string
          period_to: string
          property_id: string
          provider: string | null
          source: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          consumption?: number
          consumption_unit?: string
          cost_share?: number
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          period_from: string
          period_to: string
          property_id: string
          provider?: string | null
          source?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          consumption?: number
          consumption_unit?: string
          cost_share?: number
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          period_from?: string
          period_to?: string
          property_id?: string
          provider?: string | null
          source?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heating_cost_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heating_cost_readings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "heating_cost_readings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          claim_date: string
          claim_number: string | null
          created_at: string
          damage_amount: number | null
          description: string
          document_url: string | null
          id: string
          insurance_policy_id: string
          notes: string | null
          organization_id: string | null
          property_id: string
          reimbursed_amount: number | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          claim_date: string
          claim_number?: string | null
          created_at?: string
          damage_amount?: number | null
          description: string
          document_url?: string | null
          id?: string
          insurance_policy_id: string
          notes?: string | null
          organization_id?: string | null
          property_id: string
          reimbursed_amount?: number | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          claim_date?: string
          claim_number?: string | null
          created_at?: string
          damage_amount?: number | null
          description?: string
          document_url?: string | null
          id?: string
          insurance_policy_id?: string
          notes?: string | null
          organization_id?: string | null
          property_id?: string
          reimbursed_amount?: number | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          annual_premium: number | null
          auto_renew: boolean
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          coverage_amount: number | null
          created_at: string
          document_url: string | null
          end_date: string | null
          id: string
          insurance_type: string
          notes: string | null
          organization_id: string | null
          policy_number: string | null
          property_id: string
          provider: string
          start_date: string
          updated_at: string
        }
        Insert: {
          annual_premium?: number | null
          auto_renew?: boolean
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coverage_amount?: number | null
          created_at?: string
          document_url?: string | null
          end_date?: string | null
          id?: string
          insurance_type?: string
          notes?: string | null
          organization_id?: string | null
          policy_number?: string | null
          property_id: string
          provider: string
          start_date: string
          updated_at?: string
        }
        Update: {
          annual_premium?: number | null
          auto_renew?: boolean
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          coverage_amount?: number | null
          created_at?: string
          document_url?: string | null
          end_date?: string | null
          id?: string
          insurance_type?: string
          notes?: string | null
          organization_id?: string | null
          policy_number?: string | null
          property_id?: string
          provider?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          beleg_nummer: string | null
          beleg_url: string | null
          booking_number: string
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          id: string
          is_storno: boolean
          organization_id: string
          property_id: string | null
          source_id: string | null
          source_type: string | null
          storno_of: string | null
          tenant_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          beleg_nummer?: string | null
          beleg_url?: string | null
          booking_number: string
          created_at?: string
          created_by?: string | null
          description: string
          entry_date: string
          id?: string
          is_storno?: boolean
          organization_id: string
          property_id?: string | null
          source_id?: string | null
          source_type?: string | null
          storno_of?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          beleg_nummer?: string | null
          beleg_url?: string | null
          booking_number?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          id?: string
          is_storno?: boolean
          organization_id?: string
          property_id?: string | null
          source_id?: string | null
          source_type?: string | null
          storno_of?: string | null
          tenant_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_storno_of_fkey"
            columns: ["storno_of"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
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
            foreignKeyName: "learned_matches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
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
      maintenance_contracts: {
        Row: {
          contract_fee: number | null
          contract_type: string
          contractor_contact: string | null
          contractor_email: string | null
          contractor_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string | null
          estimated_cost: number | null
          id: string
          interval_months: number
          is_active: boolean
          last_maintenance_date: string | null
          next_due_date: string
          notes: string | null
          organization_id: string | null
          property_id: string
          reminder_days: number
          reminder_sent_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          contract_fee?: number | null
          contract_type?: string
          contractor_contact?: string | null
          contractor_email?: string | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          estimated_cost?: number | null
          id?: string
          interval_months?: number
          is_active?: boolean
          last_maintenance_date?: string | null
          next_due_date: string
          notes?: string | null
          organization_id?: string | null
          property_id: string
          reminder_days?: number
          reminder_sent_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          contract_fee?: number | null
          contract_type?: string
          contractor_contact?: string | null
          contractor_email?: string | null
          contractor_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          estimated_cost?: number | null
          id?: string
          interval_months?: number
          is_active?: boolean
          last_maintenance_date?: string | null
          next_due_date?: string
          notes?: string | null
          organization_id?: string | null
          property_id?: string
          reminder_days?: number
          reminder_sent_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_invoices: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          contractor_name: string
          created_at: string | null
          created_by: string | null
          document_url: string | null
          final_approved_at: string | null
          final_approved_by: string | null
          id: string
          invoice_date: string
          invoice_number: string | null
          maintenance_task_id: string | null
          notes: string | null
          organization_id: string | null
          pre_approved_at: string | null
          pre_approved_by: string | null
          rejection_reason: string | null
          status: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          contractor_name: string
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          id?: string
          invoice_date: string
          invoice_number?: string | null
          maintenance_task_id?: string | null
          notes?: string | null
          organization_id?: string | null
          pre_approved_at?: string | null
          pre_approved_by?: string | null
          rejection_reason?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          contractor_name?: string
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          final_approved_at?: string | null
          final_approved_by?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string | null
          maintenance_task_id?: string | null
          notes?: string | null
          organization_id?: string | null
          pre_approved_at?: string | null
          pre_approved_by?: string | null
          rejection_reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_invoices_maintenance_task_id_fkey"
            columns: ["maintenance_task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          contractor_contact: string | null
          contractor_name: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_cost: number | null
          id: string
          organization_id: string | null
          priority: string | null
          property_id: string | null
          status: string | null
          title: string
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          contractor_contact?: string | null
          contractor_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          organization_id?: string | null
          priority?: string | null
          property_id?: string | null
          status?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          contractor_contact?: string | null
          contractor_name?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          organization_id?: string | null
          priority?: string | null
          property_id?: string | null
          status?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          maintenance_task_id: string | null
          message_body: string
          message_type: string | null
          organization_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          recipient_type: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          tenant_id: string | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          maintenance_task_id?: string | null
          message_body: string
          message_type?: string | null
          organization_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          maintenance_task_id?: string | null
          message_body?: string
          message_type?: string | null
          organization_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_type?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          tenant_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_maintenance_task_id_fkey"
            columns: ["maintenance_task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_unit_id_fkey"
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
          vortrag_bk: number
          vortrag_gesamt: number | null
          vortrag_hk: number
          vortrag_miete: number
          vortrag_sonstige: number
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
          vortrag_bk?: number
          vortrag_gesamt?: number | null
          vortrag_hk?: number
          vortrag_miete?: number
          vortrag_sonstige?: number
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
          vortrag_bk?: number
          vortrag_gesamt?: number | null
          vortrag_hk?: number
          vortrag_miete?: number
          vortrag_sonstige?: number
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
            foreignKeyName: "monthly_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
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
      mrg_abrechnungen: {
        Row: {
          abrechnung_erstellt_am: string | null
          abrechnung_versendet_am: string | null
          abrechnungsjahr: number
          abrechnungszeitraum_bis: string
          abrechnungszeitraum_von: string
          created_at: string
          einsicht_bis: string | null
          einsicht_gewaehrt: boolean | null
          frist_abrechnung: string
          id: string
          property_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          abrechnung_erstellt_am?: string | null
          abrechnung_versendet_am?: string | null
          abrechnungsjahr: number
          abrechnungszeitraum_bis: string
          abrechnungszeitraum_von: string
          created_at?: string
          einsicht_bis?: string | null
          einsicht_gewaehrt?: boolean | null
          frist_abrechnung: string
          id?: string
          property_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          abrechnung_erstellt_am?: string | null
          abrechnung_versendet_am?: string | null
          abrechnungsjahr?: number
          abrechnungszeitraum_bis?: string
          abrechnungszeitraum_von?: string
          created_at?: string
          einsicht_bis?: string | null
          einsicht_gewaehrt?: boolean | null
          frist_abrechnung?: string
          id?: string
          property_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mrg_abrechnungen_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      mrg_richtwerte: {
        Row: {
          bundesland: string
          created_at: string
          gueltig_ab: string
          gueltig_bis: string | null
          id: string
          richtwert_pro_qm: number
        }
        Insert: {
          bundesland: string
          created_at?: string
          gueltig_ab: string
          gueltig_bis?: string | null
          id?: string
          richtwert_pro_qm: number
        }
        Update: {
          bundesland?: string
          created_at?: string
          gueltig_ab?: string
          gueltig_bis?: string | null
          id?: string
          richtwert_pro_qm?: number
        }
        Relationships: []
      }
      mrg_ruecklage_grenzen: {
        Row: {
          betrag_pro_qm: number
          created_at: string
          gueltig_ab: string
          gueltig_bis: string | null
          id: string
          kategorie: Database["public"]["Enums"]["ausstattungskategorie"]
        }
        Insert: {
          betrag_pro_qm: number
          created_at?: string
          gueltig_ab: string
          gueltig_bis?: string | null
          id?: string
          kategorie: Database["public"]["Enums"]["ausstattungskategorie"]
        }
        Update: {
          betrag_pro_qm?: number
          created_at?: string
          gueltig_ab?: string
          gueltig_bis?: string | null
          id?: string
          kategorie?: Database["public"]["Enums"]["ausstattungskategorie"]
        }
        Relationships: []
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
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          bic: string | null
          created_at: string
          iban: string | null
          id: string
          name: string
          sepa_creditor_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          bic?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          name: string
          sepa_creditor_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          bic?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          name?: string
          sepa_creditor_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      owner_payouts: {
        Row: {
          created_at: string
          email_sent_at: string | null
          id: string
          management_fee: number
          net_payout: number
          notes: string | null
          organization_id: string | null
          owner_id: string
          pdf_url: string | null
          period_from: string
          period_to: string
          property_id: string
          sepa_exported_at: string | null
          status: string
          total_expenses: number
          total_income: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_sent_at?: string | null
          id?: string
          management_fee?: number
          net_payout?: number
          notes?: string | null
          organization_id?: string | null
          owner_id: string
          pdf_url?: string | null
          period_from: string
          period_to: string
          property_id: string
          sepa_exported_at?: string | null
          status?: string
          total_expenses?: number
          total_income?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_sent_at?: string | null
          id?: string
          management_fee?: number
          net_payout?: number
          notes?: string | null
          organization_id?: string | null
          owner_id?: string
          pdf_url?: string | null
          period_from?: string
          period_to?: string
          property_id?: string
          sepa_exported_at?: string | null
          status?: string
          total_expenses?: number
          total_income?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_payouts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "property_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_payouts_property_id_fkey"
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
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_expires_at: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          access_expires_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          access_expires_at?: string | null
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
          baubewilligung_nach_1945: boolean | null
          baubewilligung_nach_1953: boolean | null
          baujahr_mrg: number | null
          betriebskosten_gesamt: number
          bk_anteil_garage: number
          bk_anteil_geschaeft: number
          bk_anteil_wohnung: number
          building_year: number | null
          city: string
          country: string
          created_at: string
          foerderung_erhalten: boolean | null
          heizung_anteil_geschaeft: number
          heizung_anteil_wohnung: number
          heizungskosten_gesamt: number
          id: string
          marktwert: number | null
          name: string
          postal_code: string
          richtwert_bundesland: string | null
          stichtag_mrg: string | null
          total_mea: number
          total_qm: number
          total_units: number
          updated_at: string
        }
        Insert: {
          address: string
          baubewilligung_nach_1945?: boolean | null
          baubewilligung_nach_1953?: boolean | null
          baujahr_mrg?: number | null
          betriebskosten_gesamt?: number
          bk_anteil_garage?: number
          bk_anteil_geschaeft?: number
          bk_anteil_wohnung?: number
          building_year?: number | null
          city: string
          country?: string
          created_at?: string
          foerderung_erhalten?: boolean | null
          heizung_anteil_geschaeft?: number
          heizung_anteil_wohnung?: number
          heizungskosten_gesamt?: number
          id?: string
          marktwert?: number | null
          name: string
          postal_code: string
          richtwert_bundesland?: string | null
          stichtag_mrg?: string | null
          total_mea?: number
          total_qm?: number
          total_units?: number
          updated_at?: string
        }
        Update: {
          address?: string
          baubewilligung_nach_1945?: boolean | null
          baubewilligung_nach_1953?: boolean | null
          baujahr_mrg?: number | null
          betriebskosten_gesamt?: number
          bk_anteil_garage?: number
          bk_anteil_geschaeft?: number
          bk_anteil_wohnung?: number
          building_year?: number | null
          city?: string
          country?: string
          created_at?: string
          foerderung_erhalten?: boolean | null
          heizung_anteil_geschaeft?: number
          heizung_anteil_wohnung?: number
          heizungskosten_gesamt?: number
          id?: string
          marktwert?: number | null
          name?: string
          postal_code?: string
          richtwert_bundesland?: string | null
          stichtag_mrg?: string | null
          total_mea?: number
          total_qm?: number
          total_units?: number
          updated_at?: string
        }
        Relationships: []
      }
      property_budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string | null
          position_1_amount: number | null
          position_1_name: string | null
          position_2_amount: number | null
          position_2_name: string | null
          position_3_amount: number | null
          position_3_name: string | null
          position_4_amount: number | null
          position_4_name: string | null
          position_5_amount: number | null
          position_5_name: string | null
          property_id: string
          status: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          position_1_amount?: number | null
          position_1_name?: string | null
          position_2_amount?: number | null
          position_2_name?: string | null
          position_3_amount?: number | null
          position_3_name?: string | null
          position_4_amount?: number | null
          position_4_name?: string | null
          position_5_amount?: number | null
          position_5_name?: string | null
          property_id: string
          status?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          position_1_amount?: number | null
          position_1_name?: string | null
          position_2_amount?: number | null
          position_2_name?: string | null
          position_3_amount?: number | null
          position_3_name?: string | null
          position_4_amount?: number | null
          position_4_name?: string | null
          position_5_amount?: number | null
          position_5_name?: string | null
          property_id?: string
          status?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "property_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_budgets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      property_owners: {
        Row: {
          address: string | null
          bic: string | null
          city: string | null
          created_at: string
          email: string | null
          iban: string | null
          id: string
          is_primary: boolean
          name: string
          ownership_share: number
          phone: string | null
          postal_code: string | null
          property_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          bic?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          is_primary?: boolean
          name: string
          ownership_share?: number
          phone?: string | null
          postal_code?: string | null
          property_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          bic?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          ownership_share?: number
          phone?: string | null
          postal_code?: string | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_owners_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_adjustments: {
        Row: {
          adjustment_date: string
          applied_by: string | null
          change_percent: number
          clause_id: string
          created_at: string
          id: string
          new_grundmiete: number
          new_index_value: number
          notes: string | null
          old_grundmiete: number
          old_index_value: number
          tenant_id: string
        }
        Insert: {
          adjustment_date: string
          applied_by?: string | null
          change_percent: number
          clause_id: string
          created_at?: string
          id?: string
          new_grundmiete: number
          new_index_value: number
          notes?: string | null
          old_grundmiete: number
          old_index_value: number
          tenant_id: string
        }
        Update: {
          adjustment_date?: string
          applied_by?: string | null
          change_percent?: number
          clause_id?: string
          created_at?: string
          id?: string
          new_grundmiete?: number
          new_index_value?: number
          notes?: string | null
          old_grundmiete?: number
          old_index_value?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_adjustments_clause_id_fkey"
            columns: ["clause_id"]
            isOneToOne: false
            referencedRelation: "rent_index_clauses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_expectations: {
        Row: {
          created_at: string | null
          due_day: number | null
          end_date: string | null
          id: string
          monthly_rent: number
          organization_id: string | null
          start_date: string
          unit_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_day?: number | null
          end_date?: string | null
          id?: string
          monthly_rent: number
          organization_id?: string | null
          start_date: string
          unit_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_day?: number | null
          end_date?: string | null
          id?: string
          monthly_rent?: number
          organization_id?: string | null
          start_date?: string
          unit_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_expectations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_expectations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_index_clauses: {
        Row: {
          base_index_date: string
          base_index_value: number
          created_at: string
          current_index_value: number | null
          id: string
          index_type: string
          is_active: boolean
          notes: string | null
          tenant_id: string
          threshold_percent: number
          updated_at: string
        }
        Insert: {
          base_index_date: string
          base_index_value: number
          created_at?: string
          current_index_value?: number | null
          id?: string
          index_type?: string
          is_active?: boolean
          notes?: string | null
          tenant_id: string
          threshold_percent?: number
          updated_at?: string
        }
        Update: {
          base_index_date?: string
          base_index_value?: number
          created_at?: string
          current_index_value?: number | null
          id?: string
          index_type?: string
          is_active?: boolean
          notes?: string | null
          tenant_id?: string
          threshold_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_index_clauses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_index_clauses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_approve_invoices: boolean | null
          can_edit_finances: boolean | null
          can_manage_maintenance: boolean | null
          can_manage_users: boolean | null
          can_send_messages: boolean | null
          can_view_finances: boolean | null
          can_view_full_tenant_data: boolean | null
          created_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          can_approve_invoices?: boolean | null
          can_edit_finances?: boolean | null
          can_manage_maintenance?: boolean | null
          can_manage_users?: boolean | null
          can_send_messages?: boolean | null
          can_view_finances?: boolean | null
          can_view_full_tenant_data?: boolean | null
          created_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          can_approve_invoices?: boolean | null
          can_edit_finances?: boolean | null
          can_manage_maintenance?: boolean | null
          can_manage_users?: boolean | null
          can_send_messages?: boolean | null
          can_view_finances?: boolean | null
          can_view_full_tenant_data?: boolean | null
          created_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      sensitive_data_access_log: {
        Row: {
          access_type: string
          accessed_at: string
          id: string
          ip_address: unknown
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string
          id?: string
          ip_address?: unknown
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sepa_collection_items: {
        Row: {
          amount: number
          collection_id: string
          created_at: string
          id: string
          mandate_reference: string | null
          notes: string | null
          payment_id: string | null
          return_date: string | null
          return_reason: string | null
          status: Database["public"]["Enums"]["sepa_item_status"]
          tenant_iban: string | null
          tenant_id: string | null
          tenant_name: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          collection_id: string
          created_at?: string
          id?: string
          mandate_reference?: string | null
          notes?: string | null
          payment_id?: string | null
          return_date?: string | null
          return_reason?: string | null
          status?: Database["public"]["Enums"]["sepa_item_status"]
          tenant_iban?: string | null
          tenant_id?: string | null
          tenant_name: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          collection_id?: string
          created_at?: string
          id?: string
          mandate_reference?: string | null
          notes?: string | null
          payment_id?: string | null
          return_date?: string | null
          return_reason?: string | null
          status?: Database["public"]["Enums"]["sepa_item_status"]
          tenant_iban?: string | null
          tenant_id?: string | null
          tenant_name?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sepa_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "sepa_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sepa_collection_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sepa_collection_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sepa_collection_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sepa_collection_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sepa_collections: {
        Row: {
          collection_date: string
          created_at: string
          creditor_iban: string | null
          creditor_name: string | null
          id: string
          item_count: number
          message_id: string
          notes: string | null
          organization_id: string | null
          status: Database["public"]["Enums"]["sepa_collection_status"]
          total_amount: number
          updated_at: string
          xml_filename: string | null
        }
        Insert: {
          collection_date: string
          created_at?: string
          creditor_iban?: string | null
          creditor_name?: string | null
          id?: string
          item_count?: number
          message_id: string
          notes?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["sepa_collection_status"]
          total_amount?: number
          updated_at?: string
          xml_filename?: string | null
        }
        Update: {
          collection_date?: string
          created_at?: string
          creditor_iban?: string | null
          creditor_name?: string | null
          id?: string
          item_count?: number
          message_id?: string
          notes?: string | null
          organization_id?: string | null
          status?: Database["public"]["Enums"]["sepa_collection_status"]
          total_amount?: number
          updated_at?: string
          xml_filename?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sepa_collections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            foreignKeyName: "settlement_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
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
      task_comments: {
        Row: {
          comment: string
          created_at: string | null
          created_by: string | null
          id: string
          is_internal: boolean | null
          maintenance_task_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_internal?: boolean | null
          maintenance_task_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_internal?: boolean | null
          maintenance_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_maintenance_task_id_fkey"
            columns: ["maintenance_task_id"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_deposits: {
        Row: {
          bank_account: string | null
          created_at: string
          deduction_notes: string | null
          deductions: number | null
          deposit_amount: number
          deposit_paid_date: string | null
          deposit_returned_amount: number | null
          deposit_returned_date: string | null
          deposit_type: string
          id: string
          interest_accrued: number | null
          interest_rate: number | null
          last_interest_calc_date: string | null
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          created_at?: string
          deduction_notes?: string | null
          deductions?: number | null
          deposit_amount?: number
          deposit_paid_date?: string | null
          deposit_returned_amount?: number | null
          deposit_returned_date?: string | null
          deposit_type?: string
          id?: string
          interest_accrued?: number | null
          interest_rate?: number | null
          last_interest_calc_date?: string | null
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          created_at?: string
          deduction_notes?: string | null
          deductions?: number | null
          deposit_amount?: number
          deposit_paid_date?: string | null
          deposit_returned_amount?: number | null
          deposit_returned_date?: string | null
          deposit_type?: string
          id?: string
          interest_accrued?: number | null
          interest_rate?: number | null
          last_interest_calc_date?: string | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_deposits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_deposits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_documents: {
        Row: {
          file_url: string
          id: string
          name: string
          tenant_id: string
          type: string
          uploaded_at: string | null
        }
        Insert: {
          file_url: string
          id?: string
          name: string
          tenant_id: string
          type: string
          uploaded_at?: string | null
        }
        Update: {
          file_url?: string
          id?: string
          name?: string
          tenant_id?: string
          type?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_fees: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          fee_type: Database["public"]["Enums"]["fee_type"]
          id: string
          notes: string | null
          paid_at: string | null
          payment_id: string | null
          sepa_item_id: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          fee_type?: Database["public"]["Enums"]["fee_type"]
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          sepa_item_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          fee_type?: Database["public"]["Enums"]["fee_type"]
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          sepa_item_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_fees_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_fees_sepa_item_id_fkey"
            columns: ["sepa_item_id"]
            isOneToOne: false
            referencedRelation: "sepa_collection_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_fees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_fees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
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
          vorschuss_gueltig_ab: string | null
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
          vorschuss_gueltig_ab?: string | null
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
          vorschuss_gueltig_ab?: string | null
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
      transaction_splits: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          booking_date: string | null
          budget_position: number | null
          category_id: string | null
          counterpart_iban: string | null
          counterpart_name: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_split: boolean | null
          match_confidence: number | null
          matched_at: string | null
          matched_by: string | null
          notes: string | null
          organization_id: string | null
          property_id: string | null
          reference: string | null
          status: string
          tags: string[] | null
          tenant_id: string | null
          transaction_date: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          booking_date?: string | null
          budget_position?: number | null
          category_id?: string | null
          counterpart_iban?: string | null
          counterpart_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_split?: boolean | null
          match_confidence?: number | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          organization_id?: string | null
          property_id?: string | null
          reference?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string | null
          transaction_date: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          booking_date?: string | null
          budget_position?: number | null
          category_id?: string | null
          counterpart_iban?: string | null
          counterpart_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_split?: boolean | null
          match_confidence?: number | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          organization_id?: string | null
          property_id?: string | null
          reference?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string | null
          transaction_date?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
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
      unit_distribution_values: {
        Row: {
          created_at: string
          distribution_key_id: string
          id: string
          unit_id: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          distribution_key_id: string
          id?: string
          unit_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          distribution_key_id?: string
          id?: string
          unit_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_distribution_values_distribution_key_id_fkey"
            columns: ["distribution_key_id"]
            isOneToOne: false
            referencedRelation: "distribution_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_distribution_values_unit_id_fkey"
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
          ausstattungskategorie:
            | Database["public"]["Enums"]["ausstattungskategorie"]
            | null
          created_at: string
          floor: number | null
          id: string
          mea: number
          mrg_scope: Database["public"]["Enums"]["mrg_scope"] | null
          nutzflaeche_mrg: number | null
          property_id: string
          qm: number
          richtwertmiete_basis: number | null
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
          ausstattungskategorie?:
            | Database["public"]["Enums"]["ausstattungskategorie"]
            | null
          created_at?: string
          floor?: number | null
          id?: string
          mea?: number
          mrg_scope?: Database["public"]["Enums"]["mrg_scope"] | null
          nutzflaeche_mrg?: number | null
          property_id: string
          qm?: number
          richtwertmiete_basis?: number | null
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
          ausstattungskategorie?:
            | Database["public"]["Enums"]["ausstattungskategorie"]
            | null
          created_at?: string
          floor?: number | null
          id?: string
          mea?: number
          mrg_scope?: Database["public"]["Enums"]["mrg_scope"] | null
          nutzflaeche_mrg?: number | null
          property_id?: string
          qm?: number
          richtwertmiete_basis?: number | null
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
      weg_assemblies: {
        Row: {
          assembly_date: string
          created_at: string
          id: string
          location: string | null
          notes: string | null
          organization_id: string | null
          property_id: string
          protocol_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assembly_date: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          organization_id?: string | null
          property_id: string
          protocol_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assembly_date?: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          organization_id?: string | null
          property_id?: string
          protocol_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weg_assemblies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weg_assemblies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      weg_reserve_fund: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          entry_type: string
          id: string
          month: number
          organization_id: string | null
          property_id: string
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          entry_type?: string
          id?: string
          month: number
          organization_id?: string | null
          property_id: string
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          entry_type?: string
          id?: string
          month?: number
          organization_id?: string | null
          property_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weg_reserve_fund_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weg_reserve_fund_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      weg_votes: {
        Row: {
          assembly_id: string
          created_at: string
          description: string | null
          id: string
          result: string | null
          topic: string
          votes_abstain: number
          votes_no: number
          votes_yes: number
        }
        Insert: {
          assembly_id: string
          created_at?: string
          description?: string | null
          id?: string
          result?: string | null
          topic: string
          votes_abstain?: number
          votes_no?: number
          votes_yes?: number
        }
        Update: {
          assembly_id?: string
          created_at?: string
          description?: string | null
          id?: string
          result?: string | null
          topic?: string
          votes_abstain?: number
          votes_no?: number
          votes_yes?: number
        }
        Relationships: [
          {
            foreignKeyName: "weg_votes_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "weg_assemblies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      tenants_safe: {
        Row: {
          betriebskosten_vorschuss: number | null
          bic: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          grundmiete: number | null
          heizungskosten_vorschuss: number | null
          iban: string | null
          id: string | null
          kaution: number | null
          kaution_bezahlt: boolean | null
          last_name: string | null
          mandat_reference: string | null
          mietbeginn: string | null
          mietende: string | null
          phone: string | null
          sepa_mandat: boolean | null
          status: Database["public"]["Enums"]["tenant_status"] | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          betriebskosten_vorschuss?: number | null
          bic?: never
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          grundmiete?: number | null
          heizungskosten_vorschuss?: number | null
          iban?: never
          id?: string | null
          kaution?: number | null
          kaution_bezahlt?: boolean | null
          last_name?: string | null
          mandat_reference?: string | null
          mietbeginn?: string | null
          mietende?: string | null
          phone?: string | null
          sepa_mandat?: boolean | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          betriebskosten_vorschuss?: number | null
          bic?: never
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          grundmiete?: number | null
          heizungskosten_vorschuss?: number | null
          iban?: never
          id?: string | null
          kaution?: number | null
          kaution_bezahlt?: boolean | null
          last_name?: string | null
          mandat_reference?: string | null
          mietbeginn?: string | null
          mietende?: string | null
          phone?: string | null
          sepa_mandat?: boolean | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          unit_id?: string | null
          updated_at?: string | null
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
      transactions_safe: {
        Row: {
          amount: number | null
          bank_account_id: string | null
          booking_date: string | null
          category_id: string | null
          counterpart_iban: string | null
          counterpart_name: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          is_split: boolean | null
          match_confidence: number | null
          matched_at: string | null
          matched_by: string | null
          notes: string | null
          organization_id: string | null
          property_id: string | null
          reference: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string | null
          transaction_date: string | null
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          bank_account_id?: string | null
          booking_date?: string | null
          category_id?: string | null
          counterpart_iban?: never
          counterpart_name?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          is_split?: boolean | null
          match_confidence?: number | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          organization_id?: string | null
          property_id?: string | null
          reference?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          transaction_date?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          bank_account_id?: string | null
          booking_date?: string | null
          category_id?: string | null
          counterpart_iban?: never
          counterpart_name?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          is_split?: boolean | null
          match_confidence?: number | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          organization_id?: string | null
          property_id?: string | null
          reference?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          transaction_date?: string | null
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants_safe"
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
      uva_data: {
        Row: {
          jahr: number | null
          monat: number | null
          netto_aufwaende: number | null
          netto_umsaetze: number | null
          organization_id: string | null
          ust_betrag: number | null
          vorsteuer_betrag: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_bank_balance: {
        Args: { account_id: string; as_of_date?: string }
        Returns: number
      }
      get_managed_property_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_finance_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_property_manager: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      is_property_unassigned: {
        Args: { _property_id: string }
        Returns: boolean
      }
      log_sensitive_access: {
        Args: { _access_type: string; _record_id?: string; _table_name: string }
        Returns: undefined
      }
      next_booking_number: { Args: { _org_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "property_manager" | "finance" | "viewer" | "tester"
      ausstattungskategorie: "A" | "B" | "C" | "D"
      expense_category:
        | "betriebskosten_umlagefaehig"
        | "instandhaltung"
        | "sonstige_kosten"
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
        | "makler"
        | "notar"
        | "grundbuch"
        | "finanzierung"
      fee_type: "ruecklastschrift" | "mahnung" | "sonstiges"
      invoice_status: "offen" | "bezahlt" | "teilbezahlt" | "ueberfaellig"
      mrg_bk_kategorie:
        | "wasserversorgung"
        | "abwasserentsorgung"
        | "rauchfangkehrer"
        | "muellabfuhr"
        | "schaedlingsbekaempfung"
        | "beleuchtung_allgemein"
        | "feuerversicherung"
        | "haftpflicht_haus"
        | "leitungswasserschaden"
        | "hausbesorger"
        | "hausbetreuung"
        | "lift_betrieb"
        | "lift_wartung"
        | "gemeinschaftsanlagen"
        | "oeffentliche_abgaben"
        | "verwaltungshonorar"
        | "ruecklage"
        | "heizung_betrieb"
        | "heizung_wartung"
        | "warmwasser"
        | "nicht_umlagefaehig"
      mrg_scope: "vollanwendung" | "teilanwendung" | "ausgenommen"
      payment_type: "sepa" | "ueberweisung" | "bar" | "sonstiges"
      sepa_collection_status:
        | "pending"
        | "exported"
        | "partially_completed"
        | "completed"
      sepa_item_status: "pending" | "successful" | "returned" | "rejected"
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
      app_role: ["admin", "property_manager", "finance", "viewer", "tester"],
      ausstattungskategorie: ["A", "B", "C", "D"],
      expense_category: [
        "betriebskosten_umlagefaehig",
        "instandhaltung",
        "sonstige_kosten",
      ],
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
        "makler",
        "notar",
        "grundbuch",
        "finanzierung",
      ],
      fee_type: ["ruecklastschrift", "mahnung", "sonstiges"],
      invoice_status: ["offen", "bezahlt", "teilbezahlt", "ueberfaellig"],
      mrg_bk_kategorie: [
        "wasserversorgung",
        "abwasserentsorgung",
        "rauchfangkehrer",
        "muellabfuhr",
        "schaedlingsbekaempfung",
        "beleuchtung_allgemein",
        "feuerversicherung",
        "haftpflicht_haus",
        "leitungswasserschaden",
        "hausbesorger",
        "hausbetreuung",
        "lift_betrieb",
        "lift_wartung",
        "gemeinschaftsanlagen",
        "oeffentliche_abgaben",
        "verwaltungshonorar",
        "ruecklage",
        "heizung_betrieb",
        "heizung_wartung",
        "warmwasser",
        "nicht_umlagefaehig",
      ],
      mrg_scope: ["vollanwendung", "teilanwendung", "ausgenommen"],
      payment_type: ["sepa", "ueberweisung", "bar", "sonstiges"],
      sepa_collection_status: [
        "pending",
        "exported",
        "partially_completed",
        "completed",
      ],
      sepa_item_status: ["pending", "successful", "returned", "rejected"],
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
