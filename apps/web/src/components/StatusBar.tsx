import { useAppStore } from "../store/appStore";
import { ConnectionState } from "@mvp-voice-agent/shared";

export function StatusBar() {
  const {
    connectionState,
    fps,
    particleCount,
    latency,
    isMicSpeaking,
    isAssistantSpeaking
  } = useAppStore();

  const getConnectionColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return "text-green-400";
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return "text-yellow-400";
      case ConnectionState.FAILED:
        return "text-red-400";
      default:
        return "text-dark-text-muted";
    }
  };

  const getConnectionLabel = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return "Connected";
      case ConnectionState.CONNECTING:
        return "Connecting...";
      case ConnectionState.RECONNECTING:
        return "Reconnecting...";
      case ConnectionState.FAILED:
        return "Failed";
      default:
        return "Disconnected";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-dark-bg-secondary/90 backdrop-blur-sm border-t border-dark-border">
      <div className="container mx-auto px-4 py-3">
        {/* Status row */}
        <div className="flex items-center justify-between text-sm">
          {/* Left: Connection status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionColor()}`} />
              <span className={getConnectionColor()}>{getConnectionLabel()}</span>
            </div>

            {connectionState === ConnectionState.CONNECTED && (
              <>
                {/* Speaking indicators */}
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded text-xs ${isMicSpeaking ? "bg-warm-yellow/20 text-warm-yellow" : "text-dark-text-muted"}`}>
                    {isMicSpeaking ? "🎤 You're speaking" : "🎤 Mic ready"}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${isAssistantSpeaking ? "bg-warm-yellow/20 text-warm-yellow" : "text-dark-text-muted"}`}>
                    {isAssistantSpeaking ? "🤖 Assistant speaking" : "🤖 Listening"}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Performance metrics */}
          <div className="flex items-center gap-4 text-dark-text-secondary">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{fps} FPS</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <span>{(particleCount / 1000).toFixed(0)}k particles</span>
            </div>
            {latency > 0 && (
              <div className={`flex items-center gap-2 ${latency < 25 ? "text-green-400" : latency < 100 ? "text-yellow-400" : "text-red-400"}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{latency.toFixed(0)}ms</span>
              </div>
            )}
          </div>
        </div>

        {/* Hint */}
        {connectionState === ConnectionState.CONNECTED && !isMicSpeaking && !isAssistantSpeaking && (
          <div className="mt-2 text-center text-xs text-dark-text-muted">
            Ask me about: Journey Builder • Data Extensions • AMPscript • Email Studio • Deliverability
          </div>
        )}
      </div>
    </div>
  );
}
