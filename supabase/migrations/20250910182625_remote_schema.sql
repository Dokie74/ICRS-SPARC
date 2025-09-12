drop extension if exists "pg_net";

create sequence "public"."contacts_id_seq";

create sequence "public"."customers_id_seq";

create sequence "public"."entry_grand_totals_id_seq";

create sequence "public"."entry_group_preshipments_id_seq";

create sequence "public"."entry_summaries_id_seq";

create sequence "public"."entry_summary_groups_id_seq";

create sequence "public"."entry_summary_line_items_id_seq";

create sequence "public"."ftz_status_records_id_seq";

create sequence "public"."login_attempts_id_seq";

create sequence "public"."material_indices_id_seq";

create sequence "public"."materials_id_seq";

create sequence "public"."part_suppliers_id_seq";

create sequence "public"."preadmissions_id_seq";

create sequence "public"."preshipments_id_seq";

create sequence "public"."pricing_adjustments_id_seq";

create sequence "public"."status_history_id_seq";

create sequence "public"."storage_locations_id_seq";

create sequence "public"."suppliers_id_seq";

create sequence "public"."transactions_id_seq";


  create table "public"."approval_requests" (
    "id" uuid not null default gen_random_uuid(),
    "requested_by" uuid not null,
    "action_type" text not null,
    "page_code" text not null,
    "table_name" text not null,
    "record_id" text not null,
    "old_values" jsonb,
    "new_values" jsonb not null,
    "justification" text not null,
    "status" text default 'pending'::text,
    "priority" text default 'normal'::text,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "approval_notes" text,
    "denied_reason" text,
    "expires_at" timestamp with time zone default (now() + '7 days'::interval),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."approval_requests" enable row level security;


  create table "public"."approval_workflow_log" (
    "id" uuid not null default gen_random_uuid(),
    "approval_request_id" uuid not null,
    "action" text not null,
    "performed_by" uuid,
    "notes" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."approval_workflow_log" enable row level security;


  create table "public"."contacts" (
    "id" integer not null default nextval('contacts_id_seq'::regclass),
    "customer_id" integer not null,
    "name" character varying(100),
    "email" character varying(100),
    "phone" character varying(30),
    "title" character varying(100),
    "location" character varying(200),
    "is_primary" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."contacts" enable row level security;


  create table "public"."customers" (
    "id" integer not null default nextval('customers_id_seq'::regclass),
    "name" text not null,
    "ein" text,
    "address" text,
    "broker_name" text,
    "contact_email" text,
    "phone" character varying(30),
    "website" character varying(255),
    "industry" character varying(100),
    "notes" text,
    "status" character varying(20) default 'active'::character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."customers" enable row level security;


  create table "public"."employees" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "name" text not null,
    "email" text not null,
    "job_title" text,
    "manager_id" uuid,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "role" text not null default 'employee'::text,
    "temp_password" text,
    "must_change_password" boolean default false,
    "department" text default 'warehouse'::text,
    "last_login" timestamp with time zone,
    "is_admin" boolean default false,
    "email_confirmed" boolean default false,
    "created_by" uuid,
    "phone" character varying(30),
    "status" character varying(20) default 'active'::character varying
      );



  create table "public"."entry_grand_totals" (
    "id" integer not null default nextval('entry_grand_totals_id_seq'::regclass),
    "entry_summary_id" integer not null,
    "total_entered_value" numeric(12,2) default 0,
    "grand_total_duty_amount" numeric(12,2) default 0,
    "grand_total_user_fee_amount" numeric(12,2) default 0,
    "grand_total_tax_amount" numeric(12,2) default 0,
    "grand_total_antidumping_duty_amount" numeric(12,2) default 0,
    "grand_total_countervailing_duty_amount" numeric(12,2) default 0,
    "estimated_total_amount" numeric(12,2) default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."entry_grand_totals" enable row level security;


  create table "public"."entry_group_preshipments" (
    "id" integer not null default nextval('entry_group_preshipments_id_seq'::regclass),
    "group_id" integer not null,
    "preshipment_id" integer not null,
    "assignment_notes" text,
    "preshipment_status" text,
    "preshipment_value" numeric(12,2) default 0,
    "preshipment_parts_count" integer default 0,
    "validated" boolean default false,
    "validation_warnings" text[],
    "added_at" timestamp with time zone not null default now(),
    "added_by" uuid
      );


alter table "public"."entry_group_preshipments" enable row level security;


  create table "public"."entry_summaries" (
    "id" integer not null default nextval('entry_summaries_id_seq'::regclass),
    "entry_number" text not null,
    "entry_type_code" text not null default '06'::text,
    "summary_filing_action_request_code" text not null default 'A'::text,
    "record_district_port_of_entry" text not null,
    "entry_filer_code" text not null,
    "consolidated_summary_indicator" text not null default 'N'::text,
    "importer_of_record_number" text,
    "date_of_importation" date,
    "foreign_trade_zone_identifier" text,
    "bill_of_lading_number" text,
    "voyage_flight_trip_number" text,
    "carrier_code" text,
    "importing_conveyance_name" text,
    "consignee_id" integer,
    "manufacturer_name" text,
    "manufacturer_address" text,
    "seller_name" text,
    "seller_address" text,
    "bond_type_code" text,
    "surety_company_code" text,
    "filing_status" text not null default 'DRAFT'::text,
    "preshipment_id" integer,
    "group_id" integer,
    "filed_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "ace_response_message" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid
      );


alter table "public"."entry_summaries" enable row level security;


  create table "public"."entry_summary_groups" (
    "id" integer not null default nextval('entry_summary_groups_id_seq'::regclass),
    "group_name" text not null,
    "group_description" text,
    "week_ending_date" date not null,
    "target_entry_date" date,
    "entry_year" integer not null,
    "entry_quarter" integer not null,
    "filing_district_port" text not null,
    "entry_filer_code" text not null,
    "foreign_trade_zone_identifier" text default 'FTZ-037'::text,
    "status" text not null default 'draft'::text,
    "entry_number" text,
    "filed_at" timestamp with time zone,
    "filed_by" uuid,
    "estimated_total_value" numeric(12,2) default 0,
    "estimated_total_duties" numeric(12,2) default 0,
    "estimated_total_taxes" numeric(12,2) default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "updated_by" uuid
      );


alter table "public"."entry_summary_groups" enable row level security;


  create table "public"."entry_summary_line_items" (
    "id" integer not null default nextval('entry_summary_line_items_id_seq'::regclass),
    "entry_summary_id" integer not null,
    "line_number" integer not null,
    "hts_code" text not null,
    "commodity_description" text not null,
    "country_of_origin" text not null,
    "quantity" numeric(12,3) not null,
    "unit_of_measure" text default 'PCS'::text,
    "unit_value" numeric(12,2) not null,
    "total_value" numeric(12,2) not null,
    "duty_rate" numeric(8,4) default 0,
    "duty_amount" numeric(12,2) default 0,
    "consolidation_metadata" jsonb,
    "part_id" text,
    "lot_id" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."entry_summary_line_items" enable row level security;


  create table "public"."foreign_ports" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "port_name" text not null,
    "country_code" character(2)
      );



  create table "public"."ftz_status_records" (
    "id" integer not null default nextval('ftz_status_records_id_seq'::regclass),
    "entry_line_item_id" integer not null,
    "ftz_line_item_quantity" numeric(12,3) not null,
    "ftz_merchandise_status_code" text not null default 'P'::text,
    "privileged_ftz_merchandise_filing_date" date,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ftz_status_records" enable row level security;


  create table "public"."inventory_lots" (
    "id" text not null,
    "part_id" text not null,
    "customer_id" integer not null,
    "quantity" integer not null,
    "unit_value" numeric(10,2) not null,
    "total_value" numeric(12,2) not null,
    "status" text default 'Available'::text,
    "storage_location_id" integer,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."inventory_lots" enable row level security;


  create table "public"."login_attempts" (
    "id" integer not null default nextval('login_attempts_id_seq'::regclass),
    "email" text not null,
    "ip_address" inet,
    "success" boolean not null,
    "user_agent" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."login_attempts" enable row level security;


  create table "public"."material_indices" (
    "id" integer not null default nextval('material_indices_id_seq'::regclass),
    "material" text not null,
    "index_source" text not null default 'SHSPI'::text,
    "price_date" date not null,
    "price_usd_per_mt" numeric(10,4) not null,
    "data_period" text,
    "fx_rate_cny_usd" numeric(8,4),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid
      );


alter table "public"."material_indices" enable row level security;


  create table "public"."materials" (
    "id" integer not null default nextval('materials_id_seq'::regclass),
    "code" character varying(50) not null,
    "name" character varying(100) not null,
    "category" character varying(50) not null,
    "description" text,
    "color" character varying(50),
    "icon" character varying(50),
    "density" numeric(8,4),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid
      );


alter table "public"."materials" enable row level security;


  create table "public"."part_pricing_history" (
    "id" uuid not null default gen_random_uuid(),
    "part_id" uuid not null,
    "adjustment_id" integer not null,
    "old_material_price" numeric(10,4) not null,
    "new_material_price" numeric(10,4) not null,
    "old_total_price" numeric(10,4) not null,
    "new_total_price" numeric(10,4) not null,
    "material_weight" numeric(8,4) not null,
    "price_adjustment_per_kg" numeric(10,6) not null,
    "effective_date" date not null default CURRENT_DATE,
    "created_at" timestamp with time zone default now(),
    "created_by" uuid
      );


alter table "public"."part_pricing_history" enable row level security;


  create table "public"."part_suppliers" (
    "id" integer not null default nextval('part_suppliers_id_seq'::regclass),
    "part_id" text not null,
    "supplier_id" integer not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."part_suppliers" enable row level security;


  create table "public"."parts" (
    "id" text not null,
    "description" text not null,
    "hts_code" text,
    "country_of_origin" text,
    "standard_value" numeric(10,2),
    "unit_of_measure" text,
    "manufacturer_id" text,
    "gross_weight" numeric,
    "package_quantity" integer,
    "package_type" text,
    "material_price" numeric(12,4),
    "labor_price" numeric(12,4),
    "overhead_price" numeric(12,4),
    "price_source" text default 'manual'::text,
    "last_price_update" timestamp with time zone,
    "material_weight" numeric(8,4),
    "material" text
      );


alter table "public"."parts" enable row level security;


  create table "public"."permission_audit_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "change_type" text not null,
    "module_code" text not null,
    "action" text not null,
    "old_value" jsonb,
    "new_value" jsonb,
    "changed_by" uuid,
    "reason" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."permission_audit_log" enable row level security;


  create table "public"."permission_inheritance" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "role" text not null,
    "last_template_applied_at" timestamp with time zone default now(),
    "custom_overrides_count" integer default 0,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."permission_inheritance" enable row level security;


  create table "public"."permission_modules" (
    "module_code" text not null,
    "module_name" text not null,
    "module_category" text not null,
    "available_actions" text[] not null default '{}'::text[],
    "description" text,
    "display_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."permission_modules" enable row level security;


  create table "public"."permission_templates" (
    "id" uuid not null default gen_random_uuid(),
    "role" text not null,
    "module_code" text not null,
    "action" text not null,
    "default_granted" boolean not null default false,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."permission_templates" enable row level security;


  create table "public"."preadmissions" (
    "id" integer not null default nextval('preadmissions_id_seq'::regclass),
    "admissionId" text not null,
    "e214" text,
    "container_number" text,
    "customerId" integer,
    "items" jsonb,
    "entryNumber" text,
    "status" text default 'Pending'::text,
    "arrivalDate" date,
    "dock_location" text,
    "driver_name" text,
    "driver_license_number" text,
    "license_plate_number" text,
    "carrier_name" text,
    "signature_data" jsonb,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "zone_status" text,
    "primary_supplier_name" text,
    "year" integer,
    "shipment_lot_id" text,
    "bol_date" date,
    "seal_number" text,
    "luc_ship_date" date,
    "bond_amount" numeric(15,2) default 0.00,
    "freight_invoice_date" date,
    "ship_invoice_number" text,
    "uscbp_master_billing" text
      );


alter table "public"."preadmissions" enable row level security;


  create table "public"."preshipments" (
    "id" integer not null default nextval('preshipments_id_seq'::regclass),
    "shipmentId" text not null,
    "type" text not null,
    "customerId" integer not null,
    "items" jsonb,
    "entryNumber" text,
    "stage" text not null default 'Pending Pick'::text,
    "driver_name" text,
    "driver_license_number" text,
    "license_plate_number" text,
    "carrier_name" text,
    "signature_data" jsonb,
    "shipped_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "entry_summary_id" integer,
    "entry_summary_status" text default 'PENDING'::text,
    "is_grouped" boolean default false
      );


alter table "public"."preshipments" enable row level security;


  create table "public"."pricing_adjustments" (
    "id" integer not null default nextval('pricing_adjustments_id_seq'::regclass),
    "adjustment_name" text not null,
    "material" text not null,
    "quarter" text not null,
    "year" integer not null,
    "previous_price_usd_per_mt" numeric(10,4),
    "new_price_usd_per_mt" numeric(10,4),
    "percentage_change" numeric(5,2),
    "fx_rate_cny_usd" numeric(8,4),
    "source" text default 'SHSPI'::text,
    "effective_date" date not null,
    "applied_at" timestamp with time zone default now(),
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now(),
    "data_months" jsonb,
    "communication_month" character varying(10),
    "effective_month" character varying(10),
    "old_average_price" numeric(10,4),
    "parts_affected" integer default 0,
    "total_cost_impact" numeric(15,4) default 0,
    "customers_affected" integer default 0,
    "pricing_formula" character varying(50) default '3_month_rolling'::character varying,
    "formula_config" jsonb,
    "status" character varying(20) default 'draft'::character varying,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."pricing_adjustments" enable row level security;


  create table "public"."status_history" (
    "id" integer not null default nextval('status_history_id_seq'::regclass),
    "inventory_lot_id" text not null,
    "previous_status" text not null,
    "new_status" text not null,
    "change_reason" text,
    "user_id" uuid,
    "timestamp" timestamp with time zone default now()
      );



  create table "public"."storage_locations" (
    "id" integer not null default nextval('storage_locations_id_seq'::regclass),
    "location_code" text not null,
    "location_type" text not null,
    "zone" text,
    "aisle" text,
    "level" text,
    "position" text,
    "capacity_weight_kg" numeric(10,3),
    "capacity_volume_m3" numeric(8,3),
    "is_active" boolean default true,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "created_by" uuid,
    "description" text
      );


alter table "public"."storage_locations" enable row level security;


  create table "public"."suppliers" (
    "id" integer not null default nextval('suppliers_id_seq'::regclass),
    "name" text not null,
    "ein" text,
    "address" text,
    "broker_name" text,
    "contact_email" text,
    "phone" text,
    "contact_person" text,
    "supplier_type" text,
    "country" text,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "broker_contact" character varying(255),
    "broker_contact_email" character varying(255),
    "broker_contact_phone" character varying(50)
      );


alter table "public"."suppliers" enable row level security;


  create table "public"."system_pages" (
    "page_code" text not null,
    "page_name" text not null,
    "page_category" text not null,
    "requires_department" text[] not null,
    "default_permissions" jsonb not null default '{}'::jsonb,
    "description" text,
    "display_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."system_pages" enable row level security;


  create table "public"."transactions" (
    "id" integer not null default nextval('transactions_id_seq'::regclass),
    "lot_id" text not null,
    "type" text not null,
    "quantity" integer not null,
    "unit_price" numeric(10,2),
    "total_value" numeric(12,2),
    "reference_id" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now(),
    "created_by" uuid
      );


alter table "public"."transactions" enable row level security;


  create table "public"."us_ports" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "port_name" text not null,
    "port_code" text not null
      );



  create table "public"."user_page_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "page_code" text not null,
    "access_level" text not null,
    "department" text not null,
    "granted_by" uuid,
    "granted_at" timestamp with time zone default now(),
    "is_active" boolean default true,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_page_permissions" enable row level security;


  create table "public"."user_permissions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "module_code" text not null,
    "action" text not null,
    "granted" boolean not null default false,
    "granted_by" uuid,
    "granted_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone,
    "is_inherited" boolean default false,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."user_permissions" enable row level security;

alter sequence "public"."contacts_id_seq" owned by "public"."contacts"."id";

alter sequence "public"."customers_id_seq" owned by "public"."customers"."id";

alter sequence "public"."entry_grand_totals_id_seq" owned by "public"."entry_grand_totals"."id";

alter sequence "public"."entry_group_preshipments_id_seq" owned by "public"."entry_group_preshipments"."id";

alter sequence "public"."entry_summaries_id_seq" owned by "public"."entry_summaries"."id";

alter sequence "public"."entry_summary_groups_id_seq" owned by "public"."entry_summary_groups"."id";

alter sequence "public"."entry_summary_line_items_id_seq" owned by "public"."entry_summary_line_items"."id";

alter sequence "public"."ftz_status_records_id_seq" owned by "public"."ftz_status_records"."id";

alter sequence "public"."login_attempts_id_seq" owned by "public"."login_attempts"."id";

alter sequence "public"."material_indices_id_seq" owned by "public"."material_indices"."id";

alter sequence "public"."materials_id_seq" owned by "public"."materials"."id";

alter sequence "public"."part_suppliers_id_seq" owned by "public"."part_suppliers"."id";

alter sequence "public"."preadmissions_id_seq" owned by "public"."preadmissions"."id";

alter sequence "public"."preshipments_id_seq" owned by "public"."preshipments"."id";

alter sequence "public"."pricing_adjustments_id_seq" owned by "public"."pricing_adjustments"."id";

alter sequence "public"."status_history_id_seq" owned by "public"."status_history"."id";

alter sequence "public"."storage_locations_id_seq" owned by "public"."storage_locations"."id";

alter sequence "public"."suppliers_id_seq" owned by "public"."suppliers"."id";

alter sequence "public"."transactions_id_seq" owned by "public"."transactions"."id";

CREATE UNIQUE INDEX approval_requests_pkey ON public.approval_requests USING btree (id);

CREATE UNIQUE INDEX approval_workflow_log_pkey ON public.approval_workflow_log USING btree (id);

CREATE UNIQUE INDEX contacts_pkey ON public.contacts USING btree (id);

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE UNIQUE INDEX employees_email_key ON public.employees USING btree (email);

CREATE UNIQUE INDEX employees_pkey ON public.employees USING btree (id);

CREATE UNIQUE INDEX entry_grand_totals_entry_summary_id_key ON public.entry_grand_totals USING btree (entry_summary_id);

CREATE UNIQUE INDEX entry_grand_totals_pkey ON public.entry_grand_totals USING btree (id);

CREATE UNIQUE INDEX entry_group_preshipments_group_id_preshipment_id_key ON public.entry_group_preshipments USING btree (group_id, preshipment_id);

CREATE UNIQUE INDEX entry_group_preshipments_pkey ON public.entry_group_preshipments USING btree (id);

CREATE UNIQUE INDEX entry_summaries_entry_number_key ON public.entry_summaries USING btree (entry_number);

CREATE UNIQUE INDEX entry_summaries_pkey ON public.entry_summaries USING btree (id);

CREATE UNIQUE INDEX entry_summary_groups_pkey ON public.entry_summary_groups USING btree (id);

CREATE UNIQUE INDEX entry_summary_line_items_entry_summary_id_line_number_key ON public.entry_summary_line_items USING btree (entry_summary_id, line_number);

CREATE UNIQUE INDEX entry_summary_line_items_pkey ON public.entry_summary_line_items USING btree (id);

CREATE UNIQUE INDEX foreign_ports_pkey ON public.foreign_ports USING btree (id);

CREATE UNIQUE INDEX foreign_ports_port_name_key ON public.foreign_ports USING btree (port_name);

CREATE UNIQUE INDEX ftz_status_records_pkey ON public.ftz_status_records USING btree (id);

CREATE INDEX idx_approval_requests_expires ON public.approval_requests USING btree (expires_at) WHERE (status = 'pending'::text);

CREATE INDEX idx_approval_requests_page ON public.approval_requests USING btree (page_code, status);

CREATE INDEX idx_approval_requests_pending ON public.approval_requests USING btree (status, created_at) WHERE (status = 'pending'::text);

CREATE INDEX idx_approval_requests_requested_by ON public.approval_requests USING btree (requested_by);

CREATE INDEX idx_approval_requests_status ON public.approval_requests USING btree (status);

CREATE INDEX idx_contacts_customer_id ON public.contacts USING btree (customer_id);

CREATE INDEX idx_contacts_email ON public.contacts USING btree (email);

CREATE INDEX idx_contacts_is_primary ON public.contacts USING btree (is_primary);

CREATE INDEX idx_contacts_name ON public.contacts USING btree (name);

CREATE INDEX idx_customers_contact_email ON public.customers USING btree (contact_email);

CREATE INDEX idx_customers_created_at ON public.customers USING btree (created_at);

CREATE INDEX idx_customers_ein ON public.customers USING btree (ein);

CREATE INDEX idx_customers_name ON public.customers USING btree (name);

CREATE INDEX idx_customers_status ON public.customers USING btree (status);

CREATE INDEX idx_employees_email ON public.employees USING btree (email);

CREATE INDEX idx_employees_is_active ON public.employees USING btree (is_active);

CREATE INDEX idx_employees_is_admin ON public.employees USING btree (is_admin);

CREATE INDEX idx_employees_manager_id ON public.employees USING btree (manager_id);

CREATE INDEX idx_employees_phone ON public.employees USING btree (phone);

CREATE INDEX idx_employees_role ON public.employees USING btree (role);

CREATE INDEX idx_employees_role_active ON public.employees USING btree (role) WHERE (is_active = true);

CREATE INDEX idx_employees_status ON public.employees USING btree (status);

CREATE INDEX idx_employees_user_id ON public.employees USING btree (user_id);

CREATE INDEX idx_employees_user_id_role ON public.employees USING btree (user_id, role);

CREATE INDEX idx_entry_group_preshipments_group ON public.entry_group_preshipments USING btree (group_id);

CREATE INDEX idx_entry_group_preshipments_preshipment ON public.entry_group_preshipments USING btree (preshipment_id);

CREATE INDEX idx_entry_line_items_entry_id ON public.entry_summary_line_items USING btree (entry_summary_id);

CREATE INDEX idx_entry_line_items_hts_code ON public.entry_summary_line_items USING btree (hts_code);

CREATE INDEX idx_entry_summaries_entry_number ON public.entry_summaries USING btree (entry_number);

CREATE INDEX idx_entry_summaries_filing_status ON public.entry_summaries USING btree (filing_status);

CREATE INDEX idx_entry_summaries_group_id ON public.entry_summaries USING btree (group_id);

CREATE INDEX idx_entry_summaries_preshipment_id ON public.entry_summaries USING btree (preshipment_id);

CREATE INDEX idx_entry_summary_groups_entry_year ON public.entry_summary_groups USING btree (entry_year);

CREATE INDEX idx_entry_summary_groups_filing_port ON public.entry_summary_groups USING btree (filing_district_port);

CREATE INDEX idx_entry_summary_groups_status ON public.entry_summary_groups USING btree (status);

CREATE INDEX idx_entry_summary_groups_week_ending ON public.entry_summary_groups USING btree (week_ending_date);

CREATE INDEX idx_inventory_lots_part ON public.inventory_lots USING btree (part_id);

CREATE INDEX idx_materials_category ON public.materials USING btree (category);

CREATE INDEX idx_materials_code ON public.materials USING btree (code);

CREATE INDEX idx_materials_is_active ON public.materials USING btree (is_active);

CREATE INDEX idx_part_suppliers_part ON public.part_suppliers USING btree (part_id);

CREATE INDEX idx_part_suppliers_supplier ON public.part_suppliers USING btree (supplier_id);

CREATE INDEX idx_parts_hts_code ON public.parts USING btree (hts_code);

CREATE INDEX idx_parts_material ON public.parts USING btree (material);

CREATE INDEX idx_permission_audit_changed_by ON public.permission_audit_log USING btree (changed_by, created_at DESC);

CREATE INDEX idx_permission_audit_user ON public.permission_audit_log USING btree (user_id, created_at DESC);

CREATE INDEX idx_permission_inheritance_user ON public.permission_inheritance USING btree (user_id, role);

CREATE INDEX idx_permission_modules_active ON public.permission_modules USING btree (is_active, display_order) WHERE (is_active = true);

CREATE INDEX idx_permission_modules_category ON public.permission_modules USING btree (module_category, display_order);

CREATE INDEX idx_permission_modules_code_active ON public.permission_modules USING btree (module_code, is_active) WHERE (is_active = true);

CREATE INDEX idx_permission_templates_role ON public.permission_templates USING btree (role, module_code);

CREATE INDEX idx_preadmissions_customer ON public.preadmissions USING btree ("customerId");

CREATE INDEX idx_preadmissions_primary_supplier ON public.preadmissions USING btree (primary_supplier_name);

CREATE INDEX idx_preadmissions_shipment_lot_id ON public.preadmissions USING btree (shipment_lot_id);

CREATE INDEX idx_preadmissions_year ON public.preadmissions USING btree (year);

CREATE INDEX idx_preadmissions_zone_status ON public.preadmissions USING btree (zone_status);

CREATE INDEX idx_preshipments_customer ON public.preshipments USING btree ("customerId");

CREATE INDEX idx_preshipments_entry_summary_id ON public.preshipments USING btree (entry_summary_id);

CREATE INDEX idx_preshipments_is_grouped ON public.preshipments USING btree (is_grouped);

CREATE INDEX idx_suppliers_name ON public.suppliers USING btree (name);

CREATE INDEX idx_system_pages_active ON public.system_pages USING btree (is_active, display_order) WHERE (is_active = true);

CREATE INDEX idx_system_pages_category ON public.system_pages USING btree (page_category);

CREATE INDEX idx_transactions_lot ON public.transactions USING btree (lot_id);

CREATE INDEX idx_user_page_permissions_active ON public.user_page_permissions USING btree (user_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_user_page_permissions_page_code ON public.user_page_permissions USING btree (page_code);

CREATE INDEX idx_user_page_permissions_user_id ON public.user_page_permissions USING btree (user_id);

CREATE INDEX idx_user_permissions_expiring ON public.user_permissions USING btree (expires_at) WHERE (expires_at IS NOT NULL);

CREATE INDEX idx_user_permissions_inheritance ON public.user_permissions USING btree (user_id, is_inherited, granted);

CREATE INDEX idx_user_permissions_module_action ON public.user_permissions USING btree (module_code, action);

CREATE INDEX idx_user_permissions_user_granted ON public.user_permissions USING btree (user_id, granted) WHERE (granted = true);

CREATE INDEX idx_user_permissions_user_granted_active ON public.user_permissions USING btree (user_id, granted) WHERE (granted = true);

CREATE INDEX idx_user_permissions_user_module ON public.user_permissions USING btree (user_id, module_code);

CREATE UNIQUE INDEX inventory_lots_pkey ON public.inventory_lots USING btree (id);

CREATE UNIQUE INDEX login_attempts_pkey ON public.login_attempts USING btree (id);

CREATE UNIQUE INDEX material_indices_pkey ON public.material_indices USING btree (id);

CREATE UNIQUE INDEX materials_code_key ON public.materials USING btree (code);

CREATE UNIQUE INDEX materials_pkey ON public.materials USING btree (id);

CREATE UNIQUE INDEX part_pricing_history_pkey ON public.part_pricing_history USING btree (id);

CREATE UNIQUE INDEX part_suppliers_pkey ON public.part_suppliers USING btree (id);

CREATE UNIQUE INDEX parts_pkey ON public.parts USING btree (id);

CREATE UNIQUE INDEX permission_audit_log_pkey ON public.permission_audit_log USING btree (id);

CREATE UNIQUE INDEX permission_inheritance_pkey ON public.permission_inheritance USING btree (id);

CREATE UNIQUE INDEX permission_inheritance_user_id_role_key ON public.permission_inheritance USING btree (user_id, role);

CREATE UNIQUE INDEX permission_modules_pkey ON public.permission_modules USING btree (module_code);

CREATE UNIQUE INDEX permission_templates_pkey ON public.permission_templates USING btree (id);

CREATE UNIQUE INDEX permission_templates_role_module_code_action_key ON public.permission_templates USING btree (role, module_code, action);

CREATE UNIQUE INDEX preadmissions_admissionid_key ON public.preadmissions USING btree ("admissionId");

CREATE UNIQUE INDEX preadmissions_pkey ON public.preadmissions USING btree (id);

CREATE UNIQUE INDEX preshipments_pkey ON public.preshipments USING btree (id);

CREATE UNIQUE INDEX pricing_adjustments_pkey ON public.pricing_adjustments USING btree (id);

CREATE UNIQUE INDEX status_history_pkey ON public.status_history USING btree (id);

CREATE UNIQUE INDEX storage_locations_location_code_key ON public.storage_locations USING btree (location_code);

CREATE UNIQUE INDEX storage_locations_pkey ON public.storage_locations USING btree (id);

CREATE UNIQUE INDEX suppliers_pkey ON public.suppliers USING btree (id);

CREATE UNIQUE INDEX system_pages_pkey ON public.system_pages USING btree (page_code);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

CREATE UNIQUE INDEX us_ports_pkey ON public.us_ports USING btree (id);

CREATE UNIQUE INDEX us_ports_port_code_key ON public.us_ports USING btree (port_code);

CREATE UNIQUE INDEX user_page_permissions_pkey ON public.user_page_permissions USING btree (id);

CREATE UNIQUE INDEX user_page_permissions_user_id_page_code_key ON public.user_page_permissions USING btree (user_id, page_code);

CREATE UNIQUE INDEX user_permissions_pkey ON public.user_permissions USING btree (id);

CREATE UNIQUE INDEX user_permissions_user_id_module_code_action_key ON public.user_permissions USING btree (user_id, module_code, action);

alter table "public"."approval_requests" add constraint "approval_requests_pkey" PRIMARY KEY using index "approval_requests_pkey";

alter table "public"."approval_workflow_log" add constraint "approval_workflow_log_pkey" PRIMARY KEY using index "approval_workflow_log_pkey";

alter table "public"."contacts" add constraint "contacts_pkey" PRIMARY KEY using index "contacts_pkey";

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."employees" add constraint "employees_pkey" PRIMARY KEY using index "employees_pkey";

alter table "public"."entry_grand_totals" add constraint "entry_grand_totals_pkey" PRIMARY KEY using index "entry_grand_totals_pkey";

alter table "public"."entry_group_preshipments" add constraint "entry_group_preshipments_pkey" PRIMARY KEY using index "entry_group_preshipments_pkey";

alter table "public"."entry_summaries" add constraint "entry_summaries_pkey" PRIMARY KEY using index "entry_summaries_pkey";

alter table "public"."entry_summary_groups" add constraint "entry_summary_groups_pkey" PRIMARY KEY using index "entry_summary_groups_pkey";

alter table "public"."entry_summary_line_items" add constraint "entry_summary_line_items_pkey" PRIMARY KEY using index "entry_summary_line_items_pkey";

alter table "public"."foreign_ports" add constraint "foreign_ports_pkey" PRIMARY KEY using index "foreign_ports_pkey";

alter table "public"."ftz_status_records" add constraint "ftz_status_records_pkey" PRIMARY KEY using index "ftz_status_records_pkey";

alter table "public"."inventory_lots" add constraint "inventory_lots_pkey" PRIMARY KEY using index "inventory_lots_pkey";

alter table "public"."login_attempts" add constraint "login_attempts_pkey" PRIMARY KEY using index "login_attempts_pkey";

alter table "public"."material_indices" add constraint "material_indices_pkey" PRIMARY KEY using index "material_indices_pkey";

alter table "public"."materials" add constraint "materials_pkey" PRIMARY KEY using index "materials_pkey";

alter table "public"."part_pricing_history" add constraint "part_pricing_history_pkey" PRIMARY KEY using index "part_pricing_history_pkey";

alter table "public"."part_suppliers" add constraint "part_suppliers_pkey" PRIMARY KEY using index "part_suppliers_pkey";

alter table "public"."parts" add constraint "parts_pkey" PRIMARY KEY using index "parts_pkey";

alter table "public"."permission_audit_log" add constraint "permission_audit_log_pkey" PRIMARY KEY using index "permission_audit_log_pkey";

alter table "public"."permission_inheritance" add constraint "permission_inheritance_pkey" PRIMARY KEY using index "permission_inheritance_pkey";

alter table "public"."permission_modules" add constraint "permission_modules_pkey" PRIMARY KEY using index "permission_modules_pkey";

alter table "public"."permission_templates" add constraint "permission_templates_pkey" PRIMARY KEY using index "permission_templates_pkey";

alter table "public"."preadmissions" add constraint "preadmissions_pkey" PRIMARY KEY using index "preadmissions_pkey";

alter table "public"."preshipments" add constraint "preshipments_pkey" PRIMARY KEY using index "preshipments_pkey";

alter table "public"."pricing_adjustments" add constraint "pricing_adjustments_pkey" PRIMARY KEY using index "pricing_adjustments_pkey";

alter table "public"."status_history" add constraint "status_history_pkey" PRIMARY KEY using index "status_history_pkey";

alter table "public"."storage_locations" add constraint "storage_locations_pkey" PRIMARY KEY using index "storage_locations_pkey";

alter table "public"."suppliers" add constraint "suppliers_pkey" PRIMARY KEY using index "suppliers_pkey";

alter table "public"."system_pages" add constraint "system_pages_pkey" PRIMARY KEY using index "system_pages_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."us_ports" add constraint "us_ports_pkey" PRIMARY KEY using index "us_ports_pkey";

alter table "public"."user_page_permissions" add constraint "user_page_permissions_pkey" PRIMARY KEY using index "user_page_permissions_pkey";

alter table "public"."user_permissions" add constraint "user_permissions_pkey" PRIMARY KEY using index "user_permissions_pkey";

alter table "public"."approval_requests" add constraint "approval_requests_action_type_check" CHECK ((action_type = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text, 'status_change'::text]))) not valid;

alter table "public"."approval_requests" validate constraint "approval_requests_action_type_check";

alter table "public"."approval_requests" add constraint "approval_requests_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES employees(id) not valid;

alter table "public"."approval_requests" validate constraint "approval_requests_approved_by_fkey";

alter table "public"."approval_requests" add constraint "approval_requests_page_code_fkey" FOREIGN KEY (page_code) REFERENCES system_pages(page_code) not valid;

alter table "public"."approval_requests" validate constraint "approval_requests_page_code_fkey";

alter table "public"."approval_requests" add constraint "approval_requests_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."approval_requests" validate constraint "approval_requests_priority_check";

alter table "public"."approval_requests" add constraint "approval_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES employees(id) not valid;

alter table "public"."approval_requests" validate constraint "approval_requests_requested_by_fkey";

alter table "public"."approval_requests" add constraint "approval_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text, 'cancelled'::text]))) not valid;

alter table "public"."approval_requests" validate constraint "approval_requests_status_check";

alter table "public"."approval_workflow_log" add constraint "approval_workflow_log_approval_request_id_fkey" FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE not valid;

alter table "public"."approval_workflow_log" validate constraint "approval_workflow_log_approval_request_id_fkey";

alter table "public"."approval_workflow_log" add constraint "approval_workflow_log_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES employees(id) not valid;

alter table "public"."approval_workflow_log" validate constraint "approval_workflow_log_performed_by_fkey";

alter table "public"."contacts" add constraint "contacts_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE not valid;

alter table "public"."contacts" validate constraint "contacts_customer_id_fkey";

alter table "public"."employees" add constraint "employees_created_by_fkey" FOREIGN KEY (created_by) REFERENCES employees(id) not valid;

alter table "public"."employees" validate constraint "employees_created_by_fkey";

alter table "public"."employees" add constraint "employees_department_check" CHECK ((department = ANY (ARRAY['warehouse'::text, 'shipping'::text, 'receiving'::text, 'administration'::text, 'management'::text]))) not valid;

alter table "public"."employees" validate constraint "employees_department_check";

alter table "public"."employees" add constraint "employees_email_key" UNIQUE using index "employees_email_key";

alter table "public"."employees" add constraint "employees_manager_id_fkey" FOREIGN KEY (manager_id) REFERENCES employees(id) not valid;

alter table "public"."employees" validate constraint "employees_manager_id_fkey";

alter table "public"."employees" add constraint "employees_role_check" CHECK ((role = ANY (ARRAY['employee'::text, 'manager'::text, 'admin'::text]))) not valid;

alter table "public"."employees" validate constraint "employees_role_check";

alter table "public"."employees" add constraint "employees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."employees" validate constraint "employees_user_id_fkey";

alter table "public"."entry_grand_totals" add constraint "entry_grand_totals_entry_summary_id_fkey" FOREIGN KEY (entry_summary_id) REFERENCES entry_summaries(id) ON DELETE CASCADE not valid;

alter table "public"."entry_grand_totals" validate constraint "entry_grand_totals_entry_summary_id_fkey";

alter table "public"."entry_grand_totals" add constraint "entry_grand_totals_entry_summary_id_key" UNIQUE using index "entry_grand_totals_entry_summary_id_key";

alter table "public"."entry_group_preshipments" add constraint "entry_group_preshipments_added_by_fkey" FOREIGN KEY (added_by) REFERENCES auth.users(id) not valid;

alter table "public"."entry_group_preshipments" validate constraint "entry_group_preshipments_added_by_fkey";

alter table "public"."entry_group_preshipments" add constraint "entry_group_preshipments_group_id_fkey" FOREIGN KEY (group_id) REFERENCES entry_summary_groups(id) ON DELETE CASCADE not valid;

alter table "public"."entry_group_preshipments" validate constraint "entry_group_preshipments_group_id_fkey";

alter table "public"."entry_group_preshipments" add constraint "entry_group_preshipments_group_id_preshipment_id_key" UNIQUE using index "entry_group_preshipments_group_id_preshipment_id_key";

alter table "public"."entry_group_preshipments" add constraint "entry_group_preshipments_preshipment_id_fkey" FOREIGN KEY (preshipment_id) REFERENCES preshipments(id) ON DELETE CASCADE not valid;

alter table "public"."entry_group_preshipments" validate constraint "entry_group_preshipments_preshipment_id_fkey";

alter table "public"."entry_summaries" add constraint "entry_summaries_consignee_id_fkey" FOREIGN KEY (consignee_id) REFERENCES customers(id) not valid;

alter table "public"."entry_summaries" validate constraint "entry_summaries_consignee_id_fkey";

alter table "public"."entry_summaries" add constraint "entry_summaries_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."entry_summaries" validate constraint "entry_summaries_created_by_fkey";

alter table "public"."entry_summaries" add constraint "entry_summaries_entry_number_key" UNIQUE using index "entry_summaries_entry_number_key";

alter table "public"."entry_summaries" add constraint "entry_summaries_group_id_fkey" FOREIGN KEY (group_id) REFERENCES entry_summary_groups(id) not valid;

alter table "public"."entry_summaries" validate constraint "entry_summaries_group_id_fkey";

alter table "public"."entry_summaries" add constraint "entry_summaries_preshipment_id_fkey" FOREIGN KEY (preshipment_id) REFERENCES preshipments(id) not valid;

alter table "public"."entry_summaries" validate constraint "entry_summaries_preshipment_id_fkey";

alter table "public"."entry_summaries" add constraint "valid_filing_status" CHECK ((filing_status = ANY (ARRAY['DRAFT'::text, 'FILED'::text, 'ACCEPTED'::text, 'REJECTED'::text]))) not valid;

alter table "public"."entry_summaries" validate constraint "valid_filing_status";

alter table "public"."entry_summary_groups" add constraint "entry_summary_groups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."entry_summary_groups" validate constraint "entry_summary_groups_created_by_fkey";

alter table "public"."entry_summary_groups" add constraint "entry_summary_groups_filed_by_fkey" FOREIGN KEY (filed_by) REFERENCES auth.users(id) not valid;

alter table "public"."entry_summary_groups" validate constraint "entry_summary_groups_filed_by_fkey";

alter table "public"."entry_summary_groups" add constraint "entry_summary_groups_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."entry_summary_groups" validate constraint "entry_summary_groups_updated_by_fkey";

alter table "public"."entry_summary_groups" add constraint "valid_quarter" CHECK (((entry_quarter >= 1) AND (entry_quarter <= 4))) not valid;

alter table "public"."entry_summary_groups" validate constraint "valid_quarter";

alter table "public"."entry_summary_groups" add constraint "valid_status" CHECK ((status = ANY (ARRAY['draft'::text, 'ready_for_review'::text, 'approved'::text, 'filed'::text, 'accepted'::text, 'rejected'::text]))) not valid;

alter table "public"."entry_summary_groups" validate constraint "valid_status";

alter table "public"."entry_summary_groups" add constraint "week_ending_is_friday" CHECK ((EXTRACT(dow FROM week_ending_date) = (5)::numeric)) not valid;

alter table "public"."entry_summary_groups" validate constraint "week_ending_is_friday";

alter table "public"."entry_summary_line_items" add constraint "entry_summary_line_items_entry_summary_id_fkey" FOREIGN KEY (entry_summary_id) REFERENCES entry_summaries(id) ON DELETE CASCADE not valid;

alter table "public"."entry_summary_line_items" validate constraint "entry_summary_line_items_entry_summary_id_fkey";

alter table "public"."entry_summary_line_items" add constraint "entry_summary_line_items_entry_summary_id_line_number_key" UNIQUE using index "entry_summary_line_items_entry_summary_id_line_number_key";

alter table "public"."entry_summary_line_items" add constraint "entry_summary_line_items_lot_id_fkey" FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) not valid;

alter table "public"."entry_summary_line_items" validate constraint "entry_summary_line_items_lot_id_fkey";

alter table "public"."entry_summary_line_items" add constraint "entry_summary_line_items_part_id_fkey" FOREIGN KEY (part_id) REFERENCES parts(id) not valid;

alter table "public"."entry_summary_line_items" validate constraint "entry_summary_line_items_part_id_fkey";

alter table "public"."foreign_ports" add constraint "foreign_ports_port_name_key" UNIQUE using index "foreign_ports_port_name_key";

alter table "public"."ftz_status_records" add constraint "ftz_status_records_entry_line_item_id_fkey" FOREIGN KEY (entry_line_item_id) REFERENCES entry_summary_line_items(id) ON DELETE CASCADE not valid;

alter table "public"."ftz_status_records" validate constraint "ftz_status_records_entry_line_item_id_fkey";

alter table "public"."ftz_status_records" add constraint "valid_ftz_status" CHECK ((ftz_merchandise_status_code = ANY (ARRAY['P'::text, 'N'::text, 'D'::text]))) not valid;

alter table "public"."ftz_status_records" validate constraint "valid_ftz_status";

alter table "public"."inventory_lots" add constraint "inventory_lots_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) not valid;

alter table "public"."inventory_lots" validate constraint "inventory_lots_customer_id_fkey";

alter table "public"."inventory_lots" add constraint "inventory_lots_part_id_fkey" FOREIGN KEY (part_id) REFERENCES parts(id) not valid;

alter table "public"."inventory_lots" validate constraint "inventory_lots_part_id_fkey";

alter table "public"."inventory_lots" add constraint "inventory_lots_storage_location_id_fkey" FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id) not valid;

alter table "public"."inventory_lots" validate constraint "inventory_lots_storage_location_id_fkey";

alter table "public"."materials" add constraint "materials_code_key" UNIQUE using index "materials_code_key";

alter table "public"."materials" add constraint "materials_created_by_fkey" FOREIGN KEY (created_by) REFERENCES employees(id) not valid;

alter table "public"."materials" validate constraint "materials_created_by_fkey";

alter table "public"."part_suppliers" add constraint "part_suppliers_part_id_fkey" FOREIGN KEY (part_id) REFERENCES parts(id) not valid;

alter table "public"."part_suppliers" validate constraint "part_suppliers_part_id_fkey";

alter table "public"."part_suppliers" add constraint "part_suppliers_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES suppliers(id) not valid;

alter table "public"."part_suppliers" validate constraint "part_suppliers_supplier_id_fkey";

alter table "public"."parts" add constraint "check_positive_labor_price" CHECK (((labor_price IS NULL) OR (labor_price >= (0)::numeric))) not valid;

alter table "public"."parts" validate constraint "check_positive_labor_price";

alter table "public"."parts" add constraint "check_positive_material_price" CHECK (((material_price IS NULL) OR (material_price >= (0)::numeric))) not valid;

alter table "public"."parts" validate constraint "check_positive_material_price";

alter table "public"."parts" add constraint "check_positive_overhead_price" CHECK (((overhead_price IS NULL) OR (overhead_price >= (0)::numeric))) not valid;

alter table "public"."parts" validate constraint "check_positive_overhead_price";

alter table "public"."parts" add constraint "check_positive_standard_value" CHECK (((standard_value IS NULL) OR (standard_value >= (0)::numeric))) not valid;

alter table "public"."parts" validate constraint "check_positive_standard_value";

alter table "public"."parts" add constraint "check_valid_price_source" CHECK ((price_source = ANY (ARRAY['manual'::text, 'quarterly_update'::text, 'spot_price'::text, 'contract'::text, 'rfq'::text, 'market_data'::text]))) not valid;

alter table "public"."parts" validate constraint "check_valid_price_source";

alter table "public"."parts" add constraint "valid_material_type" CHECK (((material IS NULL) OR (material = ANY (ARRAY['steel'::text, 'stainless_steel'::text, 'carbon_steel'::text, 'alloy_steel'::text, 'aluminum'::text, 'aluminum_alloy'::text, 'brass'::text, 'bronze'::text, 'copper'::text, 'iron'::text, 'cast_iron'::text, 'titanium'::text, 'nickel'::text, 'zinc'::text, 'plastic'::text, 'abs'::text, 'pvc'::text, 'polyethylene'::text, 'polypropylene'::text, 'nylon'::text, 'polyurethane'::text, 'pom'::text, 'peek'::text, 'ptfe'::text, 'polycarbonate'::text, 'acrylic'::text, 'phenolic'::text, 'carbon_fiber'::text, 'fiberglass'::text, 'composite'::text, 'rubber'::text, 'silicone'::text, 'neoprene'::text, 'viton'::text, 'ceramic'::text, 'glass'::text, 'porcelain'::text, 'wood'::text, 'leather'::text, 'fabric'::text, 'paper'::text, 'other'::text, 'mixed_materials'::text])))) not valid;

alter table "public"."parts" validate constraint "valid_material_type";

alter table "public"."permission_audit_log" add constraint "permission_audit_log_change_type_check" CHECK ((change_type = ANY (ARRAY['granted'::text, 'revoked'::text, 'inherited'::text, 'expired'::text, 'bulk_update'::text]))) not valid;

alter table "public"."permission_audit_log" validate constraint "permission_audit_log_change_type_check";

alter table "public"."permission_audit_log" add constraint "permission_audit_log_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES employees(id) not valid;

alter table "public"."permission_audit_log" validate constraint "permission_audit_log_changed_by_fkey";

alter table "public"."permission_audit_log" add constraint "permission_audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE not valid;

alter table "public"."permission_audit_log" validate constraint "permission_audit_log_user_id_fkey";

alter table "public"."permission_inheritance" add constraint "permission_inheritance_role_check" CHECK ((role = ANY (ARRAY['employee'::text, 'manager'::text, 'admin'::text]))) not valid;

alter table "public"."permission_inheritance" validate constraint "permission_inheritance_role_check";

alter table "public"."permission_inheritance" add constraint "permission_inheritance_user_id_fkey" FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE not valid;

alter table "public"."permission_inheritance" validate constraint "permission_inheritance_user_id_fkey";

alter table "public"."permission_inheritance" add constraint "permission_inheritance_user_id_role_key" UNIQUE using index "permission_inheritance_user_id_role_key";

alter table "public"."permission_modules" add constraint "permission_modules_module_category_check" CHECK ((module_category = ANY (ARRAY['core'::text, 'inventory'::text, 'customs'::text, 'reporting'::text, 'admin'::text]))) not valid;

alter table "public"."permission_modules" validate constraint "permission_modules_module_category_check";

alter table "public"."permission_templates" add constraint "permission_templates_module_code_fkey" FOREIGN KEY (module_code) REFERENCES permission_modules(module_code) ON DELETE CASCADE not valid;

alter table "public"."permission_templates" validate constraint "permission_templates_module_code_fkey";

alter table "public"."permission_templates" add constraint "permission_templates_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'warehouse_staff'::text]))) not valid;

alter table "public"."permission_templates" validate constraint "permission_templates_role_check";

alter table "public"."permission_templates" add constraint "permission_templates_role_module_code_action_key" UNIQUE using index "permission_templates_role_module_code_action_key";

alter table "public"."preadmissions" add constraint "preadmissions_admissionid_key" UNIQUE using index "preadmissions_admissionid_key";

alter table "public"."preadmissions" add constraint "preadmissions_customerid_fkey" FOREIGN KEY ("customerId") REFERENCES customers(id) not valid;

alter table "public"."preadmissions" validate constraint "preadmissions_customerid_fkey";

alter table "public"."preadmissions" add constraint "preadmissions_zone_status_check" CHECK ((zone_status = ANY (ARRAY['PF'::text, 'NPF'::text, 'D'::text, 'ZR'::text]))) not valid;

alter table "public"."preadmissions" validate constraint "preadmissions_zone_status_check";

alter table "public"."preshipments" add constraint "preshipments_customerid_fkey" FOREIGN KEY ("customerId") REFERENCES customers(id) not valid;

alter table "public"."preshipments" validate constraint "preshipments_customerid_fkey";

alter table "public"."storage_locations" add constraint "storage_locations_location_code_key" UNIQUE using index "storage_locations_location_code_key";

alter table "public"."system_pages" add constraint "system_pages_page_category_check" CHECK ((page_category = ANY (ARRAY['operations'::text, 'administrative'::text, 'reporting'::text, 'reference'::text]))) not valid;

alter table "public"."system_pages" validate constraint "system_pages_page_category_check";

alter table "public"."transactions" add constraint "transactions_lot_id_fkey" FOREIGN KEY (lot_id) REFERENCES inventory_lots(id) not valid;

alter table "public"."transactions" validate constraint "transactions_lot_id_fkey";

alter table "public"."us_ports" add constraint "us_ports_port_code_key" UNIQUE using index "us_ports_port_code_key";

alter table "public"."user_page_permissions" add constraint "user_page_permissions_access_level_check" CHECK ((access_level = ANY (ARRAY['none'::text, 'read'::text, 'write'::text, 'write_with_approval'::text]))) not valid;

alter table "public"."user_page_permissions" validate constraint "user_page_permissions_access_level_check";

alter table "public"."user_page_permissions" add constraint "user_page_permissions_department_check" CHECK ((department = ANY (ARRAY['executive'::text, 'warehouse'::text, 'accounting'::text, 'shipping_receiving'::text]))) not valid;

alter table "public"."user_page_permissions" validate constraint "user_page_permissions_department_check";

alter table "public"."user_page_permissions" add constraint "user_page_permissions_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES employees(id) not valid;

alter table "public"."user_page_permissions" validate constraint "user_page_permissions_granted_by_fkey";

alter table "public"."user_page_permissions" add constraint "user_page_permissions_page_code_fkey" FOREIGN KEY (page_code) REFERENCES system_pages(page_code) ON DELETE CASCADE not valid;

alter table "public"."user_page_permissions" validate constraint "user_page_permissions_page_code_fkey";

alter table "public"."user_page_permissions" add constraint "user_page_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE not valid;

alter table "public"."user_page_permissions" validate constraint "user_page_permissions_user_id_fkey";

alter table "public"."user_page_permissions" add constraint "user_page_permissions_user_id_page_code_key" UNIQUE using index "user_page_permissions_user_id_page_code_key";

alter table "public"."user_permissions" add constraint "user_permissions_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES employees(id) not valid;

alter table "public"."user_permissions" validate constraint "user_permissions_granted_by_fkey";

alter table "public"."user_permissions" add constraint "user_permissions_module_code_fkey" FOREIGN KEY (module_code) REFERENCES permission_modules(module_code) ON DELETE CASCADE not valid;

alter table "public"."user_permissions" validate constraint "user_permissions_module_code_fkey";

alter table "public"."user_permissions" add constraint "user_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE not valid;

alter table "public"."user_permissions" validate constraint "user_permissions_user_id_fkey";

alter table "public"."user_permissions" add constraint "user_permissions_user_id_module_code_action_key" UNIQUE using index "user_permissions_user_id_module_code_action_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.apply_role_template_permissions(p_user_id uuid, p_role text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    permissions_applied integer := 0;
    template_rec RECORD;
BEGIN
    -- Loop through all template permissions for the role
    FOR template_rec IN 
        SELECT module_code, action, default_granted
        FROM public.permission_templates
        WHERE role = p_role
    LOOP
        -- Insert or update user permission (inherited)
        INSERT INTO public.user_permissions (
            user_id, module_code, action, granted, is_inherited, granted_by, granted_at
        ) VALUES (
            p_user_id, template_rec.module_code, template_rec.action, 
            template_rec.default_granted, true, p_user_id, now()
        )
        ON CONFLICT (user_id, module_code, action) DO UPDATE SET
            granted = CASE 
                WHEN user_permissions.is_inherited THEN template_rec.default_granted 
                ELSE user_permissions.granted -- Keep custom override
            END,
            updated_at = now()
        WHERE user_permissions.is_inherited = true; -- Only update inherited permissions
        
        permissions_applied := permissions_applied + 1;
    END LOOP;
    
    -- Update inheritance tracking
    INSERT INTO public.permission_inheritance (user_id, role, last_template_applied_at)
    VALUES (p_user_id, p_role, now())
    ON CONFLICT (user_id, role) DO UPDATE SET
        last_template_applied_at = now(),
        updated_at = now();
    
    RETURN permissions_applied;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_permission_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    change_type_val text;
    old_granted boolean;
    new_granted boolean;
BEGIN
    -- Determine change type and values based on operation
    IF TG_OP = 'INSERT' THEN
        change_type_val := CASE WHEN NEW.granted THEN 'granted' ELSE 'revoked' END;
        old_granted := false;
        new_granted := NEW.granted;
    ELSIF TG_OP = 'UPDATE' THEN
        change_type_val := CASE 
            WHEN OLD.granted != NEW.granted THEN
                CASE WHEN NEW.granted THEN 'granted' ELSE 'revoked' END
            ELSE 'updated'
        END;
        old_granted := OLD.granted;
        new_granted := NEW.granted;
    ELSIF TG_OP = 'DELETE' THEN
        change_type_val := 'revoked';
        old_granted := OLD.granted;
        new_granted := false;
    END IF;
    
    -- Only log if there's a meaningful change
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.granted != NEW.granted) OR TG_OP = 'INSERT' THEN
        INSERT INTO public.permission_audit_log (
            user_id, change_type, module_code, action,
            old_value, new_value, changed_by, metadata
        ) VALUES (
            COALESCE(NEW.user_id, OLD.user_id),
            change_type_val,
            COALESCE(NEW.module_code, OLD.module_code),
            COALESCE(NEW.action, OLD.action),
            jsonb_build_object(
                'granted', old_granted,
                'is_inherited', COALESCE(OLD.is_inherited, false),
                'expires_at', OLD.expires_at
            ),
            jsonb_build_object(
                'granted', new_granted,
                'is_inherited', COALESCE(NEW.is_inherited, false),
                'expires_at', NEW.expires_at
            ),
            COALESCE(NEW.granted_by, OLD.granted_by),
            jsonb_build_object('trigger', TG_OP, 'table', TG_TABLE_NAME)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.bulk_update_user_permissions(p_user_id uuid, p_permissions jsonb, p_changed_by uuid, p_reason text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    permission_rec RECORD;
    permissions_updated integer := 0;
    bulk_operation_id uuid := gen_random_uuid();
BEGIN
    -- Process each permission in the array
    FOR permission_rec IN 
        SELECT 
            (value->>'module_code')::text as module_code,
            (value->>'action')::text as action,
            (value->>'granted')::boolean as granted
        FROM jsonb_array_elements(p_permissions)
    LOOP
        -- Update or insert permission
        INSERT INTO public.user_permissions (
            user_id, module_code, action, granted, is_inherited, granted_by, granted_at
        ) VALUES (
            p_user_id, permission_rec.module_code, permission_rec.action, 
            permission_rec.granted, false, p_changed_by, now()
        )
        ON CONFLICT (user_id, module_code, action) DO UPDATE SET
            granted = permission_rec.granted,
            is_inherited = false,
            granted_by = p_changed_by,
            granted_at = now(),
            updated_at = now();
        
        -- Log the change
        INSERT INTO public.permission_audit_log (
            user_id, change_type, module_code, action,
            old_value, new_value, changed_by, reason, metadata
        ) VALUES (
            p_user_id, 'bulk_update', permission_rec.module_code, permission_rec.action,
            jsonb_build_object('granted', NOT permission_rec.granted), 
            jsonb_build_object('granted', permission_rec.granted),
            p_changed_by, p_reason,
            jsonb_build_object('bulk_operation_id', bulk_operation_id)
        );
        
        permissions_updated := permissions_updated + 1;
    END LOOP;
    
    RETURN permissions_updated;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_user_permissions(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_user_role text;
    target_user_role text;
BEGIN
    -- Get current user's role
    SELECT role INTO current_user_role
    FROM public.employees 
    WHERE user_id = auth.uid();
    
    -- Get target user's role
    SELECT role INTO target_user_role
    FROM public.employees 
    WHERE id = target_user_id;
    
    -- Admins can manage anyone's permissions
    IF current_user_role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Managers can manage warehouse_staff permissions only
    IF current_user_role = 'manager' AND target_user_role = 'warehouse_staff' THEN
        RETURN true;
    END IF;
    
    -- Users can view their own permissions (but not modify)
    IF target_user_id = (SELECT id FROM public.employees WHERE user_id = auth.uid()) THEN
        RETURN false; -- Read-only for own permissions
    END IF;
    
    RETURN false;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_permission(required_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      user_role text;
      user_is_admin boolean := false;
      has_permission boolean := false;
  BEGIN
      -- Get current user's role and admin status
      SELECT role, COALESCE(is_admin, false) INTO user_role, user_is_admin
      FROM public.employees
      WHERE user_id = auth.uid();

      -- Anyone with is_admin flag has all permissions
      IF user_is_admin THEN
          RETURN true;
      END IF;

      -- Legacy admin role check (for backwards compatibility)
      IF user_role = 'admin' THEN
          RETURN true;
      END IF;

      -- Check role-based permissions
      CASE required_permission
          WHEN 'admin' THEN
              has_permission := (user_is_admin OR user_role = 'admin');
          WHEN 'manage_users' THEN
              has_permission := (user_is_admin OR user_role = 'admin');
          WHEN 'manage_team' THEN
              has_permission := (user_is_admin OR user_role IN ('admin', 'manager'));
          WHEN 'view_reports' THEN
              has_permission := (user_is_admin OR user_role IN ('admin', 'manager'));
          WHEN 'manage_shipments' THEN
              has_permission := (user_is_admin OR user_role IN ('admin', 'manager'));
          WHEN 'manage_parts' THEN
              has_permission := (user_is_admin OR user_role IN ('admin', 'manager'));
          WHEN 'manage_customers' THEN
              has_permission := (user_is_admin OR user_role IN ('admin', 'manager'));
          ELSE
              -- Check granular permissions table
              SELECT EXISTS(
                  SELECT 1 FROM public.user_permissions up
                  JOIN public.employees e ON up.employee_id = e.id
                  WHERE e.user_id = auth.uid() AND up.permission = required_permission
              ) INTO has_permission;
      END CASE;

      RETURN has_permission;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.create_employee(p_name text, p_email text, p_job_title text DEFAULT NULL::text, p_role text DEFAULT 'employee'::text, p_manager_id uuid DEFAULT NULL::uuid, p_temp_password text DEFAULT NULL::text, p_is_admin boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_employee_id UUID;
    v_auth_user_id UUID;
    v_current_user_role TEXT;
    v_current_user_is_admin BOOLEAN;
BEGIN
    -- Enhanced security check using hybrid system
    IF NOT check_user_permission('admin') THEN
        RETURN json_build_object('error', 'Unauthorized: Admin access required');
    END IF;
    
    -- Get current user's role and admin status for additional validation
    SELECT role, COALESCE(is_admin, false) INTO v_current_user_role, v_current_user_is_admin
    FROM employees 
    WHERE (user_id = auth.uid() OR LOWER(email) = LOWER(auth.email()))
    AND is_active = true
    LIMIT 1;
    
    -- Special handling for admin@lucerne.com
    IF auth.email() = 'admin@lucerne.com' THEN
        v_current_user_is_admin := true;
    END IF;
    
    -- Only admins (role=admin OR is_admin=true) can grant admin privileges
    IF p_is_admin = true AND NOT (v_current_user_role = 'admin' OR v_current_user_is_admin = true) THEN
        RETURN json_build_object('error', 'Only administrators can grant admin privileges');
    END IF;
    
    -- Validate inputs
    IF p_name IS NULL OR TRIM(p_name) = '' THEN
        RETURN json_build_object('error', 'Name is required');
    END IF;
    
    IF p_email IS NULL OR TRIM(p_email) = '' THEN
        RETURN json_build_object('error', 'Email is required');
    END IF;
    
    -- Check if email already exists in employees table
    IF EXISTS (SELECT 1 FROM employees WHERE email = LOWER(TRIM(p_email))) THEN
        RETURN json_build_object('error', 'Employee with this email already exists');
    END IF;
    
    -- Check if email exists in auth.users
    SELECT id INTO v_auth_user_id 
    FROM auth.users 
    WHERE email = LOWER(TRIM(p_email));
    
    -- Create employee record - only include columns that actually exist
    INSERT INTO employees (
        name,
        email,
        job_title,
        role,
        manager_id,
        department,
        is_active,
        is_admin,
        temp_password,
        must_change_password,
        user_id
    ) VALUES (
        TRIM(p_name),
        LOWER(TRIM(p_email)),
        COALESCE(TRIM(p_job_title), ''),
        p_role,
        p_manager_id,
        COALESCE((SELECT department FROM employees WHERE id = p_manager_id), 'warehouse'),
        true,
        p_is_admin,
        p_temp_password,
        (p_temp_password IS NOT NULL),
        v_auth_user_id
    ) RETURNING id INTO v_employee_id;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'Employee created successfully',
        'employee_id', v_employee_id,
        'auth_user_exists', (v_auth_user_id IS NOT NULL),
        'is_admin', p_is_admin
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'error', 
            'Failed to create employee: ' || SQLERRM
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_missing_auth_users()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      employee_record RECORD;
      auth_user_id UUID;
      created_count INTEGER := 0;
      result JSON;
  BEGIN
      -- Only admins can run this function
      IF NOT check_user_permission('admin') THEN
          RETURN json_build_object('error', 'Unauthorized: Admin access required');
      END IF;

      -- Loop through employees who have temp passwords but no user_id
      FOR employee_record IN
          SELECT id, name, email, temp_password
          FROM employees
          WHERE temp_password IS NOT NULL
          AND user_id IS NULL
          AND is_active = true
      LOOP
          BEGIN
              -- This is a placeholder - in practice, you'll need to use Supabase's admin API
              -- to create auth users with passwords. This function documents what needs to happen.

              -- For now, we'll just log what should be created
              RAISE NOTICE 'Should create auth user for: % (%) with password: %',
                  employee_record.name,
                  employee_record.email,
                  employee_record.temp_password;

              created_count := created_count + 1;

          EXCEPTION
              WHEN OTHERS THEN
                  RAISE NOTICE 'Failed to create auth user for %: %', employee_record.email, SQLERRM;
          END;
      END LOOP;

      RETURN json_build_object(
          'success', true,
          'message', format('Found %s employees needing auth accounts', created_count),
          'employees_needing_auth', created_count
      );
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.deactivate_employee(p_employee_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check permission
    IF NOT check_user_permission('manage_users') THEN
        RETURN jsonb_build_object('error', 'Insufficient permissions to deactivate employees');
    END IF;
    
    -- Update employee status
    UPDATE public.employees SET is_active = false WHERE id = p_employee_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Employee not found');
    END IF;
    
    -- Log the action
    INSERT INTO public.user_audit_log (employee_id, action, details, performed_by)
    SELECT p_employee_id, 'employee_deactivated', '{}'::jsonb, e.id
    FROM public.employees e
    WHERE e.user_id = auth.uid();
    
    RETURN jsonb_build_object('success', true, 'message', 'Employee deactivated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_single_primary_contact()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If this contact is being set as primary
    IF NEW.is_primary = true THEN
        -- Set all other contacts for this customer to non-primary
        UPDATE contacts 
        SET is_primary = false 
        WHERE customer_id = NEW.customer_id 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_single_primary_variant()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If setting this variant as primary, unset others for the same part
    IF NEW.is_primary = true THEN
        UPDATE part_variants 
        SET is_primary = false 
        WHERE part_id = NEW.part_id 
        AND id != COALESCE(NEW.id, -1)
        AND is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$function$
;

create or replace view "public"."entry_summary_groups_with_stats" as  SELECT esg.id,
    esg.group_name,
    esg.group_description,
    esg.week_ending_date,
    esg.target_entry_date,
    esg.entry_year,
    esg.entry_quarter,
    esg.filing_district_port,
    esg.entry_filer_code,
    esg.foreign_trade_zone_identifier,
    esg.status,
    esg.entry_number,
    esg.filed_at,
    esg.filed_by,
    esg.estimated_total_value,
    esg.estimated_total_duties,
    esg.estimated_total_taxes,
    esg.created_at,
    esg.updated_at,
    esg.created_by,
    esg.updated_by,
    COALESCE(stats.preshipments_count, (0)::bigint) AS preshipments_count,
    COALESCE(stats.customers_count, (0)::bigint) AS customers_count,
    COALESCE(stats.total_line_items, (0)::bigint) AS total_line_items,
    COALESCE(stats.customer_names, ''::text) AS customer_names
   FROM (entry_summary_groups esg
     LEFT JOIN ( SELECT egp.group_id,
            count(DISTINCT egp.preshipment_id) AS preshipments_count,
            count(DISTINCT p."customerId") AS customers_count,
            sum(jsonb_array_length(p.items)) AS total_line_items,
            string_agg(DISTINCT c.name, ', '::text) AS customer_names
           FROM ((entry_group_preshipments egp
             JOIN preshipments p ON ((egp.preshipment_id = p.id)))
             JOIN customers c ON ((p."customerId" = c.id)))
          GROUP BY egp.group_id) stats ON ((esg.id = stats.group_id)));


CREATE OR REPLACE FUNCTION public.generate_reconciliation(start_date date, end_date date)
 RETURNS TABLE(part_id text, beginning_balance bigint, admitted bigint, withdrawn bigint, adjusted bigint, ending_balance bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH part_transactions AS (
        SELECT
            p.id AS part_id,
            t.transaction_date,
            t.quantity_change,
            t.type
        FROM
            parts p
        LEFT JOIN
            inventory_lots il ON p.id = il.part_id
        LEFT JOIN
            transactions t ON il.id = t.lot_id
    )
    SELECT
        p.id,
        -- Beginning Balance: Sum of all transactions before the start date
        COALESCE(SUM(CASE WHEN pt.transaction_date < start_date THEN pt.quantity_change ELSE 0 END), 0)::bigint AS beginning_balance,
        
        -- Admitted: Sum of 'Admission' transactions within the date range
        COALESCE(SUM(CASE WHEN pt.type = 'Admission' AND pt.transaction_date BETWEEN start_date AND end_date THEN pt.quantity_change ELSE 0 END), 0)::bigint AS admitted,
        
        -- Withdrawn: Sum of 'Removal' transactions within the date range (absolute value)
        COALESCE(ABS(SUM(CASE WHEN pt.type = 'Removal' AND pt.transaction_date BETWEEN start_date AND end_date THEN pt.quantity_change ELSE 0 END)), 0)::bigint AS withdrawn,

        -- Adjusted: Sum of 'Adjustment' transactions within the date range
        COALESCE(SUM(CASE WHEN pt.type = 'Adjustment' AND pt.transaction_date BETWEEN start_date AND end_date THEN pt.quantity_change ELSE 0 END), 0)::bigint AS adjusted,

        -- Ending Balance: Sum of all transactions up to the end date
        COALESCE(SUM(CASE WHEN pt.transaction_date <= end_date THEN pt.quantity_change ELSE 0 END), 0)::bigint AS ending_balance
    FROM
        parts p
    LEFT JOIN
        part_transactions pt ON p.id = pt.part_id
    GROUP BY
        p.id
    ORDER BY
        p.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_all_employees()
 RETURNS TABLE(id uuid, user_id uuid, name text, email text, job_title text, role text, department text, manager_id uuid, manager_name text, is_active boolean, is_admin boolean, created_at timestamp with time zone, last_login timestamp with time zone, email_confirmed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
      -- Check permission
      IF NOT check_user_permission('manage_users') THEN
          RAISE EXCEPTION 'Insufficient permissions to view all employees';
      END IF;

      RETURN QUERY
      SELECT e.id, e.user_id, e.name, e.email, e.job_title, e.role, e.department,
             e.manager_id, m.name as manager_name, e.is_active,
             COALESCE(e.is_admin, false) as is_admin,
             e.created_at, e.last_login, (e.user_id IS NOT NULL) as email_confirmed
      FROM public.employees e
      LEFT JOIN public.employees m ON e.manager_id = m.id
      ORDER BY e.created_at DESC;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.get_current_employee()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_current_user_id UUID;
    v_user_email TEXT;
    v_employee RECORD;
    v_result JSON;
BEGIN
    -- Get current authenticated user
    SELECT auth.uid() INTO v_current_user_id;
    
    IF v_current_user_id IS NULL THEN
        RETURN json_build_object('error', 'Not authenticated');
    END IF;
    
    -- Get user's email from auth.users
    SELECT email INTO v_user_email 
    FROM auth.users 
    WHERE id = v_current_user_id;
    
    IF v_user_email IS NULL THEN
        RETURN json_build_object('error', 'User email not found');
    END IF;
    
    -- Find employee by email with all expected columns
    SELECT 
        e.id,
        COALESCE(e.name, '') as name,
        e.email,
        COALESCE(e.job_title, '') as job_title,
        COALESCE(e.role, 'warehouse_staff') as role,
        COALESCE(e.department, 'warehouse') as department,
        e.manager_id,
        COALESCE(m.name, '') as manager_name,
        COALESCE(e.is_active, true) as is_active,
        COALESCE(e.is_admin, false) as is_admin,
        COALESCE(e.email_confirmed, false) as email_confirmed,
        e.last_login,
        e.created_at
    INTO v_employee
    FROM employees e
    LEFT JOIN employees m ON e.manager_id = m.id
    WHERE e.email = v_user_email;
    
    IF v_employee IS NULL THEN
        RETURN json_build_object('error', 'Employee record not found for email: ' || v_user_email);
    END IF;
    
    -- Build result JSON with all expected fields
    SELECT json_build_object(
        'id', v_employee.id,
        'name', v_employee.name,
        'email', v_employee.email,
        'job_title', v_employee.job_title,
        'role', v_employee.role,
        'department', v_employee.department,
        'manager_id', v_employee.manager_id,
        'manager_name', v_employee.manager_name,
        'is_active', v_employee.is_active,
        'is_admin', v_employee.is_admin,
        'email_confirmed', v_employee.email_confirmed,
        'last_login', v_employee.last_login,
        'created_at', v_employee.created_at
    ) INTO v_result;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_profile()
 RETURNS TABLE(employee_id uuid, name text, email text, job_title text, department text, manager_name text, start_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.email,
        e.job_title,
        e.department,
        m.name as manager_name,
        e.start_date
    FROM employees e
    LEFT JOIN employees m ON e.manager_id = m.id
    WHERE e.auth_user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_managers_list()
 RETURNS TABLE(id uuid, name text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        e.email
    FROM employees e
    WHERE e.role IN ('manager', 'admin')
      AND e.is_active = true
    ORDER BY e.name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_accessible_pages(p_user_id uuid)
 RETURNS TABLE(page_code text, page_name text, access_level text, requires_approval boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        sp.page_code,
        sp.page_name,
        upp.access_level,
        (upp.access_level = 'write_with_approval') as requires_approval
    FROM public.system_pages sp
    INNER JOIN public.user_page_permissions upp ON sp.page_code = upp.page_code
    WHERE upp.user_id = p_user_id
    AND upp.is_active = true
    AND upp.access_level != 'none'
    AND sp.is_active = true
    ORDER BY sp.display_order, sp.page_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_module_permissions(p_user_id uuid, p_module_code text DEFAULT NULL::text)
 RETURNS TABLE(module_code text, module_name text, action text, granted boolean, is_inherited boolean, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        up.module_code,
        pm.module_name,
        up.action,
        up.granted,
        up.is_inherited,
        up.expires_at
    FROM public.user_permissions up
    INNER JOIN public.permission_modules pm ON up.module_code = pm.module_code
    WHERE up.user_id = p_user_id
    AND (p_module_code IS NULL OR up.module_code = p_module_code)
    AND pm.is_active = true
    AND (up.expires_at IS NULL OR up.expires_at > now())
    ORDER BY pm.display_order, pm.module_name, up.action;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_account_locked(p_email text, p_ip_address text DEFAULT '127.0.0.1'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- For now, just return false (no account locking)
    -- This can be enhanced later with proper login attempt tracking
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_employee_to_auth_user(p_employee_email text, p_auth_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
      -- Only admins can run this function
      IF NOT check_user_permission('admin') THEN
          RETURN json_build_object('error', 'Unauthorized: Admin access required');
      END IF;

      -- Update the employee record to link to the auth user
      UPDATE employees
      SET user_id = p_auth_user_id
      WHERE email = LOWER(TRIM(p_employee_email))
      AND is_active = true;

      IF FOUND THEN
          RETURN json_build_object(
              'success', true,
              'message', format('Linked employee %s to auth user %s', p_employee_email, p_auth_user_id)
          );
      ELSE
          RETURN json_build_object(
              'error', format('Employee not found: %s', p_employee_email)
          );
      END IF;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.log_approval_workflow()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Log approval status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO public.approval_workflow_log (
            approval_request_id,
            action,
            performed_by,
            notes,
            metadata
        ) VALUES (
            NEW.id,
            CASE NEW.status
                WHEN 'approved' THEN 'approved'
                WHEN 'denied' THEN 'denied'
                WHEN 'cancelled' THEN 'cancelled'
                ELSE 'status_changed'
            END,
            NEW.approved_by,
            NEW.approval_notes,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'approved_at', NEW.approved_at
            )
        );
    ELSIF TG_OP = 'INSERT' THEN
        -- Log new approval request
        INSERT INTO public.approval_workflow_log (
            approval_request_id,
            action,
            performed_by,
            notes,
            metadata
        ) VALUES (
            NEW.id,
            'created',
            NEW.requested_by,
            'Approval request created',
            jsonb_build_object(
                'action_type', NEW.action_type,
                'page_code', NEW.page_code,
                'priority', NEW.priority
            )
        );
    END IF;
    
    RETURN NEW;
END;
$function$
;

create or replace view "public"."module_permission_matrix" as  SELECT pm.module_code,
    pm.module_name,
    pm.module_category,
    e.role,
    pt.action,
    COALESCE(pt.default_granted, false) AS default_granted
   FROM ((permission_modules pm
     CROSS JOIN ( SELECT DISTINCT employees.role
           FROM employees) e)
     LEFT JOIN permission_templates pt ON (((pm.module_code = pt.module_code) AND (e.role = pt.role))))
  WHERE (pm.is_active = true)
  ORDER BY pm.display_order, pm.module_name, e.role, pt.action;


create or replace view "public"."permission_audit_summary" as  SELECT date_trunc('day'::text, created_at) AS audit_date,
    change_type,
    module_code,
    count(*) AS change_count,
    count(DISTINCT user_id) AS users_affected,
    count(DISTINCT changed_by) AS administrators_involved
   FROM permission_audit_log pal
  WHERE (created_at >= (now() - '30 days'::interval))
  GROUP BY (date_trunc('day'::text, created_at)), change_type, module_code
  ORDER BY (date_trunc('day'::text, created_at)) DESC, (count(*)) DESC;


CREATE OR REPLACE FUNCTION public.reset_user_password(p_employee_id uuid, p_new_password text DEFAULT NULL::text, p_force_change boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      target_user_id uuid;
      target_email text;
  BEGIN
      -- Check permission
      IF NOT check_user_permission('manage_users') THEN
          RETURN jsonb_build_object('error', 'Insufficient permissions to reset passwords');
      END IF;

      -- Get user_id and email for the employee
      SELECT user_id, email INTO target_user_id, target_email
      FROM public.employees
      WHERE id = p_employee_id;

      IF NOT FOUND THEN
          RETURN jsonb_build_object('error', 'Employee not found');
      END IF;

      IF target_user_id IS NULL THEN
          RETURN jsonb_build_object('error', 'Employee has no auth account');
      END IF;

      -- Generate random password if none provided
      IF p_new_password IS NULL THEN
          p_new_password := substring(md5(random()::text) from 1 for 12) || '!';
      END IF;

      -- Update employee record with temp password
      UPDATE public.employees
      SET temp_password = p_new_password,
          must_change_password = p_force_change
      WHERE id = p_employee_id;

      -- Log the action
      INSERT INTO public.user_audit_log (employee_id, action, details, performed_by)
      SELECT p_employee_id, 'password_reset',
             jsonb_build_object('force_change', p_force_change),
             e.id
      FROM public.employees e
      WHERE e.user_id = auth.uid();

      RETURN jsonb_build_object(
          'success', true,
          'message', 'Password reset successfully',
          'temp_password', p_new_password,
          'email', target_email
      );
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.sync_employee_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- When status changes, update is_active
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.is_active = CASE 
            WHEN NEW.status = 'active' THEN true
            ELSE false
        END;
    END IF;
    
    -- When is_active changes, update status
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        NEW.status = CASE 
            WHEN NEW.is_active = true THEN 'active'
            ELSE 'inactive'
        END;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.track_login_attempt(p_email text, p_ip_address text, p_success boolean, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.login_attempts (email, ip_address, success, user_agent)
    VALUES (p_email, p_ip_address::inet, p_success, p_user_agent);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_employee(p_employee_id uuid, p_name text DEFAULT NULL::text, p_job_title text DEFAULT NULL::text, p_role text DEFAULT NULL::text, p_manager_id uuid DEFAULT NULL::uuid, p_department text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    current_employee public.employees%ROWTYPE;
    result jsonb;
    changes jsonb := '{}'::jsonb;
BEGIN
    -- Check permission
    IF NOT check_user_permission('manage_users') THEN
        RETURN jsonb_build_object('error', 'Insufficient permissions to update employees');
    END IF;
    
    -- Get current employee data
    SELECT * INTO current_employee FROM public.employees WHERE id = p_employee_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Employee not found');
    END IF;
    
    -- Build update query dynamically and track changes
    UPDATE public.employees SET
        name = COALESCE(p_name, name),
        job_title = COALESCE(p_job_title, job_title),
        role = COALESCE(p_role, role),
        manager_id = COALESCE(p_manager_id, manager_id),
        department = COALESCE(p_department, department),
        is_active = COALESCE(p_is_active, is_active)
    WHERE id = p_employee_id;
    
    -- Build changes object for audit
    IF p_name IS NOT NULL AND p_name != current_employee.name THEN
        changes := changes || jsonb_build_object('name', jsonb_build_object('from', current_employee.name, 'to', p_name));
    END IF;
    IF p_role IS NOT NULL AND p_role != current_employee.role THEN
        changes := changes || jsonb_build_object('role', jsonb_build_object('from', current_employee.role, 'to', p_role));
    END IF;
    IF p_is_active IS NOT NULL AND p_is_active != current_employee.is_active THEN
        changes := changes || jsonb_build_object('is_active', jsonb_build_object('from', current_employee.is_active, 'to', p_is_active));
    END IF;
    
    -- Log the action
    INSERT INTO public.user_audit_log (employee_id, action, details, performed_by)
    SELECT p_employee_id, 'employee_updated', changes, e.id
    FROM public.employees e
    WHERE e.user_id = auth.uid();
    
    RETURN jsonb_build_object('success', true, 'message', 'Employee updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_employee(p_employee_id uuid, p_name text DEFAULT NULL::text, p_job_title text DEFAULT NULL::text, p_role text DEFAULT NULL::text, p_manager_id uuid DEFAULT NULL::uuid, p_department text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean, p_is_admin boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      current_employee public.employees%ROWTYPE;
      result jsonb;
      changes jsonb := '{}'::jsonb;
  BEGIN
      -- Check permission
      IF NOT check_user_permission('manage_users') THEN
          RETURN jsonb_build_object('error', 'Insufficient permissions to update employees');
      END IF;

      -- Get current employee data
      SELECT * INTO current_employee FROM public.employees WHERE id = p_employee_id;

      IF NOT FOUND THEN
          RETURN jsonb_build_object('error', 'Employee not found');
      END IF;

      -- Build update query dynamically and track changes
      UPDATE public.employees SET
          name = COALESCE(p_name, name),
          job_title = COALESCE(p_job_title, job_title),
          role = COALESCE(p_role, role),
          manager_id = COALESCE(p_manager_id, manager_id),
          department = COALESCE(p_department, department),
          is_active = COALESCE(p_is_active, is_active),
          is_admin = COALESCE(p_is_admin, is_admin)
      WHERE id = p_employee_id;

      -- Build changes object for audit
      IF p_name IS NOT NULL AND p_name != current_employee.name THEN
          changes := changes || jsonb_build_object('name', jsonb_build_object('from', current_employee.name, 'to',
  p_name));
      END IF;
      IF p_role IS NOT NULL AND p_role != current_employee.role THEN
          changes := changes || jsonb_build_object('role', jsonb_build_object('from', current_employee.role, 'to',
  p_role));
      END IF;
      IF p_is_active IS NOT NULL AND p_is_active != current_employee.is_active THEN
          changes := changes || jsonb_build_object('is_active', jsonb_build_object('from', current_employee.is_active,     
   'to', p_is_active));
      END IF;
      IF p_is_admin IS NOT NULL AND p_is_admin != COALESCE(current_employee.is_admin, false) THEN
          changes := changes || jsonb_build_object('is_admin', jsonb_build_object('from',
  COALESCE(current_employee.is_admin, false), 'to', p_is_admin));
      END IF;

      -- Log the action
      INSERT INTO public.user_audit_log (employee_id, action, details, performed_by)
      SELECT p_employee_id, 'employee_updated', changes, e.id
      FROM public.employees e
      WHERE e.user_id = auth.uid();

      RETURN jsonb_build_object('success', true, 'message', 'Employee updated successfully');
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.update_entry_summary_groups_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_last_login()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.employees 
    SET last_login = now()
    WHERE user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_material_indices_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_materials_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_parts_price_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if any pricing fields have changed
    IF (OLD.standard_value IS DISTINCT FROM NEW.standard_value) OR
       (OLD.material_price IS DISTINCT FROM NEW.material_price) OR
       (OLD.labor_price IS DISTINCT FROM NEW.labor_price) OR
       (OLD.overhead_price IS DISTINCT FROM NEW.overhead_price) THEN
        NEW.last_price_update = NOW();
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_permission_timestamps()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_permission_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_preshipment_grouping_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update preshipments table if columns exist
        UPDATE preshipments 
        SET 
            is_grouped = COALESCE(TRUE, is_grouped),
            grouped_at = COALESCE(NOW(), grouped_at),
            group_assignment_notes = COALESCE(NEW.assignment_notes, group_assignment_notes)
        WHERE id = NEW.preshipment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF NOT EXISTS (
            SELECT 1 FROM entry_group_preshipments 
            WHERE preshipment_id = OLD.preshipment_id 
            AND id != OLD.id
        ) THEN
            UPDATE preshipments 
            SET 
                is_grouped = COALESCE(FALSE, is_grouped),
                grouped_at = NULL,
                group_assignment_notes = NULL
            WHERE id = OLD.preshipment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_pricing_adjustments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_storage_locations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_variant_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_action_requires_approval(p_user_id uuid, p_page_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_access_level text;
BEGIN
    SELECT access_level INTO user_access_level
    FROM public.user_page_permissions
    WHERE user_id = p_user_id 
    AND page_code = p_page_code
    AND is_active = true;
    
    RETURN COALESCE(user_access_level = 'write_with_approval', false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_module_permission(p_user_id uuid, p_module_code text, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    permission_granted boolean;
BEGIN
    -- Check direct permission grant
    SELECT granted INTO permission_granted
    FROM public.user_permissions
    WHERE user_id = p_user_id 
    AND module_code = p_module_code
    AND action = p_action
    AND (expires_at IS NULL OR expires_at > now());
    
    -- Return false if no permission found or explicitly denied
    RETURN COALESCE(permission_granted, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_page_access(p_user_id uuid, p_page_code text, p_required_level text DEFAULT 'read'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    user_access_level text;
BEGIN
    -- Get user's access level for this page
    SELECT access_level INTO user_access_level
    FROM public.user_page_permissions
    WHERE user_id = p_user_id 
    AND page_code = p_page_code
    AND is_active = true;
    
    -- No permission record means no access
    IF user_access_level IS NULL OR user_access_level = 'none' THEN
        RETURN false;
    END IF;
    
    -- Check if user's access level meets requirement
    CASE p_required_level
        WHEN 'read' THEN
            RETURN user_access_level IN ('read', 'write', 'write_with_approval');
        WHEN 'write' THEN
            RETURN user_access_level IN ('write', 'write_with_approval');
        WHEN 'write_with_approval' THEN
            RETURN user_access_level = 'write_with_approval';
        ELSE
            RETURN false;
    END CASE;
END;
$function$
;

create or replace view "public"."user_permission_summary" as  SELECT e.id AS user_id,
    e.name AS full_name,
    e.email,
    e.role,
    e.department,
    count(up.id) AS total_permissions,
    count(
        CASE
            WHEN (up.granted = true) THEN 1
            ELSE NULL::integer
        END) AS granted_permissions,
    count(
        CASE
            WHEN (up.is_inherited = true) THEN 1
            ELSE NULL::integer
        END) AS inherited_permissions,
    count(
        CASE
            WHEN ((up.is_inherited = false) AND (up.granted = true)) THEN 1
            ELSE NULL::integer
        END) AS custom_permissions,
    pi.last_template_applied_at,
    pi.custom_overrides_count
   FROM ((employees e
     LEFT JOIN user_permissions up ON ((e.id = up.user_id)))
     LEFT JOIN permission_inheritance pi ON ((e.id = pi.user_id)))
  GROUP BY e.id, e.name, e.email, e.role, e.department, pi.last_template_applied_at, pi.custom_overrides_count;


CREATE OR REPLACE FUNCTION public.validate_module_action(p_module_code text, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    allowed_actions text[];
BEGIN
    SELECT available_actions INTO allowed_actions
    FROM public.permission_modules
    WHERE module_code = p_module_code AND is_active = true;
    
    RETURN p_action = ANY(allowed_actions);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_permission_action()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.permission_modules 
        WHERE module_code = NEW.module_code 
        AND NEW.action = ANY(available_actions)
    ) THEN
        RAISE EXCEPTION 'Action "%" is not valid for module "%"', NEW.action, NEW.module_code;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_preshipment_for_grouping(p_preshipment_id integer, p_group_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB := '{"valid": true, "errors": [], "warnings": []}';
    preshipment_record preshipments%ROWTYPE;
    group_record entry_summary_groups%ROWTYPE;
    error_messages TEXT[] := '{}';
    warning_messages TEXT[] := '{}';
BEGIN
    SELECT * INTO preshipment_record 
    FROM preshipments 
    WHERE id = p_preshipment_id;
    
    IF NOT FOUND THEN
        error_messages := array_append(error_messages, 'Preshipment not found');
        RETURN jsonb_build_object(
            'valid', false,
            'errors', error_messages,
            'warnings', warning_messages
        );
    END IF;
    
    SELECT * INTO group_record 
    FROM entry_summary_groups 
    WHERE id = p_group_id;
    
    IF NOT FOUND THEN
        error_messages := array_append(error_messages, 'Entry summary group not found');
        RETURN jsonb_build_object(
            'valid', false,
            'errors', error_messages,
            'warnings', warning_messages
        );
    END IF;
    
    IF group_record.status != 'draft' THEN
        error_messages := array_append(error_messages, 
            'Cannot add preshipments to non-draft groups');
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM entry_group_preshipments 
        WHERE group_id = p_group_id AND preshipment_id = p_preshipment_id
    ) THEN
        error_messages := array_append(error_messages, 
            'Preshipment is already in this group');
    END IF;
    
    IF preshipment_record.stage NOT IN ('ready', 'approved') THEN
        warning_messages := array_append(warning_messages, 
            'Preshipment is not in ready/approved status');
    END IF;
    
    IF preshipment_record.items IS NULL OR jsonb_array_length(preshipment_record.items) = 0 THEN
        error_messages := array_append(error_messages, 
            'Preshipment has no line items');
    END IF;
    
    RETURN jsonb_build_object(
        'valid', array_length(error_messages, 1) IS NULL,
        'errors', error_messages,
        'warnings', warning_messages
    );
END;
$function$
;

grant delete on table "public"."approval_requests" to "anon";

grant insert on table "public"."approval_requests" to "anon";

grant references on table "public"."approval_requests" to "anon";

grant select on table "public"."approval_requests" to "anon";

grant trigger on table "public"."approval_requests" to "anon";

grant truncate on table "public"."approval_requests" to "anon";

grant update on table "public"."approval_requests" to "anon";

grant delete on table "public"."approval_requests" to "authenticated";

grant insert on table "public"."approval_requests" to "authenticated";

grant references on table "public"."approval_requests" to "authenticated";

grant select on table "public"."approval_requests" to "authenticated";

grant trigger on table "public"."approval_requests" to "authenticated";

grant truncate on table "public"."approval_requests" to "authenticated";

grant update on table "public"."approval_requests" to "authenticated";

grant delete on table "public"."approval_requests" to "service_role";

grant insert on table "public"."approval_requests" to "service_role";

grant references on table "public"."approval_requests" to "service_role";

grant select on table "public"."approval_requests" to "service_role";

grant trigger on table "public"."approval_requests" to "service_role";

grant truncate on table "public"."approval_requests" to "service_role";

grant update on table "public"."approval_requests" to "service_role";

grant delete on table "public"."approval_workflow_log" to "anon";

grant insert on table "public"."approval_workflow_log" to "anon";

grant references on table "public"."approval_workflow_log" to "anon";

grant select on table "public"."approval_workflow_log" to "anon";

grant trigger on table "public"."approval_workflow_log" to "anon";

grant truncate on table "public"."approval_workflow_log" to "anon";

grant update on table "public"."approval_workflow_log" to "anon";

grant delete on table "public"."approval_workflow_log" to "authenticated";

grant insert on table "public"."approval_workflow_log" to "authenticated";

grant references on table "public"."approval_workflow_log" to "authenticated";

grant select on table "public"."approval_workflow_log" to "authenticated";

grant trigger on table "public"."approval_workflow_log" to "authenticated";

grant truncate on table "public"."approval_workflow_log" to "authenticated";

grant update on table "public"."approval_workflow_log" to "authenticated";

grant delete on table "public"."approval_workflow_log" to "service_role";

grant insert on table "public"."approval_workflow_log" to "service_role";

grant references on table "public"."approval_workflow_log" to "service_role";

grant select on table "public"."approval_workflow_log" to "service_role";

grant trigger on table "public"."approval_workflow_log" to "service_role";

grant truncate on table "public"."approval_workflow_log" to "service_role";

grant update on table "public"."approval_workflow_log" to "service_role";

grant delete on table "public"."contacts" to "anon";

grant insert on table "public"."contacts" to "anon";

grant references on table "public"."contacts" to "anon";

grant select on table "public"."contacts" to "anon";

grant trigger on table "public"."contacts" to "anon";

grant truncate on table "public"."contacts" to "anon";

grant update on table "public"."contacts" to "anon";

grant delete on table "public"."contacts" to "authenticated";

grant insert on table "public"."contacts" to "authenticated";

grant references on table "public"."contacts" to "authenticated";

grant select on table "public"."contacts" to "authenticated";

grant trigger on table "public"."contacts" to "authenticated";

grant truncate on table "public"."contacts" to "authenticated";

grant update on table "public"."contacts" to "authenticated";

grant delete on table "public"."contacts" to "service_role";

grant insert on table "public"."contacts" to "service_role";

grant references on table "public"."contacts" to "service_role";

grant select on table "public"."contacts" to "service_role";

grant trigger on table "public"."contacts" to "service_role";

grant truncate on table "public"."contacts" to "service_role";

grant update on table "public"."contacts" to "service_role";

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant references on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant trigger on table "public"."customers" to "anon";

grant truncate on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant references on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant trigger on table "public"."customers" to "authenticated";

grant truncate on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant references on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant trigger on table "public"."customers" to "service_role";

grant truncate on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

grant delete on table "public"."employees" to "anon";

grant insert on table "public"."employees" to "anon";

grant references on table "public"."employees" to "anon";

grant select on table "public"."employees" to "anon";

grant trigger on table "public"."employees" to "anon";

grant truncate on table "public"."employees" to "anon";

grant update on table "public"."employees" to "anon";

grant delete on table "public"."employees" to "authenticated";

grant insert on table "public"."employees" to "authenticated";

grant references on table "public"."employees" to "authenticated";

grant select on table "public"."employees" to "authenticated";

grant trigger on table "public"."employees" to "authenticated";

grant truncate on table "public"."employees" to "authenticated";

grant update on table "public"."employees" to "authenticated";

grant delete on table "public"."employees" to "service_role";

grant insert on table "public"."employees" to "service_role";

grant references on table "public"."employees" to "service_role";

grant select on table "public"."employees" to "service_role";

grant trigger on table "public"."employees" to "service_role";

grant truncate on table "public"."employees" to "service_role";

grant update on table "public"."employees" to "service_role";

grant delete on table "public"."entry_grand_totals" to "anon";

grant insert on table "public"."entry_grand_totals" to "anon";

grant references on table "public"."entry_grand_totals" to "anon";

grant select on table "public"."entry_grand_totals" to "anon";

grant trigger on table "public"."entry_grand_totals" to "anon";

grant truncate on table "public"."entry_grand_totals" to "anon";

grant update on table "public"."entry_grand_totals" to "anon";

grant delete on table "public"."entry_grand_totals" to "authenticated";

grant insert on table "public"."entry_grand_totals" to "authenticated";

grant references on table "public"."entry_grand_totals" to "authenticated";

grant select on table "public"."entry_grand_totals" to "authenticated";

grant trigger on table "public"."entry_grand_totals" to "authenticated";

grant truncate on table "public"."entry_grand_totals" to "authenticated";

grant update on table "public"."entry_grand_totals" to "authenticated";

grant delete on table "public"."entry_grand_totals" to "service_role";

grant insert on table "public"."entry_grand_totals" to "service_role";

grant references on table "public"."entry_grand_totals" to "service_role";

grant select on table "public"."entry_grand_totals" to "service_role";

grant trigger on table "public"."entry_grand_totals" to "service_role";

grant truncate on table "public"."entry_grand_totals" to "service_role";

grant update on table "public"."entry_grand_totals" to "service_role";

grant delete on table "public"."entry_group_preshipments" to "anon";

grant insert on table "public"."entry_group_preshipments" to "anon";

grant references on table "public"."entry_group_preshipments" to "anon";

grant select on table "public"."entry_group_preshipments" to "anon";

grant trigger on table "public"."entry_group_preshipments" to "anon";

grant truncate on table "public"."entry_group_preshipments" to "anon";

grant update on table "public"."entry_group_preshipments" to "anon";

grant delete on table "public"."entry_group_preshipments" to "authenticated";

grant insert on table "public"."entry_group_preshipments" to "authenticated";

grant references on table "public"."entry_group_preshipments" to "authenticated";

grant select on table "public"."entry_group_preshipments" to "authenticated";

grant trigger on table "public"."entry_group_preshipments" to "authenticated";

grant truncate on table "public"."entry_group_preshipments" to "authenticated";

grant update on table "public"."entry_group_preshipments" to "authenticated";

grant delete on table "public"."entry_group_preshipments" to "service_role";

grant insert on table "public"."entry_group_preshipments" to "service_role";

grant references on table "public"."entry_group_preshipments" to "service_role";

grant select on table "public"."entry_group_preshipments" to "service_role";

grant trigger on table "public"."entry_group_preshipments" to "service_role";

grant truncate on table "public"."entry_group_preshipments" to "service_role";

grant update on table "public"."entry_group_preshipments" to "service_role";

grant delete on table "public"."entry_summaries" to "anon";

grant insert on table "public"."entry_summaries" to "anon";

grant references on table "public"."entry_summaries" to "anon";

grant select on table "public"."entry_summaries" to "anon";

grant trigger on table "public"."entry_summaries" to "anon";

grant truncate on table "public"."entry_summaries" to "anon";

grant update on table "public"."entry_summaries" to "anon";

grant delete on table "public"."entry_summaries" to "authenticated";

grant insert on table "public"."entry_summaries" to "authenticated";

grant references on table "public"."entry_summaries" to "authenticated";

grant select on table "public"."entry_summaries" to "authenticated";

grant trigger on table "public"."entry_summaries" to "authenticated";

grant truncate on table "public"."entry_summaries" to "authenticated";

grant update on table "public"."entry_summaries" to "authenticated";

grant delete on table "public"."entry_summaries" to "service_role";

grant insert on table "public"."entry_summaries" to "service_role";

grant references on table "public"."entry_summaries" to "service_role";

grant select on table "public"."entry_summaries" to "service_role";

grant trigger on table "public"."entry_summaries" to "service_role";

grant truncate on table "public"."entry_summaries" to "service_role";

grant update on table "public"."entry_summaries" to "service_role";

grant delete on table "public"."entry_summary_groups" to "anon";

grant insert on table "public"."entry_summary_groups" to "anon";

grant references on table "public"."entry_summary_groups" to "anon";

grant select on table "public"."entry_summary_groups" to "anon";

grant trigger on table "public"."entry_summary_groups" to "anon";

grant truncate on table "public"."entry_summary_groups" to "anon";

grant update on table "public"."entry_summary_groups" to "anon";

grant delete on table "public"."entry_summary_groups" to "authenticated";

grant insert on table "public"."entry_summary_groups" to "authenticated";

grant references on table "public"."entry_summary_groups" to "authenticated";

grant select on table "public"."entry_summary_groups" to "authenticated";

grant trigger on table "public"."entry_summary_groups" to "authenticated";

grant truncate on table "public"."entry_summary_groups" to "authenticated";

grant update on table "public"."entry_summary_groups" to "authenticated";

grant delete on table "public"."entry_summary_groups" to "service_role";

grant insert on table "public"."entry_summary_groups" to "service_role";

grant references on table "public"."entry_summary_groups" to "service_role";

grant select on table "public"."entry_summary_groups" to "service_role";

grant trigger on table "public"."entry_summary_groups" to "service_role";

grant truncate on table "public"."entry_summary_groups" to "service_role";

grant update on table "public"."entry_summary_groups" to "service_role";

grant delete on table "public"."entry_summary_line_items" to "anon";

grant insert on table "public"."entry_summary_line_items" to "anon";

grant references on table "public"."entry_summary_line_items" to "anon";

grant select on table "public"."entry_summary_line_items" to "anon";

grant trigger on table "public"."entry_summary_line_items" to "anon";

grant truncate on table "public"."entry_summary_line_items" to "anon";

grant update on table "public"."entry_summary_line_items" to "anon";

grant delete on table "public"."entry_summary_line_items" to "authenticated";

grant insert on table "public"."entry_summary_line_items" to "authenticated";

grant references on table "public"."entry_summary_line_items" to "authenticated";

grant select on table "public"."entry_summary_line_items" to "authenticated";

grant trigger on table "public"."entry_summary_line_items" to "authenticated";

grant truncate on table "public"."entry_summary_line_items" to "authenticated";

grant update on table "public"."entry_summary_line_items" to "authenticated";

grant delete on table "public"."entry_summary_line_items" to "service_role";

grant insert on table "public"."entry_summary_line_items" to "service_role";

grant references on table "public"."entry_summary_line_items" to "service_role";

grant select on table "public"."entry_summary_line_items" to "service_role";

grant trigger on table "public"."entry_summary_line_items" to "service_role";

grant truncate on table "public"."entry_summary_line_items" to "service_role";

grant update on table "public"."entry_summary_line_items" to "service_role";

grant delete on table "public"."foreign_ports" to "anon";

grant insert on table "public"."foreign_ports" to "anon";

grant references on table "public"."foreign_ports" to "anon";

grant select on table "public"."foreign_ports" to "anon";

grant trigger on table "public"."foreign_ports" to "anon";

grant truncate on table "public"."foreign_ports" to "anon";

grant update on table "public"."foreign_ports" to "anon";

grant delete on table "public"."foreign_ports" to "authenticated";

grant insert on table "public"."foreign_ports" to "authenticated";

grant references on table "public"."foreign_ports" to "authenticated";

grant select on table "public"."foreign_ports" to "authenticated";

grant trigger on table "public"."foreign_ports" to "authenticated";

grant truncate on table "public"."foreign_ports" to "authenticated";

grant update on table "public"."foreign_ports" to "authenticated";

grant delete on table "public"."foreign_ports" to "service_role";

grant insert on table "public"."foreign_ports" to "service_role";

grant references on table "public"."foreign_ports" to "service_role";

grant select on table "public"."foreign_ports" to "service_role";

grant trigger on table "public"."foreign_ports" to "service_role";

grant truncate on table "public"."foreign_ports" to "service_role";

grant update on table "public"."foreign_ports" to "service_role";

grant delete on table "public"."ftz_status_records" to "anon";

grant insert on table "public"."ftz_status_records" to "anon";

grant references on table "public"."ftz_status_records" to "anon";

grant select on table "public"."ftz_status_records" to "anon";

grant trigger on table "public"."ftz_status_records" to "anon";

grant truncate on table "public"."ftz_status_records" to "anon";

grant update on table "public"."ftz_status_records" to "anon";

grant delete on table "public"."ftz_status_records" to "authenticated";

grant insert on table "public"."ftz_status_records" to "authenticated";

grant references on table "public"."ftz_status_records" to "authenticated";

grant select on table "public"."ftz_status_records" to "authenticated";

grant trigger on table "public"."ftz_status_records" to "authenticated";

grant truncate on table "public"."ftz_status_records" to "authenticated";

grant update on table "public"."ftz_status_records" to "authenticated";

grant delete on table "public"."ftz_status_records" to "service_role";

grant insert on table "public"."ftz_status_records" to "service_role";

grant references on table "public"."ftz_status_records" to "service_role";

grant select on table "public"."ftz_status_records" to "service_role";

grant trigger on table "public"."ftz_status_records" to "service_role";

grant truncate on table "public"."ftz_status_records" to "service_role";

grant update on table "public"."ftz_status_records" to "service_role";

grant delete on table "public"."inventory_lots" to "anon";

grant insert on table "public"."inventory_lots" to "anon";

grant references on table "public"."inventory_lots" to "anon";

grant select on table "public"."inventory_lots" to "anon";

grant trigger on table "public"."inventory_lots" to "anon";

grant truncate on table "public"."inventory_lots" to "anon";

grant update on table "public"."inventory_lots" to "anon";

grant delete on table "public"."inventory_lots" to "authenticated";

grant insert on table "public"."inventory_lots" to "authenticated";

grant references on table "public"."inventory_lots" to "authenticated";

grant select on table "public"."inventory_lots" to "authenticated";

grant trigger on table "public"."inventory_lots" to "authenticated";

grant truncate on table "public"."inventory_lots" to "authenticated";

grant update on table "public"."inventory_lots" to "authenticated";

grant delete on table "public"."inventory_lots" to "service_role";

grant insert on table "public"."inventory_lots" to "service_role";

grant references on table "public"."inventory_lots" to "service_role";

grant select on table "public"."inventory_lots" to "service_role";

grant trigger on table "public"."inventory_lots" to "service_role";

grant truncate on table "public"."inventory_lots" to "service_role";

grant update on table "public"."inventory_lots" to "service_role";

grant delete on table "public"."login_attempts" to "anon";

grant insert on table "public"."login_attempts" to "anon";

grant references on table "public"."login_attempts" to "anon";

grant select on table "public"."login_attempts" to "anon";

grant trigger on table "public"."login_attempts" to "anon";

grant truncate on table "public"."login_attempts" to "anon";

grant update on table "public"."login_attempts" to "anon";

grant delete on table "public"."login_attempts" to "authenticated";

grant insert on table "public"."login_attempts" to "authenticated";

grant references on table "public"."login_attempts" to "authenticated";

grant select on table "public"."login_attempts" to "authenticated";

grant trigger on table "public"."login_attempts" to "authenticated";

grant truncate on table "public"."login_attempts" to "authenticated";

grant update on table "public"."login_attempts" to "authenticated";

grant delete on table "public"."login_attempts" to "service_role";

grant insert on table "public"."login_attempts" to "service_role";

grant references on table "public"."login_attempts" to "service_role";

grant select on table "public"."login_attempts" to "service_role";

grant trigger on table "public"."login_attempts" to "service_role";

grant truncate on table "public"."login_attempts" to "service_role";

grant update on table "public"."login_attempts" to "service_role";

grant delete on table "public"."material_indices" to "anon";

grant insert on table "public"."material_indices" to "anon";

grant references on table "public"."material_indices" to "anon";

grant select on table "public"."material_indices" to "anon";

grant trigger on table "public"."material_indices" to "anon";

grant truncate on table "public"."material_indices" to "anon";

grant update on table "public"."material_indices" to "anon";

grant delete on table "public"."material_indices" to "authenticated";

grant insert on table "public"."material_indices" to "authenticated";

grant references on table "public"."material_indices" to "authenticated";

grant select on table "public"."material_indices" to "authenticated";

grant trigger on table "public"."material_indices" to "authenticated";

grant truncate on table "public"."material_indices" to "authenticated";

grant update on table "public"."material_indices" to "authenticated";

grant delete on table "public"."material_indices" to "service_role";

grant insert on table "public"."material_indices" to "service_role";

grant references on table "public"."material_indices" to "service_role";

grant select on table "public"."material_indices" to "service_role";

grant trigger on table "public"."material_indices" to "service_role";

grant truncate on table "public"."material_indices" to "service_role";

grant update on table "public"."material_indices" to "service_role";

grant delete on table "public"."materials" to "anon";

grant insert on table "public"."materials" to "anon";

grant references on table "public"."materials" to "anon";

grant select on table "public"."materials" to "anon";

grant trigger on table "public"."materials" to "anon";

grant truncate on table "public"."materials" to "anon";

grant update on table "public"."materials" to "anon";

grant delete on table "public"."materials" to "authenticated";

grant insert on table "public"."materials" to "authenticated";

grant references on table "public"."materials" to "authenticated";

grant select on table "public"."materials" to "authenticated";

grant trigger on table "public"."materials" to "authenticated";

grant truncate on table "public"."materials" to "authenticated";

grant update on table "public"."materials" to "authenticated";

grant delete on table "public"."materials" to "service_role";

grant insert on table "public"."materials" to "service_role";

grant references on table "public"."materials" to "service_role";

grant select on table "public"."materials" to "service_role";

grant trigger on table "public"."materials" to "service_role";

grant truncate on table "public"."materials" to "service_role";

grant update on table "public"."materials" to "service_role";

grant delete on table "public"."part_pricing_history" to "anon";

grant insert on table "public"."part_pricing_history" to "anon";

grant references on table "public"."part_pricing_history" to "anon";

grant select on table "public"."part_pricing_history" to "anon";

grant trigger on table "public"."part_pricing_history" to "anon";

grant truncate on table "public"."part_pricing_history" to "anon";

grant update on table "public"."part_pricing_history" to "anon";

grant delete on table "public"."part_pricing_history" to "authenticated";

grant insert on table "public"."part_pricing_history" to "authenticated";

grant references on table "public"."part_pricing_history" to "authenticated";

grant select on table "public"."part_pricing_history" to "authenticated";

grant trigger on table "public"."part_pricing_history" to "authenticated";

grant truncate on table "public"."part_pricing_history" to "authenticated";

grant update on table "public"."part_pricing_history" to "authenticated";

grant delete on table "public"."part_pricing_history" to "service_role";

grant insert on table "public"."part_pricing_history" to "service_role";

grant references on table "public"."part_pricing_history" to "service_role";

grant select on table "public"."part_pricing_history" to "service_role";

grant trigger on table "public"."part_pricing_history" to "service_role";

grant truncate on table "public"."part_pricing_history" to "service_role";

grant update on table "public"."part_pricing_history" to "service_role";

grant delete on table "public"."part_suppliers" to "anon";

grant insert on table "public"."part_suppliers" to "anon";

grant references on table "public"."part_suppliers" to "anon";

grant select on table "public"."part_suppliers" to "anon";

grant trigger on table "public"."part_suppliers" to "anon";

grant truncate on table "public"."part_suppliers" to "anon";

grant update on table "public"."part_suppliers" to "anon";

grant delete on table "public"."part_suppliers" to "authenticated";

grant insert on table "public"."part_suppliers" to "authenticated";

grant references on table "public"."part_suppliers" to "authenticated";

grant select on table "public"."part_suppliers" to "authenticated";

grant trigger on table "public"."part_suppliers" to "authenticated";

grant truncate on table "public"."part_suppliers" to "authenticated";

grant update on table "public"."part_suppliers" to "authenticated";

grant delete on table "public"."part_suppliers" to "service_role";

grant insert on table "public"."part_suppliers" to "service_role";

grant references on table "public"."part_suppliers" to "service_role";

grant select on table "public"."part_suppliers" to "service_role";

grant trigger on table "public"."part_suppliers" to "service_role";

grant truncate on table "public"."part_suppliers" to "service_role";

grant update on table "public"."part_suppliers" to "service_role";

grant delete on table "public"."parts" to "anon";

grant insert on table "public"."parts" to "anon";

grant references on table "public"."parts" to "anon";

grant select on table "public"."parts" to "anon";

grant trigger on table "public"."parts" to "anon";

grant truncate on table "public"."parts" to "anon";

grant update on table "public"."parts" to "anon";

grant delete on table "public"."parts" to "authenticated";

grant insert on table "public"."parts" to "authenticated";

grant references on table "public"."parts" to "authenticated";

grant select on table "public"."parts" to "authenticated";

grant trigger on table "public"."parts" to "authenticated";

grant truncate on table "public"."parts" to "authenticated";

grant update on table "public"."parts" to "authenticated";

grant delete on table "public"."parts" to "service_role";

grant insert on table "public"."parts" to "service_role";

grant references on table "public"."parts" to "service_role";

grant select on table "public"."parts" to "service_role";

grant trigger on table "public"."parts" to "service_role";

grant truncate on table "public"."parts" to "service_role";

grant update on table "public"."parts" to "service_role";

grant delete on table "public"."permission_audit_log" to "anon";

grant insert on table "public"."permission_audit_log" to "anon";

grant references on table "public"."permission_audit_log" to "anon";

grant select on table "public"."permission_audit_log" to "anon";

grant trigger on table "public"."permission_audit_log" to "anon";

grant truncate on table "public"."permission_audit_log" to "anon";

grant update on table "public"."permission_audit_log" to "anon";

grant delete on table "public"."permission_audit_log" to "authenticated";

grant insert on table "public"."permission_audit_log" to "authenticated";

grant references on table "public"."permission_audit_log" to "authenticated";

grant select on table "public"."permission_audit_log" to "authenticated";

grant trigger on table "public"."permission_audit_log" to "authenticated";

grant truncate on table "public"."permission_audit_log" to "authenticated";

grant update on table "public"."permission_audit_log" to "authenticated";

grant delete on table "public"."permission_audit_log" to "service_role";

grant insert on table "public"."permission_audit_log" to "service_role";

grant references on table "public"."permission_audit_log" to "service_role";

grant select on table "public"."permission_audit_log" to "service_role";

grant trigger on table "public"."permission_audit_log" to "service_role";

grant truncate on table "public"."permission_audit_log" to "service_role";

grant update on table "public"."permission_audit_log" to "service_role";

grant delete on table "public"."permission_inheritance" to "anon";

grant insert on table "public"."permission_inheritance" to "anon";

grant references on table "public"."permission_inheritance" to "anon";

grant select on table "public"."permission_inheritance" to "anon";

grant trigger on table "public"."permission_inheritance" to "anon";

grant truncate on table "public"."permission_inheritance" to "anon";

grant update on table "public"."permission_inheritance" to "anon";

grant delete on table "public"."permission_inheritance" to "authenticated";

grant insert on table "public"."permission_inheritance" to "authenticated";

grant references on table "public"."permission_inheritance" to "authenticated";

grant select on table "public"."permission_inheritance" to "authenticated";

grant trigger on table "public"."permission_inheritance" to "authenticated";

grant truncate on table "public"."permission_inheritance" to "authenticated";

grant update on table "public"."permission_inheritance" to "authenticated";

grant delete on table "public"."permission_inheritance" to "service_role";

grant insert on table "public"."permission_inheritance" to "service_role";

grant references on table "public"."permission_inheritance" to "service_role";

grant select on table "public"."permission_inheritance" to "service_role";

grant trigger on table "public"."permission_inheritance" to "service_role";

grant truncate on table "public"."permission_inheritance" to "service_role";

grant update on table "public"."permission_inheritance" to "service_role";

grant delete on table "public"."permission_modules" to "anon";

grant insert on table "public"."permission_modules" to "anon";

grant references on table "public"."permission_modules" to "anon";

grant select on table "public"."permission_modules" to "anon";

grant trigger on table "public"."permission_modules" to "anon";

grant truncate on table "public"."permission_modules" to "anon";

grant update on table "public"."permission_modules" to "anon";

grant delete on table "public"."permission_modules" to "authenticated";

grant insert on table "public"."permission_modules" to "authenticated";

grant references on table "public"."permission_modules" to "authenticated";

grant select on table "public"."permission_modules" to "authenticated";

grant trigger on table "public"."permission_modules" to "authenticated";

grant truncate on table "public"."permission_modules" to "authenticated";

grant update on table "public"."permission_modules" to "authenticated";

grant delete on table "public"."permission_modules" to "service_role";

grant insert on table "public"."permission_modules" to "service_role";

grant references on table "public"."permission_modules" to "service_role";

grant select on table "public"."permission_modules" to "service_role";

grant trigger on table "public"."permission_modules" to "service_role";

grant truncate on table "public"."permission_modules" to "service_role";

grant update on table "public"."permission_modules" to "service_role";

grant delete on table "public"."permission_templates" to "anon";

grant insert on table "public"."permission_templates" to "anon";

grant references on table "public"."permission_templates" to "anon";

grant select on table "public"."permission_templates" to "anon";

grant trigger on table "public"."permission_templates" to "anon";

grant truncate on table "public"."permission_templates" to "anon";

grant update on table "public"."permission_templates" to "anon";

grant delete on table "public"."permission_templates" to "authenticated";

grant insert on table "public"."permission_templates" to "authenticated";

grant references on table "public"."permission_templates" to "authenticated";

grant select on table "public"."permission_templates" to "authenticated";

grant trigger on table "public"."permission_templates" to "authenticated";

grant truncate on table "public"."permission_templates" to "authenticated";

grant update on table "public"."permission_templates" to "authenticated";

grant delete on table "public"."permission_templates" to "service_role";

grant insert on table "public"."permission_templates" to "service_role";

grant references on table "public"."permission_templates" to "service_role";

grant select on table "public"."permission_templates" to "service_role";

grant trigger on table "public"."permission_templates" to "service_role";

grant truncate on table "public"."permission_templates" to "service_role";

grant update on table "public"."permission_templates" to "service_role";

grant delete on table "public"."preadmissions" to "anon";

grant insert on table "public"."preadmissions" to "anon";

grant references on table "public"."preadmissions" to "anon";

grant select on table "public"."preadmissions" to "anon";

grant trigger on table "public"."preadmissions" to "anon";

grant truncate on table "public"."preadmissions" to "anon";

grant update on table "public"."preadmissions" to "anon";

grant delete on table "public"."preadmissions" to "authenticated";

grant insert on table "public"."preadmissions" to "authenticated";

grant references on table "public"."preadmissions" to "authenticated";

grant select on table "public"."preadmissions" to "authenticated";

grant trigger on table "public"."preadmissions" to "authenticated";

grant truncate on table "public"."preadmissions" to "authenticated";

grant update on table "public"."preadmissions" to "authenticated";

grant delete on table "public"."preadmissions" to "service_role";

grant insert on table "public"."preadmissions" to "service_role";

grant references on table "public"."preadmissions" to "service_role";

grant select on table "public"."preadmissions" to "service_role";

grant trigger on table "public"."preadmissions" to "service_role";

grant truncate on table "public"."preadmissions" to "service_role";

grant update on table "public"."preadmissions" to "service_role";

grant delete on table "public"."preshipments" to "anon";

grant insert on table "public"."preshipments" to "anon";

grant references on table "public"."preshipments" to "anon";

grant select on table "public"."preshipments" to "anon";

grant trigger on table "public"."preshipments" to "anon";

grant truncate on table "public"."preshipments" to "anon";

grant update on table "public"."preshipments" to "anon";

grant delete on table "public"."preshipments" to "authenticated";

grant insert on table "public"."preshipments" to "authenticated";

grant references on table "public"."preshipments" to "authenticated";

grant select on table "public"."preshipments" to "authenticated";

grant trigger on table "public"."preshipments" to "authenticated";

grant truncate on table "public"."preshipments" to "authenticated";

grant update on table "public"."preshipments" to "authenticated";

grant delete on table "public"."preshipments" to "service_role";

grant insert on table "public"."preshipments" to "service_role";

grant references on table "public"."preshipments" to "service_role";

grant select on table "public"."preshipments" to "service_role";

grant trigger on table "public"."preshipments" to "service_role";

grant truncate on table "public"."preshipments" to "service_role";

grant update on table "public"."preshipments" to "service_role";

grant delete on table "public"."pricing_adjustments" to "anon";

grant insert on table "public"."pricing_adjustments" to "anon";

grant references on table "public"."pricing_adjustments" to "anon";

grant select on table "public"."pricing_adjustments" to "anon";

grant trigger on table "public"."pricing_adjustments" to "anon";

grant truncate on table "public"."pricing_adjustments" to "anon";

grant update on table "public"."pricing_adjustments" to "anon";

grant delete on table "public"."pricing_adjustments" to "authenticated";

grant insert on table "public"."pricing_adjustments" to "authenticated";

grant references on table "public"."pricing_adjustments" to "authenticated";

grant select on table "public"."pricing_adjustments" to "authenticated";

grant trigger on table "public"."pricing_adjustments" to "authenticated";

grant truncate on table "public"."pricing_adjustments" to "authenticated";

grant update on table "public"."pricing_adjustments" to "authenticated";

grant delete on table "public"."pricing_adjustments" to "service_role";

grant insert on table "public"."pricing_adjustments" to "service_role";

grant references on table "public"."pricing_adjustments" to "service_role";

grant select on table "public"."pricing_adjustments" to "service_role";

grant trigger on table "public"."pricing_adjustments" to "service_role";

grant truncate on table "public"."pricing_adjustments" to "service_role";

grant update on table "public"."pricing_adjustments" to "service_role";

grant delete on table "public"."status_history" to "anon";

grant insert on table "public"."status_history" to "anon";

grant references on table "public"."status_history" to "anon";

grant select on table "public"."status_history" to "anon";

grant trigger on table "public"."status_history" to "anon";

grant truncate on table "public"."status_history" to "anon";

grant update on table "public"."status_history" to "anon";

grant delete on table "public"."status_history" to "authenticated";

grant insert on table "public"."status_history" to "authenticated";

grant references on table "public"."status_history" to "authenticated";

grant select on table "public"."status_history" to "authenticated";

grant trigger on table "public"."status_history" to "authenticated";

grant truncate on table "public"."status_history" to "authenticated";

grant update on table "public"."status_history" to "authenticated";

grant delete on table "public"."status_history" to "service_role";

grant insert on table "public"."status_history" to "service_role";

grant references on table "public"."status_history" to "service_role";

grant select on table "public"."status_history" to "service_role";

grant trigger on table "public"."status_history" to "service_role";

grant truncate on table "public"."status_history" to "service_role";

grant update on table "public"."status_history" to "service_role";

grant delete on table "public"."storage_locations" to "anon";

grant insert on table "public"."storage_locations" to "anon";

grant references on table "public"."storage_locations" to "anon";

grant select on table "public"."storage_locations" to "anon";

grant trigger on table "public"."storage_locations" to "anon";

grant truncate on table "public"."storage_locations" to "anon";

grant update on table "public"."storage_locations" to "anon";

grant delete on table "public"."storage_locations" to "authenticated";

grant insert on table "public"."storage_locations" to "authenticated";

grant references on table "public"."storage_locations" to "authenticated";

grant select on table "public"."storage_locations" to "authenticated";

grant trigger on table "public"."storage_locations" to "authenticated";

grant truncate on table "public"."storage_locations" to "authenticated";

grant update on table "public"."storage_locations" to "authenticated";

grant delete on table "public"."storage_locations" to "service_role";

grant insert on table "public"."storage_locations" to "service_role";

grant references on table "public"."storage_locations" to "service_role";

grant select on table "public"."storage_locations" to "service_role";

grant trigger on table "public"."storage_locations" to "service_role";

grant truncate on table "public"."storage_locations" to "service_role";

grant update on table "public"."storage_locations" to "service_role";

grant delete on table "public"."suppliers" to "anon";

grant insert on table "public"."suppliers" to "anon";

grant references on table "public"."suppliers" to "anon";

grant select on table "public"."suppliers" to "anon";

grant trigger on table "public"."suppliers" to "anon";

grant truncate on table "public"."suppliers" to "anon";

grant update on table "public"."suppliers" to "anon";

grant delete on table "public"."suppliers" to "authenticated";

grant insert on table "public"."suppliers" to "authenticated";

grant references on table "public"."suppliers" to "authenticated";

grant select on table "public"."suppliers" to "authenticated";

grant trigger on table "public"."suppliers" to "authenticated";

grant truncate on table "public"."suppliers" to "authenticated";

grant update on table "public"."suppliers" to "authenticated";

grant delete on table "public"."suppliers" to "service_role";

grant insert on table "public"."suppliers" to "service_role";

grant references on table "public"."suppliers" to "service_role";

grant select on table "public"."suppliers" to "service_role";

grant trigger on table "public"."suppliers" to "service_role";

grant truncate on table "public"."suppliers" to "service_role";

grant update on table "public"."suppliers" to "service_role";

grant delete on table "public"."system_pages" to "anon";

grant insert on table "public"."system_pages" to "anon";

grant references on table "public"."system_pages" to "anon";

grant select on table "public"."system_pages" to "anon";

grant trigger on table "public"."system_pages" to "anon";

grant truncate on table "public"."system_pages" to "anon";

grant update on table "public"."system_pages" to "anon";

grant delete on table "public"."system_pages" to "authenticated";

grant insert on table "public"."system_pages" to "authenticated";

grant references on table "public"."system_pages" to "authenticated";

grant select on table "public"."system_pages" to "authenticated";

grant trigger on table "public"."system_pages" to "authenticated";

grant truncate on table "public"."system_pages" to "authenticated";

grant update on table "public"."system_pages" to "authenticated";

grant delete on table "public"."system_pages" to "service_role";

grant insert on table "public"."system_pages" to "service_role";

grant references on table "public"."system_pages" to "service_role";

grant select on table "public"."system_pages" to "service_role";

grant trigger on table "public"."system_pages" to "service_role";

grant truncate on table "public"."system_pages" to "service_role";

grant update on table "public"."system_pages" to "service_role";

grant delete on table "public"."transactions" to "anon";

grant insert on table "public"."transactions" to "anon";

grant references on table "public"."transactions" to "anon";

grant select on table "public"."transactions" to "anon";

grant trigger on table "public"."transactions" to "anon";

grant truncate on table "public"."transactions" to "anon";

grant update on table "public"."transactions" to "anon";

grant delete on table "public"."transactions" to "authenticated";

grant insert on table "public"."transactions" to "authenticated";

grant references on table "public"."transactions" to "authenticated";

grant select on table "public"."transactions" to "authenticated";

grant trigger on table "public"."transactions" to "authenticated";

grant truncate on table "public"."transactions" to "authenticated";

grant update on table "public"."transactions" to "authenticated";

grant delete on table "public"."transactions" to "service_role";

grant insert on table "public"."transactions" to "service_role";

grant references on table "public"."transactions" to "service_role";

grant select on table "public"."transactions" to "service_role";

grant trigger on table "public"."transactions" to "service_role";

grant truncate on table "public"."transactions" to "service_role";

grant update on table "public"."transactions" to "service_role";

grant delete on table "public"."us_ports" to "anon";

grant insert on table "public"."us_ports" to "anon";

grant references on table "public"."us_ports" to "anon";

grant select on table "public"."us_ports" to "anon";

grant trigger on table "public"."us_ports" to "anon";

grant truncate on table "public"."us_ports" to "anon";

grant update on table "public"."us_ports" to "anon";

grant delete on table "public"."us_ports" to "authenticated";

grant insert on table "public"."us_ports" to "authenticated";

grant references on table "public"."us_ports" to "authenticated";

grant select on table "public"."us_ports" to "authenticated";

grant trigger on table "public"."us_ports" to "authenticated";

grant truncate on table "public"."us_ports" to "authenticated";

grant update on table "public"."us_ports" to "authenticated";

grant delete on table "public"."us_ports" to "service_role";

grant insert on table "public"."us_ports" to "service_role";

grant references on table "public"."us_ports" to "service_role";

grant select on table "public"."us_ports" to "service_role";

grant trigger on table "public"."us_ports" to "service_role";

grant truncate on table "public"."us_ports" to "service_role";

grant update on table "public"."us_ports" to "service_role";

grant delete on table "public"."user_page_permissions" to "anon";

grant insert on table "public"."user_page_permissions" to "anon";

grant references on table "public"."user_page_permissions" to "anon";

grant select on table "public"."user_page_permissions" to "anon";

grant trigger on table "public"."user_page_permissions" to "anon";

grant truncate on table "public"."user_page_permissions" to "anon";

grant update on table "public"."user_page_permissions" to "anon";

grant delete on table "public"."user_page_permissions" to "authenticated";

grant insert on table "public"."user_page_permissions" to "authenticated";

grant references on table "public"."user_page_permissions" to "authenticated";

grant select on table "public"."user_page_permissions" to "authenticated";

grant trigger on table "public"."user_page_permissions" to "authenticated";

grant truncate on table "public"."user_page_permissions" to "authenticated";

grant update on table "public"."user_page_permissions" to "authenticated";

grant delete on table "public"."user_page_permissions" to "service_role";

grant insert on table "public"."user_page_permissions" to "service_role";

grant references on table "public"."user_page_permissions" to "service_role";

grant select on table "public"."user_page_permissions" to "service_role";

grant trigger on table "public"."user_page_permissions" to "service_role";

grant truncate on table "public"."user_page_permissions" to "service_role";

grant update on table "public"."user_page_permissions" to "service_role";

grant delete on table "public"."user_permissions" to "anon";

grant insert on table "public"."user_permissions" to "anon";

grant references on table "public"."user_permissions" to "anon";

grant select on table "public"."user_permissions" to "anon";

grant trigger on table "public"."user_permissions" to "anon";

grant truncate on table "public"."user_permissions" to "anon";

grant update on table "public"."user_permissions" to "anon";

grant delete on table "public"."user_permissions" to "authenticated";

grant insert on table "public"."user_permissions" to "authenticated";

grant references on table "public"."user_permissions" to "authenticated";

grant select on table "public"."user_permissions" to "authenticated";

grant trigger on table "public"."user_permissions" to "authenticated";

grant truncate on table "public"."user_permissions" to "authenticated";

grant update on table "public"."user_permissions" to "authenticated";

grant delete on table "public"."user_permissions" to "service_role";

grant insert on table "public"."user_permissions" to "service_role";

grant references on table "public"."user_permissions" to "service_role";

grant select on table "public"."user_permissions" to "service_role";

grant trigger on table "public"."user_permissions" to "service_role";

grant truncate on table "public"."user_permissions" to "service_role";

grant update on table "public"."user_permissions" to "service_role";


  create policy "approval_requests_manager_modify"
  on "public"."approval_requests"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));



  create policy "approval_requests_relevant_access"
  on "public"."approval_requests"
  as permissive
  for select
  to public
using (((requested_by = ( SELECT employees.id
   FROM employees
  WHERE (employees.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));



  create policy "approval_requests_user_create"
  on "public"."approval_requests"
  as permissive
  for insert
  to public
with check ((requested_by = ( SELECT employees.id
   FROM employees
  WHERE (employees.user_id = auth.uid()))));



  create policy "approval_log_relevant_read"
  on "public"."approval_workflow_log"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM (approval_requests ar
     JOIN employees e ON ((ar.requested_by = e.id)))
  WHERE ((ar.id = approval_workflow_log.approval_request_id) AND ((e.user_id = auth.uid()) OR ((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text))))) OR (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));



  create policy "Enable all access for authenticated users"
  on "public"."contacts"
  as permissive
  for all
  to public
using (true);



  create policy "Enable access for authenticated users"
  on "public"."customers"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable all access for authenticated users"
  on "public"."customers"
  as permissive
  for all
  to public
using (true);



  create policy "customers_admin_modify"
  on "public"."customers"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ '%manager@lucerne.com'::text)));



  create policy "customers_select_auth"
  on "public"."customers"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "icrs_customers_modify"
  on "public"."customers"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) = 'warehouse.manager@icrs.test'::text)));



  create policy "icrs_customers_read"
  on "public"."customers"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "employees_admin_all_access"
  on "public"."employees"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM employees employees_1
  WHERE ((employees_1.user_id = auth.uid()) AND ((employees_1.role = 'admin'::text) OR (employees_1.is_admin = true))))));



  create policy "employees_enhanced_read_access"
  on "public"."employees"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = 'admin'::text)))) OR (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = 'manager'::text) AND (employees.role = 'warehouse_staff'::text))))));



  create policy "employees_manager_team_view"
  on "public"."employees"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM employees manager
  WHERE ((manager.user_id = auth.uid()) AND (manager.role = 'manager'::text) AND (employees.manager_id = manager.id)))));



  create policy "employees_own_record"
  on "public"."employees"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "employees_read_policy"
  on "public"."employees"
  as permissive
  for select
  to authenticated
using (true);



  create policy "employees_select_public"
  on "public"."employees"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "employees_structured_modify"
  on "public"."employees"
  as permissive
  for all
  to public
using (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = 'admin'::text)))) OR ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = 'manager'::text)))) AND (role = 'warehouse_staff'::text)) OR (user_id = auth.uid())));



  create policy "icrs_employees_modify"
  on "public"."employees"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'email'::text) = 'admin@icrs.test'::text));



  create policy "icrs_employees_read"
  on "public"."employees"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."entry_grand_totals"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."entry_group_preshipments"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."entry_summaries"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."entry_summary_groups"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."entry_summary_line_items"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."ftz_status_records"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."inventory_lots"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "icrs_inventory_modify"
  on "public"."inventory_lots"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) = 'warehouse.manager@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) ~~ 'operator%@icrs.test'::text)));



  create policy "icrs_inventory_read"
  on "public"."inventory_lots"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "inventory_select_auth"
  on "public"."inventory_lots"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "inventory_warehouse_modify"
  on "public"."inventory_lots"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ 'warehouse.%@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ '%clerk@lucerne.com'::text)));



  create policy "Allow insert for all users"
  on "public"."login_attempts"
  as permissive
  for insert
  to public
with check (true);



  create policy "Enable access for authenticated users"
  on "public"."material_indices"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "materials_read_policy"
  on "public"."materials"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "materials_write_policy"
  on "public"."materials"
  as permissive
  for all
  to public
using (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM employees
  WHERE ((employees.id = auth.uid()) AND (employees.role = ANY (ARRAY['admin'::text, 'manager'::text, 'staff'::text])))))));



  create policy "Enable access for authenticated users"
  on "public"."part_pricing_history"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."part_suppliers"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."parts"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "icrs_parts_modify"
  on "public"."parts"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) = 'warehouse.manager@icrs.test'::text)));



  create policy "icrs_parts_read"
  on "public"."parts"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "parts_select_auth"
  on "public"."parts"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "parts_warehouse_modify"
  on "public"."parts"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ 'warehouse.%@lucerne.com'::text)));



  create policy "permission_audit_log_enhanced_access"
  on "public"."permission_audit_log"
  as permissive
  for select
  to public
using ((((user_id = ( SELECT employees.id
   FROM employees
  WHERE (employees.user_id = auth.uid()))) AND (created_at >= (now() - '90 days'::interval))) OR (can_manage_user_permissions(user_id) AND (created_at >= (now() - '30 days'::interval))) OR ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = 'admin'::text)))) AND (created_at >= (now() - '1 year'::interval)))));



  create policy "permission_inheritance_admin_manager_modify"
  on "public"."permission_inheritance"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = ANY (ARRAY['admin'::text, 'manager'::text]))))));



  create policy "permission_inheritance_controlled_modify"
  on "public"."permission_inheritance"
  as permissive
  for all
  to public
using ((can_manage_user_permissions(user_id) AND (role = ( SELECT employees.role
   FROM employees
  WHERE (employees.id = permission_inheritance.user_id)))));



  create policy "permission_inheritance_detailed_read"
  on "public"."permission_inheritance"
  as permissive
  for select
  to public
using (((user_id = ( SELECT employees.id
   FROM employees
  WHERE (employees.user_id = auth.uid()))) OR can_manage_user_permissions(user_id)));



  create policy "permission_inheritance_read_access"
  on "public"."permission_inheritance"
  as permissive
  for select
  to public
using (((user_id = ( SELECT employees.id
   FROM employees
  WHERE (employees.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));



  create policy "permission_modules_admin_modify"
  on "public"."permission_modules"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = 'admin'::text)))));



  create policy "permission_modules_read_authenticated"
  on "public"."permission_modules"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "permission_templates_read_authenticated"
  on "public"."permission_templates"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "permission_templates_role_based_modify"
  on "public"."permission_templates"
  as permissive
  for all
  to public
using (((EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = 'admin'::text)))) AND (role = ANY (ARRAY['admin'::text, 'manager'::text, 'warehouse_staff'::text]))));



  create policy "Enable access for authenticated users"
  on "public"."preadmissions"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "icrs_preadmissions_modify"
  on "public"."preadmissions"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) = 'warehouse.manager@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) = 'customs.broker@icrs.test'::text)));



  create policy "icrs_preadmissions_read"
  on "public"."preadmissions"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "preadmissions_authorized_modify"
  on "public"."preadmissions"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ '%manager@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ 'receiving.clerk@lucerne.com'::text)));



  create policy "preadmissions_select_auth"
  on "public"."preadmissions"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."preshipments"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "icrs_preshipments_modify"
  on "public"."preshipments"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) = 'warehouse.manager@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) ~~ 'operator%@icrs.test'::text)));



  create policy "icrs_preshipments_read"
  on "public"."preshipments"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "preshipments_authorized_modify"
  on "public"."preshipments"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ '%manager@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ 'shipping.clerk@lucerne.com'::text)));



  create policy "preshipments_select_auth"
  on "public"."preshipments"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."pricing_adjustments"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."storage_locations"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "icrs_storage_modify"
  on "public"."storage_locations"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) = 'warehouse.manager@icrs.test'::text)));



  create policy "icrs_storage_read"
  on "public"."storage_locations"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "storage_select_auth"
  on "public"."storage_locations"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "storage_warehouse_modify"
  on "public"."storage_locations"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ 'warehouse.%@lucerne.com'::text)));



  create policy "Enable access for authenticated users"
  on "public"."suppliers"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "icrs_suppliers_modify"
  on "public"."suppliers"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) = 'warehouse.manager@icrs.test'::text)));



  create policy "icrs_suppliers_read"
  on "public"."suppliers"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "suppliers_admin_modify"
  on "public"."suppliers"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ '%manager@lucerne.com'::text)));



  create policy "suppliers_select_auth"
  on "public"."suppliers"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "system_pages_admin_modify"
  on "public"."system_pages"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text));



  create policy "system_pages_read_authenticated"
  on "public"."system_pages"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Enable access for authenticated users"
  on "public"."transactions"
  as permissive
  for all
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "icrs_transactions_modify"
  on "public"."transactions"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) = 'warehouse.manager@icrs.test'::text) OR ((auth.jwt() ->> 'email'::text) ~~ 'operator%@icrs.test'::text)));



  create policy "icrs_transactions_read"
  on "public"."transactions"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "transactions_authorized_modify"
  on "public"."transactions"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ '%clerk@lucerne.com'::text) OR ((auth.jwt() ->> 'email'::text) ~~ '%manager@lucerne.com'::text)));



  create policy "transactions_select_auth"
  on "public"."transactions"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "user_permissions_admin_modify"
  on "public"."user_page_permissions"
  as permissive
  for all
  to public
using ((((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text) OR (EXISTS ( SELECT 1
   FROM employees e
  WHERE ((e.user_id = auth.uid()) AND (e.role = ANY (ARRAY['admin'::text, 'manager'::text])))))));



  create policy "user_permissions_own_read"
  on "public"."user_page_permissions"
  as permissive
  for select
  to public
using (((user_id = ( SELECT employees.id
   FROM employees
  WHERE (employees.user_id = auth.uid()))) OR ((auth.jwt() ->> 'email'::text) = 'admin@lucerne.com'::text)));



  create policy "user_permissions_hierarchical_read"
  on "public"."user_permissions"
  as permissive
  for select
  to public
using (((user_id = ( SELECT employees.id
   FROM employees
  WHERE (employees.user_id = auth.uid()))) OR can_manage_user_permissions(user_id)));



  create policy "user_permissions_validated_insert"
  on "public"."user_permissions"
  as permissive
  for insert
  to public
with check ((can_manage_user_permissions(user_id) AND validate_module_action(module_code, action) AND (granted_by = ( SELECT employees.id
   FROM employees
  WHERE (employees.user_id = auth.uid())))));



  create policy "user_permissions_validated_modify"
  on "public"."user_permissions"
  as permissive
  for all
  to public
using ((can_manage_user_permissions(user_id) AND validate_module_action(module_code, action)));


CREATE TRIGGER approval_workflow_logging_trigger AFTER INSERT OR UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION log_approval_workflow();

CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION update_permission_updated_at();

CREATE TRIGGER ensure_single_primary_contact_trigger BEFORE INSERT OR UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_contact();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sync_employee_status_trigger BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION sync_employee_status();

CREATE TRIGGER update_entry_summary_groups_updated_at BEFORE UPDATE ON public.entry_summary_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION update_materials_updated_at();

CREATE TRIGGER update_permission_inheritance_updated_at BEFORE UPDATE ON public.permission_inheritance FOR EACH ROW EXECUTE FUNCTION update_permission_timestamps();

CREATE TRIGGER update_permission_modules_updated_at BEFORE UPDATE ON public.permission_modules FOR EACH ROW EXECUTE FUNCTION update_permission_timestamps();

CREATE TRIGGER update_permission_templates_updated_at BEFORE UPDATE ON public.permission_templates FOR EACH ROW EXECUTE FUNCTION update_permission_timestamps();

CREATE TRIGGER validate_template_permission_action BEFORE INSERT OR UPDATE ON public.permission_templates FOR EACH ROW EXECUTE FUNCTION validate_permission_action();

CREATE TRIGGER update_system_pages_updated_at BEFORE UPDATE ON public.system_pages FOR EACH ROW EXECUTE FUNCTION update_permission_updated_at();

CREATE TRIGGER update_user_page_permissions_updated_at BEFORE UPDATE ON public.user_page_permissions FOR EACH ROW EXECUTE FUNCTION update_permission_updated_at();

CREATE TRIGGER audit_user_permissions_changes AFTER INSERT OR DELETE OR UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION audit_permission_changes();

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION update_permission_timestamps();

CREATE TRIGGER validate_user_permission_action BEFORE INSERT OR UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION validate_permission_action();


