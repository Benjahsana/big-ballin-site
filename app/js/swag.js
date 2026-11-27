/* BIG BALLIN: swag (Nov 19). Earned avatar gear: nothing here changes scoring.
   The database decides who has what (supabase/schema.sql award_swag / set_gear; the unlock numbers are
   pipeline/config.py SWAG_*). This file is the catalog (names, rarity, how to earn) and the public
   "who wears what" data. The art for every item is drawn in avatars.js (HAIR, neckItem, faceItem, shirt,
   crown, belt, CLOWN). Item ids start with their slot (hair_, neck_, face_, fit_). NEW ITEMS: add them
   here, draw them in avatars.js, AND add them to award_swag() (or swag_free() for free ones) in schema.sql. */
import { S } from './state.js?v=4150944';
import { CLOUD, swagAll, mySwag } from './cloud.js?v=4150944';

export const SLOTS = ['hair', 'neck', 'face', 'fit'];
export const SLOT_NAME = { hair: 'HAIR', neck: 'NECK', face: 'FACE', fit: 'FIT' };
export const RARITY = {
  common: { name: 'COMMON', color: '#A9A7C2' },
  rare: { name: 'RARE', color: '#3D8BFF' },
  epic: { name: 'EPIC', color: '#B26BFF' },
  legendary: { name: 'LEGENDARY', color: '#FFD23F' },
};
const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };

export const ITEMS = {
  // ---- HAIR (people: replaces their hair; characters: worn on top of the head) ----
  hair_afro: { slot: 'hair', name: 'BIG AFRO', rarity: 'rare', how: 'Play 5 nights' },
  hair_frost: { slot: 'hair', name: 'FROSTED TIPS', rarity: 'rare', how: 'Play 10 nights' },
  hair_rows: { slot: 'hair', name: 'CORNROWS', rarity: 'epic', how: 'Play 25 nights' },
  hair_rainbow: { slot: 'hair', name: 'RAINBOW FRO', rarity: 'epic', how: 'Play 50 nights' },
  hair_hightop: { slot: 'hair', name: 'GOLD-STREAK HIGH-TOP', rarity: 'legendary', how: 'Play 100 nights' },
  hair_flame: { slot: 'hair', name: 'FLAME TOP', rarity: 'epic', how: 'Get a HEATER streak' },
  hair_band: { slot: 'hair', name: 'IRON HEADBAND', rarity: 'rare', how: 'Get an IRON MAN streak' },
  // ---- NECK ----
  neck_silver: { slot: 'neck', name: 'SILVER CHAIN', rarity: 'common', how: 'Free', free: true },
  neck_gold: { slot: 'neck', name: 'GOLD CHAIN', rarity: 'rare', how: 'Win a week in a league (it gets bigger with every week you win)' },
  neck_ice: { slot: 'neck', name: 'DIAMOND CHAIN', rarity: 'epic', how: 'Join the 200 CLUB' },
  neck_whistle: { slot: 'neck', name: 'COMMISH WHISTLE', rarity: 'rare', how: 'Run a league' },
  // ---- FACE ----
  face_pick: { slot: 'face', name: 'TOOTHPICK', rarity: 'common', how: 'Free', free: true },
  face_shades: { slot: 'face', name: 'THRIFT SHADES', rarity: 'rare', how: 'Get BARGAIN BIN' },
  face_grill: { slot: 'face', name: 'GOLD GRILL', rarity: 'epic', how: 'Finish a week or month in the WORLD top 10' },
  // ---- FIT ----
  fit_away: { slot: 'fit', name: 'AWAY WHITES', rarity: 'common', how: 'Free', free: true },
  fit_champ: { slot: 'fit', name: 'CHAMP TEE', rarity: 'rare', how: 'Win a night (any league, or WORLD #1)' },
  fit_tiedye: { slot: 'fit', name: 'TIE-DYE', rarity: 'epic', how: 'Get a PERFECT NIGHT' },
  fit_gold: { slot: 'fit', name: 'GOLDEN JERSEY', rarity: 'legendary', how: 'Win a league SEASON' },
};

/* Titles: worn automatically while you hold them (swag_now, rebuilt each morning by the score job). */
export const TITLES = {
  crown: { name: 'CROWN', icon: '👑', what: 'Won last night' },
  belt: { name: 'TITLE BELT', icon: '🥇', what: 'Won the latest week' },
  goldframe: { name: 'GOLD FRAME', icon: '🖼️', what: 'Won the latest month' },
  clown: { name: 'CLOWN WIG', icon: '🤡', what: 'Last place last night (WORLD)' },
  record: { name: 'WORLD RECORD LAUREL', icon: '🌟', what: 'Best single night in BIG BALLIN history' },
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
/* The rarest thing worn: 'common' | 'rare' | 'epic' | 'legendary'. Holding a title counts too:
   the month (gold frame) or the world record = legendary, the night crown or week belt = epic. */
export function rarityOf(look) {
  if (!look) return 'common';
  if (look.titles && (look.titles.goldframe || look.titles.record)) return 'legendary';
  let best = look.titles && (look.titles.crown || look.titles.belt) ? 2 : 0;
  SLOTS.forEach((s) => { const it = ITEMS[look.gear[s]]; if (it && RANK[it.rarity] > best) best = RANK[it.rarity]; });
  return ['common', 'rare', 'epic', 'legendary'][best];
}
/* The rarest thing worn → the avatar's frame color class. */
export function frameOf(look) {
  if (!look) return '';
  if (look.titles.goldframe) return ' fr-goldframe';
  if (look.titles.record) return ' fr-legendary';
  let best = -1, name = '';
  SLOTS.forEach((s) => { const it = ITEMS[look.gear[s]]; if (it && RANK[it.rarity] > best) { best = RANK[it.rarity]; name = it.rarity; } });
  return best > 0 ? ' fr-' + name : '';
}
export const lookKey = (look) => (look ? SLOTS.map((s) => look.gear[s] || '').join(',') + '|' + Object.keys(look.titles).sort().join(',') + '|' + (look.chain || '') : '');
