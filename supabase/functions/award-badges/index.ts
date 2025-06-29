import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Award Badges (v1.5) initializing.");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const userId = user.id;

    // Fetch user's alert responses from alert_responders
    const { data: responsesData, error: responsesError } = await adminClient
      .from('alert_responders')
      .select('alert_id')
      .eq('responder_id', userId);
    if (responsesError) throw responsesError;

    const alertIds = responsesData?.map((response: any) => response.alert_id) || [];
    let responseCount = 0;

    if (alertIds.length > 0) {
      // Verify alerts exist and filter by valid statuses
      const { data: alertsData, error: alertsError } = await adminClient
        .from('crisis_alerts')
        .select('id, status')
        .in('id', alertIds)
        .in('status', ['active', 'acknowledged', 'fulfilled', 'resolved', 'cancelled']);
      if (alertsError) throw alertsError;

      responseCount = alertsData?.length || 0; // Count of valid responses
    }

    console.log(`Response count for ${userId}: ${responseCount}`);

    // Check milestones and award badges
    const { data: badgesData, error: badgesError } = await adminClient
      .from('badges')
      .select('id, name, threshold')
      .eq('type', 'milestone');
    if (badgesError) throw badgesError;

    const eligibleBadges = badgesData?.filter((badge: any) => {
      const thresholdMatch = badge.threshold?.match(/^\d+/); // Extract number from threshold (e.g., "3 alerts")
      const threshold = thresholdMatch ? parseInt(thresholdMatch[0], 10) : 0;
      return !isNaN(threshold) && responseCount >= threshold;
    }) || [];

    for (const badge of eligibleBadges) {
      // Check if badge is already awarded
      const { data: existingAward, error: checkError } = await adminClient
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badge.id)
        .single();
      if (checkError && checkError.code !== 'PGRST116') continue; // PGRST116 means no rows, proceed to award
      if (!existingAward) {
        const { error: insertError } = await adminClient
          .from('user_badges')
          .insert({
            user_id: userId,
            badge_id: badge.id,
            earned_at: new Date().toISOString(),
          });
        if (insertError) throw insertError;
        console.log(`Awarded badge ${badge.name} to ${userId}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Checked badges for ${responseCount} responses.` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in award-badges function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});