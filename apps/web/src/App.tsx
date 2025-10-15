import { useEffect, useRef } from "react";
import { CometAnimation } from "./components/CometAnimation";
import { TopBar } from "./components/TopBar";
import { StatusBar } from "./components/StatusBar";
import { ConnectButton } from "./components/ConnectButton";
import { SettingsPanel } from "./components/SettingsPanel";
import { useAppStore } from "./store/appStore";
import { RealtimeClient } from "./lib/realtime/RealtimeClient";
import { AudioManager } from "./lib/audio/AudioManager";

function App() {
  const realtimeClientRef = useRef<RealtimeClient | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);

  const {
    settings,
    setConnectionState,
    setMicFeatures,
    setAssistantFeatures,
    setAssistantAudioTrack,
    setSpeakingState,
    addToTranscript,
    micMuted
  } = useAppStore();

  // Initialize audio manager
  useEffect(() => {
    const audioManager = new AudioManager({
      onMicFeatures: (features) => {
        if (!micMuted) {
          setMicFeatures(features);
        }
      },
      onAssistantFeatures: (features) => {
        setAssistantFeatures(features);
      },
      onSpeakingStateChange: (isMicSpeaking, isAssistantSpeaking) => {
        setSpeakingState(isMicSpeaking, isAssistantSpeaking);

        // Send interrupt if user starts speaking while assistant is speaking
        if (isMicSpeaking && isAssistantSpeaking && realtimeClientRef.current) {
          realtimeClientRef.current.sendInterrupt();
        }
      }
    });

    audioManagerRef.current = audioManager;
    audioManager.initialize();

    return () => {
      audioManager.close();
    };
  }, [setMicFeatures, setAssistantFeatures, setSpeakingState, micMuted]);

  const handleConnect = async () => {
    try {
      // Create Realtime client with WebRTC
      const realtimeClient = new RealtimeClient({
        serverUrl: window.location.origin,
        onConnectionStateChange: (state) => {
          setConnectionState(state);
        },
        onAudioTrack: (track) => {
          // Connect assistant audio to analyzer
          if (audioManagerRef.current) {
            audioManagerRef.current.connectAssistant(track);
          }
          // Store track for blob visualization
          setAssistantAudioTrack(track);
        },
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            addToTranscript(text);
          }
        },
        onError: (error) => {
          console.error("[App] Realtime error:", error);
          alert(`Connection error: ${error.message}`);
        }
      });

      realtimeClientRef.current = realtimeClient;

      // Connect
      await realtimeClient.connect(settings);

      // Get microphone and connect to analyzer
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1
        }
      });

      if (audioManagerRef.current) {
        audioManagerRef.current.connectMicrophone(micStream);
      }

      console.log("[App] Connection established");
    } catch (error) {
      console.error("[App] Connection failed:", error);
      alert(`Failed to connect: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDisconnect = async () => {
    if (realtimeClientRef.current) {
      await realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
    }

    if (audioManagerRef.current) {
      await audioManagerRef.current.disconnect();
    }

    // Clear assistant audio track
    setAssistantAudioTrack(null);

    console.log("[App] Disconnected");
  };

  // Update session when settings change (and connected)
  useEffect(() => {
    if (realtimeClientRef.current?.isConnected()) {
      realtimeClientRef.current.updateSession(settings);
      console.log("[App] Updated session with new settings");
    }
  }, [settings]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-dark-bg">
      {/* Background comet visualization */}
      <CometAnimation />

      {/* UI Overlay */}
      <TopBar />
      <StatusBar />
      <SettingsPanel />
      <ConnectButton onConnect={handleConnect} onDisconnect={handleDisconnect} />
    </div>
  );
}

export default App;
