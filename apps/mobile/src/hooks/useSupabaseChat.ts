import { useState, useEffect } from 'react';
import { supabase, Message as DBMessage } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Message } from '../types';

export function useSupabaseChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMessages();
      
      // Commented out real-time subscription for now
      // since we're updating state manually in sendMessage
      // This avoids duplicate messages appearing
    }
  }, [user]);

  const loadMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.is_user ? 'user' : 'coach' as const,
        timestamp: new Date(msg.created_at),
        coachId: msg.coach_id || msg.metadata?.coach_id,
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text: string, coachId?: string, isUser: boolean = true): Promise<Message | null> => {
    if (!user) return null;

    try {
      // Save message (handle missing coach_id column)
      const messageData: any = {
        user_id: user.id,
        content: text,
        is_user: isUser,
      };
      
      // Only add coach_id if the column exists (migration 002)
      if (coachId) {
        messageData.metadata = { coach_id: coachId };
      }
      
      const { data: message, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      const newMessage: Message = {
        id: message.id,
        text: message.content,
        sender: isUser ? 'user' : 'coach' as const,
        timestamp: new Date(message.created_at),
        coachId: message.coach_id || message.metadata?.coach_id || coachId,
      };
      
      // Immediately update local state
      setMessages(current => [...current, newMessage]);
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  const clearMessages = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setMessages([]);
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  };

  const exportMessages = (coachName?: string, coachId?: string, format: 'text' | 'html' = 'text') => {
    // Filter messages by coach if coachId provided
    const messagesToExport = coachId 
      ? messages.filter(m => m.coachId === coachId)
      : messages;

    if (format === 'html') {
      // HTML format for better formatting
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

    // Default text format
    return messagesToExport.map(m => 
      `[${m.timestamp.toLocaleString()}] ${m.sender === 'user' ? 'You' : coachName || 'Coach'}: ${m.text}`
    ).join('\n\n');
  };

  return {
    messages,
    loading,
    sendMessage,
    clearMessages,
    exportMessages,
    refreshMessages: loadMessages,
  };
}