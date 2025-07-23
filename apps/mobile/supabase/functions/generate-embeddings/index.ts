import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.24.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmbeddingRequest {
  text: string;
  title?: string;
  taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
}

interface BatchEmbeddingRequest {
  texts: string[];
  title?: string;
  taskType?: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'embedding-001' })

    const { text, texts, title, taskType = 'RETRIEVAL_DOCUMENT' } = await req.json()

    // Handle single text embedding
    if (text) {
      const result = await model.embedContent({
        content: { parts: [{ text }] },
        taskType,
        title,
      })

      return new Response(
        JSON.stringify({ 
          embedding: result.embedding.values,
          dimensions: result.embedding.values.length 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Handle batch embeddings
    if (texts && Array.isArray(texts)) {
      const batchSize = 10
      const embeddings: number[][] = []
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        const batchPromises = batch.map(text => 
          model.embedContent({
            content: { parts: [{ text }] },
            taskType,
            title,
          })
        )
        
        const results = await Promise.all(batchPromises)
        embeddings.push(...results.map(r => r.embedding.values))
        
        // Add a small delay to avoid rate limiting
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      return new Response(
        JSON.stringify({ 
          embeddings,
          dimensions: embeddings[0]?.length || 0,
          count: embeddings.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    throw new Error('Either text or texts must be provided')
  } catch (error) {
    console.error('Error generating embeddings:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})