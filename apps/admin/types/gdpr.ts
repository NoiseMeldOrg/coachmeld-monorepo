// GDPR-related type definitions

export type RequestType = 'export' | 'delete' | 'rectify' | 'portability'
export type RequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type SLAStatus = 'on_track' | 'warning' | 'overdue' | null
export type ConsentType = 'marketing_emails' | 'data_processing' | 'analytics' | 'third_party_sharing' | 'ai_training'

export interface GDPRRequest {
  id: string
  user_id: string
  request_type: RequestType
  status: RequestStatus
  requested_at: string
  requested_by?: string
  completed_at?: string
  processed_by?: string
  notes?: string
  file_url?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  // From the view
  sla_deadline?: string
  sla_status?: SLAStatus
  user_email?: string
  user_full_name?: string
  processed_by_email?: string
  // Deletion details (if type is 'delete')
  deletion_details?: DeletionDetails
}

export interface DeletionDetails {
  id: string
  request_id: string
  soft_delete: boolean
  deletion_reason?: string
  included_data?: string[]
  excluded_data?: string[]
  grace_period_ends?: string
  deletion_executed_at?: string
  deletion_certificate?: DeletionCertificate
  created_at: string
  updated_at: string
}

export interface DeletionCertificate {
  request_id: string
  user_id: string
  deleted_at: string
  data_categories: string[]
  deletion_method: 'soft' | 'hard'
  certificate_id: string
  issued_by: string
}

export interface ConsentRecord {
  id: string
  user_id: string
  consent_type: ConsentType
  consent_given: boolean
  consent_version: string
  ip_address?: string
  user_agent?: string
  created_at: string
  updated_at: string
}

export interface GDPRAuditLog {
  id: string
  admin_id: string
  action: string
  resource_type: string
  resource_id?: string
  changes?: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
  gdpr_relevant: boolean
}

export interface CreateGDPRRequestPayload {
  user_id: string
  request_type: RequestType
  requested_by?: string
  notes?: string
  metadata?: Record<string, any>
  // For deletion requests
  deletion_details?: {
    soft_delete: boolean
    deletion_reason?: string
    included_data?: string[]
    excluded_data?: string[]
  }
}

export interface UpdateGDPRRequestPayload {
  status?: RequestStatus
  processed_by?: string
  notes?: string
  completed_at?: string
  file_url?: string
  metadata?: Record<string, any>
}

export interface GDPRRequestStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  cancelled: number
  overdue: number
  dueSoon: number // Warning status
}

// Data categories that can be deleted
export const DATA_CATEGORIES = [
  { id: 'profile', label: 'Profile Information', description: 'Name, email, and account details' },
  { id: 'chat_history', label: 'Chat History', description: 'All conversations with AI coaches' },
  { id: 'preferences', label: 'Preferences', description: 'Coach preferences and settings' },
  { id: 'documents', label: 'Documents', description: 'Uploaded documents and files' },
  { id: 'analytics', label: 'Analytics Data', description: 'Usage tracking and analytics' },
  { id: 'consents', label: 'Consent Records', description: 'Historical consent preferences' },
] as const

export type DataCategory = typeof DATA_CATEGORIES[number]['id']

// Mobile app's account_deletion_requests table structure
export type MobileRequestStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

export interface AccountDeletionRequest {
  id: string
  user_id: string
  email: string
  reason?: string
  status: MobileRequestStatus
  requested_at: string
  processed_at?: string
  processed_by?: string
  notes?: string
}

export interface PendingDeletionRequest extends AccountDeletionRequest {
  hours_pending: number
}

// Mapping functions between GDPR and mobile app structures
export function mapAccountDeletionToGDPR(request: AccountDeletionRequest): GDPRRequest {
  return {
    id: request.id,
    user_id: request.user_id,
    request_type: 'delete',
    status: request.status as RequestStatus,
    requested_at: request.requested_at,
    requested_by: request.email,
    completed_at: request.processed_at,
    processed_by: request.processed_by,
    notes: request.notes,
    metadata: {
      deletion_reason: request.reason,
      source: 'mobile_app'
    },
    created_at: request.requested_at,
    updated_at: request.requested_at,
    user_email: request.email,
    deletion_details: {
      id: request.id,
      request_id: request.id,
      soft_delete: false,
      deletion_reason: request.reason,
      included_data: ['all'], // Mobile app deletes everything
      excluded_data: [],
      created_at: request.requested_at,
      updated_at: request.requested_at
    }
  }
}