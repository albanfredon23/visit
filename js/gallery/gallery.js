import * as THREE from 'three';
import { BUILDERS } from './models.js';
import { C, T } from '../i18n.js';

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const backOut = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

// The creations studio: a dark set with a retro green grid, one creation at a time on a turntable.
// The same scene feeds the monitor in the room (render target) and fills the CRT when the visitor zooms in.
export function createGallery({ environment, reduceMotion }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070b08');
  scene.fog = new THREE.Fog('#070b08', 6, 16);
  scene.environment = environment;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.05, 60);

  scene.add(new THREE.HemisphereLight('#e8f3ff', '#1a120c', 0.5));
  const key = new THREE.DirectionalLight('#fff1dc', 2.2);
  key.position.set(3, 5, 4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 1, far: 14 });
  scene.add(key);
  const rim = new THREE.DirectionalLight('#5dff7a', 1.1); rim.position.set(-4, 2.5, -3); scene.add(rim);
  const fill = new THREE.DirectionalLight('#9ec5ff', 0.5); fill.position.set(-3, 1.5, 4); scene.add(fill);

  // floor: soft shadow catcher + teletext green grid fading into the fog
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), new THREE.MeshStandardMaterial({ color: '#0c120e', roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(28, 56, '#2bd94d', '#164d22');
  grid.position.y = 0.002; grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);

  const ids = C().creations.map((c) => c.id);
  const items = ids.map((id) => {
    const m = BUILDERS[id]();
    m.id = id; m.group.visible = false; scene.add(m.group);
    m.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return m;
  });

  let index = 0, outgoing = null, swap = 1;
  items[0].group.visible = true;

  // orbit state: the camera circles the current creation's framing, plus what the visitor drags
  const orbit = { yaw: 0, pitch: 0, zoom: 1, idle: 0, auto: 0 };
  const frame = { target: items[0].frame.target.clone(), dist: items[0].frame.dist, pitch: items[0].frame.pitch, yaw: items[0].frame.yaw };

  function show(i) {
    i = (i + items.length) % items.length;
    if (i === index) return;
    outgoing = { item: items[index], t: 0, dir: Math.sign(i - index) || 1 };
    index = i; swap = 0;
    const it = items[index]; it.group.visible = true; it.group.scale.setScalar(0.001);
    orbit.yaw = 0; orbit.pitch = 0; orbit.zoom = 1; orbit.auto = 0;
  }

  function update(dt, t) {
    // swap animation: the old piece spins away and sinks, the new one spins in with a little overshoot
    if (outgoing) {
      outgoing.t = Math.min(1, outgoing.t + dt / 0.45);
      const k = easeIn(outgoing.t), g = outgoing.item.group;
      g.scale.setScalar(Math.max(0.001, 1 - k)); g.rotation.y = k * 1.4 * outgoing.dir; g.position.y = -k * 0.4;
      if (outgoing.t >= 1) { g.visible = false; g.scale.setScalar(1); g.rotation.y = 0; g.position.y = 0; outgoing = null; }
    }
    const it = items[index];
    if (swap < 1) {
      swap = Math.min(1, swap + dt / (reduceMotion ? 0.01 : 0.7));
      const k = backOut(swap);
      it.group.scale.setScalar(Math.max(0.001, k)); it.group.rotation.y = (1 - easeOut(swap)) * -1.4;
    }
    it.update(dt, t, camera);

    // camera glides between framings (a real 3D move, not a cut)
    const f = it.frame, a = 1 - Math.exp(-dt * 3.2);
    frame.target.lerp(f.target, a);
    frame.dist += (f.dist - frame.dist) * a; frame.pitch += (f.pitch - frame.pitch) * a; frame.yaw += (f.yaw - frame.yaw) * a;
    orbit.idle += dt;
    if (orbit.idle > 2.5 && !reduceMotion) orbit.auto += dt * 0.22;
    const yaw = frame.yaw + orbit.yaw + orbit.auto;
    const pitch = THREE.MathUtils.clamp(frame.pitch + orbit.pitch, 0.02, 1.25);
    // tall screens (phones) see less width: step back so the piece still fits;
    // wide screens step back a little too, to leave room for the file list and the info card
    const fit = camera.aspect < 1.2 ? Math.pow(1.2 / camera.aspect, 0.75) : camera.aspect > 1.4 ? 1.3 : 1;
    const d = frame.dist * orbit.zoom * fit;
    camera.position.set(
      frame.target.x + Math.sin(yaw) * Math.cos(pitch) * d,
      frame.target.y + Math.sin(pitch) * d,
      frame.target.z + Math.cos(yaw) * Math.cos(pitch) * d);
    camera.lookAt(frame.target);
  }

  // ---------- monitor feed: render target + a transparent title layer ----------
  // linear HDR: the room's post-processing tone-maps it together with everything else
  const feedRT = new THREE.WebGLRenderTarget(640, 480, { samples: 4, type: THREE.HalfFloatType });
  const overlayCanvas = document.createElement('canvas'); overlayCanvas.width = 640; overlayCanvas.height = 480;
  const overlayTex = new THREE.CanvasTexture(overlayCanvas); overlayTex.colorSpace = THREE.SRGBColorSpace;
  let overlayFor = '';
  function drawOverlay() {
    const key = `${index}|${T().feedTitle}`;
    if (key === overlayFor) return; overlayFor = key;
    const g = overlayCanvas.getContext('2d'), W = 640, H = 480;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#2b3dff'; g.fillRect(24, 22, W - 48, 40);
    g.font = 'bold 30px "VT323", monospace'; g.textBaseline = 'top';
    g.fillStyle = '#ffef3a'; g.fillText('ALBAN FREDON', 36, 26);
    const tt = T().feedTitle; g.fillStyle = '#ffffff'; g.fillText(tt, W - 36 - g.measureText(tt).width, 26);
    const c = C().creations[index];
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(24, H - 70, W - 48, 44);
    g.font = '30px "VT323", monospace'; g.fillStyle = '#3ef2ff'; g.fillText(`${index + 1}/${items.length}  ${c.title.toUpperCase()}`, 36, H - 63);
    g.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    const grad = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    overlayTex.needsUpdate = true;
  }
  drawOverlay();

  let feedAcc = 0, cycle = 0;
  // called while walking around: auto-cycle the creations and refresh the monitor ~30 times a second
  function renderFeed(renderer, dt, autoCycle) {
    if (autoCycle) { cycle += dt; if (cycle > 6) { cycle = 0; show(index + 1); } }
    drawOverlay();
    feedAcc += dt; if (feedAcc < 1 / 30) return; feedAcc = 0;
    setAspect(4 / 3);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(feedRT); renderer.render(scene, camera); renderer.setRenderTarget(prev);
  }

  // portrait full screen: lift the picture so the piece sits above the info card
  function setAspect(a) {
    if (camera.aspect === a) return;
    camera.aspect = a;
    if (a < 1) camera.setViewOffset(1000, 1000 / a, 0, (1000 / a) * 0.14, 1000, 1000 / a);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  return {
    scene, camera, setAspect, items, feedTexture: feedRT.texture, overlayTexture: overlayTex, update, renderFeed, show,
    index: () => index, current: () => items[index],
    next: () => show(index + 1), prev: () => show(index - 1),
    drag(dx, dy) { orbit.yaw -= dx * 0.008; orbit.pitch += dy * 0.005; orbit.pitch = THREE.MathUtils.clamp(orbit.pitch, -0.6, 0.8); orbit.idle = 0; },
    zoom(f) { orbit.zoom = THREE.MathUtils.clamp(orbit.zoom * f, 0.6, 1.5); orbit.idle = 0; },
    resetCycle() { cycle = 0; },
    invalidateOverlay() { overlayFor = ''; },
  };
}
