import { NextRequest } from 'next/server';
import { createClient } from './supabase/server';

// Access Scope Types
export type AccessScope = 'FACTORY_ONLY' | 'UNIVERSAL';

// Factory IPs - configurable via environment variable
// Format: comma-separated list of IPs or CIDR ranges (e.g., "103.243.184.31,192.168.0.0/16,10.0.0.0/8")
// Also supports common private IP ranges: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
// Includes both IPv4 and IPv6 for factory network (some computers connected via LAN)
export function getFactoryIPs(): string[] {
  const defaultFactoryIPs = [
    '103.243.184.31',           // Factory IPv4 (main internet connection)
    '2001:4860:7:505::ca',      // Factory IPv6 (for LAN-connected computers)
    '192.168.0.0/16',           // Private network range (local LAN)
    '10.0.0.0/8',               // Private network range
    '172.16.0.0/12'             // Private network range
  ].join(',');
  
  const factoryIPs = process.env.FACTORY_ALLOWED_IPS || defaultFactoryIPs;
  return factoryIPs.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
}

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
  accessScope?: AccessScope;
}

export interface SessionData {
  user: AuthUser;
  sessionToken: string;
  expiresAt: string;
  lastActivity: string;
}

// Lazy Supabase client getter for auth utilities
const getSupabase = () => createClient();

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
    const supabase = getSupabase();
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
        created_at,
        access_scope
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

    // Check network access scope
    const clientIP = getClientIP(request);
    console.log(`[Session Verification] Checking network access for user ${user.email} (IP: ${clientIP || 'unknown'}, Access Scope: ${user.access_scope || 'FACTORY_ONLY'})`);
    const accessCheck = verifyAccessScope(
      user.is_root_admin,
      user.access_scope as AccessScope,
      clientIP
    );
    
    if (!accessCheck.allowed) {
      // Network access denied - invalidate session access
      console.log(`[Session Verification] Network access denied for user ${user.email}: ${accessCheck.reason}`);
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
        createdAt: user.created_at,
        accessScope: user.is_root_admin ? 'UNIVERSAL' : (user.access_scope as AccessScope || 'FACTORY_ONLY')
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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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
    const supabase = getSupabase();
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

/**
 * Get client IP from request
 * 
 * For testing in development, you can use the 'x-test-client-ip' header to simulate different IPs.
 * Example: curl -H "x-test-client-ip: 203.0.113.50" http://localhost:3000/api/auth/login
 * 
 * Test IPs to try:
 * - "192.168.1.100" - Private IP (should be allowed as factory network)
 * - "10.0.0.50" - Private IP (should be allowed as factory network)
 * - "203.0.113.50" - Public IP (should be blocked for FACTORY_ONLY users)
 * - "103.243.184.31" - Configured factory IP (should be allowed)
 */
export function getClientIP(request: NextRequest): string | null {
  // In development, allow testing with custom IP header
  if (process.env.NODE_ENV === 'development') {
    const testIP = request.headers.get('x-test-client-ip');
    if (testIP) {
      console.log(`[getClientIP] 🧪 TEST MODE: Using simulated IP from x-test-client-ip header: ${testIP}`);
      return testIP.trim();
    }
  }
  
  // Check various headers for the real IP (in order of priority)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for may contain multiple IPs, get the first one (original client)
    const ip = xForwardedFor.split(',')[0].trim();
    console.log(`[getClientIP] Found x-forwarded-for: ${ip}`);
    return ip;
  }
  
  const xRealIP = request.headers.get('x-real-ip');
  if (xRealIP) {
    console.log(`[getClientIP] Found x-real-ip: ${xRealIP}`);
    return xRealIP.trim();
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    console.log(`[getClientIP] Found cf-connecting-ip: ${cfConnectingIP}`);
    return cfConnectingIP.trim();
  }
  
  // Try to get IP from request URL/connection info
  // In Next.js, we can check the host header
  const host = request.headers.get('host');
  console.log(`[getClientIP] No IP headers found. Host: ${host}`);
  
  // For local development, return localhost indicator
  if (host?.includes('localhost') || host?.includes('127.0.0.1')) {
    console.log(`[getClientIP] Local development detected via host header`);
    return 'localhost';
  }
  
  return null;
}

/**
 * Check if an IP address is IPv6
 */
function isIPv6(ip: string): boolean {
  return ip.includes(':');
}

/**
 * Normalize IPv6 address for comparison (expand shorthand notation)
 */
function normalizeIPv6(ip: string): string {
  // Remove leading zeros and expand :: notation
  const normalized = ip.toLowerCase();
  return normalized;
}

/**
 * Convert IPv4 address to number for range comparison
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Check if IP is in CIDR range (IPv4 only)
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  // Skip IPv6 addresses for CIDR check (not supported yet)
  if (isIPv6(ip) || isIPv6(cidr.split('/')[0])) {
    return false;
  }
  
  const [network, prefixLength] = cidr.split('/');
  const prefix = parseInt(prefixLength, 10);
  const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(network);
  return (ipNum & mask) === (networkNum & mask);
}

/**
 * Check if IP is a private/local network IP (common factory networks)
 * Supports both IPv4 and IPv6
 */
function isPrivateIP(ip: string): boolean {
  // Handle IPv6 private/local addresses
  if (isIPv6(ip)) {
    const normalizedIP = ip.toLowerCase();
    // fe80:: - Link-local addresses
    if (normalizedIP.startsWith('fe80:')) return true;
    // fc00:: or fd00:: - Unique local addresses (ULA)
    if (normalizedIP.startsWith('fc') || normalizedIP.startsWith('fd')) return true;
    // ::1 - Loopback
    if (normalizedIP === '::1') return true;
    return false;
  }
  
  // Handle IPv4 private addresses
  const parts = ip.split('.').map(Number);
  
  // 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }
  
  // 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
  if (parts[0] === 10) {
    return true;
  }
  
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  
  return false;
}

/**
 * Check if IP is localhost (for development)
 */
function isLocalhost(ip: string): boolean {
  const localhostIPs = ['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1'];
  return localhostIPs.includes(ip.toLowerCase());
}

/**
 * Check if IP matches any of the allowed factory IPs
 * Supports exact IPs (IPv4 and IPv6), CIDR ranges, and automatically allows private IPs
 */
export function isFactoryIP(clientIP: string | null): boolean {
  if (!clientIP) {
    console.log('[Factory Network Check] No client IP detected');
    return false;
  }
  
  // Normalize the client IP for comparison
  const normalizedClientIP = clientIP.toLowerCase().trim();
  
  // Allow localhost for development
  if (isLocalhost(normalizedClientIP)) {
    console.log(`[Factory Network Check] Client IP ${clientIP} is localhost - allowing access for development`);
    return true;
  }
  
  // Automatically allow private IPs (common in factory networks)
  if (isPrivateIP(normalizedClientIP)) {
    console.log(`[Factory Network Check] Client IP ${clientIP} is a private IP - allowing access`);
    return true;
  }
  
  const factoryIPs = getFactoryIPs();
  
  // Check exact matches and CIDR ranges
  for (const factoryIP of factoryIPs) {
    const normalizedFactoryIP = factoryIP.toLowerCase().trim();
    
    // Check exact match (handles both IPv4 and IPv6)
    if (normalizedFactoryIP === normalizedClientIP) {
      console.log(`[Factory Network Check] Client IP ${clientIP} matches exact factory IP ${factoryIP}`);
      return true;
    }
    
    // For IPv6, also check if the client IP contains the factory IP prefix
    // This handles cases where IPv6 addresses might have different notations
    if (isIPv6(normalizedClientIP) && isIPv6(normalizedFactoryIP)) {
      // Remove :: shorthand for comparison (simple prefix match)
      const clientPrefix = normalizedClientIP.replace(/::/g, ':').split(':').slice(0, 4).join(':');
      const factoryPrefix = normalizedFactoryIP.replace(/::/g, ':').split(':').slice(0, 4).join(':');
      if (clientPrefix === factoryPrefix) {
        console.log(`[Factory Network Check] Client IPv6 ${clientIP} matches factory IPv6 prefix ${factoryIP}`);
        return true;
      }
    }
    
    // Check CIDR range (IPv4 only)
    if (normalizedFactoryIP.includes('/') && !isIPv6(normalizedClientIP)) {
      try {
        if (isIPInCIDR(normalizedClientIP, normalizedFactoryIP)) {
          console.log(`[Factory Network Check] Client IP ${clientIP} is within CIDR range ${factoryIP}`);
          return true;
        }
      } catch (error) {
        console.warn(`[Factory Network Check] Invalid CIDR format: ${factoryIP}`, error);
      }
    }
  }
  
  console.log(`[Factory Network Check] Client IP ${clientIP} does not match any factory IPs. Configured IPs: ${factoryIPs.join(', ')}`);
  return false;
}

/**
 * Verify access scope for a user based on their access_scope setting and client IP
 * Root admin always passes (UNIVERSAL access)
 * @returns { allowed: boolean, reason?: string }
 */
export function verifyAccessScope(
  isRootAdmin: boolean,
  accessScope: AccessScope | undefined | null,
  clientIP: string | null
): { allowed: boolean; reason?: string } {
  // Root admin always has universal access
  if (isRootAdmin) {
    return { allowed: true };
  }
  
  // Default to FACTORY_ONLY if not set
  const scope = accessScope || 'FACTORY_ONLY';
  
  // UNIVERSAL access - allow from any IP
  if (scope === 'UNIVERSAL') {
    return { allowed: true };
  }
  
  // FACTORY_ONLY - must be from factory IP
  if (scope === 'FACTORY_ONLY') {
    console.log(`[Access Scope Check] Checking FACTORY_ONLY access for IP: ${clientIP || 'unknown'}`);
    if (isFactoryIP(clientIP)) {
      console.log(`[Access Scope Check] Factory network access granted for IP: ${clientIP}`);
      return { allowed: true };
    }
    
    const reason = `Access denied. Your account is restricted to factory network only. Detected IP: ${clientIP || 'unknown'}. Please connect to the factory network (dppl) to access ProdFlow.`;
    console.log(`[Access Scope Check] ${reason}`);
    return {
      allowed: false,
      reason
    };
  }
  
  // Unknown scope - deny by default
  return {
    allowed: false,
    reason: 'Invalid access scope configuration. Please contact administrator.'
  };
}

/**
 * Check if user can access the system based on access scope
 * This function fetches user data and validates against the request IP
 */
export async function checkUserNetworkAccess(
  userId: string,
  request: NextRequest
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const supabase = getSupabase();
    // Get user with access_scope
    const { data: user, error } = await supabase
      .from('auth_users')
      .select('id, is_root_admin, access_scope')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      return { allowed: false, reason: 'User not found' };
    }
    
    const clientIP = getClientIP(request);
    
    return verifyAccessScope(
      user.is_root_admin,
      user.access_scope as AccessScope,
      clientIP
    );
  } catch (error) {
    console.error('Network access check error:', error);
    return { allowed: false, reason: 'Error checking network access' };
  }
}
