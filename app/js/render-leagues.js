/* BIG BALLIN: Leagues tab: leaderboards (Tonight / Week / Month / Season, by final
   score), latest winners, everyone's lineups once they lock, invite links. */
import { S } from './state.js?v=659b60b';
import { $, POS, esc, money, jersey } from './util.js?v=659b60b';
import { CLOUD, signedIn, leaderboard, nightLineups, latestWinners, myLeagues, friendly } from './cloud.js?v=659b60b';

export const PERIODS = [['night', 'TONIGHT'], ['week', 'THIS WEEK'], ['month', 'THIS MONTH'], ['season', 'SEASON']];
const BADGE = { night: 'NIGHT WINNER', week: 'WEEK WINNER', month: 'MONTH WINNER', season: 'SEASON CHAMP' };
const WINNER = { night: 'LAST NIGHT’S WINNER', week: 'LAST WEEK’S WINNER', month: 'LAST MONTH’S WINNER', season: 'SEASON CHAMP' };

export const inviteLink = (code) => `${location.origin}${location.pathname}?join=${encodeURIComponent(code)}`;
const league = () => S.leagues.find((l) => l.id === S.lbScope) || null;

/* Fetch what the tab shows. Called on open, on scope/period change, and every 2 minutes while live. */
export async function loadBoards() {
  if (!CLOUD || !S.cloudOk) return;
  const lg = S.lbScope === 'ALL' ? null : S.lbScope;
  try {
    if (signedIn()) S.leagues = await myLeagues();
    if (lg && !S.leagues.some((l) => l.id === lg)) { S.lbScope = 'ALL'; return loadBoards(); }
    const [rows, night, win] = await Promise.all([
      leaderboard(S.lbPeriod, S.slate.date, lg),
      S.lbPeriod === 'night' ? nightLineups(S.slate.date, lg) : Promise.resolve(null),
      latestWinners(lg),
    ]);
    S.lbRows = rows; S.lbNight = night; S.lbWinners = win; S.lbErr = null;
  } catch (e) { S.lbErr = friendly(e).text; }
}

function badges(b) {
  return Object.entries(b || {}).filter(([, n]) => n > 0)
    .map(([k, n]) => `<span class="bdg bdg-${k}" title="${BADGE[k] || k} ${n} time${n > 1 ? 's' : ''}">${BADGE[k] || k}${n > 1 ? ' ×' + n : ''}</span>`).join('');
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

export function renderLeagues() {
  const box = $('#leagues');
  if (!CLOUD) { box.innerHTML = `<div class="empty"><span>Leagues aren’t switched on for this copy of BIG BALLIN yet.</span></div>`; return; }
  if (!S.cloudOk) { box.innerHTML = `<div class="empty"><span>Couldn’t reach the leagues server. Your lineup still works on this device.</span></div>`; return; }
  const lg = league();
  const scopes = [['ALL', 'EVERYONE'], ...S.leagues.map((l) => [l.id, l.name.toUpperCase()])]
    .map(([v, l]) => `<button class="pill" data-act="lbscope" data-v="${esc(v)}" aria-pressed="${S.lbScope === v}">${esc(l)}</button>`).join('');
  const periods = PERIODS.map(([v, l]) => `<button class="seg-b" data-act="lbperiod" data-v="${v}" aria-pressed="${S.lbPeriod === v}">${l}</button>`).join('');

  const tools = signedIn()
    ? `<button class="btn btn-plain" data-act="modal" data-k="create">+ NEW LEAGUE</button>
       <button class="btn btn-plain" data-act="modal" data-k="join">JOIN WITH CODE</button>`
    : `<button class="btn btn-primary" data-act="acct">SIGN IN TO JOIN LEAGUES</button>`;

  const invite = lg ? `<div class="invite">
      <div><span class="cap-label">INVITE FRIENDS</span>
        <p>Send this link, or the code <b class="yel code">${esc(lg.code)}</b></p>
        <input class="search invite-link" readonly value="${esc(inviteLink(lg.code))}" aria-label="Invite link" onfocus="this.select()"></div>
      <div class="m-actions">
        <button class="btn btn-primary" data-act="copyinvite">COPY LINK</button>
        <button class="btn btn-cut" data-act="leave">LEAVE</button>
      </div></div>` : '';

  const w = S.lbWinners || {};
  const winners = ['night', 'week', 'month'].filter((k) => w[k]).map((k) =>
    `<div class="winner"><span class="cap-label">${WINNER[k]}</span><b>${esc(w[k].names.join(' & '))}</b><span class="muted">${Number(w[k].score).toFixed(1)} pts</span></div>`).join('');

  const rows = S.lbRows;
  const me = S.user ? S.user.id : null;
  const night = S.lbPeriod === 'night' && S.lbNight ? Object.fromEntries(S.lbNight.map((r) => [r.user_id, r])) : {};
  let board;
  if (S.lbErr) board = `<div class="empty"><span>${esc(S.lbErr)}</span></div>`;
  else if (!rows) board = `<p class="muted">Loading…</p>`;
  else if (!rows.length) board = `<div class="empty"><span>${lg ? 'No one in this league has a lineup yet for this stretch.' : 'No lineups saved yet. Sign in and build one to get on the board.'}</span></div>`;
  else board = `<ol class="lb">${rows.map((r) => {
    const n = night[r.user_id];
    return `<li class="lb-row${r.user_id === me ? ' me' : ''}">
      <span class="lb-rank">${r.rank}</span>
      <div class="lb-who"><span class="pname">${esc(r.display_name)}</span><div class="bdgs">${badges(r.badges)}</div>
        ${S.lbPeriod === 'night' ? (n ? miniLineup(n) : '<span class="muted">No lineup tonight (counts as 0)</span>')
          : `<span class="muted">${r.nights} night${r.nights === 1 ? '' : 's'} played</span>`}</div>
      <div class="lb-score"><b class="yel">${Number(r.total).toFixed(1)}</b>${r.unofficial ? '<span class="live-tag">LIVE</span>' : ''}
        ${S.lbPeriod === 'night' && n && n.bonus ? `<span class="muted">${Number(n.raw).toFixed(1)} × ${Number(n.bonus).toFixed(2)}</span>` : ''}</div>
    </li>`;
  }).join('')}</ol>`;

  box.innerHTML = `
    <div class="toolbar"><h2>Leagues</h2><div class="toolbar-group">${tools}</div></div>
    <div class="toolbar-group lb-scopes" role="group" aria-label="Which leaderboard">${scopes}</div>
    ${invite}
    ${winners ? `<div class="winners">${winners}</div>` : ''}
    <div class="segs lb-periods" role="group" aria-label="Time period">${periods}</div>
    <p class="muted lb-note">Ranked by final score (fantasy points × cap bonus). A night without a lineup counts as 0.
      Other players’ picks show once their game tips off.</p>
    ${board}`;
}
