# Contributing to CoachMeld

Thank you for your interest in contributing to CoachMeld! This document provides guidelines and workflows for contributing to the project.

## Development Workflow

We use a pull request-based workflow to ensure code quality and maintain a clear history of changes.

### 1. Branch Naming Conventions

Use descriptive branch names that indicate the type and scope of changes:

- **Features**: `feature/description` (e.g., `feature/progress-tracking`)
- **Bug Fixes**: `fix/description` (e.g., `fix/coach-selection-crash`)
- **Documentation**: `docs/description` (e.g., `docs/api-integration-guide`)
- **Refactoring**: `refactor/description` (e.g., `refactor/context-providers`)
- **Performance**: `perf/description` (e.g., `perf/optimize-chat-rendering`)
- **Tests**: `test/description` (e.g., `test/add-coach-context-tests`)

### 2. Creating a Pull Request

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, self-documenting code
   - Follow the existing code style and conventions
   - Keep commits atomic and focused

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: Add progress tracking screen with weight chart"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting, etc.)
   - `refactor:` Code refactoring
   - `perf:` Performance improvements
   - `test:` Test additions or changes
   - `chore:` Build process or auxiliary tool changes

4. **Push to GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**
   - Use GitHub CLI for consistent formatting:
   ```bash
   gh pr create --title "Your descriptive title" --body "$(cat <<'EOF'
   ## Summary
   - Brief overview of changes
   - What was fixed/added/improved
   
   ## Key Changes
   
   ### Component/Feature Name
   - 🎨 UI/styling changes
   - 🔧 Technical improvements
   - 🐛 Bug fixes
   
   ### Functionality Preserved
   - ✅ List existing features that still work
   - ✅ Important integrations maintained
   
   ## Test plan
   - [ ] Test on Android with Expo Go
   - [ ] Verify specific functionality
   - [ ] Check edge cases
   
   🤖 Generated with [Claude Code](https://claude.ai/code)
   EOF
   )"
   ```
   - Or use GitHub web interface with the same structure
   - Link any related issues

### 3. PR Review Process

Even when working solo, follow these practices:

1. **Self-Review**: Review your own changes in the GitHub diff view
2. **Check CI Status**: Ensure all automated checks pass
3. **Test Thoroughly**: Verify changes work on all platforms
4. **Update Documentation**: Include any necessary documentation updates
5. **Update CHANGELOG**: Add your changes to CHANGELOG.md if significant

### 4. Merging

- Use "Squash and merge" for feature branches to keep history clean
- Delete the branch after merging
- Pull the latest master branch locally:
  ```bash
  git checkout master
  git pull origin master
  ```

## Testing Guidelines

Before submitting a PR:

1. **Test on Multiple Platforms**
   ```bash
   # Test on Android
   npx expo start --tunnel
   
   # Test on iOS (if available)
   npx expo start --tunnel
   
   # Test on Web
   npm run web
   ```

2. **Check for TypeScript Errors**
   ```bash
   npx tsc --noEmit
   ```

3. **Review Console Output**
   - Remove unnecessary console.log statements
   - Ensure no errors or warnings appear

## Code Style Guidelines

1. **TypeScript**
   - Use explicit types where beneficial
   - Avoid `any` types unless absolutely necessary
   - Use interfaces for object shapes

2. **React Native**
   - Use functional components with hooks
   - Keep components focused and single-purpose
   - Extract reusable logic into custom hooks

3. **Styling**
   - Use StyleSheet.create() for performance
   - Follow the existing theme system
   - Ensure dark/light mode compatibility

4. **File Organization**
   - Place components in `src/components/`
   - Place screens in `src/screens/`
   - Keep related files together

## Commit Message Examples

```bash
# Simple commits
git commit -m "feat: Add biometric authentication support"
git commit -m "fix: Resolve crash when switching coaches rapidly"

# Detailed commits with description
git commit -m "$(cat <<'EOF'
feat: restore beautiful coach tile styling from earlier version

- Replace CoachSelector with custom coach tile layout
- Add working disclaimer banner at top of home screen
- Restore "Your Diet Coach" section with "Change Diet" link
- Fix compact coach cards to be smaller and cleaner (160px width)
- Position FREE/PRO badges correctly (FREE on top-left, PRO on top-right)
- Reduce icon sizes and padding for more compact design
- Keep rotated steak icon for carnivore coaches with proper sizing
- Add medical disclaimer modal functionality

This restores the perfect styling from the earlier version while keeping all functional improvements like Gemini integration, RAG system, and copy functionality.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Questions or Issues?

If you have questions about the contribution process:

1. Check existing issues and PRs for similar topics
2. Open a new issue for discussion
3. Reference this guide in your PRs

## GitHub Settings Recommendations

For repository maintainers, consider enabling these branch protection rules for `master`:

1. **Require pull request reviews before merging**
   - You can review your own PRs when working solo
   
2. **Require status checks to pass before merging**
   - Ensures CI checks complete successfully
   
3. **Require branches to be up to date before merging**
   - Prevents merge conflicts
   
4. **Include administrators**
   - Applies rules even to admin accounts

### Repository Setup with GitHub Team

This repository is hosted in a GitHub Team organization to enable full branch protection on private repositories. This ensures:
- All changes must go through pull requests
- Direct pushes to master are blocked
- CI/CD checks run on every PR
- Professional development workflow is enforced

### Testing the PR Workflow

To verify branch protection is working:
```bash
# This should fail with protection enabled:
echo "test" >> test.txt && git add test.txt && git commit -m "test" && git push origin master

# Clean up if needed:
git reset --hard HEAD~1 && rm test.txt
```

### Working with Claude Code

Claude Code (AI assistant) helps with:
- Creating feature branches and commits
- Pushing to remote branches
- Creating PRs via GitHub CLI (`gh pr create`) with structured formatting
- Writing detailed commit messages and PR descriptions
- Local development and testing
- Following the documented PR structure with emojis and sections

The AI cannot directly access GitHub's web interface, so PR reviews and merges must be done manually on GitHub.

### PR Body Best Practices

1. **Use Emojis Sparingly but Effectively**
   - ✨ New features
   - 🐛 Bug fixes
   - 🎨 UI/styling changes
   - 📏 Size/dimension changes
   - ✅ Preserved functionality
   - 🤖 AI-generated attribution

2. **Structure Sections Clearly**
   - Summary: High-level overview
   - Key Changes: Detailed breakdown by component/area
   - Test Plan: Specific, actionable test steps

3. **Include Attribution**
   - Always end PRs with Claude Code attribution
   - Use the robot emoji 🤖 for AI-generated content

Thank you for contributing to CoachMeld! 🎯