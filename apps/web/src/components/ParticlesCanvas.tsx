import { useEffect, useRef } from "react";
import { ParticleSystem } from "../lib/particles/ParticleSystem";
import { useAppStore } from "../store/appStore";
import { ParticleMode } from "@mvp-voice-agent/shared";

export function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);

  const particleMode = useAppStore((state) => state.particleMode);
  const micFeatures = useAppStore((state) => state.micFeatures);
  const assistantFeatures = useAppStore((state) => state.assistantFeatures);
  const setFps = useAppStore((state) => state.setFps);
  const setParticleCount = useAppStore((state) => state.setParticleCount);

  // Initialize particle system
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const particleSystem = new ParticleSystem(canvas, {
      adaptive: true,
      onFpsUpdate: (fps) => {
        setFps(fps);
        setParticleCount(particleSystem.getParticleCount());
      }
    });

    particleSystemRef.current = particleSystem;
    particleSystem.start();

    // Handle resize
    const handleResize = () => {
      if (canvas && particleSystem) {
        particleSystem.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      particleSystem.stop();
      particleSystem.dispose();
    };
  }, [setFps, setParticleCount]);

  // Update particle mode
  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setMode(particleMode);
    }
  }, [particleMode]);

  // Update with mic features
  useEffect(() => {
    if (particleSystemRef.current && micFeatures && particleMode === ParticleMode.USER) {
      particleSystemRef.current.updateUniforms({
        uRms: micFeatures.rms,
        uPitch: micFeatures.pitch,
        uOnset: micFeatures.onset ? 1.0 : 0.0
      });
    }
  }, [micFeatures, particleMode]);

  // Update with assistant features
  useEffect(() => {
    if (particleSystemRef.current && assistantFeatures && particleMode === ParticleMode.ASSISTANT) {
      particleSystemRef.current.updateUniforms({
        uRms: assistantFeatures.rms,
        uPitch: assistantFeatures.pitch,
        uOnset: assistantFeatures.onset ? 1.0 : 0.0
      });
    }
  }, [assistantFeatures, particleMode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      width={window.innerWidth}
      height={window.innerHeight}
    />
  );
}
