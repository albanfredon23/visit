import { C, T } from '../i18n.js';

// Teletext-style overlay on the CRT while the visitor browses the creations:
// title band, file list, the current project's card (with a link to its site) and the prev / next / exit bar.
export function createScreenUI(root, gallery, { onExit, onPricing, onType = () => {} }) {
  const el = {
    band: root.querySelector('#galBand'), menu: root.querySelector('#galMenu'), info: root.querySelector('#galInfo'),
    prev: root.querySelector('#btnPrev'), next: root.querySelector('#btnNext'), exit: root.querySelector('#btnExit'),
    view: root.querySelector('#galView'),
  };
  const coarse = matchMedia('(pointer: coarse)').matches;

  function render() {
    const c = C(), t = T(), i = gallery.index(), cr = c.creations[i], n = c.creations.length;
    el.band.innerHTML = `<span class="dbl">${t.galTitle}</span><span class="band__count">${i + 1}/${n}</span>`;
    el.menu.innerHTML = c.creations.map((x, k) =>
      `<li><button type="button" data-i="${k}" ${k === i ? 'aria-current="true"' : ''}><span class="k">${k + 1}</span>${x.title.toUpperCase()}</button></li>`).join('') +
      `<li><button type="button" data-i="p"><span class="k">${n + 1}</span>${t.pTitle.toUpperCase()}</button></li>`;
    el.info.innerHTML =
      `<p class="info__tag"><img class="info__logo" src="assets/logos/${cr.id}.svg" alt="" width="28" height="28">${cr.tag}</p>` +
      `<h2 class="info__title">${cr.title}</h2>` +
      `<p class="info__text">${cr.text}</p>` +
      `<p class="info__stack"><span class="g">${t.stack} :</span> ${cr.stack}</p>` +
      `<a class="info__link" href="${cr.url}" target="_blank" rel="noopener">${cr.code ? t.code : t.site}</a>` +
      `<p class="info__hint">${coarse ? t.dragTouch : t.drag}</p>`;
    // replay the little "teletext page load" each time the creation changes
    el.info.classList.remove('is-in'); void el.info.offsetWidth; el.info.classList.add('is-in');
    el.prev.textContent = t.prev; el.exit.textContent = t.exit;
    el.next.textContent = i === n - 1 ? t.toPricing : t.next;
    onType();
  }

  function go(k) {
    if (k === 'p') return onPricing();
    gallery.show(Number(k)); render();
  }

  el.menu.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.i); });
  el.prev.addEventListener('click', () => prev());
  el.next.addEventListener('click', () => next());
  el.exit.addEventListener('click', () => onExit());

  function next() { if (gallery.index() === C().creations.length - 1) return onPricing(); gallery.next(); render(); }
  function prev() { gallery.prev(); render(); }

  // drag to turn the project's scene, wheel to zoom
  let drag = null;
  el.view.addEventListener('pointerdown', (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; el.view.setPointerCapture(e.pointerId); });
  el.view.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    gallery.drag(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY;
  });
  const end = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
  el.view.addEventListener('pointerup', end); el.view.addEventListener('pointercancel', end);
  el.view.addEventListener('wheel', (e) => { e.preventDefault(); gallery.zoom(e.deltaY > 0 ? 1.08 : 0.93); }, { passive: false });

  return { render, next, prev, go, focus: () => el.menu.querySelector('[aria-current]')?.focus({ preventScroll: true }) };
}
