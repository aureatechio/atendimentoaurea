import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
    const token = Deno.env.get('ZAPI_TOKEN');
    const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');

    if (!instanceId || !token) {
      return new Response(JSON.stringify({ error: 'Z-API credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch chats from Z-API
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientToken) {
      headers['Client-Token'] = clientToken;
    }

    console.log('📱 Fetching chats from Z-API...');
    
    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/chats?page=1&pageSize=50`;
    const response = await fetch(zapiUrl, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Z-API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch chats from Z-API', details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chats = await response.json();
    console.log(`📋 Found ${chats.length} chats`);

    let imported = 0;
    let skipped = 0;

    for (const chat of chats) {
      // Skip groups for now
      if (chat.isGroup) {
        console.log(`⏭️ Skipping group: ${chat.name}`);
        skipped++;
        continue;
      }

      const phone = chat.phone?.replace('@c.us', '').replace('@g.us', '');
      if (!phone) {
        skipped++;
        continue;
      }

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (existing) {
        console.log(`⏭️ Conversation already exists for ${phone}`);
        skipped++;
        continue;
      }

      // Create new conversation
      const { error: insertError } = await supabase
        .from('conversations')
        .insert({
          phone,
          name: chat.name || phone,
          avatar_url: chat.profileThumbnail || null,
          unread_count: parseInt(chat.unread) || 0,
          last_message_at: chat.lastMessageTime 
            ? new Date(parseInt(chat.lastMessageTime) * 1000).toISOString()
            : new Date().toISOString(),
        });

      if (insertError) {
        console.error(`❌ Error importing ${phone}:`, insertError);
      } else {
        console.log(`✅ Imported: ${chat.name || phone}`);
        imported++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      total: chats.length,
      imported,
      skipped,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Sync error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});