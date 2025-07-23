import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

// Initialize Gemini client
let genAI: GoogleGenerativeAI | null = null;

const initializeGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in environment variables');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

export interface GeminiChatOptions {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
}

export interface GeminiEmbeddingOptions {
  title?: string;
  taskType?: TaskType;
}

export class GeminiService {
  private static instance: GeminiService;
  private genAI: GoogleGenerativeAI | null;

  private constructor() {
    this.genAI = initializeGemini();
  }

  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Generate a chat response using Gemini
   */
  async generateChatResponse(
    prompt: string,
    context: {
      systemPrompt?: string;
      userContext?: string;
      conversationContext?: string;
      knowledgeContext?: string;
    },
    options: GeminiChatOptions = {}
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized. Please check your API key.');
    }

    try {
      // Use gemini-pro for chat
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-pro',
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          topK: options.topK ?? 40,
          topP: options.topP ?? 0.95,
          maxOutputTokens: options.maxOutputTokens ?? 2048,
        },
      });

      // Build the full prompt with all context
      let fullPrompt = '';
      
      if (context.systemPrompt) {
        fullPrompt += `${context.systemPrompt}\n\n`;
      }
      
      if (context.conversationContext) {
        fullPrompt += `${context.conversationContext}\n\n`;
      }
      
      if (context.userContext) {
        fullPrompt += `${context.userContext}\n\n`;
      }
      
      if (context.knowledgeContext) {
        fullPrompt += `${context.knowledgeContext}\n\n`;
      }
      
      fullPrompt += `User: ${prompt}\nAssistant:`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text using Gemini
   */
  async generateEmbedding(
    text: string,
    options: GeminiEmbeddingOptions = {}
  ): Promise<number[]> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized. Please check your API key.');
    }

    try {
      // Use embedding model
      const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
      
      const result = await model.embedContent({
        content: { parts: [{ text }], role: 'user' },
        taskType: options.taskType || TaskType.RETRIEVAL_DOCUMENT,
        title: options.title,
      });

      return result.embedding.values;
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
    if (!this.genAI) {
      throw new Error('Gemini API not initialized. Please check your API key.');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
      
      // Process in batches to avoid rate limits
      const batchSize = 10;
      const embeddings: number[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text => 
          model.embedContent({
            content: { parts: [{ text }], role: 'user' },
            taskType: options.taskType || TaskType.RETRIEVAL_DOCUMENT,
            title: options.title,
          })
        );
        
        const results = await Promise.all(batchPromises);
        embeddings.push(...results.map(r => r.embedding.values));
        
        // Add a small delay to avoid rate limiting
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      return embeddings;
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }

  /**
   * Check if Gemini is properly configured
   */
  isConfigured(): boolean {
    return this.genAI !== null;
  }
}

// Export singleton instance
export const geminiService = GeminiService.getInstance();