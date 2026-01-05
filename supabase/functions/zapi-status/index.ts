import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
    const token = Deno.env.get('ZAPI_TOKEN');
    
    if (!instanceId || !token) {
      console.error('❌ Z-API credentials not configured');
      return new Response(JSON.stringify({ 
        connected: false,
        error: 'Z-API credentials not configured' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    let zapiUrl: string;
    let method = 'GET';

    switch (action) {
      case 'status':
        zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/status`;
        break;
      case 'qrcode':
        zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/qr-code/image`;
        break;
      case 'disconnect':
        zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/disconnect`;
        method = 'GET';
        break;
      case 'restart':
        zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/restart`;
        method = 'GET';
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`📱 Z-API action: ${action}`);

    const response = await fetch(zapiUrl, { method });
    
    // For QR code, return the image data
    if (action === 'qrcode') {
      const data = await response.json();
      console.log('📷 QR Code response:', JSON.stringify(data, null, 2));
      
      return new Response(JSON.stringify({
        qrcode: data.value || null,
        connected: data.connected || false,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log(`📊 Z-API ${action} response:`, JSON.stringify(result, null, 2));

    // Parse status response
    if (action === 'status') {
      const isConnected = result.connected === true;
      const smartphoneConnected = result.smartphoneConnected === true;
      
      return new Response(JSON.stringify({
        connected: isConnected,
        smartphoneConnected,
        session: result.session || null,
        error: result.error || null,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Status check error:', errorMessage);
    return new Response(JSON.stringify({ 
      connected: false,
      error: errorMessage 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
