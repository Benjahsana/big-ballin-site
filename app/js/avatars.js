/* BIG BALLIN: 12 original 8-bit player avatars (no real people), drawn as SVG pixels.
   The database stores only the number (profiles.avatar, 0–11). */

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
};
const person = (top, beard) => [...TOPS[top], ...(beard ? BEARD : FACE), ...JERSEY];

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
];

const cache = {};
function svgBody(i) {
  if (cache[i]) return cache[i];
  const a = AVATARS[i] || AVATARS[0];
  const colors = { K, W, M: MOUTH, ...a.c };
  let rects = `<rect width="12" height="12" fill="${a.bg}"/>`;
  a.px.forEach((row, y) => {
    // One rect per run of the same color keeps the SVG small.
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      let n = 1;
      while (row[x + n] === ch) n += 1;
      if (ch !== '.' && colors[ch]) rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${colors[ch]}"/>`;
      x += n;
    }
  });
  return (cache[i] = rects);
}

/* <svg> avatar. size in px (multiples of 12 stay crisp). */
export function avatar(i, size, label) {
  const n = Number.isInteger(i) && AVATARS[i] ? i : 0;
  const s = size || 36;
  return `<svg class="ava" width="${s}" height="${s}" viewBox="0 0 12 12" shape-rendering="crispEdges" ${label ? `role="img" aria-label="${AVATARS[n].name}"` : 'aria-hidden="true"'}>${svgBody(n)}</svg>`;
}
