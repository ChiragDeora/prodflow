import { NextRequest, NextResponse } from 'next/server';
import { getClientIP, isFactoryIP, verifyAccessScope, getFactoryIPs } from '@/lib/auth-utils';

/**
 * Development endpoint to test IP detection and factory network access
 * 
 * Usage:
 * - GET /api/dev/test-ip - Shows current detected IP and access status
 * - GET /api/dev/test-ip?simulate=203.0.113.50 - Simulates a specific IP
 * 
 * Or use header:
 * - curl -H "x-test-client-ip: 203.0.113.50" http://localhost:3000/api/dev/test-ip
 */
export async function GET(request: NextRequest) {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  // Allow simulating IP via query parameter
  const url = new URL(request.url);
  const simulateIP = url.searchParams.get('simulate');
  
  // If simulate parameter is provided, add it as a header for the test
  let testRequest = request;
  if (simulateIP) {
    // Create a modified headers object with the test IP
    const headers = new Headers(request.headers);
    headers.set('x-test-client-ip', simulateIP);
    testRequest = new NextRequest(request.url, {
      headers: headers,
      method: request.method,
    });
  }

  const detectedIP = getClientIP(testRequest);
  const isFactory = isFactoryIP(detectedIP);
  const configuredFactoryIPs = getFactoryIPs();
  
  // Test both access scopes
  const factoryOnlyAccess = verifyAccessScope(false, 'FACTORY_ONLY', detectedIP);
  const universalAccess = verifyAccessScope(false, 'UNIVERSAL', detectedIP);
  const rootAdminAccess = verifyAccessScope(true, 'FACTORY_ONLY', detectedIP); // Root admin always passes

  return NextResponse.json({
    development_mode: true,
    request_info: {
      detected_ip: detectedIP,
      simulated_ip: simulateIP || null,
      host: request.headers.get('host'),
      x_forwarded_for: request.headers.get('x-forwarded-for'),
      x_real_ip: request.headers.get('x-real-ip'),
      x_test_client_ip: request.headers.get('x-test-client-ip'),
    },
    ip_analysis: {
      is_factory_ip: isFactory,
      is_localhost: ['localhost', '127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(detectedIP?.toLowerCase() || ''),
      is_private_ip: detectedIP ? /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(detectedIP) : false,
    },
    configured_factory_ips: configuredFactoryIPs,
    access_scope_tests: {
      'FACTORY_ONLY (non-admin)': {
        allowed: factoryOnlyAccess.allowed,
        reason: factoryOnlyAccess.reason || 'Access granted'
      },
      'UNIVERSAL (non-admin)': {
        allowed: universalAccess.allowed,
        reason: universalAccess.reason || 'Access granted'
      },
      'Root Admin (any scope)': {
        allowed: rootAdminAccess.allowed,
        reason: rootAdminAccess.reason || 'Access granted - Root admin always has access'
      }
    },
    test_instructions: {
      simulate_external_ip: 'Add ?simulate=203.0.113.50 to test with a public IP',
      simulate_private_ip: 'Add ?simulate=192.168.1.100 to test with a private IP',
      simulate_factory_ip: 'Add ?simulate=103.243.184.31 to test with configured factory IP',
      using_header: 'Or use header: curl -H "x-test-client-ip: <IP>" http://localhost:3000/api/dev/test-ip'
    }
  });
}

