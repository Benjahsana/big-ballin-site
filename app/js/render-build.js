/* BIG BALLIN: Build tab: lineup slots, fill bar, filters and free agents (cards or list). */
import { S } from './state.js?v=2f68c1e';
import { $, POS, BN, POSNAME, slotLabel, esc, money, where, slotsFor, chg, jersey, fitNames, color } from './util.js?v=2f68c1e';
import { liveOf, isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, signState, benchOn, benchBudget, benchSpent } from './lineup.js?v=2f68c1e';
import { W, WINDOWS, winLabel, SORTS, sortDef, PRICE_BANDS, maxForSlot, filteredPool, injuryTag } from './filters.js?v=2f68c1e';

export function renderSlots() {
  const slots = benchOn() ? [...POS, BN] : POS;
  $('#slots').innerHTML = slots.map((pos) => {
    const p = S.lineup[pos] ? S.byId[S.lineup[pos]] : null;
    const bench = pos === BN;
    const active = (S.poolPos === pos ? ' is-active' : '') + (bench ? ' bench' : '');
    const head = bench
      ? `<div class="slot-head"><span class="slot-pos">6TH MAN</span><span class="muted">Any position</span></div>
         <div class="bench-meter" title="A separate ${money(benchBudget())} bench budget, not part of the $${S.slate.cap}M cap: it never changes your cap bonus">BENCH ${money(benchBudget() - benchSpent())} LEFT</div>`
      : `<div class="slot-head"><span class="slot-pos">${pos}</span><span class="muted">${POSNAME[pos]}</span></div>`;
    if (!p) return `<div class="slot${active}">${head}<button class="slot-empty" data-act="choose" data-pos="${pos}">${bench
      ? '+ SIGN A 6TH MAN<small>Plays only if a starter sits out</small>' : `+ SIGN A ${pos}`}</button></div>`;
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
  const chips = ['ALL', ...POS, ...(benchOn() ? [BN] : [])].map((v) => {
    const has = v !== 'ALL' && S.lineup[v];
    return `<button class="fb-chip${has ? ' has' : ''}${v === BN ? ' bench' : ''}" data-act="poolpos" data-v="${v}" aria-pressed="${S.poolPos === v}"
      aria-label="${v === 'ALL' ? 'All positions' : `${POSNAME[v]}${has ? ', filled' : ', empty'}`}">${slotLabel(v)}${has ? ' ✓' : ''}</button>`;
  }).join('');
  const bonus = filled === 5 ? capBonusFor(spent(), 5) : potentialBonus();
  let info;
  if (S.poolPos === 'ALL') info = filled === 5
    ? `<b class="yel">LINEUP FULL</b> · ${money(left)} left · bonus <b class="blu">${bonusText(bonus)}</b>`
    : `Browsing all positions · ${money(left)} left`;
  else if (S.poolPos === BN) info = `<span class="fb-now">NOW FILLING <b class="yel">6TH MAN</b></span>
      <span>Any position · up to <b>${money(benchBudget())}</b> from the bench budget</span>
      <span>Not part of the cap or the bonus · subs in only if a starter sits</span>`;
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

/* Tip time for a player's game ("7:30 PM"), from the slate. */
function tip(p) {
  const g = S.games[p.game_id];
  const d = g && g.tip_utc ? new Date(g.tip_utc) : null;
  return d && !isNaN(d) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
}
const one = (v) => (v == null ? '–' : Number(v).toFixed(1));
const WIN_SHORT = { l2: 'L2', l5: 'L5', l10: 'L10', season: 'SZN' };

/* Arcade card: team-color banner, big price, three scoreboard boxes, big stat digits, buttons. */
function card(p) {
  const st = signState(p);
  const over = st.cls === 'btn-danger';
  const w = W(p), sort = sortDef();
  // Four big stat digits: PTS REB AST + the stat you sorted by (else MIN).
  const fourth = ['proj', 'price', 'value', 'fp', 'pts', 'reb', 'ast', 'chg'].includes(sort.k) ? SORTS.find((x) => x.k === 'min') : sort;
  const dig = (l, v, on) => `<div${on ? ' class="on"' : ''}><b>${v}</b><span>${l}</span></div>`;
  return `<article class="acard${slotOf(p.id) ? ' on' : ''}${p.injury === 'OUT' ? ' is-out' : ''}">
      <div class="ac-top" style="background:${color(p.team)}">${jersey(p, 'md')}
        <div class="ac-id"><h3 class="ac-name fit">${esc(p.name)}</h3>
          <span class="ac-sub">${esc(slotsFor(p).join('/'))} · ${esc(where(p))}${tip(p) ? ' · ' + esc(tip(p)) : ''}</span>
          ${injuryTag(p) ? `<span>${injuryTag(p)}</span>` : ''}</div>
      </div>
      <div class="ac-price"><span class="lab">PRICE</span><span class="chg">${chg(p)}</span><b class="${over ? 'red' : 'yel'}${sort.k === 'price' ? ' on' : ''}">${money(p.price)}</b></div>
      <div class="ac-boxes">
        <div${sort.k === 'proj' ? ' class="on"' : ''}><span>PROJ</span><b class="yel">${p.proj.toFixed(1)}</b></div>
        <div${sort.k === 'value' ? ' class="on"' : ''}><span>FP/$M</span><b class="blu">${p.value.toFixed(2)}</b></div>
        <div${sort.k === 'fp' ? ' class="on"' : ''}><span>${WIN_SHORT[S.win] || ''} FP</span><b>${one(w.fp)}</b></div>
      </div>
      <div class="ac-digits">${dig('PTS', one(w.pts), sort.k === 'pts')}${dig('REB', one(w.reb), sort.k === 'reb')}${dig('AST', one(w.ast), sort.k === 'ast')}${dig(fourth.s, fourth.f(p), fourth.k === sort.k)}</div>
      <div class="row-btns">
        <button class="btn btn-ghost" data-act="stats" data-id="${p.id}">STATS</button>
        <button class="btn ${st.cls}" data-act="sign" data-id="${p.id}" ${st.off ? 'disabled' : ''}>${st.label}</button>
      </div></article>`;
}

/* LIST view: the same columns in the same order for every row; tap a header to sort by it.
   A sort that isn't one of these columns (blocks, FT%...) gets one extra column at the end. */
const LCOLS = ['price', 'proj', 'value', 'fp', 'pts', 'reb', 'ast', 'min'];
const LCLS = { price: 'c-price', proj: 'yel', value: 'blu', fp: 'k-hide', pts: 'k-hide', reb: 'k-hide', ast: 'k-hide', min: 'k-hide' };
function listCols() {
  const cols = LCOLS.map((k) => SORTS.find((x) => x.k === k));
  if (!LCOLS.includes(S.poolSort)) cols.push(sortDef());
  return cols;
}
function renderListHead() {
  const head = $('#poolHead');
  head.hidden = S.view !== 'list';
  if (head.hidden) return;
  const cols = listCols();
  head.innerHTML = `<span class="lc-av"></span><span class="lc-name">PLAYER</span>${cols.map((c) => {
    const on = S.poolSort === c.k;
    const lab = c.k === 'fp' ? `${WIN_SHORT[S.win] || ''} FP` : c.s;
    return `<button class="lc ${LCLS[c.k] || ''}${on ? ' on' : ''}" data-act="lsort" data-k="${c.k}" aria-sort="${on ? (S.poolDir < 0 ? 'descending' : 'ascending') : 'none'}">${lab}${on ? (S.poolDir < 0 ? ' ▼' : ' ▲') : ''}</button>`;
  }).join('')}<span class="lc-btn"></span>`;
}
function row(p) {
  const st = signState(p);
  const over = st.cls === 'btn-danger';
  const cells = listCols().map((c) => {
    const on = S.poolSort === c.k ? ' on' : '';
    if (c.k === 'price') return `<span class="lc c-price${on}${over ? ' red' : ''}">${money(p.price)}</span>`;
    return `<span class="lc ${LCLS[c.k] || ''}${on}">${c.f(p)}</span>`;
  }).join('');
  return `<div class="lrowp${slotOf(p.id) ? ' on' : ''}${p.injury === 'OUT' ? ' is-out' : ''}">
      <span class="lc-av">${jersey(p, 'sm')}</span>
      <span class="lc-name"><button class="pr-name" data-act="stats" data-id="${p.id}">${esc(p.name)}</button> ${injuryTag(p)}
        <span class="sub">${esc(slotsFor(p).join('/'))} · ${esc(where(p))}${tip(p) ? ' · ' + esc(tip(p)) : ''}</span></span>
      ${cells}
      <button class="btn ${st.cls} pr-btn" data-act="sign" data-id="${p.id}" ${st.off ? 'disabled' : ''}>${slotOf(p.id) ? 'ON TEAM' : st.label}</button>
    </div>`;
}

export function renderPool() {
  renderFillBar();
  renderControls();
  renderListHead();
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
  const bands = benchOn() ? [...PRICE_BANDS, ['bench', `Fits bench (≤ ${money(benchBudget())})`]] : PRICE_BANDS;
  $('#poolPrice').innerHTML = bands.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
}
