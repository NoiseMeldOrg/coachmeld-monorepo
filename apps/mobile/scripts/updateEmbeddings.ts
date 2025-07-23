#!/usr/bin/env node

/**
 * Script to update embeddings for existing documents using Gemini
 * Run with: npx ts-node scripts/updateEmbeddings.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateAllEmbeddings() {
  try {
    console.log('Fetching documents without embeddings...');
    
    // Get all documents that need embeddings
    const { data: documents, error: fetchError } = await supabase
      .from('coach_documents')
      .select('id, source_id, title, content')
      .is('embedding', null)
      .limit(100);

    if (fetchError) {
      console.error('Error fetching documents:', fetchError);
      return;
    }

    console.log(`Found ${documents?.length || 0} documents without embeddings`);

    if (!documents || documents.length === 0) {
      console.log('No documents need embeddings');
      return;
    }

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(documents.length / batchSize)}`);

      // Call the Edge Function to generate embeddings
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: {
          texts: batch.map(doc => doc.content),
          taskType: 'RETRIEVAL_DOCUMENT'
        }
      });

      if (error) {
        console.error('Error generating embeddings:', error);
        continue;
      }

      // Update documents with embeddings
      for (let j = 0; j < batch.length; j++) {
        const doc = batch[j];
        const embedding = data.embeddings[j];

        const { error: updateError } = await supabase
          .from('coach_documents')
          .update({
            embedding,
            metadata: {
              ...(doc as any).metadata,
              embeddingModel: 'embedding-001',
              embeddingDimensions: embedding.length,
              embeddingUpdatedAt: new Date().toISOString()
            }
          })
          .eq('id', doc.id);

        if (updateError) {
          console.error(`Error updating document ${doc.id}:`, updateError);
        } else {
          console.log(`✓ Updated embeddings for: ${doc.title}`);
        }
      }

      // Small delay between batches
      if (i + batchSize < documents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Embeddings update complete!');
  } catch (error) {
    console.error('Error in updateAllEmbeddings:', error);
  }
}

// Run the update
updateAllEmbeddings().then(() => {
  console.log('Script finished');
  process.exit(0);
}).catch(error => {
  console.error('Script error:', error);
  process.exit(1);
});