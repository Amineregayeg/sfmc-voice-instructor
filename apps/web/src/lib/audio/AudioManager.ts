import { AudioAnalyzer } from "./AudioAnalyzer.js";
import type { AudioFeatures } from "@mvp-voice-agent/shared";

export interface AudioManagerCallbacks {
  onMicFeatures?: (features: AudioFeatures) => void;
  onAssistantFeatures?: (features: AudioFeatures) => void;
  onSpeakingStateChange?: (isMicActive: boolean, isAssistantActive: boolean) => void;
}

/**
 * Manages dual audio analysis: microphone input and assistant output
 * Handles speaking state transitions and barge-in detection
 */
export class AudioManager {
  private micAnalyzer: AudioAnalyzer;
  private assistantAnalyzer: AudioAnalyzer;
  private callbacks: AudioManagerCallbacks;

  private micStream: MediaStream | null = null;
  private assistantTrack: MediaStreamTrack | null = null;

  private isMicSpeaking = false;
  private isAssistantSpeaking = false;

  private assistantAudioElement: HTMLAudioElement | null = null;
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: AudioManagerCallbacks) {
    this.callbacks = callbacks;
    this.micAnalyzer = new AudioAnalyzer(24000);
    this.assistantAnalyzer = new AudioAnalyzer(24000);
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.micAnalyzer.initialize(),
      this.assistantAnalyzer.initialize()
    ]);
    console.log("[AudioManager] Initialized");
  }

  connectMicrophone(stream: MediaStream): void {
    this.micStream = stream;

    this.micAnalyzer.connect(stream, (features) => {
      this.callbacks.onMicFeatures?.(features);

      // Update speaking state
      if (features.speaking !== this.isMicSpeaking) {
        this.isMicSpeaking = features.speaking;
        this.handleSpeakingStateChange();
      }
    });

    console.log("[AudioManager] Microphone connected");
  }

  connectAssistant(track: MediaStreamTrack): void {
    this.assistantTrack = track;

    // Create audio element for playback
    if (!this.assistantAudioElement) {
      this.assistantAudioElement = new Audio();
      this.assistantAudioElement.autoplay = true;
    }

    const stream = new MediaStream([track]);
    this.assistantAudioElement.srcObject = stream;

    // Connect analyzer
    this.assistantAnalyzer.connect(track, (features) => {
      this.callbacks.onAssistantFeatures?.(features);

      // Update speaking state
      if (features.speaking !== this.isAssistantSpeaking) {
        this.isAssistantSpeaking = features.speaking;
        this.handleSpeakingStateChange();
      }
    });

    console.log("[AudioManager] Assistant audio connected");
  }

  private handleSpeakingStateChange(): void {
    // Debounce rapid state changes
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.callbacks.onSpeakingStateChange?.(
        this.isMicSpeaking,
        this.isAssistantSpeaking
      );
    }, 50); // 50ms debounce
  }

  getMicrophoneSpeaking(): boolean {
    return this.isMicSpeaking;
  }

  getAssistantSpeaking(): boolean {
    return this.isAssistantSpeaking;
  }

  async disconnect(): Promise<void> {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.micAnalyzer.disconnect();
    this.assistantAnalyzer.disconnect();

    if (this.assistantAudioElement) {
      this.assistantAudioElement.pause();
      this.assistantAudioElement.srcObject = null;
      this.assistantAudioElement = null;
    }

    this.micStream = null;
    this.assistantTrack = null;
    this.isMicSpeaking = false;
    this.isAssistantSpeaking = false;

    console.log("[AudioManager] Disconnected");
  }

  async close(): Promise<void> {
    await this.disconnect();
    await Promise.all([
      this.micAnalyzer.close(),
      this.assistantAnalyzer.close()
    ]);
    console.log("[AudioManager] Closed");
  }
}
