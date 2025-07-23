'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useDocumentSourcesRealtime, useUserActivityRealtime } from '@/hooks/use-realtime'
import { FileText, Users, AlertCircle, CheckCircle } from 'lucide-react'

export function RealtimeNotifications() {
  const { toast } = useToast()

  // Document notifications
  useDocumentSourcesRealtime(
    // Insert
    (document) => {
      toast({
        title: 'New Document',
        description: `${document.source_name} has been uploaded`,
        duration: 4000,
      })
    },
    // Update
    (document) => {
      if (document.process_status === 'completed') {
        toast({
          title: 'Processing Complete',
          description: `${document.source_name} is ready`,
          duration: 4000,
        })
      } else if (document.process_status === 'failed') {
        toast({
          title: 'Processing Failed',
          description: `Error processing ${document.source_name}`,
          variant: 'destructive',
          duration: 4000,
        })
      }
    },
    // Delete
    (document) => {
      toast({
        title: 'Document Removed',
        description: `${document.source_name} has been deleted`,
        duration: 4000,
      })
    }
  )

  // User activity notifications (for admin awareness)
  useUserActivityRealtime(
    (user) => {
      toast({
        title: 'User Login',
        description: `${user.email} just logged in`,
        duration: 3000,
      })
    },
    (user) => {
      if (user) {
        toast({
          title: 'User Logout',
          description: `${user.email} logged out`,
          duration: 3000,
        })
      }
    }
  )

  return null
}