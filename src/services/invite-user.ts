// const getFunctionsUrl = () => {
//   const env = typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env;
//   const url = env?.VITE_SUPABASE_URL || "";
//   if (!url) throw new Error("VITE_SUPABASE_URL is not set");
//   return `${url.replace(/\/$/, "")}/functions/v1/invite-user`;
// };

export type InviteUserPayload = {
  email: string;
  full_name?: string;
  role?: "sales" | "admin";
};

export async function inviteUser(
  payload: InviteUserPayload,
): Promise<{ message: string }> {
  const url = "http://127.0.0.1:54321/functions/v1/invite-user";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      full_name: payload.full_name?.trim() ?? "",
      role: payload.role === "admin" ? "admin" : "sales",
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Gagal mengirim undangan",
    );
  }

  return { message: data?.message ?? "Undangan terkirim ke email." };
}
