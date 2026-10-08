import * as THREE from 'three';
import { getLang, storeLang, T } from './i18n.js';
import { createRenderer } from './render.js';
import { buildRoom, ROOM } from './scene/room.js';
import { buildDesk } from './scene/desk.js';
import { buildAvatar } from './scene/avatar.js';
import { createGallery } from './gallery/gallery.js';
import { createWalker } from './controls/walker.js';
import { createJoystick } from './controls/joystick.js';
import { createCameraRig } from './camera-rig.js';
import { createScreenUI } from './ui/screen-ui.js';
import { createPricingSheet } from './ui/pricing.js';
import { createContactCard } from './ui/contact.js';
import { createAudio } from './audio.js';

/* =========================================================
   Renderer, room, lights
   ========================================================= */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
document.documentElement.classList.toggle('is-touch', coarse);
const canvas = document.getElementById('scene');
const R = createRenderer(canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1b1410');
scene.environment = R.environment;
scene.environmentIntensity = 0.22;
const camera = new THREE.PerspectiveCamera(60, 1, 0.03, 40);

scene.add(new THREE.HemisphereLight('#ffd9b0', '#2a1c14', 0.42));
const key = new THREE.DirectionalLight('#ffe2c0', 1.25);
key.position.set(3.4, 6, 3.8); key.target.position.set(0.7, 0, 1.7); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.025;
Object.assign(key.shadow.camera, { left: -4.4, right: 4.4, top: 4.4, bottom: -4.4, near: 1, far: 14 });
scene.add(key, key.target);
const deskLamp = new THREE.PointLight('#ffb35c', 3.2, 3.2, 1.6);
deskLamp.position.set(0.66, 1.2, -0.5); deskLamp.castShadow = true; deskLamp.shadow.mapSize.set(512, 512);
scene.add(deskLamp);
const pendant = new THREE.PointLight('#ffd7a0', 5, 7, 1.5); pendant.position.set(0.7, 2.02, 1.7); scene.add(pendant);
const floorLamp = new THREE.PointLight('#ffc27a', 3, 4.5, 1.6); floorLamp.position.set(3.2, 1.55, 4.2); scene.add(floorLamp);
const moon = new THREE.PointLight('#7fa8ff', 2.2, 4.5, 1.8); moon.position.set(-1.7, 1.7, 2.5); scene.add(moon);
const screenLight = new THREE.PointLight('#9fffb0', 0.6, 1.6, 2); screenLight.position.set(0, 1.08, -0.3); scene.add(screenLight);
const fill = new THREE.DirectionalLight('#ffe9d2', 0.22); scene.add(fill, fill.target); // follows the camera
R.trackShadows(key, deskLamp);

const roomParts = buildRoom(scene);
const gallery = createGallery({ environment: R.environment, reduceMotion });
const { monitor, screenWorld } = buildDesk(scene, { screenTexture: gallery.feedTexture, overlayTexture: gallery.overlayTexture });
const alban = buildAvatar(scene);
monitor.userData.kind = 'screen';
roomParts.board.userData.kind = 'pricing';
alban.chair.userData.kind = 'avatar';

const audio = createAudio();
const walker = createWalker({
  room: ROOM,
  boxes: [{ minX: -0.9, maxX: 0.9, minZ: ROOM.minZ, maxZ: -0.18 }, ...roomParts.boxes],
  circles: [{ x: 0, z: 0.14, r: 0.36 }, ...roomParts.circles],
  reduceMotion, onStep: () => audio.step(),
});
const rig = createCameraRig(reduceMotion);

/* ---------- named camera poses ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const narrow = () => innerWidth < 760;
const SHOTS = {
  screen: () => ({ pos: screenWorld.clone().add(V(0, 0, 0.42)), look: screenWorld.clone(), fov: 40 }),
  front: () => narrow()
    ? { pos: V(0.2, 1.85, 3.3), look: V(0.05, 0.72, 0.0), fov: 52 }
    : { pos: V(0.7, 1.5, 2.75), look: V(0.62, 1.12, 0.1), fov: 42 },
  board: () => ({ pos: V(ROOM.maxX - (narrow() ? 2.2 : 1.7), 1.55, 0.55), look: V(ROOM.maxX, 1.5, 0.55), fov: 50 }),
};

/* =========================================================
   State machine
   boot -> walk <-> (fly -> screen -> leaving) -> pricing -> contact -> walk
   ========================================================= */
let state = 'boot';
const setState = (s) => { state = s; document.body.dataset.state = s; };
setState('boot');
const ui = {
  hint: document.getElementById('hint'), hintText: document.getElementById('hintText'), lockup: document.getElementById('lockup'),
  act: document.getElementById('act'), actText: document.getElementById('actText'), actKey: document.getElementById('actKey'),
  crt: document.getElementById('crt'), bubble: document.getElementById('bubble'),
};
const anim = { swivel: 0, swivelTarget: 0, wave: 0, talk: 0, lookAtCam: 0, lookAtCamTarget: 0, lookT: 3 };
let walkReturn = null; // pose to fly back to after looking at the board

const screenUI = createScreenUI(ui.crt, gallery, {
  onExit: () => leaveScreen(), onPricing: () => leaveScreen(), onType: () => audio.key(0.6),
});
const pricing = createPricingSheet(document.getElementById('pricing'), {
  onContact: () => showContact(), onAgain: () => enterScreen(), onClose: () => resumeWalk(),
});
const contact = createContactCard(document.getElementById('contact'));

const poseOf = () => ({ pos: rig.cam.pos.clone(), look: rig.cam.look.clone(), fov: rig.cam.fov });

async function enterScreen() {
  if (!['walk', 'pricing', 'contact'].includes(state)) return;
  const from = state;
  setState('fly');
  walker.setEnabled(false); pricing.hide(); contact.hide(); hideBubble();
  anim.swivelTarget = 0; anim.lookAtCamTarget = 0;
  // swoop over Alban's shoulder and into the glass
  const via = from === 'walk' ? rig.cam.pos.clone().lerp(screenWorld, 0.55).add(V(0.25, 0.35, 0.6)) : V(0.5, 1.6, 0.9);
  await rig.fly(SHOTS.screen(), from === 'walk' ? 1.9 : 2.1, via);
  // the monitor already shows the creations: switch to drawing that same set full screen
  setState('screen');
  R.setView(gallery.scene, gallery.camera);
  resize();
  ui.crt.classList.remove('is-off'); ui.crt.classList.add('is-on'); ui.crt.setAttribute('aria-hidden', 'false');
  audio.powerOn();
  screenUI.render();
  setTimeout(() => screenUI.focus(), 400);
}

async function leaveScreen() {
  if (state !== 'screen') return;
  setState('leaving');
  ui.crt.classList.add('is-off');
  await wait(reduceMotion ? 0 : 420);
  ui.crt.classList.remove('is-on', 'is-off'); ui.crt.setAttribute('aria-hidden', 'true');
  R.setView(scene, camera);
  resize();
  await rig.fly({ pos: SHOTS.screen().pos.add(V(0, 0.05, 0.5)), look: screenWorld.clone(), fov: 46 }, 0.6);
  anim.swivelTarget = -(Math.PI - 0.3); anim.lookAtCamTarget = 1; // Alban swivels round to face the visitor
  await rig.fly(SHOTS.front(), 1.5, V(1.2, 1.55, 0.9));
  setState('pricing');
  anim.wave = 2.2; anim.talk = 1.6;
  pricing.show();
}

async function openBoard() {
  if (state !== 'walk') return;
  setState('fly'); walker.setEnabled(false); hideBubble();
  walkReturn = poseOf();
  await rig.fly(SHOTS.board(), 1.3);
  setState('pricing');
  pricing.show();
}

async function showContact() {
  pricing.hide();
  if (walkReturn) { // came from the board: go and meet Alban first
    walkReturn = null;
    setState('fly');
    anim.swivelTarget = -(Math.PI - 0.3); anim.lookAtCamTarget = 1;
    await rig.fly(SHOTS.front(), 1.6, V(2.2, 1.7, 1.8));
  }
  setState('contact');
  contact.show();
  anim.wave = 2.4; anim.talk = 1.8;
}

async function resumeWalk() {
  pricing.hide(); contact.hide();
  anim.swivelTarget = 0; anim.lookAtCamTarget = 0;
  if (walkReturn) { setState('fly'); await rig.fly(walkReturn, 1.1); walkReturn = null; }
  walker.setFrom(rig.cam.pos, rig.cam.look);
  setState('walk');
  walker.setEnabled(true);
  rig.cam.fov = 60;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Alban's speech bubble ---------- */
let bubbleT = 0, bubbleN = 0;
function sayHello() {
  anim.wave = 2.4; anim.talk = 2; anim.lookAtCamTarget = 1; anim.lookT = 4;
  const lines = T().bubble;
  ui.bubble.textContent = lines[bubbleN++ % lines.length];
  ui.bubble.classList.add('is-on'); bubbleT = 3.6;
}
function hideBubble() { ui.bubble.classList.remove('is-on'); bubbleT = 0; }

/* ---------- picking what the visitor is looking at / clicking ---------- */
const ray = new THREE.Raycaster();
const pickables = [monitor, roomParts.board, alban.chair, roomParts.room];
function pick(ndc, maxDist = 7) {
  ray.setFromCamera(ndc, camera); ray.far = maxDist;
  const hit = ray.intersectObjects(pickables, true)[0];
  if (!hit) return null;
  for (let o = hit.object; o; o = o.parent) if (o.userData.kind) return { kind: o.userData.kind, dist: hit.distance };
  return null;
}
function act(kind) {
  if (kind === 'screen') enterScreen();
  else if (kind === 'pricing') openBoard();
  else if (kind === 'avatar') sayHello();
}
let aimed = null;
function updateAim() {
  const hit = state === 'walk' ? pick(new THREE.Vector2(0, 0), 3.4) : null;
  const kind = hit?.kind ?? null;
  if (kind === aimed) return;
  aimed = kind;
  ui.act.hidden = !kind;
  if (kind) { ui.actText.textContent = T().act[kind]; ui.actKey.textContent = coarse ? T().actTap : T().actKey; }
}
ui.act.addEventListener('click', () => aimed && act(aimed));

/* ---------- pointer: drag to look, click to use ---------- */
const pointer = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  if (down) return;
  down = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  if (down && e.pointerId === down.id) {
    if (state === 'walk') walker.look(e.clientX - down.x, e.clientY - down.y);
    down.x = e.clientX; down.y = e.clientY;
    canvas.style.cursor = 'grabbing';
  } else if (state === 'walk' && !coarse) {
    canvas.style.cursor = pick(pointer)?.kind ? 'pointer' : 'grab';
  }
});
const endPointer = (e) => {
  if (!down || e.pointerId !== down.id) return;
  const moved = Math.hypot(e.clientX - down.sx, e.clientY - down.sy); down = null;
  canvas.style.cursor = state === 'walk' ? 'grab' : 'default';
  if (moved < 7 && state === 'walk' && e.type === 'pointerup') {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const hit = pick(pointer); if (hit) act(hit.kind);
  }
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
createJoystick(document.getElementById('joy'), walker.joy);

/* ---------- keyboard ---------- */
addEventListener('keydown', (e) => {
  if (state === 'walk') {
    if ((e.code === 'KeyE' || e.key === 'Enter') && aimed && document.activeElement === document.body) { e.preventDefault(); act(aimed); }
  } else if (state === 'screen') {
    if (e.key === 'Escape') { e.preventDefault(); leaveScreen(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); screenUI.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); screenUI.prev(); }
    else if (/^[1-7]$/.test(e.key)) screenUI.go(e.key === '7' ? 'p' : String(Number(e.key) - 1));
    else if (e.key.toLowerCase() === 'l') setLang(getLang() === 'fr' ? 'en' : 'fr');
  } else if ((state === 'pricing' || state === 'contact') && e.key === 'Escape') resumeWalk();
});
document.getElementById('btnAgain').addEventListener('click', () => enterScreen());
document.getElementById('btnWalk').addEventListener('click', () => resumeWalk());

/* ---------- language ---------- */
function applyStaticText() {
  const t = T(), lang = getLang();
  document.documentElement.lang = lang;
  ui.hintText.textContent = coarse ? t.hintTouch : t.hintDesk;
  document.getElementById('lockupText').textContent = t.lockup;
  document.getElementById('contactTitle').textContent = t.cTitle;
  document.getElementById('contactLede').textContent = t.cLede;
  document.getElementById('btnAgain').textContent = t.again;
  document.getElementById('btnWalk').textContent = t.walk;
  canvas.setAttribute('aria-label', t.canvas);
  document.getElementById('bootStart').textContent = t.start;
  document.getElementById('btnSound').setAttribute('aria-label', t.sound);
  renderBoot();
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}
function setLang(l) {
  if (l === getLang()) return;
  storeLang(l);
  applyStaticText();
  roomParts.redraw(); gallery.invalidateOverlay();
  aimed = undefined;
  if (contact.isOpen()) contact.render();
  if (pricing.isOpen()) pricing.render();
  if (state === 'screen') screenUI.render();
}
document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));

/* ---------- BIOS boot screen ---------- */
const boot = { el: document.getElementById('boot'), log: document.getElementById('bootLog'), start: document.getElementById('bootStart'), shown: 0, dots: 0, ready: false };
function renderBoot() {
  const lines = T().bios.slice(0, boot.shown);
  boot.log.innerHTML = lines.map((l, i) => {
    if (typeof l === 'string') return i < 2 ? `<span class="hd">${l}</span>` : l;
    const last = i === boot.shown - 1;
    const pad = ' ' + '.'.repeat(last && !boot.ready && i === T().bios.length - 1 ? boot.dots : Math.max(3, 52 - l[0].length)) + ' ';
    const done = !(last && i === T().bios.length - 1 && !boot.ready);
    return `${l[0]}${pad}${done ? `<span class="ok">${l[1]}</span>` : ''}`;
  }).join('\n');
}
function runBoot(sceneReady) {
  const total = T().bios.length;
  const step = () => {
    if (boot.shown < total) { boot.shown++; renderBoot(); setTimeout(step, reduceMotion ? 0 : 130 + Math.random() * 150); return; }
    const dotsTimer = setInterval(() => { boot.dots = (boot.dots + 1) % 40; renderBoot(); }, 60);
    sceneReady.then(() => {
      clearInterval(dotsTimer); boot.ready = true; renderBoot();
      boot.start.hidden = false; boot.start.focus({ preventScroll: true });
    });
  };
  step();
}
boot.start.addEventListener('click', async () => {
  audio.unlock();
  boot.el.classList.add('is-done');
  // walk-in: the camera rises from the doorway into the room
  setState('fly');
  const start = walker.pose({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
  rig.cam.pos.set(2.7, 1.1, 4.4); rig.cam.look.set(1.2, 1.2, 1.5); rig.cam.fov = 70;
  await rig.fly({ ...start, fov: 60 }, 2.2);
  setState('walk'); walker.setEnabled(true);
  canvas.style.cursor = coarse ? 'default' : 'grab';
});

/* ---------- sound ---------- */
const btnSound = document.getElementById('btnSound');
btnSound.setAttribute('aria-pressed', String(audio.isEnabled()));
btnSound.addEventListener('click', () => {
  audio.unlock();
  audio.setEnabled(!audio.isEnabled());
  btnSound.setAttribute('aria-pressed', String(audio.isEnabled()));
});
applyStaticText();

/* =========================================================
   Loop
   ========================================================= */
function resize() {
  R.resize();
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (state === 'screen') gallery.setAspect(innerWidth / innerHeight);
  if (!rig.isMoving()) {
    if (state === 'contact' || (state === 'pricing' && !walkReturn)) rig.fly(SHOTS.front(), 0);
  }
}
addEventListener('resize', resize);

const clock = new THREE.Clock();
const walkPose = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
const tmp = new THREE.Vector3(), head = new THREE.Vector3();
let aimAcc = 0, keyAcc = 0;

function animate() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;

  if (state === 'walk') {
    walker.update(dt);
    walker.pose(walkPose);
    rig.cam.pos.copy(walkPose.pos); rig.cam.look.copy(walkPose.look);
  } else rig.update(dt);

  // Alban: types at his desk, turns to look at a visitor who comes close
  const near = Math.hypot(rig.cam.pos.x, rig.cam.pos.z - 0.14);
  if (state === 'walk' || state === 'boot' || state === 'fly') {
    anim.lookT -= dt;
    if (state === 'walk' && near < 2.6) anim.lookAtCamTarget = 1;
    else if (anim.lookT < 0) { anim.lookAtCamTarget = anim.lookAtCamTarget ? 0 : 1; anim.lookT = anim.lookAtCamTarget ? 2.6 : 4 + Math.random() * 3; }
    if (state === 'fly' && !walkReturn) anim.lookAtCamTarget = 0;
    const toward = Math.atan2(-rig.cam.pos.x, -(rig.cam.pos.z - 0.14));
    anim.swivelTarget = anim.lookAtCamTarget ? THREE.MathUtils.clamp(toward * 0.5, -1.3, 1.3) : 0;
  }
  anim.lookAtCam += (anim.lookAtCamTarget - anim.lookAtCam) * Math.min(1, dt * 5);
  anim.swivel += (anim.swivelTarget - anim.swivel) * Math.min(1, dt * 3.2);
  anim.wave = Math.max(0, anim.wave - dt); anim.talk = Math.max(0, anim.talk - dt);
  const typingNow = anim.lookAtCam < 0.4 && (t % 5) < 3.6;
  if (typingNow && near < 3.5 && state === 'walk') { keyAcc += dt; if (keyAcc > 0.09) { keyAcc = 0; if (Math.random() < 0.7) audio.key(0.25); } }
  alban.update(dt, t, camera, { swivel: anim.swivel, lookAtCam: anim.lookAtCam, typingNow, wave: anim.wave, talk: anim.talk });

  // speech bubble follows Alban's head
  if (bubbleT > 0) {
    bubbleT -= dt; if (bubbleT <= 0) hideBubble();
    alban.head.getWorldPosition(head); head.y += 0.62;
    tmp.copy(head).project(camera);
    const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    ui.bubble.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
    ui.bubble.style.visibility = vis ? 'visible' : 'hidden';
  }

  aimAcc += dt; if (aimAcc > 0.1) { aimAcc = 0; updateAim(); }

  gallery.update(dt, t);
  if (state === 'screen') {
    R.render(dt, t);
  } else {
    gallery.renderFeed(R.renderer, dt, state !== 'fly');
    screenLight.intensity = 0.6 + Math.sin(t * 30) * 0.03 + (state === 'fly' ? 0.5 : 0);
    camera.position.copy(rig.cam.pos);
    if (camera.fov !== rig.cam.fov) { camera.fov = rig.cam.fov; camera.updateProjectionMatrix(); }
    camera.lookAt(rig.cam.look);
    fill.position.copy(camera.position); fill.target.position.copy(rig.cam.look);
    R.render(dt, t);
  }
  requestAnimationFrame(animate);
}

R.setView(scene, camera);
const fontsReady = document.fonts.load('30px "VT323"').catch(() => {});
fontsReady.then(() => runBoot(new Promise((resolve) => {
  const p = walker.pose({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
  rig.cam.pos.copy(p.pos); rig.cam.look.copy(p.look);
  resize();
  requestAnimationFrame(() => { animate(); setTimeout(resolve, reduceMotion ? 0 : 500); });
})));
