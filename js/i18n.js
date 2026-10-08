import { I18N } from './data/content.js';

const LANG_KEY = 'alban-visit-lang';

let lang = (() => {
  try { const s = localStorage.getItem(LANG_KEY); if (s === 'fr' || s === 'en') return s; } catch (e) {}
  return (navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
})();

export const getLang = () => lang;
export const C = () => I18N[lang];
export const T = () => I18N[lang].ui;

export function storeLang(l) {
  lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
}
