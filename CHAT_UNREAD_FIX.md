# Chat Unread Count Auto-Clear Fix

## Problem
Previously, unread message counts ("1", "2", etc.) were only cleared when a conversation was clicked. This meant that during active chat sessions, users would still see unread counts for incoming messages even though they were actively viewing and responding to the conversation.

## Solution Implemented

### Admin Side (chat-management.tsx)
- **Real-time message handling**: Modified the real-time message subscription to check if a conversation is currently selected/active
- **Auto-mark as read**: When a customer message arrives in an active conversation, it automatically:
  - Sets unread_count to 0 in the UI
  - Makes a server call to mark the conversation as read
  - Prevents the unread badge from appearing

### Customer Side (use-chat.ts + chat-widget.tsx)
- **Selected conversation tracking**: Modified useChat hook to accept selectedConversationId parameter
- **Real-time message handling**: When an admin message arrives in an active conversation, it automatically:
  - Sets unread_count to 0 in the UI
  - Makes a server call to mark the conversation as read
  - Prevents the unread badge from appearing

## Key Changes

### 1. Admin Chat Management (`components/admin/chat-management.tsx`)
```typescript
// Check if this conversation is currently selected/active
const isConversationActive = selectedConversation === conv.id

// If conversation is active, don't increment unread count and auto-mark as read
let newUnreadCount = conv.unread_count || 0
if (!newMessage.is_admin) { // Only for customer messages to admin
  if (isConversationActive) {
    // Auto-mark as read if conversation is currently open
    newUnreadCount = 0
    // Also mark as read on server (non-blocking)
    markConversationAsRead(conv.id)
  } else {
    // Increment unread count if conversation is not active
    newUnreadCount = newUnreadCount + 1
  }
}
```

### 2. Customer Chat Hook (`hooks/use-chat.ts`)
```typescript
// Modified to accept selectedConversationId parameter
export function useChat(selectedConversationId?: number | null)

// Similar logic for admin messages to customers
if (newMessage.is_admin) { // Only for admin messages to customer
  if (isConversationActive) {
    newUnreadCount = 0
    shouldAutoMarkRead = true
  } else {
    newUnreadCount = newUnreadCount + 1
  }
}
```

### 3. Chat Widget (`components/chat/chat-widget.tsx`)
```typescript
// Pass selectedConversation to useChat hook
const { ... } = useChat(selectedConversation)
```

## How It Works

1. **Conversation Selection**: When a user selects a conversation, the selectedConversation ID is tracked
2. **Real-time Message Arrival**: When a new message arrives via real-time subscription:
   - Check if the message is for the currently active conversation
   - If active: Set unread count to 0 and mark as read on server
   - If not active: Increment unread count normally
3. **UI Updates**: The unread badges automatically disappear when users are actively viewing conversations

## Benefits

- **Better UX**: No more confusing unread counts during active conversations
- **Real-time**: Works immediately as messages arrive, not just on click
- **Both Sides**: Works for both admin dashboard and customer widget
- **Non-blocking**: Server calls to mark as read happen asynchronously without affecting UI performance

## Testing

To test the fix:
1. Open admin dashboard and select a conversation
2. Have customer send a message - no unread count should appear on admin side
3. Open customer chat widget and select a conversation  
4. Have admin reply - no unread count should appear on customer side
5. Messages in non-active conversations should still show unread counts normally
