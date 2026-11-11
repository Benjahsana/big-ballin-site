/* BIG BALLIN: World Rankings tab. Every signed-in player who played in the stretch is ranked
   automatically, by final score (FP × cap bonus); a skipped night counts as 0; ties share a rank. */
import { S } from './state.js?v=68068ed';
import { $, esc, LABELS, WORLD_ROWS } from './util.js?v=68068ed';
import { avatar } from './avatars.js?v=68068ed';
import { CLOUD, signedIn, latestWinners, friendly } from './cloud.js?v=68068ed';
import { boardList, periodSegs, winBadges, WORLD_KINDS, boardQuery, nightTable } from './render-leagues.js?v=68068ed';

export async function loadWorld() {
  if (!CLOUD || !S.cloudOk) return;
  try {
    const [[rows, night], win] = await Promise.all([boardQuery(S.wPeriod, null), latestWinners(null)]);
    S.wRows = rows; S.wNight = night; S.wWinners = win; S.wErr = null;
  } catch (e) { S.wErr = friendly(e).text; }
}

/* "#47 WORLD ▲3" text pieces for the header chip. */
export function rankText() {
  const r = S.rank;
  if (!r || r.rank == null) return { rank: 'UNRANKED', move: '' };
  const d = r.prev_rank != null ? r.prev_rank - r.rank : 0;
  const move = d > 0 ? `<span class="up">▲${d}</span>` : d < 0 ? `<span class="down">▼${-d}</span>` : '';
  return { rank: `#${r.rank} ${LABELS.worldShort}`, move };
}

export function renderWorld() {
  const box = $('#world');
  if (!CLOUD) { box.innerHTML = `<div class="empty"><span>World Rankings aren’t switched on for this copy of BIG BALLIN yet.</span></div>`; return; }
  if (!S.cloudOk) { box.innerHTML = `<div class="empty"><span>Couldn’t reach the rankings server. Your lineup still works on this device.</span></div>`; return; }
  const rows = S.wRows;
  let board;
  if (S.wErr) board = `<div class="empty"><span>${esc(S.wErr)}</span></div>`;
  else if (!rows) board = `<p class="muted">Loading…</p>`;
  else if (!rows.length) board = `<div class="empty"><span>${S.wPeriod === 'last' ? 'No one played last night.' : 'No scores yet for this stretch. Build a lineup tonight to get on the board.'}</span></div>`;
  else if (S.wPeriod === 'last') board = nightTable(rows, S.wNight, { last: true, limit: WORLD_ROWS, winners: S.wWinners, kinds: WORLD_KINDS });
  else board = boardList(rows, S.wPeriod, S.wPeriod === 'night' ? S.wNight : null, { limit: WORLD_ROWS, winners: S.wWinners, kinds: WORLD_KINDS });

  const me = signedIn()
    ? (() => { const t = rankText(); const r = S.rank;
        return `<div class="world-me">${avatar(S.profile.avatar, 48)}<div><b>${esc(S.profile.display_name)}</b>
          <span class="world-me-rank">${t.rank} ${t.move}</span>
          <span class="muted">${r && r.rank != null ? `Season: ${Number(r.total).toFixed(1)} pts over ${r.nights} night${r.nights === 1 ? '' : 's'} · ${r.players} ranked players`
            : 'Your rank appears after your first scored night (the morning after you play).'}</span></div></div>`; })()
    : `<div class="world-me"><span>Sign in to get ranked: every signed-in player is on the board automatically.</span>
        <button class="btn btn-primary" data-act="acct">SIGN IN</button></div>`;

  box.innerHTML = `
    <div class="toolbar"><h2>${esc(LABELS.world)}</h2>
      <button class="btn btn-plain" data-act="worldrefresh" style="min-height:44px;font-size:10px">REFRESH</button></div>
    ${me}
    ${periodSegs(S.wPeriod, 'wperiod')}
    <p class="muted lb-note">Every signed-in player who played is ranked by final score (fantasy points × cap bonus).
      A night without a lineup counts as 0. Ties share a rank. Tonight updates live during games.</p>
    ${board}
    <p class="muted lb-note">Trophy badges next to a name: World #1 last night, Top 10 last week, Top 10 last month. They’re handed out each morning, separate from league badges.</p>`;
}
