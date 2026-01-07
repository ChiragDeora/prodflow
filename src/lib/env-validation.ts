/**
 * Environment Variable Validation
 * 
 * This module validates that all required environment variables are set
 * before the application starts. Import this in your root layout or
 * API routes to catch configuration errors early.
 */

interface EnvConfig {
  required: string[];
  optional: string[];
}

const envConfig: EnvConfig = {
  required: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CSRF_SECRET',
  ],
  optional: [
    'PRODUCTION_DOMAIN',
    'FACTORY_IP_ADDRESSES',
    'NODE_ENV',
  ]
};

interface ValidationResult {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  warnings: string[];
}

/**
 * Validates that all required environment variables are set.
 * Throws an error if any required variable is missing.
 * 
 * @throws Error if required environment variables are missing
 */
export function validateEnvironment(): ValidationResult {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of envConfig.required) {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    }
  }

  // Check optional variables (only warn)
  for (const varName of envConfig.optional) {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  }

  // Add specific warnings
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.PRODUCTION_DOMAIN) {
      warnings.push('PRODUCTION_DOMAIN is not set. CORS will only allow localhost.');
    }
    
    // Check for weak secrets
    if (process.env.CSRF_SECRET && process.env.CSRF_SECRET.length < 32) {
      warnings.push('CSRF_SECRET should be at least 32 characters for security.');
    }
  }

  const result: ValidationResult = {
    valid: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    warnings
  };

  return result;
}

/**
 * Validates environment and throws if invalid.
 * Call this early in your application startup.
 */
export function assertEnvironment(): void {
  const result = validateEnvironment();
  
  if (!result.valid) {
    const message = `Missing required environment variables:\n${result.missingRequired.map(v => `  - ${v}`).join('\n')}\n\nPlease set these in your .env.local file.`;
    throw new Error(message);
  }

  // Log warnings in development
  if (process.env.NODE_ENV !== 'production' && result.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (result.missingOptional.length > 0 && process.env.NODE_ENV !== 'production') {
    console.info('ℹ️ Optional environment variables not set:', result.missingOptional.join(', '));
  }
}

/**
 * Safely get an environment variable with a fallback.
 * Logs a warning if the variable is not set.
 */
export function getEnv(key: string, fallback: string = ''): string {
  const value = process.env[key];
  if (value === undefined) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Environment variable ${key} is not set, using fallback: "${fallback}"`);
    }
    return fallback;
  }
  return value;
}

/**
 * Get a required environment variable.
 * Throws an error if not set.
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

