import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './auth-utils';
import { checkRateLimit } from './rate-limit';
import { requireCSRF } from './csrf';

export interface SecurityConfig {
  requireAuth?: boolean;
  requireCSRF?: boolean;
  rateLimit?: {
    maxAttempts: number;
    windowMs: number;
    blockDurationMs: number;
  };
  allowedMethods?: string[];
}

export async function secureEndpoint(
  request: NextRequest,
  config: SecurityConfig = {}
): Promise<{ sessionData?: any; error?: NextResponse }> {
  const {
    requireAuth = true,
    requireCSRF: shouldRequireCSRF = false,
    rateLimit,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE']
  } = config;

  // Check HTTP method
  if (!allowedMethods.includes(request.method)) {
    return {
      error: NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      )
    };
  }

  // Check rate limiting
  if (rateLimit) {
    const rateLimitResult = checkRateLimit(request, rateLimit);
    if (!rateLimitResult.allowed) {
      return {
        error: NextResponse.json(
          { 
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
            retryAfter: rateLimitResult.retryAfter
          },
          { 
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter?.toString() || '3600'
            }
          }
        )
      };
    }
  }

  // Check authentication
  if (requireAuth) {
    const sessionData = await verifySession(request);
    if (!sessionData) {
      return {
        error: NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      };
    }

    // Check CSRF protection
    if (shouldRequireCSRF) {
      const csrfValid = requireCSRF(request, sessionData.user.id);
      if (!csrfValid) {
        return {
          error: NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          )
        };
      }
    }

    return { sessionData };
  }

  return {};
}

export function sanitizeError(error: any): string {
  // Don't expose internal error details
  if (process.env.NODE_ENV === 'production') {
    return 'An internal error occurred';
  }
  
  return error?.message || 'Unknown error';
}

export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export function validateRequestSize(request: NextRequest, maxSize: number = 1024 * 1024): boolean {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSize) {
    return false;
  }
  return true;
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || 'unknown';
}

export function logSecurityEvent(
  event: string,
  details: any,
  request: NextRequest,
  userId?: string
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    userId,
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent'),
    url: request.url,
    method: request.method,
    details
  };
  
  console.log(`[SECURITY] ${event}:`, logData);
  
  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to logging service (e.g., Winston, Pino, etc.)
  }
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getEnvironmentVariable(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
}

export function validateEnvironmentVariables(): void {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'CSRF_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}
