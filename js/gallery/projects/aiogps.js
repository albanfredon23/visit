import * as THREE from 'three';
import { add, glow, glass, plinth, sign, tube, seeded, mat, slogan } from '../kit.js';

// Aiogps, "le GPS du raisonnement": the AIOTECH44 pipeline as on its own site.
// Adaptive gate (amber ring) -> knowledge graph (nodes light up with complexity) -> TAP beam (top-k paths)
// -> SCG sphere (the opposite hemisphere is pruned, red) -> k documents out of 15 -> audit trail.
const C = { bg: '#060c10', accent: '#34d399', strong: '#6ee7b7', warn: '#fbbf24', danger: '#ff7a7a', sky: '#7dd3fc', violet: '#a78bfa' };

export function aiogps() {
  const group = new THREE.Group();
  const rnd = seeded(44);
  plinth(group, { bg: C.bg, accent: C.accent });
  const label = sign(group, { logo: 'assets/logos/aiogps.svg', name: 'Aiogps', tagline: slogan('aiogps'), bg: C.bg, accent: C.accent });
  const Y = 0.95;

  // adaptive compute gate
  const gate = add(group, new THREE.TorusGeometry(0.26, 0.022, 16, 64), glow(C.warn, 1.4, { metalness: 0.3 }), [-1.0, Y, 0], [0, Math.PI / 2, 0]);
  const gateDisc = add(group, new THREE.CircleGeometry(0.24, 48), glass(C.warn, { opacity: 0.18, side: THREE.DoubleSide }), [-1.0, Y, 0], [0, Math.PI / 2, 0]);
  gateDisc.castShadow = false;
  add(group, new THREE.SphereGeometry(0.06, 20, 14), glow(C.sky, 2), [-1.45, Y, 0]); // the query

  // knowledge graph: Fibonacci ball of 50 nodes + edges between close neighbours
  const N = 50, R = 0.36, gc = new THREE.Vector3(-0.38, Y, 0), nodes = [];
  for (let i = 0; i < N; i++) {
    const k = i + 0.5, phi = Math.acos(1 - 2 * k / N), th = Math.PI * (1 + Math.sqrt(5)) * k, r = R * Math.cbrt((i + 1) / N);
    nodes.push(new THREE.Vector3(Math.cos(th) * Math.sin(phi) * r, Math.cos(phi) * r, Math.sin(th) * Math.sin(phi) * r).add(gc));
  }
  const nodeMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), N);
  const m4 = new THREE.Matrix4();
  nodes.forEach((p, i) => { m4.makeTranslation(p.x, p.y, p.z); nodeMesh.setMatrixAt(i, m4); });
  group.add(nodeMesh);
  const edges = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (nodes[i].distanceTo(nodes[j]) < 0.17) edges.push(nodes[i], nodes[j]);
  const edgeLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(edges), new THREE.LineBasicMaterial({ color: C.accent, transparent: true, opacity: 0.28 }));
  group.add(edgeLines);
  const thresholds = nodes.map(() => rnd());

  // SCG sphere with its constraint vector; the forbidden hemisphere is tinted red
  const sc = new THREE.Vector3(0.62, Y, 0), SR = 0.34;
  add(group, new THREE.SphereGeometry(SR, 40, 28), glass(C.accent, { opacity: 0.12 }), sc.toArray()).castShadow = false;
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(SR, 18, 12)), new THREE.LineBasicMaterial({ color: C.accent, transparent: true, opacity: 0.22 }));
  wire.position.copy(sc); group.add(wire);
  const cap = add(group, new THREE.SphereGeometry(SR * 1.01, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass(C.danger, { opacity: 0.2 }), sc.toArray());
  cap.castShadow = false;
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0.2, 1, 0.1).normalize(), sc, SR + 0.16, C.warn, 0.08, 0.05);
  group.add(arrow);

  // TAP beam: 4 kept paths (green) and 3 pruned ones that dive into the red cap
  const beams = [];
  for (let i = 0; i < 7; i++) {
    const kept = i < 4, a = (i / 7) * Math.PI * 2;
    const from = gc.clone().add(new THREE.Vector3(0.3, Math.sin(a) * 0.1, Math.cos(a) * 0.1));
    const end = sc.clone().add(new THREE.Vector3(Math.cos(a) * 0.12, kept ? 0.2 + 0.06 * Math.sin(a) : -0.22, Math.sin(a) * 0.14));
    const mid = from.clone().lerp(end, 0.5).add(new THREE.Vector3(0, kept ? 0.18 : -0.05, (rnd() - 0.5) * 0.3));
    const m = glow(kept ? C.accent : C.danger, kept ? 2 : 1.4, { transparent: true, opacity: kept ? 0.9 : 0.7 });
    beams.push({ ...tube(group, [from.toArray(), mid.toArray(), end.toArray()], 0.008, m), kept, m });
  }

  // memory: k documents out of 15
  const docs = [];
  for (let i = 0; i < 15; i++) {
    const d = add(group, new THREE.BoxGeometry(0.12, 0.012, 0.16), mat('#1c2a31', { roughness: 0.5 }), [1.18, 0.14 + i * 0.03, 0.05 + (i % 2) * 0.01]);
    docs.push(d);
  }
  const docOn = glow(C.accent, 1.2), docOff = mat('#1c2a31', { roughness: 0.5 });

  // audit trail: a chain of blocks along the front of the plinth
  const blocks = [];
  for (let i = 0; i < 7; i++) blocks.push(add(group, new THREE.BoxGeometry(0.1, 0.1, 0.1), mat('#13232a', { roughness: 0.3, metalness: 0.4 }), [-0.75 + i * 0.25, 0.16, 0.82]));
  const blockLit = glow(C.violet, 1.8), blockOff = blocks[0].material;

  // compute particles: some saved at the gate (rise, green), the rest flow to the sphere
  const P = 40, parts = [];
  const pg = new THREE.SphereGeometry(0.016, 8, 6);
  for (let i = 0; i < P; i++) {
    const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: C.sky, transparent: true }));
    group.add(m); parts.push({ m, t: rnd(), saved: rnd() < 0.35, pruned: rnd() < 0.3, off: (rnd() - 0.5) * 0.14, z: (rnd() - 0.5) * 0.14 });
  }

  const tmp = new THREE.Vector3();
  return {
    group, frame: { target: new THREE.Vector3(0, 0.95, 0), dist: 3.9, pitch: 0.28, yaw: 0.35 },
    update(dt, t, camera) {
      label.face(camera);
      gate.rotation.x = t * 0.8;
      // complexity alternates: simple questions light few nodes, hard ones light many
      const complexity = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.7));
      const col = new THREE.Color();
      for (let i = 0; i < N; i++) {
        const on = thresholds[i] < complexity;
        nodeMesh.setColorAt(i, col.set(on ? C.strong : '#27413a'));
      }
      nodeMesh.instanceColor.needsUpdate = true;
      gateDisc.material.opacity = 0.12 + (1 - complexity) * 0.35;
      beams.forEach((b, i) => { b.m.emissiveIntensity = (b.kept ? 1.6 : 1.1) + Math.sin(t * 4 + i) * 0.5; });
      const k = Math.round(2 + complexity * 13);
      docs.forEach((d, i) => { d.material = i < k ? docOn : docOff; });
      const pulse = Math.floor(t * 2.5) % blocks.length;
      blocks.forEach((b, i) => { b.material = i === pulse ? blockLit : blockOff; });
      for (const p of parts) {
        p.t += dt * 0.28; if (p.t > 1) { p.t -= 1; }
        const u = p.t, m = p.m;
        if (u < 0.25) { tmp.set(THREE.MathUtils.lerp(-1.45, -1.0, u / 0.25), Y + p.off, p.z); m.material.color.set(C.sky); m.material.opacity = 1; }
        else if (p.saved) { const v = (u - 0.25) / 0.75; tmp.set(-1.0 + v * 0.2, Y + v * 0.9, p.z); m.material.color.set(C.accent); m.material.opacity = 1 - v; }
        else if (u < 0.6) { tmp.lerpVectors(new THREE.Vector3(-1.0, Y, p.z), gc, (u - 0.25) / 0.35).y += p.off; m.material.color.set(C.sky); m.material.opacity = 1; }
        else if (p.pruned) { const v = (u - 0.6) / 0.4; tmp.set(THREE.MathUtils.lerp(gc.x, sc.x, v), Y - v * 0.8, p.z); m.material.color.set(C.danger); m.material.opacity = 1 - v; }
        else { const v = (u - 0.6) / 0.4; tmp.lerpVectors(gc, sc, v); tmp.y += Math.sin(v * Math.PI) * 0.15 + p.off * (1 - v); m.material.color.set(C.strong); m.material.opacity = 1; }
        m.position.copy(tmp);
      }
    },
  };
}
