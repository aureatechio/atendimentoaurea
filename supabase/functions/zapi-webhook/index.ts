import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-client-token',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');
    
    // Validate client token if configured
    if (clientToken) {
      const requestToken = req.headers.get('x-client-token');
      if (requestToken !== clientToken) {
        console.log('❌ Invalid client token received');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json();
    console.log('📨 Webhook received:', JSON.stringify(body, null, 2));

    // Z-API webhook types
    const { type } = body;

    switch (type) {
      case 'ReceivedCallback':
        await handleReceivedMessage(body);
        break;
      case 'MessageStatusCallback':
        await handleMessageStatus(body);
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

async function handleReceivedMessage(data: any) {
  const { phone, text, senderName, messageId, momment } = data;
  
  console.log(`📩 New message from ${senderName} (${phone}): ${text}`);
  
  // Here you would typically:
  // 1. Find or create the conversation in database
  // 2. Store the message
  // 3. Trigger realtime update
  
  // For now, just log it
  const messageData = {
    phone: phone?.replace('@c.us', ''),
    senderName,
    text,
    messageId,
    receivedAt: momment || new Date().toISOString(),
  };
  
  console.log('💾 Message data:', JSON.stringify(messageData, null, 2));
}

async function handleMessageStatus(data: any) {
  const { messageId, status } = data;
  console.log(`📊 Message ${messageId} status: ${status}`);
  
  // Status can be: PENDING, SENT, RECEIVED, READ, PLAYED
}
