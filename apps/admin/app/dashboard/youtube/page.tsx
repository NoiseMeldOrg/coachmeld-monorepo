'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { CoachAccessSelector } from '@/components/coach-access-selector'
import { CoachAccessConfig } from '@/lib/coach-mapping'
import { cn, formatDistanceToNow } from '@/lib/utils'
import { useDocumentSourcesRealtime, useCoachDocumentsRealtime } from '@/hooks/use-realtime'
import { 
  Youtube, 
  Download, 
  List, 
  Play,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Clock
} from 'lucide-react'

interface VideoInfo {
  id: string
  title: string
  duration: string
  thumbnailUrl: string
  status: 'pending' | 'processing' | 'success' | 'error' | 'secondary' | 'no-transcript' | 'unavailable'
  error?: string
  isDuplicate?: boolean
}

interface ProcessingJob {
  id: string
  playlistUrl: string
  videoCount: number
  processedCount: number
  status: 'processing' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  currentVideo?: string // Track which video is currently being processed
}

interface RecentTranscript {
  id: string
  title: string
  created_at: string
  chunk_count: number
  metadata?: any
}

export default function YouTubePage() {
  const [url, setUrl] = useState('')
  const [coachAccess, setCoachAccess] = useState<CoachAccessConfig[]>([])
  const [videos, setVideos] = useState<VideoInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null)
  const [recentTranscripts, setRecentTranscripts] = useState<RecentTranscript[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [duplicateCheck, setDuplicateCheck] = useState<{
    checking: boolean
    isDuplicate: boolean
    existingDocument?: any
    message?: string
  }>({ checking: false, isDuplicate: false })
  const { toast } = useToast()

  useEffect(() => {
    fetchRecentTranscripts()
  }, [])

  const fetchRecentTranscripts = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()
      if (data.success && data.recentTranscripts) {
        setRecentTranscripts(data.recentTranscripts)
      }
    } catch (error) {
      console.error('Failed to fetch recent transcripts:', error)
    }
  }

  // Real-time callbacks for YouTube transcripts
  const handleYouTubeInsert = useCallback((document: any) => {
    if (document.type === 'youtube') {
      toast({
        title: 'New Transcript Added',
        description: `${document.title} has been processed`,
      })
      
      // Add to recent transcripts
      const newTranscript: RecentTranscript = {
        id: document.id,
        title: document.title,
        created_at: document.created_at,
        chunk_count: 0,
        metadata: document.metadata
      }
      setRecentTranscripts(prev => [newTranscript, ...prev].slice(0, 5))
      setLastUpdate(new Date())
    }
  }, [toast])

  const handleYouTubeUpdate = useCallback((document: any) => {
    if (document.type === 'youtube') {
      // Update the transcript in the list
      setRecentTranscripts(prev => 
        prev.map(item => item.id === document.id 
          ? { ...item, title: document.title, metadata: document.metadata }
          : item
        )
      )
      
      // Update processing status if it's in our current job
      if (currentJob && document.process_status === 'completed') {
        setCurrentJob(prev => prev ? {
          ...prev,
          processedCount: prev.processedCount + 1
        } : null)
      }
      setLastUpdate(new Date())
    }
  }, [currentJob])

  // Subscribe to real-time updates for YouTube documents
  useDocumentSourcesRealtime(
    handleYouTubeInsert,
    handleYouTubeUpdate,
    undefined
  )
  
  // Also subscribe to coach_documents to track chunk creation
  useCoachDocumentsRealtime(
    useCallback((document: any) => {
      // Update chunk count for recent transcripts
      if (document.source_id) {
        setRecentTranscripts(prev => 
          prev.map(item => {
            if (item.id === document.source_id) {
              return { ...item, chunk_count: (item.chunk_count || 0) + 1 }
            }
            return item
          })
        )
      }
    }, []),
    undefined,
    undefined
  )

  const isPlaylist = (url: string) => {
    return url.includes('playlist?list=') || url.includes('/playlist/')
  }

  // Check for duplicates when URL changes
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!url.trim() || isPlaylist(url)) {
        setDuplicateCheck({ checking: false, isDuplicate: false })
        return
      }

      setDuplicateCheck({ checking: true, isDuplicate: false })
      
      try {
        const response = await fetch('/api/rag/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'youtube',
            url: url.trim()
          })
        })

        const data = await response.json()
        if (response.ok) {
          setDuplicateCheck({
            checking: false,
            isDuplicate: data.isDuplicate,
            existingDocument: data.existingDocument,
            message: data.message
          })
        } else {
          setDuplicateCheck({ checking: false, isDuplicate: false })
        }
      } catch (error) {
        console.error('Duplicate check failed:', error)
        setDuplicateCheck({ checking: false, isDuplicate: false })
      }
    }

    // Debounce the check
    const timer = setTimeout(checkDuplicate, 500)
    return () => clearTimeout(timer)
  }, [url])

  const fetchPlaylistInfo = async () => {
    if (!url.trim()) return

    setFetching(true)
    try {
      // Extract playlist ID from URL
      const match = url.match(/[?&]list=([^&]+)/)
      if (!match) {
        throw new Error('Invalid playlist URL')
      }
      
      const playlistId = match[1]
      
      // Fetch playlist videos
      const response = await fetch('/api/youtube/playlist?' + new URLSearchParams({ playlistId }))
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch playlist')
      }
      
      if (data.videos && data.videos.length > 0) {
        // Set actual videos from playlist
        setVideos(data.videos.map((video: any) => ({
          id: video.videoId,
          title: video.title,
          duration: video.duration || '0:00',
          thumbnailUrl: video.thumbnailUrl || '',
          status: 'pending'
        })))
        
        toast({
          title: 'Playlist loaded',
          description: `Found ${data.videos.length} videos. Click "Process All" to start processing.`
        })
      } else {
        toast({
          title: 'Empty playlist',
          description: 'No videos found in this playlist',
          variant: 'destructive'
        })
        setVideos([])
      }
      
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load playlist',
        variant: 'destructive'
      })
      setVideos([])
    } finally {
      setFetching(false)
    }
  }

  const processVideos = async () => {
    if (videos.length === 0) return

    // Validate coach selection
    const selectedCoaches = coachAccess.filter(access => access.selected)
    if (selectedCoaches.length === 0) {
      toast({
        title: 'No coaches selected',
        description: 'Please select at least one coach for document access',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    const job: ProcessingJob = {
      id: Date.now().toString(),
      playlistUrl: url,
      videoCount: videos.length,
      processedCount: 0,
      status: 'processing',
      startedAt: new Date().toISOString()
    }
    setCurrentJob(job)
    
    // Initialize video statuses
    setVideos(prev => prev.map(v => ({ ...v, status: 'pending' })))

    try {
      // Extract playlist ID from URL
      const match = url.match(/[?&]list=([^&]+)/)
      const playlistId = match ? match[1] : null
      
      // Map selected coaches for API
      const coachAccessData = selectedCoaches.map(access => ({
        coachId: access.coachId,
        accessTier: access.accessTier
      }))

      const requestBody = {
        url,
        playlistId,
        coachAccess: coachAccessData
      }
      
      console.log('Sending request to process videos:', requestBody)
      
      // Initialize all videos as pending
      setVideos(prev => prev.map(v => ({ ...v, status: 'pending' })))
      
      // Simulate progress updates
      let processedCount = 0
      const totalVideos = videos.length
      const progressInterval = setInterval(() => {
        if (processedCount < totalVideos) {
          processedCount++
          setCurrentJob(prev => {
            if (!prev || prev.status !== 'processing') return prev
            return {
              ...prev,
              processedCount,
              currentVideo: videos[processedCount - 1]?.title || `Video ${processedCount}/${totalVideos}`
            }
          })
          
          // Update video status
          if (processedCount > 0) {
            setVideos(prev => prev.map((v, idx) => {
              if (idx < processedCount - 1) {
                return { ...v, status: 'pending' } // Will be corrected by actual results
              } else if (idx === processedCount - 1) {
                return { ...v, status: 'processing' }
              }
              return v
            }))
          }
        }
      }, 300) // Update every 300ms for smoother progress
      
      const response = await fetch('/api/youtube/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      // Stop progress simulation
      clearInterval(progressInterval)
      
      const data = await response.json()
      console.log('Response from API:', data)
      console.log('Current videos state:', videos)
      console.log('Video IDs in state:', videos.map(v => v.id))
      console.log('Video IDs in results:', data.results?.map((r: any) => r.videoId))
      
      if (!response.ok) throw new Error(data.error)

      // Results are already updated via streaming, but ensure final state
      if (data.results && Array.isArray(data.results)) {
        console.log('Processing results:', data.results)
        // Final update to ensure all statuses are correct
        setVideos(prev => prev.map(video => {
          const result = data.results.find((r: any) => r.videoId === video.id)
          console.log(`Matching video ${video.id} with result:`, result)
          
          if (result) {
            let status: VideoInfo['status'] = 'error'
            
            if (result.success) {
              status = 'success'
            } else if (result.isDuplicate) {
              status = 'secondary'
            } else if (result.error) {
              // Determine specific error type
              const errorLower = result.error.toLowerCase()
              console.log(`Video ${video.id} error: "${result.error}" (lowercase: "${errorLower}")`)
              
              if (errorLower.includes('transcript not available') || 
                  errorLower.includes('no transcript') ||
                  errorLower.includes('transcript is disabled') ||
                  errorLower.includes('transcript panel not found')) {
                status = 'no-transcript'
              } else if (errorLower.includes('video unavailable') || 
                        errorLower.includes('not available') ||
                        errorLower.includes('private video') ||
                        errorLower.includes('deleted')) {
                status = 'unavailable'
              }
              console.log(`Video ${video.id} final status: ${status}`)
            }
            
            return {
              ...video,
              status,
              error: result.error,
              isDuplicate: result.isDuplicate
            }
          } else {
            console.log(`No result found for video ${video.id} - keeping current state`)
          }
          return video
        }))
        
        // Update job to completed state
        setCurrentJob(prev => {
          if (!prev) return null
          
          const successful = data.results.filter((r: any) => r.success).length
          const failed = data.results.filter((r: any) => !r.success).length
          const duplicates = data.results.filter((r: any) => r.isDuplicate).length
          
          return {
            ...prev,
            processedCount: data.results.length,
            status: 'completed',
            completedAt: new Date().toISOString()
          }
        })
        
        // Show summary after a delay to ensure all real-time updates are processed
        setTimeout(() => {
          const summary = data.summary
          if (summary) {
            const duplicates = data.results.filter((r: any) => r.isDuplicate).length
            toast({
              title: 'Processing complete',
              description: `${summary.successful} succeeded, ${summary.failed} failed${duplicates > 0 ? `, ${duplicates} duplicates skipped` : ''}`
            })
          }
          // Clear the URL after successful processing
          setUrl('')
          fetchRecentTranscripts()
        }, 1000)
      } else {
        // Fallback for single video processing
        toast({
          title: 'Processing complete',
          description: data.message || 'Video processed successfully'
        })
        setUrl('')
        fetchRecentTranscripts()
      }
    } catch (error: any) {
      setCurrentJob(prev => prev ? {
        ...prev,
        status: 'failed',
        completedAt: new Date().toISOString()
      } : null)
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to process videos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const processSingleVideo = async () => {
    if (!url.trim()) return

    // Validate coach selection
    const selectedCoaches = coachAccess.filter(access => access.selected)
    if (selectedCoaches.length === 0) {
      toast({
        title: 'No coaches selected',
        description: 'Please select at least one coach for document access',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      // Extract video ID from URL
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
      const videoId = videoIdMatch ? videoIdMatch[1] : null
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL')
      }
      
      // Map selected coaches for API
      const coachAccessData = selectedCoaches.map(access => ({
        coachId: access.coachId,
        accessTier: access.accessTier
      }))

      const response = await fetch('/api/youtube/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          coachAccess: coachAccessData
        })
      })

      const data = await response.json()
      
      if (response.status === 409) {
        // Duplicate detected
        toast({
          title: 'Duplicate Video',
          description: data.message || 'This video has already been processed',
          variant: 'destructive'
        })
        return
      }
      
      if (!response.ok) throw new Error(data.error)

      // Check if the video actually processed successfully
      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        if (result.success) {
          toast({
            title: 'Success',
            description: `Video transcript processed successfully: ${result.title || 'YouTube Video'}`
          })
        } else {
          toast({
            title: 'Processing Failed',
            description: result.error || 'Failed to process video transcript',
            variant: 'destructive'
          })
        }
      } else if (data.success) {
        toast({
          title: 'Success',
          description: data.message || 'Video transcript processed successfully'
        })
      }
      
      // Clear the URL and refresh
      setUrl('')
      fetchRecentTranscripts()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process video',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">YouTube Transcript Processing</h2>
          <p className="text-muted-foreground">
            Download and process transcripts from YouTube videos and playlists
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            Live Updates
          </Badge>
          <span className="text-xs text-muted-foreground">
            Last: {formatDistanceToNow(lastUpdate)} ago
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Process YouTube Content</CardTitle>
              <CardDescription>
                Enter a YouTube video or playlist URL to download transcripts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">YouTube URL</Label>
                <Input
                  id="url"
                  placeholder="https://youtube.com/watch?v=... or playlist URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={cn(
                    duplicateCheck.isDuplicate && "border-orange-500 focus-visible:ring-orange-500"
                  )}
                />
                {duplicateCheck.checking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking for duplicates...
                  </div>
                )}
                {duplicateCheck.isDuplicate && duplicateCheck.message && (
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {duplicateCheck.message}
                      {duplicateCheck.existingDocument && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Added {formatDistanceToNow(new Date(duplicateCheck.existingDocument.created_at))} ago
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label>Coach Access</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select which coaches can access these transcripts
                </p>
                <CoachAccessSelector
                  onChange={setCoachAccess}
                  defaultTier="pro"
                  defaultSelectAll={true}
                />
              </div>

              {isPlaylist(url) ? (
                <div className="flex gap-2">
                  <Button 
                    onClick={fetchPlaylistInfo}
                    disabled={fetching || !url.trim()}
                    variant="outline"
                    className="flex-1"
                  >
                    {fetching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <List className="mr-2 h-4 w-4" />
                        Load Playlist
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={processVideos}
                    disabled={loading || videos.length === 0}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Process All
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={processSingleVideo}
                  disabled={loading || !url.trim() || duplicateCheck.isDuplicate}
                  className="w-full"
                  variant={duplicateCheck.isDuplicate ? "secondary" : "default"}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Process Video
                    </>
                  )}
                </Button>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Transcripts will be automatically chunked and added to the RAG system.
                  Videos without available transcripts will be skipped.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {videos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Playlist Videos</CardTitle>
                <CardDescription>
                  {videos.length} videos found in playlist
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {videos.map((video, index) => (
                    <div
                      key={video.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="w-20 h-15 bg-muted rounded flex items-center justify-center">
                        <Play className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-1">{video.title}</p>
                        <p className="text-xs text-muted-foreground">{video.duration}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {video.status === 'pending' && (
                          <Badge variant="secondary">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {video.status === 'processing' && (
                          <Badge variant="default">
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {video.status === 'success' && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Success
                          </Badge>
                        )}
                        {video.status === 'error' && (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                        {video.status === 'secondary' && (
                          <Badge variant="secondary">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Duplicate
                          </Badge>
                        )}
                        {video.status === 'no-transcript' && (
                          <Badge variant="outline">
                            <FileText className="mr-1 h-3 w-3" />
                            No Transcript
                          </Badge>
                        )}
                        {video.status === 'unavailable' && (
                          <Badge variant="outline" className="border-orange-500 text-orange-700">
                            <XCircle className="mr-1 h-3 w-3" />
                            Not Available
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {currentJob && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Job</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant={
                        currentJob.status === 'completed' ? 'default' :
                        currentJob.status === 'failed' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {currentJob.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {currentJob.processedCount} / {currentJob.videoCount}
                    </span>
                  </div>
                  <Progress 
                    value={(currentJob.processedCount / currentJob.videoCount) * 100}
                    className="h-2"
                  />
                  {currentJob.currentVideo && (
                    <div className="text-xs text-muted-foreground">
                      Processing: {currentJob.currentVideo}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Started: {new Date(currentJob.startedAt).toLocaleTimeString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Transcripts</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTranscripts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No YouTube transcripts processed yet
                </p>
              ) : (
                <div className="space-y-2">
                  {recentTranscripts.map((transcript) => (
                    <div key={transcript.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-1">
                            {transcript.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(transcript.created_at))} • {transcript.chunk_count} chunks
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Alert>
                <Youtube className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Only videos with available transcripts can be processed
                </AlertDescription>
              </Alert>
              <Alert>
                <List className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  For playlists, unavailable videos will be automatically skipped
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}