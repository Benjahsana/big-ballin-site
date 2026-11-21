/* BIG BALLIN: MANAGE LEAGUE (Nov 19). The league owner and co-commissioners get a panel on the
   league page: rename, new invite code, remove teams. The owner also makes co-commissioners, hands
   the league to another member, and deletes it. The database checks every one of these
   (supabase/schema.sql "League management"); this file only draws the panel and asks to confirm. */
import { S, ui } from './state.js?v=3238925';
import { esc, store, flash } from './util.js?v=3238925';
import { avatar } from './avatars.js?v=3238925';
import { play } from './sound.js?v=3238925';
import { leagueRoster, removeMember, newLeagueCode, renameLeague, setCoOwner, handOffLeague, deleteLeague, friendly } from './cloud.js?v=3238925';
import { loadBoards } from './render-leagues.js?v=3238925';

const M = { open: null, roster: null, busy: false };   // open = league id whose panel is open
const me = () => (S.user ? S.user.id : null);
const myLeague = () => S.leagues.find((l) => l.id === S.lbLeague);
export const isAdmin = (l) => !!(l && (l.owner === me() || l.co_owner));

async function loadRoster(lg) {
  try { M.roster = await leagueRoster(lg); } catch (e) { M.roster = null; oops(e); }
}
function oops(e) { const f = friendly(e); flash(f.title, '#FF4A3D', '#3D8BFF'); }
async function refresh() { await Promise.all([loadBoards(), M.open ? loadRoster(M.open) : null]); ui.renderAll(); }
async function run(fn, done) {
  if (M.busy) return;
  M.busy = true;
  try { await fn(); play('tap'); if (done) flash(done, '#FFD23F', '#3D8BFF'); await refresh(); }
  catch (e) { oops(e); }
  finally { M.busy = false; }
}

/* The MANAGE LEAGUE button + panel (empty for plain members). */
export function manageBox() {
  const l = myLeague();
  if (!isAdmin(l)) return '';
  const owner = l.owner === me();
  const open = M.open === l.id;
  const btn = `<button class="btn btn-ghost" data-act="mgopen" aria-expanded="${open}">${open ? 'CLOSE MANAGE' : 'MANAGE LEAGUE'}</button>`;
  if (!open) return `<div class="m-actions mg-row">${btn}</div>`;
  const people = !M.roster ? '<li class="muted">Loading…</li>' : M.roster.map((m) => {
    const self = m.user_id === me();
    const tag = m.owner ? '<span class="mg-tag own">OWNER</span>' : m.co_owner ? '<span class="mg-tag co">CO-COMMISH</span>' : '';
    const acts = [];
    if (!self && !m.owner) {
      if (owner) acts.push(`<button class="btn btn-plain" data-act="mgco" data-u="${m.user_id}" data-on="${!m.co_owner}">${m.co_owner ? 'UNDO CO' : 'MAKE CO'}</button>`);
      if (owner) acts.push(`<button class="btn btn-plain" data-act="mghand" data-u="${m.user_id}">MAKE OWNER</button>`);
      if (owner || !m.co_owner) acts.push(`<button class="btn btn-cut" data-act="mgkick" data-u="${m.user_id}">REMOVE</button>`);
    }
    return `<li class="mg-p">${avatar(m.avatar, 28, false, m.user_id)}<b>${esc(m.display_name)}${self ? ' <span class="muted">(you)</span>' : ''}</b>${tag}
      <span class="mg-acts">${acts.join('')}</span></li>`;
  }).join('');
  return `<section class="manage" aria-label="Manage league">
    <div class="m-actions mg-row">${btn}</div>
    <h3 class="lg-head">MANAGE ${esc(l.name)}</h3>
    <div class="m-actions mg-row">
      <button class="btn btn-plain" data-act="mgrename">RENAME</button>
      <button class="btn btn-plain" data-act="mgcode">NEW INVITE CODE</button>
      <span class="muted">Code now: <b class="yel code">${esc(l.code)}</b></span>
    </div>
    <h4 class="mg-sub">TEAMS (${M.roster ? M.roster.length : '…'})</h4>
    <ul class="mg-list">${people}</ul>
    <p class="muted lb-note">Removed players can rejoin with the invite link. Make a NEW INVITE CODE to stop that (old links stop working).
      ${owner ? 'Co-commissioners can rename, make new codes, remove teams and delete chat messages. Only you can add co-commissioners, hand off the league or delete it.' : 'You’re a co-commissioner: only the owner can add co-commissioners, hand off the league or delete it.'}</p>
    ${owner ? '<div class="m-actions mg-row"><button class="btn btn-danger" data-act="mgdelete">DELETE LEAGUE</button></div>' : ''}
  </section>`;
}

const nameOf = (u) => ((M.roster || []).find((m) => m.user_id === u) || {}).display_name || 'this player';

/* Click handling (from main.js). */
export function manageAct(act, b) {
  const l = myLeague();
  if (!l) return;
  const u = b.dataset.u;
  switch (act) {
    case 'mgopen':
      if (M.open === l.id) { M.open = null; ui.renderAll(); break; }
      M.open = l.id; M.roster = null; ui.renderAll(); loadRoster(l.id).then(ui.renderAll);
      break;
    case 'mgrename': {
      const name = prompt('New league name (2 to 30 characters):', l.name);
      if (name == null || name.trim() === l.name) break;
      run(() => renameLeague(l.id, name.trim()), 'RENAMED!');
      break;
    }
    case 'mgcode':
      if (!confirm(`Make a new invite code for ${l.name}? The old link and code (${l.code}) stop working.`)) break;
      run(() => newLeagueCode(l.id), 'NEW CODE!');
      break;
    case 'mgkick':
      if (!confirm(`Remove ${nameOf(u)} from ${l.name}? Their lineups and scores stay in the game. They can rejoin with the invite link unless you make a new code.`)) break;
      run(() => removeMember(l.id, u), 'REMOVED!');
      break;
    case 'mgco': {
      const on = b.dataset.on === 'true';
      if (on && !confirm(`Make ${nameOf(u)} a co-commissioner? They can rename the league, make new codes, remove teams and delete chat messages.`)) break;
      run(() => setCoOwner(l.id, u, on), on ? 'CO-COMMISH!' : 'UPDATED!');
      break;
    }
    case 'mghand':
      if (!confirm(`Make ${nameOf(u)} the owner of ${l.name}? You become a co-commissioner, and only they can undo it.`)) break;
      run(() => handOffLeague(l.id, u), 'NEW OWNER!');
      break;
    case 'mgdelete': {
      const typed = prompt(`Delete ${l.name} for everyone? Its chat and league trophies are deleted too (lineups and scores stay). This can't be undone.\n\nType the league name to confirm:`);
      if (typed == null) break;
      if (typed.trim().toLowerCase() !== l.name.toLowerCase()) { flash('NOT DELETED', '#FF4A3D', '#3D8BFF'); break; }
      run(async () => { await deleteLeague(l.id); M.open = null; S.lbLeague = null; store('bb-league', null); }, 'DELETED!');
      break;
    }
  }
}
