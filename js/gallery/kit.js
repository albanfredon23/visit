import * as THREE from 'three';
import { mat, add, rbox } from '../scene/helpers.js';
import { C, getLang } from '../i18n.js';

// Shared pieces for the project dioramas: glowing materials, the plinth in each project's colours,
// the floating sign with its logo, and a seeded random so every visit looks the same.

export { mat, add, rbox };

export const glow = (color, intensity = 1.6, o = {}) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, ...o });

export const glass = (color = '#ffffff', o = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false, ...o });

// The project's slogan in the current language (content.js), for the floating sign.
export const slogan = (id) => () => C().creations.find((c) => c.id === id)?.slogan ?? '';

// How the gallery is being shown: signAlpha fades the floating signs out when the screen fills the window
// (the info card then carries the logo and the name).
export const view = { signAlpha: 1 };

// Every sign registers its redraw here, so a language switch can refresh them all.
const signs = new Set();
export const redrawSigns = () => signs.forEach((f) => f());

export function seeded(seed = 7) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Dark disc with a lit rim in the project's accent colour.
export function plinth(parent, { bg, accent, r = 1.25, h = 0.1 }) {
  add(parent, new THREE.CylinderGeometry(r, r * 1.03, h, 72), new THREE.MeshPhysicalMaterial({ color: bg, roughness: 0.32, clearcoat: 0.7 }), [0, h / 2, 0]);
  const rim = add(parent, new THREE.TorusGeometry(r * 1.005, 0.008, 8, 128), glow(accent, 2.2), [0, h, 0], [Math.PI / 2, 0, 0]);
  rim.castShadow = false;
}

// A tube along a list of points.
export function tube(parent, pts, radius, material, segs = 48) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const m = add(parent, new THREE.TubeGeometry(curve, segs, radius, 8, false), material);
  m.castShadow = false;
  return { mesh: m, curve };
}

// Floating sign: the project's logo, name and tagline, drawn in its own colours. Always faces the camera.
export function sign(parent, { logo, name, tagline, bg, accent, text = '#eef2f8', muted = '#a9b4c8', y = 2.15, z = -0.6, drawLogo }) {
  const W = 1024, H = 300;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const draw = (img) => {
    g.clearRect(0, 0, W, H);
    const r = 44;
    g.fillStyle = bg; g.globalAlpha = 0.92;
    g.beginPath(); g.roundRect(8, 8, W - 16, H - 16, r); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = accent; g.lineWidth = 4; g.beginPath(); g.roundRect(8, 8, W - 16, H - 16, r); g.stroke();
    if (img) g.drawImage(img, 44, 54, 192, 192);
    else if (drawLogo) drawLogo(g, 44, 54, 192);
    g.textBaseline = 'top';
    g.fillStyle = text; g.font = '700 84px "Bricolage Grotesque", system-ui, sans-serif'; g.fillText(name, 270, 62);
    g.fillStyle = muted; g.font = '500 38px "Bricolage Grotesque", system-ui, sans-serif';
    g.fillText(typeof tagline === 'function' ? tagline() : tagline, 272, 168, W - 310);
    tex.needsUpdate = true;
  };
  let logoImg = null;
  draw(null);
  if (logo) { const img = new Image(); img.onload = () => { logoImg = img; draw(img); }; img.src = logo; }
  document.fonts?.ready.then(() => draw(logoImg)); // redraw once the web font is in
  signs.add(() => draw(logoImg));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9 * H / W), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }));
  mesh.position.set(0, y, z); mesh.renderOrder = 2;
  parent.add(mesh);
  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  return {
    mesh,
    face(camera) { // billboard around the vertical axis, whatever the turntable's own rotation
      mesh.material.opacity = view.signAlpha; mesh.visible = view.signAlpha > 0.01;
      mesh.parent.getWorldQuaternion(q); e.setFromQuaternion(q, 'YXZ');
      mesh.getWorldPosition(tmp);
      mesh.rotation.y = Math.atan2(camera.position.x - tmp.x, camera.position.z - tmp.z) - e.y;
    },
  };
}

// Soft round dot for the point clouds (orders, tokens, particles).
let dotTex = null;
export function dot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.65)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

// Small caption that always faces the camera, like the labels on Alban's sites. text: a string or { fr, en }.
export function label(parent, text, { color = '#e2e8f0', h = 0.075, pos = [0, 0, 0] } = {}) {
  const W = 512, H = 96;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  const draw = () => {
    const s = typeof text === 'string' ? text : text[getLang()];
    const g = c.getContext('2d'); g.clearRect(0, 0, W, H);
    g.font = '600 50px "Bricolage Grotesque", system-ui, sans-serif';
    const w = Math.min(W - 8, g.measureText(s).width + 44);
    g.fillStyle = 'rgba(6,10,18,0.74)'; g.beginPath(); g.roundRect((W - w) / 2, 10, w, H - 20, (H - 20) / 2); g.fill();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, W / 2, H / 2 + 2, W - 40);
    tex.needsUpdate = true;
  };
  draw(); document.fonts?.ready.then(draw); signs.add(draw);
  sprite.scale.set(h * W / H, h, 1); sprite.position.set(...pos); sprite.renderOrder = 3;
  parent.add(sprite);
  return sprite;
}
