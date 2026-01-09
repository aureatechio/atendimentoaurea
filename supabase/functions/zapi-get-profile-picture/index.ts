import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, conversationId } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
    const token = Deno.env.get('ZAPI_TOKEN');

    if (!instanceId || !token) {
      return new Response(JSON.stringify({ error: 'Z-API credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format phone for Z-API (add @c.us if needed)
    const formattedPhone = phone.includes('@') ? phone : `${phone}@c.us`;

    // Fetch profile picture from Z-API
    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/profile-picture/${formattedPhone}`,
      { method: 'GET' }
    );

    const data = await response.json();
    console.log('📸 Profile picture response:', JSON.stringify(data));

    const avatarUrl = data?.link || data?.profilePicture || data?.imgUrl || null;

    // If we have a conversationId, update the avatar in database
    if (conversationId && avatarUrl) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('conversations')
        .update({ avatar_url: avatarUrl })
        .eq('id', conversationId);

      console.log('✅ Avatar updated for conversation:', conversationId);
    }

    return new Response(JSON.stringify({ success: true, avatarUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching profile picture:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
