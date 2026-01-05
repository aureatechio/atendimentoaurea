import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const zapiInstanceId = Deno.env.get('ZAPI_INSTANCE_ID')!;
const zapiToken = Deno.env.get('ZAPI_TOKEN')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const { phone, limit = 50 } = body;

    console.log('🔄 Starting sync...', phone ? `for ${phone}` : 'all chats');

    if (phone) {
      // Sync specific conversation
      const result = await syncConversationMessages(supabase, phone, limit);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sync all chats
    const chatsResponse = await fetch(
      `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/chats`,
      { method: 'GET' }
    );

    if (!chatsResponse.ok) {
      throw new Error(`Failed to fetch chats: ${chatsResponse.status}`);
    }

    const chats = await chatsResponse.json();
    console.log(`📋 Found ${chats.length} chats`);

    // Filter only individual chats (not groups)
    const individualChats = chats.filter((chat: any) => !chat.isGroup);
    console.log(`👤 ${individualChats.length} individual chats to sync`);

    let synced = 0;
    let errors = 0;

    for (const chat of individualChats.slice(0, 20)) { // Limit to 20 chats per sync
      try {
        const cleanPhone = chat.phone?.replace('@c.us', '').replace('@g.us', '');
        if (!cleanPhone) continue;

        await syncConversationMessages(supabase, cleanPhone, limit);
        synced++;
      } catch (err) {
        console.error(`❌ Error syncing chat:`, err);
        errors++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      synced, 
      errors,
      total: individualChats.length 
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

async function syncConversationMessages(supabase: any, phone: string, limit: number) {
  console.log(`📥 Syncing messages for ${phone}...`);

  // Fetch messages from Z-API
  const messagesResponse = await fetch(
    `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/chat-messages/${phone}?amount=${limit}`,
    { method: 'GET' }
  );

  if (!messagesResponse.ok) {
    throw new Error(`Failed to fetch messages: ${messagesResponse.status}`);
  }

  const messages = await messagesResponse.json();
  
  if (!Array.isArray(messages) || messages.length === 0) {
    console.log(`ℹ️ No messages found for ${phone}`);
    return { phone, synced: 0 };
  }

  console.log(`📨 Found ${messages.length} messages for ${phone}`);

  // Find or create conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  // Get the most recent message for conversation info
  const lastMsg = messages[0];
  const contactName = lastMsg?.senderName || lastMsg?.chatName || phone;

  if (!conversation) {
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        phone,
        name: contactName,
        last_message: extractContent(lastMsg),
        last_message_at: new Date(lastMsg.momment || Date.now()).toISOString(),
        unread_count: 0,
      })
      .select()
      .single();

    if (createError) throw createError;
    conversation = newConv;
    console.log('✅ Created conversation:', conversation.id);
  }

  // Get existing message IDs to avoid duplicates
  const { data: existingMessages } = await supabase
    .from('messages')
    .select('message_id')
    .eq('conversation_id', conversation.id)
    .not('message_id', 'is', null);

  const existingIds = new Set(existingMessages?.map((m: any) => m.message_id) || []);

  // Insert new messages
  const newMessages = messages
    .filter((msg: any) => msg.messageId && !existingIds.has(msg.messageId))
    .map((msg: any) => ({
      conversation_id: conversation.id,
      content: extractContent(msg),
      sender_type: msg.fromMe ? 'agent' : 'customer',
      message_id: msg.messageId,
      status: msg.fromMe ? 'read' : 'delivered',
      message_type: extractMessageType(msg),
      media_url: extractMediaUrl(msg),
      media_mime_type: extractMimeType(msg),
      media_caption: extractCaption(msg),
      created_at: new Date(msg.momment || Date.now()).toISOString(),
    }));

  if (newMessages.length > 0) {
    const { error: insertError } = await supabase
      .from('messages')
      .insert(newMessages);

    if (insertError) throw insertError;
    console.log(`✅ Inserted ${newMessages.length} messages for ${phone}`);
  } else {
    console.log(`ℹ️ No new messages for ${phone}`);
  }

  return { phone, synced: newMessages.length };
}

function extractContent(msg: any): string {
  if (msg.text?.message) return msg.text.message;
  if (typeof msg.text === 'string') return msg.text;
  if (msg.image) return msg.image.caption || '[Imagem]';
  if (msg.video) return msg.video.caption || '[Vídeo]';
  if (msg.audio) return '[Áudio]';
  if (msg.document) return `[Documento: ${msg.document.fileName || 'arquivo'}]`;
  if (msg.sticker) return '[Sticker]';
  if (msg.location) return '[Localização]';
  if (msg.contact) return '[Contato]';
  return msg.body || '[Mensagem]';
}

function extractMessageType(msg: any): string {
  if (msg.image) return 'image';
  if (msg.video) return 'video';
  if (msg.audio) return 'audio';
  if (msg.document) return 'document';
  if (msg.sticker) return 'sticker';
  if (msg.location) return 'location';
  if (msg.contact) return 'contact';
  return 'text';
}

function extractMediaUrl(msg: any): string | null {
  if (msg.image) return msg.image.imageUrl || msg.image.thumbnailUrl;
  if (msg.video) return msg.video.videoUrl;
  if (msg.audio) return msg.audio.audioUrl;
  if (msg.document) return msg.document.documentUrl;
  return null;
}

function extractMimeType(msg: any): string | null {
  if (msg.image) return msg.image.mimeType || 'image/jpeg';
  if (msg.video) return msg.video.mimeType || 'video/mp4';
  if (msg.audio) return msg.audio.mimeType || 'audio/ogg';
  if (msg.document) return msg.document.mimeType || 'application/octet-stream';
  return null;
}

function extractCaption(msg: any): string | null {
  if (msg.image?.caption) return msg.image.caption;
  if (msg.video?.caption) return msg.video.caption;
  if (msg.document?.fileName) return msg.document.fileName;
  return null;
}
