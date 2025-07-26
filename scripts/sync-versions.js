#!/usr/bin/env node

/**
 * Version Synchronization Script
 * Updates all package.json files to match the root package.json version
 */

const fs = require('fs');
const path = require('path');

class VersionSynchronizer {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.changes = [];
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
   * Write package.json file with proper formatting
   */
  writePackageJson(filePath, packageData) {
    try {
      const content = JSON.stringify(packageData, null, 2) + '\n';
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      this.errors.push(`Failed to write ${filePath}: ${error.message}`);
      return false;
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
   * Sync all package.json versions to match the root version
   */
  syncVersions(targetVersion = null) {
    const packagePaths = {
      root: 'package.json',
      mobile: 'apps/mobile/package.json',
      admin: 'apps/admin/package.json'
    };

    // Read root package.json to get the master version
    const rootPath = path.resolve(packagePaths.root);
    const rootPackage = this.readPackageJson(rootPath);
    
    if (!rootPackage) {
      this.errors.push('Cannot read root package.json');
      return false;
    }

    // Determine the target version
    const masterVersion = targetVersion || rootPackage.version;
    
    if (!this.isValidSemver(masterVersion)) {
      this.errors.push(`Invalid semver format: ${masterVersion}`);
      return false;
    }

    console.log(`🎯 Target version: v${masterVersion}`);
    console.log(`📦 Synchronizing all packages...\n`);

    // Update root package.json if target version was specified
    if (targetVersion && targetVersion !== rootPackage.version) {
      rootPackage.version = masterVersion;
      if (this.writePackageJson(rootPath, rootPackage)) {
        this.changes.push(`Updated root package.json: v${rootPackage.version} → v${masterVersion}`);
        console.log(`✓ Updated root: v${masterVersion}`);
      }
    } else {
      console.log(`✓ Root already at v${masterVersion}`);
    }

    // Update app package.json files
    const appPaths = {
      mobile: packagePaths.mobile,
      admin: packagePaths.admin
    };

    for (const [appName, relativePath] of Object.entries(appPaths)) {
      const fullPath = path.resolve(relativePath);
      const appPackage = this.readPackageJson(fullPath);
      
      if (!appPackage) {
        this.warnings.push(`Skipping ${appName} (package.json not found)`);
        continue;
      }

      const currentVersion = appPackage.version;
      
      if (currentVersion === masterVersion) {
        console.log(`✓ ${appName} already at v${masterVersion}`);
      } else {
        appPackage.version = masterVersion;
        if (this.writePackageJson(fullPath, appPackage)) {
          this.changes.push(`Updated ${appName}: v${currentVersion} → v${masterVersion}`);
          console.log(`✓ Updated ${appName}: v${currentVersion} → v${masterVersion}`);
        }
      }
    }

    return this.errors.length === 0;
  }

  /**
   * Run the synchronization process
   */
  run(targetVersion = null) {
    console.log('🔄 Synchronizing versions across monorepo...\n');
    
    const success = this.syncVersions(targetVersion);
    
    // Output changes made
    if (this.changes.length > 0) {
      console.log('\n📝 Changes made:');
      this.changes.forEach(change => console.log(`   ${change}`));
    }
    
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
    
    if (success) {
      console.log('\n🎉 Version synchronization completed successfully!');
      
      if (this.changes.length > 0) {
        console.log('\n💡 Next steps:');
        console.log('   1. Review the changes above');
        console.log('   2. Test that all apps work with the new version');
        console.log('   3. Commit the changes: git add . && git commit -m "sync: update all packages to v{version}"');
      }
      
      process.exit(0);
    } else {
      console.log('\n💥 Version synchronization failed!');
      process.exit(1);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const targetVersion = args.length > 0 ? args[0] : null;

// Run the synchronizer if this file is executed directly
if (require.main === module) {
  const synchronizer = new VersionSynchronizer();
  synchronizer.run(targetVersion);
}

module.exports = VersionSynchronizer;