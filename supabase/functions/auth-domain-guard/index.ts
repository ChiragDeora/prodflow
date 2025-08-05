import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the webhook payload
    const payload = await req.json()
    console.log('Received webhook:', payload)

    // Extract user data from auth.user_created event
    const { record: user } = payload
    
    if (!user || !user.email) {
      console.error('No user or email found in payload')
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const email = user.email.toLowerCase()
    const allowedDomain = '@polypacks.in'

    console.log(`Checking email: ${email}`)

    // Check if email domain is allowed
    if (!email.endsWith(allowedDomain)) {
      console.log(`Unauthorized domain detected: ${email}`)
      
      // Delete the unauthorized user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
      
      if (deleteError) {
        console.error('Error deleting unauthorized user:', deleteError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to delete unauthorized user',
            details: deleteError 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log(`Successfully deleted unauthorized user: ${email}`)
      
      return new Response(
        JSON.stringify({ 
          message: 'Unauthorized domain - user deleted',
          email: email,
          allowed_domain: allowedDomain
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Authorized email domain: ${email}`)
    
    return new Response(
      JSON.stringify({ 
        message: 'User authorized',
        email: email 
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