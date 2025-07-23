'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { DocumentUpload } from '@/components/document-upload'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { DocumentGroup, SearchResult } from '@/types/coachmeld'
import { useDocumentSourcesRealtime, useCoachDocumentsRealtime } from '@/hooks/use-realtime'
import { formatDistanceToNow } from '@/lib/utils'
import { 
  Upload, 
  Search, 
  FileText, 
  Trash2, 
  RefreshCw, 
  Database,
  Download,
  Eye,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  Users,
  Trash
} from 'lucide-react'
import { CoachAccessDialog } from '@/components/coach-access-dialog'
import { HardDeleteDialog } from '@/components/hard-delete-dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function RAGPage() {
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [accessDialogOpen, setAccessDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<any>(null)
  const [deleteChunkCount, setDeleteChunkCount] = useState(0)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      const response = await fetch(`/api/rag/documents?${params}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setDocumentGroups(data.documentGroups)
      setTotalPages(data.pagination.totalPages)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch documents',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [page, toast])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Real-time callbacks
  const handleDocumentInsert = useCallback((document: any) => {
    toast({
      title: 'New Document Added',
      description: `${document.source_name} has been uploaded`,
    })
    fetchDocuments() // Refresh the list
    setLastUpdate(new Date())
  }, [fetchDocuments, toast])

  const handleDocumentUpdate = useCallback((document: any) => {
    // Update the document in the list without refetching
    setDocumentGroups(prev => 
      prev.map(group => 
        group.source.id === document.id 
          ? { ...group, source: document }
          : group
      )
    )
    setLastUpdate(new Date())
  }, [])

  const handleDocumentDelete = useCallback((document: any) => {
    // Remove the document from the list
    setDocumentGroups(prev => 
      prev.filter(group => group.source.id !== document.id)
    )
    toast({
      title: 'Document Removed',
      description: `${document.source_name} has been deleted`,
    })
    setLastUpdate(new Date())
  }, [toast])

  const handleChunkUpdate = useCallback((chunk: any) => {
    // Update chunk count if the chunk's source is in our list
    setDocumentGroups(prev => 
      prev.map(group => {
        if (group.source.id === chunk.source_id) {
          const updatedDocs = group.documents.map(doc => 
            doc.id === chunk.id ? chunk : doc
          )
          return { ...group, documents: updatedDocs }
        }
        return group
      })
    )
    setLastUpdate(new Date())
  }, [])

  // Subscribe to real-time updates
  useDocumentSourcesRealtime(
    handleDocumentInsert,
    handleDocumentUpdate,
    handleDocumentDelete
  )

  useCoachDocumentsRealtime(
    undefined, // We don't need insert callback
    handleChunkUpdate,
    undefined // We don't need delete callback
  )



  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setSearchResults(data.results)
      if (data.results.length === 0) {
        toast({
          title: 'No Results',
          description: 'No documents matched your search query'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Search failed',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const softDeleteDocument = async (sourceId: string, sourceName: string) => {
    if (!confirm(`Are you sure you want to delete "${sourceName}"? You can re-upload it later.`)) return

    setLoading(true)
    try {
      const response = await fetch('/api/rag/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast({
        title: 'Success',
        description: 'Document deleted successfully (can be re-uploaded)'
      })

      fetchDocuments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete document',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const hardDeleteDocument = async () => {
    if (!documentToDelete?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/rag/documents/${documentToDelete.id}/hard-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast({
        title: 'Success',
        description: 'Document permanently deleted'
      })

      setHardDeleteDialogOpen(false)
      setDocumentToDelete(null)
      fetchDocuments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to permanently delete document',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleGroupExpand = (sourceId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId)
      } else {
        newSet.add(sourceId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">RAG System</h2>
          <p className="text-muted-foreground">
            Manage documents and search functionality for the RAG system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            Real-time
          </Badge>
          <span className="text-xs text-muted-foreground">
            Updated: {formatDistanceToNow(lastUpdate)} ago
          </span>
        </div>
      </div>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Sources</CardTitle>
              <CardDescription>
                Manage document sources and their chunks in the RAG system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDocuments()}
                      disabled={loading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                </div>

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}

                {!loading && documentGroups.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No documents found. Upload some documents to get started.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  {documentGroups.map((group) => (
                    <Card key={group.source.id}>
                      <CardHeader 
                        className="cursor-pointer"
                        onClick={() => group.source.id && toggleGroupExpand(group.source.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {group.source.id && expandedGroups.has(group.source.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <FileText className="h-4 w-4" />
                            <h4 className="font-medium">{group.source.title || group.source.filename || 'Untitled'}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {group.totalChunks} chunks
                            </Badge>
                            <Badge variant="outline">
                              {group.source.type}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDocument(group.source)
                                setAccessDialogOpen(true)
                              }}
                              disabled={loading}
                              title="Manage coach access"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={loading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem
                                  onClick={() => {
                                    group.source.id && softDeleteDocument(group.source.id, group.source.title || group.source.filename || 'Document')
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete (Soft)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => {
                                    setDocumentToDelete(group.source)
                                    setDeleteChunkCount(group.totalChunks)
                                    setHardDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      {group.source.id && expandedGroups.has(group.source.id) && (
                        <CardContent>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                              <p>Created: {group.source.created_at ? new Date(group.source.created_at).toLocaleString() : 'Unknown'}</p>
                            </div>
                            <div className="space-y-1 mt-4">
                              <h5 className="text-sm font-medium">Documents:</h5>
                              {group.documents.map((doc, index) => (
                                <div key={doc.id} className="text-sm p-2 bg-muted rounded">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs">
                                      Document {index + 1}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {doc.title || 'Untitled'}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    ID: {doc.id}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || loading}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vector Search</CardTitle>
              <CardDescription>
                Search through documents using semantic similarity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Search Query</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Enter your search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleSearch} 
                  disabled={loading || !searchQuery.trim()}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-4 mt-6">
                  <h3 className="font-medium">Search Results ({searchResults.length})</h3>
                  {searchResults.map((result) => (
                    <Card key={result.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{result.document_title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {(result.similarity * 100).toFixed(1)}% match
                            </Badge>
                            <Badge variant="outline">
                              Chunk {result.chunk_index + 1}
                            </Badge>
                          </div>
                        </div>
                        {result.source_name && (
                          <p className="text-sm text-muted-foreground">
                            Source: {result.source_name}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{result.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <DocumentUpload onUploadComplete={fetchDocuments} />
        </TabsContent>
      </Tabs>
      <CoachAccessDialog
        document={selectedDocument}
        open={accessDialogOpen}
        onOpenChange={setAccessDialogOpen}
        onSuccess={fetchDocuments}
      />
      <HardDeleteDialog
        open={hardDeleteDialogOpen}
        onOpenChange={setHardDeleteDialogOpen}
        document={documentToDelete}
        onConfirm={hardDeleteDocument}
        chunkCount={deleteChunkCount}
      />
    </div>
  )
}