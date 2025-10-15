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

  return (
    <div className="fixed inset-0 w-full h-full">
      <Canvas camera={{ position: [0, 0, 8] }}>
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
      </Canvas>
    </div>
  );
}
