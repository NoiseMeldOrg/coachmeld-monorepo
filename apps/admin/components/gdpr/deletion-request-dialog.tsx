'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { RequestStatusBadge, RequestTypeBadge } from './request-status-badge'
import { GDPRRequest, DATA_CATEGORIES } from '@/types/gdpr'
import { formatDistanceToNow } from '@/lib/utils'
import {
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Mail,
  Shield,
  Trash2,
  User,
  CheckCircle
} from 'lucide-react'

interface DeletionRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: GDPRRequest | null
  onProcess: (requestId: string, notes?: string) => Promise<void>
  onCancel: (requestId: string, reason: string) => Promise<void>
}

export function DeletionRequestDialog({
  open,
  onOpenChange,
  request,
  onProcess,
  onCancel
}: DeletionRequestDialogProps) {
  const [processing, setProcessing] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const { toast } = useToast()

  if (!request) return null

  const deletionDetails = request.deletion_details
  const isOverdue = request.sla_status === 'overdue'
  const isDueSoon = request.sla_status === 'warning'

  const handleProcess = async () => {
    if (!confirmDelete) {
      toast({
        title: 'Confirmation required',
        description: 'Please confirm that you want to process this deletion request',
        variant: 'destructive'
      })
      return
    }

    setProcessing(true)
    try {
      await onProcess(request.id, adminNotes)
      onOpenChange(false)
      toast({
        title: 'Success',
        description: 'Deletion request processed successfully'
      })
      // Reset state
      setAdminNotes('')
      setConfirmDelete(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process deletion request',
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for cancelling this request',
        variant: 'destructive'
      })
      return
    }

    setProcessing(true)
    try {
      await onCancel(request.id, cancelReason)
      onOpenChange(false)
      toast({
        title: 'Success',
        description: 'Request cancelled successfully'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel request',
        variant: 'destructive'
      })
    } finally {
      setProcessing(false)
    }
  }

  const canProcess = ['pending', 'processing'].includes(request.status)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>GDPR Deletion Request Details</span>
            <div className="flex gap-2">
              <RequestTypeBadge type={request.request_type} />
              <RequestStatusBadge status={request.status} slaStatus={request.sla_status} />
            </div>
          </DialogTitle>
          <DialogDescription>
            Request ID: {request.id}
          </DialogDescription>
        </DialogHeader>

        {/* SLA Warning */}
        {isOverdue && canProcess && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This request is overdue! It should have been completed by{' '}
              {request.sla_deadline && new Date(request.sla_deadline).toLocaleDateString()}.
              Immediate action is required to maintain GDPR compliance.
            </AlertDescription>
          </Alert>
        )}
        {isDueSoon && canProcess && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This request is due soon. Deadline:{' '}
              {request.sla_deadline && new Date(request.sla_deadline).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* User Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              User Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>{' '}
                <span className="font-medium">{request.user_email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{request.user_full_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">User ID:</span>{' '}
                <span className="font-mono text-xs">{request.user_id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Requested by:</span>{' '}
                <span className="font-medium">{request.requested_by || 'User'}</span>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Request Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Requested:</span>{' '}
                <span className="font-medium">
                  {formatDistanceToNow(new Date(request.requested_at))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Deadline:</span>{' '}
                <span className="font-medium">
                  {request.sla_deadline && new Date(request.sla_deadline).toLocaleDateString()}
                </span>
              </div>
              {request.processed_by_email && (
                <div>
                  <span className="text-muted-foreground">Processed by:</span>{' '}
                  <span className="font-medium">{request.processed_by_email}</span>
                </div>
              )}
              {request.completed_at && (
                <div>
                  <span className="text-muted-foreground">Completed:</span>{' '}
                  <span className="font-medium">
                    {new Date(request.completed_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Deletion Details */}
          {deletionDetails && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Deletion Configuration
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={deletionDetails.soft_delete ? 'outline' : 'destructive'}>
                    {deletionDetails.soft_delete ? 'Soft Delete' : 'Hard Delete'}
                  </Badge>
                  {deletionDetails.soft_delete && deletionDetails.grace_period_ends && (
                    <span className="text-sm text-muted-foreground">
                      Grace period ends:{' '}
                      {new Date(deletionDetails.grace_period_ends).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {deletionDetails.deletion_reason && (
                  <div>
                    <Label>Reason for deletion</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {deletionDetails.deletion_reason}
                    </p>
                  </div>
                )}

                <div>
                  <Label>Data to be deleted</Label>
                  <div className="mt-2 space-y-2">
                    {DATA_CATEGORIES.map((category) => {
                      const isIncluded = deletionDetails.included_data?.includes(category.id)
                      return (
                        <div
                          key={category.id}
                          className={`flex items-start gap-2 p-2 rounded ${
                            isIncluded ? 'bg-destructive/10' : 'opacity-50'
                          }`}
                        >
                          {isIncluded ? (
                            <CheckCircle className="h-4 w-4 text-destructive mt-0.5" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{category.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {request.notes && (
            <div className="space-y-2">
              <Label>Request Notes</Label>
              <p className="text-sm text-muted-foreground">{request.notes}</p>
            </div>
          )}

          {/* Admin Actions */}
          {canProcess && !showCancelForm && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add any notes about this deletion..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Processing this request will permanently delete the selected user data.
                  {deletionDetails?.soft_delete
                    ? ' A 30-day grace period will be applied.'
                    : ' This action cannot be undone.'}
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm-delete"
                  checked={confirmDelete}
                  onCheckedChange={(checked) => setConfirmDelete(checked as boolean)}
                />
                <Label
                  htmlFor="confirm-delete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I confirm that I want to process this deletion request
                </Label>
              </div>
            </div>
          )}

          {/* Cancel Form */}
          {showCancelForm && (
            <div className="space-y-4 border-t pt-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Cancelling this request will notify the user and require a valid reason.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Reason for Cancellation*</Label>
                <Textarea
                  id="cancel-reason"
                  placeholder="Provide a clear reason for cancelling this request..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!showCancelForm ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={processing}
              >
                Close
              </Button>
              {canProcess && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelForm(true)}
                    disabled={processing}
                  >
                    Cancel Request
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleProcess}
                    disabled={processing || !confirmDelete}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Process Deletion
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowCancelForm(false)}
                disabled={processing}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={processing || !cancelReason.trim()}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Confirm Cancellation'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}