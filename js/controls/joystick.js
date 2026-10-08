// On-screen joystick for touch screens. Writes a { x, y } vector in [-1, 1] (y up = forward).
export function createJoystick(el, out) {
  const knob = el.querySelector('.joy__knob');
  let id = null, cx = 0, cy = 0;
  const R = 46;

  function set(dx, dy) {
    const d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
    dx *= k; dy *= k;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    out.x = dx / R; out.y = -dy / R;
  }
  el.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    id = e.pointerId; el.setPointerCapture(id);
    const r = el.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    el.classList.add('is-active'); set(e.clientX - cx, e.clientY - cy);
    e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e.clientX - cx, e.clientY - cy); });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null; el.classList.remove('is-active');
    knob.style.transform = ''; out.x = out.y = 0;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}
