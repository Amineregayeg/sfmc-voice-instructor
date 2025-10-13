# Operational Runbook

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env and add OPENAI_API_KEY

# 3. Build shared package
pnpm --filter shared build

# 4. Start development
pnpm dev
```

## Common Operations

### Rotating Voices

To update available voices:

1. Edit `packages/shared/src/constants.ts`
2. Update `VOICES` object with new voice IDs
3. Rebuild shared package: `pnpm --filter shared build`
4. Restart server and web app

```typescript
export const VOICES: Record<VoiceId, { id: VoiceId; label: string; gender: "male" | "female" }> = {
  alloy: { id: "alloy", label: "Alloy (M)", gender: "male" },
  echo: { id: "echo", label: "Echo (M)", gender: "male" },
  shimmer: { id: "shimmer", label: "Shimmer (F)", gender: "female" },
  verse: { id: "verse", label: "Verse (F)", gender: "female" }
};
```

### Changing Language Defaults

Edit `packages/shared/src/constants.ts`:

```typescript
export const DEFAULT_SETTINGS = {
  language: "fr" as Language, // Change to "fr" for French
  voice: "shimmer" as VoiceId  // Change default voice
};
```

### Updating System Prompts

Edit `packages/shared/src/prompts.ts`:

```typescript
export const SFMC_SYSTEM_PROMPTS: Record<Language, string> = {
  en: `Your updated English prompt...`,
  fr: `Votre prompt français mis à jour...`
};
```

Then rebuild: `pnpm --filter shared build`

### Adjusting Performance

#### Particle Count

Edit `packages/shared/src/constants.ts`:

```typescript
export const PARTICLE_CONFIG = {
  count: 50000,        // Initial count (reduce for low-end devices)
  maxCount: 80000,     // Max for adaptive scaling
  minCount: 25000,     // Min for adaptive scaling
  adaptiveStep: 5000   // Adjustment step size
};
```

#### Audio Analysis

Edit `packages/shared/src/constants.ts`:

```typescript
export const AUDIO_CONFIG = {
  sampleRate: 24000,        // Lower for reduced CPU usage
  workletBufferSize: 256,   // Increase for lower CPU (higher latency)
  fftSize: 1024,           // Reduce for faster pitch detection
};
```

#### VAD Sensitivity

```typescript
export const VAD_CONFIG = {
  threshold: 0.5,          // Higher = less sensitive (0-1)
  prefixPaddingMs: 300,    // Audio before speech detection
  silenceDurationMs: 500   // Silence before considering speech ended
};
```

## Monitoring

### Server Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-12T22:00:00.000Z"
}
```

### Client Metrics

Open browser DevTools > Console. Look for:

```
[ParticleSystem] 65536 particles @ 60 FPS
[AudioAnalyzer] Latency: 15ms
[RealtimeClient] Connected
```

### Performance Metrics (in UI)

Status bar shows:
- **FPS**: Target 50-60
- **Particles**: Adaptive count (32k-100k)
- **Latency**: < 25ms (mic to particle update)

## Troubleshooting

### Server Won't Start

**Error: OPENAI_API_KEY not found**

```bash
# Check .env file exists and has correct key
cat .env | grep OPENAI_API_KEY

# Verify format (no quotes needed)
OPENAI_API_KEY=sk-proj-...
```

**Error: Port 3001 already in use**

```bash
# Find process using port
lsof -i :3001

# Kill process or change PORT in .env
PORT=3002
```

### Connection Fails

**Check server is running:**

```bash
# Should show "Server running on http://localhost:3001"
pnpm --filter server dev
```

**Test token endpoint:**

```bash
curl -X POST http://localhost:3001/api/token \
  -H "Content-Type: application/json" \
  -d '{"voice": "alloy", "language": "en"}'
```

Expected response:
```json
{
  "token": "ek_...",
  "expiresAt": 1234567890000
}
```

**Check CORS:**

If deploying to different domains, update `ALLOWED_ORIGINS` in `.env`:

```env
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com
```

### Audio Issues

**No microphone access:**

1. Check browser permissions (lock icon in address bar)
2. Ensure HTTPS (required for getUserMedia)
3. Try different browser

**Echo/feedback:**

1. Use headphones
2. Check `echoCancellation` is enabled in `RealtimeClient.ts`:

```typescript
audio: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
}
```

**High latency:**

1. Check status bar latency metric
2. If > 100ms:
   - Close other apps
   - Reduce particle count
   - Check network connection

### WebRTC Issues

**ICE connection failed:**

1. Check network/firewall
2. Try different network (VPN may block)
3. Review console for STUN/TURN errors

**Data channel not opening:**

1. Check server logs for SDP exchange errors
2. Verify ephemeral token is valid (60s expiry)
3. Reconnect to get fresh token

### Particle Performance

**Low FPS (<50):**

1. Adaptive scaling should auto-adjust particle count
2. Manually reduce in `PARTICLE_CONFIG.count`
3. Check GPU usage in browser task manager

**Particles not animating:**

1. Check console for Three.js errors
2. Verify WebGL is supported: visit https://get.webgl.org
3. Update graphics drivers

## Deployment Checklist

### Pre-deployment

- [ ] Update `OPENAI_API_KEY` in production environment
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` with production URLs
- [ ] Build and test locally: `pnpm build && pnpm preview`
- [ ] Test on target browsers (Chrome, Firefox, Safari)
- [ ] Verify PWA manifest and icons

### Post-deployment

- [ ] Test connection to production API
- [ ] Verify microphone permissions prompt
- [ ] Check WebRTC connection establishes
- [ ] Test voice selection and language toggle
- [ ] Monitor server logs for errors
- [ ] Check performance metrics (FPS, latency)

## Scaling Considerations

### Server

- **Rate Limiting**: Currently 60 req/min per IP
- **Token Caching**: Ephemeral tokens expire in 60s
- **Horizontal Scaling**: Stateless server, safe to scale

### Client

- **Concurrent Users**: Each user maintains own WebRTC connection
- **Resource Usage**: ~200MB RAM, moderate GPU usage
- **Mobile**: Tested on iOS 14.5+, Android Chrome

## Backup & Recovery

### Configuration Backup

```bash
# Backup environment
cp .env .env.backup

# Backup custom prompts
cp packages/shared/src/prompts.ts packages/shared/src/prompts.ts.backup
```

### State Recovery

No persistent state on server. Client state resets on page refresh.

Transcript is ephemeral - implement backend storage if persistence needed.

## Monitoring & Alerts

Recommended monitoring:

1. **Server Health**: Poll `/health` endpoint every 30s
2. **Error Rate**: Monitor OpenAI API errors
3. **Latency**: Track audio latency metric
4. **FPS**: Alert if < 30 FPS for extended period

Example monitoring setup:

```typescript
// Add to server.ts
app.get("/metrics", (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    // Add custom metrics
  });
});
```

## Support Contacts

- **OpenAI API Issues**: https://help.openai.com
- **WebRTC Issues**: Check browser compatibility tables
- **Performance Issues**: Profile using browser DevTools Performance tab
