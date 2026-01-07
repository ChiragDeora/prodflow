import { NextRequest } from 'next/server';
import { createHash, randomBytes } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET;

if (!CSRF_SECRET) {
  throw new Error('CSRF_SECRET environment variable is required. Set it in your .env file.');
}

export function generateCSRFToken(sessionId: string): string {
  const timestamp = Date.now().toString();
  const random = randomBytes(16).toString('hex');
  const data = `${sessionId}-${timestamp}-${random}`;
  
  const hash = createHash('sha256')
    .update(data + CSRF_SECRET)
    .digest('hex');
    
  return `${data}-${hash}`;
}

export function validateCSRFToken(token: string, sessionId: string): boolean {
  try {
    const parts = token.split('-');
    if (parts.length < 4) return false;
    
    const sessionIdFromToken = parts[0];
    const timestamp = parseInt(parts[1]);
    const random = parts[2];
    const hash = parts.slice(3).join('-');
    
    // Check if session ID matches
    if (sessionIdFromToken !== sessionId) return false;
    
    // Check if token is not too old (1 hour)
    const now = Date.now();
    if (now - timestamp > 60 * 60 * 1000) return false;
    
    // Verify hash
    const data = `${sessionId}-${timestamp}-${random}`;
    const expectedHash = createHash('sha256')
      .update(data + CSRF_SECRET)
      .digest('hex');
      
    return hash === expectedHash;
  } catch (error) {
    return false;
  }
}

export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  // Check header first
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) return headerToken;
  
  // Check form data
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    // For form data, we'd need to parse the body
    // This is a simplified version
    return null;
  }
  
  return null;
}

export function requireCSRF(request: NextRequest, sessionId: string): boolean {
  const token = getCSRFTokenFromRequest(request);
  if (!token) return false;
  
  return validateCSRFToken(token, sessionId);
}
