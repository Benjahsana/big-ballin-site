/* BIG BALLIN: 36 original avatars (no real people, no mascots), drawn as smooth cartoon SVG in the
   NEON ARCADE finish (Nov 19, replaced the 12×12 pixel art): retro-wave sky, a "sun" in the avatar's own
   color, a glowing grid, cyan glowing outlines. The database stores only the number (profiles.avatar,
   0–35). New avatars go at the END of the list (the number is what's saved), and schema.sql's
   profiles_avatar_range must allow the new top number.

   Swag (swag.js) is drawn here too, in layers: back hair → shirt (fit) → neck item → head → face → face
   item → front hair (hair item) → titles. All gear is drawn for a "reference head" (center 50,45, radius
   23×26, the people's head); a character's `box` maps that head onto its own, and `eyes` / `mouth` place
   shades, grills and toothpicks. Gradients, clips and the glow filter live once in a hidden <svg> (BBX). */
import { lookOf, lookKey, frameOf, rarityOf } from './swag.js?v=4150944';

const OL = '#3DE0FF';      // neon outline
const INK = '#140E1C';     // eyes, fine lines
const W = '#F4F1E8';
const SKIN = { a: '#5C3A21', b: '#8D5524', c: '#C68642', d: '#E0AC69', e: '#F1C27D' };
const st = (w = 2.2, c = OL) => `stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const SHIRT = 'M14 100 C16 84 28 77 50 77 C72 77 84 84 86 100 Z';
const TIEDYE = ['#FF4A3D', '#FF9F1C', '#FFE14D', '#4CD964', '#3D8BFF', '#B26BFF'];

/* ---------- Shared defs (once per page) ---------- */
const DEFS = `<defs>
  <linearGradient id="bbx-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140630"/><stop offset=".6" stop-color="#3A0F5C"/><stop offset=".6" stop-color="#0B0B12"/><stop offset="1" stop-color="#0B0B12"/></linearGradient>
  <radialGradient id="bbx-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="bbx-shine" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
  <linearGradient id="bbx-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6B0"/><stop offset=".45" stop-color="#FFD23F"/><stop offset="1" stop-color="#B07800"/></linearGradient>
  <linearGradient id="bbx-silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#C9CCE0"/><stop offset="1" stop-color="#7A7F99"/></linearGradient>
  <linearGradient id="bbx-ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".4" stop-color="#BFF6FF"/><stop offset=".7" stop-color="#7FD1FF"/><stop offset="1" stop-color="#E9FCFF"/></linearGradient>
  <linearGradient id="bbx-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF2E1F"/><stop offset=".55" stop-color="#FF9F1C"/><stop offset="1" stop-color="#FFE14D"/></linearGradient>
  <radialGradient id="bbx-visor" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#9FE7FF"/><stop offset=".5" stop-color="#3D8BFF"/><stop offset="1" stop-color="#1D1160"/></radialGradient>
  <clipPath id="bbx-shirt"><path d="${SHIRT}"/></clipPath>
  <clipPath id="bbx-frame"><rect width="100" height="100"/></clipPath>
  <filter id="bbx-glow" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="b"/>
    <feFlood flood-color="${OL}" flood-opacity=".85"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="bbx-card-common" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9C7DD"/><stop offset=".5" stop-color="#55546B"/><stop offset="1" stop-color="#C9C7DD"/></linearGradient>
  <linearGradient id="bbx-card-rare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9FCBFF"/><stop offset=".5" stop-color="#1D4FBF"/><stop offset="1" stop-color="#9FCBFF"/></linearGradient>
  <linearGradient id="bbx-card-epic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E3BDFF"/><stop offset=".5" stop-color="#6A22C2"/><stop offset="1" stop-color="#E3BDFF"/></linearGradient>
  <linearGradient id="bbx-card-legendary" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6B0"/><stop offset=".5" stop-color="#C98F00"/><stop offset="1" stop-color="#FFF6B0"/></linearGradient>
  <linearGradient id="bbx-foil" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".38"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/>
    <animate attributeName="x1" values="-1;1" dur="3s" repeatCount="indefinite"/><animate attributeName="x2" values="0;2" dur="3s" repeatCount="indefinite"/></linearGradient>
</defs>`;
let defsIn = false;
function ensureDefs() {
  if (defsIn || typeof document === 'undefined' || !document.body) return;
  defsIn = true;
  const d = document.createElement('div');
  d.setAttribute('aria-hidden', 'true');
  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = `<svg width="0" height="0" focusable="false">${DEFS}</svg>`;
  document.body.appendChild(d);
}

/* ---------- People ---------- */
// The reference head: the people's head and where every hair item is drawn.
const HEAD = { cx: 50, cy: 45, rx: 23, ry: 26 };
const P = (name, bg, o) => ({ name, bg, person: true, ...o });

function hairBack(style, h, a) {
  switch (style) {
    case 'afro': return afroBack(h.H, 36, 31);
    case 'long': case 'longband': return `<path d="M24 46 Q22 18 50 16 Q78 18 76 46 L80 84 Q66 90 50 88 Q34 90 20 84 Z" fill="${h.H}" ${st()}/>`;
    case 'pony': return `<path d="M70 30 Q90 34 86 58 Q84 72 74 80 Q80 62 72 44 Z" fill="${h.H}" ${st()}/>`;
    case 'durag': return `<path d="M66 40 Q84 48 82 74 Q76 66 70 56 Z" fill="${a}" ${st()}/>`;
    default: return '';
  }
}
function hairFront(style, h, a, t) {
  switch (style) {
    case 'flat': return `<path d="M26 40 L26 8 Q26 4 30 4 L70 4 Q74 4 74 8 L74 40 Q70 28 50 27 Q30 28 26 40Z" fill="${h.H}" ${st()}/><path d="M31 9 L69 9" stroke="#fff" stroke-opacity=".18" stroke-width="3"/>`;
    case 'band': return `${capHair(h.H)}<path d="M27.5 33 Q50 24 72.5 33 L73 38 Q50 29 27 38Z" fill="${a}" ${st(1.4)}/>`;
    case 'afro': return `<path d="M27 38 Q30 18 50 17 Q70 18 73 38 Q62 28 50 29 Q38 28 27 38Z" fill="${h.H}"/>`;
    case 'buzz': return capHair(h.H, 0.85);
    case 'cap': return `<path d="M26 36 Q26 14 50 13 Q74 14 74 36 Z" fill="${a}" ${st()}/><path d="M52 34 Q74 30 90 36 Q76 40 56 39 Z" fill="${a}" ${st(1.8)}/><circle cx="50" cy="14" r="2.4" fill="${a}" ${st(1.2)}/><path d="M36 20 Q42 16 50 16" stroke="#fff" stroke-opacity=".3" stroke-width="2.5" fill="none"/>`;
    case 'mohawk': return `<path d="M43 30 L40 6 L46 14 L50 1 L54 14 L60 6 L57 30 Q50 27 43 30Z" fill="${h.H}" ${st(1.8)}/>`;
    case 'bald': return `<ellipse cx="42" cy="26" rx="7" ry="3.5" fill="#fff" opacity=".3" transform="rotate(-20 42 26)"/>`;
    case 'bun': return `${capHair(h.H)}<circle cx="50" cy="12" r="9" fill="${h.H}" ${st()}/>`;
    case 'long': return `<path d="M27 42 Q28 18 50 17 Q72 18 73 42 Q66 26 50 30 Q38 27 27 42Z" fill="${h.H}"/>`;
    case 'longband': return `<path d="M27 42 Q28 18 50 17 Q72 18 73 42 Q66 26 50 30 Q38 27 27 42Z" fill="${h.H}"/><path d="M27 31 Q50 21 73 31 L73 36 Q50 26 27 36Z" fill="${a}" ${st(1.4)}/>`;
    case 'pony': return capHair(h.H);
    case 'durag': return `<path d="M26 40 Q26 15 50 14 Q74 15 74 40 Q66 30 50 30 Q34 30 26 40Z" fill="${a}" ${st()}/><path d="M34 22 Q50 16 66 22" stroke="#fff" stroke-opacity=".25" stroke-width="2.5" fill="none"/>`;
    case 'tips': return `<path d="M27 38 L26 20 L32 24 L34 12 L40 20 L44 8 L50 18 L56 8 L60 20 L66 12 L68 24 L74 20 L73 38 Q62 28 50 29 Q38 28 27 38Z" fill="${h.H}" ${st(1.8)}/>
      <path d="M26 20 L32 24 L34 12 L40 20 L44 8 L50 18 L56 8 L60 20 L66 12 L68 24 L74 20" fill="none" stroke="${t}" stroke-width="3.2" stroke-linejoin="round"/>`;
    case 'phones': return `${capHair(h.H, 0.85)}<path d="M24 46 Q22 12 50 11 Q78 12 76 46" fill="none" stroke="${a}" stroke-width="4.5"/><rect x="19" y="40" width="10" height="16" rx="4" fill="${a}" ${st(1.6)}/><rect x="71" y="40" width="10" height="16" rx="4" fill="${a}" ${st(1.6)}/>`;
    default: return '';
  }
}
const capHair = (c, op = 1) => `<path d="M27 38 Q28 17 50 16 Q72 17 73 38 Q64 27 50 28 Q36 27 27 38Z" fill="${c}" opacity="${op}" ${st(1.6)}/>`;

function personHead(o, hairOn) {
  const s = o.skin, h = o.H || INK;
  const brow = o.hair === 'bald' ? '#2B1810' : h;
  let face = `
    <ellipse cx="26" cy="48" rx="5" ry="7" fill="${s}" ${st()}/><ellipse cx="74" cy="48" rx="5" ry="7" fill="${s}" ${st()}/>
    <ellipse cx="50" cy="45" rx="23" ry="26" fill="${s}" ${st()}/><ellipse cx="50" cy="45" rx="23" ry="26" fill="url(#bbx-shine)"/>
    <path d="M34 37 Q40 34 45 37" stroke="${brow}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M55 37 Q60 34 66 37" stroke="${brow}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="40" cy="45" rx="4.6" ry="5.2" fill="#fff"/><ellipse cx="60" cy="45" rx="4.6" ry="5.2" fill="#fff"/>
    <circle cx="41" cy="46" r="3" fill="#2B1810"/><circle cx="61" cy="46" r="3" fill="#2B1810"/><circle cx="42" cy="44.5" r="1.1" fill="#fff"/><circle cx="62" cy="44.5" r="1.1" fill="#fff"/>
    <path d="M50 49 Q47 56 50 57 Q53 57 52 55" stroke="#000" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M41 61 Q50 69 59 61" stroke="#4A1418" stroke-width="3" fill="#fff" stroke-linejoin="round"/>`;
  if (o.face === 'beard') face += `<path d="M28 50 Q30 74 50 76 Q70 74 72 50 Q70 64 62 66 Q56 60 50 60 Q44 60 38 66 Q30 64 28 50Z" fill="${h}" ${st(1.4)}/><path d="M43 61 Q50 66 57 61" stroke="#4A1418" stroke-width="2.5" fill="#fff"/>`;
  if (o.face === 'stache') face += `<path d="M40 59 Q45 54 50 57 Q55 54 60 59 Q55 58 50 60 Q45 58 40 59Z" fill="${h}" ${st(1)}/>`;
  if (o.face === 'gog') face += `<path d="M26 45 L74 45" stroke="${INK}" stroke-width="3"/><circle cx="40" cy="45" r="7" fill="${o.G}" fill-opacity=".55" ${st(2.2, INK)}/><circle cx="60" cy="45" r="7" fill="${o.G}" fill-opacity=".55" ${st(2.2, INK)}/><path d="M36 41 L39 39" stroke="#fff" stroke-width="1.6"/>`;
  if (o.face === 'shades') face += shadesPair(INK, '#2B2B3A', 40, 60, 45);
  return face + (hairOn ? '' : hairFront(o.hair, o, o.A, o.T));
}

/* ---------- Characters ---------- */
// box: where the reference head goes on this character (cx, cy, rx, ry); eyes: [y, left x, right x]; mouth: [x, y]
const C = (name, bg, o) => ({ name, bg, ...o });

const CHAR = {
  robot: () => `<path d="M50 20 L50 9" ${st(2)}/><circle cx="50" cy="7" r="4" fill="#FF4A3D" ${st(1.6)}/>
    <rect x="25" y="20" width="50" height="50" rx="10" fill="#A9A7C2" ${st()}/><rect x="25" y="20" width="50" height="50" rx="10" fill="url(#bbx-shine)"/>
    <rect x="19" y="38" width="7" height="14" rx="2" fill="#4A4A70" ${st(1.6)}/><rect x="74" y="38" width="7" height="14" rx="2" fill="#4A4A70" ${st(1.6)}/>
    <rect x="31" y="35" width="38" height="17" rx="5" fill="#0B0B12" ${st(1.6)}/><rect x="36" y="40" width="8" height="7" rx="2" fill="#3DE0FF"/><rect x="56" y="40" width="8" height="7" rx="2" fill="#3DE0FF"/>
    <path d="M37 60 L63 60 M37 64 L63 64" stroke="#4A4A70" stroke-width="2.4"/><circle cx="30" cy="25" r="1.6" fill="#4A4A70"/><circle cx="70" cy="25" r="1.6" fill="#4A4A70"/>`,
  alien: () => `<path d="M50 16 C76 16 80 38 74 52 C68 66 58 74 50 74 C42 74 32 66 26 52 C20 38 24 16 50 16Z" fill="#7CFF6B" ${st()}/><path d="M50 16 C76 16 80 38 74 52 C68 66 58 74 50 74 C42 74 32 66 26 52 C20 38 24 16 50 16Z" fill="url(#bbx-shine)"/>
    <path d="M30 42 Q38 36 46 46 Q38 54 30 42Z" fill="${INK}"/><path d="M70 42 Q62 36 54 46 Q62 54 70 42Z" fill="${INK}"/><circle cx="36" cy="42" r="1.6" fill="#fff"/><circle cx="64" cy="42" r="1.6" fill="#fff"/>
    <path d="M45 62 Q50 65 55 62" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  hoop: () => `<circle cx="50" cy="45" r="27" fill="#F28C28" ${st()}/><circle cx="50" cy="45" r="27" fill="url(#bbx-shine)"/>
    <path d="M50 18 L50 72 M23 45 L77 45" stroke="${INK}" stroke-width="2" opacity=".75"/><path d="M31 25 Q42 45 31 65 M69 25 Q58 45 69 65" stroke="${INK}" stroke-width="2" fill="none" opacity=".75"/>
    <ellipse cx="40" cy="40" rx="5" ry="6" fill="#fff" ${st(1.2, INK)}/><ellipse cx="60" cy="40" rx="5" ry="6" fill="#fff" ${st(1.2, INK)}/><circle cx="41" cy="41" r="3" fill="${INK}"/><circle cx="61" cy="41" r="3" fill="${INK}"/>
    <path d="M40 56 Q50 65 60 56" stroke="${INK}" stroke-width="2.6" fill="#fff"/>`,
  cat: () => `<path d="M26 34 L24 8 L44 24 Z" fill="#3A3A3A" ${st()}/><path d="M74 34 L76 8 L56 24 Z" fill="#3A3A3A" ${st()}/><path d="M29 28 L28 15 L38 24Z" fill="#FF9EB5"/><path d="M71 28 L72 15 L62 24Z" fill="#FF9EB5"/>
    <ellipse cx="50" cy="46" rx="26" ry="24" fill="#3A3A3A" ${st()}/><ellipse cx="50" cy="46" rx="26" ry="24" fill="url(#bbx-shine)"/>
    <ellipse cx="39" cy="43" rx="5.5" ry="6" fill="#FFD23F"/><ellipse cx="61" cy="43" rx="5.5" ry="6" fill="#FFD23F"/><ellipse cx="39" cy="43" rx="1.6" ry="5" fill="${INK}"/><ellipse cx="61" cy="43" rx="1.6" ry="5" fill="${INK}"/>
    <path d="M47 53 L53 53 L50 57Z" fill="#FF9EB5"/><path d="M50 57 Q46 62 42 59 M50 57 Q54 62 58 59" stroke="#C9CCE0" stroke-width="1.6" fill="none"/>
    <path d="M30 55 L16 52 M30 59 L17 61 M70 55 L84 52 M70 59 L83 61" stroke="#C9CCE0" stroke-width="1.3"/>`,
  pup: () => `<ellipse cx="50" cy="46" rx="24" ry="25" fill="#E0B07A" ${st()}/><ellipse cx="50" cy="46" rx="24" ry="25" fill="url(#bbx-shine)"/>
    <path d="M28 28 Q14 32 16 56 Q18 66 26 62 Q30 46 32 34Z" fill="#8B4A22" ${st()}/><path d="M72 28 Q86 32 84 56 Q82 66 74 62 Q70 46 68 34Z" fill="#8B4A22" ${st()}/>
    <ellipse cx="60" cy="40" rx="8" ry="7" fill="#8B4A22" opacity=".6"/>
    <circle cx="40" cy="43" r="3.4" fill="${INK}"/><circle cx="60" cy="43" r="3.4" fill="${INK}"/><circle cx="41" cy="42" r="1.1" fill="#fff"/><circle cx="61" cy="42" r="1.1" fill="#fff"/>
    <ellipse cx="50" cy="54" rx="5" ry="3.6" fill="${INK}"/><path d="M50 58 Q44 64 40 60 M50 58 Q56 64 60 60" stroke="${INK}" stroke-width="1.8" fill="none"/><path d="M46 62 Q50 72 54 62Z" fill="#FF7A9A" ${st(1, INK)}/>`,
  panda: () => `<circle cx="29" cy="24" r="8" fill="${INK}" ${st()}/><circle cx="71" cy="24" r="8" fill="${INK}" ${st()}/>
    <ellipse cx="50" cy="46" rx="25" ry="24" fill="#FFFFFF" ${st()}/><ellipse cx="50" cy="46" rx="25" ry="24" fill="url(#bbx-shine)"/>
    <ellipse cx="39" cy="44" rx="7" ry="8.5" fill="${INK}" transform="rotate(20 39 44)"/><ellipse cx="61" cy="44" rx="7" ry="8.5" fill="${INK}" transform="rotate(-20 61 44)"/>
    <circle cx="40" cy="44" r="2.8" fill="#fff"/><circle cx="60" cy="44" r="2.8" fill="#fff"/><circle cx="40.5" cy="44.5" r="1.4" fill="${INK}"/><circle cx="59.5" cy="44.5" r="1.4" fill="${INK}"/>
    <ellipse cx="50" cy="55" rx="4" ry="3" fill="${INK}"/><path d="M50 58 Q46 62 43 60 M50 58 Q54 62 57 60" stroke="${INK}" stroke-width="1.6" fill="none"/>`,
  frog: () => `<path d="M20 52 Q18 30 34 30 Q50 26 66 30 Q82 30 80 52 Q78 72 50 72 Q22 72 20 52Z" fill="#4CAF50" ${st()}/><path d="M20 52 Q18 30 34 30 Q50 26 66 30 Q82 30 80 52 Q78 72 50 72 Q22 72 20 52Z" fill="url(#bbx-shine)"/>
    <circle cx="35" cy="28" r="10" fill="#4CAF50" ${st()}/><circle cx="65" cy="28" r="10" fill="#4CAF50" ${st()}/><circle cx="35" cy="28" r="6.5" fill="#fff"/><circle cx="65" cy="28" r="6.5" fill="#fff"/>
    <circle cx="36" cy="29" r="3.4" fill="${INK}"/><circle cx="64" cy="29" r="3.4" fill="${INK}"/><circle cx="37" cy="27.5" r="1.1" fill="#fff"/><circle cx="65" cy="27.5" r="1.1" fill="#fff"/>
    <path d="M30 54 Q50 66 70 54" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="28" cy="52" rx="4" ry="2.4" fill="#FF9EB5" opacity=".75"/><ellipse cx="72" cy="52" rx="4" ry="2.4" fill="#FF9EB5" opacity=".75"/>
    <circle cx="46" cy="44" r="1.2" fill="#2E7D32"/><circle cx="54" cy="44" r="1.2" fill="#2E7D32"/>`,
  fox: () => `<path d="M22 44 L24 6 L46 26 Z" fill="#E8722A" ${st()}/><path d="M28 32 L29 14 L40 25 Z" fill="#3A1A10"/>
    <path d="M78 44 L76 6 L54 26 Z" fill="#E8722A" ${st()}/><path d="M72 32 L71 14 L60 25 Z" fill="#3A1A10"/>
    <path d="M50 22 C72 22 82 36 80 50 L88 56 L77 58 C72 68 62 72 50 72 C38 72 28 68 23 58 L12 56 L20 50 C18 36 28 22 50 22Z" fill="#E8722A" ${st()}/>
    <path d="M50 22 C72 22 82 36 80 50 L88 56 L77 58 C72 68 62 72 50 72 C38 72 28 68 23 58 L12 56 L20 50 C18 36 28 22 50 22Z" fill="url(#bbx-shine)"/>
    <path d="M23 56 Q34 50 44 56 Q50 60 56 56 Q66 50 77 56 C72 68 62 72 50 72 C38 72 28 68 23 56Z" fill="#FFF4E6"/>
    <path d="M33 44 Q38 40 44 45 Q38 48 33 44Z" fill="${INK}"/><path d="M67 44 Q62 40 56 45 Q62 48 67 44Z" fill="${INK}"/><circle cx="40" cy="43.6" r="1" fill="#fff"/><circle cx="60" cy="43.6" r="1" fill="#fff"/>
    <ellipse cx="50" cy="56" rx="4" ry="3" fill="${INK}"/><ellipse cx="49" cy="55" rx="1.3" ry=".8" fill="#fff" opacity=".7"/><path d="M46 62 Q50 65 54 62" stroke="#8A6A5A" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  penguin: () => `<ellipse cx="50" cy="45" rx="28" ry="28" fill="#232A3D" ${st()}/><ellipse cx="50" cy="45" rx="28" ry="28" fill="url(#bbx-shine)"/>
    <path d="M50 38 C44 30 30 32 30 46 C30 60 40 68 50 68 C60 68 70 60 70 46 C70 32 56 30 50 38Z" fill="#fff"/><path d="M50 68 C60 68 70 60 70 46" stroke="#D9DEEA" stroke-width="4" fill="none"/>
    <ellipse cx="41" cy="47" rx="3.4" ry="4" fill="${INK}"/><ellipse cx="59" cy="47" rx="3.4" ry="4" fill="${INK}"/><circle cx="42.2" cy="45.6" r="1.2" fill="#fff"/><circle cx="60.2" cy="45.6" r="1.2" fill="#fff"/>
    <ellipse cx="35" cy="56" rx="3.5" ry="2" fill="#FF9EB5" opacity=".8"/><ellipse cx="65" cy="56" rx="3.5" ry="2" fill="#FF9EB5" opacity=".8"/>
    <path d="M44 53 Q50 50 56 53 L50 61 Z" fill="#FFA500" stroke="#A35A00" stroke-width="1.4" stroke-linejoin="round"/>`,
  ghost: () => `<path d="M24 74 L24 44 Q24 18 50 18 Q76 18 76 44 L76 74 L69 68 L62 74 L56 68 L50 74 L44 68 L38 74 L31 68 Z" fill="#E8E8FF" ${st()}/><path d="M24 74 L24 44 Q24 18 50 18 Q76 18 76 44 L76 74 L69 68 L62 74 L56 68 L50 74 L44 68 L38 74 L31 68 Z" fill="url(#bbx-shine)"/>
    <ellipse cx="40" cy="42" rx="5" ry="7" fill="${INK}"/><ellipse cx="60" cy="42" rx="5" ry="7" fill="${INK}"/><circle cx="41.5" cy="39.5" r="1.6" fill="#fff"/><circle cx="61.5" cy="39.5" r="1.6" fill="#fff"/>
    <ellipse cx="50" cy="56" rx="4" ry="5" fill="${INK}"/><ellipse cx="32" cy="52" rx="4" ry="2.4" fill="#FF9EB5" opacity=".8"/><ellipse cx="68" cy="52" rx="4" ry="2.4" fill="#FF9EB5" opacity=".8"/>`,
  ninja: () => `<ellipse cx="50" cy="45" rx="24" ry="26" fill="#2B2B3A" ${st()}/><ellipse cx="50" cy="45" rx="24" ry="26" fill="url(#bbx-shine)"/>
    <rect x="28" y="36" width="44" height="16" rx="7" fill="${SKIN.c}" ${st(1.4, INK)}/>
    <path d="M33 42 Q39 39 45 42" stroke="${INK}" stroke-width="2.4" fill="none"/><path d="M55 42 Q61 39 67 42" stroke="${INK}" stroke-width="2.4" fill="none"/>
    <circle cx="40" cy="46" r="2.6" fill="${INK}"/><circle cx="60" cy="46" r="2.6" fill="${INK}"/><circle cx="41" cy="45" r=".9" fill="#fff"/><circle cx="61" cy="45" r=".9" fill="#fff"/>
    <path d="M26 30 Q50 22 74 30 L74 36 Q50 28 26 36Z" fill="#FF4A3D" ${st(1.4)}/><path d="M74 32 Q86 30 92 22 M74 34 Q86 38 90 46" stroke="#FF4A3D" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  wizard: () => `<ellipse cx="26" cy="48" rx="5" ry="7" fill="${SKIN.d}" ${st()}/><ellipse cx="74" cy="48" rx="5" ry="7" fill="${SKIN.d}" ${st()}/>
    <ellipse cx="50" cy="45" rx="23" ry="26" fill="${SKIN.d}" ${st()}/><ellipse cx="50" cy="45" rx="23" ry="26" fill="url(#bbx-shine)"/>
    <path d="M27 52 Q30 86 50 92 Q70 86 73 52 Q66 62 56 60 Q50 56 44 60 Q34 62 27 52Z" fill="#fff" ${st(1.6)}/><path d="M42 58 Q50 54 58 58 Q50 62 42 58Z" fill="#E6E6F0"/>
    <path d="M34 39 Q40 36 45 39" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M55 39 Q60 36 66 39" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <circle cx="40" cy="46" r="3" fill="${INK}"/><circle cx="60" cy="46" r="3" fill="${INK}"/><circle cx="41" cy="45" r="1" fill="#fff"/><circle cx="61" cy="45" r="1" fill="#fff"/>
    <path d="M18 32 Q50 24 82 32 L72 34 Q50 30 28 34Z" fill="#7B3FE4" ${st()}/><path d="M30 32 L50 -6 L70 32 Q50 27 30 32Z" fill="#7B3FE4" ${st()}/>
    <path d="M49 12 l1.6 3.3 3.6.5 -2.6 2.5 .6 3.6 -3.2-1.7 -3.2 1.7 .6-3.6 -2.6-2.5 3.6-.5z" fill="#FFD23F"/><circle cx="58" cy="24" r="1.4" fill="#FFD23F"/><circle cx="41" cy="22" r="1" fill="#FFD23F"/>`,
  astro: () => `<circle cx="50" cy="45" r="29" fill="#F4F1E8" ${st()}/><circle cx="50" cy="45" r="29" fill="url(#bbx-shine)"/>
    <rect x="29" y="31" width="42" height="30" rx="14" fill="url(#bbx-visor)" ${st(2, '#C9CCE0')}/>
    <path d="M35 37 Q40 33 46 34" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".85"/><circle cx="62" cy="54" r="1.6" fill="#fff" opacity=".7"/>
    <rect x="18" y="38" width="6" height="14" rx="3" fill="#C9CCE0" ${st(1.4)}/><rect x="76" y="38" width="6" height="14" rx="3" fill="#C9CCE0" ${st(1.4)}/>
    <circle cx="50" cy="15" r="2.6" fill="#FF4A3D"/><path d="M42 70 L58 70" stroke="#FFD23F" stroke-width="3"/>`,
  zombie: () => `<ellipse cx="26" cy="48" rx="5" ry="7" fill="#8DB360" ${st()}/><ellipse cx="74" cy="48" rx="5" ry="7" fill="#8DB360" ${st()}/>
    <ellipse cx="50" cy="45" rx="23" ry="26" fill="#8DB360" ${st()}/><ellipse cx="50" cy="45" rx="23" ry="26" fill="url(#bbx-shine)"/>
    <path d="M27 38 L28 22 L34 26 L37 16 L44 23 L50 14 L55 22 L62 15 L64 25 L71 21 L73 38 Q62 28 50 30 Q38 28 27 38Z" fill="#3A2A1A" ${st(1.8)}/>
    <circle cx="40" cy="45" r="5" fill="#fff"/><circle cx="40" cy="45" r="2.2" fill="${INK}"/><circle cx="60" cy="46" r="5.5" fill="#FF4A3D" opacity=".85"/><circle cx="60" cy="46" r="2" fill="${INK}"/>
    <path d="M54 30 L58 36 M55 34 L58 32 M57 37 L60 35" stroke="#4E6B2E" stroke-width="1.6"/>
    <path d="M39 60 L44 63 L48 60 L52 63 L56 60 L61 62" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linejoin="round"/><rect x="45" y="60" width="3" height="3" fill="#fff"/><rect x="53" y="60" width="3" height="3" fill="#fff"/>`,
  dino: () => `<path d="M36 20 L40 10 L45 18 L50 8 L55 18 L60 10 L64 20" fill="#E56020" ${st(1.8)}/>
    <path d="M24 50 Q22 20 50 18 Q74 18 80 36 Q90 40 90 52 Q90 66 70 68 Q60 74 46 72 Q26 70 24 50Z" fill="#3FA34D" ${st()}/><path d="M24 50 Q22 20 50 18 Q74 18 80 36 Q90 40 90 52 Q90 66 70 68 Q60 74 46 72 Q26 70 24 50Z" fill="url(#bbx-shine)"/>
    <circle cx="50" cy="38" r="6" fill="#fff" ${st(1.2, INK)}/><circle cx="52" cy="38" r="3" fill="${INK}"/><circle cx="53" cy="37" r="1" fill="#fff"/>
    <circle cx="80" cy="46" r="1.6" fill="#1F5C27"/><circle cx="86" cy="47" r="1.6" fill="#1F5C27"/>
    <path d="M56 58 Q72 62 88 56" stroke="${INK}" stroke-width="2.4" fill="none"/><path d="M62 59 L64 63 L66 59.6 M70 60 L72 64 L74 60 M78 59 L80 62.6 L82 58.6" fill="#fff" stroke="#fff" stroke-width="1"/>
    <circle cx="34" cy="54" r="3" fill="#2E7D32" opacity=".6"/><circle cx="40" cy="62" r="2" fill="#2E7D32" opacity=".6"/>`,
  fire: () => `<path d="M50 74 C28 74 20 58 24 44 C26 36 32 32 32 22 C38 28 38 34 40 34 C40 22 46 14 52 6 C54 18 62 20 62 30 C66 26 68 22 68 16 C76 26 80 38 78 50 C76 64 68 74 50 74Z" fill="url(#bbx-flame)" ${st()}/>
    <path d="M50 70 C36 70 32 60 34 52 C36 46 40 44 42 38 C46 44 48 46 50 40 C54 46 60 46 62 40 C66 48 68 54 66 60 C64 66 58 70 50 70Z" fill="#FFE14D" opacity=".9"/>
    <ellipse cx="42" cy="52" rx="3.4" ry="4.4" fill="${INK}"/><ellipse cx="58" cy="52" rx="3.4" ry="4.4" fill="${INK}"/><circle cx="43" cy="50.5" r="1.2" fill="#fff"/><circle cx="59" cy="50.5" r="1.2" fill="#fff"/>
    <path d="M43 60 Q50 67 57 60" stroke="${INK}" stroke-width="2.4" fill="#B3202A" stroke-linejoin="round"/>`,
};

export const AVATARS = [
  P('High top', '#3D8BFF', { skin: SKIN.a, hair: 'flat', H: '#120C0A', J: '#FFD23F', trim: '#C2410C' }),
  P('Headband', '#1D1160', { skin: SKIN.c, hair: 'band', H: '#120C0A', A: '#FF4A3D', J: '#FF4A3D', trim: '#fff' }),
  P('Afro', '#FF4A3D', { skin: SKIN.b, hair: 'afro', H: '#1A1110', J: '#3D8BFF', trim: '#fff' }),
  P('Buzz cut', '#FFD23F', { skin: SKIN.e, hair: 'buzz', H: '#6B4423', J: '#552583', trim: '#FFD23F' }),
  P('Snapback', '#00A86B', { skin: SKIN.d, hair: 'cap', H: '#3A2A1A', A: '#3D8BFF', J: '#00471B', trim: '#fff' }),
  P('Big beard', '#E56020', { skin: SKIN.c, hair: 'buzz', face: 'beard', H: '#2B1A10', J: '#0E2240', trim: '#E56020' }),
  P('Red flat top', '#552583', { skin: SKIN.e, hair: 'flat', H: '#B5462A', J: '#FFD23F', trim: '#552583' }),
  P('Retro band', '#0E2240', { skin: SKIN.a, hair: 'band', face: 'beard', H: '#1A1110', A: '#FFD23F', J: '#E56020', trim: '#fff' }),
  C('Robot', '#2E2E4D', { draw: 'robot', box: { cy: 45, rx: 25, ry: 25 }, eyes: [44, 40, 60], mouth: [50, 62], neck: '#A9A7C2', J: '#3D8BFF', trim: '#fff' }),
  C('Alien', '#151525', { draw: 'alien', box: { cy: 45, rx: 25, ry: 28 }, eyes: [44, 38, 62], mouth: [50, 63], neck: '#7CFF6B', J: '#FF4A3D', trim: '#fff' }),
  C('Hoop head', '#3D8BFF', { draw: 'hoop', box: { cy: 45, rx: 27, ry: 27 }, eyes: [41, 40, 60], mouth: [50, 59], neck: '#F28C28', J: '#151525', trim: '#F28C28' }),
  C('Alley cat', '#FF4A3D', { draw: 'cat', box: { cy: 46, rx: 26, ry: 24 }, eyes: [43, 39, 61], mouth: [50, 59], neck: '#3A3A3A', J: '#FFD23F', trim: '#3A3A3A' }),
  P('Mohawk', '#2EC4B6', { skin: SKIN.b, hair: 'mohawk', H: '#FF4A3D', J: '#151525', trim: '#2EC4B6' }),
  P('Chrome dome', '#552583', { skin: SKIN.a, hair: 'bald', face: 'shades', J: '#F28C28', trim: '#fff' }),
  P('Top bun', '#FF9EB5', { skin: SKIN.d, hair: 'bun', H: '#1A1110', J: '#00A86B', trim: '#fff' }),
  P('Long hair', '#FFD23F', { skin: SKIN.b, hair: 'long', H: '#1A1110', J: '#552583', trim: '#FFD23F' }),
  P('Ponytail', '#3D8BFF', { skin: SKIN.e, hair: 'pony', H: '#E8C547', J: '#FF4A3D', trim: '#fff' }),
  P('Goggles', '#E56020', { skin: SKIN.c, hair: 'buzz', face: 'gog', H: '#1A1110', G: '#7FD1FF', J: '#0E2240', trim: '#E56020' }),
  P('Durag', '#00A86B', { skin: SKIN.a, hair: 'durag', H: '#120C0A', A: '#552583', J: '#FFD23F', trim: '#552583' }),
  P('Frosted tips', '#151525', { skin: SKIN.d, hair: 'tips', H: '#6B4423', T: '#FFE08A', J: '#3D8BFF', trim: '#fff' }),
  P('Headphones', '#7FD1FF', { skin: SKIN.b, hair: 'phones', H: '#120C0A', A: '#FF4A3D', J: '#2E2E4D', trim: '#FF4A3D' }),
  P('Stache', '#F28C28', { skin: SKIN.e, hair: 'buzz', face: 'stache', H: '#8B4513', J: '#00471B', trim: '#F28C28' }),
  P('Shades', '#FFD23F', { skin: SKIN.c, hair: 'afro', face: 'shades', H: '#1A1110', J: '#FF4A3D', trim: '#fff' }),
  P('Hair band', '#1D1160', { skin: SKIN.d, hair: 'longband', H: '#5C3A21', A: '#3DE0FF', J: '#E56020', trim: '#fff' }),
  C('Pup', '#3D8BFF', { draw: 'pup', box: { cy: 46, rx: 24, ry: 25 }, eyes: [43, 40, 60], mouth: [50, 60], neck: '#E0B07A', J: '#FFD23F', trim: '#8B4A22' }),
  C('Panda', '#00A86B', { draw: 'panda', box: { cy: 46, rx: 25, ry: 24 }, eyes: [44, 40, 60], mouth: [50, 60], neck: '#FFFFFF', J: '#FF4A3D', trim: '#fff' }),
  C('Frog', '#FF9EB5', { draw: 'frog', box: { cy: 36, rx: 30, ry: 22 }, eyes: [29, 36, 64], mouth: [50, 58], neck: '#4CAF50', J: '#3D8BFF', trim: '#fff', noFront: true }),
  C('Fox', '#0E2240', { draw: 'fox', box: { cy: 47, rx: 25, ry: 25 }, eyes: [44, 39, 61], mouth: [50, 62], neck: '#E8722A', J: '#00A86B', trim: '#FFD23F' }),
  C('Penguin', '#7FD1FF', { draw: 'penguin', box: { cy: 45, rx: 28, ry: 28 }, eyes: [47, 41, 59], mouth: [50, 57], neck: '#F4F1E8', J: '#FF4A3D', trim: '#fff' }),
  C('Ghost', '#1D1160', { draw: 'ghost', box: { cy: 44, rx: 26, ry: 26 }, eyes: [42, 40, 60], mouth: [50, 57], neck: '#E8E8FF', J: '#3DE0FF', trim: '#fff' }),
  C('Ninja', '#7FD1FF', { draw: 'ninja', box: { cy: 45, rx: 24, ry: 26 }, eyes: [46, 40, 60], mouth: [50, 60], neck: '#2B2B3A', J: '#2B2B3A', trim: '#FF4A3D' }),
  C('Wizard', '#151525', { draw: 'wizard', box: { cy: 45, rx: 23, ry: 26 }, eyes: [46, 40, 60], mouth: [50, 58], neck: SKIN.d, J: '#7B3FE4', trim: '#FFD23F', hat: true }),
  C('Astronaut', '#0B0B12', { draw: 'astro', box: { cy: 45, rx: 29, ry: 29 }, eyes: [45, 40, 60], mouth: [50, 56], neck: '#C9CCE0', J: '#C9CCE0', trim: '#FF4A3D' }),
  C('Zombie', '#552583', { draw: 'zombie', box: { cy: 45, rx: 23, ry: 26 }, eyes: [45, 40, 60], mouth: [50, 61], neck: '#8DB360', J: '#6B6B80', trim: '#8DB360' }),
  C('Dino', '#FFD23F', { draw: 'dino', box: { cy: 45, rx: 28, ry: 27 }, eyes: [38, 44, 56], mouth: [72, 60], neck: '#3FA34D', J: '#0E2240', trim: '#E56020' }),
  C('Fireball', '#151525', { draw: 'fire', box: { cy: 48, rx: 26, ry: 26 }, eyes: [52, 42, 58], mouth: [50, 62], neck: '#FF9F1C', J: '#FF4A3D', trim: '#FFE14D' }),
];

/* ---------- Gear ---------- */
function afroBack(c, cy, r) {
  let puffs = '';
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; puffs += `<circle cx="${(50 + Math.cos(a) * r).toFixed(1)}" cy="${(cy + Math.sin(a) * (r - 2)).toFixed(1)}" r="10"/>`; }
  return `<g fill="${c}" ${st(2.4)}>${puffs}</g><g fill="${c}">${puffs}</g><circle cx="50" cy="${cy}" r="${r}" fill="${c}"/>
    <g fill="#fff" opacity=".13">${[[36, cy - 18], [44, cy - 24], [30, cy - 8], [58, cy - 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join('')}</g>`;
}
function rainbowBack() {
  let rings = '';
  ['#B26BFF', '#3D8BFF', '#4CD964', '#FFE14D', '#FF9F1C', '#FF4A3D'].forEach((c, i) => { rings += `<circle cx="50" cy="36" r="${41 - i * 4.6}" fill="${c}"/>`; });
  return `<circle cx="50" cy="36" r="41.5" fill="none" ${st(2.6)}/>${rings}`;
}
/* Hair items: [behind the head, in front of it], in the reference head's frame. */
const HAIR = {
  hair_afro: () => [afroBack('#1A1110', 36, 31), `<path d="M27 38 Q30 18 50 17 Q70 18 73 38 Q62 28 50 29 Q38 28 27 38Z" fill="#1A1110"/>`],
  hair_rainbow: () => [rainbowBack(), `<path d="M27 38 Q30 18 50 17 Q70 18 73 38 Q62 28 50 29 Q38 28 27 38Z" fill="#FF4A3D"/><path d="M30 32 Q50 20 70 32" stroke="#FFE14D" stroke-width="3" fill="none"/>`],
  hair_frost: () => ['', `<path d="M27 38 L25 18 L32 23 L33 9 L40 19 L44 5 L50 17 L56 5 L60 19 L67 9 L68 23 L75 18 L73 38 Q62 28 50 29 Q38 28 27 38Z" fill="#6B4423" ${st(1.8)}/>
    <path d="M25 18 L32 23 L33 9 L40 19 L44 5 L50 17 L56 5 L60 19 L67 9 L68 23 L75 18" fill="none" stroke="#FFF3A0" stroke-width="3.6" stroke-linejoin="round"/>`],
  hair_rows: () => ['', `<path d="M27 40 Q27 15 50 14 Q73 15 73 40 Q66 30 50 30 Q34 30 27 40Z" fill="#1A1110" ${st(1.8)}/>
    ${[34, 42, 50, 58, 66].map((x) => `<path d="M${x} 30 Q${x + (x - 50) * 0.15} 22 ${50 + (x - 50) * 0.6} 15" stroke="#5C3A21" stroke-width="2.2" fill="none" stroke-dasharray="3 1.6"/>`).join('')}
    <circle cx="27" cy="42" r="2.4" fill="url(#bbx-gold)"/><circle cx="73" cy="42" r="2.4" fill="url(#bbx-gold)"/>`],
  hair_hightop: () => ['', `<path d="M26 40 L26 2 Q26 -2 30 -2 L70 -2 Q74 -2 74 2 L74 40 Q70 28 50 27 Q30 28 26 40Z" fill="#120C0A" ${st()}/>
    <path d="M26 10 L74 6 L74 13 L26 17Z" fill="url(#bbx-gold)"/><path d="M34 4 L36 1 M64 22 l1.4-3" stroke="#FFF6B0" stroke-width="1.8"/>`],
  hair_flame: () => [`<path d="M24 44 C18 30 26 22 30 14 C34 20 36 22 38 20 C38 10 44 4 50 -2 C54 8 60 10 62 18 C66 12 70 10 72 4 C80 16 84 30 76 44 Z" fill="url(#bbx-flame)" ${st()}/>`,
    `<path d="M28 40 Q32 26 40 30 Q44 22 50 28 Q56 22 60 30 Q68 26 72 40 Q62 30 50 31 Q38 30 28 40Z" fill="#FFE14D" opacity=".9"/>`],
  hair_band: () => ['', `${capHair('#1A1110')}<path d="M27 32 Q50 23 73 32 L73 38 Q50 29 27 38Z" fill="#FF4A3D" ${st(1.4)}/><path d="M30 33.5 Q50 26 70 33.5" stroke="#fff" stroke-width="1.4" fill="none"/>
    <path d="M73 34 Q84 30 88 22 M73 36 Q84 40 86 48" stroke="#FF4A3D" stroke-width="3.6" fill="none" stroke-linecap="round"/>`],
};
const CLOWN = () => [`${[[22, 34], [16, 46], [24, 56], [78, 34], [84, 46], [76, 56]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="9" fill="${i % 2 ? '#3DE0FF' : '#FF4A3D'}" ${st(1.8)}/>`).join('')}`,
  `<circle cx="34" cy="24" r="6" fill="#FF4A3D" ${st(1.4)}/><circle cx="66" cy="24" r="6" fill="#3DE0FF" ${st(1.4)}/>`];

function crown(y) {
  return `<g transform="translate(0 ${y})"><path d="M30 22 L28 6 L38 14 L44 2 L50 13 L56 2 L62 14 L72 6 L70 22 Z" fill="url(#bbx-gold)" stroke="#5C3D00" stroke-width="1.6" stroke-linejoin="round"/>
    <rect x="30" y="18" width="40" height="6" rx="2" fill="url(#bbx-gold)" stroke="#5C3D00" stroke-width="1.4"/>
    <circle cx="50" cy="20.5" r="2.6" fill="#FF2E4D" stroke="#7A0016" stroke-width=".6"/><circle cx="39" cy="20.5" r="2" fill="#3DA5FF"/><circle cx="61" cy="20.5" r="2" fill="#3DA5FF"/>
    ${[28, 44, 56, 72].map((x, i) => `<circle cx="${x}" cy="${[6, 2, 2, 6][i]}" r="2" fill="#FFF6B0" stroke="#5C3D00" stroke-width=".8"/>`).join('')}
    <path d="M33 19 L33 14" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/></g>`;
}
function chainLinks(fill, edge, n, size) {
  let s = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = 34 + 32 * t, y = 76 + 13 * Math.sin(Math.PI * t), a = Math.cos(Math.PI * t) * 40;
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${2.4 * size}" ry="${1.6 * size}" transform="rotate(${(i % 2 ? 90 : 0) + a} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${fill}" stroke="${edge}" stroke-width=".8"/>`;
  }
  return s;
}
const star = (x, y, r, fill, edge) => {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; p.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`); }
  return `<polygon points="${p.join(' ')}" fill="${fill}" stroke="${edge}" stroke-width=".6"/>`;
};
function neckItem(id, n) {
  if (id === 'neck_silver') return chainLinks('url(#bbx-silver)', '#4A4A70', 14, 0.85) + `<circle cx="50" cy="90.5" r="3.2" fill="url(#bbx-silver)" stroke="#4A4A70" stroke-width="1"/>`;
  if (id === 'neck_gold') {
    const big = n >= 3, huge = n >= 5;
    return chainLinks('url(#bbx-gold)', '#6B4A00', huge ? 18 : 16, huge ? 1.25 : big ? 1.1 : 0.95)
      + `<circle cx="50" cy="${huge ? 94 : 92}" r="${huge ? 8 : big ? 6.5 : 4.5}" fill="url(#bbx-gold)" stroke="#6B4A00" stroke-width="1.2"/>`
      + star(50, huge ? 94 : 92, huge ? 5 : big ? 4 : 2.8, '#FFF6B0', '#B07800')
      + (huge ? `<circle cx="45" cy="90" r="1.3" fill="#fff"/><circle cx="56" cy="97" r="1" fill="#BFF6FF"/>` : '');
  }
  if (id === 'neck_ice') return chainLinks('url(#bbx-ice)', '#3D8BFF', 18, 1.1)
    + `<path d="M50 85 L57 91 L50 100 L43 91Z" fill="url(#bbx-ice)" stroke="#3D8BFF" stroke-width="1.2"/><path d="M43 91 L57 91 M50 85 L47 91 L50 100 L53 91Z" stroke="#7FD1FF" stroke-width=".7" fill="none"/>
      <path d="M46 87 l1 -2 1 2 -1 2z M58 84 l.8-1.6 .8 1.6 -.8 1.6z" fill="#fff"/>`;
  if (id === 'neck_whistle') return `<path d="M36 77 Q50 96 64 77" stroke="#FF4A3D" stroke-width="2.6" fill="none"/>
    <rect x="44" y="88" width="13" height="7" rx="3.5" fill="url(#bbx-silver)" stroke="#4A4A70" stroke-width="1"/><rect x="55" y="89" width="5" height="3.4" fill="url(#bbx-silver)" stroke="#4A4A70" stroke-width=".8"/><circle cx="48" cy="91.5" r="1.4" fill="#4A4A70"/>`;
  return '';
}
function shadesPair(frame, lens, xl, xr, y, w = 8.5) {
  return `<path d="M${xl - w} ${y - 2} L${xr + w} ${y - 2}" stroke="${frame}" stroke-width="2.4"/>
    <rect x="${xl - w}" y="${y - 4.5}" width="${w * 2 - 1}" height="9" rx="3.5" fill="${lens}" stroke="${frame}" stroke-width="2"/>
    <rect x="${xr - w + 1}" y="${y - 4.5}" width="${w * 2 - 1}" height="9" rx="3.5" fill="${lens}" stroke="${frame}" stroke-width="2"/>
    <path d="M${xl - w + 3} ${y - 1.5} L${xl - w + 6} ${y - 3}" stroke="#fff" stroke-width="1.4" opacity=".7"/><path d="M${xr - w + 4} ${y - 1.5} L${xr - w + 7} ${y - 3}" stroke="#fff" stroke-width="1.4" opacity=".7"/>`;
}
function faceItem(id, a) {
  const [ey, xl, xr] = a.eyes || [45, 40, 60], [mx, my] = a.mouth || [50, 61];
  if (id === 'face_shades') return shadesPair('#FFFFFF', '#FF5FA2', xl, xr, ey, Math.min(8.5, (xr - xl) / 2 - 0.5));
  if (id === 'face_grill') return `<rect x="${mx - 7}" y="${my - 2.5}" width="14" height="5" rx="2" fill="url(#bbx-gold)" stroke="#6B4A00" stroke-width="1"/><path d="M${mx - 3.5} ${my - 2.5} V${my + 2.5} M${mx} ${my - 2.5} V${my + 2.5} M${mx + 3.5} ${my - 2.5} V${my + 2.5}" stroke="#B07800" stroke-width=".7"/><circle cx="${mx - 4.5}" cy="${my - 1}" r=".8" fill="#fff"/>`;
  if (id === 'face_pick') return `<path d="M${mx + 6} ${my + 1} L${mx + 19} ${my - 4}" stroke="#D9B26F" stroke-width="2.2" stroke-linecap="round"/><path d="M${mx + 6} ${my + 1} L${mx + 19} ${my - 4}" stroke="#fff" stroke-width=".6" opacity=".5"/>`;
  return '';
}
function shirt(a, fit) {
  const J = a.J || '#3D8BFF', trim = a.trim || '#fff';
  let fill = `<path d="${SHIRT}" fill="${J}"/>`, tr = trim, extra = '';
  if (fit === 'fit_away') { fill = `<path d="${SHIRT}" fill="#F4F1E8"/>`; tr = J; }
  if (fit === 'fit_champ') { fill = `<path d="${SHIRT}" fill="#151525"/>`; tr = '#FFD23F'; extra = star(50, 92, 5.5, 'url(#bbx-gold)', '#6B4A00'); }
  if (fit === 'fit_gold') {
    fill = `<path d="${SHIRT}" fill="url(#bbx-gold)"/>`; tr = '#FFF6B0';
    extra = [[30, 90, 0], [66, 86, 0.7], [56, 96, 1.4]].map(([x, y, d]) => `<path d="M${x} ${y - 3} L${x + .8} ${y - .8} L${x + 3} ${y} L${x + .8} ${y + .8} L${x} ${y + 3} L${x - .8} ${y + .8} L${x - 3} ${y} L${x - .8} ${y - .8}Z" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="2s" begin="${d}s" repeatCount="indefinite"/></path>`).join('');
  }
  if (fit === 'fit_tiedye') {
    let rings = '';
    for (let i = 9; i >= 0; i--) rings += `<circle cx="${(48 + Math.sin(i) * 6).toFixed(1)}" cy="${(96 + Math.cos(i * 1.3) * 4).toFixed(1)}" r="${8 + i * 6}" fill="${TIEDYE[i % 6]}"/>`;
    fill = `<g clip-path="url(#bbx-shirt)">${rings}</g>`; tr = '#fff';
  }
  return `${fill}<path d="${SHIRT}" fill="url(#bbx-shine)" opacity=".7"/>
    <path d="M29 80 Q34 92 26 100 M71 80 Q66 92 74 100" stroke="${tr}" stroke-width="3" fill="none"/>
    <path d="M38 78 Q50 90 62 78" fill="none" stroke="${tr}" stroke-width="4" stroke-linecap="round"/>${extra}
    <path d="${SHIRT}" fill="none" ${st()}/>`;
}
/* World record holder (Nov 21): a gold laurel wreath around the head, with a twinkle. */
function laurel() {
  let out = '';
  [1, -1].forEach((side) => {
    let stem = '', leaves = '';
    for (let k = 0; k <= 7; k++) {
      const deg = 130 + k * 15, r = deg * Math.PI / 180;   // from under the jaw up past the temple
      const x = (50 + side * Math.cos(r) * 35).toFixed(1), y = (46 + Math.sin(r) * 32).toFixed(1);
      stem += (k ? ' L' : 'M') + x + ' ' + y;
      const tan = side === 1 ? deg + 90 : 90 - deg;
      [-1, 1].forEach((o) => {
        leaves += `<ellipse cx="${x}" cy="${y}" rx="5.6" ry="2.4" transform="rotate(${tan + o * 35} ${x} ${y}) translate(${o * 3.2} 0)" fill="url(#bbx-gold)" stroke="#5C3D00" stroke-width=".8"/>`;
      });
    }
    out += `<path d="${stem}" fill="none" stroke="#B07800" stroke-width="1.6"/>${leaves}`;
  });
  return out + `<path d="M22 22 L23 25 L26 26 L23 27 L22 30 L21 27 L18 26 L21 25Z" fill="#fff"><animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite"/></path>`;
}
const belt = () => `<rect x="14" y="93" width="72" height="7" fill="#2B2B3A" stroke="#000" stroke-width="1"/><rect x="38" y="89" width="24" height="12" rx="3" fill="url(#bbx-gold)" stroke="#6B4A00" stroke-width="1.2"/>
  ${star(50, 95, 4, '#FF2E4D', '#7A0016')}<circle cx="42" cy="95" r="1.2" fill="#3DA5FF"/><circle cx="58" cy="95" r="1.2" fill="#3DA5FF"/>`;

/* ---------- Putting it together ---------- */
function neonBg(a, small) {
  let grid = '';
  if (!small) {
    for (let i = 0; i <= 10; i++) grid += `<path d="M${i * 10} 60 L${50 + (i * 10 - 50) * 2.2} 100" stroke="#B26BFF" stroke-opacity=".45" stroke-width=".6"/>`;
    for (let j = 0; j < 5; j++) grid += `<path d="M0 ${62 + j * j * 2.4} L100 ${62 + j * j * 2.4}" stroke="#B26BFF" stroke-opacity=".45" stroke-width=".6"/>`;
  }
  return `<rect width="100" height="100" fill="url(#bbx-sky)"/><circle cx="50" cy="40" r="30" fill="${a.bg}" opacity=".55"/><circle cx="50" cy="40" r="30" fill="url(#bbx-sun)"/>${grid}`;
}
// Map the reference head onto a character's head.
const toBox = (a, inner) => {
  if (a.person || !a.box) return inner;
  const b = a.box, sx = b.rx / HEAD.rx, sy = b.ry / HEAD.ry;
  return `<g transform="translate(50 ${b.cy}) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-50 -45)">${inner}</g>`;
};

function body(a, look, small) {
  const g = (look && look.gear) || {}, t = (look && look.titles) || {};
  const hairId = t.clown ? 'clown' : g.hair && HAIR[g.hair] ? g.hair : null;
  const [hb, hf] = hairId === 'clown' ? CLOWN() : hairId ? HAIR[hairId]() : ['', ''];
  const neck = a.person ? a.skin : a.neck;
  let s = '';
  s += a.person && !hairId ? hairBack(a.hair, a, a.A) : '';
  s += toBox(a, hb);
  s += shirt(a, g.fit);
  s += `<path d="M42 62 L42 80 Q50 85 58 80 L58 62 Z" fill="${neck}" ${st()}/><path d="M42 66 Q50 72 58 66 L58 62 L42 62Z" fill="#000" opacity=".2"/>`;
  s += neckItem(g.neck, look ? look.chain || 1 : 1);
  s += a.person ? personHead(a, !!hairId) : CHAR[a.draw]();
  s += faceItem(g.face, a.person ? {} : a);
  if (!a.hat && !a.noFront) s += toBox(a, hf);   // the wizard's hat and the frog's eyes stay on top
  if (t.clown) { const [ey, xl, xr] = a.person ? [45, 40, 60] : a.eyes, [mx, my] = a.person ? [50, 61] : a.mouth; s += `<circle cx="${(xl + xr) / 2}" cy="${((ey + my) / 2).toFixed(1)}" r="4.6" fill="#FF2E1F" ${st(1.2, '#7A0016')}/><circle cx="${(xl + xr) / 2 - 1.5}" cy="${((ey + my) / 2 - 1.5).toFixed(1)}" r="1.3" fill="#fff" opacity=".8"/>`; }
  if (t.crown) s += toBox(a, crown(hairId === 'hair_afro' || hairId === 'hair_rainbow' ? -8 : hairId === 'hair_hightop' || hairId === 'hair_flame' || (a.person && a.hair === 'flat' && !hairId) ? -10 : a.hat ? 8 : 0));
  if (t.belt) s += belt();
  if (t.record) s += toBox(a, laurel());
  return small ? `<g clip-path="url(#bbx-frame)">${s}</g>` : `<g clip-path="url(#bbx-frame)"><g filter="url(#bbx-glow)">${s}</g></g>`;
}

const cache = {};
function svgBody(i, look, small) {
  const key = i + '|' + lookKey(look) + '|' + (small ? 's' : 'l');
  if (cache[key]) return cache[key];
  const a = AVATARS[i] || AVATARS[0];
  return (cache[key] = neonBg(a, small) + body(a, look, small));
}

/* <svg> avatar. who = a user id (draws the swag they wear and any title they hold) or a look object
   (the Locker Room's previews). Small sizes skip the glow and the grid (cleaner on boards, faster). */
export function avatar(i, size, label, who) {
  ensureDefs();
  const n = Number.isInteger(i) && AVATARS[i] ? i : 0;
  const s = size || 36;
  const look = who && typeof who === 'object' ? who : lookOf(who);
  return `<svg class="ava${frameOf(look)}" width="${s}" height="${s}" viewBox="0 0 100 100" ${label ? `role="img" aria-label="${AVATARS[n].name}"` : 'aria-hidden="true"'}>${svgBody(n, look, s < 44)}</svg>`;
}

/* The Locker Room's trading card: the avatar in a frame colored by the rarest thing worn (gold, with a
   moving foil shine, for legendary or a month title), with a name plate. */
export function avatarCard(i, who, name, width) {
  ensureDefs();
  const n = Number.isInteger(i) && AVATARS[i] ? i : 0;
  const look = who && typeof who === 'object' ? who : lookOf(who);
  const r = rarityOf(look);
  const label = r === 'common' ? 'ROOKIE' : r.toUpperCase();
  const w = width || 200;
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<svg class="ava-card r-${r}" width="${w}" height="${(w * 1.32).toFixed(0)}" viewBox="0 0 100 132" role="img" aria-label="${esc(name)}: ${AVATARS[n].name}, ${label} card">
    <rect x="1" y="1" width="98" height="130" rx="8" fill="url(#bbx-card-${r})" stroke="#000" stroke-width="2"/>
    <svg x="8" y="8" width="84" height="84" viewBox="0 0 100 100">${svgBody(n, look, false)}</svg>
    <rect x="8" y="8" width="84" height="84" rx="3" fill="none" stroke="#000" stroke-width="1.5"/>
    <rect x="8" y="97" width="84" height="18" rx="3" fill="#0B0B12" stroke="#000" stroke-width="1.5"/>
    <text x="50" y="109.5" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="${name.length > 11 ? 8 : 10}" fill="#fff">${esc(name.toUpperCase())}</text>
    <text x="50" y="126" text-anchor="middle" font-family="Impact, sans-serif" font-size="7.5" fill="#000" letter-spacing="1.5">${label}</text>
    ${r === 'legendary' || r === 'epic' ? '<rect x="1" y="1" width="98" height="130" rx="8" fill="url(#bbx-foil)"/>' : ''}
  </svg>`;
}
