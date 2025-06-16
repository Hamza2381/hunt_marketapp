-- Final real-time configuration check and fix
-- Run this if real-time is still not working 100%

-- 1. Check if tables are properly configured for real-time
SELECT 
    t.schemaname,
    t.tablename,
    CASE 
        WHEN pt.tablename IS NOT NULL THEN 'ENABLED'
        ELSE 'NOT ENABLED'
    END as realtime_status
FROM pg_tables t
LEFT JOIN pg_publication_tables pt ON (
    pt.schemaname = t.schemaname 
    AND pt.tablename = t.tablename 
    AND pt.pubname = 'supabase_realtime'
)
WHERE t.schemaname = 'public' 
AND t.tablename IN ('chat_conversations', 'chat_messages')
ORDER BY t.tablename;

-- 2. Enable real-time for tables (if not already enabled)
DO $$
BEGIN
    -- Enable for chat_conversations
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
        RAISE NOTICE '✅ Added chat_conversations to real-time publication';
    END IF;

    -- Enable for chat_messages  
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        RAISE NOTICE '✅ Added chat_messages to real-time publication';
    END IF;
END $$;

-- 3. Set proper replica identity (required for UPDATE/DELETE events)
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- 4. Check RLS policies (should not block real-time)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('chat_conversations', 'chat_messages')
ORDER BY tablename, policyname;

-- 5. Final verification
SELECT 
    'Real-time is now configured for: ' || string_agg(tablename, ', ') as message
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN ('chat_conversations', 'chat_messages');

-- 6. Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 Real-time configuration complete!';
    RAISE NOTICE 'Now refresh your app and test the chat system.';
    RAISE NOTICE 'Messages should appear instantly without page refresh.';
END $$;
