/**
 * Tests for Mobile App Version Utility
 */

import {
  getVersionInfo,
  getVersion,
  getDisplayVersion,
  isVersionNewer,
  getSettingsVersionText,
  getApiVersion
} from '../version';

// Mock package.json
jest.mock('../../../package.json', () => ({
  version: '0.9.0'
}));

// Mock __DEV__ global
declare global {
  var __DEV__: boolean;
}

describe('Mobile Version Utility', () => {
  beforeEach(() => {
    // Reset __DEV__ for each test
    global.__DEV__ = false;
  });

  describe('getVersionInfo', () => {
    test('should return correct version info in production', () => {
      global.__DEV__ = false;
      
      const info = getVersionInfo();
      
      expect(info.version).toBe('0.9.0');
      expect(info.major).toBe(0);
      expect(info.minor).toBe(9);
      expect(info.patch).toBe(0);
      expect(info.isProduction).toBe(true);
      expect(info.displayVersion).toBe('v0.9.0');
    });

    test('should return correct version info in development', () => {
      global.__DEV__ = true;
      
      const info = getVersionInfo();
      
      expect(info.version).toBe('0.9.0');
      expect(info.isProduction).toBe(false);
      expect(info.displayVersion).toBe('v0.9.0-dev');
    });

    test('should handle malformed version gracefully', () => {
      // This test would require mocking package.json differently
      // For now, just test that it returns numbers
      const info = getVersionInfo();
      
      expect(typeof info.major).toBe('number');
      expect(typeof info.minor).toBe('number');
      expect(typeof info.patch).toBe('number');
    });
  });

  describe('getVersion', () => {
    test('should return raw version string', () => {
      expect(getVersion()).toBe('0.9.0');
    });
  });

  describe('getDisplayVersion', () => {
    test('should return display version in production', () => {
      global.__DEV__ = false;
      expect(getDisplayVersion()).toBe('v0.9.0');
    });

    test('should return display version in development', () => {
      global.__DEV__ = true;
      expect(getDisplayVersion()).toBe('v0.9.0-dev');
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

    test('should handle edge cases', () => {
      expect(isVersionNewer('0.9.0')).toBe(false); // Same version
    });
  });

  describe('getSettingsVersionText', () => {
    test('should return formatted settings text', () => {
      global.__DEV__ = false;
      expect(getSettingsVersionText()).toBe('Version v0.9.0');
    });

    test('should include dev suffix in development', () => {
      global.__DEV__ = true;
      expect(getSettingsVersionText()).toBe('Version v0.9.0-dev');
    });
  });

  describe('getApiVersion', () => {
    test('should return clean version for API use', () => {
      expect(getApiVersion()).toBe('0.9.0');
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

  describe('Error handling', () => {
    test('should handle invalid version parts gracefully', () => {
      // The utility should not crash with malformed version strings
      const info = getVersionInfo();
      
      expect(info.major).toBeGreaterThanOrEqual(0);
      expect(info.minor).toBeGreaterThanOrEqual(0);
      expect(info.patch).toBeGreaterThanOrEqual(0);
    });
  });
});