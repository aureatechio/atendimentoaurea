-- Fix function search path
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message = NEW.content,
    last_message_at = NEW.created_at,
    unread_count = CASE WHEN NEW.sender_type = 'customer' THEN unread_count + 1 ELSE unread_count END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;