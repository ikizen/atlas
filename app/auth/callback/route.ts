import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    // No code means something went wrong — redirect to login with an error hint
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Store the provider refresh token in drive_tokens (service role bypasses RLS)
  const refreshToken = data.session.provider_refresh_token;
  if (refreshToken) {
    const serviceClient = await getServiceSupabaseClient();
    const { error: tokenErr } = await serviceClient.from("drive_tokens").upsert(
      {
        user_id: data.session.user.id,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (tokenErr) {
      // Non-fatal — Drive sync just won't work; log but continue
      console.error("[auth/callback] drive_tokens upsert:", tokenErr);
    }
  }

  const redirectUrl = `${origin}${next}`;
  const response = NextResponse.redirect(redirectUrl);

  // Short-lived cookie to trigger the localStorage migration prompt
  response.cookies.set("atlas_first_login", "1", {
    maxAge: 120, // 2 minutes — enough time for the page to load and check
    path: "/",
    sameSite: "lax",
  });

  return response;
}
