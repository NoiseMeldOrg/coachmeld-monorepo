import { dietKnowledgeMap, DietKnowledge } from '../data/knowledge';
import { supabase } from '../lib/supabase';
import { geminiClientService } from './geminiClientService';

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
    console.log(`Starting to embed knowledge for coach: ${coachId}`);
    
    try {
      const chunks = await this.prepareKnowledgeChunks(coachId);
      console.log(`Prepared ${chunks.length} chunks for ${coachId}`);

      // Check if knowledge already exists
      const { data: existingDocs, error: checkError } = await supabase
        .from('user_documents')
        .select('id')
        .eq('coach_id', coachId)
        .eq('source_type', 'knowledge_base')
        .limit(1);

      if (checkError) {
        console.error('Error checking existing knowledge:', checkError);
        throw checkError;
      }

      // If knowledge exists, delete old entries first
      if (existingDocs && existingDocs.length > 0) {
        console.log(`Deleting existing knowledge for ${coachId}`);
        const { error: deleteError } = await supabase
          .from('user_documents')
          .delete()
          .eq('coach_id', coachId)
          .eq('source_type', 'knowledge_base');

        if (deleteError) {
          console.error('Error deleting old knowledge:', deleteError);
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
          console.error('Error inserting embeddings:', insertError);
          throw insertError;
        }

        console.log(`Processed ${i + batch.length}/${chunks.length} chunks for ${coachId}`);
      }

      console.log(`Successfully embedded all knowledge for ${coachId}`);
    } catch (error) {
      console.error(`Failed to embed knowledge for ${coachId}:`, error);
      throw error;
    }
  }

  // Embed knowledge for all coaches
  static async embedAllCoachKnowledge(): Promise<void> {
    const coachIds = Object.keys(dietKnowledgeMap);
    console.log(`Starting to embed knowledge for ${coachIds.length} coaches`);

    for (const coachId of coachIds) {
      try {
        await this.embedCoachKnowledge(coachId);
        console.log(`✓ Completed ${coachId}`);
      } catch (error) {
        console.error(`✗ Failed ${coachId}:`, error);
      }
    }

    console.log('Finished embedding all coach knowledge');
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
        console.error('Knowledge search error:', error);
        throw error;
      }

      return data.map((doc: any) => ({
        content: doc.content,
        category: doc.metadata?.category || 'General',
        similarity: doc.similarity
      }));
    } catch (error) {
      console.error('Failed to search knowledge:', error);
      return [];
    }
  }
}