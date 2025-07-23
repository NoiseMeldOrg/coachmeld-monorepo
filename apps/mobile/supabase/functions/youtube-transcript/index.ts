import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { YoutubeTranscript } from 'https://esm.sh/youtube-transcript@1.0.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { videoId, videoUrl } = await req.json();

    if (!videoId) {
      throw new Error('Video ID is required');
    }

    // Fetch transcript
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Combine all text segments
    const fullTranscript = transcriptData
      .map(segment => segment.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Try to get video metadata (this requires YouTube Data API key)
    // For now, we'll return basic info
    let videoTitle = `YouTube Video ${videoId}`;
    let channelName = 'Unknown Channel';

    // Alternative: Parse from the video page (less reliable but no API key needed)
    try {
      const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const html = await videoPageResponse.text();
      
      // Extract title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        videoTitle = titleMatch[1].replace(' - YouTube', '').trim();
      }
      
      // Extract channel name
      const channelMatch = html.match(/"author":"([^"]+)"/);
      if (channelMatch) {
        channelName = channelMatch[1];
      }
    } catch (error) {
      console.error('Error fetching video metadata:', error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        videoTitle,
        channelName,
        transcript: fullTranscript,
        segments: transcriptData,
        transcriptLength: fullTranscript.length,
        segmentCount: transcriptData.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in youtube-transcript function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to fetch transcript',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});