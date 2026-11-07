/* BIG BALLIN: Scoreboard tab. */
import { S } from './state.js?v=dev';
import { $, POS, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, beep, flash, jersey, pills, matches } from './util.js?v=dev';
import { isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, targetSlot, costAfter, signState, saveLineup, sign, cut } from './lineup.js?v=dev';

export function renderScore() {
  const rows = POS.filter((pos) => S.lineup[pos]).map((pos) => ({ pos, p: S.byId[S.lineup[pos]] }));
  const res = S.results;
  let total = 0, proj = 0;
  const items = rows.map(({ pos, p }) => {
    const r = res ? res[String(p.id)] : null;
    const fp = r ? r.fp : null;
    if (fp != null) total += fp;
    proj += p.proj;
    const hot = fp != null && fp >= p.proj;
    const line = r ? `${r.pts} PTS · ${r.reb} REB · ${r.ast} AST · ${r.min} MIN` : (res ? 'Did not play' : (isLocked(p) ? 'Game under way or finished' : 'Waiting for tip-off'));
    return `<li class="srow${hot ? ' hot' : ''}">
      <span class="slot-pos" style="width:44px">${pos}</span>
      ${jersey(p, 'sm')}
      <div style="flex:1 1 200px;min-width:0;display:flex;flex-direction:column;gap:2px"><span class="pname">${esc(p.name)}</span><span class="sub">${esc(where(p))} · ${esc(line)}</span></div>
      ${hot ? `<span class="hot-tag"><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.8 7-7 0-3.5-2.2-5.6-3.8-7.6-.4 2-1.4 3.2-2.7 3.6.4-3.4-.9-6.4-3.5-9-.3 3.8-2.2 6-3.8 8.1C4 11.5 5 14 5 15c0 4.2 3 7 7 7z"/></svg>HOT</span>` : ''}
      <div style="text-align:right;min-width:90px"><div class="srow-fp ${hot ? 'red' : 'yel'}">${fp != null ? fp.toFixed(1) : '–'}</div><div class="muted" style="font-size:16px">proj ${p.proj.toFixed(1)}</div></div>
    </li>`;
  }).join('');
  const bonus = capBonusFor(spent(), rows.length);
  const final = total * bonus;
  const board = `<div class="board">
      <div style="display:flex;flex-direction:column;gap:12px">
        <span class="cap-label">${res ? 'FINAL SCORE' : 'TONIGHT’S SCORE'}</span>
        <span class="board-total">${res ? final.toFixed(1) : '0.0'}</span>
        <span class="board-math">${res ? total.toFixed(1) : '0.0'} FP <b>${bonusText(bonus)}</b> CAP BONUS = ${res ? final.toFixed(1) : '0.0'}</span>
        <span class="muted">Projected ${proj.toFixed(1)} FP → ${(proj * bonus).toFixed(1)} with bonus</span>
      </div>
      <button class="btn btn-primary" style="font-size:11px;min-height:52px;padding:0 18px" data-act="refresh">CHECK FOR SCORES</button>
    </div>`;
  const help = res ? '' : HOSTED
    ? `<div class="empty"><span>Final scores post automatically the morning after the games.</span><span class="muted">Press Check for scores to look again.</span></div>`
    : `<div class="empty"><span>Final scores appear after the games, once you run this in Terminal:</span><code>python pipeline/score_night.py --date ${esc(S.slate.date)}</code><span class="muted">Then press Check for scores.</span></div>`;
  const empty = rows.length ? '' : `<div class="empty"><span>No one on the floor yet. Sign at least one player to fill the scoreboard.</span><button class="btn btn-primary" data-act="tab" data-tab="build">GO BUILD</button></div>`;
  $('#score').innerHTML = board + empty + (rows.length ? `<ol class="srows">${items}</ol>` : '') + help;
}
