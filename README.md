# SFMC Voice Instructor

A production-ready AI-powered voice agent for Salesforce Marketing Cloud (SFMC) instruction, featuring real-time 3D particle visualization and WebRTC-based voice interaction with OpenAI's Realtime API.

## Features

- **WebRTC Realtime API**: Low-latency speech-to-speech interaction using OpenAI's `gpt-realtime-2025-08-28`
- **Real-time Audio Analysis**: AudioWorklet-based processing for < 25ms latency
- **3D Particle Visualization**: GPU-accelerated particle system (65k+ particles at 60 FPS)
  - User speaking: Warm yellow pulses synced to voice amplitude and pitch
  - AI speaking: Flowing orbital animations following assistant's speech
  - Idle: Gentle breathing animation
- **Bilingual Support**: English and French UI and instruction
- **Voice Selection**: 4 voices (2 male, 2 female)
- **SFMC Domain Expert**: Specialized system prompts for Marketing Cloud instruction
- **PWA Ready**: Installable progressive web app with offline capabilities
- **Barge-in Support**: Interrupt assistant at any time

## Architecture

```
mvp-voice-agent/
├── apps/
│   ├── web/           # Vite + React + TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/    # UI components
│   │   │   ├── lib/
│   │   │   │   ├── audio/     # AudioWorklet analyzers
│   │   │   │   ├── particles/ # Three.js particle system
│   │   │   │   └── realtime/  # WebRTC client
│   │   │   ├── store/         # Zustand state management
│   │   │   └── styles/        # Tailwind CSS
│   │   └── public/
│   │       └── audio-analyzer.worklet.js
│   └── server/        # Express API for token generation
│       └── src/server.ts
└── packages/
    └── shared/        # Shared types, constants, prompts
        └── src/
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- OpenAI API key with Realtime API access

## Setup

### 1. Install Dependencies

```bash
cd mvp-voice-agent
pnpm install
```

### 2. Configure Environment

Create `.env` in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-proj-...
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Build Shared Package

```bash
pnpm --filter shared build
```

## Development

Run both server and web app concurrently:

```bash
pnpm dev
```

Or run individually:

```bash
# Terminal 1: Server
pnpm --filter server dev

# Terminal 2: Web app
pnpm --filter web dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Production Build

```bash
pnpm build
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm --filter web test

# Lint
pnpm lint
```

## Deployment

**📖 See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.**

### Quick Start - Netlify Drop

1. Build locally:
   ```bash
   pnpm build
   ```

2. Drag and drop the entire project folder to [app.netlify.com/drop](https://app.netlify.com/drop)

3. **Important**: Set environment variable in Netlify dashboard:
   - Navigate to: **Site settings** → **Environment variables**
   - Add `OPENAI_API_KEY` with your OpenAI API key
   - Redeploy after adding the variable

4. Test your deployment

**⚠️ Security**: Never commit your `.env` file. The API key should only exist in:
- Your local `.env` file (not committed to Git)
- Netlify's environment variables (secure storage)

For detailed instructions including Git-based deployment, CLI deployment, troubleshooting, and security best practices, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Usage

1. **Connect**: Click the glowing "Connect" button
2. **Grant Permissions**: Allow microphone access when prompted
3. **Start Speaking**: Ask questions about Salesforce Marketing Cloud
   - "Explain what Journey Builder is"
   - "How do I create a data extension?"
   - "What's the difference between AMPscript and SSJS?"
4. **Interrupt**: Start speaking anytime to interrupt the assistant
5. **Settings**:
   - Toggle language (EN/FR) in top bar
   - Select voice (4 options)
   - View transcript in settings panel

## SFMC Topics Covered

- **Email Studio**: Campaign creation, A/B testing, tracking
- **Journey Builder**: Customer journeys, decision splits, goals
- **Content Builder**: Asset management, dynamic content
- **Automation Studio**: Workflows, SQL queries, imports
- **Data Management**: Data extensions, relationships, segmentation
- **Development**: AMPscript, SSJS, API integrations
- **Compliance**: CAN-SPAM, GDPR, preference centers
- **Deliverability**: SPF, DKIM, DMARC, sender reputation

## Performance Targets

- **Audio Latency**: < 25ms from capture to particle update
- **FPS**: 50-60 FPS on mid-range laptops
- **Particle Count**: 32k-100k adaptive based on performance
- **CPU**: < 3ms/frame
- **GPU**: < 12ms/frame

## Customization

### Change Voices

Edit `packages/shared/src/constants.ts`:

```typescript
export const VOICES = {
  alloy: { id: "alloy", label: "Alloy (M)", gender: "male" },
  // Add more voices as OpenAI releases them
};
```

### Modify System Prompt

Edit `packages/shared/src/prompts.ts`:

```typescript
export const SFMC_SYSTEM_PROMPTS = {
  en: `Your custom prompt here...`,
  fr: `Votre prompt personnalisé ici...`
};
```

### Adjust Particle Count

Edit `packages/shared/src/constants.ts`:

```typescript
export const PARTICLE_CONFIG = {
  count: 65536, // Default particle count
  minCount: 32768,
  maxCount: 100000
};
```

## Troubleshooting

### No Audio

- Check browser permissions (microphone access)
- Ensure HTTPS (required for `getUserMedia`)
- Check browser console for errors

### Low FPS

- Reduce particle count in settings
- Close other GPU-intensive apps
- Check `Performance` metrics in status bar

### Connection Failed

- Verify `OPENAI_API_KEY` is set correctly
- Check server logs: `pnpm --filter server dev`
- Ensure server is running on port 3001

### WebRTC Issues

- Check network/firewall settings
- Try different network (VPN may interfere)
- Review browser console for ICE connection errors

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 14.5+)
- Opera: Full support

WebGPU support is detected but falls back to WebGL for compatibility.

## License

MIT

## Support

For issues, please check:
1. Server logs
2. Browser console
3. Network tab (for API errors)

Common fixes:
- Clear browser cache
- Restart server
- Regenerate ephemeral token (disconnect/reconnect)
