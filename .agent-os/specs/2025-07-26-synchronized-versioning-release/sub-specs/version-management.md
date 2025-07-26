# Version Management Specification

This is the version management specification for the spec detailed in @.agent-os/specs/2025-07-26-synchronized-versioning-release/spec.md

> Created: 2025-07-26
> Version: 1.0.0

## Version Management Architecture

The CoachMeld monorepo implements a centralized version management system that ensures all applications maintain synchronized version numbers while providing flexibility for individual app-specific versioning needs.

## Centralized Version Storage

### Root Package.json as Master
```json
{
  "name": "coachmeld-monorepo",
  "version": "0.9.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "version:sync": "node scripts/sync-versions.js",
    "version:check": "node scripts/check-versions.js",
    "release": "node scripts/release.js"
  }
}
```

### App Package.json Synchronization
Each application's package.json maintains its own version field that stays synchronized with the root:

**Mobile App (apps/mobile/package.json):**
```json
{
  "name": "@coachmeld/mobile",
  "version": "0.9.0",
  "private": true
}
```

**Admin App (apps/admin/package.json):**
```json
{
  "name": "@coachmeld/admin", 
  "version": "0.9.0",
  "private": true
}
```

## Version Synchronization Scripts

### sync-versions.js Implementation
```javascript
const fs = require('fs');
const path = require('path');

// Read master version from root package.json
const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const masterVersion = rootPackage.version;

// App paths to synchronize
const appPaths = [
  'apps/mobile/package.json',
  'apps/admin/package.json'
];

// Update each app's version
appPaths.forEach(appPath => {
  const packagePath = path.resolve(appPath);
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  packageJson.version = masterVersion;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Updated ${appPath} to version ${masterVersion}`);
});
```

### check-versions.js Implementation
```javascript
const fs = require('fs');
const path = require('path');

// Read root version
const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const rootVersion = rootPackage.version;

// Check app versions
const appPaths = [
  { name: 'Mobile App', path: 'apps/mobile/package.json' },
  { name: 'Admin App', path: 'apps/admin/package.json' }
];

let allSynchronized = true;

console.log(`🎯 Root version: ${rootVersion}`);

appPaths.forEach(app => {
  const packageJson = JSON.parse(fs.readFileSync(app.path, 'utf8'));
  const appVersion = packageJson.version;
  
  if (appVersion === rootVersion) {
    console.log(`✅ ${app.name}: ${appVersion} (synchronized)`);
  } else {
    console.log(`❌ ${app.name}: ${appVersion} (out of sync)`);
    allSynchronized = false;
  }
});

if (!allSynchronized) {
  console.log('\n⚠️  Run "npm run version:sync" to synchronize versions');
  process.exit(1);
}

console.log('\n🎉 All versions synchronized!');
```

## Dynamic Version References

### Mobile App Version Access
```typescript
// src/utils/version.ts
import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;

// src/screens/SettingsScreen.tsx  
import { APP_VERSION } from '../utils/version';

const SettingsScreen = () => {
  return (
    <View>
      <Text>CoachMeld Mobile v{APP_VERSION}</Text>
    </View>
  );
};
```

### Admin App Version Access
```typescript
// utils/version.ts
import packageJson from '../package.json';

export const APP_VERSION = packageJson.version;

// app/components/Sidebar.tsx
import { APP_VERSION } from '../utils/version';

const Sidebar = () => {
  return (
    <div>
      <span>Admin Dashboard v{APP_VERSION}</span>
    </div>
  );
};
```

### Environment Variable Approach (Alternative)
```bash
# .env.local (for Next.js admin app)
NEXT_PUBLIC_APP_VERSION=0.9.0

# app.config.js (for Expo mobile app)
export default {
  expo: {
    version: process.env.EXPO_APP_VERSION || "0.9.0"
  }
};
```

## Release Script Implementation

### release.js Main Script
```javascript
const { execSync } = require('child_process');
const fs = require('fs');

class ReleaseManager {
  constructor(newVersion) {
    this.newVersion = newVersion;
    this.rootPackagePath = 'package.json';
  }

  async execute() {
    console.log(`🚀 Starting release process for v${this.newVersion}`);
    
    // 1. Validate environment
    this.validateEnvironment();
    
    // 2. Update versions
    this.updateVersions();
    
    // 3. Generate changelogs
    this.generateChangelogs();
    
    // 4. Create git commit and tag
    this.createRelease();
    
    console.log(`✅ Release v${this.newVersion} completed successfully!`);
  }

  validateEnvironment() {
    // Check git status
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim()) {
      throw new Error('Working directory must be clean before release');
    }
    
    // Check current branch
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    if (currentBranch !== 'main') {
      throw new Error('Releases must be created from main branch');
    }
  }

  updateVersions() {
    // Update root package.json
    const rootPackage = JSON.parse(fs.readFileSync(this.rootPackagePath, 'utf8'));
    rootPackage.version = this.newVersion;
    fs.writeFileSync(this.rootPackagePath, JSON.stringify(rootPackage, null, 2) + '\n');
    
    // Sync to all apps
    execSync('npm run version:sync');
    
    console.log(`📦 Updated all packages to v${this.newVersion}`);
  }

  generateChangelogs() {
    // Generate root changelog
    execSync(`npx conventional-changelog -p angular -i CHANGELOG.md -s -r 0`);
    
    // Generate app-specific changelogs
    const apps = ['mobile', 'admin'];
    apps.forEach(app => {
      const changelogPath = `apps/${app}/CHANGELOG.md`;
      execSync(`npx conventional-changelog -p angular -i ${changelogPath} -s -r 0`);
    });
    
    console.log('📝 Generated changelogs');
  }

  createRelease() {
    // Stage all changes
    execSync('git add .');
    
    // Create release commit
    const commitMessage = `chore: release v${this.newVersion}

- Synchronize versions across monorepo
- Generate changelogs for all applications
- Prepare for v${this.newVersion} release

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;
    
    execSync(`git commit -m "${commitMessage}"`);
    
    // Create annotated tag
    execSync(`git tag -a v${this.newVersion} -m "Release v${this.newVersion}"`);
    
    console.log(`🏷️  Created release commit and tag v${this.newVersion}`);
  }
}

// Usage: node scripts/release.js 0.9.0
const newVersion = process.argv[2];
if (!newVersion) {
  console.error('❌ Please provide a version number: node scripts/release.js 0.9.0');
  process.exit(1);
}

const releaseManager = new ReleaseManager(newVersion);
releaseManager.execute().catch(error => {
  console.error('❌ Release failed:', error.message);
  process.exit(1);
});
```

## Version Validation & Enforcement

### Pre-commit Hook Integration
```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check version synchronization
npm run version:check

# Run tests
npm test

# Lint code
npm run lint
```

### CI/CD Integration
```yaml
# .github/workflows/version-check.yml
name: Version Consistency Check

on: [push, pull_request]

jobs:
  version-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Check version synchronization
        run: npm run version:check
```

## Hardcoded Version Reference Cleanup

### Files Requiring Updates

**Mobile App References:**
- `apps/mobile/app.config.js` - Expo version field
- `apps/mobile/src/screens/SettingsScreen.tsx` - About screen version display
- `apps/mobile/package.json` - Version field (automated)

**Admin App References:**
- `apps/admin/package.json` - Version field (automated)  
- `apps/admin/app/components/Sidebar.tsx` - Version display in UI
- `apps/admin/app/api/health/route.ts` - API version headers (if any)

**Documentation References:**
- `apps/mobile/.agent-os/product/roadmap.md` - Version milestones
- `apps/admin/.agent-os/product/roadmap.md` - Version milestones
- `README.md` files - Version references
- `CHANGELOG.md` files - Version history

### Search and Replace Strategy
```bash
# Find all hardcoded version references
grep -r "0\.8\.0\|0\.3\.0\|1\.0\.0" --exclude-dir=node_modules .

# Replace with dynamic references
# Manual review and update each file appropriately
```

## Migration Path to v0.9.0

### Current State Assessment
- **Root**: v1.0.0 → v0.9.0 (version decrease to align with apps)
- **Mobile**: v0.8.0 → v0.9.0 (normal increment)
- **Admin**: v0.3.0 → v0.9.0 (major jump to synchronize)

### Migration Execution Steps
1. **Backup Current State**: Create git branch for rollback if needed
2. **Execute Release Script**: Run automated version update process
3. **Manual Reference Updates**: Update any missed hardcoded references
4. **Validation Testing**: Verify all apps display correct version
5. **Documentation Updates**: Update roadmaps and changelogs
6. **Git Operations**: Commit, tag, and push synchronized release

### Post-Migration Validation
- All package.json files show v0.9.0
- Mobile app About screen shows v0.9.0
- Admin dashboard footer/header shows v0.9.0
- Git tag v0.9.0 exists and points to correct commit
- Documentation reflects synchronized versioning approach