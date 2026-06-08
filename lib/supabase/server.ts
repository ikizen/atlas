import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client that reads/writes cookies from the current
 * request context. Use in Server Components, Route Handlers, and Middleware.
 *
 * Each call creates a fresh client bound to the current cookie store.
 */
export async function getServerSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — cookies are read-only
            // in that context; the middleware handles token refresh instead.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses RLS. Use ONLY in server-side route handlers
 * that need to read drive_tokens. NEVER expose to the browser.
 */
export async function getServiceSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // service role client doesn't set auth cookies
        },
      },
    },
  );
}
