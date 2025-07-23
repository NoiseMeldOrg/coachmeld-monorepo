'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { CoachAccessSelector } from './coach-access-selector'
import { CoachAccessConfig } from '@/lib/coach-mapping'

interface Document {
  id: string
  title?: string
  metadata?: any
}

interface CoachAccessDialogProps {
  document: Document | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CoachAccessDialog({
  document,
  open,
  onOpenChange,
  onSuccess
}: CoachAccessDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentAccess, setCurrentAccess] = useState<Array<{ coach_id: string; access_tier?: string }>>([])
  const [selectedAccess, setSelectedAccess] = useState<CoachAccessConfig[]>([])

  // Fetch current coach access when dialog opens
  useEffect(() => {
    const fetchCurrentAccess = async () => {
      if (!document?.id) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/rag/documents/${document.id}/access`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load coach access')
        }
        
        setCurrentAccess(data.access.map((access: any) => ({
          coach_id: access.coach_id,
          access_tier: access.access_tier
        })))
      } catch (error: any) {
        console.error('Error fetching coach access:', error)
        toast.error(error.message || 'Failed to load coach access')
      } finally {
        setLoading(false)
      }
    }

    if (open && document?.id) {
      fetchCurrentAccess()
    }
  }, [open, document?.id])


  const handleSave = async () => {
    if (!document?.id) return
    
    setSaving(true)
    try {
      // Filter to only selected coaches
      const selectedCoaches = selectedAccess
        .filter(access => access.selected)
        .map(access => ({
          coachId: access.coachId,
          accessTier: access.accessTier
        }))
      
      const response = await fetch(`/api/rag/documents/${document.id}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          coachAccess: selectedCoaches
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update coach access')
      }
      
      toast.success('Coach access updated successfully')
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving coach access:', error)
      toast.error(error.message || 'Failed to update coach access')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Coach Access</DialogTitle>
          <DialogDescription>
            Control which coaches can access &quot;{document?.title || 'this document'}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <CoachAccessSelector
              currentAccess={currentAccess}
              onChange={setSelectedAccess}
              defaultTier="pro"
              defaultSelectAll={true}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}