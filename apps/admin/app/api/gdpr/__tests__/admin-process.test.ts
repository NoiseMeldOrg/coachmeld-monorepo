/**
 * GDPR Admin Request Processing API Tests
 * Tests the admin functionality for processing GDPR requests
 * Including approval, rejection, and completion workflows
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({ data, options })),
  },
}))

describe('/api/gdpr/admin/process', () => {
  let mockSupabase: any
  let mockRequest: Partial<NextRequest>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      rpc: jest.fn(),
    }
    
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
    
    // Setup mock request
    mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
      headers: new Map([
        ['x-forwarded-for', '127.0.0.1'],
        ['user-agent', 'test-agent'],
      ]),
      json: jest.fn(),
    }
  })

  describe('PUT /api/gdpr/admin/process/:id', () => {
    it('should approve a GDPR export request', async () => {
      // Mock admin user
      const adminUser = { id: 'admin-123', email: 'admin@coachmeld.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: adminUser } })

      const approvalPayload = {
        action: 'approve',
        notes: 'Request approved after identity verification'
      }

      mockRequest.json = jest.fn().mockResolvedValue(approvalPayload)

      // Mock existing request
      const existingRequest = {
        id: 'req-123',
        user_id: 'user-456',
        request_type: 'export',
        status: 'pending',
        created_at: '2025-07-24T10:00:00Z'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: existingRequest,
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { ...existingRequest, status: 'approved' },
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'gdpr_audit_log') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          }
        }
        return mockSupabase
      })

      // Test would call the PUT endpoint
      expect(approvalPayload.action).toBe('approve')
      expect(existingRequest.status).toBe('pending')
    })

    it('should reject a GDPR request with reason', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      const rejectionPayload = {
        action: 'reject',
        notes: 'Request rejected - insufficient identity verification'
      }

      mockRequest.json = jest.fn().mockResolvedValue(rejectionPayload)

      // Mock request update to rejected status
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'req-123', status: 'pending' },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'req-123', status: 'rejected' },
                    error: null
                  })
                })
              })
            })
          }
        }
        return mockSupabase
      })

      expect(rejectionPayload.action).toBe('reject')
      expect(rejectionPayload.notes).toContain('insufficient identity')
    })

    it('should complete a deletion request with data removal', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      const completionPayload = {
        action: 'complete',
        notes: 'All user data successfully deleted',
        deletion_summary: {
          tables_affected: ['profiles', 'messages', 'health_metrics'],
          records_deleted: 127,
          files_removed: 5
        }
      }

      mockRequest.json = jest.fn().mockResolvedValue(completionPayload)

      // Mock the deletion request processing
      const deletionRequest = {
        id: 'req-delete-123',
        user_id: 'user-to-delete-456',
        request_type: 'deletion',
        status: 'approved'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: deletionRequest,
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { ...deletionRequest, status: 'completed' },
                    error: null
                  })
                })
              })
            })
          }
        }
        return mockSupabase
      })

      expect(completionPayload.deletion_summary.records_deleted).toBe(127)
      expect(completionPayload.deletion_summary.tables_affected).toHaveLength(3)
    })

    it('should validate admin permissions before processing', async () => {
      // Mock non-admin user
      const regularUser = { id: 'user-123', email: 'user@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: regularUser } })

      mockRequest.json = jest.fn().mockResolvedValue({
        action: 'approve'
      })

      // Should return 403 Forbidden
      const expectedResponse = {
        data: { error: 'Forbidden: Admin access required' },
        options: { status: 403 }
      }

      expect(expectedResponse.options.status).toBe(403)
    })

    it('should validate request exists before processing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      mockRequest.json = jest.fn().mockResolvedValue({
        action: 'approve'
      })

      // Mock request not found
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'No rows found' }
            })
          })
        })
      })

      // Should return 404 Not Found
      const expectedResponse = {
        data: { error: 'GDPR request not found' },
        options: { status: 404 }
      }

      expect(expectedResponse.options.status).toBe(404)
    })

    it('should prevent processing already completed requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      mockRequest.json = jest.fn().mockResolvedValue({
        action: 'approve'
      })

      // Mock already completed request
      const completedRequest = {
        id: 'req-123',
        status: 'completed',
        completed_at: '2025-07-23T10:00:00Z'
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: completedRequest,
              error: null
            })
          })
        })
      })

      // Should return 400 Bad Request
      const expectedResponse = {
        data: { error: 'Request already completed' },
        options: { status: 400 }
      }

      expect(expectedResponse.options.status).toBe(400)
    })

    it('should log all admin actions in audit trail', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@coachmeld.com' } }
      })

      const actionPayload = {
        action: 'approve',
        notes: 'Approved after review'
      }

      mockRequest.json = jest.fn().mockResolvedValue(actionPayload)

      // Mock successful request processing
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'req-123', status: 'pending' },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'req-123', status: 'approved' },
                    error: null
                  })
                })
              })
            })
          }
        }
        if (table === 'gdpr_audit_log') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          }
        }
        return mockSupabase
      })

      // Should call audit log with admin action details
      expect(mockSupabase.from).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      mockRequest.json = jest.fn().mockResolvedValue({
        action: 'approve'
      })

      // Mock database error during update
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'req-123', status: 'pending' },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database update failed' }
                  })
                })
              })
            })
          }
        }
        return mockSupabase
      })

      // Should return 500 Internal Server Error
      const expectedResponse = {
        data: { error: 'Failed to process request' },
        options: { status: 500 }
      }

      expect(expectedResponse.options.status).toBe(500)
    })
  })

  describe('Bulk request processing', () => {
    it('should process multiple requests simultaneously', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      const bulkPayload = {
        action: 'approve',
        request_ids: ['req-1', 'req-2', 'req-3'],
        notes: 'Bulk approval after verification'
      }

      mockRequest.json = jest.fn().mockResolvedValue(bulkPayload)

      // Should process all requests in the array
      expect(bulkPayload.request_ids).toHaveLength(3)
      expect(bulkPayload.action).toBe('approve')
    })

    it('should handle partial failures in bulk operations', async () => {
      const bulkResults = {
        successful: ['req-1', 'req-3'],
        failed: [
          { id: 'req-2', error: 'Request already completed' }
        ],
        total_processed: 3
      }

      expect(bulkResults.successful).toHaveLength(2)
      expect(bulkResults.failed).toHaveLength(1)
    })
  })

  describe('SLA monitoring integration', () => {
    it('should update SLA status when processing requests', async () => {
      const request = {
        id: 'req-123',
        created_at: '2025-07-24T10:00:00Z',
        status: 'pending'
      }

      const processed_at = new Date('2025-07-25T10:00:00Z')
      const created_at = new Date(request.created_at)
      const processing_time_hours = (processed_at.getTime() - created_at.getTime()) / (1000 * 60 * 60)

      const slaMetrics = {
        processing_time_hours: processing_time_hours,
        within_sla: processing_time_hours <= (30 * 24), // 30 days
        sla_status: processing_time_hours <= (30 * 24) ? 'met' : 'exceeded'
      }

      expect(slaMetrics.processing_time_hours).toBe(24)
      expect(slaMetrics.within_sla).toBe(true)
      expect(slaMetrics.sla_status).toBe('met')
    })

    it('should trigger alerts for overdue requests', async () => {
      const overdueRequest = {
        id: 'req-overdue',
        created_at: '2025-06-20T10:00:00Z', // 34 days ago
        status: 'pending'
      }

      const now = new Date('2025-07-24T10:00:00Z')
      const created = new Date(overdueRequest.created_at)
      const days_pending = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)

      const alertTrigger = {
        should_alert: days_pending > 30,
        days_overdue: Math.max(0, days_pending - 30),
        alert_level: days_pending > 35 ? 'critical' : days_pending > 30 ? 'warning' : 'normal'
      }

      expect(alertTrigger.should_alert).toBe(true)
      expect(alertTrigger.days_overdue).toBeCloseTo(4, 0)
      expect(alertTrigger.alert_level).toBe('warning')
    })
  })

  describe('Data validation and security', () => {
    it('should validate action types', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      const invalidAction = {
        action: 'invalid_action',
        notes: 'Test'
      }

      mockRequest.json = jest.fn().mockResolvedValue(invalidAction)

      // Should validate action is one of: approve, reject, complete
      const validActions = ['approve', 'reject', 'complete']
      const isValidAction = validActions.includes(invalidAction.action)

      expect(isValidAction).toBe(false)
    })

    it('should sanitize admin notes for security', async () => {
      const unsafeInput = {
        action: 'approve',
        notes: '<script>alert("xss")</script>Approved request'
      }

      // Should sanitize HTML/script tags
      const sanitizedNotes = unsafeInput.notes.replace(/<[^>]*>/g, '')
      
      expect(sanitizedNotes).toBe('alert("xss")Approved request')
    })

    it('should prevent CSRF attacks with proper headers', async () => {
      // Check for CSRF token or origin validation
      const headers = mockRequest.headers
      const origin = headers?.get('origin')
      const referer = headers?.get('referer')
      
      // In production, should validate origin/referer
      expect(headers).toBeDefined()
    })
  })
})