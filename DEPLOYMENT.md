# Deployment Guide

This guide covers deploying the SFMC Voice Instructor app to production using Netlify.

## Prerequisites

1. **OpenAI API Key**: Get one from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Netlify Account**: Sign up at [netlify.com](https://netlify.com) (free tier is sufficient)
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Security: Protecting Your API Key

### ⚠️ IMPORTANT: Never Commit API Keys

The OpenAI API key should **NEVER** be committed to your repository. This project is configured to keep your key safe:

1. `.gitignore` includes `.env` files - they won't be committed
2. Use `.env.example` as a template (no real keys)
3. Set environment variables in Netlify's dashboard (secure storage)

### If You Accidentally Committed Your Key

If you accidentally committed your OpenAI API key to Git:

1. **Immediately revoke it** at [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Generate a new API key
3. Remove it from Git history:
   ```bash
   # Remove .env from Git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all

   # Force push (warning: destructive)
   git push origin --force --all
   ```
4. Add the new key to Netlify environment variables (see below)

## Deployment Methods

### Option 1: Netlify Drop (Drag & Drop) - Easiest

This is the simplest method for quick deployments.

#### Step 1: Build Locally

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build
```

This creates optimized builds:
- Frontend: `apps/web/dist/`
- Backend function: `netlify/functions/server.ts`

#### Step 2: Prepare Deployment Package

The build creates these key directories:
```
mvp-voice-agent/
├── apps/web/dist/          # Built frontend (HTML, CSS, JS)
├── netlify/functions/       # Serverless functions
└── netlify.toml            # Netlify configuration
```

#### Step 3: Deploy to Netlify Drop

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop the **entire project folder** (not just `dist/`)
3. Wait for deployment to complete
4. You'll get a temporary URL like `https://random-name.netlify.app`

#### Step 4: Configure Environment Variables

**Critical: This must be done immediately after deployment**

1. Go to your site in Netlify dashboard
2. Navigate to: **Site settings** → **Environment variables**
3. Click **Add a variable**
4. Add:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-proj-...`)
   - **Scopes**: Select "Production" and "Deploy Previews"
5. Click **Save**

**Important**: After adding environment variables, you must **redeploy**:
- Go to **Deploys** tab
- Click **Trigger deploy** → **Deploy site**

#### Step 5: Test Your Deployment

1. Visit your Netlify URL
2. Click the **Connect** button
3. Grant microphone permissions
4. Speak to test the voice agent
5. Check that it responds as an SFMC instructor

If you see errors about "OpenAI API key not configured", you need to set the environment variable (Step 4).

### Option 2: Netlify CLI - For Developers

Install Netlify CLI:
```bash
npm install -g netlify-cli
```

#### Deploy:

```bash
# Login to Netlify
netlify login

# Build
pnpm build

# Deploy to preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

#### Set environment variables via CLI:

```bash
netlify env:set OPENAI_API_KEY "sk-proj-YOUR-KEY-HERE"
```

### Option 3: Git-Based Continuous Deployment - Most Robust

This is the recommended approach for production:

1. **Push to Git**: Commit and push your code to GitHub/GitLab/Bitbucket
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click **Add new site** → **Import an existing project**
   - Choose your Git provider and repository
   - Netlify auto-detects the configuration from `netlify.toml`

3. **Configure Build Settings** (should be auto-filled):
   - **Build command**: `pnpm install && pnpm build`
   - **Publish directory**: `apps/web/dist`
   - **Functions directory**: `netlify/functions`

4. **Set Environment Variables**:
   - Before deploying, go to **Site settings** → **Environment variables**
   - Add `OPENAI_API_KEY` with your key

5. **Deploy**:
   - Click **Deploy site**
   - Every git push will now trigger automatic deployments

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | ✅ Yes | Your OpenAI API key | `sk-proj-...` |
| `NODE_VERSION` | No | Node.js version (auto-set) | `18` |
| `PNPM_VERSION` | No | pnpm version (auto-set) | `8.15.0` |

## Custom Domain (Optional)

To use your own domain:

1. In Netlify dashboard, go to **Domain settings**
2. Click **Add custom domain**
3. Follow the instructions to configure DNS
4. Netlify provides free SSL certificates automatically

## Monitoring & Debugging

### Check Function Logs

1. Go to **Functions** tab in Netlify dashboard
2. Click on the `server` function
3. View logs to see API calls and errors

### Common Issues

**Issue**: "OpenAI API key not configured"
- **Solution**: Set `OPENAI_API_KEY` environment variable and redeploy

**Issue**: "Failed to get token: 401"
- **Solution**: Your API key is invalid or expired. Generate a new one

**Issue**: "Too many requests"
- **Solution**: Rate limit reached (60 requests/minute per IP). Wait and try again

**Issue**: CORS errors
- **Solution**: The app uses same-origin requests, CORS shouldn't be an issue. Check browser console for details

**Issue**: Microphone not working
- **Solution**: Ensure you're using HTTPS (Netlify provides this automatically). HTTP won't allow microphone access

## Cost Considerations

### Netlify Costs
- **Free tier**: 100GB bandwidth, 300 build minutes/month
- **Serverless functions**: 125k requests/month free
- For most use cases, the free tier is sufficient

### OpenAI Costs
The app uses:
- **GPT Realtime API**: ~$0.06 per minute of audio input, ~$0.24 per minute of audio output
- **Whisper API**: $0.006 per minute for transcription (minimal)

Example: 10 minutes of conversation ≈ $3.00

Monitor usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)

## Security Best Practices

1. ✅ **Never commit `.env` files** - Already configured in `.gitignore`
2. ✅ **Use environment variables** - Set in Netlify dashboard
3. ✅ **Rate limiting enabled** - 60 requests/minute per IP
4. ✅ **Security headers** - Configured in `netlify.toml`
5. ✅ **API key stays server-side** - Never exposed to browser
6. 🔄 **Rotate keys regularly** - Generate new keys periodically
7. 🔄 **Set up usage alerts** - Configure in OpenAI dashboard

## Updating the Deployment

### For Netlify Drop:
1. Make changes locally
2. Run `pnpm build`
3. Drag and drop to [app.netlify.com/drop](https://app.netlify.com/drop)

### For Git-Based Deployment:
1. Make changes locally
2. Commit and push to Git
3. Netlify automatically rebuilds and deploys

## Rollback

If a deployment has issues:

1. Go to **Deploys** tab in Netlify
2. Find a previous working deployment
3. Click the **...** menu → **Publish deploy**

## Support

- **OpenAI API Issues**: [OpenAI Help Center](https://help.openai.com/)
- **Netlify Issues**: [Netlify Support](https://www.netlify.com/support/)
- **App Issues**: Check the repository issues page

## Checklist Before Going Live

- [ ] OpenAI API key is set in Netlify environment variables
- [ ] API key is NOT in any committed files
- [ ] Test the voice connection on the deployed URL
- [ ] Verify SFMC instructor responses are working
- [ ] Check microphone permissions work (requires HTTPS)
- [ ] Set up usage alerts in OpenAI dashboard
- [ ] (Optional) Configure custom domain
- [ ] (Optional) Set up monitoring/analytics

## Next Steps

After deployment:
1. Test thoroughly with both English and French
2. Monitor OpenAI usage and costs
3. Gather user feedback
4. Consider adding authentication if sharing publicly
5. Set up error tracking (e.g., Sentry)
