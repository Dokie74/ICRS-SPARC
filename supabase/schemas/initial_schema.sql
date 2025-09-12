

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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."apply_role_template_permissions"("p_user_id" "uuid", "p_role" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."apply_role_template_permissions"("p_user_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_permission_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."audit_permission_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_update_user_permissions"("p_user_id" "uuid", "p_permissions" "jsonb", "p_changed_by" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."bulk_update_user_permissions"("p_user_id" "uuid", "p_permissions" "jsonb", "p_changed_by" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_user_permissions"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."can_manage_user_permissions"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_permission"("required_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;


ALTER FUNCTION "public"."check_user_permission"("required_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_employee"("p_name" "text", "p_email" "text", "p_job_title" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT 'employee'::"text", "p_manager_id" "uuid" DEFAULT NULL::"uuid", "p_temp_password" "text" DEFAULT NULL::"text", "p_is_admin" boolean DEFAULT false) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_employee"("p_name" "text", "p_email" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_temp_password" "text", "p_is_admin" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_missing_auth_users"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;


ALTER FUNCTION "public"."create_missing_auth_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deactivate_employee"("p_employee_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."deactivate_employee"("p_employee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_primary_contact"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."ensure_single_primary_contact"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_primary_variant"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."ensure_single_primary_variant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_reconciliation"("start_date" "date", "end_date" "date") RETURNS TABLE("part_id" "text", "beginning_balance" bigint, "admitted" bigint, "withdrawn" bigint, "adjusted" bigint, "ending_balance" bigint)
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_reconciliation"("start_date" "date", "end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_employees"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "name" "text", "email" "text", "job_title" "text", "role" "text", "department" "text", "manager_id" "uuid", "manager_name" "text", "is_active" boolean, "is_admin" boolean, "created_at" timestamp with time zone, "last_login" timestamp with time zone, "email_confirmed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;


ALTER FUNCTION "public"."get_all_employees"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_employee"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_current_employee"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employee_profile"() RETURNS TABLE("employee_id" "uuid", "name" "text", "email" "text", "job_title" "text", "department" "text", "manager_name" "text", "start_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_employee_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_managers_list"() RETURNS TABLE("id" "uuid", "name" "text", "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_managers_list"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_accessible_pages"("p_user_id" "uuid") RETURNS TABLE("page_code" "text", "page_name" "text", "access_level" "text", "requires_approval" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_accessible_pages"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_module_permissions"("p_user_id" "uuid", "p_module_code" "text" DEFAULT NULL::"text") RETURNS TABLE("module_code" "text", "module_name" "text", "action" "text", "granted" boolean, "is_inherited" boolean, "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_module_permissions"("p_user_id" "uuid", "p_module_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_account_locked"("p_email" "text", "p_ip_address" "text" DEFAULT '127.0.0.1'::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- For now, just return false (no account locking)
    -- This can be enhanced later with proper login attempt tracking
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_account_locked"("p_email" "text", "p_ip_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_employee_to_auth_user"("p_employee_email" "text", "p_auth_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;


ALTER FUNCTION "public"."link_employee_to_auth_user"("p_employee_email" "text", "p_auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_approval_workflow"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."log_approval_workflow"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_user_password"("p_employee_id" "uuid", "p_new_password" "text" DEFAULT NULL::"text", "p_force_change" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;


ALTER FUNCTION "public"."reset_user_password"("p_employee_id" "uuid", "p_new_password" "text", "p_force_change" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_employee_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_employee_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_login_attempt"("p_email" "text", "p_ip_address" "text", "p_success" boolean, "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.login_attempts (email, ip_address, success, user_agent)
    VALUES (p_email, p_ip_address::inet, p_success, p_user_agent);
END;
$$;


ALTER FUNCTION "public"."track_login_attempt"("p_email" "text", "p_ip_address" "text", "p_success" boolean, "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_job_title" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT NULL::"text", "p_manager_id" "uuid" DEFAULT NULL::"uuid", "p_department" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_department" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_job_title" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT NULL::"text", "p_manager_id" "uuid" DEFAULT NULL::"uuid", "p_department" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean, "p_is_admin" boolean DEFAULT NULL::boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;


ALTER FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_department" "text", "p_is_active" boolean, "p_is_admin" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_entry_summary_groups_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_entry_summary_groups_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_last_login"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.employees 
    SET last_login = now()
    WHERE user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."update_last_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_material_indices_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_material_indices_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_materials_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_materials_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_parts_price_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_parts_price_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_permission_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_permission_timestamps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_permission_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_permission_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_preshipment_grouping_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_preshipment_grouping_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pricing_adjustments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pricing_adjustments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_storage_locations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_storage_locations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_variant_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_variant_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_action_requires_approval"("p_user_id" "uuid", "p_page_code" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."user_action_requires_approval"("p_user_id" "uuid", "p_page_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_module_permission"("p_user_id" "uuid", "p_module_code" "text", "p_action" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."user_has_module_permission"("p_user_id" "uuid", "p_module_code" "text", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_page_access"("p_user_id" "uuid", "p_page_code" "text", "p_required_level" "text" DEFAULT 'read'::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."user_has_page_access"("p_user_id" "uuid", "p_page_code" "text", "p_required_level" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_module_action"("p_module_code" "text", "p_action" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    allowed_actions text[];
BEGIN
    SELECT available_actions INTO allowed_actions
    FROM public.permission_modules
    WHERE module_code = p_module_code AND is_active = true;
    
    RETURN p_action = ANY(allowed_actions);
END;
$$;


ALTER FUNCTION "public"."validate_module_action"("p_module_code" "text", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_permission_action"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_permission_action"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_preshipment_for_grouping"("p_preshipment_id" integer, "p_group_id" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_preshipment_for_grouping"("p_preshipment_id" integer, "p_group_id" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "page_code" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb" NOT NULL,
    "justification" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "priority" "text" DEFAULT 'normal'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "approval_notes" "text",
    "denied_reason" "text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "approval_requests_action_type_check" CHECK (("action_type" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text", 'status_change'::"text"]))),
    CONSTRAINT "approval_requests_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "approval_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'denied'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."approval_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_workflow_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "approval_request_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "performed_by" "uuid",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."approval_workflow_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" integer NOT NULL,
    "customer_id" integer NOT NULL,
    "name" character varying(100),
    "email" character varying(100),
    "phone" character varying(30),
    "title" character varying(100),
    "location" character varying(200),
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."contacts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."contacts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."contacts_id_seq" OWNED BY "public"."contacts"."id";



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "ein" "text",
    "address" "text",
    "broker_name" "text",
    "contact_email" "text",
    "phone" character varying(30),
    "website" character varying(255),
    "industry" character varying(100),
    "notes" "text",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."customers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."customers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."customers_id_seq" OWNED BY "public"."customers"."id";



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "job_title" "text",
    "manager_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "temp_password" "text",
    "must_change_password" boolean DEFAULT false,
    "department" "text" DEFAULT 'warehouse'::"text",
    "last_login" timestamp with time zone,
    "is_admin" boolean DEFAULT false,
    "email_confirmed" boolean DEFAULT false,
    "created_by" "uuid",
    "phone" character varying(30),
    "status" character varying(20) DEFAULT 'active'::character varying,
    CONSTRAINT "employees_department_check" CHECK (("department" = ANY (ARRAY['warehouse'::"text", 'shipping'::"text", 'receiving'::"text", 'administration'::"text", 'management'::"text"]))),
    CONSTRAINT "employees_role_check" CHECK (("role" = ANY (ARRAY['employee'::"text", 'manager'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entry_grand_totals" (
    "id" integer NOT NULL,
    "entry_summary_id" integer NOT NULL,
    "total_entered_value" numeric(12,2) DEFAULT 0,
    "grand_total_duty_amount" numeric(12,2) DEFAULT 0,
    "grand_total_user_fee_amount" numeric(12,2) DEFAULT 0,
    "grand_total_tax_amount" numeric(12,2) DEFAULT 0,
    "grand_total_antidumping_duty_amount" numeric(12,2) DEFAULT 0,
    "grand_total_countervailing_duty_amount" numeric(12,2) DEFAULT 0,
    "estimated_total_amount" numeric(12,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entry_grand_totals" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."entry_grand_totals_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."entry_grand_totals_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."entry_grand_totals_id_seq" OWNED BY "public"."entry_grand_totals"."id";



CREATE TABLE IF NOT EXISTS "public"."entry_group_preshipments" (
    "id" integer NOT NULL,
    "group_id" integer NOT NULL,
    "preshipment_id" integer NOT NULL,
    "assignment_notes" "text",
    "preshipment_status" "text",
    "preshipment_value" numeric(12,2) DEFAULT 0,
    "preshipment_parts_count" integer DEFAULT 0,
    "validated" boolean DEFAULT false,
    "validation_warnings" "text"[],
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "added_by" "uuid"
);


ALTER TABLE "public"."entry_group_preshipments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."entry_group_preshipments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."entry_group_preshipments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."entry_group_preshipments_id_seq" OWNED BY "public"."entry_group_preshipments"."id";



CREATE TABLE IF NOT EXISTS "public"."entry_summaries" (
    "id" integer NOT NULL,
    "entry_number" "text" NOT NULL,
    "entry_type_code" "text" DEFAULT '06'::"text" NOT NULL,
    "summary_filing_action_request_code" "text" DEFAULT 'A'::"text" NOT NULL,
    "record_district_port_of_entry" "text" NOT NULL,
    "entry_filer_code" "text" NOT NULL,
    "consolidated_summary_indicator" "text" DEFAULT 'N'::"text" NOT NULL,
    "importer_of_record_number" "text",
    "date_of_importation" "date",
    "foreign_trade_zone_identifier" "text",
    "bill_of_lading_number" "text",
    "voyage_flight_trip_number" "text",
    "carrier_code" "text",
    "importing_conveyance_name" "text",
    "consignee_id" integer,
    "manufacturer_name" "text",
    "manufacturer_address" "text",
    "seller_name" "text",
    "seller_address" "text",
    "bond_type_code" "text",
    "surety_company_code" "text",
    "filing_status" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "preshipment_id" integer,
    "group_id" integer,
    "filed_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "ace_response_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "valid_filing_status" CHECK (("filing_status" = ANY (ARRAY['DRAFT'::"text", 'FILED'::"text", 'ACCEPTED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."entry_summaries" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."entry_summaries_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."entry_summaries_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."entry_summaries_id_seq" OWNED BY "public"."entry_summaries"."id";



CREATE TABLE IF NOT EXISTS "public"."entry_summary_groups" (
    "id" integer NOT NULL,
    "group_name" "text" NOT NULL,
    "group_description" "text",
    "week_ending_date" "date" NOT NULL,
    "target_entry_date" "date",
    "entry_year" integer NOT NULL,
    "entry_quarter" integer NOT NULL,
    "filing_district_port" "text" NOT NULL,
    "entry_filer_code" "text" NOT NULL,
    "foreign_trade_zone_identifier" "text" DEFAULT 'FTZ-037'::"text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "entry_number" "text",
    "filed_at" timestamp with time zone,
    "filed_by" "uuid",
    "estimated_total_value" numeric(12,2) DEFAULT 0,
    "estimated_total_duties" numeric(12,2) DEFAULT 0,
    "estimated_total_taxes" numeric(12,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "valid_quarter" CHECK ((("entry_quarter" >= 1) AND ("entry_quarter" <= 4))),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['draft'::"text", 'ready_for_review'::"text", 'approved'::"text", 'filed'::"text", 'accepted'::"text", 'rejected'::"text"]))),
    CONSTRAINT "week_ending_is_friday" CHECK ((EXTRACT(dow FROM "week_ending_date") = (5)::numeric))
);


ALTER TABLE "public"."entry_summary_groups" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."entry_summary_groups_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."entry_summary_groups_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."entry_summary_groups_id_seq" OWNED BY "public"."entry_summary_groups"."id";



CREATE TABLE IF NOT EXISTS "public"."preshipments" (
    "id" integer NOT NULL,
    "shipment_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "customer_id" integer NOT NULL,
    "items" "jsonb",
    "entry_number" "text",
    "stage" "text" DEFAULT 'Pending Pick'::"text" NOT NULL,
    "driver_name" "text",
    "driver_license_number" "text",
    "license_plate_number" "text",
    "carrier_name" "text",
    "signature_data" "jsonb",
    "shipped_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "entry_summary_id" integer,
    "entry_summary_status" "text" DEFAULT 'PENDING'::"text",
    "is_grouped" boolean DEFAULT false
);


ALTER TABLE "public"."preshipments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."preshipments"."shipment_id" IS 'Unique shipment identifier';



COMMENT ON COLUMN "public"."preshipments"."customer_id" IS 'Foreign key reference to customers table';



COMMENT ON COLUMN "public"."preshipments"."entry_number" IS 'CBP entry number for customs clearance';



CREATE OR REPLACE VIEW "public"."entry_summary_groups_with_stats" AS
 SELECT "esg"."id",
    "esg"."group_name",
    "esg"."group_description",
    "esg"."week_ending_date",
    "esg"."target_entry_date",
    "esg"."entry_year",
    "esg"."entry_quarter",
    "esg"."filing_district_port",
    "esg"."entry_filer_code",
    "esg"."foreign_trade_zone_identifier",
    "esg"."status",
    "esg"."entry_number",
    "esg"."filed_at",
    "esg"."filed_by",
    "esg"."estimated_total_value",
    "esg"."estimated_total_duties",
    "esg"."estimated_total_taxes",
    "esg"."created_at",
    "esg"."updated_at",
    "esg"."created_by",
    "esg"."updated_by",
    COALESCE("stats"."preshipments_count", (0)::bigint) AS "preshipments_count",
    COALESCE("stats"."customers_count", (0)::bigint) AS "customers_count",
    COALESCE("stats"."total_line_items", (0)::bigint) AS "total_line_items",
    COALESCE("stats"."customer_names", ''::"text") AS "customer_names"
   FROM ("public"."entry_summary_groups" "esg"
     LEFT JOIN ( SELECT "egp"."group_id",
            "count"(DISTINCT "egp"."preshipment_id") AS "preshipments_count",
            "count"(DISTINCT "p"."customer_id") AS "customers_count",
            "sum"("jsonb_array_length"("p"."items")) AS "total_line_items",
            "string_agg"(DISTINCT "c"."name", ', '::"text") AS "customer_names"
           FROM (("public"."entry_group_preshipments" "egp"
             JOIN "public"."preshipments" "p" ON (("egp"."preshipment_id" = "p"."id")))
             JOIN "public"."customers" "c" ON (("p"."customer_id" = "c"."id")))
          GROUP BY "egp"."group_id") "stats" ON (("esg"."id" = "stats"."group_id")));


ALTER VIEW "public"."entry_summary_groups_with_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entry_summary_line_items" (
    "id" integer NOT NULL,
    "entry_summary_id" integer NOT NULL,
    "line_number" integer NOT NULL,
    "hts_code" "text" NOT NULL,
    "commodity_description" "text" NOT NULL,
    "country_of_origin" "text" NOT NULL,
    "quantity" numeric(12,3) NOT NULL,
    "unit_of_measure" "text" DEFAULT 'PCS'::"text",
    "unit_value" numeric(12,2) NOT NULL,
    "total_value" numeric(12,2) NOT NULL,
    "duty_rate" numeric(8,4) DEFAULT 0,
    "duty_amount" numeric(12,2) DEFAULT 0,
    "consolidation_metadata" "jsonb",
    "part_id" "text",
    "lot_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entry_summary_line_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."entry_summary_line_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."entry_summary_line_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."entry_summary_line_items_id_seq" OWNED BY "public"."entry_summary_line_items"."id";



CREATE TABLE IF NOT EXISTS "public"."foreign_ports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "port_name" "text" NOT NULL,
    "country_code" character(2)
);


ALTER TABLE "public"."foreign_ports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ftz_status_records" (
    "id" integer NOT NULL,
    "entry_line_item_id" integer NOT NULL,
    "ftz_line_item_quantity" numeric(12,3) NOT NULL,
    "ftz_merchandise_status_code" "text" DEFAULT 'P'::"text" NOT NULL,
    "privileged_ftz_merchandise_filing_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_ftz_status" CHECK (("ftz_merchandise_status_code" = ANY (ARRAY['P'::"text", 'N'::"text", 'D'::"text"])))
);


ALTER TABLE "public"."ftz_status_records" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ftz_status_records_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ftz_status_records_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ftz_status_records_id_seq" OWNED BY "public"."ftz_status_records"."id";



CREATE TABLE IF NOT EXISTS "public"."inventory_lots" (
    "id" "text" NOT NULL,
    "part_id" "text" NOT NULL,
    "customer_id" integer NOT NULL,
    "quantity" integer NOT NULL,
    "unit_value" numeric(10,2) NOT NULL,
    "total_value" numeric(12,2) NOT NULL,
    "status" "text" DEFAULT 'Available'::"text",
    "storage_location_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_lots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."login_attempts" (
    "id" integer NOT NULL,
    "email" "text" NOT NULL,
    "ip_address" "inet",
    "success" boolean NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."login_attempts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."login_attempts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."login_attempts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."login_attempts_id_seq" OWNED BY "public"."login_attempts"."id";



CREATE TABLE IF NOT EXISTS "public"."material_indices" (
    "id" integer NOT NULL,
    "material" "text" NOT NULL,
    "index_source" "text" DEFAULT 'SHSPI'::"text" NOT NULL,
    "price_date" "date" NOT NULL,
    "price_usd_per_mt" numeric(10,4) NOT NULL,
    "data_period" "text",
    "fx_rate_cny_usd" numeric(8,4),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."material_indices" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."material_indices_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."material_indices_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."material_indices_id_seq" OWNED BY "public"."material_indices"."id";



CREATE TABLE IF NOT EXISTS "public"."materials" (
    "id" integer NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "category" character varying(50) NOT NULL,
    "description" "text",
    "color" character varying(50),
    "icon" character varying(50),
    "density" numeric(8,4),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


COMMENT ON TABLE "public"."materials" IS 'Master table for material types used in parts and inventory';



COMMENT ON COLUMN "public"."materials"."code" IS 'Unique material code used in application (e.g., steel, aluminum)';



COMMENT ON COLUMN "public"."materials"."name" IS 'Display name for the material';



COMMENT ON COLUMN "public"."materials"."category" IS 'Material category (metal, polymer, ceramic, etc.)';



COMMENT ON COLUMN "public"."materials"."color" IS 'CSS classes for UI display colors';



COMMENT ON COLUMN "public"."materials"."icon" IS 'FontAwesome icon class for UI display';



COMMENT ON COLUMN "public"."materials"."density" IS 'Material density in kg/m³ for weight calculations';



CREATE SEQUENCE IF NOT EXISTS "public"."materials_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."materials_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."materials_id_seq" OWNED BY "public"."materials"."id";



CREATE TABLE IF NOT EXISTS "public"."permission_modules" (
    "module_code" "text" NOT NULL,
    "module_name" "text" NOT NULL,
    "module_category" "text" NOT NULL,
    "available_actions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "permission_modules_module_category_check" CHECK (("module_category" = ANY (ARRAY['core'::"text", 'inventory'::"text", 'customs'::"text", 'reporting'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."permission_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" NOT NULL,
    "module_code" "text" NOT NULL,
    "action" "text" NOT NULL,
    "default_granted" boolean DEFAULT false NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "permission_templates_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'warehouse_staff'::"text"])))
);


ALTER TABLE "public"."permission_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."module_permission_matrix" AS
 SELECT "pm"."module_code",
    "pm"."module_name",
    "pm"."module_category",
    "e"."role",
    "pt"."action",
    COALESCE("pt"."default_granted", false) AS "default_granted"
   FROM (("public"."permission_modules" "pm"
     CROSS JOIN ( SELECT DISTINCT "employees"."role"
           FROM "public"."employees") "e")
     LEFT JOIN "public"."permission_templates" "pt" ON ((("pm"."module_code" = "pt"."module_code") AND ("e"."role" = "pt"."role"))))
  WHERE ("pm"."is_active" = true)
  ORDER BY "pm"."display_order", "pm"."module_name", "e"."role", "pt"."action";


ALTER VIEW "public"."module_permission_matrix" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."part_pricing_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_id" "uuid" NOT NULL,
    "adjustment_id" integer NOT NULL,
    "old_material_price" numeric(10,4) NOT NULL,
    "new_material_price" numeric(10,4) NOT NULL,
    "old_total_price" numeric(10,4) NOT NULL,
    "new_total_price" numeric(10,4) NOT NULL,
    "material_weight" numeric(8,4) NOT NULL,
    "price_adjustment_per_kg" numeric(10,6) NOT NULL,
    "effective_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."part_pricing_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."part_suppliers" (
    "id" integer NOT NULL,
    "part_id" "text" NOT NULL,
    "supplier_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."part_suppliers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."part_suppliers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."part_suppliers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."part_suppliers_id_seq" OWNED BY "public"."part_suppliers"."id";



CREATE TABLE IF NOT EXISTS "public"."parts" (
    "id" "text" NOT NULL,
    "description" "text" NOT NULL,
    "hts_code" "text",
    "country_of_origin" "text",
    "standard_value" numeric(10,2),
    "unit_of_measure" "text",
    "manufacturer_id" "text",
    "gross_weight" numeric,
    "package_quantity" integer,
    "package_type" "text",
    "material_price" numeric(12,4),
    "labor_price" numeric(12,4),
    "overhead_price" numeric(12,4),
    "price_source" "text" DEFAULT 'manual'::"text",
    "last_price_update" timestamp with time zone,
    "material_weight" numeric(8,4),
    "material" "text",
    CONSTRAINT "check_positive_labor_price" CHECK ((("labor_price" IS NULL) OR ("labor_price" >= (0)::numeric))),
    CONSTRAINT "check_positive_material_price" CHECK ((("material_price" IS NULL) OR ("material_price" >= (0)::numeric))),
    CONSTRAINT "check_positive_overhead_price" CHECK ((("overhead_price" IS NULL) OR ("overhead_price" >= (0)::numeric))),
    CONSTRAINT "check_positive_standard_value" CHECK ((("standard_value" IS NULL) OR ("standard_value" >= (0)::numeric))),
    CONSTRAINT "check_valid_price_source" CHECK (("price_source" = ANY (ARRAY['manual'::"text", 'quarterly_update'::"text", 'spot_price'::"text", 'contract'::"text", 'rfq'::"text", 'market_data'::"text"]))),
    CONSTRAINT "valid_material_type" CHECK ((("material" IS NULL) OR ("material" = ANY (ARRAY['steel'::"text", 'stainless_steel'::"text", 'carbon_steel'::"text", 'alloy_steel'::"text", 'aluminum'::"text", 'aluminum_alloy'::"text", 'brass'::"text", 'bronze'::"text", 'copper'::"text", 'iron'::"text", 'cast_iron'::"text", 'titanium'::"text", 'nickel'::"text", 'zinc'::"text", 'plastic'::"text", 'abs'::"text", 'pvc'::"text", 'polyethylene'::"text", 'polypropylene'::"text", 'nylon'::"text", 'polyurethane'::"text", 'pom'::"text", 'peek'::"text", 'ptfe'::"text", 'polycarbonate'::"text", 'acrylic'::"text", 'phenolic'::"text", 'carbon_fiber'::"text", 'fiberglass'::"text", 'composite'::"text", 'rubber'::"text", 'silicone'::"text", 'neoprene'::"text", 'viton'::"text", 'ceramic'::"text", 'glass'::"text", 'porcelain'::"text", 'wood'::"text", 'leather'::"text", 'fabric'::"text", 'paper'::"text", 'other'::"text", 'mixed_materials'::"text"]))))
);


ALTER TABLE "public"."parts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "change_type" "text" NOT NULL,
    "module_code" "text" NOT NULL,
    "action" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "changed_by" "uuid",
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "permission_audit_log_change_type_check" CHECK (("change_type" = ANY (ARRAY['granted'::"text", 'revoked'::"text", 'inherited'::"text", 'expired'::"text", 'bulk_update'::"text"])))
);


ALTER TABLE "public"."permission_audit_log" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."permission_audit_summary" AS
 SELECT "date_trunc"('day'::"text", "created_at") AS "audit_date",
    "change_type",
    "module_code",
    "count"(*) AS "change_count",
    "count"(DISTINCT "user_id") AS "users_affected",
    "count"(DISTINCT "changed_by") AS "administrators_involved"
   FROM "public"."permission_audit_log" "pal"
  WHERE ("created_at" >= ("now"() - '30 days'::interval))
  GROUP BY ("date_trunc"('day'::"text", "created_at")), "change_type", "module_code"
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC, ("count"(*)) DESC;


ALTER VIEW "public"."permission_audit_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permission_inheritance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "last_template_applied_at" timestamp with time zone DEFAULT "now"(),
    "custom_overrides_count" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "permission_inheritance_role_check" CHECK (("role" = ANY (ARRAY['employee'::"text", 'manager'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."permission_inheritance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preadmissions" (
    "id" integer NOT NULL,
    "admission_id" "text" NOT NULL,
    "e214" "text",
    "container_number" "text",
    "customer_id" integer,
    "items" "jsonb",
    "entry_number" "text",
    "status" "text" DEFAULT 'Pending'::"text",
    "arrival_date" "date",
    "dock_location" "text",
    "driver_name" "text",
    "driver_license_number" "text",
    "license_plate_number" "text",
    "carrier_name" "text",
    "signature_data" "jsonb",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "zone_status" "text",
    "primary_supplier_name" "text",
    "year" integer,
    "shipment_lot_id" "text",
    "bol_date" "date",
    "seal_number" "text",
    "luc_ship_date" "date",
    "bond_amount" numeric(15,2) DEFAULT 0.00,
    "freight_invoice_date" "date",
    "ship_invoice_number" "text",
    "uscbp_master_billing" "text",
    CONSTRAINT "preadmissions_zone_status_check" CHECK (("zone_status" = ANY (ARRAY['PF'::"text", 'NPF'::"text", 'D'::"text", 'ZR'::"text"])))
);


ALTER TABLE "public"."preadmissions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."preadmissions"."admission_id" IS 'Unique admission identifier';



COMMENT ON COLUMN "public"."preadmissions"."customer_id" IS 'Foreign key reference to customers table';



COMMENT ON COLUMN "public"."preadmissions"."entry_number" IS 'CBP entry number for customs clearance';



COMMENT ON COLUMN "public"."preadmissions"."arrival_date" IS 'Date of shipment arrival';



CREATE SEQUENCE IF NOT EXISTS "public"."preadmissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."preadmissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."preadmissions_id_seq" OWNED BY "public"."preadmissions"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."preshipments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."preshipments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."preshipments_id_seq" OWNED BY "public"."preshipments"."id";



CREATE TABLE IF NOT EXISTS "public"."pricing_adjustments" (
    "id" integer NOT NULL,
    "adjustment_name" "text" NOT NULL,
    "material" "text" NOT NULL,
    "quarter" "text" NOT NULL,
    "year" integer NOT NULL,
    "previous_price_usd_per_mt" numeric(10,4),
    "new_price_usd_per_mt" numeric(10,4),
    "percentage_change" numeric(5,2),
    "fx_rate_cny_usd" numeric(8,4),
    "source" "text" DEFAULT 'SHSPI'::"text",
    "effective_date" "date" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "data_months" "jsonb",
    "communication_month" character varying(10),
    "effective_month" character varying(10),
    "old_average_price" numeric(10,4),
    "parts_affected" integer DEFAULT 0,
    "total_cost_impact" numeric(15,4) DEFAULT 0,
    "customers_affected" integer DEFAULT 0,
    "pricing_formula" character varying(50) DEFAULT '3_month_rolling'::character varying,
    "formula_config" "jsonb",
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pricing_adjustments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pricing_adjustments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pricing_adjustments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pricing_adjustments_id_seq" OWNED BY "public"."pricing_adjustments"."id";



CREATE TABLE IF NOT EXISTS "public"."shipping_labels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shipment_id" "text" NOT NULL,
    "carrier" "text" NOT NULL,
    "service_type" "text" NOT NULL,
    "tracking_number" "text" NOT NULL,
    "ship_from" "jsonb" NOT NULL,
    "ship_to" "jsonb" NOT NULL,
    "package_info" "jsonb" NOT NULL,
    "items" "jsonb" NOT NULL,
    "label_format" "text" DEFAULT 'PDF'::"text",
    "label_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."shipping_labels" OWNER TO "postgres";


COMMENT ON TABLE "public"."shipping_labels" IS 'Stores shipping label information for outbound FTZ shipments';



COMMENT ON COLUMN "public"."shipping_labels"."shipment_id" IS 'Reference to preshipment ID';



COMMENT ON COLUMN "public"."shipping_labels"."carrier" IS 'Shipping carrier (UPS, FedEx, USPS, etc.)';



COMMENT ON COLUMN "public"."shipping_labels"."service_type" IS 'Shipping service level (STANDARD, EXPRESS, etc.)';



COMMENT ON COLUMN "public"."shipping_labels"."tracking_number" IS 'Unique tracking number for shipment';



COMMENT ON COLUMN "public"."shipping_labels"."ship_from" IS 'Origin address information as JSON';



COMMENT ON COLUMN "public"."shipping_labels"."ship_to" IS 'Destination address information as JSON';



COMMENT ON COLUMN "public"."shipping_labels"."package_info" IS 'Package dimensions and weight as JSON';



COMMENT ON COLUMN "public"."shipping_labels"."items" IS 'Detailed item information for customs as JSON';



COMMENT ON COLUMN "public"."shipping_labels"."label_format" IS 'Label file format (PDF, PNG, etc.)';



COMMENT ON COLUMN "public"."shipping_labels"."label_url" IS 'URL or path to generated label file';



CREATE TABLE IF NOT EXISTS "public"."status_history" (
    "id" integer NOT NULL,
    "inventory_lot_id" "text" NOT NULL,
    "previous_status" "text" NOT NULL,
    "new_status" "text" NOT NULL,
    "change_reason" "text",
    "user_id" "uuid",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."status_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."status_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."status_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."status_history_id_seq" OWNED BY "public"."status_history"."id";



CREATE TABLE IF NOT EXISTS "public"."storage_locations" (
    "id" integer NOT NULL,
    "location_code" "text" NOT NULL,
    "location_type" "text" NOT NULL,
    "zone" "text",
    "aisle" "text",
    "level" "text",
    "position" "text",
    "capacity_weight_kg" numeric(10,3),
    "capacity_volume_m3" numeric(8,3),
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "description" "text"
);


ALTER TABLE "public"."storage_locations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."storage_locations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."storage_locations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."storage_locations_id_seq" OWNED BY "public"."storage_locations"."id";



CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "ein" "text",
    "address" "text",
    "broker_name" "text",
    "contact_email" "text",
    "phone" "text",
    "contact_person" "text",
    "supplier_type" "text",
    "country" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "broker_contact" character varying(255),
    "broker_contact_email" character varying(255),
    "broker_contact_phone" character varying(50)
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."suppliers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."suppliers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."suppliers_id_seq" OWNED BY "public"."suppliers"."id";



CREATE TABLE IF NOT EXISTS "public"."system_pages" (
    "page_code" "text" NOT NULL,
    "page_name" "text" NOT NULL,
    "page_category" "text" NOT NULL,
    "requires_department" "text"[] NOT NULL,
    "default_permissions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "system_pages_page_category_check" CHECK (("page_category" = ANY (ARRAY['operations'::"text", 'administrative'::"text", 'reporting'::"text", 'reference'::"text"])))
);


ALTER TABLE "public"."system_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" integer NOT NULL,
    "lot_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2),
    "total_value" numeric(12,2),
    "reference_id" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."transactions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."transactions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."transactions_id_seq" OWNED BY "public"."transactions"."id";



CREATE TABLE IF NOT EXISTS "public"."us_ports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "port_name" "text" NOT NULL,
    "port_code" "text" NOT NULL
);


ALTER TABLE "public"."us_ports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_page_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "page_code" "text" NOT NULL,
    "access_level" "text" NOT NULL,
    "department" "text" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_page_permissions_access_level_check" CHECK (("access_level" = ANY (ARRAY['none'::"text", 'read'::"text", 'write'::"text", 'write_with_approval'::"text"]))),
    CONSTRAINT "user_page_permissions_department_check" CHECK (("department" = ANY (ARRAY['executive'::"text", 'warehouse'::"text", 'accounting'::"text", 'shipping_receiving'::"text"])))
);


ALTER TABLE "public"."user_page_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "module_code" "text" NOT NULL,
    "action" "text" NOT NULL,
    "granted" boolean DEFAULT false NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "is_inherited" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_permission_summary" AS
 SELECT "e"."id" AS "user_id",
    "e"."name" AS "full_name",
    "e"."email",
    "e"."role",
    "e"."department",
    "count"("up"."id") AS "total_permissions",
    "count"(
        CASE
            WHEN ("up"."granted" = true) THEN 1
            ELSE NULL::integer
        END) AS "granted_permissions",
    "count"(
        CASE
            WHEN ("up"."is_inherited" = true) THEN 1
            ELSE NULL::integer
        END) AS "inherited_permissions",
    "count"(
        CASE
            WHEN (("up"."is_inherited" = false) AND ("up"."granted" = true)) THEN 1
            ELSE NULL::integer
        END) AS "custom_permissions",
    "pi"."last_template_applied_at",
    "pi"."custom_overrides_count"
   FROM (("public"."employees" "e"
     LEFT JOIN "public"."user_permissions" "up" ON (("e"."id" = "up"."user_id")))
     LEFT JOIN "public"."permission_inheritance" "pi" ON (("e"."id" = "pi"."user_id")))
  GROUP BY "e"."id", "e"."name", "e"."email", "e"."role", "e"."department", "pi"."last_template_applied_at", "pi"."custom_overrides_count";


ALTER VIEW "public"."user_permission_summary" OWNER TO "postgres";


ALTER TABLE ONLY "public"."contacts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."contacts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."customers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."customers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."entry_grand_totals" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."entry_grand_totals_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."entry_group_preshipments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."entry_group_preshipments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."entry_summaries" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."entry_summaries_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."entry_summary_groups" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."entry_summary_groups_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."entry_summary_line_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."entry_summary_line_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ftz_status_records" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ftz_status_records_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."login_attempts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."login_attempts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."material_indices" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."material_indices_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."materials" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."materials_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."part_suppliers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."part_suppliers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."preadmissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."preadmissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."preshipments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."preshipments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."pricing_adjustments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."pricing_adjustments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."status_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."status_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."storage_locations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."storage_locations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."suppliers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."suppliers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."transactions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."transactions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_workflow_log"
    ADD CONSTRAINT "approval_workflow_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entry_grand_totals"
    ADD CONSTRAINT "entry_grand_totals_entry_summary_id_key" UNIQUE ("entry_summary_id");



ALTER TABLE ONLY "public"."entry_grand_totals"
    ADD CONSTRAINT "entry_grand_totals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entry_group_preshipments"
    ADD CONSTRAINT "entry_group_preshipments_group_id_preshipment_id_key" UNIQUE ("group_id", "preshipment_id");



ALTER TABLE ONLY "public"."entry_group_preshipments"
    ADD CONSTRAINT "entry_group_preshipments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entry_summaries"
    ADD CONSTRAINT "entry_summaries_entry_number_key" UNIQUE ("entry_number");



ALTER TABLE ONLY "public"."entry_summaries"
    ADD CONSTRAINT "entry_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entry_summary_groups"
    ADD CONSTRAINT "entry_summary_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."entry_summary_line_items"
    ADD CONSTRAINT "entry_summary_line_items_entry_summary_id_line_number_key" UNIQUE ("entry_summary_id", "line_number");



ALTER TABLE ONLY "public"."entry_summary_line_items"
    ADD CONSTRAINT "entry_summary_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."foreign_ports"
    ADD CONSTRAINT "foreign_ports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."foreign_ports"
    ADD CONSTRAINT "foreign_ports_port_name_key" UNIQUE ("port_name");



ALTER TABLE ONLY "public"."ftz_status_records"
    ADD CONSTRAINT "ftz_status_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_lots"
    ADD CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_attempts"
    ADD CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_indices"
    ADD CONSTRAINT "material_indices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_pricing_history"
    ADD CONSTRAINT "part_pricing_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part_suppliers"
    ADD CONSTRAINT "part_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_audit_log"
    ADD CONSTRAINT "permission_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_inheritance"
    ADD CONSTRAINT "permission_inheritance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_inheritance"
    ADD CONSTRAINT "permission_inheritance_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."permission_modules"
    ADD CONSTRAINT "permission_modules_pkey" PRIMARY KEY ("module_code");



ALTER TABLE ONLY "public"."permission_templates"
    ADD CONSTRAINT "permission_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_templates"
    ADD CONSTRAINT "permission_templates_role_module_code_action_key" UNIQUE ("role", "module_code", "action");



ALTER TABLE ONLY "public"."preadmissions"
    ADD CONSTRAINT "preadmissions_admissionid_key" UNIQUE ("admission_id");



ALTER TABLE ONLY "public"."preadmissions"
    ADD CONSTRAINT "preadmissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preshipments"
    ADD CONSTRAINT "preshipments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_adjustments"
    ADD CONSTRAINT "pricing_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipping_labels"
    ADD CONSTRAINT "shipping_labels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipping_labels"
    ADD CONSTRAINT "shipping_labels_tracking_number_key" UNIQUE ("tracking_number");



ALTER TABLE ONLY "public"."status_history"
    ADD CONSTRAINT "status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_locations"
    ADD CONSTRAINT "storage_locations_location_code_key" UNIQUE ("location_code");



ALTER TABLE ONLY "public"."storage_locations"
    ADD CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_pages"
    ADD CONSTRAINT "system_pages_pkey" PRIMARY KEY ("page_code");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."us_ports"
    ADD CONSTRAINT "us_ports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."us_ports"
    ADD CONSTRAINT "us_ports_port_code_key" UNIQUE ("port_code");



ALTER TABLE ONLY "public"."user_page_permissions"
    ADD CONSTRAINT "user_page_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_page_permissions"
    ADD CONSTRAINT "user_page_permissions_user_id_page_code_key" UNIQUE ("user_id", "page_code");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_module_code_action_key" UNIQUE ("user_id", "module_code", "action");



CREATE INDEX "idx_approval_requests_expires" ON "public"."approval_requests" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_approval_requests_page" ON "public"."approval_requests" USING "btree" ("page_code", "status");



CREATE INDEX "idx_approval_requests_pending" ON "public"."approval_requests" USING "btree" ("status", "created_at") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_approval_requests_requested_by" ON "public"."approval_requests" USING "btree" ("requested_by");



CREATE INDEX "idx_approval_requests_status" ON "public"."approval_requests" USING "btree" ("status");



CREATE INDEX "idx_contacts_customer_id" ON "public"."contacts" USING "btree" ("customer_id");



CREATE INDEX "idx_contacts_email" ON "public"."contacts" USING "btree" ("email");



CREATE INDEX "idx_contacts_is_primary" ON "public"."contacts" USING "btree" ("is_primary");



CREATE INDEX "idx_contacts_name" ON "public"."contacts" USING "btree" ("name");



CREATE INDEX "idx_customers_contact_email" ON "public"."customers" USING "btree" ("contact_email");



CREATE INDEX "idx_customers_created_at" ON "public"."customers" USING "btree" ("created_at");



CREATE INDEX "idx_customers_ein" ON "public"."customers" USING "btree" ("ein");



CREATE INDEX "idx_customers_name" ON "public"."customers" USING "btree" ("name");



CREATE INDEX "idx_customers_status" ON "public"."customers" USING "btree" ("status");



CREATE INDEX "idx_employees_email" ON "public"."employees" USING "btree" ("email");



CREATE INDEX "idx_employees_is_active" ON "public"."employees" USING "btree" ("is_active");



CREATE INDEX "idx_employees_is_admin" ON "public"."employees" USING "btree" ("is_admin");



CREATE INDEX "idx_employees_manager_id" ON "public"."employees" USING "btree" ("manager_id");



CREATE INDEX "idx_employees_phone" ON "public"."employees" USING "btree" ("phone");



CREATE INDEX "idx_employees_role" ON "public"."employees" USING "btree" ("role");



CREATE INDEX "idx_employees_role_active" ON "public"."employees" USING "btree" ("role") WHERE ("is_active" = true);



CREATE INDEX "idx_employees_status" ON "public"."employees" USING "btree" ("status");



CREATE INDEX "idx_employees_user_id" ON "public"."employees" USING "btree" ("user_id");



CREATE INDEX "idx_employees_user_id_role" ON "public"."employees" USING "btree" ("user_id", "role");



CREATE INDEX "idx_entry_group_preshipments_group" ON "public"."entry_group_preshipments" USING "btree" ("group_id");



CREATE INDEX "idx_entry_group_preshipments_preshipment" ON "public"."entry_group_preshipments" USING "btree" ("preshipment_id");



CREATE INDEX "idx_entry_line_items_entry_id" ON "public"."entry_summary_line_items" USING "btree" ("entry_summary_id");



CREATE INDEX "idx_entry_line_items_hts_code" ON "public"."entry_summary_line_items" USING "btree" ("hts_code");



CREATE INDEX "idx_entry_summaries_entry_number" ON "public"."entry_summaries" USING "btree" ("entry_number");



CREATE INDEX "idx_entry_summaries_filing_status" ON "public"."entry_summaries" USING "btree" ("filing_status");



CREATE INDEX "idx_entry_summaries_group_id" ON "public"."entry_summaries" USING "btree" ("group_id");



CREATE INDEX "idx_entry_summaries_preshipment_id" ON "public"."entry_summaries" USING "btree" ("preshipment_id");



CREATE INDEX "idx_entry_summary_groups_entry_year" ON "public"."entry_summary_groups" USING "btree" ("entry_year");



CREATE INDEX "idx_entry_summary_groups_filing_port" ON "public"."entry_summary_groups" USING "btree" ("filing_district_port");



CREATE INDEX "idx_entry_summary_groups_status" ON "public"."entry_summary_groups" USING "btree" ("status");



CREATE INDEX "idx_entry_summary_groups_week_ending" ON "public"."entry_summary_groups" USING "btree" ("week_ending_date");



CREATE INDEX "idx_inventory_lots_part" ON "public"."inventory_lots" USING "btree" ("part_id");



CREATE INDEX "idx_materials_category" ON "public"."materials" USING "btree" ("category");



CREATE INDEX "idx_materials_code" ON "public"."materials" USING "btree" ("code");



CREATE INDEX "idx_materials_is_active" ON "public"."materials" USING "btree" ("is_active");



CREATE INDEX "idx_part_suppliers_part" ON "public"."part_suppliers" USING "btree" ("part_id");



CREATE INDEX "idx_part_suppliers_supplier" ON "public"."part_suppliers" USING "btree" ("supplier_id");



CREATE INDEX "idx_parts_hts_code" ON "public"."parts" USING "btree" ("hts_code");



CREATE INDEX "idx_parts_material" ON "public"."parts" USING "btree" ("material");



CREATE INDEX "idx_permission_audit_changed_by" ON "public"."permission_audit_log" USING "btree" ("changed_by", "created_at" DESC);



CREATE INDEX "idx_permission_audit_user" ON "public"."permission_audit_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_permission_inheritance_user" ON "public"."permission_inheritance" USING "btree" ("user_id", "role");



CREATE INDEX "idx_permission_modules_active" ON "public"."permission_modules" USING "btree" ("is_active", "display_order") WHERE ("is_active" = true);



CREATE INDEX "idx_permission_modules_category" ON "public"."permission_modules" USING "btree" ("module_category", "display_order");



CREATE INDEX "idx_permission_modules_code_active" ON "public"."permission_modules" USING "btree" ("module_code", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_permission_templates_role" ON "public"."permission_templates" USING "btree" ("role", "module_code");



CREATE INDEX "idx_preadmissions_customer" ON "public"."preadmissions" USING "btree" ("customer_id");



CREATE INDEX "idx_preadmissions_primary_supplier" ON "public"."preadmissions" USING "btree" ("primary_supplier_name");



CREATE INDEX "idx_preadmissions_shipment_lot_id" ON "public"."preadmissions" USING "btree" ("shipment_lot_id");



CREATE INDEX "idx_preadmissions_year" ON "public"."preadmissions" USING "btree" ("year");



CREATE INDEX "idx_preadmissions_zone_status" ON "public"."preadmissions" USING "btree" ("zone_status");



CREATE INDEX "idx_preshipments_customer" ON "public"."preshipments" USING "btree" ("customer_id");



CREATE INDEX "idx_preshipments_entry_summary_id" ON "public"."preshipments" USING "btree" ("entry_summary_id");



CREATE INDEX "idx_preshipments_is_grouped" ON "public"."preshipments" USING "btree" ("is_grouped");



CREATE INDEX "idx_shipping_labels_carrier" ON "public"."shipping_labels" USING "btree" ("carrier");



CREATE INDEX "idx_shipping_labels_created_at" ON "public"."shipping_labels" USING "btree" ("created_at");



CREATE INDEX "idx_shipping_labels_shipment_id" ON "public"."shipping_labels" USING "btree" ("shipment_id");



CREATE INDEX "idx_shipping_labels_tracking_number" ON "public"."shipping_labels" USING "btree" ("tracking_number");



CREATE INDEX "idx_suppliers_name" ON "public"."suppliers" USING "btree" ("name");



CREATE INDEX "idx_system_pages_active" ON "public"."system_pages" USING "btree" ("is_active", "display_order") WHERE ("is_active" = true);



CREATE INDEX "idx_system_pages_category" ON "public"."system_pages" USING "btree" ("page_category");



CREATE INDEX "idx_transactions_lot" ON "public"."transactions" USING "btree" ("lot_id");



CREATE INDEX "idx_user_page_permissions_active" ON "public"."user_page_permissions" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_user_page_permissions_page_code" ON "public"."user_page_permissions" USING "btree" ("page_code");



CREATE INDEX "idx_user_page_permissions_user_id" ON "public"."user_page_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_user_permissions_expiring" ON "public"."user_permissions" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_user_permissions_inheritance" ON "public"."user_permissions" USING "btree" ("user_id", "is_inherited", "granted");



CREATE INDEX "idx_user_permissions_module_action" ON "public"."user_permissions" USING "btree" ("module_code", "action");



CREATE INDEX "idx_user_permissions_user_granted" ON "public"."user_permissions" USING "btree" ("user_id", "granted") WHERE ("granted" = true);



CREATE INDEX "idx_user_permissions_user_granted_active" ON "public"."user_permissions" USING "btree" ("user_id", "granted") WHERE ("granted" = true);



CREATE INDEX "idx_user_permissions_user_module" ON "public"."user_permissions" USING "btree" ("user_id", "module_code");



CREATE OR REPLACE TRIGGER "approval_workflow_logging_trigger" AFTER INSERT OR UPDATE ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."log_approval_workflow"();



CREATE OR REPLACE TRIGGER "audit_user_permissions_changes" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_permission_changes"();



CREATE OR REPLACE TRIGGER "ensure_single_primary_contact_trigger" BEFORE INSERT OR UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_primary_contact"();



CREATE OR REPLACE TRIGGER "sync_employee_status_trigger" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."sync_employee_status"();



CREATE OR REPLACE TRIGGER "trigger_update_materials_updated_at" BEFORE UPDATE ON "public"."materials" FOR EACH ROW EXECUTE FUNCTION "public"."update_materials_updated_at"();



CREATE OR REPLACE TRIGGER "update_approval_requests_updated_at" BEFORE UPDATE ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_permission_updated_at"();



CREATE OR REPLACE TRIGGER "update_contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_entry_summary_groups_updated_at" BEFORE UPDATE ON "public"."entry_summary_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_permission_inheritance_updated_at" BEFORE UPDATE ON "public"."permission_inheritance" FOR EACH ROW EXECUTE FUNCTION "public"."update_permission_timestamps"();



CREATE OR REPLACE TRIGGER "update_permission_modules_updated_at" BEFORE UPDATE ON "public"."permission_modules" FOR EACH ROW EXECUTE FUNCTION "public"."update_permission_timestamps"();



CREATE OR REPLACE TRIGGER "update_permission_templates_updated_at" BEFORE UPDATE ON "public"."permission_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_permission_timestamps"();



CREATE OR REPLACE TRIGGER "update_system_pages_updated_at" BEFORE UPDATE ON "public"."system_pages" FOR EACH ROW EXECUTE FUNCTION "public"."update_permission_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_page_permissions_updated_at" BEFORE UPDATE ON "public"."user_page_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_permission_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_permissions_updated_at" BEFORE UPDATE ON "public"."user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_permission_timestamps"();



CREATE OR REPLACE TRIGGER "validate_template_permission_action" BEFORE INSERT OR UPDATE ON "public"."permission_templates" FOR EACH ROW EXECUTE FUNCTION "public"."validate_permission_action"();



CREATE OR REPLACE TRIGGER "validate_user_permission_action" BEFORE INSERT OR UPDATE ON "public"."user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_permission_action"();



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_page_code_fkey" FOREIGN KEY ("page_code") REFERENCES "public"."system_pages"("page_code");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."approval_workflow_log"
    ADD CONSTRAINT "approval_workflow_log_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_workflow_log"
    ADD CONSTRAINT "approval_workflow_log_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entry_grand_totals"
    ADD CONSTRAINT "entry_grand_totals_entry_summary_id_fkey" FOREIGN KEY ("entry_summary_id") REFERENCES "public"."entry_summaries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entry_group_preshipments"
    ADD CONSTRAINT "entry_group_preshipments_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entry_group_preshipments"
    ADD CONSTRAINT "entry_group_preshipments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."entry_summary_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entry_group_preshipments"
    ADD CONSTRAINT "entry_group_preshipments_preshipment_id_fkey" FOREIGN KEY ("preshipment_id") REFERENCES "public"."preshipments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entry_summaries"
    ADD CONSTRAINT "entry_summaries_consignee_id_fkey" FOREIGN KEY ("consignee_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."entry_summaries"
    ADD CONSTRAINT "entry_summaries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entry_summaries"
    ADD CONSTRAINT "entry_summaries_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."entry_summary_groups"("id");



ALTER TABLE ONLY "public"."entry_summaries"
    ADD CONSTRAINT "entry_summaries_preshipment_id_fkey" FOREIGN KEY ("preshipment_id") REFERENCES "public"."preshipments"("id");



ALTER TABLE ONLY "public"."entry_summary_groups"
    ADD CONSTRAINT "entry_summary_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entry_summary_groups"
    ADD CONSTRAINT "entry_summary_groups_filed_by_fkey" FOREIGN KEY ("filed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entry_summary_groups"
    ADD CONSTRAINT "entry_summary_groups_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."entry_summary_line_items"
    ADD CONSTRAINT "entry_summary_line_items_entry_summary_id_fkey" FOREIGN KEY ("entry_summary_id") REFERENCES "public"."entry_summaries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."entry_summary_line_items"
    ADD CONSTRAINT "entry_summary_line_items_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inventory_lots"("id");



ALTER TABLE ONLY "public"."entry_summary_line_items"
    ADD CONSTRAINT "entry_summary_line_items_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id");



ALTER TABLE ONLY "public"."ftz_status_records"
    ADD CONSTRAINT "ftz_status_records_entry_line_item_id_fkey" FOREIGN KEY ("entry_line_item_id") REFERENCES "public"."entry_summary_line_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_lots"
    ADD CONSTRAINT "inventory_lots_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."inventory_lots"
    ADD CONSTRAINT "inventory_lots_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id");



ALTER TABLE ONLY "public"."inventory_lots"
    ADD CONSTRAINT "inventory_lots_storage_location_id_fkey" FOREIGN KEY ("storage_location_id") REFERENCES "public"."storage_locations"("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."part_suppliers"
    ADD CONSTRAINT "part_suppliers_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id");



ALTER TABLE ONLY "public"."part_suppliers"
    ADD CONSTRAINT "part_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."permission_audit_log"
    ADD CONSTRAINT "permission_audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."permission_audit_log"
    ADD CONSTRAINT "permission_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_inheritance"
    ADD CONSTRAINT "permission_inheritance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permission_templates"
    ADD CONSTRAINT "permission_templates_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "public"."permission_modules"("module_code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."preadmissions"
    ADD CONSTRAINT "preadmissions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."preshipments"
    ADD CONSTRAINT "preshipments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."shipping_labels"
    ADD CONSTRAINT "shipping_labels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inventory_lots"("id");



ALTER TABLE ONLY "public"."user_page_permissions"
    ADD CONSTRAINT "user_page_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."user_page_permissions"
    ADD CONSTRAINT "user_page_permissions_page_code_fkey" FOREIGN KEY ("page_code") REFERENCES "public"."system_pages"("page_code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_page_permissions"
    ADD CONSTRAINT "user_page_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "public"."permission_modules"("module_code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



CREATE POLICY "Allow insert for all users" ON "public"."login_attempts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable access for authenticated users" ON "public"."customers" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."entry_grand_totals" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."entry_group_preshipments" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."entry_summaries" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."entry_summary_groups" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."entry_summary_line_items" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."ftz_status_records" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."inventory_lots" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."material_indices" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."part_pricing_history" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."part_suppliers" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."parts" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."preadmissions" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."preshipments" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."pricing_adjustments" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."shipping_labels" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."storage_locations" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."suppliers" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable access for authenticated users" ON "public"."transactions" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable all access for authenticated users" ON "public"."contacts" USING (true);



CREATE POLICY "Enable all access for authenticated users" ON "public"."customers" USING (true);



CREATE POLICY "approval_log_relevant_read" ON "public"."approval_workflow_log" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."approval_requests" "ar"
     JOIN "public"."employees" "e" ON (("ar"."requested_by" = "e"."id")))
  WHERE (("ar"."id" = "approval_workflow_log"."approval_request_id") AND (("e"."user_id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text"))))) OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])))))));



ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "approval_requests_manager_modify" ON "public"."approval_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "approval_requests_relevant_access" ON "public"."approval_requests" FOR SELECT USING ((("requested_by" = ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])))))));



CREATE POLICY "approval_requests_user_create" ON "public"."approval_requests" FOR INSERT WITH CHECK (("requested_by" = ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."approval_workflow_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_admin_modify" ON "public"."customers" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ '%manager@lucerne.com'::"text")));



CREATE POLICY "customers_select_auth" ON "public"."customers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "employees_admin_all_access" ON "public"."employees" USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "employees_1"
  WHERE (("employees_1"."user_id" = "auth"."uid"()) AND (("employees_1"."role" = 'admin'::"text") OR ("employees_1"."is_admin" = true))))));



CREATE POLICY "employees_enhanced_read_access" ON "public"."employees" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = 'admin'::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = 'manager'::"text") AND ("employees"."role" = 'warehouse_staff'::"text"))))));



CREATE POLICY "employees_manager_team_view" ON "public"."employees" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "manager"
  WHERE (("manager"."user_id" = "auth"."uid"()) AND ("manager"."role" = 'manager'::"text") AND ("employees"."manager_id" = "manager"."id")))));



CREATE POLICY "employees_own_record" ON "public"."employees" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "employees_read_policy" ON "public"."employees" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "employees_select_public" ON "public"."employees" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "employees_structured_modify" ON "public"."employees" USING (((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = 'admin'::"text")))) OR ((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = 'manager'::"text")))) AND ("role" = 'warehouse_staff'::"text")) OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."entry_grand_totals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entry_group_preshipments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entry_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entry_summary_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."entry_summary_line_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ftz_status_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "icrs_customers_modify" ON "public"."customers" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") = 'warehouse.manager@icrs.test'::"text")));



CREATE POLICY "icrs_customers_read" ON "public"."customers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "icrs_employees_modify" ON "public"."employees" USING ((("auth"."jwt"() ->> 'email'::"text") = 'admin@icrs.test'::"text"));



CREATE POLICY "icrs_employees_read" ON "public"."employees" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "icrs_inventory_modify" ON "public"."inventory_lots" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") = 'warehouse.manager@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ 'operator%@icrs.test'::"text")));



CREATE POLICY "icrs_inventory_read" ON "public"."inventory_lots" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "icrs_parts_modify" ON "public"."parts" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") = 'warehouse.manager@icrs.test'::"text")));



CREATE POLICY "icrs_parts_read" ON "public"."parts" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "icrs_preadmissions_modify" ON "public"."preadmissions" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") = 'warehouse.manager@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") = 'customs.broker@icrs.test'::"text")));



CREATE POLICY "icrs_preadmissions_read" ON "public"."preadmissions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "icrs_preshipments_modify" ON "public"."preshipments" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") = 'warehouse.manager@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ 'operator%@icrs.test'::"text")));



CREATE POLICY "icrs_preshipments_read" ON "public"."preshipments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "icrs_storage_modify" ON "public"."storage_locations" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") = 'warehouse.manager@icrs.test'::"text")));



CREATE POLICY "icrs_storage_read" ON "public"."storage_locations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "icrs_suppliers_modify" ON "public"."suppliers" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") = 'warehouse.manager@icrs.test'::"text")));



CREATE POLICY "icrs_suppliers_read" ON "public"."suppliers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "icrs_transactions_modify" ON "public"."transactions" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") = 'warehouse.manager@icrs.test'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ 'operator%@icrs.test'::"text")));



CREATE POLICY "icrs_transactions_read" ON "public"."transactions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."inventory_lots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_select_auth" ON "public"."inventory_lots" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "inventory_warehouse_modify" ON "public"."inventory_lots" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ 'warehouse.%@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ '%clerk@lucerne.com'::"text")));



ALTER TABLE "public"."login_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material_indices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "materials_read_policy" ON "public"."materials" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "materials_write_policy" ON "public"."materials" USING ((("auth"."role"() = 'authenticated'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."id" = "auth"."uid"()) AND ("employees"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'staff'::"text"])))))));



ALTER TABLE "public"."part_pricing_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."part_suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parts_select_auth" ON "public"."parts" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "parts_warehouse_modify" ON "public"."parts" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ 'warehouse.%@lucerne.com'::"text")));



ALTER TABLE "public"."permission_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permission_audit_log_enhanced_access" ON "public"."permission_audit_log" FOR SELECT USING (((("user_id" = ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) AND ("created_at" >= ("now"() - '90 days'::interval))) OR ("public"."can_manage_user_permissions"("user_id") AND ("created_at" >= ("now"() - '30 days'::interval))) OR ((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = 'admin'::"text")))) AND ("created_at" >= ("now"() - '1 year'::interval)))));



ALTER TABLE "public"."permission_inheritance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permission_inheritance_admin_manager_modify" ON "public"."permission_inheritance" USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "permission_inheritance_controlled_modify" ON "public"."permission_inheritance" USING (("public"."can_manage_user_permissions"("user_id") AND ("role" = ( SELECT "employees"."role"
   FROM "public"."employees"
  WHERE ("employees"."id" = "permission_inheritance"."user_id")))));



CREATE POLICY "permission_inheritance_detailed_read" ON "public"."permission_inheritance" FOR SELECT USING ((("user_id" = ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR "public"."can_manage_user_permissions"("user_id")));



CREATE POLICY "permission_inheritance_read_access" ON "public"."permission_inheritance" FOR SELECT USING ((("user_id" = ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])))))));



ALTER TABLE "public"."permission_modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permission_modules_admin_modify" ON "public"."permission_modules" USING ((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = 'admin'::"text")))));



CREATE POLICY "permission_modules_read_authenticated" ON "public"."permission_modules" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."permission_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permission_templates_read_authenticated" ON "public"."permission_templates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "permission_templates_role_based_modify" ON "public"."permission_templates" USING (((EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = 'admin'::"text")))) AND ("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'warehouse_staff'::"text"]))));



ALTER TABLE "public"."preadmissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "preadmissions_authorized_modify" ON "public"."preadmissions" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ '%manager@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ 'receiving.clerk@lucerne.com'::"text")));



CREATE POLICY "preadmissions_select_auth" ON "public"."preadmissions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."preshipments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "preshipments_authorized_modify" ON "public"."preshipments" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ '%manager@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ 'shipping.clerk@lucerne.com'::"text")));



CREATE POLICY "preshipments_select_auth" ON "public"."preshipments" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."pricing_adjustments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_labels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shipping_labels_delete_policy" ON "public"."shipping_labels" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = 'admin'::"text")))));



CREATE POLICY "shipping_labels_insert_policy" ON "public"."shipping_labels" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"]))))));



CREATE POLICY "shipping_labels_select_policy" ON "public"."shipping_labels" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "shipping_labels_update_policy" ON "public"."shipping_labels" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."employees"
  WHERE (("employees"."user_id" = "auth"."uid"()) AND ("employees"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."storage_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "storage_select_auth" ON "public"."storage_locations" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "storage_warehouse_modify" ON "public"."storage_locations" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ 'warehouse.%@lucerne.com'::"text")));



ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_admin_modify" ON "public"."suppliers" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ '%manager@lucerne.com'::"text")));



CREATE POLICY "suppliers_select_auth" ON "public"."suppliers" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."system_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_pages_admin_modify" ON "public"."system_pages" USING ((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text"));



CREATE POLICY "system_pages_read_authenticated" ON "public"."system_pages" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_authorized_modify" ON "public"."transactions" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ '%clerk@lucerne.com'::"text") OR (("auth"."jwt"() ->> 'email'::"text") ~~ '%manager@lucerne.com'::"text")));



CREATE POLICY "transactions_select_auth" ON "public"."transactions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."user_page_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_permissions_admin_modify" ON "public"."user_page_permissions" USING (((("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "auth"."uid"()) AND ("e"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])))))));



CREATE POLICY "user_permissions_hierarchical_read" ON "public"."user_permissions" FOR SELECT USING ((("user_id" = ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR "public"."can_manage_user_permissions"("user_id")));



CREATE POLICY "user_permissions_own_read" ON "public"."user_page_permissions" FOR SELECT USING ((("user_id" = ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'email'::"text") = 'admin@lucerne.com'::"text")));



CREATE POLICY "user_permissions_validated_insert" ON "public"."user_permissions" FOR INSERT WITH CHECK (("public"."can_manage_user_permissions"("user_id") AND "public"."validate_module_action"("module_code", "action") AND ("granted_by" = ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"())))));



CREATE POLICY "user_permissions_validated_modify" ON "public"."user_permissions" USING (("public"."can_manage_user_permissions"("user_id") AND "public"."validate_module_action"("module_code", "action")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."apply_role_template_permissions"("p_user_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_role_template_permissions"("p_user_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_role_template_permissions"("p_user_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_permission_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_permission_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_permission_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_update_user_permissions"("p_user_id" "uuid", "p_permissions" "jsonb", "p_changed_by" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_update_user_permissions"("p_user_id" "uuid", "p_permissions" "jsonb", "p_changed_by" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_update_user_permissions"("p_user_id" "uuid", "p_permissions" "jsonb", "p_changed_by" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_user_permissions"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_user_permissions"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_user_permissions"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_permission"("required_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_permission"("required_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_permission"("required_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_employee"("p_name" "text", "p_email" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_temp_password" "text", "p_is_admin" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_employee"("p_name" "text", "p_email" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_temp_password" "text", "p_is_admin" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_employee"("p_name" "text", "p_email" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_temp_password" "text", "p_is_admin" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_missing_auth_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_missing_auth_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_missing_auth_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deactivate_employee"("p_employee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_employee"("p_employee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_employee"("p_employee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_primary_contact"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_contact"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_contact"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_primary_variant"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_variant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_primary_variant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_reconciliation"("start_date" "date", "end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_reconciliation"("start_date" "date", "end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_reconciliation"("start_date" "date", "end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_employees"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_employees"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_employees"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_employee"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_employee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_employee"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employee_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_employee_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employee_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_managers_list"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_managers_list"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_managers_list"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_accessible_pages"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_accessible_pages"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_accessible_pages"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_module_permissions"("p_user_id" "uuid", "p_module_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_module_permissions"("p_user_id" "uuid", "p_module_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_module_permissions"("p_user_id" "uuid", "p_module_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_account_locked"("p_email" "text", "p_ip_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_account_locked"("p_email" "text", "p_ip_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_account_locked"("p_email" "text", "p_ip_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_employee_to_auth_user"("p_employee_email" "text", "p_auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."link_employee_to_auth_user"("p_employee_email" "text", "p_auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_employee_to_auth_user"("p_employee_email" "text", "p_auth_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_approval_workflow"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_approval_workflow"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_approval_workflow"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_user_password"("p_employee_id" "uuid", "p_new_password" "text", "p_force_change" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."reset_user_password"("p_employee_id" "uuid", "p_new_password" "text", "p_force_change" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_user_password"("p_employee_id" "uuid", "p_new_password" "text", "p_force_change" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_employee_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_employee_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_employee_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_login_attempt"("p_email" "text", "p_ip_address" "text", "p_success" boolean, "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_login_attempt"("p_email" "text", "p_ip_address" "text", "p_success" boolean, "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_login_attempt"("p_email" "text", "p_ip_address" "text", "p_success" boolean, "p_user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_department" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_department" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_department" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_department" "text", "p_is_active" boolean, "p_is_admin" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_department" "text", "p_is_active" boolean, "p_is_admin" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_employee"("p_employee_id" "uuid", "p_name" "text", "p_job_title" "text", "p_role" "text", "p_manager_id" "uuid", "p_department" "text", "p_is_active" boolean, "p_is_admin" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_entry_summary_groups_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_entry_summary_groups_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_entry_summary_groups_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_last_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_last_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_last_login"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_material_indices_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_material_indices_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_material_indices_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_materials_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_materials_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_materials_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_parts_price_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_parts_price_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_parts_price_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_permission_timestamps"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_permission_timestamps"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_permission_timestamps"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_permission_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_permission_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_permission_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_preshipment_grouping_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_preshipment_grouping_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_preshipment_grouping_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pricing_adjustments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pricing_adjustments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pricing_adjustments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_storage_locations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_storage_locations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_storage_locations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_variant_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_variant_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_variant_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_action_requires_approval"("p_user_id" "uuid", "p_page_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_action_requires_approval"("p_user_id" "uuid", "p_page_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_action_requires_approval"("p_user_id" "uuid", "p_page_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_module_permission"("p_user_id" "uuid", "p_module_code" "text", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_module_permission"("p_user_id" "uuid", "p_module_code" "text", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_module_permission"("p_user_id" "uuid", "p_module_code" "text", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_page_access"("p_user_id" "uuid", "p_page_code" "text", "p_required_level" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_page_access"("p_user_id" "uuid", "p_page_code" "text", "p_required_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_page_access"("p_user_id" "uuid", "p_page_code" "text", "p_required_level" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_module_action"("p_module_code" "text", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_module_action"("p_module_code" "text", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_module_action"("p_module_code" "text", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_permission_action"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_permission_action"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_permission_action"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_preshipment_for_grouping"("p_preshipment_id" integer, "p_group_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_preshipment_for_grouping"("p_preshipment_id" integer, "p_group_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_preshipment_for_grouping"("p_preshipment_id" integer, "p_group_id" integer) TO "service_role";



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;









GRANT ALL ON TABLE "public"."approval_requests" TO "anon";
GRANT ALL ON TABLE "public"."approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_requests" TO "service_role";



GRANT ALL ON TABLE "public"."approval_workflow_log" TO "anon";
GRANT ALL ON TABLE "public"."approval_workflow_log" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_workflow_log" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contacts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contacts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contacts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."entry_grand_totals" TO "anon";
GRANT ALL ON TABLE "public"."entry_grand_totals" TO "authenticated";
GRANT ALL ON TABLE "public"."entry_grand_totals" TO "service_role";



GRANT ALL ON SEQUENCE "public"."entry_grand_totals_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."entry_grand_totals_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."entry_grand_totals_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."entry_group_preshipments" TO "anon";
GRANT ALL ON TABLE "public"."entry_group_preshipments" TO "authenticated";
GRANT ALL ON TABLE "public"."entry_group_preshipments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."entry_group_preshipments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."entry_group_preshipments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."entry_group_preshipments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."entry_summaries" TO "anon";
GRANT ALL ON TABLE "public"."entry_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."entry_summaries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."entry_summaries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."entry_summaries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."entry_summaries_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."entry_summary_groups" TO "anon";
GRANT ALL ON TABLE "public"."entry_summary_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."entry_summary_groups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."entry_summary_groups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."entry_summary_groups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."entry_summary_groups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."preshipments" TO "anon";
GRANT ALL ON TABLE "public"."preshipments" TO "authenticated";
GRANT ALL ON TABLE "public"."preshipments" TO "service_role";



GRANT ALL ON TABLE "public"."entry_summary_groups_with_stats" TO "anon";
GRANT ALL ON TABLE "public"."entry_summary_groups_with_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."entry_summary_groups_with_stats" TO "service_role";



GRANT ALL ON TABLE "public"."entry_summary_line_items" TO "anon";
GRANT ALL ON TABLE "public"."entry_summary_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."entry_summary_line_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."entry_summary_line_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."entry_summary_line_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."entry_summary_line_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."foreign_ports" TO "anon";
GRANT ALL ON TABLE "public"."foreign_ports" TO "authenticated";
GRANT ALL ON TABLE "public"."foreign_ports" TO "service_role";



GRANT ALL ON TABLE "public"."ftz_status_records" TO "anon";
GRANT ALL ON TABLE "public"."ftz_status_records" TO "authenticated";
GRANT ALL ON TABLE "public"."ftz_status_records" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ftz_status_records_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ftz_status_records_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ftz_status_records_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_lots" TO "anon";
GRANT ALL ON TABLE "public"."inventory_lots" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_lots" TO "service_role";



GRANT ALL ON TABLE "public"."login_attempts" TO "anon";
GRANT ALL ON TABLE "public"."login_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."login_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."login_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."login_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."login_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."material_indices" TO "anon";
GRANT ALL ON TABLE "public"."material_indices" TO "authenticated";
GRANT ALL ON TABLE "public"."material_indices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."material_indices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."material_indices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."material_indices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."permission_modules" TO "anon";
GRANT ALL ON TABLE "public"."permission_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_modules" TO "service_role";



GRANT ALL ON TABLE "public"."permission_templates" TO "anon";
GRANT ALL ON TABLE "public"."permission_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_templates" TO "service_role";



GRANT ALL ON TABLE "public"."module_permission_matrix" TO "anon";
GRANT ALL ON TABLE "public"."module_permission_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."module_permission_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."part_pricing_history" TO "anon";
GRANT ALL ON TABLE "public"."part_pricing_history" TO "authenticated";
GRANT ALL ON TABLE "public"."part_pricing_history" TO "service_role";



GRANT ALL ON TABLE "public"."part_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."part_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."part_suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."part_suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."part_suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."part_suppliers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."parts" TO "anon";
GRANT ALL ON TABLE "public"."parts" TO "authenticated";
GRANT ALL ON TABLE "public"."parts" TO "service_role";



GRANT ALL ON TABLE "public"."permission_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."permission_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."permission_audit_summary" TO "anon";
GRANT ALL ON TABLE "public"."permission_audit_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_audit_summary" TO "service_role";



GRANT ALL ON TABLE "public"."permission_inheritance" TO "anon";
GRANT ALL ON TABLE "public"."permission_inheritance" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_inheritance" TO "service_role";



GRANT ALL ON TABLE "public"."preadmissions" TO "anon";
GRANT ALL ON TABLE "public"."preadmissions" TO "authenticated";
GRANT ALL ON TABLE "public"."preadmissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."preadmissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."preadmissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."preadmissions_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."preshipments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."preshipments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."preshipments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."pricing_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_adjustments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pricing_adjustments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pricing_adjustments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pricing_adjustments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."shipping_labels" TO "anon";
GRANT ALL ON TABLE "public"."shipping_labels" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_labels" TO "service_role";



GRANT ALL ON TABLE "public"."status_history" TO "anon";
GRANT ALL ON TABLE "public"."status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."status_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."status_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."status_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."status_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."storage_locations" TO "anon";
GRANT ALL ON TABLE "public"."storage_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_locations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."storage_locations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."storage_locations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."storage_locations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."system_pages" TO "anon";
GRANT ALL ON TABLE "public"."system_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."system_pages" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."transactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."us_ports" TO "anon";
GRANT ALL ON TABLE "public"."us_ports" TO "authenticated";
GRANT ALL ON TABLE "public"."us_ports" TO "service_role";



GRANT ALL ON TABLE "public"."user_page_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_page_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_page_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_permission_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_permission_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permission_summary" TO "service_role";



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
