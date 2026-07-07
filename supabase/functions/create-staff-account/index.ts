import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type StaffRole = "owner" | "admin" | "teacher" | "grader" | "content_editor";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Missing Supabase function environment." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing bearer token." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session." }, 401);

  const { data: caller, error: callerError } = await adminClient
    .from("profiles")
    .select("role,active")
    .eq("id", authData.user.id)
    .single();
  if (callerError) return json({ error: callerError.message }, 500);
  if (!caller?.active || !["owner", "admin"].includes(caller.role)) {
    return json({ error: "Only owner/admin can create staff accounts." }, 403);
  }

  const payload = await req.json().catch(() => null) as {
    email?: string;
    password?: string;
    full_name?: string | null;
    role?: StaffRole;
    active?: boolean;
  } | null;
  const email = payload?.email?.trim().toLowerCase();
  const password = payload?.password ?? "";
  const fullName = payload?.full_name?.trim() || null;
  const role = payload?.role ?? "teacher";
  const active = payload?.active ?? true;

  if (!email || !email.includes("@")) return json({ error: "Email không hợp lệ." }, 400);
  if (password.length < 8) return json({ error: "Mật khẩu tối thiểu 8 ký tự." }, 400);
  if (!["owner", "admin", "teacher", "grader", "content_editor"].includes(role)) {
    return json({ error: "Role không hợp lệ." }, 400);
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) {
    return json({ error: createError?.message ?? "Không tạo được tài khoản." }, 400);
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: created.user.id,
      email,
      full_name: fullName,
      role,
      active,
      updated_at: new Date().toISOString(),
    });
  if (profileError) return json({ error: profileError.message }, 500);

  return json({
    profile: {
      id: created.user.id,
      email,
      full_name: fullName,
      role,
      active,
    },
  });
});
