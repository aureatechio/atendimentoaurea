import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Reply, Forward, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface MessageContextMenuProps {
  children: React.ReactNode;
  onReply: () => void;
  onForward: () => void;
  messageContent: string;
  canDelete?: boolean;
  onDelete?: () => void;
}

export function MessageContextMenu({
  children,
  onReply,
  onForward,
  messageContent,
  canDelete = false,
  onDelete,
}: MessageContextMenuProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      toast.success('Mensagem copiada!');
    } catch {
      toast.error('Erro ao copiar mensagem');
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-[#233138] border-none shadow-xl">
        <ContextMenuItem
          onClick={onReply}
          className="text-[#d1d7db] hover:bg-[#182229] focus:bg-[#182229] cursor-pointer gap-3"
        >
          <Reply className="h-4 w-4" />
          Responder
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onForward}
          className="text-[#d1d7db] hover:bg-[#182229] focus:bg-[#182229] cursor-pointer gap-3"
        >
          <Forward className="h-4 w-4" />
          Encaminhar
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleCopy}
          className="text-[#d1d7db] hover:bg-[#182229] focus:bg-[#182229] cursor-pointer gap-3"
        >
          <Copy className="h-4 w-4" />
          Copiar
        </ContextMenuItem>
        {canDelete && onDelete && (
          <ContextMenuItem
            onClick={onDelete}
            className="text-[#f15c6d] hover:bg-[#182229] focus:bg-[#182229] cursor-pointer gap-3"
          >
            <Trash2 className="h-4 w-4" />
            Apagar
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
