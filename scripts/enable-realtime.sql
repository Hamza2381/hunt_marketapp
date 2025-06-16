-- Enable real-time for chat tables
-- This needs to be run in Supabase SQL editor

-- First, check if realtime is enabled for our tables
SELECT schemaname, tablename, realtime 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_conversations', 'chat_messages');

-- Enable real-time replication for chat tables
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Verify the tables are added to realtime
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Real-time enabled for chat tables!';
END $$;
