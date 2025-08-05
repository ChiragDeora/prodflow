import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
const RATE_LIMIT = {
  maxAttempts: 5,
  windowMinutes: 15,
  blockDurationMinutes: 30
}

function getClientKey(req: Request): string {
  // Try to get IP from various headers
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  
  // Use the first available IP
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  return `rate_limit:${ip}`
}

function isRateLimited(clientKey: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitStore.get(clientKey)

  if (!record) {
    return { limited: false }
  }

  // Check if window has expired
  if (now > record.resetTime) {
    rateLimitStore.delete(clientKey)
    return { limited: false }
  }

  // Check if client is blocked
  if (record.count >= RATE_LIMIT.maxAttempts) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { limited: true, retryAfter }
  }

  return { limited: false }
}

function incrementAttempt(clientKey: string): void {
  const now = Date.now()
  const record = rateLimitStore.get(clientKey)

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    rateLimitStore.set(clientKey, {
      count: 1,
      resetTime: now + (RATE_LIMIT.windowMinutes * 60 * 1000)
    })
  } else {
    // Increment existing record
    record.count++
    // If limit exceeded, extend block time
    if (record.count >= RATE_LIMIT.maxAttempts) {
      record.resetTime = now + (RATE_LIMIT.blockDurationMinutes * 60 * 1000)
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const clientKey = getClientKey(req)
    
    // Check rate limit
    const { limited, retryAfter } = isRateLimited(clientKey)
    
    if (limited) {
      console.log(`Rate limited client: ${clientKey}`)
      
      return new Response(
        JSON.stringify({ 
          error: 'Too many login attempts',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': retryAfter?.toString() || '300'
          }
        }
      )
    }

    // Get request body
    const { email, password } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate email domain
    if (!email.toLowerCase().endsWith('@polypacks.in')) {
      incrementAttempt(clientKey)
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email domain',
          message: 'Only @polypacks.in email addresses are allowed'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{12,}$/
    if (!passwordRegex.test(password)) {
      incrementAttempt(clientKey)
      
      return new Response(
        JSON.stringify({ 
          error: 'Weak password',
          message: 'Password must be at least 12 characters with at least one uppercase letter and one number'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      // Increment failed attempt
      incrementAttempt(clientKey)
      
      console.error('Login error:', error)
      
      return new Response(
        JSON.stringify({ 
          error: 'Login failed',
          message: error.message
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if email is confirmed
    if (!data.user?.email_confirmed_at) {
      incrementAttempt(clientKey)
      
      return new Response(
        JSON.stringify({ 
          error: 'Email not confirmed',
          message: 'Please confirm your email before logging in'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Successful login - don't increment rate limit
    console.log(`Successful login for: ${email}`)
    
    return new Response(
      JSON.stringify({ 
        message: 'Login successful',
        user: data.user,
        session: data.session
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 