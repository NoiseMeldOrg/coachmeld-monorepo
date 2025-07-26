#!/usr/bin/env node

/**
 * Automated Release Script
 * Handles version updates, changelog generation, and git operations for monorepo releases
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

class ReleaseManager {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.changes = [];
    this.dryRun = false;
  }

  /**
   * Execute a shell command safely
   */
  execCommand(command, options = {}) {
    try {
      if (this.dryRun) {
        console.log(`[DRY RUN] Would execute: ${command}`);
        return '';
      }
      
      const result = execSync(command, { 
        encoding: 'utf8', 
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options 
      });
      return result.trim();
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  /**
   * Check if git repository is clean
   */
  isGitClean() {
    try {
      const status = this.execCommand('git status --porcelain', { silent: true });
      return status.length === 0;
    } catch (error) {
      this.errors.push(`Failed to check git status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current git branch
   */
  getCurrentBranch() {
    try {
      return this.execCommand('git branch --show-current', { silent: true });
    } catch (error) {
      this.errors.push(`Failed to get current branch: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate environment for release
   */
  validateEnvironment() {
    console.log('🔍 Validating release environment...\n');

    // Check if we're in the root directory
    if (!fs.existsSync('package.json')) {
      this.errors.push('Must run from monorepo root directory');
      return false;
    }

    // Check git status
    if (!this.isGitClean()) {
      this.errors.push('Git working directory must be clean before release');
      this.errors.push('Please commit or stash your changes first');
      return false;
    }

    // Check current branch
    const currentBranch = this.getCurrentBranch();
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      this.warnings.push(`Releasing from branch '${currentBranch}' instead of main/master`);
    }

    console.log(`✓ Git repository is clean`);
    console.log(`✓ Current branch: ${currentBranch}`);
    
    return true;
  }

  /**
   * Determine next version based on current version and release type
   */
  getNextVersion(currentVersion, releaseType = 'patch') {
    if (!semver.valid(currentVersion)) {
      this.errors.push(`Invalid current version: ${currentVersion}`);
      return null;
    }

    try {
      return semver.inc(currentVersion, releaseType);
    } catch (error) {
      this.errors.push(`Failed to calculate next version: ${error.message}`);
      return null;
    }
  }

  /**
   * Update version in all package.json files
   */
  updateVersions(newVersion) {
    console.log(`📦 Updating all packages to v${newVersion}...`);

    const VersionSynchronizer = require('./sync-versions.js');
    const synchronizer = new VersionSynchronizer();
    
    const success = synchronizer.syncVersions(newVersion);
    
    if (!success) {
      this.errors.push('Failed to synchronize versions');
      this.errors.push(...synchronizer.errors);
      return false;
    }

    this.changes.push(...synchronizer.changes);
    return true;
  }

  /**
   * Generate or update changelog
   */
  generateChangelog(newVersion) {
    console.log(`📝 Generating changelog for v${newVersion}...`);

    try {
      // Check if CHANGELOG.md exists
      const changelogPath = 'CHANGELOG.md';
      const changelogExists = fs.existsSync(changelogPath);

      if (!changelogExists) {
        // Create initial changelog
        const initialContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [${newVersion}] - ${new Date().toISOString().split('T')[0]}

### Added
- Synchronized versioning system across monorepo
- Automated release management tools

### Changed
- Updated all applications to v${newVersion}

### Technical
- Implemented version synchronization scripts
- Added release automation tools
`;
        
        if (!this.dryRun) {
          fs.writeFileSync(changelogPath, initialContent);
        }
        this.changes.push('Created initial CHANGELOG.md');
        console.log('✓ Created initial changelog');
      } else {
        // Use conventional-changelog to update existing changelog
        const command = `npx conventional-changelog -p angular -i CHANGELOG.md -s`;
        
        try {
          this.execCommand(command);
          this.changes.push('Updated CHANGELOG.md with conventional commits');
          console.log('✓ Updated changelog from commit history');
        } catch (error) {
          this.warnings.push('Conventional changelog generation failed, skipping automatic update');
          console.log('⚠️  Changelog update skipped (no conventional commits found)');
        }
      }

      return true;
    } catch (error) {
      this.errors.push(`Failed to generate changelog: ${error.message}`);
      return false;
    }
  }

  /**
   * Create git commit and tag for release
   */
  createReleaseCommit(version) {
    console.log(`🏷️  Creating release commit and tag for v${version}...`);

    try {
      // Stage all changes
      this.execCommand('git add .');

      // Create commit
      const commitMessage = `release: v${version}

- Synchronize all applications to v${version}
- Update package.json versions across monorepo
- Generate changelog entries

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

      this.execCommand(`git commit -m "${commitMessage}"`);
      this.changes.push(`Created release commit for v${version}`);

      // Create annotated tag
      const tagMessage = `Release v${version}`;
      this.execCommand(`git tag -a v${version} -m "${tagMessage}"`);
      this.changes.push(`Created git tag v${version}`);

      console.log(`✓ Created commit and tag for v${version}`);
      return true;
    } catch (error) {
      this.errors.push(`Failed to create release commit: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute the full release process
   */
  executeRelease(releaseType = 'patch', targetVersion = null) {
    console.log('🚀 Starting release process...\n');

    // Validate environment
    if (!this.validateEnvironment()) {
      return false;
    }

    // Get current version from root package.json
    const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = rootPackage.version;
    console.log(`📍 Current version: v${currentVersion}`);

    // Determine next version
    const newVersion = targetVersion || this.getNextVersion(currentVersion, releaseType);
    if (!newVersion) {
      return false;
    }

    console.log(`🎯 Target version: v${newVersion}\n`);

    // Execute release steps
    const steps = [
      () => this.updateVersions(newVersion),
      () => this.generateChangelog(newVersion),
      () => this.createReleaseCommit(newVersion)
    ];

    for (const step of steps) {
      if (!step()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Run the release manager
   */
  run(args = []) {
    // Parse command line arguments
    const releaseType = args.find(arg => ['patch', 'minor', 'major'].includes(arg)) || 'patch';
    const targetVersion = args.find(arg => semver.valid(arg));
    this.dryRun = args.includes('--dry-run');

    if (this.dryRun) {
      console.log('🧪 DRY RUN MODE - No changes will be made\n');
    }

    const success = this.executeRelease(releaseType, targetVersion);

    // Output results
    if (this.changes.length > 0) {
      console.log('\n📝 Changes made:');
      this.changes.forEach(change => console.log(`   ${change}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`   ${error}`));
    }

    if (success) {
      console.log('\n🎉 Release completed successfully!');
      
      if (!this.dryRun) {
        console.log('\n💡 Next steps:');
        console.log('   1. Review the changes above');
        console.log('   2. Push to remote: git push && git push --tags');
        console.log('   3. Create GitHub release from the new tag');
        console.log('   4. Deploy applications with the new version');
      }
      
      process.exit(0);
    } else {
      console.log('\n💥 Release failed!');
      console.log('Please fix the errors above and try again.');
      process.exit(1);
    }
  }
}

// Run the release manager if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const manager = new ReleaseManager();
  manager.run(args);
}

module.exports = ReleaseManager;