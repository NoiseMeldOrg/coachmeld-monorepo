# Deployment Guide for Render.com

This guide walks you through deploying the CoachMeld Admin Dashboard to Render.com with automatic deployments from GitHub.

## Prerequisites

1. A [Render.com](https://render.com) account
2. Your Supabase project credentials
3. Google Gemini API key
4. (Optional) YouTube API key for transcript processing

## Step 1: Prepare Your Repository

Ensure your repository has the following files (already included):
- `render.yaml` - Render configuration
- `.env.production.example` - Example production environment variables
- `next.config.js` - Configured for production deployment

## Step 2: Create a New Web Service on Render

### Option A: Using render.yaml (Recommended)

1. Go to your [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Select the `coach-meld-admin` repository
5. Render will automatically detect the `render.yaml` file
6. Click "Apply" to create the service

### Option B: Manual Setup

1. Go to your [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `coach-meld-admin`
   - **Region**: Choose closest to your users
   - **Branch**: `master` (or `main`)
   - **Runtime**: Node
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Starter ($7/month) or Standard for production

## Step 3: Configure Environment Variables

In the Render dashboard for your service:

1. Go to "Environment" → "Environment Variables"
2. Add the following variables:

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
```

### Optional Variables

```bash
# YouTube API (optional)
YOUTUBE_API_KEY=your-youtube-api-key
```

## Step 4: Configure Auto-Deploy

1. In your service settings, go to "Settings"
2. Under "Build & Deploy", ensure:
   - **Auto-Deploy**: Yes
   - **Branch**: master (or main)
3. This ensures automatic deployment on every push to master

## Step 5: Set Up Health Checks

1. In "Settings" → "Health & Alerts"
2. Set Health Check Path to: `/api/health`
3. This endpoint verifies database connectivity

## Step 6: Configure Custom Domain (Optional)

1. Go to "Settings" → "Custom Domains"
2. Add your domain
3. Follow Render's instructions to update DNS records

## Step 7: First Deployment

1. Trigger a manual deploy or push to master
2. Monitor the deploy logs in the Render dashboard
3. Once deployed, visit `https://your-service.onrender.com`

## Important Notes

### Database Migrations

Before deploying new versions with database changes:
1. Run migrations in your Supabase dashboard
2. Test thoroughly in a staging environment
3. Then deploy to production

### Environment-Specific Configuration

- The app automatically uses production settings when `NODE_ENV=production`
- Ensure all API keys are kept secret and never committed to git
- Use Render's environment variable groups for managing multiple environments

### Monitoring

1. Set up alerts in Render for:
   - Failed deploys
   - Service downtime
   - High resource usage

2. Monitor logs via:
   - Render dashboard logs viewer
   - External logging service integration

### Scaling

When ready to scale:
1. Upgrade to Standard plan for better performance
2. Enable auto-scaling in service settings
3. Consider adding a CDN for static assets

## Troubleshooting

### Build Failures

1. Check build logs in Render dashboard
2. Ensure all dependencies are in `package.json`
3. Verify Node version compatibility

### Runtime Errors

1. Check service logs
2. Verify all environment variables are set
3. Test database connectivity with health endpoint

### Slow Performance

1. Enable caching headers for static assets
2. Optimize database queries
3. Consider upgrading Render plan

## Security Checklist

- [ ] All sensitive environment variables are set in Render, not in code
- [ ] Service role key is only used server-side
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented
- [ ] SSL is enabled (automatic on Render)

## Support

- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)