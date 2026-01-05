import { Skeleton } from '@/components/ui/skeleton';

export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="h-[49px] w-[49px] rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2 py-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

export function ConversationListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}
