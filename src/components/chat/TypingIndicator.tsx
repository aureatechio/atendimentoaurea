import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex justify-start mb-2', className)}>
      <div className="bg-[hsl(var(--chat-bubble-incoming))] rounded-lg rounded-tl-none px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span 
            className="w-2 h-2 rounded-full bg-[hsl(var(--whatsapp-icon))] animate-typing"
            style={{ animationDelay: '0ms' }}
          />
          <span 
            className="w-2 h-2 rounded-full bg-[hsl(var(--whatsapp-icon))] animate-typing"
            style={{ animationDelay: '200ms' }}
          />
          <span 
            className="w-2 h-2 rounded-full bg-[hsl(var(--whatsapp-icon))] animate-typing"
            style={{ animationDelay: '400ms' }}
          />
        </div>
      </div>
    </div>
  );
}
