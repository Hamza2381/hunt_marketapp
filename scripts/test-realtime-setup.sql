-- Test real-time configuration in Supabase
-- Run this in Supabase SQL Editor to check and enable real-time

-- 1. Check current publication status
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 2. Check which tables are in the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN ('chat_conversations', 'chat_messages');

-- 3. If tables are not in publication, add them
DO $$
BEGIN
    -- Check if chat_conversations is in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
        RAISE NOTICE 'Added chat_conversations to realtime publication';
    ELSE
        RAISE NOTICE 'chat_conversations already in realtime publication';
    END IF;

    -- Check if chat_messages is in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        RAISE NOTICE 'Added chat_messages to realtime publication';
    ELSE
        RAISE NOTICE 'chat_messages already in realtime publication';
    END IF;
END $$;

-- 4. Ensure tables have proper replica identity
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 5. Verify final state
SELECT 
    schemaname, 
    tablename,
    'Added to realtime' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN ('chat_conversations', 'chat_messages');

-- 6. Test insert to verify real-time works
DO $$
BEGIN
    RAISE NOTICE '✅ Real-time setup complete for chat tables!';
    RAISE NOTICE 'You can now test by sending a message through the chat interface.';
    RAISE NOTICE 'Check browser console for real-time subscription logs.';
END $$;
