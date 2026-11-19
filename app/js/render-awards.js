/* BIG BALLIN: steal & bust of the night, achievements and streaks (Nov 18).
   The score job picks last night's steal and bust (results-<date>.json "awards"); the database awards
   achievements and keeps everyone's current streaks (supabase/schema.sql award_achievements). This file
   draws them: the STEAL / BUST strip on a league page, streak chips next to names on the boards, the
   MY ACHIEVEMENTS box on MY TEAM, and the fanfare the first time I see a new achievement. */
import { S } from './state.js?v=20fe34f';
import { esc, money, store, recall, flash, POS } from './util.js?v=20fe34f';
import { STREAKS } from './app-config.js?v=20fe34f';
import { CLOUD, signedIn, myAchievements, streaksAll } from './cloud.js?v=20fe34f';
import { L, lastIsCurrent } from './night.js?v=20fe34f';
import { play } from './sound.js?v=20fe34f';

export const ACH = {
  perfect: { icon: '🎯', name: 'PERFECT NIGHT', what: 'All 5 starters beat their projection' },
  bargain: { icon: '💎', name: 'BARGAIN BIN', what: 'A cheap starter went off' },
  big: { icon: '💯', name: '200 CLUB', what: 'A huge final score' },
  heater: { icon: '🔥', name: 'HEATER', what: 'Beat your lineup’s projection nights in a row' },
  ironman: { icon: '🦾', name: 'IRON MAN', what: 'A full lineup nights in a row' },
};
const achName = (a) => (a.kind === 'big' && a.detail ? a.detail + ' CLUB' : ACH[a.kind].name);
function achLine(a) {
  if (a.kind === 'bargain') return `${esc(a.detail || '')} scored ${Number(a.value).toFixed(1)}`;
  if (a.kind === 'heater' || a.kind === 'ironman') return `${a.value} nights in a row`;
  return `${Number(a.value).toFixed(1)} final`;
}

/* ---------- Loading ---------- */
let streakAt = 0;
export async function loadStreaks() {
  if (!CLOUD || !S.cloudOk || Date.now() - streakAt < 10 * 60000) return;
  streakAt = Date.now();
  try { S.streaks = Object.fromEntries((await streaksAll()).map((r) => [r.user_id, r])); } catch (e) { streakAt = 0; }
}
export async function loadMyAch() {
  if (!signedIn()) { S.ach = null; return; }
  try { S.ach = await myAchievements(); } catch (e) { /* keep what we had */ }
}

/* First time this device sees a new achievement: fanfare + callout (old ones are just marked seen). */
export async function checkAchievements() {
  await loadMyAch();
  if (!S.ach || !S.user) return;
  const key = 'bb-ach-seen-' + S.user.id;
  const seen = recall(key);
  store(key, S.ach.map((a) => a.id));
  if (!Array.isArray(seen)) return;
  const fresh = S.ach.filter((a) => !seen.includes(a.id));
  if (!fresh.length) return;
  const a = fresh[fresh.length - 1];
  play('fanfare');
  flash(`${ACH[a.kind].icon} ${achName(a)}!`, '#FFD23F', '#FF4A3D');
}

/* ---------- Streak chips next to a name ---------- */
export function streakChips(uid) {
  const s = S.streaks && S.streaks[uid];
  if (!s) return '';
  const out = [];
  if (s.heater >= STREAKS.heater) out.push(`<span class="stk heat" title="HEATER: beat the projection ${s.heater} nights in a row">🔥${s.heater}</span>`);
  if (s.ironman >= STREAKS.ironman) out.push(`<span class="stk iron" title="IRON MAN: a full lineup ${s.ironman} nights in a row">🦾${s.ironman}</span>`);
  return out.join('');
}

/* ---------- Steal & bust of last night (league page) ---------- */
const lastAwards = () => (lastIsCurrent() ? S.awards : L.awards) || null;
/* Who in this league had him: from last night's board, once it has been loaded this visit. */
function pickers(night, pid) {
  if (!night) return null;
  return night.filter((n) => POS.some((pos) => Number((n.slots || {})[pos]) === pid)).map((n) => n.display_name);
}
export function awardsStrip(lastNight) {
  const aw = lastAwards();
  if (!aw || (!aw.steal && !aw.bust)) return '';
  const who = (pid) => {
    const p = pickers(lastNight, pid);
    return p == null ? '' : p.length ? `<span class="aw-who">Picked by ${esc(p.join(', '))}</span>` : '<span class="aw-who muted">Nobody here had him</span>';
  };
  const box = (k, a, line) => `<div class="aw-box aw-${k}">
      <span class="cap-label">${k === 'steal' ? '💎 STEAL OF THE NIGHT' : '🧊 BUST OF THE NIGHT'}</span>
      <b class="aw-name">${esc(a.name)} <span class="muted">${esc(a.team)} · ${money(a.price)}</span></b>
      <span class="aw-line">${line}</span>${who(a.id)}</div>`;
  return `<div class="aw-strip" aria-label="Last night's steal and bust">
    ${aw.steal ? box('steal', aw.steal, `<b class="yel">${aw.steal.fp.toFixed(1)} FP</b> · ${aw.steal.value.toFixed(1)} FP per $1M`) : ''}
    ${aw.bust ? box('bust', aw.bust, `<b class="red">${aw.bust.fp.toFixed(1)} FP</b> · projected ${Number(aw.bust.proj).toFixed(1)}`) : ''}
  </div>`;
}

/* ---------- MY ACHIEVEMENTS (MY TEAM) ---------- */
export function achBox() {
  if (!signedIn()) return '';
  const list = S.ach || [];
  const s = (S.streaks || {})[S.user.id] || { heater: 0, ironman: 0 };
  const tiles = Object.entries(ACH).map(([k, m]) => {
    const mine = list.filter((a) => a.kind === k);
    const lastOne = mine[mine.length - 1];
    const streak = k === 'heater' ? s.heater : k === 'ironman' ? s.ironman : null;
    return `<div class="ach${mine.length ? ' got' : ''}">
      <span class="ach-ic" aria-hidden="true">${m.icon}</span>
      <b>${esc(lastOne ? achName(lastOne) : m.name)}${mine.length > 1 ? ` <i>×${mine.length}</i>` : ''}</b>
      <span class="muted">${lastOne ? `${esc(lastOne.slate_date.slice(5).replace('-', '/'))}: ${achLine(lastOne)}` : esc(m.what)}</span>
      ${streak != null ? `<span class="ach-now">NOW: ${streak} in a row</span>` : ''}</div>`;
  }).join('');
  return `<section class="achs" aria-label="My achievements"><h3 class="lg-head">MY ACHIEVEMENTS</h3><div class="ach-grid">${tiles}</div>
    <p class="muted lb-note">Awarded each morning after the night is scored, and posted in your leagues’ chat.</p></section>`;
}
