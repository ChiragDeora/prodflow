-- ============================================================================
-- AUDIT HELPER FUNCTIONS FOR PERMISSION SYSTEM
-- ============================================================================

-- Function to get permission audit statistics
CREATE OR REPLACE FUNCTION get_permission_audit_stats(
    start_date_param TEXT DEFAULT NULL,
    end_date_param TEXT DEFAULT NULL,
    user_id_param UUID DEFAULT NULL
) RETURNS TABLE (
    total_permission_changes INTEGER,
    grants_count INTEGER,
    revokes_count INTEGER,
    modifications_count INTEGER,
    unique_users_affected INTEGER,
    unique_permissions_affected INTEGER,
    most_active_admin TEXT,
    most_affected_user TEXT
) AS $$
DECLARE
    date_filter_start TIMESTAMP WITH TIME ZONE;
    date_filter_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Parse date parameters
    IF start_date_param IS NOT NULL THEN
        date_filter_start := start_date_param::TIMESTAMP WITH TIME ZONE;
    ELSE
        date_filter_start := NOW() - INTERVAL '30 days';
    END IF;
    
    IF end_date_param IS NOT NULL THEN
        date_filter_end := end_date_param::TIMESTAMP WITH TIME ZONE;
    ELSE
        date_filter_end := NOW();
    END IF;

    RETURN QUERY
    WITH permission_stats AS (
        SELECT 
            COUNT(*) as total_changes,
            COUNT(*) FILTER (WHERE action = 'granted') as grants,
            COUNT(*) FILTER (WHERE action = 'revoked') as revokes,
            COUNT(*) FILTER (WHERE action = 'modified') as modifications,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT permission_id) as unique_permissions
        FROM auth_user_permission_history h
        WHERE h.created_at >= date_filter_start
        AND h.created_at <= date_filter_end
        AND (user_id_param IS NULL OR h.user_id = user_id_param)
    ),
    most_active_admin_cte AS (
        SELECT u.full_name
        FROM auth_user_permission_history h
        JOIN auth_system.auth_users u ON h.granted_by = u.id
        WHERE h.created_at >= date_filter_start
        AND h.created_at <= date_filter_end
        AND (user_id_param IS NULL OR h.user_id = user_id_param)
        GROUP BY u.id, u.full_name
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ),
    most_affected_user_cte AS (
        SELECT u.full_name
        FROM auth_user_permission_history h
        JOIN auth_system.auth_users u ON h.user_id = u.id
        WHERE h.created_at >= date_filter_start
        AND h.created_at <= date_filter_end
        AND (user_id_param IS NULL OR h.user_id = user_id_param)
        GROUP BY u.id, u.full_name
        ORDER BY COUNT(*) DESC
        LIMIT 1
    )
    SELECT 
        ps.total_changes::INTEGER,
        ps.grants::INTEGER,
        ps.revokes::INTEGER,
        ps.modifications::INTEGER,
        ps.unique_users::INTEGER,
        ps.unique_permissions::INTEGER,
        COALESCE(maa.full_name, 'N/A') as most_active_admin,
        COALESCE(mau.full_name, 'N/A') as most_affected_user
    FROM permission_stats ps
    LEFT JOIN most_active_admin_cte maa ON true
    LEFT JOIN most_affected_user_cte mau ON true;
END;
$$ LANGUAGE plpgsql;

-- Function to get user permission summary
CREATE OR REPLACE FUNCTION get_user_permission_summary(user_id_param UUID)
RETURNS TABLE (
    total_direct_permissions INTEGER,
    total_role_permissions INTEGER,
    total_effective_permissions INTEGER,
    departments_with_access TEXT[],
    modules_with_access TEXT[],
    last_permission_change TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH direct_perms AS (
        SELECT COUNT(*) as direct_count
        FROM auth_user_permissions up
        WHERE up.user_id = user_id_param
        AND up.is_active = true
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
    ),
    role_perms AS (
        SELECT COUNT(DISTINCT rp.permission_id) as role_count
        FROM auth_user_roles ur
        JOIN auth_role_permissions rp ON ur.role_id = rp.role_id
        WHERE ur.user_id = user_id_param
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ),
    effective_perms AS (
        SELECT COUNT(DISTINCT p.id) as effective_count
        FROM auth_permissions p
        WHERE p.id IN (
            SELECT up.permission_id FROM auth_user_permissions up 
            WHERE up.user_id = user_id_param AND up.is_active = true
            UNION
            SELECT rp.permission_id FROM auth_role_permissions rp
            JOIN auth_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = user_id_param AND ur.is_active = true
        )
    ),
    dept_access AS (
        SELECT ARRAY_AGG(DISTINCT 
            CASE 
                WHEN r.name LIKE 'Store & Dispatch%' THEN 'Store'
                WHEN r.name LIKE 'Production%' THEN 'Production'
                WHEN r.name LIKE 'Quality%' THEN 'Quality'
                WHEN r.name LIKE 'Maintenance%' THEN 'Maintenance'
                WHEN r.name LIKE 'Master Data%' THEN 'Master Data'
                WHEN r.name LIKE 'Reports%' THEN 'Reports'
                ELSE 'Other'
            END
        ) as departments
        FROM auth_permissions p
        JOIN auth_resources r ON p.resource_id = r.id
        WHERE p.id IN (
            SELECT up.permission_id FROM auth_user_permissions up 
            WHERE up.user_id = user_id_param AND up.is_active = true
            UNION
            SELECT rp.permission_id FROM auth_role_permissions rp
            JOIN auth_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = user_id_param AND ur.is_active = true
        )
    ),
    module_access AS (
        SELECT ARRAY_AGG(DISTINCT r.name) as modules
        FROM auth_permissions p
        JOIN auth_resources r ON p.resource_id = r.id
        WHERE p.id IN (
            SELECT up.permission_id FROM auth_user_permissions up 
            WHERE up.user_id = user_id_param AND up.is_active = true
            UNION
            SELECT rp.permission_id FROM auth_role_permissions rp
            JOIN auth_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = user_id_param AND ur.is_active = true
        )
    ),
    last_change AS (
        SELECT MAX(h.created_at) as last_change_date
        FROM auth_user_permission_history h
        WHERE h.user_id = user_id_param
    )
    SELECT 
        dp.direct_count::INTEGER,
        rp.role_count::INTEGER,
        ep.effective_count::INTEGER,
        COALESCE(da.departments, ARRAY[]::TEXT[]),
        COALESCE(ma.modules, ARRAY[]::TEXT[]),
        lc.last_change_date
    FROM direct_perms dp
    CROSS JOIN role_perms rp
    CROSS JOIN effective_perms ep
    CROSS JOIN dept_access da
    CROSS JOIN module_access ma
    CROSS JOIN last_change lc;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk assign permissions from template
CREATE OR REPLACE FUNCTION apply_permission_template_to_user(
    user_id_param UUID,
    template_id_param UUID,
    granted_by_param UUID,
    reason_param TEXT DEFAULT 'Applied from template'
) RETURNS TABLE (
    success BOOLEAN,
    permissions_granted INTEGER,
    message TEXT
) AS $$
DECLARE
    template_permissions JSONB;
    permission_id UUID;
    granted_count INTEGER := 0;
BEGIN
    -- Get template permissions
    SELECT permissions INTO template_permissions
    FROM auth_permission_templates
    WHERE id = template_id_param;
    
    IF template_permissions IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'Template not found';
        RETURN;
    END IF;
    
    -- Check if user is root admin (cannot modify)
    IF EXISTS (SELECT 1 FROM auth_system.auth_users WHERE id = user_id_param AND is_root_admin = true) THEN
        RETURN QUERY SELECT FALSE, 0, 'Cannot modify root admin permissions';
        RETURN;
    END IF;
    
    -- Apply each permission from template
    FOR permission_id IN SELECT jsonb_array_elements_text(template_permissions)::UUID
    LOOP
        -- Insert or update permission
        INSERT INTO auth_user_permissions (user_id, permission_id, granted_by, is_active)
        VALUES (user_id_param, permission_id, granted_by_param, true)
        ON CONFLICT (user_id, permission_id) 
        DO UPDATE SET 
            is_active = true,
            granted_by = granted_by_param,
            granted_at = NOW();
        
        -- Log in history
        INSERT INTO auth_user_permission_history (user_id, permission_id, action, granted_by, reason)
        VALUES (user_id_param, permission_id, 'granted', granted_by_param, reason_param);
        
        granted_count := granted_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT TRUE, granted_count, 'Template applied successfully';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auth_user_permission_history_user_date 
ON auth_user_permission_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_user_permission_history_granted_by 
ON auth_user_permission_history(granted_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_user_permission_history_action 
ON auth_user_permission_history(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_permission_templates_dept_role 
ON auth_permission_templates(department, role_type);

COMMIT;
