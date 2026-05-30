import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabaseClient, getServiceSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/drive/token
 *
 * Server-only route. Reads the user's stored Google refresh token from
 * drive_tokens (service role, bypasses RLS) and exchanges it for a short-lived
 * access token. Returns { accessToken, expiresIn } — never the refresh token.
 */
export async function GET(_request: NextRequest) {
  // 1. Verify the user is authenticated
  const supabase = await getServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Read the refresh token via service role (bypasses drive_tokens RLS)
  const serviceClient = await getServiceSupabaseClient();
  const { data: tokenRow, error: tokenErr } = await serviceClient
    .from("drive_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .single();

  if (tokenErr || !tokenRow?.refresh_token) {
    return NextResponse.json(
      { error: "No Drive token found. Please sign in again." },
      { status: 404 },
    );
  }

  // 3. Exchange refresh token for access token
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: tokenRow.refresh_token,
    grant_type: "refresh_token",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[/api/drive/token] Google token exchange failed:", body);
    return NextResponse.json(
      { error: "Failed to refresh Google access token." },
      { status: 502 },
    );
  }

  const { access_token, expires_in } = (await tokenRes.json()) as {
    access_token: string;
    expires_in: number;
  };

  return NextResponse.json({ accessToken: access_token, expiresIn: expires_in });
}
