/* BIG BALLIN: startup, header, events, loading. */
import { S, ui } from './state.js?v=93327fe';
import { $, POS, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, beep, flash, jersey, pills, matches, fitNames } from './util.js?v=93327fe';
import { allFinal, isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, targetSlot, costAfter, signState, saveLineup, sign, cut } from './lineup.js?v=93327fe';
import { renderSlots, renderPool, setupPoolControls } from './render-build.js?v=93327fe';
import { defaultDir } from './filters.js?v=93327fe';
import { renderStats } from './render-stats.js?v=93327fe';
import { renderScore } from './render-score.js?v=93327fe';
import { CLOUD, signedIn, initCloud, sendLink, verifyCode, signOut, saveName, loadLineup, createLeague, joinLeague, leaveLeague, liveFeed, friendly } from './cloud.js?v=93327fe';
import { openModal, closeModal, renderModal } from './render-account.js?v=93327fe';
import { renderLeagues, loadBoards, inviteLink } from './render-leagues.js?v=93327fe';

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
    bEl.className = 'cap-bonus-val' + (bonus >= 1.15 ? ' big' : bonus > 1.001 ? ' on' : '');
    $('#capBonusNote').textContent = bonus > 1.001 ? 'boosts tonight’s score' : 'no cap left over';
  }
  document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === S.tab)));
  ['build', 'stats', 'score', 'leagues'].forEach((t) => { $('#view-' + t).hidden = S.tab !== t; });
  // Account button + where the lineup is saved.
  const cloudOn = CLOUD && S.cloudOk;
  $('#leaguesTab').hidden = !cloudOn;
  $('#acctBtn').hidden = !cloudOn;
  $('#acctBtn').textContent = signedIn() ? S.profile.display_name.toUpperCase() : 'SIGN IN';
  $('#acctBtn').classList.toggle('on', signedIn());
  $('#syncNote').textContent = !cloudOn ? '' : !signedIn() ? 'Saved on this device only · sign in to save it to your account'
    : { saving: 'Saving…', saved: 'Saved to your account ✓', error: 'Couldn’t save to your account', local: '' }[S.sync] || '';
  $('#syncNote').className = 'sync' + (S.sync === 'error' && signedIn() ? ' red' : '');
  $('#soundBtn').textContent = S.sound ? 'SOUND ON' : 'SOUND OFF';
  $('#soundBtn').setAttribute('aria-pressed', String(S.sound));
}

function renderAll() {
  renderHeader();
  if (S.tab === 'build') { renderSlots(); renderPool(); }
  if (S.tab === 'stats') renderStats();
  if (S.tab === 'score') renderScore();
  if (S.tab === 'leagues') renderLeagues();
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

/* ---------- Events ---------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled || !S.slate) return;
  const id = b.dataset.id ? Number(b.dataset.id) : null;
  switch (b.dataset.act) {
    case 'tab': S.tab = b.dataset.tab; beep([[988, 0.05]]); renderAll(); window.scrollTo({ top: 0 });
      if (S.tab === 'leagues') loadBoards().then(renderAll);
      if (S.tab === 'score') pollLive().then(renderAll);
      break;
    case 'acct': signedIn() ? openModal('account') : S.user ? openModal('name') : openModal('signin'); break;
    case 'modal': openModal(b.dataset.k, b.dataset.k === 'signin' && S.modal ? { email: S.modal.email } : null); break;
    case 'closemodal': closeModal(); break;
    case 'signout': signOut().then(() => { closeModal(); afterAuth(); flash('SIGNED OUT', '#A9A7C2', '#3D8BFF'); }); break;
    case 'lbscope': S.lbScope = b.dataset.v; S.lbRows = null; renderLeagues(); loadBoards().then(renderAll); break;
    case 'lbperiod': S.lbPeriod = b.dataset.v; S.lbRows = null; renderLeagues(); loadBoards().then(renderAll); break;
    case 'copyinvite': {
      const lg = S.leagues.find((l) => l.id === S.lbScope);
      if (!lg) break;
      const text = `Join my BIG BALLIN league "${lg.name}": ${inviteLink(lg.code)} (code ${lg.code})`;
      (navigator.share ? navigator.share({ text }).catch(() => {}) : navigator.clipboard.writeText(text).then(() => flash('COPIED!', '#FFD23F', '#3D8BFF')))
        .catch(() => flash('COPY FAILED', '#FF4A3D', '#3D8BFF'));
      break;
    }
    case 'leave': {
      const lg = S.leagues.find((l) => l.id === S.lbScope);
      if (!lg || !confirm(`Leave ${lg.name}? You can rejoin later with the code ${lg.code}.`)) break;
      leaveLeague(lg.id).then(() => { S.lbScope = 'ALL'; return loadBoards(); }).then(renderAll)
        .catch((e) => { const f = friendly(e); flash(f.title, '#FF4A3D', '#3D8BFF'); });
      break;
    }
    case 'sound': S.sound = !S.sound; store('bb-sound', S.sound); renderHeader(); break;
    case 'choose': S.poolPos = b.dataset.pos; S.poolLimit = 36; renderAll(); $('#faTitle').scrollIntoView({ block: 'start', behavior: 'smooth' }); break;
    case 'poolpos': S.poolPos = b.dataset.v; S.poolLimit = 36; renderAll(); break;
    case 'statspos': S.statsPos = b.dataset.v; renderStats(); break;
    case 'more': S.poolLimit += 36; renderPool(); break;
    case 'dir': S.poolDir = -S.poolDir; renderPool(); break;
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
    case 'refresh': loadResults().then(pollLive).then(() => {
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
$('#statsSearch').addEventListener('input', (e) => { S.statsQuery = e.target.value; renderStats(); });

/* ---------- Account pop-up forms ---------- */
$('#modal').addEventListener('close', () => { S.modal = null; });
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
      await saveName(String(fd.get('name')));
      closeModal(); flash('WELCOME, ' + S.profile.display_name.toUpperCase() + '!', '#FFD23F', '#FF4A3D');
      await afterAuth(); return;
    }
    if (kind === 'create' || kind === 'join') {
      const lg = kind === 'create' ? await createLeague(String(fd.get('name'))) : await joinLeague(String(fd.get('code')).trim().toUpperCase());
      closeModal();
      S.lbScope = lg.id; S.tab = 'leagues'; S.lbRows = null;
      await loadBoards(); renderAll();
      beep([[660, 0.07], [880, 0.07], [1320, 0.12]]);
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
  if (!S.user) { S.sync = 'local'; S.leagues = []; S.lbScope = 'ALL'; renderAll(); return; }
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
      S.lbScope = lg.id; S.tab = 'leagues';
      flash('YOU’RE IN!', '#FFD23F', '#3D8BFF');
    } catch (e) { const f = friendly(e); flash(f.title, '#FF4A3D', '#3D8BFF'); }
  }
  if (S.tab === 'leagues') await loadBoards();
  renderAll();
}

/* ---------- Live points (Supabase live_feed, refreshed by the server every ~2 min) ---------- */
const anyStarted = () => (S.slate.games || []).some((g) => Date.parse(g.tip_utc) <= Date.now());
let liveSeeded = false;
async function pollLive() {
  if (!CLOUD || !S.cloudOk || S.results || !anyStarted() || (allFinal() && liveSeeded)) return;
  try {
    const f = await liveFeed(S.slate.date);
    if (!f) return;
    S.live = f;
    // HEATING UP: one shout per player, the first time he passes his projection tonight.
    let shout = null;
    POS.forEach((pos) => {
      const p = S.lineup[pos] ? S.byId[S.lineup[pos]] : null;
      const lv = p && f.p[String(p.id)];
      if (!lv || lv.fp < p.proj || S.hotSeen[p.id]) return;
      S.hotSeen[p.id] = true;
      if (liveSeeded && !shout) shout = p;
    });
    liveSeeded = true;
    if (shout) { beep([[523, 0.08], [784, 0.08], [1047, 0.16]]); flash(shout.name.split(' ').slice(-1)[0].toUpperCase() + ' IS HEATING UP!', '#FF4A3D', '#FFD23F'); }
  } catch (e) { /* try again next minute */ }
}

let ticks = 0;
async function tick() {
  if (document.hidden) return;
  ticks += 1;
  await pollLive();
  if (S.tab === 'leagues' && S.live && !allFinal() && ticks % 2 === 0) await loadBoards();
  renderAll();
}

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
  const view = recall('bb-view'); if (view === 'cards' || view === 'list') S.view = view;
  const win = recall('bb-win'); if (['l5', 'l10', 'season'].includes(win)) S.win = win;
  const ho = recall('bb-hideout'); if (ho !== null) S.hideOut = !!ho;
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
  setInterval(tick, 60000); // keeps locks and live points current
}
load();
