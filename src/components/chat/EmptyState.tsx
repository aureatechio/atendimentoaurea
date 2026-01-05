import { MessageSquare, Inbox, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: 'no-conversations' | 'no-messages' | 'no-results';
  searchQuery?: string;
  className?: string;
}

export function EmptyState({ type, searchQuery, className }: EmptyStateProps) {
  const config = {
    'no-conversations': {
      icon: Inbox,
      title: 'Nenhuma conversa',
      description: 'Suas conversas aparecerão aqui',
      hint: 'Clique em ⬇️ para sincronizar',
    },
    'no-messages': {
      icon: MessageSquare,
      title: 'Inicie uma conversa',
      description: 'As mensagens são criptografadas de ponta a ponta',
      hint: 'Digite uma mensagem abaixo',
    },
    'no-results': {
      icon: Search,
      title: 'Nenhum resultado',
      description: `Nenhuma conversa encontrada para "${searchQuery}"`,
      hint: 'Tente buscar por outro termo',
    },
  };

  const { icon: Icon, title, description, hint } = config[type];

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center px-8 py-12 animate-fade-in',
      className
    )}>
      <div className="w-16 h-16 rounded-full bg-[hsl(var(--whatsapp-hover))] flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-[hsl(var(--whatsapp-icon))]" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-[hsl(var(--whatsapp-time))] mb-2 max-w-[250px]">
        {description}
      </p>
      {hint && (
        <p className="text-xs text-[hsl(var(--whatsapp-icon))]">{hint}</p>
      )}
    </div>
  );
}
