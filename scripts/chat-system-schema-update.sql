-- Add read status field to chat_messages table if it doesn't exist
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;

-- Create index for better performance on read status queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(read, is_admin, conversation_id);

-- Update existing messages to be marked as read
UPDATE public.chat_messages SET read = TRUE WHERE read IS NULL;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(conv_id INTEGER, user_is_admin BOOLEAN)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Mark messages as read from the opposite party
    UPDATE chat_messages 
    SET read = TRUE 
    WHERE conversation_id = conv_id 
    AND is_admin = NOT user_is_admin 
    AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_messages_as_read(INTEGER, BOOLEAN) TO authenticated;

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Chat system schema updates applied successfully!';
END $$;
