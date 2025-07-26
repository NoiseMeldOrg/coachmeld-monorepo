/**
 * Tests for Version Management Scripts
 * Tests the sync-versions.js and check-versions.js functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Version Management Scripts', () => {
  const testDir = path.join(__dirname, 'test-workspace');
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
    
    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);
    
    // Clean up test workspace
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('VersionChecker', () => {
    const VersionChecker = require('../check-versions.js');

    test('should detect version inconsistencies', () => {
      const checker = new VersionChecker();
      const result = checker.checkVersions();
      
      expect(result).toBe(false);
      expect(checker.errors).toContain('Version mismatch detected:');
    });

    test('should validate semver format', () => {
      const checker = new VersionChecker();
      
      expect(checker.isValidSemver('1.0.0')).toBe(true);
      expect(checker.isValidSemver('0.9.0')).toBe(true);
      expect(checker.isValidSemver('1.2.3-alpha.1')).toBe(true);
      expect(checker.isValidSemver('invalid')).toBe(false);
      expect(checker.isValidSemver('1.0')).toBe(false);
    });

    test('should pass when all versions are synchronized', () => {
      // Update all packages to same version
      const targetVersion = '2.0.0';
      
      ['package.json', 'apps/mobile/package.json', 'apps/admin/package.json'].forEach(pkgPath => {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.version = targetVersion;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      });
      
      const checker = new VersionChecker();
      const result = checker.checkVersions();
      
      expect(result).toBe(true);
      expect(checker.errors.length).toBe(0);
    });
  });

  describe('VersionSynchronizer', () => {
    const VersionSynchronizer = require('../sync-versions.js');

    test('should synchronize all packages to root version', () => {
      const synchronizer = new VersionSynchronizer();
      const result = synchronizer.syncVersions();
      
      expect(result).toBe(true);
      expect(synchronizer.errors.length).toBe(0);
      
      // Verify all packages have the same version
      const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const mobilePkg = JSON.parse(fs.readFileSync('apps/mobile/package.json', 'utf8'));
      const adminPkg = JSON.parse(fs.readFileSync('apps/admin/package.json', 'utf8'));
      
      expect(mobilePkg.version).toBe(rootPkg.version);
      expect(adminPkg.version).toBe(rootPkg.version);
    });

    test('should update to specified target version', () => {
      const targetVersion = '0.9.0';
      const synchronizer = new VersionSynchronizer();
      const result = synchronizer.syncVersions(targetVersion);
      
      expect(result).toBe(true);
      expect(synchronizer.errors.length).toBe(0);
      
      // Verify all packages updated to target version
      const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const mobilePkg = JSON.parse(fs.readFileSync('apps/mobile/package.json', 'utf8'));
      const adminPkg = JSON.parse(fs.readFileSync('apps/admin/package.json', 'utf8'));
      
      expect(rootPkg.version).toBe(targetVersion);
      expect(mobilePkg.version).toBe(targetVersion);
      expect(adminPkg.version).toBe(targetVersion);
    });

    test('should handle invalid semver format', () => {
      const synchronizer = new VersionSynchronizer();
      const result = synchronizer.syncVersions('invalid-version');
      
      expect(result).toBe(false);
      expect(synchronizer.errors).toContain('Invalid semver format: invalid-version');
    });

    test('should track changes made', () => {
      const synchronizer = new VersionSynchronizer();
      synchronizer.syncVersions();
      
      // Should have recorded changes for mobile and admin apps
      expect(synchronizer.changes.length).toBeGreaterThan(0);
      expect(synchronizer.changes.some(change => change.includes('mobile'))).toBe(true);
      expect(synchronizer.changes.some(change => change.includes('admin'))).toBe(true);
    });

    test('should preserve package.json formatting', () => {
      const originalMobile = fs.readFileSync('apps/mobile/package.json', 'utf8');
      
      const synchronizer = new VersionSynchronizer();
      synchronizer.syncVersions();
      
      const updatedMobile = fs.readFileSync('apps/mobile/package.json', 'utf8');
      
      // Should maintain JSON formatting (2 spaces, trailing newline)
      expect(updatedMobile.endsWith('\n')).toBe(true);
      
      const parsed = JSON.parse(updatedMobile);
      expect(parsed.name).toBe('@test/mobile');
      expect(parsed.private).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing package.json files gracefully', () => {
      // Remove mobile package.json
      fs.unlinkSync('apps/mobile/package.json');
      
      const VersionChecker = require('../check-versions.js');
      const checker = new VersionChecker();
      const result = checker.checkVersions();
      
      // Should still work with remaining packages
      expect(checker.errors.length).toBeGreaterThan(0);
      expect(checker.errors.some(error => error.includes('Failed to read'))).toBe(true);
    });

    test('should handle corrupted package.json files', () => {
      // Write invalid JSON
      fs.writeFileSync('apps/mobile/package.json', '{ invalid json }');
      
      const VersionChecker = require('../check-versions.js');
      const checker = new VersionChecker();
      checker.checkVersions();
      
      expect(checker.errors.some(error => error.includes('Failed to read'))).toBe(true);
    });
  });
});