# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-26-synchronized-versioning-release/spec.md

> Created: 2025-07-26
> Version: 1.0.0

## Technical Requirements

### Monorepo Version Architecture

- **Single Source of Truth**: Root package.json maintains the canonical version number for the entire monorepo
- **App Version Synchronization**: Mobile and admin package.json files either reference root version or are kept in sync via scripts
- **Dynamic Version References**: All hardcoded version strings replaced with dynamic imports/references
- **Release Script Integration**: Automated scripts handle version updates across all applications simultaneously

### Version Management System

- **Centralized Version Storage**: Root package.json version field serves as the master version
- **Propagation Mechanism**: Scripts automatically update all app package.json files when root version changes
- **Runtime Version Access**: Apps access version through dynamic imports or environment variables, not hardcoded strings
- **Validation System**: Pre-commit hooks ensure version consistency across all package.json files

### Release Automation Requirements

- **Multi-App Version Updates**: Single command updates versions in root, mobile, and admin package.json files
- **Git Tag Creation**: Automated git tagging with proper version format (v0.9.0)
- **Changelog Generation**: Automated changelog updates for each app and root level
- **Release Branch Management**: Optional release branch creation for stable releases

### Current State Analysis

**Existing Versions:**
- Root monorepo: v1.0.0 → v0.9.0
- Mobile app: v0.8.0 → v0.9.0  
- Admin app: v0.3.0 → v0.9.0

**Version References to Update:**
- App store metadata (mobile)
- About screens (mobile and admin)
- Package.json files (all)
- Documentation files (roadmaps, READMEs)
- API version headers (if any)

## Approach Options

**Option A: Script-Based Synchronization** (Selected)
- Pros: Simple implementation, maintains existing package.json structure, works with existing tools
- Cons: Requires manual script execution, potential for drift if scripts aren't run

**Option B: Lerna/Nx Workspace Management**  
- Pros: Industry standard, handles complex dependencies, advanced release features
- Cons: Heavy tooling overhead, learning curve, overkill for current needs

**Option C: Shared Package Version**
- Pros: True single source of truth, zero drift possibility
- Cons: Complex setup, requires build system changes, affects existing tooling

**Rationale:** Option A provides the right balance of simplicity and functionality for the current monorepo structure. The user already has a well-functioning setup that just needs version coordination, not a complete overhaul.

## External Dependencies

**Release Management Tools:**
- **conventional-changelog-cli** - Generate automated changelogs from conventional commits
- **Justification:** Provides consistent, automated changelog generation based on commit history

**Version Management Utilities:**
- **semver** - Semantic version parsing and manipulation  
- **Justification:** Ensures proper semantic version handling in release scripts

**Git Integration:**
- **simple-git** (optional) - Programmatic git operations from Node.js
- **Justification:** Enables automated git operations in release scripts if needed

## Implementation Architecture

### File Structure Changes
```
├── package.json (master version: 0.9.0)
├── scripts/
│   ├── release.js (new)
│   ├── sync-versions.js (new)
│   └── version-check.js (new)
├── apps/
│   ├── mobile/
│   │   └── package.json (sync with root)
│   └── admin/
│       └── package.json (sync with root)
└── CHANGELOG.md (updated)
```

### Release Script Flow
1. **Version Validation**: Check current versions and determine next version
2. **Multi-App Update**: Update package.json in root, mobile, and admin
3. **Changelog Generation**: Update CHANGELOG.md with new version entries
4. **Git Operations**: Commit version changes and create annotated tag
5. **Verification**: Validate all versions are synchronized

### Runtime Version Access Pattern
```typescript
// Instead of hardcoded strings
const version = "0.8.0"; // ❌ Old way

// Dynamic import from package.json
import { version } from '../package.json'; // ✅ New way

// Or environment variable approach
const version = process.env.APP_VERSION || '0.0.0'; // ✅ Alternative
```

### Version Consistency Validation
- Pre-commit hooks check package.json version alignment
- Release scripts validate version format and increments
- CI/CD integration for version drift detection (future)

## Performance Considerations

- **Release Script Execution Time**: Target < 30 seconds for complete release process
- **Build Impact**: Version changes should not trigger unnecessary rebuilds
- **Runtime Performance**: Dynamic version access should have minimal overhead
- **Git History**: Clean, atomic commits for version updates to maintain clear history

## Security Considerations

- **Version Information Exposure**: Ensure version numbers don't leak sensitive information
- **Release Script Permissions**: Limit script access to necessary files and git operations
- **Automated Commits**: Use consistent, identifiable commit patterns for automated version updates
- **Tag Security**: Use annotated tags with GPG signing for production releases (future enhancement)