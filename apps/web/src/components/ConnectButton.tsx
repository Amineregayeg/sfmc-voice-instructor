import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { ConnectionState } from "@mvp-voice-agent/shared";

interface ConnectButtonProps {
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function ConnectButton({ onConnect, onDisconnect }: ConnectButtonProps) {
  const { connectionState, isConnected, micMuted, toggleMicMute } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    setIsProcessing(true);
    try {
      if (isConnected) {
        await onDisconnect();
      } else {
        await onConnect();
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonText = () => {
    if (isProcessing) return "Processing...";
    if (connectionState === ConnectionState.CONNECTING) return "Connecting...";
    if (connectionState === ConnectionState.RECONNECTING) return "Reconnecting...";
    if (isConnected) return "Disconnect";
    return "Connect";
  };

  const isDisabled = isProcessing || connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING;

  // Show big connect button only when not connected
  if (!isConnected) {
    return (
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-4">
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className={`px-8 py-4 rounded-2xl text-lg font-bold transition-all transform bg-warm-yellow hover:bg-warm-yellow-glow text-dark-bg shadow-lg shadow-warm-yellow/50 animate-glow ${
            isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95"
          }`}
        >
          {getButtonText()}
        </button>

        {/* Connection state message */}
        {connectionState === ConnectionState.FAILED && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg px-4 py-2 text-red-400 text-sm">
            Connection failed. Please try again.
          </div>
        )}
      </div>
    );
  }

  // When connected, show minimal controls at bottom
  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3">
      {/* Mic mute toggle */}
      <button
        onClick={toggleMicMute}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
          micMuted
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-white/10 text-dark-text hover:bg-white/20"
        }`}
        title={micMuted ? "Unmute" : "Mute"}
      >
        {micMuted ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Disconnect button */}
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm bg-red-500/20 text-red-400 hover:bg-red-500/30"
        title="Disconnect"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
