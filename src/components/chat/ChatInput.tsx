import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import { Send, Paperclip, Smile, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  conversationId: string;
}

export function ChatInput({ conversationId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const sendMessage = useChatStore((state) => state.sendMessage);
  const canSendMessage = useChatStore((state) => state.canSendMessage);
  const setAgentTyping = useChatStore((state) => state.setAgentTyping);
  
  const { allowed, reason } = canSendMessage(conversationId);

  // Handle typing indicator
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setAgentTyping(conversationId, false);
    };
  }, [conversationId, setAgentTyping]);

  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !allowed) return;
    
    // Clear typing indicator
    setAgentTyping(conversationId, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    sendMessage(conversationId, trimmedMessage);
    setMessage('');
    
    // Focus back on textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [message, allowed, sendMessage, conversationId, setAgentTyping]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea and handle typing indicator
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setMessage(textarea.value);
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    
    // Typing indicator logic
    if (textarea.value.trim()) {
      setAgentTyping(conversationId, true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to clear typing after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        setAgentTyping(conversationId, false);
      }, 2000);
    } else {
      setAgentTyping(conversationId, false);
    }
  }, [conversationId, setAgentTyping]);

  if (!allowed) {
    return (
      <div className="flex-shrink-0 px-4 py-3 bg-card border-t border-border">
        <div className="flex items-center gap-2 justify-center text-muted-foreground bg-muted/50 rounded-lg py-3 px-4">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{reason}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 px-4 py-3 bg-card border-t border-border">
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Input container */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className={cn(
              'min-h-[40px] max-h-[120px] py-2.5 px-4 pr-10 resize-none',
              'bg-chat-input-bg border-input rounded-2xl',
              'focus-visible:ring-1 focus-visible:ring-ring'
            )}
            rows={1}
          />
          
          {/* Emoji button inside input */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 bottom-1 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim()}
          size="icon"
          className="h-10 w-10 flex-shrink-0 rounded-full"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
