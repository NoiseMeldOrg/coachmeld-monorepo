import { supabase } from '../lib/supabase';
import { logger } from '../../../../packages/shared-utils/src/logger';

export interface GeminiChatOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
}

export interface GeminiChatContext {
  systemPrompt?: string;
  userContext?: string;
  conversationContext?: string;
  knowledgeContext?: string;
  coachId?: string;
}

/**
 * Service for interacting with Gemini chat API via Supabase Edge Function
 * This service properly handles authentication and provides better error handling
 */
export class GeminiChatService {
  /**
   * Generate a chat response using Gemini via Edge Function
   * @param prompt The user's message
   * @param context Additional context for the AI
   * @param options Generation options
   * @returns The AI's response
   */
  static async generateResponse(
    prompt: string,
    context: GeminiChatContext = {},
    options: GeminiChatOptions = {}
  ): Promise<string> {
    try {
      // Check if user is authenticated
      logger.debug('Checking authentication for Gemini chat');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      logger.debug('Session check completed', {
        hasSession: !!session,
        sessionError: sessionError?.message,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        tokenLength: session?.access_token?.length
      });
      
      if (sessionError || !session) {
        logger.error('No active session for Gemini chat', { sessionError });
        throw new Error('Authentication required');
      }

      // Call the edge function with proper authentication
      logger.debug('Calling Gemini edge function');
      const { data, error } = await supabase.functions.invoke('chat-completion', {
        body: {
          prompt,
          ...context,
          ...options,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      logger.debug('Gemini edge function response', {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
        errorDetails: error?.details,
        dataError: data?.error,
        responseLength: data?.response?.length
      });

      if (error) {
        logger.error('Gemini edge function error', {
          error,
          errorDetails: {
            message: error.message,
            details: error.details,
            context: error.context,
            code: error.code
          }
        });
        
        // Check for specific error types
        if (error.message?.includes('429') || error.details?.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
        }
        
        throw error;
      }

      if (!data || !data.response) {
        throw new Error('Invalid response from chat completion');
      }

      // Log token usage if available
      if (data.usage) {
        logger.info('Gemini token usage', {
          prompt: data.usage.promptTokens,
          completion: data.usage.completionTokens,
          total: data.usage.totalTokens,
        });
      }

      return data.response;
    } catch (error) {
      logger.error('Error generating chat response', { error });
      
      const errorObj = error as Error;
      // Provide more specific error messages
      if (errorObj.message === 'Authentication required') {
        throw new Error('Please sign in to use the AI coach');
      } else if (errorObj.message?.includes('rate limit')) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      } else if (errorObj.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please try again later.');
      }
      
      // Re-throw the original error if it's not one we handle specifically
      throw error;
    }
  }

  /**
   * Check if Gemini API is available and properly configured
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return false;
      }

      // Try a minimal test request
      const response = await this.generateResponse(
        'test',
        { systemPrompt: 'Respond with "ok"' },
        { maxOutputTokens: 10 }
      );

      return response.toLowerCase().includes('ok');
    } catch (error) {
      logger.debug('Gemini API availability check failed', { error });
      return false;
    }
  }
}