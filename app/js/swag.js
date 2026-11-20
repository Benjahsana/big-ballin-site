/* BIG BALLIN: swag (Nov 19). Earned avatar gear: nothing here changes scoring.
   The database decides who has what (supabase/schema.sql award_swag / set_gear; the unlock numbers are
   pipeline/config.py SWAG_*). This file is the catalog (names, rarity, how to earn, pixel art), the
   public "who wears what" data, and the overlay pixels avatars.js draws on top of an avatar.

   Gear sits on the avatars' shared 12×12 grid: rows 0–4 head top, the eye row (5 for the people; each
   character has its own `eye` in avatars.js), the mouth two rows below, and the jersey on rows 10–11.
   Item ids start with their slot (hair_, neck_, face_, fit_). NEW ITEMS: add them here AND to award_swag()
   (or swag_free() for free ones) in schema.sql. */
import { S } from './state.js?v=a0c45de';
import { CLOUD, swagAll, mySwag } from './cloud.js?v=a0c45de';

export const SLOTS = ['hair', 'neck', 'face', 'fit'];
export const SLOT_NAME = { hair: 'HAIR', neck: 'NECK', face: 'FACE', fit: 'FIT' };
export const RARITY = {
  common: { name: 'COMMON', color: '#A9A7C2' },
  rare: { name: 'RARE', color: '#3D8BFF' },
  epic: { name: 'EPIC', color: '#B26BFF' },
  legendary: { name: 'LEGENDARY', color: '#FFD23F' },
};
const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };

/* rows: pixel rows ('.' = leave alone, S = the avatar's skin, H = the avatar's own hair color if it has
   one, else the item's H). For people, hair rows 0–4 replace their own hair; rows past that only add
   pixels (big hair down the sides). at: where row 0 goes: 'top' (eye − 5), 'eye', 'mouth', 'neck' (row 10). */
export const ITEMS = {
  // ---- HAIR (people: replaces their hair; characters: worn on top of the head) ----
  hair_afro: { slot: 'hair', name: 'BIG AFRO', rarity: 'rare', how: 'Play 5 nights', at: 'top', c: { H: '#1A1110' },
    rows: ['..HHHHHHHH..', '.HHHHHHHHHH.', 'HHHHHHHHHHHH', 'HHHSSSSSSHHH', 'HHSSSSSSSSHH', 'HH........HH', '.H........H.'] },
  hair_frost: { slot: 'hair', name: 'FROSTED TIPS', rarity: 'rare', how: 'Play 10 nights', at: 'top', c: { H: '#6B4423', T: '#FFF3A0' },
    rows: ['.T.T.T.T.T..', '.THTHTHTHTT.', '..HHHHHHHH..', '..SSSSSSSS..', '..SSSSSSSS..'] },
  hair_rows: { slot: 'hair', name: 'CORNROWS', rarity: 'epic', how: 'Play 25 nights', at: 'top', c: { H: '#1A1110', B: '#FFD23F' },
    rows: ['............', '...HSHHSHH..', '..HHSHHSHHH.', '..HSHHSHHSB.', '..SSSSSSSSB.'] },
  hair_rainbow: { slot: 'hair', name: 'RAINBOW FRO', rarity: 'epic', how: 'Play 50 nights', at: 'top',
    c: { R: '#FF4A3D', O: '#FF9F1C', Y: '#FFE14D', G: '#4CD964', B: '#3D8BFF', P: '#B26BFF' },
    rows: ['..RRRRRRRR..', '.OOOOOOOOOO.', 'YYYYYYYYYYYY', 'GGGSSSSSSGGG', 'BBSSSSSSSSBB', 'PP........PP', '.P........P.'] },
  hair_hightop: { slot: 'hair', name: 'GOLD-STREAK HIGH-TOP', rarity: 'legendary', how: 'Play 100 nights', at: 'top', c: { H: '#1A1110', Y: '#FFD23F' },
    rows: ['..HHHHHHHH..', '..HYYYYYYH..', '..HHHHHHHH..', '..HHHHHHHH..', '..SSSSSSSS..'] },
  hair_flame: { slot: 'hair', name: 'FLAME TOP', rarity: 'epic', how: 'Get a HEATER streak', at: 'top', c: { R: '#FF4A3D', F: '#FF9F1C', Y: '#FFE14D' },
    rows: ['..R..R..R...', '.RFR.RFRRF..', '.RFFYFFYFFR.', '..RFFYFFFR..', '..SSSSSSSS..'] },
  hair_band: { slot: 'hair', name: 'IRON HEADBAND', rarity: 'rare', how: 'Get an IRON MAN streak', at: 'top', c: { H: '#1A1110', A: '#FF4A3D', W: '#F4F1E8' },
    rows: ['............', '...HHHHHH...', '..HHHHHHHH..', '..AWAAAAWA..', '..SSSSSSSS..'] },
  // ---- NECK ----
  neck_silver: { slot: 'neck', name: 'SILVER CHAIN', rarity: 'common', how: 'Free', free: true, at: 'neck', c: { G: '#C9CCE0' },
    rows: ['...GK..KG...', '...KGGGGK...'] },
  neck_gold: { slot: 'neck', name: 'GOLD CHAIN', rarity: 'rare', how: 'Win a week in a league (it gets bigger with every week you win)', at: 'neck', c: { Y: '#FFD23F', D: '#FF9F1C' },
    rows: ['...YK..KY...', '...KYYYYK...'], grow: [[3, ['..YK....KY..', '..KYYYYYYK..']], [5, ['..YY....YY..', '..KYYDDYYK..']]] },
  neck_ice: { slot: 'neck', name: 'DIAMOND CHAIN', rarity: 'epic', how: 'Join the 200 CLUB', at: 'neck', c: { B: '#BFF6FF', W: '#FFFFFF' },
    rows: ['..BK....KB..', '..KBWBBWBK..'] },
  neck_whistle: { slot: 'neck', name: 'COMMISH WHISTLE', rarity: 'rare', how: 'Run a league', at: 'neck', c: { R: '#FF4A3D', G: '#C9CCE0' },
    rows: ['...R....R...', '....RRGG....'] },
  // ---- FACE ----
  face_pick: { slot: 'face', name: 'TOOTHPICK', rarity: 'common', how: 'Free', free: true, at: 'mouth', c: { T: '#D9B26F' },
    rows: ['.......TTT..'] },
  face_shades: { slot: 'face', name: 'THRIFT SHADES', rarity: 'rare', how: 'Get BARGAIN BIN', at: 'eye', c: { P: '#FF5FA2' },
    rows: ['.KPPKKKKPPK.'] },
  face_grill: { slot: 'face', name: 'GOLD GRILL', rarity: 'epic', how: 'Finish a week or month in the WORLD top 10', at: 'mouth', c: { Y: '#FFD23F' },
    rows: ['....YYYY....'] },
  // ---- FIT (the jersey rows) ----
  fit_away: { slot: 'fit', name: 'AWAY WHITES', rarity: 'common', how: 'Free', free: true, at: 'neck', c: {},
    rows: ['..WWJWWJWW..', '.WWWWWWWWWW.'] },
  fit_champ: { slot: 'fit', name: 'CHAMP TEE', rarity: 'rare', how: 'Win a night (any league, or WORLD #1)', at: 'neck', c: { Y: '#FFD23F' },
    rows: ['..KKKYKKKK..', '.KKKKYYKKKK.'] },
  fit_tiedye: { slot: 'fit', name: 'TIE-DYE', rarity: 'epic', how: 'Get a PERFECT NIGHT', at: 'neck',
    c: { R: '#FF4A3D', Y: '#FFE14D', G: '#4CD964', B: '#3D8BFF', P: '#B26BFF', O: '#FF9F1C' },
    rows: ['..RYGBPRYG..', '.PBGYROPBGY.'] },
  fit_gold: { slot: 'fit', name: 'GOLDEN JERSEY', rarity: 'legendary', how: 'Win a league SEASON', at: 'neck', c: { Y: '#FFD23F' },
    rows: ['..YYWYYWYY..', '.YYYYYYYYYY.'] },
};

/* Titles: worn automatically while you hold them (swag_now, rebuilt each morning by the score job). */
export const TITLES = {
  crown: { name: 'CROWN', icon: '👑', what: 'Won last night', c: { Y: '#FFD23F', R: '#FF4A3D' }, at: 'top', rows: ['..Y.Y..Y.Y..', '..YYRYYRYY..'] },
  belt: { name: 'TITLE BELT', icon: '🥇', what: 'Won the latest week', c: { Y: '#FFD23F', D: '#2B2B3A' }, at: 'belt', rows: ['.DDDDYYDDDD.'] },
  goldframe: { name: 'GOLD FRAME', icon: '🖼️', what: 'Won the latest month', c: {}, rows: [] },
  clown: { name: 'CLOWN WIG', icon: '🤡', what: 'Last place last night (WORLD)', at: 'top', c: { R: '#FF4A3D', B: '#3DE0FF' },
    rows: ['RB.R....R.BR', 'RRBR....RBRR', 'BRR......RRB', 'RRSSSSSSSSRR', '.BSSSSSSSSB.'], nose: true },
};

/* ---------- Public data: what everyone wears, current titles, my unlocks ---------- */
export const SW = { worn: {}, now: {}, chain: {}, mine: null, at: 0 };
export async function loadSwag(force) {
  if (!CLOUD || !S.cloudOk || (!force && Date.now() - SW.at < 5 * 60000)) return;
  SW.at = Date.now();
  try {
    const { worn, now, chains } = await swagAll();
    SW.chain = Object.fromEntries(chains.map((c) => [c.user_id, c.n]));
    SW.worn = Object.fromEntries(worn.map((w) => [w.user_id, w]));
    SW.now = {};
    now.forEach((t) => { (SW.now[t.user_id] = SW.now[t.user_id] || {})[t.item] = t; });
  } catch (e) { SW.at = 0; }
}
export async function loadMySwag() {
  if (!S.user) { SW.mine = null; return; }
  try { SW.mine = await mySwag(S.user.id); } catch (e) { /* keep */ }
}
/* Unlock rows for a user ({item → row}); free items count as unlocked. */
export function unlockedOf(rows) {
  const out = Object.fromEntries((rows || []).map((r) => [r.item, r]));
  Object.entries(ITEMS).forEach(([id, it]) => { if (it.free && !out[id]) out[id] = { item: id, n: 1, free: true }; });
  return out;
}

/* What a user looks like: { gear: {slot → item id}, titles: {crown, belt, …}, chain: week wins }. */
export function lookOf(uid) {
  if (!uid) return null;
  const w = SW.worn[uid], t = SW.now[uid];
  if (!w && !t) return null;
  return { gear: w ? { hair: w.hair, neck: w.neck, face: w.face, fit: w.fit } : {}, titles: t || {}, chain: SW.chain[uid] };
}
/* The rarest thing worn → the avatar's frame color class. */
export function frameOf(look) {
  if (!look) return '';
  if (look.titles.goldframe) return ' fr-goldframe';
  let best = -1, name = '';
  SLOTS.forEach((s) => { const it = ITEMS[look.gear[s]]; if (it && RANK[it.rarity] > best) { best = RANK[it.rarity]; name = it.rarity; } });
  return best > 0 ? ' fr-' + name : '';
}
export const lookKey = (look) => (look ? SLOTS.map((s) => look.gear[s] || '').join(',') + '|' + Object.keys(look.titles).sort().join(',') + '|' + (look.chain || '') : '');
