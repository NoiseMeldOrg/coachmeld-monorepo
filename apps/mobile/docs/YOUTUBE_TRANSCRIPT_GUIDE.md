# YouTube Transcript Extraction Guide

## Overview

CoachMeld can automatically extract and store YouTube video transcripts for use in the RAG system. This allows coaches to learn from educational YouTube content.

## Features

- 🎥 Extract transcripts from any YouTube video URL
- 📝 Store original transcript as text
- 🔗 Maintain link to original video
- 🏷️ Automatic attribution to video creator
- 📊 Smart chunking for RAG optimization

## Setup

### 1. Deploy Supabase Edge Function

```bash
# Deploy the YouTube transcript function
supabase functions deploy youtube-transcript
```

### 2. Set Environment Variables (Optional)

If you want enhanced metadata (video title, channel name):
```bash
# In Supabase dashboard, set:
YOUTUBE_API_KEY=your-youtube-data-api-key
```

## Usage

### Quick Add via SQL

```sql
-- Add a YouTube video transcript to carnivore coach
INSERT INTO document_sources (
    coach_id,
    title,
    source_type,
    source_url,
    license_type,
    copyright_holder,
    store_original,
    storage_method,
    metadata
) VALUES (
    'carnivore',
    'Dr. Baker - Carnivore Diet Basics',
    'url',
    'https://www.youtube.com/watch?v=VIDEO_ID_HERE',
    'youtube_transcript',
    'Dr. Shawn Baker', -- Or channel name
    true,
    'text',
    jsonb_build_object(
        'platform', 'youtube',
        'video_id', 'VIDEO_ID_HERE',
        'access_tier', 'free'
    )
);
```

### Programmatic Usage

```typescript
import { storeYouTubeTranscript } from '@/services/youtubeTranscript';

// Add a YouTube video to the carnivore coach knowledge base
const result = await storeYouTubeTranscript(
  'https://www.youtube.com/watch?v=1Yxg55mmiZk',
  'carnivore',
  {
    storeOriginal: true,
    accessTier: 'free',
    tags: ['beginner', 'nutrition', 'carnivore-basics']
  }
);

console.log(`Added ${result.chunkCount} chunks from ${result.videoTitle}`);
```

### Check for Existing Transcripts

```typescript
import { findExistingTranscript } from '@/services/youtubeTranscript';

const existing = await findExistingTranscript('https://www.youtube.com/watch?v=...');
if (existing) {
  console.log('Transcript already in database');
}
```

## Supported URL Formats

The system supports all common YouTube URL formats:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`

## Legal Considerations

### Fair Use
YouTube transcripts are stored under "fair use" for educational purposes:
- ✅ Educational content analysis
- ✅ Research and commentary
- ✅ Transformative use (AI coaching)
- ✅ Non-commercial use

### Attribution
All YouTube transcripts automatically include:
- Link to original video
- Channel name (when available)
- Video title
- Platform attribution

### Best Practices
1. **Respect Creator Rights**: Only use educational content
2. **Maintain Attribution**: Always credit the original creator
3. **Check Video License**: Some videos have specific licenses
4. **Avoid Copyrighted Content**: Music, movies, etc.

## Your Personal Content

### Safe Sources Include:
- ✅ **Your Research Notes** (.txt, .md, .docx, .pdf)
- ✅ **YouTube Educational Videos** (with attribution)
- ✅ **Your Blog Posts** or articles
- ✅ **Personal Study Materials**
- ✅ **Notes from Courses** you've taken

All unattributed content defaults to **'NoiseMeld'** as the copyright holder.

## SQL Examples

### Find All YouTube Sources
```sql
SELECT 
    title,
    source_url,
    metadata->>'video_title' as video_title,
    metadata->>'channel_name' as channel,
    created_at
FROM document_sources
WHERE metadata->>'platform' = 'youtube'
ORDER BY created_at DESC;
```

### Get Original Transcript
```sql
SELECT 
    source_name,
    original_content,
    metadata->>'video_url' as video_url
FROM document_sources
WHERE id = 'source-id-here'
AND store_original = true;
```

### Bulk Import YouTube Playlist
```typescript
const playlistVideos = [
  'https://www.youtube.com/watch?v=video1',
  'https://www.youtube.com/watch?v=video2',
  // ... more videos
];

for (const videoUrl of playlistVideos) {
  try {
    await storeYouTubeTranscript(videoUrl, 'carnivore', {
      accessTier: 'free',
      tags: ['playlist', 'carnivore-science']
    });
    console.log(`✅ Added: ${videoUrl}`);
  } catch (error) {
    console.error(`❌ Failed: ${videoUrl}`, error);
  }
}
```

## Troubleshooting

### Common Issues

1. **No Transcript Available**
   - Some videos don't have captions
   - Try videos with auto-generated captions

2. **CORS Errors**
   - Use the Supabase Edge Function
   - Don't call YouTube directly from browser

3. **Rate Limiting**
   - Add delays between bulk imports
   - Cache transcripts to avoid re-fetching

## Future Enhancements

- [ ] Support for playlist import
- [ ] Automatic caption language detection
- [ ] Timestamp-based chunking
- [ ] Video thumbnail storage
- [ ] Channel subscription monitoring