/* BIG BALLIN: league chat (Nov 18). A message board on each league's page (members only), emoji
   reactions on messages (board-row reactions were tried on Nov 18 and removed), game posts from the server (winners,
   ON FIRE), unread dots, and instant updates through Supabase Realtime.
   The chat box is kept as one live element: the league page re-renders every minute during games,
   and renderLeagues() moves this box into the new page instead of rebuilding it, so typing,
   focus and scroll survive. Only the message list inside it is redrawn (renderChatList). */
import { S, ui } from './state.js?v=4150944';
import { esc, store, recall, flash } from './util.js?v=4150944';
import { avatar } from './avatars.js?v=4150944';
import { CHAT } from './app-config.js?v=4150944';
import { play } from './sound.js?v=4150944';
import { signedIn, chatLoad, chatPost, chatDelete, react, reactionsLoad, chatLatest, chatSubscribe, chatUnsubscribe, profileOf, friendly } from './cloud.js?v=4150944';

const C = {
  msgs: {},       // league id → messages (oldest first), once loaded
  loading: {},    // league id → true while loading
  rx: {},         // league id → { target → { emoji → Set(user ids) } }
  latest: {},     // league id → { id, user } newest message (unread dots)
  names: {},      // user id → { display_name, avatar }
  pick: null,     // target whose emoji picker is open
  sending: false,
};
const me = () => (S.user ? S.user.id : null);
const seenKey = (lg) => 'bb-chat-seen-' + lg;

/* ---------- Unread ---------- */
export function unread(lg) {
  const l = C.latest[lg];
  return !!(l && l.user !== me() && l.id > (recall(seenKey(lg)) || 0));
}
export const anyUnread = () => S.leagues.some((l) => unread(l.id));
function markSeen(lg) {
  const l = C.latest[lg];
  if (!l || document.hidden || S.tab !== 'leagues' || S.lbLeague !== lg) return;
  if ((recall(seenKey(lg)) || 0) < l.id) store(seenKey(lg), l.id);
}

/* ---------- Loading ---------- */
function addRx(lg, target, user, emoji, on) {
  const t = ((C.rx[lg] = C.rx[lg] || {})[target] = (C.rx[lg][target] || {}));
  const set = (t[emoji] = t[emoji] || new Set());
  if (on) set.add(user); else set.delete(user);
}
function addMsg(m) {
  const list = C.msgs[m.league_id];
  if (m.profiles) C.names[m.user_id] = m.profiles;
  const l = C.latest[m.league_id];
  if (!l || m.id > l.id) C.latest[m.league_id] = { id: m.id, user: m.user_id };
  if (!list || list.some((x) => x.id === m.id)) return false;
  list.push(m);
  if (list.length > CHAT.load * 2) list.splice(0, list.length - CHAT.load * 2);
  return true;
}

/* Messages and their reactions. */
export async function loadChat(lg) {
  if (!signedIn() || C.loading[lg]) return;
  C.loading[lg] = true;
  try {
    const msgs = await chatLoad(lg, CHAT.load);
    C.msgs[lg] = [];
    msgs.forEach(addMsg);
    const rows = await reactionsLoad(lg, msgs.map((m) => 'm' + m.id), []);
    C.rx[lg] = {};
    rows.forEach((r) => addRx(lg, r.target, r.user_id, r.emoji, true));
  } catch (e) { if (!C.msgs[lg]) C.msgs[lg] = null; }
  finally { C.loading[lg] = false; }
  renderChatList();
}
export const chatLoaded = (lg) => C.msgs[lg] !== undefined;

/* After sign-in: unread dots for every league, then instant updates. */
export async function startChat() {
  if (!signedIn()) { chatUnsubscribe(); C.msgs = {}; C.rx = {}; C.latest = {}; return; }
  chatSubscribe(onLive);
  try { (await chatLatest()).forEach((r) => { C.latest[r.league_id] = { id: r.last_id, user: r.last_user }; }); } catch (e) { /* dots wait */ }
}
/* Back from the background (phones drop the live connection): catch up. */
export async function chatCatchUp() {
  if (!signedIn()) return;
  chatSubscribe(onLive);
  try { (await chatLatest()).forEach((r) => { C.latest[r.league_id] = { id: r.last_id, user: r.last_user }; }); } catch (e) { /* later */ }
  if (S.lbLeague && C.msgs[S.lbLeague] !== undefined) await loadChat(S.lbLeague);
}

/* A Realtime change ('m' messages / 'r' reactions; only rows from my leagues arrive). */
async function onLive(table, ev, row, old) {
  if (table === 'm' && ev === 'INSERT') {
    if (row.user_id && !C.names[row.user_id]) C.names[row.user_id] = await profileOf(row.user_id) || { display_name: '?', avatar: 0 };
    addMsg(row);
    if (row.user_id !== me() && row.kind === 'chat' && !document.hidden) play('msg');
  } else if (table === 'm' && ev === 'DELETE') {
    Object.values(C.msgs).forEach((list) => { if (list) { const i = list.findIndex((m) => m.id === old.id); if (i >= 0) list.splice(i, 1); } });
  } else if (table === 'r') {
    const r = ev === 'DELETE' ? old : row;
    if (r && r.league_id && r.target) addRx(r.league_id, r.target, r.user_id, r.emoji, ev !== 'DELETE');
  }
  renderChatList();
  ui.renderAll();   // unread dots, board reactions (the chat box itself is kept, see renderLeagues)
}

/* ---------- Actions (called from main.js click handling) ---------- */
export async function send(lg) {
  const box = document.getElementById('chatInput');
  const text = box ? box.value.trim() : '';
  if (!text || C.sending) return;
  C.sending = true;
  try {
    const m = await chatPost(lg, text);
    m.profiles = S.profile;
    addMsg(m);
    box.value = '';
    updateCount();
    play('tap');
    renderChatList(true);
  } catch (e) { const f = friendly(e); flash(f.title, '#FF4A3D', '#3D8BFF'); }
  finally { C.sending = false; }
}
export async function remove(id) {
  if (!confirm('Delete this message?')) return;
  try { await chatDelete(id); onLive('m', 'DELETE', null, { id }); } catch (e) { const f = friendly(e); flash(f.title, '#FF4A3D', '#3D8BFF'); }
}
export async function toggleReact(lg, target, emoji) {
  const was = !!(C.rx[lg] && C.rx[lg][target] && C.rx[lg][target][emoji] && C.rx[lg][target][emoji].has(me()));
  addRx(lg, target, me(), emoji, !was);   // show it at once; the database answer confirms it
  C.pick = null;
  play('tap');
  try { const on = await react(lg, target, emoji); addRx(lg, target, me(), emoji, on); }
  catch (e) { addRx(lg, target, me(), emoji, was); const f = friendly(e); flash(f.title, '#FF4A3D', '#3D8BFF'); }
  renderChatList();
}
export function togglePicker(target) { C.pick = C.pick === target ? null : target; renderChatList(); }
export const pickerOpen = () => C.pick;
export function updateCount() {
  const box = document.getElementById('chatInput'), n = document.getElementById('chatCount');
  if (box && n) { const left = CHAT.maxLen - box.value.length; n.textContent = left < 60 ? left : ''; }
}

/* ---------- Drawing ---------- */
/* Emoji counts for one target, and a + that opens the picker. Members only. */
export function reactBar(lg, target, small) {
  const t = (C.rx[lg] || {})[target] || {};
  const pills = CHAT.emoji.filter((e) => t[e] && t[e].size).map((e) => {
    const who = [...t[e]].map((u) => (u === me() ? 'You' : (C.names[u] || {}).display_name || '?')).join(', ');
    return `<button class="rx${t[e].has(me()) ? ' mine' : ''}" data-act="react" data-lg="${esc(lg)}" data-t="${esc(target)}" data-e="${e}" title="${esc(who)}" aria-label="${e} ${t[e].size}: ${esc(who)}">${e}<b>${t[e].size}</b></button>`;
  }).join('');
  const picker = C.pick === target ? `<span class="rx-pick" role="group" aria-label="React">${CHAT.emoji.map((e) =>
    `<button class="rx-e" data-act="react" data-lg="${esc(lg)}" data-t="${esc(target)}" data-e="${e}" aria-label="React ${e}">${e}</button>`).join('')}</span>` : '';
  return `<span class="rx-bar${small ? ' sm' : ''}">${pills}<button class="rx-add" data-act="rxpick" data-t="${esc(target)}" aria-label="Add a reaction" aria-expanded="${C.pick === target}">${pills ? '+' : '+ 😀'}</button>${picker}</span>`;
}

function when(ts) {
  const d = new Date(ts), now = new Date();
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return t;
  const days = (now - d) / 864e5;
  return (days < 6 ? d.toLocaleDateString([], { weekday: 'short' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' })) + ' ' + t;
}

function msgHtml(m, lg, owner) {
  if (m.kind === 'game') {
    return `<li class="cm game"><span class="cm-body">${esc(m.body)}</span><span class="cm-time">${esc(when(m.created_at))}</span>${reactBar(lg, 'm' + m.id, true)}</li>`;
  }
  const who = C.names[m.user_id] || m.profiles || { display_name: '?', avatar: 0 };
  const mine = m.user_id === me();
  return `<li class="cm${mine ? ' mine' : ''}"><button class="ava-btn" data-act="locker" data-u="${m.user_id}" aria-label="${esc(who.display_name)}'s locker room">${avatar(who.avatar, 28, false, m.user_id)}</button>
    <div class="cm-main"><div class="cm-head"><b class="cm-name">${esc(who.display_name)}</b><span class="cm-time">${esc(when(m.created_at))}</span>
      ${mine || owner ? `<button class="cm-del" data-act="chatdel" data-v="${m.id}" aria-label="Delete message">×</button>` : ''}</div>
      <div class="cm-body">${esc(m.body)}</div>${reactBar(lg, 'm' + m.id, true)}</div></li>`;
}

/* The chat box's frame (made once per league visit; renderLeagues keeps it between renders). */
export function chatShell(lg) {
  return `<section class="chat" id="chatBox" data-league="${esc(lg.id)}" aria-label="League chat">
    <h3 class="lg-head">LEAGUE CHAT</h3>
    <ol class="chat-list" id="chatList" aria-live="polite"><li class="muted">Loading…</li></ol>
    <form class="chat-form" id="chatForm" data-league="${esc(lg.id)}" autocomplete="off">
      <input class="search" id="chatInput" maxlength="${CHAT.maxLen}" placeholder="Talk some trash…" aria-label="Message">
      <span class="chat-count muted" id="chatCount"></span>
      <button class="btn btn-primary" type="submit">SEND</button>
    </form></section>`;
}

/* Redraw the messages (keeps the scroll: stays at the bottom if it was there, or jumps there on send). */
export function renderChatList(toBottom) {
  const el = document.getElementById('chatList'), box = document.getElementById('chatBox');
  if (!el || !box) return;
  const lg = box.dataset.league;
  const list = C.msgs[lg];
  const atBottom = toBottom || el.scrollHeight - el.scrollTop - el.clientHeight < 40 || !el.dataset.drawn;
  const owner = (S.leagues.find((l) => l.id === lg) || {}).owner === me();
  if (list === undefined) el.innerHTML = '<li class="muted">Loading…</li>';
  else if (list === null) el.innerHTML = '<li class="muted">Couldn’t load the chat. It will try again.</li>';
  else if (!list.length) el.innerHTML = '<li class="muted cm-empty">No messages yet. Say hi, or talk some trash before tip-off.</li>';
  else el.innerHTML = list.map((m) => msgHtml(m, lg, owner)).join('');
  el.dataset.drawn = '1';
  if (atBottom) el.scrollTop = el.scrollHeight;
  markSeen(lg);
}
