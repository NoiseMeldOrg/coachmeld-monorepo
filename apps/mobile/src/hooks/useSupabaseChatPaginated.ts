import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Message as DBMessage } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Message } from '../types';

interface PaginatedChatOptions {
  pageSize?: number;
  preloadCoachId?: string;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  loadingOlder: boolean;
  hasMoreMessages: boolean;
  error: string | null;
}

export function useSupabaseChatPaginated(options: PaginatedChatOptions = {}) {
  const { user } = useAuth();
  const { pageSize = 25, preloadCoachId } = options;
  
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    loading: true,
    loadingOlder: false,
    hasMoreMessages: true,
    error: null,
  });
  
  const oldestMessageId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);
  const subscriptionRef = useRef<any>(null);
  const currentCoachIdRef = useRef<string | null>(null);

  // Preload recent messages for active coach
  useEffect(() => {
    if (user && preloadCoachId && isInitialLoad.current) {
      loadRecentMessages(preloadCoachId);
      isInitialLoad.current = false;
    }
  }, [user, preloadCoachId]);

  const formatMessage = (msg: DBMessage): Message => ({
    id: msg.id,
    text: msg.content,
    sender: msg.is_user ? 'user' : 'coach' as const,
    timestamp: new Date(msg.created_at),
    coachId: msg.coach_id || msg.metadata?.coach_id,
  });

  // Set up real-time subscription for new messages
  const setupSubscription = useCallback((coachId: string) => {
    if (!user) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Create new subscription
    subscriptionRef.current = supabase
      .channel(`chat_${user.id}_${coachId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as DBMessage;
          
          // Only add if it's for the current coach and not already in the list
          if (newMessage.coach_id === coachId || newMessage.metadata?.coach_id === coachId) {
            setChatState(prev => {
              // Check if message already exists (to prevent duplicates)
              const exists = prev.messages.some(m => m.id === newMessage.id);
              if (exists) return prev;
              
              // Add new message to the end
              const formattedMessage = formatMessage(newMessage);
              return {
                ...prev,
                messages: [...prev.messages, formattedMessage],
              };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Message updated:', payload);
          const updatedMessage = payload.new as DBMessage;
          
          // Update message if it's for the current coach
          if (updatedMessage.coach_id === coachId || updatedMessage.metadata?.coach_id === coachId) {
            setChatState(prev => ({
              ...prev,
              messages: prev.messages.map(m => 
                m.id === updatedMessage.id ? formatMessage(updatedMessage) : m
              ),
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Message deleted:', payload);
          const deletedMessage = payload.old as DBMessage;
          
          // Remove message if it's for the current coach
          if (deletedMessage.coach_id === coachId || deletedMessage.metadata?.coach_id === coachId) {
            setChatState(prev => ({
              ...prev,
              messages: prev.messages.filter(m => m.id !== deletedMessage.id),
            }));
          }
        }
      )
      .subscribe();
  }, [user]);

  const loadRecentMessages = async (coachId: string, append = false) => {
    if (!user) return;
    
    // Update current coach ID and set up subscription
    if (currentCoachIdRef.current !== coachId) {
      currentCoachIdRef.current = coachId;
      setupSubscription(coachId);
    }

    try {
      setChatState(prev => ({ 
        ...prev, 
        loading: !append, 
        loadingOlder: append,
        error: null 
      }));

      let query = supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id);

      // Filter by coach if provided
      if (coachId) {
        query = query.or(`coach_id.eq.${coachId},metadata->>coach_id.eq.${coachId}`);
      }

      // For loading older messages, start from the oldest message we have
      if (append && oldestMessageId.current) {
        query = query.lt('created_at', 
          chatState.messages.find(m => m.id === oldestMessageId.current)?.timestamp.toISOString() || new Date().toISOString()
        );
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (error) throw error;

      const formattedMessages = data.map(formatMessage);
      
      // Reverse to get chronological order (oldest first)
      const chronologicalMessages = formattedMessages.reverse();

      setChatState(prev => {
        const newMessages = append 
          ? [...chronologicalMessages, ...prev.messages]
          : chronologicalMessages;

        // Update oldest message ID for pagination
        if (chronologicalMessages.length > 0) {
          oldestMessageId.current = chronologicalMessages[0].id;
        }

        return {
          ...prev,
          messages: newMessages,
          loading: false,
          loadingOlder: false,
          hasMoreMessages: data.length === pageSize,
          error: null,
        };
      });

      console.log(`Loaded ${formattedMessages.length} messages for coach ${coachId}`, {
        append,
        totalMessages: append ? chatState.messages.length + formattedMessages.length : formattedMessages.length,
        hasMore: data.length === pageSize,
      });

    } catch (error) {
      console.error('Error loading messages:', error);
      setChatState(prev => ({
        ...prev,
        loading: false,
        loadingOlder: false,
        error: error instanceof Error ? error.message : 'Failed to load messages',
      }));
    }
  };

  const loadOlderMessages = useCallback(async (coachId: string) => {
    if (!chatState.hasMoreMessages || chatState.loadingOlder) return;
    
    await loadRecentMessages(coachId, true);
  }, [chatState.hasMoreMessages, chatState.loadingOlder, chatState.messages]);

  const sendMessage = async (text: string, coachId?: string, isUser: boolean = true): Promise<Message | null> => {
    if (!user) return null;

    try {
      const messageData: any = {
        user_id: user.id,
        content: text,
        is_user: isUser,
      };
      
      // Add coach_id to both fields for compatibility
      if (coachId) {
        messageData.coach_id = coachId;
        messageData.metadata = { coach_id: coachId };
      }
      
      const { data: message, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      const newMessage: Message = formatMessage(message);
      
      // For user messages, add immediately for instant feedback
      // The subscription will handle duplicates check
      if (isUser) {
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, newMessage],
        }));
      }
      // For coach messages, let the subscription handle it to ensure proper ordering
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
      }));
      return null;
    }
  };

  const clearMessages = async (coachId?: string) => {
    if (!user) return;

    try {
      let query = supabase
        .from('messages')
        .delete()
        .eq('user_id', user.id);

      if (coachId) {
        query = query.or(`coach_id.eq.${coachId},metadata->>coach_id.eq.${coachId}`);
      }

      const { error } = await query;

      if (error) throw error;
      
      setChatState(prev => ({
        ...prev,
        messages: coachId ? prev.messages.filter(m => m.coachId !== coachId) : [],
      }));
    } catch (error) {
      console.error('Error clearing messages:', error);
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear messages',
      }));
    }
  };

  const exportMessages = (coachName?: string, coachId?: string, format: 'text' | 'html' = 'text') => {
    const messagesToExport = coachId 
      ? chatState.messages.filter(m => m.coachId === coachId)
      : chatState.messages;

    if (format === 'html') {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CoachMeld Chat Export - ${coachName || 'Coach'}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .message { margin-bottom: 20px; padding: 10px; border-radius: 10px; }
    .user { background-color: #007AFF; color: white; margin-left: 20%; }
    .coach { background-color: #F0F0F0; margin-right: 20%; }
    .timestamp { font-size: 12px; opacity: 0.7; margin-bottom: 5px; }
    .text { font-size: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CoachMeld Chat Export</h1>
    <h2>${coachName || 'Coach'}</h2>
    <p>Exported on ${new Date().toLocaleDateString()}</p>
  </div>
  ${messagesToExport.map(m => `
    <div class="message ${m.sender}">
      <div class="timestamp">${m.timestamp.toLocaleString()}</div>
      <div class="text">${m.text}</div>
    </div>
  `).join('')}
</body>
</html>`;
      return html;
    }

    return messagesToExport.map(m => 
      `[${m.timestamp.toLocaleString()}] ${m.sender === 'user' ? 'You' : coachName || 'Coach'}: ${m.text}`
    ).join('\n\n');
  };

  // Refresh messages for a specific coach
  const refreshMessages = useCallback((coachId: string) => {
    oldestMessageId.current = null;
    setChatState(prev => ({ ...prev, messages: [], hasMoreMessages: true }));
    loadRecentMessages(coachId);
  }, []);

  // Clean up subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    ...chatState,
    sendMessage,
    clearMessages,
    exportMessages,
    refreshMessages,
    loadOlderMessages,
    loadRecentMessages,
  };
}