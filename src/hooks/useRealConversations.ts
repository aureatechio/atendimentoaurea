import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from '@/lib/notificationSound';

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
}

export function useRealConversations() {
  const [conversations, setConversations] = useState<RealConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();

    // Subscribe to realtime changes
    const channel = supabase
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const markAsRead = useCallback(async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    if (error) {
      console.error('Error marking as read:', error);
    }
  }, []);

  return { conversations, loading, refetch: fetchConversations, markAsRead };
}

export function useRealMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<RealMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(m => ({
        ...m,
        sender_type: m.sender_type as 'customer' | 'agent',
      })));
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Subscribe to realtime messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('New message:', payload);
          const newMsg = payload.new as RealMessage;
          setMessages(prev => [...prev, {
            ...newMsg,
            sender_type: newMsg.sender_type as 'customer' | 'agent',
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !content.trim()) return;

    // Get conversation phone for sending
    const { data: conv } = await supabase
      .from('conversations')
      .select('phone')
      .eq('id', conversationId)
      .single();

    if (!conv) return;

    // Save message locally first
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: content.trim(),
        sender_type: 'agent',
        status: 'sending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      return;
    }

    // Send via Z-API
    try {
      const response = await fetch(
        `https://olifecuguxdfzwuzeaox.supabase.co/functions/v1/zapi-send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: conv.phone,
            message: content.trim(),
          }),
        }
      );

      const result = await response.json();
      
      // Update message status
      await supabase
        .from('messages')
        .update({ 
          status: result.success ? 'sent' : 'error',
          message_id: result.messageId,
        })
        .eq('id', message.id);

    } catch (err) {
      console.error('Error sending message:', err);
      await supabase
        .from('messages')
        .update({ status: 'error' })
        .eq('id', message.id);
    }
  }, [conversationId]);

  return { messages, loading, sendMessage, refetch: fetchMessages };
}