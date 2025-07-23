/**
 * Gemini Embedding Service
 * Uses embedding-001 model which returns 768-dimensional vectors
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiEmbeddingService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = 'embedding-001'; // Stable embedding model
    this.dimensions = 768; // We'll see what dimensions it returns
    
    // Rate limiting: 1,500 requests per minute
    this.requestsPerMinute = 1500;
    this.requestQueue = [];
    this.lastRequestTime = Date.now();
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} 768-dimensional embedding
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      // Rate limiting
      await this.enforceRateLimit();

      const model = this.genAI.getGenerativeModel({ model: this.model });
      
      // Generate embedding - Gemini currently returns 768 dimensions by default
      const result = await model.embedContent(text);
      
      const embedding = result.embedding.values;
      
      if (embedding.length !== this.dimensions) {
        throw new Error(`Expected ${this.dimensions} dimensions, got ${embedding.length}`);
      }

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   * @param {string[]} texts - Array of texts to embed
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<number[][]>} Array of embeddings
   */
  async generateBatchEmbeddings(texts, onProgress = null) {
    const embeddings = [];
    const total = texts.length;

    for (let i = 0; i < total; i++) {
      try {
        const embedding = await this.generateEmbedding(texts[i]);
        embeddings.push(embedding);

        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            percentage: Math.round(((i + 1) / total) * 100)
          });
        }
      } catch (error) {
        console.error(`Error embedding text ${i + 1}:`, error.message);
        embeddings.push(null); // Mark failed embeddings
      }
    }

    return embeddings;
  }

  /**
   * Enforce rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minTimeBetweenRequests = 60000 / this.requestsPerMinute; // ~40ms

    if (timeSinceLastRequest < minTimeBetweenRequests) {
      const waitTime = minTimeBetweenRequests - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Estimate token count (rough approximation)
   * Gemini can handle up to 8K tokens per request
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokenCount(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if text exceeds token limit
   * @param {string} text - Text to check
   * @returns {boolean} True if within limits
   */
  isWithinTokenLimit(text) {
    const estimated = this.estimateTokenCount(text);
    return estimated <= 8000; // 8K token limit
  }

  /**
   * Split text into chunks that fit within token limits
   * @param {string} text - Text to split
   * @param {number} maxTokens - Maximum tokens per chunk (default: 7000 to leave buffer)
   * @returns {string[]} Array of text chunks
   */
  splitTextIntoChunks(text, maxTokens = 7000) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokenCount(sentence);
      
      if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
        currentTokens = sentenceTokens;
      } else {
        currentChunk += ' ' + sentence;
        currentTokens += sentenceTokens;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

// Export the service
module.exports = GeminiEmbeddingService;

// Example usage (when run directly)
if (require.main === module) {
  async function example() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Please set GEMINI_API_KEY in .env file');
      process.exit(1);
    }

    const service = new GeminiEmbeddingService(apiKey);

    // Test single embedding
    console.log('Testing single embedding (768 dimensions)...');
    const text = 'The carnivore diet consists of eating only animal products.';
    
    try {
      const embedding = await service.generateEmbedding(text);
      console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
      console.log(`First 10 values: [${embedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...]`);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    // Test batch embeddings
    console.log('\nTesting batch embeddings...');
    const texts = [
      'Red meat provides essential nutrients.',
      'Carnivore diet may help with inflammation.',
      'Always consult a doctor before dietary changes.'
    ];

    try {
      const embeddings = await service.generateBatchEmbeddings(texts, (progress) => {
        console.log(`Progress: ${progress.current}/${progress.total} (${progress.percentage}%)`);
      });
      console.log(`✅ Generated ${embeddings.filter(e => e !== null).length} embeddings`);
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }

  example().catch(console.error);
}