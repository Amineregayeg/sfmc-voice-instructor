import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export type SpeakerMode = "IDLE" | "USER" | "AGENT";

export interface AudioFeatures {
  rms: number;      // 0..1
  peak: number;     // 0..1
  pitch: number;    // Hz or 0
  onset: boolean;   // transient
  speaking: boolean;
}

export interface ParticleController {
  setMode(mode: SpeakerMode): void;
  updateFromUser(features: AudioFeatures): void;
  updateFromAgent(features: AudioFeatures): void;
  resize(w: number, h: number): void;
  dispose(): void;
}

const PARTICLE_COUNT = 50000; // 50k particles (adaptive 20k-80k)
const SPHERE_RADIUS = 1.0;

// Colors in linear RGB
const COLOR_IDLE = new THREE.Vector3(0.94, 0.90, 0.82);   // #F0E6D2 champagne
const COLOR_USER = new THREE.Vector3(1.00, 0.85, 0.30);   // #FFD84D sun yellow
const COLOR_AGENT = new THREE.Vector3(0.90, 0.72, 0.00);  // #E6B800 warm amber

// Vertex shader
const vertexShader = `
uniform float uTime;
uniform int uMode;
uniform float uRms;
uniform float uOnset;
uniform float uBreath;

attribute float aSeed;

varying float vLuma;

// Simple 3D noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec3 p = normalize(position);

  // Smooth RMS (passed from JS already smoothed)
  float smoothRms = uRms;

  // Add living surface noise
  float noiseAmp = (uMode == 0) ? 0.02 : 0.05;
  vec3 noisePos = p * 3.0 + uTime * 0.25;
  vec3 noise = vec3(
    snoise(noisePos),
    snoise(noisePos + vec3(10.0)),
    snoise(noisePos + vec3(20.0))
  );
  p += noiseAmp * noise;

  // Radial pulsation when speaking
  if (uMode > 0) {
    float pulse = 1.0 + 0.06 * smoothRms + 0.08 * uOnset;
    p *= pulse;
  }

  // Agent mode: orbital swirl
  if (uMode == 2) {
    float omega = 0.3 + 0.7 * smoothRms;
    float angle = uTime * omega + aSeed * 6.28318;
    float c = cos(angle * 0.1);
    float s = sin(angle * 0.1);

    // Rotate around Y with slight X tilt
    mat3 rotY = mat3(
      c, 0.0, s,
      0.0, 1.0, 0.0,
      -s, 0.0, c
    );
    p = rotY * p;
  }

  // Idle breathing
  if (uMode == 0) {
    p *= 1.0 + uBreath * 0.03;
  }

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Point size with speaking boost
  float baseSize = 1.2;
  float speakingBoost = (uMode > 0) ? (1.0 + 2.5 * smoothRms) : 1.0;
  gl_PointSize = baseSize * speakingBoost * (300.0 / -mvPosition.z);
  gl_PointSize = min(gl_PointSize, 8.0); // Cap to avoid aliasing

  // Luminance for fragment shader
  vLuma = 0.6 + 0.9 * smoothRms + 0.4 * uOnset;
}
`;

// Fragment shader
const fragmentShader = `
uniform int uMode;
uniform float uOnset;
uniform vec3 uColorIdle;
uniform vec3 uColorUser;
uniform vec3 uColorAgent;

varying float vLuma;

void main() {
  // Soft round sprite
  vec2 center = gl_PointCoord - vec2(0.5);
  float r = length(center);

  if (r > 0.5) discard;

  float alpha = smoothstep(0.55, 0.0, r);

  // Color by mode
  vec3 baseColor = (uMode == 1) ? uColorUser :
                   (uMode == 2) ? uColorAgent : uColorIdle;

  // Emission model
  vec3 emissive = baseColor * vLuma;

  // Optional chromatic jitter on onsets (subtle sparkle)
  if (uOnset > 0.5) {
    emissive *= 1.0 + 0.1 * uOnset;
  }

  gl_FragColor = vec4(emissive, alpha);
}
`;

export class SphereParticleSystem implements ParticleController {
  private scene: THREE.Scene;
  private bgScene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private bgCamera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private points: THREE.Points;
  private material: THREE.ShaderMaterial;

  private mode: SpeakerMode = "IDLE";
  private currentFeatures: AudioFeatures = { rms: 0, peak: 0, pitch: 0, onset: false, speaking: false };

  // Smoothing
  private smoothRms = 0;
  private onsetLevel = 0;
  private breathPhase = 0;

  // Cross-fade for mode switching
  private modeTransition = 1.0; // 0=old mode, 1=new mode
  private oldRms = 0;

  private animationId: number | null = null;
  private startTime = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    console.log('[SphereParticles] Constructor called', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    });

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    this.camera.position.z = 3.2;

    console.log('[SphereParticles] Camera position:', this.camera.position);

    // Background scene (fullscreen quad)
    this.bgScene = new THREE.Scene();
    this.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const bgGeometry = new THREE.PlaneGeometry(2, 2);
    const bgMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          vec2 center = vUv - vec2(0.5);
          float dist = length(center);
          vec3 color1 = vec3(0.043, 0.059, 0.078); // #0b0f14
          vec3 color2 = vec3(0.082, 0.102, 0.125); // #151a20
          vec3 color = mix(color1, color2, dist);

          // Vignette
          float vignette = 1.0 - dist * 0.5;
          color *= vignette;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    this.bgScene.add(bgMesh);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NoToneMapping; // Don't crush highlights
    this.renderer.autoClear = false; // Manual clear for multi-scene rendering

    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    renderPass.clear = false; // Don't clear, we render background first
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
      0.35,  // strength
      0.4,   // radius
      0.85   // threshold
    );
    this.composer.addPass(bloomPass);

    // Create particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT);

    // Fibonacci sphere distribution
    const phi = Math.PI * (3.0 - Math.sqrt(5.0)); // Golden angle

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2; // -1 to 1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Jitter slightly for organic look
      const jitter = 0.02;
      positions[i * 3] = (x + (Math.random() - 0.5) * jitter) * SPHERE_RADIUS;
      positions[i * 3 + 1] = (y + (Math.random() - 0.5) * jitter) * SPHERE_RADIUS;
      positions[i * 3 + 2] = (z + (Math.random() - 0.5) * jitter) * SPHERE_RADIUS;

      seeds[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    // Material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMode: { value: 0 }, // 0=IDLE, 1=USER, 2=AGENT
        uRms: { value: 0 },
        uPeak: { value: 0 },
        uPitch: { value: 0 },
        uOnset: { value: 0 },
        uBreath: { value: 0.5 },
        uBloomStrength: { value: 0.08 },
        uColorIdle: { value: COLOR_IDLE },
        uColorUser: { value: COLOR_USER },
        uColorAgent: { value: COLOR_AGENT }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });

    this.points = new THREE.Points(geometry, this.material);
    this.scene.add(this.points);

    // Start animation
    this.animate();

    console.log(`[SphereParticles] Initialized with ${PARTICLE_COUNT} particles`);
    console.log(`[SphereParticles] Scene has ${this.scene.children.length} children`);
    console.log(`[SphereParticles] Points geometry has ${this.points.geometry.attributes.position.count} points`);
  }

  private animateFrameCount = 0;
  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = (performance.now() - this.startTime) / 1000;

    // Debug first few frames
    if (this.animateFrameCount < 5) {
      console.log(`[SphereParticles] Frame ${this.animateFrameCount}, time=${currentTime.toFixed(2)}s, mode=${this.mode}, rms=${this.smoothRms.toFixed(3)}`);
      this.animateFrameCount++;
    }

    // Update breathing for idle
    this.breathPhase = 0.5 + 0.5 * Math.sin(currentTime * 0.3);

    // Smooth RMS (exponential moving average)
    const alphaUp = 0.2;
    const alphaDown = 0.08;
    const targetRms = this.currentFeatures.rms;
    const alpha = targetRms > this.smoothRms ? alphaUp : alphaDown;
    this.smoothRms += (targetRms - this.smoothRms) * alpha;

    // Onset decay
    if (this.currentFeatures.onset) {
      this.onsetLevel = 1.0;
    } else {
      this.onsetLevel *= 0.85; // Decay per frame
    }

    // Mode transition cross-fade
    if (this.modeTransition < 1.0) {
      this.modeTransition = Math.min(1.0, this.modeTransition + 0.05); // 0.25s at 60fps
    }

    // Blend RMS during transition
    const blendedRms = this.modeTransition < 1.0
      ? this.oldRms * (1 - this.modeTransition) + this.smoothRms * this.modeTransition
      : this.smoothRms;

    // Bloom strength based on mode
    let bloomStrength = 0.08;
    if (this.mode !== "IDLE") {
      bloomStrength = 0.08 + (0.35 - 0.08) * blendedRms;
    }

    // Update uniforms
    this.material.uniforms.uTime.value = currentTime;
    this.material.uniforms.uMode.value = this.mode === "IDLE" ? 0 : this.mode === "USER" ? 1 : 2;
    this.material.uniforms.uRms.value = blendedRms;
    this.material.uniforms.uPeak.value = this.currentFeatures.peak;
    this.material.uniforms.uPitch.value = this.currentFeatures.pitch;
    this.material.uniforms.uOnset.value = this.onsetLevel;
    this.material.uniforms.uBreath.value = this.breathPhase;
    this.material.uniforms.uBloomStrength.value = bloomStrength;

    // Render: Background first, then particles with bloom
    this.renderer.clear();
    this.renderer.render(this.bgScene, this.bgCamera);
    this.composer.render();
  };

  setMode(mode: SpeakerMode): void {
    if (this.mode !== mode) {
      this.oldRms = this.smoothRms;
      this.modeTransition = 0; // Start cross-fade
      this.mode = mode;
      console.log(`[SphereParticles] Mode: ${mode}`);
    }
  }

  updateFromUser(features: AudioFeatures): void {
    this.currentFeatures = features;
  }

  updateFromAgent(features: AudioFeatures): void {
    this.currentFeatures = features;
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.renderer.dispose();
    console.log("[SphereParticles] Disposed");
  }
}
