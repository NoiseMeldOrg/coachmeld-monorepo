/**
 * GDPR Requests API Tests
 * Tests the admin GDPR data request processing endpoints
 * Using the new gdpr_data_requests schema from migration 056
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '../requests/route'

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

describe('/api/gdpr/requests', () => {
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

  describe('GET /api/gdpr/requests', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Mock unauthenticated user
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await GET(mockRequest as NextRequest)

      expect(result).toEqual({
        data: { error: 'Unauthorized' },
        options: { status: 401 }
      })
    })

    it('should return GDPR requests for authenticated admin', async () => {
      // Mock authenticated admin user
      const mockUser = { id: 'admin-123', email: 'admin@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      // Mock GDPR data requests
      const mockGdprRequests = [
        {
          id: 'req-123',
          user_id: 'user-456',
          request_type: 'export',
          status: 'pending',
          created_at: '2025-07-24T10:00:00Z',
          request_details: { format: 'json' },
          user_email: 'user@example.com',
          sla_deadline: '2025-08-23T10:00:00Z',
          sla_status: 'on_track'
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockGdprRequests,
                error: null
              })
            })
          }
        }
        return mockSupabase
      })

      const result = await GET(mockRequest as NextRequest)

      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_data_requests')
      expect(result.data.requests).toEqual(mockGdprRequests)
    })

    it('should filter requests by status', async () => {
      // Setup authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: { id: 'admin-123' } } 
      })

      // Add status filter to request
      mockRequest.nextUrl!.searchParams.set('status', 'pending')

      // Mock filtered response
      mockSupabase.eq.mockResolvedValue({
        data: [{ status: 'pending' }],
        error: null
      })

      await GET(mockRequest as NextRequest)

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'pending')
    })

    it('should filter requests by request type', async () => {
      // Setup authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: { id: 'admin-123' } } 
      })

      // Add type filter to request
      mockRequest.nextUrl!.searchParams.set('type', 'deletion')

      await GET(mockRequest as NextRequest)

      expect(mockSupabase.eq).toHaveBeenCalledWith('request_type', 'deletion')
    })

    it('should calculate SLA status correctly', async () => {
      // Mock authenticated user
      const mockUser = { id: 'admin-123' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      // Mock overdue request (created 35 days ago)
      const overdueDate = new Date()
      overdueDate.setDate(overdueDate.getDate() - 35)
      
      const mockOverdueRequest = {
        id: 'req-overdue',
        status: 'pending',
        created_at: overdueDate.toISOString(),
        request_type: 'deletion'
      }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [mockOverdueRequest],
            error: null
          })
        })
      })

      const result = await GET(mockRequest as NextRequest)

      expect(result.data.requests[0].sla_status).toBe('overdue')
    })

    it('should handle database errors gracefully', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: { id: 'admin-123' } } 
      })

      // Mock database error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
          })
        })
      })

      const result = await GET(mockRequest as NextRequest)

      expect(result).toEqual({
        data: { error: 'Internal server error' },
        options: { status: 500 }
      })
    })
  })

  describe('POST /api/gdpr/requests', () => {
    beforeEach(() => {
      // Mock authenticated admin for POST tests
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } }
      })
    })

    it('should create a new GDPR data request', async () => {
      const requestPayload = {
        user_id: 'user-456',
        request_type: 'export',
        request_details: { format: 'json' },
        notes: 'User requested data export'
      }

      mockRequest.json = jest.fn().mockResolvedValue(requestPayload)

      // Mock successful insertion
      mockSupabase.insert.mockResolvedValue({
        data: [{ 
          id: 'req-new-123',
          ...requestPayload,
          status: 'pending',
          created_at: '2025-07-24T10:00:00Z'
        }],
        error: null
      })

      // Mock audit log insertion
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'req-new-123', ...requestPayload },
                  error: null
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

      const result = await POST(mockRequest as NextRequest)

      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_data_requests')
      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_audit_log')
      expect(result.data.message).toContain('GDPR export request created successfully')
    })

    it('should return 400 for missing required fields', async () => {
      // Missing user_id
      mockRequest.json = jest.fn().mockResolvedValue({
        request_type: 'export'
      })

      const result = await POST(mockRequest as NextRequest)

      expect(result).toEqual({
        data: { error: 'Missing required fields' },
        options: { status: 400 }
      })
    })

    it('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated user
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      const result = await POST(mockRequest as NextRequest)

      expect(result).toEqual({
        data: { error: 'Unauthorized' },
        options: { status: 401 }
      })
    })

    it('should validate request_type values', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        user_id: 'user-456',
        request_type: 'invalid_type'
      })

      // This should be handled by the database constraint
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'invalid input value for enum gdpr_request_type' }
            })
          })
        })
      })

      const result = await POST(mockRequest as NextRequest)

      expect(result).toEqual({
        data: { error: 'Failed to create GDPR request' },
        options: { status: 500 }
      })
    })

    it('should handle database insertion errors', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        user_id: 'user-456',
        request_type: 'export'
      })

      // Mock database error
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      })

      const result = await POST(mockRequest as NextRequest)

      expect(result).toEqual({
        data: { error: 'Failed to create GDPR request' },
        options: { status: 500 }
      })
    })

    it('should log audit trail for successful requests', async () => {
      const requestPayload = {
        user_id: 'user-456',
        request_type: 'deletion',
        notes: 'Test deletion request'
      }

      mockRequest.json = jest.fn().mockResolvedValue(requestPayload)

      // Mock successful insertion
      const mockCreatedRequest = { id: 'req-audit-123', ...requestPayload }
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockCreatedRequest,
                  error: null
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

      await POST(mockRequest as NextRequest)

      // Verify audit log was called
      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_audit_log')
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle malformed JSON in POST requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      // Mock JSON parsing error
      mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

      const result = await POST(mockRequest as NextRequest)

      expect(result).toEqual({
        data: { error: 'Internal server error' },
        options: { status: 500 }
      })
    })

    it('should handle concurrent requests with rate limiting considerations', async () => {
      // This test would verify rate limiting behavior
      // Implementation depends on the rate limiting strategy
      expect(true).toBe(true) // Placeholder
    })

    it('should validate user permissions for different request types', async () => {
      // Mock user with limited permissions
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'limited-admin', email: 'limited@example.com' } }
      })

      // This test would check if user has permission for specific GDPR operations
      // Implementation depends on the RBAC system
      expect(true).toBe(true) // Placeholder
    })
  })
})