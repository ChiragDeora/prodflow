import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client for use in client components.
// Uses public URL and anon key; no work is done at module import time.
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase browser environment variables.');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    throw new Error('Supabase browser client is not configured');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};





