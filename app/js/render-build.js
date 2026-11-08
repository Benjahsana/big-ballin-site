/* BIG BALLIN: Build tab: lineup slots, fill bar, filters and free agents (cards or list). */
import { S } from './state.js?v=2dee99a';
import { $, POS, POSNAME, esc, money, where, slotsFor, chg, jersey, fitNames } from './util.js?v=2dee99a';
import { liveOf, isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, signState } from './lineup.js?v=2dee99a';
import { W, WINDOWS, winLabel, SORTS, sortDef, PRICE_BANDS, maxForSlot, filteredPool, injuryTag } from './filters.js?v=2dee99a';

export function renderSlots() {
  $('#slots').innerHTML = POS.map((pos) => {
    const p = S.lineup[pos] ? S.byId[S.lineup[pos]] : null;
    const active = S.poolPos === pos ? ' is-active' : '';
    const head = `<div class="slot-head"><span class="slot-pos">${pos}</span><span class="muted">${POSNAME[pos]}</span></div>`;
    if (!p) return `<div class="slot${active}">${head}<button class="slot-empty" data-act="choose" data-pos="${pos}">+ SIGN A ${pos}</button></div>`;
    const locked = isLocked(p);
    return `<div class="slot is-filled${active}">${head}
      <div class="who">${jersey(p, 'sm')}<div class="who-text"><span class="pname fit" style="font-size:21px">${esc(p.name)} ${injuryTag(p)}</span><span class="sub">${esc(where(p))}</span></div></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
        <span class="price" style="text-align:left">${money(p.price)}</span>
        ${locked ? `<span class="badge">LOCKED</span>${liveOf(p) ? `<span class="live-fp">${liveOf(p).fp.toFixed(1)} FP</span>` : ''}` : `<span class="yel" style="font-weight:700">${p.proj.toFixed(1)} proj</span>`}
      </div>
      <div class="slot-actions">
        <button class="btn btn-ghost" data-act="stats" data-id="${p.id}">STATS</button>
        <button class="btn btn-plain" data-act="choose" data-pos="${pos}" ${locked ? 'disabled' : ''}>SWAP</button>
        <button class="btn btn-cut" data-act="cut" data-pos="${pos}" ${locked ? 'disabled' : ''} aria-label="Cut ${esc(p.name)}">CUT</button>
      </div></div>`;
  }).join('');
  fitNames($('#slots'));
}

/* "NOW FILLING" bar: slot chips (also the position filter), max for the slot, cap left, bonus. */
function renderFillBar() {
  const filled = filledCount();
  const left = S.slate.cap - spent();
  const chips = ['ALL', ...POS].map((v) => {
    const has = v !== 'ALL' && S.lineup[v];
    return `<button class="fb-chip${has ? ' has' : ''}" data-act="poolpos" data-v="${v}" aria-pressed="${S.poolPos === v}"
      aria-label="${v === 'ALL' ? 'All positions' : `${POSNAME[v]}${has ? ', filled' : ', empty'}`}">${v}${has ? ' ✓' : ''}</button>`;
  }).join('');
  const bonus = filled === 5 ? capBonusFor(spent(), 5) : potentialBonus();
  let info;
  if (S.poolPos === 'ALL') info = filled === 5
    ? `<b class="yel">LINEUP FULL</b> · ${money(left)} left · bonus <b class="blu">${bonusText(bonus)}</b>`
    : `Browsing all positions · ${money(left)} left`;
  else info = `<span class="fb-now">NOW FILLING <b class="yel">${S.poolPos}</b></span>
      <span>Max for this slot <b>${money(Math.max(0, maxForSlot(S.poolPos)))}</b></span>
      <span>${money(left)} left · bonus <b class="blu">${bonusText(bonus)}</b></span>`;
  $('#fillbar').innerHTML = `<div class="fb-chips" role="group" aria-label="Pick a slot to fill">${chips}</div><div class="fb-info">${info}</div>`;
}

function seg(items, cur, act) {
  return items.map(([v, l]) => `<button class="seg-b" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`).join('');
}

function activeFilterCount() {
  return (S.poolGame !== 'ALL') + (S.poolPrice !== 'ALL') + S.poolFits + !S.hideOut
    + (S.poolSort !== 'proj' || S.poolDir !== -1) + (S.win !== 'season');
}

function renderControls() {
  const n = activeFilterCount();
  $('#filters').classList.toggle('open', S.filtersOpen);
  $('#filtersBtn').textContent = (S.filtersOpen ? 'HIDE FILTERS' : 'FILTERS') + (n && !S.filtersOpen ? ` (${n})` : '');
  $('#filtersBtn').setAttribute('aria-expanded', String(S.filtersOpen));
  $('#filtersBtn').setAttribute('aria-pressed', String(n > 0));
  $('#poolSort').value = S.poolSort;
  $('#poolDir').textContent = S.poolDir < 0 ? 'HIGH ▼' : 'LOW ▲';
  $('#poolGame').value = S.poolGame;
  $('#poolPrice').value = S.poolPrice;
  $('#fitsBtn').setAttribute('aria-pressed', String(S.poolFits));
  $('#outBtn').setAttribute('aria-pressed', String(S.hideOut));
  $('#poolWin').innerHTML = seg(WINDOWS, S.win, 'win');
  $('#poolView').innerHTML = seg([['cards', 'CARDS'], ['list', 'LIST']], S.view, 'view');
}

/* The stat line under each player: window label + core stats, plus the sorted stat if it isn't shown. */
function statLine(p) {
  const w = W(p), sort = sortDef();
  const base = ['fp', 'pts', 'reb', 'ast', 'min'];
  const extra = !['proj', 'price', 'value', 'chg', ...base].includes(sort.k) ? ` · <b class="yel">${sort.f(p)} ${sort.s}</b>` : '';
  const n = (v) => (v == null ? '–' : Number(v).toFixed(1));
  return `${winLabel()}${w.g ? ` (${w.g}g)` : ''} · ${n(w.fp)} FP · ${n(w.pts)} PTS · ${n(w.reb)} REB · ${n(w.ast)} AST · ${n(w.min)} MIN${extra}`;
}

function card(p) {
  const st = signState(p);
  const over = st.cls === 'btn-danger';
  return `<article class="pcard${slotOf(p.id) ? ' on' : ''}${p.injury === 'OUT' ? ' is-out' : ''}">
      <div class="pc-top">${jersey(p, 'md')}
        <div class="pc-id">
          <h3 class="pname fit">${esc(p.name)} ${injuryTag(p)}</h3>
          <span class="sub">${esc(slotsFor(p).join('/'))} · ${esc(where(p))}</span>
          <div class="pc-pr"><span class="pc-price${over ? ' red' : ''}">${money(p.price)}</span><span class="chg">${chg(p)}</span></div>
        </div>
      </div>
      <div class="pc-key">
        <div><span>PROJ</span><b class="yel">${p.proj.toFixed(1)}</b></div>
        <div><span>FP/$M</span><b class="blu">${p.value.toFixed(2)}</b></div>
      </div>
      <p class="pc-line">${statLine(p)}</p>
      <div class="row-btns">
        <button class="btn btn-ghost" data-act="stats" data-id="${p.id}">STATS</button>
        <button class="btn ${st.cls}" data-act="sign" data-id="${p.id}" ${st.off ? 'disabled' : ''}>${st.label}</button>
      </div></article>`;
}

function row(p) {
  const st = signState(p);
  const over = st.cls === 'btn-danger';
  const w = W(p), sort = sortDef();
  const n = (v) => (v == null ? '–' : Number(v).toFixed(1));
  const show = ['proj', 'price', 'value'].includes(sort.k) ? SORTS.find((s) => s.k === 'fp') : sort;
  return `<div class="prow${slotOf(p.id) ? ' on' : ''}${p.injury === 'OUT' ? ' is-out' : ''}">
      <div class="pr-av">${jersey(p, 'sm')}</div>
      <div class="pr-id"><button class="pr-name" data-act="stats" data-id="${p.id}">${esc(p.name)}</button> ${injuryTag(p)}
        <span class="sub">${esc(slotsFor(p).join('/'))} · ${esc(where(p))}</span></div>
      <div class="pr-price${over ? ' red' : ''}">${money(p.price)}<span class="chg">${chg(p)}</span></div>
      <div class="pr-n n1"><span>PROJ</span><b class="yel">${p.proj.toFixed(1)}</b></div>
      <div class="pr-n n2"><span>FP/$M</span><b class="blu">${p.value.toFixed(2)}</b></div>
      <div class="pr-n n3"><span>${show.s}</span><b>${show.f(p)}</b></div>
      <div class="pr-stats">${n(w.pts)} PTS · ${n(w.reb)} REB · ${n(w.ast)} AST</div>
      <button class="btn ${st.cls} pr-btn" data-act="sign" data-id="${p.id}" ${st.off ? 'disabled' : ''}>${st.label}</button>
    </div>`;
}

export function renderPool() {
  renderFillBar();
  renderControls();
  const list = filteredPool();
  const shown = list.slice(0, S.poolLimit);
  const hiddenOut = S.hideOut ? S.slate.players.filter((p) => p.injury === 'OUT').length : 0;
  $('#poolCount').textContent = `Showing ${shown.length} of ${list.length}` + (hiddenOut ? ` · ${hiddenOut} OUT hidden` : '');
  $('#moreBtn').hidden = shown.length >= list.length;
  const pool = $('#pool');
  pool.className = S.view === 'list' ? 'plist' : 'pool';
  if (!list.length) {
    pool.innerHTML = `<p class="muted" style="margin:0">No players match. Try clearing a filter${S.poolFits ? ' or turning off FITS MY CAP' : ''}.</p>`;
    return;
  }
  pool.innerHTML = shown.map(S.view === 'list' ? row : card).join('');
  fitNames(pool);
}

/* Called once after the slate loads: fills the game and sort menus. */
export function setupPoolControls() {
  const t = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
  $('#poolGame').innerHTML = `<option value="ALL">All games</option>` +
    (S.slate.games || []).map((g) => `<option value="${esc(g.game_id)}">${esc(g.away)} @ ${esc(g.home)}${t(g.tip_utc)}</option>`).join('');
  $('#poolSort').innerHTML = SORTS.map((s) => `<option value="${s.k}">Sort: ${s.l}</option>`).join('');
  $('#poolPrice').innerHTML = PRICE_BANDS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
}
