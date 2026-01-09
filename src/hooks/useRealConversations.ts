import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from '@/lib/notificationSound';
import { toast } from 'sonner';

export interface RealConversation {
  id: string;
  phone: string;
  name: string | null;
  avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface RealMessage {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: 'customer' | 'agent';
  message_id: string | null;
  status: string;
  created_at: string;
  message_type: string;
  media_url: string | null;
  media_mime_type: string | null;
  media_caption: string | null;
}

export function useRealConversations() {
  const [conversations, setConversations] = useState<RealConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .not('last_message', 'is', null)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();

    // Cleanup existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('Conversation change:', payload);
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new as RealConversation, ...prev]);
            playNotificationSound();
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(c =>
                c.id === (payload.new as RealConversation).id
                  ? (payload.new as RealConversation)
                  : c
              ).sort((a, b) => 
                new Date(b.last_message_at || b.created_at).getTime() - 
                new Date(a.last_message_at || a.created_at).getTime()
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev =>
              prev.filter(c => c.id !== (payload.old as RealConversation).id)
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error');
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchConversations]);

  const markAsRead = useCallback(async (conversationId: string) => {
    // Optimistic update
    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
    );

    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    if (error) {
      console.error('Error marking as read:', error);
      // Revert on error
      fetchConversations();
    }
  }, [fetchConversations]);

  const fetchProfilePicture = useCallback(async (conversationId: string, phone: string) => {
    try {
      const response = await fetch(
        `https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-get-profile-picture`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, conversationId }),
        }
      );

      const result = await response.json();
      
      if (result.avatarUrl) {
        // Optimistic update
        setConversations(prev =>
          prev.map(c => c.id === conversationId ? { ...c, avatar_url: result.avatarUrl } : c)
        );
      }
      
      return result.avatarUrl;
    } catch (err) {
      console.error('Error fetching profile picture:', err);
      return null;
    }
  }, []);

  return { conversations, loading, error, refetch: fetchConversations, markAsRead, fetchProfilePicture };
}

export function useRealMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<RealMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setError(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setMessages((data || []).map(m => ({
        ...m,
        sender_type: m.sender_type as 'customer' | 'agent',
        message_type: m.message_type || 'text',
        media_url: m.media_url || null,
        media_mime_type: m.media_mime_type || null,
        media_caption: m.media_caption || null,
      })));
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Erro ao carregar mensagens');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Cleanup existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Message change:', payload);
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as RealMessage;
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                ...newMsg,
                sender_type: newMsg.sender_type as 'customer' | 'agent',
                message_type: newMsg.message_type || 'text',
              }];
            });
            // Play sound only for customer messages
            if (newMsg.sender_type === 'customer') {
              playNotificationSound();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as RealMessage;
            setMessages(prev => prev.map(m => 
              m.id === updatedMsg.id 
                ? { ...updatedMsg, sender_type: updatedMsg.sender_type as 'customer' | 'agent' }
                : m
            ));
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !content.trim()) {
      toast.error('Mensagem não pode estar vazia');
      return;
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('phone')
      .eq('id', conversationId)
      .single();

    if (!conv) {
      toast.error('Conversa não encontrada');
      return;
    }

    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: RealMessage = {
      id: tempId,
      conversation_id: conversationId,
      content: content.trim(),
      sender_type: 'agent',
      message_id: null,
      status: 'sending',
      created_at: new Date().toISOString(),
      message_type: 'text',
      media_url: null,
      media_mime_type: null,
      media_caption: null,
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMsg]);

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: content.trim(),
        sender_type: 'agent',
        status: 'sending',
        message_type: 'text',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      toast.error('Erro ao salvar mensagem');
      // Remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return;
    }

    // Replace optimistic message with real one
    setMessages(prev => prev.map(m => m.id === tempId ? {
      ...message,
      sender_type: message.sender_type as 'customer' | 'agent',
      message_type: message.message_type || 'text',
      media_url: null,
      media_mime_type: null,
      media_caption: null,
    } : m));

    try {
      const response = await fetch(
        `https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: conv.phone,
            message: content.trim(),
            messageType: 'text',
          }),
        }
      );

      const result = await response.json();
      
      const newStatus = result.success ? 'sent' : 'error';
      
      await supabase
        .from('messages')
        .update({ 
          status: newStatus,
          message_id: result.messageId,
        })
        .eq('id', message.id);

      if (!result.success) {
        toast.error('Erro ao enviar mensagem');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      await supabase
        .from('messages')
        .update({ status: 'error' })
        .eq('id', message.id);
      toast.error('Erro ao enviar mensagem');
    }
  }, [conversationId]);

  const sendMedia = useCallback(async (type: string, mediaUrl: string, caption?: string) => {
    if (!conversationId) {
      toast.error('Nenhuma conversa selecionada');
      return;
    }

    if (!mediaUrl) {
      toast.error('URL da mídia inválida');
      return;
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('phone')
      .eq('id', conversationId)
      .single();

    if (!conv) {
      toast.error('Conversa não encontrada');
      return;
    }

    const contentMap: Record<string, string> = {
      image: caption || '📷 Imagem',
      audio: '🎵 Áudio',
      video: caption || '🎬 Vídeo',
      document: `📄 ${caption || 'Documento'}`,
    };

    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: RealMessage = {
      id: tempId,
      conversation_id: conversationId,
      content: contentMap[type] || '[Mídia]',
      sender_type: 'agent',
      message_id: null,
      status: 'sending',
      created_at: new Date().toISOString(),
      message_type: type,
      media_url: mediaUrl,
      media_mime_type: null,
      media_caption: caption || null,
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: contentMap[type] || '[Mídia]',
        sender_type: 'agent',
        status: 'sending',
        message_type: type,
        media_url: mediaUrl,
        media_caption: caption,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      toast.error('Erro ao salvar mídia');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return;
    }

    // Replace optimistic message
    setMessages(prev => prev.map(m => m.id === tempId ? {
      ...message,
      sender_type: message.sender_type as 'customer' | 'agent',
      message_type: message.message_type || type,
      media_url: message.media_url || mediaUrl,
      media_mime_type: message.media_mime_type,
      media_caption: message.media_caption,
    } : m));

    try {
      const response = await fetch(
        `https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: conv.phone,
            messageType: type,
            mediaUrl: mediaUrl,
            caption: caption,
          }),
        }
      );

      const result = await response.json();
      
      await supabase
        .from('messages')
        .update({ 
          status: result.success ? 'sent' : 'error',
          message_id: result.messageId,
        })
        .eq('id', message.id);

      if (!result.success) {
        toast.error('Erro ao enviar mídia');
      }
    } catch (err) {
      console.error('Error sending media:', err);
      await supabase
        .from('messages')
        .update({ status: 'error' })
        .eq('id', message.id);
      toast.error('Erro ao enviar mídia');
    }
  }, [conversationId]);

  return { messages, loading, error, sendMessage, sendMedia, refetch: fetchMessages };
}
