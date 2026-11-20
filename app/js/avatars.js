/* BIG BALLIN: 36 original 8-bit avatars (no real people, no mascots), drawn as SVG pixels.
   The database stores only the number (profiles.avatar, 0–35). New ones go at the END of the list
   (the number is what's saved), and schema.sql's profiles_avatar_range must allow the new top number.
   Swag gear (swag.js) is drawn on top; a new character needs its eye/mouth rows in ANCHOR. */
import { ITEMS, TITLES, lookOf, lookKey, frameOf } from './swag.js?v=3aa3c01';

// Pixel art, 12×12. Letters are colors (see each avatar's palette); '.' is the background.
const FACE = [
  '.SSKSSSSKSS.',   // eyes (with ears)
  '..SSSSSSSS..',
  '..SSSMMSSS..',   // mouth
  '...SSSSSS...',
  '....SSSS....',   // neck
];
const BEARD = [
  '.SSKSSSSKSS.',
  '..SSSSSSSS..',
  '..HSSMMSSH..',
  '...HHHHHH...',
  '....SSSS....',
];
const JERSEY = ['..JJWJJWJJ..', '.JJJJJJJJJJ.'];
const TOPS = {
  flat:     ['..HHHHHHHH..', '..HHHHHHHH..', '..HHHHHHHH..', '..SSSSSSSS..', '..SSSSSSSS..'],
  band:     ['............', '...HHHHHH...', '..HHHHHHHH..', '..AAAAAAAA..', '..SSSSSSSS..'],
  afro:     ['..HHHHHHHH..', '.HHHHHHHHHH.', '.HHHHHHHHHH.', '.HHSSSSSSHH.', '..SSSSSSSS..'],
  buzz:     ['............', '............', '...HHHHHH...', '..HSSSSSSH..', '..SSSSSSSS..'],
  cap:      ['............', '...AAAAAA...', '..AAAAAAAA..', '..AAAAAAAAAA', '..SSSSSSSS..'],
  mohawk:   ['.....HH.....', '.....HH.....', '....HHHH....', '..SSHHHHSS..', '..SSSSSSSS..'],
  bald:     ['............', '............', '...SSSSSS...', '..SSWSSSSS..', '..SSSSSSSS..'],
  bun:      ['....HHHH....', '....HHHH....', '...HHHHHH...', '..HHHHHHHH..', '..SSSSSSSS..'],
  long:     ['...HHHHHH...', '..HHHHHHHH..', '.HHHHHHHHHH.', '.HHSSSSSSHH.', '.HSSSSSSSSH.'],
  pony:     ['............', '...HHHHHH...', '..HHHHHHHHH.', '..HSSSSSSHHH', '..SSSSSSSS.H'],
  durag:    ['............', '...AAAAAA...', '..AAAAAAAA..', '..AAAAAAAAA.', '..SSSSSSSSAA'],
  tips:     ['..THTHTHTH..', '..HHHHHHHH..', '..HHHHHHHH..', '..SSSSSSSS..', '..SSSSSSSS..'],
  phones:   ['...AAAAAA...', '..AHHHHHHA..', '.AHHHHHHHHA.', '.AHSSSSSSHA.', '.ASSSSSSSSA.'],
  longband: ['...HHHHHH...', '..HHHHHHHH..', '.HAAAAAAAAH.', '.HHSSSSSSHH.', '.HSSSSSSSSH.'],
};
const FACES = {
  plain: FACE,
  beard: BEARD,
  sides:  ['.HSKSSSSKSH.', '.HSSSSSSSSH.', '.HSSSMMSSSH.', '.H.SSSSSS.H.', '.H..SSSS..H.'],   // long hair down the sides
  pony:   ['.SSKSSSSKSSH', '..SSSSSSSS.H', '..SSSMMSSS..', '...SSSSSS...', '....SSSS....'],
  gog:    ['.GGKGGGGKGG.', ...FACE.slice(1)],
  shades: ['.SKKKSSKKKS.', ...FACE.slice(1)],
  stache: ['.SSKSSSSKSS.', '..SHHHHHHS..', '..SSSMMSSS..', '...SSSSSS...', '....SSSS....'],
  phones: ['.ASKSSSSKSA.', ...FACE.slice(1)],
};
// person(top, face): face is a FACES key; true = beard (the original 12 use that).
// Marked as a person so swag hair replaces their hair (characters wear it on top of the head instead).
const person = (top, face) => Object.assign([...TOPS[top], ...FACES[face === true ? 'beard' : face || 'plain'], ...JERSEY], { person: true });

const SKIN = { a: '#5C3A21', b: '#8D5524', c: '#C68642', d: '#E0AC69', e: '#F1C27D' };
const K = '#0B0B12', W = '#F4F1E8', MOUTH = '#5A1E1E';

export const AVATARS = [
  { name: 'High top',    bg: '#3D8BFF', px: person('flat'),        c: { S: SKIN.a, H: K, J: '#FFD23F' } },
  { name: 'Headband',    bg: '#1D1160', px: person('band'),        c: { S: SKIN.c, H: K, A: '#FF4A3D', J: '#FF4A3D' } },
  { name: 'Afro',        bg: '#FF4A3D', px: person('afro'),        c: { S: SKIN.b, H: '#1A1110', J: '#3D8BFF' } },
  { name: 'Buzz cut',    bg: '#FFD23F', px: person('buzz'),        c: { S: SKIN.e, H: '#6B4423', J: '#552583' } },
  { name: 'Snapback',    bg: '#00A86B', px: person('cap'),         c: { S: SKIN.d, A: '#3D8BFF', J: '#00471B' } },
  { name: 'Big beard',   bg: '#E56020', px: person('buzz', true),  c: { S: SKIN.c, H: '#2B1A10', J: '#0E2240' } },
  { name: 'Red flat top', bg: '#552583', px: person('flat'),       c: { S: SKIN.e, H: '#B5462A', J: '#FFD23F' } },
  { name: 'Retro band',  bg: '#0E2240', px: person('band', true),  c: { S: SKIN.a, H: '#1A1110', A: '#FFD23F', J: '#E56020' } },
  { name: 'Robot',       bg: '#2E2E4D', c: { G: '#A9A7C2', D: '#4A4A70', V: '#3DE0FF', R: '#FF4A3D', J: '#3D8BFF' }, px: [
    '.....RR.....', '.....GG.....', '..GGGGGGGG..', '..GGGGGGGG..', '..GVVVVVVG..', '..GVKVVKVG..',
    '..GGGGGGGG..', '..GDGDGDGG..', '..GGGGGGGG..', '....GGGG....', ...JERSEY] },
  { name: 'Alien',       bg: '#151525', c: { L: '#7CFF6B', J: '#FF4A3D' }, px: [
    '............', '...LLLLLL...', '..LLLLLLLL..', '.LLLLLLLLLL.', '.LKKLLLLKKL.', '.LKKLLLLKKL.',
    '..LLLLLLLL..', '...LLMMLL...', '....LLLL....', '.....LL.....', ...JERSEY] },
  { name: 'Hoop head',   bg: '#3D8BFF', c: { O: '#F28C28', J: '#151525' }, px: [
    '....OOOO....', '..OOOOKOOO..', '.OOOOOKOOOO.', '.OOOOOKOOOO.', '.KKKKKKKKKK.', '.OKKKOOKKKO.',
    '.OOOOOKOOOO.', '.OOOMMMMOOO.', '..OOOOKOOO..', '....OOOO....', ...JERSEY] },
  { name: 'Alley cat',   bg: '#FF4A3D', c: { C: '#3A3A3A', Y: '#FFD23F', P: '#FF9EB5', J: '#FFD23F' }, px: [
    '..C......C..', '..CC....CC..', '..CCCCCCCC..', '..CCCCCCCC..', '..CYKCCYKC..', '..CCCCCCCC..',
    '..CCCPPCCC..', '..CCMCCMCC..', '...CCCCCC...', '....CCCC....', ...JERSEY] },
  // --- Added Nov 9, 2026 (12 more players, 12 more characters) ---
  { name: 'Mohawk',       bg: '#2EC4B6', px: person('mohawk'),          c: { S: SKIN.b, H: '#FF4A3D', J: '#151525' } },
  { name: 'Chrome dome',  bg: '#552583', px: person('bald', 'shades'),  c: { S: SKIN.a, J: '#F28C28' } },
  { name: 'Top bun',      bg: '#FF9EB5', px: person('bun'),             c: { S: SKIN.d, H: '#1A1110', J: '#00A86B' } },
  { name: 'Long hair',    bg: '#FFD23F', px: person('long', 'sides'),   c: { S: SKIN.b, H: '#1A1110', J: '#552583' } },
  { name: 'Ponytail',     bg: '#3D8BFF', px: person('pony', 'pony'),    c: { S: SKIN.e, H: '#E8C547', J: '#FF4A3D' } },
  { name: 'Goggles',      bg: '#E56020', px: person('buzz', 'gog'),     c: { S: SKIN.c, H: '#1A1110', G: '#7FD1FF', J: '#0E2240' } },
  { name: 'Durag',        bg: '#00A86B', px: person('durag'),           c: { S: SKIN.a, A: '#552583', J: '#FFD23F' } },
  { name: 'Frosted tips', bg: '#151525', px: person('tips'),            c: { S: SKIN.d, H: '#6B4423', T: '#FFE08A', J: '#3D8BFF' } },
  { name: 'Headphones',   bg: '#7FD1FF', px: person('phones', 'phones'), c: { S: SKIN.b, H: K, A: '#FF4A3D', J: '#2E2E4D' } },
  { name: 'Stache',       bg: '#F28C28', px: person('buzz', 'stache'),  c: { S: SKIN.e, H: '#8B4513', J: '#00471B' } },
  { name: 'Shades',       bg: '#FFD23F', px: person('afro', 'shades'),  c: { S: SKIN.c, H: '#1A1110', J: '#FF4A3D' } },
  { name: 'Hair band',    bg: '#1D1160', px: person('longband', 'sides'), c: { S: SKIN.d, H: '#5C3A21', A: '#3DE0FF', J: '#E56020' } },
  { name: 'Pup',          bg: '#3D8BFF', c: { B: '#8B4A22', T: '#E0B07A', P: '#FF7A9A', J: '#FFD23F' }, px: [
    '............', '.BB......BB.', '.BBTTTTTTBB.', '.BBTTTTTTBB.', '.BBTKTTKTBB.', '.BBTTTTTTBB.',
    '..BTTKKTTB..', '...TTTTTT...', '....TPPT....', '.....TT.....', ...JERSEY] },
  { name: 'Panda',        bg: '#00A86B', c: { E: W, J: '#FF4A3D' }, px: [
    '............', '.KK......KK.', '.KKWWWWWWKK.', '..WWWWWWWW..', '.WKKKWWKKKW.', '.WKEKWWKEKW.',
    '.WWWWKKWWWW.', '..WWWMMWWW..', '...WWWWWW...', '....WWWW....', ...JERSEY] },
  { name: 'Frog',         bg: '#FF9EB5', c: { G: '#4CAF50', D: '#2E7D32', J: '#3D8BFF' }, px: [
    '............', '..GGG..GGG..', '.GWKWGGWKWG.', '.GWWWGGWWWG.', '.GGGGGGGGGG.', '.GGGGGGGGGG.',
    '.GMGGGGGGMG.', '.GGMMMMMMGG.', '..GGGGGGGG..', '...DDDDDD...', ...JERSEY] },
  { name: 'Fox',          bg: '#0E2240', c: { O: '#E8722A', J: '#00A86B' }, px: [
    '.O........O.', '.OO......OO.', '.OOO....OOO.', '.OOOOOOOOOO.', '.OOKOOOOKOO.', '.OOOOOOOOOO.',
    '.WWOOOOOOWW.', '..WWWWWWWW..', '...WWKKWW...', '....WWWW....', ...JERSEY] },
  { name: 'Penguin',      bg: '#7FD1FF', c: { Y: '#FFB000', J: '#FF4A3D' }, px: [
    '............', '....KKKK....', '...KKKKKK...', '..KKWWWWKK..', '..KWKWWKWK..', '..KWWYYWWK..',
    '..KWWWWWWK..', '.KKWWWWWWKK.', '.K.WWWWWW.K.', '...YY..YY...', ...JERSEY] },
  { name: 'Ghost',        bg: '#1D1160', c: { G: '#E8E8FF', P: '#FF9EB5', J: '#3DE0FF' }, px: [
    '............', '....GGGG....', '...GGGGGG...', '..GGGGGGGG..', '..GKKGGKKG..', '..GKKGGKKG..',
    '..GPGGGGPG..', '..GGGKKGGG..', '..GGGGGGGG..', '..G.GG.GG.G.', ...JERSEY] },
  { name: 'Ninja',        bg: '#7FD1FF', c: { N: '#2B2B3A', R: '#FF4A3D', S: SKIN.c, J: '#2B2B3A' }, px: [
    '............', '...NNNNNN...', '..NNNNNNNN..', '..RRRRRRRRRR', '..NNNNNNNN.R', '..SKSSSSKS..',
    '..NNNNNNNN..', '..NNNNNNNN..', '...NNNNNN...', '....NNNN....', ...JERSEY] },
  { name: 'Wizard',       bg: '#151525', c: { P: '#7B3FE4', Y: '#FFD23F', S: SKIN.d, J: '#7B3FE4' }, px: [
    '.....PP.....', '....PPPP....', '....PYPP....', '...PPPPPP...', '.PPPPPPPPPP.', '..SKSSSSKS..',
    '..SSSSSSSS..', '..WWWWWWWW..', '..WWWMMWWW..', '....WWWW....', ...JERSEY] },
  { name: 'Astronaut',    bg: '#0B0B12', c: { V: '#3D8BFF', A: '#FFD23F', Y: '#FFD23F', R: '#FF4A3D', B: '#3DE0FF', J: '#C9CCE0' }, px: [
    '.Y.......Y..', '...WWWWWW...', '..WWWWWWWW..', '.WWVVVVVVWW.', '.WVVAVVVVVW.', '.WVAVVVVVVW.',
    '.WVVVVVVVVW.', '.WWVVVVVVWW.', '..WWWWWWWW..', '...WWRBWW...', ...JERSEY] },
  { name: 'Zombie',       bg: '#552583', c: { Z: '#8DB360', D: '#4E6B2E', H: '#3A2A1A', R: '#FF4A3D', J: '#6B6B80' }, px: [
    '............', '..HH.HHHH...', '..HHHHHHHH..', '..ZZZZZZZZ..', '..ZZZZDZZZ..', '.ZZRZZZZKZZ.',
    '..ZZZZZZZZ..', '..ZWMWMWZZ..', '...ZZZZZZ...', '....ZZZZ....', ...JERSEY] },
  { name: 'Dino',         bg: '#FFD23F', c: { D: '#3FA34D', Y: '#E56020', R: '#B3202A', J: '#0E2240' }, px: [
    '............', '...DDDDDD...', '..DDDDDDDDD.', '.YDDDKDDDDDD', '.YDDDDDDDDDD', '.YDDDDWDWDWD',
    '..DDDDRRRRRR', '..DDDDWDWDWD', '..DDDDDDDDD.', '...DDDD.....', ...JERSEY] },
  { name: 'Fireball',     bg: '#151525', c: { R: '#FF4A3D', F: '#FF9F1C', Y: '#FFE14D', J: '#FF4A3D' }, px: [
    '.....R......', '....RR..R...', '...RRF.RR...', '..RRFFRRFR..', '..RFFYFFFR..', '.RFFYYYYFFR.',
    '.RFYKYYKYFR.', '.RFYYYYYYFR.', '..RFYMMYFR..', '...RFFFFR...', ...JERSEY] },
];

/* Swag anchors (Nov 19): the eye row (people: 5) and mouth row (default eye + 2) for the characters,
   so shades, grills and hair land in the right place on every avatar. */
const ANCHOR = {
  'Alien': [4, 7], 'Alley cat': [4, 7], 'Pup': [4, 6], 'Frog': [2, 7], 'Fox': [4, 8], 'Penguin': [4, 5],
  'Ghost': [4, 7], 'Wizard': [5, 8], 'Astronaut': [4, 6], 'Dino': [3, 6], 'Fireball': [6, 8],
};

/* The 12×12 colors of avatar i, wearing `look` (see swag.js lookOf). */
function grid(i, look) {
  const a = AVATARS[i] || AVATARS[0];
  const colors = { K, W, M: MOUTH, ...a.c };
  const g = Array.from({ length: 12 }, (_, y) => [...(a.px[y] || '............')].map((ch) => (ch !== '.' && colors[ch]) || null));
  if (!look) return g;
  const [eye, mouth] = ANCHOR[a.name] || [5, (ANCHOR[a.name] || [5])[0] + 2];
  const person = !!a.px.person;
  const paint = (rows, y0, c, repl) => rows.forEach((r, dy) => {
    const y = y0 + dy, replace = repl && dy < 5;
    if (y < 0 || y > 11) return;
    [...r].forEach((ch, x) => {
      if (ch === '.') { if (replace) g[y][x] = null; return; }
      if (ch === 'S') { if (replace) g[y][x] = a.c.S || g[y][x]; return; }
      const col = ch === 'H' ? (replace && a.c.H) || c.H : ch === 'K' ? K : ch === 'W' ? W : ch === 'J' ? a.c.J : c[ch];
      if (col) g[y][x] = col;
    });
  });
  const place = (it) => (it.at === 'eye' ? eye : it.at === 'mouth' ? mouth : it.at === 'neck' ? 10 : it.at === 'belt' ? 11 : eye - 5);
  const wear = (id) => {
    const it = ITEMS[id];
    if (!it) return;
    let rows = it.rows;
    (it.grow || []).forEach(([n, r]) => { if ((look.chain || 1) >= n) rows = r; });
    paint(rows, place(it), it.c, it.slot === 'hair' && person);
  };
  ['fit', 'neck', 'face'].forEach((s) => wear(look.gear[s]));
  const t = look.titles || {};
  if (t.clown) paint(TITLES.clown.rows, eye - 5, TITLES.clown.c, person);
  else wear(look.gear.hair);
  if (t.crown) paint(TITLES.crown.rows, Math.max(0, eye - 5), TITLES.crown.c, false);
  if (t.belt) paint(TITLES.belt.rows, 11, TITLES.belt.c, false);
  if (t.clown) paint(['.....RR.....'], eye + 1, TITLES.clown.c, false);   // the nose
  return g;
}

const cache = {};
function svgBody(i, look) {
  const key = i + '|' + lookKey(look);
  if (cache[key]) return cache[key];
  const a = AVATARS[i] || AVATARS[0];
  let rects = `<rect width="12" height="12" fill="${a.bg}"/>`;
  grid(i, look).forEach((row, y) => {
    // One rect per run of the same color keeps the SVG small.
    for (let x = 0; x < 12;) {
      const col = row[x];
      let n = 1;
      while (x + n < 12 && row[x + n] === col) n += 1;
      if (col) rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${col}"/>`;
      x += n;
    }
  });
  return (cache[key] = rects);
}

/* <svg> avatar. size in px (multiples of 12 stay crisp). who = a user id (draws the swag they wear and
   any title they hold) or a look object (the Locker Room's try-on preview). */
export function avatar(i, size, label, who) {
  const n = Number.isInteger(i) && AVATARS[i] ? i : 0;
  const s = size || 36;
  const look = who && typeof who === 'object' ? who : lookOf(who);
  return `<svg class="ava${frameOf(look)}" width="${s}" height="${s}" viewBox="0 0 12 12" shape-rendering="crispEdges" ${label ? `role="img" aria-label="${AVATARS[n].name}"` : 'aria-hidden="true"'}>${svgBody(n, look)}</svg>`;
}
