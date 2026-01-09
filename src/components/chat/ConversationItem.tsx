import { memo, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock } from 'lucide-react';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onFetchAvatar?: (conversationId: string, phone: string) => void;
}

export const ConversationItem = memo(function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onFetchAvatar,
}: ConversationItemProps) {
  const { contact, lastMessage, unreadCount, status, assignedTo } = conversation;
  
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Fetch avatar if not available
  useEffect(() => {
    if (!contact.avatar && onFetchAvatar && contact.phone) {
      onFetchAvatar(conversation.id, contact.phone);
    }
  }, [contact.avatar, contact.phone, conversation.id, onFetchAvatar]);

  const timeAgo = lastMessage
    ? formatDistanceToNow(lastMessage.createdAt, { addSuffix: false, locale: ptBR })
    : '';

  const statusColor = {
    new: 'bg-status-new',
    active: 'bg-status-active',
    resolved: 'bg-status-resolved',
  }[status];

  const getMessagePreview = () => {
    if (!lastMessage) return 'Sem mensagens';
    const prefix = lastMessage.isFromClient ? '' : 'Você: ';
    return prefix + lastMessage.content;
  };

  const getMessageStatus = () => {
    if (!lastMessage || lastMessage.isFromClient) return null;
    
    switch (lastMessage.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors',
        'hover:bg-sidebar-hover focus:outline-none focus-visible:bg-sidebar-hover',
        isSelected && 'bg-sidebar-accent'
      )}
    >
      {/* Avatar with status indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
          {contact.avatar && (
            <AvatarImage src={contact.avatar} alt={contact.name} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span 
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sidebar',
            statusColor
          )} 
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn(
            'font-medium text-sm truncate',
            unreadCount > 0 ? 'text-foreground' : 'text-foreground/90'
          )}>
            {contact.name}
          </span>
          <span className="text-[11px] text-muted-foreground flex-shrink-0">
            {timeAgo}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {getMessageStatus()}
            <p className={cn(
              'text-sm truncate',
              unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {getMessagePreview()}
            </p>
          </div>

          {unreadCount > 0 && (
            <Badge className="h-5 min-w-5 px-1.5 text-[11px] font-medium bg-badge-unread text-badge-foreground flex-shrink-0">
              {unreadCount}
            </Badge>
          )}
        </div>

        {/* Assigned agent indicator */}
        {assignedTo && status === 'active' && (
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            {assignedTo.name}
          </p>
        )}
      </div>
    </button>
  );
});
