/* BIG BALLIN: account pop-up: sign in by email (link or 6-digit code), pick a name,
   create or join a league. One <dialog id="modal">, content depends on S.modal.kind. */
import { S } from './state.js?v=93327fe';
import { $, esc } from './util.js?v=93327fe';

export function openModal(kind, extra) { S.modal = { kind, ...(extra || {}) }; renderModal(); const d = $('#modal'); if (!d.open) d.showModal(); focusFirst(); }
export function closeModal() { S.modal = null; const d = $('#modal'); if (d.open) d.close(); }
function focusFirst() { setTimeout(() => { const el = $('#modal input'); if (el) el.focus(); }, 30); }

export function renderModal() {
  const m = S.modal;
  if (!m) return;
  const msg = m.msg ? `<p class="m-msg${m.err ? ' red' : ''}" role="alert">${esc(m.msg)}</p>` : '';
  const busy = m.busy ? 'disabled' : '';
  let body = '';
  if (m.kind === 'signin') body = `
    <h2>Sign in</h2>
    <p class="muted">Save your lineup to your account, join leagues with friends, and climb the leaderboards. No password: we email you a sign-in link.</p>
    <form data-form="signin" class="m-form">
      <label for="mEmail">Email</label>
      <input class="search" id="mEmail" name="email" type="email" autocomplete="email" required value="${esc(m.email || '')}">
      <button class="btn btn-primary" ${busy}>${m.busy ? 'SENDING…' : 'EMAIL ME A LINK'}</button>
    </form>`;
  else if (m.kind === 'code') body = `
    <h2>Check your email</h2>
    <p>We sent a sign-in email to <b>${esc(m.email)}</b>. Tap the link in it, or type the 6-digit code from the email here.</p>
    <form data-form="code" class="m-form">
      <label for="mCode">Code</label>
      <input class="search" id="mCode" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" maxlength="8" required>
      <button class="btn btn-primary" ${busy}>${m.busy ? 'CHECKING…' : 'SIGN IN'}</button>
    </form>
    <p class="muted">Nothing there? Check spam, or <button class="linkish" data-act="modal" data-k="signin">try again</button>.</p>`;
  else if (m.kind === 'name') body = `
    <h2>Pick your name</h2>
    <p class="muted">This is what your friends see on the leaderboards. 2–20 characters.</p>
    <form data-form="name" class="m-form">
      <label for="mName">Display name</label>
      <input class="search" id="mName" name="name" minlength="2" maxlength="20" required autocomplete="nickname" value="${esc(S.profile ? S.profile.display_name : '')}">
      <button class="btn btn-primary" ${busy}>SAVE NAME</button>
    </form>`;
  else if (m.kind === 'create') body = `
    <h2>New league</h2>
    <p class="muted">You’ll get an invite link and a code to send your friends.</p>
    <form data-form="create" class="m-form">
      <label for="mLeague">League name</label>
      <input class="search" id="mLeague" name="name" minlength="2" maxlength="30" required>
      <button class="btn btn-primary" ${busy}>CREATE LEAGUE</button>
    </form>`;
  else if (m.kind === 'join') body = `
    <h2>Join a league</h2>
    <p class="muted">Type the 6-character code a friend sent you.</p>
    <form data-form="join" class="m-form">
      <label for="mJoin">League code</label>
      <input class="search" id="mJoin" name="code" minlength="6" maxlength="6" required autocapitalize="characters" autocomplete="off" style="text-transform:uppercase" value="${esc(m.code || '')}">
      <button class="btn btn-primary" ${busy}>JOIN</button>
    </form>`;
  else if (m.kind === 'account') body = `
    <h2>${esc(S.profile ? S.profile.display_name : 'Account')}</h2>
    <p class="muted">Signed in as ${esc(S.user ? S.user.email : '')}. Your lineup saves to your account.</p>
    <div class="m-actions">
      <button class="btn btn-plain" data-act="modal" data-k="name">CHANGE NAME</button>
      <button class="btn btn-cut" data-act="signout">SIGN OUT</button>
    </div>`;
  $('#modal').innerHTML = `<div class="m-box">${body}${msg}<button class="m-close" data-act="closemodal" aria-label="Close">✕</button></div>`;
}
