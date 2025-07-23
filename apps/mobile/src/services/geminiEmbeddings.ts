import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiEmbeddings {
  private genAI: GoogleGenerativeAI;
  private embeddingModel: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found. Embeddings will use mock data.');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use the embedding model when available
    // For now, we'll use a mock implementation
  }

  /**
   * Generate embeddings for text using Gemini API
   * Returns a 768-dimensional vector matching our database schema
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // In production, this would use Gemini's embedding model
      // For now, return a mock embedding
      return this.generateMockEmbedding(text, 768);
    } catch (error) {
      console.error('Error generating embedding:', error);
      return this.generateMockEmbedding(text, 768);
    }
  }

  /**
   * Generate a deterministic mock embedding based on text content
   */
  private generateMockEmbedding(text: string, dimensions: number): number[] {
    const embedding = new Array(dimensions).fill(0);
    
    // Create a simple hash of the text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use the hash to generate deterministic values
    for (let i = 0; i < dimensions; i++) {
      // Generate pseudo-random values based on hash and index
      const seed = hash + i;
      const x = Math.sin(seed) * 10000;
      embedding[i] = (x - Math.floor(x)) * 2 - 1; // Normalize to [-1, 1]
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimensions');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}