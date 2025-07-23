import { Badge } from '@/components/ui/badge'
import { RequestStatus, SLAStatus } from '@/types/gdpr'
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2, Ban } from 'lucide-react'

interface RequestStatusBadgeProps {
  status: RequestStatus
  slaStatus?: SLAStatus
}

export function RequestStatusBadge({ status, slaStatus }: RequestStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          label: 'Pending'
        }
      case 'processing':
        return {
          variant: 'default' as const,
          icon: Loader2,
          label: 'Processing'
        }
      case 'completed':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          label: 'Completed'
        }
      case 'failed':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          label: 'Failed'
        }
      case 'cancelled':
        return {
          variant: 'outline' as const,
          icon: Ban,
          label: 'Cancelled'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  // If there's an SLA warning/overdue and status is not completed/cancelled, show it
  if (slaStatus && ['pending', 'processing'].includes(status)) {
    if (slaStatus === 'overdue') {
      return (
        <Badge variant="destructive">
          <AlertCircle className="mr-1 h-3 w-3" />
          Overdue
        </Badge>
      )
    } else if (slaStatus === 'warning') {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          <AlertCircle className="mr-1 h-3 w-3" />
          Due Soon
        </Badge>
      )
    }
  }

  return (
    <Badge variant={config.variant}>
      <Icon className={`mr-1 h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  )
}

interface RequestTypeBadgeProps {
  type: string
}

export function RequestTypeBadge({ type }: RequestTypeBadgeProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'export':
        return {
          variant: 'outline' as const,
          label: 'Export'
        }
      case 'delete':
        return {
          variant: 'destructive' as const,
          label: 'Delete'
        }
      case 'rectify':
        return {
          variant: 'secondary' as const,
          label: 'Rectify'
        }
      case 'portability':
        return {
          variant: 'outline' as const,
          label: 'Portability'
        }
      default:
        return {
          variant: 'outline' as const,
          label: type
        }
    }
  }

  const config = getTypeConfig()

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}