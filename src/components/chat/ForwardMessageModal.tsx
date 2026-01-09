import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Forward, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RealConversation } from '@/hooks/useRealConversations';

interface ForwardMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: RealConversation[];
  onForward: (targetConversationIds: string[]) => Promise<void>;
  messagePreview: string;
}

export function ForwardMessageModal({
  open,
  onOpenChange,
  conversations,
  onForward,
  messagePreview,
}: ForwardMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [forwarding, setForwarding] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      const name = (conv.name || conv.phone).toLowerCase();
      const phone = conv.phone.toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [conversations, searchQuery]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleForward = async () => {
    if (selectedIds.length === 0) return;
    setForwarding(true);
    try {
      await onForward(selectedIds);
      onOpenChange(false);
      setSelectedIds([]);
      setSearchQuery('');
    } finally {
      setForwarding(false);
    }
  };

  const handleClose = () => {
    if (!forwarding) {
      onOpenChange(false);
      setSelectedIds([]);
      setSearchQuery('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#111b21] border-none text-[#e9edef] max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-[#e9edef] text-lg font-normal flex items-center gap-2">
            <Forward className="h-5 w-5" />
            Encaminhar mensagem
          </DialogTitle>
        </DialogHeader>

        {/* Message Preview */}
        <div className="px-4 py-3">
          <div className="bg-[#202c33] rounded-lg p-3 text-sm text-[#8696a0] line-clamp-2">
            {messagePreview}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
            <Input
              placeholder="Pesquisar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#202c33] border-none text-[#e9edef] placeholder:text-[#8696a0] h-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="h-[300px] px-2">
          {filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#8696a0] text-sm">
              Nenhuma conversa encontrada
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedIds.includes(conv.id);
              return (
                <button
                  key={conv.id}
                  onClick={() => toggleSelection(conv.id)}
                  disabled={forwarding}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-[#202c33]',
                    isSelected && 'bg-[#00a884]/10'
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      {conv.avatar_url && <AvatarImage src={conv.avatar_url} />}
                      <AvatarFallback className="bg-[#6a7175] text-white text-sm">
                        {(conv.name || conv.phone).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isSelected && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 bg-[#00a884] rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-[#111b21]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] text-[#e9edef] truncate">
                      {conv.name || conv.phone}
                    </p>
                    {conv.name && (
                      <p className="text-[13px] text-[#8696a0] truncate">
                        {conv.phone}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-[#222d34] flex items-center justify-between">
          <span className="text-sm text-[#8696a0]">
            {selectedIds.length > 0
              ? `${selectedIds.length} conversa${selectedIds.length > 1 ? 's' : ''} selecionada${selectedIds.length > 1 ? 's' : ''}`
              : 'Selecione conversas'}
          </span>
          <Button
            onClick={handleForward}
            disabled={selectedIds.length === 0 || forwarding}
            className="bg-[#00a884] hover:bg-[#00997a] text-[#111b21] px-6"
          >
            {forwarding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Forward className="h-4 w-4 mr-2" />
                Encaminhar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
