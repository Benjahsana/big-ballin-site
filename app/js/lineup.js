/* BIG BALLIN: lineup rules: locks, cap, cap bonus, sign and cut. */
import { S, ui } from './state.js?v=d6ea804';
import { $, POS, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, beep, flash, jersey, pills, matches } from './util.js?v=d6ea804';

/* ---------- Lineup logic ---------- */
export function isLocked(p) {
  const g = S.games[p.game_id];
  if (!g || !g.tip_utc) return false;
  const t = Date.parse(g.tip_utc);
  return !isNaN(t) && Date.now() >= t;
}
export function slotOf(id) { return POS.find((pos) => S.lineup[pos] === id) || null; }
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
export function targetSlot(p) {
  const elig = slotsFor(p);
  if (elig.includes(S.poolPos)) return S.poolPos;
  return elig.find((pos) => !S.lineup[pos]) || elig[0];
}
export function costAfter(p) {
  const t = targetSlot(p);
  const occ = S.lineup[t] ? S.byId[S.lineup[t]] : null;
  const already = slotOf(p.id) ? p.price : 0;
  return spent() - (occ ? occ.price : 0) - already + p.price;
}
export function signState(p) {
  if (slotOf(p.id)) return { label: 'ON ROSTER', cls: 'btn-off', off: true };
  if (isLocked(p)) return { label: 'LOCKED', cls: 'btn-off', off: true };
  if (costAfter(p) > S.slate.cap + 1e-6) return { label: 'OVER CAP', cls: 'btn-danger', off: false };
  return { label: S.lineup[targetSlot(p)] ? 'SWAP IN' : 'SIGN', cls: 'btn-primary', off: false };
}
export function saveLineup() { store('bb-lineup-' + S.slate.date, S.lineup); }

export function sign(p) {
  if (isLocked(p)) { beep([[110, 0.3]]); flash('LOCKED!', '#A9A7C2', '#FF4A3D'); return; }
  const t = targetSlot(p);
  const occ = S.lineup[t] ? S.byId[S.lineup[t]] : null;
  if (occ && isLocked(occ)) { beep([[110, 0.3]]); flash('LOCKED!', '#A9A7C2', '#FF4A3D'); return; }
  if (costAfter(p) > S.slate.cap + 1e-6) { beep([[110, 0.35], [92, 0.3]]); flash('OVER THE CAP!', '#FF4A3D', '#3D8BFF'); return; }
  const cur = slotOf(p.id);
  if (cur) S.lineup[cur] = null;
  S.lineup[t] = p.id;
  saveLineup();
  const next = POS.find((pos) => !S.lineup[pos]);
  if (next) S.poolPos = next;
  beep([[660, 0.07], [880, 0.07], [1320, 0.12]]);
  const bonus = capBonusFor(spent(), filledCount());
  if (filledCount() === 5 && bonus >= 1.15) { beep([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2]]); flash('CAP BONUS ' + bonusText(bonus) + '!', '#FFD23F', '#3D8BFF'); }
  else if (p.price >= 40) flash('MAX CONTRACT!', '#FFD23F', '#FF4A3D');
  else if (p.value >= S.crushLine) flash('CAP CRUSHER!', '#FFD23F', '#3D8BFF');
  else flash('SIGNED!', '#FFD23F', '#FF4A3D');
  ui.renderAll();
}
export function cut(pos) {
  const p = S.lineup[pos] ? S.byId[S.lineup[pos]] : null;
  if (!p) return;
  if (isLocked(p)) { beep([[110, 0.3]]); flash('LOCKED!', '#A9A7C2', '#FF4A3D'); return; }
  S.lineup[pos] = null; S.poolPos = pos; saveLineup();
  beep([[330, 0.08], [220, 0.12]]);
  ui.renderAll();
}
