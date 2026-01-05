import { memo } from 'react';
import { format } from 'date-fns';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  showAvatar = true,
}: MessageBubbleProps) {
  const { content, isFromClient, status, createdAt } = message;
  const time = format(createdAt, 'HH:mm');

  const getStatusIcon = () => {
    if (isFromClient) return null;
    
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse-soft" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex animate-fade-in',
        isFromClient ? 'justify-start' : 'justify-end',
        !showAvatar && 'mt-0.5'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-3 py-2 shadow-sm',
          isFromClient
            ? 'bg-chat-bubble-incoming text-foreground rounded-tl-sm'
            : 'bg-chat-bubble-outgoing text-foreground rounded-tr-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isFromClient ? 'justify-end' : 'justify-end'
        )}>
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
});
