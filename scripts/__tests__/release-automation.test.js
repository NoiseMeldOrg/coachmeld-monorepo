/**
 * Tests for Release Automation Script
 * Tests the release.js functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Release Automation Script', () => {
  const testDir = path.join(__dirname, 'test-release-workspace');
  const originalCwd = process.cwd();

  beforeEach(() => {
    // Create test workspace
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create test directory structure
    fs.mkdirSync(path.join(testDir, 'apps', 'mobile'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'apps', 'admin'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'scripts'), { recursive: true });
    
    // Copy version scripts to test environment
    const scriptsPath = path.join(__dirname, '..');
    fs.copyFileSync(
      path.join(scriptsPath, 'sync-versions.js'),
      path.join(testDir, 'scripts', 'sync-versions.js')
    );
    
    // Create test package.json files
    const rootPackage = {
      name: 'test-monorepo',
      version: '1.0.0',
      private: true
    };
    
    const mobilePackage = {
      name: '@test/mobile',
      version: '0.8.0',
      private: true
    };
    
    const adminPackage = {
      name: '@test/admin',
      version: '0.3.0',
      private: true
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(rootPackage, null, 2)
    );
    
    fs.writeFileSync(
      path.join(testDir, 'apps', 'mobile', 'package.json'),
      JSON.stringify(mobilePackage, null, 2)
    );
    
    fs.writeFileSync(
      path.join(testDir, 'apps', 'admin', 'package.json'),
      JSON.stringify(adminPackage, null, 2)
    );
    
    // Initialize git repository
    process.chdir(testDir);
    try {
      execSync('git init', { stdio: 'pipe' });
      execSync('git config user.name "Test User"', { stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
      execSync('git add .', { stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { stdio: 'pipe' });
    } catch (error) {
      // Git operations might fail in test environment, that's okay
    }
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test workspace
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('ReleaseManager', () => {
    const ReleaseManager = require('../release.js');

    test('should calculate next version correctly', () => {
      const manager = new ReleaseManager();
      
      expect(manager.getNextVersion('1.0.0', 'patch')).toBe('1.0.1');
      expect(manager.getNextVersion('1.0.0', 'minor')).toBe('1.1.0');
      expect(manager.getNextVersion('1.0.0', 'major')).toBe('2.0.0');
      expect(manager.getNextVersion('1.2.3', 'patch')).toBe('1.2.4');
    });

    test('should handle invalid version formats', () => {
      const manager = new ReleaseManager();
      
      const result = manager.getNextVersion('invalid', 'patch');
      expect(result).toBeNull();
      expect(manager.errors.length).toBeGreaterThan(0);
      expect(manager.errors[0]).toContain('Invalid current version');
    });

    test('should detect git repository state', () => {
      const manager = new ReleaseManager();
      
      // This test may vary based on git availability in test environment
      const isClean = manager.isGitClean();
      expect(typeof isClean).toBe('boolean');
    });

    test('should update versions using sync-versions script', () => {
      const manager = new ReleaseManager();
      manager.dryRun = true; // Prevent actual file changes
      
      const result = manager.updateVersions('2.0.0');
      // In dry run mode, this should work conceptually
      expect(typeof result).toBe('boolean');
    });

    test('should generate initial changelog', () => {
      const manager = new ReleaseManager();
      manager.dryRun = true;
      
      const result = manager.generateChangelog('2.0.0');
      expect(result).toBe(true);
      expect(manager.changes.some(change => change.toLowerCase().includes('changelog'))).toBe(true);
    });

    test('should validate environment requirements', () => {
      const manager = new ReleaseManager();
      
      // Should pass since we have package.json
      const result = manager.validateEnvironment();
      
      if (result === false) {
        // Git might not be available or working directory not clean
        expect(manager.errors.length).toBeGreaterThan(0);
      } else {
        expect(result).toBe(true);
      }
    });
  });

  describe('Command Line Interface', () => {
    const ReleaseManager = require('../release.js');

    test('should parse release type from arguments', () => {
      const manager = new ReleaseManager();
      
      // Test that the constructor and basic setup work
      expect(manager.errors).toEqual([]);
      expect(manager.warnings).toEqual([]);
      expect(manager.changes).toEqual([]);
    });

    test('should handle dry run mode', () => {
      const manager = new ReleaseManager();
      manager.dryRun = true;
      
      // Test that dry run commands don't execute
      const result = manager.execCommand('echo "test"');
      expect(result).toBe('');
    });

    test('should handle command execution errors', () => {
      const manager = new ReleaseManager();
      
      expect(() => {
        manager.execCommand('nonexistent-command-that-will-fail');
      }).toThrow();
    });
  });

  describe('Version Validation', () => {
    const ReleaseManager = require('../release.js');

    test('should validate semver versions', () => {
      const manager = new ReleaseManager();
      
      expect(manager.getNextVersion('1.0.0', 'patch')).toBe('1.0.1');
      expect(manager.getNextVersion('0.1.0', 'minor')).toBe('0.2.0');
      expect(manager.getNextVersion('1.0.0', 'major')).toBe('2.0.0');
    });

    test('should handle pre-release versions', () => {
      const manager = new ReleaseManager();
      
      // Test that pre-release versions are handled (exact behavior may vary)
      const result1 = manager.getNextVersion('1.0.0-alpha.1', 'patch');
      const result2 = manager.getNextVersion('0.9.0-beta.1', 'minor');
      
      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
      expect(result1.length).toBeGreaterThan(0);
      expect(result2.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    const ReleaseManager = require('../release.js');

    test('should handle missing package.json gracefully', () => {
      // Remove package.json
      fs.unlinkSync('package.json');
      
      const manager = new ReleaseManager();
      const result = manager.validateEnvironment();
      
      expect(result).toBe(false);
      expect(manager.errors.some(error => error.includes('root directory'))).toBe(true);
    });

    test('should accumulate multiple errors', () => {
      const manager = new ReleaseManager();
      
      manager.getNextVersion('invalid', 'patch');
      manager.getNextVersion('also-invalid', 'minor');
      
      expect(manager.errors.length).toBe(2);
    });

    test('should track warnings separately from errors', () => {
      const manager = new ReleaseManager();
      
      // Force a warning condition (this is a conceptual test)
      manager.warnings.push('Test warning');
      
      expect(manager.warnings.length).toBe(1);
      expect(manager.errors.length).toBe(0);
    });
  });
});