import { C, T } from '../i18n.js';

// The price sheet that closes the visit: three packages, the permanent-job search and a contact button.
export function createPricingSheet(el, { onContact, onAgain, onClose }) {
  const body = el.querySelector('#pricingBody');

  function render() {
    const c = C(), t = T();
    body.innerHTML =
      `<header class="sheet__head"><h2 id="pricingTitle">${t.pTitle}</h2><p>${t.pLede}</p></header>` +
      `<ol class="offers">${c.offers.map((o, i) => `
        <li class="offer${o.star ? ' offer--star' : ''}" style="--i:${i}">
          ${o.star ? `<span class="offer__star">${o.star}</span>` : ''}
          <h3>${o.name}</h3>
          <p class="offer__price">${o.price} <span>${t.ht}</span></p>
          <p class="offer__time">${o.time}</p>
          <ul>${o.items.map((x) => `<li>${x}</li>`).join('')}</ul>
        </li>`).join('')}</ol>` +
      `<p class="cdi"><span class="cdi__dot" aria-hidden="true"></span><strong>${t.pCdi}</strong> ${c.cdi}</p>` +
      `<p class="sheet__note">${t.pNote}</p>` +
      `<div class="sheet__actions">
        <button type="button" class="ghost" data-a="again">${t.pAgain}</button>
        <button type="button" class="ghost" data-a="close">${t.pClose}</button>
        <button type="button" class="primary" data-a="contact">${t.pContact}</button>
      </div>`;
  }

  body.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'contact') onContact(); else if (a === 'again') onAgain(); else if (a === 'close') onClose();
  });

  function show() {
    render();
    el.classList.add('is-on'); el.setAttribute('aria-hidden', 'false');
    el.scrollTop = 0;
    setTimeout(() => body.querySelector('[data-a="contact"]')?.focus({ preventScroll: true }), 500);
  }
  function hide() { el.classList.remove('is-on'); el.setAttribute('aria-hidden', 'true'); }

  return { show, hide, render, isOpen: () => el.classList.contains('is-on') };
}
