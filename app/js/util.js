/* BIG BALLIN: constants, formatting, storage, sound, callouts, small render helpers. */
import { S } from './state.js?v=ede1dac';

export const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
/* Tab names shown in the app. The world board's name may change (e.g. 'WORLD HIGH SCORES'). */
export const LABELS = { world: 'TOP WORLD RANKINGS', worldShort: 'WORLD' };
/* How many rows the World Rankings board shows (plus your own row if you're further down). */
export const WORLD_ROWS = 100;
export const POSNAME = { PG: 'Point guard', SG: 'Shooting guard', SF: 'Small forward', PF: 'Power forward', C: 'Center' };
export const TEAM_COLORS = { ATL:'#C8102E', BOS:'#007A33', BKN:'#2A2A2A', CHA:'#1D1160', CHI:'#CE1141', CLE:'#860038', DAL:'#00538C', DEN:'#0E2240', DET:'#C8102E', GSW:'#1D428A', HOU:'#CE1141', IND:'#002D62', LAC:'#C8102E', LAL:'#552583', MEM:'#5D76A9', MIA:'#98002E', MIL:'#00471B', MIN:'#0C2340', NOP:'#0C2340', NYK:'#006BB6', OKC:'#007AC1', ORL:'#0077C0', PHI:'#006BB6', PHX:'#E56020', POR:'#E03A3E', SAC:'#5A2D81', SAS:'#5A5D60', TOR:'#CE1141', UTA:'#3E2680', WAS:'#002B5C' };

export const HOSTED = !['localhost', '127.0.0.1', ''].includes(location.hostname);

export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fold = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const money = (n) => '$' + n.toFixed(1) + 'M';
export const color = (team) => TEAM_COLORS[team] || '#2E2E4D';
export const where = (p) => `${p.team} ${p.home ? 'vs' : '@'} ${p.opp}`;
export const slotsFor = (p) => { const e = (p.positions || []).filter((x) => POS.includes(x)); return e.length ? e : ['SF']; };
export const chg = (p) => !p.price_change ? '' : (p.price_change > 0 ? '▲ ' : '▼ ') + Math.abs(p.price_change).toFixed(1);

export function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
export function recall(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

/* ---------- Sound & callouts ---------- */
export let audio = null;
export function beep(notes) {
  if (!S.sound) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = audio || new AC();
    let t = audio.currentTime;
    notes.forEach(([freq, dur]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + dur); t += dur;
    });
  } catch (e) {}
}
export let calloutTimer = null;
export function flash(text, col, shadow) {
  const el = $('#callout');
  el.textContent = text;
  el.style.color = col;
  el.style.textShadow = `4px 4px 0 #0B0B12, 9px 9px 0 ${shadow}`;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(calloutTimer);
  calloutTimer = setTimeout(() => { el.textContent = ''; el.classList.remove('pop'); }, 1350);
}

/* 8-bit headshot (data/sprites) on the team color; falls back to the jersey number if the image is missing. */
export function jersey(p, size) {
  const img = p.sprite ? `<img src="../data/${esc(p.sprite)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : '';
  return `<div class="jersey ${size || ''}" aria-hidden="true" style="background:${color(p.team)}">${esc(p.num || p.team)}${img}</div>`;
}
export function pills(cur, act) {
  return ['ALL'].concat(POS).map((v) => `<button class="pill" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${v}</button>`).join('');
}
export function matches(p, q) { if (!q) return true; const f = fold(q.trim()); return fold(p.name).includes(f) || p.team.toLowerCase() === f || p.opp.toLowerCase() === f; }

/* Shrink long player names to fit on one line (cards and slots), so every card
   lines up the same way. Elements with class "fit" are measured after render. */
export function fitNames(root) {
  (root || document).querySelectorAll('.fit').forEach((el) => {
    el.style.fontSize = '';
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && size > 14) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
  });
}
