import * as THREE from 'three';
import { add, glow, glass, plinth, sign, rbox, seeded, slogan } from '../kit.js';

// AIOTECH Search: a glass search bar, a cloud of neurons (the readings of the question) linked by
// synapses, which contracts towards two or three answers, each tagged FAIT / INFÉRENCE / INCERTAIN.
const C = { bg: '#04060c', panel: '#0c1424', cyan: '#5fe1ff', violet: '#9b8cff', emerald: '#34d399', amber: '#fbbf24', orange: '#fb923c', text: '#e6eefb' };

function textTex(text, { w = 1024, h = 128, color = C.text, bg = null, font = '500 54px "Bricolage Grotesque", system-ui, sans-serif', align = 'left' }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const draw = () => {
    const g = c.getContext('2d'); g.clearRect(0, 0, w, h);
    if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, h / 2 - 4); g.fill(); }
    g.fillStyle = color; g.font = font; g.textBaseline = 'middle'; g.textAlign = align;
    g.fillText(text, align === 'center' ? w / 2 : 48, h / 2 + 2);
    t.needsUpdate = true;
  };
  draw(); document.fonts?.ready.then(draw);
  return t;
}

export function aiosearch() {
  const group = new THREE.Group();
  const rnd = seeded(3);
  plinth(group, { bg: C.bg, accent: C.cyan });
  const label = sign(group, { logo: 'assets/logos/aiosearch.svg', name: 'AIOTECH Search', tagline: slogan('aiosearch'), bg: C.bg, accent: C.cyan, text: C.text, muted: '#93a3bd', y: 2.25 });

  // glass search bar
  const bar = new THREE.Group(); bar.position.set(0, 0.42, 0.45); bar.rotation.x = -0.25; group.add(bar);
  add(bar, rbox(1.7, 0.2, 0.08, 0.06), glass('#bfefff', { opacity: 0.3 }));
  add(bar, rbox(1.72, 0.012, 0.09, 0.004), glow(C.cyan, 1.6), [0, -0.1, 0]);
  const q = add(bar, new THREE.PlaneGeometry(1.6, 0.2), new THREE.MeshBasicMaterial({ map: textTex('Quel chemin, de la question à la réponse ?', {}), transparent: true, toneMapped: false }), [0, 0, 0.045]);
  q.castShadow = false;

  // neuron cloud
  const N = 34, home = [], nodes = [];
  const center = new THREE.Vector3(0, 1.25, -0.05);
  for (let i = 0; i < N; i++) {
    const p = new THREE.Vector3((rnd() - 0.5) * 1.6, (rnd() - 0.5) * 0.75, (rnd() - 0.5) * 0.8).add(center);
    home.push(p);
    const m = add(group, new THREE.SphereGeometry(0.03 + rnd() * 0.025, 16, 12), glow(i % 3 ? C.cyan : C.violet, 2.2), p.toArray());
    m.castShadow = false; nodes.push(m);
  }
  const pairs = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (home[i].distanceTo(home[j]) < 0.42) pairs.push([i, j]);
  const synGeo = new THREE.BufferGeometry(); synGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(pairs.length * 6), 3));
  const synapses = new THREE.LineSegments(synGeo, new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.35 }));
  group.add(synapses);

  // answers, ranked by reliability
  const answers = [['[FAIT]', C.emerald], ['[INFÉRENCE]', C.amber], ['[INCERTAIN]', C.orange]].map(([txt, col], i) => {
    const g = new THREE.Group(); g.position.set(-0.62 + i * 0.62, 0.95 - i * 0.04, 0.0); group.add(g);
    const orb = add(g, new THREE.SphereGeometry(0.075 - i * 0.012, 24, 16), glow(col, 2.4)); orb.castShadow = false;
    const tag = add(g, new THREE.PlaneGeometry(0.5, 0.0625), new THREE.MeshBasicMaterial({ map: textTex(txt, { w: 512, h: 64, color: '#04060c', bg: col, font: '700 38px ui-monospace, monospace', align: 'center' }), transparent: true, toneMapped: false }), [0, -0.15, 0]);
    tag.castShadow = false;
    return { g, orb, tag, pos: g.position.clone() };
  });

  const pos = new THREE.Vector3();
  return {
    group, frame: { target: new THREE.Vector3(0, 1.0, 0), dist: 3.6, pitch: 0.2, yaw: 0.3 },
    update(dt, t, camera) {
      label.face(camera);
      // contract: neurons collapse towards their answer, then breathe out again
      const k = Math.pow(0.5 + 0.5 * Math.sin(t * 0.8), 3);
      nodes.forEach((m, i) => {
        const a = answers[i % 3].pos;
        pos.copy(home[i]).lerp(a, k * 0.85);
        pos.y += Math.sin(t * 1.3 + i) * 0.02;
        m.position.copy(pos);
      });
      const arr = synGeo.attributes.position.array;
      pairs.forEach(([i, j], n) => { nodes[i].position.toArray(arr, n * 6); nodes[j].position.toArray(arr, n * 6 + 3); });
      synGeo.attributes.position.needsUpdate = true;
      synapses.material.opacity = 0.18 + 0.3 * (1 - k);
      answers.forEach((a, i) => {
        const s = 0.6 + k * 0.8;
        a.orb.scale.setScalar(s);
        a.tag.material.opacity = Math.min(1, k * 2);
        a.tag.lookAt(camera.position);
        a.orb.material.emissiveIntensity = 1.6 + k * 2;
      });
    },
  };
}
