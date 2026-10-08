import * as THREE from 'three';
import { add, plinth, sign, seeded, slogan, dot, label } from '../kit.js';

// AIOTrade, the scene from its own site, scaled down: market -> integrity filter χ² (with the macro
// calendar gate) -> forecast and its four agents -> TAP beam -> SCG gate -> fractional Kelly ->
// execution -> decision, sealed in the XAI ledger. Orders flow along the pipeline; the ones the SCG
// rejects fall away in red.
const C = {
  bg: '#070b14', market: '#60a5fa', integrity: '#a78bfa', macro: '#f472b6', forecast: '#38bdf8', agent: '#7dd3fc',
  tap: '#2dd4bf', scg: '#fbbf24', kelly: '#93c5fd', execution: '#67e8f9', decision: '#4ade80', ledger: '#e2e8f0',
  reject: '#ff5a5a', edge: '#334155',
};
const S = 0.135, LIFT = 1.0, K = 1.3; // site units -> diorama units, height above the plinth, node boost
const NODES = [
  { id: 'market', label: { fr: 'Marché', en: 'Market' }, pos: [-8, 0, 0], color: C.market, size: 0.55 },
  { id: 'integrity', label: { fr: 'Intégrité χ²', en: 'Integrity χ²' }, pos: [-5.6, 0, 0.3], color: C.integrity, size: 0.55, kind: 'shield' },
  { id: 'macro', label: 'Macro Gate', pos: [-5.6, 2.7, -0.6], color: C.macro, size: 0.5, kind: 'clock' },
  { id: 'forecast', label: { fr: 'Prévision', en: 'Forecast' }, pos: [-3.2, 0, 0], color: C.forecast, size: 0.55 },
  { id: 'trend', pos: [-1.5, 2.0, -0.6], color: C.agent, size: 0.26 },
  { id: 'meanrev', pos: [-1.5, 0.7, 0.9], color: C.agent, size: 0.26 },
  { id: 'macroagent', pos: [-1.5, -0.7, 0.9], color: C.agent, size: 0.26 },
  { id: 'risk', pos: [-1.5, -2.0, -0.6], color: C.agent, size: 0.26 },
  { id: 'tap', label: 'TAP', pos: [0.6, 0, 0], color: C.tap, size: 0.6 },
  { id: 'scg', label: 'SCG', pos: [3.4, 0, 0], color: C.scg, size: 0.9, kind: 'gate' },
  { id: 'kelly', label: 'Kelly', pos: [5.1, 1.1, 0.3], color: C.kelly, size: 0.42, kind: 'cube' },
  { id: 'execution', label: { fr: 'Exécution', en: 'Execution' }, pos: [6.5, -1.0, 0.3], color: C.execution, size: 0.45, kind: 'cone' },
  { id: 'decision', label: { fr: 'Décision', en: 'Decision' }, pos: [8.3, 0, 0], color: C.decision, size: 0.72 },
  { id: 'ledger', label: 'XAI Ledger', pos: [7.9, -3.4, 0.5], color: C.ledger, size: 0.3, kind: 'block' },
];
const AGENTS = ['trend', 'meanrev', 'macroagent', 'risk'];
const ROUTE = ['market', 'integrity', 'forecast', null, 'tap', 'scg', 'kelly', 'execution', 'decision'];
const T_SCG = 5 / (ROUTE.length - 1);
const v = ([x, y, z]) => new THREE.Vector3(x * S, y * S + LIFT, z * S);

export function aiotrade() {
  const group = new THREE.Group();
  const rnd = seeded(44);
  plinth(group, { bg: C.bg, accent: C.tap });
  const title = sign(group, { logo: 'assets/logos/aiotrade.svg', name: 'AIOTrade', tagline: slogan('aiotrade'), bg: C.bg, accent: C.tap, y: 2.15 });

  // nodes, in the site's shapes and colours
  const geos = {
    gate: () => new THREE.TorusGeometry(1, 0.12, 24, 96), shield: () => new THREE.OctahedronGeometry(1, 0),
    clock: () => new THREE.CylinderGeometry(1, 1, 0.22, 48), cube: () => new THREE.BoxGeometry(1.3, 1.3, 1.3),
    cone: () => new THREE.ConeGeometry(0.9, 1.7, 32), block: () => new THREE.BoxGeometry(1.5, 1.5, 1.5),
  };
  const sphere = new THREE.IcosahedronGeometry(1, 4);
  const meshes = {};
  let hand = null;
  for (const n of NODES) {
    const m = new THREE.Mesh(n.kind ? geos[n.kind]() : sphere, new THREE.MeshStandardMaterial({
      color: n.color, emissive: n.color, emissiveIntensity: 0.35, metalness: 0.35, roughness: 0.28, flatShading: n.kind === 'shield' }));
    m.position.copy(v(n.pos)); m.scale.setScalar(n.size * S * K);
    if (n.kind === 'gate') m.rotation.y = Math.PI / 2;
    if (n.kind === 'clock') m.rotation.x = Math.PI / 2;
    if (n.kind === 'cone') m.rotation.z = -Math.PI / 2;
    if (n.kind === 'cube') m.rotation.set(0.5, 0.6, 0);
    if (n.kind === 'clock') { // the macro calendar's hand
      hand = new THREE.Group(); m.add(hand);
      add(hand, new THREE.BoxGeometry(0.1, 0.12, 0.8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6 }), [0, 0.16, -0.32]);
    }
    group.add(m); meshes[n.id] = m;
    if (n.label) label(group, n.label, { pos: v(n.pos).add(new THREE.Vector3(0, (n.id === 'ledger' ? -1 : 1) * (n.size * S * K + 0.07), 0)).toArray() });
  }
  const at = (id) => meshes[id].position;

  // SCG filter disc and the "go to cash" bubble around the decision
  add(group, new THREE.CircleGeometry(0.85 * 0.9 * S * K, 48), new THREE.MeshBasicMaterial({ color: C.scg, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }), at('scg').toArray(), [0, Math.PI / 2, 0]).castShadow = false;
  const bubble = add(group, new THREE.IcosahedronGeometry(1.5 * S * K * 0.8, 3), new THREE.MeshStandardMaterial({ color: C.integrity, emissive: C.integrity, emissiveIntensity: 0.4, transparent: true, opacity: 0, wireframe: true, depthWrite: false }), at('decision').toArray());
  bubble.castShadow = false;

  // links
  const edge = new THREE.MeshStandardMaterial({ color: C.edge, emissive: '#1e293b', emissiveIntensity: 0.6, roughness: 0.6 });
  const tube = (pts, r = 0.0055) => { const m = add(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 8, false), edge); m.castShadow = false; };
  tube([at('market'), at('integrity'), at('forecast')]);
  for (const id of AGENTS) { tube([at('forecast'), at(id)], 0.004); tube([at(id), at('tap')], 0.004); }
  tube([at('scg'), at('kelly'), at('execution'), at('decision')]);
  const dashed = (pts, color, opacity) => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(140)),
      new THREE.LineDashedMaterial({ color, dashSize: 0.025, gapSize: 0.02, transparent: true, opacity }));
    line.computeLineDistances(); group.add(line);
  };
  dashed([at('integrity'), v([-3, -3.0, 0.5]), v([3.5, -2.4, 0.5]), at('decision')], C.integrity, 0.5);
  dashed([at('macro'), v([-1, 3.8, -0.4]), v([5.5, 3.0, -0.2]), at('decision')], C.macro, 0.45);

  // XAI ledger: chain of blocks
  const chain = [];
  for (let i = 0; i < 6; i++) {
    const b = add(group, new THREE.BoxGeometry(0.34 * S * K, 0.34 * S * K, 0.34 * S * K), new THREE.MeshStandardMaterial({ color: C.ledger, emissive: C.ledger, emissiveIntensity: 0.15, metalness: 0.5, roughness: 0.3 }), v([2.2 + i * 0.95, -3.4, 0.5]).toArray(), [0.4, 0.5, 0]);
    if (i) tube([chain[i - 1].position, b.position], 0.003);
    chain.push(b);
  }
  tube([chain[5].position, at('ledger')], 0.003);

  // TAP beam: a quarter of the trajectories leave the admissible cone and get pruned at the SCG
  const beam = [];
  const okMat = new THREE.LineBasicMaterial({ color: C.tap, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const cutMat = new THREE.LineBasicMaterial({ color: C.tap, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 30; i++) {
    const pruned = i % 4 === 3, angle = rnd() * Math.PI * 2, radius = (pruned ? 1.1 + rnd() * 0.9 : rnd() * 0.62) * S;
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, p = at('tap').clone().lerp(at('scg'), t), spread = radius * Math.pow(t, 1.25), w = (rnd() - 0.5) * 0.18 * S * Math.sin(Math.PI * t);
      p.y += Math.sin(angle) * spread + w; p.z += Math.cos(angle) * spread + w; pts.push(p);
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(40)), pruned ? cutMat : okMat);
    line.geometry.setDrawRange(0, 0); group.add(line); beam.push(line);
  }

  // orders flowing along the pipeline
  const routes = AGENTS.map((a) => new THREE.CatmullRomCurve3(ROUTE.map((id) => at(id ?? a))));
  const N = 90, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.04, map: dot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false; group.add(pts);
  const orders = Array.from({ length: N }, (_, i) => ({ t: i / N, route: i % 4, speed: 0.07 + rnd() * 0.05, reject: rnd() < 0.22, j: [(rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.03], fall: 0 }));
  const good = new THREE.Color(C.tap), out = new THREE.Color(C.decision), bad = new THREE.Color(C.reject), c = new THREE.Color(), p = new THREE.Vector3(), drop = new THREE.Vector3();

  return {
    group, frame: { target: new THREE.Vector3(0.05, 1.05, 0), dist: 3.25, pitch: 0.16, yaw: 0.3 },
    update(dt, t, camera) {
      title.face(camera);
      if (hand) hand.rotation.y -= dt * 1.4;
      meshes.scg.rotation.x += dt * 0.4;
      // beam: draws itself, then the pruned trajectories redden and fade
      const u = (t * 0.2) % 1, draw = Math.min(1, u / 0.4), prune = THREE.MathUtils.clamp((u - 0.45) / 0.2, 0, 1);
      beam.forEach((l) => l.geometry.setDrawRange(0, Math.round(draw * 41)));
      cutMat.color.set(prune > 0 ? C.reject : C.tap); cutMat.opacity = 0.35 * (1 - prune * 0.7);
      // decision pulse and ledger seal
      const d = u > 0.7 ? Math.sin((u - 0.7) / 0.3 * Math.PI) : 0;
      meshes.decision.material.emissiveIntensity = 0.35 + d * 1.2;
      chain.forEach((b, i) => { b.material.emissiveIntensity = i === Math.floor(t * 1.5) % 6 ? 1.1 : 0.15; });
      bubble.material.opacity = Math.sin(t * 0.5) > 0.97 ? 0.5 : bubble.material.opacity * 0.96;
      for (let i = 0; i < N; i++) {
        const o = orders[i];
        if (o.fall > 0) { // rejected at the SCG: falls away in red
          o.fall += dt;
          p.copy(at('scg')).add(drop.set(o.fall * 0.08, -o.fall * o.fall * 0.25, o.j[2] * 3));
          c.copy(bad).multiplyScalar(Math.max(0, 1 - o.fall / 1.4));
          if (o.fall > 1.4) { o.fall = 0; o.t = 0; o.reject = rnd() < 0.22; }
        } else {
          o.t += dt * o.speed;
          if (o.reject && o.t >= T_SCG) { o.fall = 0.001; continue; }
          if (o.t >= 1) { o.t = 0; o.route = (o.route + 1) % 4; o.reject = rnd() < 0.22; }
          routes[o.route].getPointAt(o.t, p); p.x += o.j[0]; p.y += o.j[1]; p.z += o.j[2];
          c.copy(o.t > T_SCG ? out : good).multiplyScalar(Math.min(1, o.t * 20, (1 - o.t) * 20));
        }
        p.toArray(pos, i * 3); c.toArray(col, i * 3);
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    },
  };
}
