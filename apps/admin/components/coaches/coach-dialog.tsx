'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CoachForm } from './coach-form'
import { Coaches } from '@/types/coachmeld'

interface CoachDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coach?: Coaches
  onSubmit: (data: Partial<Coaches>) => Promise<void>
}

export function CoachDialog({ open, onOpenChange, coach, onSubmit }: CoachDialogProps) {
  const handleSubmit = async (data: Partial<Coaches>) => {
    await onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{coach ? 'Edit Coach' : 'Create New Coach'}</DialogTitle>
        </DialogHeader>
        <CoachForm
          coach={coach}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}