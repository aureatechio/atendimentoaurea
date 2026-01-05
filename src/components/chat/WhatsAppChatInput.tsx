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
  Contact,
  Sticker
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
      toast.success('Mídia enviada!');
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

  if (isRecording) {
    return (
      <div className="px-4 py-3 bg-[hsl(var(--whatsapp-panel-bg))] animate-fade-in">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="h-12 w-12 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 flex items-center gap-4 bg-card rounded-full px-6 py-3 shadow-sm">
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-base font-medium text-foreground tabular-nums">{formatTime(recordingTime)}</span>
            <div className="flex-1 h-[4px] bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-[hsl(var(--whatsapp-teal-dark))] rounded-full"
                style={{ 
                  width: `${Math.min((recordingTime / 60) * 100, 100)}%`,
                  transition: 'width 1s linear'
                }} 
              />
            </div>
          </div>
          
          <Button
            onClick={stopRecording}
            size="icon"
            className="h-12 w-12 rounded-full bg-[hsl(var(--whatsapp-teal-dark))] hover:bg-[hsl(var(--whatsapp-teal-light))] transition-all active:scale-95 shadow-lg"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-[hsl(var(--whatsapp-panel-bg))]">
      <div className="flex items-end gap-2">
        {/* Emoji button */}
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || uploading}
          className="h-[52px] w-[52px] rounded-full text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground transition-all duration-200 flex-shrink-0 active:scale-95"
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
                "h-[52px] w-[52px] rounded-full text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground flex-shrink-0 transition-all duration-300 active:scale-95",
                attachOpen && "rotate-[135deg] text-[hsl(var(--whatsapp-teal-dark))]"
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
            sideOffset={10}
            className="w-auto p-4 bg-card border-border shadow-xl rounded-2xl animate-scale-in"
          >
            <div className="grid grid-cols-3 gap-5">
              <label className="cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'image')}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="h-[53px] w-[53px] rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-transform shadow-lg">
                    <Image className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-[13px] text-[hsl(var(--whatsapp-time))] group-hover:text-foreground transition-colors">Fotos</span>
                </div>
              </label>

              <label className="cursor-pointer group">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'video')}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="h-[53px] w-[53px] rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-transform shadow-lg">
                    <Video className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-[13px] text-[hsl(var(--whatsapp-time))] group-hover:text-foreground transition-colors">Vídeos</span>
                </div>
              </label>

              <label className="cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'document')}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="h-[53px] w-[53px] rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-transform shadow-lg">
                    <FileText className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="text-[13px] text-[hsl(var(--whatsapp-time))] group-hover:text-foreground transition-colors">Documento</span>
                </div>
              </label>

              <div className="flex flex-col items-center gap-2 opacity-40 cursor-not-allowed">
                <div className="h-[53px] w-[53px] rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-[13px] text-[hsl(var(--whatsapp-time))]">Câmera</span>
              </div>

              <div className="flex flex-col items-center gap-2 opacity-40 cursor-not-allowed">
                <div className="h-[53px] w-[53px] rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Contact className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-[13px] text-[hsl(var(--whatsapp-time))]">Contato</span>
              </div>

              <div className="flex flex-col items-center gap-2 opacity-40 cursor-not-allowed">
                <div className="h-[53px] w-[53px] rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <Sticker className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-[13px] text-[hsl(var(--whatsapp-time))]">Sticker</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <div className="flex-1 bg-card rounded-lg flex items-end min-h-[52px] shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-1 focus-within:ring-[hsl(var(--whatsapp-teal-dark))]/30">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem"
            disabled={disabled || uploading}
            rows={1}
            className="flex-1 resize-none bg-transparent border-0 focus:ring-0 focus:outline-none text-[15px] text-foreground placeholder:text-[hsl(var(--whatsapp-icon))] px-4 py-[14px] max-h-[150px] leading-[21px]"
            style={{ minHeight: '52px' }}
          />
        </div>

        {/* Send or Record button */}
        {message.trim() ? (
          <Button
            onClick={handleSend}
            disabled={sending || disabled}
            size="icon"
            className="h-[52px] w-[52px] rounded-full bg-[hsl(var(--whatsapp-teal-dark))] hover:bg-[hsl(var(--whatsapp-teal-light))] flex-shrink-0 transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl"
          >
            {sending ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Send className="h-6 w-6" />
            )}
          </Button>
        ) : (
          <Button
            onClick={startRecording}
            disabled={disabled || uploading}
            size="icon"
            variant="ghost"
            className="h-[52px] w-[52px] rounded-full text-[hsl(var(--whatsapp-icon))] hover:bg-[hsl(var(--whatsapp-hover))] hover:text-foreground flex-shrink-0 transition-all duration-200 active:scale-95"
          >
            <Mic className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
