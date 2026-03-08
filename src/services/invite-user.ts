import { supabase } from "@/integrations/supabase/client";

const EMAIL_DOMAIN = "app.local";

export type CreateUserPayload = {
  username: string;
  password: string;
  full_name?: string;
  role?: "sales" | "admin";
};

export async function createUser(payload: CreateUserPayload): Promise<{ message: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sesi tidak valid. Silakan login ulang.");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("SUPABASE_URL tidak dikonfigurasi");

  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/invite-user`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      username: payload.username.trim().toLowerCase(),
      password: payload.password,
      full_name: payload.full_name?.trim() ?? "",
      role: payload.role === "admin" ? "admin" : "sales",
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Gagal membuat user"
    );
  }

  return { message: data?.message ?? "User berhasil dibuat." };
}
