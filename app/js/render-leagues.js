/* BIG BALLIN: Leagues tab. Leagues are made by players and joined by invite, but anyone can
   look at any league: the ALL LEAGUES list, then a league's page (name → leaderboard →
   winners → invite). Shared board pieces (rows, badges, periods) are also used by the
   World Rankings tab (render-world.js). */
import { S } from './state.js?v=fc106aa';
import { $, POS, esc, money, jersey, store } from './util.js?v=fc106aa';
import { avatar } from './avatars.js?v=fc106aa';
import { CLOUD, signedIn, leaderboard, nightLineups, latestWinners, myLeagues, leagueList, friendly } from './cloud.js?v=fc106aa';

export const PERIODS = [['night', 'TONIGHT'], ['week', 'THIS WEEK'], ['month', 'THIS MONTH'], ['season', 'SEASON']];
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

/* Fetch what the tab shows. Called on open, on league/period change, and every minute while live. */
export async function loadBoards() {
  if (!CLOUD || !S.cloudOk) return;
  try {
    const [mine, all] = await Promise.all([signedIn() ? myLeagues() : Promise.resolve([]), leagueList(S.slate.date)]);
    S.leagues = mine; S.allLeagues = all;
    const lg = S.lbLeague;
    if (lg && !all.some((l) => l.id === lg)) { S.lbLeague = null; store('bb-league', null); }
    if (!S.lbLeague) { S.lbRows = null; S.lbNight = null; S.lbWinners = null; S.lbErr = null; return; }
    const [rows, night, win] = await Promise.all([
      leaderboard(S.lbPeriod, S.slate.date, S.lbLeague),
      S.lbPeriod === 'night' ? nightLineups(S.slate.date, S.lbLeague) : Promise.resolve(null),
      latestWinners(S.lbLeague),
    ]);
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

export function winnersBox(w, kinds) {
  const html = kinds.filter((k) => w && w[k]).map((k) =>
    `<div class="winner"><span class="cap-label">${WINNER[k]}</span><b>${esc(w[k].names.slice(0, 10).join(' · '))}</b>${w[k].names.length === 1 ? `<span class="muted">${Number(w[k].score).toFixed(1)} pts</span>` : ''}</div>`).join('');
  return html ? `<div class="winners">${html}</div>` : '';
}

/* Another player's lineup: picks show once their game has tipped, until then "?". */
function miniLineup(r) {
  const slots = r.slots || {};
  return `<div class="mini">${POS.map((pos) => {
    const v = slots[pos];
    if (v == null) return `<div class="mini-s empty"><span>${pos}</span>–</div>`;
    if (v === 'hidden') return `<div class="mini-s hid" title="Hidden until his game tips off"><span>${pos}</span><b>?</b></div>`;
    const p = S.byId[v];
    if (!p) return `<div class="mini-s"><span>${pos}</span>#${esc(v)}</div>`;
    const lv = S.live && S.live.p[String(p.id)];
    const fp = S.results && S.results[String(p.id)] ? S.results[String(p.id)].fp : lv ? lv.fp : null;
    return `<div class="mini-s">${jersey(p, 'sm')}<span>${pos}</span><b class="mini-n">${esc(p.name.split(' ').slice(-1)[0])}</b><i>${fp != null ? Number(fp).toFixed(1) : money(p.price)}</i></div>`;
  }).join('')}</div>`;
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
        <div class="bdgs">${badges(r.badges)}</div>${detail}</div>
      <div class="lb-score"><b class="yel">${Number(r.total).toFixed(1)}</b>${r.unofficial ? '<span class="live-tag">LIVE</span>' : ''}
        ${period === 'night' && n && n.bonus ? `<span class="muted">${Number(n.raw).toFixed(1)} FP × ${Number(n.bonus).toFixed(2)}</span>` : ''}</div>
    </li>`;
  }).join('')}</ol>${o.limit && rows.length > o.limit ? `<p class="muted lb-note">Showing the top ${o.limit} of ${rows.length}.</p>` : ''}`;
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
  else if (!rows.length) board = `<div class="empty"><span>No one in this league has a lineup yet for this stretch.</span></div>`;
  else board = boardList(rows, S.lbPeriod, S.lbPeriod === 'night' ? S.lbNight : null, { lineups: true });

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
    ${winnersBox(S.lbWinners, ['night', 'week', 'month', 'season'])}
    ${invite}`;
}

export function renderLeagues() {
  const box = $('#leagues');
  if (!CLOUD) { box.innerHTML = `<div class="empty"><span>Leagues aren’t switched on for this copy of BIG BALLIN yet.</span></div>`; return; }
  if (!S.cloudOk) { box.innerHTML = `<div class="empty"><span>Couldn’t reach the leagues server. Your lineup still works on this device.</span></div>`; return; }
  const lg = S.lbLeague ? league() : null;
  box.innerHTML = lg ? leaguePage(lg) : leagueListView();
}
