import { Check, CheckCheck, Clock, AlertCircle, Play, Pause, Download, File, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface MessageStatus {
  status: string;
  isFromAgent: boolean;
}

export function MessageStatusIcon({ status, isFromAgent }: MessageStatus) {
  if (!isFromAgent) return null;

  switch (status) {
    case 'sending':
      return <Clock className="h-[14px] w-[14px] text-[hsl(var(--whatsapp-time))]" />;
    case 'sent':
      return <Check className="h-[14px] w-[14px] text-[hsl(var(--whatsapp-time))]" />;
    case 'delivered':
      return <CheckCheck className="h-[14px] w-[14px] text-[hsl(var(--whatsapp-time))]" />;
    case 'read':
      return <CheckCheck className="h-[14px] w-[14px] text-[hsl(var(--whatsapp-blue))]" />;
    case 'error':
      return <AlertCircle className="h-[14px] w-[14px] text-destructive" />;
    default:
      return <Check className="h-[14px] w-[14px] text-[hsl(var(--whatsapp-time))]" />;
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
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
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
          <div className="mb-1 -mx-1 -mt-1">
            <img
              src={mediaUrl}
              alt="Imagem"
              className="w-full rounded-t-lg cursor-pointer hover:opacity-95 transition-opacity"
              style={{ maxHeight: '330px', objectFit: 'cover' }}
              onClick={() => window.open(mediaUrl, '_blank')}
            />
            {mediaCaption && (
              <p className="text-sm mt-2 px-1 whitespace-pre-wrap">{mediaCaption}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="mb-1 -mx-1 -mt-1">
            <video
              src={mediaUrl}
              controls
              className="w-full rounded-t-lg"
              style={{ maxHeight: '330px' }}
            />
            {mediaCaption && (
              <p className="text-sm mt-2 px-1 whitespace-pre-wrap">{mediaCaption}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-2 py-1 min-w-[240px]">
            <button
              onClick={toggleAudio}
              className={cn(
                'h-[45px] w-[45px] rounded-full flex items-center justify-center flex-shrink-0',
                isFromAgent ? 'bg-[hsl(var(--whatsapp-teal-dark))]' : 'bg-[hsl(var(--whatsapp-teal-light))]'
              )}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5 text-white ml-0.5" />
              )}
            </button>
            <div className="flex-1 flex flex-col gap-1">
              <div className="relative h-[5px] rounded-full bg-[hsl(var(--whatsapp-time))]/30 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-[hsl(var(--whatsapp-teal-dark))] rounded-full transition-all"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-[hsl(var(--whatsapp-time))]">
                {formatAudioTime(isPlaying ? (audioProgress / 100) * audioDuration : audioDuration || 0)}
              </span>
            </div>
            <div className={cn(
              "h-[45px] w-[45px] rounded-full flex items-center justify-center flex-shrink-0",
              isFromAgent ? 'bg-[hsl(var(--whatsapp-teal-dark))]/20' : 'bg-[hsl(var(--whatsapp-icon))]/20'
            )}>
              <Mic className="h-5 w-5 text-[hsl(var(--whatsapp-icon))]" />
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
              'flex items-center gap-3 p-3 rounded-lg mb-1 -mx-1 -mt-1',
              isFromAgent ? 'bg-[hsl(var(--whatsapp-teal-dark))]/10' : 'bg-[hsl(var(--muted))]'
            )}
          >
            <div className="h-[50px] w-[40px] rounded flex items-center justify-center bg-[hsl(var(--whatsapp-teal-dark))]">
              <File className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{mediaCaption || 'Documento'}</p>
              <p className="text-xs text-[hsl(var(--whatsapp-time))] mt-0.5">
                PDF · Clique para baixar
              </p>
            </div>
            <Download className="h-5 w-5 text-[hsl(var(--whatsapp-icon))] flex-shrink-0" />
          </a>
        );

      default:
        return null;
    }
  };

  // Tail SVG for the bubble
  const BubbleTail = () => (
    <div className={cn(
      "absolute top-0 w-3 h-3",
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
    <div className={cn('flex mb-1', isFromAgent ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[65%] rounded-lg px-[9px] py-[6px] shadow-sm',
          isFromAgent
            ? 'bg-[hsl(var(--chat-bubble-outgoing))] rounded-tr-none'
            : 'bg-[hsl(var(--chat-bubble-incoming))] rounded-tl-none'
        )}
      >
        <BubbleTail />
        
        {renderMedia()}
        
        {messageType === 'text' && (
          <div className="flex items-end gap-1">
            <p className="text-[14.2px] text-foreground whitespace-pre-wrap break-words leading-[19px]">
              {content}
            </p>
            <span className="text-[11px] text-[hsl(var(--whatsapp-time))] whitespace-nowrap ml-1 mb-[2px] flex items-center gap-[3px]">
              {formatTime(createdAt)}
              <MessageStatusIcon status={status} isFromAgent={isFromAgent} />
            </span>
          </div>
        )}

        {messageType !== 'text' && (
          <div className="flex items-center justify-end gap-[3px] mt-1">
            <span className="text-[11px] text-[hsl(var(--whatsapp-time))]">
              {formatTime(createdAt)}
            </span>
            <MessageStatusIcon status={status} isFromAgent={isFromAgent} />
          </div>
        )}
      </div>
    </div>
  );
}
