import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { phone, message, messageType = 'text', mediaUrl, caption } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formattedPhone = formatPhoneNumber(phone);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientToken) {
      headers['Client-Token'] = clientToken;
    }

    let zapiUrl: string;
    let body: Record<string, any>;

    switch (messageType) {
      case 'image':
        zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-image`;
        body = {
          phone: formattedPhone,
          image: mediaUrl,
          caption: caption || '',
        };
        console.log(`📷 Sending image to ${formattedPhone}`);
        break;

      case 'audio':
        zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-audio`;
        body = {
          phone: formattedPhone,
          audio: mediaUrl,
        };
        console.log(`🎵 Sending audio to ${formattedPhone}`);
        break;

      case 'video':
        zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-video`;
        body = {
          phone: formattedPhone,
          video: mediaUrl,
          caption: caption || '',
        };
        console.log(`🎬 Sending video to ${formattedPhone}`);
        break;

      case 'document':
        zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-document/pdf`;
        body = {
          phone: formattedPhone,
          document: mediaUrl,
          fileName: caption || 'document',
        };
        console.log(`📄 Sending document to ${formattedPhone}`);
        break;

      default: // text
        if (!message) {
          return new Response(JSON.stringify({ error: 'Message is required for text type' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
        body = {
          phone: formattedPhone,
          message,
        };
        console.log(`📤 Sending text to ${formattedPhone}: ${message.substring(0, 50)}...`);
    }

    const response = await fetch(zapiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log('📨 Z-API response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      return new Response(JSON.stringify({ error: result.message || 'Failed to send message' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: result.messageId,
      zapiMessageId: result.zapiMessageId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Send message error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 || cleaned.length === 10) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}