export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      approval_requests: {
        Row: {
          action_type: string
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          denied_reason: string | null
          expires_at: string | null
          id: string
          justification: string
          new_values: Json
          old_values: Json | null
          page_code: string
          priority: string | null
          record_id: string
          requested_by: string
          status: string | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          action_type: string
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          denied_reason?: string | null
          expires_at?: string | null
          id?: string
          justification: string
          new_values: Json
          old_values?: Json | null
          page_code: string
          priority?: string | null
          record_id: string
          requested_by: string
          status?: string | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          denied_reason?: string | null
          expires_at?: string | null
          id?: string
          justification?: string
          new_values?: Json
          old_values?: Json | null
          page_code?: string
          priority?: string | null
          record_id?: string
          requested_by?: string
          status?: string | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_requests_page_code_fkey"
            columns: ["page_code"]
            isOneToOne: false
            referencedRelation: "system_pages"
            referencedColumns: ["page_code"]
          },
          {
            foreignKeyName: "approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      approval_workflow_log: {
        Row: {
          action: string
          approval_request_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          approval_request_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          approval_request_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_log_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflow_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflow_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          customer_id: number
          email: string | null
          id: number
          is_primary: boolean | null
          location: string | null
          name: string | null
          phone: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: number
          email?: string | null
          id?: number
          is_primary?: boolean | null
          location?: string | null
          name?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: number
          email?: string | null
          id?: number
          is_primary?: boolean | null
          location?: string | null
          name?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          broker_name: string | null
          contact_email: string | null
          created_at: string | null
          ein: string | null
          id: number
          industry: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          broker_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          ein?: string | null
          id?: number
          industry?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          broker_name?: string | null
          contact_email?: string | null
          created_at?: string | null
          ein?: string | null
          id?: number
          industry?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string
          email_confirmed: boolean | null
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          job_title: string | null
          last_login: string | null
          manager_id: string | null
          must_change_password: boolean | null
          name: string
          phone: string | null
          role: string
          status: string | null
          temp_password: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email: string
          email_confirmed?: boolean | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          job_title?: string | null
          last_login?: string | null
          manager_id?: string | null
          must_change_password?: boolean | null
          name: string
          phone?: string | null
          role?: string
          status?: string | null
          temp_password?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string
          email_confirmed?: boolean | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          job_title?: string | null
          last_login?: string | null
          manager_id?: string | null
          must_change_password?: boolean | null
          name?: string
          phone?: string | null
          role?: string
          status?: string | null
          temp_password?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      entry_grand_totals: {
        Row: {
          created_at: string
          entry_summary_id: number
          estimated_total_amount: number | null
          grand_total_antidumping_duty_amount: number | null
          grand_total_countervailing_duty_amount: number | null
          grand_total_duty_amount: number | null
          grand_total_tax_amount: number | null
          grand_total_user_fee_amount: number | null
          id: number
          total_entered_value: number | null
        }
        Insert: {
          created_at?: string
          entry_summary_id: number
          estimated_total_amount?: number | null
          grand_total_antidumping_duty_amount?: number | null
          grand_total_countervailing_duty_amount?: number | null
          grand_total_duty_amount?: number | null
          grand_total_tax_amount?: number | null
          grand_total_user_fee_amount?: number | null
          id?: number
          total_entered_value?: number | null
        }
        Update: {
          created_at?: string
          entry_summary_id?: number
          estimated_total_amount?: number | null
          grand_total_antidumping_duty_amount?: number | null
          grand_total_countervailing_duty_amount?: number | null
          grand_total_duty_amount?: number | null
          grand_total_tax_amount?: number | null
          grand_total_user_fee_amount?: number | null
          id?: number
          total_entered_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_grand_totals_entry_summary_id_fkey"
            columns: ["entry_summary_id"]
            isOneToOne: true
            referencedRelation: "entry_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_group_preshipments: {
        Row: {
          added_at: string
          added_by: string | null
          assignment_notes: string | null
          group_id: number
          id: number
          preshipment_id: number
          preshipment_parts_count: number | null
          preshipment_status: string | null
          preshipment_value: number | null
          validated: boolean | null
          validation_warnings: string[] | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          assignment_notes?: string | null
          group_id: number
          id?: number
          preshipment_id: number
          preshipment_parts_count?: number | null
          preshipment_status?: string | null
          preshipment_value?: number | null
          validated?: boolean | null
          validation_warnings?: string[] | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          assignment_notes?: string | null
          group_id?: number
          id?: number
          preshipment_id?: number
          preshipment_parts_count?: number | null
          preshipment_status?: string | null
          preshipment_value?: number | null
          validated?: boolean | null
          validation_warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_group_preshipments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "entry_summary_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_group_preshipments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "entry_summary_groups_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_group_preshipments_preshipment_id_fkey"
            columns: ["preshipment_id"]
            isOneToOne: false
            referencedRelation: "preshipments"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_summaries: {
        Row: {
          accepted_at: string | null
          ace_response_message: string | null
          bill_of_lading_number: string | null
          bond_type_code: string | null
          carrier_code: string | null
          consignee_id: number | null
          consolidated_summary_indicator: string
          created_at: string
          created_by: string | null
          date_of_importation: string | null
          entry_filer_code: string
          entry_number: string
          entry_type_code: string
          filed_at: string | null
          filing_status: string
          foreign_trade_zone_identifier: string | null
          group_id: number | null
          id: number
          importer_of_record_number: string | null
          importing_conveyance_name: string | null
          manufacturer_address: string | null
          manufacturer_name: string | null
          preshipment_id: number | null
          record_district_port_of_entry: string
          seller_address: string | null
          seller_name: string | null
          summary_filing_action_request_code: string
          surety_company_code: string | null
          updated_at: string
          voyage_flight_trip_number: string | null
        }
        Insert: {
          accepted_at?: string | null
          ace_response_message?: string | null
          bill_of_lading_number?: string | null
          bond_type_code?: string | null
          carrier_code?: string | null
          consignee_id?: number | null
          consolidated_summary_indicator?: string
          created_at?: string
          created_by?: string | null
          date_of_importation?: string | null
          entry_filer_code: string
          entry_number: string
          entry_type_code?: string
          filed_at?: string | null
          filing_status?: string
          foreign_trade_zone_identifier?: string | null
          group_id?: number | null
          id?: number
          importer_of_record_number?: string | null
          importing_conveyance_name?: string | null
          manufacturer_address?: string | null
          manufacturer_name?: string | null
          preshipment_id?: number | null
          record_district_port_of_entry: string
          seller_address?: string | null
          seller_name?: string | null
          summary_filing_action_request_code?: string
          surety_company_code?: string | null
          updated_at?: string
          voyage_flight_trip_number?: string | null
        }
        Update: {
          accepted_at?: string | null
          ace_response_message?: string | null
          bill_of_lading_number?: string | null
          bond_type_code?: string | null
          carrier_code?: string | null
          consignee_id?: number | null
          consolidated_summary_indicator?: string
          created_at?: string
          created_by?: string | null
          date_of_importation?: string | null
          entry_filer_code?: string
          entry_number?: string
          entry_type_code?: string
          filed_at?: string | null
          filing_status?: string
          foreign_trade_zone_identifier?: string | null
          group_id?: number | null
          id?: number
          importer_of_record_number?: string | null
          importing_conveyance_name?: string | null
          manufacturer_address?: string | null
          manufacturer_name?: string | null
          preshipment_id?: number | null
          record_district_port_of_entry?: string
          seller_address?: string | null
          seller_name?: string | null
          summary_filing_action_request_code?: string
          surety_company_code?: string | null
          updated_at?: string
          voyage_flight_trip_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_summaries_consignee_id_fkey"
            columns: ["consignee_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_summaries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "entry_summary_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_summaries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "entry_summary_groups_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_summaries_preshipment_id_fkey"
            columns: ["preshipment_id"]
            isOneToOne: false
            referencedRelation: "preshipments"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_summary_groups: {
        Row: {
          created_at: string
          created_by: string | null
          entry_filer_code: string
          entry_number: string | null
          entry_quarter: number
          entry_year: number
          estimated_total_duties: number | null
          estimated_total_taxes: number | null
          estimated_total_value: number | null
          filed_at: string | null
          filed_by: string | null
          filing_district_port: string
          foreign_trade_zone_identifier: string | null
          group_description: string | null
          group_name: string
          id: number
          status: string
          target_entry_date: string | null
          updated_at: string
          updated_by: string | null
          week_ending_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_filer_code: string
          entry_number?: string | null
          entry_quarter: number
          entry_year: number
          estimated_total_duties?: number | null
          estimated_total_taxes?: number | null
          estimated_total_value?: number | null
          filed_at?: string | null
          filed_by?: string | null
          filing_district_port: string
          foreign_trade_zone_identifier?: string | null
          group_description?: string | null
          group_name: string
          id?: number
          status?: string
          target_entry_date?: string | null
          updated_at?: string
          updated_by?: string | null
          week_ending_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_filer_code?: string
          entry_number?: string | null
          entry_quarter?: number
          entry_year?: number
          estimated_total_duties?: number | null
          estimated_total_taxes?: number | null
          estimated_total_value?: number | null
          filed_at?: string | null
          filed_by?: string | null
          filing_district_port?: string
          foreign_trade_zone_identifier?: string | null
          group_description?: string | null
          group_name?: string
          id?: number
          status?: string
          target_entry_date?: string | null
          updated_at?: string
          updated_by?: string | null
          week_ending_date?: string
        }
        Relationships: []
      }
      entry_summary_line_items: {
        Row: {
          commodity_description: string
          consolidation_metadata: Json | null
          country_of_origin: string
          created_at: string
          duty_amount: number | null
          duty_rate: number | null
          entry_summary_id: number
          hts_code: string
          id: number
          line_number: number
          lot_id: string | null
          part_id: string | null
          quantity: number
          total_value: number
          unit_of_measure: string | null
          unit_value: number
        }
        Insert: {
          commodity_description: string
          consolidation_metadata?: Json | null
          country_of_origin: string
          created_at?: string
          duty_amount?: number | null
          duty_rate?: number | null
          entry_summary_id: number
          hts_code: string
          id?: number
          line_number: number
          lot_id?: string | null
          part_id?: string | null
          quantity: number
          total_value: number
          unit_of_measure?: string | null
          unit_value: number
        }
        Update: {
          commodity_description?: string
          consolidation_metadata?: Json | null
          country_of_origin?: string
          created_at?: string
          duty_amount?: number | null
          duty_rate?: number | null
          entry_summary_id?: number
          hts_code?: string
          id?: number
          line_number?: number
          lot_id?: string | null
          part_id?: string | null
          quantity?: number
          total_value?: number
          unit_of_measure?: string | null
          unit_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "entry_summary_line_items_entry_summary_id_fkey"
            columns: ["entry_summary_id"]
            isOneToOne: false
            referencedRelation: "entry_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_summary_line_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_summary_line_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      foreign_ports: {
        Row: {
          country_code: string | null
          created_at: string
          id: string
          port_name: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          id?: string
          port_name: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          id?: string
          port_name?: string
        }
        Relationships: []
      }
      ftz_status_records: {
        Row: {
          created_at: string
          entry_line_item_id: number
          ftz_line_item_quantity: number
          ftz_merchandise_status_code: string
          id: number
          privileged_ftz_merchandise_filing_date: string | null
        }
        Insert: {
          created_at?: string
          entry_line_item_id: number
          ftz_line_item_quantity: number
          ftz_merchandise_status_code?: string
          id?: number
          privileged_ftz_merchandise_filing_date?: string | null
        }
        Update: {
          created_at?: string
          entry_line_item_id?: number
          ftz_line_item_quantity?: number
          ftz_merchandise_status_code?: string
          id?: number
          privileged_ftz_merchandise_filing_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ftz_status_records_entry_line_item_id_fkey"
            columns: ["entry_line_item_id"]
            isOneToOne: false
            referencedRelation: "entry_summary_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          created_at: string | null
          id: number
          location_id: number
          lot_id: string
          notes: string | null
          placed_at: string | null
          placed_by: string | null
          quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          location_id: number
          lot_id: string
          notes?: string | null
          placed_at?: string | null
          placed_by?: string | null
          quantity: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          location_id?: number
          lot_id?: string
          notes?: string | null
          placed_at?: string | null
          placed_by?: string | null
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_locations_location_id"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_locations_lot_id"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_locations_placed_by"
            columns: ["placed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_inventory_locations_placed_by"
            columns: ["placed_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inventory_lots: {
        Row: {
          created_at: string
          customer_id: number
          id: string
          part_id: string
          quantity: number
          status: string | null
          storage_location_id: number | null
          total_value: number
          unit_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: number
          id: string
          part_id: string
          quantity: number
          status?: string | null
          storage_location_id?: number | null
          total_value: number
          unit_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: number
          id?: string
          part_id?: string
          quantity?: number
          status?: string | null
          storage_location_id?: number | null
          total_value?: number
          unit_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string | null
          email: string
          id: number
          ip_address: unknown | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          ip_address?: unknown | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          ip_address?: unknown | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      material_indices: {
        Row: {
          created_at: string
          created_by: string | null
          data_period: string | null
          fx_rate_cny_usd: number | null
          id: number
          index_source: string
          material: string
          price_date: string
          price_usd_per_mt: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_period?: string | null
          fx_rate_cny_usd?: number | null
          id?: number
          index_source?: string
          material: string
          price_date: string
          price_usd_per_mt: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_period?: string | null
          fx_rate_cny_usd?: number | null
          id?: number
          index_source?: string
          material?: string
          price_date?: string
          price_usd_per_mt?: number
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string
          code: string
          color: string | null
          created_at: string | null
          created_by: string | null
          density: number | null
          description: string | null
          icon: string | null
          id: number
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          density?: number | null
          description?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          density?: number | null
          description?: string | null
          icon?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      part_pricing_history: {
        Row: {
          adjustment_id: number
          created_at: string | null
          created_by: string | null
          effective_date: string
          id: string
          material_weight: number
          new_material_price: number
          new_total_price: number
          old_material_price: number
          old_total_price: number
          part_id: string
          price_adjustment_per_kg: number
        }
        Insert: {
          adjustment_id: number
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          id?: string
          material_weight: number
          new_material_price: number
          new_total_price: number
          old_material_price: number
          old_total_price: number
          part_id: string
          price_adjustment_per_kg: number
        }
        Update: {
          adjustment_id?: number
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          id?: string
          material_weight?: number
          new_material_price?: number
          new_total_price?: number
          old_material_price?: number
          old_total_price?: number
          part_id?: string
          price_adjustment_per_kg?: number
        }
        Relationships: []
      }
      part_suppliers: {
        Row: {
          created_at: string
          id: number
          part_id: string
          supplier_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          part_id: string
          supplier_id: number
        }
        Update: {
          created_at?: string
          id?: number
          part_id?: string
          supplier_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "part_suppliers_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "part_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          country_of_origin: string | null
          description: string
          gross_weight: number | null
          hts_code: string | null
          id: string
          labor_price: number | null
          last_price_update: string | null
          manufacturer_id: string | null
          material: string | null
          material_price: number | null
          material_weight: number | null
          overhead_price: number | null
          package_quantity: number | null
          package_type: string | null
          price_source: string | null
          standard_value: number | null
          unit_of_measure: string | null
        }
        Insert: {
          country_of_origin?: string | null
          description: string
          gross_weight?: number | null
          hts_code?: string | null
          id: string
          labor_price?: number | null
          last_price_update?: string | null
          manufacturer_id?: string | null
          material?: string | null
          material_price?: number | null
          material_weight?: number | null
          overhead_price?: number | null
          package_quantity?: number | null
          package_type?: string | null
          price_source?: string | null
          standard_value?: number | null
          unit_of_measure?: string | null
        }
        Update: {
          country_of_origin?: string | null
          description?: string
          gross_weight?: number | null
          hts_code?: string | null
          id?: string
          labor_price?: number | null
          last_price_update?: string | null
          manufacturer_id?: string | null
          material?: string | null
          material_price?: number | null
          material_weight?: number | null
          overhead_price?: number | null
          package_quantity?: number | null
          package_type?: string | null
          price_source?: string | null
          standard_value?: number | null
          unit_of_measure?: string | null
        }
        Relationships: []
      }
      permission_audit_log: {
        Row: {
          action: string
          change_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          module_code: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          change_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          module_code: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          change_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          module_code?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "permission_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      permission_inheritance: {
        Row: {
          created_at: string | null
          custom_overrides_count: number | null
          id: string
          last_template_applied_at: string | null
          notes: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_overrides_count?: number | null
          id?: string
          last_template_applied_at?: string | null
          notes?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_overrides_count?: number | null
          id?: string
          last_template_applied_at?: string | null
          notes?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_inheritance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_inheritance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      permission_modules: {
        Row: {
          available_actions: string[]
          created_at: string | null
          description: string | null
          display_order: number | null
          is_active: boolean | null
          module_category: string
          module_code: string
          module_name: string
          updated_at: string | null
        }
        Insert: {
          available_actions?: string[]
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          is_active?: boolean | null
          module_category: string
          module_code: string
          module_name: string
          updated_at?: string | null
        }
        Update: {
          available_actions?: string[]
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          is_active?: boolean | null
          module_category?: string
          module_code?: string
          module_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      permission_templates: {
        Row: {
          action: string
          created_at: string | null
          default_granted: boolean
          description: string | null
          id: string
          module_code: string
          role: string
          updated_at: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          default_granted?: boolean
          description?: string | null
          id?: string
          module_code: string
          role: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          default_granted?: boolean
          description?: string | null
          id?: string
          module_code?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_templates_module_code_fkey"
            columns: ["module_code"]
            isOneToOne: false
            referencedRelation: "module_permission_matrix"
            referencedColumns: ["module_code"]
          },
          {
            foreignKeyName: "permission_templates_module_code_fkey"
            columns: ["module_code"]
            isOneToOne: false
            referencedRelation: "permission_modules"
            referencedColumns: ["module_code"]
          },
        ]
      }
      preadmissions: {
        Row: {
          admission_id: string
          arrival_date: string | null
          bol_date: string | null
          bond_amount: number | null
          carrier_name: string | null
          container_number: string | null
          created_at: string | null
          customer_id: number | null
          dock_location: string | null
          driver_license_number: string | null
          driver_name: string | null
          e214: string | null
          entry_number: string | null
          freight_invoice_date: string | null
          id: number
          items: Json | null
          license_plate_number: string | null
          luc_ship_date: string | null
          primary_supplier_name: string | null
          processed_at: string | null
          seal_number: string | null
          ship_invoice_number: string | null
          shipment_lot_id: string | null
          signature_data: Json | null
          status: string | null
          uscbp_master_billing: string | null
          year: number | null
          zone_status: string | null
        }
        Insert: {
          admission_id: string
          arrival_date?: string | null
          bol_date?: string | null
          bond_amount?: number | null
          carrier_name?: string | null
          container_number?: string | null
          created_at?: string | null
          customer_id?: number | null
          dock_location?: string | null
          driver_license_number?: string | null
          driver_name?: string | null
          e214?: string | null
          entry_number?: string | null
          freight_invoice_date?: string | null
          id?: number
          items?: Json | null
          license_plate_number?: string | null
          luc_ship_date?: string | null
          primary_supplier_name?: string | null
          processed_at?: string | null
          seal_number?: string | null
          ship_invoice_number?: string | null
          shipment_lot_id?: string | null
          signature_data?: Json | null
          status?: string | null
          uscbp_master_billing?: string | null
          year?: number | null
          zone_status?: string | null
        }
        Update: {
          admission_id?: string
          arrival_date?: string | null
          bol_date?: string | null
          bond_amount?: number | null
          carrier_name?: string | null
          container_number?: string | null
          created_at?: string | null
          customer_id?: number | null
          dock_location?: string | null
          driver_license_number?: string | null
          driver_name?: string | null
          e214?: string | null
          entry_number?: string | null
          freight_invoice_date?: string | null
          id?: number
          items?: Json | null
          license_plate_number?: string | null
          luc_ship_date?: string | null
          primary_supplier_name?: string | null
          processed_at?: string | null
          seal_number?: string | null
          ship_invoice_number?: string | null
          shipment_lot_id?: string | null
          signature_data?: Json | null
          status?: string | null
          uscbp_master_billing?: string | null
          year?: number | null
          zone_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preadmissions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      preshipments: {
        Row: {
          carrier_name: string | null
          created_at: string | null
          customer_id: number
          driver_license_number: string | null
          driver_name: string | null
          entry_number: string | null
          entry_summary_id: number | null
          entry_summary_status: string | null
          id: number
          is_grouped: boolean | null
          items: Json | null
          license_plate_number: string | null
          shipment_id: string
          shipped_at: string | null
          signature_data: Json | null
          stage: string
          type: string
        }
        Insert: {
          carrier_name?: string | null
          created_at?: string | null
          customer_id: number
          driver_license_number?: string | null
          driver_name?: string | null
          entry_number?: string | null
          entry_summary_id?: number | null
          entry_summary_status?: string | null
          id?: number
          is_grouped?: boolean | null
          items?: Json | null
          license_plate_number?: string | null
          shipment_id: string
          shipped_at?: string | null
          signature_data?: Json | null
          stage?: string
          type: string
        }
        Update: {
          carrier_name?: string | null
          created_at?: string | null
          customer_id?: number
          driver_license_number?: string | null
          driver_name?: string | null
          entry_number?: string | null
          entry_summary_id?: number | null
          entry_summary_status?: string | null
          id?: number
          is_grouped?: boolean | null
          items?: Json | null
          license_plate_number?: string | null
          shipment_id?: string
          shipped_at?: string | null
          signature_data?: Json | null
          stage?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "preshipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_adjustments: {
        Row: {
          adjustment_name: string
          applied_at: string | null
          communication_month: string | null
          created_at: string
          created_by: string | null
          customers_affected: number | null
          data_months: Json | null
          effective_date: string
          effective_month: string | null
          formula_config: Json | null
          fx_rate_cny_usd: number | null
          id: number
          material: string
          new_price_usd_per_mt: number | null
          old_average_price: number | null
          parts_affected: number | null
          percentage_change: number | null
          previous_price_usd_per_mt: number | null
          pricing_formula: string | null
          quarter: string
          source: string | null
          status: string | null
          total_cost_impact: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          adjustment_name: string
          applied_at?: string | null
          communication_month?: string | null
          created_at?: string
          created_by?: string | null
          customers_affected?: number | null
          data_months?: Json | null
          effective_date: string
          effective_month?: string | null
          formula_config?: Json | null
          fx_rate_cny_usd?: number | null
          id?: number
          material: string
          new_price_usd_per_mt?: number | null
          old_average_price?: number | null
          parts_affected?: number | null
          percentage_change?: number | null
          previous_price_usd_per_mt?: number | null
          pricing_formula?: string | null
          quarter: string
          source?: string | null
          status?: string | null
          total_cost_impact?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          adjustment_name?: string
          applied_at?: string | null
          communication_month?: string | null
          created_at?: string
          created_by?: string | null
          customers_affected?: number | null
          data_months?: Json | null
          effective_date?: string
          effective_month?: string | null
          formula_config?: Json | null
          fx_rate_cny_usd?: number | null
          id?: number
          material?: string
          new_price_usd_per_mt?: number | null
          old_average_price?: number | null
          parts_affected?: number | null
          percentage_change?: number | null
          previous_price_usd_per_mt?: number | null
          pricing_formula?: string | null
          quarter?: string
          source?: string | null
          status?: string | null
          total_cost_impact?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      shipping_labels: {
        Row: {
          carrier: string
          created_at: string
          created_by: string | null
          id: string
          items: Json
          label_format: string | null
          label_url: string | null
          package_info: Json
          service_type: string
          ship_from: Json
          ship_to: Json
          shipment_id: string
          tracking_number: string
        }
        Insert: {
          carrier: string
          created_at?: string
          created_by?: string | null
          id?: string
          items: Json
          label_format?: string | null
          label_url?: string | null
          package_info: Json
          service_type: string
          ship_from: Json
          ship_to: Json
          shipment_id: string
          tracking_number: string
        }
        Update: {
          carrier?: string
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          label_format?: string | null
          label_url?: string | null
          package_info?: Json
          service_type?: string
          ship_from?: Json
          ship_to?: Json
          shipment_id?: string
          tracking_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_labels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_labels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      status_history: {
        Row: {
          change_reason: string | null
          id: number
          inventory_lot_id: string
          new_status: string
          previous_status: string
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          change_reason?: string | null
          id?: number
          inventory_lot_id: string
          new_status: string
          previous_status: string
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          change_reason?: string | null
          id?: number
          inventory_lot_id?: string
          new_status?: string
          previous_status?: string
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      storage_locations: {
        Row: {
          aisle: string | null
          capacity_volume_m3: number | null
          capacity_weight_kg: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: number
          is_active: boolean | null
          level: string | null
          location_code: string
          location_type: string
          notes: string | null
          position: string | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          aisle?: string | null
          capacity_volume_m3?: number | null
          capacity_weight_kg?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          level?: string | null
          location_code: string
          location_type: string
          notes?: string | null
          position?: string | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          aisle?: string | null
          capacity_volume_m3?: number | null
          capacity_weight_kg?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          level?: string | null
          location_code?: string
          location_type?: string
          notes?: string | null
          position?: string | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          broker_contact: string | null
          broker_contact_email: string | null
          broker_contact_phone: string | null
          broker_name: string | null
          contact_email: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          ein: string | null
          id: number
          name: string
          notes: string | null
          phone: string | null
          supplier_type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          broker_contact?: string | null
          broker_contact_email?: string | null
          broker_contact_phone?: string | null
          broker_name?: string | null
          contact_email?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          ein?: string | null
          id?: number
          name: string
          notes?: string | null
          phone?: string | null
          supplier_type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          broker_contact?: string | null
          broker_contact_email?: string | null
          broker_contact_phone?: string | null
          broker_name?: string | null
          contact_email?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          ein?: string | null
          id?: number
          name?: string
          notes?: string | null
          phone?: string | null
          supplier_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_pages: {
        Row: {
          created_at: string | null
          default_permissions: Json
          description: string | null
          display_order: number | null
          is_active: boolean | null
          page_category: string
          page_code: string
          page_name: string
          requires_department: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_permissions?: Json
          description?: string | null
          display_order?: number | null
          is_active?: boolean | null
          page_category: string
          page_code: string
          page_name: string
          requires_department: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_permissions?: Json
          description?: string | null
          display_order?: number | null
          is_active?: boolean | null
          page_category?: string
          page_code?: string
          page_name?: string
          requires_department?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          lot_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          total_value: number | null
          type: string
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: number
          lot_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          total_value?: number | null
          type: string
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: number
          lot_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          total_value?: number | null
          type?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      us_ports: {
        Row: {
          created_at: string
          id: string
          port_code: string
          port_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          port_code: string
          port_name: string
        }
        Update: {
          created_at?: string
          id?: string
          port_code?: string
          port_name?: string
        }
        Relationships: []
      }
      user_page_permissions: {
        Row: {
          access_level: string
          created_at: string | null
          department: string
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          page_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_level: string
          created_at?: string | null
          department: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          page_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string | null
          department?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          page_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_page_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_page_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_page_permissions_page_code_fkey"
            columns: ["page_code"]
            isOneToOne: false
            referencedRelation: "system_pages"
            referencedColumns: ["page_code"]
          },
          {
            foreignKeyName: "user_page_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_page_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          action: string
          created_at: string | null
          expires_at: string | null
          granted: boolean
          granted_at: string | null
          granted_by: string | null
          id: string
          is_inherited: boolean | null
          module_code: string
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_inherited?: boolean | null
          module_code: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          expires_at?: string | null
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_inherited?: boolean | null
          module_code?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_permissions_module_code_fkey"
            columns: ["module_code"]
            isOneToOne: false
            referencedRelation: "module_permission_matrix"
            referencedColumns: ["module_code"]
          },
          {
            foreignKeyName: "user_permissions_module_code_fkey"
            columns: ["module_code"]
            isOneToOne: false
            referencedRelation: "permission_modules"
            referencedColumns: ["module_code"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_permission_summary"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      entry_summary_groups_with_stats: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_names: string | null
          customers_count: number | null
          entry_filer_code: string | null
          entry_number: string | null
          entry_quarter: number | null
          entry_year: number | null
          estimated_total_duties: number | null
          estimated_total_taxes: number | null
          estimated_total_value: number | null
          filed_at: string | null
          filed_by: string | null
          filing_district_port: string | null
          foreign_trade_zone_identifier: string | null
          group_description: string | null
          group_name: string | null
          id: number | null
          preshipments_count: number | null
          status: string | null
          target_entry_date: string | null
          total_line_items: number | null
          updated_at: string | null
          updated_by: string | null
          week_ending_date: string | null
        }
        Relationships: []
      }
      module_permission_matrix: {
        Row: {
          action: string | null
          default_granted: boolean | null
          module_category: string | null
          module_code: string | null
          module_name: string | null
          role: string | null
        }
        Relationships: []
      }
      permission_audit_summary: {
        Row: {
          administrators_involved: number | null
          audit_date: string | null
          change_count: number | null
          change_type: string | null
          module_code: string | null
          users_affected: number | null
        }
        Relationships: []
      }
      user_permission_summary: {
        Row: {
          custom_overrides_count: number | null
          custom_permissions: number | null
          department: string | null
          email: string | null
          full_name: string | null
          granted_permissions: number | null
          inherited_permissions: number | null
          last_template_applied_at: string | null
          role: string | null
          total_permissions: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_role_template_permissions: {
        Args: { p_role: string; p_user_id: string }
        Returns: number
      }
      bulk_update_user_permissions: {
        Args: {
          p_changed_by: string
          p_permissions: Json
          p_reason?: string
          p_user_id: string
        }
        Returns: number
      }
      can_manage_user_permissions: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      check_user_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      create_employee: {
        Args: {
          p_email: string
          p_is_admin?: boolean
          p_job_title?: string
          p_manager_id?: string
          p_name: string
          p_role?: string
          p_temp_password?: string
        }
        Returns: Json
      }
      create_missing_auth_users: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      deactivate_employee: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      generate_reconciliation: {
        Args: { end_date: string; start_date: string }
        Returns: {
          adjusted: number
          admitted: number
          beginning_balance: number
          ending_balance: number
          part_id: string
          withdrawn: number
        }[]
      }
      get_all_employees: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          department: string
          email: string
          email_confirmed: boolean
          id: string
          is_active: boolean
          is_admin: boolean
          job_title: string
          last_login: string
          manager_id: string
          manager_name: string
          name: string
          role: string
          user_id: string
        }[]
      }
      get_current_employee: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_employee_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          department: string
          email: string
          employee_id: string
          job_title: string
          manager_name: string
          name: string
          start_date: string
        }[]
      }
      get_managers_list: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          id: string
          name: string
        }[]
      }
      get_user_accessible_pages: {
        Args: { p_user_id: string }
        Returns: {
          access_level: string
          page_code: string
          page_name: string
          requires_approval: boolean
        }[]
      }
      get_user_module_permissions: {
        Args: { p_module_code?: string; p_user_id: string }
        Returns: {
          action: string
          expires_at: string
          granted: boolean
          is_inherited: boolean
          module_code: string
          module_name: string
        }[]
      }
      is_account_locked: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: boolean
      }
      link_employee_to_auth_user: {
        Args: { p_auth_user_id: string; p_employee_email: string }
        Returns: Json
      }
      reset_user_password: {
        Args: {
          p_employee_id: string
          p_force_change?: boolean
          p_new_password?: string
        }
        Returns: Json
      }
      track_login_attempt: {
        Args: {
          p_email: string
          p_ip_address: string
          p_success: boolean
          p_user_agent?: string
        }
        Returns: undefined
      }
      update_employee: {
        Args:
          | {
              p_department?: string
              p_employee_id: string
              p_is_active?: boolean
              p_is_admin?: boolean
              p_job_title?: string
              p_manager_id?: string
              p_name?: string
              p_role?: string
            }
          | {
              p_department?: string
              p_employee_id: string
              p_is_active?: boolean
              p_job_title?: string
              p_manager_id?: string
              p_name?: string
              p_role?: string
            }
        Returns: Json
      }
      update_last_login: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_action_requires_approval: {
        Args: { p_page_code: string; p_user_id: string }
        Returns: boolean
      }
      user_has_module_permission: {
        Args: { p_action: string; p_module_code: string; p_user_id: string }
        Returns: boolean
      }
      user_has_page_access: {
        Args: {
          p_page_code: string
          p_required_level?: string
          p_user_id: string
        }
        Returns: boolean
      }
      validate_module_action: {
        Args: { p_action: string; p_module_code: string }
        Returns: boolean
      }
      validate_preshipment_for_grouping: {
        Args: { p_group_id: number; p_preshipment_id: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

