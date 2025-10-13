# Setup & Deployment Checklist

Use this checklist to ensure proper setup and deployment of the SFMC Voice Instructor.

## Initial Setup

### Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] pnpm 8+ installed (`pnpm --version`)
- [ ] OpenAI API key obtained (with Realtime API access)
- [ ] Git installed (optional, for version control)

### Installation
- [ ] Clone/download project to local machine
- [ ] Navigate to `mvp-voice-agent` directory
- [ ] Run `pnpm install` (installs all dependencies)
- [ ] Verify no installation errors in console

### Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Add `OPENAI_API_KEY` to `.env` file
- [ ] Verify API key format starts with `sk-proj-`
- [ ] (Optional) Set custom `PORT` if 3001 is in use
- [ ] (Optional) Set `ALLOWED_ORIGINS` for CORS

### Build
- [ ] Run `pnpm --filter shared build`
- [ ] Verify `packages/shared/dist` directory created
- [ ] No TypeScript compilation errors

## Development Testing

### Server
- [ ] Run `pnpm --filter server dev` in terminal
- [ ] Server starts on port 3001 (or custom port)
- [ ] See "Server running" message
- [ ] API key is loaded and shown (first 10 chars)
- [ ] Test health endpoint: `curl http://localhost:3001/health`
- [ ] Test token endpoint: `curl -X POST http://localhost:3001/api/token -H "Content-Type: application/json" -d '{"voice":"alloy","language":"en"}'`

### Web App
- [ ] Run `pnpm --filter web dev` in separate terminal
- [ ] Vite dev server starts on port 5173
- [ ] No console errors in terminal
- [ ] Open http://localhost:5173 in browser
- [ ] Page loads with dark background
- [ ] Particle animation visible (idle mode)
- [ ] Top bar shows language/voice controls
- [ ] Status bar shows "Disconnected"

### Connection Test
- [ ] Click "Connect" button
- [ ] Browser prompts for microphone access
- [ ] Grant microphone permissions
- [ ] Status changes to "Connecting..."
- [ ] Status changes to "Connected" (within 2-3 seconds)
- [ ] No errors in browser console
- [ ] No errors in server terminal

### Audio Test
- [ ] Speak into microphone
- [ ] Status bar shows "You're speaking"
- [ ] Particles animate (yellow pulses)
- [ ] FPS remains above 50
- [ ] Latency shows <25ms

### AI Interaction Test
- [ ] Say: "What is Journey Builder?"
- [ ] Assistant begins speaking within 1-2 seconds
- [ ] Status bar shows "Assistant speaking"
- [ ] Particles animate (flowing waves)
- [ ] Audio plays clearly through speakers/headphones
- [ ] Can interrupt by speaking (barge-in)

### UI Features Test
- [ ] Click language toggle (EN/FR)
- [ ] Next AI response is in selected language
- [ ] Click voice dropdown
- [ ] Select different voice
- [ ] Next AI response uses new voice
- [ ] Click settings gear icon
- [ ] Settings panel opens with transcript
- [ ] Transcript shows conversation history
- [ ] Click gear icon again to close panel
- [ ] Click "Mute Microphone" button
- [ ] Microphone indicator grays out
- [ ] Click "Disconnect" button
- [ ] Status returns to "Disconnected"
- [ ] Particles return to idle mode

## Production Build

### Pre-Build
- [ ] All development tests pass
- [ ] Run `pnpm lint` (no errors)
- [ ] Run `pnpm test` (all tests pass)
- [ ] Update environment variables for production
- [ ] Review `ALLOWED_ORIGINS` in `.env`

### Build Process
- [ ] Run `pnpm build` from root
- [ ] Shared package builds successfully
- [ ] Server builds to `apps/server/dist`
- [ ] Web builds to `apps/web/dist`
- [ ] No build errors or warnings

### Local Production Test
- [ ] Run `pnpm --filter web preview`
- [ ] Preview server starts (usually port 4173)
- [ ] Open preview URL in browser
- [ ] Test full connection and interaction flow
- [ ] Verify optimized bundle loads quickly
- [ ] Check browser console for errors
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

## Deployment (Netlify)

### Pre-Deployment
- [ ] Netlify account created
- [ ] Netlify CLI installed (`npm install -g netlify-cli`)
- [ ] Logged in to Netlify CLI (`netlify login`)
- [ ] Review `netlify.toml` configuration

### Deploy
- [ ] Run `netlify init` (first time only)
- [ ] Link to existing site or create new
- [ ] Set build command: `pnpm build`
- [ ] Set publish directory: `apps/web/dist`
- [ ] Run `netlify deploy --prod`
- [ ] Deployment completes successfully
- [ ] Note deployed URL

### Post-Deployment Configuration
- [ ] Open Netlify dashboard
- [ ] Go to Site Settings > Environment Variables
- [ ] Add `OPENAI_API_KEY` (value from .env)
- [ ] Add `NODE_ENV=production`
- [ ] Add `ALLOWED_ORIGINS` (your domain)
- [ ] Redeploy: `netlify deploy --prod`

### Production Testing
- [ ] Open deployed URL
- [ ] Test full connection flow
- [ ] Test on mobile device
- [ ] Test on different networks
- [ ] Verify HTTPS is active
- [ ] Check for mixed content warnings
- [ ] Test PWA installation (Add to Home Screen)

## Deployment (Vercel)

### Pre-Deployment
- [ ] Vercel account created
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Logged in to Vercel CLI (`vercel login`)
- [ ] Review `vercel.json` configuration

### Deploy
- [ ] Run `vercel` from root directory
- [ ] Follow prompts to link project
- [ ] Run `vercel --prod` for production
- [ ] Deployment completes successfully
- [ ] Note deployed URL

### Post-Deployment Configuration
- [ ] Open Vercel dashboard
- [ ] Go to Project Settings > Environment Variables
- [ ] Add `OPENAI_API_KEY` (value from .env)
- [ ] Set for Production environment
- [ ] Redeploy from dashboard or CLI

### Production Testing
- [ ] Same as Netlify production testing checklist

## Monitoring Setup

### Server Monitoring
- [ ] Set up health check monitoring
- [ ] Configure alerts for downtime
- [ ] Monitor API error rates
- [ ] Track token generation failures

### Client Monitoring
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Monitor WebRTC connection success rate
- [ ] Track FPS metrics
- [ ] Monitor audio latency

### Performance Monitoring
- [ ] Set up Core Web Vitals tracking
- [ ] Monitor page load times
- [ ] Track bundle sizes
- [ ] Monitor API response times

## Troubleshooting Checklist

### Connection Issues
- [ ] Verify OPENAI_API_KEY is set correctly
- [ ] Check server is running and accessible
- [ ] Verify firewall/network allows WebRTC
- [ ] Check browser console for specific errors
- [ ] Test with different network/VPN disabled

### Audio Issues
- [ ] Verify microphone permissions granted
- [ ] Check microphone works in other apps
- [ ] Test with headphones to eliminate echo
- [ ] Verify speaker/audio output is working
- [ ] Check browser audio settings

### Performance Issues
- [ ] Check FPS in status bar (target 50+)
- [ ] Monitor particle count (should adapt)
- [ ] Close other GPU-intensive apps
- [ ] Try reducing initial particle count
- [ ] Check browser task manager for resource usage

### Build Issues
- [ ] Clear `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
- [ ] Clear build caches: `pnpm clean`
- [ ] Verify Node.js and pnpm versions
- [ ] Check for TypeScript errors: `pnpm --filter web tsc --noEmit`

## Maintenance Checklist

### Weekly
- [ ] Check server logs for errors
- [ ] Monitor OpenAI API usage/costs
- [ ] Review performance metrics
- [ ] Check for user-reported issues

### Monthly
- [ ] Update dependencies: `pnpm update`
- [ ] Run security audit: `pnpm audit`
- [ ] Review and optimize performance
- [ ] Test on latest browser versions

### Quarterly
- [ ] Review OpenAI API updates
- [ ] Update system prompts if needed
- [ ] Add new voices if available
- [ ] Consider feature enhancements

## Documentation Checklist

### For Users
- [ ] README.md is up to date
- [ ] QUICKSTART.md tested and verified
- [ ] Example questions documented
- [ ] Troubleshooting section complete

### For Developers
- [ ] ARCHITECTURE.md reflects current design
- [ ] Code comments are clear and helpful
- [ ] API endpoints documented
- [ ] Environment variables documented

### For Operations
- [ ] RUNBOOK.md has current procedures
- [ ] Deployment steps tested
- [ ] Monitoring setup documented
- [ ] Backup/recovery procedures defined

## Sign-Off

### Development Complete
- [ ] All features implemented
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code reviewed (if team project)

### Ready for Staging
- [ ] Production build successful
- [ ] Local preview tested thoroughly
- [ ] Environment variables configured
- [ ] SSL certificate ready (for self-host)

### Ready for Production
- [ ] Deployed to staging/preview
- [ ] Staging tested end-to-end
- [ ] Performance benchmarks met
- [ ] Security review complete
- [ ] Monitoring configured
- [ ] Team notified

### Production Live
- [ ] Domain pointed to deployment
- [ ] DNS propagated
- [ ] HTTPS working
- [ ] All features tested in production
- [ ] Monitoring active and alerting
- [ ] Documentation published
- [ ] Stakeholders notified

---

## Quick Reference

**Development:**
```bash
pnpm install
cp .env.example .env
# Add OPENAI_API_KEY to .env
pnpm --filter shared build
pnpm dev
```

**Production:**
```bash
pnpm build
netlify deploy --prod
# or
vercel --prod
```

**Testing:**
- Health: http://localhost:3001/health
- Web: http://localhost:5173
- Token: `curl -X POST http://localhost:3001/api/token -H "Content-Type: application/json" -d '{"voice":"alloy","language":"en"}'`

**Monitoring:**
- FPS: Status bar (target 50+)
- Latency: Status bar (target <25ms)
- Particles: Status bar (32k-100k adaptive)
