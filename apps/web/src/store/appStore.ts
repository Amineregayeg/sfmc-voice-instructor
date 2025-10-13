import { create } from "zustand";
import { ConnectionState, type AppSettings, DEFAULT_SETTINGS, type AudioFeatures, ParticleMode } from "@mvp-voice-agent/shared";

interface AppState {
  // Settings
  settings: AppSettings;
  setLanguage: (language: AppSettings["language"]) => void;
  setVoice: (voice: AppSettings["voice"]) => void;

  // Connection
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  isConnected: boolean;

  // Audio features
  micFeatures: AudioFeatures | null;
  assistantFeatures: AudioFeatures | null;
  setMicFeatures: (features: AudioFeatures) => void;
  setAssistantFeatures: (features: AudioFeatures) => void;

  // Speaking states
  isMicSpeaking: boolean;
  isAssistantSpeaking: boolean;
  setSpeakingState: (micSpeaking: boolean, assistantSpeaking: boolean) => void;

  // Particle mode
  particleMode: ParticleMode;
  updateParticleMode: () => void;

  // Performance
  fps: number;
  particleCount: number;
  latency: number;
  setFps: (fps: number) => void;
  setParticleCount: (count: number) => void;
  setLatency: (latency: number) => void;

  // Transcript
  transcript: string;
  addToTranscript: (text: string) => void;
  clearTranscript: () => void;

  // UI state
  showSettings: boolean;
  toggleSettings: () => void;
  micMuted: boolean;
  toggleMicMute: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial settings
  settings: DEFAULT_SETTINGS,
  setLanguage: (language) =>
    set((state) => ({
      settings: { ...state.settings, language }
    })),
  setVoice: (voice) =>
    set((state) => ({
      settings: { ...state.settings, voice }
    })),

  // Connection state
  connectionState: ConnectionState.DISCONNECTED,
  setConnectionState: (connectionState) =>
    set({ connectionState, isConnected: connectionState === ConnectionState.CONNECTED }),
  isConnected: false,

  // Audio features
  micFeatures: null,
  assistantFeatures: null,
  setMicFeatures: (features) => {
    set({ micFeatures: features });
    // Update latency (time from capture to update)
    const latency = performance.now() - features.ts;
    get().setLatency(latency);
  },
  setAssistantFeatures: (features) => set({ assistantFeatures: features }),

  // Speaking states
  isMicSpeaking: false,
  isAssistantSpeaking: false,
  setSpeakingState: (isMicSpeaking, isAssistantSpeaking) => {
    set({ isMicSpeaking, isAssistantSpeaking });
    get().updateParticleMode();
  },

  // Particle mode
  particleMode: ParticleMode.IDLE,
  updateParticleMode: () => {
    const { isMicSpeaking, isAssistantSpeaking } = get();
    let mode = ParticleMode.IDLE;

    if (isMicSpeaking) {
      mode = ParticleMode.USER;
    } else if (isAssistantSpeaking) {
      mode = ParticleMode.ASSISTANT;
    }

    set({ particleMode: mode });
  },

  // Performance metrics
  fps: 60,
  particleCount: 65536,
  latency: 0,
  setFps: (fps) => set({ fps }),
  setParticleCount: (particleCount) => set({ particleCount }),
  setLatency: (latency) => set({ latency }),

  // Transcript
  transcript: "",
  addToTranscript: (text) =>
    set((state) => ({
      transcript: state.transcript + text + "\n"
    })),
  clearTranscript: () => set({ transcript: "" }),

  // UI state
  showSettings: false,
  toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
  micMuted: false,
  toggleMicMute: () => set((state) => ({ micMuted: !state.micMuted }))
}));
