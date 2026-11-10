/* BIG BALLIN: Leagues tab. Leagues are made by players and joined by invite, but anyone can
   look at any league: the ALL LEAGUES list, then a league's page (name → leaderboard →
   winners → invite). Shared board pieces (rows, badges, periods) are also used by the
   World Rankings tab (render-world.js). */
import { S } from './state.js?v=c007368';
import { $, POS, BN, slotLabel, esc, money, store, jersey } from './util.js?v=c007368';
import { avatar } from './avatars.js?v=c007368';
import { mtTable, lineupItems, rowData, statLine, tipText, FLAME } from './render-score.js?v=c007368';
import { CLOUD, signedIn, leaderboard, nightLineups, latestWinners, myLeagues, leagueList, friendly } from './cloud.js?v=c007368';
import { L, asLast, lastDate, loadLast } from './night.js?v=c007368';
import { benchOn } from './lineup.js?v=c007368';

export const PERIODS = [['last', 'LAST NIGHT'], ['night', 'TONIGHT'], ['week', 'THIS WEEK'], ['month', 'THIS MONTH'], ['season', 'SEASON']];
export const BADGE = {
  night: 'NIGHT WINNER', week: 'WEEK WINNER', month: 'MONTH WINNER', season: 'SEASON CHAMP',
  w_night1: 'WORLD #1 NIGHT', w_week10: 'TOP 10 WEEK', w_month10: 'TOP 10 MONTH',
};
const WINNER = {
  night: 'LAST NIGHT’S WINNER', week: 'LAST WEEK’S WINNER', month: 'LAST MONTH’S WINNER', season: 'SEASON CHAMP',
  w_night1: 'LAST NIGHT’S WORLD #1', w_week10: 'LAST WEEK’S TOP 10', w_month10: 'LAST MONTH’S TOP 10',
};

export const inviteLink = (code) => `${location.origin}${location.pathname}?join=${encodeURIComponent(code)}`;
/* The league being viewed: my copy (with its invite code) if I'm in it, else the public listing. */
export const league = () => S.leagues.find((l) => l.id === S.lbLeague) || (S.allLeagues || []).find((l) => l.id === S.lbLeague) || null;
export const isMine = (id) => S.leagues.some((l) => l.id === id);

/* A board's period → what the database is asked: LAST NIGHT is a 'night' board for last night's date. */
export async function boardQuery(period, league) {
  if (period !== 'last') {
    return Promise.all([leaderboard(period, S.slate.date, league), period === 'night' ? nightLineups(S.slate.date, league) : Promise.resolve(null)]);
  }
  await loadLast();
  const d = lastDate();
  if (!d) return [[], []];
  return Promise.all([leaderboard('night', d, league), nightLineups(d, league)]);
}

/* Fetch what the tab shows. Called on open, on league/period change, and every minute while live. */
export async function loadBoards() {
  if (!CLOUD || !S.cloudOk) return;
  try {
    const [mine, all] = await Promise.all([signedIn() ? myLeagues() : Promise.resolve([]), leagueList(S.slate.date)]);
    S.leagues = mine; S.allLeagues = all;
    const lg = S.lbLeague;
    if (lg && !all.some((l) => l.id === lg)) { S.lbLeague = null; store('bb-league', null); }
    if (!S.lbLeague) { S.lbRows = null; S.lbNight = null; S.lbWinners = null; S.lbErr = null; return; }
    const [[rows, night], win] = await Promise.all([boardQuery(S.lbPeriod, S.lbLeague), latestWinners(S.lbLeague)]);
    S.lbRows = rows; S.lbNight = night; S.lbWinners = win; S.lbErr = null;
  } catch (e) { S.lbErr = friendly(e).text; }
}

/* ---------- Shared board pieces ---------- */
export function badges(b) {
  return Object.entries(b || {}).filter(([, n]) => n > 0)
    .map(([k, n]) => `<span class="bdg bdg-${k}" title="${BADGE[k] || k} ${n} time${n > 1 ? 's' : ''}">${BADGE[k] || k}${n > 1 ? ' ×' + n : ''}</span>`).join('');
}

export function periodSegs(cur, act) {
  return `<div class="segs lb-periods" role="group" aria-label="Time period">${PERIODS.map(([v, l]) =>
    `<button class="seg-b" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`).join('')}</div>`;
}

/* The latest winners (night / week / month / season, or the world kinds) as trophy badges next to
   the winner's avatar on the board. w = latestWinners(); a badge shows only on the winner's row. */
export const LEAGUE_KINDS = ['night', 'week', 'month', 'season'];
export const WORLD_KINDS = ['w_night1', 'w_week10', 'w_month10'];
const TROPHY = `<svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" shape-rendering="crispEdges" fill="currentColor"><rect x="2" y="0" width="6" height="4"/><rect x="0" y="1" width="2" height="1"/><rect x="0" y="1" width="1" height="3"/><rect x="8" y="1" width="2" height="1"/><rect x="9" y="1" width="1" height="3"/><rect x="3" y="4" width="4" height="1"/><rect x="4" y="5" width="2" height="2"/><rect x="2" y="8" width="6" height="2"/></svg>`;
const SHORT = { night: 'NIGHT', week: 'WEEK', month: 'MONTH', season: 'CHAMP', w_night1: '#1', w_week10: 'TOP 10', w_month10: 'TOP 10' };
export function winBadges(uid, w, kinds) {
  if (!w || !uid) return '';
  return (kinds || []).filter((k) => w[k] && (w[k].ids || []).includes(uid)).map((k) =>
    `<span class="wbdg wbdg-${k}" title="${esc(WINNER[k] || BADGE[k])}${w[k].period ? ' (' + esc(w[k].period) + ')' : ''}">${TROPHY}<span class="wl">${esc(BADGE[k] || k)}</span><span class="ws">${esc(SHORT[k] || k)}</span></span>`).join('');
}

/* Another player's lineup for Tonight: the same box score as MY TEAM (render-score.js mtTable).
   Picks show once their game has tipped; until then one "Picked" row. key keeps open rows apart. */
function miniLineup(r, key) {
  const slots = r.slots || {};
  const hidden = [...POS, BN].filter((pos) => slots[pos] === 'hidden').map(slotLabel);
  S.lineupNames = r.sub && S.byId[slots[r.sub]] ? { [r.sub]: S.byId[slots[r.sub]].name } : null;
  const items = lineupItems(slots, r.sub || null);
  const empty = POS.filter((pos) => slots[pos] == null);
  return mtTable(items, { key: key || r.user_id, hidden, noTotal: hidden.length > 0 })
    + (empty.length ? `<p class="muted lb-note">Empty: ${empty.join(' · ')}</p>` : '');
}

/* One leaderboard. night = night_lineups rows (Tonight only) for the raw × bonus line and mini lineups. */
export function boardList(rows, period, night, opts) {
  const o = opts || {};
  const me = S.user ? S.user.id : null;
  const byUser = night ? Object.fromEntries(night.map((r) => [r.user_id, r])) : {};
  let list = rows;
  if (o.limit && rows.length > o.limit) {
    list = rows.slice(0, o.limit);
    const mine = rows.find((r) => r.user_id === me);
    if (mine && !list.includes(mine)) list = list.concat([mine]);
  }
  return `<ol class="lb">${list.map((r) => {
    const n = byUser[r.user_id];
    const detail = period === 'night'
      ? (n ? (o.lineups ? miniLineup(n) : '') : '<span class="muted">No lineup tonight (counts as 0)</span>')
      : `<span class="muted">${r.nights} night${r.nights === 1 ? '' : 's'} played</span>`;
    return `<li class="lb-row${r.user_id === me ? ' me' : ''}">
      <span class="lb-rank">${r.rank}</span>
      <div class="lb-who"><div class="lb-name">${avatar(r.avatar, 36)}<span class="pname">${esc(r.display_name)}</span></div>
        <div class="bdgs">${badges(r.badges)}</div>${period === 'night' && n && o.lineups ? '' : detail}</div>
      <div class="lb-score"><b class="yel">${Number(r.total).toFixed(1)}</b>${r.unofficial ? '<span class="live-tag">LIVE</span>' : ''}
        ${period === 'night' && n && n.bonus ? `<span class="muted">${Number(n.raw).toFixed(1)} FP × ${Number(n.bonus).toFixed(2)}</span>` : ''}</div>
      ${period === 'night' && n && o.lineups ? `<div class="lb-detail">${detail}</div>` : ''}
    </li>`;
  }).join('')}</ol>${o.limit && rows.length > o.limit ? `<p class="muted lb-note">Showing the top ${o.limit} of ${rows.length}.</p>` : ''}`;
}

/* ---------- Tonight table: one row per team, one column per position ---------- */
const shortName = (p) => { const parts = p.name.split(' '); return parts.length > 1 ? parts.slice(1).join(' ') : p.name; };

function playerCell(p, isLast, tag, sub) {
  const d = rowData(p);
  const pct = d.fp != null && p.proj > 0 ? Math.min(100, (d.fp / p.proj) * 100) : 0;
  const st = d.state === 1 ? `Tips ${esc(tipText(p).replace(/ (AM|PM)$/, ''))}` : d.state === 3 ? 'Final' : esc(d.status);
  const tagTxt = tag === 'bench' ? 'ON THE BENCH' : tag === 'in' ? `SUBBED IN · ${slotLabel(sub)}` : tag === 'covered' ? 'DNP · 6TH IN' : '';
  return `<td class="pc${d.hot ? ' hot' : ''}${tag ? ' t-' + tag : ''}" data-act="pcell" data-pid="${p.id}"${isLast ? ' data-n="last"' : ''} tabindex="0" aria-label="${esc(p.name)}: ${d.fp != null ? d.fp.toFixed(1) : 'not started'} of ${p.proj.toFixed(1)} projected, ${money(p.price)}">
    <span class="tc-head">${jersey(p, 'xs')}<span class="tc-id"><span class="pc-name">${esc(shortName(p))}</span>
      <span class="pc-st${d.state === 2 ? ' on' : ''}">${st}</span></span></span>
    <b class="pc-fp${d.fp == null ? ' pre' : ''}">${d.fp != null ? d.fp.toFixed(1) : '0.0'}${d.hot ? FLAME : ''}</b>
    <span class="pc-bar"><i style="width:${pct.toFixed(0)}%"></i></span>
    <span class="pc-sub"><span>${p.proj.toFixed(1)} PROJ</span><span>${money(p.price)}</span></span>${tagTxt ? `<span class="pc-tag">${tagTxt}</span>` : ''}</td>`;
}

/* Tonight (or LAST NIGHT, opts.last) table. Also used by World Rankings, with opts.limit rows plus mine. */
export function nightTable(rows, night, opts) {
  const o = opts || {};
  return o.last ? asLast(() => tonightTable(rows, night, o)) : tonightTable(rows, night, o);
}
function tonightTable(rows, night, o) {
  const me = S.user ? S.user.id : null;
  const when = o.last ? 'last night' : 'tonight';
  const total = rows.length;
  if (o.limit && rows.length > o.limit) {
    const mine = rows.find((r) => r.user_id === me);
    const top = rows.slice(0, o.limit);
    rows = mine && !top.includes(mine) ? top.concat([mine]) : top;
  }
  const byUser = Object.fromEntries((night || []).map((r) => [r.user_id, r]));
  const cols = benchOn() ? [...POS, BN] : POS;
  const body = rows.map((r) => {
    const n = byUser[r.user_id];
    const key = (o.last ? 'L' : '') + r.user_id;
    const open = !!S.lbOpen[key];
    const team = `<th class="lt-team" scope="row"><button class="lt-tb" data-act="ltopen" data-v="${esc(key)}" aria-expanded="${open}">
        <span class="lt-rank">${r.rank}</span>${avatar(r.avatar, 30)}
        <span class="lt-who"><span class="lt-name">${esc(r.display_name)}</span>${(() => { const wb = winBadges(r.user_id, o.winners, o.kinds); return wb ? `<span class="lt-bdgs">${wb}</span>` : ''; })()}<span class="lt-open">${open ? '▲ CLOSE' : '▼ BOX SCORE'}</span></span></button></th>`;
    const t = teamNums(n, o.last);
    const live = `<td class="lt-num lt-live"><b>${Number(r.total).toFixed(1)}</b>${n && n.bonus ? `<i>${Number(n.raw).toFixed(1)} × ${Number(n.bonus).toFixed(2)}</i>` : ''}</td>`;
    const proj = `<td class="lt-num lt-proj">${!t ? '<b>–</b>' : t.hidden === t.picks ? `<b>?</b><i>${t.hidden} hidden</i>` : `<b>${t.proj.toFixed(1)}${t.hidden ? '<em>+?</em>' : ''}</b><i class="${t.liveN ? 'on' : ''}">${t.line}</i>`}</td>`;
    let cells;
    if (!n) cells = `<td class="pc none" colspan="${cols.length}">No lineup ${when} (counts as 0)</td>`;
    else cells = cols.map((pos) => {
      const v = (n.slots || {})[pos];
      const bench = pos === BN;
      if (v == null) return `<td class="pc empty${bench ? ' bn' : ''}"><span class="pc-name">${bench ? 'No 6th man' : 'Empty'}</span></td>`;
      if (v === 'hidden') return `<td class="pc hid${bench ? ' bn' : ''}"><b class="pc-q">?</b><span class="pc-st">PICKED<br>SHOWS AT TIP-OFF</span></td>`;
      const p = S.byId[v];
      const tag = bench ? (n.sub ? 'in' : 'bench') : n.sub === pos ? 'covered' : null;
      return p ? playerCell(p, o.last, tag, n.sub) : `<td class="pc"><span class="pc-name">#${esc(v)}</span></td>`;
    }).join('');
    const detail = open && n ? `<tr class="lt-detail"><td colspan="${3 + cols.length}">${miniLineup(n, key)}</td></tr>` : '';
    return `<tr class="lt-row${r.user_id === me ? ' me' : ''}${Number(r.rank) === 1 && Number(r.total) > 0 ? ' lead' : ''}${open ? ' open' : ''}">${team}${live}${proj}${cells}</tr>${detail}`;
  }).join('');
  return `<div class="lt-wrap"><table class="lt">
    <colgroup><col class="lt-c0"><col class="lt-c1"><col class="lt-c2">${cols.map((c) => `<col${c === BN ? ' class="lt-cbn"' : ''}>`).join('')}</colgroup>
    <thead><tr><th class="lt-h" scope="col">TEAM</th><th class="lt-h lt-hn" scope="col">${o.last ? 'FINAL' : 'LIVE'}</th><th class="lt-h lt-hn" scope="col">PROJ</th>${cols.map((c) => `<th class="lt-h${c === BN ? ' bn' : ''}" scope="col">${slotLabel(c)}</th>`).join('')}</tr></thead>
    <tbody>${body}</tbody></table></div>
    <p class="muted lb-note">${o.last ? 'FINAL = fantasy points × cap bonus. PROJ = what the lineup was projected to score before the games.' : 'LIVE = fantasy points so far × cap bonus. PROJ = where the team is headed: finished players’ points, live players’ pace, everyone else’s projection (× cap bonus). +? = picks not shown yet.'}
      Hover or tap a player for his full line. Tap a team for its full box score.${total > rows.length ? ` Showing the top ${o.limit} of ${total}.` : ''}</p>`;
}

/* A team's projected score and where its players stand, from the picks we can see.
   Tonight: final FP, else pace, else projection (same as MY TEAM); last night: the pre-game projection. */
function teamNums(n, last) {
  if (!n) return null;
  const slots = n.slots || {};
  let exp = 0, hidden = 0, liveN = 0, toGo = 0, done = 0, picks = 0;
  // The 6th man counts only once he's covering a starter (n.sub); the covered starter then doesn't.
  [...POS, BN].forEach((pos) => {
    const v = slots[pos];
    if (pos === BN ? !n.sub : pos === n.sub) return;
    if (v != null) picks++;
    if (v === 'hidden') { hidden++; toGo++; return; }
    const p = v != null ? S.byId[v] : null;
    if (!p) return;
    const d = rowData(p);
    exp += last ? p.proj : d.expect;
    if (d.state === 2) liveN++; else if (d.state === 3) done++; else toGo++;
  });
  const bonus = Number(n.bonus) || 1;
  const line = last ? 'pre-game' : !liveN && !done ? `${toGo} to play` : !liveN && !toGo ? 'ALL FINAL'
    : [liveN ? `${liveN} LIVE` : '', toGo ? `${toGo} to go` : '', done ? `${done} done` : ''].filter(Boolean).join(' · ');
  return { proj: exp * bonus, hidden, picks, liveN, line };
}

/* Popover for a player cell: headshot, matchup, FP vs projection, cost, value, stat line. */
export function playerPop(pid) {
  const p = S.byId[pid];
  if (!p) return '';
  const d = rowData(p);
  const val = d.fp != null && d.state >= 2 ? ` · ${(d.fp / p.price).toFixed(2)} FP/$M` : '';
  return `<div class="pp-top">${p.sprite ? `<img src="../data/${esc(p.sprite)}" alt="">` : ''}
      <div><b>${esc(p.name)}</b><span>${esc(`${p.team} ${p.home ? 'vs' : '@'} ${p.opp}`)} · ${esc(d.status)}</span></div></div>
    <div class="pp-num"><b class="${d.hot ? 'red' : 'yel'}">${d.fp != null ? d.fp.toFixed(1) : '–'}</b> FP of ${p.proj.toFixed(1)} proj · ${money(p.price)}${val}</div>
    <div class="pp-line">${statLine(d, p)}</div>`;
}

/* ---------- Leagues tab ---------- */
function leagueCard(l) {
  const lead = l.leader ? `Tonight: <b>${esc(l.leader)}</b> ${Number(l.leader_score || 0).toFixed(1)}` : 'No lineups tonight yet';
  return `<button class="lg-card${l.mine ? ' mine' : ''}" data-act="league" data-v="${esc(l.id)}">
    <span class="lg-name">${esc(l.name)}</span>
    <span class="muted">${l.members} player${l.members === 1 ? '' : 's'} · run by ${esc(l.owner_name || '?')}${l.mine ? ' · <span class="yel">YOU’RE IN</span>' : ''}</span>
    <span class="lg-lead">${lead}</span></button>`;
}

function leagueListView() {
  const tools = signedIn()
    ? `<button class="btn btn-plain" data-act="modal" data-k="create">+ NEW LEAGUE</button>
       <button class="btn btn-plain" data-act="modal" data-k="join">JOIN WITH CODE</button>`
    : `<button class="btn btn-primary" data-act="acct">SIGN IN TO MAKE OR JOIN A LEAGUE</button>`;
  if (!S.allLeagues) return `<div class="toolbar"><h2>Leagues</h2><div class="toolbar-group">${tools}</div></div>
    ${S.lbErr ? `<div class="empty"><span>${esc(S.lbErr)}</span></div>` : '<p class="muted">Loading…</p>'}`;
  const mine = S.allLeagues.filter((l) => l.mine);
  const others = S.allLeagues.filter((l) => !l.mine);
  return `
    <div class="toolbar"><h2>Leagues</h2><div class="toolbar-group">${tools}</div></div>
    ${S.lbErr ? `<div class="empty"><span>${esc(S.lbErr)}</span></div>` : ''}
    ${mine.length ? `<h3 class="lg-head">MY LEAGUES</h3><div class="lg-grid">${mine.map(leagueCard).join('')}</div>` : ''}
    <h3 class="lg-head">ALL LEAGUES</h3>
    ${others.length ? `<div class="lg-grid">${others.map(leagueCard).join('')}</div>`
      : `<div class="empty"><span>${mine.length ? 'No other leagues yet.' : 'No leagues yet. Start one and invite your friends.'}</span></div>`}
    <p class="muted lb-note">Anyone can look at any league. Joining takes an invite link or code from a member.</p>`;
}

function leaguePage(lg) {
  const member = isMine(lg.id);
  const my = S.leagues.find((l) => l.id === lg.id);
  const info = (S.allLeagues || []).find((l) => l.id === lg.id) || {};
  const rows = S.lbRows;
  let board;
  if (S.lbErr) board = `<div class="empty"><span>${esc(S.lbErr)}</span></div>`;
  else if (!rows) board = `<p class="muted">Loading…</p>`;
  else if (!rows.length) board = `<div class="empty"><span>${S.lbPeriod === 'last' ? 'No one in this league played last night.' : 'No one in this league has a lineup yet for this stretch.'}</span></div>`;
  else board = S.lbPeriod === 'night' || S.lbPeriod === 'last' ? nightTable(rows, S.lbNight, { last: S.lbPeriod === 'last', winners: S.lbWinners, kinds: LEAGUE_KINDS }) : boardList(rows, S.lbPeriod, null, { lineups: true, winners: S.lbWinners, kinds: LEAGUE_KINDS });

  const invite = member && my ? `<div class="invite-box">
      <div class="m-actions">
        <button class="btn btn-primary" data-act="invitetoggle" aria-expanded="${S.inviteOpen}">INVITE FRIENDS</button>
        <button class="btn btn-cut" data-act="leave">LEAVE LEAGUE</button>
      </div>
      ${S.inviteOpen ? `<div class="invite">
        <p>Send this link, or the code <b class="yel code">${esc(my.code)}</b></p>
        <input class="search invite-link" readonly value="${esc(inviteLink(my.code))}" aria-label="Invite link" onfocus="this.select()">
        <div class="m-actions">
          <button class="btn btn-plain" data-act="copyinvite">COPY LINK</button>
          ${navigator.share ? '<button class="btn btn-plain" data-act="shareinvite">SHARE</button>' : ''}
        </div></div>` : ''}
    </div>`
    : signedIn() ? `<p class="muted lb-note">Want in? Ask a member for the invite link or code.</p>` : '';

  return `
    <button class="linkish back" data-act="league" data-v="">← ALL LEAGUES</button>
    <div class="toolbar"><h2>${esc(lg.name)}</h2>
      <span class="muted">${info.members || ''} player${info.members === 1 ? '' : 's'}${info.owner_name ? ' · run by ' + esc(info.owner_name) : ''}${member ? ' · <span class="yel">YOU’RE IN</span>' : ''}</span></div>
    ${periodSegs(S.lbPeriod, 'lbperiod')}
    <p class="muted lb-note">Ranked by final score (fantasy points × cap bonus). A night without a lineup counts as 0.
      Other players’ picks show once their game tips off.</p>
    ${board}
    ${invite}`;
}

export function renderLeagues() {
  const box = $('#leagues');
  if (!CLOUD) { box.innerHTML = `<div class="empty"><span>Leagues aren’t switched on for this copy of BIG BALLIN yet.</span></div>`; return; }
  if (!S.cloudOk) { box.innerHTML = `<div class="empty"><span>Couldn’t reach the leagues server. Your lineup still works on this device.</span></div>`; return; }
  const lg = S.lbLeague ? league() : null;
  box.innerHTML = lg ? leaguePage(lg) : leagueListView();
}
