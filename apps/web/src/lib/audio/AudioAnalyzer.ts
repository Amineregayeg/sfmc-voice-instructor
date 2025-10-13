import type { AudioFeatures } from "@mvp-voice-agent/shared";

export type AudioAnalyzerCallback = (features: AudioFeatures) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private callback: AudioAnalyzerCallback | null = null;
  private isInitialized = false;

  constructor(sampleRate: number = 24000) {
    this.audioContext = new AudioContext({ sampleRate });
  }

  async initialize(workletPath: string = "/audio-analyzer.worklet.js"): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.audioContext.audioWorklet.addModule(workletPath);
      this.isInitialized = true;
      console.log("[AudioAnalyzer] Worklet initialized");
    } catch (error) {
      console.error("[AudioAnalyzer] Failed to load worklet:", error);
      throw error;
    }
  }

  connect(stream: MediaStream | MediaStreamTrack, callback: AudioAnalyzerCallback): void {
    if (!this.isInitialized) {
      throw new Error("AudioAnalyzer not initialized. Call initialize() first.");
    }

    // Disconnect existing connections
    this.disconnect();

    try {
      // Create source from stream or track
      let mediaStream: MediaStream;
      if (stream instanceof MediaStream) {
        mediaStream = stream;
      } else {
        mediaStream = new MediaStream([stream]);
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(mediaStream);

      // Create worklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, "audio-analyzer", {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1
      });

      // Set up message handler
      this.callback = callback;
      this.workletNode.port.onmessage = (event) => {
        if (this.callback) {
          const features: AudioFeatures = {
            rms: event.data.rms,
            peak: event.data.peak,
            pitch: event.data.pitch,
            onset: event.data.onset,
            speaking: event.data.speaking,
            ts: performance.now()
          };
          this.callback(features);
        }
      };

      // Connect nodes
      this.sourceNode.connect(this.workletNode);

      console.log("[AudioAnalyzer] Connected to audio stream");
    } catch (error) {
      console.error("[AudioAnalyzer] Connection failed:", error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    this.callback = null;
    console.log("[AudioAnalyzer] Disconnected");
  }

  async resume(): Promise<void> {
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
      console.log("[AudioAnalyzer] AudioContext resumed");
    }
  }

  async suspend(): Promise<void> {
    if (this.audioContext.state === "running") {
      await this.audioContext.suspend();
      console.log("[AudioAnalyzer] AudioContext suspended");
    }
  }

  async close(): Promise<void> {
    this.disconnect();
    await this.audioContext.close();
    this.isInitialized = false;
    console.log("[AudioAnalyzer] Closed");
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
