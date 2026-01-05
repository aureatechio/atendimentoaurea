import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ZAPIStatus {
  connected: boolean;
  smartphoneConnected?: boolean;
  session?: string | null;
  error?: string | null;
  qrcode?: string | null;
}

export function useZAPIConnection() {
  const [status, setStatus] = useState<ZAPIStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('zapi-status', {
        body: {},
      });

      if (error) {
        console.error('Error checking Z-API status:', error);
        setStatus({ connected: false, error: error.message });
        return;
      }

      console.log('Z-API status:', data);
      setStatus(data);
    } catch (err) {
      console.error('Failed to check status:', err);
      setStatus({ connected: false, error: 'Failed to check status' });
    } finally {
      setLoading(false);
    }
  }, []);

  const getQRCode = useCallback(async () => {
    try {
      setQrLoading(true);
      const { data, error } = await supabase.functions.invoke('zapi-status', {
        body: {},
        headers: { 'action': 'qrcode' }
      });

      // Use query params approach
      const response = await fetch(
        `https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-status?action=qrcode`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      console.log('QR Code result:', result);

      if (result.connected) {
        setStatus(prev => ({ ...prev, connected: true, qrcode: null }));
      } else if (result.qrcode) {
        setStatus(prev => ({ ...prev, qrcode: result.qrcode }));
      }
      
      return result;
    } catch (err) {
      console.error('Failed to get QR code:', err);
      return null;
    } finally {
      setQrLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const response = await fetch(
        `https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-status?action=disconnect`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      console.log('Disconnect result:', result);
      
      // Refresh status
      await checkStatus();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  }, [checkStatus]);

  const restart = useCallback(async () => {
    try {
      const response = await fetch(
        `https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-status?action=restart`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      console.log('Restart result:', result);
      
      // Wait and refresh status
      setTimeout(() => checkStatus(), 3000);
    } catch (err) {
      console.error('Failed to restart:', err);
    }
  }, [checkStatus]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    loading,
    qrLoading,
    checkStatus,
    getQRCode,
    disconnect,
    restart,
  };
}
