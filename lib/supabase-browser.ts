"use client";
import { createBrowserClient } from "@supabase/ssr";
export const supabaseBrowser = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// "Forgot password" emails only. The normal client ties an email link to the browser that asked for it,
// so a reset link opened from the Gmail app or another device could never finish. This one asks for a
// link that works wherever it's opened. It keeps no session of its own.
import { createClient } from "@supabase/supabase-js";
export const supabaseResetRequest = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
