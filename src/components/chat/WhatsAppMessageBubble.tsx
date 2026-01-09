import { Check, CheckCheck, Clock, AlertCircle, Play, Pause, Download, File, Mic, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface MessageStatus {
  status: string;
  isFromAgent: boolean;
}

export function MessageStatusIcon({ status, isFromAgent }: MessageStatus) {
  if (!isFromAgent) return null;

  const iconClasses = "h-[14px] w-[14px] flex-shrink-0";

  switch (status) {
    case 'sending':
      return <Clock className={cn(iconClasses, "text-[#667781] animate-pulse")} />;
    case 'sent':
      return <Check className={cn(iconClasses, "text-[#667781]")} />;
    case 'delivered':
      return <CheckCheck className={cn(iconClasses, "text-[#667781]")} />;
    case 'read':
      return <CheckCheck className={cn(iconClasses, "text-[#53bdeb]")} />;
    case 'error':
      return <AlertCircle className={cn(iconClasses, "text-[#f15c6d]")} />;
    default:
      return <Check className={cn(iconClasses, "text-[#667781]")} />;
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
  showTail?: boolean;
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
  showTail = true,
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

    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handleTimeUpdate = () => setAudioProgress((audio.currentTime / audio.duration) * 100);
    const handleEnded = () => { setIsPlaying(false); setAudioProgress(0); };

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
          <div className="mb-1 -mx-2 -mt-1.5 relative overflow-hidden rounded-t-lg">
            {imageLoading && (
              <div className="absolute inset-0 bg-[#1d282f] flex items-center justify-center min-h-[200px]">
                <ImageIcon className="w-10 h-10 text-[#8696a0]" />
              </div>
            )}
            {imageError ? (
              <div className="w-full h-[200px] bg-[#1d282f] flex items-center justify-center">
                <div className="text-center text-[#8696a0]">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                  <p className="text-xs">Erro ao carregar imagem</p>
                </div>
              </div>
            ) : (
              <img
                src={mediaUrl}
                alt="Imagem"
                className={cn(
                  "w-full cursor-pointer rounded-t-lg",
                  imageLoading ? "opacity-0" : "opacity-100"
                )}
                style={{ maxHeight: '330px', objectFit: 'cover' }}
                onLoad={() => setImageLoading(false)}
                onError={() => { setImageLoading(false); setImageError(true); }}
                onClick={() => window.open(mediaUrl, '_blank')}
              />
            )}
            {mediaCaption && (
              <p className="text-[14.2px] mt-2 px-1 text-[#e9edef] whitespace-pre-wrap">{mediaCaption}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="mb-1 -mx-2 -mt-1.5 rounded-t-lg overflow-hidden">
            <video src={mediaUrl} controls className="w-full rounded-t-lg" style={{ maxHeight: '330px' }} />
            {mediaCaption && (
              <p className="text-[14.2px] mt-2 px-1 text-[#e9edef] whitespace-pre-wrap">{mediaCaption}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 py-1 min-w-[260px]">
            <button
              onClick={toggleAudio}
              className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 bg-[#00a884] hover:bg-[#00a884]/90 transition-colors"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-[#111b21]" />
              ) : (
                <Play className="h-5 w-5 text-[#111b21] ml-0.5" />
              )}
            </button>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="relative h-1 rounded-full bg-[#8696a0]/30 overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-[#8696a0] rounded-full transition-all"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-[#8696a0] tabular-nums">
                {formatAudioTime(isPlaying ? (audioProgress / 100) * audioDuration : audioDuration || 0)}
              </span>
            </div>
            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-[#6a7175]">
              <Mic className="h-4 w-4 text-[#111b21]" />
            </div>
            <audio ref={audioRef} src={mediaUrl} className="hidden" />
          </div>
        );

      case 'document':
        return (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg mb-1 -mx-2 -mt-1.5 bg-[#1d282f] hover:bg-[#1d282f]/80 transition-colors"
          >
            <div className="h-11 w-9 rounded flex items-center justify-center bg-[#f15c6d]">
              <File className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#e9edef] truncate">{mediaCaption || 'Documento'}</p>
              <p className="text-xs text-[#8696a0] mt-0.5">PDF · Clique para baixar</p>
            </div>
            <Download className="h-5 w-5 text-[#8696a0]" />
          </a>
        );

      default:
        return null;
    }
  };

  const BubbleTail = () => (
    <div className={cn(
      "absolute top-0 w-2 h-3",
      isFromAgent ? "-right-2" : "-left-2"
    )}>
      <svg viewBox="0 0 8 13" width="8" height="13">
        {isFromAgent ? (
          <path fill="#005c4b" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" />
        ) : (
          <path fill="#202c33" d="M6.467 3.568 0 12.193V1h5.188c1.77 0 2.338 1.156 1.279 2.568z" />
        )}
      </svg>
    </div>
  );

  return (
    <div 
      className={cn('flex mb-[3px]', isFromAgent ? 'justify-end' : 'justify-start')}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div
        className={cn(
          'relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-lg px-[9px] py-[6px] shadow-sm',
          isFromAgent
            ? cn('bg-[#005c4b]', showTail && 'rounded-tr-none')
            : cn('bg-[#202c33]', showTail && 'rounded-tl-none')
        )}
      >
        {showTail && <BubbleTail />}
        
        {renderMedia()}
        
        {messageType === 'text' && (
          <div className="flex items-end gap-1.5 flex-wrap">
            <p className="text-[14px] md:text-[14.2px] text-[#e9edef] whitespace-pre-wrap break-words leading-[19px]">
              {content}
            </p>
            <span className="text-[10px] md:text-[11px] text-[#ffffff99] whitespace-nowrap ml-auto mb-[1px] flex items-center gap-1 tabular-nums select-none">
              {formatTime(createdAt)}
              <MessageStatusIcon status={status} isFromAgent={isFromAgent} />
            </span>
          </div>
        )}

        {messageType !== 'text' && (
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[11px] text-[#ffffff99] tabular-nums">
              {formatTime(createdAt)}
            </span>
            <MessageStatusIcon status={status} isFromAgent={isFromAgent} />
          </div>
        )}
      </div>
    </div>
  );
}
