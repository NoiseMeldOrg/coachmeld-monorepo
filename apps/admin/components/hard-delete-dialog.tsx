'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { DocumentSources } from '@/types/coachmeld'

interface HardDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: DocumentSources | null
  onConfirm: () => void
  chunkCount?: number
}

export function HardDeleteDialog({
  open,
  onOpenChange,
  document,
  onConfirm,
  chunkCount = 0
}: HardDeleteDialogProps) {
  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle>Permanently Delete Document?</DialogTitle>
          </div>
          <DialogDescription className="space-y-3 pt-3">
            <p>
              You are about to permanently delete: <strong>&quot;{document.title}&quot;</strong>
            </p>
            <div className="rounded-md bg-red-50 p-3 text-sm">
              <p className="font-semibold text-red-800 mb-1">⚠️ This action cannot be undone!</p>
              <p className="text-red-700">The following will be permanently deleted:</p>
              <ul className="list-disc list-inside text-red-700 mt-1">
                <li>The source document</li>
                <li>{chunkCount} document chunks and their embeddings</li>
                <li>All coach access records</li>
                <li>All metadata and processing history</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              If you want to temporarily remove this document, use the regular delete option instead, 
              which allows you to re-upload the content later.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Permanently Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}