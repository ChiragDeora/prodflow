import { NextRequest } from 'next/server';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

const defaultConfig: RateLimitConfig = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 60 * 60 * 1000, // 1 hour
};

export function getClientIdentifier(request: NextRequest): string {
  // Use IP address as primary identifier
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  // Add user agent for additional fingerprinting
  const userAgent = request.headers.get('user-agent') || '';
  return `${ip}-${userAgent.slice(0, 50)}`;
}

export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = defaultConfig
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const clientId = getClientIdentifier(request);
  const now = Date.now();
  
  const entry = rateLimitStore.get(clientId);
  
  // Clean up expired entries
  if (entry && entry.resetTime < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
    rateLimitStore.delete(clientId);
  }
  
  const currentEntry = rateLimitStore.get(clientId);
  
  // Check if client is blocked
  if (currentEntry?.blockedUntil && currentEntry.blockedUntil > now) {
    return {
      allowed: false,
      retryAfter: Math.ceil((currentEntry.blockedUntil - now) / 1000)
    };
  }
  
  // Check if window has expired
  if (!currentEntry || currentEntry.resetTime < now) {
    // Reset the window
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + config.windowMs
    });
    
    return {
      allowed: true,
      remaining: config.maxAttempts - 1
    };
  }
  
  // Check if limit exceeded
  if (currentEntry.count >= config.maxAttempts) {
    // Block the client
    currentEntry.blockedUntil = now + config.blockDurationMs;
    rateLimitStore.set(clientId, currentEntry);
    
    return {
      allowed: false,
      retryAfter: Math.ceil(config.blockDurationMs / 1000)
    };
  }
  
  // Increment counter
  currentEntry.count++;
  rateLimitStore.set(clientId, currentEntry);
  
  return {
    allowed: true,
    remaining: config.maxAttempts - currentEntry.count
  };
}

export function resetRateLimit(request: NextRequest): void {
  const clientId = getClientIdentifier(request);
  rateLimitStore.delete(clientId);
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
