import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIP, verifyAccessScope, AccessScope } from '@/lib/auth-utils';

const getSupabase = () => createClient();

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    // Check rate limit
    const rateLimitResult = checkRateLimit(request, {
      maxAttempts: 5, // 5 attempts per IP
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 60 * 60 * 1000, // 1 hour block
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts',
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600'
          }
        }
      );
    }
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Block invalid/default usernames that shouldn't be allowed
    const invalidUsernames = [
      'current_user',
      'current user',
      'Current User',
      'CURRENT_USER',
      'user',
      'User',
      'USER',
      'admin',
      'Admin',
      'ADMIN',
      'test',
      'Test',
      'TEST',
      'demo',
      'Demo',
      'DEMO'
    ];
    
    const normalizedUsername = username.trim().toLowerCase();
    if (invalidUsernames.some(invalid => invalid.toLowerCase() === normalizedUsername)) {
      return NextResponse.json(
        { error: 'Invalid username. This username is not allowed.' },
        { status: 403 }
      );
    }

    // Get user by username
    const { data: user, error: userError } = await supabase
      .from('auth_users')
      .select('*')
      .eq('username', username)
      .single();

    if (userError) {
      console.error('Database error fetching user:', userError);
      // Check if it's a table doesn't exist error
      if (userError.code === '42P01' || userError.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Database configuration error. Please contact administrator.' },
          { status: 500 }
        );
      }
    }

    if (userError || !user) {
      // Fire and forget - don't block response
      supabase.from('auth_audit_logs').insert({
        action: 'login_failed',
        resource_type: 'auth_users',
        details: { username, reason: 'user_not_found' },
        outcome: 'failure',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null
      }).then(({ error }) => {
        if (error) console.warn('Audit log failed:', error);
      });

      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      return NextResponse.json(
        { error: 'Account is temporarily locked. Please try again later.' },
        { status: 423 }
      );
    }

    // Check account status
    if (user.status === 'pending') {
      return NextResponse.json(
        { error: 'Account is pending approval by administrator' },
        { status: 403 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      const updates: any = {
        failed_login_attempts: newFailedAttempts,
        updated_at: new Date().toISOString()
      };

      // Lock account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        updates.account_locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      }

      await supabase
        .from('auth_users')
        .update(updates)
        .eq('id', user.id);

      // Fire and forget - don't block response
      supabase.from('auth_audit_logs').insert({
        user_id: user.id,
        action: 'login_failed',
        resource_type: 'auth_users',
        resource_id: user.id,
        details: { username, reason: 'invalid_password', failed_attempts: newFailedAttempts },
        outcome: 'failure',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        user_agent: request.headers.get('user-agent') || null
      }).then(({ error }) => {
        if (error) console.warn('Audit log failed:', error);
      });

      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check network access scope restriction
    const clientIP = getClientIP(request);
    console.log(`[Login] Checking network access for user ${username} (IP: ${clientIP || 'unknown'}, Access Scope: ${user.access_scope || 'FACTORY_ONLY'})`);
    const accessCheck = verifyAccessScope(
      user.is_root_admin,
      user.access_scope as AccessScope,
      clientIP
    );

    if (!accessCheck.allowed) {
      console.log(`[Login] Network access denied for user ${username}: ${accessCheck.reason}`);
      // Fire and forget - don't block response
      supabase.from('auth_audit_logs').insert({
        user_id: user.id,
        action: 'login_restricted_network',
        resource_type: 'auth_users',
        resource_id: user.id,
        details: { 
          username, 
          reason: 'network_restriction',
          access_scope: user.access_scope,
          client_ip: clientIP,
          message: accessCheck.reason
        },
        outcome: 'failure',
        ip_address: clientIP,
        user_agent: request.headers.get('user-agent') || null
      }).then(({ error }) => {
        if (error) console.warn('Audit log failed:', error);
      });

      return NextResponse.json(
        { error: accessCheck.reason || 'Network access restricted' },
        { status: 403 }
      );
    }

    // Generate cryptographically secure session token
    const sessionToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const now = new Date().toISOString();
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    // Run session creation and user update in parallel for speed
    const [sessionResult, _] = await Promise.all([
      // Create session
      supabase
        .from('auth_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: now,
          last_activity: now
        })
        .select()
        .single(),
      // Reset failed login attempts and update last login
      supabase
        .from('auth_users')
        .update({
          failed_login_attempts: 0,
          account_locked_until: null,
          last_login: now,
          updated_at: now
        })
        .eq('id', user.id)
    ]);

    if (sessionResult.error) {
      console.error('Session creation error:', sessionResult.error);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Fetch permissions - root admin gets all, others get direct permissions
    let permissions: Record<string, boolean> = {};
    try {
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
    } catch (permError) {
      console.warn('Could not fetch permissions during login:', permError);
      // Continue without permissions - client will fetch separately
    }

    // Fire and forget audit log - don't block response
    supabase.from('auth_audit_logs').insert({
      user_id: user.id,
      action: 'login_success',
      resource_type: 'auth_users',
      resource_id: user.id,
      details: { username },
      outcome: 'success',
      ip_address: ipAddress,
      user_agent: userAgent,
      is_super_admin_override: user.is_root_admin || false
    }).then(({ error }) => {
      if (error) console.warn('Audit log failed:', error);
    });

    // Check if password reset is required
    const requiresPasswordReset = user.password_reset_required || 
      (user.temporary_password && user.temporary_password.length > 0);

    // Create response with permissions included
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        status: user.status,
        isRootAdmin: user.is_root_admin,
        requiresPasswordReset,
        permissions // Include permissions in response to avoid extra fetch
      },
      session: {
        token: sessionToken,
        expiresAt: expiresAt.toISOString()
      }
    });

    // Set session cookie with proper settings for persistence
    // Use 'lax' instead of 'strict' for better compatibility while still being secure
    // This allows the cookie to be sent on top-level navigations (like page refresh)
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true, // Prevents JavaScript access for security
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // Allows cookie on top-level navigations (like refresh)
      expires: expiresAt, // 30 days expiration
      path: '/', // Available site-wide
      maxAge: 30 * 24 * 60 * 60 // 30 days in seconds (backup to expires)
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
