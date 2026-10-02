import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);

    // Supabase has already confirmed the email by the time the link lands
    // here. The session exchange fails when the link is opened in a
    // different browser/device from the one used to sign up, so just ask
    // them to log in.
    return NextResponse.redirect(`${origin}/login?confirmed=1`);
  }

  // No code means Supabase rejected the link (already used or expired).
  return NextResponse.redirect(`${origin}/login?link=expired`);
}
