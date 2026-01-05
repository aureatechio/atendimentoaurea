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

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientToken) {
      headers['Client-Token'] = clientToken;
    }

    console.log('📱 Fetching all chats from Z-API...');
    
    let allChats: any[] = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    // Paginate through all chats
    while (hasMore) {
      const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/chats?page=${page}&pageSize=${pageSize}`;
      console.log(`📄 Fetching page ${page}...`);
      
      const response = await fetch(zapiUrl, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Z-API error:', errorText);
        break;
      }

      const chats = await response.json();
      console.log(`📋 Page ${page}: Found ${chats.length} chats`);
      
      if (chats.length === 0) {
        hasMore = false;
      } else {
        allChats = allChats.concat(chats);
        page++;
        
        // Safety limit
        if (page > 20) {
          console.log('⚠️ Reached page limit');
          hasMore = false;
        }
      }
    }

    console.log(`📊 Total chats found: ${allChats.length}`);

    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const chat of allChats) {
      // Skip groups for now
      if (chat.isGroup) {
        skipped++;
        continue;
      }

      const phone = chat.phone?.replace('@c.us', '').replace('@g.us', '');
      if (!phone) {
        skipped++;
        continue;
      }

      // Parse lastMessageTime
      let lastMessageAt = new Date().toISOString();
      if (chat.lastMessageTime) {
        const timestamp = parseInt(chat.lastMessageTime);
        if (timestamp > 1577836800 && timestamp < 1893456000) {
          lastMessageAt = new Date(timestamp * 1000).toISOString();
        }
      }

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (existing) {
        // Update existing conversation with latest info
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            name: chat.name || phone,
            avatar_url: chat.profileThumbnail || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (!updateError) {
          updated++;
        }
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
          last_message_at: lastMessageAt,
        });

      if (insertError) {
        console.error(`❌ Error importing ${phone}:`, insertError);
        skipped++;
      } else {
        console.log(`✅ Imported: ${chat.name || phone}`);
        imported++;
      }
    }

    console.log(`📊 Summary: ${imported} imported, ${updated} updated, ${skipped} skipped`);

    return new Response(JSON.stringify({ 
      success: true,
      total: allChats.length,
      imported,
      updated,
      skipped,
      message: `Sincronizado! ${imported} novas conversas, ${updated} atualizadas. Obs: A Z-API não permite buscar histórico de mensagens, apenas conversas recentes e novas mensagens via webhook.`,
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