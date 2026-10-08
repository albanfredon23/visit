import * as THREE from 'three';
import { add, plinth, sign, seeded, slogan, dot, label } from '../kit.js';

// AIOTECH MCP, the scene from its own site, scaled down: a stream of tokens crosses six gates
// (guardrails, ARG, cache, routing, circuit breaker, LLM). Blocked requests bounce back in red, useless
// documents are dropped at the ARG, cached answers rise into the cache, and what remains is routed
// to the cheap or the flagship model. No spheres, as on the site: frames, lines and light.
const C = { ink: '#0e1319', panel: '#151b23', signal: '#f0b24a', save: '#2aa889', raw: '#6f9fd8', frame: '#56708f' };
const SX = 0.035, SR = 0.07, Y = 0.95; // site units along the flow / across it, height of the flow
const GATES = [
  { x: -24, name: { fr: 'Garde-fous', en: 'Guardrails' } }, { x: -12, name: 'ARG' }, { x: -2, name: 'Cache' },
  { x: 8, name: { fr: 'Routage', en: 'Routing' } }, { x: 16, name: { fr: 'Disjoncteur', en: 'Breaker' } }, { x: 26, name: 'LLM' },
];
const X0 = -44, X1 = 40, OUT_X = 34;
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function drawLogo(g, x, y, s) {
  g.fillStyle = C.panel; g.beginPath(); g.roundRect(x, y, s, s, s * 0.22); g.fill();
  g.strokeStyle = C.signal; g.lineWidth = s * 0.06;
  for (let i = 0; i < 3; i++) { const k = 0.22 + i * 0.2; g.strokeRect(x + s * k, y + s * 0.26, s * 0.12, s * 0.48); }
  g.fillStyle = C.save; g.fillRect(x + s * 0.12, y + s * 0.47, s * 0.76, s * 0.06);
}

export function aiotech() {
  const group = new THREE.Group();
  const rnd = seeded(46);
  plinth(group, { bg: C.ink, accent: C.signal });
  const title = sign(group, { name: 'AIOTECH MCP', tagline: slogan('aiotech'), bg: C.ink, accent: C.signal, text: '#e7ecf2', muted: '#b4bfcc', drawLogo });

  // gates: square frames in the YZ plane, with the ARG lattice, the cache box and the two LLM cores
  const flow = new THREE.Group(); flow.position.y = Y; group.add(flow);
  const frameMat = new THREE.LineBasicMaterial({ color: C.frame, transparent: true, opacity: 0.8 });
  const glowMat = new THREE.LineBasicMaterial({ color: C.signal, transparent: true, opacity: 0.9 });
  const seg = (pts, m = frameMat) => { const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), m); flow.add(l); return l; };
  const cores = [];
  GATES.forEach((g, i) => {
    const x = g.x * SX, h = 4.6 * SR;
    if (i < 5) {
      const P = (y, z) => new THREE.Vector3(x, y, z);
      seg([P(-h, -h), P(h, -h), P(h, -h), P(h, h), P(h, h), P(-h, h), P(-h, h), P(-h, -h)], i === 0 ? glowMat : frameMat);
      const tick = [];
      for (const [sy, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) tick.push(P(sy * (h + 0.04), sz * h), P(sy * h, sz * h), P(sy * h, sz * (h + 0.04)), P(sy * h, sz * h));
      seg(tick);
      add(flow, new THREE.PlaneGeometry(2 * h, 2 * h), new THREE.MeshBasicMaterial({ color: C.raw, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }), [x, 0, 0], [0, Math.PI / 2, 0]).castShadow = false;
      if (i === 1) { const lat = []; for (let k = -3; k <= 3; k++) { const v = (k / 3.5) * h; lat.push(P(v, -h), P(v, h), P(-h, v), P(h, v)); } seg(lat, new THREE.LineBasicMaterial({ color: C.frame, transparent: true, opacity: 0.35 })); }
      if (i === 2) { const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2 * SR, 1.6 * SR, 2.2 * SR)), new THREE.LineBasicMaterial({ color: C.save })); box.position.set(x, h + 3.2 * SR, 0); flow.add(box); }
    } else {
      for (const [s, y, col] of [[2.2, -1.8, C.save], [3.2, 1.8, C.raw], [1.4, -1.8, C.save], [2.2, 1.8, C.raw]]) {
        const m = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s * SR, s * SR, s * SR)), new THREE.LineBasicMaterial({ color: col }));
        m.position.set(x, y * SR, 0); flow.add(m); cores.push(m);
      }
    }
    label(flow, g.name, { pos: [x, -(4.6 * SR) - 0.07, 0], color: i === 5 ? '#f3c26b' : '#c9d4e2' });
  });

  // the token stream
  const N = 520, P = new Float32Array(N * 3), CL = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(CL, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.02, map: dot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  points.frustumCulled = false; flow.add(points);
  const K = { query: new THREE.Color('#e6edf6'), doc: new THREE.Color('#7fb0ea'), amber: new THREE.Color('#e0a540'), out: new THREE.Color('#f3c26b'),
    dim: new THREE.Color('#3a4554'), aqua: new THREE.Color(C.save), red: new THREE.Color('#d03b3b') };
  const st = Array.from({ length: N }, () => ({}));
  const spawn = (s, x) => {
    const r = Math.sqrt(rnd()), th = rnd() * Math.PI * 2;
    s.oy = r * Math.cos(th); s.oz = r * Math.sin(th); s.sp = 6 + rnd() * 2.4;
    const u = rnd(); s.kind = u < 0.03 ? 2 : u < 0.3 ? 0 : 1; // 2 = blocked, 0 = query, 1 = document
    s.keep = s.kind === 0 || rnd() < 0.15; s.cached = rnd() < 0.15; s.cheap = rnd() < 0.4;
    s.state = 0; s.t = 0; s.x = x; s.y = 0; s.z = 0; s.c = (s.c ?? new THREE.Color()).copy(K.doc); s.a = 1;
    if (s.kind === 2 && x > GATES[0].x) s.x = X0 + rnd() * (GATES[0].x - X0);
    if (s.kind === 1 && !s.keep && x > GATES[1].x) s.x = X0 + rnd() * (GATES[1].x - X0);
    if (s.keep && s.cached && s.kind !== 2 && x > GATES[2].x) s.x = X0 + rnd() * (GATES[2].x - X0);
  };
  st.forEach((s) => spawn(s, X0 + rnd() * (X1 - X0)));
  const radius = (x) => x < GATES[1].x ? 3.6 : x < GATES[1].x + 3 ? 3.6 - 2.3 * smooth((x - GATES[1].x) / 3)
    : x < GATES[5].x - 4 ? 1.3 : x < GATES[5].x ? 1.3 - 0.9 * smooth((x - GATES[5].x + 4) / 4) : 0.4;
  const lane = (x, cheap) => {
    const target = cheap ? -1.8 : 1.8;
    if (x < GATES[3].x) return 0;
    if (x < GATES[3].x + 3) return target * smooth((x - GATES[3].x) / 3);
    if (x < GATES[5].x + 2) return target;
    if (x < OUT_X - 2) return target * (1 - smooth((x - GATES[5].x - 2) / (OUT_X - 2 - GATES[5].x - 2)));
    return 0;
  };
  function step(dt) {
    for (let i = 0; i < N; i++) {
      const s = st[i];
      if (s.state === 0) {
        const prev = s.x; s.x += s.sp * dt;
        const crossed = (gx) => prev < gx && s.x >= gx;
        if (s.kind === 2 && crossed(GATES[0].x)) Object.assign(s, { state: 3, t: 0, vx: -3, vy: (rnd() - 0.5) * 2, vz: (rnd() - 0.5) * 2 });
        else if (s.kind === 1 && !s.keep && crossed(GATES[1].x)) { const k = 4 + rnd() * 4; Object.assign(s, { state: 1, t: 0, vx: 1.2, vy: s.oy * k + (rnd() - 0.5) * 2, vz: s.oz * k + (rnd() - 0.5) * 2 }); }
        else if (s.cached && s.kind !== 2 && crossed(GATES[2].x)) Object.assign(s, { state: 2, t: 0, vx: 0.6, vy: 4.2, vz: 0 });
        const R = radius(s.x), L = lane(s.x, s.cheap);
        s.y = s.oy * R + L; s.z = s.oz * R;
        s.c.copy(s.x < GATES[1].x ? (s.kind === 0 ? K.query : K.doc) : s.x < GATES[5].x ? K.amber : K.out);
        s.a = s.x > X1 - 4 ? clamp((X1 - s.x) / 4, 0, 1) : s.x < X0 + 3 ? clamp((s.x - X0) / 3, 0, 1) : 1;
        if (s.x > X1) spawn(s, X0);
      } else {
        s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        const life = s.state === 1 ? 1.6 : s.state === 2 ? 1.3 : 1.0, f = clamp(s.t / life, 0, 1);
        s.c.lerp(s.state === 1 ? K.dim : s.state === 2 ? K.aqua : K.red, Math.min(1, dt * 6));
        s.a = 1 - f;
        if (s.state === 2) s.vy *= 0.985;
        if (f >= 1) spawn(s, X0);
      }
      P[i * 3] = s.x * SX; P[i * 3 + 1] = s.y * SR; P[i * 3 + 2] = s.z * SR;
      CL[i * 3] = s.c.r * s.a; CL[i * 3 + 1] = s.c.g * s.a; CL[i * 3 + 2] = s.c.b * s.a;
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  }

  return {
    group, frame: { target: new THREE.Vector3(0.05, 1.0, 0), dist: 3.3, pitch: 0.24, yaw: 0.38 },
    update(dt, t, camera) {
      title.face(camera);
      step(Math.min(dt, 0.05));
      cores.forEach((m, i) => { m.rotation.y = t * (i % 2 ? -0.3 : 0.4); });
      glowMat.opacity = 0.6 + 0.3 * Math.sin(t * 3);
    },
  };
}
