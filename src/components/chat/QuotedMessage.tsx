import { Image as ImageIcon, Mic, Video, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuotedMessageProps {
  content: string;
  senderType: 'customer' | 'agent';
  messageType?: string;
  mediaUrl?: string | null;
  isFromAgent: boolean; // The parent message sender
}

export function QuotedMessage({
  content,
  senderType,
  messageType = 'text',
  mediaUrl,
  isFromAgent,
}: QuotedMessageProps) {
  const isQuotedFromAgent = senderType === 'agent';

  const getMediaIcon = () => {
    switch (messageType) {
      case 'image':
        return <ImageIcon className="h-3.5 w-3.5 text-[#8696a0]" />;
      case 'audio':
        return <Mic className="h-3.5 w-3.5 text-[#8696a0]" />;
      case 'video':
        return <Video className="h-3.5 w-3.5 text-[#8696a0]" />;
      case 'document':
        return <FileText className="h-3.5 w-3.5 text-[#8696a0]" />;
      default:
        return null;
    }
  };

  const getContentPreview = () => {
    switch (messageType) {
      case 'image':
        return '📷 Imagem';
      case 'audio':
        return '🎵 Áudio';
      case 'video':
        return '🎬 Vídeo';
      case 'document':
        return '📄 Documento';
      default:
        return content;
    }
  };

  return (
    <div
      className={cn(
        'flex items-stretch gap-1.5 rounded-md overflow-hidden mb-1.5 -mx-1 cursor-pointer hover:opacity-90 transition-opacity',
        isFromAgent ? 'bg-[#025144]' : 'bg-[#1d282f]'
      )}
    >
      {/* Color bar */}
      <div
        className={cn('w-1 flex-shrink-0', isQuotedFromAgent ? 'bg-[#53bdeb]' : 'bg-[#00a884]')}
      />

      {/* Content */}
      <div className="flex-1 py-1.5 pr-2 min-w-0">
        <p
          className={cn(
            'text-[11px] font-medium',
            isQuotedFromAgent ? 'text-[#53bdeb]' : 'text-[#00a884]'
          )}
        >
          {isQuotedFromAgent ? 'Você' : 'Cliente'}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {getMediaIcon()}
          <p className="text-[12px] text-[#8696a0] truncate leading-tight">{getContentPreview()}</p>
        </div>
      </div>

      {/* Media thumbnail */}
      {messageType === 'image' && mediaUrl && (
        <div className="w-10 h-10 flex-shrink-0 my-1 mr-1">
          <img src={mediaUrl} alt="" className="w-full h-full object-cover rounded" />
        </div>
      )}
    </div>
  );
}
