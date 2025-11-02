# Production Deployment Guide

Complete guide for deploying the Production Scheduler ERP with authentication to production.

## 🚀 Pre-Deployment Checklist

### Environment Setup
- [ ] Production Supabase project created
- [ ] Domain configured with SSL certificate
- [ ] Environment variables configured for production
- [ ] Database migrations tested in staging

### Security Verification
- [ ] All authentication flows tested
- [ ] RLS policies verified
- [ ] Edge functions working correctly
- [ ] Rate limiting configured
- [ ] Email delivery tested

## 🔧 Production Configuration

### 1. Supabase Production Settings

#### Authentication Configuration:
```
Site URL: https://your-production-domain.com
Redirect URLs: 
  - https://your-production-domain.com/auth/callback
  - https://your-production-domain.com/auth/reset-password

JWT Settings:
  - JWT Expiry: 3600 seconds (1 hour)
  - Refresh Token Expiry: 604800 seconds (7 days)
  - JWT Secret: (auto-generated - keep secure)

Email Settings:
  - SMTP Provider: Configure reliable email service
  - Confirm Email: Enabled
  - Secure Email Change: Enabled
```

#### API Settings:
```
API URL: https://your-project.supabase.co
Anon Key: (production anon key)
Service Role Key: (production service role - keep secure)
```

### 2. Environment Variables (.env.production)

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Security
SESSION_SECRET=your_secure_session_secret
ENCRYPTION_KEY=your_encryption_key
```

### 3. Database Migration

```sql
-- Apply all migrations in production
\i supabase/migrations/20250130000000_add_user_profiles.sql
\i supabase/migrations/20250130000001_update_rls_policies.sql

-- Verify migrations
SELECT * FROM _supabase_migrations;

-- Create production admin user
INSERT INTO user_profiles (id, full_name, email, role)
VALUES (
  'admin-uuid-from-auth-signup',
  'Production Admin',
  'admin@polypacks.in',
  'admin'
) ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

## 🔐 Security Hardening

### 1. HTTPS and SSL
- Ensure SSL certificate is properly configured
- Verify HTTPS redirects are working
- Test SSL Labs rating (A+ preferred)

### 2. CORS Configuration
```typescript
// In production, be specific about allowed origins
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-production-domain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};
```

### 3. Content Security Policy
```html
<!-- Add to production HTML head -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://your-project.supabase.co;
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               connect-src 'self' https://your-project.supabase.co wss://your-project.supabase.co;">
```

### 4. Rate Limiting Enhancement
```typescript
// Production rate limits (more restrictive)
const PRODUCTION_RATE_LIMIT = {
  maxAttempts: 3,        // Reduced from 5
  windowMinutes: 15,     // Same
  blockDurationMinutes: 60  // Increased from 30
}
```

## 📧 Email Configuration

### 1. SMTP Setup (Recommended Providers)
- **SendGrid**: Reliable, good delivery rates
- **Mailgun**: Developer-friendly
- **Amazon SES**: Cost-effective for high volume

### 2. Email Templates (Production)
```html
<!-- Confirmation Email -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirm Your Account - Production Scheduler</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #f8f9fa; padding: 20px; text-align: center;">
    <h1 style="color: #333;">Production Scheduler ERP</h1>
  </div>
  <div style="padding: 20px;">
    <h2>Welcome to Production Scheduler</h2>
    <p>Please confirm your email address to activate your account:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #007bff; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 4px; display: inline-block;">
        Confirm Email Address
      </a>
    </div>
    <p><small>This link will expire in 24 hours.</small></p>
    <p><small>If you did not create this account, please ignore this email.</small></p>
  </div>
  <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #666;">
    <p>Polypacks Production Team</p>
  </div>
</body>
</html>
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Workflow (.github/workflows/deploy.yml)
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
      env:
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
```

### 2. Required Secrets
```
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VERCEL_TOKEN=your_vercel_token
ORG_ID=your_vercel_org_id
PROJECT_ID=your_vercel_project_id
```

## 📊 Monitoring and Logging

### 1. Supabase Monitoring
- Enable database performance insights
- Set up log retention (7-30 days recommended)
- Configure alerts for:
  - Failed login attempts
  - Database connection issues
  - Edge function errors

### 2. Application Monitoring
```typescript
// Add to production error tracking
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "your_sentry_dsn",
  environment: "production",
  beforeSend(event) {
    // Filter out sensitive data
    if (event.exception) {
      // Don't log auth-related errors with sensitive data
      const error = event.exception.values?.[0];
      if (error?.value?.includes('password') || error?.value?.includes('token')) {
        return null;
      }
    }
    return event;
  }
});
```

### 3. Health Checks
```typescript
// API route: /api/health
export default async function handler(req: Request) {
  try {
    // Check database connection
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) throw error;
    
    return Response.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    return Response.json({ 
      status: 'unhealthy',
      error: error.message 
    }, { status: 500 });
  }
}
```

## 🔄 Backup and Recovery

### 1. Database Backups
- Enable Supabase automatic backups
- Schedule: Daily full backup, hourly incremental
- Retention: 30 days for production

### 2. Recovery Testing
```sql
-- Test backup restoration monthly
CREATE DATABASE scheduler_test_restore;
-- Restore from backup
-- Verify data integrity
-- Test authentication flows
```

## 📈 Performance Optimization

### 1. Next.js Production Optimizations
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  images: {
    domains: ['your-project.supabase.co'],
    formats: ['image/webp', 'image/avif']
  },
  experimental: {
    optimizeCss: true
  }
};

module.exports = nextConfig;
```

### 2. Database Performance
```sql
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_user_profiles_role ON user_profiles(role);
CREATE INDEX CONCURRENTLY idx_user_profiles_email ON user_profiles(email);
CREATE INDEX CONCURRENTLY idx_schedule_jobs_created_by ON schedule_jobs(created_by);
CREATE INDEX CONCURRENTLY idx_schedule_jobs_date_machine ON schedule_jobs(date, machine_id);
```

## 🚦 Go-Live Checklist

### Pre-Launch (T-1 week)
- [ ] All tests passing in staging
- [ ] Performance testing completed
- [ ] Security audit completed
- [ ] Backup/recovery procedures tested
- [ ] Monitoring setup verified

### Launch Day (T-0)
- [ ] Final backup of staging data
- [ ] Deploy to production
- [ ] Smoke test all critical paths
- [ ] Verify monitoring and alerts
- [ ] Create first admin user
- [ ] Test end-to-end authentication flows

### Post-Launch (T+24h)
- [ ] Monitor error rates and performance
- [ ] Verify email delivery working
- [ ] Check user registration flows
- [ ] Review authentication logs
- [ ] Confirm backup schedule running

## 🆘 Rollback Plan

### If Critical Issues Occur:
1. **Immediate**: Redirect traffic to maintenance page
2. **Quick Fix**: Deploy hotfix if issue is minor
3. **Rollback**: Revert to previous version if needed
4. **Communication**: Notify users of any downtime

### Rollback Commands:
```bash
# Vercel rollback
vercel rollback [deployment-url]

# Database rollback (if needed)
# Restore from backup point before deployment
```

## 📞 Support and Maintenance

### 1. User Support Channels
- Email: support@polypacks.in
- Documentation: Internal wiki/docs
- Admin panel: `/admin` for user management

### 2. Maintenance Schedule
- **Weekly**: Review logs and performance metrics
- **Monthly**: Security updates and dependency updates
- **Quarterly**: Full security audit and backup testing

### 3. Emergency Contacts
```
Production Issues: 
  - Primary: [Your team lead]
  - Secondary: [DevOps engineer]
  
Database Issues:
  - Supabase Support: dashboard > support
  - Emergency: [Database admin]
```

This deployment guide ensures a secure, scalable, and maintainable production deployment of your authentication system. 