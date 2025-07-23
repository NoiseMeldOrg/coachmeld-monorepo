'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Loader2, AlertCircle, CheckCircle, Users } from 'lucide-react'

interface MigrationStats {
  totalDocuments: number
  orphanedDocuments: number
  documentsWithAccess: number
}

export default function MigrateDocumentAccessPage() {
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [stats, setStats] = useState<MigrationStats | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/rag/documents/migration-stats')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats')
      }
      
      setStats(data)
    } catch (error: any) {
      console.error('Error fetching migration stats:', error)
      toast.error(error.message || 'Failed to load migration stats')
    } finally {
      setLoading(false)
    }
  }


  const migrateAll = async () => {
    setMigrating(true)
    setProgress(0)
    
    try {
      const response = await fetch('/api/rag/documents/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      // Handle streaming response for progress updates
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Migration failed')
      }
      
      const data = await response.json()
      toast.success(`Successfully migrated ${data.migratedCount} documents to ${data.assignedToCoaches} coaches`)
      await fetchStats() // Refresh stats
    } catch (error: any) {
      console.error('Migration error:', error)
      toast.error(error.message || 'Migration failed')
    } finally {
      setMigrating(false)
      setProgress(0)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Document Access Migration</h2>
        <p className="text-muted-foreground">
          Assign coaches to documents that don&apos;t have access configured
        </p>
      </div>

      {stats && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Orphaned Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.orphanedDocuments}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Migration Needed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.orphanedDocuments > 0 ? 'Yes' : 'No'}
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.orphanedDocuments > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Migrate Orphaned Documents</CardTitle>
                <CardDescription>
                  These documents are not accessible to any coaches. Migration will assign them
                  to all coaches at the Pro tier level.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Found {stats.orphanedDocuments} documents without coach access.
                    These documents won&apos;t appear in coach searches until migrated.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-medium">All Orphaned Documents</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {stats.orphanedDocuments} documents
                      </Badge>
                      <Button 
                        onClick={migrateAll}
                        disabled={migrating}
                        size="sm"
                      >
                        {migrating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Migrating...
                          </>
                        ) : (
                          <>
                            <Users className="mr-2 h-4 w-4" />
                            Migrate All
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {migrating && (
                  <Progress value={progress} className="w-full" />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold">All Documents Have Coach Access</h3>
                  <p className="text-muted-foreground mt-2">
                    No migration needed. All documents are properly configured.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}