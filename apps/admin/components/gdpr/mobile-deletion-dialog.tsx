'use client'

import { useState, useEffect } from 'react'
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
import { RequestStatusBadge } from './request-status-badge'
import { GDPRRequest } from '@/types/gdpr'
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
  CheckCircle,
  ExternalLink,
} from 'lucide-react'

interface MobileDeletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: GDPRRequest | null
  onProcess: (requestId: string, notes?: string, confirmManualDeletion?: boolean) => Promise<any>
  onCancel: (requestId: string, reason: string) => Promise<void>
}

export function MobileDeletionDialog({
  open,
  onOpenChange,
  request,
  onProcess,
  onCancel
}: MobileDeletionDialogProps) {
  const [processing, setProcessing] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [showManualInstructions, setShowManualInstructions] = useState(false)
  const [manualDeletionSteps, setManualDeletionSteps] = useState<string[]>([])
  const { toast } = useToast()

  // Reset manual instructions when dialog closes or request changes
  useEffect(() => {
    if (!open || request?.status === 'completed') {
      setShowManualInstructions(false)
      setManualDeletionSteps([])
      setConfirmDelete(false)
      setAdminNotes('')
    }
  }, [open, request])

  // Check if request is in processing state (awaiting manual deletion)
  useEffect(() => {
    if (request?.status === 'processing' && request?.notes?.includes('Awaiting manual deletion')) {
      setShowManualInstructions(true)
      setManualDeletionSteps([
        'Go to your Supabase Dashboard',
        'Navigate to Authentication > Users',
        `Search for user: ${request.user_email || request.requested_by}`,
        'Check the checkbox and click "Delete 1 users", then click the "Delete" button on the confirmation dialog',
        'Return here and click "Confirm Deletion Complete"'
      ])
    }
  }, [request])

  if (!request) return null

  const isOverdue = request.sla_status === 'overdue'
  const isDueSoon = request.sla_status === 'warning'
  const isMobileRequest = request.metadata?.source === 'mobile_app'

  const handleProcess = async () => {
    if (!confirmDelete) {
      toast({
        title: 'Confirmation required',
        description: showManualInstructions 
          ? 'Please confirm that you have manually deleted the user from Supabase'
          : 'Please confirm that you want to process this deletion request',
        variant: 'destructive'
      })
      return
    }

    setProcessing(true)
    try {
      const result = await onProcess(request.id, adminNotes, showManualInstructions)

      if (result?.requiresManualDeletion) {
        // Show manual deletion instructions
        setShowManualInstructions(true)
        setManualDeletionSteps(result.instructions.steps)
        setConfirmDelete(false) // Reset confirmation
        toast({
          title: 'Manual Action Required',
          description: result.message,
        })
      } else if (result?.success) {
        // Deletion completed
        onOpenChange(false)
        toast({
          title: 'Success',
          description: result.message || 'Deletion request processed successfully'
        })
        // Reset state
        setAdminNotes('')
        setConfirmDelete(false)
        setShowManualInstructions(false)
      }
    } catch (error: any) {
      if (error.showManualSteps) {
        toast({
          title: 'Manual deletion required',
          description: error.message || error.error,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to process deletion request',
          variant: 'destructive'
        })
      }
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
      // Reset state
      setCancelReason('')
      setShowCancelForm(false)
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

  // Calculate hours pending for display
  const hoursPending = request.requested_at ? 
    Math.floor((Date.now() - new Date(request.requested_at).getTime()) / (1000 * 60 * 60)) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Account Deletion Request</span>
            <RequestStatusBadge status={request.status} slaStatus={request.sla_status} />
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
              <strong>OVERDUE:</strong> This request is {Math.floor(hoursPending / 24)} days old and must be processed immediately!
              GDPR requires deletion within 30 days.
            </AlertDescription>
          </Alert>
        )}
        {isDueSoon && canProcess && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Due Soon:</strong> This request must be processed by{' '}
              {request.sla_deadline && new Date(request.sla_deadline).toLocaleDateString()}.
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
                <span className="font-medium">{request.user_email || request.requested_by || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Name:</span>{' '}
                <span className="font-medium">{request.user_full_name || 'Not provided'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">User ID:</span>{' '}
                <span className="font-mono text-xs">{request.user_id}</span>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Request Timeline
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Requested:</span>{' '}
                <span className="font-medium">
                  {formatDistanceToNow(new Date(request.requested_at))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Hours pending:</span>{' '}
                <span className="font-medium">{hoursPending} hours</span>
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
            </div>
          </div>

          {/* Deletion Reason */}
          {request.metadata?.deletion_reason && (
            <div className="space-y-2">
              <Label>User&apos;s Reason for Deletion</Label>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {request.metadata.deletion_reason}
              </p>
            </div>
          )}

          {/* Notes */}
          {request.notes && (
            <div className="space-y-2">
              <Label>Admin Notes</Label>
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

              {!showManualInstructions ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This will mark the request for manual deletion. You will need to delete the user manually in Supabase.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <ExternalLink className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Manual Deletion Instructions:</strong>
                      <ol className="mt-2 ml-4 list-decimal space-y-1">
                        {manualDeletionSteps.map((step, index) => (
                          <li key={index} className="text-sm">{step}</li>
                        ))}
                      </ol>
                    </AlertDescription>
                  </Alert>
                  
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> Only confirm below AFTER you have completed the manual deletion in Supabase.
                    </AlertDescription>
                  </Alert>
                </>
              )}

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
                  {showManualInstructions 
                    ? 'I confirm that I have manually deleted this user from Supabase'
                    : 'I confirm that I want to process this deletion request'
                  }
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
                    ) : showManualInstructions ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirm Deletion Complete
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Process Deletion Request
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