/* BIG BALLIN: lineup rules: locks, cap, cap bonus, sign and cut. */
import { S, ui } from './state.js?v=7b2e585';
import { $, POS, BN, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, flash, jersey, pills, matches } from './util.js?v=7b2e585';
import { play } from './sound.js?v=7b2e585';
import { signedIn, pushLineup, loadLineup, friendly } from './cloud.js?v=7b2e585';

/* ---------- Live points (S.live, from Supabase) ---------- */
export const liveOf = (p) => (S.live && S.live.p[String(p.id)]) || null;
export const gameOf = (p) => (S.live && S.live.games[p.game_id]) || null;
export const allFinal = () => !!(S.live && (S.slate.games || []).every((g) => S.live.games[g.game_id] && S.live.games[g.game_id].s === 3));

/* ---------- Lineup logic ---------- */
export function isLocked(p) {
  const g = S.games[p.game_id];
  if (!g || !g.tip_utc) return false;
  const t = Date.parse(g.tip_utc);
  return !isNaN(t) && Date.now() >= t;
}
export function slotOf(id) { return POS.find((pos) => S.lineup[pos] === id) || (S.lineup[BN] === id ? BN : null); }
/* 6th Man: on only for slates that carry a bench budget (separate from the cap; never affects the bonus). */
export const benchOn = () => !!(S.slate && S.slate.bench_budget != null);
export const benchBudget = () => (S.slate && S.slate.bench_budget) || 0;
export const benchSpent = () => (S.lineup[BN] && S.byId[S.lineup[BN]] ? S.byId[S.lineup[BN]].price : 0);
/* Which starter slot the 6th man covers, if any: the first starter (PG..C) who didn't play.
   Official results: no stat line. Live: listed as not playing (feed "out"), or no stats once his game is final.
   lu = a lineup {PG..C, BN} of player ids. Same rule as the database's bench_slot(). */
export function subSlot(lu) {
  if (!lu || !lu[BN]) return null;
  return POS.find((pos) => {
    const id = lu[pos];
    if (!id) return false;
    if (S.results) return !S.results[String(id)];
    const p = S.byId[id];
    if (!p || liveOf(p)) return false;
    if (S.live && (S.live.out || []).includes(id)) return true;
    const g = gameOf(p);
    return !!(g && g.s === 3);
  }) || null;
}
export function spent() { return POS.reduce((t, pos) => t + (S.lineup[pos] ? S.byId[S.lineup[pos]].price : 0), 0); }
export function filledCount() { return POS.filter((pos) => S.lineup[pos]).length; }
/* Cap bonus: same rule as pipeline/common.py cap_bonus(); numbers come from config.py via the slate. */
export function capBonusFor(spentM, filled) {
  const cb = S.slate.cap_bonus || { rate: 0.5, max: 1.25, full_lineup_only: true };
  if (cb.full_lineup_only && filled < 5) return 1;
  const unused = Math.max(S.slate.cap - spentM, 0);
  return Math.min(cb.max, 1 + (unused / 100) * cb.rate);
}
export function potentialBonus() { const cb = S.slate.cap_bonus || { rate: 0.5, max: 1.25 }; return Math.min(cb.max, 1 + (Math.max(S.slate.cap - spent(), 0) / 100) * cb.rate); }
export const bonusText = (b) => '×' + b.toFixed(2);
/* At (or within a hair of) the night's maximum bonus: the big callout and glow. */
export const bonusMaxed = (b) => b > 1.001 && b >= (S.slate.cap_bonus || { max: 1.25 }).max - 0.0005;
export function targetSlot(p) {
  if (S.poolPos === BN && benchOn()) return BN;
  const elig = slotsFor(p);
  if (elig.includes(S.poolPos)) return S.poolPos;
  return elig.find((pos) => !S.lineup[pos]) || elig[0];
}
export function costAfter(p) {
  const t = targetSlot(p);
  const occ = S.lineup[t] ? S.byId[S.lineup[t]] : null;
  const already = POS.includes(slotOf(p.id)) ? p.price : 0;
  return spent() - (occ ? occ.price : 0) - already + p.price;
}
/* Most you can spend on a slot right now, still leaving the price floor for every
   other empty slot (so the lineup can always be finished). */
export function maxForSlot(pos) {
  if (pos === BN) return benchBudget();
  const occ = S.lineup[pos] ? S.byId[S.lineup[pos]] : null;
  const otherEmpty = POS.filter((x) => x !== pos && !S.lineup[x]).length;
  return S.slate.cap - spent() + (occ ? occ.price : 0) - otherEmpty * (S.slate.price_floor ?? 3);
}
export function fits(p) {
  if (slotOf(p.id)) return true;
  return p.price <= maxForSlot(targetSlot(p)) + 1e-6;
}
/* Fits the 6th man budget (the "Fits bench" filter). */
export function fitsBench(p) { return benchOn() && p.price <= benchBudget() + 1e-6;
}
export function signState(p) {
  if (slotOf(p.id)) return { label: 'ON ROSTER', cls: 'btn-off', off: true };
  if (isLocked(p)) return { label: 'LOCKED', cls: 'btn-off', off: true };
  if (targetSlot(p) === BN) {
    if (!fitsBench(p)) return { label: 'OVER BENCH', cls: 'btn-danger', off: false };
    return { label: S.lineup[BN] ? 'SWAP IN' : 'SIGN 6TH', cls: 'btn-primary', off: false };
  }
  if (costAfter(p) > S.slate.cap + 1e-6) return { label: 'OVER CAP', cls: 'btn-danger', off: false };
  if (!fits(p)) return { label: 'NO ROOM', cls: 'btn-danger', off: false };
  return { label: S.lineup[targetSlot(p)] ? 'SWAP IN' : 'SIGN', cls: 'btn-primary', off: false };
}
/* Save on this device, and to your account when signed in. The database re-checks
   every rule (locks, cap, slots); if it says no, we put back what it has saved. */
export function saveLineup() {
  store('bb-lineup-' + S.slate.date, S.lineup);
  if (!signedIn()) { S.sync = 'local'; return; }
  const date = S.slate.date;
  S.sync = 'saving';
  pushLineup(date, { ...S.lineup })
    .then(() => { S.sync = 'saved'; ui.renderAll(); })
    .catch(async (e) => {
      const f = friendly(e);
      S.sync = 'error';
      play(f.title === 'LOCKED!' ? 'locked' : 'buzz'); flash(f.title, '#FF4A3D', '#3D8BFF');
      try {
        const lu = await loadLineup(date);
        [...POS, BN].forEach((pos) => { S.lineup[pos] = lu && lu[pos] && S.byId[lu[pos]] ? lu[pos] : null; });
        store('bb-lineup-' + date, S.lineup);
        S.sync = 'saved';
      } catch (e2) { /* offline: keep the local copy */ }
      ui.renderAll();
    });
}

export function sign(p) {
  if (isLocked(p)) { play('locked'); flash('LOCKED!', '#A9A7C2', '#FF4A3D'); return; }
  const t = targetSlot(p);
  const occ = S.lineup[t] ? S.byId[S.lineup[t]] : null;
  if (occ && isLocked(occ)) { play('locked'); flash('LOCKED!', '#A9A7C2', '#FF4A3D'); return; }
  if (t === BN) {
    if (!fitsBench(p)) { play('buzz'); flash('OVER THE BENCH BUDGET!', '#FF4A3D', '#3D8BFF'); return; }
    const was = slotOf(p.id);
    if (was) S.lineup[was] = null;
    S.lineup[BN] = p.id;
    saveLineup();
    S.poolPos = POS.find((pos) => !S.lineup[pos]) || 'ALL';
    play('signed'); flash('6TH MAN SIGNED!', '#FFD23F', '#3D8BFF');
    ui.renderAll();
    return;
  }
  if (costAfter(p) > S.slate.cap + 1e-6) { play('buzz'); flash('OVER THE CAP!', '#FF4A3D', '#3D8BFF'); return; }
  if (!fits(p)) { play('buzz'); flash('NO ROOM!', '#FF4A3D', '#3D8BFF'); return; }
  const cur = slotOf(p.id);
  if (cur) S.lineup[cur] = null;
  S.lineup[t] = p.id;
  saveLineup();
  const next = POS.find((pos) => !S.lineup[pos]) || (benchOn() && !S.lineup[BN] ? BN : null);
  if (next) S.poolPos = next;
  const bonus = capBonusFor(spent(), filledCount());
  // Announcer: the 5th signing shouts BIG BALLIN!, otherwise he calls the same line as the callout.
  const full = filledCount() === 5;
  if (full && bonusMaxed(bonus)) { play('bigballin'); flash('CAP BONUS ' + bonusText(bonus) + '!', '#FFD23F', '#3D8BFF'); }
  else if (p.price >= 40) { play(full ? 'bigballin' : 'maxcontract'); flash('MAX CONTRACT!', '#FFD23F', '#FF4A3D'); }
  else if (p.value >= S.crushLine) { play(full ? 'bigballin' : 'capcrusher'); flash('CAP CRUSHER!', '#FFD23F', '#3D8BFF'); }
  else { play(full ? 'bigballin' : 'signed'); flash('SIGNED!', '#FFD23F', '#FF4A3D'); }
  ui.renderAll();
}
export function cut(pos) {
  const p = S.lineup[pos] ? S.byId[S.lineup[pos]] : null;
  if (!p) return;
  if (isLocked(p)) { play('locked'); flash('LOCKED!', '#A9A7C2', '#FF4A3D'); return; }
  S.lineup[pos] = null; S.poolPos = pos; saveLineup();
  play('cut');
  ui.renderAll();
}
