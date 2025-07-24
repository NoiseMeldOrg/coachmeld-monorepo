import { dietKnowledgeMap, DietKnowledge } from '../data/knowledge';
import { supabase } from '../lib/supabase';
import { geminiClientService } from './geminiClientService';
import { logger } from '../../../../packages/shared-utils/src/logger';

interface KnowledgeChunk {
  coachId: string;
  dietType: string;
  category: string;
  content: string;
  chunkType: 'knowledge' | 'faq';
  metadata: Record<string, any>;
}

export class KnowledgeEmbeddingService {
  // Prepare knowledge for embedding
  static async prepareKnowledgeChunks(coachId: string): Promise<KnowledgeChunk[]> {
    const knowledge = dietKnowledgeMap[coachId];
    if (!knowledge) {
      throw new Error(`No knowledge found for coach: ${coachId}`);
    }

    const chunks: KnowledgeChunk[] = [];

    // Process knowledge base entries
    for (const item of knowledge.knowledgeBase) {
      chunks.push({
        coachId,
        dietType: knowledge.dietType,
        category: item.category,
        content: `${item.category}: ${item.content}`,
        chunkType: 'knowledge',
        metadata: {
          category: item.category,
          dietType: knowledge.dietType,
        }
      });
    }

    // Process FAQ entries
    for (const faq of knowledge.commonQuestions) {
      chunks.push({
        coachId,
        dietType: knowledge.dietType,
        category: 'FAQ',
        content: `Question: ${faq.question}\nAnswer: ${faq.answer}`,
        chunkType: 'faq',
        metadata: {
          question: faq.question,
          category: 'FAQ',
          dietType: knowledge.dietType,
        }
      });
    }

    return chunks;
  }

  // Embed and store knowledge for a specific coach
  static async embedCoachKnowledge(coachId: string): Promise<void> {
    logger.info('Starting knowledge embedding for coach', { coachId });
    
    try {
      const chunks = await this.prepareKnowledgeChunks(coachId);
      logger.info('Prepared knowledge chunks', { coachId, chunkCount: chunks.length });

      // Check if knowledge already exists
      const { data: existingDocs, error: checkError } = await supabase
        .from('user_documents')
        .select('id')
        .eq('coach_id', coachId)
        .eq('source_type', 'knowledge_base')
        .limit(1);

      if (checkError) {
        logger.error('Error checking existing knowledge', { coachId, error: checkError });
        throw checkError;
      }

      // If knowledge exists, delete old entries first
      if (existingDocs && existingDocs.length > 0) {
        logger.info('Deleting existing knowledge', { coachId });
        const { error: deleteError } = await supabase
          .from('user_documents')
          .delete()
          .eq('coach_id', coachId)
          .eq('source_type', 'knowledge_base');

        if (deleteError) {
          logger.error('Error deleting old knowledge', { coachId, error: deleteError });
          throw deleteError;
        }
      }

      // Process chunks in batches to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const embeddings = await Promise.all(
          batch.map(async (chunk) => {
            const embedding = await geminiClientService.generateEmbedding(chunk.content);
            return {
              user_id: 'system', // System-level knowledge
              coach_id: coachId,
              content: chunk.content,
              embedding,
              metadata: {
                ...chunk.metadata,
                chunkType: chunk.chunkType,
                category: chunk.category,
              },
              source_type: 'knowledge_base',
              created_at: new Date().toISOString(),
            };
          })
        );

        // Insert batch into database
        const { error: insertError } = await supabase
          .from('user_documents')
          .insert(embeddings);

        if (insertError) {
          logger.error('Error inserting embeddings', { coachId, error: insertError });
          throw insertError;
        }

        logger.info('Processed knowledge chunk batch', { 
          coachId, 
          processed: i + batch.length, 
          total: chunks.length 
        });
      }

      logger.info('Successfully embedded all knowledge', { coachId });
    } catch (error) {
      logger.error('Failed to embed knowledge', { coachId, error });
      throw error;
    }
  }

  // Embed knowledge for all coaches
  static async embedAllCoachKnowledge(): Promise<void> {
    const coachIds = Object.keys(dietKnowledgeMap);
    logger.info('Starting knowledge embedding for all coaches', { coachCount: coachIds.length });

    for (const coachId of coachIds) {
      try {
        await this.embedCoachKnowledge(coachId);
        logger.info('Coach knowledge embedding completed', { coachId });
      } catch (error) {
        logger.error('Coach knowledge embedding failed', { coachId, error });
      }
    }

    logger.info('Finished embedding all coach knowledge');
  }

  // Search knowledge base using embeddings
  static async searchKnowledge(
    coachId: string, 
    query: string, 
    limit: number = 5
  ): Promise<Array<{
    content: string;
    category: string;
    similarity: number;
  }>> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await geminiClientService.generateEmbedding(query);

      // Search in the database
      const { data, error } = await supabase.rpc('search_documents', {
        query_embedding: queryEmbedding,
        match_count: limit,
        filter_coach_id: coachId,
        filter_source_type: 'knowledge_base'
      });

      if (error) {
        logger.error('Knowledge search error', { coachId, query, error });
        throw error;
      }

      return data.map((doc: any) => ({
        content: doc.content,
        category: doc.metadata?.category || 'General',
        similarity: doc.similarity
      }));
    } catch (error) {
      logger.error('Failed to search knowledge', { coachId, query, error });
      return [];
    }
  }
}