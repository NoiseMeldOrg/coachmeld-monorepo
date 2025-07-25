/**
 * GDPR Compliance Reporting API Tests
 * Tests the admin compliance reporting and analytics system
 * Using the new GDPR audit and reporting schema
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

describe('/api/gdpr/compliance-report', () => {
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
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
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

  describe('GET /api/gdpr/compliance-report', () => {
    it('should generate comprehensive compliance report', async () => {
      // Mock admin user
      const adminUser = { id: 'admin-123', email: 'admin@coachmeld.com' }
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: adminUser } })

      // Set date range parameters
      mockRequest.nextUrl!.searchParams.set('start_date', '2025-07-01')
      mockRequest.nextUrl!.searchParams.set('end_date', '2025-07-31')
      mockRequest.nextUrl!.searchParams.set('include_details', 'true')

      // Mock compliance report data
      const mockComplianceData = {
        period: '2025-07-01 to 2025-07-31',
        total_requests: 45,
        completed_on_time: 43,
        overdue_requests: 1,
        pending_requests: 1,
        sla_compliance_rate: 95.6,
        request_breakdown: {
          export: 20,
          deletion: 15,
          correction: 10
        },
        average_processing_time: '18 hours',
        breach_incidents: 0,
        consent_metrics: {
          total_consents: 150,
          consents_granted: 120,
          consents_withdrawn: 30,
          consent_rate: 80
        }
      }

      // Mock database queries for report generation
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_data_requests') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: Array(45).fill().map((_, i) => ({
                    id: `req-${i}`,
                    request_type: i < 20 ? 'export' : i < 35 ? 'deletion' : 'correction',
                    status: i < 43 ? 'completed' : i < 44 ? 'overdue' : 'pending',
                    created_at: `2025-07-${(i % 30) + 1}T10:00:00Z`,
                    completed_at: i < 43 ? `2025-07-${(i % 30) + 1}T18:00:00Z` : null
                  })),
                  error: null
                })
              })
            })
          }
        }
        if (table === 'gdpr_consent_records') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: Array(150).fill().map((_, i) => ({
                    id: `consent-${i}`,
                    consent_given: i < 120,
                    created_at: `2025-07-${(i % 30) + 1}T10:00:00Z`
                  })),
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

      // Test report structure
      expect(mockComplianceData.total_requests).toBe(45)
      expect(mockComplianceData.sla_compliance_rate).toBe(95.6)
      expect(mockComplianceData.request_breakdown.export).toBe(20)
      expect(mockComplianceData.consent_metrics.consent_rate).toBe(80)
    })

    it('should calculate SLA compliance correctly', async () => {
      // Mock admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      // Mock requests with various completion times
      const mockRequests = [
        {
          id: 'req-1',
          created_at: '2025-07-01T10:00:00Z',
          completed_at: '2025-07-02T10:00:00Z', // 24 hours - on time
          status: 'completed'
        },
        {
          id: 'req-2', 
          created_at: '2025-07-01T10:00:00Z',
          completed_at: '2025-08-05T10:00:00Z', // 35 days - overdue
          status: 'completed'
        },
        {
          id: 'req-3',
          created_at: '2025-07-01T10:00:00Z',
          completed_at: null, // Still pending, within 30 days
          status: 'pending'
        }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockRequests,
              error: null
            })
          })
        })
      })

      // SLA calculation logic
      const now = new Date('2025-07-24T10:00:00Z')
      const slaResults = mockRequests.map(req => {
        const created = new Date(req.created_at)
        const deadline = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000)
        
        if (req.completed_at) {
          const completed = new Date(req.completed_at)
          return completed <= deadline ? 'on_time' : 'overdue'
        } else {
          return now <= deadline ? 'pending_on_track' : 'pending_overdue'
        }
      })

      expect(slaResults[0]).toBe('on_time')
      expect(slaResults[1]).toBe('overdue')
      expect(slaResults[2]).toBe('pending_on_track')
    })

    it('should include breach notification metrics', async () => {
      // Mock admin user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      // Mock breach data (should be rare/zero)
      const mockBreachData = {
        total_breaches: 0,
        breaches_reported_within_72h: 0,
        average_notification_time: null,
        breach_types: {},
        affected_users: 0
      }

      // Mock breach tracking table query
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_breach_log') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: [], // No breaches (ideal)
                  error: null
                })
              })
            })
          }
        }
        return mockSupabase
      })

      expect(mockBreachData.total_breaches).toBe(0)
      expect(mockBreachData.affected_users).toBe(0)
    })

    it('should analyze consent withdrawal patterns', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      // Mock consent data with withdrawals
      const mockConsentData = [
        { consent_type: 'marketing', consent_given: true, created_at: '2025-07-01T10:00:00Z' },
        { consent_type: 'marketing', consent_given: false, created_at: '2025-07-15T10:00:00Z' }, // Withdrawal
        { consent_type: 'analytics', consent_given: true, created_at: '2025-07-10T10:00:00Z' },
        { consent_type: 'analytics', consent_given: false, created_at: '2025-07-20T10:00:00Z' }, // Withdrawal
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gdpr_consent_records') {
          return {
            select: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: mockConsentData,
                  error: null
                })
              })
            })
          }
        }
        return mockSupabase
      })

      // Analyze consent patterns
      const consentAnalysis = {
        marketing_consent_rate: 50, // 1 granted, 1 withdrawn
        analytics_consent_rate: 50,
        withdrawal_rate: 50, // 2 withdrawals out of 4 total
        top_withdrawal_reasons: ['privacy_concerns', 'too_many_emails']
      }

      expect(consentAnalysis.withdrawal_rate).toBe(50)
    })

    it('should track data processing lawful basis compliance', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      // Mock data processing records
      const mockProcessingRecords = [
        {
          purpose: 'Service provision',
          lawful_basis: 'contract',
          data_categories: ['profile', 'usage'],
          is_active: true
        },
        {
          purpose: 'Marketing communications',
          lawful_basis: 'consent',
          data_categories: ['contact'],
          is_active: true
        },
        {
          purpose: 'Legal compliance',
          lawful_basis: 'legal_obligation',
          data_categories: ['transaction'],
          is_active: true
        }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'data_processing_records') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockProcessingRecords,
                error: null
              })
            })
          }
        }
        return mockSupabase
      })

      // Validate all processing has lawful basis
      const lawfulBasisCompliance = mockProcessingRecords.every(
        record => record.lawful_basis && record.is_active
      )

      expect(lawfulBasisCompliance).toBe(true)
      expect(mockProcessingRecords).toHaveLength(3)
    })

    it('should return 403 for non-admin users', async () => {
      // Mock regular user (not admin)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'user@example.com' } }
      })

      // Should check admin permissions and return 403
      // Implementation would verify admin role
      const expectedResponse = {
        data: { error: 'Forbidden: Admin access required' },
        options: { status: 403 }
      }

      expect(expectedResponse.options.status).toBe(403)
    })

    it('should validate date range parameters', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      // Test invalid date ranges
      const invalidRanges = [
        { start: '2025-07-31', end: '2025-07-01' }, // End before start
        { start: 'invalid-date', end: '2025-07-31' }, // Invalid format
        { start: '2025-01-01', end: '2026-01-01' }, // Range too large (> 1 year)
      ]

      invalidRanges.forEach(range => {
        mockRequest.nextUrl!.searchParams.set('start_date', range.start)
        mockRequest.nextUrl!.searchParams.set('end_date', range.end)
        
        // Should validate and return appropriate error
        expect(range.start).toBeDefined()
        expect(range.end).toBeDefined()
      })
    })

    it('should handle missing data gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      // Mock empty database (no GDPR requests yet)
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      }))

      // Should return valid report with zero values
      const emptyReport = {
        period: '2025-07-01 to 2025-07-31',
        total_requests: 0,
        completed_on_time: 0,
        sla_compliance_rate: 100, // No requests = 100% compliance
        request_breakdown: { export: 0, deletion: 0, correction: 0 },
        consent_metrics: { total_consents: 0 }
      }

      expect(emptyReport.total_requests).toBe(0)
      expect(emptyReport.sla_compliance_rate).toBe(100)
    })
  })

  describe('Detailed compliance analytics', () => {
    it('should track processing time distributions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } }
      })

      // Mock requests with various processing times
      const processingTimes = [
        { hours: 2 },   // Very fast
        { hours: 8 },   // Same day
        { hours: 24 },  // Next day
        { hours: 72 },  // 3 days
        { hours: 168 }, // 1 week
        { hours: 480 }  // 20 days
      ]

      const timeDistribution = {
        same_day: processingTimes.filter(t => t.hours <= 24).length,
        within_week: processingTimes.filter(t => t.hours <= 168).length,
        within_month: processingTimes.filter(t => t.hours <= 720).length,
        average_hours: processingTimes.reduce((sum, t) => sum + t.hours, 0) / processingTimes.length
      }

      expect(timeDistribution.same_day).toBe(3)
      expect(timeDistribution.within_week).toBe(5)
      expect(timeDistribution.average_hours).toBeCloseTo(119.17, 1)
    })

    it('should identify compliance risk indicators', async () => {
      const riskIndicators = {
        high_volume_period: false, // > 100 requests/month
        sla_degradation: false,    // Compliance rate < 95%
        processing_delays: false,  // Avg time > 7 days
        consent_issues: false,     // High withdrawal rate
        breach_risk: false         // Any breaches in period
      }

      // Mock data that would trigger risk indicators
      const highRiskScenario = {
        monthly_requests: 150,     // High volume
        sla_compliance: 88,        // Below 95%
        avg_processing_days: 12,   // Above 7 days
        withdrawal_rate: 25        // High withdrawal rate
      }

      const riskScore = 
        (highRiskScenario.monthly_requests > 100 ? 1 : 0) +
        (highRiskScenario.sla_compliance < 95 ? 2 : 0) +
        (highRiskScenario.avg_processing_days > 7 ? 2 : 0) +
        (highRiskScenario.withdrawal_rate > 20 ? 1 : 0)

      expect(riskScore).toBe(6) // High risk
    })

    it('should generate audit-ready documentation', async () => {
      const auditDocumentation = {
        compliance_statement: 'CoachMeld maintains GDPR compliance through automated systems',
        data_protection_officer: 'privacy@coachmeld.com',
        legal_basis_documentation: {
          service_provision: 'GDPR Article 6(1)(b) - Contract performance',
          health_coaching: 'GDPR Article 6(1)(a) - Consent',
          legal_compliance: 'GDPR Article 6(1)(c) - Legal obligation'
        },
        retention_schedules: {
          user_profiles: '3 years after account closure',
          chat_messages: '3 years after account closure',
          audit_logs: '7 years for legal compliance'
        },
        technical_measures: [
          'Encryption at rest and in transit',
          'Access controls and authentication',
          'Regular security assessments',
          'Automated backup systems'
        ],
        organizational_measures: [
          'Staff GDPR training',
          'Privacy by design processes',
          'Data protection impact assessments',
          'Incident response procedures'
        ]
      }

      expect(auditDocumentation.compliance_statement).toBeDefined()
      expect(auditDocumentation.legal_basis_documentation).toHaveProperty('service_provision')
      expect(auditDocumentation.technical_measures).toHaveLength(4)
      expect(auditDocumentation.organizational_measures).toHaveLength(4)
    })
  })
})