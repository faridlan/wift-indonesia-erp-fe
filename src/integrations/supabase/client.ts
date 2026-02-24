/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type SupabaseEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL_LOCAL?: string;
  VITE_SUPABASE_ANON_KEY_LOCAL?: string;
  VITE_SUPABASE_TARGET?: "cloud" | "local";
  VITE_SUPABASE_ENV?: "cloud" | "local";
};

// Menggunakan type casting yang lebih aman untuk Vite
const env = (import.meta as any).env as SupabaseEnv;

// Pastikan tidak ada whitespace atau karakter sisa dari .env
const target = (
  env.VITE_SUPABASE_TARGET ||
  env.VITE_SUPABASE_ENV ||
  "cloud"
).trim();
const isLocal = target === "local";

// Logic penentuan URL & Key (DRY & Readable)
const SUPABASE_URL = isLocal
  ? env.VITE_SUPABASE_URL_LOCAL || env.VITE_SUPABASE_URL
  : env.VITE_SUPABASE_URL;

const SUPABASE_ANON_KEY = isLocal
  ? env.VITE_SUPABASE_ANON_KEY_LOCAL || env.VITE_SUPABASE_ANON_KEY
  : env.VITE_SUPABASE_ANON_KEY;

// Fail-fast principle: Jangan jalankan app jika config rusak
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const errorMsg = `[Supabase] Missing configuration for target: ${target}. 
    Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env`;
  console.error(errorMsg);
  throw new Error(errorMsg);
}

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
