import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Use this ONLY inside the cron endpoint. It uses the secret service-role
// key, which can read/write every user's data - never expose it to the
// browser and never use it in a route that a logged-in user calls directly.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
