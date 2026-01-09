import { X, Image as ImageIcon, Mic, Video, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReplyMessage {
  id: string;
  content: string;
  senderType: 'customer' | 'agent';
  messageType?: string;
  mediaUrl?: string | null;
}

interface ReplyPreviewProps {
  message: ReplyMessage;
  onCancel: () => void;
  className?: string;
}

export function ReplyPreview({ message, onCancel, className }: ReplyPreviewProps) {
  const isFromAgent = message.senderType === 'agent';

  const getMediaIcon = () => {
    switch (message.messageType) {
      case 'image':
        return <ImageIcon className="h-4 w-4 text-[#8696a0]" />;
      case 'audio':
        return <Mic className="h-4 w-4 text-[#8696a0]" />;
      case 'video':
        return <Video className="h-4 w-4 text-[#8696a0]" />;
      case 'document':
        return <FileText className="h-4 w-4 text-[#8696a0]" />;
      default:
        return null;
    }
  };

  const getContentPreview = () => {
    switch (message.messageType) {
      case 'image':
        return '📷 Imagem';
      case 'audio':
        return '🎵 Áudio';
      case 'video':
        return '🎬 Vídeo';
      case 'document':
        return '📄 Documento';
      default:
        return message.content;
    }
  };

  return (
    <div className={cn('flex items-stretch gap-2 bg-[#1d282f] rounded-lg overflow-hidden', className)}>
      {/* Color bar */}
      <div className={cn('w-1 flex-shrink-0', isFromAgent ? 'bg-[#53bdeb]' : 'bg-[#00a884]')} />

      {/* Content */}
      <div className="flex-1 py-2 pr-2 min-w-0">
        <p className={cn('text-xs font-medium', isFromAgent ? 'text-[#53bdeb]' : 'text-[#00a884]')}>
          {isFromAgent ? 'Você' : 'Cliente'}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {getMediaIcon()}
          <p className="text-sm text-[#8696a0] truncate">{getContentPreview()}</p>
        </div>
      </div>

      {/* Media thumbnail */}
      {message.messageType === 'image' && message.mediaUrl && (
        <div className="w-12 h-12 flex-shrink-0 my-1 mr-1">
          <img
            src={message.mediaUrl}
            alt=""
            className="w-full h-full object-cover rounded"
          />
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onCancel}
        className="px-3 flex items-center justify-center text-[#8696a0] hover:text-[#e9edef] transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
