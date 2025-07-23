import { supabase } from '../lib/supabase';
import { Message } from '../types';

interface ConversationSummary {
  id?: string;
  userId: string;
  coachId: string;
  summary: string;
  keyFacts: string[];
  topics: string[];
  lastMessageId: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UserMemory {
  userId: string;
  facts: Record<string, any>;
  preferences: Record<string, any>;
  healthData: Record<string, any>;
  lastUpdated: Date;
}

export class ConversationMemoryService {
  private static readonly SUMMARY_THRESHOLD = 20; // Summarize after 20 messages
  private static readonly CONTEXT_WINDOW = 10; // Keep last 10 messages in detail

  /**
   * Get conversation context for a coach session
   */
  static async getConversationContext(
    userId: string,
    coachId: string,
    recentMessages: Message[]
  ): Promise<{
    recentMessages: Message[];
    summary?: string;
    keyFacts: string[];
    previousTopics: string[];
  }> {
    try {
      // Get conversation summary if exists
      const { data: summaryData } = await supabase
        .from('conversation_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get user memory
      const { data: memoryData } = await supabase
        .from('user_memories')
        .select('*')
        .eq('user_id', userId)
        .single();

      const keyFacts = [
        ...(summaryData?.key_facts || []),
        ...(memoryData ? this.extractFactsFromMemory(memoryData) : [])
      ];

      return {
        recentMessages: recentMessages.slice(-this.CONTEXT_WINDOW),
        summary: summaryData?.summary,
        keyFacts,
        previousTopics: summaryData?.topics || []
      };
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return {
        recentMessages: recentMessages.slice(-this.CONTEXT_WINDOW),
        keyFacts: [],
        previousTopics: []
      };
    }
  }

  /**
   * Update conversation memory after new messages
   */
  static async updateConversationMemory(
    userId: string,
    coachId: string,
    messages: Message[]
  ): Promise<void> {
    try {
      // Check if we need to create a summary
      const messagesSinceLastSummary = await this.getMessagesSinceLastSummary(userId, coachId);
      
      if (messagesSinceLastSummary.length >= this.SUMMARY_THRESHOLD) {
        await this.createConversationSummary(userId, coachId, messagesSinceLastSummary);
      }

      // Extract and update user facts from recent messages
      await this.updateUserMemory(userId, messages);
    } catch (error) {
      console.error('Error updating conversation memory:', error);
    }
  }

  /**
   * Create a summary of conversation
   */
  private static async createConversationSummary(
    userId: string,
    coachId: string,
    messages: Message[]
  ): Promise<void> {
    const summary = this.generateSummary(messages);
    const keyFacts = this.extractKeyFacts(messages);
    const topics = this.extractTopics(messages);

    const summaryData = {
      user_id: userId,
      coach_id: coachId,
      summary,
      key_facts: keyFacts,
      topics,
      last_message_id: messages[messages.length - 1].id,
      message_count: messages.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('conversation_summaries')
      .insert(summaryData);
  }

  /**
   * Generate a text summary of messages
   */
  private static generateSummary(messages: Message[]): string {
    // Group messages by topic/theme
    const userQuestions = messages
      .filter(m => m.sender === 'user')
      .map(m => m.text);

    const coachResponses = messages
      .filter(m => m.sender === 'coach')
      .map(m => m.text);

    // Simple summary generation (in production, use AI)
    const topics = this.extractTopics(messages);
    
    return `User discussed ${topics.join(', ')}. Key questions included: ${
      userQuestions.slice(0, 3).join('; ')
    }. Coach provided guidance on these topics.`;
  }

  /**
   * Extract important facts from conversation
   */
  private static extractKeyFacts(messages: Message[]): string[] {
    const facts: string[] = [];
    const factPatterns = [
      /I am (\d+) years old/i,
      /I weigh (\d+) ?(lbs|kg|pounds|kilos)/i,
      /my goal is to (.+)/i,
      /I have been? (.+ing) for (\d+) (days|weeks|months|years)/i,
      /I (?:have|suffer from|diagnosed with) (.+)/i,
      /I (?:eat|follow) (?:a|the) (.+) diet/i,
      /I (?:workout|exercise|train) (\d+) times? (?:a|per) week/i,
      /I (?:am|work as) (?:a|an) (.+)/i,
      /allergic to (.+)/i,
      /I (?:take|use) (.+) (?:supplement|medication)/i
    ];

    messages.forEach(message => {
      if (message.sender === 'user') {
        factPatterns.forEach(pattern => {
          const match = message.text.match(pattern);
          if (match) {
            facts.push(match[0]);
          }
        });
      }
    });

    // Also extract facts from coach confirmations
    const coachConfirmations = messages
      .filter(m => m.sender === 'coach' && m.text.includes('understand that you'))
      .map(m => {
        const match = m.text.match(/understand that you (.+?)(?:\.|,)/i);
        return match ? `User ${match[1]}` : null;
      })
      .filter(Boolean) as string[];

    return [...new Set([...facts, ...coachConfirmations])];
  }

  /**
   * Extract topics discussed
   */
  private static extractTopics(messages: Message[]): string[] {
    const topicKeywords = {
      'diet': ['diet', 'eating', 'food', 'meal', 'nutrition', 'carnivore', 'keto', 'calories'],
      'exercise': ['workout', 'exercise', 'training', 'gym', 'fitness', 'strength'],
      'weight': ['weight', 'pounds', 'kg', 'loss', 'gain', 'scale'],
      'health': ['health', 'condition', 'symptom', 'pain', 'energy', 'sleep'],
      'supplements': ['supplement', 'vitamin', 'mineral', 'electrolyte'],
      'fasting': ['fast', 'fasting', 'OMAD', 'intermittent'],
      'progress': ['progress', 'results', 'plateau', 'stall']
    };

    const topics = new Set<string>();

    messages.forEach(message => {
      const text = message.text.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics);
  }

  /**
   * Update user memory with extracted information
   */
  private static async updateUserMemory(
    userId: string,
    recentMessages: Message[]
  ): Promise<void> {
    const facts = this.extractKeyFacts(recentMessages);
    if (facts.length === 0) return;

    const { data: existingMemory } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .single();

    const currentFacts = existingMemory?.facts || {};
    const updatedFacts = { ...currentFacts };

    // Parse and structure facts
    facts.forEach(fact => {
      if (fact.includes('years old')) {
        const age = fact.match(/(\d+) years old/)?.[1];
        if (age) updatedFacts.age = parseInt(age);
      }
      if (fact.includes('weigh')) {
        const weight = fact.match(/weigh (\d+)/)?.[1];
        if (weight) updatedFacts.currentWeight = parseInt(weight);
      }
      // Add more fact parsing as needed
    });

    const memoryData = {
      user_id: userId,
      facts: updatedFacts,
      preferences: existingMemory?.preferences || {},
      health_data: existingMemory?.health_data || {},
      last_updated: new Date().toISOString()
    };

    if (existingMemory) {
      await supabase
        .from('user_memories')
        .update(memoryData)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_memories')
        .insert(memoryData);
    }
  }

  /**
   * Get messages since last summary
   */
  private static async getMessagesSinceLastSummary(
    userId: string,
    coachId: string
  ): Promise<Message[]> {
    // Get last summary
    const { data: lastSummary } = await supabase
      .from('conversation_summaries')
      .select('last_message_id, created_at')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get messages since last summary
    let query = supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: true });

    if (lastSummary) {
      query = query.gt('created_at', lastSummary.created_at);
    }

    const { data: messages } = await query;

    return (messages || []).map(msg => ({
      id: msg.id,
      text: msg.content,
      sender: msg.is_user ? 'user' : 'coach',
      timestamp: new Date(msg.created_at),
      coachId: msg.coach_id
    }));
  }

  /**
   * Extract facts from user memory for context
   */
  private static extractFactsFromMemory(memory: any): string[] {
    const facts: string[] = [];
    
    if (memory.facts) {
      if (memory.facts.age) facts.push(`User is ${memory.facts.age} years old`);
      if (memory.facts.currentWeight) facts.push(`User weighs ${memory.facts.currentWeight}`);
      // Add more fact extraction as needed
    }

    return facts;
  }

  /**
   * Format conversation context for AI prompt
   */
  static formatContextForPrompt(context: {
    recentMessages: Message[];
    summary?: string;
    keyFacts: string[];
    previousTopics: string[];
  }): string {
    let prompt = '';

    if (context.summary) {
      prompt += `Previous Conversation Summary: ${context.summary}\n\n`;
    }

    if (context.keyFacts.length > 0) {
      prompt += `Known Facts About User:\n${context.keyFacts.map(f => `- ${f}`).join('\n')}\n\n`;
    }

    if (context.previousTopics.length > 0) {
      prompt += `Previously Discussed Topics: ${context.previousTopics.join(', ')}\n\n`;
    }

    if (context.recentMessages.length > 0) {
      prompt += `Recent Conversation:\n`;
      context.recentMessages.forEach(msg => {
        const role = msg.sender === 'user' ? 'User' : 'Coach';
        prompt += `${role}: ${msg.text}\n`;
      });
      prompt += '\n';
    }

    return prompt;
  }
}