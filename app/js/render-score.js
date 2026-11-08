/* BIG BALLIN: MY TEAM tab (data-tab="score"). Arcade summary boxes (final score = raw FP ×
   cap bonus, projected final, my rank tonight in the world and my leagues), the scores of my
   players' games, and a box score: one row per player with FP (bar toward his projection),
   PROJ, PACE, COST, FP/$M, then MIN PTS REB AST STL BLK TOV FG 3PT FT +/- PF. Tap a player
   for where his points came from. League boards reuse mtTable() for a team's lineup. */
import { S } from './state.js?v=7f8465c';
import { $, POS, HOSTED, esc, money, where, jersey } from './util.js?v=7f8465c';
import { liveOf, gameOf, allFinal, isLocked, spent, capBonusFor, bonusText } from './lineup.js?v=7f8465c';
import { PACE_MIN_MINUTES, LABELS } from './app-config.js?v=7f8465c';
import { CLOUD, signedIn, leaderboard, myLeagues } from './cloud.js?v=7f8465c';
import { play } from './sound.js?v=7f8465c';
import { L, asLast, hasLast, lastIsCurrent, lastDate, anyStarted } from './night.js?v=7f8465c';

export const FLAME = `<svg class="flame" aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.8 7-7 0-3.5-2.2-5.6-3.8-7.6-.4 2-1.4 3.2-2.7 3.6.4-3.4-.9-6.4-3.5-9-.3 3.8-2.2 6-3.8 8.1C4 11.5 5 14 5 15c0 4.2 3 7 7 7z"/></svg>`;

/* His usual minutes: season average (for pace). */
function usualMin(p) {
  const w = (p.windows && p.windows.season) || p.stats || {};
  return Number(w.min) || null;
}
export const tipText = (p) => {
  const g = S.games[p.game_id];
  return g && g.status ? g.status.replace(/\s*ET$/i, '').toUpperCase() : '';
};

/* Everything a row needs, for official results, live points or before tip-off.
   Official results win; the live feed fills in box-score extras (FG, FT, +/-) the results may lack. */
export function rowData(p) {
  const res = S.results;
  const lv = liveOf(p);
  const r = res ? (res[String(p.id)] ? { ...(lv || {}), ...res[String(p.id)] } : null) : lv;
  const g = gameOf(p);
  const state = res ? 3 : g ? g.s : isLocked(p) ? 2 : 1;          // 1 not started, 2 live, 3 final
  const status = res ? 'FINAL' : g && g.s >= 2 ? (g.t || (g.s === 3 ? 'Final' : 'Live')) : tipText(p) || 'NOT STARTED';
  const fp = r ? Number(r.fp) : state >= 2 ? 0 : null;
  let pace = null;
  const um = usualMin(p);
  if (state === 2 && r && r.min >= PACE_MIN_MINUTES && um) pace = r.min >= um ? fp : (fp / r.min) * um;
  // Expected finish, for the projected final score.
  const expect = state === 3 ? (fp || 0) : state === 2 ? (pace != null ? pace : Math.max(fp || 0, p.proj)) : p.proj;
  return { r, g, state, status, fp, pace, expect, hot: fp != null && fp >= p.proj && p.proj > 0 };
}

export function statLine(d, p) {
  const r = d.r;
  if (!r) return d.state === 3 ? 'Did not play' : d.state === 2 ? 'Not in yet' : `Tips at ${esc(tipText(p) || '?')}`;
  const n = (k) => (r[k] == null ? 0 : r[k]);
  const sh = r.fga != null ? ` · <b>${r.fgm}-${r.fga}</b> FG · <b>${r.ftm}-${r.fta}</b> FT` : '';
  return `<b>${n('pts')}</b> PTS · <b>${n('reb')}</b> REB · <b>${n('ast')}</b> AST · <b>${n('stl')}</b> STL · <b>${n('blk')}</b> BLK · <b>${n('fg3m')}</b> 3PM · <b>${n('tov')}</b> TOV · <b>${n('min')}</b> MIN${sh}`;
}

/* ---------- MY TEAM box score: one arcade row per player, fixed columns ----------
   Fantasy columns (FP, PROJ, PACE, COST, FP/$M), then the full box score. Shooting, +/- and
   fouls come from the live feed / results (older nights don't have them: shown as –). */
const ma = (m, a) => (a == null || m == null ? '–' : `${m}-${a}`);
const BOX = [
  ['min', 'MIN', (r) => r.min], ['pts', 'PTS', (r) => r.pts], ['reb', 'REB', (r) => r.reb], ['ast', 'AST', (r) => r.ast],
  ['stl', 'STL', (r) => r.stl], ['blk', 'BLK', (r) => r.blk], ['tov', 'TOV', (r) => r.tov],
  ['fg', 'FG', (r) => ma(r.fgm, r.fga)], ['tp', '3PT', (r) => (r.fg3a != null ? ma(r.fg3m, r.fg3a) : r.fg3m)],
  ['ft', 'FT', (r) => ma(r.ftm, r.fta)],
  ['pm', '+/-', (r) => (r.pm == null ? '–' : r.pm > 0 ? '+' + r.pm : String(r.pm))], ['pf', 'PF', (r) => r.pf],
];
const dash = (v) => (v == null || v === '' ? '–' : v);

function mtHead(withTotal) {
  return `<div class="mt-head" aria-hidden="true">
    <span class="mt-who">PLAYER</span>
    <span class="mc mc-fp">FP</span><span class="mc">PROJ</span><span class="mc">PACE</span><span class="mc mc-cost">COST</span><span class="mc">FP/$M</span>
    ${BOX.map(([k, h]) => `<span class="mc mb mb-${k}">${h}</span>`).join('')}</div>`;
}

/* Where his fantasy points came from: each stat × its weight (slate.scoring, from config.py);
   anything left over is the double-/triple-double bonus. */
function breakdown(d, p) {
  const r = d.r, s = S.slate.scoring;
  if (!r) return `<div class="mt-break"><span class="muted">${d.state === 1 ? `No stats until he tips off (${esc(tipText(p) || '?')}).` : 'No stats for him yet.'}</span></div>`;
  if (!s) return '';
  const parts = [['pts', 'PTS'], ['fg3m', '3PM BONUS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'], ['tov', 'TOV']]
    .filter(([k]) => r[k] && s[k]).map(([k, l]) => ({ l: `${r[k]} ${l}`, v: r[k] * s[k] }));
  const extra = Number(r.fp) - parts.reduce((t, x) => t + x.v, 0);
  if (extra > 0.01) {
    const tens = ['pts', 'reb', 'ast', 'stl', 'blk'].filter((k) => (r[k] || 0) >= 10).length;
    parts.push({ l: tens >= 3 ? 'TRIPLE-DOUBLE' : 'DOUBLE-DOUBLE', v: extra });
  }
  const sw = (p.windows && p.windows.season) || {};
  return `<div class="mt-break">
    ${parts.map((x) => `<span class="fpb"><i>${esc(x.l)}</i><b class="${x.v < 0 ? 'neg' : ''}">${x.v > 0 ? '+' : ''}${+x.v.toFixed(2)}</b></span>`).join('<span class="fpb-op">+</span>')}
    <span class="fpb-op">=</span><span class="fpb tot"><i>FANTASY POINTS</i><b>${Number(r.fp).toFixed(1)}</b></span>
    ${sw.fp ? `<span class="muted fpb-avg">Season avg ${Number(sw.fp).toFixed(1)} FP in ${Number(sw.min || 0).toFixed(0)} min</span>` : ''}
  </div>`;
}

function mtRow(pos, p, key) {
  const d = rowData(p);
  const r = d.r;
  const pct = d.fp != null && p.proj > 0 ? Math.min(100, (d.fp / p.proj) * 100) : 0;
  const stCls = d.state === 2 ? ' on' : d.state === 3 ? ' fin' : '';
  const value = d.fp != null && d.state >= 2 ? (d.fp / p.price).toFixed(2) : '–';
  const open = !!S.mtOpen[key];
  return `<div class="mt-row${d.hot ? ' hot' : ''}${open ? ' open' : ''}" data-act="mtopen" data-v="${esc(key)}">
    <button class="mt-who" data-act="mtopen" data-v="${esc(key)}" aria-expanded="${open}" title="Where his points came from">${jersey(p, 'sm')}
      <span class="mt-id"><span class="mt-top"><span class="pr-slot">${pos}</span><span class="mt-name">${esc(p.name)}</span></span>
        <span class="mt-sub">${esc(where(p))} <span class="gstat${stCls}">${esc(d.status)}</span></span></span></button>
    <span class="mc mc-fp"><b class="${d.hot ? 'red' : 'yel'}">${d.fp != null ? d.fp.toFixed(1) : '–'}${d.hot ? FLAME : ''}</b>
      <span class="pr-bar" role="img" aria-label="${d.fp != null ? d.fp.toFixed(1) : 0} of ${p.proj.toFixed(1)} projected"><i style="width:${pct.toFixed(0)}%"></i></span></span>
    <span class="mc">${p.proj.toFixed(1)}</span>
    <span class="mc" title="Projected finish from his minutes so far vs his usual ${usualMin(p) ? usualMin(p).toFixed(0) : '?'}">${d.pace != null ? d.pace.toFixed(1) : '–'}</span>
    <span class="mc mc-cost">${money(p.price)}</span>
    <span class="mc">${value}</span>
    ${BOX.map(([k, , f]) => { const v = r ? dash(f(r)) : '–'; return `<span class="mc mb mb-${k}${k === 'pm' && r && r.pm < 0 ? ' neg' : ''}">${v}</span>`; }).join('')}
  </div>${open ? breakdown(d, p) : ''}`;
}

/* Team totals under the rows. */
function mtTotal(items) {
  const ds = items.map(({ p }) => ({ p, d: rowData(p) }));
  const sum = (f) => ds.reduce((t, { d }) => t + (d.r && d.r[f] != null ? Number(d.r[f]) : 0), 0);
  const has = (f) => ds.some(({ d }) => d.r && d.r[f] != null);
  const raw = ds.reduce((t, { d }) => t + (d.fp || 0), 0);
  const cost = ds.reduce((t, { p }) => t + p.price, 0);
  const any = ds.some(({ d }) => d.r);
  const v = (k) => {
    if (!any) return '–';
    if (k === 'fg') return has('fga') ? `${sum('fgm')}-${sum('fga')}` : '–';
    if (k === 'tp') return has('fg3a') ? `${sum('fg3m')}-${sum('fg3a')}` : sum('fg3m');
    if (k === 'ft') return has('fta') ? `${sum('ftm')}-${sum('fta')}` : '–';
    if (k === 'pm') return '';
    if (k === 'pf') return has('pf') ? sum('pf') : '–';
    return sum(k);
  };
  return `<div class="mt-row mt-tot">
    <span class="mt-who"><span class="mt-name">TEAM</span></span>
    <span class="mc mc-fp"><b class="yel">${raw.toFixed(1)}</b></span>
    <span class="mc">${ds.reduce((t, { p }) => t + p.proj, 0).toFixed(1)}</span><span class="mc"></span>
    <span class="mc mc-cost">${money(cost)}</span><span class="mc">${any && cost ? (raw / cost).toFixed(2) : '–'}</span>
    ${BOX.map(([k]) => `<span class="mc mb mb-${k}">${v(k)}</span>`).join('')}</div>`;
}

/* The box score for a lineup. items: [{pos, p}]; hidden: slots not shown yet; key: prefix for open rows. */
export function mtTable(items, opts) {
  const o = opts || {};
  const key = o.key || 'me';
  const hidden = o.hidden || [];
  return `<div class="mt-scroll"><div class="mt">
    ${items.length ? mtHead() : ''}
    ${items.map(({ pos, p }) => mtRow(pos, p, `${key}:${p.id}`)).join('')}
    ${hidden.length ? `<div class="mt-row mt-hid"><span class="mt-who"><span class="mt-q">?</span><span class="mt-name">${hidden.join(' · ')}</span></span><span class="mt-hidtxt">Picked · shown when ${hidden.length === 1 ? 'his game tips' : 'their games tip'} off</span></div>` : ''}
    ${items.length > 1 && !o.noTotal ? mtTotal(items) : ''}
  </div></div>`;
}

/* Scores of the real games my players are in. */
function gameStrip(items) {
  const ids = [...new Set(items.map(({ p }) => p.game_id))];
  const chips = ids.map((gid) => {
    const g = S.games[gid];
    if (!g) return '';
    const lv = S.live && S.live.games && S.live.games[gid];
    const st = S.results && (!lv || lv.s === 3) ? 'FINAL' : lv && lv.s >= 2 ? (lv.t || 'LIVE') : (g.status || '').replace(/\s*ET$/i, '');
    const on = lv && lv.s === 2 && !S.results;
    const sc = lv && lv.s >= 2;
    const win = (side) => sc && lv.s === 3 && (side === 'a' ? lv.a > lv.h : lv.h > lv.a) ? ' w' : '';
    return `<div class="gchip${on ? ' on' : ''}">
      <span class="gc-t${win('a')}"><i>${esc(g.away)}</i><b>${sc ? lv.a : ''}</b></span>
      <span class="gc-t${win('h')}"><i>${esc(g.home)}</i><b>${sc ? lv.h : ''}</b></span>
      <span class="gc-st">${esc(String(st).toUpperCase())}</span></div>`;
  }).join('');
  return chips ? `<div class="gstrip" aria-label="Games">${chips}</div>` : '';
}

/* ---------- My rank tonight (world + my leagues), refreshed with the live points ---------- */
const MAX_LEAGUE_RANKS = 3;
/* My rank on one night in the world and up to 3 of my leagues; move = places gained since prev. */
async function ranksFor(date, prev) {
  if (!S.leagues.length) S.leagues = await myLeagues();
  const scopes = [{ id: null, name: 'WORLD' }, ...S.leagues.slice(0, MAX_LEAGUE_RANKS).map((l) => ({ id: l.id, name: l.name.toUpperCase() }))];
  const boards = await Promise.all(scopes.map((s) => leaderboard('night', date, s.id).catch(() => null)));
  const me = S.user.id;
  return scopes.map((s, i) => {
    const row = boards[i] && boards[i].find((r) => r.user_id === me);
    const p = prev && prev.find((x) => x.id === s.id);
    const rank = row ? Number(row.rank) : null;
    const move = p && p.rank != null && rank != null ? p.rank - rank : p ? p.move : 0;
    return { id: s.id, name: s.name, rank, of: boards[i] ? boards[i].length : null, move };
  });
}
export async function loadTonightRanks() {
  if (!CLOUD || !S.cloudOk || !signedIn() || !S.slate || !anyStarted()) return;
  try {
    const next = await ranksFor(S.slate.date, S.tRanks);
    const climbed = S.tRanks && S.live && !allFinal() && next.some((x) => {
      const prev = S.tRanks.find((y) => y.id === x.id);
      return prev && prev.rank != null && x.rank != null && x.rank < prev.rank;
    });
    S.tRanks = next;
    if (climbed) play('climb');       // at most once per refresh, only when I went up
  } catch (e) { /* keep the last ranks */ }
}
/* Last night's final ranks (no sounds). */
export async function loadLastRanks() {
  if (!CLOUD || !S.cloudOk || !signedIn() || lastIsCurrent() || L.state !== 'ready') return;
  try { L.tRanks = (await ranksFor(L.date, null)).map((x) => ({ ...x, move: 0 })); } catch (e) { /* keep */ }
}

/* Which night MY TEAM shows: the one picked, else last night until tonight's first tip-off. */
export function scoreView() {
  if (S.scoreView) return S.scoreView;
  return lastIsCurrent() || (!anyStarted() && hasLast()) ? 'last' : 'tonight';
}
const nightName = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

function nightSwitch(view) {
  const last = lastDate();
  return `<div class="segs night-segs" role="group" aria-label="Which night">
    <button class="seg-b" data-act="scoreview" data-v="last" aria-pressed="${view === 'last'}">LAST NIGHT${last ? ` <i>${nightName(last)}</i>` : ''}</button>
    <button class="seg-b" data-act="scoreview" data-v="tonight" aria-pressed="${view === 'tonight'}">TONIGHT${!lastIsCurrent() ? ` <i>${nightName(S.slate.date)}</i>` : ''}</button></div>`;
}

export function renderScore() {
  const view = scoreView();
  const sw = nightSwitch(view);
  let html;
  if (view === 'last') {
    if (L.state === 'none' && !lastIsCurrent()) html = `<div class="empty"><span>No games found for last night.</span></div>`;
    else if (!hasLast()) html = `<p class="muted">Loading last night…</p>`;
    else html = asLast(() => scoreBody(true));
  } else if (lastIsCurrent()) {
    html = `<div class="empty"><span>Tonight’s players and prices post around 6:30 AM on game days. Last night’s scores are under LAST NIGHT.</span>
      <button class="btn btn-primary" data-act="scoreview" data-v="last">SEE LAST NIGHT</button></div>`;
  } else html = scoreBody(false);
  $('#score').innerHTML = sw + html;
}

function scoreBody(isLast) {
  const rows = POS.filter((pos) => S.lineup[pos]).map((pos) => ({ pos, p: S.byId[S.lineup[pos]] }));
  const res = S.results;
  const live = !res && S.live;
  const done = live && allFinal();
  let raw = 0, expect = 0;
  rows.forEach(({ p }) => { const d = rowData(p); raw += d.fp || 0; expect += d.expect; });
  const bonus = capBonusFor(spent(), rows.length);
  const has = res || live;
  const label = (isLast ? 'LAST NIGHT · ' : '') + (res ? 'FINAL SCORE' : done ? 'UNOFFICIAL FINAL' : live ? 'LIVE SCORE' : isLast ? 'NO SCORES YET' : 'TONIGHT’S SCORE');
  const when = live && live.at ? `updated ${new Date(live.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '';

  const rk = signedIn() && S.tRanks ? S.tRanks.filter((x) => x.rank != null) : [];
  const bar = `<div class="mt-sum">
      <div class="ms-box ms-final">
        <span class="cap-label">${label}${live && !done ? ' <span class="live-tag blink">LIVE</span>' : ''}</span>
        <b>${has ? (raw * bonus).toFixed(1) : '0.0'}</b>
        <span class="ms-math">${raw.toFixed(1)} FP × <i class="blu">${bonusText(bonus).slice(1)}</i> CAP BONUS</span>
      </div>
      <div class="ms-box"><span>${res ? 'OFFICIAL' : 'PROJECTED'}</span><b>${(res ? raw * bonus : expect * bonus).toFixed(1)}</b><em>${when ? esc(when) : res ? 'final' : 'final score'}</em></div>
      ${rk.map((x) => {
        const mv = x.move > 0 ? `<em class="up">▲${x.move}</em>` : x.move < 0 ? `<em class="down">▼${-x.move}</em>` : `<em>${x.of ? 'of ' + x.of : ''}</em>`;
        return `<div class="ms-box ms-rank"><span>${esc(x.name)}</span><b>#${x.rank}</b>${mv}</div>`;
      }).join('')}
      <button class="btn btn-primary ms-btn" data-act="refresh">CHECK FOR SCORES</button>
    </div>`;

  const help = res ? '' : isLast && !live ? `<p class="muted sb-note">Official scores post around 6 AM.</p>` : done
    ? `<p class="muted sb-note">All games are over. Official scores post automatically in the morning.</p>`
    : live ? ''
    : HOSTED
    ? `<p class="muted sb-note">Points go live a few minutes after tip-off and update every minute; final scores post the morning after.</p>`
    : `<p class="muted sb-note">Final scores appear after the games once you run <code>python pipeline/score_night.py --date ${esc(S.slate.date)}</code>, then press Check for scores.</p>`;
  const empty = rows.length ? '' : isLast
    ? `<div class="empty"><span>You didn’t have a lineup last night.</span><button class="btn btn-primary" data-act="tab" data-tab="build">${esc(LABELS.build)}</button></div>`
    : `<div class="empty"><span>No one on the floor yet. Sign at least one player to see your team here.</span><button class="btn btn-primary" data-act="tab" data-tab="build">${esc(LABELS.build)}</button></div>`;
  const table = rows.length ? `${gameStrip(rows)}${mtTable(rows, { key: isLast ? 'L' : 'me' })}<p class="muted lb-note">Tap a player to see where his points came from.${!res && !live ? '' : ' Swipe sideways on a phone for the full box score.'}</p>` : '';
  return (isLast && !rows.length ? '' : bar) + empty + table + (isLast && !rows.length ? '' : help);
}
