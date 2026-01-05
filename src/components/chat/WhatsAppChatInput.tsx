import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Paperclip, Image, Mic, Video, FileText, X, Loader2, Square } from 'lucide-react';
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    
    setSending(true);
    await onSendMessage(message.trim());
    setMessage('');
    setSending(false);
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
      // Upload to Supabase Storage
      const fileName = `${conversationId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
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
        
        // Upload audio
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
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="h-10 w-10 text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-red-500 animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
          
          <Button
            size="icon"
            onClick={stopRecording}
            className="h-10 w-10"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-border bg-card">
      <div className="flex items-center gap-2">
        {/* Attachment button */}
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled || uploading}
              className="h-10 w-10"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paperclip className="h-5 w-5" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto p-2">
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'image')}
                />
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <Image className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs">Imagem</span>
                </div>
              </label>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'video')}
                />
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs">Vídeo</span>
                </div>
              </label>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'document')}
                />
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs">Documento</span>
                </div>
              </label>
            </div>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          className="flex-1"
          disabled={disabled || uploading}
        />

        {/* Send or Record button */}
        {message.trim() ? (
          <Button
            onClick={handleSend}
            disabled={sending || disabled}
            size="icon"
            className="h-10 w-10"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        ) : (
          <Button
            onClick={startRecording}
            disabled={disabled || uploading}
            size="icon"
            variant="ghost"
            className="h-10 w-10"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}