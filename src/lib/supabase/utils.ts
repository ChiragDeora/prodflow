import { createClient } from '../supabase/client';

// Lazy Supabase client getter to avoid work at module import time
export const getSupabase = () => createClient();

// Add better error handling
export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} error:`, error);
  if (error?.message) {
    console.error('Error message:', error.message);
  }
  if (error?.details) {
    console.error('Error details:', error.details);
  }
  if (error?.hint) {
    console.error('Error hint:', error.hint);
  }
};

