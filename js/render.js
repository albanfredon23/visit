import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Film-like finish: soft vignette and a whisper of grain, applied after tone mapping.
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vignette: { value: 0.32 }, grain: { value: 0.025 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, vignette, grain; varying vec2 vUv;
    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233)) + time) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - vignette * smoothstep(0.25, 0.85, length(d) * 1.35);
      c.rgb += (rand(vUv) - 0.5) * grain;
      gl_FragColor = c;
    }`,
};

// Quality tiers. The visit starts high on desktop, medium on phones,
// and steps down by itself if the frame rate drops.
const TIERS = [
  { pr: 1, shadow: 1024, bloom: false, samples: 0 },
  { pr: 1.5, shadow: 1024, bloom: true, samples: 2 },
  { pr: 2, shadow: 2048, bloom: true, samples: 4 },
];

export function createRenderer(canvas) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  let tier = coarse ? 1 : 2;
  let composer, renderPass, bloom, finish;
  const shadowLights = [];

  function build() {
    const t = TIERS[tier];
    composer?.dispose();
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: t.samples });
    composer = new EffectComposer(renderer, rt);
    const prevScene = renderPass?.scene, prevCam = renderPass?.camera;
    renderPass = new RenderPass(prevScene, prevCam);
    composer.addPass(renderPass);
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.55, 0.88);
    bloom.enabled = t.bloom;
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    finish = new ShaderPass(FinishShader);
    composer.addPass(finish);
    resize();
  }

  function resize() {
    const t = TIERS[tier];
    renderer.setPixelRatio(Math.min(devicePixelRatio, t.pr));
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setPixelRatio(Math.min(devicePixelRatio, t.pr));
    composer.setSize(innerWidth, innerHeight);
  }

  function applyShadowSize() {
    const s = TIERS[tier].shadow;
    for (const l of shadowLights) if (l.shadow.mapSize.x > s) { l.shadow.mapSize.set(s, s); l.shadow.map?.dispose(); l.shadow.map = null; }
  }

  // frame-time watchdog: average over ~2 s, drop one tier when it stays slow
  let acc = 0, frames = 0, cooldown = 3;
  function watch(dt) {
    cooldown -= dt; acc += dt; frames++;
    if (acc < 2) return;
    const avg = acc / frames; acc = 0; frames = 0;
    if (cooldown < 0 && avg > 1 / 42 && tier > 0) { tier--; cooldown = 4; build(); applyShadowSize(); }
  }

  build();

  return {
    renderer, environment,
    setView(scene, camera) { renderPass.scene = scene; renderPass.camera = camera; },
    render(dt, t) { finish.uniforms.time.value = t % 100; composer.render(dt); watch(dt); },
    resize,
    trackShadows(...lights) { shadowLights.push(...lights); applyShadowSize(); },
    tier: () => tier,
  };
}
