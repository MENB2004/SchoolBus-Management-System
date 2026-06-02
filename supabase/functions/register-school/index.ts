import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { school_name, admin_name, email, password } = await req.json();

    if (!school_name || !admin_name || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create the tenant
    const slug = school_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data: tenant, error: tenantError } = await supabaseClient
      .from("tenants")
      .insert([
        {
          school_name,
          slug,
          subscription_plan: "free",
          subscription_status: "trialing",
          contact_email: email,
        },
      ])
      .select()
      .single();

    if (tenantError) {
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    // 2. Create the admin user using service role admin rights
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: admin_name },
    });

    if (authError) {
      // Cleanup created tenant
      await supabaseClient.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Failed to create admin user: ${authError.message}`);
    }

    // 3. Assign role and tenant_id to user
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert([
        {
          user_id: authUser.user.id,
          tenant_id: tenant.id,
          role: "admin",
        },
      ]);

    if (roleError) {
      // Cleanup created user & tenant
      await supabaseClient.auth.admin.deleteUser(authUser.user.id);
      await supabaseClient.from("tenants").delete().eq("id", tenant.id);
      throw new Error(`Failed to assign admin role: ${roleError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, tenant_id: tenant.id, user_id: authUser.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
