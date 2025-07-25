import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// EU country codes and timezones for detection
const EU_TIMEZONES = [
  'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin', 'Europe/Bratislava',
  'Europe/Brussels', 'Europe/Bucharest', 'Europe/Budapest', 'Europe/Copenhagen',
  'Europe/Dublin', 'Europe/Helsinki', 'Europe/Lisbon', 'Europe/Ljubljana',
  'Europe/London', 'Europe/Luxembourg', 'Europe/Madrid', 'Europe/Malta',
  'Europe/Nicosia', 'Europe/Paris', 'Europe/Prague', 'Europe/Riga',
  'Europe/Rome', 'Europe/Sofia', 'Europe/Stockholm', 'Europe/Tallinn',
  'Europe/Vienna', 'Europe/Vilnius', 'Europe/Warsaw', 'Europe/Zagreb',
  'Europe/Zurich', // Switzerland - follows GDPR
  'Europe/Oslo', // Norway - follows GDPR
  'Europe/Reykjavik', // Iceland - follows GDPR
];

// Admin app API endpoints
const ADMIN_API_BASE = process.env.EXPO_PUBLIC_ADMIN_API_URL || '';

export interface ConsentData {
  dataProcessing: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
}

export interface PrivacySettings {
  shareDataForImprovements: boolean;
  allowAnalytics: boolean;
  marketingEmails: boolean;
}

export interface GDPRRequest {
  id: string;
  request_type: 'export' | 'deletion' | 'correction' | 'access';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  metadata?: any;
}

export interface PrivacyPolicy {
  version: string;
  content: string;
  effectiveDate: string;
}

class GDPRService {
  private isEUUserCache: boolean | null = null;

  /**
   * Detect if user is in EU based on timezone
   */
  async detectEUUser(): Promise<boolean> {
    // Check cache first
    if (this.isEUUserCache !== null) {
      return this.isEUUserCache;
    }

    // Check stored value
    try {
      const stored = await AsyncStorage.getItem('gdpr_is_eu_user');
      if (stored !== null) {
        this.isEUUserCache = stored === 'true';
        return this.isEUUserCache;
      }
    } catch (error) {
      console.error('Error reading EU user status:', error);
    }

    // Detect based on timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isEU = EU_TIMEZONES.includes(timezone);
      
      // Cache result
      this.isEUUserCache = isEU;
      await AsyncStorage.setItem('gdpr_is_eu_user', isEU.toString());
      
      // Update profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ is_eu_user: isEU })
          .eq('id', user.id);
      }
      
      return isEU;
    } catch (error) {
      console.error('Error detecting EU user:', error);
      // Default to true for safety
      return true;
    }
  }

  /**
   * Save user consent preferences
   */
  async saveConsent(consent: ConsentData): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Save to database
      const { error } = await supabase
        .from('gdpr_consent_records')
        .insert({
          user_id: user.id,
          consent_type: 'all',
          consented: consent.dataProcessing,
          consent_metadata: {
            analytics: consent.analytics,
            marketing: consent.marketing,
            version: consent.version,
          },
        });

      if (error) throw error;

      // Update profile
      await supabase
        .from('profiles')
        .update({ gdpr_consent_version: consent.version })
        .eq('id', user.id);

      // Save locally
      await AsyncStorage.setItem('gdpr_consent', JSON.stringify(consent));
    } catch (error) {
      console.error('Error saving consent:', error);
      throw error;
    }
  }

  /**
   * Get user consent preferences
   */
  async getConsent(): Promise<ConsentData | null> {
    try {
      const stored = await AsyncStorage.getItem('gdpr_consent');
      if (stored) {
        return JSON.parse(stored);
      }

      // Fetch from database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('gdpr_consent_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      const consent: ConsentData = {
        dataProcessing: data.consented,
        analytics: data.consent_metadata?.analytics || false,
        marketing: data.consent_metadata?.marketing || false,
        version: data.consent_metadata?.version || '1.0',
      };

      // Cache locally
      await AsyncStorage.setItem('gdpr_consent', JSON.stringify(consent));
      return consent;
    } catch (error) {
      console.error('Error getting consent:', error);
      return null;
    }
  }

  /**
   * Request user data export
   */
  async requestDataExport(): Promise<{ requestId: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call admin app API
      const response = await fetch(`${ADMIN_API_BASE}/api/gdpr/my-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to request data export');
      }

      const data = await response.json();
      
      // Also create a request record
      const { data: request, error } = await supabase
        .from('gdpr_data_requests')
        .insert({
          user_id: user.id,
          request_type: 'export',
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return { requestId: request.id };
    } catch (error) {
      console.error('Error requesting data export:', error);
      throw error;
    }
  }

  /**
   * Get data export status
   */
  async getExportStatus(requestId: string): Promise<{
    status: string;
    downloadUrl?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('gdpr_data_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;

      return {
        status: data.status,
        downloadUrl: data.metadata?.download_url,
      };
    } catch (error) {
      console.error('Error getting export status:', error);
      throw error;
    }
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(reason: string): Promise<{ requestId: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call admin app API
      const response = await fetch(`${ADMIN_API_BASE}/api/gdpr/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_type: 'deletion',
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request account deletion');
      }

      const data = await response.json();
      return { requestId: data.id };
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      throw error;
    }
  }

  /**
   * Get deletion request status
   */
  async getDeletionStatus(requestId: string): Promise<{
    status: string;
    scheduledFor?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('gdpr_data_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;

      return {
        status: data.status,
        scheduledFor: data.scheduled_for,
      };
    } catch (error) {
      console.error('Error getting deletion status:', error);
      throw error;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: PrivacySettings): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ privacy_settings: settings })
        .eq('id', user.id);

      if (error) throw error;

      // Save locally
      await AsyncStorage.setItem('gdpr_privacy_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(): Promise<PrivacySettings> {
    try {
      // Check local storage first
      const stored = await AsyncStorage.getItem('gdpr_privacy_settings');
      if (stored) {
        return JSON.parse(stored);
      }

      // Fetch from database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          shareDataForImprovements: false,
          allowAnalytics: false,
          marketingEmails: false,
        };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('privacy_settings')
        .eq('id', user.id)
        .single();

      if (error || !data?.privacy_settings) {
        return {
          shareDataForImprovements: false,
          allowAnalytics: false,
          marketingEmails: false,
        };
      }

      // Cache locally
      await AsyncStorage.setItem('gdpr_privacy_settings', JSON.stringify(data.privacy_settings));
      return data.privacy_settings;
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      return {
        shareDataForImprovements: false,
        allowAnalytics: false,
        marketingEmails: false,
      };
    }
  }

  /**
   * Get current privacy policy
   */
  async getPrivacyPolicy(): Promise<PrivacyPolicy> {
    try {
      const { data, error } = await supabase
        .from('privacy_policies')
        .select('*')
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // Return default policy
        return {
          version: '1.0',
          content: 'Privacy policy content not available.',
          effectiveDate: '2025-01-01',
        };
      }

      return {
        version: data.version,
        content: data.content,
        effectiveDate: data.effective_date,
      };
    } catch (error) {
      console.error('Error getting privacy policy:', error);
      return {
        version: '1.0',
        content: 'Privacy policy content not available.',
        effectiveDate: '2025-01-01',
      };
    }
  }

  /**
   * Check if user needs to accept new privacy policy
   */
  async needsPrivacyPolicyAcceptance(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('gdpr_consent_version')
        .eq('id', user.id)
        .single();

      const currentPolicy = await this.getPrivacyPolicy();
      
      return !profile?.gdpr_consent_version || 
             profile.gdpr_consent_version !== currentPolicy.version;
    } catch (error) {
      console.error('Error checking privacy policy acceptance:', error);
      return false;
    }
  }

  /**
   * Request data correction
   */
  async requestDataCorrection(corrections: Record<string, any>): Promise<{ requestId: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('gdpr_data_requests')
        .insert({
          user_id: user.id,
          request_type: 'correction',
          status: 'pending',
          metadata: { corrections },
        })
        .select()
        .single();

      if (error) throw error;

      return { requestId: data.id };
    } catch (error) {
      console.error('Error requesting data correction:', error);
      throw error;
    }
  }

  /**
   * Get all active GDPR requests
   */
  async getActiveRequests(): Promise<GDPRRequest[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('gdpr_data_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting active requests:', error);
      return [];
    }
  }

  /**
   * Clear all local GDPR data (for logout)
   */
  async clearLocalData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'gdpr_is_eu_user',
        'gdpr_consent',
        'gdpr_privacy_settings',
      ]);
      this.isEUUserCache = null;
    } catch (error) {
      console.error('Error clearing local GDPR data:', error);
    }
  }
}

export const gdprService = new GDPRService();