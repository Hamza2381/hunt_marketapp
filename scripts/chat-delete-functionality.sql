-- Add delete functionality columns to chat_conversations table

ALTER TABLE chat_conversations 
ADD COLUMN IF NOT EXISTS deleted_by_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_by_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_deleted_by_user ON chat_conversations(deleted_by_user);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_deleted_by_admin ON chat_conversations(deleted_by_admin);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_deleted_at ON chat_conversations(deleted_at);

-- Update RLS policies to handle delete functionality
-- Policy for regular users (non-admin) - they can only see their own non-deleted conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON chat_conversations;
CREATE POLICY "Users can view their own conversations" ON chat_conversations
  FOR SELECT USING (
    auth.uid() = user_id 
    AND deleted_by_user = FALSE
  );

-- Policy for admin users - they can see all non-admin-deleted conversations
DROP POLICY IF EXISTS "Admins can view all conversations" ON chat_conversations;
CREATE POLICY "Admins can view all conversations" ON chat_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_admin = TRUE
    )
    AND deleted_by_admin = FALSE
  );

-- Policy for users to update their own conversations (for delete functionality)
DROP POLICY IF EXISTS "Users can update their own conversations delete status" ON chat_conversations;
CREATE POLICY "Users can update their own conversations delete status" ON chat_conversations
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- Policy for admins to update any conversation
DROP POLICY IF EXISTS "Admins can update any conversation" ON chat_conversations;
CREATE POLICY "Admins can update any conversation" ON chat_conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_admin = TRUE
    )
  );

-- Policy for admins to delete conversations permanently
DROP POLICY IF EXISTS "Admins can delete conversations" ON chat_conversations;
CREATE POLICY "Admins can delete conversations" ON chat_conversations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.is_admin = TRUE
    )
  );

-- Comments for documentation
COMMENT ON COLUMN chat_conversations.deleted_by_user IS 'User has hidden this conversation from their view';
COMMENT ON COLUMN chat_conversations.deleted_by_admin IS 'Admin has archived this conversation from admin dashboard';
COMMENT ON COLUMN chat_conversations.deleted_at IS 'Timestamp when conversation was deleted/archived';
