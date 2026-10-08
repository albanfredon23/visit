import * as THREE from 'three';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Camera flights between poses { pos, look, fov }, optionally curving through a via point.
export function createCameraRig(reduceMotion) {
  const cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 60 };
  let shot = null;

  function fly(to, dur = 1.6, via = null) {
    if (shot) { shot.resolve(); shot = null; }
    if (reduceMotion || dur === 0) { cam.pos.copy(to.pos); cam.look.copy(to.look); cam.fov = to.fov ?? cam.fov; return Promise.resolve(); }
    return new Promise((resolve) => {
      shot = { from: { pos: cam.pos.clone(), look: cam.look.clone(), fov: cam.fov }, to, via, t: 0, dur, resolve };
    });
  }

  function update(dt) {
    if (!shot) return;
    shot.t = Math.min(1, shot.t + dt / shot.dur);
    const k = ease(shot.t), { from, to, via } = shot;
    if (via) {
      const u = 1 - k;
      cam.pos.set(0, 0, 0).addScaledVector(from.pos, u * u).addScaledVector(via, 2 * u * k).addScaledVector(to.pos, k * k);
    } else cam.pos.lerpVectors(from.pos, to.pos, k);
    cam.look.lerpVectors(from.look, to.look, k);
    cam.fov = THREE.MathUtils.lerp(from.fov, to.fov ?? from.fov, k);
    if (shot.t >= 1) { const r = shot.resolve; shot = null; r(); }
  }

  return { cam, fly, update, isMoving: () => shot !== null };
}
