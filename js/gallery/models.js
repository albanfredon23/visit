import * as THREE from 'three';
import { mat, add, rbox } from '../scene/helpers.js';
import { buildDesk, buildComputer } from '../scene/desk.js';
import { buildAvatar } from '../scene/avatar.js';
import { SWATCHES } from '../data/content.js';

// The six creations shown on the screen. Each builder returns
// { group, frame: { target, dist, pitch, yaw }, update(dt, t, camera) } and sits on y = 0.

const plinth = (parent, r = 0.5, h = 0.12, color = '#1a1714') =>
  add(parent, new THREE.CylinderGeometry(r, r * 1.04, h, 64), new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6 }), [0, h / 2, 0]);

// 1. The 3D resume as a miniature diorama: two walls, the desk and Alban typing.
function cvDiorama() {
  const group = new THREE.Group();
  const inner = new THREE.Group(); inner.position.z = 0.15; group.add(inner);
  add(inner, rbox(2.6, 0.12, 2.3, 0.03), mat('#2b1d15', { roughness: 0.5 }), [0, -0.06, -0.12]);
  add(inner, new THREE.BoxGeometry(2.5, 0.02, 2.2), mat('#7a5034', { roughness: 0.6 }), [0, 0.01, -0.12]);
  const wall = mat('#c9b49a', { roughness: 0.95 });
  add(inner, new THREE.BoxGeometry(2.5, 1.7, 0.05), wall, [0, 0.85, -1.2]);
  add(inner, new THREE.BoxGeometry(0.05, 1.7, 2.2), wall, [-1.25, 0.85, -0.12]);
  add(inner, new THREE.CircleGeometry(0.85, 48), mat('#7d2f2a', { roughness: 1 }), [0.05, 0.022, 0.2], [-Math.PI / 2, 0, 0]);
  const frame = new THREE.Group(); frame.position.set(-0.6, 1.3, -1.16); inner.add(frame);
  add(frame, rbox(0.7, 0.5, 0.03, 0.01), mat('#2b1d15'));
  add(frame, new THREE.PlaneGeometry(0.6, 0.4), mat('#e9d9c9'), [0, 0, 0.017]);
  for (let i = 0; i < 3; i++) add(frame, new THREE.SphereGeometry(0.05, 12, 8), mat('#c0392b'), [-0.15 + i * 0.15, 0.04 - (i % 2) * 0.06, 0.03], [0, 0, 0], [1, 1, 0.3]);
  const { screen } = buildDesk(inner);
  const alban = buildAvatar(inner);
  let acc = 0;
  const s = { swivel: 0, lookAtCam: 0, typingNow: false, wave: 0, talk: 0 };
  return {
    group, frame: { target: new THREE.Vector3(0, 0.75, -0.1), dist: 4.3, pitch: 0.42, yaw: 0.55 },
    update(dt, t, camera) {
      s.typingNow = screen.step(dt);
      acc += dt; if (acc > 1 / 15) { acc = 0; screen.draw(t); }
      alban.update(dt, t, camera, s);
    },
  };
}

// 2. Alban's avatar on its chair, turned towards the viewer, waving now and then.
function avatarModel() {
  const group = new THREE.Group();
  plinth(group, 0.62, 0.06);
  const inner = new THREE.Group(); inner.position.set(0, 0.06, -0.14); group.add(inner);
  const alban = buildAvatar(inner);
  const s = { swivel: Math.PI, lookAtCam: 1, typingNow: false, wave: 0, talk: 0 };
  let next = 1.2;
  return {
    group, frame: { target: new THREE.Vector3(0, 0.95, 0), dist: 2.7, pitch: 0.12, yaw: 0.35 },
    update(dt, t, camera) {
      next -= dt;
      if (next < 0) { s.wave = 2.2; s.talk = 1.4; next = 6; }
      s.wave = Math.max(0, s.wave - dt); s.talk = Math.max(0, s.talk - dt);
      alban.update(dt, t, camera, s);
    },
    wave() { next = 0; },
  };
}

// 3. The BBC Micro-style computer with its live REPL and the ALBAN.SSD floppy.
function computerModel() {
  const group = new THREE.Group();
  plinth(group, 0.55, 0.05);
  const comp = buildComputer(group);
  comp.unit.position.y = 0.05;
  const dc = document.createElement('canvas'); dc.width = 256; dc.height = 256; const g = dc.getContext('2d');
  g.fillStyle = '#141414'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#efe6cf'; g.fillRect(28, 18, 200, 70);
  g.fillStyle = '#1f3fae'; g.font = 'bold 30px monospace'; g.fillText('ALBAN.SSD', 44, 64);
  g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(128, 150, 34, 0, 7); g.fill();
  const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
  add(group, new THREE.BoxGeometry(0.13, 0.003, 0.13),
    [mat('#141414'), mat('#141414'), new THREE.MeshStandardMaterial({ map: dt, roughness: 0.6 }), mat('#141414'), mat('#141414'), mat('#141414')],
    [0.38, 0.052, 0.3], [0, -0.4, 0]);
  let acc = 0;
  return {
    group, frame: { target: new THREE.Vector3(0, 0.3, 0), dist: 1.6, pitch: 0.28, yaw: 0.5 },
    update(dt2, t) {
      comp.screen.step(dt2);
      acc += dt2; if (acc > 1 / 20) { acc = 0; comp.screen.draw(t); }
    },
  };
}

// 4. A Limoges-style porcelain vase: white glaze, cobalt bands, gold rims.
function vaseModel() {
  const group = new THREE.Group();
  plinth(group, 0.42, 0.3, '#121212');
  const pts = [[0, 0], [0.15, 0], [0.16, 0.02], [0.14, 0.05], [0.19, 0.12], [0.28, 0.28], [0.31, 0.4], [0.28, 0.54], [0.2, 0.66], [0.11, 0.76], [0.095, 0.84], [0.12, 0.9], [0.135, 0.92], [0.12, 0.925], [0.085, 0.86]];
  const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#f8f6f1'; g.fillRect(0, 0, 2048, 1024);
    // v runs from the foot (bottom of the canvas) to the lip (top)
    const band = (y, h, col) => { g.fillStyle = col; g.fillRect(0, y, 2048, h); };
    band(980, 20, '#c9a24a'); band(60, 14, '#c9a24a'); band(30, 10, '#c9a24a');
    band(840, 70, '#1d3c8f'); band(170, 50, '#1d3c8f');
    g.fillStyle = '#f8f6f1';
    for (let x = 0; x < 2048; x += 64) { g.beginPath(); g.arc(x + 32, 875, 18, 0, 7); g.fill(); }
    // floral medallions around the belly
    for (let i = 0; i < 6; i++) {
      const cx = 170 + i * 341, cy = 520;
      g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy, 120, 170, 0, 0, 7); g.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        g.fillStyle = k % 2 ? '#2f56b8' : '#1d3c8f';
        g.beginPath(); g.ellipse(cx + Math.cos(a) * 45, cy + Math.sin(a) * 60, 34, 16, a, 0, 7); g.fill();
      }
      g.fillStyle = '#c9a24a'; g.beginPath(); g.arc(cx, cy, 18, 0, 7); g.fill();
      g.strokeStyle = '#1d3c8f'; g.lineWidth = 4;
      for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(cx + 170, cy - 140 + k * 280); g.bezierCurveTo(cx + 220, cy - 60 + k * 120, cx + 120, cy - 20 + k * 40, cx + 170, cy); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.wrapS = THREE.RepeatWrapping; t.flipY = false;
    return t;
  })();
  const porcelain = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide });
  const vase = add(group, new THREE.LatheGeometry(curve.getPoints(80), 128), porcelain, [0, 0.3, 0]);
  // LatheGeometry v goes foot -> lip; flip so the canvas reads top = lip
  const uv = vase.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  add(group, new THREE.TorusGeometry(0.128, 0.007, 12, 96), mat('#d8b25a', { metalness: 1, roughness: 0.2 }), [0, 1.222, 0], [Math.PI / 2, 0, 0]);
  return { group, frame: { target: new THREE.Vector3(0, 0.75, 0), dist: 2.1, pitch: 0.18, yaw: 0.3 }, update() {} };
}

// 5. A cutaway show flat: living room, kitchen corner and bedroom.
function flatModel() {
  const group = new THREE.Group();
  const W = 3.2, D = 2.4, H = 0.95, T = 0.06;
  const floorTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#c89f74'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 16; i++) { g.fillStyle = `hsl(30, 40%, ${55 + Math.random() * 8}%)`; g.fillRect(0, i * 32 + 1, 512, 30); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(Math.random() * 512, i * 32, 2, 32); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
  })();
  add(group, rbox(W + 0.2, 0.1, D + 0.2, 0.02), mat('#efe9e0', { roughness: 0.8 }), [0, -0.05, 0]);
  add(group, new THREE.BoxGeometry(W, 0.02, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 }), [0, 0.01, 0]);
  const wall = mat('#f3eee6', { roughness: 0.9 });
  add(group, new THREE.BoxGeometry(W, H, T), wall, [0, H / 2, -D / 2]);
  add(group, new THREE.BoxGeometry(T, H, D), wall, [-W / 2, H / 2, 0]);
  // partition with a doorway between living room and bedroom
  add(group, new THREE.BoxGeometry(T, H, 1.3), wall, [0.55, H / 2, -D / 2 + 0.65]);
  add(group, new THREE.BoxGeometry(T, H, 0.4), wall, [0.55, H / 2, D / 2 - 0.2]);
  add(group, new THREE.BoxGeometry(T, 0.2, 0.7), wall, [0.55, H - 0.1, 0.15]);
  // window in the back wall
  add(group, new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({ color: '#bfe0ff', emissive: '#bfe0ff', emissiveIntensity: 0.6 }), [-0.6, 0.55, -D / 2 + T / 2 + 0.002]);
  // living room
  const sofa = mat('#4c6b8a', { roughness: 0.9 });
  add(group, rbox(1.2, 0.18, 0.45, 0.04), sofa, [-0.6, 0.11, 0.85]);
  add(group, rbox(1.2, 0.25, 0.12, 0.04), sofa, [-0.6, 0.25, 1.02]);
  add(group, new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32), mat('#8a5a3b', { roughness: 0.4 }), [-0.6, 0.18, 0.35]);
  add(group, new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), mat('#2b1d15'), [-0.6, 0.09, 0.35]);
  add(group, rbox(1.0, 0.01, 0.7, 0.003), mat('#d9a441', { roughness: 1 }), [-0.6, 0.025, 0.5]);
  add(group, rbox(0.8, 0.25, 0.25, 0.02), mat('#2b2b2b', { roughness: 0.5 }), [-0.6, 0.14, -D / 2 + 0.16]);
  add(group, rbox(0.7, 0.4, 0.03, 0.01), mat('#111', { roughness: 0.2 }), [-0.6, 0.5, -D / 2 + 0.06]);
  // kitchen corner
  add(group, rbox(0.42, 0.42, 1.0, 0.02), mat('#e8e2d6', { roughness: 0.5 }), [-W / 2 + 0.24, 0.21, -0.35]);
  add(group, rbox(0.44, 0.03, 1.02, 0.01), mat('#2b2b2b', { roughness: 0.3 }), [-W / 2 + 0.24, 0.435, -0.35]);
  // plant
  add(group, new THREE.CylinderGeometry(0.06, 0.05, 0.12, 16), mat('#c76b43'), [0.3, 0.06, 1.0]);
  add(group, new THREE.SphereGeometry(0.12, 16, 12), mat('#3f8a4e'), [0.3, 0.24, 1.0], [0, 0, 0], [1, 1.4, 1]);
  // bedroom
  add(group, rbox(0.75, 0.16, 1.05, 0.03), mat('#6b4730', { roughness: 0.6 }), [1.1, 0.09, -0.5]);
  add(group, rbox(0.7, 0.08, 0.95, 0.04), mat('#f4f1ea', { roughness: 0.9 }), [1.1, 0.2, -0.47]);
  add(group, rbox(0.7, 0.05, 0.55, 0.03), mat('#c0573b', { roughness: 0.9 }), [1.1, 0.25, -0.25]);
  for (const s of [-1, 1]) add(group, rbox(0.28, 0.06, 0.16, 0.03), mat('#ffffff', { roughness: 0.9 }), [1.1 + s * 0.17, 0.26, -0.9]);
  add(group, rbox(0.7, 0.32, 0.03, 0.02), mat('#6b4730'), [1.1, 0.3, -D / 2 + 0.06]);
  add(group, rbox(0.22, 0.2, 0.22, 0.02), mat('#8a5a3b'), [1.65, 0.1, -0.95]);
  add(group, new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffcf8a', emissiveIntensity: 1.2 }), [1.65, 0.27, -0.95]);
  add(group, rbox(0.5, 0.6, 0.3, 0.02), mat('#efe9e0', { roughness: 0.6 }), [1.2, 0.3, 0.9]);
  return { group, frame: { target: new THREE.Vector3(0, 0.25, 0), dist: 4.6, pitch: 0.72, yaw: 0.6 }, update() {} };
}

// 6. A lounge chair whose fabric colour the visitor picks (product configurator demo).
function chairModel() {
  const group = new THREE.Group();
  plinth(group, 0.75, 0.06, '#1a1714');
  const fabric = new THREE.MeshPhysicalMaterial({ color: SWATCHES[0].color, roughness: 0.85, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff').multiplyScalar(0.4) });
  const wood = mat('#6b4730', { roughness: 0.35 });
  const c = new THREE.Group(); c.position.y = 0.06; group.add(c);
  for (const [x, z] of [[-0.3, -0.27], [0.3, -0.27], [-0.3, 0.27], [0.3, 0.27]])
    add(c, new THREE.CylinderGeometry(0.022, 0.014, 0.24, 12), wood, [x * 1.05, 0.12, z * 1.05], [z > 0 ? 0.12 : -0.12, 0, x > 0 ? -0.12 : 0.12]);
  add(c, rbox(0.78, 0.16, 0.72, 0.05), fabric, [0, 0.3, 0]);
  add(c, rbox(0.6, 0.12, 0.6, 0.06), fabric, [0, 0.42, 0.04]);
  add(c, rbox(0.78, 0.6, 0.16, 0.07), fabric, [0, 0.63, -0.3], [-0.16, 0, 0]);
  add(c, rbox(0.58, 0.36, 0.1, 0.05), fabric, [0, 0.66, -0.2], [-0.14, 0, 0]);
  for (const s of [-1, 1]) add(c, rbox(0.13, 0.3, 0.7, 0.06), fabric, [s * 0.34, 0.47, 0.0]);
  for (const s of [-1, 1]) add(c, rbox(0.15, 0.03, 0.62, 0.012), wood, [s * 0.34, 0.635, 0.03]);
  const target = new THREE.Color(SWATCHES[0].color);
  return {
    group, frame: { target: new THREE.Vector3(0, 0.45, 0), dist: 2.4, pitch: 0.3, yaw: 0.7 },
    update(dt) { fabric.color.lerp(target, Math.min(1, dt * 6)); },
    setColor(hex) { target.set(hex); },
  };
}

export const BUILDERS = { cv: cvDiorama, avatar: avatarModel, computer: computerModel, vase: vaseModel, flat: flatModel, chair: chairModel };
