import { useRef, useEffect, useState, useCallback } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import { TypingIndicator } from './TypingIndicator';
import { Button } from '@/components/ui/button';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatArea() {
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const getSelectedConversation = useChatStore((state) => state.getSelectedConversation);
  const getMessages = useChatStore((state) => state.getMessages);
  const agentTyping = useChatStore((state) => state.agentTyping);
  
  const conversation = getSelectedConversation();
  const messages = selectedConversationId ? getMessages(selectedConversationId) : [];
  const isTyping = selectedConversationId ? agentTyping[selectedConversationId] : false;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  
  // Smart scroll - only auto-scroll if user is near bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Check scroll position
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;
    
    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom && distanceFromBottom > 300);
  }, []);

  // Auto-scroll when new messages arrive (only if near bottom)
  useEffect(() => {
    if (isNearBottom && messages.length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length, isNearBottom, scrollToBottom]);

  // Scroll to bottom when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      setTimeout(() => scrollToBottom('auto'), 0);
    }
  }, [selectedConversationId, scrollToBottom]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <div className="bg-muted/50 rounded-full p-6 mb-4">
          <MessageSquare className="h-12 w-12 opacity-50" />
        </div>
        <h2 className="text-lg font-medium text-foreground mb-1">Selecione uma conversa</h2>
        <p className="text-sm">Escolha uma conversa na lista para começar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ChatHeader conversation={conversation} />

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin"
      >
        {messages.map((message, index) => {
          const prevMessage = messages[index - 1];
          const showAvatar = !prevMessage || prevMessage.isFromClient !== message.isFromClient;
          
          return (
            <MessageBubble 
              key={message.id} 
              message={message} 
              showAvatar={showAvatar}
            />
          );
        })}
        
        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-24 right-8 z-10">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => scrollToBottom('smooth')}
            className="h-10 w-10 rounded-full shadow-lg bg-card border border-border"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Input */}
      <ChatInput conversationId={conversation.id} />
    </div>
  );
}
