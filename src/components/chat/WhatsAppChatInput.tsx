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
  Camera,
  Users,
  Sticker,
  Square
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
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
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
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

    // Validate file size (max 16MB)
    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 16MB');
      return;
    }

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
      toast.success('Mídia enviada com sucesso!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar mídia');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

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
        } catch (err) {
          console.error('Upload error:', err);
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
    } catch (err) {
      console.error('Recording error:', err);
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

  // Attachment options
  const attachmentOptions = [
    { type: 'image', icon: Image, label: 'Fotos', accept: 'image/*', gradient: 'from-violet-500 to-purple-600' },
    { type: 'video', icon: Video, label: 'Vídeos', accept: 'video/*', gradient: 'from-rose-500 to-pink-600' },
    { type: 'document', icon: FileText, label: 'Documento', accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt', gradient: 'from-blue-500 to-indigo-600' },
    { type: 'camera', icon: Camera, label: 'Câmera', disabled: true, gradient: 'from-pink-500 to-rose-600' },
    { type: 'contact', icon: Users, label: 'Contato', disabled: true, gradient: 'from-cyan-500 to-teal-600' },
    { type: 'sticker', icon: Sticker, label: 'Figurinha', disabled: true, gradient: 'from-emerald-500 to-green-600' },
  ];

  if (isRecording) {
    return (
      <div className="px-4 py-3 bg-[hsl(var(--whatsapp-panel-bg))] border-t border-border/30 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="h-12 w-12 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 flex items-center gap-4 bg-background rounded-full px-5 py-3 elevation-1">
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-base font-medium text-foreground tabular-nums min-w-[45px]">
              {formatTime(recordingTime)}
            </span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min((recordingTime / 60) * 100, 100)}%` }} 
              />
            </div>
            <span className="text-xs text-muted-foreground">Gravando...</span>
          </div>
          
          <Button
            onClick={stopRecording}
            size="icon"
            className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 transition-all active:scale-95 fab-shadow"
          >
            <Send className="h-5 w-5 text-primary-foreground" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-[hsl(var(--whatsapp-panel-bg))] border-t border-border/30">
      <div className="flex items-end gap-2">
        {/* Emoji button */}
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || uploading}
          className="h-12 w-12 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 flex-shrink-0 active:scale-95"
        >
          <Smile className="h-6 w-6" />
        </Button>

        {/* Attachment button */}
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled || uploading}
              className={cn(
                "h-12 w-12 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground flex-shrink-0 transition-all duration-300 active:scale-95",
                attachOpen && "rotate-[135deg] text-primary"
              )}
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Paperclip className="h-6 w-6" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            side="top" 
            align="start"
            sideOffset={12}
            className="w-auto p-5 bg-background border-border elevation-3 rounded-2xl animate-scale-in"
          >
            <div className="grid grid-cols-3 gap-6">
              {attachmentOptions.map((option) => (
                <label 
                  key={option.type} 
                  className={cn(
                    "cursor-pointer group",
                    option.disabled && "opacity-40 cursor-not-allowed pointer-events-none"
                  )}
                >
                  {!option.disabled && (
                    <input
                      type="file"
                      accept={option.accept}
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, option.type)}
                    />
                  )}
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn(
                      "h-14 w-14 rounded-full flex items-center justify-center transition-transform shadow-lg bg-gradient-to-br",
                      option.gradient,
                      !option.disabled && "group-hover:scale-110 group-active:scale-95"
                    )}>
                      <option.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className={cn(
                      "text-[13px] text-muted-foreground transition-colors font-medium",
                      !option.disabled && "group-hover:text-foreground"
                    )}>
                      {option.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <div className="flex-1 bg-background rounded-3xl flex items-end min-h-[48px] elevation-1 transition-all duration-200 focus-within:elevation-2 focus-within:ring-2 focus-within:ring-primary/20">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem"
            disabled={disabled || uploading}
            rows={1}
            className="flex-1 resize-none bg-transparent border-0 focus:ring-0 focus:outline-none text-[15px] text-foreground placeholder:text-muted-foreground px-5 py-3 max-h-[150px] leading-5"
            style={{ minHeight: '48px' }}
          />
        </div>

        {/* Send or Record button - ALWAYS VISIBLE */}
        <Button
          onClick={message.trim() ? handleSend : startRecording}
          disabled={sending || disabled || uploading}
          size="icon"
          className={cn(
            "h-12 w-12 rounded-full flex-shrink-0 transition-all duration-200 active:scale-95 fab-shadow",
            message.trim() 
              ? "bg-primary hover:bg-primary/90" 
              : "bg-primary hover:bg-primary/90"
          )}
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
          ) : uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
          ) : message.trim() ? (
            <Send className="h-5 w-5 text-primary-foreground" />
          ) : (
            <Mic className="h-5 w-5 text-primary-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}
