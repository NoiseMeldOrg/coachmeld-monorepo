#!/usr/bin/env ts-node
/**
 * Quick script to add YouTube videos to the RAG system
 * Usage: npm run add-youtube <video-url> <coach-id>
 * Example: npm run add-youtube "https://www.youtube.com/watch?v=1Yxg55mmiZk" carnivore
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function extractVideoId(url: string): Promise<string | null> {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function addYouTubeVideo(videoUrl: string, coachId: string) {
  console.log(`📺 Adding YouTube video to ${coachId} coach...`);
  
  const videoId = await extractVideoId(videoUrl);
  if (!videoId) {
    console.error('❌ Invalid YouTube URL');
    return;
  }

  try {
    // Check if already exists
    const { data: existing } = await supabase
      .from('document_sources')
      .select('id, title')
      .eq('metadata->>video_id', videoId)
      .single();

    if (existing) {
      console.log(`⚠️  Video already exists: ${existing.title}`);
      return;
    }

    // For development, we'll add a placeholder
    // In production, this would call the Edge Function
    console.log(`🔄 Processing video ID: ${videoId}`);
    
    // Create document source
    const { data: source, error } = await supabase
      .from('document_sources')
      .insert({
        coach_id: coachId,
        title: `YouTube Video: ${videoId}`,
        source_type: 'url',
        source_url: videoUrl,
        license_type: 'youtube_transcript',
        copyright_holder: 'YouTube Creator',
        attribution_required: true,
        store_original: true,
        storage_method: 'text',
        original_content: `[Transcript would be fetched here for video ${videoId}]`,
        metadata: {
          platform: 'youtube',
          video_id: videoId,
          video_url: videoUrl,
          access_tier: 'free',
          tags: ['youtube', 'video', 'transcript'],
          added_by: 'NoiseMeld',
          added_via: 'script',
        },
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Added video source: ${source.id}`);
    
    // Add sample chunks (in production, these would be real transcript chunks)
    const chunks = [
      {
        coach_id: coachId,
        source_id: source.id,
        title: `YouTube Video ${videoId} - Introduction`,
        content: 'This is where the introduction transcript would go...',
        chunk_index: 0,
        total_chunks: 3,
        metadata: { section: 'intro' },
      },
      {
        coach_id: coachId,
        source_id: source.id,
        title: `YouTube Video ${videoId} - Main Content`,
        content: 'This is where the main content transcript would go...',
        chunk_index: 1,
        total_chunks: 3,
        metadata: { section: 'main' },
      },
      {
        coach_id: coachId,
        source_id: source.id,
        title: `YouTube Video ${videoId} - Conclusion`,
        content: 'This is where the conclusion transcript would go...',
        chunk_index: 2,
        total_chunks: 3,
        metadata: { section: 'conclusion' },
      },
    ];

    const { error: chunkError } = await supabase
      .from('coach_documents')
      .insert(chunks);

    if (chunkError) throw chunkError;

    console.log(`✅ Added ${chunks.length} transcript chunks`);
    console.log(`\n🎉 Successfully added YouTube video to ${coachId} coach!`);
    console.log(`   Video URL: ${videoUrl}`);
    console.log(`   Source ID: ${source.id}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
const [videoUrl, coachId] = process.argv.slice(2);

if (!videoUrl || !coachId) {
  console.log('Usage: npm run add-youtube <video-url> <coach-id>');
  console.log('Example: npm run add-youtube "https://www.youtube.com/watch?v=..." carnivore');
  process.exit(1);
}

addYouTubeVideo(videoUrl, coachId);