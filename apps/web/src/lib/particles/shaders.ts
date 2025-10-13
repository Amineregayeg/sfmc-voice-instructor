// Vertex shader for particle system
export const particleVertexShader = `
uniform float uTime;
uniform float uRms;
uniform float uPitch;
uniform float uOnset;
uniform float uMode; // 0=IDLE, 1=USER, 2=ASSISTANT
uniform float uBloomStrength;
uniform vec3 uColorWarm;

attribute vec3 offset;
attribute float phase;
attribute float size;

varying vec3 vColor;
varying float vAlpha;

// Noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec3 pos = offset;

  // Base rotation (slow breathing in idle)
  float rotSpeed = uMode == 0.0 ? 0.05 : (uMode == 1.0 ? 0.15 : 0.1);
  float angle = uTime * rotSpeed + phase * 6.28318;

  // Distance from center
  float dist = length(offset);

  // Mode-specific animation
  if (uMode == 1.0) {
    // USER mode: radial pulses with RMS
    float pulse = sin(dist * 3.0 - uTime * 2.0) * uRms * 0.3;
    pos *= 1.0 + pulse;

    // Onset creates burst
    float burstPhase = clamp(uOnset * 2.0, 0.0, 1.0);
    pos *= 1.0 + burstPhase * 0.2;

    // Pitch affects vertical movement
    float pitchNorm = clamp(uPitch / 300.0, 0.0, 1.0);
    pos.y += sin(uTime * 3.0 + phase) * pitchNorm * 0.5;

  } else if (uMode == 2.0) {
    // ASSISTANT mode: flowing waves
    float wave = snoise(vec2(pos.x * 0.5 + uTime * 0.3, pos.z * 0.5));
    pos.y += wave * uRms * 1.5;

    // Orbital flow
    float orbitRadius = dist * (1.0 + uRms * 0.3);
    pos.x = cos(angle) * orbitRadius;
    pos.z = sin(angle) * orbitRadius;

  } else {
    // IDLE mode: gentle breathing
    float breathe = sin(uTime * 0.5 + dist * 0.5) * 0.1;
    pos *= 1.0 + breathe;
  }

  // Apply position
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size attenuation
  float sizeFactor = uMode == 0.0 ? 1.0 : (1.0 + uRms * 1.5);
  gl_PointSize = size * sizeFactor * (300.0 / -mvPosition.z);

  // Color based on mode and energy
  vec3 baseColor = uColorWarm;
  float energyBoost = uMode == 0.0 ? 0.5 : (0.7 + uRms * 0.3);

  if (uMode == 1.0) {
    // User: bright yellow with orange tint on high energy
    vec3 highEnergyColor = vec3(1.0, 0.8, 0.3);
    vColor = mix(baseColor, highEnergyColor, uRms);
  } else if (uMode == 2.0) {
    // Assistant: cooler warm tones
    vec3 coolWarm = vec3(0.95, 0.85, 0.5);
    vColor = mix(baseColor, coolWarm, uRms * 0.5);
  } else {
    // Idle: subtle base color
    vColor = baseColor * 0.6;
  }

  vColor *= energyBoost * uBloomStrength;

  // Alpha based on distance and energy
  float alpha = 1.0 - (dist / 10.0);
  alpha *= (0.6 + uRms * 0.4);
  vAlpha = clamp(alpha, 0.1, 1.0);
}
`;

// Fragment shader for particle system
export const particleFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Circular particle shape with soft edges
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  if (dist > 0.5) {
    discard;
  }

  // Soft falloff
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  alpha *= vAlpha;

  // Add glow
  float glow = exp(-dist * 4.0);
  vec3 color = vColor * (0.7 + glow * 0.3);

  gl_FragColor = vec4(color, alpha);
}
`;

// WebGPU compute shader for particle update (simplified - WebGPU not fully supported yet)
export const particleComputeShader = `
struct Particle {
  position: vec3<f32>,
  velocity: vec3<f32>,
  phase: f32,
  size: f32
}

struct Uniforms {
  time: f32,
  rms: f32,
  pitch: f32,
  onset: f32,
  mode: f32,
  deltaTime: f32
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&particles)) {
    return;
  }

  var particle = particles[index];

  // Update particle based on mode
  // (Simplified - full implementation would go here)

  particles[index] = particle;
}
`;
