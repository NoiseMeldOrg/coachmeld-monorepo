'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database, 
  AlertCircle, 
  Table,
  Activity,
  Users,
  FileText,
  CreditCard,
  Shield,
  TrendingUp,
  HardDrive,
  MessageSquare,
  RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface TableSize {
  table_name: string
  row_count: number
  error?: string
}

interface ActivityStat {
  last24h: number
  last7d: number
  last30d: number
}

interface DatabaseStats {
  tableSizes: TableSize[]
  storageStats?: {
    coach_documents: {
      total_rows: number
      avg_chunk_size: number
      total_chunks: number
    }
    document_sources: {
      total_rows: number
      total_documents: number
      avg_document_size: number
    }
  }
  activityStats?: {
    messages: ActivityStat
    newUsers: ActivityStat
    documentsAdded: ActivityStat
    analyticsEvents: ActivityStat
  }
  subscriptionStats?: {
    active: number
    cancelled: number
    total: number
  }
  gdprStats?: {
    pending: number
    completed: number
  }
}

export default function DatabasePage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/database/stats')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch database statistics')
      }
      
      setStats(data)
      setLastRefresh(new Date())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getTotalRows = () => {
    if (!stats?.tableSizes) return 0
    return stats.tableSizes.reduce((sum, table) => sum + table.row_count, 0)
  }

  const getEstimatedStorageGB = () => {
    // Rough estimation based on row counts and typical sizes
    if (!stats?.tableSizes) return 0
    
    let totalBytes = 0
    stats.tableSizes.forEach(table => {
      switch(table.table_name) {
        case 'coach_documents':
          // Embeddings + text chunks, ~5KB per row
          totalBytes += table.row_count * 5 * 1024
          break
        case 'document_sources':
          // Original documents, ~50KB average
          totalBytes += table.row_count * 50 * 1024
          break
        case 'messages':
          // Chat messages, ~2KB per row
          totalBytes += table.row_count * 2 * 1024
          break
        case 'analytics_events':
          // Events data, ~1KB per row
          totalBytes += table.row_count * 1024
          break
        default:
          // Default ~1KB per row
          totalBytes += table.row_count * 1024
      }
    })
    
    return (totalBytes / (1024 * 1024 * 1024)).toFixed(2)
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Database className="h-12 w-12 animate-pulse mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading database statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Database Statistics</h2>
          <p className="text-muted-foreground">
            Monitor database usage and performance metrics
          </p>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Database Statistics</h2>
          <p className="text-muted-foreground">
            Monitor database usage and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {formatDistanceToNow(lastRefresh)} ago
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
            <Table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalRows().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats?.tableSizes.length || 0} tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getEstimatedStorageGB()} GB</div>
            <p className="text-xs text-muted-foreground">
              Database size estimate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.subscriptionStats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.subscriptionStats?.cancelled || 0} cancelled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GDPR Requests</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.gdprStats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending requests
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tables">Table Sizes</TabsTrigger>
          <TabsTrigger value="activity">Activity Metrics</TabsTrigger>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
              <CardDescription>
                Row counts and storage estimates for each table
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.tableSizes
                  .sort((a, b) => b.row_count - a.row_count)
                  .map((table) => {
                    const percentage = (table.row_count / getTotalRows()) * 100
                    return (
                      <div key={table.table_name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{table.table_name}</span>
                            {table.error && (
                              <Badge variant="destructive" className="text-xs">
                                Error
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {table.row_count.toLocaleString()} rows
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Messages Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Last 24 hours</span>
                  <span className="font-medium">{stats?.activityStats?.messages.last24h.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last 7 days</span>
                  <span className="font-medium">{stats?.activityStats?.messages.last7d.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last 30 days</span>
                  <span className="font-medium">{stats?.activityStats?.messages.last30d.toLocaleString() || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  New Users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Last 24 hours</span>
                  <span className="font-medium">{stats?.activityStats?.newUsers.last24h || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last 7 days</span>
                  <span className="font-medium">{stats?.activityStats?.newUsers.last7d || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last 30 days</span>
                  <span className="font-medium">{stats?.activityStats?.newUsers.last30d || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents Added
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Last 24 hours</span>
                  <span className="font-medium">{stats?.activityStats?.documentsAdded.last24h || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last 7 days</span>
                  <span className="font-medium">{stats?.activityStats?.documentsAdded.last7d || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last 30 days</span>
                  <span className="font-medium">{stats?.activityStats?.documentsAdded.last30d || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Analytics Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Last 24 hours</span>
                  <span className="font-medium">{stats?.activityStats?.analyticsEvents.last24h.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last 7 days</span>
                  <span className="font-medium">{stats?.activityStats?.analyticsEvents.last7d.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Last 30 days</span>
                  <span className="font-medium">{stats?.activityStats?.analyticsEvents.last30d.toLocaleString() || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Insights</CardTitle>
              <CardDescription>
                Key metrics for understanding database usage and costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Storage Breakdown
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Coach Documents (chunks)</span>
                      <span>{stats?.storageStats?.coach_documents.total_rows.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Document Sources</span>
                      <span>{stats?.storageStats?.document_sources.total_rows.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Growth Indicators
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Message Rate</span>
                      <span>
                        {Math.round((stats?.activityStats?.messages.last24h || 0) / 24)}/hour
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weekly Active Users</span>
                      <span className="text-green-600">
                        +{stats?.activityStats?.newUsers.last7d || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Billing Impact:</strong> Your database usage is primarily driven by document storage 
                  ({stats?.storageStats?.coach_documents.total_rows || 0} chunks) and message volume 
                  ({stats?.activityStats?.messages.last30d || 0} messages/month). 
                  Consider archiving old data if storage costs increase.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}