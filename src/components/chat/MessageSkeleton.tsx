import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function MessageSkeleton({ isOutgoing = false }: { isOutgoing?: boolean }) {
  return (
    <div className={cn('flex mb-2', isOutgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'rounded-lg px-3 py-2 space-y-2',
          isOutgoing ? 'bg-[#005c4b]' : 'bg-[#202c33]'
        )}
      >
        <Skeleton className="h-4 w-40 bg-[#2a3942]" />
        <div className="flex justify-end">
          <Skeleton className="h-3 w-12 bg-[#2a3942]" />
        </div>
      </div>
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse p-4">
      <MessageSkeleton isOutgoing={false} />
      <MessageSkeleton isOutgoing={true} />
      <MessageSkeleton isOutgoing={false} />
      <MessageSkeleton isOutgoing={true} />
      <MessageSkeleton isOutgoing={false} />
    </div>
  );
}
