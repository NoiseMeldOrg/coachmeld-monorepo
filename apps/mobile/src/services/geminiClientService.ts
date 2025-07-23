import { supabase } from '../lib/supabase';

export interface GeminiChatOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
}

export interface GeminiEmbeddingOptions {
  title?: string;
  taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
}

export class GeminiClientService {
  private static instance: GeminiClientService;

  private constructor() {}

  static getInstance(): GeminiClientService {
    if (!GeminiClientService.instance) {
      GeminiClientService.instance = new GeminiClientService();
    }
    return GeminiClientService.instance;
  }

  /**
   * Generate a chat response using Gemini via Edge Function
   */
  async generateChatResponse(
    prompt: string,
    context: {
      systemPrompt?: string;
      userContext?: string;
      conversationContext?: string;
      knowledgeContext?: string;
      coachId?: string;
    },
    options: GeminiChatOptions = {}
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('chat-completion', {
        body: {
          prompt,
          ...context,
          ...options,
        },
      });

      if (error) {
        console.error('Error calling chat completion:', error);
        throw error;
      }

      return data.response;
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text using Gemini via Edge Function
   */
  async generateEmbedding(
    text: string,
    options: GeminiEmbeddingOptions = {}
  ): Promise<number[]> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: {
          text,
          ...options,
        },
      });

      if (error) {
        console.error('Error calling generate embeddings:', error);
        throw error;
      }

      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(
    texts: string[],
    options: GeminiEmbeddingOptions = {}
  ): Promise<number[][]> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: {
          texts,
          ...options,
        },
      });

      if (error) {
        console.error('Error calling generate embeddings:', error);
        throw error;
      }

      return data.embeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const geminiClientService = GeminiClientService.getInstance();