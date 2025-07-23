import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'embedding-001' })
    
    const result = await model.embedContent(text)
    const embedding = result.embedding
    
    return embedding.values
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => generateEmbedding(text))
  )
  return embeddings
}