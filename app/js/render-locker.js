/* BIG BALLIN: LOCKER ROOM (Nov 19). Your home page when you're signed in: your avatar in its swag, the
   titles you hold, the 4 gear slots (tap to wear), your trophy case (every win, forever) and achievements.
   Anyone's locker can be opened (S.lockerUser) from chat avatars, list boards and box scores: read-only. */
import { S, ui } from './state.js?v=b389d92';
import { $, esc, flash } from './util.js?v=b389d92';
import { avatar, avatarCard } from './avatars.js?v=b389d92';
import { play } from './sound.js?v=b389d92';
import { CLOUD, signedIn, lockerOf, setGear, mySwag, friendly } from './cloud.js?v=b389d92';
import { ITEMS, TITLES, SLOTS, SLOT_NAME, RARITY, SW, loadSwag, unlockedOf } from './swag.js?v=b389d92';
import { BADGE } from './render-leagues.js?v=b389d92';
import { ACH, achName } from './render-awards.js?v=b389d92';

const LK = { uid: null, data: null, err: null, busy: false };
const me = () => (S.user ? S.user.id : null);
const who = () => S.lockerUser || me();

export async function loadLocker() {
  const uid = who();
  if (!CLOUD || !S.cloudOk || !uid) { LK.uid = null; LK.data = null; return; }
  if (LK.uid !== uid) { LK.uid = uid; LK.data = null; }
  try {
    const [d] = await Promise.all([lockerOf(uid), loadSwag()]);
    if (LK.uid === uid) { LK.data = d; LK.err = null; }
  } catch (e) { LK.err = friendly(e).text; }
}
export function openLocker(uid) {
  S.lockerUser = uid && uid !== me() ? uid : null;
  S.tab = 'locker';
  ui.renderAll();
  window.scrollTo({ top: 0 });
  loadLocker().then(ui.renderAll);
}

/* Tap an item: wear it (or take it off). Shows at once; the database checks it was earned. */
export async function wear(slot, id) {
  if (LK.busy || S.lockerUser) return;
  const before = { ...((SW.worn[me()]) || {}) };
  const next = { hair: before.hair || null, neck: before.neck || null, face: before.face || null, fit: before.fit || null };
  next[slot] = next[slot] === id ? null : id || null;
  SW.worn[me()] = { user_id: me(), ...next };
  play('tap');
  ui.renderAll();
  LK.busy = true;
  try { await setGear(next); }
  catch (e) { SW.worn[me()] = before; const f = friendly(e); flash(f.title, '#FF4A3D', '#3D8BFF'); ui.renderAll(); }
  finally { LK.busy = false; }
}

const fmtDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
const leagueName = (id) => (id ? ((S.allLeagues || []).find((l) => l.id === id) || {}).name || 'A league' : 'WORLD');
const TROPHY_ICON = { night: '🏆', week: '🥇', month: '🏅', season: '💍', w_night1: '🌎', w_week10: '🌍', w_month10: '🌏', record: '📈', w_record: '🌟' };

function hero(d, mine) {
  const uid = who();
  const p = d ? d.profile : S.profile;
  const titles = SW.now[uid] || {};
  const held = Object.entries(titles).map(([k, t]) => `<li class="lk-title t-${k}"><span aria-hidden="true">${TITLES[k].icon}</span>
      <b>${TITLES[k].name}</b><span class="muted">${esc(TITLES[k].what)}${t.detail && k !== 'clown' ? ' · ' + esc(t.detail) : k === 'clown' && t.detail ? ' · ' + esc(t.detail) + ' final' : ''}</span></li>`).join('');
  const unl = unlockedOf(d && d.unlocks);
  const total = Object.keys(ITEMS).length;
  return `<div class="lk-hero">
    <div class="lk-ava">${p ? avatarCard(p.avatar, uid, p.display_name, 200) : ''}</div>
    <div class="lk-id">
      ${S.lockerUser ? '<button class="linkish" data-act="locker" data-u="">← MY LOCKER ROOM</button>' : ''}
      <h2 class="lk-name">${esc(p ? p.display_name : '')}</h2>
      <div class="lk-stats">
        <span><b class="yel">${d ? d.badges.length : '…'}</b> TROPHIES</span>
        <span><b class="blu">${d ? d.ach.length : '…'}</b> ACHIEVEMENTS</span>
        <span><b>${d ? Object.keys(unl).length : '…'}/${total}</b> SWAG</span>
      </div>
      ${held ? `<ul class="lk-titles">${held}</ul>` : `<p class="muted">${mine ? 'No titles right now. Win a night to wear the 👑.' : 'No titles right now.'}</p>`}
      ${mine ? `<div class="m-actions"><button class="btn btn-primary" data-act="tab" data-tab="build">BUILD TONIGHT’S LINEUP ▸</button>
        <button class="btn btn-ghost" data-act="tab" data-tab="score">MY TEAM</button></div>` : ''}
    </div></div>`;
}

function closet(d, mine) {
  const unl = unlockedOf(d && d.unlocks);
  const worn = SW.worn[who()] || {};
  const rows = SLOTS.map((slot) => {
    const items = Object.entries(ITEMS).filter(([, it]) => it.slot === slot);
    const chips = items.map(([id, it]) => {
      const got = unl[id];
      const on = worn[slot] === id;
      const r = RARITY[it.rarity];
      const extra = id === 'neck_gold' && got && got.n > 1 ? ` ×${got.n}` : '';
      const preview = avatar((d && d.profile ? d.profile : S.profile || { avatar: 0 }).avatar, 84, false, { gear: { [slot]: id }, titles: {}, chain: got ? got.n : 1 });
      const inner = `${preview}<span class="sw-name">${esc(it.name)}${extra}</span><span class="sw-r" style="color:${r.color}">${r.name}</span>
        <span class="sw-how muted">${got ? (got.free ? 'Free' : got.earned_on ? 'Earned ' + esc(fmtDate(got.earned_on)) : 'Earned') : '🔒 ' + esc(it.how)}</span>`;
      if (!mine || !got) return `<div class="sw${got ? ' got' : ' locked'}${on ? ' on' : ''}" style="--rc:${r.color}">${inner}${on ? '<span class="sw-on">WEARING</span>' : ''}</div>`;
      return `<button class="sw got${on ? ' on' : ''}" style="--rc:${r.color}" data-act="wear" data-slot="${slot}" data-v="${id}" aria-pressed="${on}">${inner}${on ? '<span class="sw-on">WEARING</span>' : ''}</button>`;
    }).join('');
    return `<div class="sw-slot"><h4 class="mg-sub">${SLOT_NAME[slot]}${mine && worn[slot] ? ` <button class="linkish" data-act="wear" data-slot="${slot}" data-v="">take off</button>` : ''}</h4><div class="sw-row">${chips}</div></div>`;
  }).join('');
  return `<section class="lk-sec" aria-label="Swag"><h3 class="lg-head">${mine ? 'MY SWAG' : 'SWAG'}</h3>
    ${mine ? '<p class="muted lb-note">Tap something you’ve earned to wear it. Everyone sees it on the boards and in chat. Titles (👑 crown, 🥇 belt, gold frame, 🤡 wig) are worn automatically while you hold them.</p>' : ''}
    ${rows}</section>`;
}

/* Night by night (Nov 27): one card per night (or week / month / season) with that night's score, and
   everything won then on it as chips: trophies gold, achievements blue. Newest first. */
const CHIP_NAME = { w_night1: 'WORLD #1', w_week10: 'WORLD TOP 10', w_month10: 'WORLD TOP 10' };
const CHIP_ORDER = ['w_record', 'record', 'season', 'month', 'w_month10', 'week', 'w_week10', 'night', 'w_night1'];
const LEAGUE_KIND = { night: 1, week: 1, month: 1, season: 1, record: 1 };
function groupOf(kind, period) {
  if (/week/.test(kind)) return 'W' + period;
  if (/month/.test(kind)) return 'M' + period;
  if (kind === 'season') return 'S' + period;
  return 'N' + period;
}
function groupTitle(key) {
  const p = key.slice(1), k = key[0];
  if (k === 'W') return 'WEEK OF ' + shortDate(p);
  if (k === 'M') return new Date(p + '-15T12:00:00').toLocaleDateString([], { month: 'long', year: 'numeric' }).toUpperCase();
  if (k === 'S') return 'SEASON ' + p;
  return shortDate(p);
}
function shortDate(d) {
  const dt = new Date(d + 'T12:00:00');
  const o = { month: 'short', day: 'numeric' };
  if (dt.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return dt.toLocaleDateString([], o).toUpperCase();
}
function achDetail(a) {
  if (a.kind === 'bargain') return `${(a.detail || '').replace(/\s*\(.*$/, '').split(' ').slice(-1)[0]} ${Number(a.value).toFixed(1)}`;
  if (a.kind === 'heater' || a.kind === 'ironman') return `${a.value} in a row`;
  return '';
}
function nightCards(d) {
  const groups = new Map();
  const get = (key, when) => {
    if (!groups.has(key)) groups.set(key, { key, when, score: null, trophies: [], ach: [] });
    return groups.get(key);
  };
  d.badges.forEach((b) => {
    const g = get(groupOf(b.kind, b.period), endOf(b.kind, b.period));
    g.trophies.push(b);
    g.score = Math.max(g.score || 0, Number(b.score));
  });
  d.ach.filter((a) => ACH[a.kind]).forEach((a) => {
    const g = get('N' + a.slate_date, a.slate_date);
    g.ach.push(a);
    if ((a.kind === 'big' || a.kind === 'perfect') && g.score == null) g.score = Number(a.value);   // their value is the final score
  });
  if (!groups.size) return '<p class="muted">No trophies yet. Win a night in a league to start the collection.</p>';
  const chip = (cls, icon, name, detail) => `<li class="tchip ${cls}"><span aria-hidden="true">${icon}</span>${esc(name)}${detail ? `<small>${esc(detail)}</small>` : ''}</li>`;
  const cards = [...groups.values()].sort((x, y) => (x.when < y.when ? 1 : x.when > y.when ? -1 : 0)).map((g) => {
    const tro = g.trophies.slice().sort((x, y) => CHIP_ORDER.indexOf(x.kind) - CHIP_ORDER.indexOf(y.kind))
      .map((b) => chip('t', TROPHY_ICON[b.kind] || '🏆', CHIP_NAME[b.kind] || BADGE[b.kind] || b.kind, LEAGUE_KIND[b.kind] ? leagueName(b.league_id) : ''));
    const ach = g.ach.map((a) => chip('a', ACH[a.kind].icon, achName(a), achDetail(a)));
    return `<li class="tn${g.trophies.length ? ' won' : ''}"><div class="tn-head"><span class="tn-date">${esc(groupTitle(g.key))}</span>
      ${g.score != null ? `<span class="tn-score">${g.score.toFixed(1)}</span>` : ''}</div>
      <ul class="tn-chips">${tro.join('')}${ach.join('')}</ul></li>`;
  }).join('');
  return `<ol class="tn-list">${cards}</ol>`;
}
function endOf(kind, period) {
  if (/week/.test(kind)) { const d = new Date(period + 'T12:00:00'); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10); }
  if (/month/.test(kind)) { const [y, m] = period.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
  if (kind === 'season') return (Number(period.slice(0, 4)) + 1) + '-07-31';
  return period;
}

function trophyCase(d) {
  if (!d) return '';
  const counts = {};
  d.badges.forEach((b) => { counts[b.kind] = (counts[b.kind] || 0) + 1; });
  const tiles = Object.keys(BADGE).map((k) => `<div class="tc-tile${counts[k] ? ' got' : ''}"><span class="tc-ic" aria-hidden="true">${TROPHY_ICON[k]}</span>
      <b>${counts[k] || 0}</b><span>${esc(BADGE[k])}</span></div>`).join('');
  const list = nightCards(d);
  return `<section class="lk-sec" aria-label="Trophy case"><h3 class="lg-head">TROPHY CASE</h3><div class="tc-grid">${tiles}</div>${list}</section>`;
}

function achievements(d) {
  if (!d) return '';
  const tiles = Object.entries(ACH).map(([k, m]) => {
    const got = d.ach.filter((a) => a.kind === k);
    return `<div class="ach${got.length ? ' got' : ''}"><span class="ach-ic" aria-hidden="true">${m.icon}</span>
      <b>${esc(m.name)}${got.length > 1 ? ` <i>×${got.length}</i>` : ''}</b><span class="muted">${got.length ? 'Last: ' + esc(fmtDate(got[got.length - 1].slate_date)) : esc(m.what)}</span></div>`;
  }).join('');
  return `<section class="achs lk-sec" aria-label="Achievements"><h3 class="lg-head">ACHIEVEMENTS</h3><div class="ach-grid">${tiles}</div></section>`;
}

export function renderLocker() {
  const box = $('#locker');
  if (!box) return;
  const mine = !S.lockerUser;
  if (!CLOUD || !S.cloudOk) { box.innerHTML = '<div class="empty"><span>The Locker Room needs the server. Try again in a minute.</span></div>'; return; }
  if (mine && !signedIn()) {
    box.innerHTML = `<div class="lk-hero"><div class="lk-id"><h2 class="lk-name">LOCKER ROOM</h2>
      <p>Sign in to get your own locker: earn swag for your avatar (big hair, gold chains, tie-dye, crowns) by playing and winning, and keep every trophy forever.</p>
      <div class="m-actions"><button class="btn btn-primary" data-act="modal" data-k="signin">SIGN IN</button></div></div></div>`;
    return;
  }
  const d = LK.uid === who() ? LK.data : null;
  box.innerHTML = `${hero(d, mine)}
    ${LK.err && !d ? `<div class="empty"><span>${esc(LK.err)}</span></div>` : ''}
    ${!d && !LK.err ? '<p class="muted">Loading…</p>' : ''}
    ${trophyCase(d)}${closet(d, mine)}${achievements(d)}`;
}

/* First time this device sees newly earned swag: fanfare + callout (old ones are just marked seen). */
export async function checkSwag() {
  if (!signedIn()) return;
  let rows;
  try { rows = await mySwag(me()); } catch (e) { return; }
  const key = 'bb-swag-seen-' + me();
  let seen = null;
  try { seen = JSON.parse(localStorage.getItem(key)); } catch (e) { /* private mode */ }
  try { localStorage.setItem(key, JSON.stringify(rows.map((r) => r.item))); } catch (e) { /* ignore */ }
  if (!Array.isArray(seen)) return;
  const fresh = rows.filter((r) => !seen.includes(r.item) && ITEMS[r.item]);
  if (!fresh.length) return;
  play('fanfare');
  flash(`NEW SWAG: ${ITEMS[fresh[fresh.length - 1].item].name}!`, '#FFD23F', '#B26BFF');
}
