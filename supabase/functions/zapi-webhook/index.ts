import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    
    // Save the message
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
      })
      .select()
      .single();
    
    if (msgError) throw msgError;
    console.log(`✅ Message saved (${senderType}):`, message.id);
  } catch (err) {
    console.error('❌ Failed to process message:', err);
  }
}

async function handleMessageStatus(supabase: any, data: any) {
  const { messageId, status } = data;
  console.log(`📊 Message ${messageId} status: ${status}`);
  
  // Map Z-API status to our format
  const statusMap: Record<string, string> = {
    'PENDING': 'sending',
    'SENT': 'sent',
    'RECEIVED': 'delivered',
    'READ': 'read',
    'PLAYED': 'read',
  };
  
  const mappedStatus = statusMap[status] || status.toLowerCase();
  
  if (messageId) {
    const { error } = await supabase
      .from('messages')
      .update({ status: mappedStatus })
      .eq('message_id', messageId);
    
    if (error) {
      console.error('❌ Error updating message status:', error);
    } else {
      console.log(`✅ Updated status to: ${mappedStatus}`);
    }
  }
}