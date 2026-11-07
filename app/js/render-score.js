/* BIG BALLIN: Scoreboard tab. */
import { S } from './state.js?v=fc106aa';
import { $, POS, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, beep, flash, jersey, pills, matches } from './util.js?v=fc106aa';
import { liveOf, gameOf, allFinal, isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, targetSlot, costAfter, signState, saveLineup, sign, cut } from './lineup.js?v=fc106aa';

export function renderScore() {
  const rows = POS.filter((pos) => S.lineup[pos]).map((pos) => ({ pos, p: S.byId[S.lineup[pos]] }));
  const res = S.results;                    // official (morning score job)
  const live = !res && S.live;              // live points so far (server live job)
  const done = live && allFinal();
  let total = 0, proj = 0;
  const items = rows.map(({ pos, p }) => {
    const r = res ? res[String(p.id)] : liveOf(p);
    const g = live ? gameOf(p) : null;
    const fp = r ? r.fp : null;
    if (fp != null) total += fp;
    proj += p.proj;
    const hot = fp != null && fp >= p.proj;
    const status = g && g.s >= 2 ? `<span class="gstat${g.s === 2 ? ' on' : ''}">${esc(g.t || (g.s === 3 ? 'Final' : 'Live'))}</span> ` : '';
    const line = r ? `${r.pts} PTS · ${r.reb} REB · ${r.ast} AST · ${r.min} MIN`
      : res ? 'Did not play'
      : g && g.s === 3 ? 'Did not play'
      : g && g.s === 2 ? 'No stats yet'
      : isLocked(p) ? 'Game under way: live points every few minutes' : 'Waiting for tip-off';
    return `<li class="srow${hot ? ' hot' : ''}">
      <span class="slot-pos" style="width:44px">${pos}</span>
      ${jersey(p, 'sm')}
      <div style="flex:1 1 200px;min-width:0;display:flex;flex-direction:column;gap:2px"><span class="pname">${esc(p.name)}</span><span class="sub">${status}${esc(where(p))} · ${esc(line)}</span></div>
      ${hot ? `<span class="hot-tag"><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.8 7-7 0-3.5-2.2-5.6-3.8-7.6-.4 2-1.4 3.2-2.7 3.6.4-3.4-.9-6.4-3.5-9-.3 3.8-2.2 6-3.8 8.1C4 11.5 5 14 5 15c0 4.2 3 7 7 7z"/></svg>HOT</span>` : ''}
      <div style="text-align:right;min-width:90px"><div class="srow-fp ${hot ? 'red' : 'yel'}">${fp != null ? fp.toFixed(1) : '–'}</div><div class="muted" style="font-size:16px">proj ${p.proj.toFixed(1)}</div></div>
    </li>`;
  }).join('');
  const bonus = capBonusFor(spent(), rows.length);
  const final = total * bonus;
  const has = res || live;
  const label = res ? 'FINAL SCORE' : done ? 'UNOFFICIAL FINAL' : live ? 'LIVE SCORE' : 'TONIGHT’S SCORE';
  const when = live && live.at ? ` · updated ${new Date(live.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '';
  const board = `<div class="board">
      <div style="display:flex;flex-direction:column;gap:12px">
        <span class="cap-label">${label}${live && !done ? ' <span class="live-tag blink">LIVE</span>' : ''}</span>
        <span class="board-total">${has ? final.toFixed(1) : '0.0'}</span>
        <span class="board-math">${has ? total.toFixed(1) : '0.0'} FP <b>${bonusText(bonus)}</b> CAP BONUS = ${has ? final.toFixed(1) : '0.0'}</span>
        <span class="muted">Projected ${proj.toFixed(1)} FP → ${(proj * bonus).toFixed(1)} with bonus${esc(when)}</span>
      </div>
      <button class="btn btn-primary" style="font-size:11px;min-height:52px;padding:0 18px" data-act="refresh">CHECK FOR SCORES</button>
    </div>`;
  const help = res ? '' : done
    ? `<div class="empty"><span>All games are over. Official scores post automatically in the morning.</span></div>`
    : live ? ''
    : HOSTED
    ? `<div class="empty"><span>Points go live a few minutes after tip-off, and final scores post the morning after.</span><span class="muted">Press Check for scores to look again.</span></div>`
    : `<div class="empty"><span>Final scores appear after the games, once you run this in Terminal:</span><code>python pipeline/score_night.py --date ${esc(S.slate.date)}</code><span class="muted">Then press Check for scores.</span></div>`;
  const empty = rows.length ? '' : `<div class="empty"><span>No one on the floor yet. Sign at least one player to fill the scoreboard.</span><button class="btn btn-primary" data-act="tab" data-tab="build">SET TODAY’S LINEUP</button></div>`;
  $('#score').innerHTML = board + empty + (rows.length ? `<ol class="srows">${items}</ol>` : '') + help;
}
