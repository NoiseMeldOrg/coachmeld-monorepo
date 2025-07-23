# Release Process for CoachMeld Admin

This document outlines the step-by-step process for creating releases.

## Prerequisites
- Ensure all changes are committed and pushed
- Make sure you're on the master branch
- Verify all tests pass and the app builds successfully

## Release Steps

### 1. Update Version Number
Edit `package.json` to update the version:
```json
{
  "version": "0.1.0"  // Update this
}
```

### 2. Update CHANGELOG.md
Add a new section at the top with:
- Version number and date
- All changes categorized by type:
  - **Added** - New features
  - **Changed** - Changes to existing functionality
  - **Fixed** - Bug fixes
  - **Removed** - Removed features
  - **Security** - Security updates
  - **Technical** - Technical improvements

### 3. Commit Version Bump
```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to v0.1.0

- Update package.json version
- Add CHANGELOG entry for v0.1.0

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 4. Create Git Tag
```bash
git tag -a v0.1.0 -m "Release v0.1.0"
```

### 5. Push Changes and Tag
```bash
git push origin master
git push origin v0.1.0
```

### 6. Create GitHub Release
Using GitHub CLI:
```bash
gh release create v0.1.0 \
  --title "v0.1.0 - Initial Release" \
  --notes-file RELEASE_NOTES.md \
  --latest
```

Or manually:
1. Go to GitHub repository
2. Click "Releases" → "Create a new release"
3. Choose the tag `v0.1.0`
4. Title: "v0.1.0 - Initial Release"
5. Copy the CHANGELOG section as release notes
6. Check "Set as the latest release"
7. Click "Publish release"

## Version Numbering Guidelines

Follow Semantic Versioning (SemVer):
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

## Release Checklist

- [ ] All PRs for this release are merged
- [ ] Version number updated in package.json
- [ ] CHANGELOG.md updated with all changes
- [ ] No uncommitted changes (`git status`)
- [ ] On master branch (`git branch`)
- [ ] Create and push tag
- [ ] Create GitHub release
- [ ] Verify release appears correctly on GitHub

## Example Release Notes Format

```markdown
## 🎉 CoachMeld Admin v0.1.0 - Initial Release

This is the first release of the CoachMeld Admin Dashboard, providing comprehensive tools for managing the CoachMeld RAG system.

### ✨ Highlights
- Complete RAG document management system
- YouTube transcript processing
- User management with test user creation
- Analytics dashboard
- Database tools and migration runner
- Knowledge base management
- API documentation

### 🚀 Getting Started
See the [README](https://github.com/NoiseMeldOrg/coach-meld-admin#getting-started) for setup instructions.

### 📋 Full Changelog
See [CHANGELOG.md](https://github.com/NoiseMeldOrg/coach-meld-admin/blob/master/CHANGELOG.md) for detailed changes.
```