import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let configPromise: Promise<{ url: string; anonKey: string }> | null = null;

async function getConfig() {
  if (!configPromise) {
    configPromise = fetch('/api/config/supabase').then(async (r) => {
      if (!r.ok) {
        const error = await r.json().catch(() => ({ error: 'Failed to load configuration' }));
        throw new Error(error.error || 'Supabase configuration unavailable');
      }
      return r.json();
    });
  }
  return configPromise;
}

export async function initSupabase(): Promise<SupabaseClient> {
  if (!supabaseClient) {
    const config = await getConfig();
    supabaseClient = createClient(config.url, config.anonKey);
  }
  return supabaseClient;
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient;
}
