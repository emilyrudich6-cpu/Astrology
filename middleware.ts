import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the member's login session fresh on every page load.
export async function middleware(request: NextRequest) {
  // A sign-in link that landed on the wrong page (e.g. the homepage) still finishes signing in
  const { pathname, searchParams } = request.nextUrl;
  // (the callback falls back to the reading they started, then My readings)
  if (pathname !== "/auth/callback" && !pathname.startsWith("/api/") &&
      (searchParams.get("code") || searchParams.get("token_hash") || searchParams.get("error_code"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/auth/callback";
    return NextResponse.redirect(to);
  }
  let response = NextResponse.next({ request });
  // Not configured yet: let pages load instead of failing
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return response;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try { await supabase.auth.getUser(); } catch { /* signed-out visitors still see public pages */ }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/stripe|api/cron|sw.js|manifest.webmanifest|icon|favicon).*)"],
};
