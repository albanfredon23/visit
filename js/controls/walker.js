import * as THREE from 'three';

const EYE = 1.62, RADIUS = 0.28;

// First-person walking: WASD / ZQSD / arrows (read by physical key, so AZERTY works too),
// drag to look, an optional joystick vector, and collisions against the room and its furniture.
export function createWalker({ room, boxes, circles, reduceMotion, onStep = () => {} }) {
  // start near the door: on a wide screen the desk and the price board are both in view
  const pos = new THREE.Vector3(1.0, 0, 4.1);
  const vel = new THREE.Vector3();
  let yaw = innerWidth / innerHeight > 1.2 ? 0.0 : 0.2, pitch = -0.1, enabled = false, bob = 0, stepDist = 0, moved = false;
  const keys = new Set();
  const joy = { x: 0, y: 0 };

  const MAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  addEventListener('keydown', (e) => {
    if (!enabled || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.('input,textarea')) return;
    const k = MAP[e.code];
    if (k) { keys.add(k); e.preventDefault(); }
    if (e.key === 'Shift') keys.add('run');
  });
  addEventListener('keyup', (e) => { const k = MAP[e.code]; if (k) keys.delete(k); if (e.key === 'Shift') keys.delete('run'); });
  addEventListener('blur', () => keys.clear());

  function look(dx, dy) {
    // "grab the world": dragging left turns the view to the right, like a photo sphere
    yaw += dx * 0.0042; pitch += dy * 0.0034;
    pitch = THREE.MathUtils.clamp(pitch, -1.15, 1.1);
  }

  function collide() {
    for (const b of boxes) {
      const cx = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX), cz = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
      const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < RADIUS * RADIUS) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2), push = (RADIUS - d) / d; pos.x += dx * push; pos.z += dz * push; }
        else { // centre inside the box: leave by the nearest side
          const opts = [[b.minX - RADIUS - pos.x, 0], [b.maxX + RADIUS - pos.x, 0], [0, b.minZ - RADIUS - pos.z], [0, b.maxZ + RADIUS - pos.z]];
          opts.sort((p, q) => Math.hypot(...p) - Math.hypot(...q)); pos.x += opts[0][0]; pos.z += opts[0][1];
        }
      }
    }
    for (const c of circles) {
      const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + RADIUS;
      if (d < min && d > 1e-6) { pos.x = c.x + (dx / d) * min; pos.z = c.z + (dz / d) * min; }
    }
    pos.x = THREE.MathUtils.clamp(pos.x, room.minX + RADIUS, room.maxX - RADIUS);
    pos.z = THREE.MathUtils.clamp(pos.z, room.minZ + RADIUS, room.maxZ - RADIUS);
  }

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), want = new THREE.Vector3();
  function update(dt) {
    let f = 0, s = 0;
    if (enabled) {
      f = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0) + joy.y;
      s = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0) + joy.x;
    }
    const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
    const speed = keys.has('run') ? 3.1 : 1.8;
    fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    want.copy(fwd).multiplyScalar(f * speed).addScaledVector(right, s * speed);
    vel.lerp(want, 1 - Math.exp(-dt * 9));
    const before = pos.clone();
    pos.addScaledVector(vel, dt);
    collide();
    const travelled = before.distanceTo(pos);
    if (travelled > 0.0005) moved = true;
    bob += travelled * 5.2;
    stepDist += travelled;
    if (stepDist > 0.68) { stepDist = 0; onStep(); }
  }

  function pose(out) {
    const b = reduceMotion ? 0 : Math.sin(bob) * 0.025 * Math.min(1, vel.length() / 1.8);
    out.pos.set(pos.x, EYE + b, pos.z);
    out.look.set(pos.x - Math.sin(yaw) * Math.cos(pitch), EYE + b + Math.sin(pitch), pos.z - Math.cos(yaw) * Math.cos(pitch));
    return out;
  }

  // continue walking from wherever the camera is (after a camera move)
  function setFrom(camPos, lookAt) {
    pos.set(camPos.x, 0, camPos.z); collide();
    const d = lookAt.clone().sub(camPos).normalize();
    yaw = Math.atan2(-d.x, -d.z); pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    vel.set(0, 0, 0);
  }

  return {
    update, pose, look, setFrom, joy,
    position: pos,
    setEnabled(on) { enabled = on; if (!on) { keys.clear(); joy.x = joy.y = 0; } },
    isEnabled: () => enabled,
    hasMoved: () => moved,
  };
}
