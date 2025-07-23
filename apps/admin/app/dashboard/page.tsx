'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, Brain, Youtube, Database, Activity, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import { useDocumentSourcesRealtime, useCoachDocumentsRealtime } from '@/hooks/use-realtime'
import { Badge } from '@/components/ui/badge'

interface DashboardStats {
  totalDocuments: number
  activeUsers: number
  knowledgeEntries: number
  youtubeTranscripts: number
  vectorEmbeddings: number
  activeDocumentChunks: number
  systemHealth: string
}

interface RecentActivity {
  id: string
  title: string
  type: string
  created_at: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    activeUsers: 0,
    knowledgeEntries: 0,
    youtubeTranscripts: 0,
    vectorEmbeddings: 0,
    activeDocumentChunks: 0,
    systemHealth: 'Loading...'
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        setRecentActivity(data.recentActivity)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Real-time callbacks for document sources
  const handleDocumentInsert = useCallback((document: any) => {
    // Update total documents count
    setStats(prev => ({
      ...prev,
      totalDocuments: prev.totalDocuments + 1,
      youtubeTranscripts: document.type === 'youtube' 
        ? prev.youtubeTranscripts + 1 
        : prev.youtubeTranscripts
    }))
    
    // Add to recent activity
    setRecentActivity(prev => [document, ...prev].slice(0, 5))
    setLastUpdate(new Date())
  }, [])

  const handleDocumentUpdate = useCallback((document: any) => {
    // Update recent activity if this document is in the list
    setRecentActivity(prev => 
      prev.map(item => item.id === document.id ? document : item)
    )
    setLastUpdate(new Date())
  }, [])

  const handleDocumentDelete = useCallback((document: any) => {
    // Update counts
    setStats(prev => ({
      ...prev,
      totalDocuments: Math.max(0, prev.totalDocuments - 1),
      youtubeTranscripts: document.type === 'youtube' 
        ? Math.max(0, prev.youtubeTranscripts - 1)
        : prev.youtubeTranscripts
    }))
    
    // Remove from recent activity
    setRecentActivity(prev => prev.filter(item => item.id !== document.id))
    setLastUpdate(new Date())
  }, [])

  // Real-time callbacks for coach documents (chunks)
  const handleChunkInsert = useCallback(() => {
    setStats(prev => ({
      ...prev,
      activeDocumentChunks: prev.activeDocumentChunks + 1,
      vectorEmbeddings: prev.vectorEmbeddings + 1
    }))
    setLastUpdate(new Date())
  }, [])

  const handleChunkUpdate = useCallback((chunk: any) => {
    // If chunk becomes inactive
    if (!chunk.is_active) {
      setStats(prev => ({
        ...prev,
        activeDocumentChunks: Math.max(0, prev.activeDocumentChunks - 1),
        vectorEmbeddings: chunk.embedding ? Math.max(0, prev.vectorEmbeddings - 1) : prev.vectorEmbeddings
      }))
    }
    setLastUpdate(new Date())
  }, [])

  // Subscribe to real-time updates
  useDocumentSourcesRealtime(
    handleDocumentInsert,
    handleDocumentUpdate,
    handleDocumentDelete
  )

  useCoachDocumentsRealtime(
    handleChunkInsert,
    handleChunkUpdate,
    undefined // We don't need delete callback for chunks as they use soft delete
  )

  const statCards = [
    {
      title: 'Total Documents',
      value: loading ? '...' : stats.totalDocuments.toString(),
      description: 'Document sources in system',
      icon: FileText,
      href: '/dashboard/rag',
    },
    {
      title: 'Active Users',
      value: loading ? '...' : stats.activeUsers.toString(),
      description: 'Registered users',
      icon: Users,
      href: '/dashboard/users',
    },
    {
      title: 'Knowledge Entries',
      value: loading ? '...' : stats.knowledgeEntries.toString(),
      description: 'Diet-specific content',
      icon: Brain,
      href: '/dashboard/knowledge',
    },
    {
      title: 'YouTube Transcripts',
      value: loading ? '...' : stats.youtubeTranscripts.toString(),
      description: 'Processed videos',
      icon: Youtube,
      href: '/dashboard/youtube',
    },
    {
      title: 'Vector Embeddings',
      value: loading ? '...' : stats.vectorEmbeddings.toString(),
      description: 'Total embeddings',
      icon: Database,
      href: '/dashboard/database',
    },
    {
      title: 'System Health',
      value: stats.systemHealth,
      description: 'All systems operational',
      icon: Activity,
      href: '/dashboard/database',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to the CoachMeld admin dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </Badge>
          <span className="text-xs text-muted-foreground">
            Last updated: {formatDistanceToNow(lastUpdate)} ago
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/dashboard/rag" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Upload Document to RAG
                </Button>
              </Link>
              <Link href="/dashboard/youtube" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Youtube className="mr-2 h-4 w-4" />
                  Process YouTube Playlist
                </Button>
              </Link>
              <Link href="/dashboard/users" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Create Test User
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest document uploads</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity to display
              </p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 truncate">
                      <span className="font-medium">{activity.title}</span>
                      <span className="text-muted-foreground"> • </span>
                      <span className="text-xs text-muted-foreground">
                        {activity.type}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}