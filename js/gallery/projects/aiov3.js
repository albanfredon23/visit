import * as THREE from 'three';
import { add, glow, glass, plinth, sign, rbox, mat, seeded, slogan } from '../kit.js';

// AIO v3, the agent runtime and reliability layer: requests fall through stacked layers
// (routing, semantic cache, guardrails, validation, memory, observability). A blocked request
// bounces off the guardrail in red and retries; at the bottom a circuit breaker keeps one
// failing provider switched off.
const C = { bg: '#0f1117', card: '#1a1d2e', accent: '#6366f1', green: '#22c55e', red: '#ef4444', yellow: '#f59e0b', text: '#e2e8f0' };
const LAYERS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#38bdf8', '#a78bfa'];

function drawLogo(g, x, y, s) {
  g.fillStyle = C.card; g.beginPath(); g.roundRect(x, y, s, s, s * 0.22); g.fill();
  LAYERS.slice(0, 4).forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.roundRect(x + s * 0.2, y + s * (0.2 + i * 0.16), s * 0.6, s * 0.1, s * 0.04); g.fill(); });
}

export function aiov3() {
  const group = new THREE.Group();
  const rnd = seeded(3);
  plinth(group, { bg: C.bg, accent: C.accent });
  const label = sign(group, { name: 'AIO v3', tagline: slogan('aiov3'), bg: C.bg, accent: C.accent, text: C.text, muted: '#94a3b8', drawLogo, y: 2.3 });

  // stacked layers
  const layers = LAYERS.map((c, i) => {
    const y = 1.55 - i * 0.24;
    add(group, rbox(1.0, 0.035, 1.0, 0.02), glass('#c7d2fe', { opacity: 0.16 }), [0, y, 0]).castShadow = false;
    const edge = add(group, new THREE.TorusGeometry(0.62, 0.008, 6, 4), glow(c, 1.5), [0, y, 0], [Math.PI / 2, 0, Math.PI / 4]);
    edge.scale.set(1.14, 1.14, 1); edge.castShadow = false;
    return { y, edge };
  });
  // pillars holding the stack
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) add(group, new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8), mat('#2d3148', { metalness: 0.6, roughness: 0.3 }), [x, 0.85, z]);

  // providers behind the circuit breaker
  const providers = [-0.35, 0, 0.35].map((x, i) => {
    const p = add(group, rbox(0.22, 0.18, 0.22, 0.03), mat(C.card, { roughness: 0.4 }), [x, 0.2, 0]);
    const lamp = add(group, new THREE.SphereGeometry(0.035, 16, 12), glow(i === 2 ? C.red : C.green, 2.2), [x, 0.33, 0]);
    lamp.castShadow = false;
    return { p, lamp };
  });

  // requests
  const packets = [];
  for (let i = 0; i < 9; i++) {
    const m = add(group, new THREE.SphereGeometry(0.035, 16, 12), glow(C.text, 1.8), [0, 0, 0]);
    m.castShadow = false;
    packets.push({ m, t: i / 9, x: (rnd() - 0.5) * 0.6, z: (rnd() - 0.5) * 0.6, blocked: i % 4 === 1, target: i % 2 });
  }

  return {
    group, frame: { target: new THREE.Vector3(0, 0.95, 0), dist: 3.5, pitch: 0.3, yaw: 0.6 },
    update(dt, t, camera) {
      label.face(camera);
      layers.forEach((l, i) => { l.edge.material.emissiveIntensity = 1 + 0.8 * Math.max(0, Math.sin(t * 2 - i * 0.7)); });
      providers[2].lamp.material.emissiveIntensity = Math.sin(t * 8) > 0 ? 2.4 : 0.4;
      for (const p of packets) {
        p.t = (p.t + dt * 0.18) % 1;
        const u = p.t, m = p.m;
        const topY = 1.85, guardY = layers[2].y;
        if (p.blocked && u > 0.3 && u < 0.5) { // bounce off the guardrail, turn red, then retry
          const v = (u - 0.3) / 0.2;
          m.position.set(p.x, guardY + 0.05 + Math.sin(v * Math.PI) * 0.25, p.z);
          m.material.color.set(C.red); m.material.emissive.set(C.red);
        } else {
          const dest = providers[p.target];
          const v = p.blocked ? (u < 0.3 ? u / 0.3 * 0.42 : 0.42 + (u - 0.5) / 0.5 * 0.58) : u;
          m.position.set(THREE.MathUtils.lerp(p.x, dest.p.position.x, v * v), THREE.MathUtils.lerp(topY, 0.33, v), THREE.MathUtils.lerp(p.z, 0, v * v));
          const col = v > 0.92 ? C.green : C.text;
          m.material.color.set(col); m.material.emissive.set(col);
        }
      }
    },
  };
}
