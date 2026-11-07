/* BIG BALLIN: Build tab: lineup slots and free agents. */
import { S } from './state.js?v=d6ea804';
import { $, POS, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, beep, flash, jersey, pills, matches } from './util.js?v=d6ea804';
import { isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, targetSlot, costAfter, signState, saveLineup, sign, cut } from './lineup.js?v=d6ea804';

export function renderSlots() {
  $('#slots').innerHTML = POS.map((pos) => {
    const p = S.lineup[pos] ? S.byId[S.lineup[pos]] : null;
    const active = S.poolPos === pos ? ' is-active' : '';
    const head = `<div class="slot-head"><span class="slot-pos">${pos}</span><span class="muted">${POSNAME[pos]}</span></div>`;
    if (!p) return `<div class="slot${active}">${head}<button class="slot-empty" data-act="choose" data-pos="${pos}">+ SIGN A ${pos}</button></div>`;
    const locked = isLocked(p);
    return `<div class="slot is-filled${active}">${head}
      <div class="who">${jersey(p, 'sm')}<div class="who-text"><span class="pname" style="font-size:21px">${esc(p.name)}</span><span class="sub">${esc(where(p))}</span></div></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
        <span class="price" style="text-align:left">${money(p.price)}</span>
        ${locked ? '<span class="badge">LOCKED</span>' : `<span class="yel" style="font-weight:700">${p.proj.toFixed(1)} proj</span>`}
      </div>
      <div class="slot-actions">
        <button class="btn btn-ghost" data-act="stats" data-id="${p.id}">STATS</button>
        <button class="btn btn-plain" data-act="choose" data-pos="${pos}" ${locked ? 'disabled' : ''}>SWAP</button>
        <button class="btn btn-cut" data-act="cut" data-pos="${pos}" ${locked ? 'disabled' : ''} aria-label="Cut ${esc(p.name)}">CUT</button>
      </div></div>`;
  }).join('');
}

export function sortedPool() {
  const list = S.slate.players.filter((p) => (S.poolPos === 'ALL' || slotsFor(p).includes(S.poolPos)) && matches(p, S.poolQuery));
  const k = S.poolSort;
  list.sort((a, b) => k === 'cheap' ? a.price - b.price : k === 'price' ? b.price - a.price : k === 'value' ? b.value - a.value : b.proj - a.proj);
  return list;
}
export function renderPool() {
  $('#poolPills').innerHTML = pills(S.poolPos, 'poolpos');
  $('#poolTitle').textContent = S.poolPos === 'ALL' ? '' : S.poolPos;
  const list = sortedPool();
  const shown = list.slice(0, S.poolLimit);
  $('#poolCount').textContent = `Showing ${shown.length} of ${list.length}`;
  $('#moreBtn').hidden = shown.length >= list.length;
  if (!list.length) { $('#pool').innerHTML = `<p class="muted" style="margin:0">No players match. Clear the search or pick another position.</p>`; return; }
  $('#pool').innerHTML = shown.map((p) => {
    const st = signState(p);
    const over = st.label === 'OVER CAP';
    return `<article class="pcard${slotOf(p.id) ? ' on' : ''}">
      <div class="pc-top">${jersey(p, 'md')}
        <div class="pc-id">
          <h3 class="pname">${esc(p.name)}</h3>
          <span class="sub">${esc(slotsFor(p).join('/'))} · ${esc(where(p))}</span>
          <div class="pc-pr"><span class="pc-price${over ? ' red' : ''}">${money(p.price)}</span><span class="chg">${chg(p)}</span></div>
        </div>
      </div>
      <div class="pc-key">
        <div><span>PROJ</span><b class="yel">${p.proj.toFixed(1)}</b></div>
        <div><span>FP/$M</span><b class="blu">${p.value.toFixed(2)}</b></div>
      </div>
      <p class="pc-line">Avg ${p.avg_fp.toFixed(1)} FP · ${p.stats.pts} PTS · ${p.stats.reb} REB · ${p.stats.ast} AST · ${p.stats.min} MIN</p>
      <div class="row-btns">
        <button class="btn btn-ghost" data-act="stats" data-id="${p.id}">STATS</button>
        <button class="btn ${st.cls}" data-act="sign" data-id="${p.id}" ${st.off ? 'disabled' : ''}>${st.label}</button>
      </div></article>`;
  }).join('');
}
