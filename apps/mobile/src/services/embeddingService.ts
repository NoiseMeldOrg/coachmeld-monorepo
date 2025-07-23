import { supabase } from '../lib/supabase';
import { geminiClientService } from './geminiClientService';

export interface DocumentChunk {
  content: string;
  metadata: {
    sourceId: string;
    chunkIndex: number;
    totalChunks: number;
    startChar: number;
    endChar: number;
  };
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private static readonly CHUNK_SIZE = 1000; // Characters per chunk
  private static readonly CHUNK_OVERLAP = 200; // Overlap between chunks

  private constructor() {}

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate embeddings for a document and store in Supabase
   */
  async embedDocument(
    sourceId: string,
    title: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Split content into chunks
      const chunks = this.chunkText(content, sourceId);
      
      // Generate embeddings for each chunk
      const texts = chunks.map(chunk => chunk.content);
      const embeddings = await geminiClientService.generateBatchEmbeddings(texts, {
        taskType: 'RETRIEVAL_DOCUMENT',
        title: title
      });

      // Prepare documents for insertion
      const documents = chunks.map((chunk, index) => ({
        source_id: sourceId,
        title: `${title} - Part ${index + 1}`,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: {
          ...metadata,
          ...chunk.metadata,
          embeddingModel: 'embedding-001',
          embeddingDimensions: embeddings[index].length
        },
        is_active: true
      }));

      // Insert documents with embeddings
      const { error } = await supabase
        .from('coach_documents')
        .insert(documents);

      if (error) {
        console.error('Error inserting documents:', error);
        throw error;
      }

      console.log(`Successfully embedded ${documents.length} chunks for document: ${title}`);
    } catch (error) {
      console.error('Error embedding document:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a search query
   */
  async embedQuery(query: string): Promise<number[]> {
    return geminiClientService.generateEmbedding(query, {
      taskType: 'RETRIEVAL_QUERY'
    });
  }

  /**
   * Update embeddings for existing documents
   */
  async updateDocumentEmbeddings(documentIds: string[]): Promise<void> {
    try {
      // Fetch documents
      const { data: documents, error: fetchError } = await supabase
        .from('coach_documents')
        .select('id, content, title')
        .in('id', documentIds);

      if (fetchError) throw fetchError;
      if (!documents || documents.length === 0) return;

      // Generate new embeddings
      const texts = documents.map(doc => doc.content);
      const embeddings = await geminiClientService.generateBatchEmbeddings(texts, {
        taskType: 'RETRIEVAL_DOCUMENT'
      });

      // Update documents with new embeddings
      for (let i = 0; i < documents.length; i++) {
        const { error: updateError } = await supabase
          .from('coach_documents')
          .update({ 
            embedding: embeddings[i],
            metadata: supabase.rpc('jsonb_merge', { 
              target: (documents[i] as any).metadata || {},
              source: {
                embeddingModel: 'embedding-001',
                embeddingDimensions: embeddings[i].length,
                embeddingUpdatedAt: new Date().toISOString()
              }
            })
          })
          .eq('id', documents[i].id);

        if (updateError) {
          console.error(`Error updating embedding for document ${documents[i].id}:`, updateError);
        }
      }

      console.log(`Successfully updated embeddings for ${documents.length} documents`);
    } catch (error) {
      console.error('Error updating document embeddings:', error);
      throw error;
    }
  }

  /**
   * Split text into overlapping chunks
   */
  private chunkText(text: string, sourceId: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const cleanText = text.trim();
    
    if (cleanText.length <= EmbeddingService.CHUNK_SIZE) {
      // Text fits in a single chunk
      chunks.push({
        content: cleanText,
        metadata: {
          sourceId,
          chunkIndex: 0,
          totalChunks: 1,
          startChar: 0,
          endChar: cleanText.length
        }
      });
      return chunks;
    }

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < cleanText.length) {
      // Calculate end index for this chunk
      let endIndex = startIndex + EmbeddingService.CHUNK_SIZE;
      
      // If this isn't the last chunk, try to find a good break point
      if (endIndex < cleanText.length) {
        // Look for sentence ending
        const sentenceEnd = cleanText.lastIndexOf('.', endIndex);
        if (sentenceEnd > startIndex + EmbeddingService.CHUNK_SIZE / 2) {
          endIndex = sentenceEnd + 1;
        } else {
          // Look for paragraph break
          const paragraphEnd = cleanText.lastIndexOf('\n', endIndex);
          if (paragraphEnd > startIndex + EmbeddingService.CHUNK_SIZE / 2) {
            endIndex = paragraphEnd;
          } else {
            // Look for word boundary
            const wordEnd = cleanText.lastIndexOf(' ', endIndex);
            if (wordEnd > startIndex + EmbeddingService.CHUNK_SIZE / 2) {
              endIndex = wordEnd;
            }
          }
        }
      } else {
        endIndex = cleanText.length;
      }

      // Extract chunk
      const chunkContent = cleanText.substring(startIndex, endIndex).trim();
      
      if (chunkContent.length > 0) {
        chunks.push({
          content: chunkContent,
          metadata: {
            sourceId,
            chunkIndex,
            totalChunks: -1, // Will be updated after all chunks are created
            startChar: startIndex,
            endChar: endIndex
          }
        });
        chunkIndex++;
      }

      // Move to next chunk with overlap
      startIndex = endIndex - EmbeddingService.CHUNK_OVERLAP;
      
      // Make sure we don't go backwards
      if (startIndex <= chunks[chunks.length - 1]?.metadata.startChar) {
        startIndex = endIndex;
      }
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }
}

// Export singleton instance
export const embeddingService = EmbeddingService.getInstance();