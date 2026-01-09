import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

export interface ConversationTag {
  id: string;
  conversation_id: string;
  tag_id: string;
  applied_at: string;
  applied_by: string | null;
  tag: Tag;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();

    // Realtime subscription for tags
    const channel = supabase
      .channel('tags-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags' },
        () => fetchTags()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTags]);

  return { tags, loading, refetch: fetchTags };
}

export function useConversationTags(conversationId: string | null) {
  const [conversationTags, setConversationTags] = useState<ConversationTag[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchConversationTags = useCallback(async () => {
    if (!conversationId) {
      setConversationTags([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversation_tags')
        .select(`
          id,
          conversation_id,
          tag_id,
          applied_at,
          applied_by,
          tag:tags (
            id,
            name,
            color,
            description
          )
        `)
        .eq('conversation_id', conversationId);

      if (error) throw error;

      // Flatten the nested tag object
      const flattenedData = (data || []).map(ct => ({
        ...ct,
        tag: ct.tag as unknown as Tag,
      }));

      setConversationTags(flattenedData);
    } catch (err) {
      console.error('Error fetching conversation tags:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchConversationTags();

    if (!conversationId) return;

    // Cleanup existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Realtime subscription for conversation tags
    channelRef.current = supabase
      .channel(`conversation-tags-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_tags',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => fetchConversationTags()
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, fetchConversationTags]);

  const addTag = useCallback(async (tagId: string) => {
    if (!conversationId) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('conversation_tags')
        .insert({
          conversation_id: conversationId,
          tag_id: tagId,
          applied_by: user?.user?.id || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Tag já aplicada a esta conversa');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Tag adicionada');
    } catch (err) {
      console.error('Error adding tag:', err);
      toast.error('Erro ao adicionar tag');
    }
  }, [conversationId]);

  const removeTag = useCallback(async (tagId: string) => {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from('conversation_tags')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('tag_id', tagId);

      if (error) throw error;

      toast.success('Tag removida');
    } catch (err) {
      console.error('Error removing tag:', err);
      toast.error('Erro ao remover tag');
    }
  }, [conversationId]);

  return {
    conversationTags,
    loading,
    addTag,
    removeTag,
    refetch: fetchConversationTags,
  };
}

// Hook to get all conversation tags for listing (used in sidebar)
export function useAllConversationTags() {
  const [tagsMap, setTagsMap] = useState<Map<string, Tag[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchAllTags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_tags')
        .select(`
          conversation_id,
          tag:tags (
            id,
            name,
            color,
            description
          )
        `);

      if (error) throw error;

      const newMap = new Map<string, Tag[]>();
      (data || []).forEach(ct => {
        const tag = ct.tag as unknown as Tag;
        if (!tag) return;
        
        const existing = newMap.get(ct.conversation_id) || [];
        existing.push(tag);
        newMap.set(ct.conversation_id, existing);
      });

      setTagsMap(newMap);
    } catch (err) {
      console.error('Error fetching all conversation tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTags();

    // Cleanup existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Realtime subscription
    channelRef.current = supabase
      .channel('all-conversation-tags')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_tags' },
        () => fetchAllTags()
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchAllTags]);

  const getTagsForConversation = useCallback((conversationId: string): Tag[] => {
    return tagsMap.get(conversationId) || [];
  }, [tagsMap]);

  return { tagsMap, getTagsForConversation, loading, refetch: fetchAllTags };
}
