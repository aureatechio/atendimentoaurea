import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Send, 
  Paperclip, 
  Image, 
  Mic, 
  Video, 
  FileText, 
  X, 
  Loader2, 
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void>;
  onSendMedia: (type: string, url: string, caption?: string) => Promise<void>;
  disabled?: boolean;
  conversationId: string;
}

export function WhatsAppChatInput({ onSendMessage, onSendMedia, disabled, conversationId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    
    setSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachOpen(false);
    setUploading(true);

    try {
      const fileName = `${conversationId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(data.path);

      await onSendMedia(type, urlData.publicUrl, file.name);
      toast.success('Mídia enviada!');
    } catch {
      toast.error('Erro ao enviar mídia');
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg' });
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length === 0) return;
        
        setUploading(true);
        try {
          const fileName = `${conversationId}/${Date.now()}-audio.ogg`;
          const { data, error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, audioBlob);

          if (error) throw error;

          const { data: urlData } = supabase.storage
            .from('chat-media')
            .getPublicUrl(data.path);

          await onSendMedia('audio', urlData.publicUrl);
          toast.success('Áudio enviado!');
        } catch {
          toast.error('Erro ao enviar áudio');
        } finally {
          setUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch {
      toast.error('Erro ao acessar microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      toast.info('Gravação cancelada');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const attachmentOptions = [
    { type: 'image', icon: Image, label: 'Fotos', accept: 'image/*', color: 'bg-[#bf59cf]' },
    { type: 'video', icon: Video, label: 'Vídeos', accept: 'video/*', color: 'bg-[#ee4a62]' },
    { type: 'document', icon: FileText, label: 'Documento', accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt', color: 'bg-[#5157ae]' },
  ];

  if (isRecording) {
    return (
      <div className="px-4 py-3 bg-[#202c33]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="h-12 w-12 rounded-full text-[#f15c6d] hover:bg-[#f15c6d]/10"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 flex items-center gap-4 bg-[#2a3942] rounded-full px-5 py-3">
            <div className="h-3 w-3 rounded-full bg-[#f15c6d] animate-pulse" />
            <span className="text-base text-[#e9edef] tabular-nums min-w-[45px]">
              {formatTime(recordingTime)}
            </span>
            <div className="flex-1 h-1 bg-[#374045] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#00a884] rounded-full transition-all"
                style={{ width: `${Math.min((recordingTime / 60) * 100, 100)}%` }} 
              />
            </div>
          </div>
          
          <Button
            onClick={stopRecording}
            size="icon"
            className="h-12 w-12 rounded-full bg-[#00a884] hover:bg-[#00a884]/90"
          >
            <Send className="h-5 w-5 text-[#111b21]" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 md:px-4 py-2 md:py-3 bg-[#202c33] safe-area-bottom">
      <div className="flex items-end gap-1.5 md:gap-2">
        {/* Emoji button - hidden on small screens */}
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || uploading}
          className="hidden sm:flex h-11 md:h-[52px] w-11 md:w-[52px] rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374045] flex-shrink-0 transition-colors"
        >
          <Smile className="h-6 md:h-[26px] w-6 md:w-[26px]" />
        </Button>

        {/* Attachment button */}
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled || uploading}
              className={cn(
                "h-11 md:h-[52px] w-11 md:w-[52px] rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374045] flex-shrink-0 transition-all duration-200",
                attachOpen && "rotate-[135deg] text-[#00a884]"
              )}
            >
              {uploading ? (
                <Loader2 className="h-6 md:h-[26px] w-6 md:w-[26px] animate-spin" />
              ) : (
                <Paperclip className="h-6 md:h-[26px] w-6 md:w-[26px]" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top" 
            align="start"
            sideOffset={12}
            className="w-auto p-4 bg-[#233138] border-none shadow-2xl rounded-xl"
          >
            <div className="flex gap-4">
              {attachmentOptions.map((option) => (
                <label key={option.type} className="cursor-pointer group">
                  <input
                    type="file"
                    accept={option.accept}
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, option.type)}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "h-[53px] w-[53px] rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                      option.color
                    )}>
                      <option.icon className="h-[26px] w-[26px] text-white" />
                    </div>
                    <span className="text-[12px] text-[#8696a0]">{option.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <div className="flex-1 bg-[#2a3942] rounded-lg flex items-end min-h-[44px] md:min-h-[52px]">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem"
            disabled={disabled || uploading}
            rows={1}
            className="flex-1 resize-none bg-transparent border-0 focus:ring-0 focus:outline-none text-[14px] md:text-[15px] text-[#d1d7db] placeholder:text-[#8696a0] px-3 md:px-4 py-3 md:py-[14px] max-h-[120px] md:max-h-[150px] leading-5"
            style={{ minHeight: '44px' }}
          />
        </div>

        {/* Send or Record button */}
        <Button
          onClick={message.trim() ? handleSend : startRecording}
          disabled={sending || disabled || uploading}
          size="icon"
          className="h-11 md:h-[52px] w-11 md:w-[52px] rounded-full flex-shrink-0 bg-[#00a884] hover:bg-[#00997a] active:scale-95 transition-all"
        >
          {sending || uploading ? (
            <Loader2 className="h-5 md:h-6 w-5 md:w-6 animate-spin text-[#111b21]" />
          ) : message.trim() ? (
            <Send className="h-5 md:h-6 w-5 md:w-6 text-[#111b21]" />
          ) : (
            <Mic className="h-5 md:h-6 w-5 md:w-6 text-[#111b21]" />
          )}
        </Button>
      </div>
    </div>
  );
}
