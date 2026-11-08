/* BIG BALLIN: Scoreboard tab. A summary bar (raw FP × cap bonus = final score, projected
   final, my rank tonight in the world and my leagues) and one compact row per player:
   who/where/status + live stat line, FP tonight with a bar toward his projection, and
   cost / value tonight / pace. */
import { S } from './state.js?v=2dee99a';
import { $, POS, HOSTED, esc, money, where, jersey } from './util.js?v=2dee99a';
import { liveOf, gameOf, allFinal, isLocked, spent, capBonusFor, bonusText } from './lineup.js?v=2dee99a';
import { PACE_MIN_MINUTES } from './app-config.js?v=2dee99a';
import { CLOUD, signedIn, leaderboard, myLeagues } from './cloud.js?v=2dee99a';
import { play } from './sound.js?v=2dee99a';

const FLAME = `<svg class="flame" aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.8 7-7 0-3.5-2.2-5.6-3.8-7.6-.4 2-1.4 3.2-2.7 3.6.4-3.4-.9-6.4-3.5-9-.3 3.8-2.2 6-3.8 8.1C4 11.5 5 14 5 15c0 4.2 3 7 7 7z"/></svg>`;

/* His usual minutes: season average (for pace). */
function usualMin(p) {
  const w = (p.windows && p.windows.season) || p.stats || {};
  return Number(w.min) || null;
}
const tipText = (p) => {
  const g = S.games[p.game_id];
  return g && g.status ? g.status.replace(/\s*ET$/i, '').toUpperCase() : '';
};

/* Everything a row needs, for official results, live points or before tip-off. */
export function rowData(p) {
  const res = S.results;
  const r = res ? res[String(p.id)] : liveOf(p);
  const g = !res ? gameOf(p) : null;
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
  return `<b>${n('pts')}</b> PTS · <b>${n('reb')}</b> REB · <b>${n('ast')}</b> AST · <b>${n('stl')}</b> STL · <b>${n('blk')}</b> BLK · <b>${n('fg3m')}</b> 3PM · <b>${n('tov')}</b> TOV · <b>${n('min')}</b> MIN`;
}

function playerRow(pos, p) {
  const d = rowData(p);
  const pct = d.fp != null && p.proj > 0 ? Math.min(100, (d.fp / p.proj) * 100) : 0;
  const stCls = d.state === 2 ? ' on' : d.state === 3 ? ' fin' : '';
  const value = d.fp != null && d.state >= 2 ? (d.fp / p.price).toFixed(2) : '–';
  return `<li class="prow${d.hot ? ' hot' : ''}">
    <div class="pr-who">${jersey(p, 'sm')}
      <div class="pr-id">
        <div class="pr-top"><span class="pr-slot">${pos}</span><span class="pname">${esc(p.name)}</span></div>
        <div class="pr-sub">${esc(where(p))} <span class="gstat${stCls}">${esc(d.status)}</span></div>
        <div class="pr-line">${statLine(d, p)}</div>
      </div></div>
    <div class="pr-fp">
      <div class="pr-fpnum ${d.hot ? 'red' : 'yel'}">${d.fp != null ? d.fp.toFixed(1) : '–'}${d.hot ? FLAME : ''}</div>
      <div class="pr-bar" role="img" aria-label="${d.fp != null ? d.fp.toFixed(1) : 0} of ${p.proj.toFixed(1)} projected"><i style="width:${pct.toFixed(0)}%"></i></div>
      <div class="pr-proj">${d.fp != null ? d.fp.toFixed(1) + ' / ' : ''}${p.proj.toFixed(1)} PROJ</div>
    </div>
    <div class="pr-nums">
      <div><span>COST</span><b>${money(p.price)}</b></div>
      <div><span>VALUE</span><b>${value}</b></div>
      ${d.state === 3 ? '' : `<div title="Projected finish from his minutes so far vs his usual ${usualMin(p) ? usualMin(p).toFixed(0) : '?'} minutes"><span>PACE</span><b>${d.pace != null ? d.pace.toFixed(1) : '–'}</b></div>`}
    </div>
  </li>`;
}

/* League boards: one readable row per pick, for everyone in the league.
   Same numbers as the SCOREBOARD tab, a little tighter. */
export function leagueRow(pos, p) {
  const d = rowData(p);
  const pct = d.fp != null && p.proj > 0 ? Math.min(100, (d.fp / p.proj) * 100) : 0;
  const stCls = d.state === 2 ? ' on' : d.state === 3 ? ' fin' : '';
  return `<li class="lrow${d.hot ? ' hot' : ''}">
    <span class="lr-slot">${pos}</span>
    <div class="lr-who">${p.sprite ? `<img src="../data/${esc(p.sprite)}" alt="" loading="lazy">` : ''}
      <div class="lr-id"><span class="lr-name">${esc(p.name)}</span>
        <span class="lr-sub">${esc(where(p))} <span class="gstat${stCls}">${esc(d.status)}</span></span></div></div>
    <div class="lr-fp"><b class="${d.hot ? 'red' : 'yel'}">${d.fp != null ? d.fp.toFixed(1) : '–'}${d.hot ? FLAME : ''}</b>
      <div class="pr-bar"><i style="width:${pct.toFixed(0)}%"></i></div>
      <span class="lr-proj">${p.proj.toFixed(1)} PROJ</span></div>
    <div class="lr-cost"><span>COST</span><b>${money(p.price)}</b></div>
    <div class="lr-line">${statLine(d, p)}</div>
  </li>`;
}
/* All of a lineup's not-yet-tipped picks on one line. */
export function hiddenRow(slots) {
  return `<li class="lrow hid"><span class="lr-q">?</span>
    <span class="lr-hidtxt"><b>${slots.join(' · ')}</b> picked · shown when ${slots.length === 1 ? 'his game tips' : 'their games tip'} off</span></li>`;
}

/* ---------- My rank tonight (world + my leagues), refreshed with the live points ---------- */
const MAX_LEAGUE_RANKS = 3;
export async function loadTonightRanks() {
  if (!CLOUD || !S.cloudOk || !signedIn() || !S.slate) return;
  const anyStarted = (S.slate.games || []).some((g) => Date.parse(g.tip_utc) <= Date.now());
  if (!anyStarted) return;
  try {
    if (!S.leagues.length) S.leagues = await myLeagues();
    const scopes = [{ id: null, name: 'WORLD' }, ...S.leagues.slice(0, MAX_LEAGUE_RANKS).map((l) => ({ id: l.id, name: l.name.toUpperCase() }))];
    const boards = await Promise.all(scopes.map((s) => leaderboard('night', S.slate.date, s.id).catch(() => null)));
    const me = S.user.id;
    const next = scopes.map((s, i) => {
      const row = boards[i] && boards[i].find((r) => r.user_id === me);
      const prev = S.tRanks && S.tRanks.find((x) => x.id === s.id);
      const rank = row ? Number(row.rank) : null;
      const move = prev && prev.rank != null && rank != null ? prev.rank - rank : prev ? prev.move : 0;
      return { id: s.id, name: s.name, rank, of: boards[i] ? boards[i].length : null, move };
    });
    const climbed = S.tRanks && S.live && !allFinal() && next.some((x) => {
      const prev = S.tRanks.find((y) => y.id === x.id);
      return prev && prev.rank != null && x.rank != null && x.rank < prev.rank;
    });
    S.tRanks = next;
    if (climbed) play('climb');       // at most once per refresh, only when I went up
  } catch (e) { /* keep the last ranks */ }
}

function rankChips() {
  if (!signedIn() || !S.tRanks) return '';
  return `<div class="sb-ranks">${S.tRanks.filter((x) => x.rank != null).map((x) => {
    const mv = x.move > 0 ? `<span class="up">▲${x.move}</span>` : x.move < 0 ? `<span class="down">▼${-x.move}</span>` : '';
    return `<span class="sb-rank"><i>${esc(x.name)}</i><b>#${x.rank}</b>${x.of ? `<em>of ${x.of}</em>` : ''}${mv}</span>`;
  }).join('')}</div>`;
}

export function renderScore() {
  const rows = POS.filter((pos) => S.lineup[pos]).map((pos) => ({ pos, p: S.byId[S.lineup[pos]] }));
  const res = S.results;
  const live = !res && S.live;
  const done = live && allFinal();
  let raw = 0, expect = 0;
  rows.forEach(({ p }) => { const d = rowData(p); raw += d.fp || 0; expect += d.expect; });
  const bonus = capBonusFor(spent(), rows.length);
  const has = res || live;
  const label = res ? 'FINAL SCORE' : done ? 'UNOFFICIAL FINAL' : live ? 'LIVE SCORE' : 'TONIGHT’S SCORE';
  const when = live && live.at ? `updated ${new Date(live.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '';

  const bar = `<div class="sumbar">
      <div class="sb-score">
        <span class="cap-label">${label}${live && !done ? ' <span class="live-tag blink">LIVE</span>' : ''}</span>
        <span class="sb-final">${has ? (raw * bonus).toFixed(1) : '0.0'}</span>
      </div>
      <div class="sb-math">
        <span><b>${raw.toFixed(1)}</b> FP</span><span class="sb-x">×</span><span><b class="blu">${bonusText(bonus).slice(1)}</b> CAP BONUS</span>
        <span class="sb-proj">${res ? 'Official' : 'Projected final'} <b>${(res ? raw * bonus : expect * bonus).toFixed(1)}</b>${when ? ` · ${esc(when)}` : ''}</span>
      </div>
      ${rankChips()}
      <button class="btn btn-primary sb-btn" data-act="refresh">CHECK FOR SCORES</button>
    </div>`;

  const help = res ? '' : done
    ? `<p class="muted sb-note">All games are over. Official scores post automatically in the morning.</p>`
    : live ? ''
    : HOSTED
    ? `<p class="muted sb-note">Points go live a few minutes after tip-off and update every minute; final scores post the morning after.</p>`
    : `<p class="muted sb-note">Final scores appear after the games once you run <code>python pipeline/score_night.py --date ${esc(S.slate.date)}</code>, then press Check for scores.</p>`;
  const empty = rows.length ? '' : `<div class="empty"><span>No one on the floor yet. Sign at least one player to fill the scoreboard.</span><button class="btn btn-primary" data-act="tab" data-tab="build">SET TODAY’S LINEUP</button></div>`;
  $('#score').innerHTML = bar + empty + (rows.length ? `<ol class="prows">${rows.map(({ pos, p }) => playerRow(pos, p)).join('')}</ol>` : '') + help;
}
