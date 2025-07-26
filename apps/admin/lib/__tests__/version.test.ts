/**
 * Tests for Admin App Version Utility
 */

import {
  getVersionInfo,
  getVersion,
  getDisplayVersion,
  isVersionNewer,
  getAdminVersionText,
  getApiVersion,
  getFullVersionInfo
} from '../version';

// Mock package.json
jest.mock('../../package.json', () => ({
  version: '0.9.0'
}));

// Mock environment variables
const originalEnv = process.env;

describe('Admin Version Utility', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getVersionInfo', () => {
    test('should return correct version info in production', () => {
      process.env.NODE_ENV = 'production';
      
      const info = getVersionInfo();
      
      expect(info.version).toBe('0.9.0');
      expect(info.major).toBe(0);
      expect(info.minor).toBe(9);
      expect(info.patch).toBe(0);
      expect(info.environment).toBe('production');
      expect(info.displayVersion).toBe('v0.9.0');
      expect(info.buildDate).toBeDefined();
    });

    test('should return correct version info in development', () => {
      process.env.NODE_ENV = 'development';
      
      const info = getVersionInfo();
      
      expect(info.environment).toBe('development');
      expect(info.displayVersion).toBe('v0.9.0-dev');
    });

    test('should return correct version info in test', () => {
      process.env.NODE_ENV = 'test';
      
      const info = getVersionInfo();
      
      expect(info.environment).toBe('test');
      expect(info.displayVersion).toBe('v0.9.0-test');
    });

    test('should include build number when available', () => {
      process.env.BUILD_NUMBER = '12345';
      
      const info = getVersionInfo();
      
      expect(info.buildNumber).toBe('12345');
    });

    test('should default to development environment', () => {
      delete process.env.NODE_ENV;
      
      const info = getVersionInfo();
      
      expect(info.environment).toBe('development');
    });
  });

  describe('getVersion', () => {
    test('should return raw version string', () => {
      expect(getVersion()).toBe('0.9.0');
    });
  });

  describe('getDisplayVersion', () => {
    test('should return display version in production', () => {
      process.env.NODE_ENV = 'production';
      expect(getDisplayVersion()).toBe('v0.9.0');
    });

    test('should return display version in development', () => {
      process.env.NODE_ENV = 'development';
      expect(getDisplayVersion()).toBe('v0.9.0-dev');
    });

    test('should return display version in test', () => {
      process.env.NODE_ENV = 'test';
      expect(getDisplayVersion()).toBe('v0.9.0-test');
    });
  });

  describe('isVersionNewer', () => {
    test('should correctly compare major versions', () => {
      expect(isVersionNewer('0.8.0')).toBe(true);
      expect(isVersionNewer('1.0.0')).toBe(false);
    });

    test('should correctly compare minor versions', () => {
      expect(isVersionNewer('0.8.5')).toBe(true);
      expect(isVersionNewer('0.10.0')).toBe(false);
    });

    test('should correctly compare patch versions', () => {
      expect(isVersionNewer('0.9.0')).toBe(false);
      expect(isVersionNewer('0.8.9')).toBe(true);
    });
  });

  describe('getAdminVersionText', () => {
    test('should return formatted admin text', () => {
      process.env.NODE_ENV = 'production';
      expect(getAdminVersionText()).toBe('Admin Dashboard v0.9.0');
    });

    test('should include environment suffix', () => {
      process.env.NODE_ENV = 'development';
      expect(getAdminVersionText()).toBe('Admin Dashboard v0.9.0-dev');
    });
  });

  describe('getApiVersion', () => {
    test('should return clean version for API use', () => {
      expect(getApiVersion()).toBe('0.9.0');
    });
  });

  describe('getFullVersionInfo', () => {
    test('should return comprehensive version info', () => {
      process.env.NODE_ENV = 'production';
      const fullInfo = getFullVersionInfo();
      
      expect(fullInfo).toContain('v0.9.0');
      expect(fullInfo).toContain('production');
      expect(fullInfo).toContain('Build:');
    });

    test('should include environment in full info', () => {
      process.env.NODE_ENV = 'development';
      const fullInfo = getFullVersionInfo();
      
      expect(fullInfo).toContain('development');
    });
  });

  describe('Version consistency', () => {
    test('all version functions should use same source', () => {
      const baseVersion = getVersion();
      const info = getVersionInfo();
      const apiVersion = getApiVersion();
      
      expect(info.version).toBe(baseVersion);
      expect(apiVersion).toBe(baseVersion);
    });
  });

  describe('Build information', () => {
    test('should track build date', () => {
      const info = getVersionInfo();
      const buildDate = new Date(info.buildDate);
      
      expect(buildDate).toBeInstanceOf(Date);
      expect(buildDate.getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('should handle build number from environment', () => {
      process.env.BUILD_NUMBER = 'abc123';
      
      const info = getVersionInfo();
      
      expect(info.buildNumber).toBe('abc123');
    });
  });

  describe('Error handling', () => {
    test('should handle invalid version parts gracefully', () => {
      const info = getVersionInfo();
      
      expect(info.major).toBeGreaterThanOrEqual(0);
      expect(info.minor).toBeGreaterThanOrEqual(0);
      expect(info.patch).toBeGreaterThanOrEqual(0);
    });

    test('should handle missing environment variables', () => {
      delete process.env.NODE_ENV;
      delete process.env.BUILD_NUMBER;
      
      const info = getVersionInfo();
      
      expect(info.environment).toBe('development');
      expect(info.buildNumber).toBeUndefined();
    });
  });
});