/* BIG BALLIN: PLAYERS tab (data-tab "stats"; once called the Stat Center): stats table and the big player card.
   Shows every NBA player: tonight's slate (with prices) plus data/players-all.json (everyone else,
   stats only), loaded the first time the tab opens. ALL NBA | PLAYING TONIGHT switches between them. */
import { S } from './state.js?v=0dfab1e';
import { $, POS, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, flash, jersey, pills, matches } from './util.js?v=0dfab1e';
import { isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, targetSlot, costAfter, signState, saveLineup, sign, cut } from './lineup.js?v=0dfab1e';
import { W, WINDOWS, winLabel, fgPct, ftPct, fmtPct, injuryTag } from './filters.js?v=0dfab1e';

const n1 = (v) => (v == null ? '–' : Number(v).toFixed(1));
const tonight = (p) => p.price != null;     // on tonight's slate (has a price); others are stats only
export const COLS = [
  { k: 'price', l: 'PRICE', v: (p) => p.price, f: (p) => (tonight(p) ? money(p.price) : '–') },
  { k: 'chg', l: 'PRICE CHG', v: (p) => (tonight(p) ? p.price_change || 0 : null), f: (p) => chg(p) || '–', c: 'muted' },
  { k: 'proj', l: 'PROJ', v: (p) => p.proj, f: (p) => (tonight(p) ? p.proj.toFixed(1) : '–'), c: 'yel', b: 1 },
  { k: 'avg', l: 'AVG FP', v: (p) => W(p).fp, f: (p) => n1(W(p).fp), b: 1 },
  { k: 'value', l: 'FP/$M', v: (p) => p.value, f: (p) => (tonight(p) ? p.value.toFixed(2) : '–'), c: 'blu', b: 1 },
  { k: 'pts', l: 'PTS', v: (p) => W(p).pts, f: (p) => n1(W(p).pts) },
  { k: 'reb', l: 'REB', v: (p) => W(p).reb, f: (p) => n1(W(p).reb) },
  { k: 'ast', l: 'AST', v: (p) => W(p).ast, f: (p) => n1(W(p).ast) },
  { k: 'fg3m', l: '3PM', v: (p) => W(p).fg3m, f: (p) => n1(W(p).fg3m) },
  { k: 'stl', l: 'STL', v: (p) => W(p).stl, f: (p) => n1(W(p).stl) },
  { k: 'blk', l: 'BLK', v: (p) => W(p).blk, f: (p) => n1(W(p).blk) },
  { k: 'tov', l: 'TOV', v: (p) => W(p).tov, f: (p) => n1(W(p).tov) },
  { k: 'fgpct', l: 'FG%', v: fgPct, f: (p) => fmtPct(fgPct(p)) },
  { k: 'ftpct', l: 'FT%', v: ftPct, f: (p) => fmtPct(ftPct(p)) },
  { k: 'min', l: 'MIN', v: (p) => W(p).min, f: (p) => n1(W(p).min) },
];
/* Everyone else in the NBA (no game tonight), fetched once. */
let allLoading = null;
function loadAll() {
  if (S.all || allLoading) return;
  allLoading = fetch('../data/players-all.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const ids = new Set(S.slate.players.map((p) => p.id));
      S.all = d ? d.players.filter((p) => !ids.has(p.id)) : [];
      S.allById = Object.fromEntries(S.all.map((p) => [p.id, p]));
    })
    .catch(() => { S.all = []; S.allById = {}; })
    .finally(() => { allLoading = null; if (S.tab === 'stats') renderStats(); });
}
/* Any player by id: tonight's slate first, then the rest of the league. */
export const anyPlayer = (id) => S.byId[id] || (S.allById || {})[id] || null;
const whereTxt = (p) => (tonight(p) ? where(p) : 'No game');

export function renderStats() {
  loadAll();
  const all = S.statsScope !== 'tonight';
  const extra = S.all ? S.all.length : 0;
  $('#statsScope').innerHTML = `<button class="seg-b" data-act="statsscope" data-v="all" aria-pressed="${all}">ALL NBA</button>`
    + `<button class="seg-b" data-act="statsscope" data-v="tonight" aria-pressed="${!all}">PLAYING TONIGHT</button>`;
  $('#statsPills').innerHTML = pills(S.statsPos, 'statspos');
  $('#statsWin').innerHTML = WINDOWS.map(([v, l]) => `<button class="seg-b" data-act="win" data-v="${v}" aria-pressed="${S.win === v}">${l}</button>`).join('');
  $('#statsHead').innerHTML = `<th scope="col" class="left corner">PLAYER</th><th scope="col" class="left">POS</th><th scope="col" class="left">TONIGHT</th>` +
    COLS.map((c) => {
      const on = S.sortKey === c.k;
      const aria = on ? (S.sortDir < 0 ? 'descending' : 'ascending') : 'none';
      return `<th scope="col" aria-sort="${aria}"><button class="sortbtn${on ? ' on' : ''}" data-act="sort" data-k="${c.k}">${c.l}${on ? (S.sortDir < 0 ? ' ▼' : ' ▲') : ''}</button></th>`;
    }).join('');
  const col = COLS.find((c) => c.k === S.sortKey) || COLS[2];
  const list = all ? S.slate.players.concat(S.all || []) : S.slate.players;
  const rows = list.filter((p) => (S.statsPos === 'ALL' || slotsFor(p).includes(S.statsPos)) && matches(p, S.statsQuery))
    .sort((a, b) => { const va = col.v(a), vb = col.v(b); if (va == null) return 1; if (vb == null) return -1; return S.sortDir * (va - vb); });
  $('#statsBody').innerHTML = rows.length ? rows.map((p) => `<tr class="${p.id === S.selId ? 'sel' : ''}">
      <th scope="row"><button class="namebtn" data-act="select" data-id="${p.id}">${esc(p.name)}</button> ${injuryTag(p)}</th>
      <td class="l">${esc(slotsFor(p).join('/'))}</td><td class="l${tonight(p) ? '' : ' muted'}">${esc(whereTxt(p))}</td>
      ${COLS.map((c) => `<td class="${c.c || ''}${c.b || c.k === 'price' ? ' k' : ''}${S.sortKey === c.k ? ' on' : ''}">${c.f ? c.f(p) : c.v(p)}</td>`).join('')}
    </tr>`).join('') : `<tr><td class="l" colspan="18" style="padding:16px">No players match.</td></tr>`;
  $('#statsCount').textContent = all
    ? (S.all ? `${rows.length} of ${S.slate.players.length + extra} NBA players · prices only for tonight’s ${S.slate.players.length}` : 'Loading the rest of the league…')
    : `${rows.length} of tonight’s ${S.slate.players.length} players`;
  renderCard();
}
/* "Why this price": the inputs the pipeline used (see CLAUDE.md, How prices work). */
export function whyPrice(p) {
  if (S.slate.price_source === 'draftkings') return `<div class="why"><h3>WHY THIS PRICE</h3><div class="why-sub">Tonight’s prices come from DraftKings salaries, rescaled to the $${S.slate.cap}M cap.</div></div>`;
  if (p.price_base == null) return '';
  const pct = (v) => v == null ? '–' : (v >= 10 ? Math.round(v) : v.toFixed(1)) + '%';
  const mod = p.pop_mod ?? 1;
  const rule = S.slate.popularity_rule;     // from config.py (POP_STARTED_LOW/HIGH)
  const popLine = p.popularity == null
    ? 'No popularity data today, so no adjustment.'
    : rule
    ? `Started in ${pct(p.pct_started)} of ESPN leagues. ${rule.started_high}%+ started = ×${rule.mod_max.toFixed(2)}, ${rule.started_low}% or less = ×${rule.mod_min.toFixed(2)}. (Sleeper ${p.trend > 0 ? '+' : ''}${(p.trend || 0).toLocaleString('en-US')} net adds in 48h, not part of the price.)`
    : `Started in ${pct(p.pct_started)} of ESPN leagues · rostered in ${pct(p.pct_rostered)} · Sleeper ${p.trend > 0 ? '+' : ''}${(p.trend || 0).toLocaleString('en-US')} net adds (48h)`;
  const popWord = rule && p.pct_started != null
    ? (p.pct_started >= rule.started_high ? 'Hot name' : p.pct_started <= rule.started_low ? 'Under the radar' : 'Popularity')
    : 'Popularity';
  const formula = p.price_base * mod;
  const notes = [];
  if (p.price <= 5.05 && formula < 5) notes.push('Cheap tier: nobody costs less than $3M.');
  if (Math.abs(p.price - formula) > 0.35 && formula >= 5) notes.push('Prices move gradually, so part of the last slate’s price carries over.');
  return `<div class="why">
      <h3>WHY THIS PRICE</h3>
      <div class="why-row"><span>Long-term level · ${p.price_fp != null ? p.price_fp.toFixed(1) : p.avg_fp.toFixed(1)} FP/game</span><b>${money(p.price_base)}</b></div>
      <div class="why-row"><span>${popWord}</span><b class="${mod > 1.001 ? 'red' : mod < 0.999 ? 'blu' : ''}">×${mod.toFixed(2)}</b></div>
      <div class="why-sub">${esc(popLine)}</div>
      <div class="why-row why-total"><span>Tonight’s price</span><b class="yel">${money(p.price)}</b></div>
      ${notes.length ? `<div class="why-sub">${notes.join(' ')}</div>` : ''}
    </div>`;
}

export function renderCard() {
  const p = anyPlayer(S.selId);
  if (!p) { $('#card').innerHTML = '<p class="muted" style="margin:0">Pick a player to see his card.</p>'; return; }
  const on = tonight(p);
  const st = on ? signState(p) : null;
  const l5 = p.last5 || [];
  const max = Math.max(1, ...l5, p.avg_fp);
  const bars = l5.length
    ? `<div class="bars" role="img" aria-label="Last ${l5.length} games fantasy points, oldest to latest: ${l5.join(', ')}">${l5.map((v) => `<div class="bar"><span>${v}</span><i style="height:${Math.round(v / max * 100)}px;background:${v >= p.avg_fp ? 'var(--yel)' : 'var(--blu)'}"></i></div>`).join('')}</div>
       <div style="display:flex;justify-content:space-between;font-size:15px" class="muted"><span>oldest</span><span>latest</span></div>`
    : `<p class="muted" style="margin:0">No games yet this season.</p>`;
  const adj = p.matchup_adj || 0;
  const s = W(p), n = (v) => (v == null ? '–' : Number(v).toFixed(1));
  $('#card').innerHTML = `
    <div class="ac-top" style="background:${color(p.team)}">${jersey(p, 'lg')}<div class="ac-id"><h3 class="ac-name">${esc(p.name)}</h3><span class="ac-sub">${esc(slotsFor(p).join('/'))} · ${esc(on ? where(p) : p.team + ' · no game tonight')}</span>${injuryTag(p) ? `<span>${injuryTag(p)}</span>` : ''}</div></div>
    ${on ? `<div class="tiles">
      <div class="tile"><div class="tile-k">PRICE</div><div class="tile-v">${money(p.price)}</div><div class="muted" style="font-size:15px">${chg(p) || 'no change'}</div></div>
      <div class="tile"><div class="tile-k">PROJ</div><div class="tile-v yel">${p.proj.toFixed(1)}</div></div>
      <div class="tile"><div class="tile-k">FP/$M</div><div class="tile-v blu">${p.value.toFixed(2)}</div></div>
    </div>
    ${whyPrice(p)}` : `<div class="tiles">
      <div class="tile"><div class="tile-k">AVG FP</div><div class="tile-v yel">${n1(W(p).fp)}</div><div class="muted" style="font-size:15px">${esc(winLabel())}</div></div>
      <div class="tile"><div class="tile-k">GAMES</div><div class="tile-v">${p.games_this_season || 0}</div><div class="muted" style="font-size:15px">this season</div></div>
      <div class="tile"><div class="tile-k">MIN</div><div class="tile-v">${n1(W(p).min)}</div></div>
    </div>
    <div class="note"><span>No game tonight, so no price. He gets one on a night his team plays.</span></div>`}
    <div style="display:flex;flex-direction:column;gap:10px">
      <div class="bars-head"><h3>LAST ${l5.length || 5} GAMES · FP</h3><span class="muted" style="font-size:16px">avg ${p.avg_fp.toFixed(1)}</span></div>
      ${bars}
    </div>
    <div>
      <div class="muted" style="font-size:16px;margin-bottom:8px">Per game · ${esc(winLabel())}${s.g ? ` (${s.g} games` + (p.stats_from === 'last season' ? ', last season)' : ')') : ''}</div>
      <dl class="grid4">
        <div><dt>PTS</dt><dd>${n(s.pts)}</dd></div><div><dt>REB</dt><dd>${n(s.reb)}</dd></div><div><dt>AST</dt><dd>${n(s.ast)}</dd></div><div><dt>3PM</dt><dd>${n(s.fg3m)}</dd></div>
        <div><dt>STL</dt><dd>${n(s.stl)}</dd></div><div><dt>BLK</dt><dd>${n(s.blk)}</dd></div><div><dt>TOV</dt><dd>${n(s.tov)}</dd></div><div><dt>MIN</dt><dd>${n(s.min)}</dd></div>
        <div><dt>FG%</dt><dd>${fmtPct(fgPct(p))}</dd></div><div><dt>FT%</dt><dd>${fmtPct(ftPct(p))}</dd></div><div><dt>FGM-A</dt><dd style="font-size:20px">${n(s.fgm)}-${n(s.fga)}</dd></div><div><dt>FTM-A</dt><dd style="font-size:20px">${n(s.ftm)}-${n(s.fta)}</dd></div>
      </dl>
    </div>
    ${on ? `<div class="note"><span>${adj > 0 ? 'Matchup boost' : adj < 0 ? 'Tough matchup' : 'Neutral matchup'} ${esc(where(p))}</span>
      <span style="font-family:var(--pixel);font-size:11px;color:${adj > 0 ? 'var(--yel)' : adj < 0 ? 'var(--red)' : 'var(--muted)'}">${adj > 0 ? '+' : ''}${adj.toFixed(1)} FP</span></div>
    <button class="btn ${st.cls}" style="min-height:54px;font-size:12px" data-act="sign" data-id="${p.id}" ${st.off ? 'disabled' : ''}>${st.label}</button>` : ''}`;
}
