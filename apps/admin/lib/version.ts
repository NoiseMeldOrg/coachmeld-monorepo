/**
 * Version Utility for Admin Dashboard
 * Provides dynamic version information from package.json
 */

import packageJson from '../package.json';

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  buildNumber?: string;
  environment: 'development' | 'production' | 'test';
  displayVersion: string;
  buildDate: string;
}

/**
 * Get comprehensive version information
 */
export function getVersionInfo(): VersionInfo {
  const version = packageJson.version;
  const parts = version.split('.');
  
  const major = parseInt(parts[0] || '0', 10);
  const minor = parseInt(parts[1] || '0', 10);
  const patch = parseInt(parts[2] || '0', 10);
  
  // Determine environment
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 
                     process.env.NODE_ENV === 'test' ? 'test' : 'development';
  
  // Create display version
  let displayVersion = `v${version}`;
  if (environment === 'development') {
    displayVersion += '-dev';
  } else if (environment === 'test') {
    displayVersion += '-test';
  }
  
  // Build date (when the version utility was loaded)
  const buildDate = new Date().toISOString();
  
  return {
    version,
    major,
    minor,
    patch,
    buildNumber: process.env.BUILD_NUMBER || undefined,
    environment,
    displayVersion,
    buildDate
  };
}

/**
 * Get just the version string
 */
export function getVersion(): string {
  return packageJson.version;
}

/**
 * Get display-friendly version string
 */
export function getDisplayVersion(): string {
  return getVersionInfo().displayVersion;
}

/**
 * Check if current version is newer than a given version
 */
export function isVersionNewer(compareVersion: string): boolean {
  const current = getVersionInfo();
  const compareParts = compareVersion.split('.').map(part => parseInt(part, 10));
  
  if (current.major > compareParts[0]) return true;
  if (current.major < compareParts[0]) return false;
  
  if (current.minor > compareParts[1]) return true;
  if (current.minor < compareParts[1]) return false;
  
  return current.patch > compareParts[2];
}

/**
 * Get version for display in admin header/footer
 */
export function getAdminVersionText(): string {
  const info = getVersionInfo();
  return `Admin Dashboard ${info.displayVersion}`;
}

/**
 * Get version for API responses or logging
 */
export function getApiVersion(): string {
  return getVersionInfo().version;
}

/**
 * Get full version info for debugging/support
 */
export function getFullVersionInfo(): string {
  const info = getVersionInfo();
  return `${info.displayVersion} (${info.environment}) - Build: ${info.buildDate}`;
}

/**
 * Component-friendly version hook for React
 */
export function useVersion() {
  return getVersionInfo();
}

/**
 * Default export for convenience
 */
export default {
  getVersionInfo,
  getVersion,
  getDisplayVersion,
  isVersionNewer,
  getAdminVersionText,
  getApiVersion,
  getFullVersionInfo,
  useVersion
};