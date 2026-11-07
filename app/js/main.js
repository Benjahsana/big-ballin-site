/* BIG BALLIN: startup, header, events, loading. */
import { S, ui } from './state.js?v=c35ea33';
import { $, POS, POSNAME, HOSTED, esc, fold, money, color, where, slotsFor, chg, store, recall, beep, flash, jersey, pills, matches, fitNames } from './util.js?v=c35ea33';
import { isLocked, slotOf, spent, filledCount, capBonusFor, potentialBonus, bonusText, targetSlot, costAfter, signState, saveLineup, sign, cut } from './lineup.js?v=c35ea33';
import { renderSlots, renderPool, setupPoolControls } from './render-build.js?v=c35ea33';
import { defaultDir } from './filters.js?v=c35ea33';
import { renderStats } from './render-stats.js?v=c35ea33';
import { renderScore } from './render-score.js?v=c35ea33';

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
  ['build', 'stats', 'score'].forEach((t) => { $('#view-' + t).hidden = S.tab !== t; });
  $('#soundBtn').textContent = S.sound ? 'SOUND ON' : 'SOUND OFF';
  $('#soundBtn').setAttribute('aria-pressed', String(S.sound));
}

function renderAll() {
  renderHeader();
  if (S.tab === 'build') { renderSlots(); renderPool(); }
  if (S.tab === 'stats') renderStats();
  if (S.tab === 'score') renderScore();
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
    case 'tab': S.tab = b.dataset.tab; beep([[988, 0.05]]); renderAll(); window.scrollTo({ top: 0 }); break;
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
    case 'refresh': loadResults().then(() => { renderScore(); if (!S.results) flash('NOT YET!', '#A9A7C2', '#3D8BFF'); else flash('FINAL!', '#FFD23F', '#3D8BFF'); }); break;
  }
});
$('#poolSearch').addEventListener('input', (e) => { S.poolQuery = e.target.value; S.poolLimit = 36; renderPool(); });
$('#poolSort').addEventListener('change', (e) => { S.poolSort = e.target.value; S.poolDir = defaultDir(S.poolSort); S.poolLimit = 36; renderPool(); });
$('#poolGame').addEventListener('change', (e) => { S.poolGame = e.target.value; S.poolLimit = 36; renderPool(); });
$('#poolPrice').addEventListener('change', (e) => { S.poolPrice = e.target.value; S.poolLimit = 36; renderPool(); });
$('#statsSearch').addEventListener('input', (e) => { S.statsQuery = e.target.value; renderStats(); });

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

  await loadStatus();
  await loadResults();
  renderAll();
  setInterval(() => { if (!document.hidden) renderAll(); }, 60000); // keeps locks current
}
load();
