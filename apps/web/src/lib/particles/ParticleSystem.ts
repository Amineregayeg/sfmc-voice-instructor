import * as THREE from "three";
import { ParticleMode, type ParticleUniforms, PARTICLE_CONFIG, PERFORMANCE_CONFIG } from "@mvp-voice-agent/shared";
import { particleVertexShader, particleFragmentShader } from "./shaders.js";

export interface ParticleSystemConfig {
  particleCount?: number;
  adaptive?: boolean;
  onFpsUpdate?: (fps: number) => void;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particlesMesh: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;

  private config: Required<ParticleSystemConfig>;
  private particleCount: number;

  private uniforms: ParticleUniforms = {
    uTime: 0,
    uRms: 0,
    uPitch: 0,
    uOnset: 0,
    uMode: ParticleMode.IDLE,
    uBloomStrength: PARTICLE_CONFIG.bloomStrength,
    uColorWarm: PARTICLE_CONFIG.colorWarm
  };

  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private fpsInterval = 1000; // Update FPS every second

  private isWebGPUAvailable = false;

  constructor(canvas: HTMLCanvasElement, config: ParticleSystemConfig = {}) {
    this.config = {
      particleCount: config.particleCount || PARTICLE_CONFIG.count,
      adaptive: config.adaptive !== false,
      onFpsUpdate: config.onFpsUpdate || (() => {})
    };

    this.particleCount = this.config.particleCount;

    // Check for WebGPU support
    this.checkWebGPU();

    // Setup scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0f14);
    this.scene.fog = new THREE.FogExp2(0x0b0f14, 0.05);

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.z = 12;

    // Setup renderer (WebGL for now, WebGPU when stable)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });

    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.initParticles();

    console.log(`[ParticleSystem] Initialized with ${this.particleCount} particles (${this.isWebGPUAvailable ? "WebGPU" : "WebGL"})`);
  }

  private checkWebGPU() {
    // WebGPU check (currently not widely supported)
    this.isWebGPUAvailable = "gpu" in navigator;
    if (this.isWebGPUAvailable) {
      console.log("[ParticleSystem] WebGPU available (but using WebGL for compatibility)");
    }
  }

  private initParticles() {
    // Create geometry
    this.particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.particleCount * 3);
    const offsets = new Float32Array(this.particleCount * 3);
    const phases = new Float32Array(this.particleCount);
    const sizes = new Float32Array(this.particleCount);

    // Initialize particle attributes
    for (let i = 0; i < this.particleCount; i++) {
      // Spherical distribution
      const radius = 2 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      offsets[i * 3] = x;
      offsets[i * 3 + 1] = y;
      offsets[i * 3 + 2] = z;

      phases[i] = Math.random();
      sizes[i] = 3 + Math.random() * 2;
    }

    this.particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute("offset", new THREE.BufferAttribute(offsets, 3));
    this.particleGeometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    this.particleGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Create material
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRms: { value: 0 },
        uPitch: { value: 0 },
        uOnset: { value: 0 },
        uMode: { value: ParticleMode.IDLE },
        uBloomStrength: { value: PARTICLE_CONFIG.bloomStrength },
        uColorWarm: { value: new THREE.Vector3(...PARTICLE_CONFIG.colorWarm) }
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Create mesh
    this.particlesMesh = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particlesMesh);
  }

  updateUniforms(uniforms: Partial<ParticleUniforms>) {
    if (!this.particleMaterial) return;

    // Update internal state
    Object.assign(this.uniforms, uniforms);

    // Update shader uniforms
    if (uniforms.uRms !== undefined) {
      this.particleMaterial.uniforms.uRms.value = uniforms.uRms;
    }
    if (uniforms.uPitch !== undefined) {
      this.particleMaterial.uniforms.uPitch.value = uniforms.uPitch;
    }
    if (uniforms.uOnset !== undefined) {
      this.particleMaterial.uniforms.uOnset.value = uniforms.uOnset;
      // Decay onset over time
      setTimeout(() => {
        if (this.particleMaterial) {
          this.particleMaterial.uniforms.uOnset.value *= 0.5;
        }
      }, 100);
    }
    if (uniforms.uMode !== undefined) {
      this.particleMaterial.uniforms.uMode.value = uniforms.uMode;
    }
    if (uniforms.uBloomStrength !== undefined) {
      this.particleMaterial.uniforms.uBloomStrength.value = uniforms.uBloomStrength;
    }
  }

  setMode(mode: ParticleMode) {
    this.updateUniforms({ uMode: mode });
  }

  start() {
    if (this.animationId !== null) return;

    this.lastTime = performance.now();
    this.lastFpsUpdate = this.lastTime;
    this.frameCount = 0;

    const animate = (currentTime: number) => {
      this.animationId = requestAnimationFrame(animate);

      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      // Update time uniform
      if (this.particleMaterial) {
        this.particleMaterial.uniforms.uTime.value = currentTime / 1000;
      }

      // Rotate particles slightly
      if (this.particlesMesh) {
        this.particlesMesh.rotation.y += 0.0005;
      }

      // Render
      this.renderer.render(this.scene, this.camera);

      // FPS tracking
      this.frameCount++;
      if (currentTime - this.lastFpsUpdate >= this.fpsInterval) {
        const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
        this.config.onFpsUpdate(fps);
        this.frameCount = 0;
        this.lastFpsUpdate = currentTime;

        // Adaptive quality
        if (this.config.adaptive) {
          this.adjustQuality(fps);
        }
      }
    };

    animate(this.lastTime);
    console.log("[ParticleSystem] Animation started");
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      console.log("[ParticleSystem] Animation stopped");
    }
  }

  private adjustQuality(fps: number) {
    if (fps < PERFORMANCE_CONFIG.minFps && this.particleCount > PARTICLE_CONFIG.minCount) {
      // Reduce particles
      this.particleCount = Math.max(
        PARTICLE_CONFIG.minCount,
        this.particleCount - PARTICLE_CONFIG.adaptiveStep
      );
      console.log(`[ParticleSystem] Reduced particles to ${this.particleCount} (FPS: ${fps})`);
      this.reinitParticles();
    } else if (fps > PERFORMANCE_CONFIG.targetFps && this.particleCount < PARTICLE_CONFIG.maxCount) {
      // Increase particles
      this.particleCount = Math.min(
        PARTICLE_CONFIG.maxCount,
        this.particleCount + PARTICLE_CONFIG.adaptiveStep
      );
      console.log(`[ParticleSystem] Increased particles to ${this.particleCount} (FPS: ${fps})`);
      this.reinitParticles();
    }
  }

  private reinitParticles() {
    // Remove old mesh
    if (this.particlesMesh) {
      this.scene.remove(this.particlesMesh);
    }

    // Dispose old resources
    this.particleGeometry?.dispose();
    this.particleMaterial?.dispose();

    // Reinitialize with new count
    this.initParticles();
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.stop();

    if (this.particlesMesh) {
      this.scene.remove(this.particlesMesh);
    }

    this.particleGeometry?.dispose();
    this.particleMaterial?.dispose();
    this.renderer.dispose();

    console.log("[ParticleSystem] Disposed");
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getParticleCount(): number {
    return this.particleCount;
  }
}
