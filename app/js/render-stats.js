/* BIG BALLIN: Stats tab: Stat Center table and the big player card. */
import { S } from './state.js?v=ede1dac';
import { $, POS, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, beep, flash, jersey, pills, matches } from './util.js?v=ede1dac';
import { isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, targetSlot, costAfter, signState, saveLineup, sign, cut } from './lineup.js?v=ede1dac';
import { W, WINDOWS, winLabel, fgPct, ftPct, fmtPct, injuryTag } from './filters.js?v=ede1dac';

const n1 = (v) => (v == null ? '–' : Number(v).toFixed(1));
export const COLS = [
  { k: 'price', l: 'PRICE', v: (p) => p.price, f: (p) => money(p.price) },
  { k: 'chg', l: '+/−', v: (p) => p.price_change || 0, f: (p) => chg(p) || '–', c: 'muted' },
  { k: 'proj', l: 'PROJ', v: (p) => p.proj, f: (p) => p.proj.toFixed(1), c: 'yel', b: 1 },
  { k: 'avg', l: 'AVG FP', v: (p) => W(p).fp, f: (p) => n1(W(p).fp), b: 1 },
  { k: 'value', l: 'FP/$M', v: (p) => p.value, f: (p) => p.value.toFixed(2), c: 'blu', b: 1 },
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
export function renderStats() {
  $('#statsPills').innerHTML = pills(S.statsPos, 'statspos');
  $('#statsWin').innerHTML = WINDOWS.map(([v, l]) => `<button class="seg-b" data-act="win" data-v="${v}" aria-pressed="${S.win === v}">${l}</button>`).join('');
  $('#statsHead').innerHTML = `<th scope="col" class="left corner">PLAYER</th><th scope="col" class="left">POS</th><th scope="col" class="left">TONIGHT</th>` +
    COLS.map((c) => {
      const on = S.sortKey === c.k;
      const aria = on ? (S.sortDir < 0 ? 'descending' : 'ascending') : 'none';
      return `<th scope="col" aria-sort="${aria}"><button class="sortbtn${on ? ' on' : ''}" data-act="sort" data-k="${c.k}">${c.l}${on ? (S.sortDir < 0 ? ' ▼' : ' ▲') : ''}</button></th>`;
    }).join('');
  const col = COLS.find((c) => c.k === S.sortKey) || COLS[2];
  const rows = S.slate.players.filter((p) => (S.statsPos === 'ALL' || slotsFor(p).includes(S.statsPos)) && matches(p, S.statsQuery))
    .sort((a, b) => { const va = col.v(a), vb = col.v(b); if (va == null) return 1; if (vb == null) return -1; return S.sortDir * (va - vb); });
  $('#statsBody').innerHTML = rows.length ? rows.map((p) => `<tr class="${p.id === S.selId ? 'sel' : ''}">
      <th scope="row"><button class="namebtn" data-act="select" data-id="${p.id}">${esc(p.name)}</button> ${injuryTag(p)}</th>
      <td class="l">${esc(slotsFor(p).join('/'))}</td><td class="l">${esc(where(p))}</td>
      ${COLS.map((c) => `<td class="${c.c || ''}"${c.b ? ' style="font-weight:700"' : ''}>${c.f ? c.f(p) : c.v(p)}</td>`).join('')}
    </tr>`).join('') : `<tr><td class="l" colspan="18" style="padding:16px">No players match.</td></tr>`;
  renderCard();
}
/* "Why this price": the inputs the pipeline used (see CLAUDE.md, How prices work). */
export function whyPrice(p) {
  if (S.slate.price_source === 'draftkings') return `<div class="why"><h3>WHY THIS PRICE</h3><div class="why-sub">Tonight’s prices come from DraftKings salaries, rescaled to the $${S.slate.cap}M cap.</div></div>`;
  if (p.price_base == null) return '';
  const pct = (v) => v == null ? '–' : (v >= 10 ? Math.round(v) : v.toFixed(1)) + '%';
  const mod = p.pop_mod ?? 1;
  const popLine = p.popularity == null
    ? 'No popularity data today, so no adjustment.'
    : `Started in ${pct(p.pct_started)} of ESPN leagues · rostered in ${pct(p.pct_rostered)} · Sleeper ${p.trend > 0 ? '+' : ''}${(p.trend || 0).toLocaleString('en-US')} net adds (48h)`;
  const popWord = mod >= 1.08 ? 'Hot name' : mod <= 0.92 ? 'Under the radar' : 'Popularity';
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
  const p = S.byId[S.selId];
  if (!p) { $('#card').innerHTML = '<p class="muted" style="margin:0">Pick a player to see his card.</p>'; return; }
  const st = signState(p);
  const l5 = p.last5 || [];
  const max = Math.max(1, ...l5, p.avg_fp);
  const bars = l5.length
    ? `<div class="bars" role="img" aria-label="Last ${l5.length} games fantasy points, oldest to latest: ${l5.join(', ')}">${l5.map((v) => `<div class="bar"><span>${v}</span><i style="height:${Math.round(v / max * 100)}px;background:${v >= p.avg_fp ? 'var(--yel)' : 'var(--blu)'}"></i></div>`).join('')}</div>
       <div style="display:flex;justify-content:space-between;font-size:15px" class="muted"><span>oldest</span><span>latest</span></div>`
    : `<p class="muted" style="margin:0">No games yet this season.</p>`;
  const adj = p.matchup_adj || 0;
  const s = W(p), n = (v) => (v == null ? '–' : Number(v).toFixed(1));
  $('#card').innerHTML = `
    <div class="who">${jersey(p, 'lg')}<div class="who-text"><h3 class="big-name">${esc(p.name)} ${injuryTag(p)}</h3><span class="sub">${esc(slotsFor(p).join('/'))} · ${esc(where(p))}</span></div></div>
    <div class="tiles">
      <div class="tile"><div class="tile-k">PRICE</div><div class="tile-v">${money(p.price)}</div><div class="muted" style="font-size:15px">${chg(p) || 'no change'}</div></div>
      <div class="tile"><div class="tile-k">PROJ</div><div class="tile-v yel">${p.proj.toFixed(1)}</div></div>
      <div class="tile"><div class="tile-k">FP/$M</div><div class="tile-v blu">${p.value.toFixed(2)}</div></div>
    </div>
    ${whyPrice(p)}
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
    <div class="note"><span>${adj > 0 ? 'Matchup boost' : adj < 0 ? 'Tough matchup' : 'Neutral matchup'} ${esc(where(p))}</span>
      <span style="font-family:var(--pixel);font-size:11px;color:${adj > 0 ? 'var(--yel)' : adj < 0 ? 'var(--red)' : 'var(--muted)'}">${adj > 0 ? '+' : ''}${adj.toFixed(1)} FP</span></div>
    <button class="btn ${st.cls}" style="min-height:54px;font-size:12px" data-act="sign" data-id="${p.id}" ${st.off ? 'disabled' : ''}>${st.label}</button>`;
}
