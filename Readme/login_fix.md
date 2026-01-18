Fix authentication bugs causing slow login and logout on page refresh.

## Bug 1: Users get logged out on refresh after re-login

CAUSE: The `logoutTimestamp` in localStorage is set on logout but never cleared on login. When `checkAuth()` runs on refresh, it sees the old timestamp and forces logout.

FIX in `src/components/auth/AuthProvider.tsx`:

In the `login()` function, immediately after `if (response.ok) {`, add:
```typescript
// Clear logout timestamp to prevent false logouts on refresh
if (typeof window !== 'undefined') {
  localStorage.removeItem('logoutTimestamp');
}
```

Also in `checkAuth()`, move the logoutTimestamp check to AFTER the session verification fails, not before. The current logic logs users out even when they have a valid session.

## Bug 2: Slow login due to sequential database operations

CAUSE: Login API runs all database operations one after another instead of in parallel.

FIX in `src/app/api/auth/login/route.ts`:

1. After successful password verification, run the session creation and user update in parallel:
```typescript
// Run session creation and user update in parallel
const [sessionResult, _] = await Promise.all([
  supabase
    .from('auth_sessions')
    .insert({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    })
    .select()
    .single(),
  supabase
    .from('auth_users')
    .update({
      failed_login_attempts: 0,
      account_locked_until: null,
      last_login: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
]);
```

2. Make ALL audit log inserts fire-and-forget (don't await them). Replace every:
```typescript
try {
  await supabase.from('auth_audit_logs').insert({...});
} catch (auditError) {
  console.warn('Could not log:', auditError);
}
```

With:
```typescript
// Fire and forget - don't block response
supabase.from('auth_audit_logs').insert({...}).catch(err => console.warn('Audit log failed:', err));
```

## Bug 3: Cookie not set before redirect

CAUSE: Client redirects immediately after login response, sometimes before cookie is fully set.

FIX in `src/components/auth/LoginForm.tsx`:

In `handleSubmit()`, after `if (result.success) {`, add a small delay before redirect:
```typescript
if (result.success) {
  setUsername('');
  setLocalError('');
  
  // Clear URL parameters
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.pathname);
  }
  
  // Wait for cookie to be fully set before redirecting
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (result.requiresPasswordReset) {
    router.push('/auth/change-password');
  } else {
    router.push('/');
  }
}
```

## Bug 4: Auth check timeout too short

CAUSE: 10 second timeout may not be enough for cold database connections.

FIX in `src/components/auth/AuthProvider.tsx`:

In `checkAuth()`, change:
```typescript
const timeoutId = setTimeout(() => controller.abort(), 10000);
```

To:
```typescript
const timeoutId = setTimeout(() => controller.abort(), 20000);
```

## Bug 5: Duplicate permission fetching

CAUSE: Permissions are fetched separately after login, adding extra latency.

FIX in `src/app/api/auth/login/route.ts`:

Before returning the response, fetch permissions and include them:
```typescript
// Fetch permissions before responding
const { data: userPermissions } = await supabase
  .from('user_permissions')
  .select('permission_key, is_granted')
  .eq('user_id', user.id);

const permissions: Record<string, boolean> = {};
userPermissions?.forEach(p => {
  permissions[p.permission_key] = p.is_granted;
});

// Include in response
return NextResponse.json({
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
    permissions  // Add this
  },
  session: {
    token: sessionToken,
    expiresAt: expiresAt.toISOString()
  }
});
```

Then in `AuthProvider.tsx` login function, skip the separate permissions fetch if they're already included:
```typescript
if (response.ok) {
  localStorage.removeItem('logoutTimestamp');
  
  // Use permissions from response if available, otherwise fetch
  const permissions = data.user.permissions || await fetchPermissions();
  
  setUser({ ...data.user, permissions });
  // ...
}
```

## Files to modify:
1. src/components/auth/AuthProvider.tsx
2. src/app/api/auth/login/route.ts  
3. src/components/auth/LoginForm.tsx

## Expected results after fix:
- No more logout on page refresh
- Login should complete in under 1 second
- Session should persist reliably across refreshes