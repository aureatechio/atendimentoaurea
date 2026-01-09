-- Add reply_to_message_id column to store the reference to the replied message
ALTER TABLE public.messages 
ADD COLUMN reply_to_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;