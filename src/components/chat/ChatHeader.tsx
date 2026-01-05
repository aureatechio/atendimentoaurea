import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const { contact, status, assignedTo } = conversation;
  
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const statusLabel = {
    new: 'Nova',
    active: 'Em atendimento',
    resolved: 'Resolvida',
  }[status];

  const statusVariant = {
    new: 'bg-status-new/10 text-status-new border-status-new/20',
    active: 'bg-status-active/10 text-status-active border-status-active/20',
    resolved: 'bg-muted text-muted-foreground border-border',
  }[status];

  return (
    <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
      {/* Avatar */}
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-foreground truncate">
            {contact.name}
          </h2>
          <Badge variant="outline" className={cn('text-[10px] font-medium border', statusVariant)}>
            {statusLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {contact.phone}
          {assignedTo && (
            <span className="ml-2">• Atendente: {assignedTo.name}</span>
          )}
        </p>
      </div>
    </header>
  );
}
