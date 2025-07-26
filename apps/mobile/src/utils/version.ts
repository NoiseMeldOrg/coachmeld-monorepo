/**
 * Version Utility for Mobile App
 * Provides dynamic version information from package.json
 */

import packageJson from '../../package.json';

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  buildNumber?: string;
  isProduction: boolean;
  displayVersion: string;
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
  
  // Determine if this is a production build
  const isProduction = !__DEV__;
  
  // Create display version (e.g., "v0.9.0" or "v0.9.0-dev")
  const displayVersion = `v${version}${isProduction ? '' : '-dev'}`;
  
  return {
    version,
    major,
    minor,
    patch,
    buildNumber: undefined, // Could be set from build system
    isProduction,
    displayVersion
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
 * Get version for display in Settings screen
 */
export function getSettingsVersionText(): string {
  const info = getVersionInfo();
  return `Version ${info.displayVersion}`;
}

/**
 * Get version for API headers or logging
 */
export function getApiVersion(): string {
  return getVersionInfo().version;
}

/**
 * Default export for convenience
 */
export default {
  getVersionInfo,
  getVersion,
  getDisplayVersion,
  isVersionNewer,
  getSettingsVersionText,
  getApiVersion
};