// Located at: /supabase/functions/alert-manager/index.ts
// UPDATED: The 'accept_offer' action now sends a private real-time notification
// to the supporter whose offer was accepted.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Alert Manager (v2.2 - Supporter Notification) initializing.");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('User not found');

    const { action, payload } = await req.json();
    if (!action) throw new Error("Missing required field: action");

    switch (action) {
      case 'create': {
        const { initial_message } = payload;
        const { data, error } = await adminClient.from('crisis_alerts').insert({ created_by: user.id, status: 'active', initial_message }).select('id').single();
        if (error) throw error;
        return new Response(JSON.stringify({ alert_id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
      case 'send_offer': {
        const { alert_id, offer_message } = payload;
        if (!alert_id || !offer_message) throw new Error("Missing payload fields");
        const { error } = await adminClient.from('response_offers').insert({ alert_id, responder_id: user.id, offer_message });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
      case 'accept_offer': {
        const { offer_id } = payload;
        if (!offer_id) throw new Error("Missing payload field: offer_id");
        
        // This RPC function now returns both the new channel_id and the responder's ID
        const { data: rpcData, error } = await adminClient.rpc('accept_response_offer', {
          p_offer_id: offer_id,
          p_activator_id: user.id
        });

        if (error) throw new Error(error.message);
        
        const { new_channel_id, responder_id } = rpcData;

        // --- NEW: Send a private real-time notification to the supporter ---
        if (responder_id) {
            const privateChannelName = `private-notifications-for-${responder_id}`;
            const privateChannel = adminClient.channel(privateChannelName);
            await privateChannel.send({
              type: 'broadcast',
              event: 'offer_accepted',
              payload: {
                message: 'Your offer to support a user was accepted!',
                channel_id: new_channel_id
              },
            });
            await adminClient.removeChannel(privateChannel);
        }

        return new Response(JSON.stringify({ success: true, channel_id: new_channel_id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });
      }
      case 'cancel': {
        const { alert_id } = payload;
        if (!alert_id) throw new Error("Missing payload field: alert_id");
        const { data, error } = await adminClient.from('crisis_alerts').update({ status: 'cancelled', resolution_type: 'user_cancelled', resolved_at: new Date().toISOString() }).eq('id', alert_id).eq('created_by', user.id).eq('status', 'active').select('id');
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Alert is no longer active and cannot be cancelled.");
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (error) {
    console.error("Error in alert-manager function:", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});