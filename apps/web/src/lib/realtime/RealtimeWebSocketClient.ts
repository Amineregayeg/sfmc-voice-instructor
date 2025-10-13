import {
  ConnectionState,
  type AppSettings,
  type SessionEvent,
  REALTIME_ENDPOINTS,
  getSessionInstructions
} from "@mvp-voice-agent/shared";

export interface RealtimeWebSocketClientConfig {
  onConnectionStateChange?: (state: ConnectionState) => void;
  onAudioData?: (audio: ArrayBuffer) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * WebSocket-based Realtime client
 * Uses wss://api.openai.com/v1/realtime with ephemeral token
 */
export class RealtimeWebSocketClient {
  private config: RealtimeWebSocketClientConfig;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private ephemeralToken: string | null = null;

  constructor(config: RealtimeWebSocketClientConfig) {
    this.config = config;
  }

  private setState(state: ConnectionState) {
    this.connectionState = state;
    this.config.onConnectionStateChange?.(state);
  }

  private handleError(error: Error) {
    console.error("[RealtimeWSClient] Error:", error);
    this.config.onError?.(error);
  }

  async connect(settings: AppSettings, ephemeralToken: string): Promise<void> {
    try {
      this.setState(ConnectionState.CONNECTING);
      this.ephemeralToken = ephemeralToken;

      console.log("[RealtimeWSClient] Connecting to WebSocket...");

      // Connect to WebSocket with model and token
      const wsUrl = `${REALTIME_ENDPOINTS.websocket}?model=gpt-realtime-2025-08-28`;
      this.ws = new WebSocket(wsUrl, {
        headers: {
          "Authorization": `Bearer ${ephemeralToken}`,
          "OpenAI-Beta": "realtime=v1"
        }
      } as any);

      this.ws.binaryType = "arraybuffer";

      // Setup event handlers
      this.ws.onopen = () => {
        console.log("[RealtimeWSClient] WebSocket connected");
        this.setState(ConnectionState.CONNECTED);
        this.updateSession(settings);
        this.startAudioCapture();
      };

      this.ws.onmessage = (event) => {
        this.handleServerEvent(event.data);
      };

      this.ws.onerror = (error) => {
        console.error("[RealtimeWSClient] WebSocket error:", error);
        this.setState(ConnectionState.FAILED);
        this.handleError(new Error("WebSocket connection error"));
      };

      this.ws.onclose = () => {
        console.log("[RealtimeWSClient] WebSocket closed");
        if (this.connectionState === ConnectionState.CONNECTED) {
          this.setState(ConnectionState.DISCONNECTED);
        }
      };

    } catch (error) {
      this.setState(ConnectionState.FAILED);
      this.handleError(error as Error);
      throw error;
    }
  }

  private async startAudioCapture() {
    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1
        }
      });

      // Create audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor to send audio to server
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);

          // Convert float32 to int16 PCM
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Send audio data
          this.sendEvent({
            type: "input_audio_buffer.append",
            audio: this.arrayBufferToBase64(pcm16.buffer)
          });
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      console.log("[RealtimeWSClient] Audio capture started");
    } catch (error) {
      console.error("[RealtimeWSClient] Failed to start audio capture:", error);
      this.handleError(error as Error);
    }
  }

  private handleServerEvent(data: any) {
    try {
      // Handle text events
      if (typeof data === "string") {
        const event: SessionEvent = JSON.parse(data);
        console.log("[RealtimeWSClient] Server event:", event.type);

        switch (event.type) {
          case "conversation.item.input_audio_transcription.completed":
            this.config.onTranscript?.(event.transcript, true);
            break;
          case "response.output_text.delta":
            this.config.onTranscript?.(event.delta, false);
            break;
          case "response.audio.delta":
            // Handle audio response
            if (event.delta) {
              const audioData = this.base64ToArrayBuffer(event.delta);
              this.config.onAudioData?.(audioData);
            }
            break;
          case "error":
            this.handleError(new Error(event.error?.message || "Unknown error"));
            break;
        }
      }
      // Handle binary audio data
      else if (data instanceof ArrayBuffer) {
        this.config.onAudioData?.(data);
      }
    } catch (error) {
      console.error("[RealtimeWSClient] Failed to handle server event:", error);
    }
  }

  private updateSession(settings: AppSettings) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[RealtimeWSClient] WebSocket not ready for session update");
      return;
    }

    const sessionUpdate = {
      type: "session.update",
      session: {
        model: "gpt-realtime-2025-08-28",
        voice: settings.voice,
        instructions: getSessionInstructions(settings.language),
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad"
        }
      }
    };

    console.log("[RealtimeWSClient] Sending session update");
    this.sendEvent(sessionUpdate);
  }

  sendInterrupt() {
    this.sendEvent({ type: "response.cancel" });
  }

  private sendEvent(event: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async disconnect() {
    console.log("[RealtimeWSClient] Disconnecting...");

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.ephemeralToken = null;
    this.setState(ConnectionState.DISCONNECTED);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }
}
