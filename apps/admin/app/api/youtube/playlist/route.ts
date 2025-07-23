import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlaylistVideos } from '@/services/youtube/transcript'
import { Innertube } from 'youtubei.js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const playlistId = searchParams.get('playlistId')

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 })
    }

    try {
      console.log('Fetching playlist info for:', playlistId)
      
      const youtube = await Innertube.create()
      const playlist = await youtube.getPlaylist(playlistId)
      
      if (!playlist || !playlist.items) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
      }
      
      // Extract video information
      const videos = playlist.items
        .filter((item: any) => item.id)
        .map((item: any) => {
          let title = 'Unknown Video'
          let duration = '0:00'
          let thumbnailUrl = ''
          
          // Extract title
          if ('title' in item && item.title) {
            title = typeof item.title === 'string' ? item.title : item.title.text || title
          }
          
          // Extract duration
          if ('duration' in item && item.duration) {
            const seconds = typeof item.duration === 'number' ? item.duration : item.duration.seconds || 0
            const minutes = Math.floor(seconds / 60)
            const remainingSeconds = seconds % 60
            duration = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
          }
          
          // Extract thumbnail
          if ('thumbnails' in item && Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
            thumbnailUrl = item.thumbnails[0].url || ''
          }
          
          return {
            videoId: item.id,
            title,
            duration,
            thumbnailUrl
          }
        })
      
      return NextResponse.json({
        success: true,
        playlistId,
        playlistTitle: 'Unknown Playlist', // Playlist title extraction varies by API version
        videoCount: videos.length,
        videos
      })
      
    } catch (error: any) {
      console.error('Error fetching playlist:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch playlist' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Playlist endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}