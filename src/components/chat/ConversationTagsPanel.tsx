import { useState } from 'react';
import { AlertCircle, User, Check } from 'lucide-react';
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
  const { conversationTags, removeTag, replaceTag, loading: tagsLoading } = useConversationTags(conversationId);
  const { tags: allTags, loading: allTagsLoading } = useTags();
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);

  // Separate tags by type
  const priorityTags = allTags.filter(t => isPriorityTag(t));
  const agentTags = allTags.filter(t => !isPriorityTag(t));
  
  // Applied tags separated
  const appliedPriorityTags = conversationTags.filter(ct => isPriorityTag(ct.tag));
  const appliedAgentTags = conversationTags.filter(ct => !isPriorityTag(ct.tag));
  
  // Current applied tag for each category (only one allowed)
  const currentPriorityTag = appliedPriorityTags[0]?.tag || null;
  const currentAgentTag = appliedAgentTags[0]?.tag || null;

  // Handle priority tag change
  const handleChangePriorityTag = async (tagId: string) => {
    // If clicking the same tag, just remove it
    if (currentPriorityTag?.id === tagId) {
      await removeTag(tagId);
    } else {
      // Use replaceTag for atomic operation
      await replaceTag(currentPriorityTag?.id || null, tagId);
    }
    setPriorityOpen(false);
  };

  // Handle agent tag change
  const handleChangeAgentTag = async (tagId: string) => {
    // If clicking the same tag, just remove it
    if (currentAgentTag?.id === tagId) {
      await removeTag(tagId);
    } else {
      // Use replaceTag for atomic operation
      await replaceTag(currentAgentTag?.id || null, tagId);
    }
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
      {/* Priority selector - shows current or placeholder */}
      <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
        <PopoverTrigger asChild>
          {currentPriorityTag ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs font-medium rounded-full gap-1 hover:opacity-80"
              style={{
                backgroundColor: `${currentPriorityTag.color}25`,
                color: currentPriorityTag.color,
                border: `1px solid ${currentPriorityTag.color}40`,
              }}
            >
              {currentPriorityTag.name}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374045] rounded-full gap-1"
            >
              <AlertCircle className="h-3 w-3" />
              Prioridade
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-2 bg-[#233138] border-none shadow-xl"
          align="start"
        >
          <div className="space-y-1">
            <p className="text-xs text-[#8696a0] px-2 py-1 font-medium">Selecionar prioridade</p>
            {allTagsLoading ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">Carregando...</p>
            ) : priorityTags.length === 0 ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">Nenhuma prioridade cadastrada</p>
            ) : (
              priorityTags.map(tag => {
                const isSelected = currentPriorityTag?.id === tag.id;
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleChangePriorityTag(tag.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-left",
                      isSelected ? "bg-[#374045]" : "hover:bg-[#374045]"
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm text-[#e9edef] flex-1">{tag.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#00a884]" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Agent selector - shows current or placeholder */}
      <Popover open={agentOpen} onOpenChange={setAgentOpen}>
        <PopoverTrigger asChild>
          {currentAgentTag ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs font-medium rounded-full gap-1 hover:opacity-80"
              style={{
                backgroundColor: `${currentAgentTag.color}25`,
                color: currentAgentTag.color,
                border: `1px solid ${currentAgentTag.color}40`,
              }}
            >
              {currentAgentTag.name}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374045] rounded-full gap-1"
            >
              <User className="h-3 w-3" />
              Atendente
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-2 bg-[#233138] border-none shadow-xl"
          align="start"
        >
          <div className="space-y-1">
            <p className="text-xs text-[#8696a0] px-2 py-1 font-medium">Selecionar atendente</p>
            {allTagsLoading ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">Carregando...</p>
            ) : agentTags.length === 0 ? (
              <p className="text-xs text-[#8696a0] px-2 py-2">Nenhum atendente cadastrado</p>
            ) : (
              agentTags.map(tag => {
                const isSelected = currentAgentTag?.id === tag.id;
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleChangeAgentTag(tag.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-left",
                      isSelected ? "bg-[#374045]" : "hover:bg-[#374045]"
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm text-[#e9edef] flex-1">{tag.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-[#00a884]" />}
                  </button>
                );
              })
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
  
  // Only show first of each category (since we only allow one per category)
  const displayTags = [
    ...priorityTags.slice(0, 1),
    ...agentTags.slice(0, 1),
  ];

  return (
    <div className="flex items-center gap-1 mt-1">
      {displayTags.map(tag => (
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
    </div>
  );
}
