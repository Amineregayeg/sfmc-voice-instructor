import {
  ConnectionState,
  type AppSettings,
  type SessionEvent,
  type EphemeralTokenResponse,
  getSessionInstructions
} from "@mvp-voice-agent/shared";

export interface RealtimeClientConfig {
  serverUrl: string;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onAudioTrack?: (track: MediaStreamTrack) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
}

export class RealtimeClient {
  private config: RealtimeClientConfig;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private ephemeralToken: string | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: RealtimeClientConfig) {
    this.config = config;
  }

  private setState(state: ConnectionState) {
    this.connectionState = state;
    this.config.onConnectionStateChange?.(state);
  }

  private handleError(error: Error) {
    console.error("[RealtimeClient] Error:", error);
    this.config.onError?.(error);
  }

  async connect(settings: AppSettings): Promise<void> {
    try {
      this.setState(ConnectionState.CONNECTING);
      console.log("[RealtimeClient] Starting connection...");

      // Step 1: Get ephemeral token from server
      this.ephemeralToken = await this.fetchEphemeralToken(settings);
      console.log("[RealtimeClient] Got ephemeral token");

      // Step 2: Get user microphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1
        }
      });
      console.log("[RealtimeClient] Got microphone access");

      // Step 3: Create RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      // Add local audio track
      this.localStream.getTracks().forEach(track => {
        this.pc!.addTrack(track, this.localStream!);
      });

      // Handle incoming audio track from assistant
      this.pc.ontrack = (event) => {
        console.log("[RealtimeClient] Received remote track:", event.track.kind);
        if (event.track.kind === "audio") {
          this.config.onAudioTrack?.(event.track);
        }
      };

      // Create data channel for session events
      this.dataChannel = this.pc.createDataChannel("oai-events");
      this.setupDataChannel();

      // Handle ICE connection state
      this.pc.oniceconnectionstatechange = () => {
        console.log("[RealtimeClient] ICE state:", this.pc?.iceConnectionState);
        if (this.pc?.iceConnectionState === "failed") {
          this.handleICEFailure();
        } else if (this.pc?.iceConnectionState === "connected") {
          this.reconnectAttempts = 0;
        }
      };

      // Handle connection state
      this.pc.onconnectionstatechange = () => {
        console.log("[RealtimeClient] Connection state:", this.pc?.connectionState);
        if (this.pc?.connectionState === "connected") {
          this.setState(ConnectionState.CONNECTED);
          // Send session update with instructions
          this.updateSession(settings);
        } else if (this.pc?.connectionState === "failed") {
          this.setState(ConnectionState.FAILED);
        }
      };

      // Step 4: Create offer and exchange SDP
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log("[RealtimeClient] Created SDP offer");

      // Exchange SDP with OpenAI
      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-realtime-2025-08-28`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.ephemeralToken}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });

      if (!sdpResponse.ok) {
        throw new Error(`SDP exchange failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await this.pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp
      });
      console.log("[RealtimeClient] SDP exchange complete");

    } catch (error) {
      this.setState(ConnectionState.FAILED);
      this.handleError(error as Error);
      throw error;
    }
  }

  private async fetchEphemeralToken(settings: AppSettings): Promise<string> {
    const response = await fetch(`${this.config.serverUrl}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voice: settings.voice,
        language: settings.language
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status}`);
    }

    const data: EphemeralTokenResponse = await response.json();
    return data.token;
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log("[RealtimeClient] Data channel opened");
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const serverEvent: SessionEvent = JSON.parse(event.data);
        this.handleServerEvent(serverEvent);
      } catch (error) {
        console.error("[RealtimeClient] Failed to parse server event:", error);
      }
    };

    this.dataChannel.onerror = (error) => {
      console.error("[RealtimeClient] Data channel error:", error);
    };
  }

  private handleServerEvent(event: SessionEvent) {
    console.log("[RealtimeClient] Server event:", event.type);

    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed":
        this.config.onTranscript?.(event.transcript, true);
        break;
      case "response.output_text.delta":
        this.config.onTranscript?.(event.delta, false);
        break;
      case "error":
        this.handleError(new Error(event.error?.message || "Unknown error"));
        break;
    }
  }

  updateSession(settings: AppSettings) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      console.warn("[RealtimeClient] Data channel not ready for session update");
      return;
    }

    const sessionUpdate = {
      type: "session.update",
      session: {
        type: "realtime",
        model: "gpt-realtime-2025-08-28",
        modalities: ["audio", "text"],
        instructions: getSessionInstructions(settings.language),
        voice: settings.voice,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }
    };

    console.log("[RealtimeClient] Sending session update:", settings);
    this.dataChannel.send(JSON.stringify(sessionUpdate));
  }

  sendInterrupt() {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") return;

    const interrupt = {
      type: "response.cancel"
    };

    console.log("[RealtimeClient] Sending interrupt");
    this.dataChannel.send(JSON.stringify(interrupt));
  }

  private async handleICEFailure() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[RealtimeClient] Max reconnection attempts reached");
      this.setState(ConnectionState.FAILED);
      return;
    }

    this.reconnectAttempts++;
    this.setState(ConnectionState.RECONNECTING);
    console.log(`[RealtimeClient] Reconnecting (attempt ${this.reconnectAttempts})...`);

    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Attempt reconnection (would need settings passed in)
    // For now, just log
    console.warn("[RealtimeClient] Auto-reconnect not fully implemented");
  }

  async disconnect() {
    console.log("[RealtimeClient] Disconnecting...");

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.ephemeralToken = null;
    this.reconnectAttempts = 0;
    this.setState(ConnectionState.DISCONNECTED);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }
}
