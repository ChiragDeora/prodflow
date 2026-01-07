import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Authentication result from verifyAuth
 */
export interface AuthResult {
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    isRootAdmin: boolean;
    permissions: Record<string, boolean>;
  } | null;
  error?: string;
}

/**
 * Verifies that the request has a valid session.
 * Use this at the start of any API route that requires authentication.
 * 
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const auth = await verifyAuth(request);
 *   if (!auth.authenticated) {
 *     return NextResponse.json({ error: auth.error }, { status: 401 });
 *   }
 *   // Continue with authenticated user
 *   const userId = auth.user!.id;
 * }
 * ```
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const sessionToken = request.cookies.get('session_token')?.value;
    
    if (!sessionToken) {
      return {
        authenticated: false,
        user: null,
        error: 'No session token provided'
      };
    }

    const supabase = createClient();
    
    // Verify session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select('user_id, expires_at, is_active')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      return {
        authenticated: false,
        user: null,
        error: 'Invalid or expired session'
      };
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      // Deactivate the expired session
      await supabase
        .from('auth_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken);
      
      return {
        authenticated: false,
        user: null,
        error: 'Session expired'
      };
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('id, username, email, full_name, is_root_admin, status')
      .eq('id', session.user_id)
      .eq('status', 'active')
      .single();

    if (userError || !user) {
      return {
        authenticated: false,
        user: null,
        error: 'User not found or inactive'
      };
    }

    // Get user permissions
    let permissions: Record<string, boolean> = {};
    
    if (user.is_root_admin) {
      // Root admin gets all permissions
      const { data: allPerms } = await supabase
        .from('auth_permissions')
        .select('name');
      allPerms?.forEach((p: { name: string }) => {
        permissions[p.name] = true;
      });
    } else {
      // Get user's direct permissions
      const { data: userPerms } = await supabase
        .from('auth_user_permissions')
        .select('permission_id')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (userPerms && userPerms.length > 0) {
        const permIds = userPerms.map(p => p.permission_id);
        const { data: permNames } = await supabase
          .from('auth_permissions')
          .select('name')
          .in('id', permIds);
        permNames?.forEach((p: { name: string }) => {
          permissions[p.name] = true;
        });
      }
    }

    // Update last activity
    supabase
      .from('auth_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', sessionToken)
      .then(() => {}); // Fire and forget

    return {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        isRootAdmin: user.is_root_admin,
        permissions
      }
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return {
      authenticated: false,
      user: null,
      error: 'Authentication failed'
    };
  }
}

/**
 * Checks if the authenticated user has a specific permission.
 * 
 * @example
 * ```ts
 * const auth = await verifyAuth(request);
 * if (!auth.authenticated) return unauthorized();
 * if (!hasPermission(auth, 'admin.users.create')) return forbidden();
 * ```
 */
export function hasPermission(auth: AuthResult, permission: string): boolean {
  if (!auth.authenticated || !auth.user) return false;
  if (auth.user.isRootAdmin) return true;
  return auth.user.permissions[permission] === true;
}

/**
 * Creates an unauthorized response (401)
 */
export function unauthorized(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Creates a forbidden response (403)
 */
export function forbidden(message: string = 'Permission denied'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Safely parses JSON from request body with error handling
 * 
 * @example
 * ```ts
 * const body = await safeParseJSON(request);
 * if (body.error) return NextResponse.json({ error: body.error }, { status: 400 });
 * const data = body.data;
 * ```
 */
export async function safeParseJSON<T = any>(request: NextRequest): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await request.json();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: 'Invalid JSON in request body' };
  }
}

/**
 * Wrapper for API route handlers that require authentication.
 * Automatically handles auth verification and JSON parsing errors.
 * 
 * @example
 * ```ts
 * export const POST = withAuth(async (request, auth) => {
 *   // auth.user is guaranteed to exist here
 *   const body = await safeParseJSON(request);
 *   // ... your logic
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withAuth(
  handler: (request: NextRequest, auth: AuthResult) => Promise<NextResponse>,
  options?: {
    requiredPermission?: string;
  }
) {
  return async (request: NextRequest) => {
    const auth = await verifyAuth(request);
    
    if (!auth.authenticated) {
      return unauthorized(auth.error);
    }
    
    if (options?.requiredPermission && !hasPermission(auth, options.requiredPermission)) {
      return forbidden(`Missing required permission: ${options.requiredPermission}`);
    }
    
    return handler(request, auth);
  };
}

