import { gdprService } from '../gdprService';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  getAllKeys: jest.fn(),
}));

describe('GDPRService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EU User Detection', () => {
    it('should detect EU users based on timezone', async () => {
      const mockTimezoneFn = jest.fn().mockReturnValue('Europe/London');
      jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
        resolvedOptions: mockTimezoneFn,
      } as any));

      const isEU = await gdprService.detectEUUser();
      expect(isEU).toBe(true);
    });

    it('should detect non-EU users based on timezone', async () => {
      const mockTimezoneFn = jest.fn().mockReturnValue('America/New_York');
      jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
        resolvedOptions: mockTimezoneFn,
      } as any));

      const isEU = await gdprService.detectEUUser();
      expect(isEU).toBe(false);
    });

    it('should cache EU detection result', async () => {
      const mockTimezoneFn = jest.fn().mockReturnValue('Europe/Berlin');
      jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
        resolvedOptions: mockTimezoneFn,
      } as any));

      await gdprService.detectEUUser();
      await gdprService.detectEUUser();

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('gdpr_is_eu_user', 'true');
    });
  });

  describe('Consent Management', () => {
    it('should save user consent preferences', async () => {
      const consentData = {
        dataProcessing: true,
        analytics: false,
        marketing: false,
        version: '1.0',
      };

      const mockSupabase = supabase as any;
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          data: null,
          error: null,
        }),
      });

      mockSupabase.auth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      };

      await gdprService.saveConsent(consentData);

      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_consent_records');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'gdpr_consent',
        JSON.stringify(consentData)
      );
    });

    it('should get user consent preferences', async () => {
      const mockConsent = {
        dataProcessing: true,
        analytics: true,
        marketing: false,
        version: '1.0',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockConsent));

      const consent = await gdprService.getConsent();
      expect(consent).toEqual(mockConsent);
    });
  });

  describe('Data Export', () => {
    it('should request user data export', async () => {
      const mockSupabase = supabase as any;
      mockSupabase.functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { requestId: 'export-123' },
          error: null,
        }),
      };

      mockSupabase.auth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      };

      const result = await gdprService.requestDataExport();
      expect(result.requestId).toBe('export-123');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('gdpr-data-export', {
        body: { userId: 'test-user-id' },
      });
    });

    it('should get data export status', async () => {
      const mockSupabase = supabase as any;
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'export-123',
                status: 'completed',
                download_url: 'https://example.com/export.json',
              },
              error: null,
            }),
          }),
        }),
      });

      const status = await gdprService.getExportStatus('export-123');
      expect(status.status).toBe('completed');
      expect(status.downloadUrl).toBe('https://example.com/export.json');
    });
  });

  describe('Data Deletion', () => {
    it('should request account deletion', async () => {
      const mockSupabase = supabase as any;
      mockSupabase.functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { requestId: 'delete-456' },
          error: null,
        }),
      };

      mockSupabase.auth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      };

      const result = await gdprService.requestAccountDeletion('privacy reasons');
      expect(result.requestId).toBe('delete-456');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('gdpr-delete-account', {
        body: {
          userId: 'test-user-id',
          reason: 'privacy reasons',
        },
      });
    });

    it('should get deletion request status', async () => {
      const mockSupabase = supabase as any;
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'delete-456',
                status: 'pending',
                scheduled_for: '2025-08-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      });

      const status = await gdprService.getDeletionStatus('delete-456');
      expect(status.status).toBe('pending');
      expect(status.scheduledFor).toBe('2025-08-01T00:00:00Z');
    });
  });

  describe('Privacy Settings', () => {
    it('should update privacy settings', async () => {
      const settings = {
        shareDataForImprovements: false,
        allowAnalytics: false,
        marketingEmails: false,
      };

      const mockSupabase = supabase as any;
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      mockSupabase.auth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      };

      await gdprService.updatePrivacySettings(settings);

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'gdpr_privacy_settings',
        JSON.stringify(settings)
      );
    });

    it('should get privacy settings', async () => {
      const mockSettings = {
        shareDataForImprovements: true,
        allowAnalytics: false,
        marketingEmails: true,
      };

      const mockSupabase = supabase as any;
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { privacy_settings: mockSettings },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.auth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      };

      const settings = await gdprService.getPrivacySettings();
      expect(settings).toEqual(mockSettings);
    });
  });

  describe('Privacy Policy', () => {
    it('should get current privacy policy version', async () => {
      const mockSupabase = supabase as any;
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  version: '2.0',
                  content: 'Privacy policy content...',
                  effective_date: '2025-01-01',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const policy = await gdprService.getPrivacyPolicy();
      expect(policy.version).toBe('2.0');
      expect(policy.effectiveDate).toBe('2025-01-01');
    });

    it('should check if privacy policy needs acceptance', async () => {
      const mockSupabase = supabase as any;
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { gdpr_consent_version: '1.0' },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.auth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      };

      // Mock current version as 2.0
      jest.spyOn(gdprService, 'getPrivacyPolicy').mockResolvedValue({
        version: '2.0',
        content: 'Updated policy',
        effectiveDate: '2025-01-01',
      });

      const needsAcceptance = await gdprService.needsPrivacyPolicyAcceptance();
      expect(needsAcceptance).toBe(true);
    });
  });

  describe('Data Requests', () => {
    it('should create a data correction request', async () => {
      const mockSupabase = supabase as any;
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'correct-789',
                request_type: 'correction',
                status: 'pending',
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.auth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      };

      const corrections = {
        full_name: 'Updated Name',
        email: 'newemail@example.com',
      };

      const result = await gdprService.requestDataCorrection(corrections);
      expect(result.requestId).toBe('correct-789');
      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_data_requests');
    });

    it('should get all active GDPR requests', async () => {
      const mockRequests = [
        { id: '1', request_type: 'export', status: 'pending' },
        { id: '2', request_type: 'deletion', status: 'completed' },
      ];

      const mockSupabase = supabase as any;
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockRequests,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.auth = {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      };

      const requests = await gdprService.getActiveRequests();
      expect(requests).toHaveLength(2);
      expect(requests[0].request_type).toBe('export');
    });
  });
});