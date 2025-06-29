import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Award Admin Badge (v1.0) initializing.");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const adminId = user.id;
    const { user_id, badge_id } = await req.json();

    if (!user_id || !badge_id) {
      throw new Error('user_id and badge_id are required.');
    }

    // Verify admin role
    const { data: adminProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .single();
    if (profileError) throw profileError;
    if (!['admin', 'super_admin'].includes(adminProfile.role)) {
      throw new Error('Only admins or super_admins can award badges.');
    }

    // Award the badge
    const { error: insertError } = await adminClient
      .from('user_badges')
      .insert({
        user_id,
        badge_id,
        earned_at: new Date().toISOString(),
        awarded_by: adminId,
      })
      .onConflict(['user_id', 'badge_id'])
      .doNothing();
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, message: `Badge ${badge_id} awarded to user ${user_id} by ${adminId}.` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in award-admin-badge function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});