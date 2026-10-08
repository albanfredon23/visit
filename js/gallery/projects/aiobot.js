import * as THREE from 'three';
import { add, glow, glass, plinth, sign, rbox, mat, slogan } from '../kit.js';

// AIOBot, "le robot qui imagine avant d'agir": a two-axis arm on its workbench, the ghost arm the
// world model imagines at the end of the plan, the χ² ring around the tool, the operator inside the
// protected sphere, and the XAI ledger (green = EXECUTE, amber = HOLD).
const C = { bg: '#0a0f14', surface: '#0c171c', arm: '#f59e0b', ghost: '#2dd4bf', slate: '#94a3b8', light: '#e2e8f0', safe: '#4ade80', warn: '#fbbf24', danger: '#ff7a7a' };

function buildArm(parent, material, jointMat) {
  const base = new THREE.Group(); parent.add(base);
  add(base, new THREE.CylinderGeometry(0.14, 0.17, 0.12, 32), mat('#334155', { metalness: 0.6, roughness: 0.35 }), [0, 0.06, 0]);
  const shoulder = new THREE.Group(); shoulder.position.y = 0.16; base.add(shoulder);
  add(shoulder, new THREE.SphereGeometry(0.07, 20, 14), jointMat);
  add(shoulder, rbox(0.08, 0.55, 0.08, 0.03), material, [0, 0.275, 0]);
  const elbow = new THREE.Group(); elbow.position.y = 0.55; shoulder.add(elbow);
  add(elbow, new THREE.SphereGeometry(0.06, 20, 14), jointMat);
  add(elbow, rbox(0.065, 0.45, 0.065, 0.025), material, [0, 0.225, 0]);
  const tool = new THREE.Group(); tool.position.y = 0.45; elbow.add(tool);
  add(tool, new THREE.CylinderGeometry(0.04, 0.03, 0.08, 16), jointMat, [0, 0.03, 0]);
  return { base, shoulder, elbow, tool };
}

export function aiobot() {
  const group = new THREE.Group();
  plinth(group, { bg: C.bg, accent: C.ghost });
  const label = sign(group, { logo: 'assets/logos/aiobot.svg', name: 'AIOBot', tagline: slogan('aiobot'), bg: C.bg, accent: C.ghost, y: 2.3 });

  // workbench with its safety edge
  add(group, rbox(1.9, 0.06, 1.0, 0.02), mat('#1e293b', { roughness: 0.5 }), [0, 0.13, 0]);
  const stripes = document.createElement('canvas'); stripes.width = 256; stripes.height = 16;
  const sg = stripes.getContext('2d'); sg.fillStyle = '#fbbf24'; sg.fillRect(0, 0, 256, 16); sg.fillStyle = '#111';
  for (let x = -16; x < 256; x += 32) { sg.beginPath(); sg.moveTo(x, 16); sg.lineTo(x + 16, 0); sg.lineTo(x + 32, 0); sg.lineTo(x + 16, 16); sg.fill(); }
  const st = new THREE.CanvasTexture(stripes); st.colorSpace = THREE.SRGBColorSpace; st.wrapS = THREE.RepeatWrapping; st.repeat.set(4, 1);
  add(group, new THREE.BoxGeometry(1.9, 0.02, 0.02), new THREE.MeshStandardMaterial({ map: st }), [0, 0.165, 0.5]);

  const arm = buildArm(group, mat(C.arm, { roughness: 0.35, metalness: 0.2 }), mat(C.light, { roughness: 0.3, metalness: 0.5 }));
  arm.base.position.set(-0.35, 0.16, -0.1);
  const ghostMat = glass(C.ghost, { opacity: 0.25, emissive: C.ghost, emissiveIntensity: 0.6 });
  const ghost = buildArm(group, ghostMat, ghostMat);
  ghost.base.position.copy(arm.base.position);
  ghost.base.children[0].visible = false;

  // χ² ring around the tool
  const chi = add(group, new THREE.TorusGeometry(0.11, 0.008, 8, 48), glow(C.safe, 2.2), [0, 0, 0]);
  chi.castShadow = false;

  // stations and payload
  const stations = [[0.35, 0.3], [0.5, -0.25]].map(([x, z]) => add(group, rbox(0.22, 0.06, 0.22, 0.02), mat('#334155', { roughness: 0.4 }), [x, 0.19, z]));
  const payload = add(group, rbox(0.09, 0.09, 0.09, 0.015), mat('#60a5fa', { roughness: 0.4 }), [0, 0, 0]);

  // operator in the protected sphere
  const op = new THREE.Group(); op.position.set(0.98, 0.1, 0.35); group.add(op);
  add(op, new THREE.CapsuleGeometry(0.09, 0.35, 6, 14), mat(C.slate, { roughness: 0.7 }), [0, 0.3, 0]);
  add(op, new THREE.SphereGeometry(0.075, 20, 14), mat(C.slate, { roughness: 0.6 }), [0, 0.6, 0]);
  add(op, new THREE.SphereGeometry(0.42, 32, 20), glass(C.danger, { opacity: 0.06 }), [0, 0.38, 0]);

  // ledger
  const blocks = [];
  for (let i = 0; i < 7; i++) blocks.push(add(group, rbox(0.1, 0.1, 0.1, 0.02), mat('#16222b', { roughness: 0.3, metalness: 0.5 }), [-0.75 + i * 0.2, 0.22, 0.42]));
  const exec = glow(C.safe, 1.6), hold = glow(C.warn, 1.6);

  const tip = new THREE.Vector3();
  const pose = (a, s, e) => { a.base.rotation.y = s.yaw; a.shoulder.rotation.z = s.sh; a.elbow.rotation.z = e; };
  return {
    group, frame: { target: new THREE.Vector3(0.1, 0.65, 0), dist: 3.2, pitch: 0.32, yaw: 0.7 },
    update(dt, t, camera) {
      label.face(camera);
      const ph = t * 0.6;
      const now = { yaw: Math.sin(ph) * 1.1 - 0.4, sh: -0.55 + Math.sin(ph * 1.3) * 0.25 };
      const ahead = { yaw: Math.sin(ph + 0.7) * 1.1 - 0.4, sh: -0.55 + Math.sin((ph + 0.7) * 1.3) * 0.25 };
      pose(arm, now, -1.2 + Math.cos(ph * 1.3) * 0.35);
      pose(ghost, ahead, -1.2 + Math.cos((ph + 0.7) * 1.3) * 0.35);
      arm.tool.getWorldPosition(tip); group.worldToLocal(tip);
      chi.position.copy(tip); chi.lookAt(camera.position);
      const alert = Math.sin(t * 0.9) > 0.85;
      chi.material.color.set(alert ? C.warn : C.safe); chi.material.emissive.set(alert ? C.warn : C.safe);
      payload.position.copy(tip).add(new THREE.Vector3(0, 0.04, 0));
      const n = Math.floor(t * 1.5);
      blocks.forEach((b, i) => { b.material = (i + n) % 5 === 0 ? hold : exec; b.material.emissiveIntensity = 0.8; });
      stations.forEach((s, i) => { s.material.emissive?.set?.('#000'); });
    },
  };
}
