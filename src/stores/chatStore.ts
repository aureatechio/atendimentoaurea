import { create } from 'zustand';
import { Conversation, Message, ConversationFilter, ConversationStatus } from '@/types/chat';
import { conversations as initialConversations, messagesByConversation, currentUser, agents } from '@/data/mockData';

interface ChatState {
  // Data
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  
  // UI State
  selectedConversationId: string | null;
  filter: ConversationFilter;
  searchQuery: string;
  isSearchOpen: boolean;
  typingConversations: Set<string>; // conversations where client is typing
  agentTyping: Record<string, boolean>; // agent typing per conversation
  
  // Actions
  selectConversation: (id: string | null) => void;
  setFilter: (filter: ConversationFilter) => void;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  setAgentTyping: (conversationId: string, isTyping: boolean) => void;
  
  // Message actions
  sendMessage: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string) => void;
  
  // Conversation actions
  assignConversation: (conversationId: string) => void;
  transferConversation: (conversationId: string, toAgentId: string) => void;
  closeConversation: (conversationId: string) => void;
  addTag: (conversationId: string, tag: string) => void;
  removeTag: (conversationId: string, tag: string) => void;
  
  // Computed
  getFilteredConversations: () => Conversation[];
  getSelectedConversation: () => Conversation | undefined;
  getMessages: (conversationId: string) => Message[];
  canSendMessage: (conversationId: string) => { allowed: boolean; reason?: string };
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  conversations: initialConversations,
  messages: messagesByConversation,
  selectedConversationId: null,
  filter: 'all',
  searchQuery: '',
  isSearchOpen: false,
  typingConversations: new Set(),
  agentTyping: {},
  
  // Actions
  selectConversation: (id) => {
    set({ selectedConversationId: id });
    if (id) {
      get().markAsRead(id);
    }
  },
  
  setFilter: (filter) => set({ filter }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  
  setAgentTyping: (conversationId, isTyping) => {
    set(state => ({
      agentTyping: { ...state.agentTyping, [conversationId]: isTyping }
    }));
  },
  
  sendMessage: (conversationId, content) => {
    const { canSendMessage, messages, conversations } = get();
    const check = canSendMessage(conversationId);
    
    if (!check.allowed) return;
    
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      content,
      type: 'text',
      isFromClient: false,
      senderId: currentUser.id,
      status: 'sending',
      createdAt: new Date(),
    };
    
    // Optimistic update
    const conversationMessages = messages[conversationId] || [];
    set({
      messages: {
        ...messages,
        [conversationId]: [...conversationMessages, newMessage],
      },
      conversations: conversations.map(c => 
        c.id === conversationId 
          ? { ...c, lastMessage: newMessage, updatedAt: new Date() }
          : c
      ),
    });
    
    // Simulate network delay and status update
    setTimeout(() => {
      const currentMessages = get().messages[conversationId];
      set({
        messages: {
          ...get().messages,
          [conversationId]: currentMessages.map(m => 
            m.id === newMessage.id ? { ...m, status: 'sent' as const } : m
          ),
        },
      });
      
      // Simulate delivered status
      setTimeout(() => {
        const msgs = get().messages[conversationId];
        set({
          messages: {
            ...get().messages,
            [conversationId]: msgs.map(m => 
              m.id === newMessage.id ? { ...m, status: 'delivered' as const } : m
            ),
          },
        });
      }, 500);
    }, 300);
  },
  
  markAsRead: (conversationId) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },
  
  assignConversation: (conversationId) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId
          ? { ...c, assignedTo: currentUser, status: 'active' as ConversationStatus }
          : c
      ),
    }));
  },
  
  transferConversation: (conversationId, toAgentId) => {
    const agent = agents.find(a => a.id === toAgentId);
    if (!agent) return;
    
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId
          ? { ...c, assignedTo: agent }
          : c
      ),
    }));
  },
  
  closeConversation: (conversationId) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId
          ? { ...c, status: 'resolved' as ConversationStatus }
          : c
      ),
    }));
  },
  
  addTag: (conversationId, tag) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId && !c.tags.includes(tag)
          ? { ...c, tags: [...c.tags, tag] }
          : c
      ),
    }));
  },
  
  removeTag: (conversationId, tag) => {
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId
          ? { ...c, tags: c.tags.filter(t => t !== tag) }
          : c
      ),
    }));
  },
  
  // Computed
  getFilteredConversations: () => {
    const { conversations, filter, searchQuery } = get();
    
    let filtered = [...conversations];
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(c => c.status === filter);
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.contact.name.toLowerCase().includes(query) ||
        c.contact.phone.includes(query)
      );
    }
    
    // Sort by updatedAt (newest first)
    filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    return filtered;
  },
  
  getSelectedConversation: () => {
    const { conversations, selectedConversationId } = get();
    return conversations.find(c => c.id === selectedConversationId);
  },
  
  getMessages: (conversationId) => {
    return get().messages[conversationId] || [];
  },
  
  canSendMessage: (conversationId) => {
    const conversation = get().conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      return { allowed: false, reason: 'Conversa não encontrada' };
    }
    
    if (conversation.status === 'resolved') {
      return { allowed: false, reason: 'Conversa finalizada' };
    }
    
    if (!conversation.assignedTo) {
      return { allowed: false, reason: 'Assuma a conversa para enviar mensagens' };
    }
    
    if (conversation.assignedTo.id !== currentUser.id && currentUser.role !== 'admin') {
      return { allowed: false, reason: `Em atendimento por ${conversation.assignedTo.name}` };
    }
    
    return { allowed: true };
  },
}));
