import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Faltan variables de entorno de Supabase. La bandeja no funcionaráħħ');
}

const client = createClient(supabaseUrl || '', supabaseKey || '');

export function requireSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan variables de entorno de Supabase: VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  return client;
}

export { client as supabase };
