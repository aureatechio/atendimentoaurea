import { Check, CheckCheck, Clock, AlertCircle, Play, Pause, Download, File, Mic, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface MessageStatus {
  status: string;
  isFromAgent: boolean;
}

export function MessageStatusIcon({ status, isFromAgent }: MessageStatus) {
  if (!isFromAgent) return null;

  const iconClasses = "h-[15px] w-[15px] flex-shrink-0";

  switch (status) {
    case 'sending':
      return <Clock className={cn(iconClasses, "text-muted-foreground animate-pulse-soft")} />;
    case 'sent':
      return <Check className={cn(iconClasses, "text-muted-foreground")} />;
    case 'delivered':
      return <CheckCheck className={cn(iconClasses, "text-muted-foreground")} />;
    case 'read':
      return <CheckCheck className={cn(iconClasses, "text-[hsl(var(--status-read))]")} />;
    case 'error':
      return <AlertCircle className={cn(iconClasses, "text-destructive")} />;
    default:
      return <Check className={cn(iconClasses, "text-muted-foreground")} />;
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
  animationDelay?: number;
}

export function WhatsAppMessageBubble({
  content,
  senderType,
  status,
  createdAt,
  messageType = 'text',
  mediaUrl,
  mediaCaption,
  animationDelay = 0,
}: MessageBubbleProps) {
  const isFromAgent = senderType === 'agent';
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setAudioProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [mediaUrl]);

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
          <div className="mb-1 -mx-2 -mt-1.5 relative group overflow-hidden rounded-t-lg">
            {imageLoading && (
              <div className="absolute inset-0 bg-muted animate-shimmer flex items-center justify-center min-h-[200px]">
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            {imageError ? (
              <div className="w-full h-[200px] bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs font-medium">Erro ao carregar imagem</p>
                </div>
              </div>
            ) : (
              <img
                src={mediaUrl}
                alt="Imagem"
                className={cn(
                  "w-full cursor-pointer transition-all duration-300 rounded-t-lg",
                  "hover:brightness-95",
                  imageLoading ? "opacity-0" : "opacity-100"
                )}
                style={{ maxHeight: '330px', objectFit: 'cover' }}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
                onClick={() => window.open(mediaUrl, '_blank')}
              />
            )}
            {mediaCaption && (
              <p className="text-[14px] mt-2 px-1 whitespace-pre-wrap leading-5">{mediaCaption}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="mb-1 -mx-2 -mt-1.5 rounded-t-lg overflow-hidden">
            <video
              src={mediaUrl}
              controls
              className="w-full rounded-t-lg"
              style={{ maxHeight: '330px' }}
            />
            {mediaCaption && (
              <p className="text-[14px] mt-2 px-1 whitespace-pre-wrap leading-5">{mediaCaption}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 py-1 min-w-[280px]">
            <button
              onClick={toggleAudio}
              className={cn(
                'h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200',
                'hover:scale-105 active:scale-95 fab-shadow',
                'bg-primary'
              )}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-primary-foreground" />
              ) : (
                <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
              )}
            </button>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="relative h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-100"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatAudioTime(isPlaying ? (audioProgress / 100) * audioDuration : audioDuration || 0)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
              <Mic className="h-5 w-5 text-muted-foreground" />
            </div>
            <audio
              ref={audioRef}
              src={mediaUrl}
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
              'flex items-center gap-3 p-3 rounded-lg mb-1 -mx-2 -mt-1.5 transition-all duration-200',
              'hover:brightness-95 active:scale-[0.99]',
              'bg-muted/50'
            )}
          >
            <div className="h-12 w-10 rounded-md flex items-center justify-center bg-primary">
              <File className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{mediaCaption || 'Documento'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                PDF · Clique para baixar
              </p>
            </div>
            <Download className="h-5 w-5 text-muted-foreground flex-shrink-0 hover:scale-110 transition-transform" />
          </a>
        );

      default:
        return null;
    }
  };

  // Tail SVG for the bubble
  const BubbleTail = () => (
    <div className={cn(
      "absolute top-0 w-2 h-3",
      isFromAgent ? "right-[-8px]" : "left-[-8px]"
    )}>
      <svg
        viewBox="0 0 8 13"
        width="8"
        height="13"
        className={cn(
          isFromAgent 
            ? "text-[hsl(var(--chat-bubble-outgoing))]" 
            : "text-[hsl(var(--chat-bubble-incoming))]"
        )}
      >
        {isFromAgent ? (
          <path
            fill="currentColor"
            d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z"
          />
        ) : (
          <path
            fill="currentColor"
            d="M6.467 3.568 0 12.193V1h5.188c1.77 0 2.338 1.156 1.279 2.568z"
          />
        )}
      </svg>
    </div>
  );

  return (
    <div 
      className={cn('flex mb-[3px] animate-fade-in-up', isFromAgent ? 'justify-end' : 'justify-start')}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div
        className={cn(
          'relative max-w-[65%] rounded-lg px-3 py-1.5 elevation-1 transition-all duration-200',
          'hover:elevation-2',
          isFromAgent
            ? 'bg-[hsl(var(--chat-bubble-outgoing))] rounded-tr-none'
            : 'bg-[hsl(var(--chat-bubble-incoming))] rounded-tl-none'
        )}
      >
        <BubbleTail />
        
        {renderMedia()}
        
        {messageType === 'text' && (
          <div className="flex items-end gap-1.5 flex-wrap">
            <p className="text-[14.2px] text-foreground whitespace-pre-wrap break-words leading-5">
              {content}
            </p>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-auto mb-[1px] flex items-center gap-1 tabular-nums">
              {formatTime(createdAt)}
              <MessageStatusIcon status={status} isFromAgent={isFromAgent} />
            </span>
          </div>
        )}

        {messageType !== 'text' && (
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {formatTime(createdAt)}
            </span>
            <MessageStatusIcon status={status} isFromAgent={isFromAgent} />
          </div>
        )}
      </div>
    </div>
  );
}
