/* BIG BALLIN: startup, header, events, loading. */
import { S, ui } from './state.js?v=e53101f';
import { $, POS, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, flash, jersey, pills, matches, fitNames } from './util.js?v=e53101f';
import { allFinal, isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, bonusMaxed, targetSlot, costAfter, signState, saveLineup, sign, cut } from './lineup.js?v=e53101f';
import { renderSlots, renderPool, setupPoolControls } from './render-build.js?v=e53101f';
import { defaultDir } from './filters.js?v=e53101f';
import { renderStats } from './render-stats.js?v=e53101f';
import { renderScore, loadTonightRanks, loadLastRanks, scoreView } from './render-score.js?v=e53101f';
import { L, asLast, loadLast, lastIsCurrent, anyStarted, resetLastLineup } from './night.js?v=e53101f';
import { CLOUD, signedIn, initCloud, sendLink, verifyCode, signOut, saveProfile, loadLineup, createLeague, joinLeague, leaveLeague, liveFeed, myWorldRank, myBadges, friendly } from './cloud.js?v=e53101f';
import { openModal, closeModal, renderModal } from './render-account.js?v=e53101f';
import { renderLeagues, loadBoards, inviteLink, playerPop } from './render-leagues.js?v=e53101f';
import { renderWorld, loadWorld, rankText } from './render-world.js?v=e53101f';
import { avatar } from './avatars.js?v=e53101f';
import { play, SOUNDS, styleFor } from './sound.js?v=e53101f';
import { SOUND, LIVE_REFRESH_MS, HOT_LEVELS } from './app-config.js?v=e53101f';
import { LABELS } from './util.js?v=e53101f';

function renderHeader() {
  const cap = S.slate.cap, s = spent(), left = cap - s;
  const filled = POS.filter((p) => S.lineup[p]).length;
  const col = left / cap > 0.25 ? 'var(--yel)' : 'var(--red)';
  $('#capLeft').textContent = money(left) + ' LEFT';
  $('#capLeft').style.color = col;
  $('#capFill').style.width = Math.max(0, Math.min(100, (left / cap) * 100)) + '%';
  $('#capFill').style.background = col;
  $('#capSpent').textContent = 'Spent ' + money(s);
  $('#capCount').textContent = filled + '/5 signed';
  const bonus = capBonusFor(s, filled), cb = S.slate.cap_bonus || {};
  const bEl = $('#capBonus');
  if (filled < 5 && cb.full_lineup_only !== false) {
    bEl.textContent = 'CAP BONUS ' + bonusText(potentialBonus());
    bEl.className = 'cap-bonus-val';
    $('#capBonusNote').textContent = filled ? 'if you fill all 5 now' : 'Leave cap unused to boost your score';
  } else {
    bEl.textContent = 'CAP BONUS ' + bonusText(bonus);
    bEl.className = 'cap-bonus-val' + (bonusMaxed(bonus) ? ' big' : bonus > 1.001 ? ' on' : '');
    $('#capBonusNote').textContent = bonus > 1.001 ? 'boosts tonight’s score' : 'no cap left over';
  }
  document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === S.tab)));
  ['build', 'stats', 'score', 'leagues', 'world'].forEach((t) => { $('#view-' + t).hidden = S.tab !== t; });
  // Account button + where the lineup is saved.
  const cloudOn = CLOUD && S.cloudOk;
  $('#leaguesTab').hidden = !cloudOn;
  $('#worldBtn').hidden = !cloudOn;
  $('#worldBtn').setAttribute('aria-pressed', String(S.tab === 'world'));
  $('#acctBtn').hidden = !cloudOn;
  $('#acctBtn').textContent = signedIn() ? 'ACCOUNT' : 'SIGN IN';
  renderRankChip(cloudOn);
  $('#acctBtn').classList.toggle('on', signedIn());
  $('#syncNote').textContent = !cloudOn ? '' : !signedIn() ? 'Saved on this device only · sign in to save it to your account'
    : { saving: 'Saving…', saved: 'Saved to your account ✓', error: 'Couldn’t save to your account', local: '' }[S.sync] || '';
  $('#syncNote').className = 'sync' + (S.sync === 'error' && signedIn() ? ' red' : '');
  $('#soundBtn').textContent = S.sound ? 'SOUND ON' : 'SOUND OFF';
  renderSoundPanel();
}

/* Header chip on every tab: [avatar] NAME · #47 WORLD ▲3 (signed out: MY TEAM ▸). Tapping it opens MY TEAM
   (there's no MY TEAM tab in the tab row). Biggest on BUILD LINEUP. The World Rankings button sits next to it. */
function renderRankChip(cloudOn) {
  const chip = $('#rankChip');
  chip.classList.toggle('big', S.tab === 'build');
  chip.setAttribute('aria-pressed', String(S.tab === 'score'));
  const tag = `<span class="rc-team">${esc(LABELS.score)} ▸</span>`;
  if (!cloudOn || !signedIn()) {
    chip.innerHTML = tag;
    chip.setAttribute('aria-label', `Open ${LABELS.score}`);
    return;
  }
  const t = rankText();
  chip.innerHTML = `${avatar(S.profile.avatar, S.tab === 'build' ? 48 : 36)}<span class="rc-name">${esc(S.profile.display_name.toUpperCase())}</span><span class="rc-dot">·</span><span class="rc-rank">${t.rank.replace(' ' + LABELS.worldShort, `<span class="rc-w"> ${LABELS.worldShort}</span>`)}</span>${t.move}`;
  chip.setAttribute('aria-label', `${S.profile.display_name}, ${t.rank.replace('#', 'number ')}. Open ${LABELS.score}`);
}

/* SOUND panel: on/off and volume (remembered per device). With #soundtest at the end of
   the address it also lists every sound, to hear them before pushing a change. */
let soundOpen = location.hash === '#soundtest';
function renderSoundPanel() {
  const box = $('#soundPanel');
  $('#soundBtn').setAttribute('aria-expanded', String(soundOpen));
  box.hidden = !soundOpen;
  if (!soundOpen) return;
  const vol = Math.round(S.volume * 100);
  const test = location.hash === '#soundtest'
    ? `<div class="snd-test"><span class="cap-label">SOUND TEST: CLASSIC vs FUN (cooldown skipped here; ★ = what players hear now)</span>
        <div class="snd-grid">${Object.entries(SOUNDS).map(([k, v]) => `<div class="snd-pair"><span>${esc(v[0])}</span>
          <button class="btn btn-plain" data-act="soundtest" data-k="${k}" data-style="classic">${styleFor(k) === 'classic' ? '<i class="star">★</i> ' : ''}CLASSIC</button>
          <button class="btn btn-primary" data-act="soundtest" data-k="${k}" data-style="fun">${styleFor(k) === 'fun' ? '<i class="star">★</i> ' : ''}FUN</button></div>`).join('')}</div></div>` : '';
  if (box.dataset.vol === String(vol) && box.dataset.on === String(S.sound) && box.dataset.test === String(!!test)) return;  // keep the slider steady while dragging
  box.dataset.vol = vol; box.dataset.on = S.sound; box.dataset.test = !!test;
  box.innerHTML = `<div class="snd-row">
      <button class="tog" data-act="sound" aria-pressed="${S.sound}">${S.sound ? 'SOUND ON' : 'SOUND OFF'}</button>
      <label class="snd-vol"><span class="cap-label">VOLUME</span>
        <input type="range" id="volRange" min="0" max="100" step="5" value="${vol}" aria-label="Volume" ${S.sound ? '' : 'disabled'}></label>
      <span class="muted">${vol}%</span>
    </div>${test}`;
}

function renderAll() {
  renderHeader();
  if (S.tab === 'build') { renderSlots(); renderPool(); }
  if (S.tab === 'stats') renderStats();
  if (S.tab === 'score') renderScore();
  if (S.tab === 'leagues') { renderLeagues(); hidePop(); }
  if (S.tab === 'world') renderWorld();
}
ui.renderAll = renderAll;

/* Scroll the Stat Center table so the selected player's row is in view, and flash it. */
function showStatsRow() {
  const row = document.querySelector('#statsBody tr.sel');
  const box = document.querySelector('.table-box');
  if (!row || !box) return;
  const head = box.querySelector('thead');
  // Put his row just under the sticky header (the table can extend below the screen edge).
  if (box.scrollHeight > box.clientHeight) box.scrollTop = Math.max(0, row.offsetTop - (head ? head.offsetHeight : 48) - 4);
  row.classList.remove('flash-row'); void row.offsetWidth; row.classList.add('flash-row');
}

let fitTimer = null;
window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => fitNames(document), 150); });
// Names are measured to fit on one line; measure again once the arcade fonts have loaded.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitNames(document));

/* ---------- Events ---------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || !S.slate) return;
  const id = b.dataset.id ? Number(b.dataset.id) : null;
  switch (b.dataset.act) {
    case 'tab': S.tab = b.dataset.tab; play('tap'); renderAll(); window.scrollTo({ top: 0 });
      if (S.tab === 'leagues') loadBoards().then(renderAll);
      if (S.tab === 'world') loadWorld().then(renderAll);
      if (S.tab === 'score') { pollLive().then(loadTonightRanks).then(renderAll); loadLast().then(loadLastRanks).then(renderAll); }
      break;
    case 'acct': signedIn() ? openModal('account') : S.user ? openModal('name') : openModal('signin'); break;
    case 'modal': openModal(b.dataset.k, b.dataset.k === 'signin' && S.modal ? { email: S.modal.email } : null); break;
    case 'closemodal': closeModal(); break;
    case 'signout': signOut().then(() => { closeModal(); afterAuth(); flash('SIGNED OUT', '#A9A7C2', '#3D8BFF'); }); break;
    case 'league': S.lbLeague = b.dataset.v || null; store('bb-league', S.lbLeague); S.lbRows = null; S.inviteOpen = false;
      renderLeagues(); window.scrollTo({ top: 0 }); loadBoards().then(renderAll); break;
    case 'scoreview': S.scoreView = b.dataset.v; play('tap'); renderScore();
      if (S.scoreView === 'last') loadLast().then(loadLastRanks).then(renderAll);
      break;
    case 'lbperiod': S.lbAuto = false; S.lbPeriod = b.dataset.v; S.lbRows = null; renderLeagues(); loadBoards().then(renderAll); break;
    case 'wperiod': S.wPeriod = b.dataset.v; S.wRows = null; renderWorld(); loadWorld().then(renderAll); break;
    case 'worldrefresh': pollLive().then(loadWorld).then(() => { renderAll(); flash(S.live && !allFinal() ? 'LIVE!' : 'UPDATED!', '#FFD23F', '#3D8BFF'); }); break;
    case 'ltopen': S.lbOpen[b.dataset.v] = !S.lbOpen[b.dataset.v]; renderAll(); break;
    case 'mtopen': S.mtOpen[b.dataset.v] = !S.mtOpen[b.dataset.v]; play('tap'); renderAll(); break;
    case 'pcell': showPop(b, true); break;
    case 'invitetoggle': S.inviteOpen = !S.inviteOpen; renderLeagues(); break;
    case 'copyinvite': case 'shareinvite': {
      const lg = S.leagues.find((l) => l.id === S.lbLeague);
      if (!lg) break;
      const text = `Join my BIG BALLIN league "${lg.name}": ${inviteLink(lg.code)} (code ${lg.code})`;
      const act = b.dataset.act === 'shareinvite' && navigator.share
        ? navigator.share({ text }).catch(() => {})
        : navigator.clipboard.writeText(text).then(() => flash('COPIED!', '#FFD23F', '#3D8BFF'));
      act.catch(() => flash('COPY FAILED', '#FF4A3D', '#3D8BFF'));
      break;
    }
    case 'leave': {
      const lg = S.leagues.find((l) => l.id === S.lbLeague);
      if (!lg || !confirm(`Leave ${lg.name}? You can rejoin later with the code ${lg.code}.`)) break;
      leaveLeague(lg.id).then(() => { S.lbLeague = null; store('bb-league', null); return loadBoards(); }).then(renderAll)
        .catch((e) => { const f = friendly(e); flash(f.title, '#FF4A3D', '#3D8BFF'); });
      break;
    }
    case 'soundpanel': soundOpen = !soundOpen; renderHeader(); break;
    case 'sound': S.sound = !S.sound; store('bb-sound', S.sound); renderHeader(); if (S.sound) play('tap'); break;
    case 'soundtest': play(b.dataset.k, { force: true, style: b.dataset.style }); break;
    case 'choose': S.poolPos = b.dataset.pos; S.poolLimit = 36; renderAll(); $('#faTitle').scrollIntoView({ block: 'start', behavior: 'smooth' }); break;
    case 'poolpos': S.poolPos = b.dataset.v; S.poolLimit = 36; renderAll(); break;
    case 'statspos': S.statsPos = b.dataset.v; renderStats(); break;
    case 'statsscope': S.statsScope = b.dataset.v; play('tap'); renderStats(); break;
    case 'more': S.poolLimit += 36; renderPool(); break;
    case 'dir': S.poolDir = -S.poolDir; renderPool(); break;
    case 'lsort': {   // LIST view column header: same column flips the order, a new one starts at its natural order
      const k = b.dataset.k;
      if (S.poolSort === k) S.poolDir = -S.poolDir; else { S.poolSort = k; S.poolDir = defaultDir(k); }
      S.poolLimit = 36; play('tap'); renderPool(); break;
    }
    case 'filters': S.filtersOpen = !S.filtersOpen; renderPool(); break;
    case 'toggle': S[b.dataset.k] = !S[b.dataset.k]; S.poolLimit = 36; if (b.dataset.k === 'hideOut') store('bb-hideout', S.hideOut); renderPool(); break;
    case 'win': S.win = b.dataset.v; store('bb-win', S.win); S.tab === 'stats' ? renderStats() : renderPool(); break;
    case 'view': S.view = b.dataset.v; store('bb-view', S.view); renderPool(); break;
    case 'sign': sign(S.byId[id]); break;
    case 'cut': cut(b.dataset.pos); break;
    case 'stats': {
      // Open the Stat Center on this player: his card, and his row highlighted in the table.
      const p = S.byId[id];
      S.selId = id; S.tab = 'stats';
      if (S.statsPos !== 'ALL' && !slotsFor(p).includes(S.statsPos)) S.statsPos = 'ALL';
      if (S.statsQuery && !matches(p, S.statsQuery)) { S.statsQuery = ''; $('#statsSearch').value = ''; }
      renderAll(); window.scrollTo({ top: 0 });
      showStatsRow();
      break;
    }
    case 'select': S.selId = id; renderStats(); if (window.innerWidth <= 900) $('#card').scrollIntoView({ behavior: 'smooth' }); break;
    case 'sort': {
      const k = b.dataset.k;
      S.sortDir = S.sortKey === k ? -S.sortDir : (k === 'tov' ? 1 : -1);
      S.sortKey = k; renderStats(); break;
    }
    case 'refresh': if (scoreView() === 'last' && !lastIsCurrent()) {
      loadLast(true).then(loadLastRanks).then(() => { renderScore(); flash(L.results ? 'FINAL!' : 'NOT YET!', L.results ? '#FFD23F' : '#A9A7C2', '#3D8BFF'); });
      break;
    }
    loadResults().then(pollLive).then(loadTonightRanks).then(() => {
      renderScore();
      if (S.results) flash('FINAL!', '#FFD23F', '#3D8BFF');
      else if (S.live) flash('LIVE!', '#FF4A3D', '#FFD23F');
      else flash('NOT YET!', '#A9A7C2', '#3D8BFF');
    }); break;
  }
});
$('#poolSearch').addEventListener('input', (e) => { S.poolQuery = e.target.value; S.poolLimit = 36; renderPool(); });
$('#poolSort').addEventListener('change', (e) => { S.poolSort = e.target.value; S.poolDir = defaultDir(S.poolSort); S.poolLimit = 36; renderPool(); });
$('#poolGame').addEventListener('change', (e) => { S.poolGame = e.target.value; S.poolLimit = 36; renderPool(); });
$('#poolPrice').addEventListener('change', (e) => { S.poolPrice = e.target.value; S.poolLimit = 36; renderPool(); });
document.addEventListener('input', (e) => {
  if (e.target.id !== 'volRange') return;
  S.volume = Number(e.target.value) / 100; store('bb-vol', S.volume);
  const pct = e.target.closest('.snd-row').querySelector('.muted'); if (pct) pct.textContent = Math.round(S.volume * 100) + '%';
  $('#soundPanel').dataset.vol = Math.round(S.volume * 100);
});
document.addEventListener('change', (e) => { if (e.target.id === 'volRange') play('sign', { force: true }); });   // hear the new level
$('#statsSearch').addEventListener('input', (e) => { S.statsQuery = e.target.value; renderStats(); });

/* ---------- Account pop-up forms ---------- */
$('#modal').addEventListener('close', () => { S.modal = null; });
$('#modal').addEventListener('change', (e) => { if (e.target.name === 'avatar' && S.modal) S.modal.avatar = Number(e.target.value); });
$('#modal').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target, kind = form.dataset.form, fd = new FormData(form), m = S.modal || {};
  S.modal = { ...m, busy: true, msg: '' }; renderModal();
  try {
    if (kind === 'signin') {
      const email = String(fd.get('email')).trim();
      await sendLink(email);
      openModal('code', { email });
      return;
    }
    if (kind === 'code') { await verifyCode(m.email, String(fd.get('code')).trim()); closeModal(); return; }   // sign-in finishes in afterAuth()
    if (kind === 'name') {
      S.modal.name = String(fd.get('name'));   // kept if the save fails
      await saveProfile(String(fd.get('name')), Number(fd.get('avatar')));
      closeModal(); flash('WELCOME, ' + S.profile.display_name.toUpperCase() + '!', '#FFD23F', '#FF4A3D');
      await afterAuth(); return;
    }
    if (kind === 'create' || kind === 'join') {
      const lg = kind === 'create' ? await createLeague(String(fd.get('name'))) : await joinLeague(String(fd.get('code')).trim().toUpperCase());
      closeModal();
      S.lbLeague = lg.id; store('bb-league', lg.id); S.tab = 'leagues'; S.lbRows = null; S.inviteOpen = kind === 'create';
      await loadBoards(); renderAll();
      play('league');
      flash(kind === 'create' ? 'LEAGUE CREATED!' : 'YOU’RE IN!', '#FFD23F', '#3D8BFF');
      return;
    }
  } catch (err) {
    const f = friendly(err);
    S.modal = { ...m, busy: false, msg: f.text, err: true };
    renderModal();
  }
});

/* After sign-in, sign-out or on load: pick up the account's lineup and any pending invite. */
async function afterAuth() {
  resetLastLineup();   // last night's saved lineup depends on who is signed in
  if (!S.user) { S.sync = 'local'; S.leagues = []; S.rank = null; S.tRanks = null; S.inviteOpen = false; if (S.tab === 'leagues') await loadBoards(); renderAll(); return; }
  if (!S.profile) { renderAll(); openModal('name'); return; }
  try {
    const lu = await loadLineup(S.slate.date);
    if (lu && POS.some((pos) => lu[pos])) {
      // The account's lineup wins over this device's (it's the one the database checked).
      POS.forEach((pos) => { S.lineup[pos] = lu[pos] && S.byId[lu[pos]] ? lu[pos] : null; });
      store('bb-lineup-' + S.slate.date, S.lineup);
      S.sync = 'saved';
    } else if (filledCount()) saveLineup();
    else S.sync = 'saved';
  } catch (e) { S.sync = 'error'; }
  const code = recall('bb-join');
  if (code) {
    store('bb-join', null);
    try {
      const lg = await joinLeague(code);
      S.lbLeague = lg.id; store('bb-league', lg.id); S.tab = 'leagues';
      flash('YOU’RE IN!', '#FFD23F', '#3D8BFF');
    } catch (e) { const f = friendly(e); flash(f.title, '#FF4A3D', '#3D8BFF'); }
  }
  try { S.rank = await myWorldRank(); } catch (e) { S.rank = null; }
  await checkBadges();
  if (S.tab === 'leagues') await loadBoards();
  if (S.tab === 'world') await loadWorld();
  renderAll();
}

/* Player popover on the league Tonight table: hover (mouse) or tap. One floating box,
   placed next to the cell, so the table's sideways scroll on phones can't clip it. */
let popFor = null;
function showPop(cell, tapped) {
  const box = $('#pcPop');
  if (tapped && popFor === cell && !box.hidden) { hidePop(); return; }
  box.innerHTML = cell.dataset.n === 'last' ? asLast(() => playerPop(Number(cell.dataset.pid))) : playerPop(Number(cell.dataset.pid));
  box.hidden = false;
  popFor = cell;
  const r = cell.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
  let x = r.left + r.width / 2 - w / 2, y = r.bottom + 6;
  x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
  if (y + h > window.innerHeight - 8) y = Math.max(8, r.top - h - 6);
  box.style.left = x + 'px'; box.style.top = y + 'px';
}
function hidePop() { const box = $('#pcPop'); if (box) box.hidden = true; popFor = null; }
document.addEventListener('mouseover', (e) => {
  if (!window.matchMedia('(hover: hover)').matches) return;
  const cell = e.target.closest('td[data-act="pcell"]');
  if (cell) { if (cell !== popFor) showPop(cell, false); } else if (popFor && !e.target.closest('#pcPop')) hidePop();
});
document.addEventListener('click', (e) => { if (popFor && !e.target.closest('td[data-act="pcell"]') && !e.target.closest('#pcPop')) hidePop(); }, true);
window.addEventListener('scroll', hidePop, { passive: true });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hidePop();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('td[data-act="pcell"]')) { e.preventDefault(); showPop(e.target, true); }
});

/* Fanfare (once) for a badge I haven't seen yet on this device. The first time an account is
   seen here, its existing badges are just marked as seen. */
const BADGE_SHOUT = { night: 'NIGHT WINNER!', week: 'WEEK WINNER!', month: 'MONTH WINNER!', season: 'SEASON CHAMP!',
  w_night1: 'WORLD #1 LAST NIGHT!', w_week10: 'WORLD TOP 10 WEEK!', w_month10: 'WORLD TOP 10 MONTH!' };
async function checkBadges() {
  if (!signedIn()) return;
  try {
    const mine = await myBadges();
    const key = 'bb-badges-seen-' + S.user.id;
    const seen = recall(key);
    store(key, mine.map((b) => b.id));
    if (!Array.isArray(seen)) return;
    const fresh = mine.filter((b) => !seen.includes(b.id));
    if (!fresh.length) return;
    const best = fresh.find((b) => b.kind === 'night' || b.kind === 'w_night1') || fresh[0];
    play(best.kind === 'night' || best.kind === 'w_night1' ? 'nightwin' : 'fanfare');
    flash(BADGE_SHOUT[best.kind] || 'BADGE!', '#FFD23F', '#FF4A3D');
  } catch (e) { /* try again next visit */ }
}

/* ---------- Live points (Supabase live_feed, refreshed by the server about every minute) ---------- */
let liveSeeded = false;
let teamFp = null;       // my lineup's live FP at the last check (for the "we scored" sound)
async function pollLive() {
  if (!CLOUD || !S.cloudOk || S.results || !anyStarted() || (allFinal() && liveSeeded)) return;
  try {
    const f = await liveFeed(S.slate.date);
    if (!f) return;
    S.live = f;
    // HEATING UP (projection) → ON FIRE (+10) → THIS IS INSANE (+20): each level once per player a night.
    let shout = null;
    POS.forEach((pos) => {
      const p = S.lineup[pos] ? S.byId[S.lineup[pos]] : null;
      const lv = p && f.p[String(p.id)];
      if (!lv) return;
      const level = HOT_LEVELS.filter((h) => lv.fp >= p.proj + h.over).length;
      if (level <= (S.hotSeen[p.id] || 0)) return;
      S.hotSeen[p.id] = level;
      if (liveSeeded && (!shout || level > shout.level)) shout = { p, level };
    });
    // My team's live FP: if it went up since the last check, play the point sound (HEATING UP wins if both).
    const fp = POS.reduce((sum, pos) => { const lv = S.lineup[pos] && f.p[String(S.lineup[pos])]; return sum + (lv ? lv.fp : 0); }, 0);
    const scored = liveSeeded && teamFp != null && fp > teamFp + 0.01;
    teamFp = fp;
    liveSeeded = true;
    if (shout) {
      const h = HOT_LEVELS[shout.level - 1];
      play(h.sound); flash(h.text(shout.p.name.split(' ').slice(-1)[0].toUpperCase()), '#FF4A3D', '#FFD23F');
    }
    else if (scored) play('point');
  } catch (e) { /* try again next minute */ }
}

/* Every minute while the page is visible (a background tab doesn't download anything). */
async function tick() {
  if (document.hidden) return;
  await pollLive();
  // Boards opened on LAST NIGHT before tonight's games switch to TONIGHT at the first tip-off (unless picked by hand).
  if (S.lbAuto && anyStarted() && !lastIsCurrent()) { S.lbAuto = false; S.lbPeriod = 'night'; S.lbRows = null; if (S.tab === 'leagues') await loadBoards(); }
  const liveNow = S.live && !allFinal();
  if (liveNow && S.tab === 'leagues' && S.lbLeague && S.lbPeriod === 'night') await loadBoards();
  if (liveNow && S.tab === 'world' && S.wPeriod === 'night') await loadWorld();
  if (liveNow && S.tab === 'score') await loadTonightRanks();
  renderAll();
}
let lastTick = 0;
window.addEventListener('hashchange', () => { if (location.hash === '#soundtest') { soundOpen = true; renderHeader(); } });
document.addEventListener('visibilitychange', () => {
  // Coming back to the tab: catch up right away instead of waiting for the next minute.
  if (!document.hidden && S.slate && Date.now() - lastTick > 30000) { lastTick = Date.now(); tick(); }
});

/* ---------- Loading ---------- */
async function loadResults() {
  try {
    const r = await fetch(`../data/results/results-${S.slate.date}.json`, { cache: 'no-store' });
    S.results = r.ok ? (await r.json()).players : null;
  } catch (e) { S.results = null; }
}
/* data/status.json is written by the server after every run (deploy/nightly.sh). */
async function loadStatus() {
  let st = null;
  try {
    const r = await fetch('../data/status.json', { cache: 'no-store' });
    st = r.ok ? await r.json() : null;
  } catch (e) { st = null; }
  if (!st) return;
  const fmt = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase();
  const lastSlate = st.last_ok && st.last_ok.slate;
  if (lastSlate) $('#slateLine').textContent += ` · UPDATED ${fmt(lastSlate)}`;
  const run = st.last_run;
  if (run && !run.ok) {
    showBanner(`The last update (${esc(run.job)} at ${esc(fmt(run.at))}) didn’t finish, so some data may be out of date. It retries automatically at the next scheduled run.`);
  } else if (lastSlate && Date.now() - Date.parse(lastSlate) > 30 * 3600 * 1000) {
    showBanner('The slate hasn’t updated in over a day. The server may be offline.');
  }
}
function showBanner(html) { const b = $('#banner'); b.innerHTML = html; b.hidden = false; }

async function load() {
  try {
    const r = await fetch('../data/slate-latest.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('missing');
    S.slate = await r.json();
  } catch (e) {
    $('#slateLine').textContent = 'No slate loaded';
    showBanner(HOSTED
      ? 'Tonight’s slate isn’t posted yet. It updates every morning, so check back soon.'
      : location.protocol === 'file:'
      ? 'Open BIG BALLIN through the local server, not by double-clicking the file. In Terminal: <code>cd ~/Projects/big-ballin</code> then <code>python3 -m http.server 8000</code>, and go to <code>http://localhost:8000/app/</code>'
      : 'Tonight’s slate hasn’t been built yet. In Terminal, run <code>python pipeline/build_slate.py</code> from the big-ballin folder, then reload this page.');
    document.querySelectorAll('section').forEach((s) => { s.hidden = true; });
    return;
  }
  S.slate.players.forEach((p) => { S.byId[p.id] = p; });
  (S.slate.games || []).forEach((g) => { S.games[g.game_id] = g; });

  const saved = recall('bb-lineup-' + S.slate.date);
  if (saved) POS.forEach((pos) => { S.lineup[pos] = saved[pos] && S.byId[saved[pos]] ? saved[pos] : null; });
  const snd = recall('bb-sound'); if (snd !== null) S.sound = !!snd;
  const vol = recall('bb-vol'); if (typeof vol === 'number' && vol >= 0 && vol <= 1) S.volume = vol; else S.volume = SOUND.volume;
  const view = recall('bb-view'); if (view === 'cards' || view === 'list') S.view = view;
  const win = recall('bb-win'); if (['l2', 'l5', 'l10', 'season'].includes(win)) S.win = win;
  const ho = recall('bb-hideout'); if (ho !== null) S.hideOut = !!ho;
  const lgSaved = recall('bb-league'); if (typeof lgSaved === 'string' && lgSaved) S.lbLeague = lgSaved;
  $('#buildTab').textContent = LABELS.build;
  $('#statsTab').textContent = LABELS.stats;
  $('#worldBtnLabel').textContent = LABELS.world;
  if (!anyStarted() || lastIsCurrent()) { S.lbPeriod = 'last'; S.lbAuto = true; }   // mornings: open the boards on last night
  setupPoolControls();
  const nextEmpty = POS.find((pos) => !S.lineup[pos]); S.poolPos = nextEmpty || 'ALL';

  const vals = S.slate.players.filter((p) => p.proj >= 20).map((p) => p.value).sort((a, b) => a - b);
  S.crushLine = vals.length ? vals[Math.floor(vals.length * 0.9)] : 99;
  S.selId = [...S.slate.players].sort((a, b) => b.proj - a.proj)[0]?.id ?? null;

  const d = new Date(S.slate.date + 'T12:00:00');
  $('#slateLine').textContent = `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()} · ${S.slate.games.length} GAMES · $${S.slate.cap}M CAP`;
  const today = new Date(); const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (S.slate.date < iso) showBanner(HOSTED
    ? `This is the slate from ${esc(S.slate.date)}. Today’s slate posts in the morning on game days.`
    : `This slate is from ${esc(S.slate.date)}. For today’s games, run <code>python pipeline/build_slate.py</code> and reload.`);

  // Invite link (?join=CODE): remember it until the visitor has signed in.
  const params = new URLSearchParams(location.search);
  if (params.get('join')) {
    store('bb-join', params.get('join').toUpperCase().slice(0, 12));
    history.replaceState(null, '', location.pathname + location.hash);
  }

  await loadStatus();
  await loadResults();
  renderAll();
  await initCloud(afterAuth);
  if (CLOUD && S.cloudOk) {
    if (recall('bb-join') && !S.user) openModal('signin', { msg: 'Sign in to join your friend’s league.' });
    await afterAuth();
    await pollLive();
    renderAll();
  }
  setInterval(() => { lastTick = Date.now(); tick(); }, LIVE_REFRESH_MS); // keeps locks and live points current
}
load();
