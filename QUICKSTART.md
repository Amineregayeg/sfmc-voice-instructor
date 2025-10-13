# Quick Start Guide

Get the SFMC Voice Instructor running in 5 minutes.

## Prerequisites

Ensure you have:
- Node.js 18+ installed
- pnpm 8+ installed (`npm install -g pnpm`)
- OpenAI API key with Realtime API access

## Setup Steps

### 1. Clone and Install

```bash
cd mvp-voice-agent
pnpm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-proj-your-key-here
```

### 3. Build Shared Package

```bash
pnpm --filter shared build
```

### 4. Start Development Server

```bash
pnpm dev
```

This starts:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## First Use

1. Open http://localhost:5173 in your browser
2. Click the glowing "Connect" button
3. Allow microphone access when prompted
4. Start speaking!

### Example Questions

- "What is Journey Builder in Salesforce Marketing Cloud?"
- "How do I create a data extension?"
- "Explain the difference between AMPscript and SSJS"
- "What are best practices for email deliverability?"

### Features to Try

- **Language Toggle**: Switch between English and French (top bar)
- **Voice Selection**: Choose from 4 different voices (top bar)
- **Settings Panel**: Click gear icon to view transcript
- **Barge-in**: Start speaking while assistant is talking to interrupt
- **Mic Mute**: Toggle microphone on/off (appears after connecting)

## Troubleshooting

### "Connection failed"

- Check that `.env` contains valid `OPENAI_API_KEY`
- Verify server is running: `pnpm --filter server dev`
- Check server logs for errors

### "No microphone access"

- Grant permissions in browser (click lock icon in address bar)
- Ensure you're using HTTPS or localhost
- Try different browser

### Low performance

- Close other GPU-intensive applications
- Particle count will auto-adjust for performance
- Check FPS in status bar (should be 50+)

### Audio echo

- Use headphones
- Check echo cancellation is enabled in browser

## Production Build

```bash
# Build all packages
pnpm build

# Test production build locally
pnpm preview
```

## Deploy

See `README.md` for deployment instructions (Netlify/Vercel).

## Learn More

- Full documentation: `README.md`
- Operational guide: `RUNBOOK.md`
- Architecture: `README.md#architecture`

## Support

Check:
1. Browser console for errors
2. Server logs: `pnpm --filter server dev`
3. Network tab for API failures

Common fixes:
- Restart server and web app
- Clear browser cache
- Try incognito/private mode
- Check firewall/VPN settings
