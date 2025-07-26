#!/usr/bin/env node

/**
 * Version Consistency Checker
 * Validates that all package.json files have synchronized versions
 */

const fs = require('fs');
const path = require('path');

class VersionChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Read and parse a package.json file
   */
  readPackageJson(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Package.json not found: ${filePath}`);
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.errors.push(`Failed to read ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate semantic version format
   */
  isValidSemver(version) {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*|[0-9a-zA-Z-]*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*|[0-9a-zA-Z-]*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  /**
   * Check version consistency across all package.json files
   */
  checkVersions() {
    const packagePaths = {
      root: 'package.json',
      mobile: 'apps/mobile/package.json',
      admin: 'apps/admin/package.json'
    };

    const packages = {};
    
    // Read all package.json files
    for (const [name, relativePath] of Object.entries(packagePaths)) {
      const fullPath = path.resolve(relativePath);
      packages[name] = this.readPackageJson(fullPath);
      
      if (packages[name]) {
        console.log(`✓ Found ${name}: v${packages[name].version}`);
      }
    }

    // Check if any packages failed to load
    const loadedPackages = Object.entries(packages).filter(([, pkg]) => pkg !== null);
    if (loadedPackages.length === 0) {
      this.errors.push('No package.json files could be loaded');
      return false;
    }

    // Validate semver format
    for (const [name, pkg] of loadedPackages) {
      if (!this.isValidSemver(pkg.version)) {
        this.errors.push(`Invalid semver format in ${name}: ${pkg.version}`);
      }
    }

    // Check version consistency
    const versions = loadedPackages.map(([name, pkg]) => ({ name, version: pkg.version }));
    const uniqueVersions = [...new Set(versions.map(v => v.version))];

    if (uniqueVersions.length > 1) {
      this.errors.push('Version mismatch detected:');
      versions.forEach(({ name, version }) => {
        this.errors.push(`  ${name}: v${version}`);
      });
      return false;
    }

    // All checks passed
    const sharedVersion = uniqueVersions[0];
    console.log(`\n✅ All packages synchronized at v${sharedVersion}`);
    return true;
  }

  /**
   * Run the version check and output results
   */
  run() {
    console.log('🔍 Checking version consistency across monorepo...\n');
    
    const isConsistent = this.checkVersions();
    
    // Output warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    // Output errors
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`   ${error}`));
    }
    
    if (isConsistent && this.errors.length === 0) {
      console.log('\n🎉 Version consistency check passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Version consistency check failed!');
      console.log('\nTo fix version inconsistencies, run: npm run sync-versions');
      process.exit(1);
    }
  }
}

// Run the checker if this file is executed directly
if (require.main === module) {
  const checker = new VersionChecker();
  checker.run();
}

module.exports = VersionChecker;