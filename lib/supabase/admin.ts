import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Use this ONLY in server routes no user calls directly (the cron endpoint
// and the signature-verified Stripe webhook), or after verifying the
// signed-in user and acting only on their own id (account deletion). It uses the secret
// service-role key, which can read/write every user's data - never expose
// it to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
