import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if any superadmin exists
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "superadmin")
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: "Superadmin sudah ada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const username = body?.username?.trim()?.toLowerCase() || "superadmin";
    const password = body?.password || "superadmin123";

    const email = `${username}@app.local`;

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Super Admin", role: "superadmin", username },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile role to superadmin
    await supabase
      .from("profiles")
      .update({ role: "superadmin", full_name: "Super Admin" })
      .eq("id", newUser.user.id);

    return new Response(
      JSON.stringify({
        message: `Superadmin "${username}" berhasil dibuat`,
        username,
        password,
        user_id: newUser.user.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
