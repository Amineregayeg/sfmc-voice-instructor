import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useAppStore } from "../store/appStore";
import Blob from './Blob';

/**
 * Audio-reactive blob visualization
 * Morphing 3D blob that responds to voice with organic deformations
 */
export function CometAnimation() {
  const isAssistantSpeaking = useAppStore((state) => state.isAssistantSpeaking);
  const assistantAudioTrack = useAppStore((state) => state.assistantAudioTrack);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset error state when component mounts
    setHasError(false);
  }, []);

  if (hasError) {
    // Fallback: simple dark background
    return (
      <div className="fixed inset-0 w-full h-full bg-gradient-radial from-gray-900 to-black" />
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full">
      <ErrorBoundary onError={() => setHasError(true)}>
        <Canvas
          camera={{ position: [0, 0, 8] }}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <Blob
              audioTrack={isAssistantSpeaking ? assistantAudioTrack : null}
              baseColor={0x000000}
              noiseSpeed={0.4}
              intensityIdle={0.5}
              intensityHover={0.7}
              audioBoost={1.5}
              useFrequency={true}
              frequencyBand={[100, 3000]}
            />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}

// Simple error boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[CometAnimation] Error:', error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
