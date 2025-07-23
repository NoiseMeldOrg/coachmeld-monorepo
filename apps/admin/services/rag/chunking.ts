export interface ChunkOptions {
  chunkSize?: number
  overlap?: number
  maxChunks?: number
}

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const {
    chunkSize = 1000,
    overlap = 200,
    maxChunks = Infinity
  } = options

  if (chunkSize <= 0) {
    throw new Error('Chunk size must be positive')
  }

  if (overlap >= chunkSize) {
    throw new Error('Overlap must be less than chunk size')
  }

  const chunks: string[] = []
  let start = 0
  
  while (start < text.length && chunks.length < maxChunks) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    
    // If we've reached the end, break
    if (end >= text.length) {
      break
    }
    
    // Move start position
    start = end - overlap
  }
  
  return chunks
}

export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4)
}

export function splitByParagraphs(
  text: string,
  maxChunkSize: number = 1000
): string[] {
  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
  
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max size, save current chunk
    if (currentChunk && (currentChunk.length + paragraph.length + 2) > maxChunkSize) {
      chunks.push(currentChunk.trim())
      currentChunk = paragraph
    } else {
      // Add paragraph to current chunk
      currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

export function extractMetadata(text: string) {
  const metadata: Record<string, any> = {}
  
  // Extract title (first line or first heading)
  const titleMatch = text.match(/^#\s+(.+)$/m) || text.match(/^(.+)$/m)
  if (titleMatch) {
    metadata.title = titleMatch[1].trim()
  }
  
  // Count words
  metadata.wordCount = text.split(/\s+/).filter(word => word.length > 0).length
  
  // Detect language (very basic)
  metadata.hasCode = /```[\s\S]*?```/.test(text) || /`[^`]+`/.test(text)
  
  // Extract headers
  const headers = text.match(/^#+\s+.+$/gm)
  if (headers) {
    metadata.headers = headers.map(h => h.replace(/^#+\s+/, ''))
  }
  
  return metadata
}