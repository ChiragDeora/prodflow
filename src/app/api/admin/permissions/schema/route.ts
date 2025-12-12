import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyRootAdmin } from '@/lib/auth-utils';

/**
 * Permission Schema API
 * 
 * Returns a structured schema of modules → resources → actions
 * This is the single source of truth for the permission UI
 * 
 * Response format:
 * {
 *   schema: [
 *     {
 *       module: "masterData",
 *       moduleLabel: "Master Data",
 *       sortOrder: 1,
 *       resources: [
 *         {
 *           resourceKey: "machineMaster",
 *           resourceId: "uuid",
 *           label: "Machine Master",
 *           description: "Production machines management",
 *           sortOrder: 1,
 *           actions: [
 *             { permissionId: "uuid", action: "view", name: "masterData.machineMaster.read" },
 *             { permissionId: "uuid", action: "create", name: "masterData.machineMaster.create" },
 *             ...
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

interface ActionSchema {
  permissionId: string;
  action: string;
  name: string;
}

interface ResourceSchema {
  resourceKey: string;
  resourceId: string;
  label: string;
  description: string;
  sortOrder: number;
  actions: ActionSchema[];
}

interface ModuleSchema {
  module: string;
  moduleLabel: string;
  sortOrder: number;
  resources: ResourceSchema[];
}

// Define module sort order
const MODULE_SORT_ORDER: Record<string, number> = {
  'masterData': 1,
  'storePurchase': 2,
  'storeInward': 3,
  'storeOutward': 4,
  'storeSales': 5,
  'productionPlanner': 6,
  'production': 7,
  'quality': 8,
  'maintenance': 9
};

export async function GET(request: NextRequest) {
  try {
    const adminUser = await verifyRootAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Only root admin can access permission schema' },
        { status: 403 }
      );
    }

    // Fetch all active resources with their module info
    const { data: resources, error: resourceError } = await supabase
      .from('auth_resources')
      .select('id, key, name, module, module_label, section, description, sort_order, is_active')
      .eq('is_active', true)
      .not('key', 'is', null)
      .not('module', 'is', null)
      .order('sort_order', { ascending: true });

    if (resourceError) {
      console.error('Error fetching resources:', resourceError);
      return NextResponse.json(
        { error: 'Failed to fetch resources' },
        { status: 500 }
      );
    }

    // Fetch all permissions
    const { data: permissions, error: permissionError } = await supabase
      .from('auth_permissions')
      .select('id, name, description, action, resource_id')
      .order('name');

    if (permissionError) {
      console.error('Error fetching permissions:', permissionError);
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      );
    }

    // Build a map of resource_id -> permissions
    const permissionsByResource: Record<string, typeof permissions> = {};
    if (permissions) {
      permissions.forEach(perm => {
        if (perm.resource_id) {
          if (!permissionsByResource[perm.resource_id]) {
            permissionsByResource[perm.resource_id] = [];
          }
          permissionsByResource[perm.resource_id].push(perm);
        }
      });
    }

    // Group resources by module
    const moduleMap: Record<string, ModuleSchema> = {};

    if (resources) {
      resources.forEach(resource => {
        const moduleKey = resource.module;
        const moduleLabel = resource.module_label || moduleKey;

        // Initialize module if not exists
        if (!moduleMap[moduleKey]) {
          moduleMap[moduleKey] = {
            module: moduleKey,
            moduleLabel: moduleLabel,
            sortOrder: MODULE_SORT_ORDER[moduleKey] || 99,
            resources: []
          };
        }

        // Get permissions for this resource
        const resourcePermissions = permissionsByResource[resource.id] || [];
        
        // Map actions - convert 'read' to 'view' for UI consistency
        const actions: ActionSchema[] = resourcePermissions.map(perm => ({
          permissionId: perm.id,
          action: perm.action === 'read' ? 'view' : perm.action,
          name: perm.name
        }));

        // Sort actions in a specific order
        const actionOrder = ['approve', 'update', 'create', 'delete', 'view'];
        actions.sort((a, b) => {
          const aIndex = actionOrder.indexOf(a.action);
          const bIndex = actionOrder.indexOf(b.action);
          return aIndex - bIndex;
        });

        // Add resource to module
        moduleMap[moduleKey].resources.push({
          resourceKey: resource.key,
          resourceId: resource.id,
          label: resource.section || resource.name,
          description: resource.description || '',
          sortOrder: resource.sort_order || 0,
          actions
        });
      });
    }

    // Convert to array and sort
    const schema: ModuleSchema[] = Object.values(moduleMap)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // Sort resources within each module by sortOrder
    schema.forEach(module => {
      module.resources.sort((a, b) => a.sortOrder - b.sortOrder);
    });

    // Log admin action
    await supabase.from('auth_audit_logs').insert({
      user_id: adminUser.id,
      action: 'view_permission_schema',
      resource_type: 'auth_permissions',
      details: { 
        modules_count: schema.length,
        total_resources: schema.reduce((sum, m) => sum + m.resources.length, 0)
      },
      outcome: 'success',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      is_super_admin_override: true
    });

    return NextResponse.json({
      schema,
      metadata: {
        totalModules: schema.length,
        totalResources: schema.reduce((sum, m) => sum + m.resources.length, 0),
        totalPermissions: permissions?.length || 0
      }
    });

  } catch (error) {
    console.error('Permission schema API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




