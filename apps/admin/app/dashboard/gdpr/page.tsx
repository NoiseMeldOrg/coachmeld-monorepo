'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { DeletionRequestDialog } from '@/components/gdpr/deletion-request-dialog'
import { MobileDeletionDialog } from '@/components/gdpr/mobile-deletion-dialog'
import { DeletionRequestForm } from '@/components/gdpr/deletion-request-form'
import { RequestStatusBadge, RequestTypeBadge } from '@/components/gdpr/request-status-badge'
import { formatDistanceToNow } from '@/lib/utils'
import {
  Shield,
  Search,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  Calendar,
  User,
  Trash2,
  Download
} from 'lucide-react'
import { GDPRRequest, GDPRRequestStats, CreateGDPRRequestPayload, RequestStatus, RequestType } from '@/types/gdpr'

export default function GDPRPage() {
  const [requests, setRequests] = useState<GDPRRequest[]>([])
  const [stats, setStats] = useState<GDPRRequestStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    overdue: 0,
    dueSoon: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all')
  const [selectedRequest, setSelectedRequest] = useState<GDPRRequest | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { toast } = useToast()

  const fetchRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams({ include_stats: 'true' })
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)

      const response = await fetch(`/api/gdpr/requests?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch GDPR requests')
      }

      setRequests(data.requests || [])
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch GDPR requests',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, toast])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchRequests()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, fetchRequests])

  const handleCreateRequest = async (payload: CreateGDPRRequestPayload) => {
    try {
      const response = await fetch('/api/gdpr/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setShowCreateDialog(false)
      fetchRequests()
      toast({
        title: 'Success',
        description: data.message
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create request',
        variant: 'destructive'
      })
      throw error
    }
  }

  const handleProcessDeletion = async (requestId: string, notes?: string, confirmManualDeletion?: boolean) => {
    try {
      // First update the request with notes if provided
      if (notes) {
        await fetch(`/api/gdpr/requests/${requestId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes })
        })
      }

      // Process the deletion
      const response = await fetch('/api/gdpr/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          confirm: true,
          source: 'mobile',
          confirm_manual_deletion: confirmManualDeletion
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        const error = new Error(data.error)
        ;(error as any).showManualSteps = data.showManualSteps
        throw error
      }

      // Only refresh and show toast if not requiring manual deletion
      if (!data.requiresManualDeletion) {
        fetchRequests()
        toast({
          title: 'Success',
          description: data.message || 'Deletion request processed successfully'
        })
      }
      
      return data // Return the response data for the dialog to handle
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process deletion',
        variant: 'destructive'
      })
      throw error
    }
  }

  const handleCancelRequest = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(`/api/gdpr/requests/${requestId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      fetchRequests()
      toast({
        title: 'Success',
        description: 'Request cancelled successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel request',
        variant: 'destructive'
      })
      throw error
    }
  }

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  const handleRowClick = (request: GDPRRequest) => {
    setSelectedRequest(request)
    setShowDetailsDialog(true)
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      params.append('format', 'csv')
      params.append('source', 'all')
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/gdpr/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : 'deletion_requests.csv'

      // Download the CSV file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: 'Deletion requests exported successfully'
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export deletion requests',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">GDPR Request Management</h2>
        <p className="text-muted-foreground">
          Manage data deletion requests and ensure GDPR compliance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            {stats.overdue > 0 && (
              <p className="text-xs text-destructive mt-1">
                {stats.overdue} overdue
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processing}</div>
            {stats.dueSoon > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                {stats.dueSoon} due soon
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alert */}
      {stats.overdue > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Compliance Warning:</strong> You have {stats.overdue} overdue GDPR request{stats.overdue > 1 ? 's' : ''}.
            These must be processed immediately to maintain GDPR compliance (30-day deadline).
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="rectify">Rectify</SelectItem>
                <SelectItem value="portability">Portability</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
              Auto-refresh every 30 seconds
            </label>
          </div>
          {stats.pending > 0 && autoRefresh && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>GDPR Requests</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredRequests.length} request${filteredRequests.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                No GDPR requests found. Create a new request to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(request)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {request.request_type === 'delete' ? (
                        <Trash2 className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{request.user_email || 'Unknown User'}</p>
                        <RequestTypeBadge type={request.request_type} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Requested {formatDistanceToNow(new Date(request.requested_at))}</span>
                        {request.sla_deadline && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due {new Date(request.sla_deadline).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RequestStatusBadge status={request.status} slaStatus={request.sla_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deletion Request Details Dialog */}
      {selectedRequest?.metadata?.source === 'mobile_app' ? (
        <MobileDeletionDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          request={selectedRequest}
          onProcess={handleProcessDeletion}
          onCancel={handleCancelRequest}
        />
      ) : (
        <DeletionRequestDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          request={selectedRequest}
          onProcess={handleProcessDeletion}
          onCancel={handleCancelRequest}
        />
      )}

      {/* Create Request Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create GDPR Deletion Request</DialogTitle>
          </DialogHeader>
          <DeletionRequestForm
            onSubmit={handleCreateRequest}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}