import { useState } from 'react';
import { X, AlertCircle, User } from 'lucide-react';
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

// Helper to determine if a tag is a priority tag (starts with emoji)
const isPriorityTag = (tag: Tag) => {
  return tag.name.startsWith('🔴') || tag.name.startsWith('🟡') || tag.name.startsWith('🟢');
};

export function ConversationTagsPanel({ conversationId, compact = false }: ConversationTagsPanelProps) {
  const { conversationTags, addTag, removeTag, loading: tagsLoading } = useConversationTags(conversationId);
  const { tags: allTags, loading: allTagsLoading } = useTags();
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  const appliedTagIds = new Set(conversationTags.map(ct => ct.tag_id));
  
  // Separate tags by type
  const priorityTags = allTags.filter(t => isPriorityTag(t));
  const agentTags = allTags.filter(t => !isPriorityTag(t));
  
  const availablePriorityTags = priorityTags.filter(t => !appliedTagIds.has(t.id));
  const availableAgentTags = agentTags.filter(t => !appliedTagIds.has(t.id));
  
  // Applied tags separated
  const appliedPriorityTags = conversationTags.filter(ct => isPriorityTag(ct.tag));
  const appliedAgentTags = conversationTags.filter(ct => !isPriorityTag(ct.tag));

  const handleAddPriorityTag = async (tagId: string) => {
    await addTag(tagId);
    setPriorityOpen(false);
  };

  const handleAddAgentTag = async (tagId: string) => {
    await addTag(tagId);
    setAgentOpen(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {conversationTags.slice(0, 3).map(ct => (
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
        {conversationTags.length > 3 && (
          <span className="text-[10px] text-[#8696a0]">
            +{conversationTags.length - 3}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Applied priority tags */}
      {appliedPriorityTags.map(ct => (
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

      {/* Applied agent tags */}
      {appliedAgentTags.map(ct => (
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

      {/* Priority selector */}
      <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-xs hover:text-[#e9edef] hover:bg-[#374045] rounded-full gap-1",
              appliedPriorityTags.length > 0 ? "text-[#8696a0]" : "text-[#aebac1]"
            )}
          >
            <AlertCircle className="h-3 w-3" />
            {appliedPriorityTags.length === 0 && "Prioridade"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-2 bg-[#233138] border-none shadow-xl"
          align="start"
        >
          <div className="space-y-1">
            <p className="text-xs text-[#8696a0] px-2 py-1 font-medium">Prioridade</p>
            {allTagsLoading ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">Carregando...</p>
            ) : availablePriorityTags.length === 0 ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">
                {priorityTags.length === 0 ? 'Nenhuma prioridade' : 'Prioridade já definida'}
              </p>
            ) : (
              availablePriorityTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleAddPriorityTag(tag.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#374045] transition-colors text-left"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm text-[#e9edef]">{tag.name}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Agent selector */}
      <Popover open={agentOpen} onOpenChange={setAgentOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-xs hover:text-[#e9edef] hover:bg-[#374045] rounded-full gap-1",
              appliedAgentTags.length > 0 ? "text-[#8696a0]" : "text-[#aebac1]"
            )}
          >
            <User className="h-3 w-3" />
            {appliedAgentTags.length === 0 && "Atendente"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-2 bg-[#233138] border-none shadow-xl"
          align="start"
        >
          <div className="space-y-1">
            <p className="text-xs text-[#8696a0] px-2 py-1 font-medium">Atendente</p>
            {allTagsLoading ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">Carregando...</p>
            ) : availableAgentTags.length === 0 ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">
                {agentTags.length === 0 ? 'Nenhum atendente' : 'Atendente já definido'}
              </p>
            ) : (
              availableAgentTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleAddAgentTag(tag.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#374045] transition-colors text-left"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm text-[#e9edef]">{tag.name}</span>
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

  // Separate and prioritize: show priority first, then agent
  const priorityTags = tags.filter(t => isPriorityTag(t));
  const agentTags = tags.filter(t => !isPriorityTag(t));
  const orderedTags = [...priorityTags, ...agentTags];

  return (
    <div className="flex items-center gap-1 mt-1">
      {orderedTags.slice(0, 3).map(tag => (
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
      {orderedTags.length > 3 && (
        <span className="text-[10px] text-[#8696a0] ml-0.5">
          +{orderedTags.length - 3}
        </span>
      )}
    </div>
  );
}
