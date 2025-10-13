// Language and voice types
export type Language = "en" | "fr";
export type VoiceId = "alloy" | "echo" | "shimmer" | "verse";

// App settings
export interface AppSettings {
  language: Language;
  voice: VoiceId;
}

// Audio analyzer output
export interface AudioFeatures {
  rms: number;      // 0..1
  peak: number;     // 0..1
  pitch: number;    // Hz or 0 if undefined
  onset: boolean;   // transient flag this frame
  speaking: boolean;
  ts: number;       // performance.now()
}

// Particle render mode
export enum ParticleMode {
  IDLE = 0,
  USER = 1,
  ASSISTANT = 2
}

// Particle shader uniforms
export interface ParticleUniforms {
  uTime: number;
  uRms: number;
  uPitch: number;
  uOnset: number;
  uMode: ParticleMode;
  uBloomStrength: number;
  uColorWarm: [number, number, number]; // linear RGB
}

// Realtime session types
export interface RealtimeSessionConfig {
  type: "realtime";
  model: "gpt-realtime-2025-08-28";
  modalities: ["audio", "text"];
  instructions: string;
  voice: VoiceId;
  input_audio_format: "pcm16";
  output_audio_format: "pcm16";
  input_audio_transcription?: {
    model: "whisper-1";
  };
  turn_detection?: {
    type: "server_vad";
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
}

// WebRTC connection states
export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  FAILED = "failed",
  RECONNECTING = "reconnecting"
}

// Session events
export interface SessionEvent {
  type: string;
  [key: string]: any;
}

// Client-side ephemeral token response
export interface EphemeralTokenResponse {
  token: string;
  expiresAt: number;
}
