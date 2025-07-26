# Release Process Specification

This is the release process specification for the spec detailed in @.agent-os/specs/2025-07-26-synchronized-versioning-release/spec.md

> Created: 2025-07-26
> Version: 1.0.0

## Release Process Overview

The CoachMeld monorepo release process ensures synchronized versioning across all applications while maintaining proper git history, changelog generation, and deployment coordination.

## Pre-Release Requirements

### Version Alignment Verification
- All package.json files must have synchronized versions before release
- No uncommitted changes in the working directory
- Current branch must be `main` or designated release branch
- All tests must pass across all applications

### Feature Readiness Validation
- **Mobile App v0.9.0 Features**: Progress tracking system, GDPR compliance features, advanced meal planning
- **Admin App v0.9.0 Features**: Production deployment readiness, enhanced GDPR support, performance optimizations
- **Documentation Updates**: All roadmap phases updated to reflect v0.9.0 completion

## Release Execution Process

### 1. Pre-Release Preparation
```bash
# Verify clean working directory
git status

# Ensure on main branch
git checkout main
git pull origin main

# Run version consistency check
npm run version:check

# Validate all tests pass
npm run test:all
```

### 2. Version Update Execution
```bash
# Execute synchronized version update
npm run release:version 0.9.0

# This script performs:
# - Updates root package.json to v0.9.0
# - Updates apps/mobile/package.json to v0.9.0  
# - Updates apps/admin/package.json to v0.9.0
# - Updates any hardcoded version references
```

### 3. Changelog Generation
```bash
# Generate changelog entries for v0.9.0
npm run changelog:generate

# This creates entries in:
# - CHANGELOG.md (root level)
# - apps/mobile/CHANGELOG.md  
# - apps/admin/CHANGELOG.md
```

### 4. Documentation Updates
- Update roadmap phase completion status
- Mark v0.9.0 features as completed in roadmap.md files
- Update mission.md files to reflect new version capabilities
- Review and update any version-specific documentation

### 5. Git Operations
```bash
# Stage all version-related changes
git add .

# Create release commit
git commit -m "chore: release v0.9.0

- Synchronize versions across monorepo
- Update mobile app from v0.8.0 to v0.9.0
- Update admin app from v0.3.0 to v0.9.0  
- Update root from v1.0.0 to v0.9.0
- Generate changelogs for all applications

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Create annotated release tag
git tag -a v0.9.0 -m "Release v0.9.0: GDPR Compliance & Progress Tracking"

# Push changes and tag
git push origin main
git push origin v0.9.0
```

### 6. Release Validation
```bash
# Verify version synchronization
npm run version:verify

# Check that all apps report v0.9.0
npm run version:check:all

# Validate changelog generation
npm run changelog:validate
```

## Post-Release Activities

### GitHub Release Creation
```bash
# Create GitHub release with automated notes
gh release create v0.9.0 \
  --title "Release v0.9.0: GDPR Compliance & Progress Tracking" \
  --notes "$(cat <<'EOF'
## What's New in v0.9.0

### Mobile App Features
- ✅ Progress tracking system with weight and measurement logging
- ✅ GDPR compliance features with user data controls
- ✅ Advanced meal planning with shopping lists and prep guides
- ✅ Enhanced privacy settings and consent management

### Admin Dashboard Features  
- ✅ Production deployment readiness with optimized performance
- ✅ Enhanced GDPR compliance tools and audit trails
- ✅ Advanced user management and analytics capabilities
- ✅ Improved RAG document management system

### Platform Improvements
- ✅ Synchronized versioning across all applications
- ✅ Streamlined release management process
- ✅ Enhanced monorepo coordination and consistency

## Migration Notes
This release introduces synchronized versioning. All CoachMeld applications now share the same version number (v0.9.0) for better platform consistency.

**Full Changelog**: https://github.com/NoiseMeldOrg/coachmeld-monorepo/compare/v0.8.0...v0.9.0
EOF
)"
```

### Deployment Coordination
- **Mobile App**: Coordinate app store submissions for iOS and Android
- **Admin Dashboard**: Deploy v0.9.0 to production environment (Render.com)
- **Documentation**: Update public-facing documentation and version references

### Communication Updates
- Update marketing materials to reflect v0.9.0 capabilities
- Notify beta testers of new version availability
- Update support documentation with v0.9.0 feature descriptions

## Release Types & Versioning Strategy

### Version Increment Guidelines
- **Major (x.0.0)**: Breaking changes, major new features, architectural changes
- **Minor (0.x.0)**: New features, significant enhancements, backward compatible
- **Patch (0.0.x)**: Bug fixes, small improvements, security updates

### Special Release Considerations

#### v0.9.0 Release (Current)
- **Type**: Minor release with significant feature additions
- **Scope**: GDPR compliance, progress tracking, synchronized versioning
- **Migration**: No breaking changes, additive features only
- **Timeline**: August 2025 target

#### Future v1.0.0 Release
- **Type**: Major milestone release for market launch
- **Scope**: Production-ready, app store approved, full feature set
- **Migration**: Potential breaking changes, API finalization
- **Timeline**: September 2025 target

## Rollback Procedures

### Emergency Rollback Process
```bash
# If critical issues discovered post-release
git checkout v0.8.0  # Or last known good version
git checkout -b hotfix/v0.9.1

# Apply fixes and create patch release
npm run release:patch

# Or revert the release entirely
git revert <release-commit-hash>
git tag -d v0.9.0
git push origin --delete v0.9.0
```

### Rollback Validation
- Verify all applications return to previous stable versions
- Validate database compatibility with rolled-back version
- Test critical user flows after rollback
- Update monitoring and alerting for known issues

## Quality Gates

### Pre-Release Quality Gates
- [ ] All automated tests pass (unit, integration, e2e)
- [ ] Manual QA validation completed for critical paths
- [ ] Performance benchmarks meet or exceed previous version
- [ ] Security scan passes with no high-severity issues
- [ ] GDPR compliance features validated with test scenarios

### Post-Release Quality Gates
- [ ] Application successfully starts and serves traffic
- [ ] Key metrics (response time, error rates) within acceptable ranges
- [ ] User feedback monitoring shows no critical issues
- [ ] Deployment successfully completed across all environments

## Monitoring & Alerting

### Release Health Monitoring
- Monitor application startup times and memory usage
- Track user adoption of new v0.9.0 features
- Alert on unusual error patterns or performance degradation
- Monitor GDPR compliance workflow usage and success rates

### Success Metrics
- **Version Consistency**: 100% of applications report v0.9.0
- **Feature Adoption**: >50% of users try progress tracking within 7 days
- **GDPR Compliance**: 0 compliance violations or user complaints
- **Performance**: No regression in key performance metrics