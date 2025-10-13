import type { Language, VoiceId } from "./types.js";

// Voice configurations (2 male, 2 female)
export const VOICES: Record<VoiceId, { id: VoiceId; label: string; gender: "male" | "female" }> = {
  alloy: { id: "alloy", label: "Alloy (M)", gender: "male" },
  echo: { id: "echo", label: "Echo (M)", gender: "male" },
  shimmer: { id: "shimmer", label: "Shimmer (F)", gender: "female" },
  verse: { id: "verse", label: "Verse (F)", gender: "female" }
};

// Language configurations
export const LANGUAGES: Record<Language, { code: Language; label: string; flag: string }> = {
  en: { code: "en", label: "English", flag: "🇬🇧" },
  fr: { code: "fr", label: "Français", flag: "🇫🇷" }
};

// Default settings
export const DEFAULT_SETTINGS = {
  language: "en" as Language,
  voice: "alloy" as VoiceId
};

// Audio configuration
export const AUDIO_CONFIG = {
  sampleRate: 24000,
  channelCount: 1,
  format: "pcm16" as const,
  workletBufferSize: 128,
  analysisHopSize: 512,
  fftSize: 2048,
  smoothingTimeConstant: 0.8
};

// VAD (Voice Activity Detection) settings
export const VAD_CONFIG = {
  threshold: 0.5,
  prefixPaddingMs: 300,
  silenceDurationMs: 500
};

// Particle system configuration
export const PARTICLE_CONFIG = {
  count: 65536, // 64k particles
  maxCount: 100000,
  minCount: 32768,
  adaptiveStep: 8192,
  targetFps: 60,
  colorWarm: [0.902, 0.722, 0.0] as [number, number, number], // #E6B800 in linear RGB
  bloomStrength: 1.5,
  minBloomStrength: 0.5,
  maxBloomStrength: 2.5
};

// Performance thresholds
export const PERFORMANCE_CONFIG = {
  targetFps: 60,
  minFps: 50,
  maxCpuMs: 3,
  maxGpuMs: 12,
  adaptiveCheckInterval: 2000 // ms
};

// Realtime API endpoints
export const REALTIME_ENDPOINTS = {
  sessions: "https://api.openai.com/v1/realtime/sessions",
  websocket: "wss://api.openai.com/v1/realtime"
};
