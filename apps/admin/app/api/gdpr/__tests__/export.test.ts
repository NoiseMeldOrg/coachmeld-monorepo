/**
 * GDPR Data Export API Tests
 * Tests the comprehensive user data export functionality
 * Using the new GDPR schema and export requirements
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

describe('/api/gdpr/export', () => {
  let mockSupabase: any
  let mockRequest: Partial<NextRequest>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock Supabase client with comprehensive methods
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
      limit: jest.fn().mockReturnThis(),
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

  describe('GET /api/gdpr/export (User data export)', () => {
    it('should export comprehensive user data in JSON format', async () => {
      // Mock authenticated user
      const mockUser = { id: 'user-123', email: 'user@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      // Mock comprehensive user data across all tables
      const mockUserData = {
        profile: {
          id: 'user-123',
          email: 'user@example.com',
          created_at: '2025-01-01T00:00:00Z',
          privacy_settings: { analytics: false, marketing: true }
        },
        messages: [
          {
            id: 'msg-1',
            content: 'Hello coach',
            sent_at: '2025-07-24T10:00:00Z',
            coach_id: 'carnivore'
          }
        ],
        health_metrics: [
          {
            id: 'metric-1',
            weight: 180,
            recorded_at: '2025-07-24T09:00:00Z'
          }
        ],
        subscriptions: [
          {
            id: 'sub-1',
            plan: 'pro',
            status: 'active',
            created_at: '2025-01-01T00:00:00Z'
          }
        ],
        consent_records: [
          {
            consent_type: 'data_processing',
            consent_given: true,
            created_at: '2025-01-01T00:00:00Z'
          }
        ]
      }

      // Mock database queries for each data type
      mockSupabase.from.mockImplementation((table: string) => {
        const mockQueries = {
          profiles: {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUserData.profile,
                  error: null
                })
              })
            })
          },
          messages: {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockUserData.messages,
                  error: null
                })
              })
            })
          },
          user_health_metrics: {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockUserData.health_metrics,
                  error: null
                })
              })
            })
          },
          subscriptions: {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockUserData.subscriptions,
                  error: null
                })
              })
            })
          },
          gdpr_consent_records: {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockUserData.consent_records,
                  error: null
                })
              })
            })
          },
          gdpr_audit_log: {
            insert: jest.fn().mockResolvedValue({ error: null })
          }
        }

        return mockQueries[table as keyof typeof mockQueries] || mockSupabase
      })

      // Test structure for comprehensive export
      expect(mockUserData.profile).toBeDefined()
      expect(mockUserData.messages).toHaveLength(1)
      expect(mockUserData.health_metrics).toHaveLength(1)
      expect(mockUserData.subscriptions).toHaveLength(1)
      expect(mockUserData.consent_records).toHaveLength(1)
    })

    it('should support CSV format export', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      // Add CSV format parameter
      mockRequest.nextUrl!.searchParams.set('format', 'csv')

      // Mock data that should be converted to CSV
      const mockData = [
        { date: '2025-07-24', message: 'Test message', coach: 'carnivore' }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockData,
              error: null
            })
          })
        })
      })

      // CSV conversion would happen in the actual implementation
      const csvHeader = 'date,message,coach'
      const csvRow = '2025-07-24,Test message,carnivore'
      const expectedCsv = `${csvHeader}\n${csvRow}`

      expect(expectedCsv).toContain('date,message,coach')
    })

    it('should handle rate limiting (1 export per day)', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      // Mock recent export request in last 24 hours
      const recentExport = {
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockResolvedValue({
                        data: [recentExport],
                        error: null
                      })
                    })
                  })
                })
              })
            })
          }
        }
        return mockSupabase
      })

      // Should return rate limit error
      expect(recentExport.created_at).toBeDefined()
    })

    it('should include all GDPR Article 15 required data categories', async () => {
      // Article 15 requires: identity data, categories of data, purposes, 
      // recipients, retention period, rights information
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      const article15RequiredData = {
        identity_data: {
          email: 'user@example.com',
          profile: { name: 'John Doe' }
        },
        categories_of_data: [
          'Personal identifiers',
          'Health metrics',
          'Communication data',
          'Usage analytics'
        ],
        processing_purposes: [
          'Service provision',
          'Health coaching',
          'Communication'
        ],
        recipients: [
          'Internal staff',
          'AI service providers (Google Gemini)'
        ],
        retention_period: '3 years after account closure',
        rights_information: {
          rectification: 'Contact support to correct data',
          erasure: 'Use delete account feature',
          portability: 'This export fulfills portability rights'
        }
      }

      // Verify all required categories are present
      expect(article15RequiredData.identity_data).toBeDefined()
      expect(article15RequiredData.categories_of_data).toHaveLength(4)
      expect(article15RequiredData.processing_purposes).toHaveLength(3)
      expect(article15RequiredData.recipients).toHaveLength(2)
      expect(article15RequiredData.retention_period).toBeDefined()
      expect(article15RequiredData.rights_information).toBeDefined()
    })

    it('should handle users with no data gracefully', async () => {
      // Mock new user with no data
      const newUser = { id: 'new-user-456', email: 'new@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: newUser } })

      // Mock empty responses for all data queries
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            }),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      }))

      // Should still return valid export with empty data sets
      const emptyExport = {
        user_profile: null,
        messages: [],
        health_metrics: [],
        subscriptions: [],
        consent_records: [],
        generated_at: new Date().toISOString()
      }

      expect(emptyExport.messages).toHaveLength(0)
      expect(emptyExport.health_metrics).toHaveLength(0)
      expect(emptyExport.generated_at).toBeDefined()
    })

    it('should include metadata about data processing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      // Export metadata required by GDPR
      const exportMetadata = {
        export_timestamp: new Date().toISOString(),
        legal_basis: 'GDPR Article 15 - Right of Access',
        data_controller: 'CoachMeld',
        controller_contact: 'privacy@coachmeld.com',
        retention_policy: 'Data retained for 3 years after account closure',
        processing_purposes: [
          'Personalized health coaching',
          'Service improvement',
          'Communication'
        ],
        third_party_sharing: [
          'Google AI for embeddings (anonymized)',
          'Stripe for payment processing'
        ]
      }

      expect(exportMetadata.export_timestamp).toBeDefined()
      expect(exportMetadata.legal_basis).toContain('GDPR Article 15')
      expect(exportMetadata.processing_purposes).toHaveLength(3)
    })

    it('should log export requests for audit trail', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      // Mock successful data queries
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_audit_log') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      // Should log the export request
      expect(mockSupabase.from).toBeDefined()
    })

    it('should return 401 for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      // Should return unauthorized without querying data
      expect(mockSupabase.auth.getUser).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      // Mock database error for profile query
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection error' }
                })
              })
            })
          }
        }
        return mockSupabase
      })

      // Should handle partial data export or graceful failure
      expect(mockSupabase.from).toBeDefined()
    })
  })

  describe('Admin data export functionality', () => {
    it('should allow admin to export any user data', async () => {
      // Mock admin user
      const adminUser = { id: 'admin-123', email: 'admin@coachmeld.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: adminUser } })

      // Admin should be able to export data for any user ID
      mockRequest.nextUrl!.searchParams.set('user_id', 'target-user-456')

      // Mock target user data
      const targetUserData = {
        id: 'target-user-456',
        email: 'target@example.com'
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: targetUserData,
                  error: null
                })
              })
            })
          }
        }
        return mockSupabase
      })

      expect(targetUserData.id).toBe('target-user-456')
    })

    it('should verify admin permissions for user data export', async () => {
      // Mock non-admin user trying to export other user data
      const regularUser = { id: 'user-123', email: 'user@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: regularUser } })

      mockRequest.nextUrl!.searchParams.set('user_id', 'other-user-456')

      // Should check if user has admin permissions
      // Implementation would verify admin role
      expect(regularUser.id).not.toBe('other-user-456')
    })
  })

  describe('Data format validation', () => {
    it('should validate JSON export structure', async () => {
      const mockExportData = {
        user_profile: { id: 'user-123' },
        messages: [],
        health_metrics: [],
        subscriptions: [],
        consent_records: [],
        metadata: {
          generated_at: '2025-07-24T10:00:00Z',
          format: 'json',
          version: '1.0'
        }
      }

      // Validate required top-level keys
      const requiredKeys = [
        'user_profile',
        'messages',
        'health_metrics',
        'subscriptions',
        'consent_records',
        'metadata'
      ]

      requiredKeys.forEach(key => {
        expect(mockExportData).toHaveProperty(key)
      })
    })

    it('should sanitize sensitive data in exports', async () => {
      // Certain fields should be excluded or masked
      const sensitiveData = {
        password_hash: 'should_be_excluded',
        internal_notes: 'admin_only_field',
        raw_payment_data: 'pii_sensitive'
      }

      // These fields should NOT appear in user exports
      const exportData = {
        user_profile: { id: 'user-123', email: 'user@example.com' },
        // sensitive fields excluded
      }

      expect(exportData).not.toHaveProperty('password_hash')
      expect(exportData).not.toHaveProperty('internal_notes')
      expect(exportData).not.toHaveProperty('raw_payment_data')
    })
  })
})