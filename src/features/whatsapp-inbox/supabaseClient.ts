import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[SupabaseClient] URL:', supabaseUrl ? 'presente' : 'FALTA');
console.log('[SupabaseClient] Key:', supabaseKey ? 'presente' : 'FALTA');

const isConfigured = !!supabaseUrl && !!supabaseKey;

const client = createClient(supabaseUrl || '', supabaseKey || '');

export function requireSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    console.error('[SupabaseClient] Faltan variables de entorno');
    throw new Error('Faltan variables de entorno de Supabase: VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  return client;
}

export function isSupabaseConfigured(): boolean {
  return isConfigured;
}

export { client as supabase };
