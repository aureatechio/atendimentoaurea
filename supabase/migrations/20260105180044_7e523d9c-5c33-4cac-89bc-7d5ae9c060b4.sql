-- Add media columns to messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_mime_type TEXT,
ADD COLUMN IF NOT EXISTS media_caption TEXT;

-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat media
CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "Anyone can upload chat media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "Anyone can update chat media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-media');

CREATE POLICY "Anyone can delete chat media"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-media');