# Architecture Documentation

## System Overview

The SFMC Voice Instructor is a real-time voice agent that combines:
- OpenAI Realtime API (WebRTC) for speech-to-speech interaction
- AudioWorklet for low-latency audio analysis
- Three.js for GPU-accelerated particle visualization
- React + Zustand for state management

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  React UI    │  │ Zustand Store│  │ Three.js Canvas │   │
│  │ Components   │◄─┤   (State)    │◄─┤   (Particles)   │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                  │                    │            │
│  ┌──────▼──────────────────▼────────────────────▼────────┐  │
│  │              Application Controller (App.tsx)         │  │
│  └──────┬──────────────────┬────────────────────┬────────┘  │
│         │                  │                    │            │
│  ┌──────▼─────────┐ ┌──────▼──────────┐ ┌──────▼────────┐  │
│  │ RealtimeClient │ │  AudioManager   │ │ParticleSystem │  │
│  │   (WebRTC)     │ │ (AudioWorklet)  │ │  (Three.js)   │  │
│  └──────┬─────────┘ └──────┬──────────┘ └───────────────┘  │
│         │                  │                                 │
│         │          ┌───────▼──────────┐                     │
│         │          │ AudioAnalyzer    │                     │
│         │          │  (Worklet Node)  │                     │
│         │          └──────────────────┘                     │
└─────────┼──────────────────────────────────────────────────┘
          │
    ┌─────▼─────┐
    │  WebRTC   │
    │  Session  │
    └─────┬─────┘
          │
┌─────────▼─────────────────────────────────────────────────┐
│                    OpenAI Realtime API                     │
│  - Session Management (Data Channel)                       │
│  - Audio Streaming (RTP)                                   │
│  - gpt-realtime-2025-08-28                                │
└─────────▲─────────────────────────────────────────────────┘
          │
┌─────────┴─────────────────────────────────────────────────┐
│                     Express Server                         │
│  - Ephemeral Token Generation (/api/token)                │
│  - CORS & Rate Limiting                                    │
└───────────────────────────────────────────────────────────┘
```

## Data Flow

### Connection Flow

1. **User clicks "Connect"**
2. **App.tsx** requests ephemeral token from server
3. **Server** (`/api/token`) calls OpenAI `/v1/realtime/client_secrets`
4. **RealtimeClient** creates RTCPeerConnection
5. **RealtimeClient** exchanges SDP with OpenAI `/v1/realtime/calls`
6. **WebRTC** establishes peer connection (audio + data channel)
7. **AudioManager** connects microphone and assistant audio analyzers
8. **Connection complete** - ready for voice interaction

### Audio Flow (User → AI)

```
Microphone
    ↓
getUserMedia (WebRTC Track)
    ↓
RTCPeerConnection → OpenAI
    ↓
[OpenAI Processing]
    ↓
WebRTC Audio Track (Response)
    ↓
AudioManager → Audio Element (Playback)
    ↓
AudioAnalyzer (Features)
    ↓
ParticleSystem (Visualization)
```

### Audio Analysis Flow

```
MediaStreamTrack (Mic or Assistant)
    ↓
MediaStreamAudioSourceNode
    ↓
AudioWorkletNode (audio-analyzer.worklet.js)
    ├─ RMS Calculation
    ├─ Peak Detection
    ├─ Pitch Estimation (Autocorrelation)
    ├─ Onset Detection
    └─ VAD (Voice Activity Detection)
    ↓
AudioFeatures {rms, peak, pitch, onset, speaking}
    ↓
App Store (Zustand)
    ↓
ParticleSystem.updateUniforms()
    ↓
Three.js Shaders (GPU)
```

### State Management Flow

```
User Action (UI)
    ↓
useAppStore (Zustand)
    ├─ setLanguage() → Update session.instructions
    ├─ setVoice() → Update session.voice
    ├─ setMicFeatures() → Update particle uniforms
    ├─ setSpeakingState() → Trigger particle mode change
    └─ setConnectionState() → Update UI status
    ↓
React Components Re-render
    ↓
Particle System Updates (60 FPS)
```

## Key Technologies

### Frontend

**React 18**
- Component-based UI
- Hooks for lifecycle management
- Concurrent rendering

**Zustand**
- Lightweight state management
- No boilerplate
- ~200 bytes gzipped

**Three.js**
- WebGL rendering
- ShaderMaterial for custom effects
- BufferGeometry for performance

**Vite**
- Fast HMR (Hot Module Replacement)
- ESM-based build
- Optimized production bundles

**TailwindCSS**
- Utility-first styling
- Dark theme optimization
- Responsive design

### Audio Processing

**Web Audio API**
- AudioContext for processing graph
- MediaStream for I/O
- AudioWorklet for low-latency analysis

**AudioWorklet**
- Runs on audio thread (not main thread)
- 128-sample blocks (5.3ms at 24kHz)
- Sub-25ms latency

### WebRTC

**RTCPeerConnection**
- Peer-to-peer connection to OpenAI
- ICE for NAT traversal
- RTP for audio streaming

**RTCDataChannel**
- Session event communication
- Low-latency message passing
- Ordered, reliable delivery

### Server

**Express**
- Minimal REST API
- CORS middleware
- Rate limiting (60 req/min)

**Node.js 18+**
- Native fetch API
- ES modules
- Performance improvements

## Performance Optimizations

### Audio Latency (<25ms target)

1. **AudioWorklet** instead of ScriptProcessor
   - Runs on audio rendering thread
   - No context switching overhead

2. **Direct feature extraction**
   - RMS/peak calculated in worklet
   - Results sent via MessagePort

3. **Minimal processing**
   - No FFT unless needed for pitch
   - Simplified autocorrelation

### Rendering Performance (50-60 FPS)

1. **GPU Instancing**
   - Single draw call for all particles
   - Attributes stored in BufferGeometry

2. **Custom Shaders**
   - All animation on GPU
   - No CPU-side particle updates

3. **Adaptive Particle Count**
   - Monitors FPS every 2 seconds
   - Adjusts count by 8k steps
   - Min: 32k, Max: 100k

4. **Optimized Uniforms**
   - Only update changed values
   - Batch updates per frame

### Network Optimization

1. **Ephemeral Tokens**
   - Generated server-side only
   - Never expose permanent API key
   - 60-second expiry

2. **WebRTC Direct Connection**
   - No intermediary server
   - Peer-to-peer to OpenAI
   - Minimal latency

## Security Considerations

### API Key Protection

- Permanent key only on server
- Ephemeral tokens for client
- Rate limiting on token endpoint

### CORS

- Whitelist allowed origins
- Credentials disabled for API
- Preflight request handling

### Input Validation

- Voice ID validation
- Language code validation
- Request body sanitization

### Content Security

- CSP headers (recommended)
- HTTPS required for production
- No inline scripts

## Scalability

### Horizontal Scaling

- **Server**: Stateless, can scale infinitely
- **Client**: Each user has own WebRTC connection
- **Token Generation**: No shared state, thread-safe

### Resource Limits

- **Per Connection**: ~200MB RAM, moderate GPU
- **Concurrent Users**: Limited by OpenAI rate limits
- **Audio Bandwidth**: ~100 kbps per connection

### Bottlenecks

1. **OpenAI API**: Rate limits and quotas
2. **Client GPU**: Particle rendering
3. **Network**: WebRTC requires good connection

## Monitoring Points

### Client-Side

- FPS (status bar)
- Audio latency (status bar)
- Particle count (status bar)
- Connection state (status bar)

### Server-Side

- `/health` endpoint (200 OK)
- Token generation rate
- OpenAI API errors
- Server uptime/memory

### Recommended Metrics

```typescript
{
  "fps": 60,                    // Target: 50-60
  "latency_ms": 15,             // Target: <25
  "particles": 65536,           // Adaptive: 32k-100k
  "connection_time_ms": 1200,   // Target: <2000
  "audio_drops": 0,             // Target: 0
  "token_failures": 0           // Target: 0
}
```

## Future Enhancements

### WebGPU Support

- Compute shaders for particle updates
- Better performance on modern browsers
- Already detected, needs implementation

### Enhanced Audio

- Pitch-based particle color shifts
- Frequency spectrum visualization
- Spatial audio (stereo)

### Advanced Features

- Multi-user sessions
- Recording/playback
- Custom particle shapes
- Post-processing effects (bloom)

### Backend

- WebSocket fallback for regions without WebRTC
- Caching layer for frequent queries
- Analytics dashboard
