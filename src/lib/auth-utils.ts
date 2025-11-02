import { NextRequest } from 'next/server';
import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  status: string;
  isRootAdmin: boolean;
  requiresPasswordReset?: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface SessionData {
  user: AuthUser;
  sessionToken: string;
  expiresAt: string;
  lastActivity: string;
}

/**
 * Get session token from request
 */
export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get('session_token')?.value ||
         request.headers.get('authorization')?.replace('Bearer ', '') ||
         null;
}

/**
 * Verify and get user from session token
 */
export async function verifySession(request: NextRequest): Promise<SessionData | null> {
  try {
    const sessionToken = getSessionToken(request);
    
    if (!sessionToken) {
      return null;
    }

    // Set session context for RLS policies
    await supabase.rpc('set_session_context', { token: sessionToken });

    // Get user from session
    const { data: session, error: sessionError } = await supabase
      .from('auth_sessions')
      .select(`
        user_id,
        session_token,
        expires_at,
        last_activity
      `)
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      return null;
    }

    // Get user details separately
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select(`
        id,
        username,
        email,
        full_name,
        phone,
        status,
        is_root_admin,
        password_reset_required,
        temporary_password,
        last_login,
        created_at
      `)
      .eq('id', session.user_id)
      .single();

    if (userError || !user) {
      return null;
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Deactivate expired session
      await supabase
        .from('auth_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken);
      
      return null;
    }

    // Check if user is still active
    if (user.status !== 'active') {
      return null;
    }

    // Update session activity
    await supabase
      .from('auth_sessions')
      .update({
        last_activity: new Date().toISOString()
      })
      .eq('session_token', sessionToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        status: user.status,
        isRootAdmin: user.is_root_admin,
        requiresPasswordReset: user.password_reset_required || 
                              (user.temporary_password && user.temporary_password.length > 0),
        lastLogin: user.last_login,
        createdAt: user.created_at
      },
      sessionToken: session.session_token,
      expiresAt: session.expires_at,
      lastActivity: session.last_activity
    };

  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Verify that the user is root admin
 */
export async function verifyRootAdmin(request: NextRequest): Promise<AuthUser | null> {
  const sessionData = await verifySession(request);
  
  if (!sessionData || !sessionData.user.isRootAdmin) {
    return null;
  }
  
  return sessionData.user;
}

/**
 * Check if user has specific permission
 */
export async function checkUserPermission(
  userId: string,
  action: string,
  resourceName: string,
  fieldName?: string,
  recordConditions?: any
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('check_user_permission', {
        p_user_id: userId,
        p_action: action,
        p_resource_name: resourceName,
        p_field_name: fieldName || null,
        p_record_conditions: recordConditions || null
      });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Log audit action
 */
export async function logAuditAction(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: any,
  outcome: 'success' | 'failure' | 'error' = 'success',
  request?: NextRequest
): Promise<void> {
  try {
    await supabase
      .rpc('log_audit_action', {
        p_user_id: userId,
        p_action: action,
        p_resource_type: resourceType || null,
        p_resource_id: resourceId || null,
        p_details: details || null,
        p_outcome: outcome,
        p_ip_address: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null,
        p_user_agent: request?.headers.get('user-agent') || null
      });
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't throw - audit logging should not break main functionality
  }
}

/**
 * Middleware helper to protect routes
 */
export async function requireAuth(request: NextRequest): Promise<AuthUser | Response> {
  const sessionData = await verifySession(request);
  
  if (!sessionData) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return sessionData.user;
}

/**
 * Middleware helper to protect admin routes
 */
export async function requireRootAdmin(request: NextRequest): Promise<AuthUser | Response> {
  const user = await verifyRootAdmin(request);
  
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Root admin access required' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return user;
}

/**
 * Get user roles
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('auth_user_roles')
      .select(`
        auth_roles (
          name
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Get user roles error:', error);
      return [];
    }

    return data?.map(role => role.auth_roles[0]?.name).filter(Boolean) || [];
  } catch (error) {
    console.error('Get user roles error:', error);
    return [];
  }
}

/**
 * Hash password utility
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcrypt');
  return await bcrypt.hash(password, 12);
}

/**
 * Verify password utility
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = require('bcrypt');
  return await bcrypt.compare(password, hash);
}
