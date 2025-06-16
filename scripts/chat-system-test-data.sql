-- Test script to verify chat system functionality
-- Run this after the main schema to create some test data

-- Insert test conversations (only if they don't exist)
INSERT INTO public.chat_conversations (user_id, subject, status, priority)
SELECT 
    id, 
    'Test Support Request - Order Issue',
    'open',
    'medium'
FROM user_profiles 
WHERE is_admin = FALSE 
AND NOT EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE user_id = user_profiles.id 
    AND subject = 'Test Support Request - Order Issue'
)
LIMIT 1;

-- Get the conversation ID for test messages
DO $$ 
DECLARE 
    test_conv_id INTEGER;
    test_user_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get test conversation
    SELECT cc.id, cc.user_id INTO test_conv_id, test_user_id
    FROM chat_conversations cc
    JOIN user_profiles up ON cc.user_id = up.id
    WHERE up.is_admin = FALSE
    AND cc.subject = 'Test Support Request - Order Issue'
    LIMIT 1;
    
    -- Get admin user
    SELECT id INTO admin_user_id
    FROM user_profiles
    WHERE is_admin = TRUE
    LIMIT 1;
    
    IF test_conv_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
        -- Insert test messages if they don't exist
        INSERT INTO public.chat_messages (conversation_id, sender_id, message, is_admin, read)
        SELECT test_conv_id, test_user_id, 'Hello, I have an issue with my recent order #12345. It seems to be delayed.', FALSE, TRUE
        WHERE NOT EXISTS (
            SELECT 1 FROM chat_messages 
            WHERE conversation_id = test_conv_id 
            AND message LIKE '%order #12345%'
        );
        
        INSERT INTO public.chat_messages (conversation_id, sender_id, message, is_admin, read)
        SELECT test_conv_id, admin_user_id, 'Hi! I understand your concern about order #12345. Let me check the status for you.', TRUE, FALSE
        WHERE NOT EXISTS (
            SELECT 1 FROM chat_messages 
            WHERE conversation_id = test_conv_id 
            AND is_admin = TRUE
            AND message LIKE '%check the status%'
        );
        
        INSERT INTO public.chat_messages (conversation_id, sender_id, message, is_admin, read)
        SELECT test_conv_id, admin_user_id, 'I can see that your package is currently in transit and should arrive within 2 business days. You will receive a tracking update shortly.', TRUE, FALSE
        WHERE NOT EXISTS (
            SELECT 1 FROM chat_messages 
            WHERE conversation_id = test_conv_id 
            AND is_admin = TRUE
            AND message LIKE '%tracking update%'
        );
        
        RAISE NOTICE 'Test chat data created successfully for conversation ID: %', test_conv_id;
    ELSE
        RAISE NOTICE 'Could not create test data - missing users or conversation';
    END IF;
END $$;

-- Verify the data
SELECT 
    cc.id as conversation_id,
    cc.subject,
    cc.status,
    cc.priority,
    up.name as user_name,
    up.email as user_email,
    COUNT(cm.id) as message_count,
    COUNT(CASE WHEN cm.read = FALSE AND cm.is_admin = FALSE THEN 1 END) as unread_from_user,
    COUNT(CASE WHEN cm.read = FALSE AND cm.is_admin = TRUE THEN 1 END) as unread_from_admin
FROM chat_conversations cc
LEFT JOIN user_profiles up ON cc.user_id = up.id
LEFT JOIN chat_messages cm ON cc.id = cm.conversation_id
GROUP BY cc.id, cc.subject, cc.status, cc.priority, up.name, up.email
ORDER BY cc.created_at DESC;

-- Show recent messages
SELECT 
    cm.id,
    cc.subject as conversation_subject,
    up.name as sender_name,
    cm.is_admin,
    cm.message,
    cm.read,
    cm.created_at
FROM chat_messages cm
JOIN chat_conversations cc ON cm.conversation_id = cc.id
JOIN user_profiles up ON cm.sender_id = up.id
ORDER BY cm.created_at DESC
LIMIT 10;

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Chat system test data and verification completed!';
END $$;
