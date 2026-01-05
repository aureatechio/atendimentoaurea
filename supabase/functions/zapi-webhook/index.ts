import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    console.log('📨 Webhook received:', JSON.stringify(body, null, 2));

    // Z-API webhook types
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
  const { phone, text, senderName, messageId, momment, isGroup } = data;
  
  // Ignore group messages for now
  if (isGroup) {
    console.log('👥 Ignoring group message');
    return;
  }
  
  // Clean phone number
  const cleanPhone = phone?.replace('@c.us', '').replace('@g.us', '');
  
  if (!cleanPhone || !text) {
    console.log('⚠️ Missing phone or text in message');
    return;
  }
  
  console.log(`📩 New message from ${senderName} (${cleanPhone}): ${text}`);
  
  try {
    // Find or create conversation
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();
    
    if (convError) {
      console.error('❌ Error finding conversation:', convError);
      throw convError;
    }
    
    if (!conversation) {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          phone: cleanPhone,
          name: senderName || cleanPhone,
          last_message: text,
          last_message_at: momment || new Date().toISOString(),
          unread_count: 1,
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating conversation:', createError);
        throw createError;
      }
      
      conversation = newConv;
      console.log('✅ Created new conversation:', conversation.id);
    }
    
    // Save the message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: text,
        sender_type: 'customer',
        message_id: messageId,
        status: 'delivered',
      })
      .select()
      .single();
    
    if (msgError) {
      console.error('❌ Error saving message:', msgError);
      throw msgError;
    }
    
    console.log('✅ Message saved:', message.id);
    
  } catch (err) {
    console.error('❌ Failed to process message:', err);
  }
}

async function handleMessageStatus(supabase: any, data: any) {
  const { messageId, status } = data;
  console.log(`📊 Message ${messageId} status: ${status}`);
  
  // Update message status in database
  if (messageId) {
    const { error } = await supabase
      .from('messages')
      .update({ status: status.toLowerCase() })
      .eq('message_id', messageId);
    
    if (error) {
      console.error('❌ Error updating message status:', error);
    }
  }
}