import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Z-API credentials (used to backfill sent messages when only status callbacks arrive)
const zapiInstanceId = Deno.env.get('ZAPI_INSTANCE_ID')!;
const zapiToken = Deno.env.get('ZAPI_TOKEN')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    console.log('📨 Webhook received:', JSON.stringify(body, null, 2));

    const { type } = body;

    switch (type) {
      case 'ReceivedCallback':
        await handleReceivedMessage(supabase, body);
        break;
      case 'MessageStatusCallback':
        await handleMessageStatus(supabase, body);
        break;
      case 'DeliveryCallback':
        // Treat delivery callback as "delivered" for the messageId
        await handleMessageStatus(supabase, { messageId: body.messageId, status: 'RECEIVED' });
        break;
      case 'StatusInstanceCallback':
        console.log('📱 Instance status:', body.status);
        break;
      case 'ChatPresence':
        console.log('👤 Chat presence:', body.phone, body.isTyping ? 'is typing' : 'stopped typing');
        break;
      default:
        console.log('ℹ️ Unhandled webhook type:', type);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Webhook error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleReceivedMessage(supabase: any, data: any) {
  const { phone, text, senderName, messageId, momment, isGroup, image, audio, video, document, fromMe } = data;
  
  if (isGroup) {
    console.log('👥 Ignoring group message');
    return;
  }
  
  // Clean phone - remove suffixes like @c.us, @g.us, @lid, -group
  let cleanPhone = phone?.replace('@c.us', '').replace('@g.us', '').replace('@lid', '').replace('-group', '');
  
  // Skip if phone looks like a LID (Linked ID) format - these are internal WhatsApp IDs
  if (cleanPhone && cleanPhone.match(/^\d{15,}$/)) {
    console.log('⚠️ Skipping LID format phone:', cleanPhone);
    return;
  }
  
  if (!cleanPhone) {
    console.log('⚠️ Missing phone in message');
    return;
  }
  
  // Determine sender type based on fromMe flag
  const senderType = fromMe ? 'agent' : 'customer';

  // Determine message type and content
  let messageType = 'text';
  // Z-API sends text as object {message: "..."} or as string
  let content = typeof text === 'object' ? text?.message : (text || '');
  let mediaUrl = null;
  let mediaMimeType = null;
  let mediaCaption = null;

  if (!content || !String(content).trim()) {
    content = '[Mensagem]';
  }

  if (image) {
    messageType = 'image';
    mediaUrl = image.imageUrl || image.thumbnailUrl;
    mediaMimeType = image.mimeType || 'image/jpeg';
    mediaCaption = image.caption || '';
    content = mediaCaption || '[Imagem]';
  } else if (audio) {
    messageType = 'audio';
    mediaUrl = audio.audioUrl;
    mediaMimeType = audio.mimeType || 'audio/ogg';
    content = '[Áudio]';
  } else if (video) {
    messageType = 'video';
    mediaUrl = video.videoUrl;
    mediaMimeType = video.mimeType || 'video/mp4';
    mediaCaption = video.caption || '';
    content = mediaCaption || '[Vídeo]';
  } else if (document) {
    messageType = 'document';
    mediaUrl = document.documentUrl;
    mediaMimeType = document.mimeType || 'application/pdf';
    mediaCaption = document.fileName || 'document';
    content = `[Documento: ${mediaCaption}]`;
  }

  console.log(`📩 New ${messageType} from ${senderType} (${cleanPhone}): ${content.substring(0, 50)}`);
  
  try {
    // Find or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();
    
    if (convError) throw convError;
    
    // Convert momment (milliseconds timestamp) to ISO string
    const messageTimestamp = momment ? new Date(momment).toISOString() : new Date().toISOString();
    
    if (!conversation) {
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          phone: cleanPhone,
          name: senderName || cleanPhone,
          last_message: content,
          last_message_at: messageTimestamp,
          unread_count: 1,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      conversation = newConv;
      console.log('✅ Created new conversation:', conversation.id);
    }
    
    // Save the message (avoid duplicates when we sent via the app)
    const { data: existingMsg, error: existingErr } = await supabase
      .from('messages')
      .select('id')
      .eq('message_id', messageId)
      .maybeSingle();

    if (existingErr) throw existingErr;

    if (existingMsg) {
      // Update status/content/media in case we had an optimistic row already
      const { error: updErr } = await supabase
        .from('messages')
        .update({
          status: fromMe ? 'sent' : 'delivered',
          content,
          message_type: messageType,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
          media_caption: mediaCaption,
          created_at: messageTimestamp,
        })
        .eq('id', existingMsg.id);

      if (updErr) throw updErr;
      console.log(`✅ Message updated (dedup by message_id):`, existingMsg.id);
    } else {
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content,
          sender_type: senderType,
          message_id: messageId,
          status: fromMe ? 'sent' : 'delivered',
          message_type: messageType,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
          media_caption: mediaCaption,
          created_at: messageTimestamp,
        })
        .select()
        .single();

      if (msgError) throw msgError;
      console.log(`✅ Message saved (${senderType}):`, message.id);
    }
    
    // Update conversation last_message and unread_count
    const updateData: any = {
      last_message: content,
      last_message_at: messageTimestamp,
    };
    
    // Only increment unread for customer messages
    if (senderType === 'customer') {
      updateData.unread_count = (conversation.unread_count || 0) + 1;
    }
    
    const { error: updateError } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', conversation.id);
    
    if (updateError) {
      console.error('⚠️ Error updating conversation:', updateError);
    } else {
      console.log('✅ Conversation updated');
    }
  } catch (err) {
    console.error('❌ Failed to process message:', err);
  }
}

async function handleMessageStatus(supabase: any, data: any) {
  const { messageId, ids, status, phone, isGroup, momment } = data;

  // Ignore group status updates (we don't store group chats)
  if (isGroup) return;

  const idsList: string[] = Array.isArray(ids)
    ? ids
    : messageId
      ? [messageId]
      : [];

  console.log(`📊 Message status: ${status} for ${idsList.length} ids`);

  // Map Z-API status to our format
  const statusMap: Record<string, string> = {
    PENDING: 'sending',
    SENT: 'sent',
    RECEIVED: 'delivered',
    READ: 'read',
    PLAYED: 'read',
    READ_BY_ME: 'read',
  };

  const mappedStatus = statusMap[status] || String(status || '').toLowerCase();

  if (idsList.length === 0) {
    console.log('⚠️ No message ids in status callback');
    return;
  }

  // First: update any messages we already have
  const { error: updateError } = await supabase
    .from('messages')
    .update({ status: mappedStatus })
    .in('message_id', idsList);

  if (updateError) {
    console.error('❌ Error updating message status:', updateError);
  }

  // If the message doesn't exist yet (common for messages sent via WhatsApp app),
  // backfill by fetching recent chat messages and inserting the missing ones.
  if (!phone || mappedStatus !== 'sent') {
    return;
  }

  const { data: existing } = await supabase
    .from('messages')
    .select('message_id')
    .in('message_id', idsList);

  const existingIds = new Set((existing || []).map((m: any) => m.message_id));
  const missingIds = idsList.filter((id) => !existingIds.has(id));

  if (missingIds.length === 0) return;

  try {
    const resp = await fetch(
      `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/chat-messages/${phone}?amount=25`,
      { method: 'GET' }
    );

    if (!resp.ok) {
      console.error('❌ Backfill fetch failed:', resp.status);
      return;
    }

    const recent = await resp.json();
    if (!Array.isArray(recent)) return;

    // Find or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    const first = recent[0];
    if (!conversation) {
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          phone,
          name: first?.senderName || first?.chatName || phone,
          last_message: null,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        })
        .select()
        .single();
      if (convErr) throw convErr;
      conversation = newConv;
    }

    const toInsert = recent
      .filter((m: any) => m?.messageId && missingIds.includes(m.messageId))
      .map((m: any) => {
        const ts = m.momment ? new Date(m.momment).toISOString() : (momment ? new Date(momment).toISOString() : new Date().toISOString());
        const content = extractContentFromHistory(m);
        return {
          conversation_id: conversation.id,
          content,
          sender_type: m.fromMe ? 'agent' : 'customer',
          message_id: m.messageId,
          status: mappedStatus,
          message_type: extractMessageTypeFromHistory(m),
          media_url: extractMediaUrlFromHistory(m),
          media_mime_type: extractMimeTypeFromHistory(m),
          media_caption: extractCaptionFromHistory(m),
          created_at: ts,
        };
      });

    if (toInsert.length === 0) return;

    const { error: insErr } = await supabase.from('messages').insert(toInsert);
    if (insErr) throw insErr;

    // Update conversation preview with the newest inserted message
    const newest = toInsert.reduce((a: any, b: any) =>
      new Date(a.created_at).getTime() > new Date(b.created_at).getTime() ? a : b
    );

    await supabase
      .from('conversations')
      .update({ last_message: newest.content, last_message_at: newest.created_at })
      .eq('id', conversation.id);

    console.log(`✅ Backfilled ${toInsert.length} sent messages for ${phone}`);
  } catch (err) {
    console.error('❌ Backfill error:', err);
  }
}

// Helpers for backfill (same extraction rules as sync-history)
function extractContentFromHistory(msg: any): string {
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

function extractMessageTypeFromHistory(msg: any): string {
  if (msg.image) return 'image';
  if (msg.video) return 'video';
  if (msg.audio) return 'audio';
  if (msg.document) return 'document';
  if (msg.sticker) return 'sticker';
  if (msg.location) return 'location';
  if (msg.contact) return 'contact';
  return 'text';
}

function extractMediaUrlFromHistory(msg: any): string | null {
  if (msg.image) return msg.image.imageUrl || msg.image.thumbnailUrl;
  if (msg.video) return msg.video.videoUrl;
  if (msg.audio) return msg.audio.audioUrl;
  if (msg.document) return msg.document.documentUrl;
  return null;
}

function extractMimeTypeFromHistory(msg: any): string | null {
  if (msg.image) return msg.image.mimeType || 'image/jpeg';
  if (msg.video) return msg.video.mimeType || 'video/mp4';
  if (msg.audio) return msg.audio.mimeType || 'audio/ogg';
  if (msg.document) return msg.document.mimeType || 'application/octet-stream';
  return null;
}

function extractCaptionFromHistory(msg: any): string | null {
  if (msg.image?.caption) return msg.image.caption;
  if (msg.video?.caption) return msg.video.caption;
  if (msg.document?.fileName) return msg.document.fileName;
  return null;
}