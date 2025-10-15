import { useEffect, useRef, useState } from 'react';

type Options = {
  smoothing?: number;        // 0..1 Analyser smoothingTimeConstant
  fftSize?: number;          // power of 2, e.g. 1024
  useFrequency?: boolean;    // false = time-domain RMS; true = frequency band energy
  band?: [number, number];   // Hz range if useFrequency=true
  outputSmoothing?: number;  // extra UI smoothing 0..1
};

export function useAudioLevel(
  source: HTMLAudioElement | MediaStream | MediaStreamTrack | null,
  opts: Options = {}
) {
  const {
    smoothing = 0.85,
    fftSize = 1024,
    useFrequency = false,
    band,
    outputSmoothing = 0.2,
  } = opts;

  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!source) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.smoothingTimeConstant = smoothing;
    analyser.fftSize = fftSize;

    let node: MediaElementAudioSourceNode | MediaStreamAudioSourceNode;

    if (source instanceof HTMLAudioElement) {
      node = ctx.createMediaElementSource(source);
      node.connect(analyser);
      analyser.connect(ctx.destination); // route to output (ok for TTS)
    } else if (source instanceof MediaStreamTrack) {
      // Convert MediaStreamTrack to MediaStream
      const stream = new MediaStream([source]);
      node = ctx.createMediaStreamSource(stream);
      node.connect(analyser);
    } else {
      node = ctx.createMediaStreamSource(source);
      node.connect(analyser);
    }

    ctxRef.current = ctx;
    analyserRef.current = analyser;

    const dataTD = new Uint8Array(analyser.fftSize);
    const dataFD = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      const a = analyserRef.current;
      const c = ctxRef.current;
      if (!a || !c) return;

      let next = 0;
      if (!useFrequency) {
        a.getByteTimeDomainData(dataTD);
        let sum = 0;
        for (let i = 0; i < dataTD.length; i++) {
          const v = (dataTD[i] - 128) / 128; // -1..1
          sum += v * v;
        }
        next = Math.min(1, Math.max(0, Math.sqrt(sum / dataTD.length)));
      } else {
        a.getByteFrequencyData(dataFD);
        let from = 0, to = dataFD.length;
        if (band) {
          const nyquist = c.sampleRate / 2;
          const binHz = nyquist / dataFD.length;
          from = Math.max(0, Math.floor(band[0] / binHz));
          to   = Math.min(dataFD.length, Math.ceil(band[1] / binHz));
        }
        let sum = 0;
        for (let i = from; i < to; i++) sum += dataFD[i];
        next = Math.min(1, Math.max(0, (sum / Math.max(1, to - from)) / 255));
      }

      setLevel(prev => prev + (next - prev) * outputSmoothing);
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { analyser.disconnect(); } catch {}
      try { node.disconnect(); } catch {}
      try { ctx.close(); } catch {}
      analyserRef.current = null;
      ctxRef.current = null;
    };
  }, [source, smoothing, fftSize, useFrequency, band?.[0], band?.[1], outputSmoothing]);

  return level; // 0..1
}
