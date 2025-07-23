# Testing Setup for CoachMeld

## Quick Reference - Payment Testing

### Stripe Test Cards
- **Success**: `4242 4242 4242 4242`
- **3D Secure**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Use any future expiry (e.g., 12/34) and any 3-digit CVC. See [Stripe Testing Guide](STRIPE_TESTING_GUIDE.md) for comprehensive scenarios.

## Android Testing via Expo Tunnel

### The Setup
- **Code Editing**: Cursor with WSL terminal
- **Expo Server**: Separate Ubuntu WSL terminal (outside Cursor)
- **Testing Device**: Android phone with Expo Go app

### Why This Setup?
- Cursor's integrated terminal doesn't display QR codes properly
- `--tunnel` flag bypasses local network issues (firewall, WSL networking)
- Instant testing without building APKs

### Step-by-Step Process

#### 1. Start Expo in External Terminal
```bash
# In Ubuntu WSL terminal (NOT in Cursor)
cd /home/intro/coach-meld-test/CoachMeld
npx expo start --tunnel -c

# The -c flag clears the cache to ensure latest changes are loaded
```

#### 2. Wait for Tunnel
- Look for: "Metro waiting on exp://..."
- Look for: QR code displayed in terminal

#### 3. Connect Phone
- Open Expo Go app on Android
- Scan the QR code
- App loads directly on phone

#### 4. Make Changes in Cursor
- Edit code in Cursor as normal
- Save files
- Phone will auto-reload (Fast Refresh)

### Important Notes

#### ✅ Advantages:
- **No build queue**: Instant testing
- **Live reload**: See changes immediately
- **Full app testing**: Including Supabase, contexts, navigation
- **Debug logs**: See console.log in terminal

#### ⚠️ Limitations:
- **Requires internet**: Tunnel routes through Cloudflare
- **Slightly slower**: ~1-2 second delay vs local
- **Expo Go limitations**: Some native features unavailable

### Testing Workflow

1. **Terminal 1 (Ubuntu WSL - External)**:
   ```bash
   npx expo start --tunnel
   # Leave this running
   ```

2. **Terminal 2 (Cursor WSL)**:
   ```bash
   # Make code changes
   # Run git commands
   # Check logs with: npx expo start --tunnel
   ```

3. **Phone**:
   - Make code changes in Cursor
   - **Close Expo Go app completely** (swipe up and remove from recent apps)
   - Re-open Expo Go
   - Scan QR code again
   - App loads with new changes

**Note**: Hot reload doesn't always work reliably. Full app restart ensures fresh code.

### Ensuring Changes Are Reflected

#### Method 1: Standard Cache Clear (Recommended)
```bash
# Always use the -c flag when starting
npx expo start --tunnel -c
```

#### Method 2: Force Complete Refresh
If changes still don't appear:
```bash
# 1. Stop current expo process (Ctrl+C)
# 2. Clear all caches and restart
npx expo start --tunnel -c --clear
```

#### Method 3: Nuclear Option
For stubborn cache issues:
```bash
# 1. Stop expo (Ctrl+C)
# 2. Clear Metro bundler cache
rm -rf .expo
npx expo start --tunnel -c --clear

# 3. On Android phone:
# - Settings > Apps > Expo Go > Storage > Clear Cache
# - Force stop the app
# - Reopen and scan QR code
```

### Troubleshooting

#### "Tunnel URL not found"
- Wait 10-15 seconds for tunnel to establish
- Check internet connection

#### "Network response timed out"
- Restart Expo server
- Try: `npx expo start --clear --tunnel`

#### Changes not appearing
- Check if Fast Refresh is enabled (shake device → Fast Refresh)
- Manually reload: Shake → Reload
- If still not working:
  1. Kill the Metro bundler (Ctrl+C)
  2. Run: `npx expo start --tunnel -c --clear`
  3. Force close Expo Go on phone
  4. Clear Expo Go cache (Android: Settings > Apps > Expo Go > Clear Cache)
  5. Reopen and scan QR code

### Quick Commands

```bash
# Standard start with cache clear (ALWAYS USE THIS)
npx expo start --tunnel -c

# Force complete refresh if needed
npx expo start --tunnel -c --clear

# See all options
npx expo start --help

# Force specific port
npx expo start --tunnel -c --port 19000
```

### For Production Testing

When you need to test production builds:
```bash
# Still use EAS for final APK
npx eas build --platform android --profile preview

# But day-to-day development: use tunnel with cache clear
npx expo start --tunnel -c
```

## Summary

**Development**: Edit in Cursor → Test via tunnel → Instant feedback
**Production**: Build APK with EAS → Test final version

This setup gives you the best of both worlds:
- Fast development cycle (tunnel)
- Production testing when needed (EAS)