import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
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

interface PendingFile {
  file: File;
  type: string;
  previewUrl: string | null;
}

export function WhatsAppChatInput({ onSendMessage, onSendMedia, disabled, conversationId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [caption, setCaption] = useState('');
  
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

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (pendingFile?.previewUrl) {
        URL.revokeObjectURL(pendingFile.previewUrl);
      }
    };
  }, [pendingFile]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Z-API limit is 100MB
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Limite da Z-API: 100MB');
      return;
    }

    setAttachOpen(false);

    // Create preview URL for images and videos
    let previewUrl: string | null = null;
    if (type === 'image' || type === 'video') {
      previewUrl = URL.createObjectURL(file);
    }

    setPendingFile({ file, type, previewUrl });
    setCaption('');
  };

  const cancelPendingFile = () => {
    if (pendingFile?.previewUrl) {
      URL.revokeObjectURL(pendingFile.previewUrl);
    }
    setPendingFile(null);
    setCaption('');
  };

  const sendPendingFile = async () => {
    if (!pendingFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileName = `${conversationId}/${Date.now()}-${pendingFile.file.name}`;
      
      // Use XMLHttpRequest for progress tracking
      const formData = new FormData();
      formData.append('file', pendingFile.file);

      // Get the upload URL from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const uploadUrl = `${supabaseUrl}/storage/v1/object/chat-media/${fileName}`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${session?.access_token || supabaseKey}`);
        xhr.setRequestHeader('apikey', supabaseKey);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.send(pendingFile.file);
      });

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      await onSendMedia(pendingFile.type, urlData.publicUrl, caption || pendingFile.file.name);
      toast.success('Mídia enviada!');
      cancelPendingFile();
    } catch {
      toast.error('Erro ao enviar mídia');
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  // Preview mode for pending file
  if (pendingFile) {
    return (
      <div className="absolute inset-0 bg-[#0b141a] z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#202c33]">
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelPendingFile}
            disabled={uploading}
            className="h-10 w-10 rounded-full text-[#aebac1] hover:text-[#e9edef] hover:bg-[#374045] disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="text-center flex-1">
            <p className="text-[#e9edef] font-medium truncate px-4">{pendingFile.file.name}</p>
            <p className="text-[#8696a0] text-sm">{formatFileSize(pendingFile.file.size)}</p>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Preview area - takes remaining space */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <div className="max-w-full max-h-full rounded-lg overflow-hidden bg-[#111b21] shadow-2xl">
            {pendingFile.type === 'image' && pendingFile.previewUrl && (
              <img 
                src={pendingFile.previewUrl} 
                alt="Preview" 
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
            {pendingFile.type === 'video' && pendingFile.previewUrl && (
              <video 
                src={pendingFile.previewUrl} 
                controls 
                autoPlay
                muted
                className="max-w-full max-h-[60vh]"
              />
            )}
            {pendingFile.type === 'document' && (
              <div className="p-12 flex flex-col items-center gap-4">
                <FileText className="h-24 w-24 text-[#5157ae]" />
                <span className="text-[#e9edef] text-lg text-center max-w-[250px] truncate">
                  {pendingFile.file.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Upload progress bar */}
        {uploading && (
          <div className="px-4 py-3 bg-[#111b21]">
            <div className="max-w-md mx-auto space-y-2">
              <div className="h-2 bg-[#374045] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#00a884] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-[#8696a0] text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Enviando... {uploadProgress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Caption input and send */}
        <div className="px-4 py-3 bg-[#202c33] flex items-center gap-3 safe-area-bottom">
          <div className="flex-1 bg-[#2a3942] rounded-lg">
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Adicionar legenda..."
              disabled={uploading}
              className="bg-transparent border-none text-[#d1d7db] placeholder:text-[#8696a0] focus-visible:ring-0 disabled:opacity-50 h-11"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !uploading) {
                  e.preventDefault();
                  sendPendingFile();
                }
              }}
            />
          </div>
          <Button
            onClick={sendPendingFile}
            disabled={uploading}
            size="icon"
            className="h-12 w-12 rounded-full bg-[#00a884] hover:bg-[#00997a] flex-shrink-0"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#111b21]" />
            ) : (
              <Send className="h-6 w-6 text-[#111b21]" />
            )}
          </Button>
        </div>
      </div>
    );
  }

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
