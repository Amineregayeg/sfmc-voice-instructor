import { useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";
import { SphereParticleSystem, type SpeakerMode } from "../lib/particles/SphereParticles";

/**
 * Spherical starfield particle visualization
 * Dense dot cloud with sun-like glow responding to voice
 */
export function CometAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<SphereParticleSystem | null>(null);

  const micFeatures = useAppStore((state) => state.micFeatures);
  const assistantFeatures = useAppStore((state) => state.assistantFeatures);
  const isMicSpeaking = useAppStore((state) => state.isMicSpeaking);
  const isAssistantSpeaking = useAppStore((state) => state.isAssistantSpeaking);

  // Initialize particle system
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('[CometAnimation] Initializing particle system');
    const canvas = canvasRef.current;

    // Ensure canvas has proper dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particleSystem = new SphereParticleSystem(canvas);
    particleSystemRef.current = particleSystem;

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particleSystem.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      particleSystem.dispose();
    };
  }, []);

  // Update mode based on speaking state
  useEffect(() => {
    if (!particleSystemRef.current) return;

    let mode: SpeakerMode = "IDLE";
    if (isMicSpeaking) {
      mode = "USER";
    } else if (isAssistantSpeaking) {
      mode = "AGENT";
    }

    particleSystemRef.current.setMode(mode);
  }, [isMicSpeaking, isAssistantSpeaking]);

  // Update from user features
  useEffect(() => {
    if (particleSystemRef.current && micFeatures && isMicSpeaking) {
      particleSystemRef.current.updateFromUser(micFeatures);
    }
  }, [micFeatures, isMicSpeaking]);

  // Update from assistant features
  useEffect(() => {
    if (particleSystemRef.current && assistantFeatures && isAssistantSpeaking) {
      particleSystemRef.current.updateFromAgent(assistantFeatures);
    }
  }, [assistantFeatures, isAssistantSpeaking]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
