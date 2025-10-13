// AudioWorklet processor for real-time audio analysis
// Provides RMS, peak, onset detection, and basic pitch estimation

class AudioAnalyzerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Analysis parameters
    this.bufferSize = 128;
    this.fftSize = 2048;
    this.sampleRate = 24000;

    // Feature history for smoothing
    this.rmsHistory = [];
    this.rmsHistorySize = 5;

    // Onset detection
    this.previousRms = 0;
    this.onsetThreshold = 0.15;

    // VAD (Voice Activity Detection)
    this.vadThreshold = 0.02;
    this.silenceFrames = 0;
    this.speechFrames = 0;
    this.minSpeechFrames = 3;
    this.minSilenceFrames = 10;
    this.isSpeaking = false;

    // Pitch detection (simplified autocorrelation)
    this.pitchBuffer = new Float32Array(this.fftSize);
    this.pitchBufferIndex = 0;

    // Timestamp
    this.startTime = currentTime;
  }

  // Calculate RMS (Root Mean Square) energy
  calculateRMS(input) {
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i];
    }
    return Math.sqrt(sum / input.length);
  }

  // Calculate peak amplitude
  calculatePeak(input) {
    let peak = 0;
    for (let i = 0; i < input.length; i++) {
      const abs = Math.abs(input[i]);
      if (abs > peak) peak = abs;
    }
    return peak;
  }

  // Smooth RMS using history
  smoothRMS(rms) {
    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > this.rmsHistorySize) {
      this.rmsHistory.shift();
    }

    const sum = this.rmsHistory.reduce((a, b) => a + b, 0);
    return sum / this.rmsHistory.length;
  }

  // Detect onset (sudden increase in energy)
  detectOnset(currentRms) {
    const delta = currentRms - this.previousRms;
    const onset = delta > this.onsetThreshold;
    this.previousRms = currentRms;
    return onset;
  }

  // Voice Activity Detection
  updateVAD(rms) {
    if (rms > this.vadThreshold) {
      this.speechFrames++;
      this.silenceFrames = 0;

      if (this.speechFrames >= this.minSpeechFrames) {
        this.isSpeaking = true;
      }
    } else {
      this.silenceFrames++;
      this.speechFrames = 0;

      if (this.silenceFrames >= this.minSilenceFrames) {
        this.isSpeaking = false;
      }
    }
  }

  // Simple pitch estimation using autocorrelation
  estimatePitch(input) {
    // Fill pitch buffer
    for (let i = 0; i < input.length; i++) {
      this.pitchBuffer[this.pitchBufferIndex] = input[i];
      this.pitchBufferIndex = (this.pitchBufferIndex + 1) % this.fftSize;
    }

    // Skip pitch detection if not enough energy
    const rms = this.calculateRMS(input);
    if (rms < this.vadThreshold) {
      return 0;
    }

    // Autocorrelation
    const minLag = Math.floor(this.sampleRate / 500); // 500 Hz max
    const maxLag = Math.floor(this.sampleRate / 80);  // 80 Hz min

    let maxCorrelation = 0;
    let bestLag = 0;

    for (let lag = minLag; lag < maxLag && lag < this.fftSize / 2; lag++) {
      let correlation = 0;
      for (let i = 0; i < this.fftSize / 2; i++) {
        const idx1 = (this.pitchBufferIndex + i) % this.fftSize;
        const idx2 = (this.pitchBufferIndex + i + lag) % this.fftSize;
        correlation += this.pitchBuffer[idx1] * this.pitchBuffer[idx2];
      }

      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }

    // Convert lag to frequency
    return bestLag > 0 ? this.sampleRate / bestLag : 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (!input || !input[0]) {
      return true;
    }

    const samples = input[0];

    // Calculate features
    const rawRms = this.calculateRMS(samples);
    const rms = this.smoothRMS(rawRms);
    const peak = this.calculatePeak(samples);
    const onset = this.detectOnset(rms);
    const pitch = this.estimatePitch(samples);

    // Update VAD
    this.updateVAD(rms);

    // Send features to main thread
    this.port.postMessage({
      rms: Math.min(rms, 1.0),
      peak: Math.min(peak, 1.0),
      pitch: Math.max(0, Math.min(pitch, 500)),
      onset: onset,
      speaking: this.isSpeaking,
      ts: currentTime - this.startTime
    });

    return true;
  }
}

registerProcessor('audio-analyzer', AudioAnalyzerProcessor);
