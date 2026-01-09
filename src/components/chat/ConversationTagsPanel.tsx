import { useState } from 'react';
import { X, Plus, Tag as TagIcon, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useConversationTags, useTags, Tag } from '@/hooks/useConversationTags';
import { cn } from '@/lib/utils';

interface ConversationTagsPanelProps {
  conversationId: string;
  compact?: boolean;
}

export function ConversationTagsPanel({ conversationId, compact = false }: ConversationTagsPanelProps) {
  const { conversationTags, addTag, removeTag, loading: tagsLoading } = useConversationTags(conversationId);
  const { tags: allTags, loading: allTagsLoading } = useTags();
  const [isOpen, setIsOpen] = useState(false);

  const appliedTagIds = new Set(conversationTags.map(ct => ct.tag_id));
  const availableTags = allTags.filter(t => !appliedTagIds.has(t.id));

  const handleAddTag = async (tagId: string) => {
    await addTag(tagId);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {conversationTags.slice(0, 2).map(ct => (
          <span
            key={ct.id}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: `${ct.tag.color}20`,
              color: ct.tag.color,
            }}
          >
            {ct.tag.name}
          </span>
        ))}
        {conversationTags.length > 2 && (
          <span className="text-[10px] text-[#8696a0]">
            +{conversationTags.length - 2}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Applied tags */}
      {conversationTags.map(ct => (
        <Badge
          key={ct.id}
          variant="secondary"
          className="h-6 px-2 gap-1 text-xs font-medium rounded-full cursor-default group"
          style={{
            backgroundColor: `${ct.tag.color}25`,
            color: ct.tag.color,
            border: `1px solid ${ct.tag.color}40`,
          }}
        >
          {ct.tag.name}
          <button
            onClick={() => removeTag(ct.tag_id)}
            className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Add tag button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374045] rounded-full gap-1"
          >
            <Plus className="h-3 w-3" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-2 bg-[#233138] border-none shadow-xl"
          align="start"
        >
          <div className="space-y-1">
            <p className="text-xs text-[#8696a0] px-2 py-1">Adicionar tag</p>
            {allTagsLoading ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">Carregando...</p>
            ) : availableTags.length === 0 ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">
                {allTags.length === 0 ? 'Nenhuma tag cadastrada' : 'Todas as tags já aplicadas'}
              </p>
            ) : (
              availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#374045] transition-colors text-left"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm text-[#e9edef] truncate">{tag.name}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Compact tag display for conversation list
export function ConversationTagsBadges({ conversationId, tags }: { conversationId: string; tags: Tag[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      {tags.slice(0, 2).map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
          }}
        >
          {tag.name}
        </span>
      ))}
      {tags.length > 2 && (
        <span className="text-[10px] text-[#8696a0] ml-0.5">
          +{tags.length - 2}
        </span>
      )}
    </div>
  );
}
