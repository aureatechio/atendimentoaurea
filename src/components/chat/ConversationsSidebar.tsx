import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChatStore } from '@/stores/chatStore';
import { ConversationItem } from './ConversationItem';
import { ConversationFilter } from '@/types/chat';
import { cn } from '@/lib/utils';

const filters: { label: string; value: ConversationFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Novas', value: 'new' },
  { label: 'Em atendimento', value: 'active' },
  { label: 'Resolvidas', value: 'resolved' },
];

export function ConversationsSidebar() {
  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setSearchOpen,
    getFilteredConversations,
    selectedConversationId,
    selectConversation,
  } = useChatStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const conversations = getFilteredConversations();
  
  // Count by status for badges
  const counts = useMemo(() => {
    const all = useChatStore.getState().conversations;
    return {
      new: all.filter(c => c.status === 'new').length,
      active: all.filter(c => c.status === 'active').length,
      resolved: all.filter(c => c.status === 'resolved').length,
    };
  }, [conversations]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      // Escape to close search
      if (e.key === 'Escape' && isSearchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen, setSearchQuery]);

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, [setSearchOpen, setSearchQuery]);

  return (
    <>
      {/* Header */}
      <header className="flex-shrink-0 p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-foreground">Conversas</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
            className="h-8 w-8"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        {isSearchOpen && (
          <div className="relative mb-3 animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 bg-sidebar-accent"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearchClose}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hidden pb-1">
          {filters.map((f) => {
            const count = f.value === 'all' ? null : counts[f.value];
            const isActive = filter === f.value;
            
            return (
              <Button
                key={f.value}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f.value)}
                className={cn(
                  'h-7 px-3 text-xs font-medium whitespace-nowrap gap-1.5',
                  isActive && 'bg-primary text-primary-foreground',
                  !isActive && 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
                {count !== null && count > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      'h-4 min-w-4 px-1 text-[10px] font-medium',
                      isActive && 'bg-primary-foreground/20 text-primary-foreground'
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </header>

      {/* Conversations List */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Filter className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-sidebar-border">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.id}
                onClick={() => selectConversation(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with shortcut hint */}
      <footer className="flex-shrink-0 px-4 py-2 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl</kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">K</kbd>
          {' para buscar'}
        </p>
      </footer>
    </>
  );
}
