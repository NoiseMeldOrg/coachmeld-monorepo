import { supabase } from '../lib/supabase';
import { embeddingService } from './embeddingService';

export interface RAGDocument {
  document_id: string;
  title: string;
  content: string;
  metadata: any;
  similarity_score: number;
}

export interface RAGSearchOptions {
  coachId: string;
  userId?: string;
  limit?: number;
  threshold?: number;
}

/**
 * Service for interacting with the RAG (Retrieval-Augmented Generation) system
 */
export class RAGService {
  /**
   * Generate embedding for a text query using Gemini
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use the embedding service which calls Gemini via Edge Function
      return await embeddingService.embedQuery(text);
    } catch (error) {
      console.log('Gemini embedding service not available, using mock embedding');
      // Fallback to mock embedding for development
      return Array(768).fill(0).map(() => Math.random() * 2 - 1);
    }
  }

  /**
   * Search the RAG system for relevant documents
   */
  async searchDocuments(
    query: string,
    options: RAGSearchOptions
  ): Promise<RAGDocument[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Call the search function with proper parameters
      // Parameters must be in the correct order: coach_id, embedding, user_id (optional), threshold, count
      const params: any = {
        p_coach_id: options.coachId,
        query_embedding: queryEmbedding,
        match_threshold: options.threshold || 0.7,
        match_count: options.limit || 10
      };
      
      // Only include p_user_id if it's actually provided
      if (options.userId) {
        params.p_user_id = options.userId;
      }
      
      const { data, error } = await supabase.rpc('search_coach_documents_with_access', params);

      if (error) {
        console.error('RAG search error:', error);
        
        // Fallback: Get documents through junction table without vector search
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('coach_documents')
          .select(`
            id,
            content,
            metadata,
            coach_document_access!inner(coach_id)
          `)
          .eq('coach_document_access.coach_id', options.coachId)
          .limit(options.limit || 3);
          
        if (fallbackError) {
          console.error('Fallback query error:', fallbackError);
          return [];
        }
        
        // Map to expected format with mock similarity scores
        return (fallbackData || []).map(doc => ({
          document_id: doc.id,
          title: doc.metadata?.title || 'Untitled',
          content: doc.content,
          metadata: doc.metadata,
          similarity_score: 0.7
        }));
      }

      // Format the results
      if (data) {
        return data.map((doc: any) => ({
          document_id: doc.id,
          title: doc.metadata?.title || 'Untitled',
          content: doc.content,
          metadata: doc.metadata,
          similarity_score: doc.similarity
        }));
      }

      return data || [];
    } catch (error) {
      console.error('Error searching RAG documents:', error);
      return [];
    }
  }

  /**
   * Format retrieved documents into context for the AI
   */
  formatContext(documents: RAGDocument[]): string {
    if (documents.length === 0) {
      return '';
    }

    let context = 'Based on the following knowledge:\n\n';
    
    documents.forEach((doc, index) => {
      context += `[Source ${index + 1}: ${doc.title}]\n`;
      context += `${doc.content.substring(0, 500)}...\n\n`;
    });

    return context;
  }

  /**
   * Extract the most relevant information from documents
   */
  extractRelevantInfo(documents: RAGDocument[], query: string): string[] {
    const relevantInfo: string[] = [];
    
    documents.forEach(doc => {
      // Simple keyword matching for now
      const queryWords = query.toLowerCase().split(' ');
      const sentences = doc.content.split('. ');
      
      sentences.forEach(sentence => {
        const sentenceLower = sentence.toLowerCase();
        const matchCount = queryWords.filter(word => 
          sentenceLower.includes(word) && word.length > 3
        ).length;
        
        if (matchCount >= 2) {
          relevantInfo.push(sentence.trim());
        }
      });
    });

    return relevantInfo.slice(0, 5); // Return top 5 relevant sentences
  }
}