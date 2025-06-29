import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Fetch Dashboard (v1.3) initializing.");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { count: activeAlertsCount, error: alertsError } = await adminClient
      .from('crisis_alerts')
      .select('id', { count: 'exact' })
      .eq('created_by', user.id)
      .eq('status', 'active');
    if (alertsError) throw alertsError;

    const { data: channelsData, error: channelsError } = await adminClient
      .rpc('get_user_channels_with_details', { p_user_id: user.id })
      .limit(3);
    if (channelsError) throw channelsError;

    const recentChats = (channelsData || []).sort((a: any, b: any) => {
      const aDate = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
      const bDate = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
      return bDate - aDate; // Descending order
    });

    const { data: badgeData, error: badgeError } = await adminClient
      .from('user_badges')
      .select('badges ( id, name )')
      .eq('user_id', user.id);
    if (badgeError) throw badgeError;

    const badges = badgeData?.map((item: any) => item.badges).filter(Boolean) || [];

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          activeAlertsCount: activeAlertsCount || 0,
          recentChats,
          badges,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in fetch-dashboard function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});