import { Check, CheckCheck, Clock, AlertCircle, Play, Pause, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';

interface MessageStatus {
  status: string;
  isFromAgent: boolean;
}

export function MessageStatusIcon({ status, isFromAgent }: MessageStatus) {
  if (!isFromAgent) return null;

  switch (status) {
    case 'sending':
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case 'error':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return <Check className="h-3 w-3 text-muted-foreground" />;
  }
}

interface MessageBubbleProps {
  content: string;
  senderType: 'customer' | 'agent';
  status: string;
  createdAt: string;
  messageType?: string;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaCaption?: string | null;
}

export function WhatsAppMessageBubble({
  content,
  senderType,
  status,
  createdAt,
  messageType = 'text',
  mediaUrl,
  mediaCaption,
}: MessageBubbleProps) {
  const isFromAgent = senderType === 'agent';
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderMedia = () => {
    if (!mediaUrl) return null;

    switch (messageType) {
      case 'image':
        return (
          <div className="mb-1">
            <img
              src={mediaUrl}
              alt="Imagem"
              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: '300px' }}
              onClick={() => window.open(mediaUrl, '_blank')}
            />
            {mediaCaption && (
              <p className="text-sm mt-1 whitespace-pre-wrap">{mediaCaption}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="mb-1">
            <video
              src={mediaUrl}
              controls
              className="max-w-full rounded-lg"
              style={{ maxHeight: '300px' }}
            />
            {mediaCaption && (
              <p className="text-sm mt-1 whitespace-pre-wrap">{mediaCaption}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 py-2">
            <button
              onClick={toggleAudio}
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center',
                isFromAgent ? 'bg-primary-foreground/20' : 'bg-primary/20'
              )}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
            <div className="flex-1">
              <div className={cn(
                'h-1 rounded-full w-full',
                isFromAgent ? 'bg-primary-foreground/30' : 'bg-muted-foreground/30'
              )}>
                <div
                  className={cn(
                    'h-full rounded-full',
                    isFromAgent ? 'bg-primary-foreground' : 'bg-primary'
                  )}
                  style={{ width: '0%' }}
                />
              </div>
            </div>
            <audio
              ref={audioRef}
              src={mediaUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        );

      case 'document':
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg mb-1',
              isFromAgent ? 'bg-primary-foreground/10' : 'bg-muted'
            )}
          >
            <div className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              isFromAgent ? 'bg-primary-foreground/20' : 'bg-primary/20'
            )}>
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{mediaCaption || 'Documento'}</p>
              <p className={cn(
                'text-xs',
                isFromAgent ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}>
                Clique para baixar
              </p>
            </div>
          </a>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('flex', isFromAgent ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-3 py-2 shadow-sm',
          isFromAgent
            ? 'bg-[#dcf8c6] text-foreground rounded-br-md'
            : 'bg-card text-foreground rounded-bl-md border border-border'
        )}
      >
        {renderMedia()}
        
        {messageType === 'text' && (
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        )}

        <div className={cn(
          'flex items-center justify-end gap-1 mt-1',
          isFromAgent ? 'text-muted-foreground' : 'text-muted-foreground'
        )}>
          <span className="text-[10px]">{formatTime(createdAt)}</span>
          <MessageStatusIcon status={status} isFromAgent={isFromAgent} />
        </div>
      </div>
    </div>
  );
}