import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useAppStore } from "../store/appStore";
import Blob from './Blob';
import Aurora from './Aurora';

/**
 * Audio-reactive blob visualization with Aurora background
 * Morphing 3D blob that responds to voice with organic deformations
 */
export function CometAnimation() {
  const assistantAudioTrack = useAppStore((state) => state.assistantAudioTrack);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset error state when component mounts
    setHasError(false);
  }, []);

  if (hasError) {
    // Fallback: Aurora background only
    return (
      <div className="fixed inset-0 w-full h-full">
        <Aurora
          colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full">
      {/* Aurora background layer */}
      <div className="absolute inset-0 z-0">
        <Aurora
          colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>

      {/* Blob on top */}
      <div className="absolute inset-0 z-10">
        <ErrorBoundary onError={() => setHasError(true)}>
          <Canvas
            camera={{ position: [0, 0, 8] }}
            gl={{ antialias: true, alpha: true }}
          >
            <Suspense fallback={null}>
              <Blob
                audioTrack={assistantAudioTrack}
                baseColor={0x00D9FF}
                noiseSpeed={0.4}
                intensityIdle={0.2}
                intensityHover={0.7}
                audioBoost={3.0}
                useFrequency={true}
                frequencyBand={[100, 3000]}
              />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      </div>
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
