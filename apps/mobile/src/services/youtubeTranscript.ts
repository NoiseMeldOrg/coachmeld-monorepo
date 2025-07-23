import { supabase } from '../lib/supabase';

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface YouTubeTranscriptResult {
  transcript: string;
  segments: TranscriptSegment[];
  videoTitle?: string;
  channelName?: string;
  videoId: string;
  error?: string;
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Fetch YouTube transcript using the youtube-transcript library
 * Note: This requires a server-side implementation or proxy due to CORS
 */
export async function fetchYouTubeTranscript(videoUrl: string): Promise<YouTubeTranscriptResult> {
  const videoId = extractVideoId(videoUrl);
  
  if (!videoId) {
    return {
      videoId: '',
      transcript: '',
      segments: [],
      error: 'Invalid YouTube URL',
    };
  }

  try {
    // In production, this should call your backend API or Edge Function
    // For now, we'll structure it to show how it would work
    
    // Option 1: Use Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('youtube-transcript', {
      body: { videoId, videoUrl },
    });

    if (error) throw error;

    return {
      videoId,
      transcript: data.transcript,
      segments: data.segments,
      videoTitle: data.videoTitle,
      channelName: data.channelName,
    };
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return {
      videoId,
      transcript: '',
      segments: [],
      error: error instanceof Error ? error.message : 'Failed to fetch transcript',
    };
  }
}

/**
 * Process and store YouTube transcript as a document source
 */
export async function storeYouTubeTranscript(
  videoUrl: string,
  coachId: string,
  options?: {
    storeOriginal?: boolean;
    accessTier?: 'free' | 'premium';
    tags?: string[];
  }
) {
  const transcriptResult = await fetchYouTubeTranscript(videoUrl);
  
  if (transcriptResult.error) {
    throw new Error(transcriptResult.error);
  }

  const { videoId, transcript, videoTitle, channelName } = transcriptResult;

  // Create document source
  const { data: source, error: sourceError } = await supabase
    .from('document_sources')
    .insert({
      coach_id: coachId,
      title: videoTitle || `YouTube Video: ${videoId}`,
      source_type: 'url',
      source_url: videoUrl,
      store_original: options?.storeOriginal ?? true,
      storage_method: 'text',
      original_content: transcript,
      license_type: 'fair_use',
      copyright_holder: channelName || 'Unknown YouTube Channel',
      attribution_required: true,
      metadata: {
        platform: 'youtube',
        video_id: videoId,
        video_title: videoTitle,
        channel_name: channelName,
        video_url: videoUrl,
        access_tier: options?.accessTier || 'free',
        tags: options?.tags || ['youtube', 'video', 'transcript'],
        transcript_length: transcript.length,
        fetched_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (sourceError) throw sourceError;

  // Chunk the transcript for RAG
  const chunks = chunkTranscript(transcript, {
    maxChunkSize: 1000,
    overlap: 100,
  });

  // Insert chunks
  const chunkInserts = chunks.map((chunk, index) => ({
    coach_id: coachId,
    source_id: source.id,
    title: `${videoTitle || 'YouTube Video'} - Part ${index + 1}`,
    content: chunk.text,
    chunk_index: index,
    total_chunks: chunks.length,
    metadata: {
      video_timestamp: chunk.timestamp,
      video_url: videoUrl,
      section: `part_${index + 1}`,
    },
  }));

  const { error: chunkError } = await supabase
    .from('coach_documents')
    .insert(chunkInserts);

  if (chunkError) throw chunkError;

  return {
    sourceId: source.id,
    videoId,
    videoTitle,
    channelName,
    chunkCount: chunks.length,
  };
}

/**
 * Chunk transcript intelligently
 */
function chunkTranscript(
  transcript: string,
  options: { maxChunkSize: number; overlap: number }
): Array<{ text: string; timestamp?: string }> {
  const { maxChunkSize, overlap } = options;
  const chunks: Array<{ text: string; timestamp?: string }> = [];
  
  // Split by sentences to avoid breaking mid-sentence
  const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
  
  let currentChunk = '';
  let chunkStart = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim();
    
    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        timestamp: `${Math.floor(chunkStart / 60)}:${String(chunkStart % 60).padStart(2, '0')}`,
      });
      
      // Start new chunk with overlap
      const overlapStart = Math.max(0, i - Math.floor(overlap / 50)); // Rough estimate
      currentChunk = sentences.slice(overlapStart, i).join(' ') + ' ' + sentence;
      chunkStart += Math.floor(currentChunk.length / 10); // Rough timestamp estimate
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  
  // Add last chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      timestamp: `${Math.floor(chunkStart / 60)}:${String(chunkStart % 60).padStart(2, '0')}`,
    });
  }
  
  return chunks;
}

/**
 * Search for existing YouTube transcripts in the database
 */
export async function findExistingTranscript(videoUrl: string) {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return null;

  const { data } = await supabase
    .from('document_sources')
    .select('*')
    .eq('metadata->>platform', 'youtube')
    .eq('metadata->>video_id', videoId)
    .single();

  return data;
}