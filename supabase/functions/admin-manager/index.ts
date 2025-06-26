// supabase/functions/admin-manager/index.ts
// CORRECTED: The import statement now uses a valid URL string.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Admin Manager function initializing (v3 - Profile Edit).");

type AdminAction = 'set_role' | 'set_verification_status' | 'update_user_profile';

type AdminPayload = {
  action: AdminAction;
  payload: any; 
};

type SetRolePayload = {
    target_user_id: string;
    new_role: 'user' | 'moderator' | 'admin' | 'super_admin';
};

type SetVerificationPayload = {
    target_user_id: string;
    type: 'military' | 'professional';
    status: boolean;
};

type UpdateProfilePayload = {
    target_user_id: string;
    updates: { [key: string]: any };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Create a client that IMPERSONATES the user making the request.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Get the user's data from this user-specific client.
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // 3. Create the powerful admin client, ONLY for performing actions after checks pass.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Fetch the CALLER'S profile to check their role.
    const { data: callerProfile, error: callerError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerError || !callerProfile) {
        throw new Error('Could not find the profile of the user making the request.');
    }

    const { action, payload }: AdminPayload = await req.json();
    const callerRole = callerProfile.role;

    switch (action) {
      case 'set_role': {
        if (callerRole !== 'super_admin') {
            throw new Error('Permission denied. You must be a Super Admin.');
        }
        const { target_user_id, new_role } = payload as SetRolePayload;
        const { error } = await adminClient.from('profiles').update({ role: new_role }).eq('id', target_user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: `Role updated.` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'set_verification_status': {
        if (!['admin', 'super_admin'].includes(callerRole)) {
            throw new Error('Permission denied. You must be an Admin or Super Admin.');
        }
        const { target_user_id, type, status } = payload as SetVerificationPayload;
        
        const updateData = type === 'military' ? { military_verified: status } : { professional_verified: status };
        
        const { error } = await adminClient.from('profiles').update(updateData).eq('id', target_user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: `Verification status updated.` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      case 'update_user_profile': {
        if (!['admin', 'super_admin'].includes(callerRole)) {
            throw new Error('Permission denied. You must be an Admin or Super Admin to edit profiles.');
        }
        const { target_user_id, updates } = payload as UpdateProfilePayload;
        if (!target_user_id || !updates) throw new Error("Missing target_user_id or updates payload.");

        // Ensure role cannot be changed through this action
        delete updates.role; 

        const { error } = await adminClient.from('profiles').update(updates).eq('id', target_user_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: `Profile for user ${target_user_id} updated.` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
