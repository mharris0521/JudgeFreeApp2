import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Alert Manager (v2.4 - Responder Limit) initializing.");

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
        const { data: existingAlert, error: existingError } = await adminClient.from('crisis_alerts').select('id').eq('created_by', user.id).eq('status', 'active').maybeSingle();
        if (existingError) throw existingError;
        if (existingAlert) throw new Error('An active alert already exists for this user.');

        const { initial_message } = payload;
        const { data, error } = await adminClient.from('crisis_alerts').insert({ created_by: user.id, status: 'active', initial_message }).select('id').single();
        if (error) throw error;
        return new Response(JSON.stringify({ alert_id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
      
      // --- UPDATED ACTION ---
      case 'send_offer': {
        const { alert_id, offer_message } = payload;
        if (!alert_id || !offer_message) throw new Error("Missing payload fields");

        // It now calls the new database function to handle the logic atomically.
        const { error } = await adminClient.rpc('add_response_offer_and_update_alert', {
            p_alert_id: alert_id,
            p_responder_id: user.id,
            p_offer_message: offer_message
        });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      case 'accept_offer': {
        const { offer_id } = payload;
        if (!offer_id) throw new Error("Missing payload field: offer_id");
        
        const { data: rpcData, error } = await adminClient.rpc('accept_response_offer', { p_offer_id: offer_id, p_activator_id: user.id });
        if (error) throw new Error(error.message);
        
        const { new_channel_id, responder_id } = rpcData;

        if (responder_id) {
            const privateChannelName = `private-notifications-for-${responder_id}`;
            const privateChannel = adminClient.channel(privateChannelName);
            await privateChannel.send({
              type: 'broadcast',
              event: 'offer_accepted',
              payload: { message: 'Your offer to support a user was accepted!', channel_id: new_channel_id },
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
        const { error } = await adminClient.from('crisis_alerts').update({ status: 'cancelled', resolution_type: 'user_cancelled', resolved_at: new Date().toISOString() }).eq('id', alert_id).eq('created_by', user.id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      case 'resolve': {
        const { alert_id, outcome } = payload;
        if (!alert_id || !outcome) throw new Error("Missing payload fields: alert_id, outcome");
        if (!['good', 'bad'].includes(outcome)) throw new Error("Invalid outcome value.");

        const { error } = await adminClient
            .from('crisis_alerts')
            .update({ status: 'resolved', resolution_type: outcome, resolved_at: new Date().toISOString() })
            .eq('id', alert_id)
            .eq('created_by', user.id);

        if (error) throw error;
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